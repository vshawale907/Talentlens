import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Response {
            success: (data: unknown, message?: string, statusCode?: number) => void;
            error: (message: string, statusCode?: number, code?: string) => void;
            paginated: (data: unknown[], total: number, page: number, limit: number) => void;
        }
    }
}
export declare const apiResponseMiddleware: (_req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=apiResponse.d.ts.map