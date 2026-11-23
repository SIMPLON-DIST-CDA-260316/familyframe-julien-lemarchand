import type { ApiErrorCode } from '../types.js'

export class AppError extends Error {
  readonly code: ApiErrorCode

  constructor(code: ApiErrorCode) {
    super(code)
    this.name = 'AppError'
    this.code = code
  }
}
