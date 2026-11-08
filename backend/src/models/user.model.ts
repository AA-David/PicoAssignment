import mongoose from 'mongoose';
import {
    MAX_LUCK_LEVEL,
    MAX_RARITY,
    MAX_ROD_LEVEL,
    MIN_RARITY,
    STARTER_BAIT,
} from '../config/game.js';

export interface IFish {
    name: string;
    img: string;
    rarity: number;
    price: number;
}

interface IUser {
    login: string;
    luck: number;
    almanac: IFish[];
    money: number;
    rod: number;
    baits: number[];
    equippedBait: number;
    fish: IFish[];
}

const FishSchema = new mongoose.Schema<IFish>(
    {
        name: { type: String, required: true },
        img: { type: String, required: true },
        rarity: {
            type: Number,
            required: true,
            min: MIN_RARITY,
            max: MAX_RARITY,
        },
        price: { type: Number, required: true },
    },
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
        type: [FishSchema],
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
    fish: {
        type: [FishSchema],
        default: [],
    },
});

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
