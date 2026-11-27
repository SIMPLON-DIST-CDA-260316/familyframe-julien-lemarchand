import { type JSX, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { canShareLinks, shareLink } from '@/nativeShare.ts'

const COPIED_FEEDBACK_MS = 2000

// Closing the share sheet is a choice, not a failure: it says nothing.
async function shareInvitation(link: string): Promise<void> {
  const result = await shareLink(link)
  if (!result.isShared && !result.isCancelled) toast.error("Le lien n'a pas pu être partagé.")
}

type LinkCopy = { isCopied: boolean; copy: () => Promise<void> }

function useLinkCopy(link: string): LinkCopy {
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (!isCopied) return
    const timer = setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [isCopied])

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(link)
      setIsCopied(true)
    } catch {
      // Refused by the browser: the selected input still allows a manual copy.
    }
  }

  return { isCopied, copy }
}

export function InvitationLink({ link }: { link: string }): JSX.Element {
  const { isCopied, copy } = useLinkCopy(link)

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="invitation-link">Lien d'invitation</Label>
      <Input
        id="invitation-link"
        readOnly
        value={link}
        onFocus={(event) => event.target.select()}
      />
      {/* The Clipboard API exists only in a secure context: not on http://<ip>:5180 from a phone. */}
      {'clipboard' in navigator && (
        <Button type="button" variant="outline" onClick={copy}>
          {isCopied ? 'Lien copié' : 'Copier le lien'}
        </Button>
      )}
      {/* The phone's share sheet: the link goes straight into a message. */}
      {canShareLinks() && (
        <Button type="button" variant="outline" onClick={() => shareInvitation(link)}>
          Partager le lien
        </Button>
      )}
      <p className="text-sm text-muted-foreground">
        Envoyez ce lien vous-même. Il sert une seule fois, pendant 7 jours, et ne sera plus affiché.
      </p>
    </div>
  )
}
