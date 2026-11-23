import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { createApp } from './app.js'
import { config } from './config.js'
import { prisma } from './db.js'
import type { ClientToServerEvents, ServerToClientEvents } from './types.js'

// How the API runs: HTTP server, Socket.IO, port. What it does lives in app.ts.

// Fail fast: without this, a wrong DATABASE_URL only shows up on the first request.
// A ping rather than $connect(): with MongoDB, $connect() succeeds without reaching the server.
try {
  await prisma.$runCommandRaw({ ping: 1 })
} catch (error) {
  console.error('Cannot connect to the database:', error)
  process.exit(1)
}

// The routes need io to broadcast, and io needs the HTTP server, which needs the app:
// create io first, then attach it once the server exists.
const io = new Server<ClientToServerEvents, ServerToClientEvents>({
  cors: { origin: config.clientOrigin },
})
const httpServer = createServer(createApp(io))
io.attach(httpServer)

io.on('connection', (socket) => {
  console.log(`socket connected: ${socket.id}`)
})

httpServer.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`)
})
