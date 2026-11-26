import type { JSX } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { PageMain, ReadingColumn } from '@/components/layout/PageMain.tsx'
import { AvatarCard } from '@/components/settings/AvatarCard.tsx'
import { DisplayNameCard } from '@/components/settings/DisplayNameCard.tsx'
import { EmailCard } from '@/components/settings/EmailCard.tsx'
import { FrameSettingsCard } from '@/components/settings/FrameSettingsCard.tsx'
import { PasswordCard } from '@/components/settings/PasswordCard.tsx'

export default function SettingsPage(): JSX.Element | null {
  const { user } = useAuth()
  // RequireAuth renders this page only with a user: the check only narrows the type.
  if (user === null) return null

  return (
    <PageMain>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Préférences</h1>
        <p className="text-sm text-muted-foreground">
          Votre profil, la sécurité de votre compte et le cadre de cet appareil.
        </p>
      </header>
      <ReadingColumn>
        <AvatarCard name={user.displayName} avatarUrl={user.avatarUrl} />
        <DisplayNameCard displayName={user.displayName} />
        <EmailCard email={user.email} />
        <PasswordCard />
        <FrameSettingsCard />
      </ReadingColumn>
    </PageMain>
  )
}
