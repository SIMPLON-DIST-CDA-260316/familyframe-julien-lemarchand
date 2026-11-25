import { type JSX, type ReactNode, type RefObject, useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils.ts'
import { libraryPath } from '@/viewerHistory.ts'

// 150 px on a phone, 180 from sm: on a 360 px screen the third card is cut, which says « more ».
export const CARD_CLASSES =
  'group flex w-[150px] flex-col gap-1.5 text-left outline-none sm:w-[180px]'

// The cover carries the focus and selection rings; the text under it stays plain.
export const COVER_CLASSES =
  'grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground ring-offset-2 ring-offset-background transition-opacity group-hover:opacity-90 group-focus-visible:ring-3 group-focus-visible:ring-ring'

type CardTextProps = { label: string; detail: string | null }

type CollectionCardProps = CardTextProps & {
  collectionId: string | null
  isSelected: boolean
  cover: ReactNode
  linkRef?: RefObject<HTMLAnchorElement | null>
}

// Under the cover rather than over it: readable on any photo, in either theme, with no gradient.
export function CardText({ label, detail }: CardTextProps): JSX.Element {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-sm font-medium">{label}</span>
      <span className="min-h-4 text-xs text-muted-foreground">{detail}</span>
    </span>
  )
}

// A link, not a button: each collection has its own address, so back and reload keep it.
export function CollectionCard({
  collectionId,
  isSelected,
  cover,
  ...props
}: CollectionCardProps): JSX.Element {
  const ownRef = useRef<HTMLAnchorElement>(null)
  const linkRef = props.linkRef ?? ownRef
  // After a reload on a collection far along the row, its card scrolls into sight.
  useEffect(() => {
    if (isSelected) linkRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [isSelected, linkRef])
  return (
    <Link
      ref={linkRef}
      to={libraryPath(collectionId)}
      aria-current={isSelected ? 'page' : undefined}
      title={props.label}
      className={CARD_CLASSES}
    >
      <span className={cn(COVER_CLASSES, isSelected && 'ring-3 ring-primary')}>{cover}</span>
      <CardText label={props.label} detail={props.detail} />
    </Link>
  )
}
