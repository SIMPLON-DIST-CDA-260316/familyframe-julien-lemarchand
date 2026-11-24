import { HouseIcon, ImageOffIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button.tsx'

export default function NotFoundPage(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl border bg-muted/50">
        <ImageOffIcon aria-hidden className="size-7 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-widest text-muted-foreground">ERREUR 404</p>
        <h1 className="text-3xl font-semibold tracking-tight">Cette page n'existe pas</h1>
        <p className="text-muted-foreground">
          L'adresse est peut-être mal tapée, ou la page a changé de place.
        </p>
      </div>
      <Button asChild size="lg">
        <Link to="/">
          <HouseIcon aria-hidden data-icon="inline-start" />
          Retour à ma bibliothèque
        </Link>
      </Button>
    </main>
  )
}
