import type { JSX, RefObject } from 'react'
import { UploadForm } from '@/components/library/UploadForm.tsx'
import { ResponsivePanel } from '@/components/panel/ResponsivePanel.tsx'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx'

type AddPhotoPanelProps = {
  isOpen: boolean
  onClose: () => void
  onUpload: (files: File[]) => void
  // The « Ajouter » triggers; the one shown takes focus back.
  returnFocusRefs: RefObject<HTMLButtonElement | null>[]
}

function AddPhotoHeading(): JSX.Element {
  return (
    // pr-10 keeps the text clear of the ✕ in the corner.
    <div className="flex flex-col gap-1 pr-10">
      <DialogTitle>Ajouter une photo</DialogTitle>
      <DialogDescription>Ajoutez-en une ou plusieurs à votre bibliothèque.</DialogDescription>
    </div>
  )
}

// display: none (hidden md:inline-flex, md:hidden) leaves no box. Not offsetParent: it is always
// null for the fixed floating button.
function shownButton(refs: RefObject<HTMLButtonElement | null>[]): HTMLButtonElement | undefined {
  return refs
    .map((ref) => ref.current)
    .find(
      (button): button is HTMLButtonElement =>
        button !== null && button.getClientRects().length > 0,
    )
}

// Sending to a friend lives on the Envoyer page now: this panel only adds. A choice closes it at
// once, the progress shows on the library's tiles. Focus goes back to the shown « Ajouter »,
// always there: the empty library's « Ajouter une photo » leaves with the first tile. The
// floating button shows itself when it takes focus, even if scrolling had hidden it.
export function AddPhotoPanel(props: AddPhotoPanelProps): JSX.Element | null {
  const { isOpen, onClose, onUpload, returnFocusRefs } = props
  if (!isOpen) return null

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
      <AddPhotoHeading />
      <UploadForm onUpload={handleUpload} />
    </ResponsivePanel>
  )
}
