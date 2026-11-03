import User from '../models/user.model.js';
import type { RequestHandler } from 'express';

//
//------------------------------------------------------------------

// @route POST /api/login
export const login: RequestHandler = (req, res) => {
    // take in the string
    // hash it with sha-256
    // check if it matches a user
};

// @route POST /api/register
export const register: RequestHandler = (req, res) => {
    // create a 128 or 256 bit string with crypto
    // hash it with sha-256
};

//
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
