'use strict';
/**
 * Páginas de Shipline renderizadas en el servidor: la portada (que también es el login),
 * las demás pantallas de cuenta y el cascarón de la app. Todas comparten el mismo <head>
 * con los metadatos de SEO; solo la portada se deja indexar.
 */

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TITULO = 'Shipline — Lleva tus proyectos de la idea a publicados';
const DESCRIPCION = 'Anota cada proyecto con su nombre y su idea, y muévelo por cuatro estaciones: idea, en desarrollo, terminado y publicado. En la PC y en el celular.';
const DESC_CORTA = 'Tus proyectos en cuatro estaciones: idea, en desarrollo, terminado y publicado.';
const FUNCIONES = [
  'Anotar cada proyecto con su nombre, su idea y un color propio',
  'Cuatro estados: idea, en desarrollo, terminado y publicado',
  'Mover un proyecto de estación desde la lista, con opción de deshacer',
  'Guardar el enlace del sitio publicado y el del repositorio',
  'Buscar y filtrar los proyectos por estado',
  'Tema claro y oscuro, e instalable como app en el celular',
];

// Colores de la marca (los mismos de app.css): aguamarina y la tinta que va encima.
const AQUA = '#20E8B7';
const TINTA = '#022628';
const FONDO_CLARO = '#FFFFFF';
const FONDO_OSCURO = '#080B0C';

const ICONO_GOOGLE = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.9 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.3 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-17z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.1-5.5c-2 1.3-4.5 2.1-8.4 2.1-6.3 0-11.6-3.8-13.5-9.3l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

// Marca: el símbolo de Shipline, una S dibujada como línea de metro que sale de la idea (el punto)
// y llega a publicado (el anillo), y el nombre.
const SIMBOLO = `<svg class="simbolo" viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="114" fill="${AQUA}"/><g transform="translate(6 -6)"><path d="M350 140H222A58 58 0 0 0 222 256H290A58 58 0 0 1 290 372H162" fill="none" stroke="${TINTA}" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/><circle cx="350" cy="140" r="38" fill="${TINTA}"/><circle cx="162" cy="372" r="40" fill="${AQUA}" stroke="${TINTA}" stroke-width="26"/></g></svg>`;

const ico = (d) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICONO_SOL = '<svg class="ico i-sol" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const ICONO_LUNA = '<svg class="ico i-luna" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
const ICONO_BUSCAR = ico('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>');
const ICONO_CERRAR = ico('<path d="M6 6l12 12M18 6 6 18"/>');
const ICONO_MAS = ico('<path d="M12 5v14M5 12h14"/>');
const ICONO_SALIR = ico('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>');
const ICONO_GLOBO = ico('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>');
const ICONO_CODIGO = ico('<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/>');
const ICONO_CORREO = ico('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>');
const ICONO_CANDADO = ico('<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>');
const ICONO_OJO = ico('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>');
const ICONO_PERSONA = ico('<circle cx="12" cy="8" r="4"/><path d="M4 20.5c1.5-3.8 4.5-5.5 8-5.5s6.5 1.7 8 5.5"/>');

// El barco de la marca, plano: dos velas, el mástil y el casco con su franja aguamarina.
const BARCO = '<svg class="barco" viewBox="0 0 160 110" aria-hidden="true"><path class="vela1" d="M84 4L84 62H30Z"/><path class="vela2" d="M84 14L84 62H124Z"/><path class="bandera" d="M85 3L104 8L85 13Z"/><path class="mastil" d="M84 2V64"/><path class="casco" d="M6 64H154L130 100H30Z"/><path class="franja" d="M22 76H142"/></svg>';

const ESTADOS = [
  { id: 'idea', nombre: 'Idea' },
  { id: 'desarrollo', nombre: 'En desarrollo', corto: 'Desarrollo' },
  { id: 'terminado', nombre: 'Terminado' },
  { id: 'publicado', nombre: 'Publicado' },
];

module.exports = function crearVistas({ origin, version }) {
  const O = origin.replace(/\/$/, '');
  const V = version;

  function head({ titulo = TITULO, indexar = false, ld = false } = {}) {
    const t = esc(titulo);
    return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<title>${t}</title>
<meta name="description" content="${esc(DESCRIPCION)}">
<link rel="canonical" href="${O}/">
<meta name="robots" content="${indexar ? 'index, follow, max-image-preview:large, max-snippet:-1' : 'noindex, follow'}">
<meta name="google-site-verification" content="kQccDg7SPoW-KuDF8XOWxtDYuiBCJzRwH06gh-D-16E">
<meta name="application-name" content="Shipline">
<meta name="apple-mobile-web-app-title" content="Shipline">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="format-detection" content="telephone=no">
<meta name="color-scheme" content="dark light">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Shipline">
<meta property="og:locale" content="es_CO">
<meta property="og:url" content="${O}/">
<meta property="og:title" content="${esc(TITULO)}">
<meta property="og:description" content="${esc(DESC_CORTA)}">
<meta property="og:image" content="${O}/og.png">
<meta property="og:image:secure_url" content="${O}/og.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Shipline, tus proyectos de la idea a publicados">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(TITULO)}">
<meta name="twitter:description" content="${esc(DESC_CORTA)}">
<meta name="twitter:image" content="${O}/og.png">
<meta name="twitter:image:alt" content="Shipline, tus proyectos de la idea a publicados">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/icons/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<style>html{background:${FONDO_OSCURO}}html[data-theme=light]{background:${FONDO_CLARO}}</style>
<script>(function(){var d=document.documentElement,m0=/(?:^|; )shipline_tema=(dark|light)/.exec(document.cookie),t=m0&&m0[1];
if(t!=='dark'&&t!=='light'){t='dark'}
d.setAttribute('data-theme',t);var m=document.createElement('meta');m.name='theme-color';
m.content=t==='dark'?'${FONDO_OSCURO}':'${FONDO_CLARO}';document.head.appendChild(m)})()</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;600;700;800;900&display=swap">
<link rel="stylesheet" href="/app.css?v=${V}">${ld ? jsonLd() : ''}`;
  }

  function jsonLd() {
    const data = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', '@id': `${O}/#website`, url: `${O}/`, name: 'Shipline', inLanguage: 'es', description: DESCRIPCION,
          publisher: { '@id': 'https://acmsy.com/#org' } },
        { '@type': 'WebApplication', '@id': `${O}/#app`, name: 'Shipline', url: `${O}/`, inLanguage: 'es',
          applicationCategory: 'DeveloperApplication', operatingSystem: 'Web, Android, Windows, iOS',
          description: DESCRIPCION, featureList: FUNCIONES, image: `${O}/og.png`,
          publisher: { '@id': 'https://acmsy.com/#org' } },
        { '@type': 'Organization', '@id': 'https://acmsy.com/#org', name: 'acmsy', url: 'https://acmsy.com' },
      ],
    };
    return `\n<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
  }

  const noscript = `<noscript><div class="sin-js"><h1>Shipline</h1><p>${esc(DESCRIPCION)}</p><ul>${FUNCIONES.map((f) => `<li>${esc(f)}</li>`).join('')}</ul><p>Shipline necesita JavaScript para funcionar.</p></div></noscript>`;

  const marca = () => `<a class="marca" href="/" aria-label="Shipline, inicio">${SIMBOLO}<span class="nombre">Shipline</span></a>`;

  // Una ola que se repite cada 360 unidades: el SVG mide el doble del ancho y se desliza la mitad,
  // así el movimiento no tiene costura. "inverso" la empieza en valle para que las capas no coincidan.
  // escena.js usa la misma forma de la ola o2 (base 72, altura 13) para poner el barco encima.
  const ola = (cls, y, a, inverso) => {
    let d = `M0 ${y}Q90 ${inverso ? y + a : y - a} 180 ${y}`;
    for (let x = 360; x <= 1440; x += 180) d += `T${x} ${y}`;
    return `<svg class="ola ${cls}" viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="${d}V120H0Z"/></svg>`;
  };
  // Estrellas de la noche (solo se ven en el tema oscuro): posición en % y un retraso para el titileo.
  const ESTRELLAS = [[8, 12], [16, 33], [6, 57], [22, 74], [12, 89], [30, 21], [27, 47], [36, 64], [19, 95], [40, 7], [4, 40], [34, 83], [46, 30], [44, 92]];
  // Destellos sobre el agua: de día, el sol; de noche, el reflejo de la luna.
  const BRILLOS = [[30, 14], [44, 33], [26, 52], [52, 68], [36, 84], [58, 24], [48, 91]];
  const gaviota = (cls) => `<svg class="gaviota ${cls}" viewBox="0 0 40 16"><path class="ala ala-i" d="M20 10Q12 1 2 6"/><path class="ala ala-d" d="M20 10Q28 1 38 6"/></svg>`;
  // Protagonistas de cada escena. data-modo le dice a escena.js cómo se mueven sobre las olas.
  const barco = (modo, extra = '') => BARCO.replace('<svg class="barco"', `<svg class="barco" data-modo="${modo}" ${extra}`);
  const MUELLE = '<svg class="muelle" viewBox="0 0 300 170" aria-hidden="true"><rect class="poste" x="70" y="46" width="14" height="124" rx="3"/><rect class="poste" x="150" y="46" width="14" height="124" rx="3"/><rect class="poste" x="230" y="46" width="14" height="124" rx="3"/><rect class="tablas" x="34" y="34" width="280" height="18" rx="5"/><rect class="noray" x="52" y="18" width="18" height="20" rx="6"/></svg>';
  const BOTELLA = '<svg class="botella" viewBox="0 0 120 60" aria-hidden="true" data-modo="flotar" data-desde=".14" data-hasta=".86" data-hundido=".3" data-inclina="2.4" data-vel="52"><rect class="vidrio" x="8" y="14" width="78" height="34" rx="17"/><rect class="vidrio" x="80" y="22" width="24" height="18" rx="6"/><rect class="corcho" x="100" y="23" width="14" height="16" rx="4"/><rect class="papel" x="24" y="23" width="46" height="16" rx="8"/><rect class="lazo" x="44" y="23" width="5" height="16"/><rect class="reflejo" x="18" y="19" width="40" height="4" rx="2"/></svg>';
  // La escena: cielo, sol (luna de noche), nubes, gaviotas, estrellas y el mar con su protagonista.
  const escena = (extra = '', protagonista = '') => `<div class="escena ${extra}" aria-hidden="true">
      <div class="estrellas">${ESTRELLAS.map(([t, l], i) => `<i style="top:${t}%;left:${l}%;--d:${((i * 0.73) % 3).toFixed(2)}s"></i>`).join('')}</div>
      <i class="fugaz"></i>
      <i class="sol"></i><i class="nube n1"></i><i class="nube n2"></i><i class="nube n3"></i>
      ${gaviota('g1')}${gaviota('g2')}
      <div class="olas">${ola('o1', 46, 15)}${protagonista}${ola('o2', 72, 13, true)}${ola('o3', 98, 11)}<div class="brillos">${BRILLOS.map(([t, l], i) => `<i style="top:${t}%;left:${l}%;--d:${((i * 0.61) % 2.4).toFixed(2)}s"></i>`).join('')}</div></div>
    </div>`;

  function msg(m) {
    if (!m) return '';
    return `<div class="msg ${m.type === 'ok' ? 'ok' : 'err'}" role="alert">${esc(m.text)}</div>`;
  }
  const csrfField = (csrf) => `<input type="hidden" name="_csrf" value="${esc(csrf)}">`;
  const botonGoogle = (u) => `<a class="btn google" href="${esc(u('/auth/google'))}">${ICONO_GOOGLE}<span>Continuar con Google</span></a>`;
  const campoCorreo = `<label class="campo"><span class="etq">Correo</span><span class="con-ico">${ICONO_CORREO}<input type="email" name="email" required autocomplete="email" inputmode="email" placeholder="tu@correo.com"></span></label>`;
  const campoClave = (auto, etq = 'Contraseña', pista = '') => `<label class="campo"><span class="etq">${etq}</span><span class="con-ico">${ICONO_CANDADO}<input type="password" name="password" required${auto === 'new-password' ? ' minlength="8"' : ''} autocomplete="${auto}" placeholder="••••••••"><button class="ojo" type="button" aria-label="Mostrar la contraseña" aria-pressed="false">${ICONO_OJO}</button></span>${pista ? `<span class="pista">${pista}</span>` : ''}</label>`;
  // Mostrar u ocultar la contraseña con el ojo del campo.
  const ojoJs = `<script>document.addEventListener('click',function(e){var b=e.target.closest('.ojo');if(!b)return;var i=b.parentNode.querySelector('input');var ver=i.type==='password';i.type=ver?'text':'password';b.setAttribute('aria-pressed',String(ver));b.setAttribute('aria-label',ver?'Ocultar la contraseña':'Mostrar la contraseña');})</script>`;

  // La portada tiene tres distribuciones, cada una con su escena:
  //  - entrar: el mar a la izquierda con el barco navegando en altamar.
  //  - registro: el mar a la derecha, con el barco amarrado al muelle listo para zarpar.
  //  - mensaje: el mar ocupa toda la pantalla, una botella con su mensaje flota y el formulario va al centro.
  // Al pasar de una a otra, el navegador anima el cambio (ver "Transiciones entre pantallas" en app.css).
  function portada({ tipo = 'entrar', titulo, indexar = false, tarjeta }) {
    const protagonista = tipo === 'registro'
      ? MUELLE + barco('amarrado', 'data-desde=".37" data-hundido=".25" data-inclina=".7"')
      : tipo === 'mensaje' ? BOTELLA : barco('cruzar', 'data-vel="26" data-hundido=".25"');
    return `<!doctype html>
<html lang="es">
<head>
${head({ titulo, indexar, ld: indexar })}
</head>
<body class="pagina-portada">
${noscript}
<main class="portada ${tipo}">
  <section class="p-arte">
    ${escena('', protagonista)}
    <div class="p-marca">
      ${SIMBOLO.replace('class="simbolo"', 'class="simbolo grande"')}
      <h1><span class="nombre">Shipline</span><span class="lema">Lleva tus proyectos a buen puerto.</span></h1>
    </div>
  </section>
  <section class="p-form"><div class="p-form-in">${tarjeta}</div></section>
</main>
<template id="piezas-marea">${BARCO}${BOTELLA}</template>
${ojoJs}
<script src="/escena.js?v=${V}"></script>
<script src="/marea.js?v=${V}"></script>
</body>
</html>`;
  }

  // ---- Pantallas de cuenta (las usa shared/auth) ----
  // Entrar: el formulario clásico; Google va al final como alternativa.
  function loginPage({ csrf, error, googleEnabled, u }) {
    return portada({ tipo: 'entrar', indexar: true, tarjeta: `
      <h2>Hola de nuevo</h2>
      <p class="sub">Entra para seguir con tus proyectos.</p>
      ${msg(error)}
      <form method="post" action="${esc(u('/login'))}" class="form">
        ${csrfField(csrf)}
        ${campoCorreo}
        ${campoClave('current-password')}
        <a class="olvido" href="${esc(u('/forgot'))}">¿Olvidaste tu contraseña?</a>
        <button class="btn primario" type="submit">Entrar</button>
      </form>
      ${googleEnabled ? `<p class="sep"><span>o</span></p>${botonGoogle(u)}` : ''}
      <p class="otra">¿No tienes cuenta? <a href="${esc(u('/register'))}">Regístrate</a></p>` });
  }

  // Crear cuenta: Google primero, que es lo más rápido; luego nombre, correo y contraseña.
  function registerPage({ csrf, error, googleEnabled, u }) {
    return portada({ tipo: 'registro', titulo: 'Crear cuenta · Shipline', tarjeta: `
      <h2>Prepara tu barco</h2>
      <p class="sub">Crea tu cuenta y tu primer proyecto zarpa en un minuto.</p>
      ${msg(error)}
      ${googleEnabled ? `${botonGoogle(u)}<p class="sep"><span>o con tu correo</span></p>` : ''}
      <form method="post" action="${esc(u('/register'))}" class="form">
        ${csrfField(csrf)}
        <label class="campo"><span class="etq">Nombre</span><span class="con-ico">${ICONO_PERSONA}<input type="text" name="name" autocomplete="name" maxlength="80" placeholder="Cómo te llamas"></span></label>
        ${campoCorreo}
        ${campoClave('new-password', 'Contraseña', 'Mínimo 8 caracteres.')}
        <button class="btn primario" type="submit">Crear cuenta</button>
      </form>
      <p class="otra">¿Ya tienes cuenta? <a href="${esc(u('/login'))}">Entra</a></p>` });
  }

  // Recuperar: un solo campo con el botón al lado, sobre el mar donde flota la botella.
  function forgotPage({ csrf, error, u }) {
    return portada({ tipo: 'mensaje', titulo: 'Recuperar contraseña · Shipline', tarjeta: `
      <h2>¿Olvidaste tu contraseña?</h2>
      <p class="sub">Lanza una botella al mar: te enviamos un enlace a tu correo para elegir una nueva.</p>
      ${msg(error)}
      <form method="post" action="${esc(u('/forgot'))}" class="form en-linea">
        ${csrfField(csrf)}
        ${campoCorreo}
        <button class="btn primario" type="submit">Enviar enlace</button>
      </form>
      <p class="otra"><a class="volver" href="${esc(u('/login'))}">Volver a entrar</a></p>` });
  }

  function resetPage({ csrf, error, token, u }) {
    return portada({ tipo: 'mensaje', titulo: 'Nueva contraseña · Shipline', tarjeta: `
      <h2>Elige una contraseña nueva</h2>
      <p class="sub">Tu botella llegó a buen puerto. Con esta contraseña entras también con tu correo.</p>
      ${msg(error)}
      <form method="post" action="${esc(u('/reset'))}" class="form">
        ${csrfField(csrf)}
        <input type="hidden" name="token" value="${esc(token)}">
        ${campoClave('new-password', 'Nueva contraseña', 'Mínimo 8 caracteres.')}
        <button class="btn primario" type="submit">Guardar contraseña</button>
      </form>` });
  }

  function messagePage({ title, message, linkHref, linkLabel }) {
    return portada({ tipo: 'mensaje', titulo: `${title} · Shipline`, tarjeta: `
      <h2>${esc(title)}</h2>
      ${msg({ type: 'ok', text: message })}
      ${linkHref ? `<a class="btn primario ancho" href="${esc(linkHref)}">${esc(linkLabel || 'Continuar')}</a>` : ''}` });
  }

  // ---- La app ----
  function appPage({ user }) {
    const nombre = (user.name || '').trim();
    const inicial = (nombre || user.email || '?').trim().charAt(0).toUpperCase();
    const saludo = nombre ? `Hola, ${nombre.split(/\s+/)[0]}` : 'Hola de nuevo';
    // Filas grises mientras llegan los proyectos.
    const esqueleto = `<div class="esqueleto" aria-hidden="true">${'<div class="esq"><i></i><i></i><i></i></div>'.repeat(7)}</div>`;
    const campoUrl = (id, etiqueta, placeholder, irLabel, icono) => `<label class="campo"><span class="etq">${etiqueta}</span><span class="con-ir"><input id="${id}" inputmode="url" autocomplete="off" spellcheck="false" placeholder="${placeholder}"><a class="ir" id="${id}-ir" target="_blank" rel="noopener noreferrer" aria-label="${irLabel}" title="${irLabel}" hidden>${icono}</a></span></label>`;
    return `<!doctype html>
<html lang="es">
<head>
${head({ titulo: 'Tus proyectos · Shipline' })}
</head>
<body class="app">
${noscript}
<header class="top" id="top">
  <div class="top-in">
    ${marca()}
    <label class="buscar">${ICONO_BUSCAR}<input id="buscar" type="search" placeholder="Buscar proyecto" aria-label="Buscar proyecto" autocomplete="off" enterkeyhint="search"></label>
    <button class="btn primario" id="nuevo" type="button" aria-keyshortcuts="N">${ICONO_MAS}<span>Nuevo proyecto</span></button>
    <button class="cuenta" id="cuenta" type="button" aria-label="Tu cuenta" aria-haspopup="true" aria-expanded="false" aria-controls="pop-cuenta">${esc(inicial)}</button>
  </div>
</header>

<main class="vista" aria-labelledby="v-titulo">
  <section class="bienvenida">
    <div class="bv-texto"><h1 id="v-titulo">${esc(saludo)}</h1><p id="v-resumen">Tus proyectos, de la idea a buen puerto.</p></div>
    ${escena('mini', barco('vaiven', 'data-desde=".5" data-hasta=".96" data-vel="34" data-hundido=".25"'))}
  </section>
  <div class="cabeza">
    <h2>Proyectos</h2>
    <div class="filtros-cont fx">
      <nav class="filtros fx-in" id="filtros" aria-label="Filtrar por estado">
        <i class="filtro-ind" aria-hidden="true"></i>
        <button type="button" class="filtro" data-f="todos" aria-pressed="true"><span>Todos</span><b>0</b></button>
        ${ESTADOS.map((e) => `<button type="button" class="filtro" data-f="${e.id}" aria-pressed="false"><span class="largo">${esc(e.nombre)}</span>${e.corto ? `<span class="corto">${esc(e.corto)}</span>` : ''}<b>0</b></button>`).join('')}
      </nav>
      <i class="fx-a" aria-hidden="true"></i><i class="fx-b" aria-hidden="true"></i>
    </div>
  </div>
  <div class="lista-cont fv">
    <div class="lista" id="lista">
      <div class="grupos" id="grupos" aria-busy="true">${esqueleto}</div>
      <div class="vacio" id="vacio" hidden><h2></h2><p></p><button class="btn suave" id="vacio-accion" type="button"></button></div>
    </div>
    <i class="fv-a" aria-hidden="true"></i><i class="fv-b" aria-hidden="true"></i>
  </div>
</main>

<button class="btn primario nuevo-movil" id="nuevo-movil" type="button">${ICONO_MAS}<span>Nuevo proyecto</span></button>

<div class="pop" id="pop-cuenta" hidden>
  <div class="pop-quien">${nombre ? `<b>${esc(nombre)}</b>` : ''}<span>${esc(user.email)}</span></div>
  <div class="pop-items">
    <button class="pop-item" id="tema" type="button">${ICONO_SOL}${ICONO_LUNA}<span class="t-a-claro">Usar tema claro</span><span class="t-a-oscuro">Usar tema oscuro</span></button>
    <form method="post" action="/logout"><button class="pop-item" type="submit">${ICONO_SALIR}<span>Cerrar sesión</span></button></form>
  </div>
</div>

<div class="menu" id="menu" role="menu" aria-label="Mover a" hidden></div>

<div class="velo" id="velo" hidden>
  <form class="panel" id="panel" role="dialog" aria-modal="true" aria-labelledby="p-titulo" novalidate>
    <div class="panel-cab"><i class="insignia" id="p-insignia" aria-hidden="true"></i><h2 id="p-titulo">Nuevo proyecto</h2><button class="icono" type="button" id="p-cerrar" aria-label="Cerrar">${ICONO_CERRAR}</button></div>
    <div class="panel-cuerpo" id="p-cuerpo">
      <label class="campo"><span class="etq">Nombre</span><input id="p-nombre" class="grande" name="nombre" maxlength="80" autocomplete="off" placeholder="Por ejemplo, Huely"><em class="p-error" id="p-error" role="alert"></em></label>
      <label class="campo"><span class="etq">Idea</span><textarea id="p-desc" name="descripcion" maxlength="1200" placeholder="De qué trata, para quién es y qué lo hace distinto"></textarea></label>
      <div class="campo"><span class="etq" id="p-estado-lbl">Estado</span>
        <div class="ruta" id="p-estado" role="group" aria-labelledby="p-estado-lbl">
          <div class="via"><i class="via-llena"></i></div><i class="tren" aria-hidden="true"></i>
          ${ESTADOS.map((e) => `<button type="button" class="estacion" data-estado="${e.id}"><i></i><span>${esc(e.corto || e.nombre)}</span></button>`).join('')}
        </div>
      </div>
      <div class="campo"><span class="etq" id="p-color-lbl">Color</span><div class="colores" id="p-colores" role="radiogroup" aria-labelledby="p-color-lbl"></div></div>
      ${campoUrl('p-enlace', 'Sitio', 'app.acmsy.com', 'Abrir el sitio', ICONO_GLOBO)}
      ${campoUrl('p-repo', 'Repositorio', 'github.com/usuario/repo', 'Abrir el repositorio', ICONO_CODIGO)}
    </div>
    <div class="panel-pie">
      <button class="btn mantener" type="button" id="p-eliminar"><span>Mantén para eliminar</span></button>
      <button class="btn primario" type="submit" id="p-guardar">Crear proyecto</button>
    </div>
  </form>
</div>

<div class="avisos" id="avisos" aria-live="polite"></div>
<script src="/escena.js?v=${V}" defer></script>
<script src="/app.js?v=${V}" defer></script>
</body>
</html>`;
  }

  return { loginPage, registerPage, forgotPage, resetPage, messagePage, appPage, TITULO, DESCRIPCION, FUNCIONES };
};
