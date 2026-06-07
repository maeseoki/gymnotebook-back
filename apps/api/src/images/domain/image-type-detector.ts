import type { SupportedImageMediaType } from './image.js';

export interface DetectedImageType {
  mediaType: SupportedImageMediaType;
  extension: string;
}

export interface ImageTypeDetector {
  detect(data: Uint8Array): Promise<DetectedImageType | null>;
}
