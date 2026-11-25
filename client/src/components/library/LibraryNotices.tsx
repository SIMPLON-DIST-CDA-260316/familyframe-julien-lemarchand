import { ImagePlusIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button.tsx'

const NOTICE_CLASSES = 'flex flex-col items-center gap-4 px-6 py-16 text-center'

type AddProps = { onAdd: () => void }

function AddPhotoButton({ onAdd }: AddProps): JSX.Element {
  return (
    <Button size="lg" onClick={onAdd}>
      <ImagePlusIcon aria-hidden data-icon="inline-start" />
      Ajouter une photo
    </Button>
  )
}

export function EmptyLibrary({ onAdd }: AddProps): JSX.Element {
  return (
    <div className={NOTICE_CLASSES}>
      <p className="text-muted-foreground">Aucune photo pour l'instant.</p>
      <AddPhotoButton onAdd={onAdd} />
    </div>
  )
}

export function EmptyCollection({ onAdd }: AddProps): JSX.Element {
  return (
    <div className={NOTICE_CLASSES}>
      <p className="font-medium">Cette collection est vide.</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Ajoutez-y une photo, ou rangez-y celles de « Toutes » depuis leur menu « … ».
      </p>
      <AddPhotoButton onAdd={onAdd} />
    </div>
  )
}

// A collection deleted on another device, or a link to someone else's: the way back is offered.
export function UnavailableCollection({ message }: { message: string }): JSX.Element {
  return (
    <div className={NOTICE_CLASSES}>
      <p className="text-muted-foreground">{message}</p>
      <Button asChild variant="outline">
        <Link to="/">Voir toutes les photos</Link>
      </Button>
    </div>
  )
}
