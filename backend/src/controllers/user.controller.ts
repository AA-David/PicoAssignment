import type { RequestHandler } from 'express';
import * as userService from '../services/user.service.js';

// @route   POST /api/register
export const postRegister: RequestHandler = async (req, res) => {
    const result = await userService.register();
    res.status(201).set('Cache-Control', 'no-store').json(result);
};

// @route   GET /api/luck
export const getLuck: RequestHandler = async (req, res) => {
    res.status(200).json(await userService.getLuck(req.user!.id));
};

// @route   POST /api/luck
export const postLuck: RequestHandler = async (req, res) => {
    res.status(200).json(await userService.upgradeLuck(req.user!.id, req.user!.login));
};

// @route   GET /api/rod
export const getRod: RequestHandler = async (req, res) => {
    res.status(200).json(await userService.getRod(req.user!.id));
};

// @route   POST /api/rod
export const postRod: RequestHandler = async (req, res) => {
    res.status(200).json(await userService.upgradeRod(req.user!.id, req.user!.login));
};

// @route   GET /api/equippedBait
export const getEquippedBait: RequestHandler = async (req, res) => {
    res.status(200).json(await userService.getEquippedBait(req.user!.id));
};

// @route   POST /api/equippedBait
export const postEquippedBait: RequestHandler = async (req, res) => {
    res.status(200).json(
        await userService.equipBait(
            req.user!.id,
            req.user!.login,
            req.body.bait,
        ),
    );
};

// @route   GET /api/baits
export const getBaits: RequestHandler = async (req, res) => {
    res.status(200).json(await userService.getBaits(req.user!.id));
};

// @route   POST /api/baits
export const postBaits: RequestHandler = async (req, res) => {
    res.status(200).json(
        await userService.buyBait(
            req.user!.id,
            req.user!.login,
            req.body.bait,
        ),
    );
};

// @route   GET /api/money
export const getMoney: RequestHandler = async (req, res) => {
    res.status(200).json(await userService.getMoney(req.user!.id));
};

// @route   GET /api/almanac
export const getAlmanac: RequestHandler = async (req, res) => {
    res.status(200).json(await userService.getAlmanac(req.user!.id));
};

// @route   GET /api/inventory
export const getInventory: RequestHandler = async (req, res) => {
    res.status(200).json(await userService.getInventory(req.user!.id));
};

// @route   DELETE /api/inventory
export const deleteInventory: RequestHandler = async (req, res) => {
    res.status(200).json(
        await userService.sellFish(req.user!.id, req.body.fishId),
    );
};

// @route   GET /api/fish
export const getFish: RequestHandler = async (req, res) => {
    res.status(200).json(await userService.getFish());
};

// @route   GET /api/state
export const getState: RequestHandler = async (req, res) => {
    res.status(200).json(await userService.getState(req.user!.id));
};
