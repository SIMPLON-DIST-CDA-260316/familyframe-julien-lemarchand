import type { Friendship } from '@/friendship.ts'

// Below this many friends, the whole list fits at a glance: no search field.
export const FRIEND_SEARCH_MIN_COUNT = 6

// "élodie" must match "Elodie": case and accents are ignored.
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function filterFriends(friends: Friendship[], query: string): Friendship[] {
  const needle = normalize(query.trim())
  if (needle === '') return friends
  return friends.filter(({ user }) =>
    normalize(`${user.displayName} ${user.email}`).includes(needle),
  )
}
