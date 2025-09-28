const mongoose = require('mongoose');

// EvaluationSystem Schema: The complete evaluation plan created by a professor.
const evaluationSystemSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'AcademicYear' },
  active: { type: Boolean, default: false },
  validated: { type: Boolean, default: false },
  // Hierarchical structure: Groups items by type, with a weight assigned by the professor.
  evaluationGroups: [{
    evaluationTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EvaluationType', required: true },
    totalWeight: { type: Number, required: true },
    itemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EvaluationItem' }]
  }]
}, { timestamps: true });

module.exports = mongoose.model('EvaluationSystem', evaluationSystemSchema);