import type { JSX } from 'react'
import { useParams } from 'react-router'
import { useAuth } from '@/auth/AuthContext.ts'
import { InviteForm } from '@/components/auth/InviteForm.tsx'
import { LogoutButton } from '@/components/auth/LogoutButton.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'

// An admin testing his own link must not burn it, nor lose his session without a word.
function LoggedInCard({ displayName }: { displayName: string }): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Rejoindre FamilyFrame</CardTitle>
        <CardDescription>
          Vous êtes connecté en tant que {displayName}. Déconnectez-vous pour utiliser cette
          invitation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LogoutButton />
      </CardContent>
    </Card>
  )
}

function JoinCard({ token }: { token: string }): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Rejoindre FamilyFrame</CardTitle>
        <CardDescription>Choisissez votre nom et votre mot de passe.</CardDescription>
      </CardHeader>
      <CardContent>
        <InviteForm token={token} />
      </CardContent>
    </Card>
  )
}

export default function InvitePage(): JSX.Element | null {
  const { user, isLoading } = useAuth()
  // The route always has the segment; an empty token is refused by the server like any other.
  const { token = '' } = useParams()

  // As on /login: no form flashing while /api/auth/me answers.
  if (isLoading) return null

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      {user === null ? <JoinCard token={token} /> : <LoggedInCard displayName={user.displayName} />}
    </main>
  )
}
