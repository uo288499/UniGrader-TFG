const mongoose = require('mongoose');

// EvaluationItem Schema: An individual graded item (e.g., "Final Exam").
const evaluationItemSchema = new mongoose.Schema({
  evaluationSystemId: { type: mongoose.Schema.Types.ObjectId, ref: 'EvaluationSystem', required: true },
  name: { type: String, required: true },
  evaluationTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EvaluationType', required: true },
  weight: { type: Number, required: true }, // Weight relative to its group
  minGrade: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('EvaluationItem', evaluationItemSchema);