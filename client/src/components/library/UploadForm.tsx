import { CameraIcon, ImageIcon, SendIcon } from 'lucide-react'
import { type ChangeEvent, type JSX, type SubmitEvent, useRef, useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { usePreviewUrl } from '@/hooks/usePreviewUrl.ts'

// The server's accepted types: a HEIC or GIF picked here would only be refused after the upload.
const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp'

type UploadFormProps = {
  onUpload: (files: File[]) => void
  // The file goes to a friend only: the own library does not change.
  onShare: (file: File) => void
}

type PickButtonProps = {
  label: string
  icon: JSX.Element
  capture?: 'environment'
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

type UploadButtonsProps = {
  hasFile: boolean
  onShare: () => void
}

// A button rather than the raw file input: the browser's « Choose file » cannot be styled or
// translated. The hidden input does the picking.
function PickButton({ label, icon, capture, onChange }: PickButtonProps): JSX.Element {
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
        label="Choisir une image"
        icon={<ImageIcon aria-hidden className="size-6" />}
        onChange={onChange}
      />
    </div>
  )
}

function UploadButtons({ hasFile, onShare }: UploadButtonsProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <Button type="submit" size="lg" disabled={!hasFile}>
        Ajouter à ma bibliothèque
      </Button>
      <Button type="button" variant="outline" size="lg" disabled={!hasFile} onClick={onShare}>
        <SendIcon aria-hidden data-icon="inline-start" />
        Envoyer à un ami
      </Button>
    </div>
  )
}

function FilePreview({ file }: { file: File | null }): JSX.Element | null {
  const previewUrl = usePreviewUrl(file)
  if (!previewUrl) return null
  return (
    <img
      className="max-h-[35svh] w-full rounded-lg object-contain"
      src={previewUrl}
      alt="Aperçu avant envoi"
    />
  )
}

export function UploadForm({ onUpload, onShare }: UploadFormProps): JSX.Element {
  const [file, setFile] = useState<File | null>(null)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    setFile(event.target.files?.[0] ?? null)
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (file) onUpload([file])
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PickButtons onChange={handleFileChange} />
      <FilePreview file={file} />
      <UploadButtons hasFile={file !== null} onShare={() => file && onShare(file)} />
    </form>
  )
}
