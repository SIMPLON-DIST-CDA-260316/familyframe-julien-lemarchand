import { type JSX, useState } from 'react'
import { UploadForm } from '@/components/library/UploadForm.tsx'
import { ResponsivePanel } from '@/components/panel/ResponsivePanel.tsx'
import { ShareSheet } from '@/components/sharing/ShareSheet.tsx'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx'
import type { Photo } from '@/photo.ts'

type AddPhotoPanelProps = {
  isOpen: boolean
  onClose: () => void
  onUploaded: (photo: Photo) => void
}

function AddPhotoHeading(): JSX.Element {
  return (
    // pr-10 keeps the text clear of the ✕ in the corner.
    <div className="flex flex-col gap-1 pr-10">
      <DialogTitle>Ajouter une photo</DialogTitle>
      <DialogDescription>
        Ajoutez-la à votre bibliothèque ou envoyez-la directement à un ami.
      </DialogDescription>
    </div>
  )
}

// « Envoyer à un ami » swaps this panel for the send panel, which keeps its own copy of the file.
export function AddPhotoPanel({ isOpen, onClose, onUploaded }: AddPhotoPanelProps): JSX.Element {
  const [fileToShare, setFileToShare] = useState<File | null>(null)

  function handleUploaded(photo: Photo): void {
    onUploaded(photo)
    onClose()
  }

  function handleShare(file: File): void {
    onClose()
    setFileToShare(file)
  }

  return (
    <>
      {isOpen && (
        <ResponsivePanel onClose={onClose}>
          <AddPhotoHeading />
          <UploadForm onUploaded={handleUploaded} onShare={handleShare} />
        </ResponsivePanel>
      )}
      <ShareSheet
        target={fileToShare ? { kind: 'device', file: fileToShare } : null}
        onClose={() => setFileToShare(null)}
      />
    </>
  )
}
