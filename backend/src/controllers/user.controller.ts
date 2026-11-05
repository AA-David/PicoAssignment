import crypto from 'node:crypto';
import User from '../models/user.model.js';
import type { RequestHandler } from 'express';
import type { IFish } from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';

const getField =
    (
        field: 'luck' | 'almanac' | 'money' | 'rod' | 'bait' | 'fish',
    ): RequestHandler =>
    async (req, res) => {
        const user = await User.findById(req.user?.id).select(field).lean();
        if (!user) throw new AppError('User not found', 404);
        res.status(200).json({ [field]: user[field] });
    };

const incrementField =
    (field: 'luck' | 'rod' | 'bait'): RequestHandler =>
    async (req, res) => {
        const user = await User.findByIdAndUpdate(
            req.user?.id,
            { $inc: { [field]: 1 } },
            {
                new: true,
                runValidators: true,
            },
        ).lean();
        if (!user) throw new AppError('User not found', 404);
        res.status(200).json({ [field]: user[field] });
    };

//
//------------------------------------------------------------------

// @route POST /api/register
export const register: RequestHandler = async (req, res) => {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await User.create({ login: tokenHash });
    res.status(201).set('Cache-Control', 'no-store').json({ token });
};

//------------------------------------------------------------------

// @route POST /api/luck
export const incrementLuck: RequestHandler = incrementField('luck');

// @route GET /api/luck
export const getLuck: RequestHandler = getField('luck');

// @route POST /api/rod
export const incrementRod: RequestHandler = incrementField('rod');

// @route GET /api/rod
export const getRod: RequestHandler = getField('rod');

// @route POST /api/bait
export const incrementBait: RequestHandler = incrementField('bait');

// @route GET /api/bait
export const getBait: RequestHandler = getField('bait');

//
//------------------------------------------------------------------

// @route POST /api/money
export const editMoney: RequestHandler = async (req, res) => {
    const user = await User.findByIdAndUpdate(
        req.user?.id,
        { $inc: { money: req.body.amount } },
        {
            new: true,
            runValidators: true,
        },
    ).lean();
    if (!user) throw new AppError('User not found', 404);
    res.status(200).json({ money: user.money });
};

// @route GET /api/money
export const getMoney: RequestHandler = getField('money');

// @route POST /api/almanac
export const editAlmanac: RequestHandler = async (req, res) => {
    const { fish }: { fish: IFish } = req.body;
    if (
        !fish ||
        !fish.name ||
        fish.rarity < 0 ||
        fish.rarity > 4 ||
        typeof fish.rarity !== 'number' ||
        !fish.img ||
        typeof fish.price !== 'number' ||
        fish.price < 0
    ) {
        throw new AppError('Missing fields', 400);
    }

    const user = await User.findByIdAndUpdate(
        req.user?.id,
        { $addToSet: { almanac: fish } },
        {
            new: true,
            runValidators: true,
        },
    ).lean();

    if (!user) throw new AppError('User not found', 404);
    res.status(200).json({ fish });
};

// @route GET /api/almanac
export const getAlmanac: RequestHandler = getField('almanac');
