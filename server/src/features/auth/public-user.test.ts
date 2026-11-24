import type { User } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { type AvatarUrlBuilder, toPublicUser } from './public-user.js'

const USER: User = {
  id: '6b044f9d56a44767c7079b01',
  email: 'membre@familyframe.test',
  displayName: 'Membre',
  passwordHash: '$argon2id$stored-hash',
  role: 'member',
  avatarCloudinaryId: null,
  createdAt: new Date('2026-11-01T10:00:00Z'),
}

function fakeAvatarUrl() {
  return vi.fn<AvatarUrlBuilder>((cloudinaryId) => `https://cdn.test/${cloudinaryId}.jpg`)
}

describe('toPublicUser', () => {
  it('gives no avatar URL to an account without a profile photo', () => {
    const avatarUrl = fakeAvatarUrl()

    expect(toPublicUser(USER, avatarUrl)).toEqual({
      id: USER.id,
      email: USER.email,
      displayName: 'Membre',
      role: 'member',
      avatarUrl: null,
    })
    expect(avatarUrl).not.toHaveBeenCalled()
  })

  it('builds the avatar URL from the stored id, and sends neither the id nor the hash', () => {
    const user = toPublicUser(
      { ...USER, avatarCloudinaryId: 'familyframe/avatars/abc' },
      fakeAvatarUrl(),
    )

    expect(user.avatarUrl).toBe('https://cdn.test/familyframe/avatars/abc.jpg')
    expect(user).not.toHaveProperty('avatarCloudinaryId')
    expect(user).not.toHaveProperty('passwordHash')
  })
})
