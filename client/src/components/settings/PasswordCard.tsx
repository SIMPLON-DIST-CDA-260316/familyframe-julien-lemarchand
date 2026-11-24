import { type JSX, useState } from 'react'
import { putPassword } from '@/accountApi.ts'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MISMATCH_MESSAGE,
} from '@/auth/accountRules.ts'
import { TextField } from '@/components/form/TextField.tsx'
import { SettingsCard } from '@/components/settings/SettingsCard.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { type AccountSave, useAccountSave } from '@/hooks/useAccountSave.ts'

type PasswordFields = { current: string; next: string; confirmation: string }

type FieldsState = {
  fields: PasswordFields
  setField: (name: keyof PasswordFields, value: string) => void
}

type PasswordForm = FieldsState & {
  save: AccountSave
  isMismatch: boolean
  submit: () => Promise<void>
}

const EMPTY_FIELDS: PasswordFields = { current: '', next: '', confirmation: '' }

function usePasswordForm(): PasswordForm {
  const save = useAccountSave()
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [isMismatch, setIsMismatch] = useState(false)
  const setField = (name: keyof PasswordFields, value: string): void =>
    setFields((current) => ({ ...current, [name]: value }))

  async function submit(): Promise<void> {
    const isTypo = fields.next !== fields.confirmation
    setIsMismatch(isTypo)
    if (isTypo) return
    // Passwords do not stay on screen once saved.
    if (await save.run(() => putPassword(fields.current, fields.next))) setFields(EMPTY_FIELDS)
  }

  return { fields, setField, save, isMismatch, submit }
}

function NewPasswordFields({ fields, setField }: FieldsState): JSX.Element {
  const limits = { minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH }
  return (
    <>
      <TextField
        id="new-password"
        label="Nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        {...limits}
        value={fields.next}
        onChange={(value) => setField('next', value)}
      />
      <TextField
        id="new-password-confirmation"
        label="Confirmer le nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        {...limits}
        value={fields.confirmation}
        onChange={(value) => setField('confirmation', value)}
      />
    </>
  )
}

export function PasswordCard(): JSX.Element {
  const { fields, setField, save, isMismatch, submit } = usePasswordForm()

  return (
    <SettingsCard
      title="Mot de passe"
      description="Les autres appareils connectés à votre compte, le cadre compris, devront se reconnecter avec le nouveau mot de passe."
      save={save}
      onSubmit={submit}
    >
      <TextField
        id="current-password"
        label="Mot de passe actuel"
        type="password"
        autoComplete="current-password"
        value={fields.current}
        onChange={(value) => setField('current', value)}
      />
      <NewPasswordFields fields={fields} setField={setField} />
      {isMismatch && (
        <Alert variant="destructive">
          <AlertDescription>{PASSWORD_MISMATCH_MESSAGE}</AlertDescription>
        </Alert>
      )}
    </SettingsCard>
  )
}
