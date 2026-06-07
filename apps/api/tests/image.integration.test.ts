import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MySqlContainer, type StartedMySqlContainer } from '@testcontainers/mysql';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as schema from '../drizzle/schema.js';
import { seedRoles } from '../scripts/seed-roles.js';
import { buildApp, createTestConfig } from '../src/app.js';
import { Argon2PasswordHasher } from '../src/auth/infrastructure/argon2-password-hasher.js';
import { createDatabaseClient, type DatabaseClient } from '../src/shared/db.js';
import type { Env } from '../src/shared/env.js';
import type { ERole } from '../src/users/domain/role.js';
import { gifImage, jpegImage, multipartPayload, pngImage, webpImage } from './image-fixtures.js';

let container: StartedMySqlContainer | undefined;
let client: DatabaseClient | undefined;
let app: FastifyInstance | undefined;

beforeAll(async () => {
  container = await new MySqlContainer('mysql:8.4')
    .withDatabase('gymnotebook_image_test')
    .withUsername('gymnotebook')
    .withUserPassword('gymnotebook')
    .withRootPassword('root')
    .start();

  const config: Env = createTestConfig({
    DB_HOST: container.getHost(),
    DB_PORT: container.getPort(),
    DB_NAME: container.getDatabase(),
    DB_USER: container.getUsername(),
    DB_PASSWORD: container.getUserPassword(),
    MAX_UPLOAD_SIZE: 1024,
  });
  client = createDatabaseClient(config);
  await migrate(client.db, {
    migrationsFolder: fileURLToPath(new URL('../drizzle/migrations', import.meta.url)),
  });
  await seedRoles(client.db);
  app = await buildApp({ config });
});

afterAll(async () => {
  await app?.close();
  await client?.close();
  await container?.stop();
});

describe('image HTTP integration', () => {
  it('requires JWT for upload and delete, but public retrieval stays open', async () => {
    const imageId = await createImage(null, pngImage, 'image/png');
    const upload = multipartPayload({ data: pngImage, contentType: 'image/png' });

    const uploadResponse = await requireApp().inject({
      method: 'POST',
      url: '/api/image',
      headers: { 'content-type': `multipart/form-data; boundary=${upload.boundary}` },
      payload: upload.payload,
    });
    expect(uploadResponse.statusCode).toBe(401);
    expect(uploadResponse.json()).toMatchObject({ code: 'unauthorized' });

    const deleteResponse = await requireApp().inject({
      method: 'DELETE',
      url: `/api/image/${imageId}`,
    });
    expect(deleteResponse.statusCode).toBe(401);

    const getResponse = await requireApp().inject({
      method: 'GET',
      url: `/api/image/${imageId}`,
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.rawPayload.equals(pngImage)).toBe(true);
  });

  it('uploads supported formats with ownership, normalized MIME type, sanitized filename, and exact bytes', async () => {
    const userId = await createUser('image-uploader', 'image-uploader@example.test');

    for (const [mediaType, data] of [
      ['image/jpeg', jpegImage],
      ['image/png', pngImage],
      ['image/webp', webpImage],
    ] as const) {
      const upload = multipartPayload({
        filename: '../avatar.bin',
        contentType: 'application/octet-stream',
        data,
      });
      const response = await requireApp().inject({
        method: 'POST',
        url: '/api/image',
        headers: {
          authorization: authHeader(userId, 'image-uploader'),
          'content-type': `multipart/form-data; boundary=${upload.boundary}`,
        },
        payload: upload.payload,
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({ id: expect.any(Number) });
      const stored = await findImage(response.json<{ id: number }>().id);
      expect(stored).toMatchObject({
        name: 'avatar.bin',
        type: mediaType,
        userId,
      });
      expect(stored?.imageData.equals(data)).toBe(true);
    }
  });

  it('rejects missing, empty, unsupported, mismatched, and oversized uploads with common errors', async () => {
    const userId = await createUser('image-validation', 'image-validation@example.test');
    const authorization = authHeader(userId, 'image-validation');

    const empty = multipartPayload({ data: Buffer.alloc(0), contentType: 'image/png' });
    const emptyResponse = await upload(empty, authorization);
    expect(emptyResponse.statusCode).toBe(400);
    expect(emptyResponse.json()).toMatchObject({ code: 'image_empty' });

    const unsupported = multipartPayload({ data: gifImage, contentType: 'image/gif' });
    const unsupportedResponse = await upload(unsupported, authorization);
    expect(unsupportedResponse.statusCode).toBe(415);
    expect(unsupportedResponse.json()).toMatchObject({ code: 'image_unsupported_type' });

    const mismatch = multipartPayload({ data: jpegImage, contentType: 'image/png' });
    const mismatchResponse = await upload(mismatch, authorization);
    expect(mismatchResponse.statusCode).toBe(415);
    expect(mismatchResponse.json()).toMatchObject({ code: 'image_type_mismatch' });

    const missingResponse = await requireApp().inject({
      method: 'POST',
      url: '/api/image',
      headers: {
        authorization,
        'content-type': 'multipart/form-data; boundary=----missing-image',
      },
      payload: '------missing-image--\r\n',
    });
    expect(missingResponse.statusCode).toBe(400);
    expect(missingResponse.json()).toMatchObject({ code: 'image_missing' });

    const oversized = multipartPayload({
      data: Buffer.alloc(2048, 1),
      contentType: 'image/png',
    });
    const oversizedResponse = await upload(oversized, authorization);
    expect(oversizedResponse.statusCode).toBe(413);
    expect(oversizedResponse.json()).toMatchObject({ code: 'payload_too_large' });
  });

  it('retrieves binary content with security-conscious headers and no metadata JSON', async () => {
    const imageId = await createImage(null, pngImage, 'image/png');

    const response = await requireApp().inject({
      method: 'GET',
      url: `/api/image/${imageId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('image/png');
    expect(response.headers['content-length']).toBe(String(pngImage.length));
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-disposition']).toBe('inline');
    expect(response.headers['cache-control']).toBe('public, max-age=86400');
    expect(response.rawPayload.equals(pngImage)).toBe(true);
    expect(() => response.json()).toThrow();
  });

  it('returns image_not_found for missing retrieval and invalid id validation for bad ids', async () => {
    const missing = await requireApp().inject({ method: 'GET', url: '/api/image/999999' });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({ code: 'image_not_found' });

    const invalid = await requireApp().inject({ method: 'GET', url: '/api/image/0' });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({ code: 'validation_failed' });
  });

  it('deletes only owned unreferenced images and hides foreign or unresolved legacy images', async () => {
    const ownerId = await createUser('image-owner', 'image-owner@example.test');
    const otherId = await createUser('image-other', 'image-other@example.test');
    const ownedId = await createImage(ownerId, pngImage, 'image/png');
    const foreignId = await createImage(otherId, pngImage, 'image/png');
    const unresolvedId = await createImage(null, pngImage, 'image/png');

    for (const imageId of [foreignId, unresolvedId]) {
      const response = await requireApp().inject({
        method: 'DELETE',
        url: `/api/image/${imageId}`,
        headers: { authorization: authHeader(ownerId, 'image-owner') },
      });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ code: 'image_not_found' });
    }

    const deleteResponse = await requireApp().inject({
      method: 'DELETE',
      url: `/api/image/${ownedId}`,
      headers: { authorization: authHeader(ownerId, 'image-owner') },
    });
    expect(deleteResponse.statusCode).toBe(204);
    expect(await findImage(ownedId)).toBeNull();
    expect(await findImage(foreignId)).not.toBeNull();
    expect(await findImage(unresolvedId)).not.toBeNull();
  });

  it('rejects deletion of referenced owned images without removing the exercise reference', async () => {
    const userId = await createUser('image-reference', 'image-reference@example.test');
    const imageId = await createImage(userId, pngImage, 'image/png');
    const exerciseId = await createExercise(userId, imageId);

    const response = await requireApp().inject({
      method: 'DELETE',
      url: `/api/image/${imageId}`,
      headers: { authorization: authHeader(userId, 'image-reference') },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: 'image_in_use' });
    const exerciseRows = await requireClient()
      .db.select({ imageId: schema.exercises.imageId })
      .from(schema.exercises)
      .where(eq(schema.exercises.id, exerciseId))
      .limit(1);
    expect(exerciseRows[0]?.imageId).toBe(imageId);
  });
});

async function upload(
  multipart: ReturnType<typeof multipartPayload>,
  authorization: string,
): Promise<ReturnType<FastifyInstance['inject']>> {
  return requireApp().inject({
    method: 'POST',
    url: '/api/image',
    headers: {
      authorization,
      'content-type': `multipart/form-data; boundary=${multipart.boundary}`,
    },
    payload: multipart.payload,
  });
}

async function createUser(username: string, email: string): Promise<number> {
  const hasher = new Argon2PasswordHasher();
  const inserted = await requireClient()
    .db.insert(schema.users)
    .values({ username, email, password: await hasher.hash('secret1') })
    .$returningId();
  const userId = inserted[0]?.id;
  if (typeof userId !== 'number') {
    throw new Error('Expected user id');
  }
  const role = await requireClient()
    .db.select()
    .from(schema.roles)
    .where(eq(schema.roles.name, 'ROLE_USER'))
    .limit(1);
  const roleId = role[0]?.id;
  if (typeof roleId !== 'number') {
    throw new Error('Expected ROLE_USER');
  }
  await requireClient().db.insert(schema.userRoles).values({ userId, roleId });
  return userId;
}

async function createImage(
  userId: number | null,
  data: Buffer,
  mediaType: string,
): Promise<number> {
  const inserted = await requireClient()
    .db.insert(schema.imageData)
    .values({
      name: `image-${randomUUID()}.bin`,
      type: mediaType,
      imageData: data,
      userId,
    })
    .$returningId();
  const imageId = inserted[0]?.id;
  if (typeof imageId !== 'number') {
    throw new Error('Expected image id');
  }
  return imageId;
}

async function findImage(id: number): Promise<typeof schema.imageData.$inferSelect | null> {
  const rows = await requireClient()
    .db.select()
    .from(schema.imageData)
    .where(eq(schema.imageData.id, id))
    .limit(1);
  return rows[0] ?? null;
}

async function createExercise(userId: number, imageId: number): Promise<number> {
  const inserted = await requireClient()
    .db.insert(schema.exercises)
    .values({
      name: `Image exercise ${randomUUID()}`,
      description: 'Description',
      imageId,
      type: 'WEIGHT_REPS',
      primaryMuscleGroup: 'CHEST',
      secondaryMuscleGroup: 'TRICEPS',
      userId,
    })
    .$returningId();
  const exerciseId = inserted[0]?.id;
  if (typeof exerciseId !== 'number') {
    throw new Error('Expected exercise id');
  }
  return exerciseId;
}

function authHeader(userId: number, username: string, roles: ERole[] = ['ROLE_USER']) {
  return `Bearer ${requireApp().jwt.sign({ sub: username, userId, roles })}`;
}

function requireApp(): FastifyInstance {
  if (!app) {
    throw new Error('App was not initialized');
  }
  return app;
}

function requireClient(): DatabaseClient {
  if (!client) {
    throw new Error('Database client was not initialized');
  }
  return client;
}
