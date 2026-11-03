import mongoose from 'mongoose';

export const connectDB = async () => {
    const MONGO_URI = process.env.MONGO_URI;

    if (!MONGO_URI) {
        console.log('MONGO_URI is not defined in .env');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);
    } catch (e) {
        console.log('Database connection failed:', e);
        process.exit(1);
    }
};
