import { Router } from 'express';
import { isDatabaseConnected } from '../config/database';
import { mediaMtxService } from '../services/mediamtx.service';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const mediamtx = await mediaMtxService.healthCheck();

  res.json({
    status: isDatabaseConnected() && mediamtx.ok ? 'ok' : 'degraded',
    db: isDatabaseConnected() ? 'connected' : 'disconnected',
    mediamtx,
    timestamp: new Date().toISOString(),
  });
});
