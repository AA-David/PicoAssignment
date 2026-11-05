import mongoose from 'mongoose';

// const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
// type rarity = (typeof RARITIES)[number];
const MAX_RARITIES = 4;

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
    bait: number;
    fish: IFish[];
}

const FishSchema = new mongoose.Schema<IFish>(
    {
        name: { type: String, required: true },
        img: { type: String, required: true },
        rarity: {
            type: Number,
            required: true,
            max: MAX_RARITIES,
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
        max: 5,
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
        max: MAX_RARITIES,
    },
    bait: {
        type: Number,
        required: true,
        default: 0,
        max: MAX_RARITIES,
    },
    fish: {
        type: [FishSchema],
        default: [],
    },
});

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
