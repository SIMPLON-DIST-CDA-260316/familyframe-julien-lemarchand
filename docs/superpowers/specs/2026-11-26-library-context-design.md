# Library: the collection is the context

Date: 2026-11-26. Follows [2026-11-26-page-width-design.md](2026-11-26-page-width-design.md) (`PageMain`, `max-w-page`).

## Problem

Julien, on a computer: under the « Bibliothèque » title, a row of large collection cards (« Toutes » with an empty image, each collection, « Nouvelle collection ») took a lot of room before the first photo. « Toutes » without a real image looked broken. The row picks what the page shows, yet it sat as content under the title, and the actions (« Ajouter », « Mode cadre », the view toggle) acted on that choice from far above it.

## Decision (option « A », approved by Julien from mockups)

| Topic                       | Decision                                                                                                                                                                                                                                                                        | Why                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Computer (from `md`)        | inside `PageMain`, two columns: a 13rem `<nav aria-label="Collections">` on the left, the content on the right                                                                                                                                                                  | the picker reads as navigation, the photos keep the width                              |
| Sidebar entries             | « Toutes les photos » with a neutral icon tile, then a muted « Collections » label with an icon « + », then each collection: 28 px cover (neutral tile while empty), name cut with an ellipsis, photo count on the right                                                        | small rows: twenty collections fit without scrolling the page                          |
| Selection                   | `aria-current="page"`, `bg-secondary` and medium weight                                                                                                                                                                                                                         | the same tokens in both palettes and both themes                                       |
| Content title               | the context itself: « Toutes les photos » or the collection's name, its « … » menu after the name, and below the count and period (`collectionSummary`); the actions stay on the same row, on the right, just above the photos                                                  | the title says what is shown; the actions sit next to what they act on                 |
| Loading, missing, failed    | the title says « Bibliothèque », without a count, as before                                                                                                                                                                                                                     | the name is not known yet, and « Toutes les photos » would be wrong                    |
| Phone (under `md`)          | no sidebar; the title is a button « name ˅ » (`aria-haspopup="dialog"`) opening the existing `BottomDrawer` titled « Afficher »: « Toutes les photos », « Collections », 44 px covers, name and « N photos · period », a check on the current one, « Nouvelle collection » last | one tap away, under the thumb, without a row eating the screen                         |
| One list                    | `CollectionList` renders in both the sidebar and the sheet; the differences (cover size, detail, check, where « + » sits) are responsive classes                                                                                                                                | one place for the entries and their links; the two containers never show together      |
| Create                      | « + » (computer) and « Nouvelle collection » (phone) open the existing name dialog; the phone sheet closes first                                                                                                                                                                | a dialog over a sheet would stack two modals                                           |
| Focus after deleting        | the shown one of « Toutes les photos » (sidebar) or the title button (phone)                                                                                                                                                                                                    | the « … » button leaves with the collection; focus must not fall to the page           |
| « Toutes les photos » count | none in the sidebar; the content subtitle keeps the library count                                                                                                                                                                                                               | the API sends no total; the loaded count would only be right while « Toutes » is shown |
| Photo grid                  | 3 columns from `md`, 4 from `lg`; phone and `sm` unchanged                                                                                                                                                                                                                      | the content column is ~13rem narrower: auto-fill at 12rem would drop to 3 at 1440 px   |
| Removed                     | `CollectionsRow`, `CollectionCard`; `CollectionTitle` becomes `CollectionActions` (its menu and dialogs only)                                                                                                                                                                   | the title is now built by the library header for every context                         |

« Toutes » becomes « Toutes les photos » everywhere it is named, including the empty collection's hint.

## Out of scope

A sticky sidebar, a server total for the whole library, reordering collections.

## AI usage

Claude drew three options as mockups; Julien chose « A ». Claude then wrote this spec, the plan and the code, and checked it in Chrome. Julien reviews the result.
