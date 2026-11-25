import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import { MAX_MESSAGE_LENGTH, type UploadedFile } from './photos.input.js'
import type { PhotoRecord, PhotosRepository, StoredPhoto } from './photos.repository.js'
import { createPhotosService, type PhotosServiceDeps } from './photos.service.js'

const SENDER_ID = '6b044f9d56a44767c7079b01'
const FRIEND_ID = '6b044f9d56a44767c7079b02'
const IMAGE = { url: 'https://res.cloudinary.com/demo/photo.jpg', cloudinaryId: 'familyframe/abc' }
// Received earlier with its own message: a new share must not pass that one on.
const ORIGINAL: StoredPhoto = {
  id: '6b044f9d56a44767c7079a01',
  ownerId: SENDER_ID,
  senderId: '6b044f9d56a44767c7079b03',
  ...IMAGE,
  sha256: 'sha-of-the-original-bytes',
  message: 'Le message reçu avec la photo',
  createdAt: new Date('2026-11-23T10:00:00Z'),
}
const COPY: PhotoRecord = {
  ...ORIGINAL,
  id: '6b044f9d56a44767c7079a02',
  ownerId: FRIEND_ID,
  senderId: SENDER_ID,
  sender: { displayName: 'Membre' },
  message: 'Joyeux anniversaire !',
}
const PNG_FILE: UploadedFile = { buffer: Buffer.from('raw png'), mimetype: 'image/png' }
const NOT_TEXT_MESSAGES: unknown[] = [42, ['un', 'deux'], { text: 'bonjour' }]

// Every dependency succeeds by default; each test breaks only the one it is about.
function makeDeps() {
  return {
    repository: {
      findPage: vi.fn<PhotosRepository['findPage']>(),
      findByOwnerAndSha256: vi
        .fn<PhotosRepository['findByOwnerAndSha256']>()
        .mockResolvedValue(null),
      findOwned: vi.fn<PhotosRepository['findOwned']>().mockResolvedValue(ORIGINAL),
      create: vi.fn<PhotosRepository['create']>().mockResolvedValue(COPY),
      deleteOwned: vi.fn<PhotosRepository['deleteOwned']>(),
      countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>(),
    },
    toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>().mockResolvedValue(Buffer.from('jpeg')),
    uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>().mockResolvedValue(IMAGE),
    deleteImage: vi.fn<PhotosServiceDeps['deleteImage']>().mockResolvedValue(undefined),
    areFriends: vi.fn<PhotosServiceDeps['areFriends']>().mockResolvedValue(true),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

function shareWithMessage(deps: PhotosServiceDeps, message: unknown): Promise<PhotoRecord> {
  return createPhotosService(deps).shareFromLibrary({
    senderId: SENDER_ID,
    photoId: ORIGINAL.id,
    friendId: FRIEND_ID,
    message,
  })
}

function sendFileWithMessage(deps: PhotosServiceDeps, message: unknown): Promise<PhotoRecord> {
  return createPhotosService(deps).shareFromDevice({
    senderId: SENDER_ID,
    file: PNG_FILE,
    friendId: FRIEND_ID,
    message,
  })
}

describe('the message of a shared photo', () => {
  it('goes with the copy, trimmed, instead of the message the original came with', async () => {
    const deps = makeDeps()

    await shareWithMessage(deps, '  Joyeux anniversaire !  ')

    expect(deps.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: FRIEND_ID, message: 'Joyeux anniversaire !' }),
    )
  })

  it.each([undefined, null, '', '   '])('leaves the message out for %j', async (message) => {
    const deps = makeDeps()

    await shareWithMessage(deps, message)

    expect(deps.repository.create.mock.calls[0][0].message).toBeUndefined()
  })

  it('accepts a message of exactly the maximum length', async () => {
    const deps = makeDeps()
    const longestMessage = 'a'.repeat(MAX_MESSAGE_LENGTH)

    await shareWithMessage(deps, longestMessage)

    expect(deps.repository.create.mock.calls[0][0].message).toBe(longestMessage)
  })

  it('refuses a message one character too long, before asking who is friends', async () => {
    const deps = makeDeps()

    await expect(shareWithMessage(deps, 'a'.repeat(MAX_MESSAGE_LENGTH + 1))).rejects.toMatchObject({
      code: 'MESSAGE_INVALID',
    })
    expect(deps.areFriends).not.toHaveBeenCalled()
    expect(deps.repository.create).not.toHaveBeenCalled()
  })

  it.each(NOT_TEXT_MESSAGES)('refuses a message that is not text (%j)', async (message) => {
    const deps = makeDeps()

    await expect(shareWithMessage(deps, message)).rejects.toMatchObject({
      code: 'MESSAGE_INVALID',
    })
  })

  it('counts the length after trimming the spaces around it', async () => {
    const deps = makeDeps()
    const paddedMessage = ` ${'a'.repeat(MAX_MESSAGE_LENGTH)} `

    await shareWithMessage(deps, paddedMessage)

    expect(deps.repository.create.mock.calls[0][0].message).toBe('a'.repeat(MAX_MESSAGE_LENGTH))
  })

  it('goes with a file sent from the device too', async () => {
    const deps = makeDeps()

    await sendFileWithMessage(deps, 'Bisous de Lille')

    expect(deps.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: FRIEND_ID, message: 'Bisous de Lille' }),
    )
  })

  it('refuses a too long message from the device before converting or uploading', async () => {
    const deps = makeDeps()

    await expect(
      sendFileWithMessage(deps, 'a'.repeat(MAX_MESSAGE_LENGTH + 1)),
    ).rejects.toMatchObject({ code: 'MESSAGE_INVALID' })
    expect(deps.toFrameJpeg).not.toHaveBeenCalled()
    expect(deps.uploadImage).not.toHaveBeenCalled()
  })

  it('logs whether there was a message, never its text', async () => {
    const deps = makeDeps()

    await shareWithMessage(deps, 'Joyeux anniversaire !')

    expect(deps.logger.info).toHaveBeenCalledWith(
      'photo.shared',
      expect.objectContaining({ hasMessage: true }),
    )
    expect(JSON.stringify(deps.logger.info.mock.calls)).not.toContain('anniversaire')
  })
})
