import { env } from '../config/env';
import { RtspSourceConfig } from '../types';
import { productionRtspHostError } from './network';
import { AppError } from './errors';

export function assertProductionRtspHost(config: RtspSourceConfig): void {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  const message = productionRtspHostError(config.host);
  if (message) {
    throw new AppError(400, message);
  }
}
