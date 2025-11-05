const mongoose = require('mongoose');

// Enrollment Schema: The intermediary collection for the N-N relationship between a user, a study program, and a specific academic year.
const enrollmentSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, required: true },
  studyProgramId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyProgram', required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

// Ensures a user can only be enrolled in a specific program for a specific year once.
enrollmentSchema.index({ accountId: 1, studyProgramId: 1, academicYearId: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);