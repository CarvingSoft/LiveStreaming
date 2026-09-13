import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { corsOrigins, env } from './config/env';
import { isPrivateDevOrigin } from './utils/request-base';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { authRouter } from './routes/auth.routes';
import { camerasRouter } from './routes/cameras.routes';
import { healthRouter } from './routes/health.routes';
import { playbackRouter } from './routes/playback.routes';
import { publicRouter } from './routes/public.routes';
import { sitesRouter } from './routes/sites.routes';
import { streamRouter } from './routes/stream.routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    pinoHttp({
      redact: {
        paths: ['req.headers.authorization', 'req.body.password', 'req.body.sourceConfig.password'],
        remove: true,
      },
    }),
  );

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        if (env.NODE_ENV === 'development' && isPrivateDevOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.text({ type: ['application/sdp', 'text/plain'], limit: '256kb' }));

  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ message: 'Invalid JSON payload' });
      return;
    }
    next(err);
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const playbackLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/auth/login', authLimiter);
  app.use('/api/playback', playbackLimiter);
  app.use('/api/stream', playbackLimiter);

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/sites', sitesRouter);
  app.use('/api/cameras', camerasRouter);
  app.use('/api/public', publicRouter);
  app.use('/api/playback', playbackRouter);
  app.use('/api/stream', streamRouter);

  app.get('/', (_req, res) => {
    res.json({
      name: 'Carvingsoft CCTV Live Streaming API',
      environment: env.NODE_ENV,
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
