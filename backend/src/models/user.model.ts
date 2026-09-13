import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from '../types';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>('User', userSchema);
