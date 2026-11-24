import { LogOutIcon } from 'lucide-react'
import type { JSX } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { UserAvatar } from '@/components/auth/UserAvatar.tsx'
import { UserBadge } from '@/components/auth/UserBadge.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx'

export function UserMenu(): JSX.Element | null {
  const { user, logout } = useAuth()
  if (user === null) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label="Menu du compte"
      >
        <UserAvatar name={user.displayName} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <UserBadge />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout}>
          <LogOutIcon aria-hidden />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
