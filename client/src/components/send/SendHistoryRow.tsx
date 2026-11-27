import type { JSX } from 'react'
import { RemoveSendDialog } from '@/components/send/RemoveSendDialog.tsx'
import { recipientsLine, sentThumbnailAlt } from '@/components/send/sendTexts.ts'
import { quotedMessage } from '@/photoLabel.ts'
import { fullSendDate, relativeSendDate } from '@/sendDate.ts'
import type { SentPhoto } from '@/sentPhoto.ts'

type SendHistoryRowProps = {
  send: SentPhoto
  // One clock for the whole list: every row of a render counts from the same moment.
  now: Date
  onRemove: (id: string) => void
}

// The row does not open the photo: the history says what left, the library is for looking. No
// read or kept mark: what a friend does with a photo stays theirs.
export function SendHistoryRow({ send, now, onRemove }: SendHistoryRowProps): JSX.Element {
  const sentAt = new Date(send.createdAt)
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <img
        src={send.thumbnailUrl}
        alt={sentThumbnailAlt(send.recipients)}
        loading="lazy"
        className="size-16 shrink-0 rounded-md bg-muted object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-medium">{recipientsLine(send.recipients)}</span>
          <time
            dateTime={send.createdAt}
            title={fullSendDate(sentAt)}
            className="shrink-0 text-xs text-muted-foreground tabular-nums"
          >
            {relativeSendDate(sentAt, now)}
          </time>
        </div>
        {send.message !== null && (
          <p className="line-clamp-2 text-sm break-words text-muted-foreground">
            {quotedMessage(send.message)}
          </p>
        )}
      </div>
      <RemoveSendDialog onConfirm={() => onRemove(send.id)} />
    </li>
  )
}
