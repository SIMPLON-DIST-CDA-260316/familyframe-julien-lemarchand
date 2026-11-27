import { XIcon } from 'lucide-react'
import type { JSX } from 'react'
import { BottomDrawer } from '@/components/panel/BottomDrawer.tsx'
import { Button } from '@/components/ui/button.tsx'
import { SheetTitle } from '@/components/ui/sheet.tsx'
import { PhotoInfo } from '@/components/viewer/PhotoInfo.tsx'
import type { Photo } from '@/photo.ts'

type PhotoInfoPanelProps = {
  photo: Photo
  isDesktop: boolean
  onClose: () => void
}

const TITLE = 'Infos'

// Beside the photo, not over it: the photo shrinks, and the panel stays open from one photo to
// the next. Not a dialog: the arrows and the keys keep working on the photo.
function InfoSidePanel({ photo, onClose }: Omit<PhotoInfoPanelProps, 'isDesktop'>): JSX.Element {
  return (
    <aside
      aria-labelledby="photo-info-title"
      className="flex w-90 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-card p-6 text-card-foreground"
    >
      <div className="flex items-center justify-between">
        <h2 id="photo-info-title" className="text-lg font-semibold">
          {TITLE}
        </h2>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fermer les infos">
          <XIcon />
        </Button>
      </div>
      <PhotoInfo photo={photo} />
    </aside>
  )
}

// Half the screen: the photo stays in sight above. Closed by ✕, a drag down or a tap above it.
function InfoDrawer({ photo, onClose }: Omit<PhotoInfoPanelProps, 'isDesktop'>): JSX.Element {
  return (
    <BottomDrawer
      onClose={onClose}
      className="h-[50svh] overflow-y-auto bg-popover pb-[calc(1.5rem_+_env(safe-area-inset-bottom))] text-popover-foreground"
    >
      <SheetTitle className="text-lg">{TITLE}</SheetTitle>
      <PhotoInfo photo={photo} />
    </BottomDrawer>
  )
}

// Open while mounted: the viewer renders it only when the infos are open.
export function PhotoInfoPanel({ isDesktop, ...props }: PhotoInfoPanelProps): JSX.Element {
  return isDesktop ? <InfoSidePanel {...props} /> : <InfoDrawer {...props} />
}
