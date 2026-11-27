import { AppError } from '../../errors/app-error.js'
import { destroyUnusedImage } from '../../lib/image-uses.js'
import type { Logger } from '../../lib/logger.js'
import { OBJECT_ID_PATTERN, parseCursor, parseLimit } from '../photos/photos.input.js'
import type { SendRecord, SendsRepository } from './sends.repository.js'

export type SendsServiceDeps = {
  repository: SendsRepository
  deleteImage: (cloudinaryId: string) => Promise<void>
  logger: Logger
}

// cursor and limit straight from the query string: validated here, as for the library.
export type SendPageInput = { senderId: string; cursor: unknown; limit: unknown }

export type SendRecordPage = { records: SendRecord[]; nextCursor: string | null }

export type SendRemoval = { id: string; senderId: string }

export type SendsService = {
  listPage: (input: SendPageInput) => Promise<SendRecordPage>
  // The friends' photos stay: only the sender's history line goes.
  deleteSend: (removal: SendRemoval) => Promise<void>
}

// One record more than the page: if it comes back, there is a next page.
async function listPage(
  { repository }: SendsServiceDeps,
  { senderId, cursor, limit }: SendPageInput,
): Promise<SendRecordPage> {
  const pageSize = parseLimit(limit)
  const beforeId = parseCursor(cursor)
  const records = await repository.findPage({ senderId, beforeId, take: pageSize + 1 })
  if (records.length <= pageSize) {
    return { records, nextCursor: null }
  }
  const pageRecords = records.slice(0, pageSize)
  return { records: pageRecords, nextCursor: pageRecords[pageRecords.length - 1].id }
}

// A malformed id is one more unknown send: Prisma would fail on it, a 500 instead of a 404.
async function deleteSend(deps: SendsServiceDeps, { id, senderId }: SendRemoval): Promise<void> {
  if (!OBJECT_ID_PATTERN.test(id)) {
    throw new AppError('SEND_NOT_FOUND')
  }
  const send = await deps.repository.deleteOwned(id, senderId)
  if (!send) {
    throw new AppError('SEND_NOT_FOUND')
  }
  const { repository, deleteImage, logger } = deps
  const isImageDestroyed = await destroyUnusedImage(
    { countImageUses: repository.countImageUses, deleteImage, logger },
    send.cloudinaryId,
  )
  logger.info('send.deleted', { sendId: send.id, userId: senderId, isImageDestroyed })
}

export function createSendsService(deps: SendsServiceDeps): SendsService {
  return {
    listPage: (input) => listPage(deps, input),
    deleteSend: (removal) => deleteSend(deps, removal),
  }
}
