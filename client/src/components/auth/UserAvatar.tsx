import type { JSX } from 'react'
import { cn } from '@/lib/utils.ts'

type UserAvatarProps = { name: string; className?: string }

export function UserAvatar({ name, className }: UserAvatarProps): JSX.Element {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground uppercase',
        className,
      )}
    >
      {name.charAt(0)}
    </span>
  )
}
