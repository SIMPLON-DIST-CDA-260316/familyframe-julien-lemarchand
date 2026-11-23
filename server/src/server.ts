import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { createApp } from './app.js'
import { config } from './config.js'
import { prisma } from './lib/db.js'
import { logger } from './lib/logger.js'
import type { ClientToServerEvents, ServerToClientEvents } from './types.js'

// Exit after logging: Docker restarts the container from a clean state.
function crash(error: unknown): void {
  logger.error('process.crashed', { error })
  process.exit(1)
}

process.on('uncaughtException', crash)
process.on('unhandledRejection', crash)

// Not $connect(): with MongoDB it succeeds without reaching the server.
try {
  await prisma.$runCommandRaw({ ping: 1 })
  logger.info('db.connected')
} catch (error) {
  logger.error('db.unreachable', { error })
  process.exit(1)
}

// Created before the HTTP server: the routes need it to broadcast.
const io = new Server<ClientToServerEvents, ServerToClientEvents>({
  cors: { origin: config.clientOrigin },
})
const httpServer = createServer(createApp(io))
io.attach(httpServer)

io.on('connection', (socket) => {
  logger.info('socket.connected', { socketId: socket.id })
  socket.on('disconnect', (reason) => {
    logger.info('socket.disconnected', { socketId: socket.id, reason })
  })
})

httpServer.listen(config.port, () => {
  logger.info('server.started', { port: config.port })
})

// `docker stop` sends SIGTERM.
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info('server.stopping', { signal })
  try {
    await io.close() // also closes the HTTP server
    await prisma.$disconnect()
    logger.info('server.stopped')
    process.exit(0)
  } catch (error) {
    logger.error('server.stop_failed', { error })
    process.exit(1)
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
