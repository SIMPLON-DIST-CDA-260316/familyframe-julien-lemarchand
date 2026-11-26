import { cn } from 'cn'
import type { JSX, ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

// Every page under the account bar: as wide as the bar, so the title starts under the logo.
// pb-24 below md: a page's floating button never covers its last line.
export function PageMain({ children, className }: Props): JSX.Element {
  return (
    <main
      className={cn(
        'mx-auto flex w-full max-w-page flex-col gap-8 px-4 pt-10 pb-24 md:pb-10',
        className,
      )}
    >
      {children}
    </main>
  )
}

// Forms and lists: narrower than the page, left-aligned under the title, so rows stay easy to scan.
export function ReadingColumn({ children }: { children: ReactNode }): JSX.Element {
  return <div className="flex w-full max-w-reading flex-col gap-8">{children}</div>
}
