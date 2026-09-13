import mongoose, { Document, Types } from 'mongoose';
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
export declare const Camera: mongoose.Model<ICamera, {}, {}, {}, Document<unknown, {}, ICamera, {}, mongoose.DefaultSchemaOptions> & ICamera & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ICamera>;
export type CameraDocument = ICamera & {
    _id: Types.ObjectId;
};
//# sourceMappingURL=camera.model.d.ts.map