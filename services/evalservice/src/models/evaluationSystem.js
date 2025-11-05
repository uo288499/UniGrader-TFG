const mongoose = require('mongoose');

// EvaluationSystem Schema: The complete evaluation plan created by a professor.
const evaluationSystemSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  // Hierarchical structure: Groups items by type, with a weight assigned by the professor.
  evaluationGroups: [{
    evaluationTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EvaluationType', required: true },
    totalWeight: { type: Number, required: true },
  }]
}, { timestamps: true });

module.exports = mongoose.model('EvaluationSystem', evaluationSystemSchema);