const FULL_PERCENT = 100

// collectionName: where the photos were filed, null when they only went to the library.
export type UploadTally = {
  addedCount: number
  refusedCount: number
  collectionName: string | null
}

function destination(collectionName: string | null): string {
  return collectionName === null ? 'à votre bibliothèque' : `à « ${collectionName} »`
}

function addedPhotos(addedCount: number): string {
  return addedCount === 1 ? '1 photo ajoutée' : `${addedCount} photos ajoutées`
}

function refusedPhotos(refusedCount: number): string {
  return refusedCount === 1 ? '1 refusée' : `${refusedCount} refusées`
}

// One line for a whole queue. null for a single refused photo: its own message gave the reason.
export function uploadSummary({
  addedCount,
  refusedCount,
  collectionName,
}: UploadTally): string | null {
  const place = destination(collectionName)
  if (refusedCount === 0) {
    return addedCount === 1 ? `Photo ajoutée ${place}.` : `${addedCount} photos ajoutées ${place}.`
  }
  if (addedCount === 0) {
    return refusedCount === 1 ? null : `Aucune photo ajoutée, ${refusedPhotos(refusedCount)}.`
  }
  return `${addedPhotos(addedCount)} ${place}, ${refusedPhotos(refusedCount)}.`
}

// Polite announcement for screen readers: it changes only when a photo leaves the queue.
export function pendingAnnouncement(pendingCount: number): string {
  if (pendingCount === 0) return ''
  return pendingCount === 1
    ? "Envoi d'une photo en cours."
    : `Envoi de ${pendingCount} photos en cours.`
}

// A phone's tile is about 100 px wide: only the percentage fits. null while waiting: the empty
// bar says it alone.
export function pendingShortLabel(progress: number | null): string | null {
  return progress === null ? null : `${progress} %`
}

// null: still waiting its turn. 100: every byte has left, the server prepares the photo.
export function pendingProgressLabel(progress: number | null): string {
  if (progress === null) return 'En attente'
  if (progress === FULL_PERCENT) return 'Finalisation…'
  return `${progress} %`
}
