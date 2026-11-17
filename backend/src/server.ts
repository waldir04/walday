import { createApp } from './app.ts'
import { loadConfig } from './config/env.ts'

const config = loadConfig()
const app = createApp(config)

const server = app.listen(config.PORT, () => {
  console.info(`Walday weather API listening on port ${config.PORT}.`)
})

function shutdown(signal: string): void {
  console.info(`Received ${signal}; shutting down.`)
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
