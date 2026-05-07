const mongoose = require('mongoose');

const favoritoSchema = new mongoose.Schema({
  usuario_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fuente_id:   { type: String, required: true },   // ID del producto en Mercado Libre
  fuente_api:  { type: String, default: 'mercadolibre' },
  nombre:      { type: String, required: true },
  precio:      { type: Number, required: true },
  moneda:      { type: String, default: 'ARS' },
  imagen_url:  { type: String },
  url_compra:  { type: String },
  categoria:   { type: String },
  guardado_en: { type: Date, default: Date.now }
});

// Un usuario no puede guardar el mismo producto dos veces
favoritoSchema.index({ usuario_id: 1, fuente_id: 1 }, { unique: true });

module.exports = mongoose.model('Favorito', favoritoSchema);
