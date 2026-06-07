import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp, createTestConfig, createTestDatabase } from '../src/app.js';
import type { JwtPayload } from '../src/shared/jwt.js';

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function makeApp(options: Parameters<typeof buildApp>[0] = {}) {
  app = await buildApp({
    config: createTestConfig(options.configOverrides),
    databaseClient: options.databaseClient ?? createTestDatabase(),
  });
  return app;
}

function authHeader(instance: FastifyInstance, payload: JwtPayload) {
  return `Bearer ${instance.jwt.sign(payload)}`;
}

describe('Fastify foundation', () => {
  it('returns liveness without touching the database', async () => {
    const instance = await makeApp();

    const response = await instance.inject({ method: 'GET', url: '/health/live' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
    expect(typeof response.json<{ timestamp: string }>().timestamp).toBe('string');
  });

  it('returns readiness success when the database check passes', async () => {
    const instance = await makeApp({
      databaseClient: createTestDatabase({ ping: async () => {} }),
    });

    const response = await instance.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });

  it('does not rate-limit health endpoints', async () => {
    const instance = await makeApp({
      configOverrides: { RATE_LIMIT_MAX: 1, RATE_LIMIT_WINDOW_MS: 60000 },
    });

    const liveOne = await instance.inject({ method: 'GET', url: '/health/live' });
    const liveTwo = await instance.inject({ method: 'GET', url: '/health/live' });
    const readyOne = await instance.inject({ method: 'GET', url: '/health/ready' });
    const readyTwo = await instance.inject({ method: 'GET', url: '/health/ready' });

    expect([
      liveOne.statusCode,
      liveTwo.statusCode,
      readyOne.statusCode,
      readyTwo.statusCode,
    ]).toEqual([200, 200, 200, 200]);
  });

  it('emits HSTS only in production', async () => {
    const development = await makeApp({ configOverrides: { NODE_ENV: 'development' } });
    const developmentResponse = await development.inject({ method: 'GET', url: '/health/live' });
    await development.close();

    const production = await makeApp({
      configOverrides: { NODE_ENV: 'production', SWAGGER_ENABLED: false },
    });
    const productionResponse = await production.inject({ method: 'GET', url: '/health/live' });
    await production.close();
    app = undefined;

    expect(developmentResponse.headers['strict-transport-security']).toBeUndefined();
    expect(productionResponse.headers['strict-transport-security']).toBeDefined();
  });

  it('returns readiness failure through the common error contract', async () => {
    const instance = await makeApp({
      databaseClient: createTestDatabase({
        ping: async () => {
          throw new Error('database unavailable');
        },
      }),
    });

    const response = await instance.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      statusCode: 503,
      code: 'service_unavailable',
      message: 'Service unavailable',
    });
    expect(response.json<{ requestId: string }>().requestId).toBeTruthy();
  });

  it('returns common 404 errors for unknown routes', async () => {
    const instance = await makeApp();

    const response = await instance.inject({ method: 'GET', url: '/does-not-exist' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      statusCode: 404,
      code: 'route_not_found',
      message: 'Route not found',
    });
  });

  it('returns common validation errors', async () => {
    const instance = await makeApp();

    const response = await instance.inject({
      method: 'POST',
      url: '/api/auth/signin',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      statusCode: 400,
      code: 'validation_failed',
      message: 'Request validation failed',
    });
  });

  it('returns common missing JWT errors', async () => {
    const instance = await makeApp();

    const response = await instance.inject({ method: 'GET', url: '/api/user/me' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      statusCode: 401,
      code: 'unauthorized',
      message: 'Invalid or missing token',
    });
  });

  it('returns common insufficient-role errors', async () => {
    const instance = await makeApp();
    const authorization = authHeader(instance, {
      sub: 'user',
      userId: 1,
      roles: ['ROLE_USER'],
    });

    const response = await instance.inject({
      method: 'GET',
      url: '/api/user',
      headers: { authorization },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      statusCode: 403,
      code: 'forbidden',
      message: 'Insufficient permissions',
    });
  });

  it('allows configured CORS origins', async () => {
    const instance = await makeApp({
      configOverrides: { CORS_ORIGINS: ['https://app.example.test'] },
    });

    const response = await instance.inject({
      method: 'GET',
      url: '/health/live',
      headers: { origin: 'https://app.example.test' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('https://app.example.test');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('rejects unconfigured CORS origins', async () => {
    const instance = await makeApp({
      configOverrides: { CORS_ORIGINS: ['https://app.example.test'] },
    });

    const response = await instance.inject({
      method: 'GET',
      url: '/health/live',
      headers: { origin: 'https://evil.example.test' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('exposes Swagger when enabled', async () => {
    const instance = await makeApp({ configOverrides: { SWAGGER_ENABLED: true } });

    const response = await instance.inject({ method: 'GET', url: '/docs/json' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      openapi: '3.1.0',
      info: { title: 'GymNotebook API' },
    });
  });

  it('hides Swagger when disabled', async () => {
    const instance = await makeApp({ configOverrides: { SWAGGER_ENABLED: false } });

    const response = await instance.inject({ method: 'GET', url: '/docs/json' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      statusCode: 404,
      code: 'route_not_found',
    });
  });

  it('maps multipart payload-too-large errors', async () => {
    const instance = await makeApp({
      configOverrides: { MAX_UPLOAD_SIZE: 8 },
    });
    const boundary = '----gymnotebook-test-boundary';
    const authorization = authHeader(instance, {
      sub: 'user',
      userId: 1,
      roles: ['ROLE_USER'],
    });
    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="image"; filename="image.png"',
      'Content-Type: image/png',
      '',
      'this-payload-is-too-large',
      `--${boundary}--`,
      '',
    ].join('\r\n');

    const response = await instance.inject({
      method: 'POST',
      url: '/api/image',
      headers: {
        authorization,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toMatchObject({
      statusCode: 413,
      code: 'payload_too_large',
      message: 'Payload too large',
    });
  });
});
