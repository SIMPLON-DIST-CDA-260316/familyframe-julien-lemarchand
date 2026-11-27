import { ArrowLeftIcon, CameraIcon, ImageIcon, ImagesIcon } from 'lucide-react'
import { type ChangeEvent, type JSX, useState } from 'react'
import { PickButton } from '@/components/form/PickButton.tsx'
import { ResponsivePanel } from '@/components/panel/ResponsivePanel.tsx'
import { LibraryPicker } from '@/components/send/LibraryPicker.tsx'
import { Button } from '@/components/ui/button.tsx'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx'
import type { ShareTarget } from '@/hooks/useShareSending.ts'

type SendSourcePanelProps = {
  onClose: () => void
  onChoose: (target: ShareTarget) => void
  onCloseAutoFocus: (event: Event) => void
}

type SourceChoicesProps = {
  onChoose: (target: ShareTarget) => void
  onOpenLibrary: () => void
}

type SourceView = 'sources' | 'library'

function SourceChoices({ onChoose, onOpenLibrary }: SourceChoicesProps): JSX.Element {
  // One photo: the send panel shows it with its message. The input is emptied once read, so
  // choosing the same file again still fires change.
  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const input = event.target
    const file = input.files?.[0]
    input.value = ''
    if (file) onChoose({ kind: 'device', file })
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <PickButton
        label="Prendre une photo"
        icon={<CameraIcon aria-hidden className="size-6" />}
        capture="environment"
        onChange={handleFileChange}
      />
      <PickButton
        label="Choisir sur l'appareil"
        icon={<ImageIcon aria-hidden className="size-6" />}
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        className="col-span-2 h-20 flex-col gap-2 whitespace-normal pointer-coarse:h-20"
        onClick={onOpenLibrary}
      >
        <ImagesIcon aria-hidden className="size-6" />
        Depuis ma bibliothèque
      </Button>
    </div>
  )
}

const HEADINGS: Record<SourceView, { title: string; description: string }> = {
  sources: {
    title: 'Envoyer une photo',
    description: "Choisissez la photo, puis les proches à qui l'envoyer.",
  },
  library: { title: 'Depuis ma bibliothèque', description: 'Touchez la photo à envoyer.' },
}

function SourceHeading({ view, onBack }: { view: SourceView; onBack: () => void }): JSX.Element {
  const { title, description } = HEADINGS[view]
  return (
    // pr-10 keeps the text clear of the ✕ in the corner.
    <div className="flex items-center gap-2 pr-10">
      {view === 'library' && (
        <Button variant="ghost" size="icon" aria-label="Retour" onClick={onBack}>
          <ArrowLeftIcon aria-hidden />
        </Button>
      )}
      <div className="flex flex-col gap-1">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </div>
    </div>
  )
}

// A photo from the device goes to the friends only: it does not enter the own library.
export function SendSourcePanel({
  onClose,
  onChoose,
  onCloseAutoFocus,
}: SendSourcePanelProps): JSX.Element {
  const [view, setView] = useState<SourceView>('sources')
  return (
    <ResponsivePanel onClose={onClose} onCloseAutoFocus={onCloseAutoFocus}>
      <SourceHeading view={view} onBack={() => setView('sources')} />
      {view === 'sources' ? (
        <SourceChoices onChoose={onChoose} onOpenLibrary={() => setView('library')} />
      ) : (
        <LibraryPicker onPick={(photo) => onChoose({ kind: 'library', photo })} />
      )}
    </ResponsivePanel>
  )
}
