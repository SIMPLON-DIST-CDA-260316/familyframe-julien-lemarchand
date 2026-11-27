import type { JSX, ReactNode } from 'react'
import { Link } from 'react-router'
import { useCollections } from '@/collections/CollectionsContext.ts'
import type { Photo } from '@/photo.ts'
import { formatAddedAt, formatImageSize } from '@/photoInfo.ts'
import { quotedMessage } from '@/photoLabel.ts'
import { libraryPath } from '@/viewerHistory.ts'

// Named by the Infos button's aria-controls, in the side panel as in the drawer.
export const PHOTO_INFO_ID = 'photo-info'

function InfoItem({ term, children }: { term: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{term}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  )
}

// Replace: the collection takes the open photo's place in the history, and back leaves it as
// it would leave the photo.
function PhotoCollections({ photoId }: { photoId: string }): JSX.Element {
  const { collections } = useCollections()
  const photoCollections = collections.filter(({ photoIds }) => photoIds.includes(photoId))
  if (photoCollections.length === 0) {
    return <p className="text-muted-foreground">Dans aucune collection</p>
  }
  return (
    <ul className="flex flex-col gap-1">
      {photoCollections.map(({ id, name }) => (
        <li key={id}>
          <Link to={libraryPath(id)} replace className="underline underline-offset-4">
            {name}
          </Link>
        </li>
      ))}
    </ul>
  )
}

// Never a place: the photos keep no location, and the infos would not show one.
export function PhotoInfo({ photo }: { photo: Photo }): JSX.Element {
  const imageSize = formatImageSize(photo)
  return (
    <dl id={PHOTO_INFO_ID} className="flex flex-col gap-5">
      <InfoItem term={photo.senderName === null ? 'Ajoutée' : 'Reçue'}>
        <time dateTime={photo.createdAt}>{formatAddedAt(photo.createdAt, new Date())}</time>
      </InfoItem>
      {photo.senderName !== null && (
        <InfoItem term="Envoyée par">
          {photo.senderName}
          {photo.message !== null && (
            <span className="mt-1 block whitespace-pre-line">{quotedMessage(photo.message)}</span>
          )}
        </InfoItem>
      )}
      <InfoItem term="Collections">
        <PhotoCollections photoId={photo.id} />
      </InfoItem>
      {imageSize !== null && <InfoItem term="Image">{imageSize}</InfoItem>}
    </dl>
  )
}
