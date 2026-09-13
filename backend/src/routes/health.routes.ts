import { Router } from 'express';
import { isDatabaseConnected } from '../config/database';
import { env } from '../config/env';
import { isValidEncryptionKey } from '../services/encryption.service';
import { mediaMtxService } from '../services/mediamtx.service';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const mediamtx = await mediaMtxService.healthCheck();
  const encryptionKeyOk = isValidEncryptionKey(env.ENCRYPTION_KEY);

  const status =
    isDatabaseConnected() && mediamtx.ok && encryptionKeyOk ? 'ok' : 'degraded';

  res.json({
    status,
    db: isDatabaseConnected() ? 'connected' : 'disconnected',
    mediamtx,
    encryptionKeyOk,
    timestamp: new Date().toISOString(),
  });
});
