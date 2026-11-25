import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { logger } from '../lib/logger.js'
import type { ApiError, ApiErrorCode } from '../types.js'
import { AppError } from './app-error.js'

const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  PHOTO_MISSING: 400,
  EMAIL_INVALID: 400,
  UPLOAD_INVALID: 400,
  BODY_INVALID: 400,
  QUERY_INVALID: 400,
  DISPLAY_NAME_INVALID: 400,
  PASSWORD_INVALID: 400,
  // 400, not 401: the session is valid, only the typed password is wrong.
  PASSWORD_INCORRECT: 400,
  MESSAGE_INVALID: 400,
  SELF_FRIEND: 400,
  COLLECTION_NAME_INVALID: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  ROUTE_NOT_FOUND: 404,
  PHOTO_NOT_FOUND: 404,
  SEND_NOT_FOUND: 404,
  INVITATION_NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  FRIENDSHIP_NOT_FOUND: 404,
  COLLECTION_NOT_FOUND: 404,
  PHOTO_DUPLICATE: 409,
  ACCOUNT_EXISTS: 409,
  ALREADY_FRIENDS: 409,
  FRIEND_REQUEST_EXISTS: 409,
  COLLECTION_EXISTS: 409,
  INVITATION_EXPIRED: 410,
  INVITATION_USED: 410,
  PHOTO_TOO_LARGE: 413,
  FORMAT_UNSUPPORTED: 415,
  IMAGE_UNREADABLE: 422,
  SERVER_ERROR: 500,
}

// body-parser tags its JSON syntax errors with this type; express.json() runs on the auth routes.
function isMalformedJson(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  )
}

function toErrorCode(error: unknown): ApiErrorCode {
  if (error instanceof AppError) {
    return error.code
  }
  if (error instanceof multer.MulterError) {
    return error.code === 'LIMIT_FILE_SIZE' ? 'PHOTO_TOO_LARGE' : 'UPLOAD_INVALID'
  }
  if (isMalformedJson(error)) {
    return 'BODY_INVALID'
  }
  return 'SERVER_ERROR'
}

export type ErrorResponse = { status: number; body: ApiError }

export function toErrorResponse(error: unknown): ErrorResponse {
  const code = toErrorCode(error)
  return { status: HTTP_STATUS_BY_CODE[code], body: { error: code } }
}

// Express spots an error handler by its 4 parameters.
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const { status, body } = toErrorResponse(error)
  if (status === HTTP_STATUS_BY_CODE.SERVER_ERROR) {
    logger.error('server.error', { error, method: req.method, path: req.path })
  }
  res.status(status).json(body)
}
