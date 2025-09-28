const mongoose = require('mongoose');

// Group Schema: A group of students and professors within a course.
const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true }, 
  students: [{ type: mongoose.Schema.Types.ObjectId }],
  professors: [{ type: mongoose.Schema.Types.ObjectId }]
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);