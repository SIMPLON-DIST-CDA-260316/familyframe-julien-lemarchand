import type { JSX } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { UserAvatar } from '@/components/auth/UserAvatar.tsx'
import { Badge } from '@/components/ui/badge.tsx'

export function UserBadge(): JSX.Element | null {
  const { user } = useAuth()
  if (user === null) return null

  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar name={user.displayName} />
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="flex items-center gap-2 truncate text-sm font-medium">
          {user.displayName}
          {user.role === 'admin' && <Badge variant="secondary">Admin</Badge>}
        </span>
        <span className="truncate text-xs text-muted-foreground">{user.email}</span>
      </div>
    </div>
  )
}
