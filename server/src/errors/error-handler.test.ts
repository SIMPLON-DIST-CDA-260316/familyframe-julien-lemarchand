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

  it('answers a share message that is too long or not text with 400', () => {
    expect(toErrorResponse(new AppError('MESSAGE_INVALID'))).toEqual({
      status: 400,
      body: { error: 'MESSAGE_INVALID' },
    })
  })

  it('answers a member on an admin route with 403', () => {
    expect(toErrorResponse(new AppError('FORBIDDEN'))).toEqual({
      status: 403,
      body: { error: 'FORBIDDEN' },
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

  it("answers a send gone from the history, or someone else's, with 404", () => {
    expect(toErrorResponse(new AppError('SEND_NOT_FOUND'))).toEqual({
      status: 404,
      body: { error: 'SEND_NOT_FOUND' },
    })
  })

  it('answers an unknown, replaced or malformed invitation token with 404', () => {
    expect(toErrorResponse(new AppError('INVITATION_NOT_FOUND'))).toEqual({
      status: 404,
      body: { error: 'INVITATION_NOT_FOUND' },
    })
  })

  it('answers a friend request to an unknown email with 404', () => {
    expect(toErrorResponse(new AppError('USER_NOT_FOUND'))).toEqual({
      status: 404,
      body: { error: 'USER_NOT_FOUND' },
    })
  })

  it('answers an unknown, malformed or foreign friendship id with 404', () => {
    expect(toErrorResponse(new AppError('FRIENDSHIP_NOT_FOUND'))).toEqual({
      status: 404,
      body: { error: 'FRIENDSHIP_NOT_FOUND' },
    })
  })

  it('answers a collection name that is blank, too long or not text with 400', () => {
    expect(toErrorResponse(new AppError('COLLECTION_NAME_INVALID'))).toEqual({
      status: 400,
      body: { error: 'COLLECTION_NAME_INVALID' },
    })
  })

  it('answers an unknown, malformed or foreign collection id with 404', () => {
    expect(toErrorResponse(new AppError('COLLECTION_NOT_FOUND'))).toEqual({
      status: 404,
      body: { error: 'COLLECTION_NOT_FOUND' },
    })
  })

  it('answers a collection name the account already uses with 409', () => {
    expect(toErrorResponse(new AppError('COLLECTION_EXISTS'))).toEqual({
      status: 409,
      body: { error: 'COLLECTION_EXISTS' },
    })
  })

  it('answers an invitation past its 7 days with 410', () => {
    expect(toErrorResponse(new AppError('INVITATION_EXPIRED'))).toEqual({
      status: 410,
      body: { error: 'INVITATION_EXPIRED' },
    })
  })

  it('answers an invitation already used with 410', () => {
    expect(toErrorResponse(new AppError('INVITATION_USED'))).toEqual({
      status: 410,
      body: { error: 'INVITATION_USED' },
    })
  })

  it('answers a file already in the library with 409', () => {
    expect(toErrorResponse(new AppError('PHOTO_DUPLICATE'))).toEqual({
      status: 409,
      body: { error: 'PHOTO_DUPLICATE' },
    })
  })

  it('answers an invitation for an address that has an account with 409', () => {
    expect(toErrorResponse(new AppError('ACCOUNT_EXISTS'))).toEqual({
      status: 409,
      body: { error: 'ACCOUNT_EXISTS' },
    })
  })

  it('answers a friend request between friends with 409', () => {
    expect(toErrorResponse(new AppError('ALREADY_FRIENDS'))).toEqual({
      status: 409,
      body: { error: 'ALREADY_FRIENDS' },
    })
  })

  it('answers a friend request while one is pending with 409', () => {
    expect(toErrorResponse(new AppError('FRIEND_REQUEST_EXISTS'))).toEqual({
      status: 409,
      body: { error: 'FRIEND_REQUEST_EXISTS' },
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

  it('answers an invalid invitation email with 400', () => {
    expect(toErrorResponse(new AppError('EMAIL_INVALID'))).toEqual({
      status: 400,
      body: { error: 'EMAIL_INVALID' },
    })
  })

  it('answers an invalid display name with 400', () => {
    expect(toErrorResponse(new AppError('DISPLAY_NAME_INVALID'))).toEqual({
      status: 400,
      body: { error: 'DISPLAY_NAME_INVALID' },
    })
  })

  it('answers a friend request to oneself with 400', () => {
    expect(toErrorResponse(new AppError('SELF_FRIEND'))).toEqual({
      status: 400,
      body: { error: 'SELF_FRIEND' },
    })
  })

  it('answers a password of the wrong length with 400', () => {
    expect(toErrorResponse(new AppError('PASSWORD_INVALID'))).toEqual({
      status: 400,
      body: { error: 'PASSWORD_INVALID' },
    })
  })

  it('answers a wrong current password with 400, not 401', () => {
    expect(toErrorResponse(new AppError('PASSWORD_INCORRECT'))).toEqual({
      status: 400,
      body: { error: 'PASSWORD_INCORRECT' },
    })
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
