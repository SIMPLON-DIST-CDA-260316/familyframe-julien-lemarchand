// Copy of server/src/types.ts, see why there. Keep both in sync.
export type UserRole = 'member' | 'admin'

// avatarUrl is null until the account picks a profile photo.
export type PublicUser = {
  id: string
  email: string
  displayName: string
  role: UserRole
  avatarUrl: string | null
}

const USER_ROLES: readonly UserRole[] = ['member', 'admin']

export function isPublicUser(value: unknown): value is PublicUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'email' in value &&
    typeof value.email === 'string' &&
    'displayName' in value &&
    typeof value.displayName === 'string' &&
    'role' in value &&
    USER_ROLES.some((role) => role === value.role) &&
    'avatarUrl' in value &&
    (value.avatarUrl === null || typeof value.avatarUrl === 'string')
  )
}
