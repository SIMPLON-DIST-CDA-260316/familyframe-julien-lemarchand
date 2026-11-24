import type { JSX } from 'react'
import { LibraryActions } from '@/components/library/LibraryActions.tsx'
import { LibrarySection } from '@/components/library/LibrarySection.tsx'
import { UploadForm } from '@/components/library/UploadForm.tsx'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import { usePhotoLibrary } from '@/hooks/usePhotoLibrary.ts'

export default function LibraryPage(): JSX.Element {
  const library = usePhotoLibrary()

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">FamilyFrame</CardTitle>
          <CardDescription>
            Ajoutez une photo à votre bibliothèque : elle s'affiche sur votre cadre.
          </CardDescription>
          <CardAction>
            <LibraryActions />
          </CardAction>
        </CardHeader>
        <CardContent>
          <UploadForm onUploaded={library.addPhoto} />
        </CardContent>
      </Card>
      <LibrarySection library={library} />
    </main>
  )
}
