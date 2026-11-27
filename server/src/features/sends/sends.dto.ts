import { deliveryUrls } from '../../lib/cloudinary.js'
import type { SentPhoto } from '../../types.js'
import type { SendRecord } from './sends.repository.js'

// As for a photo, cloudinaryId, senderId and recipientIds stay on the server: the client gets
// ready-made URLs, and the recipients' ids with their names to tell two « Mamie » apart.
// The history shows thumbnails and the whole photo, never the phone-sized one: no mediumUrl.
export function toSentPhotoDto(record: SendRecord): SentPhoto {
  const { url, thumbnailUrl } = deliveryUrls(record.cloudinaryId)
  return {
    id: record.id,
    url,
    thumbnailUrl,
    createdAt: record.createdAt.toISOString(),
    message: record.message,
    recipients: record.recipients,
  }
}
