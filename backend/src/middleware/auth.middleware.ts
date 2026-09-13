import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/user.model';
import { AuthTokenPayload, UserRole } from '../types';
import { AppError } from '../utils/errors';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'Authentication required');
    }

    const token = header.slice(7);
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid or inactive user');
    }

    req.user = {
      id: String(user._id),
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError(401, 'Invalid authentication token'));
  }
}

export function optionalAuthenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  authenticate(req, res, next).catch(next);
}

export function authorize(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'Insufficient permissions'));
      return;
    }

    next();
  };
}
