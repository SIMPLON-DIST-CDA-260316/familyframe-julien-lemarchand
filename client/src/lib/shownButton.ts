import type { RefObject } from 'react'

// A page's trigger exists twice, in the header on a computer and floating on a phone, one hidden
// by CSS. display: none (hidden md:inline-flex, md:hidden) leaves no box. Not offsetParent: it is
// always null for the fixed floating button.
export function shownButton(
  refs: RefObject<HTMLButtonElement | null>[],
): HTMLButtonElement | undefined {
  return refs
    .map((ref) => ref.current)
    .find(
      (button): button is HTMLButtonElement =>
        button !== null && button.getClientRects().length > 0,
    )
}
