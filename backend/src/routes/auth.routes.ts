import bcrypt from 'bcrypt';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { User } from '../models/user.model';
import { loginSchema } from '../validators/auth.validator';
import { AppError } from '../utils/errors';

export const authRouter = Router();

authRouter.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Invalid email or password');
    }

    const token = jwt.sign(
      { userId: String(user._id), email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
    );

    res.json({
      token,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await User.findById(req.user!.id).select('-passwordHash');
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (error) {
    next(error);
  }
});
