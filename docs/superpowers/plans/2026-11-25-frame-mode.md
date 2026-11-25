---
plan: frame-mode
status: draft
spec: docs/superpowers/specs/2026-11-25-frame-mode-design.md
branch: feat/frame-fullscreen (PR A), feat/frame-playback (PR B), feat/frame-templates (PR C), feat/settings-frame-card (PR D)
worktree: false
tasks_total: 7
tasks_done: 0
current_task: none
last_commit: none
last_updated: 2026-11-25
---

# Frame Mode (Step 8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Working agreement (mandatory):** keep this plan in sync with reality. Check a step only when it is finished and its gate is green. Append every divergence to the Drift Log. Update the frontmatter (`tasks_done`, `current_task`, `last_commit`, `last_updated`) at each task boundary. When a drift produces a durable correction (path, command, signature, decision), amend the affected task block in place and log the amendment: implementers only receive their own task block. Never check a partial step; never delete a finished step or a drift entry. Under subagent-driven development, `.superpowers/sdd/progress.md` is the runtime authority; the frontmatter mirrors it.

**Goal:** The frame becomes a real wall frame. Opening it from the app (« Cadre » in the bar, « Mode cadre » in the library or the viewer) goes full screen in the same click, and leaving full screen by any means (✕, Échap, F11, a gesture) leaves the frame; a frame opened directly on `/frame` gets a « Plein écran » button. Its menu « … » chooses the display template (« Ajusté », « Plein format », « Passe-partout », « Polaroïd »), the playback order (« Dans l'ordre », « Aléatoire ») and the speed, remembered per device in this browser; the same three settings live in « Préférences », card « Cadre de cet appareil ». Client only: no API, Bruno or server change.

**Architecture:** `client/src/fullscreen.ts` wraps the Fullscreen API (availability, enter, exit, refusals ignored). The three entries call `enterFullscreen()` in their click handler; `useFrameFullscreen` (in the new `useFrameMode`, which takes the state wiring out of `FramePage`) leaves the frame on `fullscreenchange` and exits full screen on unmount. `FullscreenButton` reads the state through `useIsFullscreen` (`useSyncExternalStore`). `client/src/frameSettings.ts` validates and stores `{ template, order, intervalMs }` under `familyframe.frame-settings`; `useFrameSettings` holds them and follows the `storage` event; `useSlideshowSettings` adds the in-memory pause and strip. `usePlaybackPhotos` reorders the feed for the carousel with the pure helpers of `shuffleOrder.ts` (Fisher-Yates, arrivals after the shown photo, reshuffle when the round wraps). Templates are class tables (`templateClasses.ts`) read by `PhotoSlide` and `PhotoView`, plus `PolaroidPrint`. The menu's submenus are one generic `RadioSubmenu`; the settings card uses a single-choice `ToggleGroup` (`SettingToggleGroup`). Four PRs stacked on `feat/client-settings`.

**Tech Stack:** React 19.3 (`useEffectEvent`, `useSyncExternalStore`, `useId`), react-router 7, Vite 8, TypeScript 7 (`tsc -b`), Tailwind 4.3 (arbitrary values, `bg-radial`), shadcn/ui radix-nova on the installed `radix-ui` 1.8 (`dropdown-menu`, `toggle-group`, `card`), embla-carousel-react 8.6, lucide-react 1.78 (`MaximizeIcon`, `ShuffleIcon`, `TimerIcon`, `FrameIcon`), Biome 2.6, lefthook + commitlint, `gh stack`.

## Global Constraints

- **No new dependency.** Everything used is installed. **Never run `shadcn` or any other CLI that might add dependencies or files**: `components/ui/toggle-group.tsx` and `dropdown-menu.tsx` already exist; there is no `radio-group` and none is added.
- **Client only.** No file under `server/` changes, no Bruno change. `pnpm test` stays at the baseline: `Test Files  19 passed (19)`, `Tests  219 passed (219)`.
- **No client test runner:** client tasks are verified by the gate `pnpm check && pnpm typecheck && pnpm --filter client build && pnpm test` and the task's **Chrome check**, run by the controller.
- **Dev servers:** implementers never start, stop or restart anything on **5180** or **3000** (the author's servers). If an implementer needs a client, `pnpm --filter client exec vite --port 5182 --strictPort`, stopped afterwards (on Windows, check that no `node` is left on 5182 and kill only that PID).
- **Never read or print a `.env` file.** A command containing both a reader word (`grep`, `cat`…) and `.env` is blocked by the hook: pass long text through a file.
- **Never run `pnpm db:seed`.** Test photos made during Chrome checks are removed by hand.
- **Commits:** `git commit -F <message-file>`; every message ends, after a blank line, with exactly:

  ```
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Hm8u1MNisEcmacs5tNKshr
  ```

  `git commit` runs Biome (pre-commit) and commitlint (commit-msg): a failing hook means the commit did not happen. **Never `--no-verify`.** Each commit passes `pnpm check` and `pnpm typecheck`.
- **Docs in the same commit as the behaviour** (AGENTS.md): `ARCHITECTURE.md`, `README.md` and `docs/produit/` (French, no technical terms, sections « Ce que l'on peut faire » / « Règles » / « Messages affichés » / « Ce qui n'est pas possible »). Rule ids `R-<DOMAINE>-<NN>` are **never reused or renumbered**: a new rule takes the next free number of its domain (`R-CAD` is at 57 before this step, `R-PRF` at 44); a changed rule keeps its id and becomes « Remplacée : … (R-XXX-NN) ». The list item numbers (`1.`, `2.`…) are the position in the list and are renumbered freely. Each delivered item leaves `docs/produit/a-venir.md` « Étape 8 · Mode cadre » in the task that delivers it.
- **UI text (French, exact):** every string is written out in the task that adds it.
- **TypeScript (AGENTS.md):** no `as` casts, explicit return types on exported functions, literal unions rather than `enum`.
- **Code rules (`.claude/rules/`):** comment why, never what; no file-summary comments; name callback params after the item; no magic numbers; every function at most 30 lines, every file at most 300 lines; max 5 params; no flag parameters; booleans prefixed `is`/`has`/`should`; catch errors as `unknown`.
- Client imports use the `@/` alias with the `.ts`/`.tsx` extension, except the generated `components/ui/*` files.
- **Language:** code, comments and commits in English; UI text, README, ARCHITECTURE and `docs/produit/` in French.

## Choices made while planning (not in the spec, or resolving a conflict with the code or the rules)

1. **✕ leaves directly.** The spec has ✕ exit full screen and let the `fullscreenchange` listener leave. Here ✕ and « Retour à la bibliothèque » call `leave()` as today, and the unmount exits full screen (its listener is removed first, so the frame is not left twice). Same result, one path; `CloseButton` is unchanged, and it also works where full screen does not exist.
2. **`useFrameFullscreen`, not `useFullscreenExit`.** The spec's hook also has to do « the frame exits full screen on unmount »: one hook owns both ends of full screen.
3. **`useFrameMode` extracted from `FramePage`** (refactor commit in Task 1): the page was 41 lines before the step and would grow with each task. `FramePage` drops to 30 lines.
4. **Deleted photo in shuffle:** the spec says « the next in the order takes its place, same as in order », but in order the rule is R-CAD-29 (go to the newest). R-CAD-29 is kept in both orders; the deleted photo also leaves the shuffled order (R-CAD-65).
5. **Polaroid tilt from the photo id**, not its position: « from its position » contradicts « the same photo always keeps its tilt » (an arrival shifts every position). The sum of the id's character codes, even → left.
6. **Settings card in `preferences.md`.** Step 6 created `docs/produit/preferences.md` (rules up to R-PRF-44). The card's rules go there as R-PRF-50..52 (a new section, leaving room after the password block), and `cadre.md` links to it. No R-CAD rule for the card.
7. **No radio-group component:** a single-choice `ToggleGroup` (`type="single"`). Radix renders its root as `role="radiogroup"` and its items as `role="radio"` with `aria-checked` (checked in `radix-ui` dist), so screen readers announce a choice; pressing the chosen item again sends `''`, which `optionSelector` ignores.
8. **Template stored from PR B, rendered from PR C** (spec order): Task 3 stores `template` with the others; Task 5 renders it (checked by setting `localStorage` by hand); Task 6 adds « Affichage » and the product docs, the first user-visible change.
9. **`SLIDESHOW_INTERVALS_MS` moves to `frameSettings.ts`**; `DEFAULT_SLIDESHOW_INTERVAL_MS` is replaced by `DEFAULT_FRAME_SETTINGS.intervalMs` (both leave `useSlideshow.ts`).
10. **R-CAD-22 « Remplacée »**: it says the next photo is always the older one, wrong in « Aléatoire ». R-CAD-64 restates the in-order loop and adds the shuffle. R-CAD-04 (« des plus récentes aux plus anciennes ») is kept: it is the default order.
11. **Escape outside full screen is unchanged** (`useEscapeToClose` still leaves the frame), so a frame without full screen keeps its keyboard way out.
12. **Known limits, accepted:** Ctrl/Cmd-click on an entry still asks full screen in the current tab; a manual swipe from the last photo of the round to the first also draws a new round; StrictMode's dev double effect would exit full screen if it were already granted at mount (in practice `requestFullscreen` resolves after the commit: the Chrome check of Task 1 waits one second and checks full screen is still on; a failure goes to the Drift Log).
13. **Pre-existing over-30 functions, left as they are:** `SlideshowScreen` (39 → 40, one prop), `useViewerParam` (33 → 34, one call), `useFrameSelection` (54, untouched). Improved: `PhotoView` 43 → 30, `FramePage` 41 → 30, `MobileNav` (the links move to `MobileNavLinks`).

### Verified behavior

- Throwaway implementation of every task in a scratch copy of `client/` (base: the files of `feat/client-settings` at `f963c8e`, identical except `MobileNav.tsx`, whose real version is used in Task 1's diff): each task state passed `tsc -p tsconfig.app.json` and `biome check`, and `vite build` passed at the end. Code blocks below are the Biome-formatted results. Diff hunks show no line numbers: apply them by their context.
- Function lengths measured: every new or changed function is at most 30 lines, except those listed in Choice 13.
- `shuffleOrder.ts` simulated in Node: first draw, arrival (inserted after the shown photo, newest right after it for a batch), deletion (filtered out), wrap from last to first (new round starting with the photo on screen), no reshuffle on a plain advance.
- Radix `ToggleGroup type="single"`: root `role="radiogroup"`, items `role="radio"` (`radix-ui` 1.8.1 dist).
- Baseline on `feat/client-settings` (`f963c8e`): `Test Files  19 passed (19)`, `Tests  219 passed (219)`.
- Fullscreen API: an SPA navigation keeps the document full screen; `document.fullscreenEnabled` is `undefined` on iPhone Safari; `requestFullscreen` rejects outside a user gesture.

## File Map

| File | Task | Change |
| --- | --- | --- |
| `docs/superpowers/specs/2026-11-25-frame-mode-design.md`, `docs/superpowers/plans/2026-11-25-frame-mode.md` | 1 | spec and plan |
| `client/src/hooks/useFrameMode.ts` | 1, 4 | new: the frame page's state (feed, idle, settings, selection, leave, full screen, playback order) |
| `client/src/pages/FramePage.tsx` | 1 | uses `useFrameMode` |
| `client/src/fullscreen.ts` | 1 | new: Fullscreen API wrapper |
| `client/src/hooks/useFrameFullscreen.ts` | 1 | new: leave on full screen end, exit on unmount |
| `client/src/components/library/LibrarySection.tsx`, `hooks/useViewerParam.ts`, `components/nav/{navItems.ts,DesktopNav.tsx,MobileNav.tsx}` | 1 | entries ask full screen in the click |
| `client/src/hooks/useIsFullscreen.ts`, `components/frame/FullscreenButton.tsx` | 2 | new |
| `client/src/components/frame/{SlideshowTopBar,FrameStatusScreen}.tsx` | 2, 4 | « Plein écran » button; menu props |
| `client/src/frameSettings.ts`, `hooks/useFrameSettings.ts` | 3 | new: stored settings |
| `client/src/hooks/{useSlideshowSettings,useSlideshow}.ts` | 3 | settings from storage; constants moved |
| `client/src/shuffleOrder.ts`, `hooks/usePlaybackPhotos.ts` | 4 | new: shuffle |
| `client/src/components/frame/{frameSettingOptions.ts,RadioSubmenu.tsx}` | 4, 6 | new: options and generic submenu |
| `client/src/components/frame/SlideshowMenu.tsx` | 3, 4, 6 | « Lecture », « Vitesse », « Affichage » |
| `client/src/components/frame/{templateClasses.ts,PolaroidPrint.tsx}` | 5 | new |
| `client/src/components/frame/{PhotoSlide,PhotoView,SlideshowScreen}.tsx`, `index.css` | 5 | templates rendered |
| `client/src/components/settings/{SettingToggleGroup,FrameSettingsCard}.tsx`, `pages/SettingsPage.tsx` | 7 | settings card |
| `ARCHITECTURE.md`, `README.md` | 1-7 | Pages, frame paragraphs |
| `docs/produit/cadre.md` | 1-4, 6, 7 | R-CAD-58..70; R-CAD-21, 22, 26, 27 « Remplacée » |
| `docs/produit/preferences.md`, `docs/produit/README.md` | 6, 7 | glossary, card section R-PRF-50..52 |
| `docs/produit/a-venir.md` | 1, 3, 4, 6 | « Étape 8 » emptied, then removed |

## Stack and branches (controller only)

| PR | Branch | Base | Content |
| --- | --- | --- | --- |
| A | `feat/frame-fullscreen` | `feat/client-settings` | spec and plan commit, then Tasks 1-2 |
| B | `feat/frame-playback` | A | Tasks 3-4 |
| C | `feat/frame-templates` | B | Tasks 5-6 |
| D | `feat/settings-frame-card` | C | Task 7 |

`gh stack add <branch>` at each PR boundary (banners below). `feat/client-settings` is step 6's top branch: check it is the stack's current top (`gh stack view`) before `gh stack add feat/frame-fullscreen`.

---

## PR A — `feat/frame-fullscreen`

### Task 1: Full screen from the three entries; leaving full screen leaves the frame (PR A, `feat/frame-fullscreen`)

**Files:**
- Create: `docs/superpowers/specs/2026-11-25-frame-mode-design.md`, `docs/superpowers/plans/2026-11-25-frame-mode.md`
- Create: `client/src/hooks/useFrameMode.ts`, `client/src/fullscreen.ts`, `client/src/hooks/useFrameFullscreen.ts`
- Modify: `client/src/pages/FramePage.tsx`, `client/src/components/library/LibrarySection.tsx`, `client/src/hooks/useViewerParam.ts`, `client/src/components/nav/navItems.ts`, `client/src/components/nav/DesktopNav.tsx`, `client/src/components/nav/MobileNav.tsx`
- Modify: `ARCHITECTURE.md`, `README.md`, `docs/produit/cadre.md`, `docs/produit/a-venir.md`

**Interfaces:**
- Produces: `useFrameMode(): FrameMode` with `FrameMode = { photos, status, currentPhoto, isActive, settings, selection, leave }`; `isFullscreenAvailable(): boolean`, `isFullscreen(): boolean`, `enterFullscreen(): void`, `exitFullscreen(): void` in `@/fullscreen.ts`; `useFrameFullscreen(onExit: () => void): void`; `NavItem.onClick?: () => void`.

Three commits: the spec and the plan, a refactor, the feature.

- [ ] **Step 1: Commit the spec and the plan**

Copy the spec and this plan into the repo (sources: the controller's scratchpad, `2026-11-25-frame-mode-design.md` and `2026-11-25-frame-mode.md`):

```bash
cp "<scratchpad>/2026-11-25-frame-mode-design.md" docs/superpowers/specs/2026-11-25-frame-mode-design.md
cp "<scratchpad>/2026-11-25-frame-mode.md" docs/superpowers/plans/2026-11-25-frame-mode.md
git add docs/superpowers/specs/2026-11-25-frame-mode-design.md docs/superpowers/plans/2026-11-25-frame-mode.md
git commit -F <message-file>
```

Message subject: `docs: design and plan the frame mode step`. Body: « Full screen from the app, display templates, shuffle and per-device settings; four stacked PRs. » Then the attribution lines.

- [ ] **Step 2: Refactor: take the frame's state out of the page**

Create `client/src/hooks/useFrameMode.ts`:

```ts
import { useSearchParams } from 'react-router'
import { type FrameSelection, useFrameSelection } from '@/hooks/useFrameSelection.ts'
import { useIdle } from '@/hooks/useIdle.ts'
import { useLeaveFrame } from '@/hooks/useLeaveFrame.ts'
import { type FeedStatus, usePhotoFeed } from '@/hooks/usePhotoFeed.ts'
import { type SlideshowSettings, useSlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
import type { Photo } from '@/photo.ts'
import { PHOTO_PARAM } from '@/viewerHistory.ts'

// The controls step aside quickly: the photo is what the wall is for.
const CONTROLS_HIDE_DELAY_MS = 4000

export type FrameMode = {
  photos: Photo[]
  status: FeedStatus
  // undefined while there is no photo to show.
  currentPhoto: Photo | undefined
  isActive: boolean
  settings: SlideshowSettings
  selection: FrameSelection
  leave: () => void
}

export function useFrameMode(): FrameMode {
  const { photos, status } = usePhotoFeed()
  const isActive = useIdle(CONTROLS_HIDE_DELAY_MS)
  const settings = useSlideshowSettings()
  const [searchParams] = useSearchParams()
  // A paused photo was chosen by someone: a new arrival raises the badge instead of replacing it.
  const selection = useFrameSelection(
    photos,
    isActive || !settings.isPlaying,
    searchParams.get(PHOTO_PARAM),
  )
  const leaveFrame = useLeaveFrame()
  const currentPhoto = photos.find(({ id }) => id === selection.currentId)
  const leave = (): void => leaveFrame(currentPhoto?.id ?? null)

  return { photos, status, currentPhoto, isActive, settings, selection, leave }
}
```

Replace `client/src/pages/FramePage.tsx` with:

```tsx
import type { JSX } from 'react'
import { type FrameStatus, FrameStatusScreen } from '@/components/frame/FrameStatusScreen.tsx'
import { SlideshowScreen } from '@/components/frame/SlideshowScreen.tsx'
import { useFrameMode } from '@/hooks/useFrameMode.ts'
import type { FeedStatus } from '@/hooks/usePhotoFeed.ts'
import { cn } from '@/lib/utils.ts'

// The frame is a screen on a wall: dark keeps the photos in front.
const FRAME_CLASSES = 'dark min-h-svh bg-frame-background text-foreground'

// Reached only without photos: once loaded, that means an empty library.
function frameStatus(status: FeedStatus): FrameStatus {
  return status === 'loaded' ? 'empty' : status
}

export default function FramePage(): JSX.Element {
  const frame = useFrameMode()

  if (frame.currentPhoto === undefined) {
    return (
      <FrameStatusScreen
        status={frameStatus(frame.status)}
        className={FRAME_CLASSES}
        onLeave={frame.leave}
      />
    )
  }

  return (
    // data-idle: the slideshow's shade reads it from CSS, without one more prop down the tree.
    <main
      data-idle={!frame.isActive}
      className={cn('group/frame', FRAME_CLASSES, !frame.isActive && 'cursor-none')}
    >
      <SlideshowScreen
        photos={frame.photos}
        currentPhoto={frame.currentPhoto}
        selection={frame.selection}
        isActive={frame.isActive}
        settings={frame.settings}
        onClose={frame.leave}
      />
    </main>
  )
}
```

Before writing, compare with the current `FramePage.tsx`: the constant, the comments and the hook calls above are moved as they are. If the real page differs (a comment, a call), keep the real wording in `useFrameMode` and log it.

Gate: `pnpm check && pnpm typecheck && pnpm --filter client build && pnpm test` → green, `Tests  219 passed (219)`. Then `git add client/src/hooks/useFrameMode.ts client/src/pages/FramePage.tsx` and `git commit -F <message-file>`. Commit message: `refactor(client): move the frame page state into useFrameMode`, body « FramePage was over 30 lines and step 8 adds full screen and the playback order to it. », then the attribution lines.

- [ ] **Step 3: The Fullscreen API wrapper**

Create `client/src/fullscreen.ts`:

```ts
// undefined on iPhone Safari, which has no element full screen: frame mode then stays in the browser.
export function isFullscreenAvailable(): boolean {
  return document.fullscreenEnabled === true
}

export function isFullscreen(): boolean {
  return document.fullscreenElement instanceof Element
}

// A refused request (no user gesture, a browser setting) is no error for the user: the frame
// works in the window too.
function ignoreRefusal(_error: unknown): void {}

// Call it from a click handler: browsers grant full screen only during a user gesture.
export function enterFullscreen(): void {
  if (!isFullscreenAvailable() || isFullscreen()) return
  document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(ignoreRefusal)
}

export function exitFullscreen(): void {
  if (!isFullscreen()) return
  document.exitFullscreen().catch(ignoreRefusal)
}
```

- [ ] **Step 4: Leaving full screen leaves the frame**

Create `client/src/hooks/useFrameFullscreen.ts`:

```ts
import { useEffect, useEffectEvent } from 'react'
import { exitFullscreen, isFullscreen } from '@/fullscreen.ts'

// Full screen and frame mode go together. In full screen the browser keeps Escape for itself,
// so the end of full screen is the only sure sign the person wants out: Escape, F11, a gesture.
export function useFrameFullscreen(onExit: () => void): void {
  const exitFrame = useEffectEvent(onExit)

  useEffect(() => {
    function handleFullscreenChange(): void {
      if (!isFullscreen()) exitFrame()
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      // Removed first: the full screen exit below must not leave the frame a second time.
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      // The back button or a link left the frame: the library must not stay full screen.
      exitFullscreen()
    }
  }, [])
}
```

In `client/src/hooks/useFrameMode.ts`, wire it:

```diff
 import { useSearchParams } from 'react-router'
+import { useFrameFullscreen } from '@/hooks/useFrameFullscreen.ts'
 import { type FrameSelection, useFrameSelection } from '@/hooks/useFrameSelection.ts'
@@
   const leave = (): void => leaveFrame(currentPhoto?.id ?? null)
+  useFrameFullscreen(leave)
 
   return { photos, status, currentPhoto, isActive, settings, selection, leave }
```

- [ ] **Step 5: The entries ask full screen in the click**

`client/src/components/library/LibrarySection.tsx`:

```diff
--- a/client/src/components/library/LibrarySection.tsx
+++ b/client/src/components/library/LibrarySection.tsx
@@
 import { PhotoGrid } from '@/components/frame/PhotoGrid.tsx'
 import { PhotoList } from '@/components/frame/PhotoList.tsx'
 import { Button } from '@/components/ui/button.tsx'
+import { enterFullscreen } from '@/fullscreen.ts'
 import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'
 import { useLibraryLayout } from '@/hooks/useLibraryLayout.ts'
 import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
@@
           size="lg"
           className="rounded-full bg-frame-accent px-4 text-black hover:bg-frame-accent/85"
         >
-          {/* The state: leaving the frame comes back to this library entry. */}
-          <Link to="/frame" state={LIBRARY_BELOW_STATE}>
+          {/* The state: leaving the frame comes back to this library entry. Full screen is asked
+              on the click itself: browsers grant it only during a user gesture. */}
+          <Link to="/frame" state={LIBRARY_BELOW_STATE} onClick={enterFullscreen}>
             <PlayIcon data-icon="inline-start" />
             Mode cadre
           </Link>
```

`client/src/hooks/useViewerParam.ts` (`startFrame` is called from the viewer's ▶ click):

```diff
--- a/client/src/hooks/useViewerParam.ts
+++ b/client/src/hooks/useViewerParam.ts
@@
 import { useLocation, useNavigate, useSearchParams } from 'react-router'
+import { enterFullscreen } from '@/fullscreen.ts'
 import { isLibraryBelow, LIBRARY_BELOW_STATE, PHOTO_PARAM, photoPath } from '@/viewerHistory.ts'
 
 export type ViewerParam = {
@@
   // Replace, keeping the viewer's state: the frame takes the viewer's place above the library,
   // so leaving the frame brings back one viewer, not two.
   function startFrame(photoId: string): void {
+    enterFullscreen()
     navigate(photoPath('/frame', photoId), { replace: true, state: location.state })
   }
 
```

`client/src/components/nav/navItems.ts`:

```diff
--- a/client/src/components/nav/navItems.ts
+++ b/client/src/components/nav/navItems.ts
@@
 import { ImagesIcon, type LucideIcon, MonitorIcon, UserPlusIcon, UsersIcon } from 'lucide-react'
 import { useAuth } from '@/auth/AuthContext.ts'
+import { enterFullscreen } from '@/fullscreen.ts'
 
-export type NavItem = { to: string; label: string; icon: LucideIcon }
+// onClick runs in the click itself: the frame's full screen needs that user gesture.
+export type NavItem = { to: string; label: string; icon: LucideIcon; onClick?: () => void }
 
 const MEMBER_ITEMS: NavItem[] = [
   { to: '/', label: 'Ma bibliothèque', icon: ImagesIcon },
-  { to: '/frame', label: 'Cadre', icon: MonitorIcon },
+  { to: '/frame', label: 'Cadre', icon: MonitorIcon, onClick: enterFullscreen },
   { to: '/friends', label: 'Amis', icon: UsersIcon },
 ]
 const ADMIN_ITEM: NavItem = { to: '/admin/invitations', label: 'Invitations', icon: UserPlusIcon }
```

`client/src/components/nav/DesktopNav.tsx`:

```diff
--- a/client/src/components/nav/DesktopNav.tsx
+++ b/client/src/components/nav/DesktopNav.tsx
@@
   const items = useNavItems()
   return (
     <nav className="hidden items-center gap-1 md:flex">
-      {items.map(({ to, label, icon: Icon }) => (
+      {items.map(({ to, label, icon: Icon, onClick }) => (
         // end: "/" would otherwise stay active on every page.
-        <NavLink key={to} to={to} end className={navLinkClasses}>
+        <NavLink key={to} to={to} end className={navLinkClasses} onClick={onClick}>
           <Icon aria-hidden className="size-4" />
           {label}
         </NavLink>
```

`client/src/components/nav/MobileNav.tsx`: the pages list moves to `MobileNavLinks` (`MobileNav` would pass 30 lines with the combined handler). The « Préférences » link and the bottom block from step 6 stay as they are:

```diff
--- a/client/src/components/nav/MobileNav.tsx
+++ b/client/src/components/nav/MobileNav.tsx
@@
 function navLinkClasses({ isActive }: { isActive: boolean }): string {
   return cn(
     'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted',
     isActive && 'bg-muted text-foreground',
   )
 }
 
+// onNavigate closes the sheet; an item's own onClick (the frame's full screen) runs in the same click.
+function MobileNavLinks({ onNavigate }: { onNavigate: () => void }): JSX.Element {
+  const items = useNavItems()
+  return (
+    <nav className="flex flex-col gap-1 px-2">
+      {items.map(({ to, label, icon: Icon, onClick }) => (
+        // end: "/" would otherwise stay active on every page.
+        <NavLink
+          key={to}
+          to={to}
+          end
+          className={navLinkClasses}
+          onClick={() => {
+            onNavigate()
+            onClick?.()
+          }}
+        >
+          <Icon aria-hidden className="size-4" />
+          {label}
+        </NavLink>
+      ))}
+    </nav>
+  )
+}
+
 export function MobileNav(): JSX.Element {
   const [isOpen, setIsOpen] = useState(false)
-  const items = useNavItems()
 
   return (
     <Sheet open={isOpen} onOpenChange={setIsOpen}>
@@
           <UserBadge />
         </SheetHeader>
-        <nav className="flex flex-col gap-1 px-2">
-          {items.map(({ to, label, icon: Icon }) => (
-            // end: "/" would otherwise stay active on every page.
-            <NavLink
-              key={to}
-              to={to}
-              end
-              className={navLinkClasses}
-              onClick={() => setIsOpen(false)}
-            >
-              <Icon aria-hidden className="size-4" />
-              {label}
-            </NavLink>
-          ))}
-        </nav>
+        <MobileNavLinks onNavigate={() => setIsOpen(false)} />
         <div className="mt-auto flex flex-col border-t p-2">
```

The final `useFrameMode.ts` of this task:

```ts
import { useSearchParams } from 'react-router'
import { useFrameFullscreen } from '@/hooks/useFrameFullscreen.ts'
import { type FrameSelection, useFrameSelection } from '@/hooks/useFrameSelection.ts'
import { useIdle } from '@/hooks/useIdle.ts'
import { useLeaveFrame } from '@/hooks/useLeaveFrame.ts'
import { type FeedStatus, usePhotoFeed } from '@/hooks/usePhotoFeed.ts'
import { type SlideshowSettings, useSlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
import type { Photo } from '@/photo.ts'
import { PHOTO_PARAM } from '@/viewerHistory.ts'

// The controls step aside quickly: the photo is what the wall is for.
const CONTROLS_HIDE_DELAY_MS = 4000

export type FrameMode = {
  photos: Photo[]
  status: FeedStatus
  // undefined while there is no photo to show.
  currentPhoto: Photo | undefined
  isActive: boolean
  settings: SlideshowSettings
  selection: FrameSelection
  leave: () => void
}

export function useFrameMode(): FrameMode {
  const { photos, status } = usePhotoFeed()
  const isActive = useIdle(CONTROLS_HIDE_DELAY_MS)
  const settings = useSlideshowSettings()
  const [searchParams] = useSearchParams()
  // A paused photo was chosen by someone: a new arrival raises the badge instead of replacing it.
  const selection = useFrameSelection(
    photos,
    isActive || !settings.isPlaying,
    searchParams.get(PHOTO_PARAM),
  )
  const leaveFrame = useLeaveFrame()
  const currentPhoto = photos.find(({ id }) => id === selection.currentId)
  const leave = (): void => leaveFrame(currentPhoto?.id ?? null)
  useFrameFullscreen(leave)

  return { photos, status, currentPhoto, isActive, settings, selection, leave }
}
```

- [ ] **Step 6: Docs**

`docs/produit/cadre.md`:

- Intro, replace « On l'ouvre avec l'entrée « Cadre » de la barre du haut. » with « On l'ouvre avec l'entrée « Cadre » de la barre du haut, ou avec « Mode cadre » depuis la bibliothèque ou une photo ouverte : il passe alors en plein écran. »
- « Mettre en place un cadre », « Ce que l'on peut faire »: replace « Quitter le diaporama pour revenir à la bibliothèque, sur la photo qui était affichée. » with « Quitter le cadre (✕, Échap ou sortie du plein écran) pour revenir à la bibliothèque, sur la photo qui était affichée. » and add before it « Ouvrir le cadre en plein écran d'un seul toucher, depuis la barre du haut, la bibliothèque ou une photo ouverte. »
- « Règles », after R-CAD-57:

  ```
  14. R-CAD-58 · Ouvert depuis l'application (« Cadre » dans la barre du haut, « Mode cadre » dans la bibliothèque ou sur une photo ouverte), le cadre passe en plein écran. Sur un appareil qui ne le permet pas (iPhone), ou si le navigateur le refuse, le cadre s'affiche dans la page, sans message.
  15. R-CAD-59 · Sortir du plein écran, de n'importe quelle façon (✕, touche Échap, touche F11, geste de l'appareil), quitte le cadre : on revient à la bibliothèque, sur la photo qui était affichée, ou à la bibliothèque seule s'il n'y avait pas de photo.
  16. R-CAD-60 · Quitter le cadre autrement (bouton retour du navigateur, « Retour à la bibliothèque ») sort aussi du plein écran : la bibliothèque ne reste jamais en plein écran.
  ```

- « Ce qui n'est pas possible » of that section: replace « Passer en plein écran depuis l'application : prévu, voir [a-venir.md](a-venir.md). » with:

  ```
  - Passer en plein écran sur iPhone : Safari ne le permet pas, le cadre s'affiche dans la page.
  - Rester en plein écran après avoir quitté le cadre.
  ```

- « Diaporama », « Ce que l'on peut faire »: replace « Quitter le mode cadre (bouton ✕ ou touche Échap) pour revenir à la bibliothèque, sur la photo affichée. » with « Quitter le mode cadre (bouton ✕, touche Échap ou sortie du plein écran) pour revenir à la bibliothèque, sur la photo affichée. »

`docs/produit/a-venir.md`, « Étape 8 · Mode cadre »: remove the bullet « Passage en plein écran d'un simple toucher ; le bouton ✕ et la touche Échap en sortent. »

`ARCHITECTURE.md`:

- Pages, `/frame` row: after « celui qu'un cadre ouvre au démarrage ; » insert « ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; ». Re-pad the table with `pnpm format` only if Biome asks (it does not format Markdown: keep the row on one line, the column padding may stay uneven).
- Visionneuse paragraph: replace « Le lien « Cadre » de la barre reste un lien simple, pour un cadre démarré directement. » with « Le lien « Cadre » de la barre ne touche pas à l'historique : c'est aussi l'adresse qu'un cadre ouvre au démarrage. »
- After the Visionneuse paragraph, a new paragraph:

  ```
  Plein écran (`client/src/fullscreen.ts`) : le navigateur ne l'accorde que pendant un geste de la personne, donc les trois entrées (lien « Cadre » de la barre, « Mode cadre » de la bibliothèque et de la visionneuse) appellent `enterFullscreen()` dans le clic lui-même, avant la navigation ; c'est tout le document qui passe en plein écran, et la navigation de l'application, sans rechargement, l'y laisse. Un refus (réglage du navigateur, iPhone qui n'a pas de plein écran d'élément) est ignoré : le cadre fonctionne dans la fenêtre. En plein écran, le navigateur garde Échap pour lui : `useFrameFullscreen` écoute `fullscreenchange` et quitte le cadre quand le plein écran se termine, quelle qu'en soit la cause ; au démontage (✕, retour arrière, lien), il retire son écouteur puis sort du plein écran, pour que la bibliothèque n'y reste jamais. Hors plein écran, Échap quitte le cadre comme avant (`useEscapeToClose`).
  ```

`README.md`: replace « Le cadre (`/frame`) n'affiche que le diaporama : « Mode cadre » le lance depuis la bibliothèque ou depuis une photo ouverte ; ✕ ou Échap ramène à la bibliothèque sur la photo qui était à l'écran. » with « Le cadre (`/frame`) n'affiche que le diaporama : « Mode cadre » le lance en plein écran depuis la bibliothèque ou depuis une photo ouverte ; ✕, Échap ou la sortie du plein écran ramènent à la bibliothèque sur la photo qui était à l'écran. »

- [ ] **Step 7: Verify**

Run: `pnpm check && pnpm typecheck && pnpm --filter client build && pnpm test`
Expected: green, `Tests  219 passed (219)`. Measure: `useFrameMode`, `useFrameFullscreen`, `MobileNav`, `MobileNavLinks` at most 30 lines; `useViewerParam` at 34 (accepted, Choice 13).

- [ ] **Step 8: Commit**

```bash
git add client/src/fullscreen.ts client/src/hooks/useFrameFullscreen.ts client/src/hooks/useFrameMode.ts client/src/components/library/LibrarySection.tsx client/src/hooks/useViewerParam.ts client/src/components/nav/navItems.ts client/src/components/nav/DesktopNav.tsx client/src/components/nav/MobileNav.tsx ARCHITECTURE.md README.md docs/produit/cadre.md docs/produit/a-venir.md
git commit -F <message-file>
```

Message subject: `feat(client): open the frame full screen and leave it with full screen`. Body: « The three entries ask full screen in their click, the only moment browsers grant it. Leaving full screen (Escape, F11, a gesture) leaves the frame; leaving the frame exits full screen. Refusals and devices without full screen keep the frame in the window. » Then the attribution lines.

**Chrome check (controller):** the extension cannot press a real Escape or F11 in full screen: `document.exitFullscreen()` from the page stands in for them. `requestFullscreen` needs a real click: every entry is clicked with the `computer` tool, never through `javascript_tool`.
- `/`: click « Mode cadre ». Then `({ path: location.pathname, isFull: document.fullscreenElement !== null })` → `{ path: '/frame', isFull: true }`. Wait one second, check again: still `true` (StrictMode, Choice 12).
- `document.exitFullscreen()`; after 500 ms: `location.pathname + location.search` is `/?photo=<id>` with the photo that was shown, the viewer open, `document.fullscreenElement === null`.
- Open the 3rd photo, click ▶ « Mode cadre »: full screen, slideshow on that photo. Click ✕ « Quitter le mode cadre »: viewer on the photo shown, not full screen.
- Desktop bar « Cadre »: full screen. `history.back()` from the page: back on the previous page, `document.fullscreenElement === null`.
- Width 375 px: ☰, « Cadre »: the sheet closes, full screen on. `document.exitFullscreen()`: library.
- Outside full screen (open `/frame` by typing the address), press Escape: back to the library (unchanged).
- Console: no error.

---

### Task 2: A « Plein écran » button for a frame started on `/frame` (PR A, `feat/frame-fullscreen`)

**Files:**
- Create: `client/src/hooks/useIsFullscreen.ts`, `client/src/components/frame/FullscreenButton.tsx`
- Modify: `client/src/components/frame/SlideshowTopBar.tsx`, `client/src/components/frame/FrameStatusScreen.tsx`
- Modify: `ARCHITECTURE.md`, `docs/produit/cadre.md`

**Interfaces:**
- Consumes: `enterFullscreen`, `isFullscreen`, `isFullscreenAvailable` (Task 1).
- Produces: `useIsFullscreen(): boolean`; `FullscreenButton(): JSX.Element | null`.

- [ ] **Step 1: The full screen state as a hook**

Create `client/src/hooks/useIsFullscreen.ts`:

```ts
import { useSyncExternalStore } from 'react'
import { isFullscreen } from '@/fullscreen.ts'

function subscribeToFullscreen(onChange: () => void): () => void {
  document.addEventListener('fullscreenchange', onChange)
  return () => document.removeEventListener('fullscreenchange', onChange)
}

export function useIsFullscreen(): boolean {
  return useSyncExternalStore(subscribeToFullscreen, isFullscreen)
}
```

- [ ] **Step 2: The button**

Create `client/src/components/frame/FullscreenButton.tsx`:

```tsx
import { MaximizeIcon } from 'lucide-react'
import type { JSX } from 'react'
import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
import { Button } from '@/components/ui/button.tsx'
import { enterFullscreen, isFullscreenAvailable } from '@/fullscreen.ts'
import { useIsFullscreen } from '@/hooks/useIsFullscreen.ts'

// A frame that starts on /frame by itself had no click to go full screen with: one tap does it.
export function FullscreenButton(): JSX.Element | null {
  const isFullscreenOn = useIsFullscreen()
  if (!isFullscreenAvailable() || isFullscreenOn) return null

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={enterFullscreen}
      aria-label="Plein écran"
      title="Plein écran"
      className={GLASS_BUTTON_CLASSES}
    >
      <MaximizeIcon />
    </Button>
  )
}
```

- [ ] **Step 3: Place it on the slideshow and on the status screens**

`client/src/components/frame/SlideshowTopBar.tsx` (it sits in the top bar, so it hides with the other controls):

```diff
--- a/client/src/components/frame/SlideshowTopBar.tsx
+++ b/client/src/components/frame/SlideshowTopBar.tsx
@@
 import type { JSX } from 'react'
 import { CloseButton } from '@/components/frame/CloseButton.tsx'
 import { ControlsBar } from '@/components/frame/ControlsBar.tsx'
+import { FullscreenButton } from '@/components/frame/FullscreenButton.tsx'
 import { SlideshowMenu } from '@/components/frame/SlideshowMenu.tsx'
 import type { SlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
 import type { Photo } from '@/photo.ts'
@@
       className="fixed inset-x-0 top-0 z-10 justify-between"
     >
       <CloseButton onClose={onClose} />
-      <SlideshowMenu
-        photo={photo}
-        intervalMs={settings.intervalMs}
-        onIntervalChange={settings.onIntervalChange}
-      />
+      <div className="flex items-center gap-2">
+        <FullscreenButton />
+        <SlideshowMenu
+          photo={photo}
+          intervalMs={settings.intervalMs}
+          onIntervalChange={settings.onIntervalChange}
+        />
+      </div>
     </ControlsBar>
   )
 }
```

`client/src/components/frame/FrameStatusScreen.tsx`:

```diff
--- a/client/src/components/frame/FrameStatusScreen.tsx
+++ b/client/src/components/frame/FrameStatusScreen.tsx
@@
 import { ImagesIcon, TriangleAlertIcon } from 'lucide-react'
 import type { JSX, ReactNode } from 'react'
+import { FullscreenButton } from '@/components/frame/FullscreenButton.tsx'
 import { Button } from '@/components/ui/button.tsx'
 import { cn } from '@/lib/utils.ts'
 
@@
         'grid place-items-center bg-radial from-frame-accent/10 to-transparent to-70%',
       )}
     >
+      {/* Where the slideshow has it: a frame stuck on loading can still go full screen. */}
+      <div className="fixed top-0 right-0 px-6 py-4">
+        <FullscreenButton />
+      </div>
       <div className="flex flex-col items-center gap-4 px-6 text-center">
         <Icon aria-hidden className="size-16 text-frame-accent/80 motion-safe:animate-pulse" />
         <StatusMessage status={status} />
```

- [ ] **Step 4: Docs**

`docs/produit/cadre.md`, « Mettre en place un cadre »:

- « Ce que l'on peut faire », add after the full screen bullet of Task 1: « Passer en plein écran avec le bouton « Plein écran » quand le cadre a été ouvert directement (au démarrage de l'appareil, par exemple). »
- « Règles », after R-CAD-60:

  ```
  17. R-CAD-61 · Tant que le cadre n'est pas en plein écran, un bouton « Plein écran » s'affiche en haut à droite, sur le diaporama comme sur les écrans sans photo. Sur le diaporama, il s'efface avec les autres boutons (R-CAD-24). Il n'apparaît pas sur un appareil qui ne permet pas le plein écran.
  ```

- « Messages affichés »: add the row `| Passer en plein écran   | « Plein écran » (bouton)  |` (pad the table to its column widths).

« Diaporama », « Messages affichés », row « Noms des boutons (survol, lecture d'écran) »: add « « Plein écran » » after « « Quitter le mode cadre » ».

`ARCHITECTURE.md`, end of the « Plein écran » paragraph of Task 1, add: « Un cadre ouvert directement sur `/frame` n'a pas eu de clic : un bouton « Plein écran » (`components/frame/FullscreenButton.tsx`, état lu par `useIsFullscreen` avec `useSyncExternalStore`) s'affiche en haut à droite, sur le diaporama comme sur les écrans sans photo, tant que le document n'est pas en plein écran. »

- [ ] **Step 5: Verify**

Run: `pnpm check && pnpm typecheck && pnpm --filter client build && pnpm test`
Expected: green, `Tests  219 passed (219)`.

- [ ] **Step 6: Commit**

```bash
git add client/src/hooks/useIsFullscreen.ts client/src/components/frame/FullscreenButton.tsx client/src/components/frame/SlideshowTopBar.tsx client/src/components/frame/FrameStatusScreen.tsx ARCHITECTURE.md docs/produit/cadre.md
git commit -F <message-file>
```

Message subject: `feat(client): offer a full screen button on a frame opened directly`. Body: « A frame that starts on /frame had no click to go full screen with. The button shows while the document is not full screen, where the browser supports it. » Then the attribution lines.

**Chrome check (controller):**
- Type `http://localhost:5180/frame` in the address bar: a « Plein écran » button (find by `aria-label="Plein écran"`) left of « … ». Click it: `document.fullscreenElement !== null`, the button is gone.
- `document.exitFullscreen()`: the frame is left (R-CAD-59), library shown.
- Back on `/frame` (address bar), wait 5 s without moving: the button fades with the other controls; move the mouse: it comes back.
- Status screens: if an empty account or a failing API is not at hand, check by reading `FrameStatusScreen` in the diff; note it in the controller's report.

---

> **Controller:** `gh stack add feat/frame-playback` before Task 3.

## PR B — `feat/frame-playback`

### Task 3: Frame settings remembered per device (PR B, `feat/frame-playback`)

**Files:**
- Create: `client/src/frameSettings.ts`, `client/src/hooks/useFrameSettings.ts`
- Modify: `client/src/hooks/useSlideshowSettings.ts`, `client/src/hooks/useSlideshow.ts`, `client/src/components/frame/SlideshowMenu.tsx`
- Modify: `ARCHITECTURE.md`, `docs/produit/cadre.md`, `docs/produit/a-venir.md`

**Interfaces:**
- Produces: in `@/frameSettings.ts`: `type FrameTemplate = 'fit' | 'fill' | 'mat' | 'polaroid'`, `type PlaybackOrder = 'newest' | 'shuffle'`, `type FrameSettings = { template; order; intervalMs }`, `SLIDESHOW_INTERVALS_MS`, `DEFAULT_FRAME_SETTINGS`, `FRAME_SETTINGS_KEY = 'familyframe.frame-settings'`, `parseFrameSettings(raw: unknown): FrameSettings`, `readFrameSettings(): FrameSettings`, `writeFrameSettings(settings: FrameSettings): void`. In `@/hooks/useFrameSettings.ts`: `type FrameSettingsControls = FrameSettings & { onTemplateChange; onOrderChange; onIntervalChange }`, `useFrameSettings(): FrameSettingsControls`. `SlideshowSettings` becomes `FrameSettingsControls & { isPlaying, isStripVisible, onPlayingChange, onStripVisibleChange }` (same `intervalMs` and `onIntervalChange` names as before).

- [ ] **Step 1: The stored settings**

Create `client/src/frameSettings.ts`:

```ts
export type FrameTemplate = 'fit' | 'fill' | 'mat' | 'polaroid'
export type PlaybackOrder = 'newest' | 'shuffle'

export type FrameSettings = {
  template: FrameTemplate
  order: PlaybackOrder
  intervalMs: number
}

export const SLIDESHOW_INTERVALS_MS = [5_000, 10_000, 20_000]
const FRAME_TEMPLATES: FrameTemplate[] = ['fit', 'fill', 'mat', 'polaroid']
const PLAYBACK_ORDERS: PlaybackOrder[] = ['newest', 'shuffle']

export const DEFAULT_FRAME_SETTINGS: FrameSettings = {
  template: 'fit',
  order: 'newest',
  intervalMs: 10_000,
}

export const FRAME_SETTINGS_KEY = 'familyframe.frame-settings'

function isFrameTemplate(value: unknown): value is FrameTemplate {
  return FRAME_TEMPLATES.some((template) => template === value)
}

function isPlaybackOrder(value: unknown): value is PlaybackOrder {
  return PLAYBACK_ORDERS.some((order) => order === value)
}

function isSlideshowInterval(value: unknown): value is number {
  return SLIDESHOW_INTERVALS_MS.some((intervalMs) => intervalMs === value)
}

// Each value is checked on its own: one edited by hand or left by an older version falls back to
// its default without dropping the others.
export function parseFrameSettings(raw: unknown): FrameSettings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_FRAME_SETTINGS
  return {
    template:
      'template' in raw && isFrameTemplate(raw.template)
        ? raw.template
        : DEFAULT_FRAME_SETTINGS.template,
    order: 'order' in raw && isPlaybackOrder(raw.order) ? raw.order : DEFAULT_FRAME_SETTINGS.order,
    intervalMs:
      'intervalMs' in raw && isSlideshowInterval(raw.intervalMs)
        ? raw.intervalMs
        : DEFAULT_FRAME_SETTINGS.intervalMs,
  }
}

// localStorage throws when the browser blocks site data, JSON.parse on a value that is not JSON:
// either way the frame still shows, with the defaults.
export function readFrameSettings(): FrameSettings {
  try {
    const stored = localStorage.getItem(FRAME_SETTINGS_KEY)
    return stored === null ? DEFAULT_FRAME_SETTINGS : parseFrameSettings(JSON.parse(stored))
  } catch (_error: unknown) {
    return DEFAULT_FRAME_SETTINGS
  }
}

export function writeFrameSettings(settings: FrameSettings): void {
  try {
    localStorage.setItem(FRAME_SETTINGS_KEY, JSON.stringify(settings))
  } catch (_error: unknown) {
    // Not remembered on this device: the choice holds until the page closes.
  }
}
```

- [ ] **Step 2: The settings hook**

Create `client/src/hooks/useFrameSettings.ts`:

```ts
import { useEffect, useState } from 'react'
import {
  FRAME_SETTINGS_KEY,
  type FrameSettings,
  type FrameTemplate,
  type PlaybackOrder,
  readFrameSettings,
  writeFrameSettings,
} from '@/frameSettings.ts'

export type FrameSettingsControls = FrameSettings & {
  onTemplateChange: (template: FrameTemplate) => void
  onOrderChange: (order: PlaybackOrder) => void
  onIntervalChange: (intervalMs: number) => void
}

// Per device, in this browser: a kitchen tablet and a living-room TV keep their own choices.
export function useFrameSettings(): FrameSettingsControls {
  // A function, not its result: storage is read on the first render only.
  const [settings, setSettings] = useState(readFrameSettings)

  useEffect(() => {
    // The settings page and the frame can be open side by side, in two tabs of this browser.
    function handleStorage({ key }: StorageEvent): void {
      // null: the whole storage was cleared.
      if (key === FRAME_SETTINGS_KEY || key === null) setSettings(readFrameSettings())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  function change(update: Partial<FrameSettings>): void {
    const nextSettings = { ...settings, ...update }
    setSettings(nextSettings)
    writeFrameSettings(nextSettings)
  }

  return {
    ...settings,
    onTemplateChange: (template) => change({ template }),
    onOrderChange: (order) => change({ order }),
    onIntervalChange: (intervalMs) => change({ intervalMs }),
  }
}
```

- [ ] **Step 3: The slideshow settings read them**

Replace `client/src/hooks/useSlideshowSettings.ts` with:

```ts
import { useState } from 'react'
import { type FrameSettingsControls, useFrameSettings } from '@/hooks/useFrameSettings.ts'

// Pause and the strip are for whoever stands in front of the frame: they are not remembered.
export type SlideshowSettings = FrameSettingsControls & {
  isPlaying: boolean
  isStripVisible: boolean
  onPlayingChange: (isPlaying: boolean) => void
  onStripVisibleChange: (isStripVisible: boolean) => void
}

// Called by the page, not the slideshow screen: the page's photo selection reads isPlaying too.
export function useSlideshowSettings(): SlideshowSettings {
  const frameSettings = useFrameSettings()
  const [isPlaying, setIsPlaying] = useState(true)
  const [isStripVisible, setIsStripVisible] = useState(false)

  return {
    ...frameSettings,
    isPlaying,
    isStripVisible,
    onPlayingChange: setIsPlaying,
    onStripVisibleChange: setIsStripVisible,
  }
}
```

`client/src/hooks/useSlideshow.ts`, the constants move to `frameSettings.ts`:

```diff
--- a/client/src/hooks/useSlideshow.ts
+++ b/client/src/hooks/useSlideshow.ts
@@
 import { useEffect } from 'react'
 import type { CarouselApi } from '@/components/ui/carousel.tsx'
 
-export const SLIDESHOW_INTERVALS_MS = [5_000, 10_000, 20_000]
-export const DEFAULT_SLIDESHOW_INTERVAL_MS = 10_000
-
 // intervalMs null: paused, or someone is using the frame.
 export function useSlideshow(api: CarouselApi, intervalMs: number | null): void {
   useEffect(() => {
```

`client/src/components/frame/SlideshowMenu.tsx`:

```diff
--- a/client/src/components/frame/SlideshowMenu.tsx
+++ b/client/src/components/frame/SlideshowMenu.tsx
@@
   DropdownMenuSubContent,
   DropdownMenuSubTrigger,
 } from '@/components/ui/dropdown-menu.tsx'
-import { SLIDESHOW_INTERVALS_MS } from '@/hooks/useSlideshow.ts'
+import { SLIDESHOW_INTERVALS_MS } from '@/frameSettings.ts'
 import type { Photo } from '@/photo.ts'
 
 const MS_PER_SECOND = 1000
```

Check no other file imports the two removed constants: `git grep -n "DEFAULT_SLIDESHOW_INTERVAL_MS\|SLIDESHOW_INTERVALS_MS" -- client/src` → only `frameSettings.ts` and `SlideshowMenu.tsx`.

- [ ] **Step 4: Docs**

`docs/produit/cadre.md`, « Diaporama »:

- « Ce que l'on peut faire »: « Choisir la vitesse : 5 s, 10 s ou 20 s par photo (menu « … », « Vitesse »). » becomes « Choisir la vitesse : 5 s, 10 s ou 20 s par photo (menu « … », « Vitesse ») ; l'appareil la retient. »
- « Règles », R-CAD-21 becomes « R-CAD-21 · Remplacée : la vitesse est désormais retenue sur l'appareil ; seules la pause et l'affichage du bandeau reviennent aux réglages par défaut (R-CAD-62). »
- « Règles », after R-CAD-29:

  ```
  11. R-CAD-62 · La vitesse choisie est retenue sur l'appareil, dans ce navigateur : elle reste la même quand la page du cadre est rechargée ou rouverte, le lendemain comme après un redémarrage. La lecture ou la pause et l'affichage du bandeau reviennent aux réglages par défaut (lecture automatique, bandeau masqué). Le rechargement quotidien des photos (R-CAD-05) ne change rien.
  12. R-CAD-63 · En navigation privée, ou si le navigateur bloque l'enregistrement, le réglage vaut jusqu'à la fermeture de la page. Un réglage devenu illisible revient à sa valeur par défaut sans effacer les autres.
  ```

- « Ce qui n'est pas possible »: replace « Retenir ses réglages de diaporama d'un jour à l'autre : prévu, voir [a-venir.md](a-venir.md). » with « Retrouver ses réglages sur un autre appareil ou dans un autre navigateur : chaque appareil garde les siens. »

`docs/produit/a-venir.md`, « Étape 8 · Mode cadre »: remove the bullet « Réglages retenus par appareil : chaque cadre garde ses propres choix d'un jour à l'autre. »

`ARCHITECTURE.md`, after the « Plein écran » paragraph, a new paragraph:

```
Réglages du cadre (`client/src/frameSettings.ts`) : le modèle d'affichage, l'ordre de lecture et la vitesse sont gardés par appareil dans le `localStorage` (clé `familyframe.frame-settings`, un objet JSON). Chaque valeur est vérifiée seule à la lecture : une valeur inconnue revient à sa valeur par défaut sans effacer les autres. Chaque accès est dans un `try/catch` : en navigation privée, ou si le stockage est bloqué, les choix valent pour la visite. `useFrameSettings` relit le stockage sur l'événement `storage`, que le navigateur envoie aux autres onglets du même site. La pause et le bandeau de vignettes restent en mémoire (`useSlideshowSettings`) : ils reviennent à leur valeur par défaut à chaque ouverture.
```

- [ ] **Step 5: Verify**

Run: `pnpm check && pnpm typecheck && pnpm --filter client build && pnpm test`
Expected: green, `Tests  219 passed (219)`. `SlideshowMenu` is 35 lines here (pre-existing); Task 4 rewrites it.

- [ ] **Step 6: Commit**

```bash
git add client/src/frameSettings.ts client/src/hooks/useFrameSettings.ts client/src/hooks/useSlideshowSettings.ts client/src/hooks/useSlideshow.ts client/src/components/frame/SlideshowMenu.tsx ARCHITECTURE.md docs/produit/cadre.md docs/produit/a-venir.md
git commit -F <message-file>
```

Message subject: `feat(client): remember the frame settings on each device`. Body: « The speed, and the template and order to come, are stored in localStorage and checked value by value; storage failures keep the defaults. Pause and the strip stay per visit. Another tab follows through the storage event. » Then the attribution lines.

**Chrome check (controller):**
- `/frame`, « … » → « Vitesse » → « 5 s ». `localStorage.getItem('familyframe.frame-settings')` → `'{"template":"fit","order":"newest","intervalMs":5000}'`. Reload: « Vitesse » shows « 5 s » checked; the slideshow advances every 5 s; the strip is hidden and playback on.
- `localStorage.setItem('familyframe.frame-settings', '{"template":"x","order":"newest","intervalMs":7}')`, reload: the frame shows, « Vitesse » on « 10 s ».
- `localStorage.setItem('familyframe.frame-settings', 'not json')`, reload: the frame shows, « 10 s ».
- Two tabs: tab 1 on `/frame`, tab 2 on `/`. In tab 2, `localStorage.setItem('familyframe.frame-settings', '{"template":"fit","order":"newest","intervalMs":20000}')`. In tab 1, « … » → « Vitesse »: « 20 s » checked, without reload.
- Clean up: `localStorage.removeItem('familyframe.frame-settings')`.

---

### Task 4: Shuffle playback (PR B, `feat/frame-playback`)

**Files:**
- Create: `client/src/shuffleOrder.ts`, `client/src/hooks/usePlaybackPhotos.ts`, `client/src/components/frame/frameSettingOptions.ts`, `client/src/components/frame/RadioSubmenu.tsx`
- Modify: `client/src/components/frame/SlideshowMenu.tsx`, `client/src/components/frame/SlideshowTopBar.tsx`, `client/src/hooks/useFrameMode.ts`
- Modify: `ARCHITECTURE.md`, `docs/produit/cadre.md`, `docs/produit/a-venir.md`

**Interfaces:**
- Consumes: `PlaybackOrder`, `SLIDESHOW_INTERVALS_MS`, `FrameSettingsControls` (Task 3); `useFrameMode` (Task 1).
- Produces: in `@/shuffleOrder.ts`: `type RandomSource = () => number`, `type ShuffleState`, `shuffledIds`, `insertAfter`, `nextShuffledIds(state, random): string[]`, `isSameOrder`. `usePlaybackPhotos(photos, order, currentId): Photo[]`. In `@/components/frame/frameSettingOptions.ts`: `type SettingOption<Value> = { value: Value; label: string }`, `optionSelector(options, onSelect): (selected: string) => void`, `ORDER_OPTIONS`, `INTERVAL_OPTIONS`. `RadioSubmenu<Value extends string | number>({ icon, label, options, value, onValueChange })`. `SlideshowMenu` props become `{ photo: Photo; settings: FrameSettingsControls }`.

- [ ] **Step 1: The shuffle, as pure functions**

Create `client/src/shuffleOrder.ts`:

```ts
// Math.random in the app; any source of numbers in [0, 1) works.
export type RandomSource = () => number

export type ShuffleState = {
  // The order drawn so far, maybe still holding deleted photos and missing new ones.
  drawnIds: readonly string[]
  // The feed's photos, newest first.
  photoIds: readonly string[]
  // On screen at the previous render, and now.
  shownId: string | undefined
  currentId: string | undefined
}

// Fisher-Yates on a copy: every order is equally likely.
export function shuffledIds(ids: readonly string[], random: RandomSource): string[] {
  const shuffled = [...ids]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    const swapped = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = swapped
  }
  return shuffled
}

// A new round starts on the photo on screen, so the reshuffle never shows it twice in a row.
function startingWith(ids: string[], firstId: string | undefined): string[] {
  if (firstId === undefined || !ids.includes(firstId)) return ids
  return [firstId, ...ids.filter((id) => id !== firstId)]
}

// The arriving photo plays next: it shows at once (R-CAD-40) without breaking the round.
export function insertAfter(
  order: readonly string[],
  anchorId: string | undefined,
  newId: string,
): string[] {
  const anchorIndex = anchorId === undefined ? -1 : order.indexOf(anchorId)
  return [...order.slice(0, anchorIndex + 1), newId, ...order.slice(anchorIndex + 1)]
}

function hasFinishedRound(
  ids: readonly string[],
  { shownId, currentId }: Pick<ShuffleState, 'shownId' | 'currentId'>,
): boolean {
  return shownId !== currentId && ids.at(-1) === shownId && ids.at(0) === currentId
}

export function nextShuffledIds(state: ShuffleState, random: RandomSource): string[] {
  const { drawnIds, photoIds, shownId, currentId } = state
  const photoIdSet = new Set(photoIds)
  const keptIds = drawnIds.filter((id) => photoIdSet.has(id))
  // Nothing drawn yet, or the last photo of the round gave way to the first: draw a new round.
  if (keptIds.length === 0 || hasFinishedRound(keptIds, state)) {
    return startingWith(shuffledIds(photoIds, random), currentId)
  }
  const drawnIdSet = new Set(drawnIds)
  // Newest first in the feed: inserting the oldest first leaves the newest right after the photo
  // that was on screen.
  const arrivedIds = photoIds.filter((id) => !drawnIdSet.has(id)).reverse()
  return arrivedIds.reduce(
    (ids, arrivedId) => insertAfter(ids, shownId ?? currentId, arrivedId),
    keptIds,
  )
}

export function isSameOrder(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && first.every((id, index) => id === second[index])
}
```

- [ ] **Step 2: The playback order hook**

Create `client/src/hooks/usePlaybackPhotos.ts`:

```ts
import { useMemo, useState } from 'react'
import type { PlaybackOrder } from '@/frameSettings.ts'
import type { Photo } from '@/photo.ts'
import { isSameOrder, nextShuffledIds } from '@/shuffleOrder.ts'

function inPlaybackOrder(photos: Photo[], ids: readonly string[]): Photo[] {
  const photosById = new Map(photos.map((photo) => [photo.id, photo]))
  return ids.flatMap((id) => photosById.get(id) ?? [])
}

// The slideshow's photos in the order they play: the feed's own (newest first), or a shuffle
// drawn once and kept, so no photo comes back before the round is over.
export function usePlaybackPhotos(
  photos: Photo[],
  order: PlaybackOrder,
  currentId: string | undefined,
): Photo[] {
  const [drawnIds, setDrawnIds] = useState<readonly string[]>([])
  const [shownId, setShownId] = useState(currentId)

  // Adjusted during render, like the frame's selection: an effect would paint the old order once.
  if (currentId !== shownId) setShownId(currentId)
  if (order === 'shuffle') {
    const photoIds = photos.map(({ id }) => id)
    const nextIds = nextShuffledIds({ drawnIds, photoIds, shownId, currentId }, Math.random)
    if (!isSameOrder(nextIds, drawnIds)) setDrawnIds(nextIds)
  }

  const shuffledPhotos = useMemo(() => inPlaybackOrder(photos, drawnIds), [photos, drawnIds])
  return order === 'shuffle' ? shuffledPhotos : photos
}
```

`client/src/hooks/useFrameMode.ts`: the carousel gets the photos in playback order; the selection stays on the feed (newest first), so arrivals and deletions keep their rules:

```diff
--- a/client/src/hooks/useFrameMode.ts
+++ b/client/src/hooks/useFrameMode.ts
@@
 import { useIdle } from '@/hooks/useIdle.ts'
 import { useLeaveFrame } from '@/hooks/useLeaveFrame.ts'
 import { type FeedStatus, usePhotoFeed } from '@/hooks/usePhotoFeed.ts'
+import { usePlaybackPhotos } from '@/hooks/usePlaybackPhotos.ts'
 import { type SlideshowSettings, useSlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
 import type { Photo } from '@/photo.ts'
 import { PHOTO_PARAM } from '@/viewerHistory.ts'
@@
 const CONTROLS_HIDE_DELAY_MS = 4000
 
 export type FrameMode = {
+  // In the order they play.
   photos: Photo[]
   status: FeedStatus
   // undefined while there is no photo to show.
@@
   const currentPhoto = photos.find(({ id }) => id === selection.currentId)
   const leave = (): void => leaveFrame(currentPhoto?.id ?? null)
   useFrameFullscreen(leave)
+  const playbackPhotos = usePlaybackPhotos(photos, settings.order, selection.currentId)
 
-  return { photos, status, currentPhoto, isActive, settings, selection, leave }
+  return { photos: playbackPhotos, status, currentPhoto, isActive, settings, selection, leave }
 }
```

- [ ] **Step 3: The menu's options and a generic radio submenu**

Create `client/src/components/frame/frameSettingOptions.ts`:

```ts
import { type PlaybackOrder, SLIDESHOW_INTERVALS_MS } from '@/frameSettings.ts'

export type SettingOption<Value> = { value: Value; label: string }

// Radio and toggle values are strings: only an option from the list goes back as a setting.
export function optionSelector<Value>(
  options: SettingOption<Value>[],
  onSelect: (value: Value) => void,
): (selected: string) => void {
  return (selected) => {
    const option = options.find(({ value }) => String(value) === selected)
    if (option !== undefined) onSelect(option.value)
  }
}

const MS_PER_SECOND = 1000

export const ORDER_OPTIONS: SettingOption<PlaybackOrder>[] = [
  { value: 'newest', label: "Dans l'ordre" },
  { value: 'shuffle', label: 'Aléatoire' },
]

export const INTERVAL_OPTIONS: SettingOption<number>[] = SLIDESHOW_INTERVALS_MS.map(
  (intervalMs) => ({ value: intervalMs, label: `${intervalMs / MS_PER_SECOND} s` }),
)
```

Create `client/src/components/frame/RadioSubmenu.tsx`:

```tsx
import type { LucideIcon } from 'lucide-react'
import type { JSX } from 'react'
import { optionSelector, type SettingOption } from '@/components/frame/frameSettingOptions.ts'
import {
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu.tsx'

type RadioSubmenuProps<Value extends string | number> = {
  icon: LucideIcon
  label: string
  options: SettingOption<Value>[]
  value: Value
  onValueChange: (value: Value) => void
}

export function RadioSubmenu<Value extends string | number>({
  icon: Icon,
  options,
  ...props
}: RadioSubmenuProps<Value>): JSX.Element {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Icon />
        {props.label}
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        {/* `dark`: the submenu portals to body, outside the frame's dark <main>. */}
        <DropdownMenuSubContent className="dark">
          <DropdownMenuRadioGroup
            value={String(props.value)}
            onValueChange={optionSelector(options, props.onValueChange)}
          >
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={String(option.value)}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  )
}
```

Replace `client/src/components/frame/SlideshowMenu.tsx` with:

```tsx
import { ShuffleIcon, TimerIcon } from 'lucide-react'
import type { JSX } from 'react'
import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
import { INTERVAL_OPTIONS, ORDER_OPTIONS } from '@/components/frame/frameSettingOptions.ts'
import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
import { RadioSubmenu } from '@/components/frame/RadioSubmenu.tsx'
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu.tsx'
import type { FrameSettingsControls } from '@/hooks/useFrameSettings.ts'
import type { Photo } from '@/photo.ts'

type SlideshowMenuProps = {
  photo: Photo
  settings: FrameSettingsControls
}

export function SlideshowMenu({ photo, settings }: SlideshowMenuProps): JSX.Element {
  return (
    <PhotoActionsMenu photo={photo} label="Actions sur la photo" className={GLASS_BUTTON_CLASSES}>
      <RadioSubmenu
        icon={ShuffleIcon}
        label="Lecture"
        options={ORDER_OPTIONS}
        value={settings.order}
        onValueChange={settings.onOrderChange}
      />
      <RadioSubmenu
        icon={TimerIcon}
        label="Vitesse"
        options={INTERVAL_OPTIONS}
        value={settings.intervalMs}
        onValueChange={settings.onIntervalChange}
      />
      <DropdownMenuSeparator />
    </PhotoActionsMenu>
  )
}
```

Before replacing, read the current `SlideshowMenu.tsx`: the « Vitesse » submenu's `dark` class on its content and the separator before the photo actions must survive (they do in `RadioSubmenu` and above). If it holds anything else (an item, a comment), keep it and log it.

`client/src/components/frame/SlideshowTopBar.tsx`:

```diff
--- a/client/src/components/frame/SlideshowTopBar.tsx
+++ b/client/src/components/frame/SlideshowTopBar.tsx
@@
       <CloseButton onClose={onClose} />
       <div className="flex items-center gap-2">
         <FullscreenButton />
-        <SlideshowMenu
-          photo={photo}
-          intervalMs={settings.intervalMs}
-          onIntervalChange={settings.onIntervalChange}
-        />
+        <SlideshowMenu photo={photo} settings={settings} />
       </div>
     </ControlsBar>
   )
```

- [ ] **Step 4: Docs**

`docs/produit/cadre.md`, « Diaporama »:

- « Ce que l'on peut faire », after the speed bullet: « Choisir l'ordre de lecture : « Dans l'ordre » (des plus récentes aux plus anciennes) ou « Aléatoire » (menu « … », « Lecture ») ; l'appareil le retient. »
- « Règles », R-CAD-22 becomes « R-CAD-22 · Remplacée : la lecture suit désormais l'ordre choisi, dans l'ordre ou aléatoire (R-CAD-64). »
- « Règles », after R-CAD-63:

  ```
  13. R-CAD-64 · Deux ordres de lecture. « Dans l'ordre » (par défaut) : la lecture passe à la photo suivante, plus ancienne, à chaque intervalle ; après la plus ancienne, elle repart de la plus récente, en boucle et sans retour en arrière visible. « Aléatoire » : les photos sont mélangées une fois, et chacune passe une fois avant qu'un nouveau mélange commence ; le nouveau tour ne remontre pas tout de suite la photo qui vient de passer.
  14. R-CAD-65 · En « Aléatoire », une nouvelle photo se place juste après celle qui est affichée : les règles d'arrivée (R-CAD-40 à R-CAD-42) s'appliquent comme dans l'ordre. Une photo supprimée sort du mélange ; si c'était la photo affichée, le diaporama passe à la plus récente (R-CAD-29).
  15. R-CAD-66 · L'ordre choisi est retenu sur l'appareil, comme la vitesse (R-CAD-62, R-CAD-63). Le bandeau de vignettes suit l'ordre de lecture.
  ```

- « Messages affichés »: add the row `| Choix de l'ordre | « Lecture » : « Dans l'ordre », « Aléatoire » |` above « Choix de vitesse » (pad the table).
- « Ce qui n'est pas possible »: remove « Lire les photos dans un ordre aléatoire : prévu, voir [a-venir.md](a-venir.md). »

`docs/produit/a-venir.md`, « Étape 8 · Mode cadre »: remove the bullet « Lecture en boucle ou aléatoire. »

`ARCHITECTURE.md`:

- Pages, `/frame` row: after the full screen clause of Task 1, insert « son menu « … » propose « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; ».
- After the « Réglages du cadre » paragraph:

  ```
  Lecture aléatoire (`hooks/usePlaybackPhotos.ts`, fonctions pures dans `shuffleOrder.ts`) : un mélange de Fisher-Yates tiré une fois et gardé dans l'état, recalculé pendant le rendu comme la sélection du cadre. Une photo arrivée s'insère juste après la photo affichée, une photo supprimée sort de l'ordre ; quand la dernière photo du tour laisse la place à la première, un nouveau tour est tiré, qui commence par la photo affichée. La sélection (`useFrameSelection`) reste calculée sur le flux, du plus récent au plus ancien : seul l'ordre du carrousel et du bandeau change.
  ```

- [ ] **Step 5: Verify**

Run: `pnpm check && pnpm typecheck && pnpm --filter client build && pnpm test`
Expected: green, `Tests  219 passed (219)`. Measure: `RadioSubmenu`, `SlideshowMenu`, `usePlaybackPhotos`, `nextShuffledIds` at most 30 lines.

- [ ] **Step 6: Commit**

```bash
git add client/src/shuffleOrder.ts client/src/hooks/usePlaybackPhotos.ts client/src/components/frame/frameSettingOptions.ts client/src/components/frame/RadioSubmenu.tsx client/src/components/frame/SlideshowMenu.tsx client/src/components/frame/SlideshowTopBar.tsx client/src/hooks/useFrameMode.ts ARCHITECTURE.md docs/produit/cadre.md docs/produit/a-venir.md
git commit -F <message-file>
```

Message subject: `feat(client): play the frame in order or shuffled`. Body: « A Fisher-Yates round drawn once and kept until every photo has played; arrivals go right after the photo on screen, deletions leave the round. The menu's speed and order are one generic radio submenu. » Then the attribution lines.

**Chrome check (controller):** slide order is read with `[...document.querySelectorAll('[data-slot=carousel-item] img')].map((image) => image.alt)`.
- `/frame`, « … » → « Lecture » → « Aléatoire »: the order differs from the in-order list (with 5 photos or more); `localStorage` holds `"order":"shuffle"`. Set « Vitesse » to « 5 s », wait 12 s: the order array is unchanged, the shown photo moved on.
- From another tab on `/`, add a photo while the frame is idle and playing: it shows at once (R-CAD-40); in the order array, it sits right after the photo that was on screen.
- From the other tab, delete the photo on screen: the frame goes to the newest photo (R-CAD-29); its alt leaves the array.
- « Lecture » → « Dans l'ordre »: the array is back newest first. Open « Vignettes »: in shuffle, the strip follows the shuffled order.
- Clean up the test photo by hand; `localStorage.removeItem('familyframe.frame-settings')`.

---

> **Controller:** `gh stack add feat/frame-templates` before Task 5.

## PR C — `feat/frame-templates`

### Task 5: The four display templates, rendered (PR C, `feat/frame-templates`)

**Files:**
- Create: `client/src/components/frame/templateClasses.ts`, `client/src/components/frame/PolaroidPrint.tsx`
- Modify: `client/src/components/frame/PhotoSlide.tsx`, `client/src/components/frame/PhotoView.tsx`, `client/src/components/frame/SlideshowScreen.tsx`, `client/src/index.css`
- Modify: `ARCHITECTURE.md`

**Interfaces:**
- Consumes: `FrameTemplate`, `SlideshowSettings.template` (Task 3).
- Produces: `SLIDE_CLASSES`, `IMAGE_CLASSES` (`Record<FrameTemplate, string>`), `MAT_CLASSES`, `hasKenBurns`, `hasBackdrop`, `hasCaptionOverlay` (`(template: FrameTemplate) => boolean`); `PolaroidPrint({ photo, children })`; `PhotoSlide` and `PhotoView` gain a `template: FrameTemplate` prop; Tailwind colours `frame-mat`, `frame-print`.

No user-visible change yet with the default « Ajusté »: Task 6 adds the menu and the product docs.

- [ ] **Step 1: The template classes and the colours**

Create `client/src/components/frame/templateClasses.ts`:

```ts
import type { FrameTemplate } from '@/frameSettings.ts'

// The dark wall a mat or a print hangs on, lit softly from the middle.
const WALL_CLASSES = 'grid h-svh place-items-center bg-radial from-white/6 to-transparent to-75%'

export const SLIDE_CLASSES: Record<FrameTemplate, string> = {
  fit: '',
  fill: '',
  mat: WALL_CLASSES,
  polaroid: WALL_CLASSES,
}

// The vmin sizes keep the same proportions on a phone and on a TV. Each max size is the screen
// minus what the template puts around the photo: wall margin, mat, print border and band.
export const IMAGE_CLASSES: Record<FrameTemplate, string> = {
  fit: 'h-svh w-full object-contain drop-shadow-2xl',
  fill: 'h-svh w-full object-cover',
  // The white ring is the bevel cut into the mat.
  mat: 'block max-h-[calc(100svh_-_26vmin)] max-w-[calc(100vw_-_26vmin)] object-contain ring-[3px] ring-white/90',
  polaroid: 'block max-h-[calc(100svh_-_30vmin)] max-w-[calc(100vw_-_16vmin)] object-contain',
}

export const MAT_CLASSES = 'bg-frame-mat p-[8vmin] shadow-2xl shadow-black/60'

// A print zooming inside its mat looks broken: the mat and the polaroid are still frames.
export function hasKenBurns(template: FrameTemplate): boolean {
  return template === 'fit' || template === 'fill'
}

// Only Ajusté leaves bars around the photo for its blurred copy to fill.
export function hasBackdrop(template: FrameTemplate): boolean {
  return template === 'fit'
}

// The polaroid writes the date and the sender in its own band.
export function hasCaptionOverlay(template: FrameTemplate): boolean {
  return template !== 'polaroid'
}
```

`client/src/index.css`:

```diff
--- a/client/src/index.css
+++ b/client/src/index.css
@@
   /* .dark is app-wide (theme.ts): the frame's warm palette gets its own tokens instead. */
   --frame-background: oklch(0.14 0.008 60);
   --frame-accent: oklch(0.82 0.12 75);
+  /* Warm off-whites: a cardboard mat, and the glossier white of a print. */
+  --frame-mat: oklch(0.94 0.014 85);
+  --frame-print: oklch(0.98 0.006 85);
 }
 
 @theme inline {
@@
   --font-sans: "Geist Variable", sans-serif;
   --color-frame-background: var(--frame-background);
   --color-frame-accent: var(--frame-accent);
+  --color-frame-mat: var(--frame-mat);
+  --color-frame-print: var(--frame-print);
   --color-sidebar-ring: var(--sidebar-ring);
   --color-sidebar-border: var(--sidebar-border);
   --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
```

- [ ] **Step 2: The polaroid print**

Create `client/src/components/frame/PolaroidPrint.tsx`:

```tsx
import type { JSX, ReactNode } from 'react'
import { cn } from '@/lib/utils.ts'
import type { Photo } from '@/photo.ts'
import { formatPhotoDay } from '@/photoLabel.ts'

type PolaroidPrintProps = {
  photo: Photo
  // The photo itself, sized by the slide.
  children: ReactNode
}

// From the id, not the position in the slideshow: a photo arriving in front must not turn every
// print after it the other way.
function isTiltedLeft(photoId: string): boolean {
  let charCodeSum = 0
  for (const character of photoId) charCodeSum += character.charCodeAt(0)
  return charCodeSum % 2 === 0
}

export function PolaroidPrint({ photo, children }: PolaroidPrintProps): JSX.Element {
  return (
    // w-min: the print is as wide as its photo, and a long sender name wraps instead of widening it.
    <figure
      className={cn(
        'w-min bg-frame-print p-[3vmin] pb-0 text-black/75 shadow-2xl shadow-black/60',
        isTiltedLeft(photo.id) ? '-rotate-[1.5deg]' : 'rotate-[1.5deg]',
      )}
    >
      {children}
      <figcaption className="pt-[2vmin] pb-[3.5vmin]">
        <p className="text-[clamp(1rem,3vmin,2.25rem)] font-medium tracking-tight tabular-nums">
          <time dateTime={photo.createdAt}>{formatPhotoDay(photo.createdAt)}</time>
        </p>
        {photo.senderName !== null && (
          <p className="text-[clamp(0.875rem,2.2vmin,1.5rem)]">Envoyée par {photo.senderName}</p>
        )}
      </figcaption>
    </figure>
  )
}
```

- [ ] **Step 3: The slide and the view follow the template**

Replace `client/src/components/frame/PhotoSlide.tsx` with:

```tsx
import type { JSX, ReactNode } from 'react'
import { PolaroidPrint } from '@/components/frame/PolaroidPrint.tsx'
import {
  hasKenBurns,
  IMAGE_CLASSES,
  MAT_CLASSES,
  SLIDE_CLASSES,
} from '@/components/frame/templateClasses.ts'
import { CarouselItem } from '@/components/ui/carousel.tsx'
import type { FrameTemplate } from '@/frameSettings.ts'
import { cn } from '@/lib/utils.ts'
import type { Photo } from '@/photo.ts'
import { photoLabel } from '@/photoLabel.ts'

type PhotoSlideProps = {
  photo: Photo
  template: FrameTemplate
  isCurrent: boolean
  isZooming: boolean
}

function framedImage(template: FrameTemplate, photo: Photo, image: ReactNode): ReactNode {
  if (template === 'mat') return <div className={MAT_CLASSES}>{image}</div>
  if (template === 'polaroid') return <PolaroidPrint photo={photo}>{image}</PolaroidPrint>
  return image
}

export function PhotoSlide({
  photo,
  template,
  isCurrent,
  isZooming,
}: PhotoSlideProps): JSX.Element {
  const image = (
    <img
      className={cn(
        IMAGE_CLASSES[template],
        // Each photo starts its zoom when it arrives.
        isZooming && hasKenBurns(template) && 'motion-safe:animate-ken-burns',
      )}
      src={photo.url}
      alt={photoLabel(photo)}
      // The photo on screen loads first; the others wait until the carousel nears them.
      loading={isCurrent ? 'eager' : 'lazy'}
      fetchPriority={isCurrent ? 'high' : 'auto'}
    />
  )

  return (
    // The Ken Burns zoom must not spill onto the neighbouring slide.
    <CarouselItem className={cn('overflow-hidden', SLIDE_CLASSES[template])}>
      {framedImage(template, photo, image)}
    </CarouselItem>
  )
}
```

Replace `client/src/components/frame/PhotoView.tsx` with (the carousel hooks move to `useSlideshowCarousel`, the bottom block to `BottomOverlay`, so `PhotoView` stays within 30 lines; `GLIDING_LOOP`, the shade and the comments are the current ones):

```tsx
import { type JSX, type ReactNode, useState } from 'react'
import { PhotoBackdrop } from '@/components/frame/PhotoBackdrop.tsx'
import { PhotoCaption } from '@/components/frame/PhotoCaption.tsx'
import { PhotoSlide } from '@/components/frame/PhotoSlide.tsx'
import { hasBackdrop, hasCaptionOverlay } from '@/components/frame/templateClasses.ts'
import { Carousel, type CarouselApi, CarouselContent } from '@/components/ui/carousel.tsx'
import type { FrameTemplate } from '@/frameSettings.ts'
import { useCarouselArrowKeys } from '@/hooks/useCarouselArrowKeys.ts'
import { useCarouselPhoto } from '@/hooks/useCarouselPhoto.ts'
import { useLeavingPhoto } from '@/hooks/useLeavingPhoto.ts'
import { useSlideshow } from '@/hooks/useSlideshow.ts'
import type { Photo } from '@/photo.ts'

// Embla's default (25) is a quick flick; a frame on a wall should glide. Loop: after the oldest
// photo the newest comes in from the right, like any other next photo.
const GLIDING_LOOP = { duration: 45, loop: true }

type PhotoViewProps = {
  photos: Photo[]
  currentId: string
  template: FrameTemplate
  // null: no automatic advance.
  autoAdvanceMs: number | null
  onCurrentChange: (id: string) => void
  // Under the caption, inside the carousel: the ‹ › buttons need its context.
  children: ReactNode
}

type BottomOverlayProps = {
  // undefined: no caption, as on a polaroid.
  captionPhoto: Photo | undefined
  children: ReactNode
}

function BottomOverlay({ captionPhoto, children }: BottomOverlayProps): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 isolate">
      {/* The shade is there for the controls: at rest it fades out with them (FramePage sets data-idle). */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-black/75 via-black/30 to-transparent transition-opacity duration-500 motion-reduce:transition-none group-data-[idle=true]/frame:opacity-0"
      />
      {captionPhoto && <PhotoCaption key={captionPhoto.id} photo={captionPhoto} />}
      {/* The bottom bar sits on top of this box: just above the strip when it is open. */}
      <div className="relative">{children}</div>
    </div>
  )
}

type SlideshowCarousel = {
  setApi: (api: CarouselApi) => void
  leavingId: string | null
}

function useSlideshowCarousel({
  photos,
  currentId,
  autoAdvanceMs,
  onCurrentChange,
}: Omit<PhotoViewProps, 'template' | 'children'>): SlideshowCarousel {
  const [api, setApi] = useState<CarouselApi>()
  useCarouselPhoto({ api, photos, currentId, onCurrentChange })
  useCarouselArrowKeys(api)
  useSlideshow(api, autoAdvanceMs)
  // The outgoing photo keeps its zoom while it slides out, instead of snapping back.
  return { setApi, leavingId: useLeavingPhoto(api, currentId) }
}

export function PhotoView({ template, children, ...carouselProps }: PhotoViewProps): JSX.Element {
  const { photos, currentId } = carouselProps
  const { setApi, leavingId } = useSlideshowCarousel(carouselProps)
  const currentPhoto = photos.find(({ id }) => id === currentId)

  return (
    // clip, not hidden: the scaled backdrop overflows, and a hidden box can still be scrolled.
    <div className="relative isolate h-svh overflow-clip">
      {currentPhoto && hasBackdrop(template) && (
        <PhotoBackdrop key={currentPhoto.id} url={currentPhoto.thumbnailUrl} />
      )}
      <Carousel setApi={setApi} opts={GLIDING_LOOP}>
        <CarouselContent>
          {photos.map((photo) => (
            <PhotoSlide
              key={photo.id}
              photo={photo}
              template={template}
              isCurrent={photo.id === currentId}
              isZooming={photo.id === currentId || photo.id === leavingId}
            />
          ))}
        </CarouselContent>
        <BottomOverlay captionPhoto={hasCaptionOverlay(template) ? currentPhoto : undefined}>
          {children}
        </BottomOverlay>
      </Carousel>
    </div>
  )
}
```

Before replacing, diff the current `PhotoSlide.tsx` and `PhotoView.tsx` against the blocks above: only the template lines, the two extractions and the `captionPhoto` prop are new. Anything else that differs is real code to keep; log it.

`client/src/components/frame/SlideshowScreen.tsx`:

```diff
--- a/client/src/components/frame/SlideshowScreen.tsx
+++ b/client/src/components/frame/SlideshowScreen.tsx
@@
       <PhotoView
         photos={photos}
         currentId={currentPhoto.id}
+        template={settings.template}
         // The slideshow waits while someone is using the frame.
         autoAdvanceMs={settings.isPlaying && !isActive ? settings.intervalMs : null}
         onCurrentChange={selection.selectPhoto}
```

- [ ] **Step 4: Docs**

`ARCHITECTURE.md`, after the « Lecture aléatoire » paragraph:

```
Modèles d'affichage (`components/frame/templateClasses.ts`) : une table de classes Tailwind par modèle pour la diapositive et la photo, en `vmin` pour garder les mêmes proportions sur un téléphone et sur une télévision. « Passe-partout » entoure la photo d'un carton (`--frame-mat`), « Polaroïd » d'un tirage (`PolaroidPrint`, `--frame-print`) qui porte la date et l'expéditeur, et penche d'un côté tiré de l'identifiant de la photo, pour qu'une arrivée ne retourne pas les autres. Le fond flou ne sert qu'à « Ajusté », la légende du bas disparaît avec « Polaroïd », et le zoom lent ne s'applique qu'à « Ajusté » et « Plein format ».
```

- [ ] **Step 5: Verify**

Run: `pnpm check && pnpm typecheck && pnpm --filter client build && pnpm test`
Expected: green, `Tests  219 passed (219)`. Measure: `PhotoView` and `PhotoSlide` at most 30 lines; `SlideshowScreen` at 40 (accepted, Choice 13).

- [ ] **Step 6: Commit**

```bash
git add client/src/components/frame/templateClasses.ts client/src/components/frame/PolaroidPrint.tsx client/src/components/frame/PhotoSlide.tsx client/src/components/frame/PhotoView.tsx client/src/components/frame/SlideshowScreen.tsx client/src/index.css ARCHITECTURE.md
git commit -F <message-file>
```

Message subject: `feat(client): render the frame's display templates`. Body: « Fit (the current look), fill, mat and polaroid, sized in vmin. The backdrop, the bottom caption and the Ken Burns zoom follow the template. Nothing selects them yet. » Then the attribution lines.

**Chrome check (controller):** the template is set by hand until Task 6. At 1280×800 and at 375×667, for each value, `localStorage.setItem('familyframe.frame-settings', '{"template":"<value>","order":"newest","intervalMs":10000}')`, reload `/frame`, screenshot:
- `fit`: as before (blurred backdrop, zoom, caption at the bottom).
- `fill`: the photo covers the screen (`getComputedStyle(img).objectFit === 'cover'`), zoom on.
- `mat`: the photo whole inside a light mat with a white bevel, dark wall around; no backdrop element; the current `img` has no `animate-ken-burns` class; caption at the bottom.
- `polaroid`: a white print tilted 1.5°, the date and, for a received photo, « Envoyée par [nom] » in its band; no bottom caption; the same photo keeps its tilt after a reload.
- For `mat` and `polaroid`: the current slide's `img.getBoundingClientRect()` lies inside the viewport; `document.documentElement.scrollWidth <= innerWidth`.
- Clean up: `localStorage.removeItem('familyframe.frame-settings')`.

---

### Task 6: « Affichage » in the frame menu (PR C, `feat/frame-templates`)

**Files:**
- Modify: `client/src/components/frame/frameSettingOptions.ts`, `client/src/components/frame/SlideshowMenu.tsx`
- Modify: `ARCHITECTURE.md`, `README.md`, `docs/produit/cadre.md`, `docs/produit/README.md`, `docs/produit/a-venir.md`

**Interfaces:**
- Consumes: `RadioSubmenu`, `SettingOption` (Task 4); `FrameTemplate`, `onTemplateChange` (Task 3).
- Produces: `TEMPLATE_OPTIONS: SettingOption<FrameTemplate>[]`.

- [ ] **Step 1: The template options**

```diff
--- a/client/src/components/frame/frameSettingOptions.ts
+++ b/client/src/components/frame/frameSettingOptions.ts
@@
-import { type PlaybackOrder, SLIDESHOW_INTERVALS_MS } from '@/frameSettings.ts'
+import { type FrameTemplate, type PlaybackOrder, SLIDESHOW_INTERVALS_MS } from '@/frameSettings.ts'
 
 export type SettingOption<Value> = { value: Value; label: string }
 
@@
 
 const MS_PER_SECOND = 1000
 
+export const TEMPLATE_OPTIONS: SettingOption<FrameTemplate>[] = [
+  { value: 'fit', label: 'Ajusté' },
+  { value: 'fill', label: 'Plein format' },
+  { value: 'mat', label: 'Passe-partout' },
+  { value: 'polaroid', label: 'Polaroïd' },
+]
+
 export const ORDER_OPTIONS: SettingOption<PlaybackOrder>[] = [
   { value: 'newest', label: "Dans l'ordre" },
   { value: 'shuffle', label: 'Aléatoire' },
```

- [ ] **Step 2: The submenu**

```diff
--- a/client/src/components/frame/SlideshowMenu.tsx
+++ b/client/src/components/frame/SlideshowMenu.tsx
@@
-import { ShuffleIcon, TimerIcon } from 'lucide-react'
+import { FrameIcon, ShuffleIcon, TimerIcon } from 'lucide-react'
 import type { JSX } from 'react'
 import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
-import { INTERVAL_OPTIONS, ORDER_OPTIONS } from '@/components/frame/frameSettingOptions.ts'
+import {
+  INTERVAL_OPTIONS,
+  ORDER_OPTIONS,
+  TEMPLATE_OPTIONS,
+} from '@/components/frame/frameSettingOptions.ts'
 import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
 import { RadioSubmenu } from '@/components/frame/RadioSubmenu.tsx'
 import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu.tsx'
@@
 export function SlideshowMenu({ photo, settings }: SlideshowMenuProps): JSX.Element {
   return (
     <PhotoActionsMenu photo={photo} label="Actions sur la photo" className={GLASS_BUTTON_CLASSES}>
+      <RadioSubmenu
+        icon={FrameIcon}
+        label="Affichage"
+        options={TEMPLATE_OPTIONS}
+        value={settings.template}
+        onValueChange={settings.onTemplateChange}
+      />
       <RadioSubmenu
         icon={ShuffleIcon}
         label="Lecture"
```

- [ ] **Step 3: Docs**

`docs/produit/cadre.md`, « Diaporama »:

- « Ce que l'on peut faire », before the speed bullet: « Choisir le modèle d'affichage : « Ajusté », « Plein format », « Passe-partout » ou « Polaroïd » (menu « … », « Affichage ») ; l'appareil le retient. »
- « Règles », R-CAD-26 becomes « R-CAD-26 · Remplacée : l'affichage de la photo dépend du modèle choisi (R-CAD-67). » and R-CAD-27 becomes « R-CAD-27 · Remplacée : le zoom lent ne concerne plus que deux modèles (R-CAD-68). »
- « Règles », after R-CAD-66:

  ```
  16. R-CAD-67 · Quatre modèles d'affichage. « Ajusté » (par défaut) : la photo entière, sans être coupée, l'espace autour rempli par une version floutée d'elle-même. « Plein format » : la photo remplit tout l'écran, quitte à couper ses bords. « Passe-partout » : la photo entière dans un large carton clair, sur un mur sombre. « Polaroïd » : la photo entière sur un tirage blanc légèrement penché, avec une bande en bas.
  17. R-CAD-68 · Avec « Ajusté » et « Plein format », la photo affichée s'agrandit très lentement et légèrement (zoom lent) pendant 20 secondes ; « Passe-partout » et « Polaroïd » restent immobiles. Le zoom lent est désactivé sur les appareils réglés pour réduire les animations.
  18. R-CAD-69 · Avec « Polaroïd », la date et, pour une photo reçue, « Envoyée par [nom] » s'écrivent dans la bande du tirage, et plus en bas de l'écran. Une même photo penche toujours du même côté.
  19. R-CAD-70 · Le modèle choisi est retenu sur l'appareil, comme la vitesse et l'ordre (R-CAD-62, R-CAD-63).
  ```

- « Messages affichés »: add the row `| Choix du modèle | « Affichage » : « Ajusté », « Plein format », « Passe-partout », « Polaroïd » |` above « Choix de l'ordre » (pad the table).
- « Ce qui n'est pas possible »: remove « Choisir un modèle d'affichage (passe-partout, polaroïd…) : prévu, voir [a-venir.md](a-venir.md). »

`docs/produit/README.md`, glossary, after **Diaporama**: `| **Modèle d'affichage** | La façon dont le cadre présente chaque photo : ajustée sur un fond flouté, en plein format, dans un passe-partout ou en polaroïd. Chaque appareil garde le sien. |` (pad the table).

`docs/produit/a-venir.md`: remove the whole « Étape 8 · Mode cadre » section (its last bullet, the templates, is delivered). Then `git grep -n "Étape 8" docs/` must return nothing; fix any link to that section.

`ARCHITECTURE.md`, Pages, `/frame` row: « son menu « … » propose « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse » » becomes « son menu « … » propose « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse » ».

`README.md`, after the frame sentence of Task 1, add: « Son menu « … » règle le modèle d'affichage, l'ordre de lecture et la vitesse, retenus par appareil. »

- [ ] **Step 4: Verify**

Run: `pnpm check && pnpm typecheck && pnpm --filter client build && pnpm test`
Expected: green, `Tests  219 passed (219)`. `SlideshowMenu` at most 30 lines.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/frame/frameSettingOptions.ts client/src/components/frame/SlideshowMenu.tsx ARCHITECTURE.md README.md docs/produit/cadre.md docs/produit/README.md docs/produit/a-venir.md
git commit -F <message-file>
```

Message subject: `feat(client): choose the display template from the frame menu`. Body: « « Affichage » lists the four templates, remembered per device like the speed and the order. » Then the attribution lines.

**Chrome check (controller):**
- `/frame`, « … »: « Affichage », « Lecture », « Vitesse » in that order, then the photo actions. « Affichage » lists « Ajusté » (checked), « Plein format », « Passe-partout », « Polaroïd ».
- Pick « Passe-partout »: the slide changes at once; `localStorage` holds `"template":"mat"`; reload: still the mat, « Passe-partout » checked.
- Pick « Polaroïd », then « Ajusté »: each applies at once. The submenu content is dark (`dark` class), readable.
- Keyboard: open « … » with Enter, arrows into « Affichage », Enter on an item: applied, the slideshow did not change photo (R-CAD-25).
- Clean up: `localStorage.removeItem('familyframe.frame-settings')`.

---

> **Controller:** `gh stack add feat/settings-frame-card` before Task 7.

## PR D — `feat/settings-frame-card`

### Task 7: « Cadre de cet appareil » in « Préférences » (PR D, `feat/settings-frame-card`)

**Files:**
- Create: `client/src/components/settings/SettingToggleGroup.tsx`, `client/src/components/settings/FrameSettingsCard.tsx`
- Modify: `client/src/pages/SettingsPage.tsx`
- Modify: `ARCHITECTURE.md`, `README.md`, `docs/produit/preferences.md`, `docs/produit/cadre.md`, `docs/produit/README.md`

**Interfaces:**
- Consumes: `useFrameSettings`, `FrameSettingsControls` (Task 3); `optionSelector`, `SettingOption`, `ORDER_OPTIONS`, `INTERVAL_OPTIONS` (Task 4); `TEMPLATE_OPTIONS` (Task 6).
- Produces: `SettingToggleGroup<Value extends string | number>({ label, options, value, onValueChange })`; `FrameSettingsCard(): JSX.Element`.

The settings page from step 6 (`f963c8e`): `pages/SettingsPage.tsx` renders `AvatarCard`, `DisplayNameCard`, `EmailCard`, `PasswordCard` in `<main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">`. The card below uses the shadcn `Card` directly: `SettingsCard` wraps a form with « Enregistrer », which this card does not have. Read `components/settings/SettingsCard.tsx` first: if its header markup (title and description classes) differs from `CardHeader` / `CardTitle` / `CardDescription`, copy its header so the five cards look alike, and log it.

- [ ] **Step 1: A single-choice toggle group**

Create `client/src/components/settings/SettingToggleGroup.tsx`:

```tsx
import { type JSX, useId } from 'react'
import { optionSelector, type SettingOption } from '@/components/frame/frameSettingOptions.ts'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'

type SettingToggleGroupProps<Value extends string | number> = {
  label: string
  options: SettingOption<Value>[]
  value: Value
  onValueChange: (value: Value) => void
}

// A single-choice toggle group: Radix gives its items the radio role. Pressing the chosen item
// again sends '', which optionSelector ignores: a setting always keeps a value.
export function SettingToggleGroup<Value extends string | number>({
  options,
  ...props
}: SettingToggleGroupProps<Value>): JSX.Element {
  // Names the group for screen readers.
  const labelId = useId()

  return (
    <div className="flex flex-col gap-2">
      <p id={labelId} className="text-sm font-medium">
        {props.label}
      </p>
      <ToggleGroup
        type="single"
        variant="outline"
        value={String(props.value)}
        onValueChange={optionSelector(options, props.onValueChange)}
        aria-labelledby={labelId}
        className="flex-wrap"
      >
        {options.map((option) => (
          <ToggleGroupItem key={option.value} value={String(option.value)}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
```

- [ ] **Step 2: The card**

Create `client/src/components/settings/FrameSettingsCard.tsx`:

```tsx
import type { JSX } from 'react'
import {
  INTERVAL_OPTIONS,
  ORDER_OPTIONS,
  TEMPLATE_OPTIONS,
} from '@/components/frame/frameSettingOptions.ts'
import { SettingToggleGroup } from '@/components/settings/SettingToggleGroup.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { type FrameSettingsControls, useFrameSettings } from '@/hooks/useFrameSettings.ts'

function FrameSettingsGroups({ settings }: { settings: FrameSettingsControls }): JSX.Element {
  return (
    <>
      <SettingToggleGroup
        label="Affichage"
        options={TEMPLATE_OPTIONS}
        value={settings.template}
        onValueChange={settings.onTemplateChange}
      />
      <SettingToggleGroup
        label="Lecture"
        options={ORDER_OPTIONS}
        value={settings.order}
        onValueChange={settings.onOrderChange}
      />
      <SettingToggleGroup
        label="Vitesse"
        options={INTERVAL_OPTIONS}
        value={settings.intervalMs}
        onValueChange={settings.onIntervalChange}
      />
    </>
  )
}

// No « Enregistrer »: these settings stay in this browser, so each choice is saved at once.
export function FrameSettingsCard(): JSX.Element {
  const settings = useFrameSettings()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadre de cet appareil</CardTitle>
        <CardDescription>Ces réglages ne concernent que cet appareil.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <FrameSettingsGroups settings={settings} />
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: On the page**

`client/src/pages/SettingsPage.tsx`:

```diff
--- a/client/src/pages/SettingsPage.tsx
+++ b/client/src/pages/SettingsPage.tsx
@@
 import { DisplayNameCard } from '@/components/settings/DisplayNameCard.tsx'
 import { EmailCard } from '@/components/settings/EmailCard.tsx'
+import { FrameSettingsCard } from '@/components/settings/FrameSettingsCard.tsx'
 import { PasswordCard } from '@/components/settings/PasswordCard.tsx'
@@
         <h1 className="text-2xl font-semibold tracking-tight">Préférences</h1>
         <p className="text-sm text-muted-foreground">
-          Votre profil et la sécurité de votre compte.
+          Votre profil, la sécurité de votre compte et le cadre de cet appareil.
         </p>
       </header>
@@
       <EmailCard email={user.email} />
       <PasswordCard />
+      <FrameSettingsCard />
     </main>
   )
 }
```

- [ ] **Step 4: Docs**

`docs/produit/preferences.md`:

- Intro: « La page où chacun règle son compte : sa photo de profil, son nom affiché et son mot de passe, et où il voit son adresse e-mail. » becomes « La page où chacun règle son compte : sa photo de profil, son nom affiché et son mot de passe, et où il voit son adresse e-mail. On y règle aussi le cadre de l'appareil utilisé. »
- « Ouvrir ses préférences », « Messages affichés », row « En-tête de la page »: « « Préférences » — « Votre profil, la sécurité de votre compte et le cadre de cet appareil. » » (pad the table).
- At the end of the file, a new section:

  ```
  ## Cadre de cet appareil

  **Ce que l'on peut faire**

  - Choisir, pour le cadre de l'appareil utilisé, le modèle d'affichage, l'ordre de lecture et la vitesse, dans l'encart « Cadre de cet appareil ».

  **Règles**

  1. R-PRF-50 · Cet encart n'a pas de bouton « Enregistrer » : chaque choix est retenu aussitôt. Un choix déjà sélectionné le reste quand on le touche de nouveau.
  2. R-PRF-51 · Ces réglages sont ceux du menu « … » du cadre (voir [cadre.md](cadre.md#diaporama), R-CAD-62, R-CAD-66, R-CAD-70) : ils ne valent que pour cet appareil, dans ce navigateur. Changés d'un côté, ils s'appliquent de l'autre.
  3. R-PRF-52 · Un cadre ouvert dans un autre onglet du même navigateur applique un choix aussitôt, sans recharger.

  **Messages affichés**

  | Situation         | Message                                                                      |
  | ----------------- | ---------------------------------------------------------------------------- |
  | Titre de l'encart | « Cadre de cet appareil » — « Ces réglages ne concernent que cet appareil. » |
  | Choix du modèle   | « Affichage » : « Ajusté », « Plein format », « Passe-partout », « Polaroïd » |
  | Choix de l'ordre  | « Lecture » : « Dans l'ordre », « Aléatoire »                                |
  | Choix de vitesse  | « Vitesse » : « 5 s », « 10 s », « 20 s »                                    |

  **Ce qui n'est pas possible**

  - Régler le cadre d'un autre appareil à distance : les réglages se font sur l'appareil du cadre.
  - Retrouver ces réglages sur un autre appareil ou dans un autre navigateur.
  ```

  (Pad the table to its widest cell.)

`docs/produit/cadre.md`, « Diaporama », « Ce que l'on peut faire », after the speed bullet: « Faire ces mêmes réglages depuis la page « Préférences », encart « Cadre de cet appareil » (voir [preferences.md](preferences.md#cadre-de-cet-appareil)). »

`docs/produit/README.md`, « Fichiers », row `preferences.md`: « Page « Préférences » : photo de profil, nom affiché, mot de passe, adresse e-mail. » becomes « Page « Préférences » : photo de profil, nom affiché, mot de passe, adresse e-mail, réglages du cadre de cet appareil. » (pad the table).

`ARCHITECTURE.md`, Pages, `/settings` row: « une carte par réglage, chacune avec son « Enregistrer » » becomes « une carte par réglage, chacune enregistrée seule », and at the end of the row add « ; « Cadre de cet appareil » : modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre) ».

`README.md`, the frame menu sentence of Task 6 becomes « Son menu « … » règle le modèle d'affichage, l'ordre de lecture et la vitesse, retenus par appareil ; on les retrouve dans « Préférences », encart « Cadre de cet appareil ». »

- [ ] **Step 5: Verify**

Run: `pnpm check && pnpm typecheck && pnpm --filter client build && pnpm test`
Expected: green, `Tests  219 passed (219)`. Measure: `SettingToggleGroup`, `FrameSettingsCard`, `FrameSettingsGroups` at most 30 lines.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/settings/SettingToggleGroup.tsx client/src/components/settings/FrameSettingsCard.tsx client/src/pages/SettingsPage.tsx ARCHITECTURE.md README.md docs/produit/preferences.md docs/produit/cadre.md docs/produit/README.md
git commit -F <message-file>
```

Message subject: `feat(client): set this device's frame from the settings page`. Body: « The same three settings as the frame menu, as single-choice toggle groups, saved at each choice; a frame open in another tab follows. » Then the attribution lines.

**Chrome check (controller):**
- `/settings`: after « Mot de passe », the card « Cadre de cet appareil » — « Ces réglages ne concernent que cet appareil. », three groups « Affichage », « Lecture », « Vitesse »; « Ajusté », « Dans l'ordre », « 10 s » pressed. The header reads « Votre profil, la sécurité de votre compte et le cadre de cet appareil. »
- Accessibility: `document.querySelectorAll('[role=radiogroup][aria-labelledby]').length === 3`; each item has `role="radio"` and the pressed one `aria-checked="true"`.
- Click « Polaroïd »: pressed; `localStorage` holds `"template":"polaroid"`. Click « Polaroïd » again: still pressed.
- Keyboard: Tab into « Lecture », arrow right to « Aléatoire », Space: pressed.
- Two tabs: tab 1 on `/frame`, tab 2 on `/settings`. In tab 2, « Passe-partout » then « 5 s »: tab 1 shows the mat at once and advances every 5 s. In tab 1, « … » → « Affichage » → « Ajusté »; reload tab 2: « Ajusté » pressed.
- Width 375 px: the « Affichage » group wraps, no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`).
- Clean up: `localStorage.removeItem('familyframe.frame-settings')`.

---

## Final verification (controller)

- [ ] `pnpm check && pnpm typecheck && pnpm --filter client build && pnpm test` on `feat/settings-frame-card`: green, `Tests  219 passed (219)`.
- [ ] `git diff feat/client-settings..feat/settings-frame-card --stat -- server client/package.json pnpm-lock.yaml`: empty (no server, Bruno or dependency change).
- [ ] `git grep -n " as \|console\." -- client/src/fullscreen.ts client/src/frameSettings.ts client/src/shuffleOrder.ts client/src/hooks client/src/components/frame client/src/components/settings`: no new cast, no new `console`.
- [ ] Each task's Chrome check passed, on the author's dev client (5180) against the author's API, never restarted by the controller; test photos removed by hand, **never** with `pnpm db:seed`; `familyframe.frame-settings` removed at the end.
- [ ] `docs/produit/a-venir.md` has no « Étape 8 » section; every new rule id (R-CAD-58..70, R-PRF-50..52) did not exist before; R-CAD-21, 22, 26, 27 read « Remplacée : … (R-CAD-NN) ».
- [ ] `git log --oneline feat/client-settings..feat/settings-frame-card`: the spec and plan commit first, then the refactor, then one concern per commit, each ending with the attribution lines; no `.env` file in `git diff --stat`.
- [ ] Fresh-context review of the whole stack diff (`superpowers:requesting-code-review`), then `gh stack submit --auto` (draft PRs) and `gh stack view --json`.

---

## Drift Log

Format: `date · task/step · what the plan said · what was done · why`.

| Date | Task / step | Plan said | Done | Why |
| ---- | ----------- | --------- | ---- | --- |
| 2026-11-25 | Plan | Spec: ✕ exits full screen, the listener leaves | ✕ leaves, the unmount exits full screen | One path, works without full screen (Choice 1) |
| 2026-11-25 | Plan | Spec: a deleted photo in shuffle gives way to the next in the order | R-CAD-29 kept: the newest | « same as in order » means R-CAD-29 (Choice 4) |
| 2026-11-25 | Plan | Spec: polaroid tilt from the position | From the photo id | Positions shift on arrivals; the spec also wants a stable tilt (Choice 5) |
| 2026-11-25 | Plan | Spec: card rules in `preferences.md` | `preferences.md` from step 6, R-PRF-50..52 | The file exists since step 6 (Choice 6) |

---

## Self-review (done while writing the plan)

**1. Spec coverage**

| Spec item | Task |
| --- | --- |
| Full screen on « Cadre », « Mode cadre » (library, viewer), in the click | 1 |
| Leaving full screen (Escape, F11, gesture) leaves the frame; unmount exits full screen | 1 |
| No full screen (iPhone, refusal): the frame works in the page | 1 |
| « Plein écran » button for a frame opened directly | 2 |
| `{ template, order, intervalMs }` in `localStorage`, validated per field, try/catch, other tabs follow | 3 |
| Pause and strip not remembered | 3 |
| Shuffle: drawn once, kept for the round, arrivals after the shown photo, reshuffle | 4 |
| « Lecture » submenu | 4 |
| Templates Ajusté, Plein format, Passe-partout, Polaroïd; Ken Burns only on the first two; polaroid caption on the print | 5 |
| « Affichage » submenu | 6 |
| « Cadre de cet appareil » card in « Préférences » | 7 |
| Product docs, ARCHITECTURE, README, a-venir | 1-7 |

**2. Placeholder scan:** no TBD; every code step has its full code or an exact diff; every UI string is written out. `<scratchpad>` and `<message-file>` are paths chosen at run time.

**3. Type consistency:** `FrameSettingsControls` (Task 3) is the `settings` prop of `SlideshowMenu` (Task 4) and of `FrameSettingsGroups` (Task 7); `SlideshowSettings` extends it, so `SlideshowTopBar` passes `settings` whole. `SettingOption<Value>` and `optionSelector` (Task 4) serve `RadioSubmenu` and `SettingToggleGroup`. `FrameTemplate` keys `SLIDE_CLASSES` and `IMAGE_CLASSES` (`Record`, so a fifth template fails to compile until it has classes). `TEMPLATE_OPTIONS` appears in Task 6 and is first used by Task 7.
