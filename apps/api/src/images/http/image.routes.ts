import {
  ErrorResponseSchema,
  ImageIdParamSchema,
  ImageUploadResponseSchema,
} from '@gymnotebook/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { deleteImage } from '../application/delete-image.js';
import { getImage } from '../application/get-image.js';
import { uploadImage } from '../application/upload-image.js';
import { ImageMissingError, ImageUnexpectedFieldError } from '../domain/image.errors.js';
import type { UploadedImageFile } from '../domain/image.js';
import { DrizzleImageRepository } from '../infrastructure/drizzle-image.repository.js';
import { FileTypeImageDetector } from '../infrastructure/file-type-image-detector.js';
import { toImageUploadResponse } from './image.mapper.js';

const cacheControl = 'public, max-age=86400';

export async function imageRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const imageRepository = new DrizzleImageRepository(fastify.db);
  const imageTypeDetector = new FileTypeImageDetector();

  app.get(
    '/:id',
    {
      schema: {
        tags: ['images'],
        summary: 'Get image',
        description: 'Returns public binary image data by id.',
        params: ImageIdParamSchema,
        produces: ['image/jpeg', 'image/png', 'image/webp'],
        response: {
          200: z.instanceof(Buffer),
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const image = await getImage({ id: request.params.id }, imageRepository);
      return reply
        .header('Content-Type', image.mediaType)
        .header('Content-Length', image.data.length)
        .header('X-Content-Type-Options', 'nosniff')
        .header('Content-Disposition', 'inline')
        .header('Cache-Control', cacheControl)
        .send(image.data);
    },
  );

  app.post(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['images'],
        summary: 'Upload image',
        description:
          'Uploads one image file in multipart field "image"; content signature determines the stored media type.',
        consumes: ['multipart/form-data'],
        security: [{ bearerAuth: [] }],
        response: {
          201: ImageUploadResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          413: ErrorResponseSchema,
          415: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const file = await readSingleImageFile(request);
      const result = await uploadImage(
        { userId: request.user.userId, file },
        { images: imageRepository, detector: imageTypeDetector },
      );
      return reply.status(201).send(toImageUploadResponse(result));
    },
  );

  app.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['images'],
        summary: 'Delete image',
        description:
          'Deletes an owned image when it is not referenced by exercises. Missing, foreign-owned, and unresolved legacy images are hidden as not found.',
        security: [{ bearerAuth: [] }],
        params: ImageIdParamSchema,
        response: {
          204: z.null(),
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await deleteImage({ id: request.params.id, userId: request.user.userId }, imageRepository);
      return reply.status(204).send(null);
    },
  );
}

async function readSingleImageFile(request: FastifyRequest): Promise<UploadedImageFile | null> {
  let file: UploadedImageFile | null = null;

  for await (const part of request.parts()) {
    if (part.type !== 'file') {
      continue;
    }
    if (part.fieldname !== 'image' || file) {
      throw new ImageUnexpectedFieldError();
    }
    const data = await part.toBuffer();
    file = {
      fieldName: part.fieldname,
      originalName: part.filename,
      declaredMediaType: normalizeDeclaredMediaType(part.mimetype),
      data,
    };
  }

  if (!file) {
    throw new ImageMissingError();
  }
  return file;
}

function normalizeDeclaredMediaType(mediaType: string | undefined): string | null {
  if (!mediaType || mediaType === 'application/octet-stream') {
    return null;
  }
  return mediaType;
}
