import type { JSX, ReactNode } from 'react'
import type { PhotoDay } from '@/photoDays.ts'

type DateGroupProps = {
  day: PhotoDay
  // The day's photos, as tiles or rows.
  children: ReactNode
}

// A heading per day: screen readers can jump from one day to the next.
export function DateGroup({ day, children }: DateGroupProps): JSX.Element {
  const headingId = `day-${day.key}`
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-sm font-semibold">
        {day.label}
      </h2>
      {children}
    </section>
  )
}
