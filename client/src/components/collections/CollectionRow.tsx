import { EllipsisIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { type JSX, type RefObject, useRef, useState } from 'react'
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

type RowDialog = 'rename' | 'delete' | null

type CollectionRowProps = { collection: Collection; onDeleted: () => void }

type CollectionMenuProps = {
  name: string
  onSelect: (dialog: RowDialog) => void
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

function CollectionMenu({ name, onSelect, triggerRef }: CollectionMenuProps): JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ref={triggerRef} variant="ghost" size="icon" aria-label={`Actions pour ${name}`}>
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-col">
        <span className="font-medium wrap-anywhere">{collection.name}</span>
        <span className="text-sm text-muted-foreground">
          {photoCountLabel(collection.photoIds.length)}
        </span>
      </div>
      <CollectionMenu name={collection.name} onSelect={setDialog} triggerRef={triggerRef} />
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
