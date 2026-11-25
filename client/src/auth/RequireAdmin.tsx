import type { JSX, ReactNode } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { BackToLibraryLink } from '@/components/library/BackToLibraryLink.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'

function AdminOnlyCard(): JSX.Element {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Invitations</CardTitle>
          <CardDescription>Cette page est réservée à l'administrateur.</CardDescription>
        </CardHeader>
        <CardContent>
          <BackToLibraryLink />
        </CardContent>
      </Card>
    </main>
  )
}

// Inside RequireAuth, so a user is there. The server's 403 is the real protection: this card
// only says why, instead of a silent redirect.
export function RequireAdmin({ children }: { children: ReactNode }): ReactNode {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <AdminOnlyCard />
  return children
}
