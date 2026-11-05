import mongoose from 'mongoose';

const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
type rarity = (typeof RARITIES)[number];

interface IFish {
    name: string;
    img: string;
    rarity: rarity;
    price: number;
}

interface IUser {
    login: string;
    luck: number;
    almanac: IFish[];
    inventory: {
        money: number;
        rod: rarity;
        bait: rarity;
        fish: IFish[];
    };
}

const FishSchema = new mongoose.Schema<IFish>(
    {
        name: { type: String, required: true },
        img: { type: String, required: true },
        rarity: { type: String, enum: RARITIES, required: true },
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
    },
    inventory: {
        money: {
            type: Number,
            required: true,
            default: 0,
        },
        rod: {
            type: String,
            enum: RARITIES,
            required: true,
            default: 'common',
        },
        bait: {
            type: String,
            enum: RARITIES,
            required: true,
            default: 'common',
        },
        fish: {
            type: [FishSchema],
            default: [],
        },
    },
});

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
