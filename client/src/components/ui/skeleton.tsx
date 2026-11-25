import { cn } from 'cn'
import type * as React from 'react'

// shadcn's skeleton, standing still when the device asks for less motion.
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-accent motion-reduce:animate-none', className)}
      {...props}
    />
  )
}

export { Skeleton }
