import { FrameIcon, ImagesIcon, ShuffleIcon, TimerIcon } from 'lucide-react'
import type { JSX } from 'react'
import { useCollections } from '@/collections/CollectionsContext.ts'
import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
import {
  INTERVAL_OPTIONS,
  ORDER_OPTIONS,
  sourceOptions,
  TEMPLATE_OPTIONS,
} from '@/components/frame/frameSettingOptions.ts'
import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
import { RadioSubmenu } from '@/components/frame/RadioSubmenu.tsx'
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu.tsx'
import type { FrameSettingsControls } from '@/hooks/useFrameSettings.ts'
import type { Photo } from '@/photo.ts'
import { playedSourceKey, sourceFromKey } from '@/photoSource.ts'

type SlideshowMenuProps = {
  photo: Photo
  settings: FrameSettingsControls
}

// What the frame plays: the library or one collection.
function SourceSubmenu({ settings }: { settings: FrameSettingsControls }): JSX.Element {
  const { collections } = useCollections()
  return (
    <RadioSubmenu
      icon={ImagesIcon}
      label="Photos"
      options={sourceOptions(collections)}
      value={playedSourceKey(settings.source, collections)}
      onValueChange={(key) => settings.onSourceChange(sourceFromKey(key))}
    />
  )
}

export function SlideshowMenu({ photo, settings }: SlideshowMenuProps): JSX.Element {
  return (
    <PhotoActionsMenu photo={photo} label="Actions sur la photo" className={GLASS_BUTTON_CLASSES}>
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
