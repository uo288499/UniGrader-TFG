const mongoose = require('mongoose');

// EvaluationType Schema: A generic type of evaluation (e.g., 'Theory', 'Practical') defined by a university.
const evaluationTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
}, { timestamps: true });

// Ensures evaluation type names are unique within a university.
evaluationTypeSchema.index({ name: 1, universityId: 1 }, { unique: true });

module.exports = mongoose.model('EvaluationType', evaluationTypeSchema);