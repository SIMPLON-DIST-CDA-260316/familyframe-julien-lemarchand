import type { Send } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import { DEFAULT_PAGE_SIZE } from '../photos/photos.input.js'
import type { SendRecord, SendsRepository } from './sends.repository.js'
import { createSendsService } from './sends.service.js'

const SENDER_ID = '6b044f9d56a44767c7079b01'
const FRIEND_ID = '6b044f9d56a44767c7079b02'
const SEND: Send = {
  id: '6b044f9d56a44767c7079c05',
  senderId: SENDER_ID,
  recipientIds: [FRIEND_ID],
  url: 'https://res.cloudinary.com/demo/photo.jpg',
  cloudinaryId: 'familyframe/abc',
  message: null,
  createdAt: new Date('2026-11-24T10:00:00Z'),
}

// ids counting down from c09: newest first, like the repository returns them.
function sendsFrom(count: number): SendRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    ...SEND,
    id: `6b044f9d56a44767c7079c${(9 - index).toString().padStart(2, '0')}`,
    recipients: [{ id: FRIEND_ID, displayName: 'Mamie' }],
  }))
}

// Every dependency succeeds by default; each test breaks only the one it is about.
function makeDeps() {
  return {
    repository: {
      create: vi.fn<SendsRepository['create']>(),
      findPage: vi.fn<SendsRepository['findPage']>().mockResolvedValue([]),
      deleteOwned: vi.fn<SendsRepository['deleteOwned']>().mockResolvedValue(SEND),
      countImageUses: vi.fn<SendsRepository['countImageUses']>().mockResolvedValue(0),
    },
    deleteImage: vi.fn<(cloudinaryId: string) => Promise<void>>().mockResolvedValue(undefined),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

describe('listPage', () => {
  it("reads one more than the page, the sender's own sends only", async () => {
    const deps = makeDeps()

    await createSendsService(deps).listPage({ senderId: SENDER_ID, cursor: undefined, limit: '2' })

    expect(deps.repository.findPage).toHaveBeenCalledWith({
      senderId: SENDER_ID,
      beforeId: undefined,
      take: 3,
    })
  })

  it('gives the last id as the cursor when there is a next page', async () => {
    const deps = makeDeps()
    deps.repository.findPage.mockResolvedValue(sendsFrom(3))

    const page = await createSendsService(deps).listPage({
      senderId: SENDER_ID,
      cursor: SEND.id,
      limit: '2',
    })

    expect(page.records).toHaveLength(2)
    expect(page.nextCursor).toBe(page.records[1].id)
    expect(deps.repository.findPage).toHaveBeenCalledWith(
      expect.objectContaining({ beforeId: SEND.id }),
    )
  })

  it('ends the history with a null cursor, and pages by the default size', async () => {
    const deps = makeDeps()
    deps.repository.findPage.mockResolvedValue(sendsFrom(1))

    const page = await createSendsService(deps).listPage({
      senderId: SENDER_ID,
      cursor: undefined,
      limit: undefined,
    })

    expect(page.nextCursor).toBeNull()
    expect(deps.repository.findPage).toHaveBeenCalledWith(
      expect.objectContaining({ take: DEFAULT_PAGE_SIZE + 1 }),
    )
  })

  it.each([
    { cursor: 'pas-un-id', limit: undefined },
    { cursor: undefined, limit: '0' },
    { cursor: undefined, limit: ['5', '6'] },
  ])('refuses the query %j before reading anything', async ({ cursor, limit }) => {
    const deps = makeDeps()

    await expect(
      createSendsService(deps).listPage({ senderId: SENDER_ID, cursor, limit }),
    ).rejects.toMatchObject({ code: 'QUERY_INVALID' })
    expect(deps.repository.findPage).not.toHaveBeenCalled()
  })
})

describe('deleteSend', () => {
  it('removes the line and destroys an image nothing uses any more', async () => {
    const deps = makeDeps()

    await createSendsService(deps).deleteSend({ id: SEND.id, senderId: SENDER_ID })

    expect(deps.repository.deleteOwned).toHaveBeenCalledWith(SEND.id, SENDER_ID)
    expect(deps.deleteImage).toHaveBeenCalledWith(SEND.cloudinaryId)
    expect(deps.logger.info).toHaveBeenCalledWith('send.deleted', {
      sendId: SEND.id,
      userId: SENDER_ID,
      isImageDestroyed: true,
    })
  })

  it("keeps the image while a friend's photo still uses it", async () => {
    const deps = makeDeps()
    deps.repository.countImageUses.mockResolvedValue(1)

    await createSendsService(deps).deleteSend({ id: SEND.id, senderId: SENDER_ID })

    expect(deps.deleteImage).not.toHaveBeenCalled()
    expect(deps.logger.info).toHaveBeenCalledWith(
      'send.deleted',
      expect.objectContaining({ isImageDestroyed: false }),
    )
  })

  it("answers SEND_NOT_FOUND for an unknown, removed or someone else's send", async () => {
    const deps = makeDeps()
    deps.repository.deleteOwned.mockResolvedValue(null)

    await expect(
      createSendsService(deps).deleteSend({ id: SEND.id, senderId: SENDER_ID }),
    ).rejects.toMatchObject({ code: 'SEND_NOT_FOUND' })
    expect(deps.deleteImage).not.toHaveBeenCalled()
  })

  it('answers SEND_NOT_FOUND for an id that is not an ObjectId, without any query', async () => {
    const deps = makeDeps()

    await expect(
      createSendsService(deps).deleteSend({ id: 'pas-un-id', senderId: SENDER_ID }),
    ).rejects.toMatchObject({ code: 'SEND_NOT_FOUND' })
    expect(deps.repository.deleteOwned).not.toHaveBeenCalled()
  })

  it('still answers when Cloudinary fails: the line is gone, the image is logged as orphaned', async () => {
    const deps = makeDeps()
    deps.deleteImage.mockRejectedValue(new Error('Cloudinary down'))

    await createSendsService(deps).deleteSend({ id: SEND.id, senderId: SENDER_ID })

    expect(deps.logger.error).toHaveBeenCalledWith(
      'photo.orphaned',
      expect.objectContaining({ cloudinaryId: SEND.cloudinaryId }),
    )
  })
})
