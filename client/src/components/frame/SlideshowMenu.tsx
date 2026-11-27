import { FrameIcon, ImagesIcon, ShuffleIcon, TimerIcon } from 'lucide-react'
import type { JSX } from 'react'
import { useCollections } from '@/collections/CollectionsContext.ts'
import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
import {
  INTERVAL_OPTIONS,
  ORDER_OPTIONS,
  playedSourceOptions,
  TEMPLATE_OPTIONS,
} from '@/components/frame/frameSettingOptions.ts'
import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
import { RadioSubmenu } from '@/components/frame/RadioSubmenu.tsx'
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu.tsx'
import type { SlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
import type { Photo } from '@/photo.ts'
import { playedSourceKey, sourceFromKey, sourceKey } from '@/photoSource.ts'

type SlideshowMenuProps = {
  photo: Photo
  settings: SlideshowSettings
}

// What the frame plays: the library, the day's selection, one collection, or the radio playing.
// Choosing the radio again does nothing: it is not a stored choice. The library, checked while a
// deleted collection is stored, is stored when chosen.
function SourceSubmenu({ settings }: { settings: SlideshowSettings }): JSX.Element {
  const { collections } = useCollections()
  return (
    <RadioSubmenu
      icon={ImagesIcon}
      label="Photos"
      options={playedSourceOptions(settings.source, collections)}
      value={playedSourceKey(settings.source, collections)}
      onValueChange={(key) => {
        if (key !== sourceKey(settings.source)) settings.onSourceChange(sourceFromKey(key))
      }}
    />
  )
}

export function SlideshowMenu({ photo, settings }: SlideshowMenuProps): JSX.Element {
  return (
    <PhotoActionsMenu
      photo={photo}
      label="Actions sur la photo"
      trigger={{ glassClassName: GLASS_BUTTON_CLASSES }}
    >
      <SourceSubmenu settings={settings} />
      <RadioSubmenu
        icon={FrameIcon}
        label="Affichage"
        options={TEMPLATE_OPTIONS}
        value={settings.template}
        onValueChange={settings.onTemplateChange}
      />
      <RadioSubmenu
        icon={ShuffleIcon}
        label="Lecture"
        options={ORDER_OPTIONS}
        value={settings.order}
        onValueChange={settings.onOrderChange}
      />
      <RadioSubmenu
        icon={TimerIcon}
        label="Vitesse"
        options={INTERVAL_OPTIONS}
        value={settings.intervalMs}
        onValueChange={settings.onIntervalChange}
      />
      <DropdownMenuSeparator />
    </PhotoActionsMenu>
  )
}
