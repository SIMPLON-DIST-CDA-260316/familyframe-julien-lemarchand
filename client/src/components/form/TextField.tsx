import type { ChangeEvent, InputHTMLAttributes, JSX } from 'react'
import { PasswordInput } from '@/components/form/PasswordInput.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'

type TextFieldProps = {
  id: string
  label: string
  type: 'email' | 'password' | 'text'
  autoComplete: string
  value: string
  onChange: (value: string) => void
  minLength?: number
  maxLength?: number
  // The last field of a form names its return key: « go », « send », « done ».
  enterKeyHint?: InputHTMLAttributes<HTMLInputElement>['enterKeyHint']
}

// A phone would capitalise or « correct » an address: it would no longer match the account.
export const EMAIL_KEYBOARD_PROPS: InputHTMLAttributes<HTMLInputElement> = {
  autoCapitalize: 'none',
  autoCorrect: 'off',
  spellCheck: false,
}

// Every field of the invitation and settings forms is required: an empty one never reaches the API.
export function TextField({
  id,
  label,
  value,
  onChange,
  type,
  ...inputProps
}: TextFieldProps): JSX.Element {
  const fieldProps = {
    id,
    value,
    onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
    required: true,
    ...inputProps,
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {type === 'password' ? (
        <PasswordInput {...fieldProps} />
      ) : (
        <Input type={type} {...(type === 'email' ? EMAIL_KEYBOARD_PROPS : {})} {...fieldProps} />
      )}
    </div>
  )
}
