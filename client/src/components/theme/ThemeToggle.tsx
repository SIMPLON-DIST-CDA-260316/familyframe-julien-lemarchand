import { type LucideIcon, MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { type JSX, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'
import {
  isThemePreference,
  readThemePreference,
  saveThemePreference,
  type ThemePreference,
} from '@/theme.ts'

type ThemeOption = { value: ThemePreference; label: string; icon: LucideIcon }

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Clair', icon: SunIcon },
  { value: 'dark', label: 'Sombre', icon: MoonIcon },
  { value: 'system', label: 'Système', icon: MonitorIcon },
]

// Lives in the avatar menu, on a computer and on a phone.
export function ThemeToggle(): JSX.Element {
  const [preference, setPreference] = useState(readThemePreference)

  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1.5">
      <span className="text-sm">Thème</span>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={0}
        value={preference}
        // Radix sends '' when the pressed item is clicked again: keep the current theme.
        onValueChange={(value) => {
          if (!isThemePreference(value)) return
          saveThemePreference(value)
          setPreference(value)
        }}
        aria-label="Thème"
      >
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <ToggleGroupItem key={value} value={value} aria-label={label} title={label}>
            <Icon aria-hidden />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
