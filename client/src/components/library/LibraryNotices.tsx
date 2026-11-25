import { ImagePlusIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button.tsx'

const NOTICE_CLASSES = 'flex flex-col items-center gap-4 px-6 py-16 text-center'

export function EmptyLibrary({ onAdd }: { onAdd: () => void }): JSX.Element {
  return (
    <div className={NOTICE_CLASSES}>
      <p className="text-muted-foreground">Aucune photo pour l'instant.</p>
      <Button size="lg" className="pointer-coarse:h-11" onClick={onAdd}>
        <ImagePlusIcon aria-hidden data-icon="inline-start" />
        Ajouter une photo
      </Button>
    </div>
  )
}

export function EmptyCollection(): JSX.Element {
  return (
    <div className={NOTICE_CLASSES}>
      <p className="font-medium">Cette collection est vide.</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Rangez-y des photos depuis leur menu « … », dans « Toutes ».
      </p>
    </div>
  )
}

// A collection deleted on another device, or a link to someone else's: the way back is offered.
export function UnavailableCollection({ message }: { message: string }): JSX.Element {
  return (
    <div className={NOTICE_CLASSES}>
      <p className="text-muted-foreground">{message}</p>
      <Button asChild variant="outline" className="pointer-coarse:h-11">
        <Link to="/">Voir toutes les photos</Link>
      </Button>
    </div>
  )
}
