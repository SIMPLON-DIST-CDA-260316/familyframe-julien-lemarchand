import { SendIcon } from 'lucide-react'
import { type JSX, useRef } from 'react'
import { SendHistoryRow } from '@/components/send/SendHistoryRow.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import { useNow } from '@/hooks/useNow.ts'
import type { SendHistory as History } from '@/hooks/useSendHistory.ts'

// The coarsest unit the relative dates show.
const DATE_REFRESH_MS = 60_000

type HistoryProps = {
  history: History
  onRemove: (id: string) => void
}

function NoSendYet(): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <SendIcon aria-hidden className="size-10 text-muted-foreground" />
      <p className="font-medium">Aucun envoi pour l'instant</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Les photos que vous envoyez à vos proches apparaîtront ici.
      </p>
    </div>
  )
}

function HistoryList({ history, onRemove }: HistoryProps): JSX.Element {
  const now = useNow(DATE_REFRESH_MS)
  return (
    <>
      <ul className="divide-y rounded-xl border">
        {history.sends.map((send) => (
          <SendHistoryRow key={send.id} send={send} now={now} onRemove={onRemove} />
        ))}
      </ul>
      {history.hasMore && (
        <Button
          variant="outline"
          className="self-center"
          disabled={history.isLoadingMore}
          onClick={history.loadMore}
        >
          {history.isLoadingMore ? 'Chargement…' : 'Afficher plus'}
        </Button>
      )}
    </>
  )
}

function HistoryContent({ history, onRemove }: HistoryProps): JSX.Element {
  if (history.isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>
  if (history.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{history.error}</AlertDescription>
      </Alert>
    )
  }
  if (history.sends.length === 0) return <NoSendYet />
  return <HistoryList history={history} onRemove={onRemove} />
}

// Private, as a mail box's sent folder: only the sender sees it. A removed row takes its bin
// button with it: the keyboard goes on from the list's title instead of the page's top.
export function SendHistory({ history }: { history: History }): JSX.Element {
  const titleRef = useRef<HTMLHeadingElement>(null)
  async function handleRemove(id: string): Promise<void> {
    if (await history.remove(id)) titleRef.current?.focus()
  }
  return (
    <section aria-labelledby="send-history-title" className="flex flex-col gap-3">
      <h2
        ref={titleRef}
        id="send-history-title"
        tabIndex={-1}
        className="text-sm font-medium text-muted-foreground outline-none"
      >
        Envois
      </h2>
      <HistoryContent history={history} onRemove={handleRemove} />
    </section>
  )
}
