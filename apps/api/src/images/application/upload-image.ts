import {
  ImageEmptyError,
  ImageMissingError,
  ImageTypeMismatchError,
  ImageUnsupportedTypeError,
} from '../domain/image.errors.js';
import type { ImageUploadResult, UploadedImageFile } from '../domain/image.js';
import type { ImageRepository } from '../domain/image.repository.js';
import type { ImageTypeDetector } from '../domain/image-type-detector.js';

export interface UploadImageInput {
  userId: number;
  file: UploadedImageFile | null;
}

export async function uploadImage(
  input: UploadImageInput,
  dependencies: {
    images: ImageRepository;
    detector: ImageTypeDetector;
  },
): Promise<ImageUploadResult> {
  const file = input.file;
  if (file?.fieldName !== 'image') {
    throw new ImageMissingError();
  }
  if (file.data.length === 0) {
    throw new ImageEmptyError();
  }

  const detected = await dependencies.detector.detect(file.data);
  if (!detected) {
    throw new ImageUnsupportedTypeError();
  }

  if (file.declaredMediaType && file.declaredMediaType !== detected.mediaType) {
    throw new ImageTypeMismatchError();
  }

  return dependencies.images.createOwned({
    ownerUserId: input.userId,
    originalName: sanitizeImageFileName(file.originalName),
    mediaType: detected.mediaType,
    data: file.data,
  });
}

export function sanitizeImageFileName(name: string): string {
  const leafName = name.split(/[\\/]/).at(-1) ?? '';
  const withoutControls = Array.from(leafName)
    .filter((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint !== undefined && codePoint >= 32 && codePoint !== 127;
    })
    .join('')
    .trim();
  const normalized = withoutControls.length > 0 ? withoutControls : 'image';
  return normalized.slice(0, 255);
}
