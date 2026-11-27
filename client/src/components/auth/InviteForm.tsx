import { type JSX, type SubmitEvent, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import {
  DISPLAY_NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MISMATCH_MESSAGE,
} from '@/auth/accountRules.ts'
import { TextField } from '@/components/form/TextField.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'

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

type InviteFormProps = { token: string; onJoiningChange: (isJoining: boolean) => void }

function useInviteFields(): InviteFieldsState {
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const setField = (name: keyof InviteFields, value: string): void =>
    setFields((current) => ({ ...current, [name]: value }))
  return { fields, setField }
}

function useInviteForm({ token, onJoiningChange }: InviteFormProps): InviteFormState {
  const { acceptInvitation } = useAuth()
  const { fields, setField } = useInviteFields()
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (fields.password !== fields.confirmation) {
      setError(PASSWORD_MISMATCH_MESSAGE)
      return
    }
    setError('')
    setIsSending(true)
    // Raised before the request: when the user is set, the page already knows to go home.
    onJoiningChange(true)
    const { displayName, password } = fields
    const result = await acceptInvitation({ token, displayName, password })
    if (result.isSuccess) return
    onJoiningChange(false)
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

export function InviteForm(props: InviteFormProps): JSX.Element {
  const { fields, setField, isSending, error, handleSubmit } = useInviteForm(props)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <TextField
        id="display-name"
        enterKeyHint="go"
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
