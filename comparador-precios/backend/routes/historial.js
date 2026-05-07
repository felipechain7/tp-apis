const express    = require('express');
const autenticar = require('../middleware/auth');
const Busqueda   = require('../models/Busqueda');

const router = express.Router();

// ── GET /api/historial  (mis búsquedas) ───────────────────────────────────────
router.get('/', autenticar, async (req, res) => {
  try {
    const historial = await Busqueda.find({ usuario_id: req.usuario.id })
      .sort({ realizado_en: -1 })
      .limit(20);

    res.json({ total: historial.length, historial });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial.' });
  }
});

module.exports = router;
