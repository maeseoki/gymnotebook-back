import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { type Env, parseEnv } from './env.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: Env;
  }
}

export const configPlugin = fp(
  async (fastify: FastifyInstance) => {
    const config = parseEnv();
    fastify.decorate('config', config);
  },
  { name: 'config' },
);
