import type { JSX } from 'react'
import { MailAnnouncementCard } from '@/components/mail/MailAnnouncementCard.tsx'
import { MailRevealDialog } from '@/components/mail/MailRevealDialog.tsx'
import { useMailReveal } from '@/hooks/useMailReveal.ts'
import { usePhotoMail } from '@/hooks/usePhotoMail.ts'

// Nothing while no photo waits. An opened photo reaches the library grid through photo:opened.
export function LibraryMail(): JSX.Element {
  const mail = usePhotoMail()
  const reveal = useMailReveal()

  return (
    <>
      {mail.photos.length > 0 && (
        <MailAnnouncementCard photos={mail.photos} onDiscover={() => reveal.start(mail.photos)} />
      )}
      {reveal.photos !== null && (
        <MailRevealDialog photos={reveal.photos} onOpen={mail.open} onClose={reveal.close} />
      )}
    </>
  )
}
