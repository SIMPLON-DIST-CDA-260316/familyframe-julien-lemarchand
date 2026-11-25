import { describe, expect, it } from 'vitest'
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from './password.js'

describe('hashPassword', () => {
  it('returns an argon2id hash that does not contain the password', async () => {
    const hash = await hashPassword('correct horse')

    expect(hash).toMatch(/^\$argon2id\$/)
    expect(hash).not.toContain('correct horse')
  })
})

describe('verifyPassword', () => {
  it('accepts the password the hash was made from', async () => {
    const hash = await hashPassword('correct horse')

    await expect(verifyPassword(hash, 'correct horse')).resolves.toBe(true)
  })

  it('rejects any other password', async () => {
    const hash = await hashPassword('correct horse')

    await expect(verifyPassword(hash, 'wrong horse')).resolves.toBe(false)
  })

  it('verifies against the dummy hash without throwing, and never matches', async () => {
    await expect(verifyPassword(DUMMY_PASSWORD_HASH, 'membre-familyframe-dev')).resolves.toBe(false)
  })
})
