import { errorMessage } from '@/api.ts'
import type { Photo } from '@/photo.ts'

// The list is not touched here: the server's photo:deleted reaches every frame, this one included.
// No pending state on the buttons: kept minimal, see the frame deletion spec.
export async function deletePhoto({ id, uploaderName }: Photo): Promise<void> {
  if (!window.confirm(`Supprimer la photo envoyée par ${uploaderName} ?`)) return
  try {
    const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      // Not JSON when the dev proxy answers for a stopped API.
      const data: unknown = await res.json().catch(() => null)
      window.alert(errorMessage(data))
    }
  } catch {
    window.alert(errorMessage(null))
  }
}
