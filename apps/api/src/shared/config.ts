import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import type { Env } from './env.js'

declare module 'fastify' {
  interface FastifyInstance {
    config: Env
  }
}

export interface ConfigPluginOptions {
  config: Env
}

export const configPlugin = fp(
  async (fastify: FastifyInstance, options: ConfigPluginOptions) => {
    const config = options.config
    fastify.decorate('config', config)
  },
  { name: 'config' },
)
