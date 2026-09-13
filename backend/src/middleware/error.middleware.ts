import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Route not found' });
}

function isMongoDuplicateKeyError(err: unknown): err is { code: number; keyPattern?: Record<string, number> } {
  return Boolean(err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000);
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      details: env.NODE_ENV === 'development' ? err.details : undefined,
    });
    return;
  }

  if (isMongoDuplicateKeyError(err)) {
    const keys = Object.keys(err.keyPattern ?? {});
    const message =
      keys.includes('slug')
        ? 'Site slug already exists'
        : keys.includes('cameraKey')
          ? 'Camera key already exists on this site'
          : 'Duplicate value already exists';
    res.status(409).json({ message });
    return;
  }

  console.error('Unhandled error:', err instanceof Error ? err.message : err);
  res.status(500).json({ message: 'Internal server error' });
}
