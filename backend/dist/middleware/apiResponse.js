"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiResponseMiddleware = void 0;
const apiResponseMiddleware = (_req, res, next) => {
    res.success = (data, message = 'Success', statusCode = 200) => {
        res.status(statusCode).json({ success: true, message, data, timestamp: new Date().toISOString() });
    };
    res.error = (message, statusCode = 500, code) => {
        res.status(statusCode).json({ success: false, message, code, timestamp: new Date().toISOString() });
    };
    res.paginated = (data, total, page, limit) => {
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
exports.apiResponseMiddleware = apiResponseMiddleware;
//# sourceMappingURL=apiResponse.js.map