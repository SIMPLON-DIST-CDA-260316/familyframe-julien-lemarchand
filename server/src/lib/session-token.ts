import { createHash, randomBytes } from 'node:crypto'

export const SESSION_COOKIE = 'ff_session'

// 256 bits: unguessable, so the cookie needs no signature.
const TOKEN_BYTES = 32

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex')
}

// The database stores only this: a leaked database opens no session.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// Express and Socket.IO both get the raw Cookie header: one parser serves both,
// without cookie-parser.
export function readSessionToken(cookieHeader: string | undefined): string | null {
  if (cookieHeader === undefined) {
    return null
  }
  const prefix = `${SESSION_COOKIE}=`
  const sessionPair = cookieHeader
    .split(';')
    .map((pair) => pair.trim())
    .find((pair) => pair.startsWith(prefix))
  const token = sessionPair?.slice(prefix.length)
  return token ? token : null
}
