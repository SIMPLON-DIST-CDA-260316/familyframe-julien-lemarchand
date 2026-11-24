import { SendIcon } from 'lucide-react'
import { type ChangeEvent, type JSX, type SubmitEvent, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext.ts'
import { SharePhotoDialog } from '@/components/sharing/SharePhotoDialog.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { usePreviewUrl } from '@/hooks/usePreviewUrl.ts'
import type { Photo } from '@/photo.ts'
import { postPhoto } from '@/photosApi.ts'

// The server's accepted types: a HEIC or GIF picked here would only be refused after the upload.
const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp'

type UploadStatus = 'idle' | 'sending' | 'error'

type PhotoUpload = {
  status: UploadStatus
  error: string
  // true when the photo was saved: the form then empties its inputs.
  send: (file: File) => Promise<boolean>
  clearStatus: () => void
}

type UploadFormProps = {
  onUploaded: (photo: Photo) => void
}

type FileFieldProps = {
  id: string
  label: string
  capture?: 'environment'
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

type FileFieldsProps = {
  inputsKey: number
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

type UploadFormState = {
  upload: PhotoUpload
  file: File | null
  inputsKey: number
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>
  clearFile: () => void
}

type UploadButtonsProps = {
  hasFile: boolean
  isSending: boolean
  onShare: () => void
}

function usePhotoUpload(onUploaded: (photo: Photo) => void): PhotoUpload {
  const { dropUser } = useAuth()
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [error, setError] = useState('')

  async function send(file: File): Promise<boolean> {
    setStatus('sending')
    const result = await postPhoto(file)
    // The session ended on the server: RequireAuth sends the user to /login.
    if (result.status === 'unauthenticated') {
      dropUser()
      return false
    }
    if (result.status === 'failed') {
      setError(result.message)
      setStatus('error')
      return false
    }
    onUploaded(result.photo)
    // A toast, not an alert: the form empties, and the message must not outstay the photo.
    toast.success('Photo ajoutée à votre bibliothèque.')
    setStatus('idle')
    return true
  }

  return { status, error, send, clearStatus: () => setStatus('idle') }
}

function useUploadForm(onUploaded: (photo: Photo) => void): UploadFormState {
  const upload = usePhotoUpload(onUploaded)
  const [file, setFile] = useState<File | null>(null)
  // A new key remounts the file inputs, which empties them.
  const [inputsKey, setInputsKey] = useState(0)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    setFile(event.target.files?.[0] ?? null)
    upload.clearStatus()
  }

  function clearFile(): void {
    setFile(null)
    setInputsKey((key) => key + 1)
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!file) return
    if (await upload.send(file)) clearFile()
  }

  return { upload, file, inputsKey, handleFileChange, handleSubmit, clearFile }
}

function FileField({ id, label, capture, onChange }: FileFieldProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        capture={capture}
        onChange={onChange}
      />
    </div>
  )
}

function FileFields({ inputsKey, onChange }: FileFieldsProps): JSX.Element {
  return (
    <>
      <FileField
        key={`camera-${inputsKey}`}
        id="camera-photo"
        label="Prendre une photo"
        capture="environment"
        onChange={onChange}
      />
      <FileField
        key={`gallery-${inputsKey}`}
        id="gallery-photo"
        label="Choisir une image"
        onChange={onChange}
      />
    </>
  )
}

function UploadButtons({ hasFile, isSending, onShare }: UploadButtonsProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <Button type="submit" size="lg" disabled={!hasFile || isSending}>
        {isSending ? 'Envoi…' : 'Ajouter à ma bibliothèque'}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={!hasFile || isSending}
        onClick={onShare}
      >
        <SendIcon aria-hidden data-icon="inline-start" />
        Envoyer à un ami
      </Button>
    </div>
  )
}

function UploadAlert({ status, error }: Pick<PhotoUpload, 'status' | 'error'>): JSX.Element | null {
  if (status !== 'error') return null
  return (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  )
}

function FilePreview({ file }: { file: File | null }): JSX.Element | null {
  const previewUrl = usePreviewUrl(file)
  if (!previewUrl) return null
  return (
    <img
      className="max-h-[40vh] w-full rounded-lg object-contain"
      src={previewUrl}
      alt="Aperçu avant envoi"
    />
  )
}

export function UploadForm({ onUploaded }: UploadFormProps): JSX.Element {
  const { upload, file, inputsKey, handleFileChange, handleSubmit, clearFile } =
    useUploadForm(onUploaded)
  // The dialog keeps its own file: emptying the form after a send leaves it open.
  const [fileToShare, setFileToShare] = useState<File | null>(null)

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FileFields inputsKey={inputsKey} onChange={handleFileChange} />
        <FilePreview file={file} />
        <UploadButtons
          hasFile={file !== null}
          isSending={upload.status === 'sending'}
          onShare={() => setFileToShare(file)}
        />
        <UploadAlert status={upload.status} error={upload.error} />
      </form>
      {/* The file goes to the friend only: the own library does not change. */}
      <SharePhotoDialog
        target={fileToShare ? { kind: 'device', file: fileToShare } : null}
        onClose={() => setFileToShare(null)}
        onShared={clearFile}
      />
    </>
  )
}
