import { Site, ISite } from '../models/site.model';
import { AppError } from '../utils/errors';

export async function getSiteById(id: string): Promise<ISite> {
  const site = await Site.findById(id);
  if (!site) {
    throw new AppError(404, 'Site not found');
  }
  return site;
}

export async function getSiteBySlug(slug: string): Promise<ISite> {
  const site = await Site.findOne({ slug });
  if (!site) {
    throw new AppError(404, 'Site not found');
  }
  return site;
}
