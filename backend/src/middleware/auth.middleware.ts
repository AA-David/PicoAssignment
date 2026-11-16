import crypto from 'crypto';
import type { RequestHandler } from 'express';
import { AppError } from '../utils/AppError.js';
import User from '../models/user.model.js';

export const requireAuth: RequestHandler = async (req, res, next) => {
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
        throw new AppError('Token missing', 401);
    }

    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ login: hash });

    if (!user) {
        throw new AppError('Invalid token', 401);
    }

    req.user = { id: user._id.toString(), login: hash };
    next();
};
