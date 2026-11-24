'use strict';
/**
 * Shipline — servidor. Express sirve la portada (que es el login), la app y una API JSON
 * con los proyectos de cada usuario. El login es el módulo compartido de acmsy.
 */
try { process.loadEnvFile(); } catch (_) { /* en producción las variables llegan del contenedor */ }

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { createAuth } = require('./shared/auth');
const crearVistas = require('./views');
const proyectos = require('./proyectos');

const PORT = Number(process.env.PORT) || 3000;
const ORIGIN = (process.env.APP_URL || 'https://shipline.acmsy.com').replace(/\/$/, '');
const PUBLIC = path.join(__dirname, 'public');

// Versión de los estáticos: cambia sola cuando cambian el CSS o el JS (rompe la caché).
const VERSION = crypto.createHash('sha1')
  .update(fs.readFileSync(path.join(PUBLIC, 'app.css')))
  .update(fs.readFileSync(path.join(PUBLIC, 'app.js')))
  .update(fs.readFileSync(path.join(PUBLIC, 'escena.js')))
  .update(fs.readFileSync(path.join(PUBLIC, 'marea.js')))
  .digest('hex').slice(0, 10);

const vistas = crearVistas({ origin: ORIGIN, version: VERSION });
const auth = createAuth({ subdomain: 'shipline', appName: 'Shipline', successRedirect: '/', views: vistas });

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
  });
  next();
});

app.get('/health', (req, res) => res.type('text/plain').send('ok'));

// ---- Archivos con la dirección pública dentro (robots, sitemap, llms, manifiesto, service worker) ----
const plantillas = new Map();
function plantilla(nombre) {
  if (!plantillas.has(nombre) || process.env.NODE_ENV !== 'production') {
    const txt = fs.readFileSync(path.join(__dirname, 'plantillas', nombre), 'utf8');
    plantillas.set(nombre, txt.split('__ORIGIN__').join(ORIGIN).split('__V__').join(VERSION));
  }
  return plantillas.get(nombre);
}
const servir = (ruta, archivo, tipo, cache) => app.get(ruta, (req, res) => {
  res.set('Cache-Control', cache).type(tipo).send(plantilla(archivo));
});
servir('/robots.txt', 'robots.txt', 'text/plain', 'public, max-age=3600');
servir('/sitemap.xml', 'sitemap.xml', 'application/xml', 'public, max-age=3600');
servir('/llms.txt', 'llms.txt', 'text/markdown; charset=utf-8', 'public, max-age=3600');
// Nunca en caché: si Cloudflare guarda un sw.js o un manifiesto viejo, nadie recibe las actualizaciones.
servir('/manifest.webmanifest', 'manifest.webmanifest', 'application/manifest+json', 'no-store');
servir('/sw.js', 'sw.js', 'text/javascript', 'no-store');

// ---- Estáticos ----
app.use(express.static(PUBLIC, {
  index: false,
  setHeaders(res, file) {
    // app.css y app.js se piden con ?v=<versión>, así que pueden quedarse un año.
    if (/\.(css|js)$/.test(file)) res.set('Cache-Control', 'public, max-age=31536000, immutable');
    else res.set('Cache-Control', 'public, max-age=86400');
  },
}));

// ---- Login (pantallas, Google, recuperación) ----
app.use((req, res, next) => {
  // Las páginas dependen de la sesión: que nadie las guarde.
  if ((req.method === 'GET' || req.method === 'HEAD') && !req.path.includes('.')) res.set('Cache-Control', 'no-store');
  next();
});
app.use(auth.router);

// La portada es el login; con sesión, la misma dirección abre la app.
app.get('/', async (req, res, next) => {
  try {
    const user = await auth.getUser(req);
    if (!user) return auth.renderLogin(req, res);
    res.send(vistas.appPage({ user }));
  } catch (e) { next(e); }
});

// ---- API ----
const api = express.Router();
api.use(express.json({ limit: '32kb' }));
api.use(async (req, res, next) => {
  try {
    const user = await auth.getUser(req);
    if (!user) return res.status(401).json({ error: 'Tu sesión terminó. Vuelve a entrar.' });
    req.user = user;
    // Solo JSON en lo que modifica: un formulario de otro sitio no puede mandar esto.
    if (!['GET', 'HEAD'].includes(req.method) && req.method !== 'DELETE' && !req.is('application/json')) {
      return res.status(415).json({ error: 'Formato no admitido.' });
    }
    next();
  } catch (e) { next(e); }
});

const idValido = (v) => /^\d{1,9}$/.test(String(v)) ? Number(v) : null;

api.get('/me', (req, res) => res.json({ email: req.user.email, nombre: req.user.name || '' }));

api.get('/proyectos', async (req, res, next) => {
  try { res.json(await proyectos.listar(req.user.id)); } catch (e) { next(e); }
});

api.post('/proyectos', async (req, res, next) => {
  try {
    const { datos, error } = proyectos.validar(req.body);
    if (error) return res.status(400).json({ error });
    res.status(201).json(await proyectos.crear(req.user.id, datos));
  } catch (e) { next(e); }
});

api.patch('/proyectos/:id', async (req, res, next) => {
  try {
    const id = idValido(req.params.id);
    if (!id) return res.status(404).json({ error: 'Ese proyecto no existe.' });
    const { datos, error } = proyectos.validar(req.body, true);
    if (error) return res.status(400).json({ error });
    const p = await proyectos.actualizar(req.user.id, id, datos);
    if (!p) return res.status(404).json({ error: 'Ese proyecto no existe.' });
    res.json(p);
  } catch (e) { next(e); }
});

api.delete('/proyectos/:id', async (req, res, next) => {
  try {
    const id = idValido(req.params.id);
    if (!id || !(await proyectos.eliminar(req.user.id, id))) return res.status(404).json({ error: 'Ese proyecto no existe.' });
    res.status(204).end();
  } catch (e) { next(e); }
});

api.use((req, res) => res.status(404).json({ error: 'No encontrado.' }));
app.use('/api', api);

// ---- Errores ----
app.use((req, res) => res.status(404).send(vistas.messagePage({
  title: 'Esta página no existe', message: 'La dirección no lleva a ninguna parte de Shipline.', linkHref: '/', linkLabel: 'Ir al inicio',
})));
app.use((err, req, res, _next) => {
  console.error('[shipline]', err.message);
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: 'Algo falló en el servidor. Inténtalo de nuevo.' });
  res.status(500).type('text/plain').send('Algo falló en el servidor. Inténtalo de nuevo en un momento.');
});

app.listen(PORT, '0.0.0.0', () => console.log(`[shipline] escuchando en ${ORIGIN} (puerto ${PORT})`));
