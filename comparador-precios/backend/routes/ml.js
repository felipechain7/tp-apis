const express = require('express');
const axios   = require('axios');
const { getAuthUrl, exchangeCode, getUserToken } = require('../services/mlToken');

const router = express.Router();

// ── GET /api/ml/auth ──────────────────────────────────────────────────────────
// Redirige al login de Mercado Libre (flujo OAuth, se hace UNA sola vez).
router.get('/auth', (req, res) => {
  if (!process.env.ML_APP_ID || !process.env.ML_REDIRECT_URI) {
    return res.status(500).json({ error: 'Falta configurar ML_APP_ID y ML_REDIRECT_URI en .env' });
  }
  res.redirect(getAuthUrl());
});

// ── GET /api/ml/callback?code=... ─────────────────────────────────────────────
// ML redirige aca tras el login. Cambiamos el code por tokens y los guardamos.
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Falta el parámetro "code".');
  try {
    await exchangeCode(code);
    res.send('✅ Mercado Libre conectado. Ya podés cerrar esta pestaña y usar la app.');
  } catch (err) {
    console.error('ML callback error:', err.response?.data || err.message);
    res.status(500).send('Error al conectar con Mercado Libre. Revisá la consola del backend.');
  }
});

// ── GET /api/ml/status ────────────────────────────────────────────────────────
// Diagnostico: dice si tenemos token de usuario y si la busqueda de items anda.
router.get('/status', async (_req, res) => {
  const token = await getUserToken();
  if (!token) {
    return res.json({ conectado: false, items_habilitados: false, mensaje: 'Sin token de usuario. Visitá /api/ml/auth.' });
  }
  try {
    await axios.get('https://api.mercadolibre.com/sites/MLA/search', {
      params: { q: 'test', limit: 1 },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });
    res.json({ conectado: true, items_habilitados: true, mensaje: 'ML entrega precios de items ✅' });
  } catch (err) {
    res.json({
      conectado: true,
      items_habilitados: false,
      mensaje: `ML conectado pero la búsqueda de items devolvió ${err.response?.status}. Se usa el catálogo (sin precio).`
    });
  }
});

module.exports = router;
