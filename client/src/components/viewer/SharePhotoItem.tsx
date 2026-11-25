import { Share2Icon } from 'lucide-react'
import type { JSX } from 'react'
import { toast } from 'sonner'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu.tsx'
import { canSharePhotoFiles, sharePhotoFile } from '@/nativeShare.ts'
import type { Photo } from '@/photo.ts'

// Read once: the browser's abilities do not change while the page is open.
const CAN_SHARE_FILES = canSharePhotoFiles()

async function sharePhoto(photo: Photo): Promise<void> {
  const result = await sharePhotoFile(photo.url)
  if (!result.isShared && !result.isCancelled) toast.error("La photo n'a pas pu être partagée.")
}

// Outward, to any app on the phone; « Envoyer à un ami » stays the way to a FamilyFrame friend.
export function SharePhotoItem({ photo }: { photo: Photo }): JSX.Element | null {
  if (!CAN_SHARE_FILES) return null
  return (
    <DropdownMenuItem onSelect={() => sharePhoto(photo)}>
      <Share2Icon />
      Partager…
    </DropdownMenuItem>
  )
}
