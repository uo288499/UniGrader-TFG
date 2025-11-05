const mongoose = require('mongoose');

// Grade Schema: Stores the grade for a student for a single item.
const gradeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: false }
}, { timestamps: true });

// Ensures a student only has one grade for a specific item.
gradeSchema.index({ studentId: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('Grade', gradeSchema);




