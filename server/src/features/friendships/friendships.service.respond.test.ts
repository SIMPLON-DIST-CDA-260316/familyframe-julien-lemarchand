import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { FriendshipRecord, FriendshipsRepository } from './friendships.repository.js'
import { createFriendshipsService } from './friendships.service.js'

const MEMBER = { id: '6b044f9d56a44767c7079b02', email: 'membre@example.fr', displayName: 'Membre' }
const MAMIE = { id: '6b044f9d56a44767c7079b05', email: 'mamie@example.fr', displayName: 'Mamie' }
const FRIENDSHIP_ID = '6b044f9d56a44767c7079f01'

// The member asked Mamie by default; each test changes only what it is about.
function friendshipRecord(overrides: Partial<FriendshipRecord> = {}): FriendshipRecord {
  return {
    id: FRIENDSHIP_ID,
    requesterId: MEMBER.id,
    requester: MEMBER,
    addresseeId: MAMIE.id,
    addressee: MAMIE,
    pairKey: `${MEMBER.id}:${MAMIE.id}`,
    status: 'pending',
    createdAt: new Date('2026-11-24T10:00:00Z'),
    ...overrides,
  }
}

// Answering reads only the last two repository functions and findBetween.
function makeDeps() {
  return {
    repository: {
      findUserIdByEmail: vi.fn<FriendshipsRepository['findUserIdByEmail']>(),
      findBetween: vi.fn<FriendshipsRepository['findBetween']>().mockResolvedValue(null),
      create: vi.fn<FriendshipsRepository['create']>(),
      findAllOf: vi.fn<FriendshipsRepository['findAllOf']>(),
      acceptReceived: vi
        .fn<FriendshipsRepository['acceptReceived']>()
        .mockResolvedValue(friendshipRecord({ status: 'accepted' })),
      deleteOf: vi.fn<FriendshipsRepository['deleteOf']>().mockResolvedValue(friendshipRecord()),
    },
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

describe('acceptFriendship', () => {
  it('answers an id that is not an ObjectId with FRIENDSHIP_NOT_FOUND, without a query', async () => {
    const deps = makeDeps()

    await expect(
      createFriendshipsService(deps).acceptFriendship({ id: 'pas-un-id', userId: MAMIE.id }),
    ).rejects.toMatchObject({ code: 'FRIENDSHIP_NOT_FOUND' })
    expect(deps.repository.acceptReceived).not.toHaveBeenCalled()
  })

  it('accepts only as the addressee of the request', async () => {
    const deps = makeDeps()

    await createFriendshipsService(deps).acceptFriendship({ id: FRIENDSHIP_ID, userId: MAMIE.id })

    expect(deps.repository.acceptReceived).toHaveBeenCalledWith(FRIENDSHIP_ID, MAMIE.id)
  })

  it('answers FRIENDSHIP_NOT_FOUND when no pending request is addressed to the caller', async () => {
    const deps = makeDeps()
    deps.repository.acceptReceived.mockResolvedValue(null)

    await expect(
      createFriendshipsService(deps).acceptFriendship({ id: FRIENDSHIP_ID, userId: MEMBER.id }),
    ).rejects.toMatchObject({ code: 'FRIENDSHIP_NOT_FOUND' })
    expect(deps.logger.info).not.toHaveBeenCalled()
  })

  it('returns the friendship with the requester as user, and logs ids only', async () => {
    const deps = makeDeps()

    const friendship = await createFriendshipsService(deps).acceptFriendship({
      id: FRIENDSHIP_ID,
      userId: MAMIE.id,
    })

    expect(friendship).toEqual({
      id: FRIENDSHIP_ID,
      user: MEMBER,
      createdAt: '2026-11-24T10:00:00.000Z',
    })
    expect(deps.logger.info).toHaveBeenCalledWith('friendship.accepted', {
      friendshipId: FRIENDSHIP_ID,
      userId: MAMIE.id,
    })
  })
})

describe('deleteFriendship', () => {
  it('answers an id that is not an ObjectId with FRIENDSHIP_NOT_FOUND, without a query', async () => {
    const deps = makeDeps()

    await expect(
      createFriendshipsService(deps).deleteFriendship({ id: 'pas-un-id', userId: MEMBER.id }),
    ).rejects.toMatchObject({ code: 'FRIENDSHIP_NOT_FOUND' })
    expect(deps.repository.deleteOf).not.toHaveBeenCalled()
  })

  it('answers an unknown, foreign or already deleted friendship with FRIENDSHIP_NOT_FOUND', async () => {
    const deps = makeDeps()
    deps.repository.deleteOf.mockResolvedValue(null)

    await expect(
      createFriendshipsService(deps).deleteFriendship({ id: FRIENDSHIP_ID, userId: MEMBER.id }),
    ).rejects.toMatchObject({ code: 'FRIENDSHIP_NOT_FOUND' })
    expect(deps.repository.deleteOf).toHaveBeenCalledWith(FRIENDSHIP_ID, MEMBER.id)
    expect(deps.logger.info).not.toHaveBeenCalled()
  })

  it.each<[string, FriendshipRecord['status'], string]>([
    ['removed', 'accepted', MEMBER.id],
    ['removed', 'accepted', MAMIE.id],
    ['cancelled', 'pending', MEMBER.id],
    ['refused', 'pending', MAMIE.id],
  ])('logs %s for a %s friendship deleted by %s', async (reason, status, userId) => {
    const deps = makeDeps()
    deps.repository.deleteOf.mockResolvedValue(friendshipRecord({ status }))

    await createFriendshipsService(deps).deleteFriendship({ id: FRIENDSHIP_ID, userId })

    expect(deps.logger.info).toHaveBeenCalledWith('friendship.deleted', {
      friendshipId: FRIENDSHIP_ID,
      userId,
      reason,
    })
  })
})

describe('areFriends', () => {
  it.each<[string, FriendshipRecord | null, boolean]>([
    ['an accepted friendship', friendshipRecord({ status: 'accepted' }), true],
    ['a pending request', friendshipRecord(), false],
    ['no link', null, false],
  ])('answers %s with %s', async (_label, found, expected) => {
    const deps = makeDeps()
    deps.repository.findBetween.mockResolvedValue(found)

    const isFriend = await createFriendshipsService(deps).areFriends(MEMBER.id, MAMIE.id)

    expect(isFriend).toBe(expected)
    expect(deps.repository.findBetween).toHaveBeenCalledWith(MEMBER.id, MAMIE.id)
  })
})
