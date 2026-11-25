import { PlusIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Button } from '@/components/ui/button.tsx'

type AddPhotoFabProps = {
  onAdd: () => void
}

// A phone's « Ajouter », where the thumb rests: bottom right, above the tab bar and the home bar.
// A computer keeps the button in the header. pointer-coarse:size-14 beats the Button's coarse h-11.
export function AddPhotoFab({ onAdd }: AddPhotoFabProps): JSX.Element {
  return (
    <Button
      onClick={onAdd}
      aria-label="Ajouter une photo"
      title="Ajouter une photo"
      className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(var(--tab-bar-height)_+_env(safe-area-inset-bottom)_+_1rem)] z-20 size-14 rounded-full pointer-coarse:size-14 shadow-lg md:hidden"
    >
      <PlusIcon aria-hidden className="size-6" />
    </Button>
  )
}
