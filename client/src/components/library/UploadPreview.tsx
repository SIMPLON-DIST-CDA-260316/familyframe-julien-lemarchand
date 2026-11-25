import type { JSX } from 'react'
import { usePreviewUrl } from '@/hooks/usePreviewUrl.ts'
import { chosenPhotosLabel } from '@/upload/uploadTexts.ts'

function SinglePreview({ file }: { file: File }): JSX.Element | null {
  const previewUrl = usePreviewUrl(file)
  if (!previewUrl) return null
  return (
    <img
      className="max-h-[35svh] w-full rounded-lg object-contain"
      src={previewUrl}
      alt="Aperçu avant envoi"
    />
  )
}

function PreviewThumbnail({ file }: { file: File }): JSX.Element {
  const previewUrl = usePreviewUrl(file)
  return (
    <li className="aspect-square overflow-hidden rounded-md bg-muted">
      {previewUrl && (
        <img className="size-full object-cover" src={previewUrl} alt="" decoding="async" />
      )}
    </li>
  )
}

// Several photos: small squares, so twenty still fit in the panel without hiding its buttons.
function PreviewGrid({ files }: { files: File[] }): JSX.Element {
  return (
    <figure className="flex flex-col gap-2">
      <ul className="grid max-h-[35svh] grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-5">
        {files.map((file, index) => (
          // Name, size and date were not a key: two copies of one photo share them.
          // biome-ignore lint/suspicious/noArrayIndexKey: a new choice replaces the whole list, never reorders it.
          <PreviewThumbnail key={index} file={file} />
        ))}
      </ul>
      <figcaption className="text-sm text-muted-foreground">
        {chosenPhotosLabel(files.length)}
      </figcaption>
    </figure>
  )
}

export function UploadPreview({ files }: { files: File[] }): JSX.Element | null {
  if (files.length === 0) return null
  if (files.length === 1) return <SinglePreview file={files[0]} />
  return <PreviewGrid files={files} />
}
