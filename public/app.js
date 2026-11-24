'use strict';
/* Shipline: la lista agrupada por estación, el menú para mover, el panel de crear y editar, y los avisos. */
(() => {
  const ESTADOS = [
    { id: 'idea', nombre: 'Idea', corto: 'Idea' },
    { id: 'desarrollo', nombre: 'En desarrollo', corto: 'Desarrollo' },
    { id: 'terminado', nombre: 'Terminado', corto: 'Terminado' },
    { id: 'publicado', nombre: 'Publicado', corto: 'Publicado' },
  ];
  const IDX = Object.fromEntries(ESTADOS.map((e, i) => [e.id, i]));
  const COLORES = ['#7008F7', '#FF1C42', '#FF5900', '#F5A627', '#20A123', '#0BC5F4', '#006AFF'];
  const FONDOS = { light: '#FFFFFF', dark: '#080B0C' };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const html = document.documentElement;
  const reducido = matchMedia('(prefers-reduced-motion: reduce)');
  const conRaton = matchMedia('(hover: hover) and (pointer: fine)');

  const ico = (d) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICONOS = {
    sitio: ico('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>'),
    repo: ico('<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/>'),
    check: ico('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
    mas: ico('<path d="M12 5v14M5 12h14"/>'),
  };

  const st = {
    proyectos: [],
    filtro: 'todos',
    q: '',
    editando: null,
    borrador: null,
  };
  const contGrupos = $('#grupos');
  const vacio = $('#vacio');
  const buscar = $('#buscar');
  const filas = new Map(); // id -> elemento
  const grupos = new Map(); // estado -> { el, cuenta, filas }

  // ---------------- API ----------------
  async function api(method, url, body) {
    const r = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 401) { location.href = '/'; throw new Error('Tu sesión terminó.'); }
    const data = r.status === 204 ? null : await r.json().catch(() => null);
    if (!r.ok) throw new Error((data && data.error) || 'No se pudo completar. Inténtalo de nuevo.');
    return data;
  }

  // ---------------- Utilidades ----------------
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }) || a.id - b.id;
  const tema = () => (html.dataset.theme === 'dark' ? 'dark' : 'light');

  // Color legible: si el del proyecto casi no se ve sobre el fondo, se aclara (oscuro) u oscurece (claro).
  const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgbHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const lum = (c) => {
    const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const cacheColor = new Map();
  function colorUi(hex) {
    const t = tema();
    const clave = t + hex;
    if (cacheColor.has(clave)) return cacheColor.get(clave);
    const fondo = hexRgb(FONDOS[t]);
    const destino = t === 'dark' ? [255, 255, 255] : [0, 0, 0];
    const base = hexRgb(hex);
    let c = base;
    for (let k = 0.08; k <= 1 && contraste(c, fondo) < 2.6; k += 0.08) c = base.map((v, i) => v + (destino[i] - v) * k);
    const out = rgbHex(c);
    cacheColor.set(clave, out);
    return out;
  }

  // Insignia de línea: el color del proyecto y su inicial, en blanco o en tinta según se lea mejor.
  function pintarInsignia(el, nombre, hex) {
    const c = colorUi(hex);
    const rgb = hexRgb(c);
    el.style.setProperty('--c', c);
    el.style.setProperty('--c-ink', contraste(rgb, [255, 255, 255]) >= contraste(rgb, hexRgb('#022628')) ? '#FFFFFF' : '#022628');
    el.textContent = (String(nombre || '').trim().charAt(0) || '?').toUpperCase();
  }

  // El glifo de la línea: cuatro estaciones unidas, encendidas hasta donde va el proyecto.
  const XS = [4, 16, 28, 40];
  function glifo(i) {
    let s = `<svg class="glifo${i === 3 ? ' fin' : ''}" viewBox="0 0 44 8" aria-hidden="true">`;
    for (let k = 0; k < 3; k++) s += `<path d="M${XS[k]} 4H${XS[k + 1]}"${k < i ? ' class="on"' : ''}/>`;
    for (let k = 0; k < 4; k++) {
      const cls = [k <= i ? 'on' : '', k === i ? 'act' : ''].filter(Boolean).join(' ');
      s += `<circle cx="${XS[k]}" cy="4" r="${k === i ? 3.6 : 2.3}"${cls ? ` class="${cls}"` : ''}/>`;
    }
    return s + '</svg>';
  }

  // URL que se abre desde los campos de enlace (como la guarda el servidor).
  const urlDe = (v) => { v = String(v || '').trim(); if (!v) return ''; return /^https?:\/\//i.test(v) ? v : 'https://' + v; };

  // ---------------- Avisos ----------------
  function aviso(texto, { accion, alAccionar, error = false, ms = 4500 } = {}) {
    const cont = $('#avisos');
    const el = document.createElement('div');
    el.className = 'aviso' + (error ? ' err' : '');
    const t = document.createElement('span');
    t.textContent = texto;
    el.append(t);
    let cerrado = false;
    const cerrar = () => {
      if (cerrado) return; cerrado = true;
      el.classList.add('saliendo');
      setTimeout(() => el.remove(), 250);
    };
    if (accion) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = accion;
      b.addEventListener('click', () => { cerrar(); alAccionar && alAccionar(); });
      const tiempo = document.createElement('i');
      tiempo.className = 'tiempo';
      tiempo.style.animationDuration = ms + 'ms';
      el.append(b, tiempo);
    }
    cont.append(el);
    while (cont.children.length > 3) cont.firstElementChild.remove();
    setTimeout(cerrar, ms);
  }

  // ---------------- Grupos y filas ----------------
  function crearGrupos() {
    contGrupos.replaceChildren(...ESTADOS.map((e) => {
      const sec = document.createElement('section');
      sec.className = 'grupo';
      sec.dataset.estado = e.id;
      sec.setAttribute('aria-labelledby', 'g-' + e.id);
      sec.innerHTML = `<h2 class="grupo-cab" id="g-${e.id}"><span>${e.nombre}</span><b></b></h2><div class="grupo-filas"></div>`;
      grupos.set(e.id, { el: sec, cab: $('.grupo-cab', sec), cuenta: $('b', sec), filas: $('.grupo-filas', sec) });
      return sec;
    }));
    contGrupos.removeAttribute('aria-busy');
  }

  function crearFila(p) {
    const el = document.createElement('article');
    el.className = 'fila';
    el.dataset.id = p.id;
    el.innerHTML = `<button class="f-abrir" type="button"></button>
      <i class="insignia" aria-hidden="true"></i>
      <h3 class="f-nombre"></h3>
      <p class="f-idea"></p>
      <div class="f-acciones">
        <a class="icono f-sitio" target="_blank" rel="noopener noreferrer">${ICONOS.sitio}</a>
        <a class="icono f-repo" target="_blank" rel="noopener noreferrer">${ICONOS.repo}</a>
        <button class="f-mover" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="menu">Mover</button>
      </div>`;
    pintarFila(el, p);
    return el;
  }

  function pintarFila(el, p) {
    pintarInsignia($('.insignia', el), p.nombre, p.color);
    $('.f-abrir', el).setAttribute('aria-label', 'Editar ' + p.nombre);
    $('.f-nombre', el).textContent = p.nombre;
    const idea = $('.f-idea', el);
    idea.textContent = p.descripcion || 'Sin idea escrita todavía';
    idea.classList.toggle('vacia', !p.descripcion);
    for (const [cls, url, que] of [['.f-sitio', p.enlace, 'el sitio'], ['.f-repo', p.repo, 'el repositorio']]) {
      const a = $(cls, el);
      a.hidden = !url;
      if (url) {
        a.href = url;
        a.setAttribute('aria-label', `Abrir ${que} de ${p.nombre}`);
        a.title = `Abrir ${que}`;
      }
    }
    $('.f-mover', el).setAttribute('aria-label', `Mover ${p.nombre}, ahora en ${ESTADOS[IDX[p.estado]].nombre}`);
  }

  function visibles() {
    const q = norm(st.q.trim());
    return q ? st.proyectos.filter((p) => norm(p.nombre + ' ' + p.descripcion).includes(q)) : st.proyectos.slice();
  }

  // Un número que cambia rueda hasta su sitio.
  function ponerNumero(el, valor) {
    const v = String(valor);
    if (el.textContent === v) return;
    el.textContent = v;
    el.classList.remove('rueda');
    void el.offsetWidth;
    el.classList.add('rueda');
  }

  // El indicador aguamarina del filtro se desliza hasta la píldora elegida.
  const indicador = $('.filtro-ind');
  let indicadorListo = false;
  function moverIndicador() {
    const act = $('.filtro[aria-pressed="true"]');
    if (!indicador || !act) return;
    if (!indicadorListo) indicador.style.transition = 'none';
    indicador.style.width = act.offsetWidth + 'px';
    indicador.style.height = act.offsetHeight + 'px';
    indicador.style.transform = `translate(${act.offsetLeft}px, ${act.offsetTop}px)`;
    if (!indicadorListo) { void indicador.offsetWidth; indicador.style.transition = ''; indicadorListo = true; }
  }
  addEventListener('resize', () => { indicadorListo = false; moverIndicador(); });
  if (document.fonts) document.fonts.ready.then(() => { indicadorListo = false; moverIndicador(); });

  function contar(base) {
    const n = { todos: base.length };
    ESTADOS.forEach((e) => { n[e.id] = 0; });
    base.forEach((p) => { n[p.estado] += 1; });
    $$('.filtro').forEach((b) => {
      ponerNumero($('b', b), n[b.dataset.f]);
      b.setAttribute('aria-pressed', String(b.dataset.f === st.filtro));
    });
    moverIndicador();
  }

  // Reordena la lista con una transición: cada fila viaja a su nuevo sitio, las que salen se
  // desvanecen y las nuevas entran. Los nombres se ponen solo durante la transición.
  function conTransicion(cambio) {
    if (!document.startViewTransition || document.hidden) { cambio(); return Promise.resolve(); }
    const nombrados = new Set();
    const nombrar = () => {
      for (const [id, el] of filas) if (el.isConnected) { el.style.viewTransitionName = 'p' + id; nombrados.add(el); }
      for (const [id, g] of grupos) { g.cab.style.viewTransitionName = 'g-' + id; nombrados.add(g.cab); }
      const top = $('#top');
      top.style.viewTransitionName = 'barra'; nombrados.add(top);
    };
    nombrar();
    const t = document.startViewTransition(() => { cambio(); nombrar(); });
    t.finished.finally(() => nombrados.forEach((el) => { el.style.viewTransitionName = ''; }));
    return t.updateCallbackDone.catch(() => {});
  }

  // El resumen del saludo: cuántos van en desarrollo y cuántos ya llegaron.
  function resumir() {
    const r = $('#v-resumen');
    if (!r) return;
    const des = st.proyectos.filter((p) => p.estado === 'desarrollo').length;
    const pub = st.proyectos.filter((p) => p.estado === 'publicado').length;
    const n = (k, uno, varios) => `${k} ${k === 1 ? uno : varios}`;
    if (!st.proyectos.length) r.textContent = 'Anota tu primera idea y llévala a buen puerto.';
    else if (!des && !pub) r.textContent = `Tienes ${n(st.proyectos.length, 'idea anotada', 'ideas anotadas')}. Elige una y zarpa.`;
    else r.textContent = `Tienes ${n(des, 'proyecto', 'proyectos')} en desarrollo y ${n(pub, 'publicado', 'publicados')}.`;
  }

  function render() {
    const base = visibles();
    contar(base);
    resumir();
    const items = (st.filtro === 'todos' ? base : base.filter((p) => p.estado === st.filtro)).sort(porNombre);
    const vivos = new Set(items.map((p) => p.id));
    for (const [id, el] of filas) if (!vivos.has(id)) { el.remove(); filas.delete(id); }
    for (const e of ESTADOS) {
      const g = grupos.get(e.id);
      const suyos = items.filter((p) => p.estado === e.id);
      g.el.hidden = !suyos.length;
      ponerNumero(g.cuenta, suyos.length);
      const els = suyos.map((p) => {
        let el = filas.get(p.id);
        if (!el) { el = crearFila(p); filas.set(p.id, el); } else pintarFila(el, p);
        return el;
      });
      // Solo reordena si hace falta, para no perder el foco ni reiniciar animaciones.
      const actuales = Array.from(g.filas.children);
      if (actuales.length !== els.length || els.some((el, i) => actuales[i] !== el)) g.filas.replaceChildren(...els);
    }
    const vistos = ESTADOS.filter((e) => !grupos.get(e.id).el.hidden);
    for (const e of ESTADOS) grupos.get(e.id).el.classList.toggle('ultimo', vistos.length > 0 && e === vistos[vistos.length - 1]);

    vacio.hidden = items.length > 0;
    if (!items.length) {
      const h = $('h2', vacio);
      const t = $('p', vacio);
      const b = $('#vacio-accion');
      if (!st.proyectos.length) {
        h.textContent = 'Todavía no tienes proyectos';
        t.textContent = 'Anota tu primera idea. Con el nombre basta para empezar; lo demás lo completas cuando quieras.';
        b.textContent = 'Crear mi primer proyecto';
        b.dataset.accion = 'nuevo';
      } else if (st.q.trim()) {
        h.textContent = 'Ningún proyecto coincide con la búsqueda';
        t.textContent = 'Se busca en el nombre y en la idea de cada proyecto. Prueba con otra palabra.';
        b.textContent = 'Limpiar la búsqueda';
        b.dataset.accion = 'limpiar';
      } else {
        h.textContent = `No hay proyectos en ${ESTADOS[IDX[st.filtro]].nombre}`;
        t.textContent = 'Cuando muevas un proyecto a esta estación, aparecerá aquí.';
        b.textContent = 'Ver todos los proyectos';
        b.dataset.accion = 'todos';
      }
    }
  }

  function destellar(id) {
    const el = filas.get(id);
    if (!el) return;
    el.classList.remove('destello');
    void el.offsetWidth;
    el.classList.add('destello');
    setTimeout(() => el.classList.remove('destello'), 1500);
  }

  $('#vacio-accion').addEventListener('click', (ev) => {
    const a = ev.currentTarget.dataset.accion;
    if (a === 'nuevo') abrirPanel(null);
    else if (a === 'limpiar') { st.q = ''; buscar.value = ''; buscar.closest('.buscar').classList.remove('con-texto'); render(); }
    else if (a === 'todos') elegirFiltro('todos');
  });

  // ---------------- Cambiar de estación ----------------
  async function moverA(p, estado, { deshacer = true } = {}) {
    if (p.estado === estado) return;
    const antes = p.estado;
    p.estado = estado;
    conTransicion(render);
    destellar(p.id);
    try {
      Object.assign(p, await api('PATCH', `/api/proyectos/${p.id}`, { estado }));
    } catch (e) {
      p.estado = antes;
      render();
      aviso(e.message, { error: true });
      return;
    }
    if (deshacer) {
      aviso(estado === 'publicado' ? `${p.nombre} llegó a Publicado` : `Moviste ${p.nombre} a ${ESTADOS[IDX[estado]].nombre}`, {
        accion: 'Deshacer',
        alAccionar: () => moverA(p, antes, { deshacer: false }),
      });
    }
  }

  contGrupos.addEventListener('click', (ev) => {
    const fila = ev.target.closest('.fila');
    if (!fila) return;
    const p = st.proyectos.find((x) => String(x.id) === fila.dataset.id);
    if (!p) return;
    const mover = ev.target.closest('.f-mover');
    if (mover) { ev.stopPropagation(); if (menuDe && menuDe.boton === mover) cerrarMenu(); else abrirMenu(p, mover); return; }
    if (ev.target.closest('.f-abrir')) abrirPanel(p);
  });

  // ---------------- Menú para mover ----------------
  const menu = $('#menu');
  let menuDe = null; // { p, boton }

  function abrirMenu(p, boton) {
    cerrarMenu(false);
    menuDe = { p, boton };
    menu.innerHTML = ESTADOS.map((e, i) => `<button type="button" role="menuitemradio" tabindex="-1" aria-checked="${e.id === p.estado}" data-estado="${e.id}">${glifo(i)}<span>${e.nombre}</span>${ICONOS.check}</button>`).join('');
    menu.hidden = false;
    boton.setAttribute('aria-expanded', 'true');
    boton.closest('.fila').classList.add('con-menu');
    const r = boton.getBoundingClientRect();
    const alto = menu.offsetHeight;
    const ancho = menu.offsetWidth;
    const arriba = r.bottom + 6 + alto > innerHeight - 8;
    menu.classList.toggle('arriba', arriba);
    menu.style.top = (arriba ? r.top - alto - 6 : r.bottom + 6) + 'px';
    menu.style.left = Math.min(Math.max(8, r.right - ancho), innerWidth - ancho - 8) + 'px';
    ($('[aria-checked="true"]', menu) || menu.firstElementChild).focus({ preventScroll: true });
  }

  function cerrarMenu(devolverFoco = true) {
    if (!menuDe) return;
    const { boton } = menuDe;
    menu.hidden = true;
    menuDe = null;
    boton.setAttribute('aria-expanded', 'false');
    const fila = boton.closest('.fila');
    if (fila) fila.classList.remove('con-menu');
    if (devolverFoco && document.contains(boton)) boton.focus({ preventScroll: true });
  }

  menu.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b || !menuDe) return;
    const { p } = menuDe;
    cerrarMenu();
    moverA(p, b.dataset.estado);
  });
  menu.addEventListener('keydown', (ev) => {
    const bs = $$('button', menu);
    const i = bs.indexOf(document.activeElement);
    let sig = null;
    if (ev.key === 'ArrowDown') sig = bs[(i + 1) % bs.length];
    else if (ev.key === 'ArrowUp') sig = bs[(i - 1 + bs.length) % bs.length];
    else if (ev.key === 'Home') sig = bs[0];
    else if (ev.key === 'End') sig = bs[bs.length - 1];
    else if (ev.key === 'Escape') { ev.preventDefault(); cerrarMenu(); return; }
    else if (ev.key === 'Tab') { ev.preventDefault(); cerrarMenu(); return; }
    if (sig) { ev.preventDefault(); sig.focus(); }
  });
  document.addEventListener('click', (ev) => { if (menuDe && !menu.contains(ev.target)) cerrarMenu(false); });
  document.addEventListener('scroll', () => cerrarMenu(false), { passive: true, capture: true });
  addEventListener('resize', () => cerrarMenu(false));

  // ---------------- Filtro y búsqueda ----------------
  function elegirFiltro(f) {
    st.filtro = f;
    conTransicion(render);
    for (const sc of [$('#lista'), $('.vista')]) if (sc) sc.scrollTop = 0;
  }
  $('#filtros').addEventListener('click', (ev) => {
    const b = ev.target.closest('.filtro');
    if (b && b.dataset.f !== st.filtro) elegirFiltro(b.dataset.f);
  });
  buscar.addEventListener('input', () => {
    st.q = buscar.value;
    buscar.closest('.buscar').classList.toggle('con-texto', !!buscar.value);
    render();
  });
  buscar.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    if (buscar.value) { buscar.value = ''; st.q = ''; buscar.closest('.buscar').classList.remove('con-texto'); render(); }
    else buscar.blur();
  });

  // ---------------- Panel de crear y editar ----------------
  const velo = $('#velo');
  const panel = $('#panel');
  const pNombre = $('#p-nombre');
  const pDesc = $('#p-desc');
  const pEnlace = $('#p-enlace');
  const pRepo = $('#p-repo');
  const pEstado = $('#p-estado');
  const pColores = $('#p-colores');
  const pError = $('#p-error');
  const pGuardar = $('#p-guardar');
  const pEliminar = $('#p-eliminar');
  let ultimoFoco = null;

  function pintarRuta(ruta, estado) {
    const i = IDX[estado];
    ruta.style.setProperty('--i', i);
    $$('.estacion', ruta).forEach((b, k) => {
      b.classList.toggle('pasada', k < i);
      b.classList.toggle('actual', k === i);
      b.setAttribute('aria-pressed', String(k === i));
      b.setAttribute('aria-label', (k === i ? 'Está en ' : 'Mover a ') + ESTADOS[k].nombre);
    });
  }

  // Siete colores fijos y uno propio (el selector del sistema). Si el proyecto ya tiene un
  // color que no está entre los fijos, ese es el propio y aparece elegido.
  function pintarColores() {
    const actual = st.borrador.color;
    const propio = !COLORES.includes(actual);
    const botones = COLORES.map((c) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'color';
      b.style.setProperty('--sw', colorUi(c));
      b.dataset.color = c;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', 'Color ' + c);
      b.setAttribute('aria-checked', String(c === actual));
      b.tabIndex = c === actual ? 0 : -1;
      return b;
    });
    const otro = document.createElement('label');
    otro.className = 'color propio';
    otro.setAttribute('aria-checked', String(propio));
    if (propio) otro.style.setProperty('--sw', colorUi(actual));
    otro.innerHTML = `${ICONOS.mas}<input type="color" aria-label="Color propio">`;
    const input = $('input', otro);
    input.value = actual.toLowerCase();
    input.tabIndex = propio ? 0 : -1;
    input.addEventListener('input', () => elegirColor(input.value.toUpperCase()));
    pColores.replaceChildren(...botones, otro);
  }

  function elegirColor(c) {
    st.borrador.color = c;
    const propio = !COLORES.includes(c);
    $$('.color:not(.propio)', pColores).forEach((x) => {
      const on = x.dataset.color === c;
      x.setAttribute('aria-checked', String(on));
      x.tabIndex = on ? 0 : -1;
    });
    const otro = $('.propio', pColores);
    otro.setAttribute('aria-checked', String(propio));
    otro.style.setProperty('--sw', propio ? colorUi(c) : '');
    $('input', otro).tabIndex = propio ? 0 : -1;
    pintarInsigniaPanel();
  }

  const pInsignia = $('#p-insignia');
  function pintarInsigniaPanel() { pintarInsignia(pInsignia, pNombre.value || 'N', st.borrador.color); }

  function pintarIr(input) {
    const a = $('#' + input.id + '-ir');
    const u = urlDe(input.value);
    a.hidden = !u;
    if (u) a.href = u; else a.removeAttribute('href');
  }

  function abrirPanel(p) {
    cerrarMenu(false);
    st.editando = p || null;
    st.borrador = p
      ? { estado: p.estado, color: p.color }
      : { estado: st.filtro !== 'todos' ? st.filtro : 'idea', color: COLORES[0] };
    $('#p-titulo').textContent = p ? 'Editar proyecto' : 'Nuevo proyecto';
    pGuardar.textContent = p ? 'Guardar cambios' : 'Crear proyecto';
    pEliminar.hidden = !p;
    pNombre.value = p ? p.nombre : '';
    pDesc.value = p ? p.descripcion : '';
    pEnlace.value = p ? p.enlace : '';
    pRepo.value = p ? p.repo : '';
    pintarIr(pEnlace);
    pintarIr(pRepo);
    limpiarError();
    pintarColores();
    pintarInsigniaPanel();
    pintarRuta(pEstado, st.borrador.estado);
    $('#p-cuerpo').scrollTop = 0;
    ultimoFoco = document.activeElement;
    velo.classList.remove('saliendo');
    velo.hidden = false;
    html.classList.add('bloqueo');
    // En el celular no se abre el teclado de golpe al editar: primero se ve el proyecto.
    if (!p || conRaton.matches) setTimeout(() => pNombre.focus(), 30);
    else $('#p-cerrar').focus();
  }

  function cerrarPanel() {
    if (velo.hidden) return;
    velo.classList.add('saliendo');
    setTimeout(() => { velo.hidden = true; velo.classList.remove('saliendo'); }, reducido.matches ? 0 : 160);
    html.classList.remove('bloqueo');
    st.editando = null;
    if (ultimoFoco && document.contains(ultimoFoco)) ultimoFoco.focus({ preventScroll: true });
  }

  function limpiarError() { pError.textContent = ''; pNombre.removeAttribute('aria-invalid'); }

  $('#p-cerrar').addEventListener('click', cerrarPanel);
  pNombre.addEventListener('input', () => { limpiarError(); pintarInsigniaPanel(); });
  pEnlace.addEventListener('input', () => pintarIr(pEnlace));
  pRepo.addEventListener('input', () => pintarIr(pRepo));
  pEstado.addEventListener('click', (ev) => {
    const b = ev.target.closest('.estacion');
    if (!b) return;
    st.borrador.estado = b.dataset.estado;
    pintarRuta(pEstado, st.borrador.estado);
  });
  pColores.addEventListener('click', (ev) => {
    const b = ev.target.closest('button.color');
    if (b) elegirColor(b.dataset.color);
  });
  pColores.addEventListener('keydown', (ev) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(ev.key)) return;
    const bs = [...$$('button.color', pColores), $('.propio input', pColores)];
    const i = bs.indexOf(document.activeElement);
    const sig = bs[(i + (ev.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length];
    if (!sig) return;
    ev.preventDefault();
    sig.focus();
    if (sig.tagName === 'BUTTON') elegirColor(sig.dataset.color);
  });

  // El panel no se cierra con Escape ni tocando afuera; Tab no se sale de él.
  velo.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { ev.preventDefault(); return; }
    if (ev.key !== 'Tab') return;
    const focos = $$('button:not([hidden]):not([tabindex="-1"]), input:not([tabindex="-1"]), textarea, a[href]:not([hidden])', panel)
      .filter((x) => x.offsetParent !== null);
    const primero = focos[0];
    const ultimo = focos[focos.length - 1];
    if (ev.shiftKey && document.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
  });

  panel.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (pGuardar.disabled) return;
    const datos = {
      nombre: pNombre.value.trim(),
      descripcion: pDesc.value.trim(),
      estado: st.borrador.estado,
      color: st.borrador.color,
      enlace: pEnlace.value.trim(),
      repo: pRepo.value.trim(),
    };
    if (!datos.nombre) {
      pError.textContent = 'Ponle un nombre al proyecto.';
      pNombre.setAttribute('aria-invalid', 'true');
      pNombre.focus();
      return;
    }
    pGuardar.disabled = true;
    const texto = pGuardar.textContent;
    pGuardar.textContent = 'Guardando';
    try {
      const editando = st.editando;
      if (editando) {
        const p = await api('PATCH', `/api/proyectos/${editando.id}`, datos);
        Object.assign(editando, p);
        cerrarPanel();
        conTransicion(render).then(() => destellar(editando.id));
        aviso('Cambios guardados');
      } else {
        const p = await api('POST', '/api/proyectos', datos);
        st.proyectos.push(p);
        cerrarPanel();
        // Si el filtro o la búsqueda lo esconderían, se quitan para que se vea dónde quedó.
        if (st.filtro !== 'todos' && st.filtro !== p.estado) st.filtro = 'todos';
        if (st.q && !norm(p.nombre + ' ' + p.descripcion).includes(norm(st.q.trim()))) {
          st.q = ''; buscar.value = ''; buscar.closest('.buscar').classList.remove('con-texto');
        }
        conTransicion(render).then(() => mostrarRecien(p.id));
        aviso('Proyecto creado');
      }
    } catch (e) {
      pError.textContent = e.message;
    } finally {
      pGuardar.disabled = false;
      pGuardar.textContent = texto;
    }
  });

  function mostrarRecien(id) {
    const el = filas.get(id);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: reducido.matches ? 'auto' : 'smooth' });
    destellar(id);
  }

  // Eliminar: se mantiene presionado mientras la barra se llena. Al soltar antes, no pasa nada.
  let temporizador = null;
  const empezarBorrado = (ev) => {
    if (ev.type === 'keydown' && (ev.repeat || (ev.key !== 'Enter' && ev.key !== ' '))) return;
    if (ev.type === 'keydown') ev.preventDefault();
    if (temporizador || !st.editando) return;
    pEliminar.classList.add('llenando');
    temporizador = setTimeout(borrar, reducido.matches ? 600 : 900);
  };
  const cancelarBorrado = () => {
    clearTimeout(temporizador);
    temporizador = null;
    pEliminar.classList.remove('llenando');
  };
  pEliminar.addEventListener('pointerdown', empezarBorrado);
  pEliminar.addEventListener('keydown', empezarBorrado);
  ['pointerup', 'pointerleave', 'pointercancel', 'keyup', 'blur'].forEach((t) => pEliminar.addEventListener(t, cancelarBorrado));
  pEliminar.addEventListener('contextmenu', (ev) => ev.preventDefault());

  async function borrar() {
    temporizador = null;
    pEliminar.classList.remove('llenando');
    const p = st.editando;
    if (!p) return;
    cerrarPanel();
    st.proyectos = st.proyectos.filter((x) => x !== p);
    conTransicion(render);
    try {
      await api('DELETE', `/api/proyectos/${p.id}`);
    } catch (e) {
      st.proyectos.push(p);
      render();
      aviso(e.message, { error: true });
      return;
    }
    aviso(`Eliminaste ${p.nombre}`, {
      accion: 'Deshacer',
      ms: 6000,
      alAccionar: async () => {
        try {
          const { nombre, descripcion, estado, color, enlace, repo } = p;
          const nuevo = await api('POST', '/api/proyectos', { nombre, descripcion, estado, color, enlace, repo });
          st.proyectos.push(nuevo);
          conTransicion(render).then(() => mostrarRecien(nuevo.id));
        } catch (e) { aviso(e.message, { error: true }); }
      },
    });
  }

  $('#nuevo').addEventListener('click', () => abrirPanel(null));
  $('#nuevo-movil').addEventListener('click', () => abrirPanel(null));

  // ---------------- Cuenta ----------------
  const pop = $('#pop-cuenta');
  const btnCuenta = $('#cuenta');
  const cerrarPop = (foco) => {
    if (pop.hidden) return;
    pop.hidden = true;
    btnCuenta.setAttribute('aria-expanded', 'false');
    if (foco) btnCuenta.focus();
  };
  btnCuenta.addEventListener('click', (ev) => {
    ev.stopPropagation();
    cerrarMenu(false);
    if (!pop.hidden) { cerrarPop(); return; }
    pop.hidden = false;
    btnCuenta.setAttribute('aria-expanded', 'true');
  });
  document.addEventListener('click', (ev) => { if (!pop.hidden && !pop.contains(ev.target)) cerrarPop(); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') cerrarPop(true); });

  // ---------------- Tema ----------------
  function aplicarTema(t) {
    html.dataset.theme = t;
    // El tema elegido se guarda en una cookie de un año; la página la lee al empezar a cargar.
    document.cookie = `shipline_tema=${t}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    const m = $('meta[name=theme-color]');
    if (m) m.content = FONDOS[t];
    for (const [id, el] of filas) {
      const p = st.proyectos.find((x) => x.id === id);
      if (p) pintarInsignia($('.insignia', el), p.nombre, p.color);
    }
    if (!velo.hidden) { pintarColores(); pintarInsigniaPanel(); }
  }
  $('#tema').addEventListener('click', (ev) => {
    const nuevo = tema() === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition) { aplicarTema(nuevo); return; }
    const r = ev.currentTarget.getBoundingClientRect();
    const x = ev.clientX || r.left + r.width / 2;
    const y = ev.clientY || r.top + r.height / 2;
    const radio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const t = document.startViewTransition(() => aplicarTema(nuevo));
    t.ready.then(() => html.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
      { duration: 560, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', pseudoElement: '::view-transition-new(root)' },
    )).catch(() => {});
  });

  // ---------------- Atajos: "/" busca y "n" crea ----------------
  document.addEventListener('keydown', (ev) => {
    if (ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.altKey || !velo.hidden || menuDe) return;
    if (ev.target.closest && ev.target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;
    if (ev.key === '/') { ev.preventDefault(); buscar.focus(); }
    else if (ev.key === 'n' || ev.key === 'N') { ev.preventDefault(); abrirPanel(null); }
  });

  // ---------------- Desvanecidos de «hay más»: el filtro (de lado) y la lista (arriba y abajo) ----------------
  function desvanecer(cont, scroller, vertical) {
    let pend = false;
    const medir = () => {
      pend = false;
      if (vertical) {
        cont.classList.toggle('on-a', scroller.scrollTop > 2);
        cont.classList.toggle('on-b', scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 2);
      } else {
        cont.classList.toggle('on-a', scroller.scrollLeft > 2);
        cont.classList.toggle('on-b', scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2);
      }
    };
    const pedir = () => { if (!pend) { pend = true; requestAnimationFrame(medir); } };
    scroller.addEventListener('scroll', pedir, { passive: true });
    new ResizeObserver(pedir).observe(scroller);
    new MutationObserver(pedir).observe(scroller, { childList: true, subtree: true });
    pedir();
  }
  desvanecer($('.filtros-cont'), $('#filtros'), false);
  desvanecer($('.lista-cont'), $('#lista'), true);

  // ---------------- Inicio ----------------
  async function cargar() {
    contar([]);
    try {
      st.proyectos = await api('GET', '/api/proyectos');
    } catch (e) {
      aviso(e.message, { error: true, ms: 8000 });
      st.proyectos = [];
    }
    crearGrupos();
    contGrupos.classList.add('entrando');
    render();
    let n = 0;
    for (const g of grupos.values()) for (const el of g.filas.children) el.style.setProperty('--n', n++);
    setTimeout(() => contGrupos.classList.remove('entrando'), 1900);
    const params = new URLSearchParams(location.search);
    if (params.has('nuevo')) {
      history.replaceState(null, '', '/');
      abrirPanel(null);
    }
  }
  cargar();

  if ('serviceWorker' in navigator) {
    addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
})();
