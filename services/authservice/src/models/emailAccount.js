const mongoose = require('mongoose');

// EmailAccount Schema: Handles the specific login credentials and ties a user to a university and a role.
const emailAccountSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Needs to be set up via mail link
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Links to the core user profile
  universityId: { type: mongoose.Schema.Types.ObjectId}, // Ties the account to a specific university, can be null for global admins
  role: { type: String, enum: ['student', 'professor', 'admin', 'global-admin'], required: true },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('EmailAccount', emailAccountSchema);