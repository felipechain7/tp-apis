const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
  nombre:        { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  rol:           { type: String, enum: ['usuario', 'admin'], default: 'usuario' },
  creado_en:     { type: Date, default: Date.now }
});

// Encriptar password antes de guardar
usuarioSchema.pre('save', async function (next) {
  if (!this.isModified('password_hash')) return next();
  this.password_hash = await bcrypt.hash(this.password_hash, 10);
  next();
});

// Comparar password en login
usuarioSchema.methods.compararPassword = function (password) {
  return bcrypt.compare(password, this.password_hash);
};

module.exports = mongoose.model('Usuario', usuarioSchema);
