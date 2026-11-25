// The API sends no total: « Plus de 30 photos » while older pages are not loaded yet.
export function libraryCountLabel(loadedCount: number, hasMore: boolean): string {
  if (hasMore) return `Plus de ${loadedCount} photos`
  if (loadedCount === 0) return 'Aucune photo'
  return loadedCount === 1 ? '1 photo' : `${loadedCount} photos`
}
