import type { JSX, ReactNode } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog.tsx'
import { Sheet, SheetContent } from '@/components/ui/sheet.tsx'
import { useMediaQuery } from '@/hooks/useMediaQuery.ts'
import { cn } from '@/lib/utils.ts'

// Tailwind's md breakpoint, where the page layout switches too.
const DESKTOP_QUERY = '(min-width: 48rem)'

type ResponsivePanelProps = {
  onClose: () => void
  onCloseAutoFocus?: (event: Event) => void
  className?: string
  // Sheet and Dialog are the same Radix dialog underneath: a DialogTitle serves both.
  children: ReactNode
}

function DesktopDialog({
  onClose,
  onCloseAutoFocus,
  className,
  children,
}: ResponsivePanelProps): JSX.Element {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={cn('sm:max-w-md', className)} onCloseAutoFocus={onCloseAutoFocus}>
        {children}
      </DialogContent>
    </Dialog>
  )
}

// A phone gets the sheet from the bottom, under the thumb.
function PhoneSheet({
  onClose,
  onCloseAutoFocus,
  className,
  children,
}: ResponsivePanelProps): JSX.Element {
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
        // Focusing a text field would raise the keyboard over the panel.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {children}
      </SheetContent>
    </Sheet>
  )
}

// Open while mounted: the caller renders it only when it should show.
export function ResponsivePanel(props: ResponsivePanelProps): JSX.Element {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  return isDesktop ? <DesktopDialog {...props} /> : <PhoneSheet {...props} />
}
