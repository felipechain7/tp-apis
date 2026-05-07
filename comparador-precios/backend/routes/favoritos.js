const express    = require('express');
const autenticar = require('../middleware/auth');
const Favorito   = require('../models/Favorito');

const router = express.Router();

// ── POST /api/favoritos  (guardar un favorito) ────────────────────────────────
router.post('/', autenticar, async (req, res) => {
  try {
    const { fuente_id, fuente_api, nombre, precio, moneda, imagen_url, url_compra, categoria } = req.body;

    if (!fuente_id || !nombre || precio === undefined) {
      return res.status(400).json({ error: 'fuente_id, nombre y precio son obligatorios.' });
    }

    const favorito = await Favorito.create({
      usuario_id: req.usuario.id,
      fuente_id, fuente_api, nombre, precio, moneda, imagen_url, url_compra, categoria
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
