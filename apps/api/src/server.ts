import { buildApp } from './app.js'
import { parseEnv } from './shared/env.js'

const config = parseEnv(process.env)
const app = await buildApp({ config })

let shutdownStarted = false

async function shutdown(signal: NodeJS.Signals) {
  if (shutdownStarted) {
    return
  }
  shutdownStarted = true

  app.log.info({ signal }, 'Shutting down')

  try {
    await app.close()
    app.log.info({ signal }, 'Shutdown complete')
    process.exit(0)
  } catch (err) {
    app.log.error({ err, signal }, 'Shutdown failed')
    process.exit(1)
  }
}

process.once('SIGINT', () => {
  void shutdown('SIGINT')
})

process.once('SIGTERM', () => {
  void shutdown('SIGTERM')
})

try {
  await app.listen({ host: config.HOST, port: config.PORT })
  app.log.info({ host: config.HOST, port: config.PORT }, 'GymNotebook API listening')
} catch (err) {
  app.log.fatal({ err }, 'Failed to start GymNotebook API')
  process.exit(1)
}
