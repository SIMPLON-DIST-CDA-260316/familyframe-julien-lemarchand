import { PauseIcon, PlayIcon } from 'lucide-react'
import type { JSX } from 'react'
import { ControlsBar } from '@/components/frame/ControlsBar.tsx'
import { GLASS_PILL_CLASSES, PILL_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
import { StripToggle } from '@/components/frame/StripToggle.tsx'
import { CarouselNext, CarouselPrevious } from '@/components/ui/carousel.tsx'
import { Toggle } from '@/components/ui/toggle.tsx'
import type { SlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
import { cn } from '@/lib/utils.ts'

// The shadcn arrows sit absolutely beside the carousel; here they flow in the pill.
const PILL_ARROW_CLASSES = cn('static', PILL_BUTTON_CLASSES)

type SlideshowBottomBarProps = {
  isVisible: boolean
  settings: SlideshowSettings
}

// Rendered inside the carousel: the arrows read its context.
export function SlideshowBottomBar({ isVisible, settings }: SlideshowBottomBarProps): JSX.Element {
  return (
    // Three columns: the transport stays centred whatever sits on its right.
    <ControlsBar
      edge="bottom"
      isVisible={isVisible}
      // Floats over the caption's lower edge: hiding the bar moves nothing on screen.
      className="absolute inset-x-0 bottom-full grid grid-cols-[1fr_auto_1fr]"
    >
      <div className={cn(GLASS_PILL_CLASSES, 'col-start-2')}>
        <CarouselPrevious
          variant="ghost"
          aria-label="Photo précédente"
          className={PILL_ARROW_CLASSES}
        />
        <Toggle
          pressed={settings.isPlaying}
          onPressedChange={settings.onPlayingChange}
          aria-label="Lecture automatique"
          className={PILL_BUTTON_CLASSES}
        >
          {settings.isPlaying ? <PauseIcon /> : <PlayIcon />}
        </Toggle>
        <CarouselNext variant="ghost" aria-label="Photo suivante" className={PILL_ARROW_CLASSES} />
      </div>
      <div className="justify-self-end">
        <StripToggle
          isStripVisible={settings.isStripVisible}
          onStripVisibleChange={settings.onStripVisibleChange}
        />
      </div>
    </ControlsBar>
  )
}
