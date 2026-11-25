// Copy of server/src/types.ts, see why there. Keep both in sync.

// A friend named in a history line, under their current name, as on a received photo.
export type SendRecipient = { id: string; displayName: string }

// One line of the sender's history: one send action, even to several friends. recipients lists
// only the friends who received it; createdAt is an ISO 8601 string.
export type SentPhoto = {
  id: string
  url: string
  thumbnailUrl: string
  createdAt: string
  message: string | null
  recipients: SendRecipient[]
}

// Newest first; nextCursor as for the library's pages.
export type SendPage = {
  sends: SentPhoto[]
  nextCursor: string | null
}

// not_friends: no accepted friend's id (unknown, pending, oneself, malformed); duplicate: the
// friend already has this file.
export type SendOutcomeStatus = 'sent' | 'duplicate' | 'not_friends'

export type SendOutcome = { friendId: string; status: SendOutcomeStatus }

// send is null when nobody received the photo: nothing joins the history then.
export type SendResult = {
  send: SentPhoto | null
  outcomes: SendOutcome[]
}

const OUTCOME_STATUSES: string[] = ['sent', 'duplicate', 'not_friends']

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}

function isRecipient(value: unknown): value is SendRecipient {
  return (
    isObject(value) &&
    'id' in value &&
    typeof value.id === 'string' &&
    'displayName' in value &&
    typeof value.displayName === 'string'
  )
}

export function isSentPhoto(value: unknown): value is SentPhoto {
  return (
    isObject(value) &&
    'id' in value &&
    typeof value.id === 'string' &&
    'url' in value &&
    typeof value.url === 'string' &&
    'thumbnailUrl' in value &&
    typeof value.thumbnailUrl === 'string' &&
    'createdAt' in value &&
    typeof value.createdAt === 'string' &&
    'message' in value &&
    (value.message === null || typeof value.message === 'string') &&
    'recipients' in value &&
    Array.isArray(value.recipients) &&
    value.recipients.every(isRecipient)
  )
}

function isOutcome(value: unknown): value is SendOutcome {
  return (
    isObject(value) &&
    'friendId' in value &&
    typeof value.friendId === 'string' &&
    'status' in value &&
    typeof value.status === 'string' &&
    OUTCOME_STATUSES.includes(value.status)
  )
}

export function isSendResult(value: unknown): value is SendResult {
  return (
    isObject(value) &&
    'send' in value &&
    (value.send === null || isSentPhoto(value.send)) &&
    'outcomes' in value &&
    Array.isArray(value.outcomes) &&
    value.outcomes.every(isOutcome)
  )
}

export function isSendPage(value: unknown): value is SendPage {
  return (
    isObject(value) &&
    'sends' in value &&
    Array.isArray(value.sends) &&
    value.sends.every(isSentPhoto) &&
    'nextCursor' in value &&
    (value.nextCursor === null || typeof value.nextCursor === 'string')
  )
}
