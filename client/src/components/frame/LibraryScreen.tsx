import type { JSX } from 'react'
import { LibraryHeader } from '@/components/frame/LibraryHeader.tsx'
import { PhotoGrid } from '@/components/frame/PhotoGrid.tsx'
import { PhotoList } from '@/components/frame/PhotoList.tsx'
import { useLibraryLayout } from '@/hooks/useLibraryLayout.ts'
import type { Photo } from '@/photo.ts'

type LibraryScreenProps = {
  photos: Photo[]
  currentId: string
  onOpenPhoto: (id: string) => void
  onStartSlideshow: () => void
}

export function LibraryScreen({
  photos,
  currentId,
  onOpenPhoto,
  onStartSlideshow,
}: LibraryScreenProps): JSX.Element {
  const [layout, setLayout] = useLibraryLayout()

  return (
    <>
      <LibraryHeader
        photoCount={photos.length}
        layout={layout}
        onLayoutChange={setLayout}
        onStartSlideshow={onStartSlideshow}
      />
      {/* With the grid's or list's own p-8, keeps the first row clear of the fixed header. */}
      <div className="pt-16">
        {layout === 'grid' ? (
          <PhotoGrid photos={photos} currentId={currentId} onSelect={onOpenPhoto} />
        ) : (
          <PhotoList photos={photos} currentId={currentId} onSelect={onOpenPhoto} />
        )}
      </div>
    </>
  )
}
