const mongoose = require('mongoose');

const favoritoSchema = new mongoose.Schema({
  usuario_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fuente_id:    { type: String, required: true },   // ej: "ml-MLA123", "dummyjson-5"
  fuente_api:   { type: String, default: 'mercadolibre' },
  fuente_label: { type: String },
  nombre:       { type: String, required: true },
  precio:       { type: Number },
  moneda:       { type: String, default: 'ARS' },
  precio_ars:   { type: Number },
  precio_usd:   { type: Number },
  imagen_url:   { type: String },
  url_compra:   { type: String },
  tienda:       { type: String },
  categoria:    { type: String },
  condicion:    { type: String },
  sin_precio:   { type: Boolean, default: false },
  guardado_en:  { type: Date, default: Date.now }
});

// Un usuario no puede guardar el mismo producto (de la misma fuente) dos veces
favoritoSchema.index({ usuario_id: 1, fuente_id: 1 }, { unique: true });

module.exports = mongoose.model('Favorito', favoritoSchema);
