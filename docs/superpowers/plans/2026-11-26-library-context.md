# Library context plan

Spec: `docs/superpowers/specs/2026-11-26-library-context-design.md`. Branch `feat/library-context`, on top of `feat/page-width`.

1. `shownButton` accepts any element: the deleted collection's focus may land on a link.
2. Library context (one commit, the old row and the new list cannot both be the picker):
   - `components/collections/CollectionList.tsx`: « Toutes les photos », the « Collections » label, the entries, « Nouvelle collection »; responsive classes for computer and phone.
   - `components/collections/NewCollectionDialog.tsx`: the create dialog that opens the new collection.
   - `components/library/CollectionsSidebar.tsx` (from `md`) and `components/library/CollectionsSheetButton.tsx` (under `md`, title button + `BottomDrawer`).
   - `CollectionTitle.tsx` becomes `CollectionActions.tsx`; `LibraryTitle` takes the heading, subtitle and actions; `LibraryPage` lays out the two columns.
   - Delete `CollectionsRow.tsx` and `CollectionCard.tsx`; « Toutes » becomes « Toutes les photos » in the empty collection hint.
   - Grid: `md:grid-cols-3 lg:grid-cols-4`.
   - `docs/produit/collections.md` and `bibliotheque.md`: replace R-COL-15, R-COL-22, R-COL-23 and add the new rules.
3. Checks: scoped `biome check`, `pnpm typecheck`, `pnpm build`, `pnpm test`; Chrome at 1440 px and 360 px, light and dark.
