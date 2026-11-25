import { MenuIcon, SettingsIcon } from 'lucide-react'
import { type JSX, useState } from 'react'
import { NavLink } from 'react-router'
import { LogoutButton } from '@/components/auth/LogoutButton.tsx'
import { UserBadge } from '@/components/auth/UserBadge.tsx'
import { useNavItems } from '@/components/nav/navItems.ts'
import { ThemeToggle } from '@/components/theme/ThemeToggle.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet.tsx'
import { cn } from '@/lib/utils.ts'

function navLinkClasses({ isActive }: { isActive: boolean }): string {
  return cn(
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted',
    isActive && 'bg-muted text-foreground',
  )
}

// onNavigate closes the sheet; an item's own onClick (the frame's full screen) runs in the same click.
function MobileNavLinks({ onNavigate }: { onNavigate: () => void }): JSX.Element {
  const items = useNavItems()
  return (
    <nav className="flex flex-col gap-1 px-2">
      {items.map(({ to, label, icon: Icon, onClick }) => (
        // end: "/" would otherwise stay active on every page.
        <NavLink
          key={to}
          to={to}
          end
          className={navLinkClasses}
          onClick={() => {
            onNavigate()
            onClick?.()
          }}
        >
          <Icon aria-hidden className="size-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function MobileNav(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir le menu">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader className="border-b">
          <SheetTitle>FamilyFrame</SheetTitle>
          <SheetDescription className="sr-only">Navigation</SheetDescription>
          <UserBadge />
        </SheetHeader>
        <MobileNavLinks onNavigate={() => setIsOpen(false)} />
        <div className="mt-auto flex flex-col border-t p-2">
          {/* With the account actions, not in the pages list: it is about me, not a place. */}
          <NavLink to="/settings" className={navLinkClasses} onClick={() => setIsOpen(false)}>
            <SettingsIcon aria-hidden className="size-4" />
            Préférences
          </NavLink>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </SheetContent>
    </Sheet>
  )
}
