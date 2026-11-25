// « Aucune photo », « 1 photo », « 12 photos »: the library's header and the collection cards.
export function photoCountLabel(count: number): string {
  if (count === 0) return 'Aucune photo'
  return count === 1 ? '1 photo' : `${count} photos`
}

// The API sends no total: « Plus de 30 photos » while older pages are not loaded yet.
export function libraryCountLabel(loadedCount: number, hasMore: boolean): string {
  if (hasMore) return `Plus de ${loadedCount} photos`
  return photoCountLabel(loadedCount)
}
