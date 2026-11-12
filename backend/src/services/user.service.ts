import crypto from 'node:crypto';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Fish from '../models/fish.model.js';
import { AppError } from '../utils/AppError.js';
import {
    BAIT_PRICES,
    LUCK_PRICES,
    MAX_LUCK_LEVEL,
    MAX_ROD_LEVEL,
    ROD_PRICES,
    isValidRarity,
} from '../config/game.js';
import { publishState } from '../mqtt/mqtt.js';

// Returns a single field of the user, as `{ [field]: value }`
const getField = async (
    userId: string,
    field:
        | 'luck'
        | 'almanac'
        | 'money'
        | 'rod'
        | 'baits'
        | 'equippedBait'
        | 'inventory',
) => {
    const user = await User.findById(userId).select(field).lean();
    if (!user) throw new AppError('User not found', 404);
    return { [field]: user[field] };
};

// Raises an upgrade level by one, up to `maxLevel`, and charges the price of the next level (`prices[currentLevel + 1]`)
const incrementUpgrade = async (
    userId: string,
    login: string,
    field: 'luck' | 'rod',
    maxLevel: number,
    prices: readonly number[],
) => {
    const nextPrice = {
        $arrayElemAt: [prices, { $add: [`$${field}`, 1] }],
    };
    const user = await User.findOneAndUpdate(
        {
            _id: userId,
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

    publishState(login, {
        rod: user.rod,
        luck: user.luck,
        baits: user.baits,
        equippedBait: user.equippedBait,
        almanac: user.almanac,
    });
    return { [field]: user[field], money: user.money };
};

// Creates a new user and returns their login token
export const register = async () => {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await User.create({ login: tokenHash });
    return { token };
};

export const upgradeLuck = (userId: string, login: string) =>
    incrementUpgrade(userId, login, 'luck', MAX_LUCK_LEVEL, LUCK_PRICES);

export const getLuck = (userId: string) => getField(userId, 'luck');

export const upgradeRod = (userId: string, login: string) =>
    incrementUpgrade(userId, login, 'rod', MAX_ROD_LEVEL, ROD_PRICES);

export const getRod = (userId: string) => getField(userId, 'rod');

export const getEquippedBait = (userId: string) =>
    getField(userId, 'equippedBait');

// Equips a bait the user already owns
export const equipBait = async (
    userId: string,
    login: string,
    bait: unknown,
) => {
    if (!isValidRarity(bait)) throw new AppError('Invalid fields', 400);

    // Matching `baits: bait` ensures the user owns the bait they equip
    const user = await User.findOneAndUpdate(
        { _id: userId, baits: bait },
        { equippedBait: bait },
        { returnDocument: 'after' },
    ).lean();
    if (!user) throw new AppError('User not found or bait not owned', 404);

    publishState(login, {
        rod: user.rod,
        luck: user.luck,
        baits: user.baits,
        equippedBait: user.equippedBait,
        almanac: user.almanac,
    });
    return { equippedBait: user.equippedBait };
};

// Buys a bait: deducts its price and adds it to the user's baits
export const buyBait = async (userId: string, login: string, bait: unknown) => {
    if (!isValidRarity(bait)) throw new AppError('Invalid fields', 400);
    const price = BAIT_PRICES[bait]!;

    // The filter and the update run as one atomic operation, so the user
    // can't buy a bait they can't afford or pay twice for the same bait
    const user = await User.findOneAndUpdate(
        { _id: userId, money: { $gte: price }, baits: { $ne: bait } },
        { $inc: { money: -price }, $addToSet: { baits: bait } },
        { returnDocument: 'after' },
    ).lean();
    if (!user) {
        throw new AppError(
            'User not found, not enough money or bait already owned',
            400,
        );
    }

    publishState(login, {
        rod: user.rod,
        luck: user.luck,
        baits: user.baits,
        equippedBait: user.equippedBait,
        almanac: user.almanac,
    });
    return { baits: user.baits, money: user.money };
};

export const getBaits = (userId: string) => getField(userId, 'baits');

export const getMoney = (userId: string) => getField(userId, 'money');

// Returns `fishId`, or throws unless it is a valid id of an existing fish
const validateFishId = async (fishId: unknown): Promise<string> => {
    if (!mongoose.isObjectIdOrHexString(fishId)) {
        throw new AppError('Invalid fish ID', 400);
    }
    if (!(await Fish.exists({ _id: fishId }))) {
        throw new AppError('Fish not found', 404);
    }
    return fishId as string;
};

// Records a caught fish in the user's almanac (no duplicates)
export const addToAlmanac = async (
    userId: string,
    login: string,
    rawFishId: unknown,
) => {
    const fishId = await validateFishId(rawFishId);

    const user = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { almanac: fishId } },
        { returnDocument: 'after', runValidators: true },
    ).lean();
    if (!user) throw new AppError('User not found', 404);

    publishState(login, {
        rod: user.rod,
        luck: user.luck,
        baits: user.baits,
        equippedBait: user.equippedBait,
        almanac: user.almanac,
    });
    return { fish: fishId };
};

export const getAlmanac = (userId: string) => getField(userId, 'almanac');

// Adds a caught fish to the user's inventory
export const addToInventory = async (userId: string, rawFishId: unknown) => {
    const fishId = await validateFishId(rawFishId);

    // If the fish is already in the inventory, increment its quantity
    let user = await User.findOneAndUpdate(
        { _id: userId, 'inventory.fish': fishId },
        { $inc: { 'inventory.$.quantity': 1 } },
        { returnDocument: 'after', runValidators: true },
    ).lean();

    // Otherwise add it as a new entry with quantity 1
    if (!user) {
        user = await User.findByIdAndUpdate(
            userId,
            { $push: { inventory: { fish: fishId, quantity: 1 } } },
            { returnDocument: 'after', runValidators: true },
        ).lean();
    }

    if (!user) throw new AppError('User not found', 404);
    return { fishId };
};

// Sells one fish from inventory: decrements its quantity (removing the entry at 0) and adds its stored price to the user's money
export const sellFish = async (userId: string, fishId: unknown) => {
    if (!mongoose.isObjectIdOrHexString(fishId)) {
        throw new AppError('Invalid fish ID', 400);
    }

    const fish = await Fish.findById(fishId).select('price').lean();
    if (!fish) throw new AppError('Fish not found', 404);

    // The filter and the update run atomically
    const user = await User.findOneAndUpdate(
        {
            _id: userId,
            inventory: { $elemMatch: { fish: fishId, quantity: { $gte: 1 } } },
        },
        { $inc: { 'inventory.$.quantity': -1, money: fish.price } },
        { returnDocument: 'after' },
    ).lean();
    if (!user) throw new AppError('User not found or fish not owned', 404);

    // Drop sold-out entries
    const cleaned = await User.findByIdAndUpdate(
        userId,
        { $pull: { inventory: { quantity: 0 } } },
        { returnDocument: 'after' },
    ).lean();

    const { inventory } = cleaned ?? user;
    return { inventory, money: user.money };
};

export const getInventory = (userId: string) => getField(userId, 'inventory');

// Gets every fish in the game
export const getFish = async () => {
    const fish = await Fish.find({}).lean();
    return { fish };
};

// Gets the user's stats that affect the random fish mechanic
export const getState = async (userId: string) => {
    const user = await User.findById(userId)
        .select('money rod luck baits equippedBait almanac -_id')
        .lean();
    if (!user) throw new AppError('User not found', 404);
    return user;
};
