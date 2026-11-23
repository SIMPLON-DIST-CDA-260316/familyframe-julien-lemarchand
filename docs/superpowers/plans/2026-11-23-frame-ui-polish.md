---
plan: frame-ui-polish
status: draft
spec: docs/superpowers/specs/2026-11-23-frame-ui-polish-design.md
branch: docs/frame-ui-polish-design (PR 1), feat/frame-photo-backdrop (PR 2), feat/frame-controls-pill (PR 3), feat/frame-sheet-polish (PR 4)
worktree: true
tasks_total: 4
tasks_done: 0
current_task: Task 1
last_commit: —
last_updated: 2026-11-23
---

# Frame UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Working agreement (mandatory):** keep this plan in sync with reality. Check a step only when it is finished and its gate is green. Append every divergence to the Drift Log. Update the frontmatter (`tasks_done`, `current_task`, `last_commit`, `last_updated`) at each task boundary. When a drift produces a durable correction (path, command, signature, decision), amend the affected task block in place and log the amendment. Never check a partial step; never delete a finished step or a drift entry.

**Goal:** Turn the `/frame` page from "a monitor showing a JPEG" into a warm wall frame: blurred photo backdrop, readable caption, slow Ken Burns, one glass pill for the controls, a clean floating strip, a gallery-like contact sheet, an accent badge and an inviting empty state.

**Architecture:** Pure presentation work on the existing components. `PhotoView` keeps its five props and gains three children: `PhotoBackdrop` and `PhotoCaption` (one each, for the current photo, keyed by its id) and `PhotoSlide` (one per photo, Ken Burns when current). Frame-only colour tokens live in `index.css` next to the shadcn ones. The pill restyles the shadcn toggles through a shared class string; `components/ui/*` stays as generated.

**Tech Stack:** React 19, Vite 8, TypeScript 7, Tailwind CSS v4 (`@theme`, tw-animate-css), shadcn/ui (`Toggle`, `ToggleGroup`, `Badge`, `Carousel`), Embla Carousel, lucide-react, Biome.

## Global Constraints

- **The plan assumes the stack has been rebased onto `develop` (933965e)**, so `Photo` has `thumbnailUrl` (640×640, cropped on the subject). If `client/src/photo.ts` has no `thumbnailUrl`, stop and report: the controller rebases.
- No new dependency (`embla-carousel-fade`, Fraunces and `qrcode.react` were rejected, see the spec).
- Client code imports with the `@/` alias and the `.ts`/`.tsx` extension.
- Generated shadcn files in `client/src/components/ui/` stay as generated: style through `className` and `opts` only.
- The `.dark` tokens in `index.css` do not change (`theme.ts` applies `.dark` app-wide). Frame colours use `--frame-background` / `--frame-accent` (`bg-frame-background`, `ring-frame-accent`, `bg-frame-accent`).
- Every new animation is behind `motion-safe:` (or switched off with `motion-reduce:`).
- Do not touch `useCarouselPhoto` (it stays on `useEffect`; `useLayoutEffect` regressed once), `useSlideshow`, `useFrameSelection`, `useIdleControls`.
- `PhotoView` keeps exactly its five props (`photos`, `currentId`, `isStripVisible`, `autoAdvanceMs`, `onCurrentChange`); what else it needs is derived (`currentPhoto` from `photos` + `currentId`).
- Images: slides use `photo.url`, the current one `fetchPriority="high"` and never lazy; the backdrop, the strip and the contact sheet use `photo.thumbnailUrl`; strip and sheet images are `loading="lazy"` and `decoding="async"`.
- TypeScript rules (AGENTS.md): no `as` casts (including `as const`), explicit return types on exported functions, literal unions rather than `enum`.
- Code rules (`.claude/rules/`): comment why, never what; booleans prefixed `is`/`has`/`should`; callback params named after the item; no magic numbers (named by purpose); one responsibility per file; max 30 lines per function body, 5 params (props count as params).
- Line counts were checked on the code below (function body, between the braces). Every new or changed function stays at or under 30 lines, except:
  - **Tolerated:** `FramePage` reaches about 47 body lines after Task 4 (44 today). Author decision carried over from the frame views and slideshow plans.
- UI text in French, code and docs in English.
- No API change: Bruno collection untouched.
- Every commit passes `pnpm check` and `pnpm typecheck`; every task ends with `pnpm build` green and the manual check of its task in Chrome.
- Commit messages: Conventional Commits in English, written to a file in the scratchpad and passed with `git commit -F <file>`. End each message with the session's attribution lines.
- Git commands run from the worktree root, one plain command per call: the worktree guard refuses chained or `-C` git commands.

## Git strategy

Continues the frame stack managed with `gh stack` (read the `gh-stack` skill before the first `gh stack` command). New layers on top of `feat/frame-slideshow`:

| Layer | Branch                        | Task |
| ----- | ----------------------------- | ---- |
| 9     | `docs/frame-ui-polish-design` | 1    |
| 10    | `feat/frame-photo-backdrop`   | 2    |
| 11    | `feat/frame-controls-pill`    | 3    |
| 12    | `feat/frame-sheet-polish`     | 4    |

Each task starts with `gh stack add <branch>` (except Task 1, already on its branch) and ends with `gh stack submit --auto`. PR bodies in French, set with `gh pr edit <N> --body-file <file>`.

## Dev environment

- The controller runs the worktree client on port 5181 (`pnpm --filter client exec vite --port 5181 --strictPort`), against the API on 3000 started from the main checkout. **Implementers do not start or stop dev servers.**
- Simulate a photo sent by a relative:

  ```bash
  curl -s -F uploaderName=Test -F photo=@server/bruno/fixtures/photo.jpg http://localhost:3000/api/photos
  ```

- Reduced motion: Chrome DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion: reduce".

## File Map

| File                                               | Task | Responsibility                                                                 |
| -------------------------------------------------- | ---- | ------------------------------------------------------------------------------ |
| `client/src/index.css`                             | 2    | Frame tokens, `ken-burns` keyframe and `animate-ken-burns` utility.           |
| `client/src/components/frame/PhotoBackdrop.tsx`    | 2    | Blurred copy of the current photo behind the carousel.                        |
| `client/src/components/frame/PhotoCaption.tsx`     | 2    | Name and human date of the current photo.                                     |
| `client/src/components/frame/PhotoSlide.tsx`       | 2    | One slide: full photo, Ken Burns and loading priority when current.           |
| `client/src/components/frame/PhotoView.tsx`        | 2    | Layers: backdrop, slower carousel, bottom overlay (caption + strip).          |
| `client/src/components/frame/PhotoStrip.tsx`       | 2-3  | Clickable inside the overlay (2); thumbnails, no scrollbar, accent, scroll (3). |
| `client/src/pages/FramePage.tsx`                   | 2-4  | Frame background (2), pill composition (3), empty state, sheet, badge (4).    |
| `client/src/components/frame/pillToggleClasses.ts` | 3    | Class string shared by the pill's toggles.                                    |
| `client/src/components/frame/ControlsDivider.tsx`  | 3    | Thin rule between groups of the pill.                                         |
| `client/src/components/frame/FrameControls.tsx`    | 3    | The glass pill, hides faster than it shows.                                   |
| `client/src/components/frame/ViewToggles.tsx`      | 3    | Photo/Pellicule only.                                                         |
| `client/src/components/frame/StripToggle.tsx`      | 3    | Strip toggle, moved out of `ViewToggles`.                                     |
| `client/src/components/frame/SlideshowControls.tsx`| 3    | Ghost toggles, divider between play and pace.                                 |
| `client/src/components/frame/ContactSheet.tsx`     | 4    | Gallery layout, overlay names, current marker, thumbnails.                    |
| `client/src/components/frame/NewPhotosBadge.tsx`   | 4    | Always-mounted live region with the accent pill.                              |

## Spec deviations (decided while planning)

These are deviations from the UI review the spec is based on; the spec already records them as decisions.

- **One caption for the current photo, outside the slides**, not one per slide. It is keyed by the photo id, so it rises in on each change without an `isCurrent` prop, and it shares the bottom overlay with the strip, so it sits above the strip without a "lifted" variant.
- **The strip floats from Task 2 (PR A)**, not Task 3. The caption overlay and the strip share the bottom of the screen; leaving the strip in the flow for one PR would put the caption on top of it. Task 2 only changes what the overlay needs (`pointer-events-auto`, no fixed height); Task 3 restyles the strip.
- **New `PhotoSlide.tsx`**: with the backdrop, the caption and the overlay, `PhotoView` would reach about 36 body lines (limit 30). The slide moves out, with the Ken Burns and loading rules that depend on `isCurrent`. `PhotoView` ends at 24 lines.
- **New `StripToggle.tsx`, `ViewToggles` down to two props** (`view`, `onViewChange`): with the pill classes, the `title` and a divider, `ViewToggles` would reach 34 body lines. `FramePage` composes the groups and the dividers.
- **New `pillToggleClasses.ts`**: `ViewToggles`, `StripToggle` and `SlideshowControls` share one class string; a `.ts` module keeps component files exporting components only.
- **`NewPhotosBadge` is always mounted** and renders nothing at zero: a live region only announces changes once it exists, so mounting it together with its content (the review's version) would stay silent.
- **The strip scrolls through a callback ref, not `useEffect`**: an effect on `currentId` that does not read `currentId` trips Biome's `useExhaustiveDependencies`; the ref runs exactly when the current `<li>` changes.
- **`overflow-clip` instead of `overflow-hidden`** on the `PhotoView` wrapper: the 125 % backdrop overflows, and `scrollIntoView` would scroll a `hidden` box.
- **Empty-state glow uses the token** (`bg-radial from-frame-accent/10`) instead of the review's hard-coded `oklch(0.22 0.02 60)`.

---

### Task 1: Spec and plan

**Files:**

- Create: `docs/superpowers/specs/2026-11-23-frame-ui-polish-design.md`
- Create: `docs/superpowers/plans/2026-11-23-frame-ui-polish.md`

- [ ] **Step 1: Check formatting**

Run: `pnpm exec biome format --write docs/superpowers/specs/2026-11-23-frame-ui-polish-design.md docs/superpowers/plans/2026-11-23-frame-ui-polish.md`, then `pnpm check`
Expected: `Checked N files … No fixes applied.`

- [ ] **Step 2: Commit the spec and the plan**

```bash
gh stack add docs/frame-ui-polish-design
git add docs/superpowers/specs/2026-11-23-frame-ui-polish-design.md docs/superpowers/plans/2026-11-23-frame-ui-polish.md
git commit -F <scratchpad>/commit-ui-polish-docs.txt
```

Message: `docs: design and plan the frame UI polish`

- [ ] **Step 3: Submit and write the PR body (controller, after review)**

Run: `gh stack submit --auto`, then `gh pr edit <N> --body-file <file>` with a French body (Pourquoi / Ce qui change / Vérifier) that links the spec and the plan.

---

### Task 2: Warm backdrop, readable caption, Ken Burns (PR A)

**Files:**

- Modify: `client/src/index.css`
- Create: `client/src/components/frame/PhotoBackdrop.tsx`
- Create: `client/src/components/frame/PhotoCaption.tsx`
- Create: `client/src/components/frame/PhotoSlide.tsx`
- Modify: `client/src/components/frame/PhotoStrip.tsx:12`
- Modify: `client/src/components/frame/PhotoView.tsx` (full rewrite)
- Modify: `client/src/pages/FramePage.tsx:15`

**Interfaces:**

- Consumes:
  - `Photo = { id, url, thumbnailUrl, uploaderName, createdAt }` from `@/photo.ts` (after the rebase).
  - `Carousel` (`setApi`, `opts`), `CarouselContent`, `CarouselItem`, `CarouselApi` from `@/components/ui/carousel.tsx`.
  - `useCarouselPhoto`, `useCarouselArrowKeys`, `useSlideshow`, unchanged.
  - `PhotoStrip({ photos, currentId, onSelect })`, unchanged props.
- Produces:
  - `PhotoBackdrop({ url: string }): JSX.Element`
  - `PhotoCaption({ photo: Photo }): JSX.Element`
  - `PhotoSlide({ photo: Photo, isCurrent: boolean }): JSX.Element`
  - `PhotoView`: same five props as today.
  - Tailwind utilities: `bg-frame-background`, `ring-frame-accent`, `bg-frame-accent`, `text-frame-accent`, `animate-ken-burns`.

- [ ] **Step 1: Create the stack layer**

Run: `gh stack add feat/frame-photo-backdrop`
Expected: `✓ Created and checked out branch "feat/frame-photo-backdrop"`

- [ ] **Step 2: Add the frame tokens and the Ken Burns keyframe**

Do not start a dev server: the controller runs it (see Dev environment).

In `client/src/index.css`, replace the end of `:root` and the start of `@theme inline`:

```css
  --sidebar-ring: oklch(0.708 0 0);
}

@theme inline {
  --font-heading: var(--font-sans);
  --font-sans: "Geist Variable", sans-serif;
```

with

```css
  --sidebar-ring: oklch(0.708 0 0);
  /* .dark is app-wide (theme.ts): the frame's warm palette gets its own tokens instead. */
  --frame-background: oklch(0.14 0.008 60);
  --frame-accent: oklch(0.82 0.12 75);
}

@theme inline {
  --font-heading: var(--font-sans);
  --font-sans: "Geist Variable", sans-serif;
  --color-frame-background: var(--frame-background);
  --color-frame-accent: var(--frame-accent);
```

Then replace the end of `@theme inline`:

```css
  --radius-4xl: calc(var(--radius) * 2.6);
}
```

with

```css
  --radius-4xl: calc(var(--radius) * 2.6);
}

@theme {
  /* As long as the longest slideshow interval, so the drift never stops on screen. */
  --animate-ken-burns: ken-burns 20s ease-out forwards;

  @keyframes ken-burns {
    from {
      transform: scale(1);
    }
    to {
      transform: scale(1.06);
    }
  }
}
```

The `.dark` block is not touched.

- [ ] **Step 3: Write `PhotoBackdrop`**

Do not start a dev server: the controller runs it (see Dev environment).

Create `client/src/components/frame/PhotoBackdrop.tsx`:

```tsx
import type { JSX } from 'react'

type PhotoBackdropProps = {
  url: string
}

export function PhotoBackdrop({ url }: PhotoBackdropProps): JSX.Element {
  return (
    <img
      // The photo's own colours fill the bars around it; scale-125 hides the blur's faded edges.
      className="pointer-events-none absolute inset-0 -z-10 size-full scale-125 object-cover opacity-60 blur-3xl brightness-50 saturate-150 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-1000"
      src={url}
      alt=""
      aria-hidden
    />
  )
}
```

- [ ] **Step 4: Write `PhotoCaption`**

Create `client/src/components/frame/PhotoCaption.tsx`:

```tsx
import type { JSX } from 'react'
import type { Photo } from '@/photo.ts'

// The day is what matters on a wall: the time of the upload was noise.
const CAPTION_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}

type PhotoCaptionProps = {
  photo: Photo
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', CAPTION_DATE_FORMAT)
}

export function PhotoCaption({ photo }: PhotoCaptionProps): JSX.Element {
  return (
    <div className="px-10 pt-24 pb-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700">
      <p className="text-3xl font-medium tracking-tight text-white drop-shadow-md">
        {photo.uploaderName}
      </p>
      <p className="mt-1 text-base text-white/70 tabular-nums">{formatDate(photo.createdAt)}</p>
    </div>
  )
}
```

- [ ] **Step 5: Write `PhotoSlide`**

Create `client/src/components/frame/PhotoSlide.tsx`:

```tsx
import type { JSX } from 'react'
import { CarouselItem } from '@/components/ui/carousel.tsx'
import { cn } from '@/lib/utils.ts'
import type { Photo } from '@/photo.ts'

type PhotoSlideProps = {
  photo: Photo
  isCurrent: boolean
}

export function PhotoSlide({ photo, isCurrent }: PhotoSlideProps): JSX.Element {
  return (
    <CarouselItem
      // The Ken Burns zoom must not spill onto the neighbouring slide.
      className="overflow-hidden"
    >
      <img
        className={cn(
          'h-svh w-full object-contain drop-shadow-2xl',
          // Only the photo on screen drifts, so each photo starts its zoom when it arrives.
          isCurrent && 'motion-safe:animate-ken-burns',
        )}
        src={photo.url}
        alt={`Envoyée par ${photo.uploaderName}`}
        // The photo on screen loads first; the others wait until the carousel nears them.
        loading={isCurrent ? 'eager' : 'lazy'}
        fetchPriority={isCurrent ? 'high' : 'auto'}
      />
    </CarouselItem>
  )
}
```

- [ ] **Step 6: Let the strip take clicks inside the overlay**

The overlay of Step 7 ignores pointer events so swipes reach the carousel; the strip turns them back on, and its height now comes from its thumbnails.

In `client/src/components/frame/PhotoStrip.tsx`, replace

```tsx
    <ul className="flex h-[20svh] items-center gap-2 overflow-x-auto px-4">
```

with

```tsx
    <ul className="pointer-events-auto flex items-center gap-2 overflow-x-auto px-4 pb-4">
```

- [ ] **Step 7: Rewrite `PhotoView` in layers**

Replace the whole content of `client/src/components/frame/PhotoView.tsx`:

```tsx
import { type JSX, useState } from 'react'
import { PhotoBackdrop } from '@/components/frame/PhotoBackdrop.tsx'
import { PhotoCaption } from '@/components/frame/PhotoCaption.tsx'
import { PhotoSlide } from '@/components/frame/PhotoSlide.tsx'
import { PhotoStrip } from '@/components/frame/PhotoStrip.tsx'
import { Carousel, type CarouselApi, CarouselContent } from '@/components/ui/carousel.tsx'
import { useCarouselArrowKeys } from '@/hooks/useCarouselArrowKeys.ts'
import { useCarouselPhoto } from '@/hooks/useCarouselPhoto.ts'
import { useSlideshow } from '@/hooks/useSlideshow.ts'
import type { Photo } from '@/photo.ts'

// Embla's default (25) is a quick flick; a frame on a wall should glide.
const GLIDING_SLIDE = { duration: 45 }

type PhotoViewProps = {
  photos: Photo[]
  currentId: string
  isStripVisible: boolean
  // null: no automatic advance.
  autoAdvanceMs: number | null
  onCurrentChange: (id: string) => void
}

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
  const currentPhoto = photos.find(({ id }) => id === currentId)

  return (
    // clip, not hidden: the scaled backdrop overflows, and a hidden box can still be scrolled.
    <div className="relative isolate h-svh overflow-clip">
      {currentPhoto && <PhotoBackdrop key={currentPhoto.id} url={currentPhoto.thumbnailUrl} />}
      <Carousel setApi={setApi} opts={GLIDING_SLIDE}>
        <CarouselContent>
          {photos.map((photo) => (
            <PhotoSlide key={photo.id} photo={photo} isCurrent={photo.id === currentId} />
          ))}
        </CarouselContent>
      </Carousel>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 via-black/30 to-transparent">
        {currentPhoto && <PhotoCaption key={currentPhoto.id} photo={currentPhoto} />}
        {isStripVisible && (
          <PhotoStrip photos={photos} currentId={currentId} onSelect={onCurrentChange} />
        )}
      </div>
    </div>
  )
}
```

`key={currentPhoto.id}` remounts the backdrop and the caption on each change, which replays their enter animation. `formatDate` and `cn` leave this file (they moved to `PhotoCaption` and `PhotoSlide`).

- [ ] **Step 8: Paint the frame with its own background**

In `client/src/pages/FramePage.tsx`, replace

```tsx
const FRAME_CLASSES = 'dark min-h-svh bg-background text-foreground'
```

with

```tsx
const FRAME_CLASSES = 'dark min-h-svh bg-frame-background text-foreground'
```

- [ ] **Step 9: Check, typecheck, build**

Run: `pnpm check`, then `pnpm typecheck`, then `pnpm build`
Expected: Biome `No fixes applied.`, `client typecheck: Done`, Vite `✓ built in …`.

- [ ] **Step 10: Commit**

```bash
git add client/src/index.css client/src/components/frame/PhotoBackdrop.tsx client/src/components/frame/PhotoCaption.tsx client/src/components/frame/PhotoSlide.tsx client/src/components/frame/PhotoStrip.tsx client/src/components/frame/PhotoView.tsx client/src/pages/FramePage.tsx
git commit -F <scratchpad>/commit-photo-backdrop.txt
```

Message: `feat(client): give the frame photo a warm backdrop and readable caption`

- [ ] **Step 11: Manual check in Chrome (controller)**

On `http://localhost:5181/frame`:

1. A portrait photo: the side bars show the photo's colours, blurred and dark; no flat black.
2. Wait for a slide change: the backdrop fades in, the caption rises in, the slide glides more slowly than before.
3. The name reads from 2–3 m; the date reads like "23 novembre 2026", with no time.
4. Over 10 s the photo zooms in slowly and never covers the next slide during the move.
5. DevTools Network: the backdrop loads the thumbnail URL; the current slide has priority "High".
6. Strip on: the caption sits above the strip, the photo keeps its full height, thumbnails are clickable, a swipe on the caption area still changes the photo.
7. Reduced motion emulated: no zoom, no fade, no rise.
8. `http://localhost:5181/`, light and dark system mode: the upload page keeps its own colours.

- [ ] **Step 12: Submit and write the PR body**

Run: `gh stack submit --auto`, then `gh pr edit <N> --body-file <file>`. French body:

- **Pourquoi**: le cadre faisait « écran qui affiche un JPEG » : bandes noires, légende illisible à distance, image figée.
- **Ce qui change**: fond flouté de la photo courante (vignette, ~19 Ko), légende en grand avec une date lisible, lent zoom Ken Burns, glissement plus doux, palette chaude propre au cadre.
- **Guidage review**: les jetons `--frame-*` (pas `.dark`, partagé avec la page d'envoi), `key={currentPhoto.id}` pour rejouer les animations, `overflow-clip`, le bandeau qui flotte déjà dans cette PR.
- **Vérifier**: la liste de l'étape 11.

---

### Task 3: Glass pill and clean strip (PR B)

**Files:**

- Create: `client/src/components/frame/pillToggleClasses.ts`
- Create: `client/src/components/frame/ControlsDivider.tsx`
- Modify: `client/src/components/frame/FrameControls.tsx` (full rewrite)
- Modify: `client/src/components/frame/ViewToggles.tsx` (full rewrite)
- Create: `client/src/components/frame/StripToggle.tsx`
- Modify: `client/src/components/frame/SlideshowControls.tsx` (full rewrite)
- Modify: `client/src/components/frame/PhotoStrip.tsx` (full rewrite)
- Modify: `client/src/pages/FramePage.tsx`

**Interfaces:**

- Consumes:
  - `Toggle`, `ToggleGroup`, `ToggleGroupItem` from `@/components/ui/*` (default ghost variant, classes merged by `cn`).
  - `--frame-accent` (`ring-frame-accent`) from Task 2.
  - `SLIDESHOW_INTERVALS_MS` from `@/hooks/useSlideshow.ts`.
- Produces:
  - `PILL_TOGGLE_CLASSES: string` from `@/components/frame/pillToggleClasses.ts`
  - `ControlsDivider(): JSX.Element`
  - `FrameControls({ isVisible: boolean, children: ReactNode }): JSX.Element` (same props)
  - `ViewToggles({ view: FrameView, onViewChange: (view: FrameView) => void }): JSX.Element` (was four props)
  - `StripToggle({ isStripVisible: boolean, onStripVisibleChange: (isVisible: boolean) => void }): JSX.Element`
  - `SlideshowControls`: same four props.
  - `PhotoStrip`: same three props.
  - `FrameView` stays exported from `@/components/frame/ViewToggles.tsx`.

- [ ] **Step 1: Create the stack layer**

Run: `gh stack add feat/frame-controls-pill`
Expected: `✓ Created and checked out branch "feat/frame-controls-pill"`

- [ ] **Step 2: Shared pill toggle classes and the divider**

Do not start a dev server: the controller runs it (see Dev environment).

Create `client/src/components/frame/pillToggleClasses.ts`:

```ts
// The shadcn toggles stay as generated: the pill restyles them through className.
export const PILL_TOGGLE_CLASSES =
  'rounded-full px-3 text-white/80 hover:bg-white/10 hover:text-white aria-pressed:bg-white/15 aria-pressed:text-white data-[state=on]:bg-white/15 data-[state=on]:text-white'
```

`cn` (tailwind-merge compatible) lets these override the generated `rounded-lg`, `px-2.5`, `hover:bg-muted`, `aria-pressed:bg-muted` and `data-[state=on]:bg-muted`. `aria-pressed:` covers `Toggle`; `data-[state=on]:` covers the radio-like `ToggleGroupItem`.

Create `client/src/components/frame/ControlsDivider.tsx`:

```tsx
import type { JSX } from 'react'

export function ControlsDivider(): JSX.Element {
  return <span aria-hidden className="mx-1 h-5 w-px bg-white/15" />
}
```

- [ ] **Step 3: Turn `FrameControls` into the glass pill**

Do not start a dev server: the controller runs it (see Dev environment).

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
        'fixed top-6 right-6 flex items-center gap-1 rounded-full bg-black/45 p-1.5 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl',
        'transition-[opacity,translate] ease-out motion-reduce:transition-none',
        // Leaving is faster than arriving, so the photo comes back quickly.
        isVisible
          ? 'opacity-100 duration-300'
          : 'pointer-events-none -translate-y-3 opacity-0 duration-200',
      )}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Split the strip toggle out of `ViewToggles`**

Replace the whole content of `client/src/components/frame/ViewToggles.tsx`:

```tsx
import { ImageIcon, LayoutGridIcon } from 'lucide-react'
import type { JSX } from 'react'
import { PILL_TOGGLE_CLASSES } from '@/components/frame/pillToggleClasses.ts'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'

export type FrameView = 'photo' | 'contact-sheet'

function isFrameView(value: string): value is FrameView {
  return value === 'photo' || value === 'contact-sheet'
}

type ViewTogglesProps = {
  view: FrameView
  onViewChange: (view: FrameView) => void
}

export function ViewToggles({ view, onViewChange }: ViewTogglesProps): JSX.Element {
  return (
    <ToggleGroup
      type="single"
      value={view}
      // Radix sends '' when the pressed item is clicked again: keep the current view.
      onValueChange={(value) => {
        if (isFrameView(value)) onViewChange(value)
      }}
      aria-label="Affichage"
    >
      <ToggleGroupItem value="photo" className={PILL_TOGGLE_CLASSES}>
        <ImageIcon /> Photo
      </ToggleGroupItem>
      <ToggleGroupItem value="contact-sheet" className={PILL_TOGGLE_CLASSES}>
        <LayoutGridIcon /> Pellicule
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
```

Create `client/src/components/frame/StripToggle.tsx`:

```tsx
import { GalleryHorizontalIcon } from 'lucide-react'
import type { JSX } from 'react'
import { PILL_TOGGLE_CLASSES } from '@/components/frame/pillToggleClasses.ts'
import { Toggle } from '@/components/ui/toggle.tsx'

type StripToggleProps = {
  isStripVisible: boolean
  onStripVisibleChange: (isVisible: boolean) => void
}

export function StripToggle({
  isStripVisible,
  onStripVisibleChange,
}: StripToggleProps): JSX.Element {
  return (
    <Toggle
      pressed={isStripVisible}
      onPressedChange={onStripVisibleChange}
      aria-label="Bandeau de vignettes"
      // An icon alone is a riddle: the tooltip names it.
      title="Vignettes"
      className={PILL_TOGGLE_CLASSES}
    >
      <GalleryHorizontalIcon />
    </Toggle>
  )
}
```

- [ ] **Step 5: Restyle `SlideshowControls`**

Replace the whole content of `client/src/components/frame/SlideshowControls.tsx`:

```tsx
import { PauseIcon, PlayIcon } from 'lucide-react'
import type { JSX } from 'react'
import { ControlsDivider } from '@/components/frame/ControlsDivider.tsx'
import { PILL_TOGGLE_CLASSES } from '@/components/frame/pillToggleClasses.ts'
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
        pressed={isPlaying}
        onPressedChange={onPlayingChange}
        aria-label="Diaporama"
        className={PILL_TOGGLE_CLASSES}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </Toggle>
      <ControlsDivider />
      <ToggleGroup
        type="single"
        value={String(intervalMs)}
        // Radix sends '' when the pressed item is clicked again: keep the current pace.
        onValueChange={(value) => {
          const selectedMs = Number(value)
          if (SLIDESHOW_INTERVALS_MS.includes(selectedMs)) onIntervalChange(selectedMs)
        }}
        aria-label="Durée par photo"
      >
        {SLIDESHOW_INTERVALS_MS.map((interval) => (
          <ToggleGroupItem key={interval} value={String(interval)} className={PILL_TOGGLE_CLASSES}>
            {interval / MS_PER_SECOND} s
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </>
  )
}
```

- [ ] **Step 6: Clean strip with a centred current thumbnail**

Replace the whole content of `client/src/components/frame/PhotoStrip.tsx`:

```tsx
import type { JSX } from 'react'
import type { Photo } from '@/photo.ts'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

type PhotoStripProps = {
  photos: Photo[]
  currentId: string
  onSelect: (id: string) => void
}

// The slideshow moves on its own: keep its photo in sight in the strip.
function scrollIntoCenter(thumbnail: HTMLLIElement | null): void {
  const isMotionReduced = window.matchMedia(REDUCED_MOTION_QUERY).matches
  thumbnail?.scrollIntoView({
    inline: 'center',
    block: 'nearest',
    behavior: isMotionReduced ? 'instant' : 'smooth',
  })
}

export function PhotoStrip({ photos, currentId, onSelect }: PhotoStripProps): JSX.Element {
  return (
    <ul className="pointer-events-auto flex items-center gap-3 overflow-x-auto px-6 pt-2 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {photos.map((photo) => (
        <li
          key={photo.id}
          // React calls a callback ref when it lands on another item: on each new current photo.
          ref={photo.id === currentId ? scrollIntoCenter : undefined}
          className="shrink-0"
        >
          <button
            type="button"
            onClick={() => onSelect(photo.id)}
            aria-current={photo.id === currentId}
            className="block rounded-lg opacity-50 outline-none transition duration-300 hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:scale-110 aria-[current=true]:opacity-100 aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent motion-reduce:transition-none"
          >
            <img
              className="size-20 rounded-lg object-cover shadow-lg"
              src={photo.thumbnailUrl}
              alt={`Envoyée par ${photo.uploaderName}`}
              loading="lazy"
              decoding="async"
            />
          </button>
        </li>
      ))}
    </ul>
  )
}
```

`pt-2 pb-6` leave room for the `scale-110` and the ring: `overflow-x-auto` also clips vertically.

- [ ] **Step 7: Compose the pill in `FramePage`**

In `client/src/pages/FramePage.tsx`:

Add the imports (keep them sorted, Biome checks it):

```tsx
import { ControlsDivider } from '@/components/frame/ControlsDivider.tsx'
import { StripToggle } from '@/components/frame/StripToggle.tsx'
```

Replace the block

```tsx
      <FrameControls isVisible={isActive}>
        <ViewToggles
          view={selection.view}
          isStripVisible={isStripVisible}
          onViewChange={selection.setView}
          onStripVisibleChange={setIsStripVisible}
        />
        {selection.view === 'photo' && (
          <SlideshowControls
            isPlaying={isPlaying}
            intervalMs={intervalMs}
            onPlayingChange={setIsPlaying}
            onIntervalChange={setIntervalMs}
          />
        )}
      </FrameControls>
```

with

```tsx
      <FrameControls isVisible={isActive}>
        <ViewToggles view={selection.view} onViewChange={selection.setView} />
        {selection.view === 'photo' && (
          <>
            <ControlsDivider />
            <StripToggle isStripVisible={isStripVisible} onStripVisibleChange={setIsStripVisible} />
            <ControlsDivider />
            <SlideshowControls
              isPlaying={isPlaying}
              intervalMs={intervalMs}
              onPlayingChange={setIsPlaying}
              onIntervalChange={setIntervalMs}
            />
          </>
        )}
      </FrameControls>
```

- [ ] **Step 8: Check, typecheck, build**

Run: `pnpm check`, then `pnpm typecheck`, then `pnpm build`
Expected: Biome `No fixes applied.`, `client typecheck: Done`, Vite `✓ built in …`.

- [ ] **Step 9: Commit**

```bash
git add client/src/components/frame/pillToggleClasses.ts client/src/components/frame/ControlsDivider.tsx client/src/components/frame/FrameControls.tsx client/src/components/frame/ViewToggles.tsx client/src/components/frame/StripToggle.tsx client/src/components/frame/SlideshowControls.tsx client/src/components/frame/PhotoStrip.tsx client/src/pages/FramePage.tsx
git commit -F <scratchpad>/commit-controls-pill.txt
```

Message: `feat(client): group the frame controls in a glass pill and clean up the strip`

- [ ] **Step 10: Manual check in Chrome (controller)**

On `http://localhost:5181/frame`:

1. Move the mouse: one rounded glass pill, groups separated by thin rules (view | strip | play | pace). It hides faster than it shows.
2. The selected view and pace are filled chips, readable from a distance.
3. Hover the strip icon: tooltip "Vignettes".
4. Strip on: no scrollbar; the current thumbnail is ringed in amber and slightly larger; others are dimmer.
5. Let the slideshow run with the strip on and many photos: the current thumbnail stays centred, and the photo above does not shift.
6. Pellicule: only Photo/Pellicule show in the pill, no stray divider.
7. Hidden controls: Tab reaches none of them (inert).
8. Reduced motion emulated: the strip jumps to the current thumbnail without smooth scrolling.

- [ ] **Step 11: Submit and write the PR body**

Run: `gh stack submit --auto`, then `gh pr edit <N> --body-file <file>`. French body:

- **Pourquoi**: sept boutons encadrés façon barre d'outils d'admin, une barre de défilement native sous les vignettes.
- **Ce qui change**: une seule pilule en verre avec séparateurs, boutons « fantômes » avec une pastille pleine pour l'état actif, bandeau sans barre de défilement, vignette courante en ambre et centrée automatiquement.
- **Guidage review**: `PILL_TOGGLE_CLASSES` (shadcn intact, styles par `className`), `StripToggle` sorti de `ViewToggles` (limite de 30 lignes), la ref callback de `PhotoStrip` à la place d'un `useEffect`.
- **Vérifier**: la liste de l'étape 10.

---

### Task 4: Contact sheet, badge, empty state (PR C)

**Files:**

- Modify: `client/src/components/frame/ContactSheet.tsx` (full rewrite)
- Modify: `client/src/components/frame/NewPhotosBadge.tsx` (full rewrite)
- Modify: `client/src/pages/FramePage.tsx`

**Interfaces:**

- Consumes:
  - `selection.currentId: string` (narrowed after the empty-state return), `selection.newPhotoCount`, `selection.openPhoto`, `selection.showNewest` from `useFrameSelection`.
  - `Badge` from `@/components/ui/badge.tsx` (`asChild`).
  - `bg-frame-accent`, `ring-frame-accent`, `ring-offset-frame-background`, `text-frame-accent` from Task 2.
- Produces:
  - `ContactSheet({ photos: Photo[], currentId: string, onSelect: (id: string) => void }): JSX.Element` (gains `currentId`)
  - `NewPhotosBadge({ count: number, onSelect: () => void }): JSX.Element` (same props, now rendered at any count)

- [ ] **Step 1: Create the stack layer**

Run: `gh stack add feat/frame-sheet-polish`
Expected: `✓ Created and checked out branch "feat/frame-sheet-polish"`

- [ ] **Step 2: Contact sheet as a gallery**

Do not start a dev server: the controller runs it (see Dev environment).

Replace the whole content of `client/src/components/frame/ContactSheet.tsx`:

```tsx
import type { JSX } from 'react'
import type { Photo } from '@/photo.ts'

type ContactSheetProps = {
  photos: Photo[]
  currentId: string
  onSelect: (id: string) => void
}

export function ContactSheet({ photos, currentId, onSelect }: ContactSheetProps): JSX.Element {
  return (
    // pt-24 keeps the first row clear of the controls pill.
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4 p-8 pt-24">
      {photos.map((photo) => (
        <li key={photo.id}>
          <button
            type="button"
            onClick={() => onSelect(photo.id)}
            aria-current={photo.id === currentId}
            className="group relative block w-full overflow-hidden rounded-xl outline-none ring-offset-4 ring-offset-frame-background focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
          >
            <img
              className="aspect-square w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
              src={photo.thumbnailUrl}
              alt={`Envoyée par ${photo.uploaderName}`}
              loading="lazy"
              decoding="async"
            />
            <span className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/75 to-transparent px-3 pt-8 pb-2 text-left text-sm font-medium text-white">
              {photo.uploaderName}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 3: Badge as an accent pill in a live region**

Do not start a dev server: the controller runs it (see Dev environment).

Replace the whole content of `client/src/components/frame/NewPhotosBadge.tsx`:

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
    // The live region stays mounted: screen readers only announce changes to one that exists.
    <div aria-live="polite" className="fixed top-6 left-1/2 -translate-x-1/2">
      {count > 0 && (
        <Badge
          asChild
          className="h-auto gap-2 rounded-full bg-frame-accent px-5 py-2 text-base font-medium text-black shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4 motion-safe:duration-500"
        >
          <button type="button" onClick={onSelect}>
            <span
              aria-hidden
              className="size-2 rounded-full bg-black/70 motion-safe:animate-pulse"
            />
            {newPhotosLabel(count)}
          </button>
        </Badge>
      )}
    </div>
  )
}
```

`h-auto`, `rounded-full`, `bg-frame-accent`, `px-5 py-2` and `text-base` override the generated `h-5`, `rounded-4xl`, `bg-primary`, `px-2 py-0.5` and `text-xs` through `cn`.

- [ ] **Step 4: Empty state, current tile and badge in `FramePage`**

In `client/src/pages/FramePage.tsx`:

Add the import at the top (before `react`, Biome sorts it there):

```tsx
import { ImagesIcon } from 'lucide-react'
```

Replace `EmptyFrame`:

```tsx
function EmptyFrame(): JSX.Element {
  return (
    <main className={FRAME_CLASSES}>
      <p className="pt-[40vh] text-center text-muted-foreground">
        En attente de la première photo…
      </p>
    </main>
  )
}
```

with

```tsx
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
```

Replace

```tsx
        <ContactSheet photos={photos} onSelect={selection.openPhoto} />
```

with

```tsx
        <ContactSheet
          photos={photos}
          currentId={selection.currentId}
          onSelect={selection.openPhoto}
        />
```

Replace

```tsx
      {selection.newPhotoCount > 0 && (
        <NewPhotosBadge count={selection.newPhotoCount} onSelect={selection.showNewest} />
      )}
```

with

```tsx
      <NewPhotosBadge count={selection.newPhotoCount} onSelect={selection.showNewest} />
```

The upload page lives at `/` (`App.tsx`), so the host alone is the address to type on a phone.

- [ ] **Step 5: Check, typecheck, build**

Run: `pnpm check`, then `pnpm typecheck`, then `pnpm build`
Expected: Biome `No fixes applied.`, `client typecheck: Done`, Vite `✓ built in …`.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/frame/ContactSheet.tsx client/src/components/frame/NewPhotosBadge.tsx client/src/pages/FramePage.tsx
git commit -F <scratchpad>/commit-sheet-polish.txt
```

Message: `feat(client): polish the contact sheet, new-photos badge and empty state`

- [ ] **Step 7: Manual check in Chrome (controller)**

On `http://localhost:5181/frame`:

1. Pellicule: margins around the grid, the first row clear of the pill, names on the photos, hover zooms a tile.
2. Open a photo, go back to Pellicule: that photo has the amber ring.
3. Keep the frame active and send a photo (`curl` above): the amber badge slides in with a pulsing dot; DevTools Accessibility tree shows the live region with the count. Click it: back to the newest photo.
4. Reduced motion emulated: no hover zoom, no badge slide, no pulse.
5. With an empty database (or the API stopped and restarted on an empty one, controller's call): the empty state shows the icon, "En attente de la première photo…" and "Envoyez-en une depuis votre téléphone : localhost:5181".

- [ ] **Step 8: Submit and write the PR body**

Run: `gh stack submit --auto`, then `gh pr edit <N> --body-file <file>`. French body:

- **Pourquoi**: la planche contact ressemblait à un tableur, le badge passait inaperçu, l'écran vide ne disait pas quoi faire.
- **Ce qui change**: planche aérée avec noms sur les photos et repère ambre sur la photo courante, badge ambre annoncé aux lecteurs d'écran, écran vide qui explique comment envoyer une photo.
- **Guidage review**: `NewPhotosBadge` toujours monté (région `aria-live`), `currentId` passé à `ContactSheet`.
- **Vérifier**: la liste de l'étape 7.

---

## Drift Log

Format: `date · task/step · what the plan said · what was done · why`.
