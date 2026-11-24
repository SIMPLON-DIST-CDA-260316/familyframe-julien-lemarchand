import { EllipsisIcon, SendIcon, Trash2Icon } from 'lucide-react'
import { type JSX, type ReactNode, useRef, useState } from 'react'
import { COARSE_POINTER_TARGET_CLASSES } from '@/components/frame/controlClasses.ts'
import { DeletePhotoDialog } from '@/components/frame/DeletePhotoDialog.tsx'
import { ShareSheet } from '@/components/sharing/ShareSheet.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx'
import { cn } from '@/lib/utils.ts'
import type { Photo } from '@/photo.ts'

type PhotoActionsMenuProps = {
  photo: Photo
  label: string
  className?: string
  // Items above "Supprimer": the slideshow adds its speed.
  children?: ReactNode
}

export function PhotoActionsMenu({
  photo,
  label,
  className,
  children,
}: PhotoActionsMenuProps): JSX.Element {
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null)
  const [photoToShare, setPhotoToShare] = useState<Photo | null>(null)
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
            className={cn(COARSE_POINTER_TARGET_CLASSES, className)}
          >
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        {/* `dark`: the menu portals to body, outside the frame's dark <main>. */}
        <DropdownMenuContent align="end" className="dark">
          {children}
          <DropdownMenuItem onSelect={() => setPhotoToShare(photo)}>
            <SendIcon />
            Envoyer à un ami
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setPhotoToDelete(photo)}>
            <Trash2Icon />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Outside the menu content: closing the menu must not unmount the dialogs. */}
      {/* `dark`: the sheet portals to body, outside the frame's dark <main>. */}
      <ShareSheet
        target={photoToShare ? { kind: 'library', photo: photoToShare } : null}
        onClose={() => setPhotoToShare(null)}
        onCloseAutoFocus={focusTrigger}
        className="dark"
      />
      <DeletePhotoDialog
        photo={photoToDelete}
        onClose={() => setPhotoToDelete(null)}
        onCloseAutoFocus={focusTrigger}
      />
    </>
  )
}
