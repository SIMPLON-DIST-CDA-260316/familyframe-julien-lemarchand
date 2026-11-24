import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { UploadedFile } from '../photos/photos.input.js'
import type { AccountRepository, UserRecord } from './account.repository.js'
import { type AccountServiceDeps, createAccountService } from './account.service.js'

const USER_ID = '6b044f9d56a44767c7079b02'
const PREVIOUS_ID = 'familyframe/avatars/previous'
const NEW_ID = 'familyframe/avatars/new'
const FILE: UploadedFile = { buffer: Buffer.from('raw upload'), mimetype: 'image/png' }
const USER: UserRecord = {
  id: USER_ID,
  email: 'membre@familyframe.test',
  displayName: 'Membre',
  passwordHash: '$argon2id$stored-hash',
  role: 'member',
  avatarCloudinaryId: PREVIOUS_ID,
  createdAt: new Date('2026-11-01T10:00:00Z'),
}

// Every step succeeds by default, on an account that already has a profile photo: the file
// converts, uploads, the account is saved, the previous image is destroyed.
function makeDeps() {
  return {
    repository: {
      findUserById: vi.fn<AccountRepository['findUserById']>().mockResolvedValue(USER),
      updateDisplayName: vi.fn<AccountRepository['updateDisplayName']>(),
      updatePasswordHash: vi.fn<AccountRepository['updatePasswordHash']>(),
      deleteOtherSessions: vi.fn<AccountRepository['deleteOtherSessions']>(),
      updateAvatar: vi
        .fn<AccountRepository['updateAvatar']>()
        .mockImplementation(async (_id, avatarCloudinaryId) => ({ ...USER, avatarCloudinaryId })),
    },
    hashPassword: vi.fn<AccountServiceDeps['hashPassword']>(),
    verifyPassword: vi.fn<AccountServiceDeps['verifyPassword']>(),
    toAvatarJpeg: vi
      .fn<AccountServiceDeps['toAvatarJpeg']>()
      .mockResolvedValue(Buffer.from('avatar jpeg')),
    uploadAvatar: vi
      .fn<AccountServiceDeps['uploadAvatar']>()
      .mockResolvedValue({ url: 'https://cdn.test/new', cloudinaryId: NEW_ID }),
    deleteImage: vi.fn<AccountServiceDeps['deleteImage']>().mockResolvedValue(),
    avatarUrl: vi.fn<AccountServiceDeps['avatarUrl']>(
      (cloudinaryId) => `https://cdn.test/${cloudinaryId}`,
    ),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

type Deps = ReturnType<typeof makeDeps>

function changeAvatar(deps: Deps, file: UploadedFile | undefined = FILE): Promise<unknown> {
  return createAccountService(deps).changeAvatar({ userId: USER_ID, file })
}

describe('changeAvatar', () => {
  it('uploads the converted JPEG, saves its id and returns the new avatar URL', async () => {
    const deps = makeDeps()

    const user = await changeAvatar(deps)

    expect(deps.toAvatarJpeg).toHaveBeenCalledWith(FILE.buffer)
    expect(deps.uploadAvatar).toHaveBeenCalledWith(Buffer.from('avatar jpeg'))
    expect(deps.repository.updateAvatar).toHaveBeenCalledWith(USER_ID, NEW_ID)
    expect(user).toMatchObject({ id: USER_ID, avatarUrl: `https://cdn.test/${NEW_ID}` })
  })

  it('destroys the previous image after saving the new one', async () => {
    const deps = makeDeps()

    await changeAvatar(deps)

    expect(deps.deleteImage).toHaveBeenCalledWith(PREVIOUS_ID)
    const savedAt = deps.repository.updateAvatar.mock.invocationCallOrder[0]
    expect(deps.deleteImage.mock.invocationCallOrder[0]).toBeGreaterThan(savedAt)
    expect(deps.logger.info).toHaveBeenCalledWith('account.avatar_changed', {
      userId: USER_ID,
      cloudinaryId: NEW_ID,
      previousCloudinaryId: PREVIOUS_ID,
      isPreviousDestroyed: true,
    })
  })

  it('destroys nothing for a first profile photo', async () => {
    const deps = makeDeps()
    deps.repository.findUserById.mockResolvedValue({ ...USER, avatarCloudinaryId: null })

    await changeAvatar(deps)

    expect(deps.deleteImage).not.toHaveBeenCalled()
    expect(deps.logger.info).toHaveBeenCalledWith(
      'account.avatar_changed',
      expect.objectContaining({ previousCloudinaryId: null, isPreviousDestroyed: false }),
    )
  })

  it('still succeeds when the previous image cannot be destroyed, and logs it', async () => {
    const deps = makeDeps()
    deps.deleteImage.mockRejectedValue(new Error('Cloudinary down'))

    await expect(changeAvatar(deps)).resolves.toMatchObject({
      avatarUrl: `https://cdn.test/${NEW_ID}`,
    })
    expect(deps.logger.error).toHaveBeenCalledWith('account.avatar_orphaned', {
      cloudinaryId: PREVIOUS_ID,
      error: expect.any(Error),
    })
  })

  it('logs the new image as orphaned when the account cannot be saved', async () => {
    const deps = makeDeps()
    deps.repository.updateAvatar.mockRejectedValue(new Error('database down'))

    await expect(changeAvatar(deps)).rejects.toThrow('database down')
    expect(deps.logger.error).toHaveBeenCalledWith('account.avatar_orphaned', {
      cloudinaryId: NEW_ID,
      error: expect.any(Error),
    })
    expect(deps.deleteImage).not.toHaveBeenCalled()
  })

  it('refuses a request without a file with PHOTO_MISSING', async () => {
    const deps = makeDeps()

    // Not through changeAvatar(deps, undefined): undefined would pick its default FILE.
    const change = createAccountService(deps).changeAvatar({ userId: USER_ID, file: undefined })

    await expect(change).rejects.toMatchObject({ code: 'PHOTO_MISSING' })
    expect(deps.uploadAvatar).not.toHaveBeenCalled()
  })

  it('refuses a GIF with FORMAT_UNSUPPORTED', async () => {
    const deps = makeDeps()

    await expect(changeAvatar(deps, { ...FILE, mimetype: 'image/gif' })).rejects.toMatchObject({
      code: 'FORMAT_UNSUPPORTED',
    })
  })

  it('refuses an unreadable image with IMAGE_UNREADABLE, before any upload', async () => {
    const deps = makeDeps()
    deps.toAvatarJpeg.mockRejectedValue(new Error('unsupported image format'))

    await expect(changeAvatar(deps)).rejects.toMatchObject({ code: 'IMAGE_UNREADABLE' })
    expect(deps.uploadAvatar).not.toHaveBeenCalled()
    expect(deps.logger.warn).toHaveBeenCalledWith('account.avatar_unreadable', {
      error: expect.any(Error),
    })
  })
})

describe('removeAvatar', () => {
  it('clears the id, destroys the image and returns a user without avatar', async () => {
    const deps = makeDeps()

    const user = await createAccountService(deps).removeAvatar(USER_ID)

    expect(deps.repository.updateAvatar).toHaveBeenCalledWith(USER_ID, null)
    expect(deps.deleteImage).toHaveBeenCalledWith(PREVIOUS_ID)
    expect(user.avatarUrl).toBeNull()
    expect(deps.logger.info).toHaveBeenCalledWith('account.avatar_removed', {
      userId: USER_ID,
      cloudinaryId: PREVIOUS_ID,
      isImageDestroyed: true,
    })
  })

  it('answers the same account, without writing, when there is no photo', async () => {
    const deps = makeDeps()
    deps.repository.findUserById.mockResolvedValue({ ...USER, avatarCloudinaryId: null })

    const user = await createAccountService(deps).removeAvatar(USER_ID)

    expect(user.avatarUrl).toBeNull()
    expect(deps.repository.updateAvatar).not.toHaveBeenCalled()
    expect(deps.deleteImage).not.toHaveBeenCalled()
  })

  it('still succeeds when the image cannot be destroyed', async () => {
    const deps = makeDeps()
    deps.deleteImage.mockRejectedValue(new Error('Cloudinary down'))

    await expect(createAccountService(deps).removeAvatar(USER_ID)).resolves.toMatchObject({
      avatarUrl: null,
    })
    expect(deps.logger.info).toHaveBeenCalledWith(
      'account.avatar_removed',
      expect.objectContaining({ isImageDestroyed: false }),
    )
  })
})
