const mongoose = require('mongoose');

// FinalGrade Schema: Stores the final, calculated grade for a student in a specific course.
const finalGradeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, required: true},
  evaluationPeriod: {
    type: String,
    required: true,
    enum: ['Ordinary', 'Extraordinary'],
  },
  value: { type: mongoose.Schema.Types.Mixed, required: false }, 
  isPassed: { type: Boolean, required: true }
}, { timestamps: true });

// Ensures a student only has one final grade for a specific course and period.
finalGradeSchema.index({ studentId: 1, courseId: 1, evaluationPeriod: 1 }, { unique: true });

module.exports = mongoose.model('FinalGrade', finalGradeSchema);