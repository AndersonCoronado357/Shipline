'use strict';
/**
 * Modulo de correo reutilizable para las apps de acmsy.
 * Envia a traves de Resend usando fetch (sin dependencias externas: funciona en
 * Node 18+). Configura la clave en el entorno como RESEND_API_KEY.
 *
 * Uso tipico:
 *   const { sendEmail } = require('./mailer');
 *   const { passwordReset } = require('./templates');
 *   const t = passwordReset({ appName: 'Hibi', url, minutes: 30 });
 *   await sendEmail({ to, subject: t.subject, html: t.html, text: t.text, displayName: 'Hibi' });
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function getApiKey() {
  const k = process.env.RESEND_API_KEY;
  if (!k) throw new Error('Falta RESEND_API_KEY en el entorno (.env).');
  return k;
}

/**
 * Construye el remitente "Nombre <correo>".
 * Por defecto envia desde el dominio raiz verificado (noreply@acmsy.com). Puedes
 * sobreescribir la direccion con MAIL_FROM o el parametro from, y el nombre
 * visible con MAIL_FROM_NAME o displayName (p.ej. el nombre de la app).
 */
function senderFor({ from, displayName } = {}) {
  const address = from || process.env.MAIL_FROM || 'noreply@acmsy.com';
  const name = displayName || process.env.MAIL_FROM_NAME || 'acmsy';
  return `${name} <${address}>`;
}

/**
 * Envia un correo. Devuelve { ok: true, id } o lanza un error con detalle.
 * @param {object} o
 * @param {string|string[]} o.to   destinatario(s)
 * @param {string} o.subject       asunto
 * @param {string} [o.html]        cuerpo HTML
 * @param {string} [o.text]        cuerpo en texto plano (recomendado para no caer en spam)
 * @param {string} [o.from]        direccion remitente (def. MAIL_FROM o noreply@acmsy.com)
 * @param {string} [o.displayName] nombre visible del remitente
 * @param {string} [o.replyTo]     direccion de respuesta
 */
async function sendEmail({ to, subject, html, text, from, displayName, replyTo }) {
  if (!to) throw new Error('Falta el destinatario (to).');
  if (!subject) throw new Error('Falta el asunto (subject).');
  if (!html && !text) throw new Error('Falta el contenido (html o text).');

  const payload = {
    from: senderFor({ from, displayName }),
    to: Array.isArray(to) ? to : [to],
    subject,
  };
  if (html) payload.html = html;
  if (text) payload.text = text;
  if (replyTo) payload.reply_to = replyTo;

  let res, data;
  try {
    res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getApiKey()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    data = await res.json().catch(() => ({}));
  } catch (e) {
    // Fallo de red / DNS: se registra y se propaga con contexto.
    console.error('[mailer] Fallo de red al contactar Resend:', e.message);
    throw new Error('No se pudo contactar a Resend: ' + e.message);
  }

  if (!res.ok) {
    console.error('[mailer] Resend respondio', res.status, JSON.stringify(data));
    throw new Error((data && data.message) || ('Resend devolvio un error ' + res.status));
  }
  return { ok: true, id: data.id };
}

module.exports = { sendEmail, senderFor };
