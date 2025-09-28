const mongoose = require('mongoose');

// University Schema: Represents a single university.
const universitySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  smallLogoUrl: { type: String }, 
  largeLogoUrl: { type: String }, 
  address: { type: String },
  contactEmail: { type: String },
  contactPhone: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('University', universitySchema);