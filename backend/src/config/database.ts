import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
