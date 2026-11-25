import type { LucideIcon } from 'lucide-react'
import type { JSX } from 'react'
import { optionSelector, type SettingOption } from '@/components/frame/frameSettingOptions.ts'
import {
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu.tsx'

type RadioSubmenuProps<Value extends string | number> = {
  icon: LucideIcon
  label: string
  options: SettingOption<Value>[]
  value: Value
  onValueChange: (value: Value) => void
}

export function RadioSubmenu<Value extends string | number>({
  icon: Icon,
  options,
  ...props
}: RadioSubmenuProps<Value>): JSX.Element {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Icon />
        {props.label}
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        {/* `dark`: the submenu portals to body, outside the frame's dark <main>. */}
        <DropdownMenuSubContent className="dark">
          <DropdownMenuRadioGroup
            value={String(props.value)}
            onValueChange={optionSelector(options, props.onValueChange)}
          >
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={String(option.value)}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  )
}
