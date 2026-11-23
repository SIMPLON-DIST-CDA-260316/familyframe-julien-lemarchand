import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import type { ApiError, ApiErrorCode } from '../types.js'
import { AppError } from './app-error.js'

const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UPLOADER_NAME_INVALID: 400,
  PHOTO_MISSING: 400,
  UPLOAD_INVALID: 400,
  ROUTE_NOT_FOUND: 404,
  PHOTO_TOO_LARGE: 413,
  FORMAT_UNSUPPORTED: 415,
  IMAGE_UNREADABLE: 422,
  SERVER_ERROR: 500,
}

function toErrorCode(error: unknown): ApiErrorCode {
  if (error instanceof AppError) {
    return error.code
  }
  if (error instanceof multer.MulterError) {
    return error.code === 'LIMIT_FILE_SIZE' ? 'PHOTO_TOO_LARGE' : 'UPLOAD_INVALID'
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
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const { status, body } = toErrorResponse(error)
  if (status === HTTP_STATUS_BY_CODE.SERVER_ERROR) {
    console.error(error)
  }
  res.status(status).json(body)
}
