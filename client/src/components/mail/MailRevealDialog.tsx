import { XIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { type JSX, useEffect, useEffectEvent, useState } from 'react'
import { revealButtonLabel } from '@/components/mail/mailTexts.ts'
import { Button } from '@/components/ui/button.tsx'
import type { Photo } from '@/photo.ts'
import { formatPhotoDay, photoLabel, quotedMessage } from '@/photoLabel.ts'

type MailRevealDialogProps = {
  // Oldest first, never empty.
  photos: Photo[]
  onOpen: (id: string) => Promise<void>
  onClose: () => void
}

function RevealedPhoto({ photo }: { photo: Photo }): JSX.Element {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-6 px-6 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-700">
      <img
        src={photo.url}
        alt={photoLabel(photo)}
        className="min-h-0 flex-1 rounded-sm object-contain shadow-2xl shadow-black/60"
      />
      <div className="flex max-w-xl flex-col items-center gap-1 text-center">
        {photo.senderName !== null && (
          <p className="text-xl font-medium">Envoyée par {photo.senderName}</p>
        )}
        <p className="text-sm text-muted-foreground tabular-nums">
          <time dateTime={photo.createdAt}>{formatPhotoDay(photo.createdAt)}</time>
        </p>
        {photo.message !== null && (
          <p className="mt-2 text-lg whitespace-pre-line wrap-anywhere">
            {quotedMessage(photo.message)}
          </p>
        )}
      </div>
    </div>
  )
}

function RevealTopBar({ position, count }: { position: number; count: number }): JSX.Element {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <DialogPrimitive.Close asChild>
        <Button variant="ghost" size="icon-lg" aria-label="Fermer">
          <XIcon />
        </Button>
      </DialogPrimitive.Close>
      {/* pr-9 balances the ✕, so the counter sits in the middle of the screen. */}
      <DialogPrimitive.Title className="mx-auto pr-9 text-sm text-muted-foreground tabular-nums">
        Nouvelle photo {position} / {count}
      </DialogPrimitive.Title>
    </div>
  )
}

// A photo counts as opened once it is on screen: closing halfway keeps the others waiting.
function useOpenOnShow(photoId: string, onOpen: (id: string) => Promise<void>): void {
  const openShownPhoto = useEffectEvent(onOpen)
  useEffect(() => {
    openShownPhoto(photoId)
  }, [photoId])
}

export function MailRevealDialog({ photos, onOpen, onClose }: MailRevealDialogProps): JSX.Element {
  const [index, setIndex] = useState(0)
  const photo = photos[index]
  const isLastPhoto = index === photos.length - 1
  useOpenOnShow(photo.id, onOpen)

  return (
    <DialogPrimitive.Root open onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        {/* Above the photo viewer and the frame's buttons: the reveal has the whole screen. */}
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="dark fixed inset-0 z-50 flex flex-col gap-6 bg-frame-background pb-8 text-foreground outline-none"
        >
          <RevealTopBar position={index + 1} count={photos.length} />
          {/* The key restarts the reveal animation for each photo. */}
          <RevealedPhoto key={photo.id} photo={photo} />
          <Button
            size="lg"
            className="mx-auto min-w-48"
            onClick={isLastPhoto ? onClose : () => setIndex(index + 1)}
          >
            {revealButtonLabel(isLastPhoto)}
          </Button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
