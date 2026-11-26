# Collection pick: add library photos to the collection shown

Date: 2026-11-26. Follows [2026-11-26-library-context-design.md](2026-11-26-library-context-design.md).

## Problem

Filling a collection meant opening each photo's « … » menu on « Toutes les photos », ticking the collection, and coming back. The empty collection even said so. Julien asked for a way to pick several photos at once from inside the collection.

## Decisions

| Topic               | Decision                                                                                                                                                                                                              | Why                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Entry point         | `AddPhotoPanel` gets a third choice, « Depuis ma bibliothèque », only while a collection is shown. On « Toutes les photos » the panel keeps its two choices                                                           | the photos are already in the library: picking them there would add nothing                |
| Panel shape         | two views in the same `ResponsivePanel`, as `SendSourcePanel`: the choices, then the picker with a « Retour » button and the title « Depuis ma bibliothèque »                                                         | one pattern for « pick from the library » across the app                                   |
| Picker              | `components/library/PhotoMultiPicker.tsx`: the library grid as toggle buttons (`aria-pressed`); a chosen tile gets a check in a primary circle and a ring                                                             | multi-select needs its own state; the Send picker stays a single pick                      |
| Shared grid         | the loading, empty, scrolling grid and « Charger plus » move to `components/library/LibraryPhotoGrid.tsx`, used by the Send `LibraryPicker` and the new picker; each passes how a tile renders                        | one place for the grid, both pickers keep their own tile                                   |
| Photos already in   | shown checked and disabled, with the label « déjà dans la collection »                                                                                                                                                | hiding them would make the grid differ from the library the user knows; the check says why |
| Footer              | « Ajouter N photo(s) », disabled at 0 and while the request runs                                                                                                                                                      | the count confirms the choice before sending                                               |
| Bound               | 100 photos per add; once 100 are chosen the other tiles are disabled                                                                                                                                                  | matches the API bound; more than three pages of « Charger plus » is no longer a pick       |
| API                 | `POST /api/collections/:id/photos` with JSON `{ photoIds }`, 1 to 100 text ids, else 400 `BODY_INVALID`. All or nothing: one unknown, someone else's or unopened photo answers 404 `PHOTO_NOT_FOUND` before any write | one request, one `collections:changed`; no half-filled collection to explain               |
| Order and repeats   | the ids not in yet are appended in the order sent; an id sent twice or already in is added once                                                                                                                       | same rule as the single add (R-COL-08)                                                     |
| Concurrency         | the same optimistic write as a removal: `setPhotoIds` only if the list is still the one read, one retry                                                                                                               | a photo added meanwhile from another device is kept                                        |
| Validation location | the collection parsers move from `collections.service.ts` to a new `collections.input.ts`, beside `parsePhotoIds`                                                                                                     | the service would pass 300 lines; same split as `photos.input.ts`                          |
| After adding        | the panel closes, a toast says « 3 photos ajoutées à « Noël ». » (`uploadSummary`, same text as an upload into a collection), the collection shows the photos (it already follows `collections:changed`)              | the same words for the same result                                                         |
| Failure             | the panel stays open with the choice kept, the error shows in a toast                                                                                                                                                 | the user can retry without picking again                                                   |
| Focus               | closing returns focus to the shown « Ajouter » as today; « Retour » returns to the choices                                                                                                                            | unchanged contract of the panel                                                            |
| Empty collection    | « Ajoutez-y une photo, ou choisissez-en dans votre bibliothèque avec « Ajouter une photo ». »                                                                                                                         | points to the new path instead of the « … » detour                                         |

## Plan

1. Server: `collections.input.ts`, `countOpenedPhotos` in the repository, `addPhotos` in the service, controller and route; unit tests (`collections.input.test.ts`, `collections.service.add-photos.test.ts`); Bruno folder `collections/photos-batch` (seq 5, `delete` moves to 6).
2. Client: `postCollectionPhotos` and `addPhotos` in the collections context; `LibraryPhotoGrid` extracted from the Send picker.
3. Client: `PhotoMultiPicker`, the third choice in `AddPhotoPanel`, the toast, the empty-collection text; `collections.md` (new rules R-COL-28 to R-COL-31, R-COL-19 and messages updated), ARCHITECTURE.md if the flow is described there.
4. Checks: scoped biome, typecheck, build, test, Bruno on 3001; Chrome at 1440 and 360, light and dark; delete any test collection.

## AI usage

Claude chose the panel shape, the « already in » display and the API shape from the team lead's brief, and wrote this spec, the code, the tests and the Bruno requests. Julien reviews after.
