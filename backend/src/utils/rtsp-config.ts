import { RtspSourceConfig } from '../types';
import { publicRtspHostError } from './network';
import { AppError } from './errors';

export function assertPublicRtspHost(config: RtspSourceConfig): void {
  const message = publicRtspHostError(config.host);
  if (message) {
    throw new AppError(400, message);
  }
}

/** @deprecated Use assertPublicRtspHost */
export const assertProductionRtspHost = assertPublicRtspHost;
