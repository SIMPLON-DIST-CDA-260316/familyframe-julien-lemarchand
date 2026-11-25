import { EllipsisIcon, RadioIcon, SendIcon, Trash2Icon } from 'lucide-react'
import { type JSX, type ReactNode, type RefObject, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useCollections } from '@/collections/CollectionsContext.ts'
import type { Collection } from '@/collections/collection.ts'
import { CollectionNameDialog } from '@/components/collections/CollectionNameDialog.tsx'
import { CollectionsSubmenu } from '@/components/collections/CollectionsSubmenu.tsx'
import { DeletePhotoDialog } from '@/components/frame/DeletePhotoDialog.tsx'
import { ShareSheet } from '@/components/sharing/ShareSheet.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx'
import { useStartRadio } from '@/hooks/useStartRadio.ts'
import type { Photo } from '@/photo.ts'

type PhotoActionsMenuProps = {
  photo: Photo
  label: string
  className?: string
  // Items above "Supprimer": the slideshow adds its speed.
  children?: ReactNode
}

// The photo picked when a dialog opened: the slideshow may move on while it stays open.
type MenuDialog = { kind: 'share' | 'delete' | 'createCollection'; photo: Photo } | null

type MenuDialogsProps = {
  dialog: MenuDialog
  onClose: () => void
  triggerRef: RefObject<HTMLButtonElement | null>
}

// The menu is closed by then: a toast tells where the photo went.
function useAddToNewCollection(photo: Photo | undefined): (collection: Collection) => void {
  const { addPhoto } = useCollections()
  return async ({ id, name }) => {
    if (!photo) return
    const result = await addPhoto(id, photo.id)
    if (result.isSuccess) toast.success(`Photo ajoutée à « ${name} ».`)
    else toast.error(result.message)
  }
}

// Radix would focus the menu item that opened the dialog, gone by now: focus would fall to body.
function focusOnClose(triggerRef: RefObject<HTMLButtonElement | null>): (event: Event) => void {
  return (event) => {
    event.preventDefault()
    triggerRef.current?.focus()
  }
}

// Outside the menu content: closing the menu must not unmount the dialogs.
// `dark`: the sheet and dialogs portal to body, outside the frame's dark <main>.
function MenuDialogs({ dialog, onClose, triggerRef }: MenuDialogsProps): JSX.Element {
  const addToNewCollection = useAddToNewCollection(dialog?.photo)
  const focusTrigger = focusOnClose(triggerRef)
  const photoFor = (kind: NonNullable<MenuDialog>['kind']) =>
    dialog?.kind === kind ? dialog.photo : null
  const sharedPhoto = photoFor('share')
  return (
    <>
      <ShareSheet
        target={sharedPhoto ? { kind: 'library', photo: sharedPhoto } : null}
        onClose={onClose}
        onCloseAutoFocus={focusTrigger}
        className="dark"
      />
      <DeletePhotoDialog
        photo={photoFor('delete')}
        onClose={onClose}
        onCloseAutoFocus={focusTrigger}
      />
      <CollectionNameDialog
        target={photoFor('createCollection') ? { kind: 'create' } : null}
        onClose={onClose}
        onSaved={addToNewCollection}
        onCloseAutoFocus={focusTrigger}
        className="dark"
      />
    </>
  )
}

type MenuTriggerProps = Pick<PhotoActionsMenuProps, 'label' | 'className'> & {
  triggerRef: RefObject<HTMLButtonElement | null>
}

function MenuTrigger({ label, className, triggerRef }: MenuTriggerProps): JSX.Element {
  return (
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
  )
}

type MenuItemsProps = {
  photo: Photo
  onOpen: (dialog: MenuDialog) => void
  children?: ReactNode
}

function MenuItems({ photo, onOpen, children }: MenuItemsProps): JSX.Element {
  const startRadio = useStartRadio()
  return (
    // `dark`: the menu portals to body, outside the frame's dark <main>.
    <DropdownMenuContent align="end" className="dark">
      {children}
      <DropdownMenuItem onSelect={() => startRadio(photo.id)}>
        <RadioIcon />
        Lancer la radio
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onOpen({ kind: 'share', photo })}>
        <SendIcon />
        Envoyer à un ami
      </DropdownMenuItem>
      <CollectionsSubmenu
        photoId={photo.id}
        onCreate={() => onOpen({ kind: 'createCollection', photo })}
      />
      <DropdownMenuItem variant="destructive" onSelect={() => onOpen({ kind: 'delete', photo })}>
        <Trash2Icon />
        Supprimer
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}

export function PhotoActionsMenu({
  photo,
  label,
  className,
  children,
}: PhotoActionsMenuProps): JSX.Element {
  const [dialog, setDialog] = useState<MenuDialog>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <DropdownMenu>
        <MenuTrigger label={label} className={className} triggerRef={triggerRef} />
        <MenuItems photo={photo} onOpen={setDialog}>
          {children}
        </MenuItems>
      </DropdownMenu>
      <MenuDialogs dialog={dialog} onClose={() => setDialog(null)} triggerRef={triggerRef} />
    </>
  )
}
