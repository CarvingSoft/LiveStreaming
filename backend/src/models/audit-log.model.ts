import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAuditLog extends Document {
  userId?: Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
