// Web Share with files: the phone's own share sheet (Messages, WhatsApp, mail…). Desktop
// browsers mostly lack it: the « Partager… » item only shows where it works.
const PROBE_FILE_NAME = 'photo.jpg'
const PROBE_FILE_TYPE = 'image/jpeg'

export function canSharePhotoFiles(): boolean {
  if (typeof navigator.canShare !== 'function') return false
  const probe = new File([''], PROBE_FILE_NAME, { type: PROBE_FILE_TYPE })
  return navigator.canShare({ files: [probe] })
}

export function canShareLinks(): boolean {
  return typeof navigator.share === 'function'
}

// isShared false: the person closed the share sheet, which is not an error to report.
export type NativeShareResult = { isShared: true } | { isShared: false; isCancelled: boolean }

function isCancelled(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

// The file, not the link: a signed Cloudinary URL would mean nothing to the person receiving it,
// and the picture belongs in their gallery. The 1920 px photo: big enough, light enough to send.
export async function sharePhotoFile(url: string): Promise<NativeShareResult> {
  try {
    const response = await fetch(url)
    if (!response.ok) return { isShared: false, isCancelled: false }
    const blob = await response.blob()
    const file = new File([blob], PROBE_FILE_NAME, { type: blob.type || PROBE_FILE_TYPE })
    await navigator.share({ files: [file] })
    return { isShared: true }
  } catch (error: unknown) {
    return { isShared: false, isCancelled: isCancelled(error) }
  }
}

export async function shareLink(url: string): Promise<NativeShareResult> {
  try {
    await navigator.share({ url })
    return { isShared: true }
  } catch (error: unknown) {
    return { isShared: false, isCancelled: isCancelled(error) }
  }
}
