import mongoose from 'mongoose';
import { MAX_RARITY, MIN_RARITY } from '../config/game.js';

export interface IFish {
    name: string;
    img: string;
    rarity: number;
    price: number;
}

const FishSchema = new mongoose.Schema<IFish>({
    name: { type: String, required: true },
    img: { type: String, required: true },
    rarity: {
        type: Number,
        required: true,
        min: MIN_RARITY,
        max: MAX_RARITY,
    },
    price: { type: Number, required: true },
});

const Fish = mongoose.model<IFish>('Fish', FishSchema);
export default Fish;
