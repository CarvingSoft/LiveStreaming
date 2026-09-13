import mongoose, { Document, Types } from 'mongoose';
export interface IAuditLog extends Document {
    userId?: Types.ObjectId;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ip?: string;
    createdAt: Date;
}
export declare const AuditLog: mongoose.Model<IAuditLog, {}, {}, {}, Document<unknown, {}, IAuditLog, {}, mongoose.DefaultSchemaOptions> & IAuditLog & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IAuditLog>;
//# sourceMappingURL=audit-log.model.d.ts.map