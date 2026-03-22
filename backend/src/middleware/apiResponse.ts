import { Request, Response, NextFunction } from 'express';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Response {
            success: (data: unknown, message?: string, statusCode?: number) => void;
            error: (message: string, statusCode?: number, code?: string) => void;
            paginated: (data: unknown[], total: number, page: number, limit: number) => void;
        }
    }
}

export const apiResponseMiddleware = (
    _req: Request,
    res: Response,
    next: NextFunction
): void => {
    res.success = (data: unknown, message = 'Success', statusCode = 200) => {
        res.status(statusCode).json({ success: true, message, data, timestamp: new Date().toISOString() });
    };

    res.error = (message: string, statusCode = 500, code?: string) => {
        res.status(statusCode).json({ success: false, message, code, timestamp: new Date().toISOString() });
    };

    res.paginated = (data: unknown[], total: number, page: number, limit: number) => {
        res.status(200).json({
            success: true,
            data,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
            timestamp: new Date().toISOString(),
        });
    };

    next();
};
