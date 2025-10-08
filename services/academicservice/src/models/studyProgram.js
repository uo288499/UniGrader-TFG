const mongoose = require('mongoose');

// StudyProgram Schema: Represents an academic program within a university.
const studyProgramSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ['Bachelor', 'Master', 'Doctorate', 'Postgraduate', 'Specialization', 'Other'],
  },
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true }, // Links the program to a university
}, { timestamps: true });

// Ensures study program names are unique within a university.
studyProgramSchema.index({ name: 1, universityId: 1 }, { unique: true });

module.exports = mongoose.model('StudyProgram', studyProgramSchema);