import { CameraIcon, ImageIcon, SendIcon } from 'lucide-react'
import { type ChangeEvent, type JSX, type SubmitEvent, useId, useRef, useState } from 'react'
import { UploadPreview } from '@/components/library/UploadPreview.tsx'
import { tooManyPhotosMessage } from '@/components/library/uploadTexts.ts'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'

// The server's accepted types: a HEIC or GIF picked here would only be refused after the upload.
const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp'

// Enough for an outing's best shots; past it the queue would run for many minutes on a phone
// network, and the preview would push the buttons out of the panel.
const MAX_PHOTOS_PER_CHOICE = 20

type UploadFormProps = {
  onUpload: (files: File[]) => void
  // The file goes to a friend only: the own library does not change.
  onShare: (file: File) => void
}

type PickButtonProps = {
  label: string
  icon: JSX.Element
  capture?: 'environment'
  // The gallery only: the camera takes one photo at a time.
  multiple?: boolean
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

type UploadButtonsProps = {
  fileCount: number
  onShare: () => void
}

// A button rather than the raw file input: the browser's « Choose file » cannot be styled or
// translated. The hidden input does the picking.
function PickButton({ label, icon, capture, multiple, onChange }: PickButtonProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <Button
        type="button"
        variant="outline"
        // pointer-coarse:h-20 beats the Button's coarse h-11: the big tile stays big under a finger.
        className="h-20 flex-col gap-2 whitespace-normal pointer-coarse:h-20"
        onClick={() => inputRef.current?.click()}
      >
        {icon}
        {label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        capture={capture}
        multiple={multiple}
        className="hidden"
        onChange={onChange}
      />
    </>
  )
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

export function UploadForm({ onUpload, onShare }: UploadFormProps): JSX.Element {
  const [files, setFiles] = useState<File[]>([])
  const [tooManyMessage, setTooManyMessage] = useState('')

  // Too many: nothing is kept, so the message never sits next to photos that would be sent.
  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const chosen = Array.from(event.target.files ?? [])
    const isTooMany = chosen.length > MAX_PHOTOS_PER_CHOICE
    setFiles(isTooMany ? [] : chosen)
    setTooManyMessage(isTooMany ? tooManyPhotosMessage(MAX_PHOTOS_PER_CHOICE, chosen.length) : '')
  }

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
