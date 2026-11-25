import type { JSX } from 'react'
import { CollectionsCard } from '@/components/collections/CollectionsCard.tsx'
import { FriendsCallToAction } from '@/components/library/FriendsCallToAction.tsx'
import { LibrarySection } from '@/components/library/LibrarySection.tsx'
import { UploadForm } from '@/components/library/UploadForm.tsx'
import { LibraryMail } from '@/components/mail/LibraryMail.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { PhotoViewer } from '@/components/viewer/PhotoViewer.tsx'
import { usePhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import { useViewerParam } from '@/hooks/useViewerParam.ts'

export default function LibraryPage(): JSX.Element {
  const library = usePhotoLibrary()
  const viewer = useViewerParam()

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      {/* First on the page: news from the family comes before adding one's own photos. */}
      <LibraryMail />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl">Ajouter une photo</CardTitle>
            <CardDescription>
              Ajoutez-la à votre bibliothèque ou envoyez-la directement à un ami.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadForm onUploaded={library.addPhoto} />
          </CardContent>
        </Card>
        <FriendsCallToAction />
      </div>
      <CollectionsCard />
      <LibrarySection library={library} onOpenPhoto={viewer.open} />
      {viewer.openId !== null && (
        <PhotoViewer library={library} openId={viewer.openId} viewer={viewer} />
      )}
    </main>
  )
}
