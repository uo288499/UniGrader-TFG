const mongoose = require('mongoose');

// EvaluationPolicy Schema: Defines the allowed percentage ranges for a subject.
const evaluationPolicySchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, unique: true },
  policyRules: [{
    evaluationTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EvaluationType', required: true },
    minPercentage: { type: Number, required: true },
    maxPercentage: { type: Number, required: true }
  }]
}, { timestamps: true });

module.exports = mongoose.model('EvaluationPolicy', evaluationPolicySchema);