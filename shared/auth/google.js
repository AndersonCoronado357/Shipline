'use strict';
/**
 * "Entrar con Google" (OAuth 2.0) implementado con fetch, sin dependencias.
 * Usa GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET del entorno (un unico proyecto de
 * Google para todas las apps; ver login-google.md).
 */

// URL a la que se envia al usuario para que elija su cuenta de Google.
function authUrl({ clientId, redirectUri, state }) {
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  });
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + p.toString();
}

// Intercambia el 'code' por tokens.
async function exchangeCode({ code, clientId, clientSecret, redirectUri }) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('Google rechazo el intercambio de codigo: ' + (data.error_description || res.status));
  return data; // { access_token, id_token, ... }
}

// Obtiene los datos del usuario (correo, nombre, id).
async function fetchProfile(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: 'Bearer ' + accessToken },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('No se pudo leer el perfil de Google: ' + res.status);
  // sub = id unico de Google; email, email_verified, name
  return { googleId: data.sub, email: data.email, emailVerified: !!data.email_verified, name: data.name || null };
}

module.exports = { authUrl, exchangeCode, fetchProfile };
