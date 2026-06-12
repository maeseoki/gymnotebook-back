import type { FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import { buildApp, createTestConfig, createTestDatabase } from '../src/app.js'
import type { JwtPayload } from '../src/shared/jwt.js'

let app: FastifyInstance | undefined

afterEach(async () => {
  await app?.close()
  app = undefined
})

async function makeApp(options: Parameters<typeof buildApp>[0] = {}) {
  app = await buildApp({
    config: createTestConfig(options.configOverrides),
    databaseClient: options.databaseClient ?? createTestDatabase(),
  })
  return app
}

function authHeader(instance: FastifyInstance, payload: JwtPayload) {
  return `Bearer ${instance.jwt.sign(payload)}`
}

describe('Fastify foundation', () => {
  it('returns liveness without touching the database', async () => {
    const instance = await makeApp()

    const response = await instance.inject({ method: 'GET', url: '/health/live' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: 'ok' })
    expect(typeof response.json<{ timestamp: string }>().timestamp).toBe('string')
  })

  it('returns readiness success when the database check passes', async () => {
    const instance = await makeApp({
      databaseClient: createTestDatabase({ ping: async () => {} }),
    })

    const response = await instance.inject({ method: 'GET', url: '/health/ready' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: 'ok' })
  })

  it('does not rate-limit health endpoints', async () => {
    const instance = await makeApp({
      configOverrides: { RATE_LIMIT_MAX: 1, RATE_LIMIT_WINDOW_MS: 60000 },
    })

    const liveOne = await instance.inject({ method: 'GET', url: '/health/live' })
    const liveTwo = await instance.inject({ method: 'GET', url: '/health/live' })
    const readyOne = await instance.inject({ method: 'GET', url: '/health/ready' })
    const readyTwo = await instance.inject({ method: 'GET', url: '/health/ready' })

    expect([
      liveOne.statusCode,
      liveTwo.statusCode,
      readyOne.statusCode,
      readyTwo.statusCode,
    ]).toEqual([200, 200, 200, 200])
  })

  it('emits HSTS only in production', async () => {
    const development = await makeApp({ configOverrides: { NODE_ENV: 'development' } })
    const developmentResponse = await development.inject({ method: 'GET', url: '/health/live' })
    await development.close()

    const production = await makeApp({
      configOverrides: { NODE_ENV: 'production', SWAGGER_ENABLED: false },
    })
    const productionResponse = await production.inject({ method: 'GET', url: '/health/live' })
    await production.close()
    app = undefined

    expect(developmentResponse.headers['strict-transport-security']).toBeUndefined()
    expect(productionResponse.headers['strict-transport-security']).toBeDefined()
  })

  it('returns readiness failure through the common error contract', async () => {
    const instance = await makeApp({
      databaseClient: createTestDatabase({
        ping: async () => {
          throw new Error('database unavailable')
        },
      }),
    })

    const response = await instance.inject({ method: 'GET', url: '/health/ready' })

    expect(response.statusCode).toBe(503)
    expect(response.json()).toMatchObject({
      statusCode: 503,
      code: 'service_unavailable',
      message: 'Service unavailable',
    })
    expect(response.json<{ requestId: string }>().requestId).toBeTruthy()
  })

  it('returns common 404 errors for unknown routes', async () => {
    const instance = await makeApp()

    const response = await instance.inject({ method: 'GET', url: '/does-not-exist' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({
      statusCode: 404,
      code: 'route_not_found',
      message: 'Route not found',
    })
  })

  it('returns common validation errors', async () => {
    const instance = await makeApp()

    const response = await instance.inject({
      method: 'POST',
      url: '/api/auth/signin',
      payload: {},
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      statusCode: 400,
      code: 'validation_failed',
      message: 'Request validation failed',
    })
  })

  it('returns common missing JWT errors', async () => {
    const instance = await makeApp()

    const response = await instance.inject({ method: 'GET', url: '/api/user/me' })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({
      statusCode: 401,
      code: 'unauthorized',
      message: 'Invalid or missing token',
    })
  })

  it('returns common insufficient-role errors', async () => {
    const instance = await makeApp()
    const authorization = authHeader(instance, {
      sub: 'user',
      userId: 1,
      roles: ['ROLE_USER'],
    })

    const response = await instance.inject({
      method: 'GET',
      url: '/api/user',
      headers: { authorization },
    })

    expect(response.statusCode).toBe(403)
    expect(response.json()).toMatchObject({
      statusCode: 403,
      code: 'forbidden',
      message: 'Insufficient permissions',
    })
  })

  it('allows configured CORS origins', async () => {
    const instance = await makeApp({
      configOverrides: { CORS_ORIGINS: ['https://app.example.test'] },
    })

    const response = await instance.inject({
      method: 'GET',
      url: '/health/live',
      headers: { origin: 'https://app.example.test' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe('https://app.example.test')
    expect(response.headers['access-control-allow-credentials']).toBe('true')
  })

  it('rejects unconfigured CORS origins', async () => {
    const instance = await makeApp({
      configOverrides: { CORS_ORIGINS: ['https://app.example.test'] },
    })

    const response = await instance.inject({
      method: 'GET',
      url: '/health/live',
      headers: { origin: 'https://evil.example.test' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('exposes Swagger when enabled', async () => {
    const instance = await makeApp({ configOverrides: { SWAGGER_ENABLED: true } })

    const response = await instance.inject({ method: 'GET', url: '/docs/json' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      openapi: '3.1.0',
      info: { title: 'GymNotebook API' },
    })
  })

  it('generates OpenAPI metadata for production routes', async () => {
    const instance = await makeApp({ configOverrides: { SWAGGER_ENABLED: true } })

    const response = await instance.inject({ method: 'GET', url: '/docs/json' })
    const document = response.json<{
      components: { securitySchemes: Record<string, unknown> }
      paths: Record<
        string,
        Record<
          string,
          {
            tags?: string[]
            summary?: string
            security?: Array<Record<string, unknown>>
            responses?: Record<string, unknown>
          }
        >
      >
    }>()

    expect(document.components.securitySchemes.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    })

    expect(Object.keys(document.paths).sort()).toEqual([
      '/api/auth/logout',
      '/api/auth/mobile/logout',
      '/api/auth/mobile/refresh',
      '/api/auth/mobile/sessions',
      '/api/auth/mobile/sessions/{sessionId}',
      '/api/auth/mobile/signin',
      '/api/auth/mobile/signup',
      '/api/auth/signin',
      '/api/auth/signup',
      '/api/exercise/',
      '/api/exercise/{id}',
      '/api/image/',
      '/api/image/{id}',
      '/api/user/',
      '/api/user/me',
      '/api/user/removepermissions',
      '/api/user/setpermissions',
      '/api/user/verifyuser',
      '/api/user/verifyuser/{username}/{email}',
      '/api/user/{id}',
      '/api/workout-sets/exercise/{exerciseId}',
      '/api/workout/',
      '/api/workout/days/{month}/{year}',
      '/api/workout/workouts/{date}',
      '/health/live',
      '/health/ready',
    ])

    for (const [path, method, tag] of [
      ['/api/auth/signin', 'post', 'auth'],
      ['/api/exercise/', 'post', 'exercises'],
      ['/api/image/', 'post', 'images'],
      ['/api/image/{id}', 'get', 'images'],
      ['/api/workout/', 'post', 'workouts'],
      ['/api/workout/days/{month}/{year}', 'get', 'workouts'],
      ['/api/workout/workouts/{date}', 'get', 'workouts'],
      ['/api/workout-sets/exercise/{exerciseId}', 'get', 'workout-history'],
      ['/api/user/me', 'get', 'users'],
    ] as const) {
      const operation = document.paths[path]?.[method]
      expect(operation?.tags).toContain(tag)
      expect(operation?.summary).toBeTruthy()
      expect(operation?.responses).toBeTruthy()
    }

    expect(document.paths['/api/image/{id}']?.get?.security).toBeUndefined()
    expect(document.paths['/api/image/']?.post?.security).toEqual([{ bearerAuth: [] }])
    expect(document.paths['/api/workout/']?.post?.security).toEqual([{ bearerAuth: [] }])

    for (const [path, method] of [
      ['/api/auth/mobile/signin', 'post'],
      ['/api/auth/mobile/signup', 'post'],
      ['/api/auth/mobile/refresh', 'post'],
      ['/api/auth/mobile/logout', 'post'],
      ['/api/auth/mobile/sessions', 'get'],
      ['/api/auth/mobile/sessions/{sessionId}', 'delete'],
      ['/api/auth/mobile/sessions', 'delete'],
    ] as const) {
      const operation = document.paths[path]?.[method]
      expect(operation?.tags).toContain('mobile-auth')
      expect(operation?.summary).toBeTruthy()
      expect(operation?.responses).toBeTruthy()
    }

    expect(document.paths['/api/auth/mobile/signin']?.post?.security).toBeUndefined()
    expect(document.paths['/api/auth/mobile/signup']?.post?.security).toBeUndefined()
    expect(document.paths['/api/auth/mobile/refresh']?.post?.security).toBeUndefined()
    expect(document.paths['/api/auth/mobile/logout']?.post?.security).toBeUndefined()
    expect(document.paths['/api/auth/mobile/sessions']?.get?.security).toEqual([{ bearerAuth: [] }])
    expect(document.paths['/api/auth/mobile/sessions/{sessionId}']?.delete?.security).toEqual([
      { bearerAuth: [] },
    ])
    expect(document.paths['/api/auth/mobile/sessions']?.delete?.security).toEqual([
      { bearerAuth: [] },
    ])
  })

  it('validates mobile auth contracts before handlers run', async () => {
    const instance = await makeApp()

    const signin = await instance.inject({
      method: 'POST',
      url: '/api/auth/mobile/signin',
      payload: { username: 'mobileuser', password: 'secret1', extra: true },
    })
    const refresh = await instance.inject({
      method: 'POST',
      url: '/api/auth/mobile/refresh',
      payload: { refreshToken: 'short' },
    })
    const logout = await instance.inject({
      method: 'POST',
      url: '/api/auth/mobile/logout',
      payload: { refreshToken: 'a'.repeat(64), extra: true },
    })

    expect(signin.statusCode).toBe(400)
    expect(refresh.statusCode).toBe(400)
    expect(logout.statusCode).toBe(400)
    expect(signin.json()).toMatchObject({ code: 'validation_failed' })
    expect(refresh.json()).toMatchObject({ code: 'validation_failed' })
    expect(logout.json()).toMatchObject({ code: 'validation_failed' })
  })

  it('requires mobile access tokens for mobile session management routes', async () => {
    const instance = await makeApp()
    const legacyAuthorization = authHeader(instance, {
      sub: 'legacy',
      userId: 1,
      roles: ['ROLE_USER'],
    })

    const missing = await instance.inject({ method: 'GET', url: '/api/auth/mobile/sessions' })
    const legacy = await instance.inject({
      method: 'GET',
      url: '/api/auth/mobile/sessions',
      headers: { authorization: legacyAuthorization },
    })

    expect(missing.statusCode).toBe(401)
    expect(missing.json()).toMatchObject({ code: 'unauthorized' })
    expect(legacy.statusCode).toBe(401)
    expect(legacy.json()).toMatchObject({ code: 'mobile_session_required' })
  })

  it('hides Swagger when disabled', async () => {
    const instance = await makeApp({ configOverrides: { SWAGGER_ENABLED: false } })

    const response = await instance.inject({ method: 'GET', url: '/docs/json' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({
      statusCode: 404,
      code: 'route_not_found',
    })
  })

  it('does not expose legacy test routes', async () => {
    const instance = await makeApp({ configOverrides: { NODE_ENV: 'production' } })

    for (const path of ['/api/test/all', '/api/test/user', '/api/test/mod', '/api/test/admin']) {
      const response = await instance.inject({ method: 'GET', url: path })
      expect(response.statusCode).toBe(404)
      expect(response.json()).toMatchObject({ code: 'route_not_found' })
    }
  })

  it('maps multipart payload-too-large errors', async () => {
    const instance = await makeApp({
      configOverrides: { MAX_UPLOAD_SIZE: 8 },
    })
    const boundary = '----gymnotebook-test-boundary'
    const authorization = authHeader(instance, {
      sub: 'user',
      userId: 1,
      roles: ['ROLE_USER'],
    })
    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="image"; filename="image.png"',
      'Content-Type: image/png',
      '',
      'this-payload-is-too-large',
      `--${boundary}--`,
      '',
    ].join('\r\n')

    const response = await instance.inject({
      method: 'POST',
      url: '/api/image',
      headers: {
        authorization,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    })

    expect(response.statusCode).toBe(413)
    expect(response.json()).toMatchObject({
      statusCode: 413,
      code: 'payload_too_large',
      message: 'Payload too large',
    })
  })
})
