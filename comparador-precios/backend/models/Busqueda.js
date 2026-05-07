const mongoose = require('mongoose');

const busquedaSchema = new mongoose.Schema({
  usuario_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  termino:      { type: String, required: true },
  filtros_json: { type: Object, default: {} },   // categoria, rango_precio, etc.
  resultados:   { type: Number, default: 0 },
  realizado_en: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Busqueda', busquedaSchema);
