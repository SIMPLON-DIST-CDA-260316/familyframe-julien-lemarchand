import type { RefObject } from 'react'

// A page's trigger exists twice, in the header on a computer and floating on a phone, one hidden
// by CSS. display: none (hidden md:inline-flex, md:hidden) leaves no box. Not offsetParent: it is
// always null for the fixed floating button. Any element: the library's fallback is a link on a
// computer and a button on a phone.
export function shownButton<Shown extends HTMLElement>(
  refs: RefObject<Shown | null>[],
): Shown | undefined {
  return refs
    .map((ref) => ref.current)
    .find((element): element is Shown => element !== null && element.getClientRects().length > 0)
}
