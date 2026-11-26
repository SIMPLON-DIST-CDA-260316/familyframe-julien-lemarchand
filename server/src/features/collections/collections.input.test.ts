import { describe, expect, it } from 'vitest'
import { AppError } from '../../errors/app-error.js'
import { MAX_PHOTOS_PER_ADD, parsePhotoIds } from './collections.input.js'

const PHOTO_ID = '6b044f9d56a44767c7079a01'
const OTHER_PHOTO_ID = '6b044f9d56a44767c7079a02'

describe('parsePhotoIds', () => {
  it('keeps the order chosen and a photo chosen twice once', () => {
    expect(parsePhotoIds([OTHER_PHOTO_ID, PHOTO_ID, OTHER_PHOTO_ID])).toEqual([
      OTHER_PHOTO_ID,
      PHOTO_ID,
    ])
  })

  it('compares ids sent in capitals as MongoDB answers them, in lowercase', () => {
    expect(parsePhotoIds([PHOTO_ID.toUpperCase(), PHOTO_ID])).toEqual([PHOTO_ID])
  })

  it('accepts up to the bound', () => {
    expect(parsePhotoIds(Array(MAX_PHOTOS_PER_ADD).fill(PHOTO_ID))).toEqual([PHOTO_ID])
  })

  it.each([
    ['no list', undefined],
    ['a single id', PHOTO_ID],
    ['an empty list', []],
    ['more than the bound', Array(MAX_PHOTOS_PER_ADD + 1).fill(PHOTO_ID)],
    ['an id that is not text', [PHOTO_ID, 42]],
  ])('refuses %s as an invalid body', (_case, photoIds) => {
    expect(() => parsePhotoIds(photoIds)).toThrow(new AppError('BODY_INVALID'))
  })

  it('answers an id that is not an ObjectId as an unknown photo', () => {
    expect(() => parsePhotoIds(['not-an-id'])).toThrow(new AppError('PHOTO_NOT_FOUND'))
  })
})
