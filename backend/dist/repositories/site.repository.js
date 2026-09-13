"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSiteById = getSiteById;
exports.getSiteBySlug = getSiteBySlug;
const site_model_1 = require("../models/site.model");
const errors_1 = require("../utils/errors");
async function getSiteById(id) {
    const site = await site_model_1.Site.findById(id);
    if (!site) {
        throw new errors_1.AppError(404, 'Site not found');
    }
    return site;
}
async function getSiteBySlug(slug) {
    const site = await site_model_1.Site.findOne({ slug });
    if (!site) {
        throw new errors_1.AppError(404, 'Site not found');
    }
    return site;
}
//# sourceMappingURL=site.repository.js.map