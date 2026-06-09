import { describe, expect, it } from 'vitest';
import { deleteImage } from '../src/images/application/delete-image.js';
import { getImage } from '../src/images/application/get-image.js';
import { sanitizeImageFileName, uploadImage } from '../src/images/application/upload-image.js';
import {
  ImageEmptyError,
  ImageInUseError,
  ImageMissingError,
  ImageNotFoundError,
  ImageTypeMismatchError,
  ImageUnsupportedTypeError,
} from '../src/images/domain/image.errors.js';
import type {
  ImageDraft,
  StoredImage,
  SupportedImageMediaType,
  UploadedImageFile,
} from '../src/images/domain/image.js';
import type {
  DeleteOwnedImageResult,
  ImageRepository,
} from '../src/images/domain/image.repository.js';
import type {
  DetectedImageType,
  ImageTypeDetector,
} from '../src/images/domain/image-type-detector.js';
import { FileTypeImageDetector } from '../src/images/infrastructure/file-type-image-detector.js';
import { jpegImage, pngImage, webpImage } from './image-fixtures.js';

class FakeImageRepository implements ImageRepository {
  images = new Map<number, StoredImage>();
  nextId = 1;
  deleteResult: DeleteOwnedImageResult = 'deleted';
  lastCreated: ImageDraft | null = null;

  async createOwned(input: ImageDraft) {
    const id = this.nextId;
    this.nextId += 1;
    this.lastCreated = input;
    this.images.set(id, {
      id,
      ownerUserId: input.ownerUserId,
      originalName: input.originalName,
      mediaType: input.mediaType,
      data: input.data,
    });
    return { id };
  }

  async findPublicById(id: number) {
    return this.images.get(id) ?? null;
  }

  async deleteOwnedIfUnused(_id: number, _ownerUserId: number) {
    return this.deleteResult;
  }
}

class FakeImageTypeDetector implements ImageTypeDetector {
  detected: DetectedImageType | null = { mediaType: 'image/png', extension: 'png' };

  async detect(_data: Uint8Array) {
    return this.detected;
  }
}

function uploadFile(overrides: Partial<UploadedImageFile> = {}): UploadedImageFile {
  return {
    fieldName: 'image',
    originalName: 'image.png',
    declaredMediaType: 'image/png',
    data: pngImage,
    ...overrides,
  };
}

describe('image use cases', () => {
  it.each<SupportedImageMediaType>([
    'image/jpeg',
    'image/png',
    'image/webp',
  ])('uploads %s images and assigns ownership', async (mediaType) => {
    const images = new FakeImageRepository();
    const detector = new FakeImageTypeDetector();
    detector.detected = { mediaType, extension: mediaType.split('/')[1] ?? 'img' };

    const result = await uploadImage(
      {
        userId: 42,
        file: uploadFile({ declaredMediaType: mediaType, originalName: '../avatar.png' }),
      },
      { images, detector },
    );

    expect(result).toEqual({ id: 1 });
    expect(images.lastCreated).toMatchObject({
      ownerUserId: 42,
      originalName: 'avatar.png',
      mediaType,
    });
  });

  it('rejects missing, empty, unsupported, and mismatched uploads', async () => {
    const images = new FakeImageRepository();
    const detector = new FakeImageTypeDetector();

    await expect(
      uploadImage({ userId: 1, file: null }, { images, detector }),
    ).rejects.toBeInstanceOf(ImageMissingError);
    await expect(
      uploadImage({ userId: 1, file: uploadFile({ data: Buffer.alloc(0) }) }, { images, detector }),
    ).rejects.toBeInstanceOf(ImageEmptyError);

    detector.detected = null;
    await expect(
      uploadImage({ userId: 1, file: uploadFile() }, { images, detector }),
    ).rejects.toBeInstanceOf(ImageUnsupportedTypeError);

    detector.detected = { mediaType: 'image/jpeg', extension: 'jpg' };
    await expect(
      uploadImage(
        { userId: 1, file: uploadFile({ declaredMediaType: 'image/png' }) },
        { images, detector },
      ),
    ).rejects.toBeInstanceOf(ImageTypeMismatchError);
  });

  it('sanitizes filenames without affecting MIME decisions', () => {
    expect(sanitizeImageFileName('../nested/avatar.png')).toBe('avatar.png');
    expect(sanitizeImageFileName('bad\u0000name.png')).toBe('badname.png');
    expect(sanitizeImageFileName('   ')).toBe('image');
    expect(sanitizeImageFileName(`${'a'.repeat(300)}.png`)).toHaveLength(255);
  });

  it('retrieves public images and maps missing images', async () => {
    const images = new FakeImageRepository();
    await images.createOwned({
      ownerUserId: 1,
      originalName: 'image.png',
      mediaType: 'image/png',
      data: pngImage,
    });

    await expect(getImage({ id: 1 }, images)).resolves.toMatchObject({ id: 1 });
    await expect(getImage({ id: 2 }, images)).rejects.toBeInstanceOf(ImageNotFoundError);
  });

  it('deletes owned images and maps hidden or referenced images', async () => {
    const images = new FakeImageRepository();

    await expect(deleteImage({ id: 1, userId: 1 }, images)).resolves.toBeUndefined();

    images.deleteResult = 'not_found';
    await expect(deleteImage({ id: 1, userId: 1 }, images)).rejects.toBeInstanceOf(
      ImageNotFoundError,
    );

    images.deleteResult = 'in_use';
    await expect(deleteImage({ id: 1, userId: 1 }, images)).rejects.toBeInstanceOf(ImageInUseError);
  });

  it('detects supported image formats from real signatures', async () => {
    const detector = new FileTypeImageDetector();

    await expect(detector.detect(pngImage)).resolves.toMatchObject({ mediaType: 'image/png' });
    await expect(detector.detect(jpegImage)).resolves.toMatchObject({ mediaType: 'image/jpeg' });
    await expect(detector.detect(webpImage)).resolves.toMatchObject({ mediaType: 'image/webp' });
    await expect(detector.detect(Buffer.from('not an image'))).resolves.toBeNull();
  });
});
