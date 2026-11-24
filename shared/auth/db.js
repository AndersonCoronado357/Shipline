'use strict';
/**
 * Capa de datos del login. Cada app guarda SUS propios usuarios en SU base de
 * datos (la que acmsy le inyecta por DATABASE_URL). Soporta PostgreSQL y MySQL,
 * los dos motores relacionales tipicos para usuarios.
 *
 * El usuario se identifica por su correo (en minusculas), de modo que Google y
 * correo/contrasena con el mismo email son la MISMA cuenta (no se duplica).
 *
 * Requiere instalar el driver del motor que uses:  npm install pg   (o)   mysql2
 */
let pool = null;
let engine = null;

function detectEngine(url) {
  if (/^postgres(ql)?:\/\//i.test(url)) return 'postgres';
  if (/^mysql:\/\//i.test(url)) return 'mysql';
  return null;
}

// Convierte placeholders '?' a '$1, $2...' para PostgreSQL.
function pgify(sql) { let i = 0; return sql.replace(/\?/g, () => '$' + (++i)); }

async function query(sql, params = []) {
  if (engine === 'postgres') return (await pool.query(pgify(sql), params)).rows;
  const [rows] = await pool.query(sql, params);
  return rows;
}

// Anade una columna si no existe (idempotente, multi-motor).
async function addColumn(table, col, type) {
  if (engine === 'postgres') {
    await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${type}`);
  } else {
    try { await query(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); }
    catch (e) { if (!/duplicate column|exist/i.test(e.message)) throw e; }
  }
}

async function migrate() {
  if (engine === 'postgres') {
    await query(`CREATE TABLE IF NOT EXISTS auth_users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT,
      google_id TEXT,
      email_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);
    await query(`CREATE TABLE IF NOT EXISTS auth_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE
    )`);
    await query(`CREATE TABLE IF NOT EXISTS auth_logins (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      method TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);
  } else {
    await query(`CREATE TABLE IF NOT EXISTS auth_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      name VARCHAR(255),
      google_id VARCHAR(255),
      email_verified TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await query(`CREATE TABLE IF NOT EXISTS auth_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      kind VARCHAR(40) NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      used TINYINT(1) DEFAULT 0
    )`);
    await query(`CREATE TABLE IF NOT EXISTS auth_logins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      method VARCHAR(40),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
  // Columnas de seguimiento de inicios de sesion (en bases ya existentes).
  await addColumn('auth_users', 'last_login_at', engine === 'postgres' ? 'TIMESTAMPTZ' : 'DATETIME NULL');
  await addColumn('auth_users', 'last_seen_at', engine === 'postgres' ? 'TIMESTAMPTZ' : 'DATETIME NULL');
  await addColumn('auth_users', 'login_count', engine === 'postgres' ? 'INTEGER DEFAULT 0' : 'INT DEFAULT 0');
}

async function init(databaseUrl) {
  const url = databaseUrl || process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL en el entorno (.env).');
  engine = detectEngine(url);
  if (!engine) throw new Error('El login soporta PostgreSQL o MySQL. Revisa DATABASE_URL.');
  if (engine === 'postgres') {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: url });
  } else {
    const mysql = require('mysql2/promise');
    pool = mysql.createPool(url);
  }
  await migrate();
  return engine;
}

const norm = (email) => String(email || '').trim().toLowerCase();

async function findByEmail(email) {
  const rows = await query('SELECT * FROM auth_users WHERE email = ? LIMIT 1', [norm(email)]);
  return rows[0] || null;
}
async function findById(id) {
  const rows = await query('SELECT * FROM auth_users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function createUser({ email, passwordHash = null, name = null, googleId = null, emailVerified = false }) {
  const e = norm(email);
  if (engine === 'postgres') {
    const rows = await query(
      'INSERT INTO auth_users (email, password_hash, name, google_id, email_verified) VALUES (?,?,?,?,?) RETURNING *',
      [e, passwordHash, name, googleId, emailVerified]);
    return rows[0];
  }
  const res = await query(
    'INSERT INTO auth_users (email, password_hash, name, google_id, email_verified) VALUES (?,?,?,?,?)',
    [e, passwordHash, name, googleId, emailVerified ? 1 : 0]);
  return findById(res.insertId);
}

async function setPassword(id, passwordHash) {
  await query('UPDATE auth_users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
}
async function linkGoogle(id, googleId, name) {
  await query('UPDATE auth_users SET google_id = ?, email_verified = ?, name = COALESCE(name, ?) WHERE id = ?',
    [googleId, engine === 'postgres' ? true : 1, name, id]);
}
async function markVerified(id) {
  await query('UPDATE auth_users SET email_verified = ? WHERE id = ?', [engine === 'postgres' ? true : 1, id]);
}

// --- Tokens de un solo uso (reset / confirmacion) ---
async function createToken(userId, kind, tokenHash, expiresAt) {
  await query('INSERT INTO auth_tokens (user_id, kind, token_hash, expires_at) VALUES (?,?,?,?)',
    [userId, kind, tokenHash, expiresAt]);
}
async function findValidToken(kind, tokenHash) {
  const rows = await query(
    'SELECT * FROM auth_tokens WHERE kind = ? AND token_hash = ? AND used = ? LIMIT 1',
    [kind, tokenHash, engine === 'postgres' ? false : 0]);
  const t = rows[0];
  if (!t) return null;
  if (new Date(t.expires_at).getTime() < Date.now()) return null;
  return t;
}
async function consumeToken(id) {
  await query('UPDATE auth_tokens SET used = ? WHERE id = ?', [engine === 'postgres' ? true : 1, id]);
}

// --- Seguimiento de inicios de sesion ---
// Registra un inicio de sesion: actualiza la ultima entrada y suma al contador,
// y guarda el evento en el historial.
async function recordLogin(userId, method) {
  await query('UPDATE auth_users SET last_login_at = CURRENT_TIMESTAMP, last_seen_at = CURRENT_TIMESTAMP, login_count = COALESCE(login_count,0) + 1 WHERE id = ?', [userId]);
  await query('INSERT INTO auth_logins (user_id, method, created_at) VALUES (?,?,CURRENT_TIMESTAMP)', [userId, method || null]);
}

// Marca al usuario como desconectado (al cerrar sesion): deja de contar en linea.
async function markOffline(userId) {
  await query('UPDATE auth_users SET last_seen_at = NULL WHERE id = ?', [userId]);
}

// Marca actividad reciente (para saber quien esta en linea). Solo escribe si
// han pasado mas de 60s desde la ultima vez (evita escribir en cada peticion).
async function touchSeen(userId) {
  if (engine === 'postgres') {
    await query("UPDATE auth_users SET last_seen_at = now() WHERE id = ? AND (last_seen_at IS NULL OR last_seen_at < now() - interval '60 seconds')", [userId]);
  } else {
    await query('UPDATE auth_users SET last_seen_at = NOW() WHERE id = ? AND (last_seen_at IS NULL OR last_seen_at < (NOW() - INTERVAL 60 SECOND))', [userId]);
  }
}

// Historial de inicios de sesion de un usuario (mas recientes primero).
async function listLogins(userId, limit = 100) {
  const n = parseInt(limit, 10) || 100;
  return query('SELECT method, created_at FROM auth_logins WHERE user_id = ? ORDER BY created_at DESC LIMIT ' + n, [userId]);
}

module.exports = {
  init, findByEmail, findById, createUser, setPassword, linkGoogle, markVerified,
  createToken, findValidToken, consumeToken,
  recordLogin, touchSeen, listLogins, markOffline,
  get engine() { return engine; },
};
