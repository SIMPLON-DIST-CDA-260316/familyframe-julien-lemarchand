import { type JSX, type SubmitEvent, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { TextField } from '@/components/form/TextField.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import { type FriendRequestResult, postFriendRequest } from '@/friendshipsApi.ts'

type FriendRequestFormState = {
  email: string
  setEmail: (email: string) => void
  isSending: boolean
  error: string
  handleSubmit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>
}

function useFriendRequestForm(
  onDone: (result: FriendRequestResult) => void,
): FriendRequestFormState {
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
    if (result.isSuccess) setEmail('')
    else setError(result.message)
    // Reload on failure too: the other side may have acted since the page loaded.
    onDone(result)
  }

  // Editing the address makes the last error stale.
  function changeEmail(nextEmail: string): void {
    setEmail(nextEmail)
    setError('')
  }

  return { email, setEmail: changeEmail, isSending, error, handleSubmit }
}

// The page tells the success: the dialog holding this form closes on it.
type FriendRequestFormProps = { onDone: (result: FriendRequestResult) => void }

export function FriendRequestForm({ onDone }: FriendRequestFormProps): JSX.Element {
  const { email, setEmail, isSending, error, handleSubmit } = useFriendRequestForm(onDone)

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
