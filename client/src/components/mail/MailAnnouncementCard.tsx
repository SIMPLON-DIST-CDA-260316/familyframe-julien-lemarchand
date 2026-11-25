import { MailIcon } from 'lucide-react'
import type { JSX } from 'react'
import { sendersLabel, waitingPhotosLabel } from '@/components/mail/mailTexts.ts'
import { Button } from '@/components/ui/button.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import type { Photo } from '@/photo.ts'

type MailAnnouncementCardProps = {
  // Newest first, as the server sends them.
  photos: Photo[]
  onDiscover: () => void
}

export function MailAnnouncementCard({
  photos,
  onDiscover,
}: MailAnnouncementCardProps): JSX.Element {
  return (
    <Card className="w-full border-frame-accent/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <MailIcon aria-hidden className="size-5 text-frame-accent" />
          {waitingPhotosLabel(photos.length)}
        </CardTitle>
        <CardDescription>{sendersLabel([...photos].reverse())}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="lg" onClick={onDiscover}>
          Découvrir
        </Button>
      </CardContent>
    </Card>
  )
}
