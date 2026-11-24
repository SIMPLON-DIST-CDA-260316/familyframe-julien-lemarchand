import type { JSX } from 'react'
import { BackToLibraryLink } from '@/components/library/BackToLibraryLink.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'

export default function NotFoundPage(): JSX.Element {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Page introuvable</CardTitle>
          <CardDescription>Cette adresse ne mène à aucune page de FamilyFrame.</CardDescription>
        </CardHeader>
        <CardContent>
          <BackToLibraryLink />
        </CardContent>
      </Card>
    </main>
  )
}
