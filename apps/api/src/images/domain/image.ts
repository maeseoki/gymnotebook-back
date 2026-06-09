export const supportedImageMediaTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type SupportedImageMediaType = (typeof supportedImageMediaTypes)[number];

export interface StoredImage {
  id: number;
  ownerUserId: number | null;
  originalName: string;
  mediaType: string;
  data: Buffer;
}

export interface ImageDraft {
  ownerUserId: number;
  originalName: string;
  mediaType: SupportedImageMediaType;
  data: Buffer;
}

export interface ImageUploadResult {
  id: number;
}

export interface UploadedImageFile {
  fieldName: string;
  originalName: string;
  declaredMediaType: string | null;
  data: Buffer;
}
