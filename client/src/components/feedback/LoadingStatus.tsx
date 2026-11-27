import type { JSX, ReactNode } from 'react'

type LoadingStatusProps = {
  className?: string
  // The skeletons: shapes only, hidden from screen readers.
  children: ReactNode
}

// The skeletons say nothing to a screen reader: the status says it instead.
export function LoadingStatus({ className, children }: LoadingStatusProps): JSX.Element {
  return (
    <div role="status" className={className}>
      <span className="sr-only">Chargement…</span>
      <div aria-hidden className="contents">
        {children}
      </div>
    </div>
  )
}
