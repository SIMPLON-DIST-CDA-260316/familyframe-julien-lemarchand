import type { Server } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '../types.js'

export type InterServerEvents = Record<string, never>

// Set by the Socket.IO auth middleware before the connection event.
export type SocketData = { userId: string }

export type SocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

export type SocketMiddleware = Parameters<SocketServer['use']>[0]
