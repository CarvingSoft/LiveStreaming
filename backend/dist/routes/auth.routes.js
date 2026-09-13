"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const user_model_1 = require("../models/user.model");
const auth_validator_1 = require("../validators/auth.validator");
const errors_1 = require("../utils/errors");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/login', (0, validate_middleware_1.validateBody)(auth_validator_1.loginSchema), async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await user_model_1.User.findOne({ email: email.toLowerCase() });
        if (!user || !user.isActive) {
            throw new errors_1.AppError(401, 'Invalid email or password');
        }
        const valid = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!valid) {
            throw new errors_1.AppError(401, 'Invalid email or password');
        }
        const token = jsonwebtoken_1.default.sign({ userId: String(user._id), email: user.email, role: user.role }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRES_IN });
        res.json({
            token,
            user: {
                id: String(user._id),
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.authRouter.get('/me', auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const user = await user_model_1.User.findById(req.user.id).select('-passwordHash');
        if (!user) {
            throw new errors_1.AppError(404, 'User not found');
        }
        res.json({
            id: String(user._id),
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
        });
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=auth.routes.js.map