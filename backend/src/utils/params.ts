import { Request } from 'express';

export function paramString(req: Request, key: string): string {
  const value = req.params[key];
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}
