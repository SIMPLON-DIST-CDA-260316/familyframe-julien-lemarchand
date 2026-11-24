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
    // The ellipsis is a sibling of the row button: a button cannot hold a button.
    <li className="relative">
      <button
        type="button"
        onClick={() => onSelect(photo.id)}
        aria-current={isCurrent}
        className="flex w-full items-center gap-4 rounded-xl p-2 pr-14 text-left outline-none hover:bg-white/5 focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
      >
        <img
          className="size-14 shrink-0 rounded-lg object-cover"
          src={photo.thumbnailUrl}
          alt={photoLabel(photo)}
          loading="lazy"
          decoding="async"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <time dateTime={photo.createdAt} className="text-lg tabular-nums">
            {ROW_DATE_FORMAT.format(new Date(photo.createdAt))}
          </time>
          {photo.senderName !== null && (
            <span className="truncate text-sm text-white/70">Envoyée par {photo.senderName}</span>
          )}
        </span>
      </button>
      <PhotoActionsMenu
        photo={photo}
        label={`Actions : ${photoLabel(photo)}`}
        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full text-white/80"
      />
    </li>
  )
}
