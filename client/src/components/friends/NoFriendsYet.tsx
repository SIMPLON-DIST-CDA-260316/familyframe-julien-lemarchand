import { UserPlusIcon, UsersIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Button } from '@/components/ui/button.tsx'

export function NoFriendsYet({ onAddFriend }: { onAddFriend: () => void }): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <UsersIcon aria-hidden className="size-10 text-muted-foreground" />
      <p className="font-medium">Pas encore d'amis</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Ajoutez un proche pour pouvoir lui envoyer vos photos.
      </p>
      <Button variant="outline" onClick={onAddFriend}>
        <UserPlusIcon aria-hidden data-icon="inline-start" />
        Ajouter un ami
      </Button>
    </div>
  )
}
