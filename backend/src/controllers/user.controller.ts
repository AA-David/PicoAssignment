import crypto from 'node:crypto';
import User from '../models/user.model.js';
import type { RequestHandler } from 'express';

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
export const incrementLuck: RequestHandler = (req, res) => {};

// @route GET /api/luck
export const getLuck: RequestHandler = (req, res) => {};

// @route POST /api/rod
export const incrementRod: RequestHandler = (req, res) => {};

// @route GET /api/rod
export const getRod: RequestHandler = (req, res) => {};

// @route POST /api/bait
export const incrementBait: RequestHandler = (req, res) => {};

// @route GET /api/bait
export const getBait: RequestHandler = (req, res) => {};

//
//------------------------------------------------------------------

// @route PATCH /api/money
export const editMoney: RequestHandler = (req, res) => {};

// @route GET /api/money
export const getMoney: RequestHandler = (req, res) => {};

// @route PATCH /api/almanac
export const editAlmanac: RequestHandler = (req, res) => {};

// @route GET /api/almanac
export const getAlmanac: RequestHandler = (req, res) => {};
