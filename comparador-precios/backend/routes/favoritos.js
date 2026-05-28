const express    = require('express');
const autenticar = require('../middleware/auth');
const Favorito   = require('../models/Favorito');

const router = express.Router();

// ── POST /api/favoritos  (guardar un favorito) ────────────────────────────────
router.post('/', autenticar, async (req, res) => {
  try {
    const {
      fuente_id, fuente_api, fuente_label, nombre, precio, moneda,
      precio_ars, precio_usd, imagen_url, url_compra, tienda, categoria,
      condicion, sin_precio
    } = req.body;

    if (!fuente_id || !nombre) {
      return res.status(400).json({ error: 'fuente_id y nombre son obligatorios.' });
    }

    const favorito = await Favorito.create({
      usuario_id: req.usuario.id,
      fuente_id, fuente_api, fuente_label, nombre, precio, moneda,
      precio_ars, precio_usd, imagen_url, url_compra, tienda, categoria,
      condicion, sin_precio
    });

    res.status(201).json({ mensaje: 'Producto guardado en favoritos ❤️', favorito });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Este producto ya está en tus favoritos.' });
    }
    res.status(500).json({ error: 'Error al guardar favorito.' });
  }
});

// ── GET /api/favoritos  (mis favoritos) ───────────────────────────────────────
router.get('/', autenticar, async (req, res) => {
  try {
    const favoritos = await Favorito.find({ usuario_id: req.usuario.id }).sort({ guardado_en: -1 });
    res.json({ total: favoritos.length, favoritos });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener favoritos.' });
  }
});

// ── DELETE /api/favoritos/:fuente_id  (eliminar favorito) ─────────────────────
router.delete('/:fuente_id', autenticar, async (req, res) => {
  try {
    const eliminado = await Favorito.findOneAndDelete({
      usuario_id: req.usuario.id,
      fuente_id:  req.params.fuente_id
    });

    if (!eliminado) return res.status(404).json({ error: 'Favorito no encontrado.' });
    res.json({ mensaje: 'Favorito eliminado.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar favorito.' });
  }
});

module.exports = router;
