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
  notice: string
  handleSubmit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>
}

type FriendRequestSuccess = Extract<FriendRequestResult, { isSuccess: true }>

// Their request was waiting: mine accepted it, there is nothing left to wait for.
function successNotice({ friendName, isAccepted }: FriendRequestSuccess): string {
  return isAccepted
    ? `Vous êtes maintenant amis avec ${friendName}.`
    : `Demande envoyée à ${friendName}.`
}

function useFriendRequestForm(onDone: () => void): FriendRequestFormState {
  const { dropUser } = useAuth()
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError('')
    setNotice('')
    setIsSending(true)
    const result = await postFriendRequest(email, dropUser)
    setIsSending(false)
    if (result.isSuccess) {
      setEmail('')
      setNotice(successNotice(result))
    } else setError(result.message)
    // Reload on failure too: the other side may have acted since the page loaded.
    onDone()
  }

  // Editing the address makes the last message stale.
  function changeEmail(nextEmail: string): void {
    setEmail(nextEmail)
    setError('')
    setNotice('')
  }

  return { email, setEmail: changeEmail, isSending, error, notice, handleSubmit }
}

export function FriendRequestForm({ onDone }: { onDone: () => void }): JSX.Element {
  const { email, setEmail, isSending, error, notice, handleSubmit } = useFriendRequestForm(onDone)

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
      {notice && (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
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
