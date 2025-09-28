const mongoose = require('mongoose');

const auditEntrySchema = new mongoose.Schema({
  entityType: { type: String, required: true }, 
  entityId: { type: Schema.Types.ObjectId, required: true },
  eventType: { type: String, enum: ['created', 'updated', 'deleted'], required: true },
  changedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  changedAt: { type: Date, default: Date.now },
  changes: [{
    field: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed }
  }]
});

module.exports = mongoose.model('AuditEntry', auditEntrySchema);