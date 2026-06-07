import { fileTypeFromBuffer } from 'file-type';
import { type SupportedImageMediaType, supportedImageMediaTypes } from '../domain/image.js';
import type { DetectedImageType, ImageTypeDetector } from '../domain/image-type-detector.js';

const supportedTypes = new Set<string>(supportedImageMediaTypes);

export class FileTypeImageDetector implements ImageTypeDetector {
  async detect(data: Uint8Array): Promise<DetectedImageType | null> {
    const detected = await fileTypeFromBuffer(data);
    if (!detected || !isSupportedMediaType(detected.mime)) {
      return null;
    }
    return {
      mediaType: detected.mime,
      extension: detected.ext,
    };
  }
}

function isSupportedMediaType(mediaType: string): mediaType is SupportedImageMediaType {
  return supportedTypes.has(mediaType);
}
