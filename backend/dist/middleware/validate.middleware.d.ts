import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
export declare function validateBody<T>(schema: ZodSchema<T>): (req: Request, _res: Response, next: NextFunction) => void;
export declare function validateParams<T extends Record<string, string>>(schema: ZodSchema<T>): (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=validate.middleware.d.ts.map