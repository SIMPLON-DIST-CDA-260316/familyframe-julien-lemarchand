import { MenuIcon } from 'lucide-react'
import { type JSX, useState } from 'react'
import { NavLink } from 'react-router'
import { LogoutButton } from '@/components/auth/LogoutButton.tsx'
import { UserBadge } from '@/components/auth/UserBadge.tsx'
import { useNavItems } from '@/components/nav/navItems.ts'
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

export function MobileNav(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const items = useNavItems()

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
        <nav className="flex flex-col gap-1 px-2">
          {items.map(({ to, label, icon: Icon }) => (
            // end: "/" would otherwise stay active on every page.
            <NavLink
              key={to}
              to={to}
              end
              className={navLinkClasses}
              onClick={() => setIsOpen(false)}
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t p-2">
          <LogoutButton />
        </div>
      </SheetContent>
    </Sheet>
  )
}
