# Frame views: single photo and contact sheet

- Date: 2026-11-23
- Changes: the `/frame` page from [the J1 MVP plan](../plans/2026-11-23-j1-mvp.md), restyled in [the shadcn/ui migration](2026-11-23-shadcn-ui.md)
- AI usage: brainstormed with Claude Code. The author chose the options below; Claude Code searched the shadcn ecosystem and proposed the component split.

## Context

`/frame` turns a screen into a photo frame. Today it shows the latest photo large with every other photo as thumbnails below. The author wants a real frame, built in steps:

1. **Switch between a single photo view and a contact sheet** (this spec)
2. Slideshow: auto-advance
3. "Answering machine" mode: "you have 10 new photos"
4. User settings to choose the mode

Steps 2 to 4 get their own specs.

## Decisions

| Question                                     | Choice                                                                                                                           |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| What is the "film"?                          | Both: full-screen single photo ↔ contact sheet grid, plus an optional thumbnail strip in the photo view.                         |
| How do people interact with the frame?       | Any input: touch, mouse or keyboard shows the controls, which hide after a delay. Swipe and arrows both work.                    |
| A new photo arrives while viewing an old one | Jump to it if nobody is interacting; otherwise stay and show a "N nouvelles photos" badge.                                       |
| Building blocks                              | Official shadcn components: `Carousel` (Embla) and `ToggleGroup`. New dependency `embla-carousel-react`, approved by the author. |
| View on load                                 | Single photo, on the newest one.                                                                                                 |
| Remember the chosen view                     | No: that is step 4 (settings).                                                                                                   |

### Rejected

- **Hand-made carousel**: no dependency, but touch swipe (thresholds, vertical scroll, inertia) is a lot of code to write and explain.
- **Community gallery blocks** (21st.dev, shadcnblocks): copy-paste code, unmaintained, other conventions. Rewriting them costs more than composing official components.

## Components

All under `client/src/`, one responsibility per file.

| File                                 | Responsibility                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hooks/usePhotoFeed.ts`              | Moves the current fetch + socket code out of `FramePage`. Returns `photos` (newest first) and calls `onNewPhoto(photo)` for each live photo.      |
| `hooks/useIdleControls.ts`           | Returns `isActive`: `true` on `pointermove`, `pointerdown` or `keydown` on `window`, `false` after `CONTROLS_HIDE_DELAY_MS` (4000) without input. |
| `components/frame/PhotoView.tsx`     | Full-screen `Carousel`, images `object-contain`. Left/right arrow keys on `window`. Optional thumbnail strip, synced with the current slide.      |
| `components/frame/ContactSheet.tsx`  | Grid of every photo. Selecting one calls `onSelect(id)`.                                                                                          |
| `components/frame/FrameControls.tsx` | `ToggleGroup` "Photo / Pellicule", thumbnail strip toggle, new photos badge. Rendered only while `isActive`.                                      |
| `pages/FramePage.tsx`                | Holds `view`, `currentId`, `newPhotoCount`, `isStripVisible`. Wires the hooks and components.                                                     |

Added by the shadcn CLI: `components/ui/carousel.tsx`, `components/ui/toggle-group.tsx`, `components/ui/toggle.tsx`, `components/ui/badge.tsx`.

## Behaviour

- **Current photo by `id`, not index.** A new photo is prepended, which shifts every index; an index would silently point at another photo.
- **Order**: newest first, like `GET /api/photos`. Swiping left goes to older photos.
- **New photo arrives**:
  - `isActive` false: `currentId` becomes the new photo, the carousel shows it.
  - `isActive` true: `newPhotoCount` goes up, the badge shows "1 nouvelle photo" / "N nouvelles photos".
  - Selecting the badge, or reaching the newest photo by hand, sets `currentId` to the newest and `newPhotoCount` to 0.
- **Contact sheet**: selecting a photo sets `currentId` and switches to the photo view.
- **No photos**: same "En attente de la première photo…" message as today, no controls.

### Risk: carousel position after a prepend

When a slide is prepended, Embla re-initialises and keeps its index, so the screen would move to the next photo. After `photos` changes, `PhotoView` scrolls to the index of `currentId` with `jump: true` (no animation).

## Error handling

Unchanged: a failed `fetch` is logged, the socket reconnects on its own and refetches on `connect`. Photos from the network are still checked with `isPhoto`.

## Verification

The client has no test framework. Each PR runs `pnpm check`, `pnpm typecheck`, `pnpm build`, then a manual check in Chrome:

- switch photo ↔ contact sheet, toggle the strip, swipe and arrow keys;
- select a photo in the contact sheet;
- send a photo from `/` without touching the frame: the frame jumps to it;
- send a photo while moving the mouse on the frame: the badge appears, selecting it jumps to the newest.

## Delivery

One stack of draft PRs:

1. This spec
2. shadcn `carousel`, `toggle-group`, `badge` + `embla-carousel-react`
3. Extract `usePhotoFeed` (no behaviour change)
4. `PhotoView`, `ContactSheet`, `FrameControls`, `useIdleControls`: the view switch
5. New photo behaviour: jump or badge
