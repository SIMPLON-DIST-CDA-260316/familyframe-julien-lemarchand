import { WifiOffIcon } from 'lucide-react'
import type { JSX } from 'react'
import { useIsOnline } from '@/hooks/useIsOnline.ts'

// The live region stays mounted: a status that appears together with its text is not always read.
export function OfflineBanner(): JSX.Element {
  const isOnline = useIsOnline()
  return (
    <div role="status">
      {!isOnline && (
        <p className="flex items-center justify-center gap-2 border-t bg-muted px-4 py-2 text-center text-sm text-muted-foreground">
          <WifiOffIcon aria-hidden className="size-4 shrink-0" />
          Pas de connexion. Les photos se mettront à jour au retour du réseau.
        </p>
      )}
    </div>
  )
}
