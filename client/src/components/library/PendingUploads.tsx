import type { JSX } from 'react'
import {
  pendingAnnouncement,
  pendingProgressLabel,
  pendingShortLabel,
} from '@/components/library/uploadTexts.ts'
import { usePreviewUrl } from '@/hooks/usePreviewUrl.ts'
import { cn } from '@/lib/utils.ts'
import type { PendingUpload } from '@/upload/uploadQueue.ts'

type PendingProps = { upload: PendingUpload }

// onPhoto: drawn over the greyed preview, on a dark pill whatever the theme. onPage: on the
// library's own surface, which follows the theme.
type BarTone = 'onPhoto' | 'onPage'

const BAR_CLASSES: Record<BarTone, { track: string; fill: string }> = {
  onPhoto: { track: 'bg-white/25', fill: 'bg-frame-accent' },
  onPage: { track: 'bg-foreground/15', fill: 'bg-primary' },
}

const PENDING_ALT = "Photo en cours d'envoi"

// Same corners as the photo tiles. Square before the preview is ready: no jump when it appears.
const GRID_TILE_CLASSES = 'relative aspect-square overflow-hidden rounded-sm bg-muted sm:rounded-xl'

// The same dark pill as the tiles' « … »: readable over any photo, in either theme. Tighter on a
// phone, where three columns leave each tile about 100 px.
const GRID_PILL_CLASSES =
  'absolute inset-x-1 bottom-1 flex flex-col gap-1 rounded-md bg-black/55 px-1.5 py-1 text-xs font-medium text-white backdrop-blur-sm sm:inset-x-2 sm:bottom-2 sm:gap-1.5 sm:rounded-lg sm:px-2.5 sm:py-2 sm:text-sm'

const PROGRESS_MAX = 100

// Not a live region itself: one announcement per photo is enough, not one per percent. No value
// while waiting: an indeterminate bar, not « 0 % » under « En attente ».
function ProgressBar({ progress, tone }: { progress: number | null; tone: BarTone }): JSX.Element {
  const { track, fill } = BAR_CLASSES[tone]
  return (
    <div
      role="progressbar"
      aria-label="Progression de l'envoi"
      aria-valuemin={0}
      aria-valuemax={PROGRESS_MAX}
      aria-valuenow={progress ?? undefined}
      className={cn('h-1.5 w-full overflow-hidden rounded-full', track)}
    >
      <div
        className={cn('h-full rounded-full motion-safe:transition-[width]', fill)}
        style={{ width: `${progress ?? 0}%` }}
      />
    </div>
  )
}

// The whole label from sm, the percentage alone on a phone (hidden, not read twice).
function GridTileLabel({ progress }: { progress: number | null }): JSX.Element {
  const shortLabel = pendingShortLabel(progress)
  return (
    <>
      {shortLabel && <span className="tabular-nums sm:hidden">{shortLabel}</span>}
      <span className="tabular-nums max-sm:hidden">{pendingProgressLabel(progress)}</span>
    </>
  )
}

// No button: the photo does not exist on the server yet, the viewer could not open it.
export function PendingGridTile({ upload }: PendingProps): JSX.Element {
  const previewUrl = usePreviewUrl(upload.file)
  return (
    <li className={GRID_TILE_CLASSES}>
      {previewUrl && (
        <img
          className="size-full object-cover opacity-50 grayscale"
          src={previewUrl}
          alt={PENDING_ALT}
          decoding="async"
        />
      )}
      <div className={GRID_PILL_CLASSES}>
        <GridTileLabel progress={upload.progress} />
        <ProgressBar progress={upload.progress} tone="onPhoto" />
      </div>
    </li>
  )
}

export function PendingListRow({ upload }: PendingProps): JSX.Element {
  const previewUrl = usePreviewUrl(upload.file)
  return (
    <li className="flex items-center gap-4 rounded-xl p-2">
      <span className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {previewUrl && (
          <img
            className="size-full object-cover opacity-50 grayscale"
            src={previewUrl}
            alt={PENDING_ALT}
            decoding="async"
          />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5 text-muted-foreground">
        <span className="text-lg tabular-nums">{pendingProgressLabel(upload.progress)}</span>
        <ProgressBar progress={upload.progress} tone="onPage" />
      </span>
    </li>
  )
}

// Always mounted: a live region only announces changes made after it appeared.
export function PendingAnnouncement({ count }: { count: number }): JSX.Element {
  return (
    <p className="sr-only" aria-live="polite">
      {pendingAnnouncement(count)}
    </p>
  )
}
