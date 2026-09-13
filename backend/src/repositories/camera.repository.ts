import { Camera, ICamera } from '../models/camera.model';
import { AppError } from '../utils/errors';
import { Types } from 'mongoose';

export async function getCameraById(id: string): Promise<ICamera> {
  const camera = await Camera.findById(id);
  if (!camera) {
    throw new AppError(404, 'Camera not found');
  }
  return camera;
}

export async function getCameraBySiteAndKey(siteId: Types.ObjectId | string, cameraKey: string): Promise<ICamera> {
  const camera = await Camera.findOne({ siteId, cameraKey });
  if (!camera) {
    throw new AppError(404, 'Camera not found');
  }
  return camera;
}
