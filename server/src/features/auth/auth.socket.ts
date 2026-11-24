import { AppError } from '../../errors/app-error.js'
import { logger } from '../../lib/logger.js'
import { readSessionToken } from '../../lib/session-token.js'
import type { SocketMiddleware } from '../../lib/socket-types.js'
import type { AuthService } from './auth.service.js'

// The message is the only thing the client receives: it matches the HTTP error code.
function toHandshakeError(error: unknown): Error {
  if (error instanceof AppError) {
    return new Error('UNAUTHENTICATED')
  }
  logger.error('server.error', { error, path: '/socket.io' })
  return new Error('SERVER_ERROR')
}

// One spelling of the room name: the socket joins it, the photos controller emits to it.
export function userRoom(userId: string): string {
  return `user:${userId}`
}

// No sliding here: a handshake has no HTTP response to carry a renewed cookie.
export function createSocketAuth(service: AuthService): SocketMiddleware {
  return async (socket, next) => {
    const token = readSessionToken(socket.request.headers.cookie)
    let userId: string
    try {
      userId = (await service.authenticate(token)).user.id
    } catch (error: unknown) {
      next(toHandshakeError(error))
      return
    }
    // Outside the try: a failure here must surface as a crash, not hang the handshake.
    socket.data.userId = userId
    socket.join(userRoom(userId))
    next()
  }
}
