import type { PrismaClient } from '@prisma/client'
import type { Logger } from './logger.js'

export type ImageUseDeps = {
  countImageUses: (cloudinaryId: string) => Promise<number>
  deleteImage: (cloudinaryId: string) => Promise<void>
  logger: Logger
}

// Shared photos and history lines point to the same image: each one is a use.
export async function countImageUses(prisma: PrismaClient, cloudinaryId: string): Promise<number> {
  const [photoCount, sendCount] = await Promise.all([
    prisma.photo.count({ where: { cloudinaryId } }),
    prisma.send.count({ where: { cloudinaryId } }),
  ])
  return photoCount + sendCount
}

// The image goes with its last use. Counted after the deletion, so the deleted record does not
// count itself. true once Cloudinary destroyed it.
export async function destroyUnusedImage(
  { countImageUses, deleteImage, logger }: ImageUseDeps,
  cloudinaryId: string,
): Promise<boolean> {
  try {
    if ((await countImageUses(cloudinaryId)) > 0) {
      return false
    }
    await deleteImage(cloudinaryId)
    return true
  } catch (error: unknown) {
    // The record is gone either way. Without the count we cannot tell whether something still
    // uses the image, and a Cloudinary failure only leaves an orphan: keep it and log it.
    logger.error('photo.orphaned', { cloudinaryId, error })
    return false
  }
}
