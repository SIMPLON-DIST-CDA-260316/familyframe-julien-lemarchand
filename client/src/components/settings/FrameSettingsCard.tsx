import type { JSX } from 'react'
import { useCollections } from '@/collections/CollectionsContext.ts'
import {
  INTERVAL_OPTIONS,
  ORDER_OPTIONS,
  sourceOptions,
  TEMPLATE_OPTIONS,
} from '@/components/frame/frameSettingOptions.ts'
import { SettingToggleGroup } from '@/components/settings/SettingToggleGroup.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { type FrameSettingsControls, useFrameSettings } from '@/hooks/useFrameSettings.ts'
import { playedSourceKey, sourceFromKey } from '@/photoSource.ts'

// What the frame plays, as in its menu: the library or one collection.
function SourceToggleGroup({ settings }: { settings: FrameSettingsControls }): JSX.Element {
  const { collections } = useCollections()
  return (
    <SettingToggleGroup
      label="Photos"
      options={sourceOptions(collections)}
      value={playedSourceKey(settings.source, collections)}
      onValueChange={(key) => settings.onSourceChange(sourceFromKey(key))}
    />
  )
}

function FrameSettingsGroups({ settings }: { settings: FrameSettingsControls }): JSX.Element {
  return (
    <>
      <SourceToggleGroup settings={settings} />
      <SettingToggleGroup
        label="Affichage"
        options={TEMPLATE_OPTIONS}
        value={settings.template}
        onValueChange={settings.onTemplateChange}
      />
      <SettingToggleGroup
        label="Lecture"
        options={ORDER_OPTIONS}
        value={settings.order}
        onValueChange={settings.onOrderChange}
      />
      <SettingToggleGroup
        label="Vitesse"
        options={INTERVAL_OPTIONS}
        value={settings.intervalMs}
        onValueChange={settings.onIntervalChange}
      />
    </>
  )
}

// No « Enregistrer »: these settings stay in this browser, so each choice is saved at once.
export function FrameSettingsCard(): JSX.Element {
  const settings = useFrameSettings()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadre de cet appareil</CardTitle>
        <CardDescription>Ces réglages ne concernent que cet appareil.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <FrameSettingsGroups settings={settings} />
      </CardContent>
    </Card>
  )
}
