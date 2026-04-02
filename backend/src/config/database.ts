import mongoose from 'mongoose';
import { config } from './env';
import { logger } from './logger';

export const connectDB = async (): Promise<void> => {
    mongoose.set('strictQuery', true);

    mongoose.connection.on('connected', () => logger.info('✅ Mongoose connected to MongoDB Atlas'));
    mongoose.connection.on('error', (err) => {
        logger.error('❌ Mongoose connection error:', err.message);
        if (err.message.includes('authentication failed')) {
            logger.error('👉 TIP: Check your MONGO_URI username and password.');
        } else if (err.message.includes('ETIMEDOUT') || err.message.includes('ECONNREFUSED')) {
            logger.error('👉 TIP: Check if 0.0.0.0/0 is whitelisted in MongoDB Atlas Network Access.');
        }
    });
    mongoose.connection.on('disconnected', () => logger.warn('Mongoose disconnected'));

    await mongoose.connect(config.MONGO_URI, {
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 10000, // Increased to 10s for slow cold starts
        socketTimeoutMS: 45000,
        family: 4, // Force IPv4 to avoid some Railway/Atlas resolution issues
    });
};

export const disconnectDB = async (): Promise<void> => {
    await mongoose.disconnect();
};
