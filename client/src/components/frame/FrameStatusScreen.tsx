import { ImagesIcon, MailIcon, TriangleAlertIcon } from 'lucide-react'
import type { JSX, ReactNode } from 'react'
import { FullscreenButton } from '@/components/frame/FullscreenButton.tsx'
import { Button } from '@/components/ui/button.tsx'
import { cn } from '@/lib/utils.ts'

// Why the frame shows no photo: each case needs its own words.
// unopened: nothing in the library yet, but friends' photos wait to be discovered.
export type FrameStatus = 'loading' | 'empty' | 'unopened' | 'failed'

const STATUS_ICONS = {
  loading: ImagesIcon,
  empty: ImagesIcon,
  unopened: MailIcon,
  failed: TriangleAlertIcon,
} satisfies Record<FrameStatus, typeof ImagesIcon>

type FrameStatusScreenProps = {
  status: FrameStatus
  className: string
  onLeave: () => void
}

function StatusMessage({ status }: { status: FrameStatus }): ReactNode {
  if (status === 'loading') return <p className="text-3xl font-medium">Chargement des photos…</p>
  if (status === 'unopened')
    return <p className="text-3xl font-medium">Des photos vous attendent.</p>
  if (status === 'failed') {
    return (
      <>
        <p className="text-3xl font-medium">Les photos n'ont pas pu être chargées.</p>
        <p className="text-lg text-muted-foreground">
          Le cadre réessaiera dès que la connexion reviendra.
        </p>
      </>
    )
  }
  return (
    <>
      <p className="text-3xl font-medium">En attente de la première photo…</p>
      {/* A first visitor needs the way in, not only the news that the frame is empty. */}
      <p className="text-lg text-muted-foreground">
        Envoyez-en une depuis votre téléphone : {window.location.host}
      </p>
    </>
  )
}

export function FrameStatusScreen({
  status,
  className,
  onLeave,
}: FrameStatusScreenProps): JSX.Element {
  const Icon = STATUS_ICONS[status]
  return (
    <main
      className={cn(
        className,
        'grid place-items-center bg-radial from-frame-accent/10 to-transparent to-70%',
      )}
    >
      {/* Where the slideshow has it: a frame stuck on loading can still go full screen. */}
      <div className="fixed top-0 right-0 px-6 py-4">
        <FullscreenButton />
      </div>
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <Icon aria-hidden className="size-16 text-frame-accent/80 motion-safe:animate-pulse" />
        <StatusMessage status={status} />
        {/* Without photos there is no slideshow, and so no ✕: this is the way out. */}
        <Button variant="outline" size="lg" className="mt-4" onClick={onLeave}>
          Retour à la bibliothèque
        </Button>
      </div>
    </main>
  )
}
