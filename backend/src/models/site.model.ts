import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISite extends Document {
  name: string;
  slug: string;
  description?: string;
  organizationName?: string;
  location?: string;
  isActive: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const siteSchema = new Schema<ISite>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    organizationName: { type: String, trim: true },
    location: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true },
);

siteSchema.index({ slug: 1 }, { unique: true });

export const Site = mongoose.model<ISite>('Site', siteSchema);

export type SiteDocument = ISite & { _id: Types.ObjectId };
