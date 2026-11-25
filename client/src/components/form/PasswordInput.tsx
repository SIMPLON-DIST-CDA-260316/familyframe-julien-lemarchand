import { Eye, EyeOff } from 'lucide-react'
import { type ComponentProps, type JSX, useState } from 'react'
import { Input } from '@/components/ui/input.tsx'

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'>

export function PasswordInput(props: PasswordInputProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(false)
  const Icon = isVisible ? EyeOff : Eye

  return (
    <div className="relative">
      <Input {...props} type={isVisible ? 'text' : 'password'} className="pr-9" />
      <button
        type="button"
        onClick={() => setIsVisible((visible) => !visible)}
        aria-label={isVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        aria-pressed={isVisible}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <Icon className="size-4" />
      </button>
    </div>
  )
}
