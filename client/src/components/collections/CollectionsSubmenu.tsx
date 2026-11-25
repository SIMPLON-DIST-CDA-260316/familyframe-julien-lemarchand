import { FolderIcon, PlusIcon } from 'lucide-react'
import type { JSX } from 'react'
import { toast } from 'sonner'
import { useCollections } from '@/collections/CollectionsContext.ts'
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu.tsx'

// `dark`: the submenu portals to body, outside the frame's dark <main>. A long list scrolls
// inside the screen instead of being cut.
const SUB_CONTENT_CLASS =
  'dark max-h-(--radix-dropdown-menu-content-available-height) max-w-64 overflow-y-auto'

type CollectionsSubmenuProps = {
  photoId: string
  // Opens the naming dialog: the photo menu adds its photo to the new collection.
  onCreate: () => void
}

// A failure shows in a toast; the box follows the list, so it stays as it was.
function useMembershipToggle(photoId: string): (id: string, isChecked: boolean) => Promise<void> {
  const { addPhoto, removePhoto } = useCollections()
  return async (id, isChecked) => {
    const result = isChecked ? await addPhoto(id, photoId) : await removePhoto(id, photoId)
    if (!result.isSuccess) toast.error(result.message)
  }
}

// One box per collection, ticked when the photo is in it.
function CollectionCheckboxes({ photoId }: { photoId: string }): JSX.Element {
  const { collections } = useCollections()
  const toggle = useMembershipToggle(photoId)
  return (
    <>
      {collections.map(({ id, name, photoIds }) => (
        // preventDefault keeps the menu open: several boxes can be ticked in a row.
        <DropdownMenuCheckboxItem
          key={id}
          checked={photoIds.includes(photoId)}
          onSelect={(event) => event.preventDefault()}
          onCheckedChange={(isChecked) => toggle(id, isChecked)}
          className="wrap-anywhere"
        >
          {name}
        </DropdownMenuCheckboxItem>
      ))}
      {collections.length > 0 && <DropdownMenuSeparator />}
    </>
  )
}

export function CollectionsSubmenu({ photoId, onCreate }: CollectionsSubmenuProps): JSX.Element {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <FolderIcon />
        Collections
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent className={SUB_CONTENT_CLASS}>
          <CollectionCheckboxes photoId={photoId} />
          <DropdownMenuItem onSelect={onCreate}>
            <PlusIcon />
            Nouvelle collection…
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  )
}
