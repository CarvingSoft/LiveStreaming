"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const user_model_1 = require("../models/user.model");
async function seedAdmin() {
    if (!env_1.env.SEED_ADMIN_EMAIL || !env_1.env.SEED_ADMIN_PASSWORD) {
        throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in environment');
    }
    await (0, database_1.connectDatabase)();
    const existing = await user_model_1.User.findOne({ email: env_1.env.SEED_ADMIN_EMAIL.toLowerCase() });
    if (existing) {
        console.log('Admin user already exists:', existing.email);
        await (0, database_1.disconnectDatabase)();
        return;
    }
    const passwordHash = await bcrypt_1.default.hash(env_1.env.SEED_ADMIN_PASSWORD, 12);
    const user = await user_model_1.User.create({
        name: env_1.env.SEED_ADMIN_NAME,
        email: env_1.env.SEED_ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        role: 'super_admin',
        isActive: true,
    });
    console.log('Created admin user:', user.email);
    await (0, database_1.disconnectDatabase)();
}
seedAdmin().catch(async (error) => {
    console.error('Seed failed:', error);
    await (0, database_1.disconnectDatabase)();
    process.exit(1);
});
//# sourceMappingURL=seed-admin.js.map