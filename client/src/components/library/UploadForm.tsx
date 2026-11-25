import { CameraIcon, ImageIcon, SendIcon } from 'lucide-react'
import { type ChangeEvent, type JSX, type SubmitEvent, useId, useState } from 'react'
import { PickButton, type PickButtonProps } from '@/components/form/PickButton.tsx'
import { UploadPreview } from '@/components/library/UploadPreview.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import { tooManyPhotosMessage } from '@/upload/uploadTexts.ts'

// Enough for an outing's best shots; past it the queue would run for many minutes on a phone
// network, and the preview would push the buttons out of the panel.
const MAX_PHOTOS_PER_CHOICE = 20

type UploadFormProps = {
  onUpload: (files: File[]) => void
  // The file goes to a friend only: the own library does not change.
  onShare: (file: File) => void
}

type FileChoice = {
  files: File[]
  tooManyMessage: string
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void
}

type UploadButtonsProps = {
  fileCount: number
  onShare: () => void
}

function PickButtons({ onChange }: Pick<PickButtonProps, 'onChange'>): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-2">
      <PickButton
        label="Prendre une photo"
        icon={<CameraIcon aria-hidden className="size-6" />}
        capture="environment"
        onChange={onChange}
      />
      <PickButton
        label="Choisir des images"
        icon={<ImageIcon aria-hidden className="size-6" />}
        multiple
        onChange={onChange}
      />
    </div>
  )
}

// A friend gets one photo at a time: the send panel shows one photo with its message.
function UploadButtons({ fileCount, onShare }: UploadButtonsProps): JSX.Element {
  const shareHintId = useId()
  return (
    <div className="flex flex-col gap-2">
      <Button type="submit" size="lg" disabled={fileCount === 0}>
        Ajouter à ma bibliothèque
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={fileCount !== 1}
        aria-describedby={fileCount > 1 ? shareHintId : undefined}
        onClick={onShare}
      >
        <SendIcon aria-hidden data-icon="inline-start" />
        Envoyer à un ami
      </Button>
      {fileCount > 1 && (
        <p id={shareHintId} className="text-sm text-muted-foreground">
          Pour envoyer à un ami, choisissez une seule photo.
        </p>
      )}
    </div>
  )
}

function TooManyAlert({ message }: { message: string }): JSX.Element | null {
  if (message === '') return null
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

// Too many: nothing is kept, so the message never sits next to photos that would be sent.
// The input is emptied once read, so choosing the same file again still fires change. A picker
// closed without a choice sends no file on some browsers: the previous choice stays.
function useFileChoice(): FileChoice {
  const [files, setFiles] = useState<File[]>([])
  const [tooManyMessage, setTooManyMessage] = useState('')

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const input = event.target
    const chosen = Array.from(input.files ?? [])
    input.value = ''
    if (chosen.length === 0) return
    const isTooMany = chosen.length > MAX_PHOTOS_PER_CHOICE
    setFiles(isTooMany ? [] : chosen)
    setTooManyMessage(isTooMany ? tooManyPhotosMessage(MAX_PHOTOS_PER_CHOICE, chosen.length) : '')
  }

  return { files, tooManyMessage, handleFileChange }
}

export function UploadForm({ onUpload, onShare }: UploadFormProps): JSX.Element {
  const { files, tooManyMessage, handleFileChange } = useFileChoice()

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (files.length > 0) onUpload(files)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PickButtons onChange={handleFileChange} />
      <TooManyAlert message={tooManyMessage} />
      <UploadPreview files={files} />
      <UploadButtons
        fileCount={files.length}
        onShare={() => files.length === 1 && onShare(files[0])}
      />
    </form>
  )
}
