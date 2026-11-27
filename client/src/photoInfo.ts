import type { Photo } from '@/photo.ts'
import { dayLabel } from '@/photoDays.ts'

const BYTES_PER_KB = 1000
const BYTES_PER_MB = 1_000_000

const TIME_FORMAT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

// One decimal: « 2,4 Mo » says enough about a photo's weight.
const MEGABYTES_FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

// The day as the library's headers say it (« Aujourd'hui », « dim. 22 nov. »), then the time.
export function formatAddedAt(iso: string, now: Date): string {
  const date = new Date(iso)
  return `${dayLabel(date, now)} à ${TIME_FORMAT.format(date)}`
}

// Decimal units, as phones and computers show file sizes: 1 Mo is a million bytes.
function formatBytes(bytes: number): string {
  if (bytes < BYTES_PER_MB) return `${Math.max(1, Math.round(bytes / BYTES_PER_KB))} ko`
  return `${MEGABYTES_FORMAT.format(bytes / BYTES_PER_MB)} Mo`
}

// null on a photo stored before step 15: its info leaves the line out rather than guess.
export function formatImageSize({ width, height, bytes }: Photo): string | null {
  if (width === null || height === null || bytes === null) return null
  return `${width} × ${height} · ${formatBytes(bytes)}`
}
