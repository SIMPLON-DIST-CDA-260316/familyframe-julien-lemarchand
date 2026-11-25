import { MailIcon } from 'lucide-react'
import type { JSX } from 'react'
import { sendersLabel, waitingPhotosLabel } from '@/components/mail/mailTexts.ts'
import { Button } from '@/components/ui/button.tsx'
import type { Photo } from '@/photo.ts'

type MailAnnouncementCardProps = {
  // Newest first, as the server sends them.
  photos: Photo[]
  onDiscover: () => void
}

// One line above the photos: the news shows without pushing the library down.
export function MailAnnouncementCard({
  photos,
  onDiscover,
}: MailAnnouncementCardProps): JSX.Element {
  return (
    <section
      aria-label="Photos reçues"
      className="flex items-center gap-3 rounded-xl border border-frame-accent/60 bg-card px-4 py-3 text-card-foreground"
    >
      <MailIcon aria-hidden className="size-5 shrink-0 text-frame-accent" />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-medium">{waitingPhotosLabel(photos.length)}</p>
        <p className="truncate text-sm text-muted-foreground">
          {sendersLabel([...photos].reverse())}
        </p>
      </div>
      <Button className="pointer-coarse:h-11" onClick={onDiscover}>
        Découvrir
      </Button>
    </section>
  )
}
