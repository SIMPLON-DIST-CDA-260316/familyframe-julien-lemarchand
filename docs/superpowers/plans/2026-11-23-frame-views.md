---
plan: frame-views
status: draft
spec: docs/superpowers/specs/2026-11-23-frame-views-design.md
branch: docs/frame-views-design (PR 1), build/frame-ui-components (PR 2), refactor/photo-feed-hook (PR 3), feat/frame-view-switch (PR 4), feat/frame-new-photos (PR 5)
worktree: true
tasks_total: 5
tasks_done: 0
current_task: Task 1
last_commit: —
last_updated: 2026-11-23
---

# Frame Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Working agreement (mandatory):** keep this plan in sync with reality. Check a step only when it is finished and its gate is green. Append every divergence to the Drift Log. Update the frontmatter (`tasks_done`, `current_task`, `last_commit`, `last_updated`) at each task boundary. When a drift produces a durable correction (path, command, signature, decision), amend the affected task block in place and log the amendment. Never check a partial step; never delete a finished step or a drift entry.

**Goal:** Turn `/frame` into a photo frame that switches between a full-screen single photo (swipe, arrows, optional thumbnail strip) and a contact sheet, and that jumps to a new photo only when nobody is interacting.

**Architecture:** `FramePage` composes two data hooks (`usePhotoFeed`, `useIdleControls`), a selection hook (`useFrameSelection`, Task 5) and four presentational components under `components/frame/`. The current photo is tracked by `id`, with `null` meaning "follow the newest". The single photo view is the official shadcn `Carousel` (Embla); two small hooks keep Embla and the current `id` in step.

**Tech Stack:** React 19, Vite 8, TypeScript 7, Tailwind CSS v4, shadcn/ui (Radix base, `nova` preset), Embla Carousel, Socket.IO client, Biome.

## Global Constraints

- Only new dependency: `embla-carousel-react` (approved by the author), added by `shadcn add carousel`.
- Client code imports with the `@/` alias and the `.ts`/`.tsx` extension (`@/hooks/usePhotoFeed.ts`).
- Generated shadcn files in `client/src/components/ui/` stay as generated, only formatted by Biome.
- TypeScript rules (AGENTS.md): no `as` casts (including `as const`), explicit return types on exported functions, literal unions rather than `enum`.
- Code rules (`.claude/rules/`): comment why, never what; no file-summary comments; booleans prefixed `is`/`has`/`should`; callback params named after the item; no magic numbers; one responsibility per file; max 30 lines per function, 5 params.
- Author decision (2026-11-23): handler functions nested in a hook or component count as their own functions. `FramePage` in Task 4 (transitional) and `useFrameSelection` in Task 5 exceed 30 lines with them included: tolerated.
- UI text in French, code and docs in English.
- No API change: Bruno collection untouched.
- Every commit passes `pnpm check` and `pnpm typecheck`; every task ends with `pnpm build` green and the manual check of its task in Chrome.
- Commit messages: Conventional Commits in English, written to a file in the scratchpad and passed with `git commit -F <file>`. End each message with the session's attribution lines.
- Git commands run from the worktree root, one plain command per call: the worktree guard refuses chained or `-C` git commands.

## Git strategy

One stack of draft PRs managed with `gh stack` (the repository uses GitHub stacked PRs: `gh pr edit --base` is refused on a stacked PR). Read the `gh-stack` skill before the first `gh stack` command. Layers, bottom to top:

| Layer | Branch                       | Task |
| ----- | ---------------------------- | ---- |
| 1     | `docs/frame-views-design`    | 1    |
| 2     | `build/frame-ui-components` | 2    |
| 3     | `refactor/photo-feed-hook`   | 3    |
| 4     | `feat/frame-view-switch`     | 4    |
| 5     | `feat/frame-new-photos`      | 5    |

Each task starts with `gh stack add <branch>` (except Task 1, already on its branch) and ends with `gh stack submit --auto` to push and open or update the draft PRs. PR bodies follow `.github/pull_request_template.md` (French): edit them with `gh pr edit <N> --body-file <file>` after `submit`.

## Dev environment

- `pnpm dev` from the **main checkout** may already hold ports 5180 and 3000. In the worktree, run the API-less client on another port: `pnpm --filter client exec vite --port 5181` (it proxies `/api` and `/socket.io` to the API on 3000).
- Stop that Vite server at the end with `TaskStop` **and** check no `node.exe` with `feat-frame-views` in its command line survives (`Get-CimInstance Win32_Process`): a surviving Node locks the worktree folder.
- Simulate a photo sent by a relative (API on 3000 must run):

  ```bash
  curl -s -F uploaderName=Test -F photo=@server/bruno/fixtures/photo.jpg http://localhost:3000/api/photos
  ```

  Expected: a JSON body `{"id":"…","url":"…","uploaderName":"Test","createdAt":"…"}`.

## File Map

| File                                              | Task | Responsibility                                                   |
| ------------------------------------------------- | ---- | ---------------------------------------------------------------- |
| `client/src/components/ui/{carousel,toggle-group,toggle,badge}.tsx` | 2 | Generated by the shadcn CLI.                         |
| `client/src/hooks/usePhotoFeed.ts`                | 3    | Load photos, then follow `photo:new` (newest first).            |
| `client/src/hooks/useIdleControls.ts`             | 4    | `isActive` while someone touches, moves the mouse or types.     |
| `client/src/hooks/useCarouselPhoto.ts`            | 4    | Keep Embla and the current photo `id` in step, both ways.       |
| `client/src/hooks/useCarouselArrowKeys.ts`        | 4    | Left/right arrows anywhere on the page move the carousel.        |
| `client/src/components/frame/PhotoView.tsx`       | 4    | Full-screen carousel + caption + optional strip.                 |
| `client/src/components/frame/PhotoStrip.tsx`      | 4    | Horizontal thumbnails, current one highlighted.                  |
| `client/src/components/frame/ContactSheet.tsx`    | 4    | Grid of every photo.                                             |
| `client/src/components/frame/FrameControls.tsx`   | 4    | View toggle and strip toggle; exports `FrameView`.               |
| `client/src/hooks/useFrameSelection.ts`           | 5    | View, current photo, new photo count and their transitions.      |
| `client/src/components/frame/NewPhotosBadge.tsx`  | 5    | "N nouvelles photos" button.                                     |
| `client/src/pages/FramePage.tsx`                  | 3-5  | Composition only.                                                |

## Spec deviations (decided while planning)

- **The badge is its own component, outside `FrameControls`.** The controls hide after 4 s; the badge must stay visible while `newPhotoCount > 0`, or an idle viewer would never see it.
- **A photo arriving while idle also switches to the photo view** if the contact sheet was open: the frame "shows it", as the spec says.
- **Arrival is detected in render, not in an effect** (`useFrameSelection`, Task 5): an effect would paint the new photo for one frame before pinning back to the viewed one.

---

### Task 1: Spec and plan PR

**Files:**
- Already committed: `docs/superpowers/specs/2026-11-23-frame-views-design.md`
- Create: `docs/superpowers/plans/2026-11-23-frame-views.md` (this file)

**Interfaces:** none.

- [ ] **Step 1: Format and commit the plan**

```bash
pnpm exec biome check --write docs
git add docs/superpowers/plans/2026-11-23-frame-views.md
git commit -F <scratchpad>/plan-commit.txt
```

Message: `docs: plan the frame photo and contact sheet views`.

- [ ] **Step 2: Start the stack on the existing branch**

Check `gh stack init --help` for how to adopt the current branch `docs/frame-views-design`, then init the stack with it as layer 1.

- [ ] **Step 3: Push and open the draft PR**

```bash
gh stack submit --auto
gh stack view --json
```

Expected: one open draft PR, base `develop`. Set its body (French, template sections "Pourquoi / Ce qui change / Vérifier") with `gh pr edit <N> --body-file <file>`: links to the spec and plan, no code change.

---

### Task 2: shadcn carousel, toggle group and badge

**Files:**
- Create (CLI): `client/src/components/ui/carousel.tsx`, `toggle-group.tsx`, `toggle.tsx`, `badge.tsx`
- Modify (CLI): `client/package.json`, `pnpm-lock.yaml`

**Interfaces:**
- Produces: `Carousel`, `CarouselContent`, `CarouselItem`, `type CarouselApi` from `@/components/ui/carousel.tsx`; `ToggleGroup`, `ToggleGroupItem` from `@/components/ui/toggle-group.tsx`; `Toggle` from `@/components/ui/toggle.tsx`; `Badge` from `@/components/ui/badge.tsx`.

- [ ] **Step 1: New layer**

```bash
gh stack add build/frame-ui-components
```

- [ ] **Step 2: Add the components**

From `client/`:

```bash
pnpm dlx shadcn@latest add carousel toggle-group badge -y
```

Expected: the four files above created, `embla-carousel-react` added to `client/package.json` `dependencies`. No other dependency may appear: if one does, stop and report.

- [ ] **Step 3: Check the generated APIs used later**

```bash
grep -n "asChild" client/src/components/ui/badge.tsx
grep -n "onKeyDownCapture\|preventDefault" client/src/components/ui/carousel.tsx
```

Expected: `badge.tsx` accepts `asChild` (Task 5 renders it as a `<button>`); `carousel.tsx` calls `event.preventDefault()` on arrow keys (Task 4's global arrow hook relies on it). If either is missing, log a drift and amend Task 4 or 5.

- [ ] **Step 4: Gate**

```bash
pnpm check:fix
pnpm check
pnpm typecheck
pnpm build
```

Expected: no errors; `client build: ✓ built`.

- [ ] **Step 5: Commit and submit**

Message: `build(client): add shadcn carousel, toggle group and badge`.

```bash
git add client/package.json pnpm-lock.yaml client/src/components/ui
git commit -F <scratchpad>/task2.txt
gh stack submit --auto
```

PR body: which components, why (link to spec), the one new dependency and its approval.

---

### Task 3: Extract `usePhotoFeed`

No behaviour change: `/frame` looks and works exactly as before.

**Files:**
- Create: `client/src/hooks/usePhotoFeed.ts`
- Modify: `client/src/pages/FramePage.tsx`

**Interfaces:**
- Produces: `usePhotoFeed(): Photo[]` — photos newest first, `[]` until the first load.

- [ ] **Step 1: New layer**

```bash
gh stack add refactor/photo-feed-hook
```

- [ ] **Step 2: Create the hook**

`client/src/hooks/usePhotoFeed.ts`:

```ts
import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { isPhoto, type Photo, type ServerToClientEvents } from '@/photo.ts'

// null keeps the photos already shown when a reload fails.
async function fetchPhotos(): Promise<Photo[] | null> {
  try {
    const res = await fetch('/api/photos')
    const data: unknown = await res.json()
    return Array.isArray(data) && data.every(isPhoto) ? data : null
  } catch (error) {
    console.error('Could not load photos', error)
    return null
  }
}

// Newest first, like GET /api/photos.
export function usePhotoFeed(): Photo[] {
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => {
    // Same origin: Vite proxies /socket.io to the API.
    const socket: Socket<ServerToClientEvents> = io()

    // Reconnections too: catches photos sent while offline.
    socket.on('connect', async () => {
      const loadedPhotos = await fetchPhotos()
      if (loadedPhotos) setPhotos(loadedPhotos)
    })

    socket.on('photo:new', (photo) => {
      // The fetch and the event can bring the same photo.
      setPhotos((current) =>
        current.some(({ id }) => id === photo.id) ? current : [photo, ...current],
      )
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return photos
}
```

- [ ] **Step 3: Use it in `FramePage`**

In `client/src/pages/FramePage.tsx`: delete the `useState`/`useEffect` block and the `socket.io-client` and `isPhoto`/`ServerToClientEvents` imports, then:

```tsx
import type { JSX } from 'react'
import { usePhotoFeed } from '@/hooks/usePhotoFeed.ts'
```

and, first line of the component:

```tsx
  const photos = usePhotoFeed()
```

Keep `formatDate`, `FRAME_CLASSES` and the JSX unchanged.

- [ ] **Step 4: Gate**

```bash
pnpm check:fix
pnpm check
pnpm typecheck
pnpm build
```

- [ ] **Step 5: Manual check**

Start `pnpm --filter client exec vite --port 5181` (background), open `http://localhost:5181/frame`: the latest photo and the thumbnails show as before. Run the `curl` from "Dev environment": the new photo appears first without reload.

- [ ] **Step 6: Commit and submit**

Message: `refactor(client): extract the photo feed into a hook`.

```bash
git add client/src/hooks/usePhotoFeed.ts client/src/pages/FramePage.tsx
git commit -F <scratchpad>/task3.txt
gh stack submit --auto
```

---

### Task 4: Photo view, contact sheet and controls

**Files:**
- Create: `client/src/hooks/useIdleControls.ts`, `client/src/hooks/useCarouselPhoto.ts`, `client/src/hooks/useCarouselArrowKeys.ts`, `client/src/components/frame/PhotoView.tsx`, `client/src/components/frame/PhotoStrip.tsx`, `client/src/components/frame/ContactSheet.tsx`, `client/src/components/frame/FrameControls.tsx`
- Modify: `client/src/pages/FramePage.tsx` (full rewrite)

**Interfaces:**
- Consumes: `usePhotoFeed(): Photo[]` (Task 3); shadcn components from Task 2.
- Produces:
  - `useIdleControls(): boolean`
  - `type FrameView = 'photo' | 'contact-sheet'` from `@/components/frame/FrameControls.tsx`
  - `PhotoView({ photos: Photo[], currentId: string, isStripVisible: boolean, onCurrentChange: (id: string) => void })`
  - `ContactSheet({ photos: Photo[], onSelect: (id: string) => void })`
  - `FrameControls({ view: FrameView, isStripVisible: boolean, onViewChange: (view: FrameView) => void, onStripVisibleChange: (isVisible: boolean) => void })`

- [ ] **Step 1: New layer**

```bash
gh stack add feat/frame-view-switch
```

- [ ] **Step 2: `useIdleControls`**

`client/src/hooks/useIdleControls.ts`:

```ts
import { useEffect, useState } from 'react'

const CONTROLS_HIDE_DELAY_MS = 4000
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ['pointermove', 'pointerdown', 'keydown']

export function useIdleControls(): boolean {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    let hideTimer: number | undefined

    function showControls(): void {
      setIsActive(true)
      window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => setIsActive(false), CONTROLS_HIDE_DELAY_MS)
    }

    for (const eventName of ACTIVITY_EVENTS) window.addEventListener(eventName, showControls)
    return () => {
      window.clearTimeout(hideTimer)
      for (const eventName of ACTIVITY_EVENTS) window.removeEventListener(eventName, showControls)
    }
  }, [])

  return isActive
}
```

- [ ] **Step 3: `useCarouselPhoto`**

`client/src/hooks/useCarouselPhoto.ts`:

```ts
import { useEffect } from 'react'
import type { CarouselApi } from '@/components/ui/carousel.tsx'
import type { Photo } from '@/photo.ts'

type CarouselPhotoOptions = {
  api: CarouselApi
  photos: Photo[]
  currentId: string
  onCurrentChange: (id: string) => void
}

export function useCarouselPhoto({
  api,
  photos,
  currentId,
  onCurrentChange,
}: CarouselPhotoOptions): void {
  const currentIndex = photos.findIndex(({ id }) => id === currentId)

  useEffect(() => {
    if (!api || currentIndex < 0) return
    // A prepended photo re-inits Embla on its old index, which now holds another photo.
    const showCurrent = (): void => {
      if (api.selectedScrollSnap() !== currentIndex) api.scrollTo(currentIndex, true)
    }
    showCurrent()
    api.on('reInit', showCurrent)
    return () => {
      api.off('reInit', showCurrent)
    }
  }, [api, currentIndex])

  useEffect(() => {
    if (!api) return
    const reportSelection = (): void => {
      const selectedPhoto = photos[api.selectedScrollSnap()]
      if (selectedPhoto) onCurrentChange(selectedPhoto.id)
    }
    api.on('select', reportSelection)
    return () => {
      api.off('select', reportSelection)
    }
  }, [api, photos, onCurrentChange])
}
```

- [ ] **Step 4: `useCarouselArrowKeys`**

`client/src/hooks/useCarouselArrowKeys.ts`:

```ts
import { useEffect } from 'react'
import type { CarouselApi } from '@/components/ui/carousel.tsx'

export function useCarouselArrowKeys(api: CarouselApi): void {
  useEffect(() => {
    if (!api) return

    function handleKeyDown(event: KeyboardEvent): void {
      // A focused carousel already moved and prevented the default.
      if (event.defaultPrevented) return
      if (event.key === 'ArrowLeft') api.scrollPrev()
      if (event.key === 'ArrowRight') api.scrollNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [api])
}
```

If TypeScript reports `api` possibly undefined inside `handleKeyDown`, capture it first (`const carousel = api` after the guard) and call `carousel.scrollPrev()`; log the drift.

- [ ] **Step 5: `PhotoStrip`**

`client/src/components/frame/PhotoStrip.tsx`:

```tsx
import type { JSX } from 'react'
import type { Photo } from '@/photo.ts'

type PhotoStripProps = {
  photos: Photo[]
  currentId: string
  onSelect: (id: string) => void
}

export function PhotoStrip({ photos, currentId, onSelect }: PhotoStripProps): JSX.Element {
  return (
    <ul className="flex h-[20svh] items-center gap-2 overflow-x-auto px-4">
      {photos.map((photo) => (
        <li key={photo.id} className="shrink-0">
          <button
            type="button"
            onClick={() => onSelect(photo.id)}
            aria-current={photo.id === currentId}
            className="block rounded-md opacity-60 outline-none transition-opacity hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:opacity-100 aria-[current=true]:ring-2 aria-[current=true]:ring-primary"
          >
            <img
              className="size-24 rounded-md object-cover"
              src={photo.url}
              alt={`Envoyée par ${photo.uploaderName}`}
            />
          </button>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 6: `PhotoView`**

`client/src/components/frame/PhotoView.tsx`:

```tsx
import { type JSX, useState } from 'react'
import { PhotoStrip } from '@/components/frame/PhotoStrip.tsx'
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel.tsx'
import { useCarouselArrowKeys } from '@/hooks/useCarouselArrowKeys.ts'
import { useCarouselPhoto } from '@/hooks/useCarouselPhoto.ts'
import { cn } from '@/lib/utils.ts'
import type { Photo } from '@/photo.ts'

type PhotoViewProps = {
  photos: Photo[]
  currentId: string
  isStripVisible: boolean
  onCurrentChange: (id: string) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR')
}

export function PhotoView({
  photos,
  currentId,
  isStripVisible,
  onCurrentChange,
}: PhotoViewProps): JSX.Element {
  const [api, setApi] = useState<CarouselApi>()
  useCarouselPhoto({ api, photos, currentId, onCurrentChange })
  useCarouselArrowKeys(api)

  return (
    <div className="flex h-svh flex-col">
      <Carousel setApi={setApi} className="min-h-0 flex-1">
        <CarouselContent>
          {photos.map((photo) => (
            <CarouselItem key={photo.id} className="relative">
              <img
                className={cn('w-full object-contain', isStripVisible ? 'h-[80svh]' : 'h-svh')}
                src={photo.url}
                alt={`Envoyée par ${photo.uploaderName}`}
              />
              <p className="absolute bottom-4 left-8 rounded-md bg-black/60 px-2 py-1 text-sm text-white">
                {photo.uploaderName} · {formatDate(photo.createdAt)}
              </p>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {isStripVisible && (
        <PhotoStrip photos={photos} currentId={currentId} onSelect={onCurrentChange} />
      )}
    </div>
  )
}
```

- [ ] **Step 7: `ContactSheet`**

`client/src/components/frame/ContactSheet.tsx`:

```tsx
import type { JSX } from 'react'
import type { Photo } from '@/photo.ts'

type ContactSheetProps = {
  photos: Photo[]
  onSelect: (id: string) => void
}

export function ContactSheet({ photos, onSelect }: ContactSheetProps): JSX.Element {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3 p-4">
      {photos.map((photo) => (
        <li key={photo.id}>
          <button
            type="button"
            onClick={() => onSelect(photo.id)}
            className="group flex w-full flex-col gap-1 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            <img
              className="aspect-square w-full rounded-lg object-cover transition-opacity group-hover:opacity-80"
              src={photo.url}
              alt={`Envoyée par ${photo.uploaderName}`}
            />
            <span className="truncate text-xs text-muted-foreground">{photo.uploaderName}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 8: `FrameControls`**

`client/src/components/frame/FrameControls.tsx`:

```tsx
import { GalleryHorizontalIcon, ImageIcon, LayoutGridIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Toggle } from '@/components/ui/toggle.tsx'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'

export type FrameView = 'photo' | 'contact-sheet'

function isFrameView(value: string): value is FrameView {
  return value === 'photo' || value === 'contact-sheet'
}

type FrameControlsProps = {
  view: FrameView
  isStripVisible: boolean
  onViewChange: (view: FrameView) => void
  onStripVisibleChange: (isVisible: boolean) => void
}

export function FrameControls({
  view,
  isStripVisible,
  onViewChange,
  onStripVisibleChange,
}: FrameControlsProps): JSX.Element {
  return (
    <div className="fixed top-4 right-4 flex items-center gap-2 rounded-lg bg-background/80 p-1 backdrop-blur">
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
    </div>
  )
}
```

- [ ] **Step 9: Rewrite `FramePage`**

`client/src/pages/FramePage.tsx`:

```tsx
import { type JSX, useState } from 'react'
import { ContactSheet } from '@/components/frame/ContactSheet.tsx'
import { FrameControls, type FrameView } from '@/components/frame/FrameControls.tsx'
import { PhotoView } from '@/components/frame/PhotoView.tsx'
import { useIdleControls } from '@/hooks/useIdleControls.ts'
import { usePhotoFeed } from '@/hooks/usePhotoFeed.ts'
import { cn } from '@/lib/utils.ts'

// The frame is a screen on a wall: dark keeps the photos in front.
const FRAME_CLASSES = 'dark min-h-svh bg-background text-foreground'

function EmptyFrame(): JSX.Element {
  return (
    <main className={FRAME_CLASSES}>
      <p className="pt-[40vh] text-center text-muted-foreground">
        En attente de la première photo…
      </p>
    </main>
  )
}

export default function FramePage(): JSX.Element {
  const photos = usePhotoFeed()
  const isActive = useIdleControls()
  const [view, setView] = useState<FrameView>('photo')
  // null follows the newest photo.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isStripVisible, setIsStripVisible] = useState(false)

  const newestId = photos.at(0)?.id
  if (newestId === undefined) return <EmptyFrame />

  function selectPhoto(id: string): void {
    setSelectedId(id === newestId ? null : id)
  }

  function openPhoto(id: string): void {
    selectPhoto(id)
    setView('photo')
  }

  return (
    <main className={cn(FRAME_CLASSES, !isActive && 'cursor-none')}>
      {view === 'photo' ? (
        <PhotoView
          photos={photos}
          currentId={selectedId ?? newestId}
          isStripVisible={isStripVisible}
          onCurrentChange={selectPhoto}
        />
      ) : (
        <ContactSheet photos={photos} onSelect={openPhoto} />
      )}
      {isActive && (
        <FrameControls
          view={view}
          isStripVisible={isStripVisible}
          onViewChange={setView}
          onStripVisibleChange={setIsStripVisible}
        />
      )}
    </main>
  )
}
```

The component is over 30 lines; Task 5 moves its state into `useFrameSelection`. Do not split it further here.

- [ ] **Step 10: Gate**

```bash
pnpm check:fix
pnpm check
pnpm typecheck
pnpm build
```

- [ ] **Step 11: Manual check in Chrome** (`http://localhost:5181/frame`)

Expected, each checked by a screenshot:

1. Load: newest photo full screen, no controls, cursor hidden over the page.
2. Move the mouse: controls appear top right; 4 s without input: they hide.
3. Arrow right: older photo. Arrow left: back. Drag with the mouse: same.
4. Strip toggle: thumbnails at the bottom, current one highlighted; clicking one shows it.
5. "Pellicule": grid of every photo; clicking one opens it in the photo view.
6. Pin an older photo (arrow right), then run the `curl`: the frame **stays on the pinned photo** (the prepend shifted every index; `useCarouselPhoto` must put Embla back on it).
7. Go back to the newest (arrow left until the first), run the `curl` again: the new photo shows, since `null` follows the newest. No badge yet: that is Task 5.

If step 3 moves two photos per key press, the global hook and the carousel both handled the key: log a drift and check Task 2 Step 3.

- [ ] **Step 12: Commit and submit**

Message: `feat(client): switch the frame between a photo view and a contact sheet`.

```bash
git add client/src/hooks client/src/components/frame client/src/pages/FramePage.tsx
git commit -F <scratchpad>/task4.txt
gh stack submit --auto
```

---

### Task 5: New photo: jump when idle, badge when watched

**Files:**
- Create: `client/src/hooks/useFrameSelection.ts`, `client/src/components/frame/NewPhotosBadge.tsx`
- Modify: `client/src/pages/FramePage.tsx`

**Interfaces:**
- Consumes: everything from Task 4.
- Produces: `useFrameSelection(photos: Photo[], isActive: boolean): FrameSelection` with
  `{ view: FrameView, currentId: string | undefined, newPhotoCount: number, setView, selectPhoto(id), openPhoto(id), showNewest() }`; `NewPhotosBadge({ count: number, onSelect: () => void })`.

- [ ] **Step 1: New layer**

```bash
gh stack add feat/frame-new-photos
```

- [ ] **Step 2: `useFrameSelection`**

`client/src/hooks/useFrameSelection.ts`:

```ts
import { useState } from 'react'
import type { FrameView } from '@/components/frame/FrameControls.tsx'
import type { Photo } from '@/photo.ts'

type FrameSelection = {
  view: FrameView
  currentId: string | undefined
  newPhotoCount: number
  setView: (view: FrameView) => void
  selectPhoto: (id: string) => void
  openPhoto: (id: string) => void
  showNewest: () => void
}

export function useFrameSelection(photos: Photo[], isActive: boolean): FrameSelection {
  const [view, setView] = useState<FrameView>('photo')
  // null follows the newest photo.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newPhotoCount, setNewPhotoCount] = useState(0)
  const newestId = photos.at(0)?.id
  const [shownNewestId, setShownNewestId] = useState(newestId)

  function handleArrival(previousNewestId: string): void {
    if (isActive) {
      // Someone is looking: keep their photo on screen.
      setSelectedId((id) => id ?? previousNewestId)
      setNewPhotoCount((count) => count + 1)
      return
    }
    showNewest()
  }

  // Adjusted during render, not in an effect: an effect would paint the new photo once
  // before pinning the viewed one back.
  if (newestId !== shownNewestId) {
    setShownNewestId(newestId)
    // undefined: the first load, nothing arrived.
    if (shownNewestId !== undefined) handleArrival(shownNewestId)
  }

  function showNewest(): void {
    setSelectedId(null)
    setNewPhotoCount(0)
    setView('photo')
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
    setView('photo')
  }

  return {
    view,
    currentId: selectedId ?? newestId,
    newPhotoCount,
    setView,
    selectPhoto,
    openPhoto,
    showNewest,
  }
}
```

`showNewest` is a function declaration: hoisting makes it callable from `handleArrival` above it. If Biome flags the order, move `showNewest` above `handleArrival` and log the drift.

- [ ] **Step 3: `NewPhotosBadge`**

`client/src/components/frame/NewPhotosBadge.tsx`:

```tsx
import type { JSX } from 'react'
import { Badge } from '@/components/ui/badge.tsx'

type NewPhotosBadgeProps = {
  count: number
  onSelect: () => void
}

function newPhotosLabel(count: number): string {
  return count === 1 ? '1 nouvelle photo' : `${count} nouvelles photos`
}

export function NewPhotosBadge({ count, onSelect }: NewPhotosBadgeProps): JSX.Element {
  return (
    <Badge asChild className="fixed top-4 left-1/2 -translate-x-1/2 px-3 py-1 text-sm">
      <button type="button" onClick={onSelect}>
        {newPhotosLabel(count)}
      </button>
    </Badge>
  )
}
```

- [ ] **Step 4: Use them in `FramePage`**

Replace the component (keep `FRAME_CLASSES` and `EmptyFrame`); imports become:

```tsx
import { type JSX, useState } from 'react'
import { ContactSheet } from '@/components/frame/ContactSheet.tsx'
import { FrameControls } from '@/components/frame/FrameControls.tsx'
import { NewPhotosBadge } from '@/components/frame/NewPhotosBadge.tsx'
import { PhotoView } from '@/components/frame/PhotoView.tsx'
import { useFrameSelection } from '@/hooks/useFrameSelection.ts'
import { useIdleControls } from '@/hooks/useIdleControls.ts'
import { usePhotoFeed } from '@/hooks/usePhotoFeed.ts'
import { cn } from '@/lib/utils.ts'
```

```tsx
export default function FramePage(): JSX.Element {
  const photos = usePhotoFeed()
  const isActive = useIdleControls()
  const selection = useFrameSelection(photos, isActive)
  const [isStripVisible, setIsStripVisible] = useState(false)

  if (selection.currentId === undefined) return <EmptyFrame />

  return (
    <main className={cn(FRAME_CLASSES, !isActive && 'cursor-none')}>
      {selection.view === 'photo' ? (
        <PhotoView
          photos={photos}
          currentId={selection.currentId}
          isStripVisible={isStripVisible}
          onCurrentChange={selection.selectPhoto}
        />
      ) : (
        <ContactSheet photos={photos} onSelect={selection.openPhoto} />
      )}
      {isActive && (
        <FrameControls
          view={selection.view}
          isStripVisible={isStripVisible}
          onViewChange={selection.setView}
          onStripVisibleChange={setIsStripVisible}
        />
      )}
      {selection.newPhotoCount > 0 && (
        <NewPhotosBadge count={selection.newPhotoCount} onSelect={selection.showNewest} />
      )}
    </main>
  )
}
```

- [ ] **Step 5: Gate**

```bash
pnpm check:fix
pnpm check
pnpm typecheck
pnpm build
```

- [ ] **Step 6: Manual check in Chrome** (`http://localhost:5181/frame`)

Expected, each checked by a screenshot:

1. **Idle**: pin an older photo (arrow right), wait 5 s without touching, run the `curl`: the frame jumps to the new photo, no badge.
2. **Watched**: pin an older photo, then run the `curl` while moving the mouse over the page (in Chrome, use `computer` `hover` moves right before and after the `curl`): the frame **stays** on the pinned photo, badge "1 nouvelle photo" top center. A second `curl`: "2 nouvelles photos".
3. Click the badge: newest photo shown, badge gone.
4. **Watched, following the newest** (no photo pinned, newest on screen): `curl` while moving the mouse: the frame stays on the photo it showed, badge appears.
5. Reaching the newest photo by hand (arrow left until the first) clears the badge.
6. Contact sheet open and idle: `curl` switches to the photo view on the new photo.

If check 2 or 4 shows the new photo for a moment, or ends on the new photo, Embla emitted `select` during its re-init: log a drift and stop for the orchestrator.

- [ ] **Step 7: Commit and submit**

Message: `feat(client): jump to new photos when idle, count them when watched`.

```bash
git add client/src/hooks/useFrameSelection.ts client/src/components/frame/NewPhotosBadge.tsx client/src/pages/FramePage.tsx
git commit -F <scratchpad>/task5.txt
gh stack submit --auto
```

- [ ] **Step 8: Wrap up**

Stop the 5181 Vite server (see "Dev environment"), set `status: in-review` in this plan, commit the plan update on layer 1 (`gh stack bottom`, commit, `gh stack rebase --upstack`, `gh stack top`, `gh stack submit --auto`).

---

## Drift Log

<!-- date · task/step · what the plan said · what was done · why -->

- 2026-11-23 · pre-flight · plan code exceeds the 30-line rule in `FramePage` (Task 4) and `useFrameSelection` (Task 5) · author chose to tolerate it, added to Global Constraints · keeps the plan's simple structure
- 2026-11-23 · Task 2 · add the shadcn carousel as generated · `biome.json` turns off `a11y/useSemanticElements` for the whole `carousel.tsx` · the generated file uses `role="region"` and `role="group"` on divs; the file stays as generated rather than hand-edited
- 2026-11-23 · Task 4 review · effect 1 of `useCarouselPhoto` in `useEffect`; the reviewer feared a one-frame flash on prepend · switched to `useLayoutEffect` (2864df1), then reverted (9d3e9dd) · in Chrome the layout effect shifted the pinned photo one older on prepend; the flash was never observed with `useEffect`
- 2026-11-23 · Task 4 final review · effect 1 follows the parent's `currentId` · it also reacts to Embla's own moves (snap-back after a fast fling, strip jump); kept as is · harmless today, to revisit if a snap-back race shows up
- 2026-11-23 · Task 4 → Task 5 · stabilise `onCurrentChange` in Task 5 · never done: the listener resubscribes on each render · Embla's `on`/`off` are cheap and no bug came from it
- 2026-11-23 · Task 5 review · badge count +1 per change of the newest photo · counts the photos above the previous newest (`Math.max(previousNewestIndex, 1)`) · a refetch after a reconnect brings several photos at once; verified with two parallel uploads → "2 nouvelles photos"
- 2026-11-23 · Task 5 final review · the badge waits while the frame is idle · `if (!isActive && newPhotoCount > 0) showNewest()` · user's choice: otherwise the new photo waited a whole slideshow loop
- 2026-11-23 · rebase onto develop 933965e (#25 thumbnails) · strip and sheet read `url` · they read `thumbnailUrl` (lazy, async decoding); `usePhotoFeed` checks `photo:new` with `isPhoto` and logs unexpected payloads · adopt develop's optimised URLs
- 2026-11-23 · rebase onto develop a5c48c5 (#30 signed URLs) · none · no conflict; it ended the Cloudinary 401s caused by strict transformations
- 2026-11-23 · rebase onto develop b225a39 (#38 deletion) · none · `usePhotoFeed` reloads on `photo:deleted`; the #23 rewrite drops develop's delete button, which comes back in a new top layer (`feat/frame-photo-delete`, PR #39, see `docs/superpowers/specs/2026-11-23-frame-photo-deletion-views.md`)
