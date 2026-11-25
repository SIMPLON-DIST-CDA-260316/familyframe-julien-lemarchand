import { CameraIcon, ImageIcon } from 'lucide-react'
import { type ChangeEvent, type JSX, useState } from 'react'
import { PickButton } from '@/components/form/PickButton.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { tooManyPhotosMessage } from '@/upload/uploadTexts.ts'

// Enough for an outing's best shots; past it the queue would run for many minutes on a phone
// network.
const MAX_PHOTOS_PER_CHOICE = 20

type UploadFormProps = {
  onUpload: (files: File[]) => void
}

function TooManyAlert({ message }: { message: string }): JSX.Element | null {
  if (message === '') return null
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

// Adding is the panel's only intent: a choice uploads at once, the greyed tiles show the progress.
// Too many: nothing is sent and the panel stays open with the message. The input is emptied once
// read, so choosing the same files again still fires change.
export function UploadForm({ onUpload }: UploadFormProps): JSX.Element {
  const [tooManyMessage, setTooManyMessage] = useState('')

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const input = event.target
    const chosen = Array.from(input.files ?? [])
    input.value = ''
    if (chosen.length === 0) return
    if (chosen.length > MAX_PHOTOS_PER_CHOICE) {
      setTooManyMessage(tooManyPhotosMessage(MAX_PHOTOS_PER_CHOICE, chosen.length))
      return
    }
    setTooManyMessage('')
    onUpload(chosen)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <PickButton
          label="Prendre une photo"
          icon={<CameraIcon aria-hidden className="size-6" />}
          capture="environment"
          onChange={handleFileChange}
        />
        <PickButton
          label="Choisir des images"
          icon={<ImageIcon aria-hidden className="size-6" />}
          multiple
          onChange={handleFileChange}
        />
      </div>
      <TooManyAlert message={tooManyMessage} />
    </div>
  )
}
