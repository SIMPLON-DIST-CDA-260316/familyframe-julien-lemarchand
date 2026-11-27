import type { JSX } from 'react'
import { NavLink } from 'react-router'
import { useNavItems } from '@/components/nav/navItems.ts'
import { cn } from '@/lib/utils.ts'

function navLinkClasses({ isActive }: { isActive: boolean }): string {
  return cn(
    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground',
    isActive && 'bg-muted text-foreground',
  )
}

export function DesktopNav(): JSX.Element {
  const items = useNavItems()
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map(({ to, label, icon: Icon, onClick }) => (
        // end: "/" would otherwise stay active on every page.
        <NavLink key={to} to={to} end className={navLinkClasses} onClick={onClick}>
          <Icon aria-hidden className="size-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
