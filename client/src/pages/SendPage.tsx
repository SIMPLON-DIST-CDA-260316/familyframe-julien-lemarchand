import { SendIcon } from 'lucide-react'
import { type JSX, type RefObject, useRef } from 'react'
import { PageMain, ReadingColumn } from '@/components/layout/PageMain.tsx'
import { PageFab } from '@/components/nav/PageFab.tsx'
import { SendHistory } from '@/components/send/SendHistory.tsx'
import { SendSourcePanel } from '@/components/send/SendSourcePanel.tsx'
import { ShareSheet } from '@/components/sharing/ShareSheet.tsx'
import { Button } from '@/components/ui/button.tsx'
import { useSendFlow } from '@/hooks/useSendFlow.ts'
import { useSendHistory } from '@/hooks/useSendHistory.ts'

const SEND_LABEL = 'Envoyer une photo'

type PageHeaderProps = {
  triggerRef: RefObject<HTMLButtonElement | null>
  onSend: () => void
}

// Intent first: the page opens on what one came to do, the history below says what already left.
// A phone floats the button instead, where the thumb rests, like the library's « + ».
function PageHeader({ triggerRef, onSend }: PageHeaderProps): JSX.Element {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Envoyer</h1>
        <p className="text-sm text-muted-foreground">
          Faites parvenir une photo à vos proches, sur leur cadre et dans leur bibliothèque.
        </p>
      </div>
      <Button ref={triggerRef} size="lg" className="hidden md:inline-flex" onClick={onSend}>
        <SendIcon aria-hidden data-icon="inline-start" />
        {SEND_LABEL}
      </Button>
    </header>
  )
}

export default function SendPage(): JSX.Element {
  const history = useSendHistory()
  const headerButtonRef = useRef<HTMLButtonElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  const flow = useSendFlow([headerButtonRef, fabRef], history.reload)
  return (
    <PageMain>
      <PageHeader triggerRef={headerButtonRef} onSend={flow.openSources} />
      <ReadingColumn>
        <SendHistory history={history} />
      </ReadingColumn>
      <PageFab icon={SendIcon} label={SEND_LABEL} onClick={flow.openSources} buttonRef={fabRef} />
      {flow.isChoosingSource && (
        <SendSourcePanel
          onClose={flow.closeSources}
          onChoose={flow.chooseTarget}
          onCloseAutoFocus={flow.returnFocus}
        />
      )}
      <ShareSheet
        target={flow.target}
        onClose={flow.closeShare}
        onCloseAutoFocus={flow.returnFocus}
      />
    </PageMain>
  )
}
