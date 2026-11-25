import { type JSX, type RefObject, useRef, useState } from 'react'
import { CollectionsRow } from '@/components/collections/CollectionsRow.tsx'
import { CollectionTitle } from '@/components/collections/CollectionTitle.tsx'
import { AddPhotoFab } from '@/components/library/AddPhotoFab.tsx'
import { AddPhotoPanel } from '@/components/library/AddPhotoPanel.tsx'
import { LibraryHeader, LibraryTitle } from '@/components/library/LibraryHeader.tsx'
import {
  EmptyCollection,
  EmptyLibrary,
  UnavailableCollection,
} from '@/components/library/LibraryNotices.tsx'
import { LibrarySection } from '@/components/library/LibrarySection.tsx'
import { LibraryMail } from '@/components/mail/LibraryMail.tsx'
import { PhotoViewer } from '@/components/viewer/PhotoViewer.tsx'
import { type LibraryLayout, useLibraryLayout } from '@/hooks/useLibraryLayout.ts'
import { type PhotoLibrary, usePhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import { usePhotoUploads } from '@/hooks/usePhotoUploads.ts'
import {
  type SelectedCollection,
  selectedCollectionId,
  useSelectedCollection,
} from '@/hooks/useSelectedCollection.ts'
import { useViewerParam, type ViewerParam } from '@/hooks/useViewerParam.ts'
import type { PendingUpload } from '@/upload/uploadQueue.ts'

type LibraryContentProps = {
  selected: SelectedCollection
  library: PhotoLibrary
  pending: PendingUpload[]
  viewer: ViewerParam
  onAdd: () => void
  addButtonRef: RefObject<HTMLButtonElement | null>
}

type LibraryBodyProps = LibraryContentProps & { layout: LibraryLayout }

// The two « Ajouter » triggers, one shown at a time: the header's on a computer, the floating
// button on a phone. Focus returns to the shown one when the panels close.
type AddPanel = {
  isOpen: boolean
  open: () => void
  close: () => void
  headerButtonRef: RefObject<HTMLButtonElement | null>
  fabRef: RefObject<HTMLButtonElement | null>
}

type LibraryOverlaysProps = {
  library: PhotoLibrary
  viewer: ViewerParam
  addPanel: AddPanel
  onUpload: (files: File[]) => void
  isShowingPhotos: boolean
}

function useAddPanel(): AddPanel {
  const [isOpen, setIsOpen] = useState(false)
  const headerButtonRef = useRef<HTMLButtonElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    headerButtonRef,
    fabRef,
  }
}

function LibraryBody(props: LibraryBodyProps): JSX.Element {
  const { selected, library, pending, layout, viewer, onAdd } = props
  if (selected.status === 'missing') {
    return <UnavailableCollection message="Cette collection n'existe plus." />
  }
  if (selected.status === 'failed') {
    return <UnavailableCollection message="Cette collection n'a pas pu être chargée." />
  }
  const emptyState =
    selected.status === 'all' ? <EmptyLibrary onAdd={onAdd} /> : <EmptyCollection onAdd={onAdd} />
  return (
    <LibrarySection
      library={library}
      layout={layout}
      pending={pending}
      onOpenPhoto={viewer.open}
      emptyState={emptyState}
    />
  )
}

type PageTitleProps = Pick<LibraryContentProps, 'selected' | 'library'> & {
  allCardRef: RefObject<HTMLAnchorElement | null>
}

// A shown collection titles the page with its own name; « Toutes » keeps « Bibliothèque ».
// The library's count only under « Toutes »: while a collection loads, the photos are its own
// and « Bibliothèque · 3 photos » would count them as the library's.
function PageTitle({ selected, library, allCardRef }: PageTitleProps): JSX.Element {
  if (selected.status === 'found') {
    return <CollectionTitle collection={selected.collection} fallbackRef={allCardRef} />
  }
  return <LibraryTitle library={library} showsCount={selected.status === 'all'} />
}

function LibraryContent(props: LibraryContentProps): JSX.Element {
  const [layout, setLayout] = useLibraryLayout()
  const { selected, library, onAdd, addButtonRef } = props
  // « Toutes »: where focus lands once the shown collection is deleted.
  const allCardRef = useRef<HTMLAnchorElement>(null)
  return (
    <>
      <LibraryHeader
        title={<PageTitle selected={selected} library={library} allCardRef={allCardRef} />}
        layout={layout}
        onLayoutChange={setLayout}
        onAdd={onAdd}
        addButtonRef={addButtonRef}
      />
      {/* Above the photos: news from the family comes first. */}
      <LibraryMail />
      <CollectionsRow selectedId={selectedCollectionId(selected)} allCardRef={allCardRef} />
      <LibraryBody {...props} layout={layout} />
    </>
  )
}

// A collection that cannot be shown never loads a page: its viewer would wait forever.
function isShowingPhotos(selected: SelectedCollection): boolean {
  return selected.status !== 'missing' && selected.status !== 'failed'
}

// The viewer browses the photos shown, so a collection's photo never leads out of it.
function LibraryOverlays({
  library,
  viewer,
  addPanel,
  onUpload,
  isShowingPhotos,
}: LibraryOverlaysProps): JSX.Element {
  return (
    <>
      <AddPhotoPanel
        isOpen={addPanel.isOpen}
        onClose={addPanel.close}
        onUpload={onUpload}
        returnFocusRefs={[addPanel.headerButtonRef, addPanel.fabRef]}
      />
      <AddPhotoFab onAdd={addPanel.open} buttonRef={addPanel.fabRef} />
      {viewer.openId !== null && isShowingPhotos && (
        <PhotoViewer library={library} openId={viewer.openId} viewer={viewer} />
      )}
    </>
  )
}

export default function LibraryPage(): JSX.Element {
  const selected = useSelectedCollection()
  const collectionId = selectedCollectionId(selected)
  const library = usePhotoLibrary(collectionId)
  const viewer = useViewerParam()
  const uploads = usePhotoUploads(collectionId, library)
  const addPanel = useAddPanel()

  return (
    // pb-24 below md: the floating « Ajouter » never covers the last photos or « Charger plus ».
    // Written per side so sm:pt-10 cannot undo it between sm and md.
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-6 pb-24 sm:gap-6 sm:pt-10 md:pb-10">
      <LibraryContent
        selected={selected}
        library={library}
        pending={uploads.pending}
        viewer={viewer}
        onAdd={addPanel.open}
        addButtonRef={addPanel.headerButtonRef}
      />
      <LibraryOverlays
        library={library}
        viewer={viewer}
        addPanel={addPanel}
        onUpload={uploads.enqueue}
        isShowingPhotos={isShowingPhotos(selected)}
      />
    </main>
  )
}
