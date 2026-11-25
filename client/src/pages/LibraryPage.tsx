import type { JSX } from 'react'
import { FriendsCallToAction } from '@/components/library/FriendsCallToAction.tsx'
import { LibrarySection } from '@/components/library/LibrarySection.tsx'
import { UploadForm } from '@/components/library/UploadForm.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { usePhotoLibrary } from '@/hooks/usePhotoLibrary.ts'

export default function LibraryPage(): JSX.Element {
  const library = usePhotoLibrary()

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl">Ajouter une photo</CardTitle>
            <CardDescription>
              Elle rejoint votre bibliothèque et s'affiche sur votre cadre.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadForm onUploaded={library.addPhoto} />
          </CardContent>
        </Card>
        <FriendsCallToAction />
      </div>
      <LibrarySection library={library} />
    </main>
  )
}
