const mongoose = require('mongoose');

// EvaluationItem Schema: An individual graded item (e.g., "Final Exam").
const evaluationItemSchema = new mongoose.Schema({
  evaluationSystemId: { type: mongoose.Schema.Types.ObjectId, ref: 'EvaluationSystem', required: true },
  name: { type: String, required: true },
  evaluationTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EvaluationType', required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, required: true },
  weight: { type: Number, required: true }, // Weight relative to its group
  minGrade: { type: Number }
}, { timestamps: true });

// Ensures unique item names within the same group and type.
evaluationItemSchema.index({ name: 1, groupId: 1, evaluationTypeId: 1}, { unique: true });

module.exports = mongoose.model('EvaluationItem', evaluationItemSchema);