import { type ChangeEvent, type JSX, type SubmitEvent, useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import type { Photo } from '@/photo.ts'
import { postPhoto } from '@/photosApi.ts'

type UploadStatus = 'idle' | 'sending' | 'success' | 'error'

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
}

function usePreviewUrl(file: File | null): string | null {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return previewUrl
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
    setStatus('success')
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

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!file) return
    if (await upload.send(file)) {
      setFile(null)
      setInputsKey((key) => key + 1)
    }
  }

  return { upload, file, inputsKey, handleFileChange, handleSubmit }
}

function FileField({ id, label, capture, onChange }: FileFieldProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="file" accept="image/*" capture={capture} onChange={onChange} />
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

function UploadAlert({ status, error }: Pick<PhotoUpload, 'status' | 'error'>): JSX.Element | null {
  if (status === 'success') {
    return (
      <Alert>
        <AlertDescription>Photo envoyée !</AlertDescription>
      </Alert>
    )
  }
  if (status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  return null
}

export function UploadForm({ onUploaded }: UploadFormProps): JSX.Element {
  const { upload, file, inputsKey, handleFileChange, handleSubmit } = useUploadForm(onUploaded)
  const previewUrl = usePreviewUrl(file)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FileFields inputsKey={inputsKey} onChange={handleFileChange} />
      {previewUrl && (
        <img
          className="max-h-[40vh] w-full rounded-lg object-contain"
          src={previewUrl}
          alt="Aperçu avant envoi"
        />
      )}
      <Button type="submit" size="lg" disabled={!file || upload.status === 'sending'}>
        {upload.status === 'sending' ? 'Envoi…' : 'Envoyer'}
      </Button>
      <UploadAlert status={upload.status} error={upload.error} />
    </form>
  )
}
