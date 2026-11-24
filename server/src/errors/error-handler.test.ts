import multer from 'multer'
import { describe, expect, it } from 'vitest'
import { AppError } from './app-error.js'
import { toErrorResponse } from './error-handler.js'

describe('toErrorResponse', () => {
  it('uses the status mapped to an AppError code', () => {
    expect(toErrorResponse(new AppError('FORMAT_UNSUPPORTED'))).toEqual({
      status: 415,
      body: { error: 'FORMAT_UNSUPPORTED' },
    })
  })

  it('answers an unknown route with 404', () => {
    expect(toErrorResponse(new AppError('ROUTE_NOT_FOUND'))).toEqual({
      status: 404,
      body: { error: 'ROUTE_NOT_FOUND' },
    })
  })

  it('answers an unknown photo with 404', () => {
    expect(toErrorResponse(new AppError('PHOTO_NOT_FOUND'))).toEqual({
      status: 404,
      body: { error: 'PHOTO_NOT_FOUND' },
    })
  })

  it('answers a file already in the library with 409', () => {
    expect(toErrorResponse(new AppError('PHOTO_DUPLICATE'))).toEqual({
      status: 409,
      body: { error: 'PHOTO_DUPLICATE' },
    })
  })

  it('maps a file over the size limit to PHOTO_TOO_LARGE', () => {
    expect(toErrorResponse(new multer.MulterError('LIMIT_FILE_SIZE'))).toEqual({
      status: 413,
      body: { error: 'PHOTO_TOO_LARGE' },
    })
  })

  it('maps any other Multer error to UPLOAD_INVALID', () => {
    expect(toErrorResponse(new multer.MulterError('LIMIT_UNEXPECTED_FILE'))).toEqual({
      status: 400,
      body: { error: 'UPLOAD_INVALID' },
    })
  })

  it('maps a malformed JSON body to BODY_INVALID', () => {
    const parseError = Object.assign(new SyntaxError('Unexpected end of JSON input'), {
      type: 'entity.parse.failed',
    })

    expect(toErrorResponse(parseError)).toEqual({ status: 400, body: { error: 'BODY_INVALID' } })
  })

  it('answers an invalid query string with 400', () => {
    expect(toErrorResponse(new AppError('QUERY_INVALID'))).toEqual({
      status: 400,
      body: { error: 'QUERY_INVALID' },
    })
  })

  it('answers a request without a valid session with 401', () => {
    expect(toErrorResponse(new AppError('UNAUTHENTICATED'))).toEqual({
      status: 401,
      body: { error: 'UNAUTHENTICATED' },
    })
  })

  it('answers wrong credentials with 401', () => {
    expect(toErrorResponse(new AppError('INVALID_CREDENTIALS'))).toEqual({
      status: 401,
      body: { error: 'INVALID_CREDENTIALS' },
    })
  })

  it('hides the details of an unexpected error', () => {
    expect(toErrorResponse(new Error('mongodb://admin:secret@cluster'))).toEqual({
      status: 500,
      body: { error: 'SERVER_ERROR' },
    })
  })

  it('treats a thrown non-Error value as a server error', () => {
    expect(toErrorResponse('boom')).toEqual({ status: 500, body: { error: 'SERVER_ERROR' } })
  })
})
