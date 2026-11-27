// What one friend's share gave, under the name the sheet shows for them.
export type ShareOutcome =
  | { name: string; status: 'shared' }
  | { name: string; status: 'duplicate' }
  | { name: string; status: 'failed'; message: string }

// The not_friends outcome: unknown, pending, oneself, or removed from the friends meanwhile.
export const NOT_FRIEND_MESSAGE = 'Cette personne ne fait pas partie de vos amis.'

// A grid of faces has room for one word: « Marie-Claire Dupont » shows as « Marie-Claire ».
export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0]
}

// « Mamie », « Mamie et Tata », « Mamie, Tata et Papi ».
export function joinNames(names: string[]): string {
  const lastName = names.at(-1)
  if (lastName === undefined) return ''
  const otherNames = names.slice(0, -1)
  return otherNames.length === 0 ? lastName : `${otherNames.join(', ')} et ${lastName}`
}

export function sentTitle(names: string[]): string {
  return `Envoyée à ${joinNames(names)}`
}

export function sharedNames(outcomes: ShareOutcome[]): string[] {
  return outcomes.filter(({ status }) => status === 'shared').map(({ name }) => name)
}

export function failureMessages(outcomes: ShareOutcome[]): string[] {
  return outcomes.flatMap((outcome) => {
    if (outcome.status === 'duplicate') return [`${outcome.name} a déjà cette photo.`]
    if (outcome.status === 'failed') return [`${outcome.name} : ${outcome.message}`]
    return []
  })
}

// Plain « Envoyer » while nobody is chosen: the button is disabled then.
export function sendButtonLabel(selectedCount: number): string {
  if (selectedCount === 0) return 'Envoyer'
  return selectedCount === 1 ? 'Envoyer à 1 personne' : `Envoyer à ${selectedCount} personnes`
}
