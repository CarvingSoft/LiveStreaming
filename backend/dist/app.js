"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const pino_http_1 = __importDefault(require("pino-http"));
const env_1 = require("./config/env");
const request_base_1 = require("./utils/request-base");
const error_middleware_1 = require("./middleware/error.middleware");
const auth_routes_1 = require("./routes/auth.routes");
const cameras_routes_1 = require("./routes/cameras.routes");
const health_routes_1 = require("./routes/health.routes");
const playback_routes_1 = require("./routes/playback.routes");
const public_routes_1 = require("./routes/public.routes");
const sites_routes_1 = require("./routes/sites.routes");
const stream_routes_1 = require("./routes/stream.routes");
function createApp() {
    const app = (0, express_1.default)();
    app.set('trust proxy', 1);
    app.use((0, pino_http_1.default)({
        redact: {
            paths: ['req.headers.authorization', 'req.body.password', 'req.body.sourceConfig.password'],
            remove: true,
        },
    }));
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin(origin, callback) {
            if (!origin) {
                callback(null, true);
                return;
            }
            if (env_1.corsOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            if (env_1.env.NODE_ENV === 'development' && (0, request_base_1.isPrivateDevOrigin)(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error(`Origin ${origin} is not allowed by CORS`));
        },
        credentials: true,
    }));
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use(express_1.default.text({ type: ['application/sdp', 'text/plain'], limit: '256kb' }));
    app.use((err, _req, res, next) => {
        if (err instanceof SyntaxError && 'body' in err) {
            res.status(400).json({ message: 'Invalid JSON payload' });
            return;
        }
        next(err);
    });
    const authLimiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 20,
        standardHeaders: true,
        legacyHeaders: false,
    });
    const playbackLimiter = (0, express_rate_limit_1.default)({
        windowMs: 60 * 1000,
        max: 120,
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use('/api/auth/login', authLimiter);
    app.use('/api/playback', playbackLimiter);
    app.use('/api/stream', playbackLimiter);
    app.use('/api/health', health_routes_1.healthRouter);
    app.use('/api/auth', auth_routes_1.authRouter);
    app.use('/api/sites', sites_routes_1.sitesRouter);
    app.use('/api/cameras', cameras_routes_1.camerasRouter);
    app.use('/api/public', public_routes_1.publicRouter);
    app.use('/api/playback', playback_routes_1.playbackRouter);
    app.use('/api/stream', stream_routes_1.streamRouter);
    app.get('/', (_req, res) => {
        res.json({
            name: 'Carvingsoft CCTV Live Streaming API',
            environment: env_1.env.NODE_ENV,
        });
    });
    app.use(error_middleware_1.notFoundHandler);
    app.use(error_middleware_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map