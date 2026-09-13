"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditLog = writeAuditLog;
const audit_log_model_1 = require("../models/audit-log.model");
const SENSITIVE_KEYS = ['password', 'passwordHash', 'encryptedSourceConfig', 'sourceConfig', 'token'];
function sanitizeMetadata(metadata) {
    if (!metadata)
        return undefined;
    const sanitized = {};
    for (const [key, value] of Object.entries(metadata)) {
        if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
            sanitized[key] = '[REDACTED]';
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
async function writeAuditLog(input) {
    await audit_log_model_1.AuditLog.create({
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: sanitizeMetadata(input.metadata),
        ip: input.ip,
    });
}
//# sourceMappingURL=audit.service.js.map