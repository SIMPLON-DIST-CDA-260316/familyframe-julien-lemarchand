import { TimerIcon } from 'lucide-react'
import type { JSX } from 'react'
import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
import {
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu.tsx'
import { SLIDESHOW_INTERVALS_MS } from '@/hooks/useSlideshow.ts'
import type { Photo } from '@/photo.ts'

const MS_PER_SECOND = 1000

type SlideshowMenuProps = {
  photo: Photo
  intervalMs: number
  onIntervalChange: (intervalMs: number) => void
}

export function SlideshowMenu({
  photo,
  intervalMs,
  onIntervalChange,
}: SlideshowMenuProps): JSX.Element {
  function selectInterval(value: string): void {
    // Radio values are strings: only a speed from the list goes back to the slideshow.
    const selectedMs = SLIDESHOW_INTERVALS_MS.find((interval) => String(interval) === value)
    if (selectedMs !== undefined) onIntervalChange(selectedMs)
  }

  return (
    <PhotoActionsMenu photo={photo} label="Actions sur la photo" className={GLASS_BUTTON_CLASSES}>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <TimerIcon />
          Vitesse
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          {/* `dark`: the submenu portals to body, outside the frame's dark <main>. */}
          <DropdownMenuSubContent className="dark">
            <DropdownMenuRadioGroup value={String(intervalMs)} onValueChange={selectInterval}>
              {SLIDESHOW_INTERVALS_MS.map((interval) => (
                <DropdownMenuRadioItem key={interval} value={String(interval)}>
                  {interval / MS_PER_SECOND} s
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
    </PhotoActionsMenu>
  )
}
