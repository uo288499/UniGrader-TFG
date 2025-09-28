const mongoose = require('mongoose');

// FinalGrade Schema: Stores the final, calculated grade for a student in a specific course.
const finalGradeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  courseId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Course' },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'AcademicYear' },
  evaluationPeriodId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'EvaluationPeriod' },
  value: { type: mongoose.Types.Decimal128, required: true }, 
  isPassed: { type: Boolean, required: true }
}, { timestamps: true });

// Ensures a student only has one final grade for a specific course and period.
finalGradeSchema.index({ studentId: 1, courseId: 1, evaluationPeriodId: 1 }, { unique: true });

module.exports = mongoose.model('FinalGrade', finalGradeSchema);