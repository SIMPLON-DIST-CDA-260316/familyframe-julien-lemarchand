import type { JSX } from 'react'
import { ResponsivePanel } from '@/components/panel/ResponsivePanel.tsx'
import { ShareFriendsForm } from '@/components/sharing/ShareFriendsForm.tsx'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx'
import { usePreviewUrl } from '@/hooks/usePreviewUrl.ts'
import type { ShareTarget } from '@/hooks/useShareSending.ts'
import { photoLabel } from '@/photoLabel.ts'

type ShareSheetProps = {
  // Picked when the sheet opened: the slideshow may move on while it stays open.
  target: ShareTarget | null
  onClose: () => void
  onCloseAutoFocus?: (event: Event) => void
  className?: string
}

type ShareBodyProps = Pick<ShareSheetProps, 'onClose'> & {
  target: ShareTarget
}

function ShareThumbnail({ target }: { target: ShareTarget }): JSX.Element | null {
  const fileUrl = usePreviewUrl(target.kind === 'device' ? target.file : null)
  const src = target.kind === 'library' ? target.photo.thumbnailUrl : fileUrl
  if (!src) return null
  const alt = target.kind === 'library' ? photoLabel(target.photo) : 'Aperçu avant envoi'
  return <img className="size-14 shrink-0 rounded-lg object-cover" src={src} alt={alt} />
}

function ShareBody({ target, onClose }: ShareBodyProps): JSX.Element {
  return (
    <>
      {/* pr-10 keeps the text clear of the ✕ in the corner. */}
      <div className="flex items-center gap-3 pr-10">
        <ShareThumbnail target={target} />
        <div className="flex min-w-0 flex-col gap-1">
          <DialogTitle>Envoyer à des proches</DialogTitle>
          <DialogDescription>
            Elle les attendra sur leur cadre et dans leur bibliothèque.
          </DialogDescription>
        </div>
      </div>
      <ShareFriendsForm target={target} onSent={onClose} />
    </>
  )
}

export function ShareSheet({
  target,
  onClose,
  onCloseAutoFocus,
  className,
}: ShareSheetProps): JSX.Element | null {
  if (!target) return null
  return (
    <ResponsivePanel onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} className={className}>
      <ShareBody target={target} onClose={onClose} />
    </ResponsivePanel>
  )
}
