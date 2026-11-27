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

// `dark`: the submenu portals to body, outside the frame's dark <main>. A long list scrolls
// inside the screen instead of being cut. A collection's name can be one long word: it wraps
// instead of widening the menu.
const SUB_CONTENT_CLASS =
  'dark max-h-(--radix-dropdown-menu-content-available-height) max-w-64 overflow-y-auto wrap-anywhere'

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
        <DropdownMenuSubContent className={SUB_CONTENT_CLASS}>
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
