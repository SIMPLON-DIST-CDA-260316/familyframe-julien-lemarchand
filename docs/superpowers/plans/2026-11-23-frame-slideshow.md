---
plan: frame-slideshow
status: draft
spec: docs/superpowers/specs/2026-11-23-frame-slideshow-design.md
branch: docs/frame-slideshow-design (PR 1), feat/frame-controls-animation (PR 2), feat/frame-slideshow (PR 3)
worktree: true
tasks_total: 3
tasks_done: 0
current_task: Task 1
last_commit: —
last_updated: 2026-11-23
---

# Frame Slideshow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Working agreement (mandatory):** keep this plan in sync with reality. Check a step only when it is finished and its gate is green. Append every divergence to the Drift Log. Update the frontmatter (`tasks_done`, `current_task`, `last_commit`, `last_updated`) at each task boundary. When a drift produces a durable correction (path, command, signature, decision), amend the affected task block in place and log the amendment. Never check a partial step; never delete a finished step or a drift entry.

**Goal:** Animate the show and hide of the `/frame` controls, and add a play/pause slideshow that advances every 5, 10 or 20 s while nobody is using the frame.

**Architecture:** `FrameControls` becomes an always-mounted, animated container (`isVisible` + `children`); the existing toggles move to `ViewToggles`, the new ones live in `SlideshowControls`. A `useSlideshow(api, intervalMs | null)` hook advances the Embla carousel inside `PhotoView`; `FramePage` holds `isPlaying` and `intervalMs` and passes `null` while paused or while someone is using the frame.

**Tech Stack:** React 19, Vite 8, TypeScript 7, Tailwind CSS v4, shadcn/ui (`Toggle`, `ToggleGroup`), Embla Carousel, lucide-react, Biome.

## Global Constraints

- No new dependency.
- Client code imports with the `@/` alias and the `.ts`/`.tsx` extension (`@/hooks/useSlideshow.ts`).
- Generated shadcn files in `client/src/components/ui/` stay as generated.
- TypeScript rules (AGENTS.md): no `as` casts (including `as const`), explicit return types on exported functions, literal unions rather than `enum`.
- Code rules (`.claude/rules/`): comment why, never what; no file-summary comments; booleans prefixed `is`/`has`/`should`; callback params named after the item; no magic numbers; one responsibility per file; max 30 lines per function, 5 params (props count as params).
- Author decision (2026-11-23, carried over from the frame views plan): handler functions nested in a component count as their own functions; `FramePage` exceeding 30 lines with them is tolerated.
- UI text in French, code and docs in English.
- Controls animation: 300 ms, opacity + small translate, hidden controls stay mounted with `inert`.
- Slideshow intervals: 5 s / 10 s / 20 s, default 10 s, not memorised. Playing on load.
- No API change: Bruno collection untouched.
- Every commit passes `pnpm check` and `pnpm typecheck`; every task ends with `pnpm build` green and the manual check of its task in Chrome.
- Commit messages: Conventional Commits in English, written to a file in the scratchpad and passed with `git commit -F <file>`. End each message with the session's attribution lines.
- Git commands run from the worktree root, one plain command per call: the worktree guard refuses chained or `-C` git commands.

## Git strategy

Continues the frame views stack managed with `gh stack` (read the `gh-stack` skill before the first `gh stack` command). New layers on top of `feat/frame-new-photos`:

| Layer | Branch                          | Task |
| ----- | ------------------------------- | ---- |
| 6     | `docs/frame-slideshow-design`   | 1    |
| 7     | `feat/frame-controls-animation` | 2    |
| 8     | `feat/frame-slideshow`          | 3    |

Each task starts with `gh stack add <branch>` (except Task 1, already on its branch) and ends with `gh stack submit --auto`. PR bodies in French, set with `gh pr edit <N> --body-file <file>`.

## Dev environment

- The controller runs the worktree client on port 5181 (`pnpm --filter client exec vite --port 5181 --strictPort`), against the API on 3000 started from the main checkout. Implementers do not start or stop dev servers.
- Simulate a photo sent by a relative:

  ```bash
  curl -s -F uploaderName=Test -F photo=@server/bruno/fixtures/photo.jpg http://localhost:3000/api/photos
  ```

## File Map

| File                                              | Task | Responsibility                                                     |
| ------------------------------------------------- | ---- | ------------------------------------------------------------------ |
| `client/src/components/frame/FrameControls.tsx`   | 2    | Animated container: shown or hidden, always mounted.              |
| `client/src/components/frame/ViewToggles.tsx`     | 2    | Photo/Pellicule toggle and strip toggle; exports `FrameView`.     |
| `client/src/hooks/useFrameSelection.ts`           | 2    | Import of `FrameView` moves to `ViewToggles.tsx`.                 |
| `client/src/hooks/useSlideshow.ts`                | 3    | Advance the carousel every interval; intervals and default.       |
| `client/src/components/frame/SlideshowControls.tsx` | 3  | Play/pause toggle and 5/10/20 s choice.                           |
| `client/src/components/frame/PhotoView.tsx`       | 3    | Takes `autoAdvanceMs`, calls `useSlideshow`.                      |
| `client/src/pages/FramePage.tsx`                  | 2-3  | Composition, `isPlaying` and `intervalMs` state.                  |

## Spec deviations (decided while planning)

- **`PhotoView` takes one `autoAdvanceMs: number | null`, not `isPlaying` and `intervalMs`.** With two props `PhotoView` would reach 6 props (rule: max 5). `FramePage` computes `isPlaying && !isActive ? intervalMs : null`, which the spec already describes.
- **`FrameControls` becomes a container (`isVisible`, `children`); its toggles move to a new `ViewToggles.tsx`.** Adding `isVisible` and four slideshow props to `FrameControls` would give it 9 props. `FrameView` and `isFrameView` move with the toggles.

---

### Task 1: Spec and plan

**Files:**
- Create: `docs/superpowers/specs/2026-11-23-frame-slideshow-design.md` (already committed on this branch)
- Create: `docs/superpowers/plans/2026-11-23-frame-slideshow.md`

- [ ] **Step 1: Check formatting**

Run: `pnpm check`
Expected: `Checked N files … No fixes applied.` If the plan's tables fail, run `pnpm exec biome format --write docs/superpowers/plans/2026-11-23-frame-slideshow.md`.

- [ ] **Step 2: Commit the plan**

```bash
git add docs/superpowers/plans/2026-11-23-frame-slideshow.md
git commit -F <scratchpad>/commit-slideshow-plan.txt
```

Message: `docs: plan the frame slideshow and animated controls`

- [ ] **Step 3: Submit and write the PR body**

Run: `gh stack submit --auto`, then `gh pr edit <N> --body-file <file>` with a French body (Pourquoi / Ce qui change / Vérifier) that links the spec and the plan.

---

### Task 2: Animated controls

**Files:**
- Create: `client/src/components/frame/ViewToggles.tsx`
- Modify: `client/src/components/frame/FrameControls.tsx` (full rewrite)
- Modify: `client/src/hooks/useFrameSelection.ts:2` (import)
- Modify: `client/src/pages/FramePage.tsx`

**Interfaces:**
- Consumes: `FrameSelection` from `useFrameSelection` (`view`, `setView`), `isActive` from `useIdleControls`.
- Produces:
  - `FrameControls({ isVisible: boolean, children: ReactNode }): JSX.Element`
  - `ViewToggles({ view: FrameView, isStripVisible: boolean, onViewChange: (view: FrameView) => void, onStripVisibleChange: (isVisible: boolean) => void }): JSX.Element`
  - `export type FrameView = 'photo' | 'contact-sheet'` from `@/components/frame/ViewToggles.tsx`

- [ ] **Step 1: Create the stack layer**

Run: `gh stack add feat/frame-controls-animation`
Expected: `✓ Created and checked out branch "feat/frame-controls-animation"`

- [ ] **Step 2: Move the toggles to `ViewToggles.tsx`**

Create `client/src/components/frame/ViewToggles.tsx`:

```tsx
import { GalleryHorizontalIcon, ImageIcon, LayoutGridIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Toggle } from '@/components/ui/toggle.tsx'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'

export type FrameView = 'photo' | 'contact-sheet'

function isFrameView(value: string): value is FrameView {
  return value === 'photo' || value === 'contact-sheet'
}

type ViewTogglesProps = {
  view: FrameView
  isStripVisible: boolean
  onViewChange: (view: FrameView) => void
  onStripVisibleChange: (isVisible: boolean) => void
}

export function ViewToggles({
  view,
  isStripVisible,
  onViewChange,
  onStripVisibleChange,
}: ViewTogglesProps): JSX.Element {
  return (
    <>
      <ToggleGroup
        type="single"
        variant="outline"
        value={view}
        // Radix sends '' when the pressed item is clicked again: keep the current view.
        onValueChange={(value) => {
          if (isFrameView(value)) onViewChange(value)
        }}
        aria-label="Affichage"
      >
        <ToggleGroupItem value="photo">
          <ImageIcon /> Photo
        </ToggleGroupItem>
        <ToggleGroupItem value="contact-sheet">
          <LayoutGridIcon /> Pellicule
        </ToggleGroupItem>
      </ToggleGroup>
      {view === 'photo' && (
        <Toggle
          variant="outline"
          pressed={isStripVisible}
          onPressedChange={onStripVisibleChange}
          aria-label="Bandeau de vignettes"
        >
          <GalleryHorizontalIcon />
        </Toggle>
      )}
    </>
  )
}
```

- [ ] **Step 3: Rewrite `FrameControls.tsx` as the animated container**

Replace the whole content of `client/src/components/frame/FrameControls.tsx`:

```tsx
import type { JSX, ReactNode } from 'react'
import { cn } from '@/lib/utils.ts'

type FrameControlsProps = {
  isVisible: boolean
  children: ReactNode
}

export function FrameControls({ isVisible, children }: FrameControlsProps): JSX.Element {
  return (
    <div
      // Kept mounted so the hide can animate; inert keeps hidden buttons out of focus and clicks.
      inert={!isVisible}
      className={cn(
        'fixed top-4 right-4 flex items-center gap-2 rounded-lg bg-background/80 p-1 backdrop-blur',
        'transition-[opacity,translate] duration-300 ease-out motion-reduce:transition-none',
        isVisible ? 'opacity-100' : 'pointer-events-none -translate-y-2 opacity-0',
      )}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Point `useFrameSelection` at the new home of `FrameView`**

In `client/src/hooks/useFrameSelection.ts`, replace line 2:

```ts
import type { FrameView } from '@/components/frame/ViewToggles.tsx'
```

- [ ] **Step 5: Render the controls always, visible while active**

In `client/src/pages/FramePage.tsx`:

Add the import (keep imports sorted, Biome checks it):

```tsx
import { ViewToggles } from '@/components/frame/ViewToggles.tsx'
```

Replace the block

```tsx
      {isActive && (
        <FrameControls
          view={selection.view}
          isStripVisible={isStripVisible}
          onViewChange={selection.setView}
          onStripVisibleChange={setIsStripVisible}
        />
      )}
```

with

```tsx
      <FrameControls isVisible={isActive}>
        <ViewToggles
          view={selection.view}
          isStripVisible={isStripVisible}
          onViewChange={selection.setView}
          onStripVisibleChange={setIsStripVisible}
        />
      </FrameControls>
```

- [ ] **Step 6: Check, typecheck, build**

Run: `pnpm check`, then `pnpm typecheck`, then `pnpm build`
Expected: Biome `No fixes applied.`, `client typecheck: Done`, Vite `✓ built in …`.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/frame/ViewToggles.tsx client/src/components/frame/FrameControls.tsx client/src/hooks/useFrameSelection.ts client/src/pages/FramePage.tsx
git commit -F <scratchpad>/commit-controls-animation.txt
```

Message: `feat(client): fade the frame controls in and out`

- [ ] **Step 8: Manual check in Chrome (controller)**

On `http://localhost:5181/frame`:
1. Move the mouse: the controls fade and slide in.
2. Wait 4 s: they fade and slide out.
3. While hidden, press Tab: no control gets focus (inert).
4. Photo/Pellicule and the strip toggle still work.

- [ ] **Step 9: Submit and write the PR body**

Run: `gh stack submit --auto`, then `gh pr edit <N> --body-file <file>` (French: Pourquoi / Ce qui change / Guidage review → `inert` and the always-mounted container / Vérifier).

---

### Task 3: Slideshow

**Files:**
- Create: `client/src/hooks/useSlideshow.ts`
- Create: `client/src/components/frame/SlideshowControls.tsx`
- Modify: `client/src/components/frame/PhotoView.tsx`
- Modify: `client/src/pages/FramePage.tsx`

**Interfaces:**
- Consumes:
  - `FrameControls({ isVisible, children })` and `ViewToggles` from Task 2.
  - `CarouselApi` from `@/components/ui/carousel.tsx` (`canScrollNext()`, `scrollNext()`, `scrollTo(index)`).
  - `PhotoView` props today: `photos`, `currentId`, `isStripVisible`, `onCurrentChange`.
- Produces:
  - `useSlideshow(api: CarouselApi, intervalMs: number | null): void`
  - `SLIDESHOW_INTERVALS_MS: number[]` (`[5_000, 10_000, 20_000]`) and `DEFAULT_SLIDESHOW_INTERVAL_MS = 10_000` from `@/hooks/useSlideshow.ts`
  - `SlideshowControls({ isPlaying: boolean, intervalMs: number, onPlayingChange: (isPlaying: boolean) => void, onIntervalChange: (intervalMs: number) => void }): JSX.Element`
  - `PhotoView` gains `autoAdvanceMs: number | null`

- [ ] **Step 1: Create the stack layer**

Run: `gh stack add feat/frame-slideshow`
Expected: `✓ Created and checked out branch "feat/frame-slideshow"`

- [ ] **Step 2: Write `useSlideshow`**

Create `client/src/hooks/useSlideshow.ts`:

```ts
import { useEffect } from 'react'
import type { CarouselApi } from '@/components/ui/carousel.tsx'

export const SLIDESHOW_INTERVALS_MS = [5_000, 10_000, 20_000]
export const DEFAULT_SLIDESHOW_INTERVAL_MS = 10_000

// intervalMs null: paused, or someone is using the frame.
export function useSlideshow(api: CarouselApi, intervalMs: number | null): void {
  useEffect(() => {
    if (!api || intervalMs === null) return
    const carousel = api
    const timer = setInterval(() => {
      // Past the oldest photo, start again from the newest.
      if (carousel.canScrollNext()) carousel.scrollNext()
      else carousel.scrollTo(0)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [api, intervalMs])
}
```

`const carousel = api` keeps the narrowed type inside the timer callback (TS18048 otherwise, as in `useCarouselArrowKeys`).

- [ ] **Step 3: Write `SlideshowControls`**

Create `client/src/components/frame/SlideshowControls.tsx`:

```tsx
import { PauseIcon, PlayIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Toggle } from '@/components/ui/toggle.tsx'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'
import { SLIDESHOW_INTERVALS_MS } from '@/hooks/useSlideshow.ts'

const MS_PER_SECOND = 1000

type SlideshowControlsProps = {
  isPlaying: boolean
  intervalMs: number
  onPlayingChange: (isPlaying: boolean) => void
  onIntervalChange: (intervalMs: number) => void
}

export function SlideshowControls({
  isPlaying,
  intervalMs,
  onPlayingChange,
  onIntervalChange,
}: SlideshowControlsProps): JSX.Element {
  return (
    <>
      <Toggle
        variant="outline"
        pressed={isPlaying}
        onPressedChange={onPlayingChange}
        aria-label="Diaporama"
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </Toggle>
      <ToggleGroup
        type="single"
        variant="outline"
        value={String(intervalMs)}
        // Radix sends '' when the pressed item is clicked again: keep the current pace.
        onValueChange={(value) => {
          const selectedMs = Number(value)
          if (SLIDESHOW_INTERVALS_MS.includes(selectedMs)) onIntervalChange(selectedMs)
        }}
        aria-label="Durée par photo"
      >
        {SLIDESHOW_INTERVALS_MS.map((interval) => (
          <ToggleGroupItem key={interval} value={String(interval)}>
            {interval / MS_PER_SECOND} s
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </>
  )
}
```

- [ ] **Step 4: Let `PhotoView` run the slideshow**

In `client/src/components/frame/PhotoView.tsx`:

Add the import:

```tsx
import { useSlideshow } from '@/hooks/useSlideshow.ts'
```

Add the prop to the type and the destructuring:

```tsx
type PhotoViewProps = {
  photos: Photo[]
  currentId: string
  isStripVisible: boolean
  // null: no automatic advance.
  autoAdvanceMs: number | null
  onCurrentChange: (id: string) => void
}
```

```tsx
export function PhotoView({
  photos,
  currentId,
  isStripVisible,
  autoAdvanceMs,
  onCurrentChange,
}: PhotoViewProps): JSX.Element {
  const [api, setApi] = useState<CarouselApi>()
  useCarouselPhoto({ api, photos, currentId, onCurrentChange })
  useCarouselArrowKeys(api)
  useSlideshow(api, autoAdvanceMs)
```

The JSX is unchanged.

- [ ] **Step 5: Hold the slideshow state in `FramePage`**

In `client/src/pages/FramePage.tsx`:

Add the imports:

```tsx
import { SlideshowControls } from '@/components/frame/SlideshowControls.tsx'
import { DEFAULT_SLIDESHOW_INTERVAL_MS } from '@/hooks/useSlideshow.ts'
```

After `const [isStripVisible, setIsStripVisible] = useState(false)`, add:

```tsx
  const [isPlaying, setIsPlaying] = useState(true)
  const [intervalMs, setIntervalMs] = useState(DEFAULT_SLIDESHOW_INTERVAL_MS)
```

Pass the advance to `PhotoView`:

```tsx
        <PhotoView
          photos={photos}
          currentId={selection.currentId}
          isStripVisible={isStripVisible}
          // The slideshow waits while someone is using the frame.
          autoAdvanceMs={isPlaying && !isActive ? intervalMs : null}
          onCurrentChange={selection.selectPhoto}
        />
```

Add the slideshow controls inside `FrameControls`, after `ViewToggles`:

```tsx
        {selection.view === 'photo' && (
          <SlideshowControls
            isPlaying={isPlaying}
            intervalMs={intervalMs}
            onPlayingChange={setIsPlaying}
            onIntervalChange={setIntervalMs}
          />
        )}
```

- [ ] **Step 6: Check, typecheck, build**

Run: `pnpm check`, then `pnpm typecheck`, then `pnpm build`
Expected: Biome `No fixes applied.`, `client typecheck: Done`, Vite `✓ built in …`.

- [ ] **Step 7: Commit**

```bash
git add client/src/hooks/useSlideshow.ts client/src/components/frame/SlideshowControls.tsx client/src/components/frame/PhotoView.tsx client/src/pages/FramePage.tsx
git commit -F <scratchpad>/commit-slideshow.txt
```

Message: `feat(client): play the frame as a slideshow`

- [ ] **Step 8: Manual check in Chrome (controller)**

On `http://localhost:5181/frame`, without touching the page:
1. The photo changes every 10 s, newest to oldest; after the oldest, back to the newest.
2. Keep the frame active (mouse moves): the photo holds. Once idle, the next change comes a full interval later.
3. Pause: nothing moves after 10 s idle. Play: it resumes.
4. 5 s and 20 s change the pace.
5. Pellicule: nothing moves. Back to Photo: the slideshow resumes.
6. Send a photo while idle and playing: the frame jumps to it, and the slideshow continues from there.

- [ ] **Step 9: Submit and write the PR body**

Run: `gh stack submit --auto`, then `gh pr edit <N> --body-file <file>` (French: Pourquoi / Ce qui change / Guidage review → `useSlideshow` and the `autoAdvanceMs` null rule / Vérifier).

---

## Drift Log

Format: `date · task/step · what the plan said · what was done · why`.
