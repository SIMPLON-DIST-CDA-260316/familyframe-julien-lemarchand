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
