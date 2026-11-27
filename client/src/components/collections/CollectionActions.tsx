import { MonitorIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { type JSX, type RefObject, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { Collection } from '@/collections/collection.ts'
import { MoreButton } from '@/components/actions/MoreButton.tsx'
import { CollectionNameDialog } from '@/components/collections/CollectionNameDialog.tsx'
import { DeleteCollectionDialog } from '@/components/collections/DeleteCollectionDialog.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx'
import { type FrameSettings, readFrameSettings, writeFrameSettings } from '@/frameSettings.ts'
import { enterFullscreen } from '@/fullscreen.ts'
import { shownButton } from '@/lib/shownButton.ts'
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
}

type CollectionActionsProps = {
  collection: Collection
  // Where focus goes once the collection is deleted: the shown one takes it.
  fallbackRefs: RefObject<HTMLElement | null>[]
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
        <MoreButton ref={triggerRef} surface="page" aria-label={`Actions pour ${name}`} />
      </DropdownMenuTrigger>
      {/* Start: the button follows the name, at the left of the page. w-max: the content would
          take the button's width and wrap its items. */}
      <DropdownMenuContent align="start" className="w-max">
        <CollectionMenuItems onSelect={onSelect} onPlay={onPlay} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Outside the menu: closing the menu must not unmount the dialogs.
function BarDialogs({ collection, dialog, onClose, ...props }: BarDialogsProps): JSX.Element {
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

// Replace: back must not return to a collection that no longer exists. The dialog closed at the
// click, before the server agreed, and gave focus back to the menu button that leaves with the
// collection now: « Toutes les photos » or the phone's title button stays on the page.
function useLeaveDeletedCollection(fallbackRefs: RefObject<HTMLElement | null>[]): () => void {
  const navigate = useNavigate()
  return () => {
    navigate('/', { replace: true })
    shownButton(fallbackRefs)?.focus()
  }
}

// The « … » beside the name: the menu and the dialogs it opens.
export function CollectionActions({
  collection,
  fallbackRefs,
}: CollectionActionsProps): JSX.Element {
  const [dialog, setDialog] = useState<BarDialog>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const playOnFrame = usePlayOnFrame(collection.id)
  const leaveDeletedCollection = useLeaveDeletedCollection(fallbackRefs)

  return (
    <>
      <CollectionMenu
        name={collection.name}
        onSelect={setDialog}
        onPlay={playOnFrame}
        triggerRef={triggerRef}
      />
      <BarDialogs
        collection={collection}
        onDeleted={leaveDeletedCollection}
        dialog={dialog}
        onClose={() => setDialog(null)}
        triggerRef={triggerRef}
      />
    </>
  )
}
