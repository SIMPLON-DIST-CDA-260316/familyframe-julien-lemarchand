import { hash, verify } from 'argon2'

// A real argon2id hash of a throwaway password, with the library's default cost.
// Verifying an unknown email against it takes as long as a wrong password,
// so the response time does not reveal which emails have an account.
export const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$wYRFTMP7p6eRiPbuxiTclg$SxPvQxVB40xXdRjyDhUQuMQEIO5FzMQM6pkWRuvWjl4'

// argon2id with the library defaults: the current OWASP recommendation.
export function hashPassword(plain: string): Promise<string> {
  return hash(plain)
}

export function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  return verify(passwordHash, plain)
}
