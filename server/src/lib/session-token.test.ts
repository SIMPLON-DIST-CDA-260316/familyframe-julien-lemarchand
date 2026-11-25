import { describe, expect, it } from 'vitest'
import { generateToken, hashToken, readSessionToken } from './session-token.js'

const HEX_64 = /^[0-9a-f]{64}$/

describe('readSessionToken', () => {
  it('returns null without a Cookie header', () => {
    expect(readSessionToken(undefined)).toBeNull()
  })

  it('returns null when only other cookies are sent', () => {
    expect(readSessionToken('theme=dark; lang=fr')).toBeNull()
  })

  it('finds the session cookie among others', () => {
    expect(readSessionToken('theme=dark; ff_session=abc123; lang=fr')).toBe('abc123')
  })

  it('returns null for an empty session cookie', () => {
    expect(readSessionToken('theme=dark; ff_session=')).toBeNull()
  })

  it('ignores a cookie whose name only ends like ours', () => {
    expect(readSessionToken('old_ff_session=abc123')).toBeNull()
  })
})

describe('hashToken', () => {
  it('is stable and 64 hex characters long', () => {
    expect(hashToken('abc123')).toMatch(HEX_64)
    expect(hashToken('abc123')).toBe(hashToken('abc123'))
  })

  it('differs from one token to another', () => {
    expect(hashToken('abc123')).not.toBe(hashToken('abc124'))
  })
})

describe('generateToken', () => {
  it('returns 64 hex characters, different each time', () => {
    const token = generateToken()

    expect(token).toMatch(HEX_64)
    expect(generateToken()).not.toBe(token)
  })
})
