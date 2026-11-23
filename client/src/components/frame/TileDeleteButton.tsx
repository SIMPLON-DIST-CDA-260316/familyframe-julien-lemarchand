import { Trash2Icon } from 'lucide-react'
import type { JSX } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { deletePhoto } from '@/deletePhoto.ts'
import type { Photo } from '@/photo.ts'

type TileDeleteButtonProps = {
  photo: Photo
}

// Reveals on the parent li's `group/tile`, see ContactSheetTile.
export function TileDeleteButton({ photo }: TileDeleteButtonProps): JSX.Element {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Supprimer la photo envoyée par ${photo.uploaderName}`}
      title="Supprimer"
      onClick={() => deletePhoto(photo)}
      // Hidden until hover or focus, but always reachable by Tab.
      className="absolute top-2 right-2 rounded-full bg-black/55 text-white/80 opacity-0 backdrop-blur-sm hover:bg-red-500/70 hover:text-white focus-visible:opacity-100 group-focus-within/tile:opacity-100 group-hover/tile:opacity-100 dark:hover:bg-red-500/70"
    >
      <Trash2Icon />
    </Button>
  )
}
