# Library context: follow-up after Julien's review

Date: 2026-11-26. Adds to [2026-11-26-library-context-design.md](2026-11-26-library-context-design.md), which listed three open points. Julien's answers:

| Open point                                 | Decision                                                                                                                                                                                                                                                               | Why                                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| « Toutes les photos » count in the sidebar | unchanged: no count                                                                                                                                                                                                                                                    | still no server total                                                                       |
| Sticky sidebar                             | from `md`, the sidebar is `sticky` under the account bar, with its own `max-h` and `overflow-y-auto`. The bar's row gets a height token, `--account-bar-height: 3.75rem` (the 60 px measured in Chrome), used by the bar itself and by the sidebar's `top` and `max-h` | a long library no longer means scrolling back up to change collection; one number to change |
| The family's news between title and photos | `LibraryMail` moves above the title row; R-COL-27 says again « juste au-dessus des photos »                                                                                                                                                                            | the actions row now touches what it acts on; the news still comes first                     |

The sidebar's scroll box would clip the entries' focus ring: `p-1` with `-m-1` gives it room without moving the entries. While the offline notice shows inside the account bar, the bar is taller than the token and the sidebar's top slides under it; rare and harmless, left as is.

## Plan

1. Sticky sidebar: token in `index.css`, `AccountBar` uses it, `CollectionsSidebar` sticks; R-COL-24 and ARCHITECTURE.md say so.
2. News above the title: `LibraryPage` order, R-COL-27, `bibliotheque.md`, ARCHITECTURE.md.
3. Checks: scoped biome, typecheck, build, test; Chrome 1440 and 360, light and dark.

## AI usage

Claude measured the bar in Chrome, wrote this addendum and the change; Julien chose the answers.
