# Step 7: photo experience

- Date: 2026-11-24
- Scope: step 7 « Expérience photo ». An in-app photo viewer, the library and the frame merged (`/frame` becomes the slideshow only), a share sheet that sends one photo to several friends at once, notifications (toasts), touch-sized buttons. Client only: **no API change, no Bruno change, no server change**.
- AI usage: the design (A-D below) was fixed by the author with the AI in an earlier session; this document records it and every choice the AI made while writing it, each with its reason. To be validated by the author (see Open questions).
- Builds on: `2026-11-24-sharing-design.md` (share routes, `SharePhotoDialog`, `useFriendShares`, `friendSearch.ts`), `2026-11-23-frame-slideshow-design.md` and `2026-11-23-frame-views-design.md` (`/frame` library and slideshow modes, `useIdle`, `isOverlayOpen`), `2026-11-24-personal-library-design.md` (paginated library, 30 per page), `2026-11-23-system-dark-mode.md` (`.dark` on `<html>` from `theme.ts`).

## Goal

A photo opens full size inside the app, never on Cloudinary in a new tab: swipe or arrow keys to the next one, the same actions menu as everywhere, and « Mode cadre » to start the slideshow from it. `/` becomes the one place to browse photos; `/frame` is only the full-screen slideshow a physical frame opens at boot. Sending a photo takes one sheet: tap the faces of the people, one button, one notification « Envoyée à Mamie et Tata ». On a phone, the small buttons grow to a finger's size.

## Decisions

| Topic                        | Decision                                                                                                                                                                                                                                                                  | Main reason                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Viewer address               | `/?photo=<id>`, read with `useSearchParams`                                                                                                                                                                                                                               | a link opens the photo; browser and Android back close the viewer; no new route                                                                                  |
| History                      | opening from the library **pushes** with the state `{ isLibraryBelow: true }`; swiping **replaces** (state kept); ✕ / Escape go **back** (`navigate(-1)`) when the state says the library is below, else replace with `/`                                                 | swiping through 20 photos must not take 20 back presses to leave; closing must not stack a second `/` entry over the first                                       |
| Automatic closes             | a photo that vanished (deleted, unknown link) is replaced or closed with **replace** only (`show`, `dismiss`), never `navigate(-1)`                                                                                                                                       | these run from an effect that may fire twice: replace is harmless twice, going back twice leaves the app                                                         |
| Viewer component             | a Radix `Dialog` (the installed `radix-ui`), full screen, `dark`, `bg-frame-background`, `data-photo-viewer`                                                                                                                                                              | focus moves in and is trapped, the page behind is hidden from screen readers and does not scroll, Escape closes the top layer only (menu first, then the viewer) |
| Viewer and `isOverlayOpen`   | `isOverlayOpen()` ignores `[role="dialog"][data-photo-viewer]`                                                                                                                                                                                                            | the viewer is a dialog itself; the window arrow keys must still move its carousel, and still stop when a menu or the share sheet is open above it                |
| Carousel                     | the existing shadcn `ui/carousel.tsx` (Embla), no loop, Embla's default speed, `startIndex` frozen at mount; `useCarouselPhoto` and `useCarouselArrowKeys` reused                                                                                                         | a counter « 3 / 42 » has a first and a last photo; new options would re-init Embla on every swipe                                                                |
| Top bar outside the carousel | only slides and arrows are inside `<Carousel>`; the top bar (✕, counter, ▶, ⋯) and the caption are siblings                                                                                                                                                               | the carousel captures ←/→ on its subtree, and React bubbles portal events through it: the share sheet's search field would lose its arrow keys                   |
| Counter                      | « 3 / 30 » when the whole library is loaded, « 3 / 30+ » while more pages remain                                                                                                                                                                                          | the API sends no total (no API change); « + » is honest                                                                                                          |
| Pagination                   | within 3 photos of the last loaded one, the viewer asks for the next page (`loadMore`)                                                                                                                                                                                    | the next page arrives before the swipe reaches the end                                                                                                           |
| Link to an older photo       | while the photo is not in the loaded list: wait for the first page, then load page after page until it appears; no more pages → close                                                                                                                                     | there is no `GET /api/photos/:id` (no API change); a library is bounded, the walk ends                                                                           |
| Deleted while shown          | the photo at the same place (the next one) takes its place; if it was the last in the list, the previous one; none left → close                                                                                                                                           | « deleting the shown photo shows the next »; closing on the oldest photo while others remain would be abrupt (see Open questions)                                |
| Deletion detection           | the viewer remembers where it last saw its photo (`{ id, index }`); missing **and** seen a moment ago = deleted; missing and never seen = link to wait for or load                                                                                                        | the same code covers a delete from this viewer, from another tab, or from another device (`photo:deleted`)                                                       |
| Back to the library          | on close the viewer focuses the tile of the photo **last shown** (tiles carry `data-photo-id`); focusing scrolls it into view                                                                                                                                             | after swiping, the eye and the keyboard land where the user stopped, not on the tile first clicked                                                               |
| Leaving frame mode           | ✕ / Escape on `/frame` **replace** it with `/?photo=<id of the photo on screen>`, carrying `isLibraryBelow` when the frame was opened over the library                                                                                                                    | one mechanism (the viewer address) for « back on the photo that was shown », which also works for a photo beyond the first page; scroll alone would not reach it |
| Starting frame mode          | from the library header: push `/frame` with `isLibraryBelow`; from the viewer ▶: **replace** with `/frame?photo=<id>`, carrying the viewer's own state; the app bar « Cadre »: plain link                                                                                 | each path leaves exactly one library entry under the viewer that comes back; a frame booted directly leaves none, so closing then replaces with `/`              |
| `/frame?photo=<id>`          | the slideshow starts on that photo (`useFrameSelection`'s initial selection), then advances as usual                                                                                                                                                                      | « Mode cadre starting the slideshow from this photo »                                                                                                            |
| `/frame` content             | `LibraryScreen`, `LibraryHeader`, `useOnIdle`, the one-minute idle start and the `library` / `slideshow` modes are removed; `useIdle` (controls hide after 4 s, no advance while someone uses it) and `isOverlayOpen` stay                                                | the grid and list live on `/` now; the menus and the share sheet must still freeze the photo behind them                                                         |
| Library tiles                | already the frame's `PhotoGrid` / `PhotoList` (step 5); only the « Mode cadre » button is added next to the grid/list toggle                                                                                                                                              | nothing to merge on the tiles themselves                                                                                                                         |
| Share sheet container        | phones (< `md`, 48rem): the existing shadcn `Sheet`, `side="bottom"`; computers: the existing `Dialog`, `sm:max-w-md`; chosen with a `useMediaQuery('(min-width: 48rem)')` hook                                                                                           | the brief's two shapes; both are the same Radix dialog, so one body serves both                                                                                  |
| Swipe-down                   | **not supported**: ✕, tap outside, Escape close the sheet; no drag handle drawn                                                                                                                                                                                           | the installed `Sheet` has no drag; `vaul` would be a new dependency (not approved); a handle would promise a gesture that does nothing                           |
| Friends                      | a grid of `UserAvatar` (56 px, initials) with the **first name** under it (first word of `displayName`), full name in `aria-label` and `title`; tap toggles (`aria-pressed`, check badge); no email                                                                       | the brief; the full name still tells two « Jean » apart on hover and for screen readers                                                                          |
| Avatar with an image later   | `UserAvatar` is reused as is; step 6 adds an optional image prop **there**                                                                                                                                                                                                | one avatar for the app bar, `/friends` and the sheet; no second component (no `avatarUrl` now)                                                                   |
| Sending                      | one request per selected friend (`postLibraryShare` / `postDeviceShare`), **one after the other**                                                                                                                                                                         | a device share uploads the whole file each time: five parallel 10 MB uploads from a phone would be slow and heavy for the server's conversion                    |
| Duplicate result             | `ShareResult` gains `{ status: 'duplicate' }`; the per-name text « Tata a déjà cette photo. » is built in `shareTexts.ts`                                                                                                                                                 | the toast names who already has it; a message string compare would be fragile                                                                                    |
| Results                      | at least one success: the sheet closes, a toast « Envoyée à Mamie et Tata » (success), or the same title as a warning with the failures as description; all failed: the sheet stays open with the reasons, selection kept                                                 | the brief; the user can change the choice and retry                                                                                                              |
| Names in texts               | first names, joined « Mamie », « Mamie et Tata », « Mamie, Tata et Papi »                                                                                                                                                                                                 | same names as the grid                                                                                                                                           |
| Button                       | « Envoyer » (disabled) with nobody chosen, « Envoyer à 1 personne », « Envoyer à N personnes »; « Envoi… » while sending                                                                                                                                                  | the brief's « N personne(s) », written out per count                                                                                                             |
| Search                       | from 6 friends (`FRIEND_SEARCH_MIN_COUNT`), `filterFriends` reused (name or email, no case, no accents); the selection survives filtering                                                                                                                                 | step 5's rule; a friend chosen then filtered out is still counted in the button                                                                                  |
| Toasts                       | `sonner` (approved), the shadcn `ui/sonner.tsx` adapted: theme read from the `.dark` class on `<html>` (`useAppliedTheme`, a `MutationObserver` through `useSyncExternalStore`), no `next-themes`; one `<Toaster />` in `App`                                             | the app has no theme provider: the class is the truth, and it changes when the user picks a theme                                                                |
| First toast user             | PR A turns the delete error's `window.alert` into `toast.error`                                                                                                                                                                                                           | the Toaster lands with a real caller; a blocking alert over the frame was the last browser popup in the app                                                      |
| Touch targets                | Tailwind 4.3.5's built-in `pointer-coarse:` variant (`@media (pointer: coarse)`, checked in `node_modules/tailwindcss`): `pointer-coarse:size-11` (44 px) on the tile/row ⋯, the `Dialog` and `Sheet` ✕, the viewer's ✕, ⋯, ▶ and arrows; compact (28-36 px) with a mouse | no custom variant needed; the slideshow's glass buttons are already 44 px                                                                                        |

Rejected: a `/photos/:id` route (a second page to guard and lay out, and the library under the viewer would unmount and lose its scroll), keeping the viewer's controls on an idle timer (a viewer is used by hand, the controls must be there), Ken Burns zoom in the viewer (it is for a wall), `vaul` for the sheet (new dependency), one responsive `Dialog` restyled by breakpoint (the brief asks for a Sheet on phones; two named containers read more plainly), parallel share requests, a total count endpoint (API change), scrolling back to the photo instead of reopening it after frame mode (fails for photos not loaded yet).

## Client

### PR A: toasts and touch targets

- `pnpm --filter client add sonner` (approved).
- `hooks/useAppliedTheme.ts`: `useAppliedTheme(): 'light' | 'dark'`.
- `components/ui/sonner.tsx`: the radix-nova registry file, with `useAppliedTheme` instead of `next-themes`, the lucide icons in place of the registry placeholder, and the token style without an `as` cast.
- `App.tsx`: one `<Toaster />` after the router.
- `deletePhoto.ts`: errors in `toast.error`.
- `components/frame/controlClasses.ts`: `COARSE_POINTER_TARGET_CLASSES = 'pointer-coarse:size-11'`; `PhotoActionsMenu`'s trigger uses it. `ui/dialog.tsx` and `ui/sheet.tsx`: their ✕ grows on coarse pointers.

### PR B: the viewer

- `viewerHistory.ts` (pure): `PHOTO_PARAM`, `LIBRARY_BELOW_STATE`, `isLibraryBelow(state)`, `photoPath(pathname, id)`.
- `viewerNavigation.ts` (pure): `LOAD_AHEAD_COUNT`, `SeenPhoto`, `photoIdAfterRemoval`, `missingPhotoStep` (`wait` | `loadMore` | `show` | `close`), `shouldLoadAhead`, `viewerCounter`.
- `hooks/useViewerParam.ts`: `{ openId, open, show, close, dismiss }`; PR C adds `startFrame`.
- `hooks/useViewerPhoto.ts`: the open photo's index, the remembered `SeenPhoto`, the effect that applies `missingPhotoStep` and `shouldLoadAhead`.
- `usePhotoLibrary`: `isFirstPageLoaded`.
- `components/viewer/PhotoViewer.tsx` (dialog, focus back to the tile), `ViewerCarousel.tsx` (slides, arrows), `ViewerTopBar.tsx` (✕, counter, ⋯), `ViewerCaption.tsx` (day, « Envoyée par X »).
- `LibrarySection` takes `onOpenPhoto` (no more `window.open`); `LibraryPage` mounts the viewer; tiles and rows carry `data-photo-id`.

### PR C: library and frame merged

- `useFrameSelection(photos, isActive, startId)`: no modes; the initial selection is `startId`.
- `FramePage`: slideshow only; `?photo=` read; ✕ / Escape → `useLeaveFrame`.
- Removed: `LibraryScreen.tsx`, `LibraryHeader.tsx`, `useOnIdle.ts`.
- `CloseButton`: « Quitter le mode cadre ».
- Library header: « Mode cadre » (`PlayIcon`, frame accent) next to the grid/list toggle. Viewer top bar: ▶ « Mode cadre ».

### PR D: the share sheet

- `photosApi.ts`: `ShareResult` gains `duplicate`; `SHARE_DUPLICATE_MESSAGE` goes.
- `components/sharing/shareTexts.ts` (pure): `ShareOutcome`, `firstName`, `joinNames`, `sentTitle`, `sharedNames`, `failureMessages`, `sendButtonLabel`.
- `hooks/useMediaQuery.ts`.
- `hooks/useShareSending.ts` (replaces `useFriendShares.ts`): `ShareTarget`, `sendTo(friends)`, the toasts.
- `components/sharing/ShareSheet.tsx` (container, header with thumbnail), `ShareFriendsForm.tsx` (loading, errors, no friends, search, button), `FriendPicker.tsx` (avatar grid). `SharePhotoDialog.tsx` is removed.
- `PhotoActionsMenu` and `UploadForm` open `ShareSheet` (same props as the old dialog).

### UI text (French, exact)

- Viewer: ✕ « Fermer la photo »; ⋯ « Actions sur la photo »; arrows « Photo précédente », « Photo suivante »; dialog title (screen readers) « Photo »; while loading « Chargement… »; ▶ « Mode cadre ».
- Library header: « Mode cadre ». Slideshow ✕: « Quitter le mode cadre ».
- Sheet: title « Envoyer à des proches », description « La photo s'affichera aussitôt sur leur cadre. »; « Rechercher un ami »; « Aucun ami ne correspond à « … ». »; « Vous n'avez pas encore d'amis. » + « Ajouter un ami »; button « Envoyer », « Envoyer à 1 personne », « Envoyer à N personnes », « Envoi… ».
- Toasts: « Envoyée à Mamie et Tata »; failures « Tata a déjà cette photo. », « Tata : <message de l'API> »; delete failure: the existing API message.

## Testing

The client has no unit test runner, and adding one is a new dependency (not approved). Each task is gated by `pnpm check`, `pnpm typecheck`, `pnpm --filter client build`, and `pnpm test` (server, unchanged: `Tests  180 passed (180)`). The rules that are easy to get wrong live in small pure files (`viewerHistory.ts`, `viewerNavigation.ts`, `shareTexts.ts`) that read in a minute. The controller runs a Chrome pass after each PR, from the "Chrome check" list of each task (phone size with touch emulation, then desktop).

## Docs

- ARCHITECTURE, Pages: the `/` and `/frame` rows, the viewer, the share sheet, the toasts and the touch targets, each in the task that changes them.
- README: the URL table (Visionneuse, Cadre), « Envoyer une photo à un ami ».
- `docs/produit/` (French, no technical terms, new rules take the next free id of their file): `apparence-et-navigation.md` (notifications, larger buttons on touch screens), `bibliotheque.md` (the viewer, « Mode cadre »), `cadre.md` (slideshow only, leaving it), `partage.md` (the sheet, several people at once, the results), and the delivered items moved out of `a-venir.md` (section 7).

## Delivery

A `gh stack` on `feat/account-profile`, four draft PRs, each green on `pnpm check`, `typecheck`, `--filter client build`, `test`:

| PR  | Branch                     | Scope                                                                         |
| --- | -------------------------- | ----------------------------------------------------------------------------- |
| A   | `feat/photo-toasts`        | this spec and its plan; `sonner`, `<Toaster />`, delete errors; touch targets |
| B   | `feat/photo-viewer`        | the viewer                                                                    |
| C   | `feat/library-frame-merge` | `/frame` slideshow only, « Mode cadre » from the library and the viewer       |
| D   | `feat/share-sheet`         | the share sheet                                                               |

## Out of scope

Pinch-zoom in the viewer, a total photo count, swipe-down on the sheet, profile pictures (step 6), multi-upload, progressive upload, the login redesign, a « sent » history.

## Open questions (defaults applied meanwhile)

1. Deleting the oldest shown photo shows the previous one (close only when none is left). Alternative: close whenever the deleted photo was the last in the list.
2. The counter reads « 3 / 30+ » while pages remain. Alternative: « 3 » alone, or only the loaded count.
3. No swipe-down on the share sheet (no new dependency). Alternative: approve `vaul` (the shadcn `drawer`).
4. Delete errors become toasts in PR A (small extra, gives the Toaster a caller). Alternative: keep `window.alert`.
5. Android back while the share sheet is open over the viewer closes the viewer (the sheet is not in the history). Default: accepted.
6. In frame mode with the light theme, toasts are light over the dark frame (the Toaster sits outside the frame's `dark`). Default: accepted.
