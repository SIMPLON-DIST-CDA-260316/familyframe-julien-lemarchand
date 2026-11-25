import type { JSX, ReactNode } from 'react'
import { ShareFriendsForm } from '@/components/sharing/ShareFriendsForm.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx'
import { Sheet, SheetContent } from '@/components/ui/sheet.tsx'
import { useMediaQuery } from '@/hooks/useMediaQuery.ts'
import { usePreviewUrl } from '@/hooks/usePreviewUrl.ts'
import type { ShareTarget } from '@/hooks/useShareSending.ts'
import { cn } from '@/lib/utils.ts'
import { photoLabel } from '@/photoLabel.ts'

// Tailwind's md breakpoint, where the page layout switches too.
const DESKTOP_QUERY = '(min-width: 48rem)'

type ShareSheetProps = {
  // Picked when the sheet opened: the slideshow may move on while it stays open.
  target: ShareTarget | null
  onClose: () => void
  // The upload form empties its inputs once the photo is sent.
  onShared?: () => void
  onCloseAutoFocus?: (event: Event) => void
  className?: string
}

type ShareBodyProps = Pick<ShareSheetProps, 'onShared' | 'onClose'> & {
  target: ShareTarget
}

type ShellProps = Pick<ShareSheetProps, 'onClose' | 'onCloseAutoFocus' | 'className'> & {
  children: ReactNode
}

function ShareThumbnail({ target }: { target: ShareTarget }): JSX.Element | null {
  const fileUrl = usePreviewUrl(target.kind === 'device' ? target.file : null)
  const src = target.kind === 'library' ? target.photo.thumbnailUrl : fileUrl
  if (!src) return null
  const alt = target.kind === 'library' ? photoLabel(target.photo) : 'Aperçu avant envoi'
  return <img className="size-14 shrink-0 rounded-lg object-cover" src={src} alt={alt} />
}

// Sheet and Dialog are the same Radix dialog underneath: one title and description serve both.
function ShareBody({ target, onShared, onClose }: ShareBodyProps): JSX.Element {
  function closeAfterSending(): void {
    onShared?.()
    onClose()
  }
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
      <ShareFriendsForm target={target} onSent={closeAfterSending} />
    </>
  )
}

function DesktopDialog({
  onClose,
  onCloseAutoFocus,
  className,
  children,
}: ShellProps): JSX.Element {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={cn('sm:max-w-md', className)} onCloseAutoFocus={onCloseAutoFocus}>
        {children}
      </DialogContent>
    </Dialog>
  )
}

// A phone gets the sheet from the bottom, under the thumb.
function PhoneSheet({ onClose, onCloseAutoFocus, className, children }: ShellProps): JSX.Element {
  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        // bg-popover matches the ring offset of the friend avatars, as in the dialog.
        className={cn(
          'max-h-[90svh] rounded-t-2xl bg-popover px-4 pt-4 pb-6 text-popover-foreground',
          className,
        )}
        onCloseAutoFocus={onCloseAutoFocus}
        // Focusing the search field would raise the keyboard over the friend grid.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {children}
      </SheetContent>
    </Sheet>
  )
}

export function ShareSheet({
  target,
  onClose,
  onShared,
  onCloseAutoFocus,
  className,
}: ShareSheetProps): JSX.Element | null {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  if (!target) return null
  const Shell = isDesktop ? DesktopDialog : PhoneSheet
  return (
    <Shell onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} className={className}>
      <ShareBody target={target} onShared={onShared} onClose={onClose} />
    </Shell>
  )
}
