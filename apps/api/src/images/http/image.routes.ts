import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as schema from '../../../drizzle/schema.js';
import { ResourceNotFoundError, ValidationError } from '../../shared/errors.js';

export async function imageRoutes(fastify: FastifyInstance) {
  // GET /api/image/:id - public
  fastify.get(
    '/:id',
    {
      schema: {
        params: z.object({ id: z.coerce.number().int().positive() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const rows = await fastify.db
        .select()
        .from(schema.imageData)
        .where(eq(schema.imageData.id, id))
        .limit(1);

      const image = rows[0];
      if (!image) {
        throw new ResourceNotFoundError('Image not found');
      }

      return reply.header('Content-Type', image.type).send(image.imageData);
    },
  );

  // POST /api/image - authenticated
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        throw new ValidationError('No file uploaded');
      }

      const buffer = await data.toBuffer();
      if (buffer.length === 0) {
        throw new ValidationError('File is empty');
      }

      const result = await fastify.db.insert(schema.imageData).values({
        name: data.filename,
        type: data.mimetype,
        imageData: buffer,
      });

      const insertId = (result as unknown as { insertId: number }).insertId;
      return reply.status(201).send(insertId);
    },
  );

  // DELETE /api/image/:id - authenticated
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.coerce.number().int().positive() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const rows = await fastify.db
        .select({ id: schema.imageData.id })
        .from(schema.imageData)
        .where(eq(schema.imageData.id, id))
        .limit(1);

      if (rows.length === 0) {
        throw new ResourceNotFoundError('Image not found');
      }

      await fastify.db.delete(schema.imageData).where(eq(schema.imageData.id, id));
      return reply.status(204).send();
    },
  );
}
