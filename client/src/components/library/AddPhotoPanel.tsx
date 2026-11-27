import { ArrowLeftIcon, ImagesIcon } from 'lucide-react'
import { type JSX, type RefObject, useState } from 'react'
import type { Collection } from '@/collections/collection.ts'
import { CollectionPick } from '@/components/library/CollectionPick.tsx'
import { UploadForm } from '@/components/library/UploadForm.tsx'
import { ResponsivePanel } from '@/components/panel/ResponsivePanel.tsx'
import { Button } from '@/components/ui/button.tsx'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx'
import { shownButton } from '@/lib/shownButton.ts'

type AddPhotoPanelProps = {
  isOpen: boolean
  onClose: () => void
  onUpload: (files: File[]) => void
  // The collection shown, null on « Toutes les photos »: only a collection can take library photos.
  collection: Collection | null
  // The « Ajouter » triggers; the one shown takes focus back.
  returnFocusRefs: RefObject<HTMLButtonElement | null>[]
}

type AddView = 'choices' | 'library'

type AddPhotoHeadingProps = {
  view: AddView
  collectionName: string | undefined
  onBack: () => void
}

function AddPhotoHeading({ view, collectionName, onBack }: AddPhotoHeadingProps): JSX.Element {
  const isLibrary = view === 'library'
  return (
    // pr-10 keeps the text clear of the ✕ in the corner.
    <div className="flex items-center gap-2 pr-10">
      {isLibrary && (
        <Button variant="ghost" size="icon" aria-label="Retour" onClick={onBack}>
          <ArrowLeftIcon aria-hidden />
        </Button>
      )}
      <div className="flex flex-col gap-1">
        <DialogTitle>{isLibrary ? 'Depuis ma bibliothèque' : 'Ajouter une photo'}</DialogTitle>
        <DialogDescription>
          {isLibrary
            ? `Choisissez les photos à ajouter à « ${collectionName} ».`
            : 'Ajoutez-en une ou plusieurs à votre bibliothèque.'}
        </DialogDescription>
      </div>
    </div>
  )
}

function LibraryChoice({ onOpen }: { onOpen: () => void }): JSX.Element {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-20 flex-col gap-2 whitespace-normal pointer-coarse:h-20"
      onClick={onOpen}
    >
      <ImagesIcon aria-hidden className="size-6" />
      Depuis ma bibliothèque
    </Button>
  )
}

type AddChoicesProps = {
  onUpload: (files: File[]) => void
  // Absent on « Toutes les photos »: its photos are already all in the library.
  onOpenLibrary: (() => void) | null
}

function AddChoices({ onUpload, onOpenLibrary }: AddChoicesProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <UploadForm onUpload={onUpload} />
      {onOpenLibrary && <LibraryChoice onOpen={onOpenLibrary} />}
    </div>
  )
}

type OpenPanelProps = Omit<AddPhotoPanelProps, 'isOpen'>

// Mounted only while open: every opening starts on the choices, however the last one closed.
function OpenPanel({
  onClose,
  onUpload,
  collection,
  returnFocusRefs,
}: OpenPanelProps): JSX.Element {
  const [view, setView] = useState<AddView>('choices')

  function handleUpload(files: File[]): void {
    onUpload(files)
    onClose()
  }

  function returnFocus(event: Event): void {
    event.preventDefault()
    shownButton(returnFocusRefs)?.focus()
  }

  return (
    <ResponsivePanel onClose={onClose} onCloseAutoFocus={returnFocus}>
      <AddPhotoHeading
        view={view}
        collectionName={collection?.name}
        onBack={() => setView('choices')}
      />
      {view === 'library' && collection ? (
        <CollectionPick collection={collection} onAdded={onClose} />
      ) : (
        <AddChoices
          onUpload={handleUpload}
          onOpenLibrary={collection ? () => setView('library') : null}
        />
      )}
    </ResponsivePanel>
  )
}

// Sending to a friend lives on the Envoyer page now: this panel only adds. A file choice closes it
// at once, the progress shows on the library's tiles; a pick from the library closes it once the
// photos are in. Focus goes back to the shown « Ajouter », always there: the empty library's
// « Ajouter une photo » leaves with the first tile. The floating button shows itself when it
// takes focus, even if scrolling had hidden it.
export function AddPhotoPanel({ isOpen, ...props }: AddPhotoPanelProps): JSX.Element | null {
  if (!isOpen) return null
  return <OpenPanel {...props} />
}
