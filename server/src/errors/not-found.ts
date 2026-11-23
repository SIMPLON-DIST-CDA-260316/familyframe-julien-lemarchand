import { AppError } from './app-error.js'

export function notFound(): never {
  throw new AppError('ROUTE_NOT_FOUND')
}
