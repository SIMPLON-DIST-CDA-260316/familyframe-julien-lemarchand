import { ChevronDownIcon } from 'lucide-react'
import { type JSX, type RefObject, useState } from 'react'
import { CollectionList } from '@/components/collections/CollectionList.tsx'
import { NewCollectionDialog } from '@/components/collections/NewCollectionDialog.tsx'
import { BottomDrawer } from '@/components/panel/BottomDrawer.tsx'
import { SheetTitle } from '@/components/ui/sheet.tsx'

// list: the sheet. create: the name dialog, which replaces the sheet rather than stacking on it.
type OpenPanel = 'list' | 'create' | null

type CollectionsSheetButtonProps = {
  // What the page shows: « Toutes les photos » or a collection's name.
  name: string
  selectedId: string | null
  buttonRef: RefObject<HTMLButtonElement | null>
}

type CollectionsSheetProps = {
  selectedId: string | null
  onCreate: () => void
  onClose: () => void
}

function CollectionsSheet({ selectedId, onCreate, onClose }: CollectionsSheetProps): JSX.Element {
  return (
    <BottomDrawer
      onClose={onClose}
      className="max-h-[85svh] bg-popover pb-[calc(1.5rem_+_env(safe-area-inset-bottom))] text-popover-foreground"
    >
      <SheetTitle className="text-lg">Afficher</SheetTitle>
      <nav aria-label="Collections" className="-mx-2 overflow-y-auto">
        <CollectionList selectedId={selectedId} onCreate={onCreate} onChoose={onClose} />
      </nav>
    </BottomDrawer>
  )
}

type TitleButtonProps = Pick<CollectionsSheetButtonProps, 'name' | 'buttonRef'> & {
  isExpanded: boolean
  onOpen: () => void
}

function TitleButton({ name, isExpanded, onOpen, buttonRef }: TitleButtonProps): JSX.Element {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={isExpanded}
      onClick={onOpen}
      className="inline-flex min-h-11 items-center gap-1 rounded-lg text-left wrap-anywhere outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
    >
      {name}
      <ChevronDownIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
    </button>
  )
}

// A phone's picker: the title itself opens the list, under the thumb. The sheet gives focus back
// to this button on its own; the dialog opened from the sheet would give it to the sheet's
// « Nouvelle collection », gone by then.
export function CollectionsSheetButton({
  name,
  selectedId,
  buttonRef,
}: CollectionsSheetButtonProps): JSX.Element {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const close = (): void => setOpenPanel(null)
  return (
    <>
      <TitleButton
        name={name}
        isExpanded={openPanel === 'list'}
        onOpen={() => setOpenPanel('list')}
        buttonRef={buttonRef}
      />
      {openPanel === 'list' && (
        <CollectionsSheet
          selectedId={selectedId}
          onCreate={() => setOpenPanel('create')}
          onClose={close}
        />
      )}
      <NewCollectionDialog
        isOpen={openPanel === 'create'}
        onClose={close}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          buttonRef.current?.focus()
        }}
      />
    </>
  )
}
