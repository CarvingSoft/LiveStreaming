export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function assertFound<T>(value: T | null | undefined, message: string): NonNullable<T> {
  if (value === null || value === undefined) {
    throw new AppError(404, message);
  }
  return value as NonNullable<T>;
}
