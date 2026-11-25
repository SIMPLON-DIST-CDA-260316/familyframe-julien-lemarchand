import { deliveryUrls } from '../../lib/cloudinary.js'
import type { SentPhoto } from '../../types.js'
import type { SendRecord } from './sends.repository.js'

// As for a photo, cloudinaryId, senderId and recipientIds stay on the server: the client gets
// ready-made URLs, and the recipients' ids with their names to tell two « Mamie » apart.
export function toSentPhotoDto(record: SendRecord): SentPhoto {
  return {
    id: record.id,
    ...deliveryUrls(record.cloudinaryId),
    createdAt: record.createdAt.toISOString(),
    message: record.message,
    recipients: record.recipients,
  }
}
