import type { CookieOptions, Response } from 'express'
import { config } from '../../config.js'
import { SESSION_COOKIE } from '../../lib/session-token.js'

const SESSION_COOKIE_OPTIONS: CookieOptions = {
  // Out of reach of JavaScript: an XSS cannot steal the session.
  httpOnly: true,
  sameSite: 'lax',
  // Development runs on plain HTTP: a Secure cookie would never come back.
  secure: config.isProduction,
  path: '/',
}

// Expires with the session itself, also after a renewal.
export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, token, { ...SESSION_COOKIE_OPTIONS, expires: expiresAt })
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, SESSION_COOKIE_OPTIONS)
}
