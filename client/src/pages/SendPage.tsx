import type { JSX } from 'react'
import { SendHistory } from '@/components/send/SendHistory.tsx'
import { useSendHistory } from '@/hooks/useSendHistory.ts'

function PageHeader(): JSX.Element {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">Envoyer</h1>
      <p className="text-sm text-muted-foreground">
        Les photos que vous avez envoyées à vos proches, la plus récente en premier.
      </p>
    </header>
  )
}

export default function SendPage(): JSX.Element {
  const history = useSendHistory()
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <PageHeader />
      <SendHistory history={history} />
    </main>
  )
}
