// Web Share with files: the phone's own share sheet (Messages, WhatsApp, mail…). Desktop
// browsers mostly lack it: the « Partager… » item only shows where it works.
const PROBE_FILE_TYPE = 'image/jpeg'

// Cloudinary's f_auto picks the format: the file's extension must match it, or Chrome refuses.
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/png': 'png',
}

export function canSharePhotoFiles(): boolean {
  if (typeof navigator.canShare !== 'function') return false
  const probe = new File([''], 'photo.jpg', { type: PROBE_FILE_TYPE })
  return navigator.canShare({ files: [probe] })
}

export function canShareLinks(): boolean {
  return typeof navigator.share === 'function'
}

// isShared false: isCancelled when the person closed the share sheet, which is no error.
export type NativeShareResult = { isShared: true } | { isShared: false; isCancelled: boolean }

function isCancelled(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

// The file, not the link: a signed Cloudinary URL would mean nothing to the person receiving it,
// and the picture belongs in their gallery. null when the photo could not be downloaded.
export async function fetchPhotoFile(url: string): Promise<File | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    const extension = EXTENSIONS[blob.type] ?? EXTENSIONS[PROBE_FILE_TYPE]
    return new File([blob], `photo.${extension}`, { type: blob.type || PROBE_FILE_TYPE })
  } catch {
    return null
  }
}

// Called straight from the tap: Safari refuses a share that waits for a download first.
export async function shareFile(file: File): Promise<NativeShareResult> {
  if (!navigator.canShare({ files: [file] })) return { isShared: false, isCancelled: false }
  try {
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
