import { useEffect, useState } from 'react'
import {
  FRAME_SETTINGS_KEY,
  type FrameSettings,
  type FrameTemplate,
  type PlaybackOrder,
  readFrameSettings,
  writeFrameSettings,
} from '@/frameSettings.ts'
import type { PhotoSource } from '@/photoSource.ts'

export type FrameSettingsControls = FrameSettings & {
  onTemplateChange: (template: FrameTemplate) => void
  onOrderChange: (order: PlaybackOrder) => void
  onIntervalChange: (intervalMs: number) => void
  onSourceChange: (source: PhotoSource) => void
}

// Per device, in this browser: a kitchen tablet and a living-room TV keep their own choices.
export function useFrameSettings(): FrameSettingsControls {
  // A function, not its result: storage is read on the first render only.
  const [settings, setSettings] = useState(readFrameSettings)

  useEffect(() => {
    // The settings page and the frame can be open side by side, in two tabs of this browser.
    function handleStorage({ key }: StorageEvent): void {
      // null: the whole storage was cleared.
      if (key === FRAME_SETTINGS_KEY || key === null) setSettings(readFrameSettings())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  function change(update: Partial<FrameSettings>): void {
    const nextSettings = { ...settings, ...update }
    setSettings(nextSettings)
    writeFrameSettings(nextSettings)
  }

  return {
    ...settings,
    onTemplateChange: (template) => change({ template }),
    onOrderChange: (order) => change({ order }),
    onIntervalChange: (intervalMs) => change({ intervalMs }),
    onSourceChange: (source) => change({ source }),
  }
}
