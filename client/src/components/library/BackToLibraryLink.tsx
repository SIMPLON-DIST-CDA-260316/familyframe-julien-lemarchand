import type { JSX } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button.tsx'

export function BackToLibraryLink(): JSX.Element {
  return (
    <Button asChild variant="ghost" size="sm">
      <Link to="/">Retour à la bibliothèque</Link>
    </Button>
  )
}
