const express  = require('express');
const jwt      = require('jsonwebtoken');
const Busqueda = require('../models/Busqueda');
const { agregarPreciosConvertidos, getCotizacion } = require('../services/dolar');

const router = express.Router();

// Fuentes externas disponibles. Para sumar una nueva, basta con crear el
// adapter en /sources y agregarlo aca (ver DOCUMENTACION.md).
const FUENTES = {
  mercadolibre: require('../sources/mercadolibre'),
  fakestore:    require('../sources/fakestore'),
  dummyjson:    require('../sources/dummyjson')
};

// ── GET /api/productos/buscar?q=iphone&limite=12&fuentes=mercadolibre,dummyjson ─
router.get('/buscar', async (req, res) => {
  try {
    const { q, limite = 12 } = req.query;
    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'El parámetro "q" es obligatorio.' });
    }
    const termino = q.trim();

    // Permite filtrar que fuentes consultar (por defecto, todas)
    const pedidas = (req.query.fuentes || '').split(',').map((s) => s.trim()).filter(Boolean);
    const activas = pedidas.length ? pedidas.filter((f) => FUENTES[f]) : Object.keys(FUENTES);

    // Consultamos todas las fuentes en paralelo; si una falla, no rompe el resto
    const resultados = await Promise.allSettled(
      activas.map((f) => FUENTES[f].buscar(termino, limite))
    );

    let productos = [];
    const por_fuente = {};
    resultados.forEach((r, i) => {
      const fuente = activas[i];
      if (r.status === 'fulfilled') {
        por_fuente[fuente] = r.value.length;
        productos = productos.concat(r.value);
      } else {
        por_fuente[fuente] = 0;
        console.error(`Fuente "${fuente}" falló:`, r.reason?.message);
      }
    });

    // Convertimos monedas con DolarAPI y ordenamos por precio (los sin precio, al final)
    productos = await agregarPreciosConvertidos(productos);
    productos.sort((a, b) => {
      if (a.precio_usd == null) return 1;
      if (b.precio_usd == null) return -1;
      return a.precio_usd - b.precio_usd;
    });

    const cotizacion = await getCotizacion();

    // Si el usuario esta logueado, registramos la busqueda en su historial
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await Busqueda.create({
          usuario_id: decoded.id,
          termino,
          filtros_json: { fuentes: activas },
          resultados: productos.length
        });
      } catch (_) {}
    }

    res.json({ termino, total: productos.length, por_fuente, cotizacion, productos });
  } catch (err) {
    console.error('Error buscando productos:', err.message);
    res.status(500).json({ error: 'Error al buscar productos.' });
  }
});

// ── GET /api/productos/cotizacion ─────────────────────────────────────────────
router.get('/cotizacion', async (_req, res) => {
  try {
    res.json(await getCotizacion());
  } catch {
    res.status(500).json({ error: 'No se pudo obtener la cotización.' });
  }
});

module.exports = router;
