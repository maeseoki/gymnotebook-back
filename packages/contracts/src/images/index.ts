import { z } from 'zod';

export const ImageUploadResponseSchema = z.strictObject({
  id: z.number().int().positive(),
});
export type ImageUploadResponse = z.infer<typeof ImageUploadResponseSchema>;

export const ImageIdParamSchema = z.strictObject({
  id: z.coerce.number().int().positive(),
});
export type ImageIdParam = z.infer<typeof ImageIdParamSchema>;
