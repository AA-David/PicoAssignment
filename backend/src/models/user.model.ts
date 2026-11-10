import mongoose from 'mongoose';
import {
    MAX_LUCK_LEVEL,
    MAX_RARITY,
    MAX_ROD_LEVEL,
    MIN_RARITY,
    STARTER_BAIT,
} from '../config/game.js';

export interface IInventoryFish {
    fish: mongoose.Types.ObjectId;
    quantity: number;
}

interface IUser {
    login: string;
    luck: number;
    almanac: mongoose.Types.ObjectId[];
    money: number;
    rod: number;
    baits: number[];
    equippedBait: number;
    inventory: IInventoryFish[];
}

const InventoryFishSchema = new mongoose.Schema<IInventoryFish>(
    {
        fish: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Fish',
            required: true,
        },
        quantity: { type: Number, required: true, default: 1, min: 1 },
    },
    // Fish field already contains _id
    { _id: false },
);

const UserSchema = new mongoose.Schema<IUser>({
    login: {
        type: String,
        select: false,
        required: true,
        unique: true,
    },
    almanac: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Fish',
                required: true,
            },
        ],
        default: [],
    },
    luck: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
        max: MAX_LUCK_LEVEL,
    },
    money: {
        type: Number,
        required: true,
        default: 0,
    },
    rod: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
        max: MAX_ROD_LEVEL,
    },
    baits: {
        type: [
            {
                type: Number,
                min: MIN_RARITY,
                max: MAX_RARITY,
            },
        ],
        required: true,
        default: [STARTER_BAIT],
    },
    equippedBait: {
        type: Number,
        required: true,
        default: STARTER_BAIT,
        validate: {
            validator: function (this: unknown, value: number) {
                const baits = (this as IUser).baits;
                return baits.includes(value);
            },
            message: 'Equipped bait must be one the user owns',
        },
    },
    inventory: {
        type: [InventoryFishSchema],
        default: [],
    },
});

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
