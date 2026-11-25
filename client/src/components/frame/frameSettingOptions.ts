import { type PlaybackOrder, SLIDESHOW_INTERVALS_MS } from '@/frameSettings.ts'

export type SettingOption<Value> = { value: Value; label: string }

// Radio and toggle values are strings: only an option from the list goes back as a setting.
export function optionSelector<Value>(
  options: SettingOption<Value>[],
  onSelect: (value: Value) => void,
): (selected: string) => void {
  return (selected) => {
    const option = options.find(({ value }) => String(value) === selected)
    if (option !== undefined) onSelect(option.value)
  }
}

const MS_PER_SECOND = 1000

export const ORDER_OPTIONS: SettingOption<PlaybackOrder>[] = [
  { value: 'newest', label: "Dans l'ordre" },
  { value: 'shuffle', label: 'Aléatoire' },
]

export const INTERVAL_OPTIONS: SettingOption<number>[] = SLIDESHOW_INTERVALS_MS.map(
  (intervalMs) => ({ value: intervalMs, label: `${intervalMs / MS_PER_SECOND} s` }),
)
