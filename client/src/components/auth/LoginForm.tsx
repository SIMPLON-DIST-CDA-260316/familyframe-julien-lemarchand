import { type JSX, type SubmitEvent, useState } from 'react'
import type { LoginResult } from '@/auth/authApi.ts'
import { PasswordInput } from '@/components/form/PasswordInput.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'

type LoginFormProps = {
  onLogin: (email: string, password: string) => Promise<LoginResult>
}

export function LoginForm({ onLogin }: LoginFormProps): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  // On success the provider sets the user and LoginPage redirects: nothing to do here.
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError('')
    setIsSending(true)
    const result = await onLogin(email, password)
    if (!result.isSuccess) {
      setError(result.message)
      setIsSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Mot de passe</Label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" size="lg" disabled={isSending}>
        {isSending ? 'Connexion…' : 'Se connecter'}
      </Button>
    </form>
  )
}
