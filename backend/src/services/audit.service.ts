import { Types } from 'mongoose';
import { AuditLog } from '../models/audit-log.model';

const SENSITIVE_KEYS = ['password', 'passwordHash', 'encryptedSourceConfig', 'sourceConfig', 'token'];

function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export async function writeAuditLog(input: {
  userId?: Types.ObjectId | string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  await AuditLog.create({
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: sanitizeMetadata(input.metadata),
    ip: input.ip,
  });
}
