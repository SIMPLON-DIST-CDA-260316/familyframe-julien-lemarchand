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

type BarDialog = 'rename' | 'delete' | null

const UNSAVED_SOURCE_MESSAGE =
  'Cet appareil ne peut pas retenir ce choix. Choisissez la collection depuis le menu « … » du cadre.'

type CollectionMenuItemsProps = {
  onSelect: (dialog: BarDialog) => void
  onPlay: () => void
}

type CollectionMenuProps = CollectionMenuItemsProps & {
  name: string
  triggerRef: RefObject<HTMLButtonElement | null>
}

type BarDialogsProps = {
  collection: Collection
  onDeleted: () => void
  dialog: BarDialog
  onClose: () => void
  triggerRef: RefObject<HTMLButtonElement | null>
  fallbackRef: RefObject<HTMLElement | null>
}

type SelectedCollectionBarProps = {
  collection: Collection
  fallbackRef: RefObject<HTMLElement | null>
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

function CollectionMenuItems({ onSelect, onPlay }: CollectionMenuItemsProps): JSX.Element {
  return (
    <>
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
    </>
  )
}

function CollectionMenu({ name, onSelect, onPlay, triggerRef }: CollectionMenuProps): JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon"
          className="pointer-coarse:size-11"
          aria-label={`Actions pour ${name}`}
        >
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      {/* Start: the button follows the name, at the left of the page. */}
      <DropdownMenuContent align="start">
        <CollectionMenuItems onSelect={onSelect} onPlay={onPlay} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Outside the menu: closing the menu must not unmount the dialogs.
function BarDialogs({ collection, dialog, onClose, ...props }: BarDialogsProps): JSX.Element {
  // Radix would focus the menu item that opened the dialog, gone by now: focus would fall to body.
  // After a deletion the bar is gone too, the trigger with it: the fallback outlives it. Here, not in
  // onDeleted: the dialog's focus trap still holds then and would pull focus back.
  function focusTrigger(event: Event): void {
    event.preventDefault()
    ;(props.triggerRef.current ?? props.fallbackRef.current)?.focus()
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

// Replace on deletion: back must not return to a collection that no longer exists.
export function SelectedCollectionBar({
  collection,
  fallbackRef,
}: SelectedCollectionBarProps): JSX.Element {
  const [dialog, setDialog] = useState<BarDialog>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const playOnFrame = usePlayOnFrame(collection.id)
  const navigate = useNavigate()

  return (
    <div className="flex min-w-0 items-center gap-2">
      <h2 className="text-lg font-medium wrap-anywhere">{collection.name}</h2>
      <CollectionMenu
        name={collection.name}
        onSelect={setDialog}
        onPlay={playOnFrame}
        triggerRef={triggerRef}
      />
      <BarDialogs
        collection={collection}
        onDeleted={() => navigate('/', { replace: true })}
        dialog={dialog}
        onClose={() => setDialog(null)}
        triggerRef={triggerRef}
        fallbackRef={fallbackRef}
      />
    </div>
  )
}
