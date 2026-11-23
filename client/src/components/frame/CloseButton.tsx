import { XIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Button } from '@/components/ui/button.tsx'

type CloseButtonProps = {
  onClose: () => void
}

export function CloseButton({ onClose }: CloseButtonProps): JSX.Element {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClose}
      aria-label="Fermer le diaporama"
      className="rounded-full text-white/80"
    >
      <XIcon />
    </Button>
  )
}
