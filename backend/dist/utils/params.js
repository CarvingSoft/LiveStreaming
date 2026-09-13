"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paramString = paramString;
function paramString(req, key) {
    const value = req.params[key];
    if (Array.isArray(value)) {
        return value[0] ?? '';
    }
    return value ?? '';
}
//# sourceMappingURL=params.js.map