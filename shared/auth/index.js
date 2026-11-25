'use strict';
/**
 * Modulo de login reutilizable de acmsy. Cada app lo monta y obtiene:
 *   - Pantallas y rutas de login, registro, recuperacion y "Entrar con Google".
 *   - Middleware requireAuth y helper getUser(req).
 * Cada app guarda SUS usuarios en SU base de datos (DATABASE_URL).
 *
 * Uso minimo en una app Express:
 *   const { createAuth } = require('./shared/auth');
 *   const auth = createAuth({ subdomain: 'hibi', appName: 'Hibi' });
 *   app.use(auth.router);
 *   app.get('/', auth.requireAuth, (req, res) => res.send('Hola ' + req.user.email));
 *
 * Variables de entorno: DATABASE_URL, SESSION_SECRET, GOOGLE_CLIENT_ID,
 * GOOGLE_CLIENT_SECRET, RESEND_API_KEY, MAIL_FROM, APP_URL (opcional).
 */
const express = require('express');
const sec = require('./security');
const db = require('./db');
const google = require('./google');

function createAuth(opts = {}) {
  // Copia de Shipline: las pantallas las pone la app (opts.views) con su propio diseño.
  const views = opts.views;
  if (!views) throw new Error('createAuth necesita opts.views');
  const subdomain = opts.subdomain || process.env.ACMSY_SUBDOMAIN || '';
  const appName = opts.appName || subdomain || 'acmsy';
  const basePath = (opts.basePath || '').replace(/\/$/, '');
  const successRedirect = opts.successRedirect || '/';
  const resetMinutes = opts.resetMinutes || 30;
  const mailer = opts.mailer || safeRequire('../mailer/mailer');
  const templates = opts.templates || safeRequire('../mailer/templates');

  const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const baseUrl = () => (process.env.APP_URL || (subdomain ? `https://${subdomain}.acmsy.com` : 'http://localhost:3000')).replace(/\/$/, '');
  const u = (p) => basePath + p;                 // ruta relativa montada
  const full = (p) => baseUrl() + u(p);          // URL absoluta publica
  const isHttps = () => baseUrl().startsWith('https://');

  // Inicializa la BD una sola vez (perezoso).
  let initP = null;
  const ensureInit = () => (initP = initP || db.init());

  // --- cookies ---
  const parseCookies = (req) => {
    const out = {};
    (req.headers.cookie || '').split(';').forEach((c) => {
      const i = c.indexOf('='); if (i < 0) return;
      out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
    });
    return out;
  };
  const cookieOpts = (extra = {}) => ({ httpOnly: true, sameSite: 'lax', secure: isHttps(), path: '/', ...extra });
  const setSession = (res, user) => res.cookie('acmsy_session', sec.sign({ uid: user.id, email: user.email }), cookieOpts({ maxAge: 1000 * 60 * 60 * 24 * 30 }));
  const clearSession = (res) => res.clearCookie('acmsy_session', cookieOpts());
  const sessionUser = (req) => { const c = parseCookies(req); return c.acmsy_session ? sec.unsign(c.acmsy_session) : null; };

  // --- CSRF (doble envio con cookie firmada) ---
  const issueCsrf = (req, res) => {
    const c = parseCookies(req);
    const existing = c.acmsy_csrf && sec.unsign(c.acmsy_csrf);
    if (existing) return existing;
    const tok = sec.randomToken(16);
    res.cookie('acmsy_csrf', sec.sign(tok), cookieOpts());
    return tok;
  };
  const checkCsrf = (req) => {
    const c = parseCookies(req);
    const cookieTok = c.acmsy_csrf && sec.unsign(c.acmsy_csrf);
    return cookieTok && req.body && req.body._csrf && cookieTok === req.body._csrf;
  };

  const router = express.Router();
  router.use(express.urlencoded({ extended: false }));

  const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
    console.error('[auth]', e.message);
    res.status(500).send('Error de autenticación. Inténtalo de nuevo.');
  });

  // ---------- Login ----------
  router.get(u('/login'), wrap(async (req, res) => {
    if (sessionUser(req)) return res.redirect(successRedirect);
    res.send(views.loginPage({ appName, csrf: issueCsrf(req, res), googleEnabled, u }));
  }));
  router.post(u('/login'), wrap(async (req, res) => {
    await ensureInit();
    const reErr = (text) => res.status(400).send(views.loginPage({ appName, csrf: issueCsrf(req, res), googleEnabled, u, error: { type: 'err', text } }));
    if (!checkCsrf(req)) return reErr('Tu sesión expiró. Vuelve a intentarlo.');
    const user = await db.findByEmail(req.body.email);
    if (!user || !user.password_hash || !sec.verifyPassword(req.body.password, user.password_hash)) {
      return reErr('Correo o contraseña incorrectos.');
    }
    setSession(res, user);
    await db.recordLogin(user.id, 'correo');
    res.redirect(successRedirect);
  }));

  // ---------- Registro ----------
  router.get(u('/register'), wrap(async (req, res) => {
    if (sessionUser(req)) return res.redirect(successRedirect);
    res.send(views.registerPage({ appName, csrf: issueCsrf(req, res), googleEnabled, u }));
  }));
  router.post(u('/register'), wrap(async (req, res) => {
    await ensureInit();
    const reErr = (text) => res.status(400).send(views.registerPage({ appName, csrf: issueCsrf(req, res), googleEnabled, u, error: { type: 'err', text } }));
    if (!checkCsrf(req)) return reErr('Tu sesión expiró. Vuelve a intentarlo.');
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reErr('Correo no válido.');
    if (password.length < 8) return reErr('La contraseña debe tener al menos 8 caracteres.');
    const existing = await db.findByEmail(email);
    let user;
    if (existing) {
      // Si la cuenta existe (con contrasena o solo con Google) no se le pone una contrasena desde aqui:
      // eso dejaría a cualquiera adueñarse de una cuenta de Google sabiendo el correo. Para añadir
      // contraseña a una cuenta de Google se usa la recuperación, que prueba que el correo es suyo.
      return reErr(existing.password_hash
        ? 'Ya existe una cuenta con ese correo. Inicia sesión.'
        : 'Ese correo ya entra con Google. Usa Continuar con Google o recupera la contraseña.');
    } else {
      user = await db.createUser({ email, passwordHash: sec.hashPassword(password), name: req.body.name || null });
    }
    setSession(res, user);
    await db.recordLogin(user.id, 'registro');
    res.redirect(successRedirect);
  }));

  // ---------- Cerrar sesion ----------
  router.post(u('/logout'), wrap(async (req, res) => {
    const s = sessionUser(req);
    if (s && s.uid) { await ensureInit(); await db.markOffline(s.uid).catch(() => {}); }
    clearSession(res);
    res.redirect(u('/login'));
  }));

  // ---------- Recuperacion de contrasena ----------
  router.get(u('/forgot'), wrap(async (req, res) => {
    res.send(views.forgotPage({ appName, csrf: issueCsrf(req, res), u }));
  }));
  router.post(u('/forgot'), wrap(async (req, res) => {
    await ensureInit();
    const done = () => res.send(views.messagePage({ appName, title: 'Revisa tu correo', message: 'Si ese correo tiene una cuenta, te enviamos un enlace para restablecer la contraseña.', linkHref: u('/login'), linkLabel: 'Volver a iniciar sesión' }));
    if (!checkCsrf(req)) return done();
    const user = await db.findByEmail(req.body.email);
    if (user) {
      const token = sec.randomToken(32);
      const expires = new Date(Date.now() + resetMinutes * 60 * 1000);
      await db.createToken(user.id, 'reset', sec.sha256(token), expires);
      try {
        const t = templates.passwordReset({ appName, url: full('/reset?token=' + token), minutes: resetMinutes });
        await mailer.sendEmail({ to: user.email, subject: t.subject, html: t.html, text: t.text, displayName: appName });
      } catch (e) { console.error('[auth] no se pudo enviar el correo de reset:', e.message); }
    }
    done(); // misma respuesta exista o no (evita enumerar correos)
  }));
  router.get(u('/reset'), wrap(async (req, res) => {
    res.send(views.resetPage({ appName, csrf: issueCsrf(req, res), token: String(req.query.token || ''), u }));
  }));
  router.post(u('/reset'), wrap(async (req, res) => {
    await ensureInit();
    const reErr = (text) => res.status(400).send(views.resetPage({ appName, csrf: issueCsrf(req, res), token: String(req.body.token || ''), u, error: { type: 'err', text } }));
    if (!checkCsrf(req)) return reErr('Tu sesión expiró. Vuelve a intentarlo.');
    if (String(req.body.password || '').length < 8) return reErr('La contraseña debe tener al menos 8 caracteres.');
    const tok = await db.findValidToken('reset', sec.sha256(String(req.body.token || '')));
    if (!tok) return reErr('El enlace caducó o ya se usó. Pide uno nuevo.');
    await db.setPassword(tok.user_id, sec.hashPassword(req.body.password));
    await db.consumeToken(tok.id);
    const user = await db.findById(tok.user_id);
    setSession(res, user);
    await db.recordLogin(user.id, 'reset');
    res.redirect(successRedirect);
  }));

  // ---------- Entrar con Google ----------
  // Retorno de Google. En producción (OAUTH_RELAY) Google vuelve a acmsy.com/auth/google/callback, que ya
  // está autorizado, y la landing reenvía a <sub>.acmsy.com/auth/callback según el final del state
  // ("~<sub>"). Así no hay que registrar una URL nueva por app. En local, vuelve directo aquí.
  const relevo = (process.env.OAUTH_RELAY || '').trim();
  const retornoGoogle = () => relevo || full('/auth/google/callback');
  const sufijoEstado = relevo && subdomain ? '~' + subdomain : '';

  router.get(u('/auth/google'), wrap(async (req, res) => {
    if (!googleEnabled) return res.redirect(u('/login'));
    const state = sec.randomToken(16) + sufijoEstado;
    res.cookie('acmsy_oauth', sec.sign(state), cookieOpts({ maxAge: 1000 * 60 * 10 }));
    res.redirect(google.authUrl({ clientId: process.env.GOOGLE_CLIENT_ID, redirectUri: retornoGoogle(), state }));
  }));
  router.get([u('/auth/google/callback'), u('/auth/callback')], wrap(async (req, res) => {
    await ensureInit();
    const c = parseCookies(req);
    const expected = c.acmsy_oauth && sec.unsign(c.acmsy_oauth);
    if (!expected || expected !== req.query.state) return res.redirect(u('/login'));
    const tokens = await google.exchangeCode({ code: String(req.query.code || ''), clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, redirectUri: retornoGoogle() });
    const prof = await google.fetchProfile(tokens.access_token);
    if (!prof.email) return res.redirect(u('/login'));
    let user = await db.findByEmail(prof.email);
    if (user) { if (!user.google_id) await db.linkGoogle(user.id, prof.googleId, prof.name); }
    else user = await db.createUser({ email: prof.email, googleId: prof.googleId, name: prof.name, emailVerified: true });
    setSession(res, user);
    await db.recordLogin(user.id, 'google');
    res.redirect(successRedirect);
  }));

  // ---------- Middleware ----------
  async function getUser(req) {
    const s = sessionUser(req);
    if (!s || !s.uid) return null;
    await ensureInit();
    const user = await db.findById(s.uid);
    if (user) db.touchSeen(user.id).catch(() => {}); // marca actividad (no bloquea)
    return user;
  }
  function requireAuth(req, res, next) {
    getUser(req).then((user) => {
      if (!user) return res.redirect(u('/login'));
      req.user = user; next();
    }).catch(next);
  }

  const renderLogin = (req, res) => res.send(views.loginPage({ appName, csrf: issueCsrf(req, res), googleEnabled, u }));

  return { router, requireAuth, getUser, googleEnabled, renderLogin, paths: { login: u('/login'), logout: u('/logout') } };
}

function safeRequire(p) { try { return require(p); } catch (_) { return null; } }

module.exports = { createAuth };
