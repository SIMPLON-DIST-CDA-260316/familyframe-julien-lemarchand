import { type ChangeEvent, type JSX, type SubmitEvent, useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { errorMessage } from '../api.ts'

type Status = 'idle' | 'sending' | 'success' | 'error'

const UPLOADER_NAME_KEY = 'familyframe.uploaderName'
const MAX_UPLOADER_NAME_LENGTH = 30 // same limit as the API

// localStorage throws in private browsing or when storage is blocked.
function loadUploaderName(): string {
  try {
    return localStorage.getItem(UPLOADER_NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

function saveUploaderName(uploaderName: string): void {
  try {
    localStorage.setItem(UPLOADER_NAME_KEY, uploaderName)
  } catch {
    // Ignored: the relative types it again next time.
  }
}

export default function UploadPage(): JSX.Element {
  const [uploaderName, setUploaderName] = useState(loadUploaderName)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  // A new key remounts the file inputs, which empties them.
  const [inputsKey, setInputsKey] = useState(0)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleUploaderNameChange(event: ChangeEvent<HTMLInputElement>): void {
    setUploaderName(event.target.value)
    saveUploaderName(event.target.value)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    setFile(event.target.files?.[0] ?? null)
    setStatus('idle')
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!file) return

    const body = new FormData()
    body.append('uploaderName', uploaderName)
    body.append('photo', file)

    setStatus('sending')
    try {
      const res = await fetch('/api/photos', { method: 'POST', body })
      if (!res.ok) {
        // Not JSON when the dev proxy answers for a stopped API.
        const data: unknown = await res.json().catch(() => null)
        setError(errorMessage(data))
        setStatus('error')
        return
      }
      setStatus('success')
      setFile(null)
      setInputsKey((key) => key + 1)
    } catch {
      // fetch rejects only on network failure.
      setError(errorMessage(null))
      setStatus('error')
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">FamilyFrame</CardTitle>
          <CardDescription>Envoyez une photo au cadre de la famille.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="uploader-name">Pseudo</Label>
              <Input
                id="uploader-name"
                value={uploaderName}
                onChange={handleUploaderNameChange}
                required
                maxLength={MAX_UPLOADER_NAME_LENGTH}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="camera-photo">Prendre une photo</Label>
              <Input
                id="camera-photo"
                key={`camera-${inputsKey}`}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="gallery-photo">Choisir une image</Label>
              <Input
                id="gallery-photo"
                key={`gallery-${inputsKey}`}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            {previewUrl && (
              <img
                className="max-h-[40vh] w-full rounded-lg object-contain"
                src={previewUrl}
                alt="Aperçu avant envoi"
              />
            )}

            <Button type="submit" size="lg" disabled={!file || status === 'sending'}>
              {status === 'sending' ? 'Envoi…' : 'Envoyer'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {status === 'success' && (
        <Alert className="mt-4">
          <AlertDescription>Photo envoyée !</AlertDescription>
        </Alert>
      )}
      {status === 'error' && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </main>
  )
}
