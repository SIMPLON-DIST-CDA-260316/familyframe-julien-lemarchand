import { Trash2Icon } from 'lucide-react'
import type { JSX } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { deletePhoto } from '@/deletePhoto.ts'
import type { Photo } from '@/photo.ts'

type DeletePhotoButtonProps = {
  photo: Photo
}

export function DeletePhotoButton({ photo }: DeletePhotoButtonProps): JSX.Element {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Supprimer la photo"
      title="Supprimer"
      onClick={() => deletePhoto(photo)}
      className="rounded-full text-white/80 hover:bg-red-500/25 hover:text-red-200 dark:hover:bg-red-500/25"
    >
      <Trash2Icon />
    </Button>
  )
}
