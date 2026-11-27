import { type JSX, type SubmitEvent, useState } from 'react'
import { useCollections } from '@/collections/CollectionsContext.ts'
import { type Collection, MAX_COLLECTION_NAME_LENGTH } from '@/collections/collection.ts'
import { TextField } from '@/components/form/TextField.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'

// rename carries the collection: the field starts from its current name.
export type NameDialogTarget = { kind: 'create' } | { kind: 'rename'; collection: Collection }

type CollectionNameDialogProps = {
  target: NameDialogTarget | null
  onClose: () => void
  // After a success: the photo menu adds its photo to the collection it just created.
  onSaved?: (collection: Collection) => void
  onCloseAutoFocus?: (event: Event) => void
  // The dialog portals to body: the caller passes its theme (`dark` on the frame).
  className?: string
}

type CollectionNameFormProps = {
  target: NameDialogTarget
  onDone: (collection: Collection) => void
}

const TEXTS = {
  create: {
    title: 'Nouvelle collection',
    description: 'Donnez-lui un nom, puis rangez-y vos photos depuis leur menu « … ».',
    submit: 'Créer',
  },
  rename: {
    title: 'Renommer la collection',
    description: "Le nouveau nom s'affiche partout, sur tous vos appareils.",
    submit: 'Renommer',
  },
}

type NameFormState = {
  name: string
  changeName: (name: string) => void
  isSaving: boolean
  error: string
  handleSubmit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>
}

function useCollectionNameForm(
  target: NameDialogTarget,
  onDone: (collection: Collection) => void,
): NameFormState {
  const { create, rename } = useCollections()
  const [name, setName] = useState(target.kind === 'rename' ? target.collection.name : '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setIsSaving(true)
    const result =
      target.kind === 'create' ? await create(name) : await rename(target.collection.id, name)
    setIsSaving(false)
    if (result.isSuccess) onDone(result.collection)
    else setError(result.message)
  }

  // Editing the name makes the last error stale.
  function changeName(nextName: string): void {
    setName(nextName)
    setError('')
  }

  return { name, changeName, isSaving, error, handleSubmit }
}

// Inside the dialog content: closing unmounts it, so the next opening starts afresh.
function CollectionNameForm({ target, onDone }: CollectionNameFormProps): JSX.Element {
  const { name, changeName, isSaving, error, handleSubmit } = useCollectionNameForm(target, onDone)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <TextField
        id="collection-name"
        enterKeyHint="done"
        label="Nom de la collection"
        type="text"
        autoComplete="off"
        value={name}
        onChange={changeName}
        maxLength={MAX_COLLECTION_NAME_LENGTH}
      />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="lg" disabled={isSaving}>
        {isSaving ? 'Enregistrement…' : TEXTS[target.kind].submit}
      </Button>
    </form>
  )
}

export function CollectionNameDialog({
  target,
  onClose,
  onSaved,
  onCloseAutoFocus,
  className,
}: CollectionNameDialogProps): JSX.Element | null {
  if (!target) return null
  const texts = TEXTS[target.kind]
  function handleDone(collection: Collection): void {
    onSaved?.(collection)
    onClose()
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={className} onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>{texts.title}</DialogTitle>
          <DialogDescription>{texts.description}</DialogDescription>
        </DialogHeader>
        <CollectionNameForm target={target} onDone={handleDone} />
      </DialogContent>
    </Dialog>
  )
}
