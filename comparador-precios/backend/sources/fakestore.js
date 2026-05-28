const axios = require('axios');

const API_BASE = 'https://fakestoreapi.com';

// FakeStore no tiene endpoint de busqueda: traemos el catalogo y filtramos
// por termino sobre titulo y categoria. Precios en USD.
let cacheCatalogo = null;
let cacheTs = 0;
const TTL = 5 * 60 * 1000;

async function getCatalogo() {
  if (cacheCatalogo && Date.now() - cacheTs < TTL) return cacheCatalogo;
  const { data } = await axios.get(`${API_BASE}/products`, { timeout: 12000 });
  cacheCatalogo = data;
  cacheTs = Date.now();
  return data;
}

async function buscar(q, limite = 12) {
  const catalogo = await getCatalogo();
  const termino = q.toLowerCase();

  const filtrados = catalogo.filter(
    (item) =>
      item.title.toLowerCase().includes(termino) ||
      item.category.toLowerCase().includes(termino)
  );

  return filtrados.slice(0, Number(limite)).map((item) => ({
    fuente_id:    `fakestore-${item.id}`,
    fuente_api:   'fakestore',
    fuente_label: 'FakeStore',
    nombre:       item.title,
    precio:       item.price,
    moneda:       'USD',
    imagen_url:   item.image,
    url_compra:   `https://fakestoreapi.com/products/${item.id}`,
    tienda:       'FakeStore',
    categoria:    item.category,
    disponible:   true,
    condicion:    'Nuevo',
    envio_gratis: false
  }));
}

module.exports = { buscar, fuente_api: 'fakestore' };
