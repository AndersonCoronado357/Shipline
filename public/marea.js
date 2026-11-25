'use strict';
/* Shipline: el cambio entre entrar, crear cuenta y recuperar la contraseña, hecho a mano.
   No recarga la página. La coreografía:
     1. El formulario se recoge, pieza por pieza.
     2. Sube la marea en tres capas de olas, cada una con su retraso, hasta cubrir la pantalla.
        El barco surfea la cresta de la ola de delante hacia su nuevo destino: al muelle (crear
        cuenta), de vuelta a altamar (entrar) o zarpando fuera de la pantalla (recuperar).
        Si vas a recuperar, una botella cae girando desde el cielo, toca el agua y salpica.
        Si vienes de recuperar, la botella se hunde y el barco llega surfeando.
     3. Bajo el agua aparece una frase del viaje y se cambia la pantalla.
     4. La marea baja (la capa de delante primero), el barco o la botella bajan con ella, y la
        pantalla nueva entra: el logo, el nombre y luego cada campo del formulario. */
(() => {
  const RUTAS = { '/': 'entrar', '/login': 'entrar', '/register': 'registro', '/forgot': 'mensaje' };
  const FRASES = { entrar: 'De vuelta a altamar', registro: 'Rumbo al muelle', mensaje: 'Mensaje en una botella' };
  const EASE = 'cubic-bezier(.65,0,.35,1)';
  const SALE = 'cubic-bezier(.22,1,.36,1)';
  const CAE = 'cubic-bezier(.55,0,1,.45)';
  const SUBIR = 700;
  const BAJAR = 720;
  const RETRASO = [0, 95, 190]; // b3, b2, b1 al subir; al bajar va al revés

  const tipoDe = (href) => {
    try {
      const u = new URL(href, location.href);
      return u.origin === location.origin && !u.search ? RUTAS[u.pathname] || null : null;
    } catch (_) { return null; }
  };
  const tipoActual = () => {
    const m = document.querySelector('main.portada');
    return m ? ['entrar', 'registro', 'mensaje'].find((t) => m.classList.contains(t)) : null;
  };
  if (!tipoActual()) return;

  // ---------- Traer la pantalla nueva (con un poco de adelanto al pasar el ratón) ----------
  const cache = new Map();
  function traer(url) {
    if (!cache.has(url)) {
      const p = fetch(url, { credentials: 'same-origin' }).then(async (r) => {
        if (!r.ok || (r.redirected && tipoDe(r.url) !== tipoDe(url))) throw new Error('sin portada');
        return r.text();
      });
      cache.set(url, p);
      setTimeout(() => cache.delete(url), 15000);
      p.catch(() => cache.delete(url));
    }
    // Se guarda el HTML y se arma un documento nuevo cada vez: el anterior se consume al cambiar.
    return cache.get(url).then((html) => new DOMParser().parseFromString(html, 'text/html'));
  }

  // ---------- El velo de la marea ----------
  const ola = (y, a, inverso) => {
    let d = `M0 ${y}Q90 ${inverso ? y + a : y - a} 180 ${y}`;
    for (let x = 360; x <= 1440; x += 180) d += `T${x} ${y}`;
    return `<svg class="mv-ola" viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="${d}V120H0Z"/></svg>`;
  };
  let velo = null;
  let ocupado = false;
  function crearVelo() {
    const piezas = document.getElementById('piezas-marea');
    const barco = piezas ? piezas.content.querySelector('.barco').outerHTML : '';
    const botella = piezas ? piezas.content.querySelector('.botella').outerHTML : '';
    const v = document.createElement('div');
    v.className = 'marea-velo';
    v.setAttribute('aria-hidden', 'true');
    v.innerHTML = `
      <div class="mv-banda b3">${ola(60, 36)}<i></i></div>
      <div class="mv-banda b2">${ola(60, 30, true)}<i></i></div>
      <div class="mv-banda b1">${ola(60, 26)}<i></i></div>
      <p class="mv-frase"></p>
      <div class="mv-y mv-barco"><div class="mv-x"><div class="mv-giro">${barco}</div></div></div>
      <div class="mv-y mv-botella"><div class="mv-x"><div class="mv-giro">${botella}</div></div></div>
      <div class="mv-gotas">${'<i></i>'.repeat(14)}</div>`;
    v.querySelectorAll('[data-modo]').forEach((el) => { for (const k of Object.keys(el.dataset)) delete el.dataset[k]; });
    document.body.append(v);
    return v;
  }

  const anim = (el, frames, opts) => el.animate(frames, { fill: 'both', ...opts });
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  // Salpicadura: gotas que saltan desde el punto donde cae la botella y vuelven al agua.
  function salpicar(x, y) {
    velo.querySelectorAll('.mv-gotas i').forEach((g, i) => {
      const ang = Math.PI * (0.12 + 0.76 * (i / 13)) + (Math.random() - 0.5) * 0.25;
      const fuerza = 70 + Math.random() * 90;
      const dx = Math.cos(ang) * fuerza * (i % 2 ? 1 : -1) * 0.9;
      const dy = -Math.sin(ang) * fuerza - 30;
      const t = 620 + Math.random() * 260;
      const tam = 6 + Math.random() * 8;
      g.style.width = g.style.height = tam + 'px';
      anim(g, [
        { opacity: 1, transform: `translate(${x}px, ${y}px) scale(.4)` },
        { opacity: 1, transform: `translate(${x + dx * 0.7}px, ${y + dy}px) scale(1)`, offset: 0.45, easing: 'cubic-bezier(.3,0,.6,1)' },
        { opacity: 0, transform: `translate(${x + dx}px, ${y + 26}px) scale(.6)` },
      ], { duration: t, easing: 'cubic-bezier(.2,.6,.4,1)' });
    });
  }

  // ---------- La coreografía ----------
  async function ir(url, empujar) {
    const desde = tipoActual();
    const hacia = tipoDe(url);
    if (!desde || !hacia || ocupado) return;
    if (desde === hacia && url === location.href) return;
    ocupado = true;
    const pedido = traer(url);
    if (!velo) velo = crearVelo();
    velo.classList.add('activa');

    const W = innerWidth;
    const H = innerHeight;
    const movil = W < 900;
    const bandas = ['.b3', '.b2', '.b1'].map((s) => velo.querySelector(s));
    const OCULTA = H + 40;
    const CUBRE = [-150, -70, Math.round(H * (movil ? 0.34 : 0.3))];
    const superficie = CUBRE[2] + 60; // la línea media de la ola de delante, ya arriba
    const barco = velo.querySelector('.mv-barco');
    const botella = velo.querySelector('.mv-botella');
    const bw = movil ? 110 : 160;
    const bh = bw * 110 / 160;
    const tw = movil ? 104 : 150;
    const th = tw * 60 / 120;
    barco.querySelector('.barco').style.width = bw + 'px';
    botella.querySelector('.botella').style.width = tw + 'px';
    const frase = velo.querySelector('.mv-frase');
    frase.textContent = FRASES[hacia];

    // Destinos del barco (x del borde izquierdo) según de dónde a dónde vas.
    const xEscena = (tipo) => (tipo === 'registro' ? (movil ? 0.5 : 0.66) : (movil ? 0.18 : 0.2)) * W;
    const conBarco = hacia !== 'mensaje' || desde !== 'mensaje';
    const conBotella = hacia === 'mensaje' || desde === 'mensaje';
    let x0; let x1;
    if (hacia === 'mensaje') { x0 = xEscena(desde); x1 = W + 60; }
    else if (desde === 'mensaje') { x0 = -bw - 80; x1 = xEscena(hacia); }
    else { x0 = xEscena(desde); x1 = xEscena(hacia); }
    const izquierda = x1 < x0;
    const total = RETRASO[2] + SUBIR + 200 + BAJAR + RETRASO[2];

    // 1. El formulario se recoge.
    const viejo = document.querySelector('main.portada');
    const piezasViejas = viejo.querySelectorAll('.p-form-in > :not(.form), .form > *, .p-marca > *');
    piezasViejas.forEach((el, i) => anim(el, [{ opacity: 1, clipPath: 'inset(0)' }, { opacity: 0, clipPath: 'inset(0 0 100% 0)' }], { duration: 240, delay: i * 22, easing: CAE }));

    // 2. Sube la marea.
    const inicio = 140;
    bandas.forEach((b, i) => anim(b, [{ transform: `translateY(${OCULTA}px)` }, { transform: `translateY(${CUBRE[i]}px)` }], { duration: SUBIR, delay: inicio + RETRASO[i], easing: EASE }));
    const yBarco = (yb) => yb + 60 - bh * 0.74;
    if (conBarco) {
      barco.hidden = false;
      anim(barco, [{ transform: `translateY(${yBarco(OCULTA)}px)` }, { transform: `translateY(${yBarco(CUBRE[2])}px)` }], { duration: SUBIR, delay: inicio + RETRASO[2], easing: EASE });
      anim(barco.querySelector('.mv-x'), [{ transform: `translateX(${x0}px)` }, { transform: `translateX(${x1}px)` }], { duration: total, delay: inicio, easing: 'cubic-bezier(.45,.05,.55,.95)' });
      barco.querySelector('.mv-giro').style.transform = izquierda ? 'scaleX(-1)' : '';
    } else barco.hidden = true;

    const cubierto = inicio + RETRASO[2] + SUBIR;
    const yBotella = (yb) => yb + 60 - th * 0.62;
    if (conBotella) {
      botella.hidden = false;
      const bx = W * (movil ? 0.38 : 0.44);
      if (hacia === 'mensaje') {
        // Cae girando desde el cielo y toca el agua justo cuando la marea termina de subir.
        anim(botella, [{ transform: `translateY(${-th - 160}px)` }, { transform: `translateY(${yBotella(CUBRE[2])}px)` }], { duration: 760, delay: cubierto - 760, easing: CAE });
        anim(botella.querySelector('.mv-x'), [{ transform: `translateX(${W * 0.08}px)` }, { transform: `translateX(${bx}px)` }], { duration: 760, delay: cubierto - 760, easing: SALE });
        anim(botella.querySelector('.mv-giro'), [{ transform: 'rotate(-320deg)' }, { transform: 'rotate(18deg)', offset: 0.85 }, { transform: 'rotate(6deg)' }], { duration: 900, delay: cubierto - 760, easing: SALE });
        setTimeout(() => salpicar(bx + tw / 2, superficie - 8), cubierto);
      } else {
        // Viene de recuperar: la botella sube con la marea y se hunde mientras llega el barco.
        anim(botella, [
          { transform: `translateY(${yBotella(OCULTA)}px)` },
          { transform: `translateY(${yBotella(CUBRE[2])}px)`, offset: 0.62 },
          { transform: `translateY(${yBotella(CUBRE[2]) + 170}px)` },
        ], { duration: SUBIR + 520, delay: inicio + RETRASO[2], easing: EASE });
        anim(botella.querySelector('.mv-x'), [{ transform: `translateX(${bx}px)` }, { transform: `translateX(${bx + 40}px)` }], { duration: SUBIR + 520, delay: inicio + RETRASO[2] });
        anim(botella.querySelector('.mv-giro'), [{ transform: 'rotate(0)', opacity: 1 }, { transform: 'rotate(0)', opacity: 1, offset: 0.6 }, { transform: 'rotate(70deg)', opacity: 0 }], { duration: SUBIR + 520, delay: inicio + RETRASO[2], easing: CAE });
      }
    } else botella.hidden = true;

    // 3. Bajo el agua: la frase del viaje y el cambio de pantalla.
    anim(frase, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: cubierto - 160, easing: SALE });
    let doc = null;
    try {
      [doc] = await Promise.all([pedido, esperar(cubierto + 200)]);
    } catch (_) {
      location.href = url;
      return;
    }
    const nuevo = doc.querySelector('main.portada');
    if (!nuevo) { location.href = url; return; }
    nuevo.classList.add('cambio');
    viejo.replaceWith(document.adoptNode(nuevo));
    document.title = doc.title;
    if (empujar) history.pushState({ marea: hacia }, '', url);
    if (window.ShiplineEscena) nuevo.querySelectorAll('.escena').forEach((e) => window.ShiplineEscena(e));
    scrollTo(0, 0);

    // 4. Baja la marea (la capa de delante primero) y entra la pantalla nueva.
    anim(frase, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-12px)' }], { duration: 260, easing: CAE });
    const bajadas = bandas.map((b, i) => anim(b, [{ transform: `translateY(${CUBRE[i]}px)` }, { transform: `translateY(${OCULTA}px)` }], { duration: BAJAR, delay: RETRASO[2 - i], easing: EASE }));
    if (conBarco) anim(barco, [{ transform: `translateY(${yBarco(CUBRE[2])}px)` }, { transform: `translateY(${yBarco(OCULTA)}px)` }], { duration: BAJAR, easing: EASE });
    if (conBotella && hacia === 'mensaje') anim(botella, [{ transform: `translateY(${yBotella(CUBRE[2])}px)` }, { transform: `translateY(${yBotella(OCULTA)}px)` }], { duration: BAJAR, easing: EASE });

    entrarPiezas(nuevo, 260);
    await Promise.all(bajadas.map((a) => a.finished.catch(() => {})));
    velo.classList.remove('activa');
    velo.getAnimations({ subtree: true }).forEach((a) => { if (a.effect && a.effect.getComputedTiming().iterations !== Infinity) a.cancel(); });
    const h2 = nuevo.querySelector('.p-form h2');
    if (h2) { h2.tabIndex = -1; h2.focus({ preventScroll: true }); }
    ocupado = false;
  }

  // La pantalla nueva entra pieza por pieza: el logo gira y aparece, el nombre, y cada campo.
  function entrarPiezas(main, base) {
    const logo = main.querySelector('.simbolo.grande');
    if (logo) logo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: base, easing: 'ease', fill: 'backwards' });
    const piezas = [main.querySelector('.p-marca .nombre'), main.querySelector('.p-marca .lema'), ...main.querySelectorAll('.p-form-in > :not(.form), .form > *')].filter(Boolean);
    piezas.forEach((el, i) => el.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0)' }], { duration: 520, delay: base + 120 + i * 55, easing: SALE, fill: 'backwards' }));
    const olas = main.querySelector('.olas');
    if (olas) anim(olas, [{ transform: 'translateY(40px)' }, { transform: 'none' }], { duration: 900, delay: base, easing: SALE });
  }

  // ---------- Enlaces, adelanto e historial ----------
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target || !tipoDe(a.href)) return;
    e.preventDefault();
    ir(a.href, true);
  });
  const adelantar = (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a && tipoDe(a.href) && a.href !== location.href) traer(a.href).catch(() => {});
  };
  document.addEventListener('pointerover', adelantar, { passive: true });
  document.addEventListener('focusin', adelantar);
  history.replaceState({ marea: tipoActual() }, '', location.href);
  addEventListener('popstate', () => { if (tipoDe(location.href)) ir(location.href, false); });
})();
