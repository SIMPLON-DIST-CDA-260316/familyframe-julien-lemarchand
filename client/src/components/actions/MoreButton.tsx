import { EllipsisIcon } from 'lucide-react'
import type { ComponentProps, JSX } from 'react'
import { IconButton } from '@/components/actions/IconButton.tsx'

// The « … » that opens a menu. Its props, ref included (React 19 passes it as a prop), reach the
// button: a DropdownMenuTrigger asChild hands it its click, its state and its ref.
export function MoreButton(
  props: Omit<ComponentProps<typeof IconButton>, 'children'>,
): JSX.Element {
  return (
    <IconButton {...props}>
      <EllipsisIcon />
    </IconButton>
  )
}
