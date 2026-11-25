// Math.random in the app; any source of numbers in [0, 1) works.
export type RandomSource = () => number

export type ShuffleState = {
  // The order drawn so far, maybe still holding deleted photos and missing new ones.
  drawnIds: readonly string[]
  // The feed's photos, newest first.
  photoIds: readonly string[]
  // On screen at the previous render, and now.
  shownId: string | undefined
  currentId: string | undefined
}

// Fisher-Yates on a copy: every order is equally likely.
export function shuffledIds(ids: readonly string[], random: RandomSource): string[] {
  const shuffled = [...ids]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    const swapped = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = swapped
  }
  return shuffled
}

// A new round starts on the photo on screen, so the reshuffle never shows it twice in a row.
function startingWith(ids: string[], firstId: string | undefined): string[] {
  if (firstId === undefined || !ids.includes(firstId)) return ids
  return [firstId, ...ids.filter((id) => id !== firstId)]
}

// The arriving photo plays next: it shows at once (R-CAD-40) without breaking the round.
export function insertAfter(
  order: readonly string[],
  anchorId: string | undefined,
  newId: string,
): string[] {
  const anchorIndex = anchorId === undefined ? -1 : order.indexOf(anchorId)
  return [...order.slice(0, anchorIndex + 1), newId, ...order.slice(anchorIndex + 1)]
}

function hasFinishedRound(
  ids: readonly string[],
  { shownId, currentId }: Pick<ShuffleState, 'shownId' | 'currentId'>,
): boolean {
  return shownId !== currentId && ids.at(-1) === shownId && ids.at(0) === currentId
}

export function nextShuffledIds(state: ShuffleState, random: RandomSource): string[] {
  const { drawnIds, photoIds, shownId, currentId } = state
  const photoIdSet = new Set(photoIds)
  const keptIds = drawnIds.filter((id) => photoIdSet.has(id))
  // Nothing drawn yet, or the last photo of the round gave way to the first: draw a new round.
  if (keptIds.length === 0 || hasFinishedRound(keptIds, state)) {
    return startingWith(shuffledIds(photoIds, random), currentId)
  }
  const drawnIdSet = new Set(drawnIds)
  // Newest first in the feed: inserting the oldest first leaves the newest right after the photo
  // that was on screen.
  const arrivedIds = photoIds.filter((id) => !drawnIdSet.has(id)).reverse()
  return arrivedIds.reduce(
    (ids, arrivedId) => insertAfter(ids, shownId ?? currentId, arrivedId),
    keptIds,
  )
}

export function isSameOrder(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && first.every((id, index) => id === second[index])
}
