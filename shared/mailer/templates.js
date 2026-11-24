'use strict';
/**
 * Plantillas de correo de acmsy. En espanol, sobrias, sin degradados ni emojis.
 * Identidad de marca: fondo #0B0119 / #1F0245, acento #7008F7, texto #F1E6FE / #D7BAFD.
 * Email requiere estilos en linea y maquetacion con tablas (no usar CSS externo).
 *
 * Cada plantilla devuelve { subject, html, text } listo para sendEmail().
 */

const C = {
  bg: '#0B0119',
  card: '#1F0245',
  accent: '#7008F7',
  text: '#F1E6FE',
  muted: '#D7BAFD',
  border: '#2C0361',
};
const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';

function layout({ title, bodyHtml, appName }) {
  const brand = appName ? `acmsy &middot; ${appName}` : 'acmsy';
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${C.card};border-radius:14px;border:1px solid ${C.border};font-family:${FONT};">
<tr><td style="padding:24px 28px 6px;">
<div style="font-size:15px;font-weight:600;letter-spacing:.02em;color:${C.text};">${brand}</div>
</td></tr>
<tr><td style="padding:6px 28px 26px;">
<h1 style="margin:0 0 14px;font-size:19px;font-weight:600;color:${C.text};">${title}</h1>
${bodyHtml}
</td></tr>
</table>
<div style="max-width:480px;color:${C.muted};opacity:.55;font-size:11px;font-family:${FONT};padding:16px 8px;">Enviado por acmsy. Si no esperabas este correo, puedes ignorarlo.</div>
</td></tr></table></body></html>`;
}

function button(label, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;"><tr>
<td style="background:${C.accent};border-radius:10px;">
<a href="${url}" style="display:inline-block;padding:11px 22px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;font-family:${FONT};">${label}</a>
</td></tr></table>`;
}

const p = (t) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${C.muted};">${t}</p>`;
const small = (t) => `<p style="margin:14px 0 0;font-size:12px;line-height:1.55;color:${C.muted};opacity:.7;word-break:break-all;">${t}</p>`;

/** Recuperacion de contrasena. */
function passwordReset({ appName, url, minutes = 30 } = {}) {
  const title = 'Restablecer tu contraseña';
  const bodyHtml =
    p('Recibimos una solicitud para restablecer la contraseña de tu cuenta.') +
    button('Crear nueva contraseña', url) +
    p(`Este enlace caduca en ${minutes} minutos y solo puede usarse una vez.`) +
    p('Si no fuiste tú, ignora este correo: tu contraseña no cambiará.') +
    small('Si el botón no funciona, copia y pega este enlace:<br>' + url);
  return {
    subject: `Restablecer tu contraseña${appName ? ' - ' + appName : ''}`,
    html: layout({ title, bodyHtml, appName }),
    text: `Restablecer tu contraseña\n\nAbre este enlace para crear una nueva contraseña (caduca en ${minutes} minutos, un solo uso):\n${url}\n\nSi no fuiste tú, ignora este correo.`,
  };
}

/** Confirmacion de cuenta. */
function accountConfirm({ appName, url } = {}) {
  const title = 'Confirma tu cuenta';
  const bodyHtml =
    p('Gracias por registrarte. Confirma tu correo para activar tu cuenta.') +
    button('Confirmar mi cuenta', url) +
    p('Si no creaste esta cuenta, puedes ignorar este correo.') +
    small('Si el botón no funciona, copia y pega este enlace:<br>' + url);
  return {
    subject: `Confirma tu cuenta${appName ? ' - ' + appName : ''}`,
    html: layout({ title, bodyHtml, appName }),
    text: `Confirma tu cuenta\n\nAbre este enlace para activar tu cuenta:\n${url}\n\nSi no creaste esta cuenta, ignora este correo.`,
  };
}

/** Aviso generico (con accion opcional). */
function notice({ appName, heading, message, actionLabel, actionUrl } = {}) {
  const title = heading || 'Aviso';
  let bodyHtml = p(message || '');
  if (actionLabel && actionUrl) bodyHtml += button(actionLabel, actionUrl);
  return {
    subject: `${title}${appName ? ' - ' + appName : ''}`,
    html: layout({ title, bodyHtml, appName }),
    text: `${title}\n\n${message || ''}${actionUrl ? '\n\n' + actionUrl : ''}`,
  };
}

module.exports = { passwordReset, accountConfirm, notice, layout };
