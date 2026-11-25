import { type JSX, useState } from 'react'
import { CollectionChips } from '@/components/collections/CollectionChips.tsx'
import { SelectedCollectionBar } from '@/components/collections/SelectedCollectionBar.tsx'
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
import { useLibraryUpload } from '@/hooks/useLibraryUpload.ts'
import { type PhotoLibrary, usePhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import {
  type SelectedCollection,
  selectedCollectionId,
  useSelectedCollection,
} from '@/hooks/useSelectedCollection.ts'
import { useViewerParam, type ViewerParam } from '@/hooks/useViewerParam.ts'
import type { Photo } from '@/photo.ts'

type LibraryContentProps = {
  selected: SelectedCollection
  library: PhotoLibrary
  viewer: ViewerParam
  onAdd: () => void
}

type LibraryBodyProps = LibraryContentProps & { layout: LibraryLayout }

type LibraryOverlaysProps = {
  library: PhotoLibrary
  viewer: ViewerParam
  isAdding: boolean
  onAddClose: () => void
  onUploaded: (photo: Photo) => void
}

function LibraryBody({ selected, library, layout, viewer, onAdd }: LibraryBodyProps): JSX.Element {
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
      onOpenPhoto={viewer.open}
      emptyState={emptyState}
    />
  )
}

function LibraryContent(props: LibraryContentProps): JSX.Element {
  const [layout, setLayout] = useLibraryLayout()
  const { selected, library, onAdd } = props
  return (
    <>
      <LibraryHeader library={library} layout={layout} onLayoutChange={setLayout} onAdd={onAdd} />
      {/* Above the photos: news from the family comes first. */}
      <LibraryMail />
      <CollectionChips selectedId={selectedCollectionId(selected)} />
      {selected.status === 'found' && <SelectedCollectionBar collection={selected.collection} />}
      <LibraryBody {...props} layout={layout} />
    </>
  )
}

// The viewer browses the photos shown, so a collection's photo never leads out of it.
function LibraryOverlays({
  library,
  viewer,
  isAdding,
  onAddClose,
  onUploaded,
}: LibraryOverlaysProps): JSX.Element {
  return (
    <>
      <AddPhotoPanel isOpen={isAdding} onClose={onAddClose} onUploaded={onUploaded} />
      {viewer.openId !== null && (
        <PhotoViewer library={library} openId={viewer.openId} viewer={viewer} />
      )}
    </>
  )
}

export default function LibraryPage(): JSX.Element {
  const selected = useSelectedCollection()
  const library = usePhotoLibrary(selectedCollectionId(selected))
  const viewer = useViewerParam()
  const handleUploaded = useLibraryUpload(selected, library)
  const [isAdding, setIsAdding] = useState(false)

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:py-10">
      <LibraryContent
        selected={selected}
        library={library}
        viewer={viewer}
        onAdd={() => setIsAdding(true)}
      />
      <LibraryOverlays
        library={library}
        viewer={viewer}
        isAdding={isAdding}
        onAddClose={() => setIsAdding(false)}
        onUploaded={handleUploaded}
      />
    </main>
  )
}
