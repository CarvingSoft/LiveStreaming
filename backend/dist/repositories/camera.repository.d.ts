import { ICamera } from '../models/camera.model';
import { Types } from 'mongoose';
export declare function getCameraById(id: string): Promise<ICamera>;
export declare function getCameraBySiteAndKey(siteId: Types.ObjectId | string, cameraKey: string): Promise<ICamera>;
//# sourceMappingURL=camera.repository.d.ts.map