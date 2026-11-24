import type { JSX } from 'react'
import { cn } from '@/lib/utils.ts'

// avatarUrl: null or absent shows the initial, as before any profile photo.
type UserAvatarProps = { name: string; avatarUrl?: string | null; className?: string }

const AVATAR_CLASSES =
  'grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground uppercase'

// Decorative (aria-hidden, empty alt): the name is always written next to it.
export function UserAvatar({ name, avatarUrl, className }: UserAvatarProps): JSX.Element {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        aria-hidden
        className={cn(AVATAR_CLASSES, 'object-cover', className)}
      />
    )
  }
  return (
    <span aria-hidden className={cn(AVATAR_CLASSES, className)}>
      {name.charAt(0)}
    </span>
  )
}
