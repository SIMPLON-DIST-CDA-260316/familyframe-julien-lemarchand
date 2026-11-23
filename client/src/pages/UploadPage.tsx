import { type ChangeEvent, type JSX, type SubmitEvent, useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { LogoutButton } from '@/components/auth/LogoutButton.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { errorMessage, UNAUTHORIZED_STATUS } from '../api.ts'

type Status = 'idle' | 'sending' | 'success' | 'error'

export default function UploadPage(): JSX.Element {
  const { user, dropUser } = useAuth()
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

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    setFile(event.target.files?.[0] ?? null)
    setStatus('idle')
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!file) return

    const body = new FormData()
    body.append('photo', file)

    setStatus('sending')
    try {
      const res = await fetch('/api/photos', { method: 'POST', body })
      // The session ended on the server: RequireAuth sends the user to /login.
      if (res.status === UNAUTHORIZED_STATUS) {
        dropUser()
        return
      }
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
          <CardDescription>
            Envoyez une photo au cadre de la famille, en tant que {user?.displayName}.
          </CardDescription>
          <CardAction>
            <LogoutButton />
          </CardAction>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
