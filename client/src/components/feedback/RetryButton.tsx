import { RotateCwIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Button } from '@/components/ui/button.tsx'

// The same words everywhere a load failed: « Réessayer » runs that load again.
export function RetryButton({ onRetry }: { onRetry: () => void }): JSX.Element {
  return (
    <Button variant="outline" onClick={onRetry} className="self-center">
      <RotateCwIcon aria-hidden data-icon="inline-start" />
      Réessayer
    </Button>
  )
}
