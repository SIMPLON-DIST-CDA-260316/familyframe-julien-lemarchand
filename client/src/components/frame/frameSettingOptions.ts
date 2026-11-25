import type { Collection } from '@/collections/collection.ts'
import { type FrameTemplate, type PlaybackOrder, SLIDESHOW_INTERVALS_MS } from '@/frameSettings.ts'
import { DAILY_SOURCE, LIBRARY_SOURCE, sourceKey } from '@/photoSource.ts'

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

export const TEMPLATE_OPTIONS: SettingOption<FrameTemplate>[] = [
  { value: 'fit', label: 'Ajusté' },
  { value: 'fill', label: 'Plein format' },
  { value: 'mat', label: 'Passe-partout' },
  { value: 'polaroid', label: 'Polaroïd' },
]

export const ORDER_OPTIONS: SettingOption<PlaybackOrder>[] = [
  { value: 'newest', label: "Dans l'ordre" },
  { value: 'shuffle', label: 'Aléatoire' },
]

export const INTERVAL_OPTIONS: SettingOption<number>[] = SLIDESHOW_INTERVALS_MS.map(
  (intervalMs) => ({ value: intervalMs, label: `${intervalMs / MS_PER_SECOND} s` }),
)

// The library and the day's selection first, then each collection by name, as the collections
// list shows them.
export function sourceOptions(collections: Collection[]): SettingOption<string>[] {
  return [
    { value: sourceKey(LIBRARY_SOURCE), label: 'Toute la bibliothèque' },
    { value: sourceKey(DAILY_SOURCE), label: 'Sélection du jour' },
    ...collections.map(({ id, name }) => ({
      value: sourceKey({ kind: 'collection', collectionId: id }),
      label: name,
    })),
  ]
}
