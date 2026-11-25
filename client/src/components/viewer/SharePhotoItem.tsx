import { Share2Icon } from 'lucide-react'
import { type JSX, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu.tsx'
import {
  canSharePhotoFiles,
  fetchPhotoFile,
  type NativeShareResult,
  shareFile,
} from '@/nativeShare.ts'
import type { Photo } from '@/photo.ts'

// Read once: the browser's abilities do not change while the page is open.
const CAN_SHARE_FILES = canSharePhotoFiles()

const FAILED_MESSAGE = "La photo n'a pas pu être partagée."

// Downloaded as soon as the menu opens: by the tap, the file is ready to share at once.
function usePhotoFile(url: string): File | null {
  const [file, setFile] = useState<File | null>(null)
  useEffect(() => {
    let isCurrent = true
    fetchPhotoFile(url).then((fetched) => {
      if (isCurrent) setFile(fetched)
    })
    return () => {
      isCurrent = false
    }
  }, [url])
  return file
}

// A tap before the download ends shares late: Safari may refuse, and the toast says so.
async function share(file: File | null, url: string): Promise<void> {
  const ready = file ?? (await fetchPhotoFile(url))
  const result: NativeShareResult = ready
    ? await shareFile(ready)
    : { isShared: false, isCancelled: false }
  if (!result.isShared && !result.isCancelled) toast.error(FAILED_MESSAGE)
}

function ShareItem({ photo }: { photo: Photo }): JSX.Element {
  const file = usePhotoFile(photo.url)
  return (
    <DropdownMenuItem onSelect={() => share(file, photo.url)}>
      <Share2Icon />
      Partager…
    </DropdownMenuItem>
  )
}

// Outward, to any app on the phone; « Envoyer à un ami » stays the way to a FamilyFrame friend.
export function SharePhotoItem({ photo }: { photo: Photo }): JSX.Element | null {
  return CAN_SHARE_FILES ? <ShareItem photo={photo} /> : null
}
