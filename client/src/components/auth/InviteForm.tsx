import { type JSX, type SubmitEvent, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/auth/AuthContext.ts'
import { TextField } from '@/components/form/TextField.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'

// Mirror the server's limits (invitations.service.ts): the browser catches most mistakes
// before a request. Keep both in sync.
const DISPLAY_NAME_MAX_LENGTH = 50
const PASSWORD_MIN_LENGTH = 12
const PASSWORD_MAX_LENGTH = 128
const HOME_PATH = '/'
const PASSWORD_MISMATCH_MESSAGE = 'Les deux mots de passe ne correspondent pas.'

type InviteFields = { displayName: string; password: string; confirmation: string }

const EMPTY_FIELDS: InviteFields = { displayName: '', password: '', confirmation: '' }

type InviteFormState = {
  fields: InviteFields
  setField: (name: keyof InviteFields, value: string) => void
  isSending: boolean
  error: string
  handleSubmit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>
}

type InviteFieldsState = Pick<InviteFormState, 'fields' | 'setField'>

function useInviteFields(): InviteFieldsState {
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const setField = (name: keyof InviteFields, value: string): void =>
    setFields((current) => ({ ...current, [name]: value }))
  return { fields, setField }
}

function useInviteForm(token: string): InviteFormState {
  const { acceptInvitation } = useAuth()
  const navigate = useNavigate()
  const { fields, setField } = useInviteFields()
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    // No password reset exists: a typo would lock the account, so the client compares.
    if (fields.password !== fields.confirmation) {
      setError(PASSWORD_MISMATCH_MESSAGE)
      return
    }
    setError('')
    setIsSending(true)
    const { displayName, password } = fields
    const result = await acceptInvitation({ token, displayName, password })
    // Same render as the user being set: the "already logged in" card never flashes.
    if (result.isSuccess) {
      navigate(HOME_PATH, { replace: true })
      return
    }
    setError(result.message)
    setIsSending(false)
  }

  return { fields, setField, isSending, error, handleSubmit }
}

function PasswordFields({ fields, setField }: InviteFieldsState): JSX.Element {
  return (
    <>
      <TextField
        id="password"
        label="Mot de passe"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
        value={fields.password}
        onChange={(value) => setField('password', value)}
      />
      <TextField
        id="password-confirmation"
        label="Confirmer le mot de passe"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
        value={fields.confirmation}
        onChange={(value) => setField('confirmation', value)}
      />
    </>
  )
}

export function InviteForm({ token }: { token: string }): JSX.Element {
  const { fields, setField, isSending, error, handleSubmit } = useInviteForm(token)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <TextField
        id="display-name"
        label="Votre nom"
        type="text"
        autoComplete="name"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        value={fields.displayName}
        onChange={(value) => setField('displayName', value)}
      />
      <PasswordFields fields={fields} setField={setField} />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="lg" disabled={isSending}>
        {isSending ? 'Création…' : 'Créer mon compte'}
      </Button>
    </form>
  )
}
