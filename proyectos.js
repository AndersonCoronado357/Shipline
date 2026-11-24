'use strict';
/**
 * Datos de Shipline: la tabla de proyectos de cada usuario (PostgreSQL).
 * Las cuentas las maneja shared/auth (tabla auth_users); aquí solo viven los proyectos.
 */
const { Pool } = require('pg');

const ESTADOS = ['idea', 'desarrollo', 'terminado', 'publicado'];
const COLUMNAS = 'id, nombre, descripcion, estado, color, enlace, repo, creado, actualizado';

let pool = null;
let listo = null;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL en el entorno (.env).');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  }
  return pool;
}

// La tabla depende de auth_users, así que se crea después de que el login inicialice la base.
function asegurar() {
  listo = listo || getPool().query(`
    CREATE TABLE IF NOT EXISTS proyectos (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      descripcion TEXT NOT NULL DEFAULT '',
      estado TEXT NOT NULL DEFAULT 'idea' CHECK (estado IN ('idea','desarrollo','terminado','publicado')),
      color TEXT NOT NULL DEFAULT '#7008F7',
      enlace TEXT NOT NULL DEFAULT '',
      repo TEXT NOT NULL DEFAULT '',
      creado TIMESTAMPTZ NOT NULL DEFAULT now(),
      actualizado TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS proyectos_user_idx ON proyectos (user_id);
  `).catch((e) => { listo = null; throw e; });
  return listo;
}

// Acepta "github.com/x" y le pone https://. Solo http y https.
function limpiarUrl(v) {
  let s = String(v == null ? '' : v).trim();
  if (!s) return '';
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = 'https://' + s;
  let u;
  try { u = new URL(s); } catch (_) { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (!u.hostname.includes('.') && u.hostname !== 'localhost') return null;
  return s.length > 300 ? null : s;
}

/**
 * Valida lo que llega del cliente. Con parcial=true solo revisa los campos presentes (PATCH).
 * Devuelve { datos } o { error }.
 */
function validar(body, parcial = false) {
  const b = body && typeof body === 'object' ? body : {};
  const datos = {};
  const tiene = (k) => Object.prototype.hasOwnProperty.call(b, k);

  if (!parcial || tiene('nombre')) {
    const nombre = String(b.nombre == null ? '' : b.nombre).trim().replace(/\s+/g, ' ');
    if (!nombre) return { error: 'Ponle un nombre al proyecto.' };
    if (nombre.length > 80) return { error: 'El nombre puede tener hasta 80 caracteres.' };
    datos.nombre = nombre;
  }
  if (!parcial || tiene('descripcion')) {
    const d = String(b.descripcion == null ? '' : b.descripcion).trim();
    if (d.length > 1200) return { error: 'La idea puede tener hasta 1200 caracteres.' };
    datos.descripcion = d;
  }
  if (!parcial || tiene('estado')) {
    const e = b.estado == null ? 'idea' : String(b.estado);
    if (!ESTADOS.includes(e)) return { error: 'Ese estado no existe.' };
    datos.estado = e;
  }
  if (!parcial || tiene('color')) {
    const c = b.color == null ? '#7008F7' : String(b.color).trim();
    if (!/^#[0-9a-f]{6}$/i.test(c)) return { error: 'El color debe ser un código como #7008F7.' };
    datos.color = c.toUpperCase();
  }
  for (const [k, etiqueta] of [['enlace', 'El enlace'], ['repo', 'El repositorio']]) {
    if (!parcial || tiene(k)) {
      const u = limpiarUrl(b[k]);
      if (u === null) return { error: `${etiqueta} no parece una dirección válida.` };
      datos[k] = u;
    }
  }
  if (parcial && !Object.keys(datos).length) return { error: 'No hay nada que cambiar.' };
  return { datos };
}

async function listar(userId) {
  await asegurar();
  const r = await getPool().query(`SELECT ${COLUMNAS} FROM proyectos WHERE user_id = $1 ORDER BY lower(nombre), id`, [userId]);
  return r.rows;
}

async function crear(userId, d) {
  await asegurar();
  const r = await getPool().query(
    `INSERT INTO proyectos (user_id, nombre, descripcion, estado, color, enlace, repo)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${COLUMNAS}`,
    [userId, d.nombre, d.descripcion, d.estado, d.color, d.enlace, d.repo]);
  return r.rows[0];
}

async function actualizar(userId, id, d) {
  await asegurar();
  const campos = Object.keys(d);
  const sets = campos.map((k, i) => `${k} = $${i + 3}`).join(', ');
  const r = await getPool().query(
    `UPDATE proyectos SET ${sets}, actualizado = now() WHERE user_id = $1 AND id = $2 RETURNING ${COLUMNAS}`,
    [userId, id, ...campos.map((k) => d[k])]);
  return r.rows[0] || null;
}

async function eliminar(userId, id) {
  await asegurar();
  const r = await getPool().query('DELETE FROM proyectos WHERE user_id = $1 AND id = $2', [userId, id]);
  return r.rowCount > 0;
}

async function cerrar() { if (pool) await pool.end(); }

module.exports = { ESTADOS, validar, listar, crear, actualizar, eliminar, asegurar, cerrar, getPool };
