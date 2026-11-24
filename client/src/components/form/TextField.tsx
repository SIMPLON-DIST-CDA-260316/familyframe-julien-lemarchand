import type { JSX } from 'react'
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
}

// Every field of the invitation forms is required: an empty one never reaches the API.
export function TextField({
  id,
  label,
  value,
  onChange,
  ...inputProps
}: TextFieldProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        {...inputProps}
      />
    </div>
  )
}
