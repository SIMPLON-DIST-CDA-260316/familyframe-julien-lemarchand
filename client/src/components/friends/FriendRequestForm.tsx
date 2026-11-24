import { type JSX, type SubmitEvent, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { TextField } from '@/components/form/TextField.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import { postFriendRequest } from '@/friendshipsApi.ts'

type FriendRequestFormState = {
  email: string
  setEmail: (email: string) => void
  isSending: boolean
  error: string
  handleSubmit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>
}

function useFriendRequestForm(onSent: () => void): FriendRequestFormState {
  const { dropUser } = useAuth()
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError('')
    setIsSending(true)
    const result = await postFriendRequest(email, dropUser)
    setIsSending(false)
    if (!result.isSuccess) {
      setError(result.message)
      return
    }
    setEmail('')
    onSent()
  }

  return { email, setEmail, isSending, error, handleSubmit }
}

export function FriendRequestForm({ onSent }: { onSent: () => void }): JSX.Element {
  const { email, setEmail, isSending, error, handleSubmit } = useFriendRequestForm(onSent)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <TextField
        id="friend-email"
        label="E-mail du proche"
        type="email"
        autoComplete="off"
        value={email}
        onChange={setEmail}
      />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="lg" disabled={isSending}>
        {isSending ? 'Envoi…' : 'Envoyer la demande'}
      </Button>
    </form>
  )
}
