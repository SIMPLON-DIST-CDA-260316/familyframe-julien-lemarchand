import { UserPlusIcon, UsersIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/auth/AuthContext.ts'
import { Button } from '@/components/ui/button.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'

export function FriendsCallToAction(): JSX.Element {
  const { user } = useAuth()

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Vos proches</CardTitle>
        <CardDescription>Ajoutez vos proches en amis pour leur envoyer des photos.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/friends">
            <UsersIcon aria-hidden data-icon="inline-start" />
            Gérer mes amis
          </Link>
        </Button>
        {user?.role === 'admin' && (
          <Button asChild variant="outline">
            <Link to="/admin/invitations">
              <UserPlusIcon aria-hidden data-icon="inline-start" />
              Inviter un proche sur FamilyFrame
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
