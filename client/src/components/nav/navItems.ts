import { ImagesIcon, type LucideIcon, MonitorIcon, UserPlusIcon, UsersIcon } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext.ts'
import { enterFullscreen } from '@/fullscreen.ts'

// onClick runs in the click itself: the frame's full screen needs that user gesture.
export type NavItem = { to: string; label: string; icon: LucideIcon; onClick?: () => void }

const MEMBER_ITEMS: NavItem[] = [
  { to: '/', label: 'Ma bibliothèque', icon: ImagesIcon },
  { to: '/frame', label: 'Cadre', icon: MonitorIcon, onClick: enterFullscreen },
  { to: '/friends', label: 'Amis', icon: UsersIcon },
]
const ADMIN_ITEM: NavItem = { to: '/admin/invitations', label: 'Invitations', icon: UserPlusIcon }

export function useNavItems(): NavItem[] {
  const { user } = useAuth()
  return user?.role === 'admin' ? [...MEMBER_ITEMS, ADMIN_ITEM] : MEMBER_ITEMS
}
