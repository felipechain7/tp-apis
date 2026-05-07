const express  = require('express');
const axios    = require('axios');
const Busqueda = require('../models/Busqueda');

const router = express.Router();

const API_BASE = 'https://dummyjson.com';

router.get('/buscar', async (req, res) => {
  try {
    const { q, limite = 12 } = req.query;
    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'El parámetro "q" es obligatorio.' });
    }

    const { data } = await axios.get(`${API_BASE}/products/search`, {
      params: { q: q.trim(), limit: Math.min(Number(limite), 30) }
    });

    const productos = data.products.map((item) => ({
      fuente_id:    String(item.id),
      fuente_api:   'dummyjson',
      nombre:       item.title,
      precio:       item.price,
      moneda:       'USD',
      imagen_url:   item.thumbnail,
      url_compra:   `https://dummyjson.com/products/${item.id}`,
      tienda:       item.brand || 'Tienda online',
      disponible:   item.stock > 0,
      condicion:    'Nuevo',
      envio_gratis: false
    }));

    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await Busqueda.create({
          usuario_id: decoded.id,
          termino:    q.trim(),
          resultados: productos.length
        });
      } catch (_) {}
    }

    res.json({ termino: q, total: data.total, productos });
  } catch (err) {
    console.error('Error buscando productos:', err.message);
    res.status(500).json({ error: 'Error al buscar productos.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data: item } = await axios.get(`${API_BASE}/products/${req.params.id}`);
    res.json({
      fuente_id:   String(item.id),
      fuente_api:  'dummyjson',
      nombre:      item.title,
      precio:      item.price,
      moneda:      'USD',
      descripcion: item.description,
      imagen_url:  item.thumbnail,
      imagenes:    item.images || [],
      url_compra:  `https://dummyjson.com/products/${item.id}`,
      condicion:   'Nuevo',
      disponible:  item.stock > 0,
      stock:       item.stock,
      categoria:   item.category,
      atributos: [
        { nombre: 'Marca',     valor: item.brand },
        { nombre: 'Rating',    valor: String(item.rating) },
        { nombre: 'Descuento', valor: `${item.discountPercentage}%` }
      ]
    });
  } catch (err) {
    res.status(404).json({ error: 'Producto no encontrado.' });
  }
});

module.exports = router;