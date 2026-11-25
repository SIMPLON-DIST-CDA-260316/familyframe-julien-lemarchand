import type { JSX } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'
import { cn } from '@/lib/utils.ts'

export type FriendsView = 'friends' | 'pending'

function isFriendsView(value: string): value is FriendsView {
  return value === 'friends' || value === 'pending'
}

type FriendsViewToggleProps = {
  view: FriendsView
  onViewChange: (view: FriendsView) => void
  friendCount: number
  pendingCount: number
  // Received requests wait for my answer: their count stands out.
  incomingCount: number
}

// iOS-style segments: a muted track, the chosen segment raised on it.
const SEGMENT_CLASSES =
  'h-9 flex-1 gap-2 px-4 text-muted-foreground hover:bg-transparent data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm'
const COUNT_CLASSES = 'rounded-full bg-foreground/10 px-1.5 text-xs tabular-nums'

function Count({ value, className }: { value: number; className?: string }): JSX.Element {
  return <span className={cn(COUNT_CLASSES, className)}>{value}</span>
}

export function FriendsViewToggle({
  view,
  onViewChange,
  friendCount,
  pendingCount,
  incomingCount,
}: FriendsViewToggleProps): JSX.Element {
  return (
    <ToggleGroup
      type="single"
      spacing={1}
      value={view}
      // Radix sends '' when the pressed item is clicked again: keep the current view.
      onValueChange={(value) => {
        if (isFriendsView(value)) onViewChange(value)
      }}
      aria-label="Liste affichée"
      className="w-full bg-muted p-1"
    >
      <ToggleGroupItem value="friends" className={SEGMENT_CLASSES}>
        Mes amis <Count value={friendCount} />
      </ToggleGroupItem>
      <ToggleGroupItem value="pending" className={SEGMENT_CLASSES}>
        En attente{' '}
        <Count
          value={pendingCount}
          className={cn(incomingCount > 0 && 'bg-destructive text-white')}
        />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
