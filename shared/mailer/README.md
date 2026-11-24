# Módulo de correo acmsy (Resend)

Módulo reutilizable para enviar correos desde cualquier app de acmsy. Sin
dependencias (usa `fetch`, Node 18+). Los correos salen por Resend.

## Archivos
- `mailer.js` — `sendEmail()` y `senderFor()`.
- `templates.js` — plantillas de marca: `passwordReset`, `accountConfirm`, `notice`.
- `send-test.js` — prueba de envío real.
- `.env.example` — variables que necesita (cópialo a `.env`).

## Configuración (.env)
```
RESEND_API_KEY=...           # clave de Resend
MAIL_FROM=noreply@acmsy.com  # remitente (dominio raíz verificado)
MAIL_FROM_NAME=acmsy         # nombre visible por defecto
```
Nunca subas el `.env` a git (ya está en el `.gitignore`).

## Uso en una app
```js
const { sendEmail } = require('./mailer');
const { passwordReset } = require('./templates');

const t = passwordReset({ appName: 'Hibi', url: enlaceUnico, minutes: 30 });
await sendEmail({
  to: 'usuario@correo.com',
  subject: t.subject,
  html: t.html,
  text: t.text,
  displayName: 'Hibi',          // nombre visible del remitente
  // from: 'noreply@acmsy.com',  // opcional; por defecto usa MAIL_FROM
});
```

## Remitente por subdominio
Por defecto todas las apps envían desde `noreply@acmsy.com` (el dominio raíz
verificado en Resend) con un nombre visible distinto por app (`displayName`).

Si quieres que una app envíe literalmente desde `noreply@su-subdominio.acmsy.com`,
ese subdominio debe verificarse aparte en Resend (registros DNS propios). Mientras
no lo verifiques, usa el dominio raíz: es lo recomendado para no repetir DNS en
cada app.

## Prueba
```
RESEND_API_KEY=tu_clave node send-test.js tu-correo@ejemplo.com
```
