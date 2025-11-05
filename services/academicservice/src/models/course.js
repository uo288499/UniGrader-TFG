const mongoose = require('mongoose');

// Course Schema: A specific instance of a subject for an academic year.
const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
  studyProgramId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyProgram', required: true },
  evaluationSystemId: { type: mongoose.Schema.Types.ObjectId },
  maxGrade: { type: Number, required: true }
}, { timestamps: true });

// Ensures course are unique within an academic year and university.
courseSchema.index({ code: 1, academicYearId: 1, universityId: 1 }, { unique: true });

module.exports = mongoose.model('Course', courseSchema);