import { type ChangeEvent, type JSX, type SubmitEvent, useEffect, useState } from 'react'
import { errorMessage } from '../api.ts'

type Status = 'idle' | 'sending' | 'success' | 'error'

const UPLOADER_NAME_KEY = 'familyframe.uploaderName'

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
    <main className="upload">
      <h1>FamilyFrame</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Pseudo
          <input value={uploaderName} onChange={handleUploaderNameChange} required maxLength={30} />
        </label>

        <label>
          Prendre une photo
          <input
            key={`camera-${inputsKey}`}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
          />
        </label>

        <label>
          Choisir une image
          <input
            key={`gallery-${inputsKey}`}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>

        {previewUrl && <img className="preview" src={previewUrl} alt="Aperçu avant envoi" />}

        <button type="submit" disabled={!file || status === 'sending'}>
          {status === 'sending' ? 'Envoi…' : 'Envoyer'}
        </button>
      </form>

      {status === 'success' && <p>Photo envoyée !</p>}
      {status === 'error' && <p role="alert">{error}</p>}
    </main>
  )
}
