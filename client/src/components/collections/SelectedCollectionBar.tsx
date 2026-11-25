import type { JSX } from 'react'
import type { Collection } from '@/collections/collection.ts'

export function SelectedCollectionBar({ collection }: { collection: Collection }): JSX.Element {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <h2 className="text-lg font-medium wrap-anywhere">{collection.name}</h2>
    </div>
  )
}
