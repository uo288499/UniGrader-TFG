const mongoose = require('mongoose');

// User Schema: Represents a single person. Contains unique identifiers independent of any university affiliation.
const userSchema = new mongoose.Schema({
  identityNumber: { type: String, required: true, unique: true }, // The unique personal identifier for an individual
  name: { type: String, required: true },
  firstSurname: { type: String, required: true },
  secondSurname: { type: String },
  photoUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);