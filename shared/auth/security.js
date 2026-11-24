'use strict';
/**
 * Utilidades de seguridad para el modulo de login de acmsy.
 * Sin dependencias externas: usa el modulo 'crypto' de Node.
 *  - Hash de contrasenas con scrypt (KDF fuerte, integrado en Node).
 *  - Tokens aleatorios para recuperacion / confirmacion (un solo uso).
 *  - Cookies firmadas con HMAC para la sesion (sin almacen de sesiones).
 */
const crypto = require('crypto');

// --- Contrasenas (scrypt) ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const dk = crypto.scryptSync(String(password), salt, 64);
  return 'scrypt$' + salt.toString('hex') + '$' + dk.toString('hex');
}
function verifyPassword(password, stored) {
  try {
    const [scheme, saltHex, hashHex] = String(stored || '').split('$');
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
    const dk = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), 64);
    const expected = Buffer.from(hashHex, 'hex');
    return dk.length === expected.length && crypto.timingSafeEqual(dk, expected);
  } catch (_) { return false; }
}

// --- Tokens (reset de contrasena, confirmacion de cuenta) ---
function randomToken(bytes = 32) { return crypto.randomBytes(bytes).toString('hex'); }
function sha256(s) { return crypto.createHash('sha256').update(String(s)).digest('hex'); }

// --- Cookies firmadas (sesion sin estado) ---
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('Falta SESSION_SECRET en el entorno (.env).');
  return s;
}
function sign(data) {
  const json = Buffer.from(JSON.stringify(data)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret()).update(json).digest('base64url');
  return json + '.' + mac;
}
function unsign(token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') < 0) return null;
  const i = token.lastIndexOf('.');
  const json = token.slice(0, i), mac = token.slice(i + 1);
  const expected = crypto.createHmac('sha256', secret()).update(json).digest('base64url');
  try {
    if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
    return JSON.parse(Buffer.from(json, 'base64url').toString('utf8'));
  } catch (_) { return null; }
}

module.exports = { hashPassword, verifyPassword, randomToken, sha256, sign, unsign };
