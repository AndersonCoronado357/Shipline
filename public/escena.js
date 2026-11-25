'use strict';
/* Shipline: el mar de la escena. El barco navega de verdad: avanza por el mar, sube y baja con la
   ola que tiene debajo, se inclina con su pendiente y deja una estela de espuma. El barco amarrado y
   la botella también se mecen con la misma ola.

   La ola de referencia es la capa o2 (la que pasa por delante del casco). Su forma en su viewBox de
   1440 x 120 es base 72 y media altura 6.5, con un periodo de 360 (ver "ola" en views.js). El SVG mide
   el doble del ancho visible y su animación lo corre la mitad, así que su desplazamiento se lee de la
   propia animación CSS y el barco queda siempre sobre el agua que se ve. */
(() => {
  const TAU = Math.PI * 2;
  const BASE = 72;
  const ALTO = 6.5;
  const PERIODO = 360;

  // Altura del agua (px desde arriba de .olas) y su pendiente en la posición p (px desde la izquierda).
  function superficie(ola, W, H, p) {
    const anim = ola.getAnimations()[0];
    let frac = 0;
    if (anim && anim.currentTime != null) {
      const dur = anim.effect.getComputedTiming().duration || 1;
      frac = (anim.currentTime % dur) / dur;
    }
    const ux = 1440 / (2 * W);
    const ang = (TAU * (p + W * frac) * ux) / PERIODO;
    const y = ((BASE + ALTO * Math.sin(ang)) * H) / 120;
    const pendiente = ALTO * Math.cos(ang) * (TAU / PERIODO) * ux * (H / 120);
    return [y, pendiente];
  }

  // Una pizca de espuma detrás de la popa, que se queda atrás con el agua y se deshace.
  function espuma(olas, antesDe, x, y, dir) {
    const e = document.createElement('i');
    e.className = 'espuma';
    e.style.left = x.toFixed(1) + 'px';
    e.style.top = y.toFixed(1) + 'px';
    e.style.setProperty('--dir', dir);
    olas.insertBefore(e, antesDe);
    e.addEventListener('animationend', () => e.remove());
  }

  function iniciar(escena) {
    const olas = escena.querySelector('.olas');
    const ola = escena.querySelector('.o2');
    const cosas = Array.from(escena.querySelectorAll('[data-modo]'));
    if (!olas || !ola || !cosas.length) return;

    // modo: cruzar (atraviesa el mar y vuelve a entrar por el otro lado), vaiven (va y vuelve dando
    // la vuelta), amarrado (quieto junto al muelle) o flotar (deriva despacio sin girar).
    const estado = cosas.map((el) => ({
      el,
      modo: el.dataset.modo,
      desde: parseFloat(el.dataset.desde || '0'),
      hasta: parseFloat(el.dataset.hasta || '1'),
      hundido: parseFloat(el.dataset.hundido || '.25'),
      inclina: parseFloat(el.dataset.inclina || '1.4'),
      vel: parseFloat(el.dataset.vel || '24'),
      x: null,
      dir: 1,
      giro: 1,
      espuma: 0,
    }));
    estado.forEach((s) => s.el.classList.add('navega'));

    let antes = performance.now();
    function mover(s, W, H, dt, ahora) {
      // Los SVG no tienen offsetWidth: se mide la caja CSS (sin el giro ni la inclinación).
      const caja = getComputedStyle(s.el);
      const bw = parseFloat(caja.width) || 0;
      const bh = parseFloat(caja.height) || 0;
      const a = W * s.desde;
      const b = W * s.hasta - bw;
      const v = W / (s.vel * 1000);
      if (s.x == null) s.x = s.modo === 'cruzar' ? W * 0.32 : s.modo === 'amarrado' ? a : (a + b) / 2;
      if (s.modo === 'cruzar') {
        s.x += v * dt;
        if (s.x > W + 30) s.x = -bw - 30;
      } else if (s.modo === 'vaiven' || s.modo === 'flotar') {
        s.x += v * dt * s.dir;
        if (s.x > b) { s.x = b; s.dir = -1; } else if (s.x < a) { s.x = a; s.dir = 1; }
      } else {
        s.x = a;
      }
      // Al llegar a un extremo el barco da la vuelta: se estrecha y se abre hacia el otro lado.
      const meta = s.modo === 'vaiven' ? s.dir : 1;
      s.giro += (meta - s.giro) * Math.min(1, dt / 260);

      const cx = s.x + bw / 2;
      const [y, pendiente] = superficie(ola, W, H, cx);
      // El barco amarrado además se balancea un poco aunque el agua no lo mueva de sitio.
      const vaiven = s.modo === 'amarrado' ? Math.sin(ahora / 900) * 0.035 : 0;
      const angulo = Math.atan(pendiente) * s.inclina + vaiven;
      const top = y - bh * (1 - s.hundido);
      s.el.style.transform = `translate(${s.x.toFixed(1)}px, ${top.toFixed(1)}px) rotate(${angulo.toFixed(4)}rad) scaleX(${s.giro.toFixed(3)})`;

      if ((s.modo === 'cruzar' || s.modo === 'vaiven') && ahora - s.espuma > 260 && s.x > -bw && s.x < W) {
        s.espuma = ahora;
        const lado = s.giro >= 0 ? 1 : -1;
        espuma(olas, ola, cx - lado * bw * 0.4, y - 4, lado);
      }
    }
    function cuadro(ahora) {
      // Si la escena ya no está en la página (se cambió de pantalla), este mar se detiene.
      if (!escena.isConnected) return;
      const dt = Math.min(64, ahora - antes);
      antes = ahora;
      const W = olas.clientWidth;
      const H = olas.clientHeight;
      if (W && H) for (const s of estado) mover(s, W, H, dt, ahora);
      requestAnimationFrame(cuadro);
    }
    // Primera posición ya, antes de pintar, para que no aparezca en otro sitio y salte.
    const W0 = olas.clientWidth;
    const H0 = olas.clientHeight;
    if (W0 && H0) for (const s of estado) mover(s, W0, H0, 0, antes);
    requestAnimationFrame(cuadro);
  }

  // marea.js la usa para dar vida al mar de la pantalla nueva sin recargar.
  window.ShiplineEscena = iniciar;
  document.querySelectorAll('.escena').forEach(iniciar);
})();
