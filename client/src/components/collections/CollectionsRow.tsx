import { FolderIcon, ImagesIcon, PlusIcon } from 'lucide-react'
import { type JSX, type RefObject, useState } from 'react'
import { useNavigate } from 'react-router'
import { useCollections } from '@/collections/CollectionsContext.ts'
import type { Collection } from '@/collections/collection.ts'
import {
  CARD_CLASSES,
  CardText,
  COVER_CLASSES,
  CollectionCard,
} from '@/components/collections/CollectionCard.tsx'
import { CollectionNameDialog } from '@/components/collections/CollectionNameDialog.tsx'
import { photoCountLabel } from '@/components/library/libraryTexts.ts'
import { libraryPath } from '@/viewerHistory.ts'

const ICON_CLASSES = 'size-8'

type CollectionsRowProps = {
  selectedId: string | null
  allCardRef: RefObject<HTMLAnchorElement | null>
}

// Its newest photo, or a neutral folder while it is empty. alt="": the name under it says it.
function CollectionCover({ coverUrl }: Pick<Collection, 'coverUrl'>): JSX.Element {
  if (coverUrl === null) return <FolderIcon aria-hidden className={ICON_CLASSES} />
  return (
    <img src={coverUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
  )
}

// The new collection opens at once: it is empty, its notice tells how to fill it.
function NewCollectionCard(): JSX.Element {
  const [isCreating, setIsCreating] = useState(false)
  const navigate = useNavigate()
  return (
    <>
      <button type="button" className={CARD_CLASSES} onClick={() => setIsCreating(true)}>
        <span className={COVER_CLASSES}>
          <PlusIcon aria-hidden className={ICON_CLASSES} />
        </span>
        <CardText label="Nouvelle collection" detail={null} />
      </button>
      <CollectionNameDialog
        target={isCreating ? { kind: 'create' } : null}
        onClose={() => setIsCreating(false)}
        onSaved={(collection) => navigate(libraryPath(collection.id))}
      />
    </>
  )
}

type AllPhotosCardProps = { isSelected: boolean; linkRef: RefObject<HTMLAnchorElement | null> }

// The whole library: no single photo stands for it, an icon does.
function AllPhotosCard({ isSelected, linkRef }: AllPhotosCardProps): JSX.Element {
  return (
    <CollectionCard
      collectionId={null}
      isSelected={isSelected}
      label="Toutes"
      detail={null}
      cover={<ImagesIcon aria-hidden className={ICON_CLASSES} />}
      linkRef={linkRef}
    />
  )
}

function CollectionCards({ selectedId }: Pick<CollectionsRowProps, 'selectedId'>): JSX.Element {
  const { collections } = useCollections()
  return (
    <>
      {collections.map(({ id, name, photoIds, coverUrl }) => (
        <li key={id} className="snap-start">
          <CollectionCard
            collectionId={id}
            isSelected={id === selectedId}
            label={name}
            detail={photoCountLabel(photoIds.length)}
            cover={<CollectionCover coverUrl={coverUrl} />}
          />
        </li>
      ))}
    </>
  )
}

// Only this row scrolls sideways, snapping card by card; it reaches the screen edges so a cut
// card says « more », and scroll-px-4 stops the first card on the header's edge.
// allCardRef: the page focuses « Toutes » once the shown collection is deleted.
export function CollectionsRow({ selectedId, allCardRef }: CollectionsRowProps): JSX.Element {
  const { status } = useCollections()
  return (
    <nav
      aria-label="Collections"
      className="-mx-4 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 py-1.5"
    >
      <ul className="flex w-max items-start gap-3">
        <li className="snap-start">
          <AllPhotosCard isSelected={selectedId === null} linkRef={allCardRef} />
        </li>
        <CollectionCards selectedId={selectedId} />
        {status === 'failed' && (
          <li className="w-[150px] text-sm text-muted-foreground">
            Vos collections n'ont pas pu être chargées.
          </li>
        )}
        <li className="snap-start">
          <NewCollectionCard />
        </li>
      </ul>
    </nav>
  )
}
