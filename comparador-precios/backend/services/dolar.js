const axios = require('axios');

// DolarAPI (https://dolarapi.com) — cotizacion del dolar en Argentina, sin clave.
// La usamos para convertir todos los precios a una moneda comun (ARS/USD)
// y poder comparar productos de distintas fuentes entre si.
const URL = 'https://dolarapi.com/v1/dolares/blue';
const TTL = 10 * 60 * 1000;

let cache = null;
let cacheTs = 0;

async function getCotizacion() {
  if (cache && Date.now() - cacheTs < TTL) return cache;

  try {
    const { data } = await axios.get(URL, { timeout: 10000 });
    cache = {
      compra: data.compra,
      venta: data.venta,
      casa: data.nombre,
      actualizado: data.fechaActualizacion
    };
    cacheTs = Date.now();
  } catch (err) {
    // Si DolarAPI falla, usamos el ultimo valor conocido o un fallback razonable
    if (!cache) cache = { compra: null, venta: null, casa: 'no disponible', actualizado: null };
  }

  return cache;
}

// Agrega precio_ars y precio_usd a cada producto segun su moneda de origen.
async function agregarPreciosConvertidos(productos) {
  const cot = await getCotizacion();
  const tasa = cot.venta; // ARS por USD

  return productos.map((p) => {
    if (p.precio == null || !tasa) {
      return { ...p, precio_ars: null, precio_usd: null };
    }
    if (p.moneda === 'USD') {
      return { ...p, precio_ars: Math.round(p.precio * tasa), precio_usd: p.precio };
    }
    // ARS (u otra) -> tomamos como ARS
    return { ...p, precio_ars: p.precio, precio_usd: Math.round((p.precio / tasa) * 100) / 100 };
  });
}

module.exports = { getCotizacion, agregarPreciosConvertidos };
