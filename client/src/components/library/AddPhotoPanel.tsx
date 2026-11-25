import { type JSX, type RefObject, useRef, useState } from 'react'
import { UploadForm } from '@/components/library/UploadForm.tsx'
import { ResponsivePanel } from '@/components/panel/ResponsivePanel.tsx'
import { ShareSheet } from '@/components/sharing/ShareSheet.tsx'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx'

type ShareHandOver = {
  fileToShare: File | null
  startShare: (file: File) => void
  closeShare: () => void
  returnFocus: (event: Event) => void
}

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
      <DialogDescription>
        Ajoutez-en une ou plusieurs à votre bibliothèque, ou envoyez-en une directement à un ami.
      </DialogDescription>
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

// Focus goes back to the shown « Ajouter », always there: the empty library's « Ajouter une
// photo » leaves with the first tile, and the send panel was opened from a panel already gone.
// The floating button shows itself when it takes focus, even if scrolling had hidden it.
function useShareHandOver(returnFocusRefs: RefObject<HTMLButtonElement | null>[]): ShareHandOver {
  const [fileToShare, setFileToShare] = useState<File | null>(null)
  // Set while the send panel takes over: it holds focus, « Ajouter » must not take it.
  const isHandingOver = useRef(false)
  return {
    fileToShare,
    startShare: (file) => {
      isHandingOver.current = true
      setFileToShare(file)
    },
    closeShare: () => {
      isHandingOver.current = false
      setFileToShare(null)
    },
    returnFocus: (event) => {
      event.preventDefault()
      if (!isHandingOver.current) shownButton(returnFocusRefs)?.focus()
    },
  }
}

// « Envoyer à un ami » swaps this panel for the send panel, which keeps its own copy of the file.
// « Ajouter à ma bibliothèque » closes it at once: the progress shows on the library's tiles.
export function AddPhotoPanel(props: AddPhotoPanelProps): JSX.Element {
  const { isOpen, onClose, onUpload, returnFocusRefs } = props
  const { fileToShare, startShare, closeShare, returnFocus } = useShareHandOver(returnFocusRefs)

  function handleUpload(files: File[]): void {
    onUpload(files)
    onClose()
  }

  function handleShare(file: File): void {
    startShare(file)
    onClose()
  }

  return (
    <>
      {isOpen && (
        <ResponsivePanel onClose={onClose} onCloseAutoFocus={returnFocus}>
          <AddPhotoHeading />
          <UploadForm onUpload={handleUpload} onShare={handleShare} />
        </ResponsivePanel>
      )}
      <ShareSheet
        target={fileToShare ? { kind: 'device', file: fileToShare } : null}
        onClose={closeShare}
        onCloseAutoFocus={returnFocus}
      />
    </>
  )
}
