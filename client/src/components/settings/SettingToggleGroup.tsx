import { type JSX, useId } from 'react'
import { optionSelector, type SettingOption } from '@/components/frame/frameSettingOptions.ts'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'

// The muted pressed background barely shows on the dark card: the chosen item is inverted.
const ITEM_CLASSES =
  'data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:hover:bg-foreground/90'

type SettingToggleGroupProps<Value extends string | number> = {
  label: string
  options: SettingOption<Value>[]
  value: Value
  onValueChange: (value: Value) => void
}

// A single-choice toggle group: Radix gives its items the radio role. Pressing the chosen item
// again sends '', which optionSelector ignores: a setting always keeps a value.
export function SettingToggleGroup<Value extends string | number>({
  options,
  ...props
}: SettingToggleGroupProps<Value>): JSX.Element {
  // Names the group for screen readers.
  const labelId = useId()

  return (
    <div className="flex flex-col gap-2">
      <p id={labelId} className="text-sm font-medium">
        {props.label}
      </p>
      <ToggleGroup
        type="single"
        variant="outline"
        value={String(props.value)}
        onValueChange={optionSelector(options, props.onValueChange)}
        aria-labelledby={labelId}
        className="flex-wrap"
      >
        {options.map((option) => (
          <ToggleGroupItem key={option.value} value={String(option.value)} className={ITEM_CLASSES}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
