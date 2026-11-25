import { type JSX, useState } from 'react'
import { CollectionsCard } from '@/components/collections/CollectionsCard.tsx'
import { AddPhotoPanel } from '@/components/library/AddPhotoPanel.tsx'
import { LibraryHeader } from '@/components/library/LibraryHeader.tsx'
import { LibrarySection } from '@/components/library/LibrarySection.tsx'
import { LibraryMail } from '@/components/mail/LibraryMail.tsx'
import { PhotoViewer } from '@/components/viewer/PhotoViewer.tsx'
import { useLibraryLayout } from '@/hooks/useLibraryLayout.ts'
import { type PhotoLibrary, usePhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import { useViewerParam, type ViewerParam } from '@/hooks/useViewerParam.ts'

type LibraryOverlaysProps = {
  library: PhotoLibrary
  viewer: ViewerParam
  isAdding: boolean
  onAddClose: () => void
}

function LibraryOverlays({
  library,
  viewer,
  isAdding,
  onAddClose,
}: LibraryOverlaysProps): JSX.Element {
  return (
    <>
      <AddPhotoPanel isOpen={isAdding} onClose={onAddClose} onUploaded={library.addPhoto} />
      {viewer.openId !== null && (
        <PhotoViewer library={library} openId={viewer.openId} viewer={viewer} />
      )}
    </>
  )
}

type LibraryContentProps = {
  library: PhotoLibrary
  viewer: ViewerParam
  onAdd: () => void
}

function LibraryContent({ library, viewer, onAdd }: LibraryContentProps): JSX.Element {
  const [layout, setLayout] = useLibraryLayout()
  return (
    <>
      <LibraryHeader library={library} layout={layout} onLayoutChange={setLayout} onAdd={onAdd} />
      {/* Above the photos: news from the family comes first. */}
      <LibraryMail />
      <CollectionsCard />
      <LibrarySection library={library} layout={layout} onOpenPhoto={viewer.open} onAdd={onAdd} />
    </>
  )
}

export default function LibraryPage(): JSX.Element {
  const library = usePhotoLibrary()
  const viewer = useViewerParam()
  const [isAdding, setIsAdding] = useState(false)

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:py-10">
      <LibraryContent library={library} viewer={viewer} onAdd={() => setIsAdding(true)} />
      <LibraryOverlays
        library={library}
        viewer={viewer}
        isAdding={isAdding}
        onAddClose={() => setIsAdding(false)}
      />
    </main>
  )
}
