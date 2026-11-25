// Copy of server/src/types.ts, see why there. Keep both in sync.
export type InvitationStatus = 'pending' | 'used' | 'expired'

// createdAt and expiresAt are ISO 8601 strings: JSON has no dates.
export type Invitation = {
  id: string
  email: string
  status: InvitationStatus
  createdAt: string
  expiresAt: string
}

// The raw token, sent once at creation: the page builds the link from it.
export type CreatedInvitation = {
  invitation: Invitation
  token: string
}

const INVITATION_STATUSES: readonly InvitationStatus[] = ['pending', 'used', 'expired']

export function isInvitation(value: unknown): value is Invitation {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'email' in value &&
    typeof value.email === 'string' &&
    'status' in value &&
    INVITATION_STATUSES.some((status) => status === value.status) &&
    'createdAt' in value &&
    typeof value.createdAt === 'string' &&
    'expiresAt' in value &&
    typeof value.expiresAt === 'string'
  )
}

export function isCreatedInvitation(value: unknown): value is CreatedInvitation {
  return (
    typeof value === 'object' &&
    value !== null &&
    'invitation' in value &&
    isInvitation(value.invitation) &&
    'token' in value &&
    typeof value.token === 'string'
  )
}

// The origin the admin browses is the one the family reaches (the LAN address in dev, the
// public one later): no server setting to keep in step.
export function invitationLink(token: string): string {
  return `${window.location.origin}/invite/${token}`
}
