import type { JSX } from 'react'
import { Badge } from '@/components/ui/badge.tsx'

type NewPhotosBadgeProps = {
  count: number
  onSelect: () => void
}

function newPhotosLabel(count: number): string {
  return count === 1 ? '1 nouvelle photo' : `${count} nouvelles photos`
}

export function NewPhotosBadge({ count, onSelect }: NewPhotosBadgeProps): JSX.Element {
  return (
    <Badge asChild className="fixed top-4 left-1/2 -translate-x-1/2 px-3 py-1 text-sm">
      <button type="button" onClick={onSelect}>
        {newPhotosLabel(count)}
      </button>
    </Badge>
  )
}
