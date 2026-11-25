import { ImagesIcon, type LucideIcon, MonitorIcon, SendIcon, UsersIcon } from 'lucide-react'
import type { JSX } from 'react'
import { NavLink, useLocation } from 'react-router'
import { enterFullscreen } from '@/fullscreen.ts'
import { LIBRARY_BELOW_STATE } from '@/viewerHistory.ts'

type Tab = { to: string; label: string; icon: LucideIcon }

const LIBRARY_TAB: Tab = { to: '/', label: 'Bibliothèque', icon: ImagesIcon }
const SEND_TAB: Tab = { to: '/send', label: 'Envoyer', icon: SendIcon }
const FRIENDS_TAB: Tab = { to: '/friends', label: 'Amis', icon: UsersIcon }

// NavLink sets aria-current="page" on the active tab: the styles read it.
const TAB_CLASSES =
  'group flex h-(--tab-bar-height) flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:text-foreground'
const ICON_PILL_CLASSES =
  'flex h-7 w-12 items-center justify-center rounded-full transition-colors group-aria-[current=page]:bg-muted'

function TabLink({ to, label, icon: Icon }: Tab): JSX.Element {
  return (
    // end: "/" would otherwise stay active on every page.
    <NavLink to={to} end className={TAB_CLASSES}>
      <span className={ICON_PILL_CLASSES}>
        <Icon aria-hidden className="size-5" />
      </span>
      {label}
    </NavLink>
  )
}

// Full screen is asked in the click itself: browsers grant it only during a user gesture. From
// the library, the state lets leaving the frame go back to that library entry, as « Mode cadre ».
function FrameTabLink(): JSX.Element {
  const { pathname } = useLocation()
  return (
    <NavLink
      to="/frame"
      state={pathname === '/' ? LIBRARY_BELOW_STATE : null}
      onClick={enterFullscreen}
      className={TAB_CLASSES}
    >
      <span className={ICON_PILL_CLASSES}>
        <MonitorIcon aria-hidden className="size-5" />
      </span>
      Cadre
    </NavLink>
  )
}

// Below md only: a phone's thumb reaches the bottom edge, not a menu in the top corner. The
// account is not a tab: it is set once, from the avatar menu at the top.
export function MobileTabBar(): JSX.Element {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        <li>
          <TabLink {...LIBRARY_TAB} />
        </li>
        <li>
          <TabLink {...SEND_TAB} />
        </li>
        <li>
          <FrameTabLink />
        </li>
        <li>
          <TabLink {...FRIENDS_TAB} />
        </li>
      </ul>
    </nav>
  )
}
