import { EllipsisIcon, MonitorIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { type JSX, type RefObject, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { Collection } from '@/collections/collection.ts'
import { CollectionNameDialog } from '@/components/collections/CollectionNameDialog.tsx'
import { DeleteCollectionDialog } from '@/components/collections/DeleteCollectionDialog.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx'
import { type FrameSettings, readFrameSettings, writeFrameSettings } from '@/frameSettings.ts'
import { enterFullscreen } from '@/fullscreen.ts'
import { LIBRARY_BELOW_STATE } from '@/viewerHistory.ts'

type RowDialog = 'rename' | 'delete' | null

const UNSAVED_SOURCE_MESSAGE =
  'Cet appareil ne peut pas retenir ce choix. Choisissez la collection depuis le menu « … » du cadre.'

type CollectionRowProps = { collection: Collection; onDeleted: () => void }

type CollectionMenuProps = {
  name: string
  onSelect: (dialog: RowDialog) => void
  onPlay: () => void
  triggerRef: RefObject<HTMLButtonElement | null>
}

type RowDialogsProps = {
  collection: Collection
  onDeleted: () => void
  dialog: RowDialog
  onClose: () => void
  triggerRef: RefObject<HTMLButtonElement | null>
}

function photoCountLabel(count: number): string {
  if (count === 0) return 'Aucune photo'
  return count === 1 ? '1 photo' : `${count} photos`
}

// The frame reads its settings as it opens: the choice is stored first. A device that cannot store
// it would open the frame on its old photos, so the frame stays closed. Full screen comes from the
// click itself, browsers grant it only during a gesture.
function usePlayOnFrame(collectionId: string): () => void {
  const navigate = useNavigate()
  return () => {
    const settings: FrameSettings = {
      ...readFrameSettings(),
      source: { kind: 'collection', collectionId },
    }
    if (!writeFrameSettings(settings)) {
      toast.error(UNSAVED_SOURCE_MESSAGE)
      return
    }
    enterFullscreen()
    navigate('/frame', { state: LIBRARY_BELOW_STATE })
  }
}

function CollectionMenu({ name, onSelect, onPlay, triggerRef }: CollectionMenuProps): JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ref={triggerRef} variant="ghost" size="icon" aria-label={`Actions pour ${name}`}>
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onPlay}>
          <MonitorIcon />
          Lire sur le cadre
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelect('rename')}>
          <PencilIcon />
          Renommer
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => onSelect('delete')}>
          <Trash2Icon />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Outside the menu: closing the menu must not unmount the dialogs.
function RowDialogs({ collection, dialog, onClose, ...props }: RowDialogsProps): JSX.Element {
  // Radix would focus the menu item that opened the dialog, gone by now: focus would fall to body.
  function focusTrigger(event: Event): void {
    event.preventDefault()
    props.triggerRef.current?.focus()
  }
  return (
    <>
      <CollectionNameDialog
        target={dialog === 'rename' ? { kind: 'rename', collection } : null}
        onClose={onClose}
        onCloseAutoFocus={focusTrigger}
      />
      <DeleteCollectionDialog
        collection={dialog === 'delete' ? collection : null}
        onClose={onClose}
        onCloseAutoFocus={focusTrigger}
        onDeleted={props.onDeleted}
      />
    </>
  )
}

export function CollectionRow({ collection, onDeleted }: CollectionRowProps): JSX.Element {
  const [dialog, setDialog] = useState<RowDialog>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const playOnFrame = usePlayOnFrame(collection.id)

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-col">
        <span className="font-medium wrap-anywhere">{collection.name}</span>
        <span className="text-sm text-muted-foreground">
          {photoCountLabel(collection.photoIds.length)}
        </span>
      </div>
      <CollectionMenu
        name={collection.name}
        onSelect={setDialog}
        onPlay={playOnFrame}
        triggerRef={triggerRef}
      />
      <RowDialogs
        collection={collection}
        onDeleted={onDeleted}
        dialog={dialog}
        onClose={() => setDialog(null)}
        triggerRef={triggerRef}
      />
    </li>
  )
}
