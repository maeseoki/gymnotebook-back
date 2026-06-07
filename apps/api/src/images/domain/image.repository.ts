import type { ImageDraft, ImageUploadResult, StoredImage } from './image.js';

export type DeleteOwnedImageResult = 'deleted' | 'not_found' | 'in_use';

export interface ImageRepository {
  createOwned(input: ImageDraft): Promise<ImageUploadResult>;
  findPublicById(id: number): Promise<StoredImage | null>;
  deleteOwnedIfUnused(id: number, ownerUserId: number): Promise<DeleteOwnedImageResult>;
}
