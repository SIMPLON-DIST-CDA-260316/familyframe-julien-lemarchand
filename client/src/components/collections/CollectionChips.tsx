import { type JSX, useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { useCollections } from '@/collections/CollectionsContext.ts'
import { cn } from '@/lib/utils.ts'
import { libraryPath } from '@/viewerHistory.ts'

// 44 px under a finger, the size touch guidelines ask for; a mouse keeps the compact chip.
const CHIP_CLASSES =
  'inline-flex h-9 max-w-64 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:h-11'

type CollectionChipsProps = { selectedId: string | null }

type ChipLinkProps = { collectionId: string | null; isSelected: boolean; label: string }

// A link, not a button: each collection has its own address, so back and reload keep it.
function ChipLink({ collectionId, isSelected, label }: ChipLinkProps): JSX.Element {
  const linkRef = useRef<HTMLAnchorElement>(null)
  // After a reload on a collection far along the row, its chip scrolls into sight.
  useEffect(() => {
    if (isSelected) linkRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [isSelected])
  return (
    <Link
      ref={linkRef}
      to={libraryPath(collectionId)}
      aria-current={isSelected ? 'page' : undefined}
      title={label}
      className={cn(
        CHIP_CLASSES,
        isSelected && 'border-primary bg-primary text-primary-foreground hover:bg-primary/85',
      )}
    >
      <span className="truncate">{label}</span>
    </Link>
  )
}

// Only this row scrolls sideways; it reaches the screen edges so a cut chip says « more ».
export function CollectionChips({ selectedId }: CollectionChipsProps): JSX.Element {
  const { collections, status } = useCollections()
  return (
    <nav aria-label="Collections" className="-mx-4 overflow-x-auto px-4 py-1">
      <ul className="flex w-max items-center gap-2">
        <li>
          <ChipLink collectionId={null} isSelected={selectedId === null} label="Toutes" />
        </li>
        {collections.map(({ id, name }) => (
          <li key={id}>
            <ChipLink collectionId={id} isSelected={id === selectedId} label={name} />
          </li>
        ))}
        {status === 'failed' && (
          <li className="text-sm text-muted-foreground">
            Vos collections n'ont pas pu être chargées.
          </li>
        )}
      </ul>
    </nav>
  )
}
