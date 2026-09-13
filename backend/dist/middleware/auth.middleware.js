"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.optionalAuthenticate = optionalAuthenticate;
exports.authorize = authorize;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const user_model_1 = require("../models/user.model");
const errors_1 = require("../utils/errors");
async function authenticate(req, _res, next) {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            throw new errors_1.AppError(401, 'Authentication required');
        }
        const token = header.slice(7);
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        const user = await user_model_1.User.findById(decoded.userId);
        if (!user || !user.isActive) {
            throw new errors_1.AppError(401, 'Invalid or inactive user');
        }
        req.user = {
            id: String(user._id),
            email: user.email,
            role: user.role,
        };
        next();
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            next(error);
            return;
        }
        next(new errors_1.AppError(401, 'Invalid authentication token'));
    }
}
function optionalAuthenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        next();
        return;
    }
    authenticate(req, res, next).catch(next);
}
function authorize(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            next(new errors_1.AppError(401, 'Authentication required'));
            return;
        }
        if (!roles.includes(req.user.role)) {
            next(new errors_1.AppError(403, 'Insufficient permissions'));
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.middleware.js.map