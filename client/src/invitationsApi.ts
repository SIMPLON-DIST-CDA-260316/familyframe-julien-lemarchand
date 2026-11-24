import { errorMessage, UNAUTHORIZED_STATUS } from '@/api.ts'
import { type CreatedInvitation, isCreatedInvitation } from '@/invitation.ts'

export type CreateInvitationResult =
  | { isSuccess: true; created: CreatedInvitation }
  | { isSuccess: false; message: string }

// A 401 calls onUnauthenticated: the session ended on the server, the provider drops the user.
export async function postInvitation(
  email: string,
  onUnauthenticated: () => void,
): Promise<CreateInvitationResult> {
  try {
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (res.status === UNAUTHORIZED_STATUS) onUnauthenticated()
    // Not JSON when the dev proxy answers for a stopped API.
    const data: unknown = await res.json().catch(() => null)
    if (res.ok && isCreatedInvitation(data)) return { isSuccess: true, created: data }
    return { isSuccess: false, message: errorMessage(data) }
  } catch {
    // fetch rejects only on network failure.
    return { isSuccess: false, message: errorMessage(null) }
  }
}
