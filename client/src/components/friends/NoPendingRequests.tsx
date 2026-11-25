import { InboxIcon } from 'lucide-react'
import type { JSX } from 'react'

export function NoPendingRequests(): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <InboxIcon aria-hidden className="size-10 text-muted-foreground" />
      <p className="font-medium">Aucune demande en attente</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Les demandes que vous recevez ou envoyez apparaissent ici jusqu'à leur réponse.
      </p>
    </div>
  )
}
