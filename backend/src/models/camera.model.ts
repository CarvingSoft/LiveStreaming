import mongoose, { Document, Schema, Types } from 'mongoose';
import { SourceType, StreamStatus } from '../types';

export interface ICamera extends Document {
  siteId: Types.ObjectId;
  name: string;
  cameraKey: string;
  channelNumber?: number;
  sourceType: SourceType;
  encryptedSourceConfig?: string;
  mediamtxPath: string;
  isActive: boolean;
  sortOrder: number;
  lastKnownStatus: StreamStatus;
  lastStatusAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const cameraSchema = new Schema<ICamera>(
  {
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    name: { type: String, required: true, trim: true },
    cameraKey: { type: String, required: true, trim: true },
    channelNumber: { type: Number },
    sourceType: { type: String, enum: ['rtsp', 'connector', 'vpn'], default: 'rtsp' },
    encryptedSourceConfig: { type: String },
    mediamtxPath: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    lastKnownStatus: {
      type: String,
      enum: ['online', 'offline', 'connecting', 'error', 'disabled'],
      default: 'offline',
    },
    lastStatusAt: { type: Date },
  },
  { timestamps: true },
);

cameraSchema.index({ siteId: 1, cameraKey: 1 }, { unique: true });
cameraSchema.index({ siteId: 1 });

export const Camera = mongoose.model<ICamera>('Camera', cameraSchema);

export type CameraDocument = ICamera & { _id: Types.ObjectId };
