import { ImagesIcon, TriangleAlertIcon } from 'lucide-react'
import type { JSX, ReactNode } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { cn } from '@/lib/utils.ts'

// Why the frame shows no photo: each case needs its own words.
export type FrameStatus = 'loading' | 'empty' | 'failed'

type FrameStatusScreenProps = {
  status: FrameStatus
  className: string
  onLeave: () => void
}

function StatusMessage({ status }: { status: FrameStatus }): ReactNode {
  if (status === 'loading') return <p className="text-3xl font-medium">Chargement des photos…</p>
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
  const Icon = status === 'failed' ? TriangleAlertIcon : ImagesIcon
  return (
    <main
      className={cn(
        className,
        'grid place-items-center bg-radial from-frame-accent/10 to-transparent to-70%',
      )}
    >
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
