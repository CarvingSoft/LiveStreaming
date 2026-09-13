"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequestApiBase = getRequestApiBase;
exports.isPrivateDevOrigin = isPrivateDevOrigin;
const env_1 = require("../config/env");
function getRequestApiBase(req) {
    // Production uses the configured public API URL so stream endpoints stay HTTPS
    // even when Nginx→Node proxy headers are missing or misconfigured.
    if (env_1.env.NODE_ENV === 'production') {
        return env_1.env.API_PUBLIC_URL.replace(/\/$/, '');
    }
    const forwardedHost = req.get('x-forwarded-host');
    const host = forwardedHost ?? req.get('host');
    if (!host) {
        return env_1.env.API_PUBLIC_URL.replace(/\/$/, '');
    }
    const forwardedProto = req.get('x-forwarded-proto');
    const protocol = forwardedProto ?? req.protocol;
    return `${protocol}://${host}`.replace(/\/$/, '');
}
function isPrivateDevOrigin(origin) {
    try {
        const url = new URL(origin);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            return true;
        }
        if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) {
            return true;
        }
        if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) {
            return true;
        }
        if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) {
            return true;
        }
        return false;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=request-base.js.map