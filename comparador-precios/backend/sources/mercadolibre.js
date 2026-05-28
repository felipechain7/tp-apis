const axios = require('axios');
const { getAppToken, getUserToken } = require('../services/mlToken');

const SITE = 'MLA'; // Argentina

// Intenta la busqueda de items (con precios) usando el token de usuario.
// Si ML la bloquea (403), cae al catalogo (sin precio, solo producto + link).
async function buscar(q, limite = 12) {
  const userToken = await getUserToken();

  if (userToken) {
    try {
      return await buscarItems(q, limite, userToken);
    } catch (err) {
      if (err.response?.status !== 403) {
        console.error('ML items error:', err.response?.status, err.message);
      }
      // 403 u otro: seguimos con el catalogo
    }
  }

  return await buscarCatalogo(q, limite);
}

// ── Camino A: items reales con precio (requiere token de usuario) ─────────────
async function buscarItems(q, limite, token) {
  const { data } = await axios.get(`https://api.mercadolibre.com/sites/${SITE}/search`, {
    params: { q, limit: Math.min(Number(limite), 20) },
    headers: { Authorization: `Bearer ${token}` },
    timeout: 12000
  });

  return data.results.map((item) => ({
    fuente_id:    `ml-${item.id}`,
    fuente_api:   'mercadolibre',
    fuente_label: 'Mercado Libre',
    nombre:       item.title,
    precio:       item.price,
    moneda:       item.currency_id || 'ARS',
    imagen_url:   item.thumbnail?.replace(/^http:/, 'https:'),
    url_compra:   item.permalink,
    tienda:       item.seller?.nickname || 'Mercado Libre',
    categoria:    item.category_id,
    disponible:   item.available_quantity > 0,
    condicion:    item.condition === 'new' ? 'Nuevo' : 'Usado',
    envio_gratis: !!item.shipping?.free_shipping,
    sin_precio:   false
  }));
}

// ── Camino B: catalogo (token de app). Producto real + link, sin precio vivo ──
async function buscarCatalogo(q, limite) {
  const token = await getAppToken();
  if (!token) return [];

  const { data } = await axios.get('https://api.mercadolibre.com/products/search', {
    params: { site_id: SITE, status: 'active', q, limit: Math.min(Number(limite), 20) },
    headers: { Authorization: `Bearer ${token}` },
    timeout: 12000
  });

  return (data.results || []).map((item) => ({
      fuente_id:    `ml-${item.id}`,
      fuente_api:   'mercadolibre',
      fuente_label: 'Mercado Libre',
      nombre:       item.name,
      precio:       null,
      moneda:       'ARS',
      imagen_url:   primeraImagen(item),
      url_compra:   `https://www.mercadolibre.com.ar/p/${item.id}`,
      tienda:       'Mercado Libre',
      categoria:    item.domain_id,
      disponible:   true,
      condicion:    'Nuevo',
      envio_gratis: false,
      sin_precio:   true // ML no expone precio con token de app
  }));
}

function primeraImagen(item) {
  if (item.pictures?.length) return item.pictures[0].url?.replace(/^http:/, 'https:');
  const picker = item.pickers?.find((p) => p.products?.some((pr) => pr.thumbnail));
  const thumb = picker?.products?.find((pr) => pr.thumbnail)?.thumbnail;
  return thumb?.replace(/^http:/, 'https:') || '';
}

module.exports = { buscar, fuente_api: 'mercadolibre' };
