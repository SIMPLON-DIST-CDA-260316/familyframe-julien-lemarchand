import { PlusIcon } from 'lucide-react'
import { type JSX, useEffect } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { useHideOnScrollDown } from '@/hooks/useHideOnScrollDown.ts'
import { cn } from '@/lib/utils.ts'

// pointer-coarse:size-14 beats the Button's coarse h-11. The ring of page colour keeps the
// button apart from a photo under it, in either theme.
const FAB_CLASSES =
  'fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(var(--tab-bar-height)_+_env(safe-area-inset-bottom)_+_1rem)] z-20 size-14 rounded-full pointer-coarse:size-14 shadow-lg ring-2 ring-background transition-[translate,opacity] duration-200 ease-out motion-reduce:transition-none md:hidden'

// Slides below the screen edge; with reduced motion it only disappears. Still focusable: the
// keyboard reaching it brings it back.
const HIDDEN_CLASSES = 'pointer-events-none translate-y-24 opacity-0 motion-reduce:translate-y-0'

// Toasts sit just above the tab bar, where this button floats: while it shows, the page says so
// on <html> and index.css lifts the toasts above it (below md only, where it exists).
function useLiftToasts(isShown: boolean): void {
  useEffect(() => {
    if (!isShown) return
    document.documentElement.dataset.fabShown = ''
    return () => {
      delete document.documentElement.dataset.fabShown
    }
  }, [isShown])
}

type AddPhotoFabProps = {
  onAdd: () => void
}

// A phone's « Ajouter », where the thumb rests: bottom right, above the tab bar and the home bar.
// A computer keeps the button in the header.
export function AddPhotoFab({ onAdd }: AddPhotoFabProps): JSX.Element {
  const { isHidden, ref, onFocus } = useHideOnScrollDown()
  useLiftToasts(!isHidden)
  return (
    <Button
      ref={ref}
      onClick={onAdd}
      onFocus={onFocus}
      aria-label="Ajouter une photo"
      title="Ajouter une photo"
      className={cn(FAB_CLASSES, isHidden && HIDDEN_CLASSES)}
    >
      <PlusIcon aria-hidden className="size-6" />
    </Button>
  )
}
