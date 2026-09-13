export declare class AppError extends Error {
    statusCode: number;
    details?: unknown;
    constructor(statusCode: number, message: string, details?: unknown);
}
export declare function assertFound<T>(value: T | null | undefined, message: string): NonNullable<T>;
//# sourceMappingURL=errors.d.ts.map