import type { JSX } from 'react'
import { Link } from 'react-router'
import { UserMenu } from '@/components/auth/UserMenu.tsx'
import { DesktopNav } from '@/components/nav/DesktopNav.tsx'
import { MobileNav } from '@/components/nav/MobileNav.tsx'

export function AccountBar(): JSX.Element {
  return (
    // The bar's own background runs under the notch; its content stays below it.
    <header className="sticky top-0 z-20 border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 py-3 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
        <MobileNav />
        <Link to="/" className="mr-4 text-lg font-semibold tracking-tight">
          FamilyFrame
        </Link>
        <DesktopNav />
        {/* On mobile the burger menu holds the account and the logout. */}
        <div className="ml-auto hidden md:block">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
