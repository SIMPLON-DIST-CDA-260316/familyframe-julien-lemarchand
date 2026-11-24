import type { JSX } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { AvatarCard } from '@/components/settings/AvatarCard.tsx'
import { DisplayNameCard } from '@/components/settings/DisplayNameCard.tsx'
import { EmailCard } from '@/components/settings/EmailCard.tsx'
import { PasswordCard } from '@/components/settings/PasswordCard.tsx'

export default function SettingsPage(): JSX.Element | null {
  const { user } = useAuth()
  // RequireAuth renders this page only with a user: the check only narrows the type.
  if (user === null) return null

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Préférences</h1>
        <p className="text-sm text-muted-foreground">
          Votre profil et la sécurité de votre compte.
        </p>
      </header>
      <AvatarCard name={user.displayName} avatarUrl={user.avatarUrl} />
      <DisplayNameCard displayName={user.displayName} />
      <EmailCard email={user.email} />
      <PasswordCard />
    </main>
  )
}
