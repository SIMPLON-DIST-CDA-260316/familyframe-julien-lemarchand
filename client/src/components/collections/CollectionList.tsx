import { CheckIcon, FolderIcon, ImagesIcon, PlusIcon } from 'lucide-react'
import type { JSX, ReactNode, RefObject } from 'react'
import { Link } from 'react-router'
import { useCollections } from '@/collections/CollectionsContext.ts'
import type { Collection } from '@/collections/collection.ts'
import { collectionSummary } from '@/components/collections/collectionSummary.ts'
import { Button } from '@/components/ui/button.tsx'
import { cn } from '@/lib/utils.ts'
import { libraryPath } from '@/viewerHistory.ts'

// One list for the computer's sidebar and the phone's sheet, which never show together: the md:
// classes give the sidebar its small rows, the rest is the sheet's 44 px touch rows.
const ENTRY_CLASSES =
  'flex min-h-14 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-secondary aria-[current=page]:font-medium md:min-h-9 md:gap-2.5'
const COVER_CLASSES =
  'grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground md:size-7 md:rounded-md [&_svg]:size-5 md:[&_svg]:size-4'

type CollectionListProps = {
  selectedId: string | null
  onCreate: () => void
  // The sheet closes once a choice is made; the sidebar stays.
  onChoose?: () => void
  // The page focuses it once the shown collection is deleted.
  allPhotosRef?: RefObject<HTMLAnchorElement | null>
}

type EntryProps = {
  collectionId: string | null
  isSelected: boolean
  cover: ReactNode
  name: string
  // Under the name on a phone, where the sheet has room for the period.
  detail: string | null
  // On the right on a computer: the number alone.
  count: number | null
  onChoose?: () => void
  linkRef?: RefObject<HTMLAnchorElement | null>
}

// Its newest photo, or a neutral folder while it is empty. alt="": the name beside it says it.
function CollectionCover({ coverUrl }: Pick<Collection, 'coverUrl'>): JSX.Element {
  if (coverUrl === null) return <FolderIcon aria-hidden />
  return (
    <img src={coverUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
  )
}

function EntryText({ name, detail }: Pick<EntryProps, 'name' | 'detail'>): JSX.Element {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate">{name}</span>
      {detail !== null && (
        <span className="truncate text-xs font-normal text-muted-foreground md:hidden">
          {detail}
        </span>
      )}
    </span>
  )
}

// A link, not a button: each collection has its own address, so back and reload keep it.
function Entry({ collectionId, isSelected, cover, count, ...props }: EntryProps): JSX.Element {
  return (
    <Link
      ref={props.linkRef}
      to={libraryPath(collectionId)}
      aria-current={isSelected ? 'page' : undefined}
      title={props.name}
      onClick={props.onChoose}
      className={ENTRY_CLASSES}
    >
      <span className={COVER_CLASSES}>{cover}</span>
      <EntryText name={props.name} detail={props.detail} />
      {count !== null && (
        <span className="hidden text-xs text-muted-foreground tabular-nums md:block">{count}</span>
      )}
      {isSelected && <CheckIcon aria-hidden className="size-5 shrink-0 md:hidden" />}
    </Link>
  )
}

function CollectionsLabel({ onCreate }: Pick<CollectionListProps, 'onCreate'>): JSX.Element {
  return (
    <div className="mt-4 flex min-h-8 items-center justify-between px-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Collections
      </p>
      {/* The phone has its own « Nouvelle collection » row at the end of the sheet. */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="hidden text-muted-foreground md:inline-flex"
        aria-label="Nouvelle collection"
        title="Nouvelle collection"
        onClick={onCreate}
      >
        <PlusIcon />
      </Button>
    </div>
  )
}

function CollectionEntries(props: Omit<CollectionListProps, 'onCreate'>): JSX.Element {
  const { collections, status } = useCollections()
  if (status === 'failed') return <Hint>Vos collections n'ont pas pu être chargées.</Hint>
  if (status === 'loaded' && collections.length === 0) {
    return <Hint>Aucune collection pour l'instant.</Hint>
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {collections.map((collection) => (
        <li key={collection.id}>
          <Entry
            collectionId={collection.id}
            isSelected={collection.id === props.selectedId}
            cover={<CollectionCover coverUrl={collection.coverUrl} />}
            name={collection.name}
            detail={collectionSummary(collection)}
            count={collection.photoIds.length}
            onChoose={props.onChoose}
          />
        </li>
      ))}
    </ul>
  )
}

function Hint({ children }: { children: ReactNode }): JSX.Element {
  return <p className="px-2 py-1 text-sm text-muted-foreground">{children}</p>
}

function NewCollectionRow({ onCreate }: Pick<CollectionListProps, 'onCreate'>): JSX.Element {
  return (
    <button type="button" className={cn(ENTRY_CLASSES, 'mt-1 md:hidden')} onClick={onCreate}>
      <span className={COVER_CLASSES}>
        <PlusIcon aria-hidden />
      </span>
      Nouvelle collection
    </button>
  )
}

// « Toutes les photos » shows no count: the API sends no total for the whole library.
export function CollectionList({ onCreate, ...props }: CollectionListProps): JSX.Element {
  return (
    <div className="flex flex-col">
      <Entry
        collectionId={null}
        isSelected={props.selectedId === null}
        cover={<ImagesIcon aria-hidden />}
        name="Toutes les photos"
        detail={null}
        count={null}
        onChoose={props.onChoose}
        linkRef={props.allPhotosRef}
      />
      <CollectionsLabel onCreate={onCreate} />
      <CollectionEntries {...props} />
      <NewCollectionRow onCreate={onCreate} />
    </div>
  )
}
