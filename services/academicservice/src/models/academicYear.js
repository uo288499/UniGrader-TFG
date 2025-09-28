const mongoose = require('mongoose')

// AcademicYear Schema: Represents a distinct academic period for a specific university.
const academicYearSchema = new mongoose.Schema({
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true }, // Links to the specific university
  yearLabel: { type: String, required: true, unique: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
}, { timestamps: true });

// Ensures that the combination of universityId and yearLabel is unique.
academicYearSchema.index({ universityId: 1, yearLabel: 1 }, { unique: true });

module.exports = mongoose.model('AcademicYear', academicYearSchema);