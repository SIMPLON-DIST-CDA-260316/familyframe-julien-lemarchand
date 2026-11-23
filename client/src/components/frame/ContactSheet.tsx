import type { JSX } from 'react'
import { ContactSheetTile } from '@/components/frame/ContactSheetTile.tsx'
import type { Photo } from '@/photo.ts'

type ContactSheetProps = {
  photos: Photo[]
  currentId: string
  onSelect: (id: string) => void
}

export function ContactSheet({ photos, currentId, onSelect }: ContactSheetProps): JSX.Element {
  return (
    // pt-24 keeps the first row clear of the controls pill.
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4 p-8 pt-24">
      {photos.map((photo) => (
        <ContactSheetTile
          key={photo.id}
          photo={photo}
          isCurrent={photo.id === currentId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}
