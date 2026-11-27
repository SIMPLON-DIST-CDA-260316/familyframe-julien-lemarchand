import { type JSX, type SubmitEvent, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { TextField } from '@/components/form/TextField.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import type { CreatedInvitation } from '@/invitation.ts'
import { postInvitation } from '@/invitationsApi.ts'

type InvitationFormProps = {
  onCreated: (created: CreatedInvitation) => void
}

type InvitationFormState = {
  email: string
  setEmail: (email: string) => void
  isSending: boolean
  error: string
  handleSubmit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>
}

function useInvitationForm(onCreated: (created: CreatedInvitation) => void): InvitationFormState {
  const { dropUser } = useAuth()
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError('')
    setIsSending(true)
    const result = await postInvitation(email, dropUser)
    setIsSending(false)
    if (!result.isSuccess) {
      setError(result.message)
      return
    }
    setEmail('')
    onCreated(result.created)
  }

  return { email, setEmail, isSending, error, handleSubmit }
}

export function InvitationForm({ onCreated }: InvitationFormProps): JSX.Element {
  const { email, setEmail, isSending, error, handleSubmit } = useInvitationForm(onCreated)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <TextField
        id="invitation-email"
        enterKeyHint="send"
        label="E-mail de la personne invitée"
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
        {isSending ? 'Création…' : 'Créer le lien'}
      </Button>
    </form>
  )
}
