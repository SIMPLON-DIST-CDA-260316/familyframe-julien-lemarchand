import type { User } from '@prisma/client'
import type { PublicUser } from '../../types.js'

// lib/cloudinary.ts's avatarUrl, injected: a service test runs without the Cloudinary settings.
export type AvatarUrlBuilder = (cloudinaryId: string) => string

export function toAvatarUrl(
  avatarCloudinaryId: string | null,
  avatarUrl: AvatarUrlBuilder,
): string | null {
  return avatarCloudinaryId === null ? null : avatarUrl(avatarCloudinaryId)
}

// The password hash and the Cloudinary id never leave the server: the client gets a ready URL.
export function toPublicUser(user: User, avatarUrl: AvatarUrlBuilder): PublicUser {
  const { id, email, displayName, role, avatarCloudinaryId } = user
  return { id, email, displayName, role, avatarUrl: toAvatarUrl(avatarCloudinaryId, avatarUrl) }
}
