import { type JSX, type RefObject, useState } from 'react'
import { CollectionList } from '@/components/collections/CollectionList.tsx'
import { NewCollectionDialog } from '@/components/collections/NewCollectionDialog.tsx'
import { cn } from '@/lib/utils.ts'

// It stays in view under the account bar while the photos scroll, and a long list scrolls inside
// it. p-1 and -m-1 leave room for the entries' focus ring, which the scroll box would clip; w-54
// is w-52 plus that padding, so the entries keep their width.
const STICKY_CLASSES =
  'sticky top-[calc(var(--account-bar-bottom)_+_1.5rem)] -m-1 max-h-[calc(100svh_-_var(--account-bar-bottom)_-_3rem)] self-start overflow-y-auto p-1'

type CollectionsSidebarProps = {
  selectedId: string | null
  allPhotosRef: RefObject<HTMLAnchorElement | null>
}

// A computer's picker, beside the photos; a phone opens the same list from the title.
export function CollectionsSidebar({
  selectedId,
  allPhotosRef,
}: CollectionsSidebarProps): JSX.Element {
  const [isCreating, setIsCreating] = useState(false)
  return (
    <nav aria-label="Collections" className={cn('hidden w-54 shrink-0 md:block', STICKY_CLASSES)}>
      <CollectionList
        selectedId={selectedId}
        onCreate={() => setIsCreating(true)}
        allPhotosRef={allPhotosRef}
      />
      <NewCollectionDialog isOpen={isCreating} onClose={() => setIsCreating(false)} />
    </nav>
  )
}
