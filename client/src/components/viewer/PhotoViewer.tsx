import { Dialog as DialogPrimitive } from 'radix-ui'
import type { JSX } from 'react'
import { LoadingStatus } from '@/components/feedback/LoadingStatus.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { PhotoInfoPanel } from '@/components/viewer/PhotoInfoPanel.tsx'
import { ViewerCaption } from '@/components/viewer/ViewerCaption.tsx'
import { ViewerCarousel } from '@/components/viewer/ViewerCarousel.tsx'
import { ViewerTopBar } from '@/components/viewer/ViewerTopBar.tsx'
import {
  type PhotoInfoPanel as InfoPanelState,
  usePhotoInfoPanel,
} from '@/hooks/usePhotoInfoPanel.ts'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import { useViewerChrome, type ViewerChrome } from '@/hooks/useViewerChrome.ts'
import { useViewerKeys } from '@/hooks/useViewerKeys.ts'
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

type PhotoAreaProps = ViewerPhotoProps & { chrome: ViewerChrome; info: InfoPanelState }

// Everything over the photo: its own box, which shrinks when the side panel opens beside it.
function PhotoArea({ library, viewer, photo, index, chrome, info }: PhotoAreaProps): JSX.Element {
  const counter = viewerCounter(index, library)
  return (
    <div className="relative min-w-0 flex-1">
      {/* Outside the top bar, which turns inert when hidden: ← → still announce the position. */}
      <p aria-live="polite" className="sr-only">
        {counter}
      </p>
      <ViewerCarousel
        photos={library.photos}
        currentId={photo.id}
        onCurrentChange={viewer.show}
        onClose={viewer.close}
        chrome={chrome}
      />
      <ViewerCaption photo={photo} isVisible={chrome.isVisible} />
      <ViewerTopBar
        photo={photo}
        isVisible={chrome.isVisible}
        counter={counter}
        isInfoOpen={info.isOpen}
        onClose={viewer.close}
        onStartFrame={() => viewer.startFrame(photo.id)}
        onToggleInfo={info.toggle}
      />
    </div>
  )
}

function ViewerPhoto(props: ViewerPhotoProps): JSX.Element {
  const chrome = useViewerChrome()
  const info = usePhotoInfoPanel()
  // I with Shift or Caps Lock too.
  useViewerKeys({ i: info.toggle, I: info.toggle })
  return (
    <div className="flex h-svh">
      <PhotoArea {...props} chrome={chrome} info={info} />
      {info.isOpen && (
        <PhotoInfoPanel photo={props.photo} isDesktop={info.isDesktop} onClose={info.close} />
      )}
    </div>
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
            <LoadingStatus className="grid h-svh place-items-center">
              {/* The light veil of the photo chrome, not the palette's accent: the viewer is neutral. */}
              <Skeleton className="h-2/3 w-5/6 max-w-4xl bg-overlay-hover" />
            </LoadingStatus>
          ) : (
            <ViewerPhoto library={library} viewer={viewer} photo={photo} index={index} />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
