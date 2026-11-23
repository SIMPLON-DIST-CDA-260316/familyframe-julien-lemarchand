---
plan: frame-library
status: in_progress
spec: docs/superpowers/specs/2026-11-23-frame-library-design.md
branch: docs/frame-library-design (stack, see Git strategy)
worktree: true
tasks_total: 4
tasks_done: 1
current_task: 2
last_commit: —
last_updated: 2026-11-23
---

# Frame Photo Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Working agreement (mandatory):** keep this plan in sync with reality. Check a step only when it is finished and its gate is green. Append every divergence to the Drift Log. Update the frontmatter (`tasks_done`, `current_task`, `last_commit`, `last_updated`) at each task boundary. When a drift produces a durable correction (path, command, signature, decision), amend the affected task block in place and log the amendment. The SDD ledger `.superpowers/sdd/progress.md` stays the runtime authority; the frontmatter mirrors it. Never check a partial step; never delete a finished step or a drift entry.

**Goal:** Replace the Photo / Pellicule switch of `/frame` with two screens: a **library** (header with "Photos · N" and ▶ "Lancer le diaporama", photos as thumbnails or a list) and a **slideshow** (layout A: ✕ and ⋯ on top, ‹ ⏸ › and ▤ at the bottom). An unattended library starts the slideshow after 60 s.

**Architecture:** `FramePage` owns the state and renders `LibraryScreen` or `SlideshowScreen`. `useFrameSelection` swaps `view` for `mode: 'library' | 'slideshow'` and gains `startSlideshow`, `openPhoto`, `closeSlideshow`. `useIdleControls` becomes `useIdle(delayMs)`, used twice (4 s controls, 60 s library); `useOnIdle` turns the 60 s flag going false into one launch. The slideshow settings (playing, interval, strip) live in a `useSlideshowSettings` hook called by the page, so they survive a trip to the library. The bottom bar is rendered inside the `<Carousel>` (as `PhotoView` children) so the shadcn `CarouselPrevious` / `CarouselNext` read its context. `SlideshowMenu` reuses `PhotoActionsMenu` (delete dialog, focus return) and adds the "Vitesse" submenu as children.

**Tech Stack:** React 19, Vite 8, TypeScript 7, Tailwind CSS v4, shadcn/ui (`DropdownMenu` with `Sub` and `RadioGroup`, `ToggleGroup`, `Toggle`, `Button`, `Carousel`), Embla Carousel, lucide-react, Biome.

## Global Constraints

- **Delays and copy (from the spec, exact):**
  - Library auto-launch after **60 s** without activity (`LIBRARY_IDLE_DELAY_MS = 60_000`); slideshow controls hide after **4 s** (`CONTROLS_HIDE_DELAY_MS = 4000`).
  - Speeds **5 / 10 / 20 s**, default **10 s** (`SLIDESHOW_INTERVALS_MS`, `DEFAULT_SLIDESHOW_INTERVAL_MS` in `useSlideshow.ts`, unchanged).
  - UI strings: "Photos", "Lancer le diaporama", "Vitesse", "Supprimer". Every `aria-label` and `title` is in French ("Fermer le diaporama", "Actions sur la photo", "Photo précédente", "Photo suivante", "Lecture automatique", "Miniatures", "Liste").
  - Grid / list choice in `localStorage` under `familyframe.libraryLayout`, default `'grid'`, reads and writes in `try/catch`, stored value validated.
- **No new npm dependency**: the shadcn dropdown menu already ships `Sub`, `SubTrigger`, `SubContent`, `RadioGroup`, `RadioItem`; `ToggleGroup` and `Carousel` are installed.
- Prisma untouched; no API change, so no Bruno change. No server code touched.
- The client has no unit tests: each task is proven by `pnpm check`, `pnpm typecheck`, `pnpm build` and its manual Chrome check.
- Generated shadcn files in `client/src/components/ui/` stay as generated: style through `className` and props only.
- Client code imports with the `@/` alias and the `.ts`/`.tsx` extension. Biome sorts imports: run `pnpm check:fix` after writing a file if `pnpm check` reports an import order or a line wrap, then `pnpm check` again.
- TypeScript rules (AGENTS.md): no `as` casts, explicit return types on exported functions, literal unions rather than `enum`.
- Code rules (`.claude/rules/`): comment why, never what; booleans prefixed `is`/`has`/`should`; callback params named after the item; no magic numbers (named by purpose); one responsibility per file; max 30 lines per function body, 5 params (props count as params); UI copy French, code and comments English.
- Line counts (function body, between the braces). Every new or changed function stays at or under 30 lines, except:
  - **Tolerated:** `FramePage` about 46 body lines (43 today), `useFrameSelection` about 70 (63 today), `PhotoActionsMenu` 40 (39 today, since #39). Author decision carried over from the previous frame plans: these read top to bottom and splitting them would scatter one rule across files.
- Every commit passes `pnpm check` and `pnpm typecheck`; every task ends with `pnpm build` green and its manual check in Chrome.
- Commit messages: Conventional Commits in English, written to a file in the scratchpad and passed with `git commit -F <file>` (the `.env` read guard blocks inline messages that mention it). End each message with the session's attribution lines.
- Git commands run from the worktree root, one plain git command per Bash call: the worktree guard refuses chained or `-C` git commands.

## Git strategy

A new `gh stack` from `develop` (read the `gh-stack` skill before the first `gh stack` command), one layer per task, as in the spec's Delivery section:

| Layer | Branch                        | Task |
| ----- | ----------------------------- | ---- |
| 1     | `docs/frame-library-design`   | 1    |
| 2     | `feat/frame-library-mode`     | 2    |
| 3     | `feat/frame-slideshow-layout` | 3    |
| 4     | `feat/frame-library-list`     | 4    |

Task 1 adopts the existing branch (the spec is already committed there, 71e1ddf). Each later task starts with `gh stack add <branch>` and ends with `gh stack submit --auto`. PR bodies in French, set with `gh pr edit <N> --body-file <file>`.

## Dev environment

- The API on 3000 runs from the **main checkout** (`pnpm dev` there). The worktree client runs on port 5181: `pnpm --filter client exec vite --port 5181 --strictPort`. **The controller starts or stops servers only with the user's OK; implementers never do.**
- Simulate a photo sent by a relative:

  ```bash
  curl -s -F uploaderName=Test -F photo=@server/bruno/fixtures/photo.jpg http://localhost:3000/api/photos
  ```

- The 60 s auto-launch is checked by keeping hands off for a full minute (no shortcut: the delay is a constant, not a setting).
- Reduced motion: Chrome DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion: reduce".

## File Map

| File                                                  | Task | Responsibility                                                                     |
| ----------------------------------------------------- | ---- | ---------------------------------------------------------------------------------- |
| `client/src/hooks/useIdle.ts` (was `useIdleControls`) | 2    | `useIdle(delayMs)`, starts active, `wheel` counts; exports `isOverlayOpen`.        |
| `client/src/hooks/useOnIdle.ts`                       | 2    | Calls back once when a flag turns idle (the 60 s auto-launch).                     |
| `client/src/hooks/useEscapeToClose.ts`                | 2    | Escape closes the slideshow unless a menu or dialog is open.                       |
| `client/src/hooks/useSlideshowSettings.ts`            | 2    | Playing, interval and strip state, kept by the page; `SlideshowSettings` type.     |
| `client/src/hooks/useFrameSelection.ts`               | 2    | `mode` instead of `view`; `startSlideshow`, `openPhoto`, `closeSlideshow`.         |
| `client/src/pages/FramePage.tsx`                      | 2    | Owns the hooks, renders the library or the slideshow.                              |
| `client/src/components/frame/LibraryScreen.tsx`       | 2, 4 | Header and photo collection (grid in 2, grid or list in 4).                        |
| `client/src/components/frame/LibraryHeader.tsx`       | 2, 4 | "Photos · N", ▶ "Lancer le diaporama" (2), layout toggle (4).                      |
| `client/src/components/frame/PhotoGrid.tsx` (was `ContactSheet`) | 2 | The thumbnails grid, clear of the fixed header.                             |
| `client/src/components/frame/PhotoGridTile.tsx` (was `ContactSheetTile`) | 2 | One tile, unchanged apart from its name.                             |
| `client/src/components/frame/SlideshowScreen.tsx`     | 2, 3 | Photo view, controls, Escape, badge (pill in 2, bars in 3).                        |
| `client/src/components/frame/CloseButton.tsx`         | 2, 3 | ✕ back to the library (pill style in 2, glass in 3).                               |
| `client/src/components/frame/ViewToggles.tsx`         | 2    | Deleted.                                                                           |
| `client/src/components/frame/ControlsBar.tsx` (was `FrameControls`) | 3 | Fade + `inert` bar, slides off towards its edge.                         |
| `client/src/components/frame/controlClasses.ts` (was `pillToggleClasses`) | 3 | Glass button, glass pill and pill button class strings.              |
| `client/src/components/frame/SlideshowTopBar.tsx`     | 3    | ✕ left, ⋯ right.                                                                   |
| `client/src/components/frame/SlideshowBottomBar.tsx`  | 3    | ‹ ⏸ › centred, ▤ right.                                                            |
| `client/src/components/frame/SlideshowMenu.tsx`       | 3    | ⋯ with the "Vitesse" radio submenu, on top of `PhotoActionsMenu`.                  |
| `client/src/components/frame/PhotoActionsMenu.tsx`    | 3    | Optional `children` rendered above "Supprimer".                                    |
| `client/src/components/frame/PhotoView.tsx`           | 3    | `children` under the caption, inside the carousel; strip moves out.                |
| `client/src/components/frame/StripToggle.tsx`         | 3    | Glass button classes.                                                              |
| `PhotoControls.tsx`, `SlideshowControls.tsx`, `ControlsDivider.tsx` | 3 | Deleted.                                                                   |
| `client/src/hooks/useLibraryLayout.ts`                | 4    | `'grid' \| 'list'` in `localStorage`.                                              |
| `client/src/components/frame/LayoutToggle.tsx`        | 4    | ▦ \| ☰ `ToggleGroup`.                                                              |
| `client/src/components/frame/PhotoList.tsx`           | 4    | The list of rows.                                                                  |
| `client/src/components/frame/PhotoListRow.tsx`        | 4    | Thumbnail, name, date and time, ⋯ as a sibling.                                    |
| `ARCHITECTURE.md`                                     | 2, 4 | The `/frame` row of the Pages table.                                               |

`README.md` only lists the `/frame` URL: unchanged.

## Spec deviations (decided while planning)

- **`useIdle` starts active** (`useState(true)`) and arms its timer on mount. Starting idle, as `useIdleControls` did, would launch the slideshow the moment the library loads. Side effect: on load the 4 s flag is active too, which only matters in the slideshow.
- **The auto-launch fires on the transition to idle (`useOnIdle`), not while idle.** Escape is handled in the capture phase, before the activity listeners, and React renders between the two: for one render the library is shown while the 60 s flag is still `false` from the unattended slideshow. A level check would relaunch the slideshow at once. `useOnIdle` uses the "adjusted during render" pattern of `useFrameSelection` and `useLeavingPhoto`; an effect on `[isActive]` would omit `onIdle` from its dependencies (Biome `useExhaustiveDependencies`), and with it, would run on every render.
- **`useSlideshowSettings` holds playing, interval and strip** for `FramePage`, and defines the `SlideshowSettings` type in a hook file (the last review flagged a hook importing a type from a component). The state stays the page's (the hook runs in `FramePage`), so the speed survives a trip to the library. It also keeps `FramePage` near its tolerated length.
- **In the library an arrival pins the viewed photo**, active or not: the amber ring stays on the last photo viewed and the new photo simply appears first. No badge count. `closeSlideshow` resets the count: a leftover count would make the idle jump move the ring to the newest photo.
- **`openPhoto` does not reset the count itself**: it is always 0 in the library (the library never counts, `closeSlideshow` resets it).
- **`FrameControls` becomes `ControlsBar`** (an `edge: 'top' | 'bottom'` prop picks the hide direction) instead of being deleted: both bars need exactly its fade and `inert`. `pillToggleClasses.ts` becomes `controlClasses.ts` for the same reason.
- **`SlideshowMenu` reuses `PhotoActionsMenu`** through a new optional `children` prop, instead of a second copy of the delete dialog and focus-return logic. The trigger takes the glass classes through `className`.
- **The bottom bar lives inside the `<Carousel>`**, passed as `PhotoView` children, because `CarouselPrevious` / `CarouselNext` call `useCarousel`. The alternative (lifting the Embla `api` out of `PhotoView` to call `scrollPrev` / `scrollNext`) adds props and duplicates what the shadcn buttons already do (disabled at the ends included). `PhotoView` drops `isStripVisible`: the strip is rendered by `SlideshowScreen` in the same children, so `PhotoView` stays at five props. Controls inside the carousel region also match the WAI-ARIA carousel pattern.
- **The bottom bar floats over the caption's lower edge** (`absolute bottom-full` on a box that holds the strip): the caption keeps today's place and spacing, and hiding the bar moves nothing. The caption is on the left, the bar's content centre and right, so they do not collide. Author's call (2026-11-23): "do what you think is best, we can iterate"; an earlier draft put the caption above the bar in flow, which raised it ~5rem even at rest.
- **The ‹ › keep their generated `sr-only` English text**, overridden by a French `aria-label` (an `aria-label` wins over the content for the accessible name). The play toggle is renamed "Lecture automatique" (was "Diaporama", which now names the whole screen).
- **No shared date formatter**: `PhotoCaption` deliberately shows the day only ("the time of the upload was noise" on a wall); the list needs the time to tell photos of one day apart. Each keeps its own format.
- **The 60 s auto-launch also runs on the empty frame**: the first photo to arrive then shows in the slideshow, which is what a wall should do.

---

### Task 1: Spec and plan

**Files:**

- Existing: `docs/superpowers/specs/2026-11-23-frame-library-design.md` (committed in 71e1ddf)
- Create: `docs/superpowers/plans/2026-11-23-frame-library.md`

Done inline by the controller.

- [x] **Step 1: Commit the plan**

`docs/superpowers/plans` is excluded from Biome: no format step.

```bash
git add docs/superpowers/plans/2026-11-23-frame-library.md
git commit -F <scratchpad>/commit-library-plan.txt
```

Message: `docs: plan the frame photo library and slideshow mode`

- [x] **Step 2: Start the stack on this branch**

Run: `gh stack init --base develop docs/frame-library-design`
Expected: the existing branch is adopted as layer 1, based on `develop`.

- [ ] **Step 3: Submit and write the PR body (controller, after review)**

Run: `gh stack submit --auto`, then `gh pr edit <N> --body-file <file>` with a French body (Pourquoi / Ce qui change / Vérifier) that links the spec and the plan.

---

### Task 2: Library and slideshow modes (PR `feat/frame-library-mode`)

**Files:**

- Rename + rewrite: `client/src/hooks/useIdleControls.ts` → `client/src/hooks/useIdle.ts`
- Rename + rewrite: `client/src/components/frame/ContactSheet.tsx` → `PhotoGrid.tsx`, `ContactSheetTile.tsx` → `PhotoGridTile.tsx`
- Modify: `client/src/hooks/useFrameSelection.ts` (full rewrite)
- Create: `client/src/hooks/useOnIdle.ts`, `client/src/hooks/useEscapeToClose.ts`, `client/src/hooks/useSlideshowSettings.ts`
- Create: `client/src/components/frame/CloseButton.tsx`, `LibraryHeader.tsx`, `LibraryScreen.tsx`, `SlideshowScreen.tsx`
- Modify: `client/src/pages/FramePage.tsx` (edits in Steps 2 and 3, full rewrite in Step 8)
- Delete: `client/src/components/frame/ViewToggles.tsx`
- Modify: `ARCHITECTURE.md` (Pages table)

**Interfaces:**

- Consumes:
  - `Photo` from `@/photo.ts`; `usePhotoFeed(): Photo[]`, unchanged.
  - `PhotoView({ photos, currentId, isStripVisible, autoAdvanceMs, onCurrentChange })`, unchanged in this task.
  - `FrameControls({ isVisible, children })`, `PhotoControls({ photo, isStripVisible, onStripVisibleChange, slideshow })`, `NewPhotosBadge({ count, onSelect })`, `PhotoActionsMenu({ photo, label, className })`, unchanged.
  - `DEFAULT_SLIDESHOW_INTERVAL_MS` from `@/hooks/useSlideshow.ts`.
  - `Button` from `@/components/ui/button.tsx`.
- Produces:
  - `useIdle(delayMs: number): boolean` and `isOverlayOpen(): boolean` from `@/hooks/useIdle.ts`.
  - `useOnIdle(isActive: boolean, onIdle: () => void): void`.
  - `useEscapeToClose(onClose: () => void): void`.
  - `type SlideshowSettings = { isPlaying: boolean; intervalMs: number; isStripVisible: boolean; onPlayingChange: (isPlaying: boolean) => void; onIntervalChange: (intervalMs: number) => void; onStripVisibleChange: (isStripVisible: boolean) => void }` and `useSlideshowSettings(): SlideshowSettings`.
  - `type FrameMode = 'library' | 'slideshow'`, `type FrameSelection = { mode: FrameMode; currentId: string | undefined; newPhotoCount: number; selectPhoto(id: string): void; openPhoto(id: string): void; showNewest(): void; startSlideshow(): void; closeSlideshow(): void }`, `useFrameSelection(photos: Photo[], isActive: boolean): FrameSelection`.
  - `PhotoGrid({ photos: Photo[], currentId: string, onSelect: (id: string) => void })`, `PhotoGridTile({ photo, isCurrent, onSelect })`.
  - `CloseButton({ onClose: () => void })`.
  - `LibraryHeader({ photoCount: number, onStartSlideshow: () => void })`.
  - `LibraryScreen({ photos: Photo[], currentId: string, onOpenPhoto: (id: string) => void, onStartSlideshow: () => void })`.
  - `SlideshowScreen({ photos: Photo[], currentPhoto: Photo, selection: FrameSelection, isActive: boolean, settings: SlideshowSettings })`.

- [x] **Step 1: Create the stack layer**

Run: `gh stack add feat/frame-library-mode`
Expected: `✓ Created and checked out branch "feat/frame-library-mode"`

- [x] **Step 2: Turn `useIdleControls` into `useIdle(delayMs)`**

Do not start a dev server: the controller runs it (see Dev environment).

Run: `git mv client/src/hooks/useIdleControls.ts client/src/hooks/useIdle.ts`

Replace the whole content of `client/src/hooks/useIdle.ts`:

```ts
import { useEffect, useState } from 'react'

// wheel: scrolling the library with a mouse wheel moves no pointer, yet someone is using it.
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ['pointermove', 'pointerdown', 'keydown', 'wheel']

// Someone reading the actions menu or the delete dialog is still using the frame, even
// without moving: the slideshow must not change the photo behind it.
export function isOverlayOpen(): boolean {
  return document.querySelector('[role="menu"], [role="alertdialog"]') !== null
}

// Starts active: someone just opened the page, and the library must wait its full delay
// before launching the slideshow.
export function useIdle(delayMs: number): boolean {
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    let idleTimer = window.setTimeout(becomeIdleUnlessOverlay, delayMs)

    function becomeIdleUnlessOverlay(): void {
      if (isOverlayOpen()) {
        idleTimer = window.setTimeout(becomeIdleUnlessOverlay, delayMs)
        return
      }
      setIsActive(false)
    }

    function markActive(): void {
      setIsActive(true)
      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(becomeIdleUnlessOverlay, delayMs)
    }

    for (const eventName of ACTIVITY_EVENTS) window.addEventListener(eventName, markActive)
    return () => {
      window.clearTimeout(idleTimer)
      for (const eventName of ACTIVITY_EVENTS) window.removeEventListener(eventName, markActive)
    }
  }, [delayMs])

  return isActive
}
```

In `client/src/pages/FramePage.tsx`, replace

```tsx
import { useIdleControls } from '@/hooks/useIdleControls.ts'
```

with

```tsx
import { useIdle } from '@/hooks/useIdle.ts'
```

Replace

```tsx
const FRAME_CLASSES = 'dark min-h-svh bg-frame-background text-foreground'
```

with

```tsx
const FRAME_CLASSES = 'dark min-h-svh bg-frame-background text-foreground'
// The controls step aside quickly: the photo is what the wall is for.
const CONTROLS_HIDE_DELAY_MS = 4000
```

Replace

```tsx
  const isActive = useIdleControls()
```

with

```tsx
  const isActive = useIdle(CONTROLS_HIDE_DELAY_MS)
```

Run: `pnpm check`, then `pnpm typecheck`
Expected: Biome `No fixes applied.`, `client typecheck: Done`.

```bash
git add client/src/hooks/useIdle.ts client/src/pages/FramePage.tsx
git commit -F <scratchpad>/commit-use-idle.txt
```

Message: `refactor(client): turn useIdleControls into useIdle(delayMs)`, body: `Starts active so a long delay is counted from the page load; wheel counts as activity.`

- [x] **Step 3: Rename the contact sheet to `PhotoGrid`**

Run: `git mv client/src/components/frame/ContactSheet.tsx client/src/components/frame/PhotoGrid.tsx`
Run: `git mv client/src/components/frame/ContactSheetTile.tsx client/src/components/frame/PhotoGridTile.tsx`

Replace the whole content of `client/src/components/frame/PhotoGrid.tsx`:

```tsx
import type { JSX } from 'react'
import { PhotoGridTile } from '@/components/frame/PhotoGridTile.tsx'
import type { Photo } from '@/photo.ts'

type PhotoGridProps = {
  photos: Photo[]
  currentId: string
  onSelect: (id: string) => void
}

export function PhotoGrid({ photos, currentId, onSelect }: PhotoGridProps): JSX.Element {
  return (
    // pt-24 keeps the first row clear of the fixed library header.
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4 p-8 pt-24">
      {photos.map((photo) => (
        <PhotoGridTile
          key={photo.id}
          photo={photo}
          isCurrent={photo.id === currentId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}
```

Replace the whole content of `client/src/components/frame/PhotoGridTile.tsx`:

```tsx
import type { JSX } from 'react'
import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
import type { Photo } from '@/photo.ts'

type PhotoGridTileProps = {
  photo: Photo
  isCurrent: boolean
  onSelect: (id: string) => void
}

export function PhotoGridTile({ photo, isCurrent, onSelect }: PhotoGridTileProps): JSX.Element {
  return (
    // The ellipsis is a sibling of the tile button: a button cannot hold a button.
    <li className="group/tile relative">
      <button
        type="button"
        onClick={() => onSelect(photo.id)}
        aria-current={isCurrent}
        className="group relative block w-full overflow-hidden rounded-xl outline-none ring-offset-4 ring-offset-frame-background focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
      >
        <img
          className="aspect-square w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover/tile:scale-105"
          src={photo.thumbnailUrl}
          alt={`Envoyée par ${photo.uploaderName}`}
          loading="lazy"
          decoding="async"
        />
        <span className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/75 to-transparent px-3 pt-8 pb-2 text-left text-sm font-medium text-white">
          {photo.uploaderName}
        </span>
      </button>
      <PhotoActionsMenu
        photo={photo}
        label={`Actions sur la photo envoyée par ${photo.uploaderName}`}
        className="absolute top-2 right-2 rounded-full bg-black/55 text-white/80 backdrop-blur-sm hover:bg-black/75 hover:text-white dark:hover:bg-black/75"
      />
    </li>
  )
}
```

In `client/src/pages/FramePage.tsx`, delete the line

```tsx
import { ContactSheet } from '@/components/frame/ContactSheet.tsx'
```

and replace

```tsx
import { PhotoControls } from '@/components/frame/PhotoControls.tsx'
```

with

```tsx
import { PhotoControls } from '@/components/frame/PhotoControls.tsx'
import { PhotoGrid } from '@/components/frame/PhotoGrid.tsx'
```

Replace

```tsx
        <ContactSheet photos={photos} currentId={currentPhoto.id} onSelect={selection.openPhoto} />
```

with

```tsx
        <PhotoGrid photos={photos} currentId={currentPhoto.id} onSelect={selection.openPhoto} />
```

Run: `pnpm check`, then `pnpm typecheck`
Expected: `No fixes applied.`, `client typecheck: Done`.

```bash
git add client/src/components/frame/PhotoGrid.tsx client/src/components/frame/PhotoGridTile.tsx client/src/pages/FramePage.tsx
git commit -F <scratchpad>/commit-photo-grid.txt
```

Message: `refactor(client): rename the contact sheet to PhotoGrid`

- [x] **Step 4: Swap `view` for `mode` in `useFrameSelection`**

Replace the whole content of `client/src/hooks/useFrameSelection.ts`:

```ts
import { useState } from 'react'
import type { Photo } from '@/photo.ts'

export type FrameMode = 'library' | 'slideshow'

export type FrameSelection = {
  mode: FrameMode
  currentId: string | undefined
  newPhotoCount: number
  selectPhoto: (id: string) => void
  openPhoto: (id: string) => void
  showNewest: () => void
  startSlideshow: () => void
  closeSlideshow: () => void
}

export function useFrameSelection(photos: Photo[], isActive: boolean): FrameSelection {
  const [mode, setMode] = useState<FrameMode>('library')
  // null follows the newest photo.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newPhotoCount, setNewPhotoCount] = useState(0)
  const newestId = photos.at(0)?.id
  const [shownNewestId, setShownNewestId] = useState(newestId)
  // The pinned photo may have been deleted: fall back to the newest.
  const pinnedId = photos.find(({ id }) => id === selectedId)?.id

  function handleArrival(previousNewestId: string): void {
    if (isActive || mode === 'library') {
      // Someone is looking: keep their photo on screen, or ringed in the library.
      setSelectedId(pinnedId ?? previousNewestId)
      // The badge belongs to the slideshow: in the library the new photo simply appears first.
      if (mode === 'library') return
      // A refetch after a reconnect can bring several photos at once.
      const previousNewestIndex = photos.findIndex(({ id }) => id === previousNewestId)
      const arrivedCount = Math.max(previousNewestIndex, 1)
      setNewPhotoCount((count) => count + arrivedCount)
      return
    }
    showNewest()
  }

  // Adjusted during render, not in an effect: an effect would paint the new photo once
  // before pinning the viewed one back.
  if (newestId !== shownNewestId) {
    setShownNewestId(newestId)
    // undefined: the first load, nothing arrived. A previous newest missing from the list was deleted.
    if (shownNewestId !== undefined && photos.some(({ id }) => id === shownNewestId)) {
      handleArrival(shownNewestId)
    }
  }
  // Nobody is looking any more: show what arrived meanwhile.
  if (!isActive && newPhotoCount > 0) showNewest()

  function showNewest(): void {
    setSelectedId(null)
    setNewPhotoCount(0)
  }

  function selectPhoto(id: string): void {
    if (id === newestId) {
      setSelectedId(null)
      setNewPhotoCount(0)
      return
    }
    setSelectedId(id)
  }

  function openPhoto(id: string): void {
    selectPhoto(id)
    setMode('slideshow')
  }

  function startSlideshow(): void {
    showNewest()
    setMode('slideshow')
  }

  function closeSlideshow(): void {
    setMode('library')
    // A leftover count would make the idle jump move the library's ring to the newest photo.
    setNewPhotoCount(0)
  }

  return {
    mode,
    currentId: pinnedId ?? newestId,
    newPhotoCount,
    selectPhoto,
    openPhoto,
    showNewest,
    startSlideshow,
    closeSlideshow,
  }
}
```

- [x] **Step 5: Write the three small hooks**

Create `client/src/hooks/useOnIdle.ts`:

```ts
import { useState } from 'react'

// Calls onIdle once when isActive turns false, not on every render while idle: leaving a
// slideshow that played unattended must not relaunch it before anyone has moved.
export function useOnIdle(isActive: boolean, onIdle: () => void): void {
  const [wasActive, setWasActive] = useState(isActive)

  // Adjusted during render, like useFrameSelection: an effect would need onIdle in its
  // dependencies, a new function on every render.
  if (isActive !== wasActive) {
    setWasActive(isActive)
    if (!isActive) onIdle()
  }
}
```

Create `client/src/hooks/useEscapeToClose.ts`:

```ts
import { useEffect } from 'react'
import { isOverlayOpen } from '@/hooks/useIdle.ts'

export function useEscapeToClose(onClose: () => void): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      // An open menu or dialog takes this Escape for itself.
      if (event.key !== 'Escape' || isOverlayOpen()) return
      onClose()
    }

    // Capture: Radix closes its layer on this same Escape, so a later listener would find
    // the menu already gone and close the slideshow with it.
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [onClose])
}
```

Create `client/src/hooks/useSlideshowSettings.ts`:

```ts
import { useState } from 'react'
import { DEFAULT_SLIDESHOW_INTERVAL_MS } from '@/hooks/useSlideshow.ts'

export type SlideshowSettings = {
  isPlaying: boolean
  intervalMs: number
  isStripVisible: boolean
  onPlayingChange: (isPlaying: boolean) => void
  onIntervalChange: (intervalMs: number) => void
  onStripVisibleChange: (isStripVisible: boolean) => void
}

// Called by the page, not the slideshow screen: the screen unmounts in the library, and the
// chosen speed must survive the trip.
export function useSlideshowSettings(): SlideshowSettings {
  const [isPlaying, setIsPlaying] = useState(true)
  const [intervalMs, setIntervalMs] = useState(DEFAULT_SLIDESHOW_INTERVAL_MS)
  const [isStripVisible, setIsStripVisible] = useState(false)

  return {
    isPlaying,
    intervalMs,
    isStripVisible,
    onPlayingChange: setIsPlaying,
    onIntervalChange: setIntervalMs,
    onStripVisibleChange: setIsStripVisible,
  }
}
```

- [x] **Step 6: Write the close button and the library**

Create `client/src/components/frame/CloseButton.tsx`:

```tsx
import { XIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Button } from '@/components/ui/button.tsx'

type CloseButtonProps = {
  onClose: () => void
}

export function CloseButton({ onClose }: CloseButtonProps): JSX.Element {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClose}
      aria-label="Fermer le diaporama"
      className="rounded-full text-white/80"
    >
      <XIcon />
    </Button>
  )
}
```

Create `client/src/components/frame/LibraryHeader.tsx`:

```tsx
import { PlayIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Button } from '@/components/ui/button.tsx'

type LibraryHeaderProps = {
  photoCount: number
  onStartSlideshow: () => void
}

export function LibraryHeader({ photoCount, onStartSlideshow }: LibraryHeaderProps): JSX.Element {
  return (
    // z-10: the tiles come later in the page and are positioned, they would scroll over it.
    <header className="fixed inset-x-0 top-0 z-10 flex items-center gap-4 border-b border-white/10 bg-frame-background/80 px-8 py-4 backdrop-blur-xl">
      <h1 className="text-2xl font-medium tracking-tight">
        Photos <span className="text-muted-foreground tabular-nums">· {photoCount}</span>
      </h1>
      <Button
        size="lg"
        onClick={onStartSlideshow}
        className="ml-auto rounded-full bg-frame-accent px-4 text-black hover:bg-frame-accent/85"
      >
        <PlayIcon data-icon="inline-start" />
        Lancer le diaporama
      </Button>
    </header>
  )
}
```

Create `client/src/components/frame/LibraryScreen.tsx`:

```tsx
import type { JSX } from 'react'
import { LibraryHeader } from '@/components/frame/LibraryHeader.tsx'
import { PhotoGrid } from '@/components/frame/PhotoGrid.tsx'
import type { Photo } from '@/photo.ts'

type LibraryScreenProps = {
  photos: Photo[]
  currentId: string
  onOpenPhoto: (id: string) => void
  onStartSlideshow: () => void
}

export function LibraryScreen({
  photos,
  currentId,
  onOpenPhoto,
  onStartSlideshow,
}: LibraryScreenProps): JSX.Element {
  return (
    <>
      <LibraryHeader photoCount={photos.length} onStartSlideshow={onStartSlideshow} />
      <PhotoGrid photos={photos} currentId={currentId} onSelect={onOpenPhoto} />
    </>
  )
}
```

- [x] **Step 7: Write the slideshow screen (today's pill, minus the switch, plus ✕)**

Create `client/src/components/frame/SlideshowScreen.tsx`:

```tsx
import type { JSX } from 'react'
import { CloseButton } from '@/components/frame/CloseButton.tsx'
import { FrameControls } from '@/components/frame/FrameControls.tsx'
import { NewPhotosBadge } from '@/components/frame/NewPhotosBadge.tsx'
import { PhotoControls } from '@/components/frame/PhotoControls.tsx'
import { PhotoView } from '@/components/frame/PhotoView.tsx'
import { useEscapeToClose } from '@/hooks/useEscapeToClose.ts'
import type { FrameSelection } from '@/hooks/useFrameSelection.ts'
import type { SlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
import type { Photo } from '@/photo.ts'

type SlideshowScreenProps = {
  photos: Photo[]
  currentPhoto: Photo
  selection: FrameSelection
  isActive: boolean
  settings: SlideshowSettings
}

export function SlideshowScreen({
  photos,
  currentPhoto,
  selection,
  isActive,
  settings,
}: SlideshowScreenProps): JSX.Element {
  useEscapeToClose(selection.closeSlideshow)

  return (
    <>
      <PhotoView
        photos={photos}
        currentId={currentPhoto.id}
        isStripVisible={settings.isStripVisible}
        // The slideshow waits while someone is using the frame.
        autoAdvanceMs={settings.isPlaying && !isActive ? settings.intervalMs : null}
        onCurrentChange={selection.selectPhoto}
      />
      <FrameControls isVisible={isActive}>
        <CloseButton onClose={selection.closeSlideshow} />
        <PhotoControls
          photo={currentPhoto}
          isStripVisible={settings.isStripVisible}
          onStripVisibleChange={settings.onStripVisibleChange}
          slideshow={settings}
        />
      </FrameControls>
      <NewPhotosBadge count={selection.newPhotoCount} onSelect={selection.showNewest} />
    </>
  )
}
```

`slideshow={settings}` passes more fields than `SlideshowControls` reads; it type-checks (a variable, not an object literal) and `PhotoControls` is deleted in Task 3.

- [x] **Step 8: Rewrite `FramePage` around the two screens, delete `ViewToggles`**

Replace the whole content of `client/src/pages/FramePage.tsx`:

```tsx
import { ImagesIcon } from 'lucide-react'
import type { JSX } from 'react'
import { LibraryScreen } from '@/components/frame/LibraryScreen.tsx'
import { SlideshowScreen } from '@/components/frame/SlideshowScreen.tsx'
import { useFrameSelection } from '@/hooks/useFrameSelection.ts'
import { useIdle } from '@/hooks/useIdle.ts'
import { useOnIdle } from '@/hooks/useOnIdle.ts'
import { usePhotoFeed } from '@/hooks/usePhotoFeed.ts'
import { useSlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
import { cn } from '@/lib/utils.ts'

// The frame is a screen on a wall: dark keeps the photos in front.
const FRAME_CLASSES = 'dark min-h-svh bg-frame-background text-foreground'
// The controls step aside quickly: the photo is what the wall is for.
const CONTROLS_HIDE_DELAY_MS = 4000
// Long enough to browse the library; after it, the wall goes back to showing photos.
const LIBRARY_IDLE_DELAY_MS = 60_000

function EmptyFrame(): JSX.Element {
  return (
    <main
      className={cn(
        FRAME_CLASSES,
        'grid place-items-center bg-radial from-frame-accent/10 to-transparent to-70%',
      )}
    >
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <ImagesIcon
          aria-hidden
          className="size-16 text-frame-accent/80 motion-safe:animate-pulse"
        />
        <p className="text-3xl font-medium">En attente de la première photo…</p>
        {/* A first visitor needs the way in, not only the news that the frame is empty. */}
        <p className="text-lg text-muted-foreground">
          Envoyez-en une depuis votre téléphone : {window.location.host}
        </p>
      </div>
    </main>
  )
}

export default function FramePage(): JSX.Element {
  const photos = usePhotoFeed()
  const isActive = useIdle(CONTROLS_HIDE_DELAY_MS)
  const isLibraryActive = useIdle(LIBRARY_IDLE_DELAY_MS)
  const settings = useSlideshowSettings()
  // A paused photo was chosen by someone: a new arrival raises the badge instead of replacing it.
  const selection = useFrameSelection(photos, isActive || !settings.isPlaying)

  function startSlideshow(): void {
    selection.startSlideshow()
    settings.onPlayingChange(true)
  }

  function openPhoto(id: string): void {
    selection.openPhoto(id)
    // A photo picked by hand is there to be looked at, not to slide away.
    settings.onPlayingChange(false)
  }

  // The wall never shows a still grid: an unattended library turns into the slideshow.
  useOnIdle(isLibraryActive, () => {
    if (selection.mode === 'library') startSlideshow()
  })

  const currentPhoto = photos.find(({ id }) => id === selection.currentId)
  if (currentPhoto === undefined) return <EmptyFrame />

  const isSlideshow = selection.mode === 'slideshow'
  return (
    <main className={cn(FRAME_CLASSES, isSlideshow && !isActive && 'cursor-none')}>
      {isSlideshow ? (
        <SlideshowScreen
          photos={photos}
          currentPhoto={currentPhoto}
          selection={selection}
          isActive={isActive}
          settings={settings}
        />
      ) : (
        <LibraryScreen
          photos={photos}
          currentId={currentPhoto.id}
          onOpenPhoto={openPhoto}
          onStartSlideshow={startSlideshow}
        />
      )}
    </main>
  )
}
```

`useOnIdle` sits before the early return (hooks run on every render). Its callback sets state of hooks that run in `FramePage` itself, which React allows during render.

Run: `git rm client/src/components/frame/ViewToggles.tsx`

- [x] **Step 9: Update the Pages table in `ARCHITECTURE.md`**

Replace the table under `## Pages`:

```markdown
| Chemin   | Page                                                                                          |
| -------- | --------------------------------------------------------------------------------------------- |
| `/`      | envoi : pseudo (mémorisé dans `localStorage`), « Prendre une photo » ou « Choisir une image » |
| `/frame` | cadre : dernière photo en grand, les précédentes en vignettes, chacune avec « Supprimer »     |
```

with

```markdown
| Chemin   | Page                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`      | envoi : pseudo (mémorisé dans `localStorage`), « Prendre une photo » ou « Choisir une image »                                                     |
| `/frame` | cadre : bibliothèque des photos en vignettes, chacune avec « Supprimer » ; « Lancer le diaporama » ou une minute sans activité lance le diaporama |
```

- [x] **Step 10: Check, typecheck, build**

Run: `pnpm check`, then `pnpm typecheck`, then `pnpm build`
Expected: Biome `No fixes applied.`, `client typecheck: Done`, Vite `✓ built in …`.

- [x] **Step 11: Commit**

```bash
git add client/src/hooks/useFrameSelection.ts client/src/hooks/useOnIdle.ts client/src/hooks/useEscapeToClose.ts client/src/hooks/useSlideshowSettings.ts client/src/components/frame/CloseButton.tsx client/src/components/frame/LibraryHeader.tsx client/src/components/frame/LibraryScreen.tsx client/src/components/frame/SlideshowScreen.tsx client/src/pages/FramePage.tsx ARCHITECTURE.md
git commit -F <scratchpad>/commit-library-mode.txt
```

Message: `feat(client): open the frame on a photo library that launches the slideshow`

Renames and deletions are already staged by `git mv` / `git rm`: `git add` only lists files that exist.

- [ ] **Step 12: Manual check in Chrome (controller)**

On `http://localhost:5181/frame`, with at least three photos:

1. Load: the library shows, header "Photos · N" with the amber "Lancer le diaporama" button, the grid below the header (first row not hidden), amber ring on the newest photo. No pill, no badge.
2. Scroll the grid: the tiles pass under the header, never over it.
3. Click "Lancer le diaporama": slideshow on the newest photo, the pill shows ✕, the strip toggle, play (pressed), 5/10/20 s and ⋯; no Photo / Pellicule switch. Hands off: the pill hides after 4 s, the photo changes every 10 s.
4. Move, click ✕: back to the library. Launch again, press Escape: back to the library. In the library, Escape does nothing.
5. In the slideshow, open ⋯ and press Escape: only the menu closes, the slideshow stays. Open ⋯ → Supprimer, press Escape: only the dialog closes.
6. In the library, click an older tile: slideshow on that photo, play not pressed. Hands off for 15 s: the photo stays. ✕: the ring is on that photo.
7. In the library, hands off for 60 s: the slideshow starts on the newest photo, playing, pill hidden. ✕ (or Escape) right after: the library stays (no immediate relaunch); 60 s later it launches again.
8. In the library, open a tile's ⋯ and wait 60 s: no launch while the menu is open.
9. In the library, scroll with the mouse wheel every ~20 s without moving the pointer for over a minute: no launch.
10. In the slideshow, keep moving and send a photo (`curl` above): the badge shows, as today. ✕: no badge in the library. Send another photo: it appears first in the grid, the ring stays where it was, no badge.

- [ ] **Step 13: Submit and write the PR body**

Run: `gh stack submit --auto`, then `gh pr edit <N> --body-file <file>`. French body:

- **Pourquoi**: la bascule Photo / Pellicule n'avait pas de sens ; le cadre contient une bibliothèque, depuis laquelle on lance un diaporama.
- **Ce qui change**: écran bibliothèque (en-tête « Photos · N », bouton « Lancer le diaporama »), diaporama fermé par ✕ ou Échap, clic sur une photo = diaporama en pause sur elle, lancement automatique après 60 s sans activité. Le diaporama garde la pilule actuelle, sans la bascule.
- **Guidage review**: `useIdle` démarre actif ; `useOnIdle` déclenche sur la transition vers l'inactivité, pas sur l'état (sinon Échap relancerait aussitôt) ; Échap écouté en capture pour laisser les menus et dialogues le prendre.
- **Vérifier**: la liste de l'étape 12.

---

### Task 3: Slideshow layout A (PR `feat/frame-slideshow-layout`)

**Files:**

- Modify: `client/src/components/frame/PhotoActionsMenu.tsx` (Step 2)
- Rename + rewrite: `client/src/components/frame/FrameControls.tsx` → `ControlsBar.tsx`
- Rename + rewrite: `client/src/components/frame/pillToggleClasses.ts` → `controlClasses.ts`
- Create: `client/src/components/frame/SlideshowMenu.tsx`, `SlideshowTopBar.tsx`, `SlideshowBottomBar.tsx`
- Modify: `client/src/components/frame/StripToggle.tsx`, `CloseButton.tsx`
- Modify: `client/src/components/frame/PhotoView.tsx` (full rewrite)
- Modify: `client/src/components/frame/SlideshowScreen.tsx` (full rewrite)
- Delete: `client/src/components/frame/PhotoControls.tsx`, `SlideshowControls.tsx`, `ControlsDivider.tsx`

**Interfaces:**

- Consumes:
  - `SlideshowSettings`, `FrameSelection`, `useEscapeToClose` from Task 2.
  - `CarouselPrevious`, `CarouselNext` from `@/components/ui/carousel.tsx` (must render inside `<Carousel>`; `variant`, `size`, `className`, `aria-label` pass through to `Button`).
  - `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuPortal`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuSeparator` from `@/components/ui/dropdown-menu.tsx`.
  - `SLIDESHOW_INTERVALS_MS` from `@/hooks/useSlideshow.ts`.
- Produces:
  - `PhotoActionsMenu({ photo: Photo, label: string, className?: string, children?: ReactNode })`.
  - `ControlsBar({ edge: 'top' | 'bottom', isVisible: boolean, className: string, children: ReactNode })` (the `ControlsBarEdge` union stays private to the file).
  - `GLASS_PILL_CLASSES`, `GLASS_BUTTON_CLASSES`, `PILL_BUTTON_CLASSES: string` from `@/components/frame/controlClasses.ts`.
  - `SlideshowMenu({ photo: Photo, intervalMs: number, onIntervalChange: (intervalMs: number) => void })`.
  - `SlideshowTopBar({ isVisible: boolean, photo: Photo, settings: SlideshowSettings, onClose: () => void })`.
  - `SlideshowBottomBar({ isVisible: boolean, settings: SlideshowSettings })`.
  - `PhotoView({ photos, currentId, autoAdvanceMs, onCurrentChange, children: ReactNode })`: `isStripVisible` removed.
  - `SlideshowScreen`: same five props as Task 2.

- [ ] **Step 1: Create the stack layer**

Run: `gh stack add feat/frame-slideshow-layout`
Expected: `✓ Created and checked out branch "feat/frame-slideshow-layout"`

- [ ] **Step 2: Let `PhotoActionsMenu` take extra items**

In `client/src/components/frame/PhotoActionsMenu.tsx`, replace

```tsx
import { type JSX, useRef, useState } from 'react'
```

with

```tsx
import { type JSX, type ReactNode, useRef, useState } from 'react'
```

Replace

```tsx
type PhotoActionsMenuProps = {
  photo: Photo
  label: string
  className?: string
}

export function PhotoActionsMenu({ photo, label, className }: PhotoActionsMenuProps): JSX.Element {
```

with

```tsx
type PhotoActionsMenuProps = {
  photo: Photo
  label: string
  className?: string
  // Items above "Supprimer": the slideshow adds its speed.
  children?: ReactNode
}

export function PhotoActionsMenu({
  photo,
  label,
  className,
  children,
}: PhotoActionsMenuProps): JSX.Element {
```

Replace

```tsx
        <DropdownMenuContent align="end" className="dark">
          <DropdownMenuItem variant="destructive" onSelect={() => setPhotoToDelete(photo)}>
```

with

```tsx
        <DropdownMenuContent align="end" className="dark">
          {children}
          <DropdownMenuItem variant="destructive" onSelect={() => setPhotoToDelete(photo)}>
```

Run: `pnpm check`, then `pnpm typecheck`
Expected: `No fixes applied.`, `client typecheck: Done`.

```bash
git add client/src/components/frame/PhotoActionsMenu.tsx
git commit -F <scratchpad>/commit-actions-children.txt
```

Message: `refactor(client): let the photo actions menu take extra items`

- [ ] **Step 3: Turn the pill into bars: `ControlsBar` and the class strings**

Run: `git mv client/src/components/frame/FrameControls.tsx client/src/components/frame/ControlsBar.tsx`
Run: `git mv client/src/components/frame/pillToggleClasses.ts client/src/components/frame/controlClasses.ts`

Replace the whole content of `client/src/components/frame/ControlsBar.tsx`:

```tsx
import type { JSX, ReactNode } from 'react'
import { cn } from '@/lib/utils.ts'

type ControlsBarEdge = 'top' | 'bottom'

// Each bar slides off towards the edge it sits on.
const HIDDEN_SHIFT_CLASSES: Record<ControlsBarEdge, string> = {
  top: '-translate-y-3',
  bottom: 'translate-y-3',
}

type ControlsBarProps = {
  edge: ControlsBarEdge
  isVisible: boolean
  // Where the bar sits and how it lays out its buttons.
  className: string
  children: ReactNode
}

export function ControlsBar({
  edge,
  isVisible,
  className,
  children,
}: ControlsBarProps): JSX.Element {
  return (
    <div
      // Kept mounted so the hide can animate; inert keeps hidden buttons out of focus and clicks.
      inert={!isVisible}
      className={cn(
        'flex items-center px-6 py-4 transition-[opacity,translate] ease-out motion-reduce:transition-none',
        // Leaving is faster than arriving, so the photo comes back quickly. pointer-events-auto:
        // the bottom bar sits in the caption overlay, which lets swipes through to the carousel.
        isVisible
          ? 'pointer-events-auto opacity-100 duration-300'
          : cn('pointer-events-none opacity-0 duration-200', HIDDEN_SHIFT_CLASSES[edge]),
        className,
      )}
    >
      {children}
    </div>
  )
}
```

Replace the whole content of `client/src/components/frame/controlClasses.ts`:

```ts
// Dark blurred glass keeps the controls readable over any photo, even a light one.
// The shadcn buttons and toggles stay as generated: the controls restyle them through className.
const GLASS_CLASSES = 'rounded-full bg-black/45 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl'

export const GLASS_PILL_CLASSES = `${GLASS_CLASSES} flex items-center gap-1 p-1.5`

// A button alone on the photo: ✕, ⋯ and the strip toggle.
export const GLASS_BUTTON_CLASSES = `${GLASS_CLASSES} size-11 text-white/80 hover:bg-black/65 hover:text-white dark:hover:bg-black/65 aria-expanded:bg-black/65 aria-expanded:text-white aria-pressed:bg-white/20 aria-pressed:text-white data-[state=on]:bg-white/20 data-[state=on]:text-white`

// A button inside the glass pill: the pill is the glass, the button only lights up.
export const PILL_BUTTON_CLASSES =
  'size-11 rounded-full text-white/80 hover:bg-white/10 hover:text-white dark:hover:bg-white/10 aria-pressed:bg-white/15 aria-pressed:text-white data-[state=on]:bg-white/15 data-[state=on]:text-white'
```

In `client/src/components/frame/StripToggle.tsx`, replace

```tsx
import { PILL_TOGGLE_CLASSES } from '@/components/frame/pillToggleClasses.ts'
```

with

```tsx
import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
```

and replace

```tsx
      className={PILL_TOGGLE_CLASSES}
```

with

```tsx
      className={GLASS_BUTTON_CLASSES}
```

Replace the whole content of `client/src/components/frame/CloseButton.tsx`:

```tsx
import { XIcon } from 'lucide-react'
import type { JSX } from 'react'
import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
import { Button } from '@/components/ui/button.tsx'

type CloseButtonProps = {
  onClose: () => void
}

export function CloseButton({ onClose }: CloseButtonProps): JSX.Element {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClose}
      aria-label="Fermer le diaporama"
      className={GLASS_BUTTON_CLASSES}
    >
      <XIcon />
    </Button>
  )
}
```

`size-11` and `rounded-full` in the class strings override the variants' `size-7` and `rounded-[…]` (`cn` merges Tailwind conflicts, the last one wins).

- [ ] **Step 4: Write the ⋯ menu with its "Vitesse" submenu**

Create `client/src/components/frame/SlideshowMenu.tsx`:

```tsx
import { TimerIcon } from 'lucide-react'
import type { JSX } from 'react'
import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
import {
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu.tsx'
import { SLIDESHOW_INTERVALS_MS } from '@/hooks/useSlideshow.ts'
import type { Photo } from '@/photo.ts'

const MS_PER_SECOND = 1000

type SlideshowMenuProps = {
  photo: Photo
  intervalMs: number
  onIntervalChange: (intervalMs: number) => void
}

export function SlideshowMenu({
  photo,
  intervalMs,
  onIntervalChange,
}: SlideshowMenuProps): JSX.Element {
  function selectInterval(value: string): void {
    // Radio values are strings: only a speed from the list goes back to the slideshow.
    const selectedMs = SLIDESHOW_INTERVALS_MS.find((interval) => String(interval) === value)
    if (selectedMs !== undefined) onIntervalChange(selectedMs)
  }

  return (
    <PhotoActionsMenu photo={photo} label="Actions sur la photo" className={GLASS_BUTTON_CLASSES}>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <TimerIcon />
          Vitesse
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          {/* `dark`: the submenu portals to body, outside the frame's dark <main>. */}
          <DropdownMenuSubContent className="dark">
            <DropdownMenuRadioGroup value={String(intervalMs)} onValueChange={selectInterval}>
              {SLIDESHOW_INTERVALS_MS.map((interval) => (
                <DropdownMenuRadioItem key={interval} value={String(interval)}>
                  {interval / MS_PER_SECOND} s
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
    </PhotoActionsMenu>
  )
}
```

- [ ] **Step 5: Write the two bars**

Create `client/src/components/frame/SlideshowTopBar.tsx`:

```tsx
import type { JSX } from 'react'
import { CloseButton } from '@/components/frame/CloseButton.tsx'
import { ControlsBar } from '@/components/frame/ControlsBar.tsx'
import { SlideshowMenu } from '@/components/frame/SlideshowMenu.tsx'
import type { SlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
import type { Photo } from '@/photo.ts'

type SlideshowTopBarProps = {
  isVisible: boolean
  photo: Photo
  settings: SlideshowSettings
  onClose: () => void
}

export function SlideshowTopBar({
  isVisible,
  photo,
  settings,
  onClose,
}: SlideshowTopBarProps): JSX.Element {
  return (
    // ✕ top left, where photo viewers put it; the actions on the photo top right.
    <ControlsBar
      edge="top"
      isVisible={isVisible}
      className="fixed inset-x-0 top-0 justify-between"
    >
      <CloseButton onClose={onClose} />
      <SlideshowMenu
        photo={photo}
        intervalMs={settings.intervalMs}
        onIntervalChange={settings.onIntervalChange}
      />
    </ControlsBar>
  )
}
```

Create `client/src/components/frame/SlideshowBottomBar.tsx`:

```tsx
import { PauseIcon, PlayIcon } from 'lucide-react'
import type { JSX } from 'react'
import { ControlsBar } from '@/components/frame/ControlsBar.tsx'
import { GLASS_PILL_CLASSES, PILL_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
import { StripToggle } from '@/components/frame/StripToggle.tsx'
import { CarouselNext, CarouselPrevious } from '@/components/ui/carousel.tsx'
import { Toggle } from '@/components/ui/toggle.tsx'
import type { SlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
import { cn } from '@/lib/utils.ts'

// The shadcn arrows sit absolutely beside the carousel; here they flow in the pill.
const PILL_ARROW_CLASSES = cn('static', PILL_BUTTON_CLASSES)

type SlideshowBottomBarProps = {
  isVisible: boolean
  settings: SlideshowSettings
}

// Rendered inside the carousel: the arrows read its context.
export function SlideshowBottomBar({ isVisible, settings }: SlideshowBottomBarProps): JSX.Element {
  return (
    // Three columns: the transport stays centred whatever sits on its right.
    <ControlsBar
      edge="bottom"
      isVisible={isVisible}
      // Floats over the caption's lower edge: hiding the bar moves nothing on screen.
      className="absolute inset-x-0 bottom-full grid grid-cols-[1fr_auto_1fr]"
    >
      <div className={cn(GLASS_PILL_CLASSES, 'col-start-2')}>
        <CarouselPrevious
          variant="ghost"
          aria-label="Photo précédente"
          className={PILL_ARROW_CLASSES}
        />
        <Toggle
          pressed={settings.isPlaying}
          onPressedChange={settings.onPlayingChange}
          aria-label="Lecture automatique"
          className={PILL_BUTTON_CLASSES}
        >
          {settings.isPlaying ? <PauseIcon /> : <PlayIcon />}
        </Toggle>
        <CarouselNext variant="ghost" aria-label="Photo suivante" className={PILL_ARROW_CLASSES} />
      </div>
      <div className="justify-self-end">
        <StripToggle
          isStripVisible={settings.isStripVisible}
          onStripVisibleChange={settings.onStripVisibleChange}
        />
      </div>
    </ControlsBar>
  )
}
```

`static` overrides the generated `absolute`; the generated `-left-12` / `-right-12` then have no effect. The French `aria-label` replaces the generated English `sr-only` text as the accessible name.

- [ ] **Step 6: Give `PhotoView` a slot inside the carousel**

Replace the whole content of `client/src/components/frame/PhotoView.tsx`:

```tsx
import { type JSX, type ReactNode, useState } from 'react'
import { PhotoBackdrop } from '@/components/frame/PhotoBackdrop.tsx'
import { PhotoCaption } from '@/components/frame/PhotoCaption.tsx'
import { PhotoSlide } from '@/components/frame/PhotoSlide.tsx'
import { Carousel, type CarouselApi, CarouselContent } from '@/components/ui/carousel.tsx'
import { useCarouselArrowKeys } from '@/hooks/useCarouselArrowKeys.ts'
import { useCarouselPhoto } from '@/hooks/useCarouselPhoto.ts'
import { useLeavingPhoto } from '@/hooks/useLeavingPhoto.ts'
import { useSlideshow } from '@/hooks/useSlideshow.ts'
import type { Photo } from '@/photo.ts'

// Embla's default (25) is a quick flick; a frame on a wall should glide.
const GLIDING_SLIDE = { duration: 45 }

type PhotoViewProps = {
  photos: Photo[]
  currentId: string
  // null: no automatic advance.
  autoAdvanceMs: number | null
  onCurrentChange: (id: string) => void
  // Under the caption, inside the carousel: the ‹ › buttons need its context.
  children: ReactNode
}

export function PhotoView({
  photos,
  currentId,
  autoAdvanceMs,
  onCurrentChange,
  children,
}: PhotoViewProps): JSX.Element {
  const [api, setApi] = useState<CarouselApi>()
  useCarouselPhoto({ api, photos, currentId, onCurrentChange })
  useCarouselArrowKeys(api)
  useSlideshow(api, autoAdvanceMs)
  // The outgoing photo keeps its zoom while it slides out, instead of snapping back.
  const leavingId = useLeavingPhoto(api, currentId)
  const currentPhoto = photos.find(({ id }) => id === currentId)

  return (
    // clip, not hidden: the scaled backdrop overflows, and a hidden box can still be scrolled.
    <div className="relative isolate h-svh overflow-clip">
      {currentPhoto && <PhotoBackdrop key={currentPhoto.id} url={currentPhoto.thumbnailUrl} />}
      <Carousel setApi={setApi} opts={GLIDING_SLIDE}>
        <CarouselContent>
          {photos.map((photo) => (
            <PhotoSlide
              key={photo.id}
              photo={photo}
              isCurrent={photo.id === currentId}
              isZooming={photo.id === currentId || photo.id === leavingId}
            />
          ))}
        </CarouselContent>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 via-black/30 to-transparent">
          {currentPhoto && <PhotoCaption key={currentPhoto.id} photo={currentPhoto} />}
          {/* The bottom bar sits on top of this box: just above the strip when it is open. */}
          <div className="relative">{children}</div>
        </div>
      </Carousel>
    </div>
  )
}
```

The overlay is positioned against the `<Carousel>` root (`relative`, as tall as its `h-svh` slides), so it still sits at the bottom of the screen.

- [ ] **Step 7: Rewrite `SlideshowScreen` with the bars, delete the pill parts**

Replace the whole content of `client/src/components/frame/SlideshowScreen.tsx`:

```tsx
import type { JSX } from 'react'
import { NewPhotosBadge } from '@/components/frame/NewPhotosBadge.tsx'
import { PhotoStrip } from '@/components/frame/PhotoStrip.tsx'
import { PhotoView } from '@/components/frame/PhotoView.tsx'
import { SlideshowBottomBar } from '@/components/frame/SlideshowBottomBar.tsx'
import { SlideshowTopBar } from '@/components/frame/SlideshowTopBar.tsx'
import { useEscapeToClose } from '@/hooks/useEscapeToClose.ts'
import type { FrameSelection } from '@/hooks/useFrameSelection.ts'
import type { SlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
import type { Photo } from '@/photo.ts'

type SlideshowScreenProps = {
  photos: Photo[]
  currentPhoto: Photo
  selection: FrameSelection
  isActive: boolean
  settings: SlideshowSettings
}

export function SlideshowScreen({
  photos,
  currentPhoto,
  selection,
  isActive,
  settings,
}: SlideshowScreenProps): JSX.Element {
  useEscapeToClose(selection.closeSlideshow)

  return (
    <>
      <PhotoView
        photos={photos}
        currentId={currentPhoto.id}
        // The slideshow waits while someone is using the frame.
        autoAdvanceMs={settings.isPlaying && !isActive ? settings.intervalMs : null}
        onCurrentChange={selection.selectPhoto}
      >
        <SlideshowBottomBar isVisible={isActive} settings={settings} />
        {settings.isStripVisible && (
          <PhotoStrip
            photos={photos}
            currentId={currentPhoto.id}
            onSelect={selection.selectPhoto}
          />
        )}
      </PhotoView>
      <SlideshowTopBar
        isVisible={isActive}
        photo={currentPhoto}
        settings={settings}
        onClose={selection.closeSlideshow}
      />
      <NewPhotosBadge count={selection.newPhotoCount} onSelect={selection.showNewest} />
    </>
  )
}
```

The badge comes last: both are `fixed` without a z-index, so it paints over the top bar.

Run: `git rm client/src/components/frame/PhotoControls.tsx client/src/components/frame/SlideshowControls.tsx client/src/components/frame/ControlsDivider.tsx`

Run: `git grep -n -E "FrameControls|pillToggleClasses|PILL_TOGGLE_CLASSES|PhotoControls|SlideshowControls|ControlsDivider" -- client/src`
Expected: no output (exit code 1).

- [ ] **Step 8: Check, typecheck, build**

Run: `pnpm check`, then `pnpm typecheck`, then `pnpm build`
Expected: Biome `No fixes applied.`, `client typecheck: Done`, Vite `✓ built in …`.

- [ ] **Step 9: Commit**

```bash
git add client/src/components/frame/ControlsBar.tsx client/src/components/frame/controlClasses.ts client/src/components/frame/StripToggle.tsx client/src/components/frame/CloseButton.tsx client/src/components/frame/SlideshowMenu.tsx client/src/components/frame/SlideshowTopBar.tsx client/src/components/frame/SlideshowBottomBar.tsx client/src/components/frame/PhotoView.tsx client/src/components/frame/SlideshowScreen.tsx
git commit -F <scratchpad>/commit-slideshow-layout.txt
```

Message: `feat(client): place each slideshow control where it is expected`

- [ ] **Step 10: Manual check in Chrome (controller)**

On `http://localhost:5181/frame`, click "Lancer le diaporama":

1. Hands off for 4 s: no button at all; only the photo, its caption and the backdrop. The cursor hides.
2. Move: ✕ top left, ⋯ top right, the ‹ ⏸ › pill bottom centre, ▤ bottom right, all on dark glass and readable over a light photo. The caption stays where it is at rest; the bar floats over its lower edge, centre and right, without hiding the name or date.
3. On the newest photo, ‹ is disabled; › moves to the next photo, ‹ comes back.
4. ⏸: playback stops (icon turns to ▶); hands off 15 s: same photo. ▶ again: it advances after 10 s idle.
5. ⋯ → "Vitesse": 5 s / 10 s / 20 s, 10 s checked. Pick 5 s; hands off: the photo changes about every 5 s. Reopen: 5 s checked. ✕, then "Lancer le diaporama": still 5 s.
6. ⋯ → "Supprimer": the dialog opens; "Annuler": focus returns to ⋯. Again with "Supprimer": the photo disappears.
7. ▤: the strip opens under the bottom bar; a thumbnail click shows that photo. The bar moves up with it, above the strip.
8. ⋯ open (and again with "Vitesse" open), Escape: only the menu closes, the slideshow stays. Escape again: the library.
9. Tab from the page: ✕, ⋯, ‹, ⏸, ›, ▤ in a sensible order with a visible focus ring; once hidden (4 s idle), Tab does not reach them (inert).
10. Send a photo while moving: the badge shows top centre, above the top bar, and works.
11. Reduced motion emulated: the bars appear and vanish without sliding.

- [ ] **Step 11: Submit and write the PR body**

Run: `gh stack submit --auto`, then `gh pr edit <N> --body-file <file>`. French body:

- **Pourquoi**: la pilule alignait des actions sans rapport ; chaque action va là où on l'attend.
- **Ce qui change**: ✕ en haut à gauche, ⋯ en haut à droite (« Vitesse » 5 / 10 / 20 s, « Supprimer »), ‹ ⏸ › en bas au centre, ▤ en bas à droite ; rien à l'écran quand personne ne bouge.
- **Guidage review**: la barre du bas est rendue dans le `<Carousel>` (enfants de `PhotoView`) car `CarouselPrevious` / `CarouselNext` lisent son contexte ; `SlideshowMenu` réutilise `PhotoActionsMenu` (nouvelle prop `children`) ; `FrameControls` devient `ControlsBar`.
- **Vérifier**: la liste de l'étape 10.

---

### Task 4: Library as a list (PR `feat/frame-library-list`)

**Files:**

- Create: `client/src/hooks/useLibraryLayout.ts`
- Create: `client/src/components/frame/LayoutToggle.tsx`, `PhotoList.tsx`, `PhotoListRow.tsx`
- Modify: `client/src/components/frame/LibraryHeader.tsx`, `LibraryScreen.tsx` (full rewrites)
- Modify: `ARCHITECTURE.md` (Pages table)

**Interfaces:**

- Consumes:
  - `PhotoGrid({ photos, currentId, onSelect })` and `LibraryScreen` props from Task 2.
  - `PhotoActionsMenu({ photo, label, className })` from Task 3 (no children here).
  - `ToggleGroup`, `ToggleGroupItem` from `@/components/ui/toggle-group.tsx`.
- Produces:
  - `type LibraryLayout = 'grid' | 'list'`, `isLibraryLayout(value: unknown): value is LibraryLayout`, `useLibraryLayout(): [LibraryLayout, (layout: LibraryLayout) => void]`.
  - `LayoutToggle({ layout: LibraryLayout, onLayoutChange: (layout: LibraryLayout) => void })`.
  - `PhotoList({ photos: Photo[], currentId: string, onSelect: (id: string) => void })`, `PhotoListRow({ photo: Photo, isCurrent: boolean, onSelect: (id: string) => void })`.
  - `LibraryHeader({ photoCount, layout, onLayoutChange, onStartSlideshow })`.
  - `LibraryScreen`: same four props as Task 2.

- [ ] **Step 1: Create the stack layer**

Run: `gh stack add feat/frame-library-list`
Expected: `✓ Created and checked out branch "feat/frame-library-list"`

- [ ] **Step 2: Remember the layout per device**

Create `client/src/hooks/useLibraryLayout.ts`:

```ts
import { useState } from 'react'

export type LibraryLayout = 'grid' | 'list'

const STORAGE_KEY = 'familyframe.libraryLayout'
const DEFAULT_LAYOUT: LibraryLayout = 'grid'

export function isLibraryLayout(value: unknown): value is LibraryLayout {
  return value === 'grid' || value === 'list'
}

// localStorage throws when the browser blocks site data: the default still works.
function readStoredLayout(): LibraryLayout {
  try {
    const storedLayout = localStorage.getItem(STORAGE_KEY)
    return isLibraryLayout(storedLayout) ? storedLayout : DEFAULT_LAYOUT
  } catch {
    return DEFAULT_LAYOUT
  }
}

function storeLayout(layout: LibraryLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, layout)
  } catch {
    // Not remembered on this device: the choice still holds until the page reloads.
  }
}

export function useLibraryLayout(): [LibraryLayout, (layout: LibraryLayout) => void] {
  // A function, not its result: storage is read on the first render only.
  const [layout, setLayout] = useState(readStoredLayout)

  function changeLayout(nextLayout: LibraryLayout): void {
    setLayout(nextLayout)
    storeLayout(nextLayout)
  }

  return [layout, changeLayout]
}
```

- [ ] **Step 3: Write the ▦ | ☰ toggle**

Create `client/src/components/frame/LayoutToggle.tsx`:

```tsx
import { LayoutGridIcon, ListIcon } from 'lucide-react'
import type { JSX } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'
import { isLibraryLayout, type LibraryLayout } from '@/hooks/useLibraryLayout.ts'

type LayoutToggleProps = {
  layout: LibraryLayout
  onLayoutChange: (layout: LibraryLayout) => void
}

export function LayoutToggle({ layout, onLayoutChange }: LayoutToggleProps): JSX.Element {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="lg"
      spacing={0}
      value={layout}
      // Radix sends '' when the pressed item is clicked again: keep the current layout.
      onValueChange={(value) => {
        if (isLibraryLayout(value)) onLayoutChange(value)
      }}
      aria-label="Affichage des photos"
    >
      <ToggleGroupItem value="grid" aria-label="Miniatures" title="Miniatures">
        <LayoutGridIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="list" aria-label="Liste" title="Liste">
        <ListIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
```

- [ ] **Step 4: Write the list and its row**

Create `client/src/components/frame/PhotoListRow.tsx`:

```tsx
import type { JSX } from 'react'
import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
import type { Photo } from '@/photo.ts'

// In a list, photos of the same day are told apart by their time.
const ROW_DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

type PhotoListRowProps = {
  photo: Photo
  isCurrent: boolean
  onSelect: (id: string) => void
}

export function PhotoListRow({ photo, isCurrent, onSelect }: PhotoListRowProps): JSX.Element {
  return (
    // The ellipsis is a sibling of the row button: a button cannot hold a button.
    <li className="relative">
      <button
        type="button"
        onClick={() => onSelect(photo.id)}
        aria-current={isCurrent}
        className="flex w-full items-center gap-4 rounded-xl p-2 pr-14 text-left outline-none hover:bg-white/5 focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
      >
        <img
          className="size-14 shrink-0 rounded-lg object-cover"
          src={photo.thumbnailUrl}
          // The name is written right beside it: an alt would read it twice.
          alt=""
          loading="lazy"
          decoding="async"
        />
        <span className="min-w-0 flex-1 truncate text-lg font-medium">{photo.uploaderName}</span>
        <time dateTime={photo.createdAt} className="text-muted-foreground tabular-nums">
          {ROW_DATE_FORMAT.format(new Date(photo.createdAt))}
        </time>
      </button>
      <PhotoActionsMenu
        photo={photo}
        label={`Actions sur la photo envoyée par ${photo.uploaderName}`}
        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full text-white/80"
      />
    </li>
  )
}
```

`ROW_DATE_FORMAT` gives `23 nov. 2026, 14:32` (checked with Node's ICU).

Create `client/src/components/frame/PhotoList.tsx`:

```tsx
import type { JSX } from 'react'
import { PhotoListRow } from '@/components/frame/PhotoListRow.tsx'
import type { Photo } from '@/photo.ts'

type PhotoListProps = {
  photos: Photo[]
  currentId: string
  onSelect: (id: string) => void
}

export function PhotoList({ photos, currentId, onSelect }: PhotoListProps): JSX.Element {
  return (
    // pt-24 keeps the first row clear of the fixed library header.
    <ul className="mx-auto flex max-w-3xl flex-col gap-1 p-8 pt-24">
      {photos.map((photo) => (
        <PhotoListRow
          key={photo.id}
          photo={photo}
          isCurrent={photo.id === currentId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}
```

- [ ] **Step 5: Wire the toggle into the header and the screen**

Replace the whole content of `client/src/components/frame/LibraryHeader.tsx`:

```tsx
import { PlayIcon } from 'lucide-react'
import type { JSX } from 'react'
import { LayoutToggle } from '@/components/frame/LayoutToggle.tsx'
import { Button } from '@/components/ui/button.tsx'
import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'

type LibraryHeaderProps = {
  photoCount: number
  layout: LibraryLayout
  onLayoutChange: (layout: LibraryLayout) => void
  onStartSlideshow: () => void
}

export function LibraryHeader({
  photoCount,
  layout,
  onLayoutChange,
  onStartSlideshow,
}: LibraryHeaderProps): JSX.Element {
  return (
    // z-10: the tiles come later in the page and are positioned, they would scroll over it.
    <header className="fixed inset-x-0 top-0 z-10 flex items-center gap-4 border-b border-white/10 bg-frame-background/80 px-8 py-4 backdrop-blur-xl">
      <h1 className="text-2xl font-medium tracking-tight">
        Photos <span className="text-muted-foreground tabular-nums">· {photoCount}</span>
      </h1>
      <Button
        size="lg"
        onClick={onStartSlideshow}
        className="ml-auto rounded-full bg-frame-accent px-4 text-black hover:bg-frame-accent/85"
      >
        <PlayIcon data-icon="inline-start" />
        Lancer le diaporama
      </Button>
      <LayoutToggle layout={layout} onLayoutChange={onLayoutChange} />
    </header>
  )
}
```

Replace the whole content of `client/src/components/frame/LibraryScreen.tsx`:

```tsx
import type { JSX } from 'react'
import { LibraryHeader } from '@/components/frame/LibraryHeader.tsx'
import { PhotoGrid } from '@/components/frame/PhotoGrid.tsx'
import { PhotoList } from '@/components/frame/PhotoList.tsx'
import { useLibraryLayout } from '@/hooks/useLibraryLayout.ts'
import type { Photo } from '@/photo.ts'

type LibraryScreenProps = {
  photos: Photo[]
  currentId: string
  onOpenPhoto: (id: string) => void
  onStartSlideshow: () => void
}

export function LibraryScreen({
  photos,
  currentId,
  onOpenPhoto,
  onStartSlideshow,
}: LibraryScreenProps): JSX.Element {
  const [layout, setLayout] = useLibraryLayout()

  return (
    <>
      <LibraryHeader
        photoCount={photos.length}
        layout={layout}
        onLayoutChange={setLayout}
        onStartSlideshow={onStartSlideshow}
      />
      {layout === 'grid' ? (
        <PhotoGrid photos={photos} currentId={currentId} onSelect={onOpenPhoto} />
      ) : (
        <PhotoList photos={photos} currentId={currentId} onSelect={onOpenPhoto} />
      )}
    </>
  )
}
```

- [ ] **Step 6: Update the Pages table in `ARCHITECTURE.md`**

Replace the table under `## Pages` (as left by Task 2) with

```markdown
| Chemin   | Page                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`      | envoi : pseudo (mémorisé dans `localStorage`), « Prendre une photo » ou « Choisir une image »                                                                                               |
| `/frame` | cadre : bibliothèque des photos en vignettes ou en liste (choix mémorisé par appareil), chacune avec « Supprimer » ; « Lancer le diaporama » ou une minute sans activité lance le diaporama |
```

- [ ] **Step 7: Check, typecheck, build**

Run: `pnpm check`, then `pnpm typecheck`, then `pnpm build`
Expected: Biome `No fixes applied.`, `client typecheck: Done`, Vite `✓ built in …`.

- [ ] **Step 8: Commit**

```bash
git add client/src/hooks/useLibraryLayout.ts client/src/components/frame/LayoutToggle.tsx client/src/components/frame/PhotoList.tsx client/src/components/frame/PhotoListRow.tsx client/src/components/frame/LibraryHeader.tsx client/src/components/frame/LibraryScreen.tsx ARCHITECTURE.md
git commit -F <scratchpad>/commit-library-list.txt
```

Message: `feat(client): show the library as a list, remembered per device`

- [ ] **Step 9: Manual check in Chrome (controller)**

On `http://localhost:5181/frame`:

1. The header reads "Photos · N", then "Lancer le diaporama", then the ▦ | ☰ toggle with ▦ pressed. Hovering shows "Miniatures" / "Liste".
2. Click ☰: one row per photo, newest first: 56 px thumbnail, name, date and time like "23 nov. 2026, 14:32", ⋯ at the end. The last photo viewed has the amber ring.
3. Click ☰ again: still the list (no empty layout).
4. Click a row: the slideshow on that photo, paused. ✕: back to the list, ring on that row.
5. Click a row's ⋯: the menu opens and the photo does not; "Supprimer" → confirm: the row disappears.
6. Reload: still the list. DevTools → Application → Local Storage: `familyframe.libraryLayout` = `list`. Set it to `bogus` and reload: the grid.
7. Send a photo (`curl` above) while on the list: it appears as the first row, no badge.
8. Tab: the row button then its ⋯, for each row; focus ring visible. DevTools Accessibility: the toggle items are named "Miniatures" / "Liste" with their pressed state.
9. Hands off for 60 s on the list: the slideshow starts on the newest photo.

- [ ] **Step 10: Submit and write the PR body**

Run: `gh stack submit --auto`, then `gh pr edit <N> --body-file <file>`. French body:

- **Pourquoi**: retrouver une photo par son auteur ou sa date se fait mieux dans une liste, comme dans Google Drive.
- **Ce qui change**: bascule ▦ | ☰ dans l'en-tête de la bibliothèque, vue liste (vignette, nom, date et heure, ⋯), choix mémorisé par appareil.
- **Guidage review**: `useLibraryLayout` valide la valeur stockée et entoure `localStorage` de `try/catch` ; le ⋯ d'une ligne est frère du bouton, jamais dedans.
- **Vérifier**: la liste de l'étape 9.

---

## Drift Log

Format: `date · task/step · what the plan said · what was done · why`.

- 2026-11-23 · Task 2/Step 1 · create the layer with `gh stack add feat/frame-library-mode` · not run by the Task 2 implementer: the branch already existed and was checked out by the controller · layer already created, step left unchecked for the controller to confirm.
- 2026-11-23 · Task 2 review · `useFrameSelection(photos, isActive)`: an unattended arrival replaced a paused photo (directly, or through the idle jump 4 s after the badge) · `useFrameSelection(photos, isActive || !settings.isPlaying)`, Task 2 block amended · spec says a paused slideshow "stays paused on its photo"; author chose "stay on the photo" (badge raised) over "jump to the new one"
