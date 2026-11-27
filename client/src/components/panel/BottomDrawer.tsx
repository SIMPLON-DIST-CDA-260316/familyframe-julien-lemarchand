import type { JSX, ReactNode } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet.tsx'
import { useDragToClose } from '@/hooks/useDragToClose.ts'
import { cn } from '@/lib/utils.ts'

type BottomDrawerProps = {
  onClose: () => void
  onCloseAutoFocus?: (event: Event) => void
  className?: string
  // A DialogTitle among them names the drawer, as in any Radix dialog.
  children: ReactNode
}

// A handle wide enough for a thumb, and the bar people know from phone sheets. Only the handle
// drags: the lists inside the sheet keep their own scrolling.
function DragHandle(props: ReturnType<typeof useDragToClose>['handlers']): JSX.Element {
  return (
    <div
      {...props}
      aria-hidden
      className="-mx-4 flex h-6 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
    >
      <span className="h-1.5 w-12 rounded-full bg-muted-foreground/40" />
    </div>
  )
}

// The sheet from the bottom, closed by a drag down on its handle, as well as by ✕ and Escape.
// Open while mounted, like ResponsivePanel: the caller renders it only when it should show.
export function BottomDrawer({
  onClose,
  onCloseAutoFocus,
  className,
  children,
}: BottomDrawerProps): JSX.Element {
  const drag = useDragToClose(onClose)
  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        // translate, not transform: the enter animation owns transform, the two add up.
        style={{ translate: `0 ${drag.offset}px` }}
        className={cn(
          'rounded-t-2xl px-4 pt-0 motion-reduce:transition-none',
          drag.isDragging && 'transition-none',
          className,
        )}
        onCloseAutoFocus={onCloseAutoFocus}
        // Focusing a text field would raise the keyboard over the sheet.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DragHandle {...drag.handlers} />
        {children}
      </SheetContent>
    </Sheet>
  )
}
