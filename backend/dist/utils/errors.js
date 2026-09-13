"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.assertFound = assertFound;
class AppError extends Error {
    statusCode;
    details;
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function assertFound(value, message) {
    if (value === null || value === undefined) {
        throw new AppError(404, message);
    }
    return value;
}
//# sourceMappingURL=errors.js.map