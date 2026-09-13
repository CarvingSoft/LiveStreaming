import mongoose, { Document, Types } from 'mongoose';
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
export declare const Site: mongoose.Model<ISite, {}, {}, {}, Document<unknown, {}, ISite, {}, mongoose.DefaultSchemaOptions> & ISite & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ISite>;
export type SiteDocument = ISite & {
    _id: Types.ObjectId;
};
//# sourceMappingURL=site.model.d.ts.map