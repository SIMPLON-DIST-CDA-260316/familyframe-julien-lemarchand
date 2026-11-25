# Library page: focus after deleting the shown collection (Step 12, amendment)

Amends [2026-11-25-library-page-design.md](2026-11-25-library-page-design.md), open question 6, which accepted that focus falls to the page after deleting the shown collection.

## Decision change

The step 12 final review (finding I1) showed this undoes a step 10 accessibility fix: the removed « Mes collections » card sent focus to its own « Nouvelle collection » button after a deletion. Keyboard and screen reader users landed at the top of the document instead.

**Decision:** after deleting the shown collection, focus goes to the « Toutes » chip, which is also where the page now is (R-COL-05).

- `LibraryPage` owns `allChipRef`, passes it to `CollectionChips` (the « Toutes » `ChipLink`) and to `SelectedCollectionBar` as `fallbackRef`.
- The bar's dialogs focus `triggerRef.current ?? fallbackRef.current` in `onCloseAutoFocus`. Not in `onDeleted`: the dialog's focus trap is still active then and would pull focus back.
- A rename still returns focus to the ⋯ button, which survives it.

No product rule mentions focus: `docs/produit/` is unchanged.
