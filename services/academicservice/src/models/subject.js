const mongoose = require('mongoose');

// Subject Schema: Represents a general academic subject.
const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
  studyPrograms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StudyProgram', required: true }],
  evaluationPolicyId: { type: mongoose.Schema.Types.ObjectId }
}, { timestamps: true });

// Ensures subject codes are unique within a university.
subjectSchema.index({ code: 1, universityId: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);