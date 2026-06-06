import { z } from 'zod';

export const ImageUploadResponseSchema = z.object({
  id: z.number().int(),
});
export type ImageUploadResponse = z.infer<typeof ImageUploadResponseSchema>;

export const ImageIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
export type ImageIdParam = z.infer<typeof ImageIdParamSchema>;
