const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';
// Archivo donde persistimos el token de usuario (rotado). Esta gitignored.
const STORE = path.join(__dirname, '..', '.ml_token.json');

const CLIENT_ID = process.env.ML_APP_ID;
const CLIENT_SECRET = process.env.ML_CLIENT_SECRET;
const REDIRECT_URI = process.env.ML_REDIRECT_URI;

// ── Cache en memoria del token de app (client_credentials) ────────────────────
let appToken = null;
let appExp = 0;

// ── Cache del token de usuario (persistido en disco) ──────────────────────────
function leerStore() {
  try {
    return JSON.parse(fs.readFileSync(STORE, 'utf8'));
  } catch {
    // Semilla desde .env si nunca se hizo el flujo OAuth
    if (process.env.ML_REFRESH_TOKEN) {
      return { refresh_token: process.env.ML_REFRESH_TOKEN, access_token: null, expira_en: 0 };
    }
    return null;
  }
}

function guardarStore(data) {
  fs.writeFileSync(STORE, JSON.stringify(data, null, 2));
}

// ── Token de app: sirve para el catalogo (sin precios) ────────────────────────
async function getAppToken() {
  if (appToken && Date.now() < appExp) return appToken;
  if (!CLIENT_ID || !CLIENT_SECRET) return null;

  const { data } = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    }),
    { headers: { 'content-type': 'application/x-www-form-urlencoded' }, timeout: 12000 }
  );

  appToken = data.access_token;
  appExp = Date.now() + (data.expires_in - 300) * 1000; // margen de 5 min
  return appToken;
}

// ── Token de usuario: necesario para intentar precios de items reales ─────────
async function getUserToken() {
  const store = leerStore();
  if (!store) return null;

  // Access token todavia valido
  if (store.access_token && Date.now() < store.expira_en) {
    return store.access_token;
  }

  // Refrescar (los refresh token de ML son de un solo uso: rotan)
  if (!store.refresh_token || !CLIENT_ID || !CLIENT_SECRET) return null;

  try {
    const { data } = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: store.refresh_token
      }),
      { headers: { 'content-type': 'application/x-www-form-urlencoded' }, timeout: 12000 }
    );

    guardarStore({
      access_token: data.access_token,
      refresh_token: data.refresh_token, // nuevo refresh token rotado
      expira_en: Date.now() + (data.expires_in - 300) * 1000
    });

    return data.access_token;
  } catch (err) {
    console.error('ML: no se pudo refrescar el token de usuario:', err.response?.data || err.message);
    return null;
  }
}

// ── Flujo OAuth de una sola vez: cambiar code por tokens ──────────────────────
function getAuthUrl() {
  return (
    'https://auth.mercadolibre.com.ar/authorization?response_type=code' +
    `&client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI || '')}`
  );
}

async function exchangeCode(code) {
  const { data } = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI
    }),
    { headers: { 'content-type': 'application/x-www-form-urlencoded' }, timeout: 12000 }
  );

  guardarStore({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expira_en: Date.now() + (data.expires_in - 300) * 1000
  });

  return data;
}

module.exports = { getAppToken, getUserToken, getAuthUrl, exchangeCode };
