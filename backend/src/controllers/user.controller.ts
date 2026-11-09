import crypto from 'node:crypto';
import User from '../models/user.model.js';
import type { RequestHandler } from 'express';
import type { IFish, IInventoryFish } from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';
import {
    BAIT_PRICES,
    LUCK_PRICES,
    MAX_LUCK_LEVEL,
    MAX_ROD_LEVEL,
    ROD_PRICES,
    isValidRarity,
} from '../config/game.js';

// Responds with a single field of the logged-in user
const getField =
    (
        field:
            | 'luck'
            | 'almanac'
            | 'money'
            | 'rod'
            | 'baits'
            | 'equippedBait'
            | 'inventory',
    ): RequestHandler =>
    async (req, res) => {
        const user = await User.findById(req.user?.id).select(field).lean();
        if (!user) throw new AppError('User not found', 404);
        res.status(200).json({ [field]: user[field] });
    };

// Raises an upgrade level by one, up to `maxLevel`, and charges the price of
// the next level (`prices[currentLevel + 1]`)
const incrementUpgrade =
    (
        field: 'luck' | 'rod',
        maxLevel: number,
        prices: readonly number[],
    ): RequestHandler =>
    async (req, res) => {
        const nextPrice = {
            $arrayElemAt: [prices, { $add: [`$${field}`, 1] }],
        };
        const user = await User.findOneAndUpdate(
            {
                _id: req.user?.id,
                [field]: { $lt: maxLevel },
                $expr: { $gte: ['$money', nextPrice] },
            },
            [
                {
                    $set: {
                        money: { $subtract: ['$money', nextPrice] },
                        [field]: { $add: [`$${field}`, 1] },
                    },
                },
            ],
            {
                returnDocument: 'after',
                updatePipeline: true,
            },
        ).lean();
        if (!user) {
            throw new AppError(
                'User not found, upgrade already at max, or not enough money',
                400,
            );
        }
        res.status(200).json({
            [field]: user[field],
            money: user.money,
        });
    };

//------------------------------------------------------------------

// @desc    Create a new user and return their login token
// @route   POST /api/register
export const registerUser: RequestHandler = async (req, res) => {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await User.create({ login: tokenHash });
    res.status(201).set('Cache-Control', 'no-store').json({ token });
};

// @desc    Raise the user's luck level by one
// @route   POST /api/luck
export const upgradeLuck: RequestHandler = incrementUpgrade(
    'luck',
    MAX_LUCK_LEVEL,
    LUCK_PRICES,
);

// @desc    Get the user's luck level
// @route   GET /api/luck
export const getLuckLevel: RequestHandler = getField('luck');

// @desc    Raise the user's rod level by one
// @route   POST /api/rod
export const upgradeRod: RequestHandler = incrementUpgrade(
    'rod',
    MAX_ROD_LEVEL,
    ROD_PRICES,
);

// @desc    Get the user's rod level
// @route   GET /api/rod
export const getRodLevel: RequestHandler = getField('rod');

// @desc    Get the rarity of the bait the user has equipped
// @route   GET /api/equippedBait
export const getEquippedBait: RequestHandler = getField('equippedBait');

// @desc    Equip a bait the user already owns
// @route   POST /api/equippedBait
export const equipBait: RequestHandler = async (req, res) => {
    const { bait } = req.body;
    if (!isValidRarity(bait)) throw new AppError('Invalid fields', 400);

    // Matching `baits: bait` ensures the user owns the bait they equip
    const user = await User.findOneAndUpdate(
        { _id: req.user?.id, baits: bait },
        { equippedBait: bait },
        {
            returnDocument: 'after',
        },
    ).lean();
    if (!user) throw new AppError('User not found or bait not owned', 404);
    res.status(200).json({ equippedBait: user.equippedBait });
};

// @desc    Buy a bait: deduct its price and add it to the user's baits
// @route   POST /api/baits
export const buyBait: RequestHandler = async (req, res) => {
    const { bait } = req.body;
    if (!isValidRarity(bait)) throw new AppError('Invalid fields', 400);
    const price = BAIT_PRICES[bait]!;

    // The filter and the update run as one atomic operation, so the user
    // can't buy a bait they can't afford or pay twice for the same bait
    const user = await User.findOneAndUpdate(
        { _id: req.user?.id, money: { $gte: price }, baits: { $ne: bait } },
        { $inc: { money: -price }, $addToSet: { baits: bait } },
        {
            returnDocument: 'after',
        },
    ).lean();
    if (!user) {
        throw new AppError(
            'User not found, not enough money or bait already owned',
            400,
        );
    }
    res.status(200).json({ baits: user.baits, money: user.money });
};

// @desc    Get the rarities of all baits the user owns
// @route   GET /api/baits
export const getOwnedBaits: RequestHandler = getField('baits');

// @desc    Add `amount` (can be negative) to the user's money
// @route   POST /api/money
export const adjustMoney: RequestHandler = async (req, res) => {
    const { amount } = req.body;
    if (typeof amount !== 'number') throw new AppError('Invalid fields', 400);
    const user = await User.findByIdAndUpdate(
        req.user?.id,
        { $inc: { money: amount } },
        {
            returnDocument: 'after',
            runValidators: true,
        },
    ).lean();
    if (!user) throw new AppError('User not found', 404);
    res.status(200).json({ money: user.money });
};

// @desc    Get the user's money
// @route   GET /api/money
export const getMoney: RequestHandler = getField('money');

// @desc    Record a caught fish in the user's almanac (no duplicates)
// @route   POST /api/almanac
export const addToAlmanac: RequestHandler = async (req, res) => {
    const { fish }: { fish: IFish } = req.body;
    if (
        !fish ||
        !fish.name ||
        !isValidRarity(fish.rarity) ||
        !fish.img ||
        typeof fish.price !== 'number' ||
        fish.price < 0
    ) {
        throw new AppError('Invalid or missing fields', 400);
    }

    const user = await User.findByIdAndUpdate(
        req.user?.id,
        { $addToSet: { almanac: fish } },
        {
            returnDocument: 'after',
            runValidators: true,
        },
    ).lean();

    if (!user) throw new AppError('User not found', 404);
    res.status(200).json({ fish });
};

// @desc    Get every fish in the user's almanac
// @route   GET /api/almanac
export const getAlmanac: RequestHandler = getField('almanac');

// @desc    Add caught fish to user's inventory
// @route   POST /api/inventory
export const addToInventory: RequestHandler = async (req, res) => {
    const { fish }: { fish: IInventoryFish } = req.body;
    if (
        !fish ||
        !fish.name ||
        !isValidRarity(fish.rarity) ||
        !fish.img ||
        typeof fish.price !== 'number' ||
        fish.price < 0
    ) {
        throw new AppError('Invalid or missing fields', 400);
    }

    const options = { returnDocument: 'after', runValidators: true } as const;

    // If the fish is already in the inventory, increment its quantity
    let user = await User.findOneAndUpdate(
        { _id: req.user?.id, 'inventory.name': fish.name },
        { $inc: { 'inventory.$.quantity': 1 } },
        options,
    ).lean();

    // Otherwise add it as a new entry with quantity 1
    if (!user) {
        user = await User.findByIdAndUpdate(
            req.user?.id,
            { $push: { inventory: { ...fish, quantity: 1 } } },
            options,
        ).lean();
    }

    if (!user) throw new AppError('User not found', 404);
    res.status(200).json({ fish });
};

// @desc    Sell one fish from inventory: decrement its quantity (removing the entry at 0) and add its stored price to the user's money
// @route   DELETE /api/inventory
export const sellFish: RequestHandler = async (req, res) => {
    const { name } = req.body;
    if (typeof name !== 'string' || !name) {
        throw new AppError('Invalid or missing fields', 400);
    }

    const owned = {
        _id: req.user?.id,
        inventory: { $elemMatch: { name, quantity: { $gte: 1 } } },
    };

    // Read the stored price so the client can't set its own
    const owner = await User.findOne(owned, { 'inventory.$': 1 }).lean();
    const price = owner?.inventory[0]?.price;
    if (price === undefined) {
        throw new AppError('User not found or fish not owned', 404);
    }

    // The filter and the update run as one atomic operation, so the quantity
    // can't go below 0 and the money can't be paid out twice
    const user = await User.findOneAndUpdate(
        owned,
        { $inc: { 'inventory.$.quantity': -1, money: price } },
        { returnDocument: 'after' },
    ).lean();
    if (!user) throw new AppError('User not found or fish not owned', 404);

    // Drop sold-out entries (safe to repeat; harmless if it ever fails)
    const { inventory } =
        (await User.findByIdAndUpdate(
            req.user?.id,
            { $pull: { inventory: { quantity: 0 } } },
            { returnDocument: 'after' },
        ).lean()) ?? user;

    res.status(200).json({ inventory, money: user.money });
};

// @desc    Get every fish in the user's inventory
// @route   GET /api/inventory
export const getInventory: RequestHandler = getField('inventory');
