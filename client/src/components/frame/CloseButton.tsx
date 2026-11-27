import { XIcon } from 'lucide-react'
import type { JSX } from 'react'
import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
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
      aria-label="Quitter le mode cadre"
      className={GLASS_BUTTON_CLASSES}
    >
      <XIcon />
    </Button>
  )
}
