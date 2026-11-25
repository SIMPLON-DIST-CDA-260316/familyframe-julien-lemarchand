import { Dialog as DialogPrimitive } from 'radix-ui'
import type { JSX } from 'react'
import { ViewerCaption } from '@/components/viewer/ViewerCaption.tsx'
import { ViewerCarousel } from '@/components/viewer/ViewerCarousel.tsx'
import { ViewerTopBar } from '@/components/viewer/ViewerTopBar.tsx'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import { useViewerChrome } from '@/hooks/useViewerChrome.ts'
import type { ViewerParam } from '@/hooks/useViewerParam.ts'
import { useViewerPhoto } from '@/hooks/useViewerPhoto.ts'
import type { Photo } from '@/photo.ts'
import { viewerCounter } from '@/viewerNavigation.ts'

type PhotoViewerProps = {
  library: PhotoLibrary
  openId: string
  viewer: ViewerParam
}

type ViewerPhotoProps = Omit<PhotoViewerProps, 'openId'> & {
  photo: Photo
  index: number
}

// Back in the library, focus lands on the photo last shown, not the one first opened; focusing
// it also scrolls it into view.
function focusPhotoTile(event: Event, photoId: string): void {
  const tile = document.querySelector<HTMLElement>(`[data-photo-id="${CSS.escape(photoId)}"]`)
  if (!tile) return
  event.preventDefault()
  tile.focus()
}

function ViewerPhoto({ library, viewer, photo, index }: ViewerPhotoProps): JSX.Element {
  const chrome = useViewerChrome()
  const counter = viewerCounter(index, library)
  return (
    <>
      {/* Outside the top bar, which turns inert when hidden: ← → still announce the position. */}
      <p aria-live="polite" className="sr-only">
        {counter}
      </p>
      <ViewerCarousel
        photos={library.photos}
        currentId={photo.id}
        onCurrentChange={viewer.show}
        chrome={chrome}
      />
      <ViewerCaption photo={photo} isVisible={chrome.isVisible} />
      <ViewerTopBar
        photo={photo}
        isVisible={chrome.isVisible}
        counter={counter}
        onClose={viewer.close}
        onStartFrame={() => viewer.startFrame(photo.id)}
      />
    </>
  )
}

export function PhotoViewer({ library, openId, viewer }: PhotoViewerProps): JSX.Element {
  const index = useViewerPhoto({ library, openId, show: viewer.show, dismiss: viewer.dismiss })
  const photo = library.photos.find(({ id }) => id === openId)

  return (
    // A dialog: focus stays inside, the page behind neither scrolls nor reaches screen readers,
    // and Escape closes an open menu before the viewer.
    <DialogPrimitive.Root open onOpenChange={viewer.close}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          data-photo-viewer
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => focusPhotoTile(event, openId)}
          // `dark` and the frame background: the photo stands out, whatever the app's theme.
          className="dark fixed inset-0 z-40 bg-frame-background text-foreground outline-none"
        >
          <DialogPrimitive.Title className="sr-only">Photo</DialogPrimitive.Title>
          {photo === undefined ? (
            <p className="grid h-svh place-items-center text-muted-foreground">Chargement…</p>
          ) : (
            <ViewerPhoto library={library} viewer={viewer} photo={photo} index={index} />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
