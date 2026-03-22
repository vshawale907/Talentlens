import mongoose from 'mongoose';
import { config } from './env';
import { logger } from './logger';

export const connectDB = async (): Promise<void> => {
    mongoose.set('strictQuery', true);

    mongoose.connection.on('connected', () => logger.info('Mongoose connected'));
    mongoose.connection.on('error', (err) => logger.error('Mongoose error', err));
    mongoose.connection.on('disconnected', () => logger.warn('Mongoose disconnected'));

    await mongoose.connect(config.MONGO_URI, {
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    });
};

export const disconnectDB = async (): Promise<void> => {
    await mongoose.disconnect();
};
