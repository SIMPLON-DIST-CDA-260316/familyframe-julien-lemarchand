import type { JSX } from 'react'
import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
import type { Photo } from '@/photo.ts'
import { photoLabel } from '@/photoLabel.ts'

// In a list, photos of the same day are told apart by their time.
const ROW_DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

type PhotoListRowProps = {
  photo: Photo
  isCurrent: boolean
  onSelect: (id: string) => void
}

export function PhotoListRow({ photo, isCurrent, onSelect }: PhotoListRowProps): JSX.Element {
  return (
    // The ellipsis is a sibling of the row button: a button cannot hold a button. No side padding:
    // the thumbnail and the ellipsis sit on the header's edges; pr-12 keeps the text off the ellipsis.
    <li className="relative">
      <button
        type="button"
        onClick={() => onSelect(photo.id)}
        aria-current={isCurrent}
        // The viewer focuses this row when it closes on this photo.
        data-photo-id={photo.id}
        className="flex w-full items-center gap-3 rounded-xl py-2 pr-12 text-left outline-none hover:bg-muted sm:gap-4 focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
      >
        <img
          className="size-14 shrink-0 rounded-lg object-cover"
          src={photo.thumbnailUrl}
          alt={photoLabel(photo)}
          loading="lazy"
          decoding="async"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <time dateTime={photo.createdAt} className="truncate text-base tabular-nums sm:text-lg">
            {ROW_DATE_FORMAT.format(new Date(photo.createdAt))}
          </time>
          {photo.senderName !== null && (
            <span className="truncate text-sm text-muted-foreground">
              Envoyée par {photo.senderName}
            </span>
          )}
        </span>
      </button>
      <PhotoActionsMenu
        photo={photo}
        label={`Actions : ${photoLabel(photo)}`}
        theme="app"
        className="absolute top-1/2 right-0 -translate-y-1/2 rounded-full text-muted-foreground"
      />
    </li>
  )
}
