import type { NextFunction, Request, Response } from 'express'
import { type LogLevel, logger } from './logger.js'

// The J2 healthcheck calls it every few seconds: it would flood the logs.
const SKIPPED_PATHS = ['/api/health']
const CLIENT_ERROR_STATUS = 400
const SERVER_ERROR_STATUS = 500

function levelForStatus(status: number): LogLevel {
  if (status >= SERVER_ERROR_STATUS) {
    return 'error'
  }
  if (status >= CLIENT_ERROR_STATUS) {
    return 'warn'
  }
  return 'info'
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Read now: routers rewrite req.url while the request goes through them.
  const { method, path } = req
  if (SKIPPED_PATHS.includes(path)) {
    next()
    return
  }
  const startedAt = performance.now()
  res.on('finish', () => {
    const status = res.statusCode
    const durationMs = Math.round(performance.now() - startedAt)
    logger[levelForStatus(status)]('http.request', { method, path, status, durationMs })
  })
  next()
}
