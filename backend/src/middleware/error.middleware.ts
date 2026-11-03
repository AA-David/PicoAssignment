import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';

export const notFound: RequestHandler = (_req, _res, next) => {
    next(new AppError('Route not found', 404));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
    // Too late to send a JSON error, so let Express close the connection
    if (res.headersSent) {
        return next(err);
    }

    let statusCode = err instanceof AppError ? err.statusCode : 500;
    let message = err.message || 'Internal server error';

    // Errors from Express's own libraries (e.g. body-parser) carry a 4xx status already
    if (
        typeof err.status === 'number' &&
        err.status >= 400 &&
        err.status < 500
    ) {
        statusCode = err.status;
    }

    if (err instanceof mongoose.Error.CastError) {
        statusCode = 400;
        message = `Invalid ${err.path}`;
    }

    if (err instanceof mongoose.Error.ValidationError) {
        statusCode = 400;
        message = Object.values(err.errors)
            .map((e) => e.message)
            .join(', ');
    }

    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue ?? {})[0] ?? 'Value';
        message = `${field} is already taken`;
    }

    if (err.type === 'entity.parse.failed') {
        statusCode = 400;
        message = 'Invalid JSON in request body';
    }

    if (statusCode === 500 && process.env.NODE_ENV === 'production') {
        message = 'Internal server error';
    }

    console.error(err);
    res.status(statusCode).json({
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
};
