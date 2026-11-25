import { firstName, joinNames } from '@/components/sharing/shareTexts.ts'
import type { SendRecipient } from '@/sentPhoto.ts'

// Every friend deleted their account since: the line stays, without a name to show.
const NO_RECIPIENT_LEFT = 'À un compte supprimé'

// « À Mamie et Tata »: first names, as in the toast that confirmed the send.
export function recipientsLine(recipients: SendRecipient[]): string {
  if (recipients.length === 0) return NO_RECIPIENT_LEFT
  return `À ${joinNames(recipients.map(({ displayName }) => firstName(displayName)))}`
}

// The alternative text says who it went to: the history shows the photo, not a caption.
export function sentThumbnailAlt(recipients: SendRecipient[]): string {
  return `Photo envoyée ${recipientsLine(recipients).replace(/^À/, 'à')}`
}
