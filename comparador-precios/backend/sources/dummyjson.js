const axios = require('axios');

const API_BASE = 'https://dummyjson.com';

// Devuelve productos normalizados desde DummyJSON. Precios en USD.
async function buscar(q, limite = 12) {
  const { data } = await axios.get(`${API_BASE}/products/search`, {
    params: { q, limit: Math.min(Number(limite), 30) },
    timeout: 12000
  });

  return data.products.map((item) => ({
    fuente_id:    `dummyjson-${item.id}`,
    fuente_api:   'dummyjson',
    fuente_label: 'Tienda Online',
    nombre:       item.title,
    precio:       item.price,
    moneda:       'USD',
    imagen_url:   item.thumbnail,
    url_compra:   `https://dummyjson.com/products/${item.id}`,
    tienda:       item.brand || 'DummyJSON Store',
    categoria:    item.category,
    disponible:   item.stock > 0,
    condicion:    'Nuevo',
    envio_gratis: false
  }));
}

module.exports = { buscar, fuente_api: 'dummyjson' };
