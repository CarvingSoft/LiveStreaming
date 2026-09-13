import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/errors';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new AppError(400, 'Validation failed', result.error.flatten()));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateParams<T extends Record<string, string>>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(new AppError(400, 'Invalid route parameters', result.error.flatten()));
      return;
    }
    (req as Request & { params: T }).params = result.data;
    next();
  };
}
