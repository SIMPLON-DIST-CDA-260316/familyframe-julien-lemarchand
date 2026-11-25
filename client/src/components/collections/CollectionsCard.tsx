import { PlusIcon } from 'lucide-react'
import { type JSX, useRef, useState } from 'react'
import { useCollections } from '@/collections/CollectionsContext.ts'
import {
  CollectionNameDialog,
  type NameDialogTarget,
} from '@/components/collections/CollectionNameDialog.tsx'
import { CollectionRow } from '@/components/collections/CollectionRow.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'

function CollectionsList({ onDeleted }: { onDeleted: () => void }): JSX.Element {
  const { collections, status } = useCollections()
  if (status === 'loading') return <p className="text-muted-foreground">Chargement…</p>
  if (status === 'failed') {
    return <p className="text-muted-foreground">Vos collections n'ont pas pu être chargées.</p>
  }
  if (collections.length === 0) {
    return <p className="text-muted-foreground">Aucune collection pour l'instant.</p>
  }
  return (
    <ul className="-mx-4 divide-y">
      {collections.map((collection) => (
        <CollectionRow key={collection.id} collection={collection} onDeleted={onDeleted} />
      ))}
    </ul>
  )
}

export function CollectionsCard(): JSX.Element {
  const [createTarget, setCreateTarget] = useState<NameDialogTarget | null>(null)
  // A deleted row takes its menu button along: focus goes to the card's own button.
  const newButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Mes collections</CardTitle>
        <CardDescription>
          Rangez vos photos par thème : Noël, les vacances, le jardin…
        </CardDescription>
        <CardAction>
          <Button
            ref={newButtonRef}
            variant="outline"
            onClick={() => setCreateTarget({ kind: 'create' })}
          >
            <PlusIcon aria-hidden data-icon="inline-start" />
            Nouvelle collection
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <CollectionsList onDeleted={() => newButtonRef.current?.focus()} />
      </CardContent>
      <CollectionNameDialog target={createTarget} onClose={() => setCreateTarget(null)} />
    </Card>
  )
}
