import { Types } from 'mongoose';
export declare function writeAuditLog(input: {
    userId?: Types.ObjectId | string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ip?: string;
}): Promise<void>;
//# sourceMappingURL=audit.service.d.ts.map