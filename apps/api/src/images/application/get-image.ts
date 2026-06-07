import { ImageNotFoundError } from '../domain/image.errors.js';
import type { StoredImage } from '../domain/image.js';
import type { ImageRepository } from '../domain/image.repository.js';

export async function getImage(
  input: { id: number },
  images: ImageRepository,
): Promise<StoredImage> {
  const image = await images.findPublicById(input.id);
  if (!image) {
    throw new ImageNotFoundError();
  }
  return image;
}
