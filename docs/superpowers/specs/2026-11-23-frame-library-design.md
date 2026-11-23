# Frame photo library and slideshow mode

- Date: 2026-11-23
- Changes: the `/frame` page after the frame views stack (#19 → #39, merged in develop 07df515)
- AI usage: brainstormed with Claude Code and its visual companion (mockups of three control layouts). The author reframed the request (a library that launches a slideshow, not a photo/sheet switch) and chose the options below; Claude Code proposed the layouts, the hook split and the PR split.

## Context

The request started as "show the contact sheet as thumbnails or as a list", like Google Drive. While choosing where the grid/list toggle goes, the author questioned the model itself: the Photo / Planche switch makes little sense. The frame holds a **photo library**, and from it you **launch a slideshow**. The controls must also stop being one pill where every action sits side by side: each action belongs somewhere on the viewport, with progressive disclosure.

## Decisions

| Question                        | Choice                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Screens                         | Two: **library** and **slideshow**. The Photo / Planche switch is removed.                                                      |
| On load                         | The library.                                                                                                                    |
| Nobody touches the library      | After 60 s without activity, the slideshow starts on its own, playing from the newest photo. The wall never shows a still grid. |
| ▶ "Lancer le diaporama"         | Slideshow from the newest photo, playing.                                                                                       |
| Click on a photo in the library | Slideshow on that photo, **paused**.                                                                                            |
| Leave the slideshow             | ✕ button, or Escape (unless a menu or dialog is open: Escape then closes only that).                                            |
| Slideshow controls              | Layout A below.                                                                                                                 |
| Library display                 | Thumbnails (current grid) or list, chosen with a toggle in the library header.                                                  |
| Remember thumbnails / list      | Yes, per device, in `localStorage`.                                                                                             |
| New photos badge                | Slideshow only, behaviour unchanged. In the library a new photo simply appears first.                                           |
| Paused slideshow left alone     | Stays paused on its photo.                                                                                                      |

### Slideshow layout A: each action where it is expected

| Level                         | What shows                                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Idle                          | The photo, its caption and backdrop. No button.                                                                                                 |
| Someone moves (4 s, as today) | ✕ top left (viewer convention). ⋯ top right (actions on the photo). ‹ ⏸ › bottom centre. ▤ thumbnails bottom right.                             |
| On demand                     | ⋯ opens a menu: "Vitesse" submenu (5 / 10 / 20 s, single choice) and "Supprimer" (confirmation dialog, unchanged). ▤ opens the thumbnail strip. |

### Library

- Fixed header, always visible: "Photos · N" on the left; on the right the primary button **▶ Lancer le diaporama** (amber) then the **▦ | ☰** toggle (`ToggleGroup`, lucide `LayoutGridIcon` / `ListIcon`). No floating pill: the library is a screen you use, not a wall.
- Thumbnails: the current grid, ⋯ on each tile, amber ring on the last photo viewed.
- List: one row per photo: 56 px thumbnail · uploader name · date and time ("23 nov. 2026, 14:32") · ⋯. The whole row opens the photo; the ⋯ is a sibling of the row button, never nested. Newest first, no sorting: 20 photos at most.

### Rejected

- **Layout B, one player bar at the bottom** (✕ left, transport centre, settings right): one place to learn, but it packs unrelated actions together again, the problem the author raised.
- **Layout C, minimal** (✕ and a big ⏸, everything else in ⋯): the calmest, but previous / next and the strip each cost one more click.
- **Toggle in the floating pill**: keeps a pill in the library, which no longer needs one.
- **`ButtonGroup` for the grid/list toggle**: it only groups action buttons visually, with no selected state. `ToggleGroup type="single"` carries the selection and its accessibility, and is already installed.

## Components

| File                                                  | Change                                                                                                                                                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hooks/useIdleControls.ts` → `useIdle.ts`             | Takes `delayMs`. Used twice: 4 s for the slideshow controls, 60 s for the library auto-launch. Adds `wheel` to the activity events. Keeps "a menu or dialog open counts as active".                  |
| `hooks/useFrameSelection.ts`                          | `view: 'photo' \| 'contact-sheet'` becomes `mode: 'library' \| 'slideshow'`. Adds `startSlideshow()` (newest), `openPhoto(id)` (that photo), `closeSlideshow()`. Badge and pin logic unchanged.      |
| `hooks/useLibraryLayout.ts`                           | New. `'grid' \| 'list'` in `localStorage`, reads and writes wrapped in try/catch, default `'grid'`.                                                                                                  |
| `pages/FramePage.tsx`                                 | Keeps the state (playing, interval, strip) and renders `LibraryScreen` or `SlideshowScreen`.                                                                                                         |
| `components/frame/LibraryHeader.tsx`                  | New. Title and count, ▶ button, `LayoutToggle`.                                                                                                                                                      |
| `components/frame/ContactSheet.tsx` → `PhotoGrid.tsx` | Renamed; tile unchanged.                                                                                                                                                                             |
| `components/frame/PhotoList.tsx`, `PhotoListRow.tsx`  | New. Reuse `PhotoActionsMenu`.                                                                                                                                                                       |
| Slideshow bars                                        | Top bar: `CloseButton`, `SlideshowMenu`. Bottom bar: ‹ ⏸ › (shadcn `CarouselPrevious` / `CarouselNext`, already installed), `StripToggle`. Both reuse the fade + `inert` of today's `FrameControls`. |
| `components/frame/SlideshowMenu.tsx`                  | New. "Vitesse" radio submenu and "Supprimer"; shares `DeletePhotoDialog`.                                                                                                                            |
| Removed                                               | `ViewToggles`, `PhotoControls`, `SlideshowControls`, `ControlsDivider`, and the pill if nothing uses it any more.                                                                                    |

No new npm dependency: the shadcn dropdown menu already includes the submenu and radio items.

## Verification

The client has no unit tests (Vitest covers the server only); each PR is checked by hand in Chrome, plus `pnpm check`, `pnpm typecheck` and `pnpm build`. No API change, so Bruno stays untouched.

- Load → library; 60 s idle → slideshow playing from the newest.
- ▶ → newest, playing. Click a photo (grid and list) → that photo, paused.
- ✕ and Escape → library; Escape with the ⋯ menu open closes only the menu.
- Idle slideshow: no button; moving shows the four groups; ⋯ → speed change applies; ▤ → strip.
- Grid/list choice survives a reload; delete from a list row works.
- Badge in the slideshow as today; a new photo in the library appears first.

## Delivery

A `gh stack` from `develop`:

1. `docs/frame-library-design`: this spec and its plan.
2. `feat/frame-library-mode`: library ↔ slideshow (header with ▶, ✕, Escape, click = paused, 60 s auto-launch, `useIdle`). The slideshow keeps today's pill, minus the Photo / Planche switch.
3. `feat/frame-slideshow-layout`: layout A (top and bottom bars, ‹ ›, speed moved into ⋯).
4. `feat/frame-library-list`: list view, its toggle, the memorised choice.
