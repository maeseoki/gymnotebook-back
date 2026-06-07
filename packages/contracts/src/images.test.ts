import { describe, expect, it } from 'vitest';
import { ImageIdParamSchema, ImageUploadResponseSchema } from './images/index.js';

describe('image contracts', () => {
  it('validates positive integer image ids', () => {
    expect(ImageIdParamSchema.parse({ id: '1' })).toEqual({ id: 1 });
    expect(() => ImageIdParamSchema.parse({ id: '0' })).toThrow();
    expect(() => ImageIdParamSchema.parse({ id: 'abc' })).toThrow();
  });

  it('validates upload response and rejects unknown fields', () => {
    expect(ImageUploadResponseSchema.parse({ id: 123 })).toEqual({ id: 123 });
    expect(() => ImageUploadResponseSchema.parse({ id: 123, ownerUserId: 1 })).toThrow();
    expect(() => ImageUploadResponseSchema.parse({ id: 0 })).toThrow();
  });
});
