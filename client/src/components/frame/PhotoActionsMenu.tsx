import { EllipsisIcon, Trash2Icon } from 'lucide-react'
import { type JSX, useRef, useState } from 'react'
import { DeletePhotoDialog } from '@/components/frame/DeletePhotoDialog.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx'
import type { Photo } from '@/photo.ts'

type PhotoActionsMenuProps = {
  photo: Photo
  label: string
  className?: string
}

export function PhotoActionsMenu({ photo, label, className }: PhotoActionsMenuProps): JSX.Element {
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  function focusTrigger(event: Event): void {
    // Radix would focus the menu item that opened the dialog, gone by now: focus would fall to body.
    event.preventDefault()
    triggerRef.current?.focus()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className={className}
          >
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        {/* `dark`: the menu portals to body, outside the frame's dark <main>. */}
        <DropdownMenuContent align="end" className="dark">
          <DropdownMenuItem variant="destructive" onSelect={() => setPhotoToDelete(photo)}>
            <Trash2Icon />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Outside the menu content: closing the menu must not unmount the dialog. */}
      <DeletePhotoDialog
        photo={photoToDelete}
        onClose={() => setPhotoToDelete(null)}
        onCloseAutoFocus={focusTrigger}
      />
    </>
  )
}
