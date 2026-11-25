import { type JSX, type RefObject, useRef, useState } from 'react'
import { CollectionChips } from '@/components/collections/CollectionChips.tsx'
import { SelectedCollectionBar } from '@/components/collections/SelectedCollectionBar.tsx'
import { AddPhotoFab } from '@/components/library/AddPhotoFab.tsx'
import { AddPhotoPanel } from '@/components/library/AddPhotoPanel.tsx'
import { LibraryHeader } from '@/components/library/LibraryHeader.tsx'
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
  allChipRef: RefObject<HTMLAnchorElement | null>
}

type LibraryBodyProps = LibraryContentProps & { layout: LibraryLayout }

type LibraryOverlaysProps = {
  library: PhotoLibrary
  viewer: ViewerParam
  isAdding: boolean
  onAddClose: () => void
  onUpload: (files: File[]) => void
  isShowingPhotos: boolean
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

function LibraryContent(props: LibraryContentProps): JSX.Element {
  const [layout, setLayout] = useLibraryLayout()
  const { selected, library, onAdd, allChipRef } = props
  return (
    <>
      <LibraryHeader
        library={library}
        layout={layout}
        onLayoutChange={setLayout}
        onAdd={onAdd}
        showsCount={isShowingPhotos(selected)}
      />
      {/* Above the photos: news from the family comes first. */}
      <LibraryMail />
      <CollectionChips selectedId={selectedCollectionId(selected)} allChipRef={allChipRef} />
      {selected.status === 'found' && (
        <SelectedCollectionBar collection={selected.collection} fallbackRef={allChipRef} />
      )}
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
  isAdding,
  onAddClose,
  onUpload,
  isShowingPhotos,
}: LibraryOverlaysProps): JSX.Element {
  return (
    <>
      <AddPhotoPanel isOpen={isAdding} onClose={onAddClose} onUpload={onUpload} />
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
  const [isAdding, setIsAdding] = useState(false)
  const allChipRef = useRef<HTMLAnchorElement>(null)

  return (
    // pb-24 below md: the floating « Ajouter » never covers the last photos or « Charger plus ».
    // Written per side so sm:pt-10 cannot undo it between sm and md.
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-6 pb-24 sm:gap-6 sm:pt-10 md:pb-10">
      <LibraryContent
        selected={selected}
        library={library}
        pending={uploads.pending}
        viewer={viewer}
        onAdd={() => setIsAdding(true)}
        allChipRef={allChipRef}
      />
      <LibraryOverlays
        library={library}
        viewer={viewer}
        isAdding={isAdding}
        onAddClose={() => setIsAdding(false)}
        onUpload={uploads.enqueue}
        isShowingPhotos={isShowingPhotos(selected)}
      />
      <AddPhotoFab onAdd={() => setIsAdding(true)} />
    </main>
  )
}
