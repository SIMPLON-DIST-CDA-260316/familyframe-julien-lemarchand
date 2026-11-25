import type { JSX } from 'react'
import { Link } from 'react-router'
import { UserMenu } from '@/components/auth/UserMenu.tsx'
import { OfflineBanner } from '@/components/feedback/OfflineBanner.tsx'
import { DesktopNav } from '@/components/nav/DesktopNav.tsx'

export function AccountBar(): JSX.Element {
  return (
    // The bar's own background runs under the notch; its content stays below it.
    <header className="sticky top-0 z-20 border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 py-3 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
        <Link to="/" className="mr-4 text-lg font-semibold tracking-tight">
          FamilyFrame
        </Link>
        <DesktopNav />
        {/* On a phone too: the tab bar holds the pages, this menu the account and the logout. */}
        <div className="ml-auto">
          <UserMenu />
        </div>
      </div>
      {/* In the sticky header: the notice stays in view while the page scrolls. */}
      <OfflineBanner />
    </header>
  )
}
