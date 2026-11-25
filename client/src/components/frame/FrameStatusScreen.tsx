import { FolderIcon, ImagesIcon, MailIcon, TriangleAlertIcon } from 'lucide-react'
import type { JSX } from 'react'
import { FullscreenButton } from '@/components/frame/FullscreenButton.tsx'
import { Button } from '@/components/ui/button.tsx'
import { cn } from '@/lib/utils.ts'

// Why the frame shows no photo: each case needs its own words.
// unopened: nothing in the library yet, but friends' photos wait to be discovered.
// emptyCollection: the frame plays a collection that holds no photo.
export type FrameStatus = 'loading' | 'empty' | 'unopened' | 'failed' | 'emptyCollection'

const STATUS_ICONS = {
  loading: ImagesIcon,
  empty: ImagesIcon,
  unopened: MailIcon,
  failed: TriangleAlertIcon,
  emptyCollection: FolderIcon,
} satisfies Record<FrameStatus, typeof ImagesIcon>

// hint: the line under the message, when the case needs one.
type StatusText = { message: string; hint?: string }

const STATUS_TEXTS = {
  loading: { message: 'Chargement des photos…' },
  unopened: { message: 'Des photos vous attendent.' },
  failed: {
    message: "Les photos n'ont pas pu être chargées.",
    hint: 'Le cadre réessaiera dès que la connexion reviendra.',
  },
  emptyCollection: {
    message: 'Cette collection est vide.',
    hint: 'Ajoutez-y des photos depuis la bibliothèque.',
  },
} satisfies Record<Exclude<FrameStatus, 'empty'>, StatusText>

// A first visitor needs the way in, not only the news that the frame is empty.
function statusText(status: FrameStatus): StatusText {
  if (status !== 'empty') return STATUS_TEXTS[status]
  return {
    message: 'En attente de la première photo…',
    hint: `Envoyez-en une depuis votre téléphone : ${window.location.host}`,
  }
}

type FrameStatusScreenProps = {
  status: FrameStatus
  className: string
  onLeave: () => void
}

function StatusMessage({ status }: { status: FrameStatus }): JSX.Element {
  const { message, hint } = statusText(status)
  return (
    <>
      <p className="text-3xl font-medium">{message}</p>
      {hint !== undefined && <p className="text-lg text-muted-foreground">{hint}</p>}
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
