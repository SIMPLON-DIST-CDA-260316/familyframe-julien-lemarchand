// Mirror the server's limits (server/src/lib/account-input.ts): the browser catches most
// mistakes before a request. Keep both in sync.
export const DISPLAY_NAME_MAX_LENGTH = 50
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

// No password reset exists: a typo would lock the account, so the client compares both entries.
export const PASSWORD_MISMATCH_MESSAGE = 'Les deux mots de passe ne correspondent pas.'
