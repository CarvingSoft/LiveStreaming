"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
exports.validateParams = validateParams;
const errors_1 = require("../utils/errors");
function validateBody(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            next(new errors_1.AppError(400, 'Validation failed', result.error.flatten()));
            return;
        }
        req.body = result.data;
        next();
    };
}
function validateParams(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            next(new errors_1.AppError(400, 'Invalid route parameters', result.error.flatten()));
            return;
        }
        req.params = result.data;
        next();
    };
}
//# sourceMappingURL=validate.middleware.js.map