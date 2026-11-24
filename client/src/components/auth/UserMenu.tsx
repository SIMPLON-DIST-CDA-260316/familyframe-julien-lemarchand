import { LogOutIcon, SettingsIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/auth/AuthContext.ts'
import { UserAvatar } from '@/components/auth/UserAvatar.tsx'
import { UserBadge } from '@/components/auth/UserBadge.tsx'
import { ThemeToggle } from '@/components/theme/ThemeToggle.tsx'
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
        <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <UserBadge />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <SettingsIcon aria-hidden />
            Préférences
          </Link>
        </DropdownMenuItem>
        <ThemeToggle />
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout}>
          <LogOutIcon aria-hidden />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
