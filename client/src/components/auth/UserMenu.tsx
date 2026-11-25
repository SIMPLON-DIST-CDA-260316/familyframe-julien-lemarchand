import { LogOutIcon, SettingsIcon, UserPlusIcon } from 'lucide-react'
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

// On a computer the top bar lists « Invitations »; a phone's tab bar has no room for it.
function PhoneInvitationsItem(): JSX.Element {
  return (
    <DropdownMenuItem asChild className="md:hidden">
      <Link to="/admin/invitations">
        <UserPlusIcon aria-hidden />
        Invitations
      </Link>
    </DropdownMenuItem>
  )
}

export function UserMenu(): JSX.Element | null {
  const { user, logout } = useAuth()
  if (user === null) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        // A finger gets 44 px around the avatar; a mouse keeps the avatar's own size.
        className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:grid pointer-coarse:size-11 pointer-coarse:place-items-center"
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
        {user.role === 'admin' && <PhoneInvitationsItem />}
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
