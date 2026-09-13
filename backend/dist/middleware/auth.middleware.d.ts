import { NextFunction, Request, Response } from 'express';
import { UserRole } from '../types';
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: UserRole;
    };
}
export declare function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void>;
export declare function optionalAuthenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
export declare function authorize(...roles: UserRole[]): (req: AuthenticatedRequest, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map