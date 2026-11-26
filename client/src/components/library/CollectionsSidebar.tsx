import { type JSX, type RefObject, useState } from 'react'
import { CollectionList } from '@/components/collections/CollectionList.tsx'
import { NewCollectionDialog } from '@/components/collections/NewCollectionDialog.tsx'

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
    <nav aria-label="Collections" className="hidden w-52 shrink-0 md:block">
      <CollectionList
        selectedId={selectedId}
        onCreate={() => setIsCreating(true)}
        allPhotosRef={allPhotosRef}
      />
      <NewCollectionDialog isOpen={isCreating} onClose={() => setIsCreating(false)} />
    </nav>
  )
}
