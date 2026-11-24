import { UserPlusIcon, UsersIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/auth/AuthContext.ts'
import { LogoutButton } from '@/components/auth/LogoutButton.tsx'
import { Button } from '@/components/ui/button.tsx'

export function LibraryActions(): JSX.Element {
  const { user } = useAuth()

  return (
    <div className="flex gap-1">
      <Button asChild variant="ghost" size="sm">
        <Link to="/friends">
          <UsersIcon aria-hidden data-icon="inline-start" />
          Amis
        </Link>
      </Button>
      {user?.role === 'admin' && (
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/invitations">
            <UserPlusIcon aria-hidden data-icon="inline-start" />
            Invitations
          </Link>
        </Button>
      )}
      <LogoutButton />
    </div>
  )
}
