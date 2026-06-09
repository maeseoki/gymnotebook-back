import { ImageInUseError, ImageNotFoundError } from '../domain/image.errors.js';
import type { ImageRepository } from '../domain/image.repository.js';

export async function deleteImage(
  input: { id: number; userId: number },
  images: ImageRepository,
): Promise<void> {
  const result = await images.deleteOwnedIfUnused(input.id, input.userId);
  if (result === 'not_found') {
    throw new ImageNotFoundError();
  }
  if (result === 'in_use') {
    throw new ImageInUseError();
  }
}
