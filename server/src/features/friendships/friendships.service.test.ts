import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { FriendshipRecord, FriendshipsRepository } from './friendships.repository.js'
import { createFriendshipsService } from './friendships.service.js'

const CREATED_AT = new Date('2026-11-24T10:00:00Z')
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
    createdAt: CREATED_AT,
    ...overrides,
  }
}

// By default Mamie has an account and no link with the member yet.
function makeDeps() {
  return {
    repository: {
      findUserIdByEmail: vi
        .fn<FriendshipsRepository['findUserIdByEmail']>()
        .mockResolvedValue(MAMIE.id),
      findBetween: vi.fn<FriendshipsRepository['findBetween']>().mockResolvedValue(null),
      create: vi.fn<FriendshipsRepository['create']>().mockResolvedValue(friendshipRecord()),
      findAllOf: vi.fn<FriendshipsRepository['findAllOf']>().mockResolvedValue([]),
      acceptReceived: vi.fn<FriendshipsRepository['acceptReceived']>(),
      deleteOf: vi.fn<FriendshipsRepository['deleteOf']>(),
    },
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

// Mamie asked the member first: the member's request answers it.
const REQUEST_FROM_MAMIE = friendshipRecord({
  requesterId: MAMIE.id,
  requester: MAMIE,
  addresseeId: MEMBER.id,
  addressee: MEMBER,
})

type Deps = ReturnType<typeof makeDeps>

function request(deps: Deps, email: unknown = MAMIE.email): Promise<unknown> {
  return createFriendshipsService(deps).requestFriendship({ email, requesterId: MEMBER.id })
}

describe('requestFriendship', () => {
  it('creates a pending request towards the account of the normalized email', async () => {
    const deps = makeDeps()

    const friendship = await request(deps, '  Mamie@Example.FR ')

    expect(deps.repository.findUserIdByEmail).toHaveBeenCalledWith(MAMIE.email)
    expect(deps.repository.create).toHaveBeenCalledWith({
      requesterId: MEMBER.id,
      addresseeId: MAMIE.id,
    })
    expect(friendship).toEqual({
      friendship: { id: FRIENDSHIP_ID, user: MAMIE, createdAt: CREATED_AT.toISOString() },
      isAccepted: false,
    })
  })

  it.each([
    ['a number', 42],
    ['no @', 'pas-un-email'],
  ])('rejects %s with EMAIL_INVALID and creates nothing', async (_label, email) => {
    const deps = makeDeps()

    await expect(request(deps, email)).rejects.toMatchObject({ code: 'EMAIL_INVALID' })
    expect(deps.repository.findUserIdByEmail).not.toHaveBeenCalled()
    expect(deps.repository.create).not.toHaveBeenCalled()
  })

  it('rejects an email without an account with USER_NOT_FOUND', async () => {
    const deps = makeDeps()
    deps.repository.findUserIdByEmail.mockResolvedValue(null)

    await expect(request(deps)).rejects.toMatchObject({ code: 'USER_NOT_FOUND' })
    expect(deps.repository.create).not.toHaveBeenCalled()
    expect(deps.logger.warn).toHaveBeenCalledWith('friendship.request_failed', {
      reason: 'user_not_found',
      userId: MEMBER.id,
    })
  })

  it("rejects the sender's own email with SELF_FRIEND", async () => {
    const deps = makeDeps()
    deps.repository.findUserIdByEmail.mockResolvedValue(MEMBER.id)

    await expect(request(deps, MEMBER.email)).rejects.toMatchObject({ code: 'SELF_FRIEND' })
    expect(deps.repository.findBetween).not.toHaveBeenCalled()
    expect(deps.repository.create).not.toHaveBeenCalled()
    expect(deps.logger.warn).toHaveBeenCalledWith('friendship.request_failed', {
      reason: 'self',
      userId: MEMBER.id,
    })
  })

  it('rejects a request between friends with ALREADY_FRIENDS', async () => {
    const deps = makeDeps()
    deps.repository.findBetween.mockResolvedValue(friendshipRecord({ status: 'accepted' }))

    await expect(request(deps)).rejects.toMatchObject({ code: 'ALREADY_FRIENDS' })
    expect(deps.repository.findBetween).toHaveBeenCalledWith(MEMBER.id, MAMIE.id)
    expect(deps.repository.create).not.toHaveBeenCalled()
    expect(deps.logger.warn).toHaveBeenCalledWith('friendship.request_failed', {
      reason: 'already_friends',
      userId: MEMBER.id,
    })
  })

  it('rejects a second request from the same sender with FRIEND_REQUEST_EXISTS', async () => {
    const deps = makeDeps()
    deps.repository.findBetween.mockResolvedValue(friendshipRecord())

    await expect(request(deps)).rejects.toMatchObject({ code: 'FRIEND_REQUEST_EXISTS' })
    expect(deps.repository.create).not.toHaveBeenCalled()
    expect(deps.repository.acceptReceived).not.toHaveBeenCalled()
    expect(deps.logger.warn).toHaveBeenCalledWith('friendship.request_failed', {
      reason: 'request_exists',
      userId: MEMBER.id,
    })
  })

  it("accepts Mamie's pending request instead of creating a second one", async () => {
    const deps = makeDeps()
    deps.repository.findBetween.mockResolvedValue(REQUEST_FROM_MAMIE)
    deps.repository.acceptReceived.mockResolvedValue({ ...REQUEST_FROM_MAMIE, status: 'accepted' })

    const outcome = await request(deps)

    expect(deps.repository.acceptReceived).toHaveBeenCalledWith(FRIENDSHIP_ID, MEMBER.id)
    expect(deps.repository.create).not.toHaveBeenCalled()
    expect(outcome).toEqual({
      friendship: { id: FRIENDSHIP_ID, user: MAMIE, createdAt: CREATED_AT.toISOString() },
      isAccepted: true,
    })
    expect(deps.logger.info).toHaveBeenCalledWith('friendship.accepted', {
      friendshipId: FRIENDSHIP_ID,
      userId: MEMBER.id,
    })
  })

  it("answers FRIEND_REQUEST_EXISTS when Mamie's request changed before the acceptance", async () => {
    const deps = makeDeps()
    deps.repository.findBetween.mockResolvedValue(REQUEST_FROM_MAMIE)
    deps.repository.acceptReceived.mockResolvedValue(null)

    await expect(request(deps)).rejects.toMatchObject({ code: 'FRIEND_REQUEST_EXISTS' })
    expect(deps.logger.info).not.toHaveBeenCalled()
  })

  it('answers FRIEND_REQUEST_EXISTS when a concurrent request took the pair first', async () => {
    const deps = makeDeps()
    deps.repository.create.mockResolvedValue(null)

    await expect(request(deps)).rejects.toMatchObject({ code: 'FRIEND_REQUEST_EXISTS' })
    expect(deps.logger.info).not.toHaveBeenCalled()
  })

  it('logs ids only, never the email, on success and on refusal', async () => {
    const deps = makeDeps()
    await request(deps)
    deps.repository.findUserIdByEmail.mockResolvedValue(null)
    await request(deps).catch(() => {})

    expect(deps.logger.info).toHaveBeenCalledWith('friendship.requested', {
      friendshipId: FRIENDSHIP_ID,
      userId: MEMBER.id,
    })
    const logged = JSON.stringify([deps.logger.info.mock.calls, deps.logger.warn.mock.calls])
    expect(logged).not.toContain(MAMIE.email)
  })
})

describe('listFriendships', () => {
  it('puts each record in its list, with the other side as user', async () => {
    const deps = makeDeps()
    const PAPI = { id: '6b044f9d56a44767c7079b07', email: 'papi@example.fr', displayName: 'Papi' }
    const TATA = { id: '6b044f9d56a44767c7079b08', email: 'tata@example.fr', displayName: 'Tata' }
    const outgoing = friendshipRecord()
    const incoming = friendshipRecord({
      id: '6b044f9d56a44767c7079f02',
      requesterId: PAPI.id,
      requester: PAPI,
      addresseeId: MEMBER.id,
      addressee: MEMBER,
    })
    const accepted = friendshipRecord({
      id: '6b044f9d56a44767c7079f03',
      addresseeId: TATA.id,
      addressee: TATA,
      status: 'accepted',
    })
    deps.repository.findAllOf.mockResolvedValue([accepted, incoming, outgoing])

    const list = await createFriendshipsService(deps).listFriendships(MEMBER.id)

    expect(deps.repository.findAllOf).toHaveBeenCalledWith(MEMBER.id)
    const createdAt = CREATED_AT.toISOString()
    expect(list).toEqual({
      friends: [{ id: '6b044f9d56a44767c7079f03', user: TATA, createdAt }],
      incoming: [{ id: '6b044f9d56a44767c7079f02', user: PAPI, createdAt }],
      outgoing: [{ id: FRIENDSHIP_ID, user: MAMIE, createdAt }],
    })
  })
})
