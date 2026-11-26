import { PlusIcon } from 'lucide-react'
import { type JSX, type RefObject, useRef, useState } from 'react'
import { CollectionActions } from '@/components/collections/CollectionActions.tsx'
import { collectionSummary } from '@/components/collections/collectionSummary.ts'
import { PageMain } from '@/components/layout/PageMain.tsx'
import { AddPhotoPanel } from '@/components/library/AddPhotoPanel.tsx'
import { CollectionsSheetButton } from '@/components/library/CollectionsSheetButton.tsx'
import { CollectionsSidebar } from '@/components/library/CollectionsSidebar.tsx'
import { LibraryHeader, LibraryTitle } from '@/components/library/LibraryHeader.tsx'
import {
  EmptyCollection,
  EmptyLibrary,
  UnavailableCollection,
} from '@/components/library/LibraryNotices.tsx'
import { LibrarySection } from '@/components/library/LibrarySection.tsx'
import { libraryCountLabel } from '@/components/library/libraryTexts.ts'
import { LibraryMail } from '@/components/mail/LibraryMail.tsx'
import { PageFab } from '@/components/nav/PageFab.tsx'
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

type TitleRefs = {
  // « Toutes les photos » in the sidebar, the title button on a phone: once the shown collection
  // is deleted, the shown one takes focus.
  allPhotosRef: RefObject<HTMLAnchorElement | null>
  sheetButtonRef: RefObject<HTMLButtonElement | null>
}

type PageTitleProps = Pick<LibraryContentProps, 'selected' | 'library'> & TitleRefs

type TitleTexts = { name: string; subtitle: string | null }

// The library's count only under « Toutes les photos »: while a collection loads, the photos are
// its own, and its name is not known yet.
function titleTexts({
  selected,
  library,
}: Pick<PageTitleProps, 'selected' | 'library'>): TitleTexts {
  if (selected.status === 'found') {
    return { name: selected.collection.name, subtitle: collectionSummary(selected.collection) }
  }
  if (selected.status !== 'all') return { name: 'Bibliothèque', subtitle: null }
  const count = library.isFirstPageLoaded
    ? libraryCountLabel(library.photos.length, library.hasMore)
    : null
  return { name: 'Toutes les photos', subtitle: count }
}

function PageTitle({
  selected,
  library,
  allPhotosRef,
  sheetButtonRef,
}: PageTitleProps): JSX.Element {
  const { name, subtitle } = titleTexts({ selected, library })
  const fallbackRefs = [allPhotosRef, sheetButtonRef]
  return (
    <LibraryTitle
      name={name}
      subtitle={subtitle}
      sheetButton={
        <CollectionsSheetButton
          name={name}
          selectedId={selectedCollectionId(selected)}
          buttonRef={sheetButtonRef}
        />
      }
      actions={
        selected.status === 'found' && (
          <CollectionActions collection={selected.collection} fallbackRefs={fallbackRefs} />
        )
      }
    />
  )
}

// Two columns from md: the collections on the left, what they show on the right, its actions
// above the photos, after the news from the family when there is some.
function LibraryContent(props: LibraryContentProps): JSX.Element {
  const [layout, setLayout] = useLibraryLayout()
  const { selected, library, onAdd, addButtonRef } = props
  const allPhotosRef = useRef<HTMLAnchorElement>(null)
  const sheetButtonRef = useRef<HTMLButtonElement>(null)
  const refs = { allPhotosRef, sheetButtonRef }
  return (
    <div className="flex gap-8">
      <CollectionsSidebar selectedId={selectedCollectionId(selected)} allPhotosRef={allPhotosRef} />
      <div className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-6">
        <LibraryHeader
          title={<PageTitle selected={selected} library={library} {...refs} />}
          layout={layout}
          onLayoutChange={setLayout}
          onAdd={onAdd}
          addButtonRef={addButtonRef}
        />
        {/* Above the photos: news from the family comes first. */}
        <LibraryMail />
        <LibraryBody {...props} layout={layout} />
      </div>
    </div>
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
      <PageFab
        icon={PlusIcon}
        label="Ajouter une photo"
        onClick={addPanel.open}
        buttonRef={addPanel.fabRef}
      />
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
    // Tighter on a phone, where the photos should show above the fold.
    <PageMain className="gap-4 pt-6 sm:gap-6 sm:pt-10">
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
    </PageMain>
  )
}
