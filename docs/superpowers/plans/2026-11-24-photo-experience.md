---
plan: photo-experience
status: ready
spec: docs/superpowers/specs/2026-11-24-photo-experience-design.md
branch: feat/photo-toasts (PR A), feat/photo-viewer (PR B), feat/library-frame-merge (PR C), feat/share-sheet (PR D)
worktree: false
tasks_total: 10
tasks_done: 0
current_task: 1
last_commit: 9899a1b
last_updated: 2026-11-24
---

# Photo Experience (Step 7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Working agreement (mandatory):** keep this plan in sync with reality. Check a step only when it is finished and its gate is green. Append every divergence to the Drift Log. Update the frontmatter (`tasks_done`, `current_task`, `last_commit`, `last_updated`) at each task boundary. When a drift produces a durable correction (path, command, signature, decision), amend the affected task block in place and log the amendment: implementers only receive their own task block. Never check a partial step; never delete a finished step or a drift entry. Under subagent-driven development, `.superpowers/sdd/progress.md` is the runtime authority; the frontmatter mirrors it.

**Goal:** A photo opens full size inside the app (`/?photo=<id>`): swipe, arrows or keys to the next one, the same « … » menu, and « Mode cadre » to start the slideshow from it. `/` becomes the one place to browse; `/frame` is the slideshow only, and leaving it comes back to the photo that was shown. Sending a photo takes one sheet: tap faces, one button, one toast « Envoyée à Mamie et Tata ». Toasts replace the alerts, small buttons grow under a finger. Client only: no API, Bruno or server change.

**Architecture:** Sonner (approved) gives one `<Toaster />` in `App.tsx`, themed from the `.dark` class on `<html>` (`useAppliedTheme`). The viewer is a full-screen Radix `Dialog` (`components/viewer/`) over `LibraryPage`, driven by the `photo` search parameter (`useViewerParam`: push on open, replace on swipe, back or replace on close, `isLibraryBelow` history state) and by pure helpers (`viewerHistory.ts`, `viewerNavigation.ts`) that decide what to show when the open photo is missing (wait, load the next page, show the neighbour, close). `usePhotoLibrary` gains `isFirstPageLoaded`, and a reconnect reloads as many photos as were loaded (`fetchNewestPhotos`). `/frame` drops its library mode: `FramePage` renders the slideshow, a `FrameStatusScreen` tells loading, empty and failure apart, and `useLeaveFrame` replaces `/frame` with `/?photo=<id>`. The share sheet (`ShareSheet` → `ShareFriendsForm` → `FriendPicker`) is a bottom `Sheet` under 48rem and a `Dialog` above, sends one request per friend in sequence (`useShareSending`) and announces the result with a toast (`shareTexts.ts`). Four PRs stacked on `feat/account-profile`.

**Tech Stack:** React 19, react-router 7 (`useSearchParams`, `useLocation`, `useNavigate`), Vite 8, TypeScript 7 (`tsc -b`), Tailwind 4.3 (built-in `pointer-coarse:` variant), shadcn/ui radix-nova on the installed `radix-ui` package, embla-carousel-react 8.6 (shadcn `ui/carousel.tsx`), lucide-react, **sonner 2.0.8 (new, approved)**, Biome 2.6, lefthook + commitlint, `gh stack`.

## Global Constraints

- **One new dependency: `sonner`**, added in Task 1 with `pnpm --filter client add sonner` (the author approved it). Nothing else: no `next-themes` (the shadcn `sonner.tsx` is adapted to `theme.ts`), no `vaul` (no swipe-down on the sheet), no test runner. **Never run `shadcn` or any other CLI that might add dependencies**: every generated file's content is written in its task.
- **Client only.** No file under `server/` changes, no Bruno change. `pnpm test` stays at the baseline: `Test Files  14 passed (14)`, `Tests  180 passed (180)`.
- **No client test runner:** client tasks are verified by `pnpm check`, `pnpm typecheck`, `pnpm --filter client build`, `pnpm test` (server stays green) and the task's **Chrome check**, run by the controller.
- **Dev servers:** implementers never start, stop or restart anything on **5180** or **3000** (the author's servers). If an implementer needs a client, `pnpm --filter client exec vite --port 5182 --strictPort`, stopped afterwards (on Windows, check that no `node` is left on 5182 and kill only that PID).
- **Never read or print a `.env` file.** A command containing both a reader word (`grep`, `cat`…) and `.env` is blocked by the hook: pass long text through a file.
- **Commits:** `git commit -F <message-file>`; every message ends, after a blank line, with exactly:

  ```
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Hm8u1MNisEcmacs5tNKshr
  ```

  `git commit` runs Biome (pre-commit) and commitlint (commit-msg): a failing hook means the commit did not happen. Each task ends with one commit (Task 8 and Task 10 may end with two, listed) that passes `pnpm check` and `pnpm typecheck`.
- **Docs in the same commit as the behaviour** (AGENTS.md): `ARCHITECTURE.md` (Pages, Temps réel) and the `README.md` page table and how-to paragraphs, **and `docs/produit/`** (French, no technical terms, rule ids `R-<DOMAINE>-<NN>`, sections « Ce que l'on peut faire » / « Règles » / « Messages affichés » / « Ce qui n'est pas possible »). `docs/produit/` lands as the first commit of PR A, before this plan; its files were not readable while planning, so each docs step names the file and the exact statements, and says **"next free id"**: read the file, take the domain prefix it already uses and the next number. Never renumber an existing rule. Each delivered item leaves `docs/produit/a-venir.md` section 7 in the task that delivers it.
- **UI text (French, exact):** every string is written out in the task that adds it.
- **TypeScript (AGENTS.md):** no `as` casts, explicit return types on exported functions, literal unions rather than `enum`.
- **Code rules (`.claude/rules/`):** comment why, never what; no file-summary comments; name callback params after the item; no magic numbers; every function at most 30 lines, every file at most 300 lines; max 5 params; no flag parameters; booleans prefixed `is`/`has`/`should`; catch errors as `unknown`; log through the logger, never `console` (client code keeps its existing `console.error` calls in `photosApi.ts`: the logger is server-only).
- Client imports use the `@/` alias with the `.ts`/`.tsx` extension, except the generated `components/ui/*` files, which keep the shadcn style.
- **Language:** code, comments and commits in English; UI text, README, ARCHITECTURE and `docs/produit/` in French.

## Choices made while planning (not in the spec, or resolving a conflict with the code or the rules)

1. **Coordinator additions folded in** (audit of the product docs, after the spec): (a) the upload form's « Photo envoyée ! » becomes the toast « Photo ajoutée à votre bibliothèque. » (Task 1); (b) the file inputs accept JPEG, PNG and WebP only, the server's list (Task 3); (c) delete failures become error toasts (Task 1, already spec open question 4); (d) `/frame` tells loading, empty and failure apart (Task 7); (e) a socket reconnect no longer drops the library back to 30 photos (Task 5); (f) the frame always has a way back to the library: ✕ « Quitter le mode cadre » on the slideshow, « Retour à la bibliothèque » on the status screens (Task 7). The spec is not rewritten: these are recorded here and in the Drift Log at the end of the step.
2. **Ten tasks instead of eight:** (b) and (e) are their own concerns (one commit each, atomic). (d) and (f) ride with Task 7, which already rewrites `FramePage`.
3. **Reconnect keeps what was loaded** (e): the first-page loader asks for `max(loaded count, 30)` photos, fetched 100 at a time (`fetchNewestPhotos`), instead of one page of 30. The count is read from a ref (`useLoadCountReader`): state would reconnect the socket on every change. Simpler than replaying the loaded pages' cursors, and the open photo stays in the list, so the viewer does not take a reload for a deletion. A photo deleted elsewhere during the outage is still detected as deleted (it is missing after being seen): the viewer then shows its neighbour, as specified.
4. **Frame status** (d): `usePhotoFeed` returns `{ photos, status }`, `status: 'loading' | 'loaded' | 'failed'`; `failed` only while no load ever succeeded (a later failed refresh keeps the photos on screen, as today). Texts: « Chargement des photos… », the existing « En attente de la première photo… » with the address line, « Les photos n'ont pas pu être chargées. » + « Le cadre réessaiera dès que la connexion reviendra. » (the feed reloads on each socket connection and once a day). No « Réessayer » button: a frame on a wall reloads by itself.
5. **Leaving an empty frame** (f): `useLeaveFrame` takes `string | null`; `null` goes back (`navigate(-1)`) when the library is below, else replaces with `/`.
6. **`usePhotoLibrary` stays at 30 lines:** Task 4's multi-line return (Biome) pushes the hook to 37 lines; `usePhotoAdder` is extracted in the same task. Task 5 adds `useLoadCountReader` for the same reason.
7. **Pre-existing over-30 functions, left as they are:** `useFrameSelection` (77 → 54 lines after Task 7), `FramePage` (53 → 42), `AppRoutes` in `App.tsx` (39, only the `<Toaster />` sibling is added), `PhotoListRow` (34 → 36, one `data-photo-id` attribute). `useViewerParam` is new at 34 lines: five three-line callbacks sharing one history policy; splitting it would scatter that policy. Noted for the author.
8. **Temporary `useFriendShares` adaptation (Task 9):** removing `SHARE_DUPLICATE_MESSAGE` from `photosApi.ts` breaks the old dialog's hook until Task 10 deletes it; Task 9 moves the constant into that hook and handles the new `duplicate` status, so Task 9 compiles on its own.
9. **The upload accept list is a string constant** (`'image/jpeg,image/png,image/webp'`), duplicated from the server's `ALLOWED_TYPES`: the client and server share no code (ARCHITECTURE, Temps réel, last bullet). iOS Safari converts HEIC camera shots to JPEG when the input does not list HEIC, so the camera input keeps working.
10. **Sonner theme tokens inline:** Sonner's `[data-sonner-toaster][data-sonner-theme=light]` selectors (specificity 0,2,0) outrank a utility class, so the shadcn tokens go in `style`, typed `React.CSSProperties & Record<\`--${string}\`, string>` (no cast). The registry's `toastOptions: { classNames: { toast: 'cn-toast' } }` is dropped: the class is not defined in this project.
11. **No `<form>` in the share sheet:** a `div` with a button, so Enter in the search field does not send.

### Verified behavior

- Tailwind 4.3.5 ships the `pointer-coarse:` variant (`@media (pointer: coarse)`); no config needed.
- `setSearchParams(init, { replace, state })` and `navigate(to, { replace, state })` carry history state in react-router 7.
- Embla re-initialises when its `options` object changes identity: `ViewerCarousel` freezes it with `useState`.
- Radix `Dialog` calls `onCloseAutoFocus` on unmount; Escape closes the top layer only (a menu or the sheet first, then the viewer).
- Sonner 2.0.8: `ToasterProps.theme` is `'light' | 'dark' | 'system'`; `toast.success`, `toast.warning(title, { description })`, `toast.error`.
- Throwaway implementation of every task on a scratch branch: each task state passed `pnpm check` (Biome, 235 files at the end), `pnpm typecheck`, `pnpm --filter client build`, and `pnpm test` (`Tests  180 passed (180)`). Code blocks below are the Biome-formatted results. Diff hunks show no line numbers: apply them by their context.

## File Map

| File | Task | Change |
| --- | --- | --- |
| `client/package.json`, `pnpm-lock.yaml` | 1 | `sonner` |
| `client/src/hooks/useAppliedTheme.ts` | 1 | new |
| `client/src/components/ui/sonner.tsx` | 1 | new (shadcn, adapted) |
| `client/src/App.tsx` | 1 | one `<Toaster />` |
| `client/src/deletePhoto.ts` | 1 | `toast.error` instead of `window.alert` |
| `client/src/components/library/UploadForm.tsx` | 1, 3, 10 | success toast; accepted types; `ShareSheet` |
| `client/src/components/frame/controlClasses.ts` | 2 | `COARSE_POINTER_TARGET_CLASSES` |
| `client/src/components/frame/PhotoActionsMenu.tsx` | 2, 10 | 44 px trigger; `ShareSheet` |
| `client/src/components/ui/dialog.tsx`, `ui/sheet.tsx` | 2 | 44 px close buttons |
| `client/src/viewerHistory.ts`, `client/src/viewerNavigation.ts` | 4 | new |
| `client/src/hooks/useViewerParam.ts` | 4, 8 | new; `startFrame` |
| `client/src/hooks/useViewerPhoto.ts` | 4 | new |
| `client/src/hooks/usePhotoLibrary.ts` | 4, 5 | `isFirstPageLoaded`, `usePhotoAdder`; reconnect count |
| `client/src/photosApi.ts` | 5, 9 | `fetchNewestPhotos`; `duplicate` share status |
| `client/src/components/viewer/*` (5 files) | 6, 8 | new; ▶ « Mode cadre » |
| `client/src/hooks/useIdle.ts` | 6 | ignore the viewer dialog |
| `client/src/components/frame/PhotoGridTile.tsx`, `PhotoListRow.tsx` | 6 | `data-photo-id` |
| `client/src/components/library/LibrarySection.tsx` | 6, 8 | open in the viewer; « Mode cadre » |
| `client/src/pages/LibraryPage.tsx` | 6 | mounts the viewer |
| `client/src/hooks/useFrameSelection.ts` | 7 | slideshow only, `startId` |
| `client/src/hooks/useLeaveFrame.ts` | 7 | new |
| `client/src/hooks/usePhotoFeed.ts` | 7 | `{ photos, status }` |
| `client/src/components/frame/FrameStatusScreen.tsx` | 7 | new |
| `client/src/pages/FramePage.tsx` | 7 | slideshow or status screen |
| `client/src/components/frame/SlideshowScreen.tsx`, `CloseButton.tsx`, `hooks/useSlideshowSettings.ts` | 7 | `onClose`; label; comment |
| `client/src/components/frame/LibraryScreen.tsx`, `LibraryHeader.tsx`, `hooks/useOnIdle.ts` | 7 | deleted |
| `client/src/components/sharing/shareTexts.ts`, `hooks/useMediaQuery.ts`, `hooks/useShareSending.ts` | 9 | new |
| `client/src/hooks/useFriendShares.ts` | 9, 10 | temporary adaptation; deleted |
| `client/src/components/sharing/ShareSheet.tsx`, `ShareFriendsForm.tsx`, `FriendPicker.tsx` | 10 | new |
| `client/src/components/sharing/SharePhotoDialog.tsx` | 10 | deleted |
| `ARCHITECTURE.md`, `README.md` | 1, 3, 5, 6, 7, 8, 10 | Pages, Temps réel, how-tos |
| `docs/produit/*.md` | 1, 2, 3, 6, 7, 8, 10 | product statements, `a-venir.md` section 7 |

## Stack and branches (controller only)

| PR | Branch | Base | Content |
| --- | --- | --- | --- |
| A | `feat/photo-toasts` | `feat/account-profile` | `docs/produit/` commit, then the spec and plan commits, then Tasks 1-3 |
| B | `feat/photo-viewer` | A | Tasks 4-6 |
| C | `feat/library-frame-merge` | B | Tasks 7-8 |
| D | `feat/share-sheet` | C | Tasks 9-10 |

`gh stack add <branch>` at each PR boundary (banners below). The spec (`9899a1b`, `docs: design the photo experience step`) and this plan's commit are cherry-picked onto PR A after the `docs/produit/` commit.

---

## PR A — `feat/photo-toasts`

### Task 1: Toasts: the Toaster, delete failures and the upload confirmation (PR A, `feat/photo-toasts`)

**Files:**
- Modify: `client/package.json`, `pnpm-lock.yaml` (via pnpm)
- Create: `client/src/hooks/useAppliedTheme.ts`, `client/src/components/ui/sonner.tsx`
- Modify: `client/src/App.tsx`, `client/src/deletePhoto.ts`, `client/src/components/library/UploadForm.tsx`
- Modify: `ARCHITECTURE.md`, `docs/produit/` (see step 6)

**Interfaces:**
- Produces: `useAppliedTheme(): AppliedTheme` (`'light' | 'dark'`); `Toaster` (shadcn wrapper); the `toast` import from `'sonner'` is the app's notification API from now on.

- [ ] **Step 1: Add the dependency**

Run: `pnpm --filter client add sonner`
Expected: `client/package.json` gains `"sonner": "^2.0.8"` under `dependencies`; `pnpm-lock.yaml` changes; nothing else in `package.json`.

- [ ] **Step 2: The applied theme**

Create `client/src/hooks/useAppliedTheme.ts`:

```ts
import { useSyncExternalStore } from 'react'

export type AppliedTheme = 'light' | 'dark'

// theme.ts toggles `.dark` on <html>: watching the class follows every way it changes.
function subscribeToThemeClass(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

function readAppliedTheme(): AppliedTheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function useAppliedTheme(): AppliedTheme {
  return useSyncExternalStore(subscribeToThemeClass, readAppliedTheme)
}
```

- [ ] **Step 3: The shadcn Toaster, themed from `.dark`**

Create `client/src/components/ui/sonner.tsx`:

```tsx
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import type * as React from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useAppliedTheme } from '@/hooks/useAppliedTheme.ts'

// Inline, not a class: Sonner's own theme selectors would outrank a utility class.
const THEME_TOKENS: React.CSSProperties & Record<`--${string}`, string> = {
  '--normal-bg': 'var(--popover)',
  '--normal-text': 'var(--popover-foreground)',
  '--normal-border': 'var(--border)',
  '--border-radius': 'var(--radius)',
}

function Toaster({ ...props }: ToasterProps) {
  const theme = useAppliedTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={THEME_TOKENS}
      {...props}
    />
  )
}

export { Toaster }
```

- [ ] **Step 4: Mount it once, use it for delete failures**

```diff
--- a/client/src/App.tsx
+++ b/client/src/App.tsx
@@ import { AuthProvider } from './auth/AuthProvider.tsx'
 import { RequireAdmin } from './auth/RequireAdmin.tsx'
 import { RequireAuth } from './auth/RequireAuth.tsx'
 import { AccountBar } from './components/auth/AccountBar.tsx'
+import { Toaster } from './components/ui/sonner.tsx'
 import AdminInvitationsPage from './pages/AdminInvitationsPage.tsx'
 import FramePage from './pages/FramePage.tsx'
 import FriendsPage from './pages/FriendsPage.tsx'
@@ function AppRoutes(): JSX.Element {
 
 function App(): JSX.Element {
   return (
-    <BrowserRouter>
-      <AuthProvider>
-        <AppRoutes />
-      </AuthProvider>
-    </BrowserRouter>
+    <>
+      <BrowserRouter>
+        <AuthProvider>
+          <AppRoutes />
+        </AuthProvider>
+      </BrowserRouter>
+      {/* One for the whole app: a toast outlives the page or dialog that raised it. */}
+      <Toaster />
+    </>
   )
 }
 
```

```diff
--- a/client/src/deletePhoto.ts
+++ b/client/src/deletePhoto.ts
@@
+import { toast } from 'sonner'
 import { errorMessage } from '@/api.ts'
 import type { Photo } from '@/photo.ts'
 
@@ export async function deletePhoto({ id }: Photo): Promise<void> {
     if (!res.ok) {
       // Not JSON when the dev proxy answers for a stopped API.
       const data: unknown = await res.json().catch(() => null)
-      window.alert(errorMessage(data))
+      toast.error(errorMessage(data))
     }
   } catch {
-    window.alert(errorMessage(null))
+    toast.error(errorMessage(null))
   }
 }
```

- [ ] **Step 5: The upload confirmation becomes a toast (coordinator addition a)**

Apply to `client/src/components/library/UploadForm.tsx` (the `success` status goes: the toast says it, and the form is already empty):

```diff
--- a/client/src/components/library/UploadForm.tsx
+++ b/client/src/components/library/UploadForm.tsx
@@
 import { SendIcon } from 'lucide-react'
 import { type ChangeEvent, type JSX, type SubmitEvent, useState } from 'react'
+import { toast } from 'sonner'
 import { useAuth } from '@/auth/AuthContext.ts'
@@
-type UploadStatus = 'idle' | 'sending' | 'success' | 'error'
+type UploadStatus = 'idle' | 'sending' | 'error'
@@ function usePhotoUpload(onUploaded: (photo: Photo) => void): PhotoUpload {
     onUploaded(result.photo)
-    setStatus('success')
+    // A toast, not an alert: the form empties, and the message must not outstay the photo.
+    toast.success('Photo ajoutée à votre bibliothèque.')
+    setStatus('idle')
     return true
   }
@@
 function UploadAlert({ status, error }: Pick<PhotoUpload, 'status' | 'error'>): JSX.Element | null {
-  if (status === 'success') {
-    return (
-      <Alert>
-        <AlertDescription>Photo envoyée !</AlertDescription>
-      </Alert>
-    )
-  }
-  if (status === 'error') {
-    return (
-      <Alert variant="destructive">
-        <AlertDescription>{error}</AlertDescription>
-      </Alert>
-    )
-  }
-  return null
+  if (status !== 'error') return null
+  return (
+    <Alert variant="destructive">
+      <AlertDescription>{error}</AlertDescription>
+    </Alert>
+  )
 }
```

- [ ] **Step 6: Docs**

`ARCHITECTURE.md`, after the « Thème : » paragraph of Pages, add:

> Notifications : une notification éphémère (Sonner, `components/ui/sonner.tsx`, montée une seule fois dans `App.tsx` pour survivre à la page ou à la fenêtre qui l'a déclenchée) confirme ou signale une action qui ne laisse pas de fenêtre ouverte : « Photo ajoutée à votre bibliothèque. », l'échec d'une suppression (message de l'API). Elle suit la classe `.dark` de `<html>` (`useAppliedTheme`), donc le thème choisi.

`docs/produit/` (French, no technical terms, next free ids):
- `bibliotheque.md`, « Messages affichés »: replace « Photo envoyée ! » with « Photo ajoutée à votre bibliothèque. », shown as a short notification at the bottom of the screen that disappears by itself. Wherever the file (or `cadre.md`) describes a failed deletion, say the reason now appears as a notification instead of a pop-up window to close.
- `apparence-et-navigation.md`, « Ce que l'on peut faire » or « Règles » (next free id): « Les confirmations et les erreurs d'une action terminée s'affichent dans une courte notification en bas de l'écran, qui disparaît d'elle-même et suit le thème clair ou sombre. »
- `a-venir.md` section 7: remove the notifications item (toasts) and the « Photo envoyée ! » wording item if listed.

- [ ] **Step 7: Verify**

Run: `pnpm check && pnpm typecheck && pnpm --filter client build && pnpm test`
Expected: `Checked … files … No fixes applied.`; `client typecheck: Done`, `server typecheck: Done`; `✓ built in …`; `Tests  180 passed (180)`.

- [ ] **Step 8: Commit**

```bash
git add client/package.json pnpm-lock.yaml client/src/hooks/useAppliedTheme.ts client/src/components/ui/sonner.tsx client/src/App.tsx client/src/deletePhoto.ts client/src/components/library/UploadForm.tsx ARCHITECTURE.md docs/produit
git commit -F <message-file>
```

Message: `feat(client): announce results with toasts` (body: Sonner approved by the author; delete failures and the upload confirmation move from alerts to toasts), then the attribution lines.

**Chrome check (controller):**
- On `/`, add a photo with « Ajouter à ma bibliothèque »: a toast « Photo ajoutée à votre bibliothèque. » appears bottom right and fades; no alert stays under the buttons.
- Switch the theme (account menu, Sombre, then Clair): a new toast follows it (dark popover colours, then light).
- Without touching the API: simulate a delete failure in DevTools (Network → block request URL `*/api/photos/*` with method DELETE, or offline mode), delete a photo: a red error toast with the API's (or the generic) message, no `window.alert`.

### Task 2: Touch-sized buttons on coarse pointers (PR A, `feat/photo-toasts`)

**Files:**
- Modify: `client/src/components/frame/controlClasses.ts`, `client/src/components/frame/PhotoActionsMenu.tsx`, `client/src/components/ui/dialog.tsx`, `client/src/components/ui/sheet.tsx`
- Modify: `docs/produit/apparence-et-navigation.md`, `docs/produit/a-venir.md`

**Interfaces:**
- Produces: `COARSE_POINTER_TARGET_CLASSES = 'pointer-coarse:size-11'` (44 px under a finger).

- [ ] **Step 1: The class and its callers**

```diff
--- a/client/src/components/frame/controlClasses.ts
+++ b/client/src/components/frame/controlClasses.ts
@@ export const GLASS_BUTTON_CLASSES = `${GLASS_CLASSES} size-11 text-white/80 hove
 // A button inside the glass pill: the pill is the glass, the button only lights up.
 export const PILL_BUTTON_CLASSES =
   'size-11 rounded-full text-white/80 hover:bg-white/10 hover:text-white dark:hover:bg-white/10 aria-pressed:bg-white/15 aria-pressed:text-white data-[state=on]:bg-white/15 data-[state=on]:text-white'
+
+// 44 px under a finger, the size touch guidelines ask for; a mouse keeps the compact button.
+export const COARSE_POINTER_TARGET_CLASSES = 'pointer-coarse:size-11'
```

```diff
--- a/client/src/components/frame/PhotoActionsMenu.tsx
+++ b/client/src/components/frame/PhotoActionsMenu.tsx
@@
 import { EllipsisIcon, SendIcon, Trash2Icon } from 'lucide-react'
 import { type JSX, type ReactNode, useRef, useState } from 'react'
+import { COARSE_POINTER_TARGET_CLASSES } from '@/components/frame/controlClasses.ts'
 import { DeletePhotoDialog } from '@/components/frame/DeletePhotoDialog.tsx'
 import { SharePhotoDialog } from '@/components/sharing/SharePhotoDialog.tsx'
 import { Button } from '@/components/ui/button.tsx'
@@ import {
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu.tsx'
+import { cn } from '@/lib/utils.ts'
 import type { Photo } from '@/photo.ts'
 
 type PhotoActionsMenuProps = {
@@ export function PhotoActionsMenu({
             variant="ghost"
             size="icon-sm"
             aria-label={label}
-            className={className}
+            className={cn(COARSE_POINTER_TARGET_CLASSES, className)}
           >
             <EllipsisIcon />
           </Button>
```

```diff
--- a/client/src/components/ui/dialog.tsx
+++ b/client/src/components/ui/dialog.tsx
@@ function DialogContent({
         {children}
         {showCloseButton && (
           <DialogPrimitive.Close data-slot="dialog-close" asChild>
-            <Button variant="ghost" className="absolute top-2 right-2" size="icon-sm">
+            <Button
+              variant="ghost"
+              className="absolute top-2 right-2 pointer-coarse:size-11"
+              size="icon-sm"
+            >
               <XIcon />
               <span className="sr-only">Fermer</span>
             </Button>
```

```diff
--- a/client/src/components/ui/sheet.tsx
+++ b/client/src/components/ui/sheet.tsx
@@ function SheetContent({
         {...props}
       >
         {children}
-        <SheetPrimitive.Close className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
+        <SheetPrimitive.Close className="absolute top-4 right-4 grid place-items-center rounded-xs pointer-coarse:top-2 pointer-coarse:right-2 pointer-coarse:size-11 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
           <XIcon className="size-4" />
           <span className="sr-only">Fermer</span>
         </SheetPrimitive.Close>
```

- [ ] **Step 2: Docs**

`docs/produit/apparence-et-navigation.md`, « Règles » (next free id): « Sur un écran tactile, les petits boutons (menu « … » d'une photo, croix qui ferme une fenêtre) sont agrandis à la taille d'un doigt ; à la souris, ils restent compacts. » `a-venir.md` section 7: remove the touch-target item.

- [ ] **Step 3: Verify**

Run: `pnpm check && pnpm typecheck && pnpm --filter client build`
Expected: `No fixes applied.`, both typechecks `Done`, `✓ built`.

- [ ] **Step 4: Commit**

Message: `feat(client): enlarge small buttons under a finger`, then the attribution lines.

**Chrome check (controller):**
- DevTools device toolbar, a phone preset (touch, coarse pointer), `/`: a tile's « … » button and the ✕ of the delete dialog and of the app's mobile menu sheet measure 44 × 44 px (Computed panel).
- Back to desktop (no emulation): the same buttons keep their compact size.

### Task 3: The file inputs offer only the formats the server accepts (PR A, `feat/photo-toasts`)

**Files:**
- Modify: `client/src/components/library/UploadForm.tsx`
- Modify: `ARCHITECTURE.md` (Pages, `/` row), `docs/produit/bibliotheque.md`, `docs/produit/a-venir.md` if listed

- [ ] **Step 1: Restrict `accept` (coordinator addition b)**

The server accepts `image/jpeg`, `image/png`, `image/webp` (`server/src/features/photos/photos.input.ts`, `ALLOWED_TYPES`). Apply:

```diff
--- a/client/src/components/library/UploadForm.tsx
+++ b/client/src/components/library/UploadForm.tsx
@@
 import { postPhoto } from '@/photosApi.ts'
 
+// The server's accepted types: a HEIC or GIF picked here would only be refused after the upload.
+const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp'
+
 type UploadStatus = 'idle' | 'sending' | 'error'
@@ function FileField({ id, label, capture, onChange }: FileFieldProps): JSX.Element {
     <div className="flex flex-col gap-2">
       <Label htmlFor={id}>{label}</Label>
-      <Input id={id} type="file" accept="image/*" capture={capture} onChange={onChange} />
+      <Input
+        id={id}
+        type="file"
+        accept={ACCEPTED_IMAGE_TYPES}
+        capture={capture}
+        onChange={onChange}
+      />
     </div>
```

- [ ] **Step 2: Docs**

`ARCHITECTURE.md`, Pages, `/` row: after « Choisir une image », add « (JPEG, PNG ou WebP, les formats acceptés par le serveur) ».
`docs/produit/bibliotheque.md`: « Règles » (next free id) « Seules les photos JPEG, PNG ou WebP peuvent être choisies ; le téléphone convertit lui-même une photo prise avec l'appareil photo. »; « Ce qui n'est pas possible »: « Envoyer une image HEIC ou une animation GIF : elles ne sont pas proposées au choix. » Remove the item from `a-venir.md` section 7 if it is listed there.

- [ ] **Step 3: Verify**

Run: `pnpm check && pnpm typecheck && pnpm --filter client build`
Expected: green as in Task 2.

- [ ] **Step 4: Commit**

Message: `fix(client): offer only the image formats the server accepts`, then the attribution lines.

**Chrome check (controller):**
- On `/`, « Choisir une image »: the file picker filters on JPEG, PNG and WebP; a `.gif` or `.heic` file is greyed out or hidden (on Windows the filter reads « Fichiers personnalisés »).
- A JPEG still uploads, with the Task 1 toast.

---

> **Controller:** `gh stack add feat/photo-viewer` before Task 4.

## PR B — `feat/photo-viewer`

### Task 4: Viewer navigation: the address, the history and the missing photo (PR B, `feat/photo-viewer`)

**Files:**
- Create: `client/src/viewerHistory.ts`, `client/src/viewerNavigation.ts`, `client/src/hooks/useViewerParam.ts`, `client/src/hooks/useViewerPhoto.ts`
- Modify: `client/src/hooks/usePhotoLibrary.ts`

**Interfaces:**
- Produces: `PHOTO_PARAM`, `LIBRARY_BELOW_STATE`, `PhotoPage = '/' | '/frame'`, `isLibraryBelow(state)`, `photoPath(page, id)`; `LOAD_AHEAD_COUNT`, `SeenPhoto`, `ViewerLibraryState`, `MissingPhotoStep`, `photoIdAfterRemoval`, `missingPhotoStep`, `shouldLoadAhead`, `viewerCounter`; `useViewerParam(): ViewerParam` (`openId`, `open`, `show`, `close`, `dismiss`); `useViewerPhoto(options): number`; `PhotoLibrary.isFirstPageLoaded`.
- No UI yet: nothing calls these until Task 6. Pure logic stays in the two small `.ts` files so the author can read the rules without React.

- [ ] **Step 1: History helpers**

Create `client/src/viewerHistory.ts`:

```ts
// The search parameter that names the open photo: /?photo=<id> on the library, /frame?photo=<id>.
export const PHOTO_PARAM = 'photo'

// Set on an entry pushed over the library: closing goes back to that entry instead of adding one.
export const LIBRARY_BELOW_STATE = { isLibraryBelow: true }

export type PhotoPage = '/' | '/frame'

export function isLibraryBelow(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'isLibraryBelow' in state &&
    state.isLibraryBelow === true
  )
}

export function photoPath(page: PhotoPage, photoId: string): string {
  return `${page}?${new URLSearchParams({ [PHOTO_PARAM]: photoId })}`
}
```

- [ ] **Step 2: What to show, pure**

Create `client/src/viewerNavigation.ts`:

```ts
import type { Photo } from '@/photo.ts'

// Close enough to the last loaded photo that the next page should already be on its way.
export const LOAD_AHEAD_COUNT = 3

// Where the viewer last saw its photo in the loaded list.
export type SeenPhoto = { id: string; index: number }

export type ViewerLibraryState = {
  photos: Photo[]
  hasMore: boolean
  isLoadingMore: boolean
  isFirstPageLoaded: boolean
}

export type MissingPhotoStep =
  | { kind: 'wait' }
  | { kind: 'loadMore' }
  | { kind: 'show'; id: string }
  | { kind: 'close' }

// The removed photo's place goes to the next one, or to the previous one when it was the last.
export function photoIdAfterRemoval(photos: Photo[], removedIndex: number): string | null {
  const index = Math.min(removedIndex, photos.length - 1)
  return index < 0 ? null : photos[index].id
}

export function missingPhotoStep(
  openId: string,
  lastSeen: SeenPhoto | null,
  library: ViewerLibraryState,
): MissingPhotoStep {
  // Seen a moment ago, gone now: it was deleted, here or on another device.
  if (lastSeen?.id === openId) {
    const nextId = photoIdAfterRemoval(library.photos, lastSeen.index)
    return nextId === null ? { kind: 'close' } : { kind: 'show', id: nextId }
  }
  if (!library.isFirstPageLoaded || library.isLoadingMore) return { kind: 'wait' }
  // A link to an older photo: it may sit on a page not loaded yet.
  return library.hasMore ? { kind: 'loadMore' } : { kind: 'close' }
}

export function shouldLoadAhead(index: number, library: ViewerLibraryState): boolean {
  const isNearEnd = index >= library.photos.length - LOAD_AHEAD_COUNT
  return isNearEnd && library.hasMore && !library.isLoadingMore
}

// The API sends no total: « + » says more photos are on pages not loaded yet.
export function viewerCounter(index: number, library: ViewerLibraryState): string {
  const total = library.hasMore ? `${library.photos.length}+` : String(library.photos.length)
  return `${index + 1} / ${total}`
}
```

- [ ] **Step 3: The `photo` parameter**

Create `client/src/hooks/useViewerParam.ts` (Task 8 adds `startFrame`):

```ts
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { isLibraryBelow, LIBRARY_BELOW_STATE, PHOTO_PARAM } from '@/viewerHistory.ts'

export type ViewerParam = {
  openId: string | null
  open: (photoId: string) => void
  show: (photoId: string) => void
  close: () => void
  dismiss: () => void
}

export function useViewerParam(): ViewerParam {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const openId = searchParams.get(PHOTO_PARAM)

  function open(photoId: string): void {
    setSearchParams({ [PHOTO_PARAM]: photoId }, { state: LIBRARY_BELOW_STATE })
  }

  function show(photoId: string): void {
    if (photoId === openId) return
    // Replace: swiping through twenty photos must not take twenty back presses to leave.
    setSearchParams({ [PHOTO_PARAM]: photoId }, { replace: true, state: location.state })
  }

  // Replace, never back: the viewer calls it from an effect that may run twice.
  function dismiss(): void {
    setSearchParams({}, { replace: true })
  }

  function close(): void {
    if (isLibraryBelow(location.state)) navigate(-1)
    else dismiss()
  }

  return { openId, open, show, close, dismiss }
}
```

- [ ] **Step 4: The library tells when its first page arrived**

```diff
--- a/client/src/hooks/usePhotoLibrary.ts
+++ b/client/src/hooks/usePhotoLibrary.ts
@@ export type PhotoLibrary = {
   photos: Photo[]
   hasMore: boolean
   isLoadingMore: boolean
+  // false until the first page arrives: an empty list then means an empty library.
+  isFirstPageLoaded: boolean
   loadMore: () => Promise<void>
   addPhoto: (photo: Photo) => void
 }
@@ type LibrarySetters = {
   setNextPage: Dispatch<SetStateAction<NextPage | null>>
 }
 
+type FirstPageSetters = LibrarySetters & {
+  setIsFirstPageLoaded: Dispatch<SetStateAction<boolean>>
+}
+
 type MoreSetters = LibrarySetters & {
   setIsLoadingMore: Dispatch<SetStateAction<boolean>>
 }
@@ function toNextPage(cursor: string | null, loadId: number): NextPage | null {
 // Each (re)connection starts over from the first page: simple, and catches what changed offline.
 function createFirstPageLoader(
   liveLoads: LiveLoads,
-  { setPhotos, setNextPage }: LibrarySetters,
+  { setPhotos, setNextPage, setIsFirstPageLoaded }: FirstPageSetters,
   dropUser: () => void,
 ): () => Promise<void> {
   return async () => {
@@ function createFirstPageLoader(
     if (page === null || !liveLoads.isCurrent(loadId)) return
     setPhotos(liveLoads.withLiveChanges(page.photos))
     setNextPage(toNextPage(page.nextCursor, loadId))
+    setIsFirstPageLoaded(true)
   }
 }
 
@@ function createMoreLoader(
 // Returns the cleanup that stops the socket and any load still running.
 function connectLibrary(
   liveLoads: LiveLoads,
-  setters: LibrarySetters,
+  setters: FirstPageSetters,
   dropUser: () => void,
 ): () => void {
   const { setPhotos } = setters
@@ export function usePhotoLibrary(): PhotoLibrary {
   const [photos, setPhotos] = useState<Photo[]>([])
   const [nextPage, setNextPage] = useState<NextPage | null>(null)
   const [isLoadingMore, setIsLoadingMore] = useState(false)
+  const [isFirstPageLoaded, setIsFirstPageLoaded] = useState(false)
 
   useEffect(
-    () => connectLibrary(liveLoads, { setPhotos, setNextPage }, dropUser),
+    () => connectLibrary(liveLoads, { setPhotos, setNextPage, setIsFirstPageLoaded }, dropUser),
     [liveLoads, dropUser],
   )
 
@@ export function usePhotoLibrary(): PhotoLibrary {
     [liveLoads],
   )
 
-  return { photos, hasMore: nextPage !== null, isLoadingMore, loadMore, addPhoto }
+  return {
+    photos,
+    hasMore: nextPage !== null,
+    isLoadingMore,
+    isFirstPageLoaded,
+    loadMore,
+    addPhoto,
+  }
 }
```

The multi-line return pushes `usePhotoLibrary` to 37 lines: extract the adder (Choices 6):

```diff
--- a/client/src/hooks/usePhotoLibrary.ts
+++ b/client/src/hooks/usePhotoLibrary.ts
@@
+// The upload response and the photo:new event bring the same photo: withNewPhoto keeps one.
+function usePhotoAdder(
+  liveLoads: LiveLoads,
+  setPhotos: Dispatch<SetStateAction<Photo[]>>,
+): (photo: Photo) => void {
+  return useCallback(
+    (photo: Photo): void => {
+      liveLoads.rememberAdded(photo)
+      setPhotos((current) => withNewPhoto(current, photo))
+    },
+    [liveLoads, setPhotos],
+  )
+}
+
 export function usePhotoLibrary(): PhotoLibrary {
@@
-  // The upload response and the photo:new event bring the same photo: withNewPhoto keeps one.
-  const addPhoto = useCallback(
-    (photo: Photo): void => {
-      liveLoads.rememberAdded(photo)
-      setPhotos((current) => withNewPhoto(current, photo))
-    },
-    [liveLoads],
-  )
+  const addPhoto = usePhotoAdder(liveLoads, setPhotos)
 
   return {
```

- [ ] **Step 5: The open photo's index, and what happens when it is missing**

Create `client/src/hooks/useViewerPhoto.ts`:

```ts
import { useEffect, useState } from 'react'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import { missingPhotoStep, type SeenPhoto, shouldLoadAhead } from '@/viewerNavigation.ts'

type ViewerPhotoOptions = {
  library: PhotoLibrary
  openId: string
  show: (photoId: string) => void
  dismiss: () => void
}

// The open photo's index in the loaded list, -1 while it is not there.
export function useViewerPhoto({ library, openId, show, dismiss }: ViewerPhotoOptions): number {
  const index = library.photos.findIndex(({ id }) => id === openId)
  const [lastSeen, setLastSeen] = useState<SeenPhoto | null>(null)
  // Adjusted during render: once the photo is gone, its last place is what picks the next one.
  if (index >= 0 && (lastSeen?.id !== openId || lastSeen.index !== index)) {
    setLastSeen({ id: openId, index })
  }

  useEffect(() => {
    if (index >= 0) {
      if (shouldLoadAhead(index, library)) library.loadMore()
      return
    }
    const step = missingPhotoStep(openId, lastSeen, library)
    if (step.kind === 'loadMore') library.loadMore()
    if (step.kind === 'show') show(step.id)
    if (step.kind === 'close') dismiss()
  }, [index, openId, lastSeen, library, show, dismiss])

  return index
}
```

- [ ] **Step 6: Verify**

Run: `pnpm check && pnpm typecheck && pnpm --filter client build`
Expected: green. Measure: `usePhotoLibrary` at most 30 lines.

- [ ] **Step 7: Commit**

Message: `feat(client): navigate photos through the address`, then the attribution lines.

**Chrome check (controller):** none visible yet (no caller). `/` still loads its first page and « Charger plus » still works.

### Task 5: A reconnect keeps the photos already loaded (PR B, `feat/photo-viewer`)

**Files:**
- Modify: `client/src/photosApi.ts`, `client/src/hooks/usePhotoLibrary.ts`
- Modify: `ARCHITECTURE.md` (Temps réel)

**Interfaces:**
- Produces: `fetchNewestPhotos(count, onUnauthenticated): Promise<PhotoPage | null>`; `FRAME_PAGE_SIZE` renamed `MAX_PAGE_SIZE` (now used by both fetchers).

- [ ] **Step 1: Fetch the newest N photos (coordinator addition e)**

```diff
--- a/client/src/photosApi.ts
+++ b/client/src/photosApi.ts
@@
 import { errorMessage, UNAUTHORIZED_STATUS } from '@/api.ts'
 import { isPhoto, isPhotoPage, type Photo, type PhotoPage } from '@/photo.ts'
 
-// The server's MAX_PAGE_SIZE: the fewest requests for a whole library.
-const FRAME_PAGE_SIZE = 100
+// The server's MAX_PAGE_SIZE: the fewest requests for many photos.
+const MAX_PAGE_SIZE = 100
 
 export type PageRequest = { cursor?: string; limit?: number }
 
@@ export async function fetchAllPhotos(onUnauthenticated: () => void): Promise<Pho
   const photos: Photo[] = []
   let cursor: string | undefined
   do {
-    const page = await fetchPhotoPage({ cursor, limit: FRAME_PAGE_SIZE }, onUnauthenticated)
+    const page = await fetchPhotoPage({ cursor, limit: MAX_PAGE_SIZE }, onUnauthenticated)
     if (page === null) return null
     if (page.nextCursor === cursor) {
       console.error('Photos cursor did not advance')
@@ export async function fetchAllPhotos(onUnauthenticated: () => void): Promise<Pho
   return photos
 }
 
+// The newest `count` photos as one page, so a reload gives back as many as were shown. null as
+// soon as one page fails.
+export async function fetchNewestPhotos(
+  count: number,
+  onUnauthenticated: () => void,
+): Promise<PhotoPage | null> {
+  const photos: Photo[] = []
+  let cursor: string | undefined
+  while (photos.length < count) {
+    const limit = Math.min(count - photos.length, MAX_PAGE_SIZE)
+    const page = await fetchPhotoPage({ cursor, limit }, onUnauthenticated)
+    if (page === null) return null
+    photos.push(...page.photos)
+    // An empty page with a cursor would ask for the same page forever.
+    if (page.nextCursor === null || page.photos.length === 0) return { ...page, photos }
+    cursor = page.nextCursor
+  }
+  return { photos, nextCursor: cursor ?? null }
+}
+
 export async function postPhoto(file: File): Promise<UploadResult> {
   const body = new FormData()
   body.append('photo', file)
```

- [ ] **Step 2: Reload as many photos as were loaded**

Replace `client/src/hooks/usePhotoLibrary.ts` with:

```ts
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { createLiveLoads, type LiveLoads } from '@/liveLoads.ts'
import type { Photo } from '@/photo.ts'
import { withNewPhoto, withOlderPhotos, withoutPhoto } from '@/photoList.ts'
import { connectPhotoSocket } from '@/photoSocket.ts'
import { fetchNewestPhotos, fetchPhotoPage } from '@/photosApi.ts'

// The server's DEFAULT_PAGE_SIZE: the first load asks for one page.
const FIRST_LOAD_COUNT = 30

export type PhotoLibrary = {
  photos: Photo[]
  hasMore: boolean
  isLoadingMore: boolean
  // false until the first page arrives: an empty list then means an empty library.
  isFirstPageLoaded: boolean
  loadMore: () => Promise<void>
  addPhoto: (photo: Photo) => void
}

// The load that gave the cursor: a page fetched with it is only valid while that load is current.
type NextPage = { cursor: string; loadId: number }

type LibrarySetters = {
  setPhotos: Dispatch<SetStateAction<Photo[]>>
  setNextPage: Dispatch<SetStateAction<NextPage | null>>
}

type FirstPageSetters = LibrarySetters & {
  setIsFirstPageLoaded: Dispatch<SetStateAction<boolean>>
}

type MoreSetters = LibrarySetters & {
  setIsLoadingMore: Dispatch<SetStateAction<boolean>>
}

function toNextPage(cursor: string | null, loadId: number): NextPage | null {
  return cursor === null ? null : { cursor, loadId }
}

// Each (re)connection reloads from the newest photo, which catches what changed offline. It asks
// for as many photos as were loaded: the viewer's photo, pages deep, stays in the list.
function createFirstPageLoader(
  liveLoads: LiveLoads,
  { setPhotos, setNextPage, setIsFirstPageLoaded }: FirstPageSetters,
  readLoadCount: () => number,
  dropUser: () => void,
): () => Promise<void> {
  return async () => {
    const loadId = liveLoads.begin()
    const page = await fetchNewestPhotos(readLoadCount(), () => {
      if (liveLoads.isCurrent(loadId)) dropUser()
    })
    if (page === null || !liveLoads.isCurrent(loadId)) return
    setPhotos(liveLoads.withLiveChanges(page.photos))
    setNextPage(toNextPage(page.nextCursor, loadId))
    setIsFirstPageLoaded(true)
  }
}

// Does not begin a load: a reconnect reload or the cleanup makes this page stale, and it is dropped.
function createMoreLoader(
  liveLoads: LiveLoads,
  nextPage: NextPage | null,
  { setPhotos, setNextPage, setIsLoadingMore }: MoreSetters,
  dropUser: () => void,
): () => Promise<void> {
  return async () => {
    if (nextPage === null) return
    const { cursor, loadId } = nextPage
    setIsLoadingMore(true)
    const page = await fetchPhotoPage({ cursor }, () => {
      if (liveLoads.isCurrent(loadId)) dropUser()
    })
    setIsLoadingMore(false)
    if (page === null || !liveLoads.isCurrent(loadId)) return
    setPhotos((current) => withOlderPhotos(current, liveLoads.withoutDeleted(page.photos)))
    setNextPage(toNextPage(page.nextCursor, loadId))
  }
}

// Returns the cleanup that stops the socket and any load still running.
function connectLibrary(
  liveLoads: LiveLoads,
  setters: FirstPageSetters,
  readLoadCount: () => number,
  dropUser: () => void,
): () => void {
  const { setPhotos } = setters
  const socket = connectPhotoSocket({
    onConnect: createFirstPageLoader(liveLoads, setters, readLoadCount, dropUser),
    onNewPhoto: (photo) => {
      liveLoads.rememberAdded(photo)
      setPhotos((current) => withNewPhoto(current, photo))
    },
    // The delete dialog relies on this event, as on the frame.
    onDeletedPhoto: (id) => {
      liveLoads.rememberDeleted(id)
      setPhotos((current) => withoutPhoto(current, id))
    },
    onRefused: dropUser,
  })
  return () => {
    socket.disconnect()
    liveLoads.stop()
  }
}

// The upload response and the photo:new event bring the same photo: withNewPhoto keeps one.
function usePhotoAdder(
  liveLoads: LiveLoads,
  setPhotos: Dispatch<SetStateAction<Photo[]>>,
): (photo: Photo) => void {
  return useCallback(
    (photo: Photo): void => {
      liveLoads.rememberAdded(photo)
      setPhotos((current) => withNewPhoto(current, photo))
    },
    [liveLoads, setPhotos],
  )
}

// A ref, not state: the socket's reconnect reads it without reconnecting when it changes.
function useLoadCountReader(photos: Photo[]): () => number {
  const loadedCount = useRef(0)
  useEffect(() => {
    loadedCount.current = photos.length
  }, [photos])
  return useCallback(() => Math.max(loadedCount.current, FIRST_LOAD_COUNT), [])
}

export function usePhotoLibrary(): PhotoLibrary {
  const { dropUser } = useAuth()
  // useState keeps one instance across renders: its load bookkeeping must survive them.
  const [liveLoads] = useState(createLiveLoads)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [nextPage, setNextPage] = useState<NextPage | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isFirstPageLoaded, setIsFirstPageLoaded] = useState(false)
  const readLoadCount = useLoadCountReader(photos)

  useEffect(() => {
    const setters = { setPhotos, setNextPage, setIsFirstPageLoaded }
    return connectLibrary(liveLoads, setters, readLoadCount, dropUser)
  }, [liveLoads, readLoadCount, dropUser])

  // Rebuilt when the next page changes, so loadMore always fetches the page after the current one.
  const loadMore = useMemo(() => {
    const setters = { setPhotos, setNextPage, setIsLoadingMore }
    return createMoreLoader(liveLoads, nextPage, setters, dropUser)
  }, [liveLoads, nextPage, dropUser])

  const addPhoto = usePhotoAdder(liveLoads, setPhotos)

  return {
    photos,
    hasMore: nextPage !== null,
    isLoadingMore,
    isFirstPageLoaded,
    loadMore,
    addPhoto,
  }
}
```

- [ ] **Step 3: Docs**

`ARCHITECTURE.md`, Temps réel, third bullet: replace « La page bibliothèque (`/`) recharge sa première page à chaque connexion » with « La page bibliothèque (`/`) recharge à chaque connexion autant de photos qu'elle en avait chargé (au moins 30, par requêtes de 100, `fetchNewestPhotos`) : une reconnexion ne la ramène pas aux 30 premières, et la photo ouverte dans la visionneuse reste dans la liste ». No `docs/produit/` change: nothing visible changes while the connection holds.

- [ ] **Step 4: Verify**

Run: `pnpm check && pnpm typecheck && pnpm --filter client build`
Expected: green. Measure: `usePhotoLibrary` at most 30 lines, file under 300.

- [ ] **Step 5: Commit**

Message: `fix(client): keep the loaded photos across a reconnect`, then the attribution lines.

**Chrome check (controller):**
- On `/` with more than 30 photos, « Charger plus » once (60 shown). DevTools Network → Offline for a few seconds, then back online: the socket reconnects, one or more `GET /api/photos?limit=60` (or `limit=…` up to 100 per request) appear, and the list still shows 60 photos, scroll position kept.

### Task 6: The photo viewer (PR B, `feat/photo-viewer`)

**Files:**
- Create: `client/src/components/viewer/viewerClasses.ts`, `ViewerCaption.tsx`, `ViewerCarousel.tsx`, `ViewerTopBar.tsx`, `PhotoViewer.tsx`
- Modify: `client/src/hooks/useIdle.ts`, `client/src/components/frame/PhotoGridTile.tsx`, `client/src/components/frame/PhotoListRow.tsx`, `client/src/components/library/LibrarySection.tsx`, `client/src/pages/LibraryPage.tsx`
- Modify: `ARCHITECTURE.md` (Pages, `/` row), `README.md`, `docs/produit/bibliotheque.md`, `docs/produit/a-venir.md`

**Interfaces:**
- Consumes: Task 4 (`useViewerParam`, `useViewerPhoto`, `viewerCounter`), `useCarouselPhoto`, `useCarouselArrowKeys`, `PhotoActionsMenu`, `GLASS_BUTTON_CLASSES`, `COARSE_POINTER_TARGET_CLASSES`.
- Produces: `PhotoViewer({ library, openId, viewer })`; `LibrarySection` prop `onOpenPhoto: (id) => void`; tiles and rows carry `data-photo-id`.

- [ ] **Step 1: Shared classes and the caption**

Create `client/src/components/viewer/viewerClasses.ts`:

```ts
import {
  COARSE_POINTER_TARGET_CLASSES,
  GLASS_BUTTON_CLASSES,
} from '@/components/frame/controlClasses.ts'
import { cn } from '@/lib/utils.ts'

// The frame's glass, smaller: a viewer on a computer screen does not need wall-sized buttons.
export const VIEWER_BUTTON_CLASSES = cn(
  GLASS_BUTTON_CLASSES,
  'size-9',
  COARSE_POINTER_TARGET_CLASSES,
)
```

Create `client/src/components/viewer/ViewerCaption.tsx`:

```tsx
import type { JSX } from 'react'
import type { Photo } from '@/photo.ts'
import { formatPhotoDay } from '@/photoLabel.ts'

type ViewerCaptionProps = {
  photo: Photo
}

export function ViewerCaption({ photo }: ViewerCaptionProps): JSX.Element {
  return (
    // Swipes over the caption must still reach the carousel underneath.
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-6 pt-16 pb-6 text-white">
      <p className="text-lg font-medium tabular-nums drop-shadow-md">
        <time dateTime={photo.createdAt}>{formatPhotoDay(photo.createdAt)}</time>
      </p>
      {photo.senderName !== null && (
        <p className="text-sm text-white/80 drop-shadow-md">Envoyée par {photo.senderName}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: The carousel**

Create `client/src/components/viewer/ViewerCarousel.tsx`:

```tsx
import { type JSX, useState } from 'react'
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel.tsx'
import { VIEWER_BUTTON_CLASSES } from '@/components/viewer/viewerClasses.ts'
import { useCarouselArrowKeys } from '@/hooks/useCarouselArrowKeys.ts'
import { useCarouselPhoto } from '@/hooks/useCarouselPhoto.ts'
import { cn } from '@/lib/utils.ts'
import type { Photo } from '@/photo.ts'
import { photoLabel } from '@/photoLabel.ts'

// At the first or last photo the arrow has nowhere to go: it steps aside.
const ARROW_CLASSES = cn(VIEWER_BUTTON_CLASSES, 'disabled:opacity-0')

type ViewerCarouselProps = {
  photos: Photo[]
  currentId: string
  onCurrentChange: (photoId: string) => void
}

export function ViewerCarousel({
  photos,
  currentId,
  onCurrentChange,
}: ViewerCarouselProps): JSX.Element {
  const [api, setApi] = useState<CarouselApi>()
  // Frozen at mount: Embla re-inits on new options, and would on every swipe.
  const [options] = useState(() => ({
    startIndex: photos.findIndex(({ id }) => id === currentId),
  }))
  useCarouselPhoto({ api, photos, currentId, onCurrentChange })
  useCarouselArrowKeys(api)

  return (
    <Carousel setApi={setApi} opts={options}>
      <CarouselContent>
        {photos.map((photo) => (
          <CarouselItem key={photo.id}>
            <img
              className="h-svh w-full object-contain"
              src={photo.url}
              alt={photoLabel(photo)}
              loading={photo.id === currentId ? 'eager' : 'lazy'}
              decoding="async"
              // The browser's own image drag would steal the mouse from the carousel's swipe.
              draggable={false}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious
        variant="ghost"
        aria-label="Photo précédente"
        className={cn(ARROW_CLASSES, 'left-4')}
      />
      <CarouselNext
        variant="ghost"
        aria-label="Photo suivante"
        className={cn(ARROW_CLASSES, 'right-4')}
      />
    </Carousel>
  )
}
```

- [ ] **Step 3: The top bar (Task 8 adds ▶)**

Create `client/src/components/viewer/ViewerTopBar.tsx`:

```tsx
import { XIcon } from 'lucide-react'
import type { JSX } from 'react'
import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
import { Button } from '@/components/ui/button.tsx'
import { VIEWER_BUTTON_CLASSES } from '@/components/viewer/viewerClasses.ts'
import type { Photo } from '@/photo.ts'

type ViewerTopBarProps = {
  photo: Photo
  counter: string
  onClose: () => void
}

export function ViewerTopBar({ photo, counter, onClose }: ViewerTopBarProps): JSX.Element {
  return (
    // ✕ top left and the actions top right, as on the slideshow. The row spans the screen: only
    // its buttons take pointers, swipes beside them reach the carousel.
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-linear-to-b from-black/60 to-transparent px-4 py-3 *:pointer-events-auto">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        aria-label="Fermer la photo"
        className={VIEWER_BUTTON_CLASSES}
      >
        <XIcon />
      </Button>
      <p aria-live="polite" className="mx-auto text-sm text-white/80 tabular-nums">
        {counter}
      </p>
      <PhotoActionsMenu
        photo={photo}
        label="Actions sur la photo"
        className={VIEWER_BUTTON_CLASSES}
      />
    </div>
  )
}
```

- [ ] **Step 4: The dialog**

Create `client/src/components/viewer/PhotoViewer.tsx`:

```tsx
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { JSX } from 'react'
import { ViewerCaption } from '@/components/viewer/ViewerCaption.tsx'
import { ViewerCarousel } from '@/components/viewer/ViewerCarousel.tsx'
import { ViewerTopBar } from '@/components/viewer/ViewerTopBar.tsx'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import type { ViewerParam } from '@/hooks/useViewerParam.ts'
import { useViewerPhoto } from '@/hooks/useViewerPhoto.ts'
import type { Photo } from '@/photo.ts'
import { viewerCounter } from '@/viewerNavigation.ts'

type PhotoViewerProps = {
  library: PhotoLibrary
  openId: string
  viewer: ViewerParam
}

type ViewerPhotoProps = Omit<PhotoViewerProps, 'openId'> & {
  photo: Photo
  index: number
}

// Back in the library, focus lands on the photo last shown, not the one first opened; focusing
// it also scrolls it into view.
function focusPhotoTile(event: Event, photoId: string): void {
  const tile = document.querySelector<HTMLElement>(`[data-photo-id="${CSS.escape(photoId)}"]`)
  if (!tile) return
  event.preventDefault()
  tile.focus()
}

function ViewerPhoto({ library, viewer, photo, index }: ViewerPhotoProps): JSX.Element {
  return (
    <>
      <ViewerCarousel photos={library.photos} currentId={photo.id} onCurrentChange={viewer.show} />
      <ViewerCaption photo={photo} />
      <ViewerTopBar photo={photo} counter={viewerCounter(index, library)} onClose={viewer.close} />
    </>
  )
}

export function PhotoViewer({ library, openId, viewer }: PhotoViewerProps): JSX.Element {
  const index = useViewerPhoto({ library, openId, show: viewer.show, dismiss: viewer.dismiss })
  const photo = library.photos.find(({ id }) => id === openId)

  return (
    // A dialog: focus stays inside, the page behind neither scrolls nor reaches screen readers,
    // and Escape closes an open menu before the viewer.
    <DialogPrimitive.Root open onOpenChange={viewer.close}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          data-photo-viewer
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => focusPhotoTile(event, openId)}
          // `dark` and the frame background: the photo stands out, whatever the app's theme.
          className="dark fixed inset-0 z-40 bg-frame-background text-foreground outline-none"
        >
          <DialogPrimitive.Title className="sr-only">Photo</DialogPrimitive.Title>
          {photo === undefined ? (
            <p className="grid h-svh place-items-center text-muted-foreground">Chargement…</p>
          ) : (
            <ViewerPhoto library={library} viewer={viewer} photo={photo} index={index} />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
```

- [ ] **Step 5: The window keys still reach the viewer's carousel**

```diff
--- a/client/src/hooks/useIdle.ts
+++ b/client/src/hooks/useIdle.ts
@@ import { useEffect, useState } from 'react'
 const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ['pointermove', 'pointerdown', 'keydown', 'wheel']
 
 // Someone reading the actions menu, the share or the delete dialog is still using the frame, even
-// without moving: the slideshow must not change the photo behind it.
+// without moving: the slideshow must not change the photo behind it. The photo viewer is a dialog
+// too, but only the layers above it count: its own arrow keys must keep working.
 export function isOverlayOpen(): boolean {
-  return document.querySelector('[role="menu"], [role="dialog"], [role="alertdialog"]') !== null
+  const overlaySelector =
+    '[role="menu"], [role="dialog"]:not([data-photo-viewer]), [role="alertdialog"]'
+  return document.querySelector(overlaySelector) !== null
 }
 
 // Starts active: someone just opened the page, and the library must wait its full delay
```

- [ ] **Step 6: Tiles to focus on close, and the library opens the viewer**

```diff
--- a/client/src/components/frame/PhotoGridTile.tsx
+++ b/client/src/components/frame/PhotoGridTile.tsx
@@ export function PhotoGridTile({ photo, isCurrent, onSelect }: PhotoGridTileProps
         type="button"
         onClick={() => onSelect(photo.id)}
         aria-current={isCurrent}
+        // The viewer focuses this tile when it closes on this photo.
+        data-photo-id={photo.id}
         className="group relative block w-full overflow-hidden rounded-xl outline-none ring-offset-4 ring-offset-frame-background focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
       >
         <img
```

```diff
--- a/client/src/components/frame/PhotoListRow.tsx
+++ b/client/src/components/frame/PhotoListRow.tsx
@@ export function PhotoListRow({ photo, isCurrent, onSelect }: PhotoListRowProps):
         type="button"
         onClick={() => onSelect(photo.id)}
         aria-current={isCurrent}
+        // The viewer focuses this row when it closes on this photo.
+        data-photo-id={photo.id}
         className="flex w-full items-center gap-4 rounded-xl p-2 pr-14 text-left outline-none hover:bg-white/5 focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
       >
         <img
```

```diff
--- a/client/src/components/library/LibrarySection.tsx
+++ b/client/src/components/library/LibrarySection.tsx
@@ import type { Photo } from '@/photo.ts'
 
 type LibrarySectionProps = {
   library: PhotoLibrary
+  onOpenPhoto: (id: string) => void
 }
 
 type LibraryPhotosProps = {
@@ function LoadMoreButton({ isLoadingMore, loadMore }: LoadMoreButtonProps): JSX.E
   )
 }
 
-export function LibrarySection({ library }: LibrarySectionProps): JSX.Element {
+export function LibrarySection({ library, onOpenPhoto }: LibrarySectionProps): JSX.Element {
   const [layout, setLayout] = useLibraryLayout()
   const { photos, hasMore, isLoadingMore, loadMore } = library
 
-  // No viewer to build: on a phone, the full photo in a new tab is enough.
-  function openPhoto(id: string): void {
-    const photo = photos.find((candidate) => candidate.id === id)
-    if (photo) window.open(photo.url, '_blank', 'noopener')
-  }
-
   return (
     // `dark` and the frame background: the frame's components look as designed.
     <section
@@ export function LibrarySection({ library }: LibrarySectionProps): JSX.Element {
       className="dark rounded-2xl bg-frame-background text-foreground"
     >
       <LibrarySectionHeader layout={layout} onLayoutChange={setLayout} />
-      <LibraryPhotos photos={photos} layout={layout} onSelect={openPhoto} />
+      <LibraryPhotos photos={photos} layout={layout} onSelect={onOpenPhoto} />
       {hasMore && <LoadMoreButton isLoadingMore={isLoadingMore} loadMore={loadMore} />}
     </section>
   )
```

```diff
--- a/client/src/pages/LibraryPage.tsx
+++ b/client/src/pages/LibraryPage.tsx
@@ import { FriendsCallToAction } from '@/components/library/FriendsCallToAction.ts
 import { LibrarySection } from '@/components/library/LibrarySection.tsx'
 import { UploadForm } from '@/components/library/UploadForm.tsx'
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
+import { PhotoViewer } from '@/components/viewer/PhotoViewer.tsx'
 import { usePhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
+import { useViewerParam } from '@/hooks/useViewerParam.ts'
 
 export default function LibraryPage(): JSX.Element {
   const library = usePhotoLibrary()
+  const viewer = useViewerParam()
 
   return (
     <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
@@ export default function LibraryPage(): JSX.Element {
         </Card>
         <FriendsCallToAction />
       </div>
-      <LibrarySection library={library} />
+      <LibrarySection library={library} onOpenPhoto={viewer.open} />
+      {viewer.openId !== null && (
+        <PhotoViewer library={library} openId={viewer.openId} viewer={viewer} />
+      )}
     </main>
   )
 }
```

- [ ] **Step 7: Docs**

`ARCHITECTURE.md`, Pages, `/` row: replace « une photo s'ouvre en grand dans un nouvel onglet, et son menu propose « Envoyer à un ami » et « Supprimer » » with « une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/`) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; son menu « … » propose « Envoyer à un ami » et « Supprimer » ». After the table, add a paragraph:

> Visionneuse : l'adresse `/?photo=<id>` ouvre la photo, un lien la partage. Ouvrir depuis la bibliothèque ajoute une entrée d'historique, passer d'une photo à l'autre la remplace, et fermer revient en arrière : le bouton retour d'Android ferme la visionneuse. Près de la fin des photos chargées, la page suivante se charge. Une photo supprimée pendant qu'on la regarde laisse sa place à la suivante (la précédente si c'était la plus ancienne), et la visionneuse se ferme quand il n'en reste aucune ; un lien vers une photo inconnue charge les pages jusqu'à la trouver, puis ferme s'il n'y en a plus.

`README.md`, after « Sans session, la bibliothèque et le cadre redirigent… », add: « Regarder ses photos : dans la bibliothèque, toucher une photo l'ouvre en grand ; balayer ou utiliser les flèches pour passer à la suivante, ✕ ou Échap pour revenir. »
`docs/produit/bibliotheque.md`: « Ce que l'on peut faire »: « Ouvrir une photo en grand dans l'application, puis passer à la suivante ou à la précédente d'un geste du doigt, avec les flèches à l'écran ou celles du clavier. »; « Règles » (next free ids): « La photo affiche sa date, et « Envoyée par » suivi du nom quand elle a été reçue. », « Un compteur indique la position de la photo (« 3 / 42 ») ; « 30+ » signifie que d'autres photos plus anciennes ne sont pas encore chargées. », « Fermer la photo ramène à l'endroit de la bibliothèque où se trouve la dernière photo regardée. », « Supprimer la photo affichée montre la suivante ; s'il n'en reste aucune, la photo se ferme. », « Le bouton retour du téléphone ferme la photo. », « Un lien vers une photo qui n'existe plus ramène simplement à la bibliothèque. »; « Messages affichés »: « Chargement… » while the photo arrives. « Ce qui n'est pas possible »: remove « ouvrir une photo dans un nouvel onglet » if the file states the old behaviour. `a-venir.md` section 7: remove the viewer item.

- [ ] **Step 8: Verify**

Run: `pnpm check && pnpm typecheck && pnpm --filter client build && pnpm test`
Expected: green, `Tests  180 passed (180)`. Measure: every function in `components/viewer/` at most 30 lines (`ViewerTopBar` is the closest).

- [ ] **Step 9: Commit**

Message: `feat(client): open photos in an in-app viewer`, then the attribution lines.

**Chrome check (controller):**
- `/`, click the third photo: the URL becomes `/?photo=<id>`, full-screen dark viewer, counter « 3 / 30+ » (or the exact total), date and, for a received photo, « Envoyée par X » at the bottom.
- → / ← keys and the on-screen arrows move; the URL changes with replace (one Back press from any photo returns to `/`); at the first photo the left arrow is hidden.
- Swipe (device toolbar, touch): moves photo by photo.
- Move to the 28th photo: the network shows the next page request; the counter grows.
- ✕, Escape and the browser Back each close; focus lands on the tile of the photo last shown, scrolled into view.
- Open « … » in the viewer, Escape closes the menu only, a second Escape closes the viewer; while the menu is open ←/→ do nothing.
- « Supprimer » on the shown photo: the next one takes its place; on the last loaded photo with no more pages, the previous one; delete the only photo of an account: the viewer closes.
- Paste `/?photo=000000000000000000000000` in the address bar: « Chargement… » briefly, then back to `/` without an error.
- Reload on `/?photo=<id of a photo on page 2>`: the viewer loads page 2 and opens it.

---

> **Controller:** `gh stack add feat/library-frame-merge` before Task 7.

## PR C — `feat/library-frame-merge`

### Task 7: `/frame` is the slideshow only, with its loading, empty and error states (PR C, `feat/library-frame-merge`)

**Files:**
- Modify: `client/src/hooks/useFrameSelection.ts` (rewrite), `client/src/hooks/usePhotoFeed.ts`, `client/src/pages/FramePage.tsx` (rewrite), `client/src/components/frame/SlideshowScreen.tsx`, `client/src/components/frame/CloseButton.tsx`, `client/src/hooks/useSlideshowSettings.ts`
- Create: `client/src/hooks/useLeaveFrame.ts`, `client/src/components/frame/FrameStatusScreen.tsx`
- Delete: `client/src/components/frame/LibraryScreen.tsx`, `client/src/components/frame/LibraryHeader.tsx`, `client/src/hooks/useOnIdle.ts`
- Modify: `ARCHITECTURE.md` (Pages, `/frame` row, Temps réel), `README.md`, `docs/produit/cadre.md`, `docs/produit/a-venir.md`

**Interfaces:**
- Consumes: `PHOTO_PARAM`, `isLibraryBelow`, `LIBRARY_BELOW_STATE`, `photoPath` (Task 4).
- Produces: `useFrameSelection(photos, isActive, startId: string | null): FrameSelection` (no mode any more); `useLeaveFrame(): (photoId: string | null) => void`; `usePhotoFeed(): PhotoFeed` (`{ photos, status: FeedStatus }`); `FrameStatusScreen({ status, className, onLeave })`, `FrameStatus = 'loading' | 'empty' | 'failed'`; `SlideshowScreen` prop `onClose`.

- [ ] **Step 1: The selection without modes, starting on `?photo=`**

Replace `client/src/hooks/useFrameSelection.ts` with:

```ts
import { useState } from 'react'
import type { Photo } from '@/photo.ts'

export type FrameSelection = {
  currentId: string | undefined
  newPhotoCount: number
  selectPhoto: (id: string) => void
  showNewest: () => void
}

// startId: the photo the slideshow starts on (/frame?photo=<id>), null for the newest.
export function useFrameSelection(
  photos: Photo[],
  isActive: boolean,
  startId: string | null,
): FrameSelection {
  // null follows the newest photo.
  const [selectedId, setSelectedId] = useState<string | null>(startId)
  const [newPhotoCount, setNewPhotoCount] = useState(0)
  const newestId = photos.at(0)?.id
  const [shownNewestId, setShownNewestId] = useState(newestId)
  // The pinned photo may have been deleted: fall back to the newest.
  const pinnedId = photos.find(({ id }) => id === selectedId)?.id

  function handleArrival(previousNewestId: string): void {
    if (isActive) {
      // Someone is looking: keep their photo on screen.
      setSelectedId(pinnedId ?? previousNewestId)
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

  return { currentId: pinnedId ?? newestId, newPhotoCount, selectPhoto, showNewest }
}
```

- [ ] **Step 2: Leaving the frame (coordinator addition f)**

Create `client/src/hooks/useLeaveFrame.ts`:

```ts
import { useLocation, useNavigate } from 'react-router'
import { isLibraryBelow, LIBRARY_BELOW_STATE, photoPath } from '@/viewerHistory.ts'

// Leaving the frame opens the viewer on the photo that was on screen, or the library when the
// frame had no photo to show.
export function useLeaveFrame(): (photoId: string | null) => void {
  const navigate = useNavigate()
  const location = useLocation()

  return (photoId) => {
    if (photoId === null) {
      // Back to the library entry the frame was opened from, rather than one more on top of it.
      if (isLibraryBelow(location.state)) navigate(-1)
      else navigate('/', { replace: true })
      return
    }
    // Replace: back from the library must not reopen the frame. The library entry the frame was
    // opened from, if any, is now below the viewer.
    const state = isLibraryBelow(location.state) ? LIBRARY_BELOW_STATE : null
    navigate(photoPath('/', photoId), { replace: true, state })
  }
}
```

- [ ] **Step 3: The feed tells loading from failure (coordinator addition d)**

```diff
--- a/client/src/hooks/usePhotoFeed.ts
+++ b/client/src/hooks/usePhotoFeed.ts
@@ import { fetchAllPhotos } from '@/photosApi.ts'
 // Once a day: far below the 45 days left under which the server renews a session.
 const SESSION_REFRESH_MS = 24 * 60 * 60 * 1000
 
-type PhotoSetter = Dispatch<SetStateAction<Photo[]>>
+// failed only before any photo arrived: a later failed refresh keeps the photos on screen.
+export type FeedStatus = 'loading' | 'loaded' | 'failed'
+
+export type PhotoFeed = {
+  photos: Photo[]
+  status: FeedStatus
+}
+
+type FeedSetters = {
+  setPhotos: Dispatch<SetStateAction<Photo[]>>
+  setStatus: Dispatch<SetStateAction<FeedStatus>>
+}
 
 function createFeedLoader(
   liveLoads: LiveLoads,
-  setPhotos: PhotoSetter,
+  { setPhotos, setStatus }: FeedSetters,
   dropUser: () => void,
 ): () => Promise<void> {
   return async () => {
@@ function createFeedLoader(
     const loadedPhotos = await fetchAllPhotos(() => {
       if (liveLoads.isCurrent(loadId)) dropUser()
     })
-    if (!loadedPhotos || !liveLoads.isCurrent(loadId)) return
+    if (!liveLoads.isCurrent(loadId)) return
+    if (!loadedPhotos) {
+      setStatus((status) => (status === 'loaded' ? status : 'failed'))
+      return
+    }
     setPhotos(liveLoads.withLiveChanges(loadedPhotos))
+    setStatus('loaded')
   }
 }
 
 // Returns the cleanup that stops the socket, the timer and any load still running.
-function connectPhotoFeed(setPhotos: PhotoSetter, dropUser: () => void): () => void {
+function connectPhotoFeed(setters: FeedSetters, dropUser: () => void): () => void {
+  const { setPhotos } = setters
   const liveLoads = createLiveLoads()
-  const load = createFeedLoader(liveLoads, setPhotos, dropUser)
+  const load = createFeedLoader(liveLoads, setters, dropUser)
 
   const socket = connectPhotoSocket({
     onConnect: load,
@@ function connectPhotoFeed(setPhotos: PhotoSetter, dropUser: () => void): () => v
 }
 
 // The whole library of the logged-in user, newest first like GET /api/photos.
-export function usePhotoFeed(): Photo[] {
+export function usePhotoFeed(): PhotoFeed {
   const { dropUser } = useAuth()
   const [photos, setPhotos] = useState<Photo[]>([])
+  const [status, setStatus] = useState<FeedStatus>('loading')
 
-  useEffect(() => connectPhotoFeed(setPhotos, dropUser), [dropUser])
+  useEffect(() => connectPhotoFeed({ setPhotos, setStatus }, dropUser), [dropUser])
 
-  return photos
+  return { photos, status }
 }
```

- [ ] **Step 4: The status screen**

Create `client/src/components/frame/FrameStatusScreen.tsx`:

```tsx
import { ImagesIcon, TriangleAlertIcon } from 'lucide-react'
import type { JSX, ReactNode } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { cn } from '@/lib/utils.ts'

// Why the frame shows no photo: each case needs its own words.
export type FrameStatus = 'loading' | 'empty' | 'failed'

type FrameStatusScreenProps = {
  status: FrameStatus
  className: string
  onLeave: () => void
}

function StatusMessage({ status }: { status: FrameStatus }): ReactNode {
  if (status === 'loading') return <p className="text-3xl font-medium">Chargement des photos…</p>
  if (status === 'failed') {
    return (
      <>
        <p className="text-3xl font-medium">Les photos n'ont pas pu être chargées.</p>
        <p className="text-lg text-muted-foreground">
          Le cadre réessaiera dès que la connexion reviendra.
        </p>
      </>
    )
  }
  return (
    <>
      <p className="text-3xl font-medium">En attente de la première photo…</p>
      {/* A first visitor needs the way in, not only the news that the frame is empty. */}
      <p className="text-lg text-muted-foreground">
        Envoyez-en une depuis votre téléphone : {window.location.host}
      </p>
    </>
  )
}

export function FrameStatusScreen({
  status,
  className,
  onLeave,
}: FrameStatusScreenProps): JSX.Element {
  const Icon = status === 'failed' ? TriangleAlertIcon : ImagesIcon
  return (
    <main
      className={cn(
        className,
        'grid place-items-center bg-radial from-frame-accent/10 to-transparent to-70%',
      )}
    >
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <Icon aria-hidden className="size-16 text-frame-accent/80 motion-safe:animate-pulse" />
        <StatusMessage status={status} />
        {/* Without photos there is no slideshow, and so no ✕: this is the way out. */}
        <Button variant="outline" size="lg" className="mt-4" onClick={onLeave}>
          Retour à la bibliothèque
        </Button>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: The slideshow closes through the page**

```diff
--- a/client/src/components/frame/SlideshowScreen.tsx
+++ b/client/src/components/frame/SlideshowScreen.tsx
@@ type SlideshowScreenProps = {
   selection: FrameSelection
   isActive: boolean
   settings: SlideshowSettings
+  onClose: () => void
 }
 
 export function SlideshowScreen({
@@ export function SlideshowScreen({
   selection,
   isActive,
   settings,
+  onClose,
 }: SlideshowScreenProps): JSX.Element {
-  useEscapeToClose(selection.closeSlideshow)
+  useEscapeToClose(onClose)
 
   return (
     <>
@@ export function SlideshowScreen({
         isVisible={isActive}
         photo={currentPhoto}
         settings={settings}
-        onClose={selection.closeSlideshow}
+        onClose={onClose}
       />
       <PhotoView
         photos={photos}
```

```diff
--- a/client/src/components/frame/CloseButton.tsx
+++ b/client/src/components/frame/CloseButton.tsx
@@ export function CloseButton({ onClose }: CloseButtonProps): JSX.Element {
       variant="ghost"
       size="icon-sm"
       onClick={onClose}
-      aria-label="Fermer le diaporama"
+      aria-label="Quitter le mode cadre"
       className={GLASS_BUTTON_CLASSES}
     >
       <XIcon />
```

```diff
--- a/client/src/hooks/useSlideshowSettings.ts
+++ b/client/src/hooks/useSlideshowSettings.ts
@@ export type SlideshowSettings = {
   onStripVisibleChange: (isStripVisible: boolean) => void
 }
 
-// Called by the page, not the slideshow screen: the screen unmounts in the library, and the
-// chosen speed must survive the trip.
+// Called by the page, not the slideshow screen: the page's photo selection reads isPlaying too.
 export function useSlideshowSettings(): SlideshowSettings {
   const [isPlaying, setIsPlaying] = useState(true)
   const [intervalMs, setIntervalMs] = useState(DEFAULT_SLIDESHOW_INTERVAL_MS)
```

- [ ] **Step 6: The page**

Replace `client/src/pages/FramePage.tsx` with:

```tsx
import type { JSX } from 'react'
import { useSearchParams } from 'react-router'
import { type FrameStatus, FrameStatusScreen } from '@/components/frame/FrameStatusScreen.tsx'
import { SlideshowScreen } from '@/components/frame/SlideshowScreen.tsx'
import { useFrameSelection } from '@/hooks/useFrameSelection.ts'
import { useIdle } from '@/hooks/useIdle.ts'
import { useLeaveFrame } from '@/hooks/useLeaveFrame.ts'
import { type FeedStatus, usePhotoFeed } from '@/hooks/usePhotoFeed.ts'
import { useSlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
import { cn } from '@/lib/utils.ts'
import { PHOTO_PARAM } from '@/viewerHistory.ts'

// The frame is a screen on a wall: dark keeps the photos in front.
const FRAME_CLASSES = 'dark min-h-svh bg-frame-background text-foreground'
// The controls step aside quickly: the photo is what the wall is for.
const CONTROLS_HIDE_DELAY_MS = 4000

// Reached only without photos: once loaded, that means an empty library.
function frameStatus(status: FeedStatus): FrameStatus {
  return status === 'loaded' ? 'empty' : status
}

export default function FramePage(): JSX.Element {
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
  if (currentPhoto === undefined) {
    return (
      <FrameStatusScreen
        status={frameStatus(status)}
        className={FRAME_CLASSES}
        onLeave={() => leaveFrame(null)}
      />
    )
  }

  return (
    // data-idle: the slideshow's shade reads it from CSS, without one more prop down the tree.
    <main
      data-idle={!isActive}
      className={cn('group/frame', FRAME_CLASSES, !isActive && 'cursor-none')}
    >
      <SlideshowScreen
        photos={photos}
        currentPhoto={currentPhoto}
        selection={selection}
        isActive={isActive}
        settings={settings}
        onClose={() => leaveFrame(currentPhoto.id)}
      />
    </main>
  )
}
```

Then delete the library mode:

```bash
git rm client/src/components/frame/LibraryScreen.tsx client/src/components/frame/LibraryHeader.tsx client/src/hooks/useOnIdle.ts
```

Run: `git grep -n "LibraryScreen\|LibraryHeader\|useOnIdle\|LIBRARY_IDLE_DELAY_MS\|startSlideshow" -- client/src`
Expected: no output.

- [ ] **Step 7: Docs**

`ARCHITECTURE.md`, Pages, `/frame` row, replace the whole description with: « cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), celui qu'un cadre ouvre au démarrage ; `/frame?photo=<id>` commence sur cette photo ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque » ». In the `/` row, replace « (même choix mémorisé que le cadre) » with « (choix mémorisé par appareil) ».
`ARCHITECTURE.md`, Temps réel, third bullet: after « Le cadre recharge toute la bibliothèque … n'est pas perdue. », add « Tant qu'aucun chargement n'a réussi, le cadre l'indique (`usePhotoFeed` renvoie `status`) ; un rechargement qui échoue ensuite garde les photos affichées. »
`README.md`, after the URL table paragraph « Sans session… », add: « Le cadre (`/frame`) n'affiche que le diaporama ; ✕ ou Échap ramène à la bibliothèque sur la photo qui était à l'écran. »
`docs/produit/cadre.md`: « Ce que l'on peut faire »: « Quitter le diaporama pour revenir à la bibliothèque, sur la photo qui était affichée. »; « Règles » (next free ids): « Le cadre n'affiche que le diaporama : les vignettes et la liste sont dans la bibliothèque. », « Le diaporama ne démarre plus de lui-même après une minute : il est déjà la seule vue du cadre. » (drop the old one-minute rule in place, keeping its id and marking it replaced if the file's convention says so; never renumber), « Sans photo à montrer, le cadre dit pourquoi : chargement en cours, aucune photo encore, ou chargement impossible ; il réessaie tout seul quand la connexion revient. », « Un bouton « Retour à la bibliothèque » permet toujours de sortir du cadre. »; « Messages affichés »: « Chargement des photos… », « En attente de la première photo… » (existing), « Les photos n'ont pas pu être chargées. » with « Le cadre réessaiera dès que la connexion reviendra. », « Quitter le mode cadre », « Retour à la bibliothèque ». `a-venir.md` section 7: remove the library/frame merge item and the frame-states item if listed.

- [ ] **Step 8: Verify**

Run: `pnpm check && pnpm typecheck && pnpm --filter client build && pnpm test`
Expected: green, `Tests  180 passed (180)`.

- [ ] **Step 9: Commit**

Message: `feat(client): make the frame a slideshow only`, then the attribution lines.

**Chrome check (controller):**
- `/frame` (typed in the address bar): the slideshow starts at once, no grid; no one-minute switch.
- ✕ (label « Quitter le mode cadre ») or Escape: the URL becomes `/?photo=<id of the photo on screen>`, the viewer shows it; Back then leaves the app's library history (no second frame).
- `/frame?photo=<id of an older photo>`: the slideshow starts on it, then advances.
- Menus and the share dialog on the slideshow still pause the controls' hiding (unchanged).
- Loading: DevTools Network → Slow 3G, reload `/frame`: « Chargement des photos… » then the slideshow. Failure: block `*/api/photos*`, reload: « Les photos n'ont pas pu être chargées. »; unblock and toggle Offline/Online: the slideshow appears. Empty: an account with no photo: « En attente de la première photo… » with the address line. Each screen's « Retour à la bibliothèque » returns to `/`.

### Task 8: « Mode cadre » from the library and from the viewer (PR C, `feat/library-frame-merge`)

**Files:**
- Modify: `client/src/hooks/useViewerParam.ts`, `client/src/components/viewer/ViewerTopBar.tsx`, `client/src/components/viewer/PhotoViewer.tsx`, `client/src/components/library/LibrarySection.tsx`
- Modify: `ARCHITECTURE.md` (Pages), `README.md`, `docs/produit/bibliotheque.md`, `docs/produit/cadre.md`, `docs/produit/a-venir.md`

**Interfaces:**
- Produces: `ViewerParam.startFrame(photoId)`; `ViewerTopBar` prop `onStartFrame`.

- [ ] **Step 1: Start the frame from the viewer**

```diff
--- a/client/src/hooks/useViewerParam.ts
+++ b/client/src/hooks/useViewerParam.ts
@@
 import { useLocation, useNavigate, useSearchParams } from 'react-router'
-import { isLibraryBelow, LIBRARY_BELOW_STATE, PHOTO_PARAM } from '@/viewerHistory.ts'
+import { isLibraryBelow, LIBRARY_BELOW_STATE, PHOTO_PARAM, photoPath } from '@/viewerHistory.ts'
 
 export type ViewerParam = {
   openId: string | null
@@ export type ViewerParam = {
   show: (photoId: string) => void
   close: () => void
   dismiss: () => void
+  startFrame: (photoId: string) => void
 }
 
 export function useViewerParam(): ViewerParam {
@@ export function useViewerParam(): ViewerParam {
     else dismiss()
   }
 
-  return { openId, open, show, close, dismiss }
+  // Replace, keeping the viewer's state: the frame takes the viewer's place above the library,
+  // so leaving the frame brings back one viewer, not two.
+  function startFrame(photoId: string): void {
+    navigate(photoPath('/frame', photoId), { replace: true, state: location.state })
+  }
+
+  return { openId, open, show, close, dismiss, startFrame }
 }
```

```diff
--- a/client/src/components/viewer/ViewerTopBar.tsx
+++ b/client/src/components/viewer/ViewerTopBar.tsx
@@
-import { XIcon } from 'lucide-react'
+import { PlayIcon, XIcon } from 'lucide-react'
 import type { JSX } from 'react'
 import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
 import { Button } from '@/components/ui/button.tsx'
 import { VIEWER_BUTTON_CLASSES } from '@/components/viewer/viewerClasses.ts'
+import { cn } from '@/lib/utils.ts'
 import type { Photo } from '@/photo.ts'
 
 type ViewerTopBarProps = {
   photo: Photo
   counter: string
   onClose: () => void
+  onStartFrame: () => void
 }
 
-export function ViewerTopBar({ photo, counter, onClose }: ViewerTopBarProps): JSX.Element {
+function StartFrameButton({ onStartFrame }: Pick<ViewerTopBarProps, 'onStartFrame'>): JSX.Element {
+  return (
+    <Button
+      variant="ghost"
+      size="sm"
+      onClick={onStartFrame}
+      // The glass, but a pill wide enough for its label.
+      className={cn(VIEWER_BUTTON_CLASSES, 'w-auto px-3 pointer-coarse:w-auto')}
+    >
+      <PlayIcon data-icon="inline-start" />
+      Mode cadre
+    </Button>
+  )
+}
+
+export function ViewerTopBar({
+  photo,
+  counter,
+  onClose,
+  onStartFrame,
+}: ViewerTopBarProps): JSX.Element {
   return (
     // ✕ top left and the actions top right, as on the slideshow. The row spans the screen: only
     // its buttons take pointers, swipes beside them reach the carousel.
@@ export function ViewerTopBar({ photo, counter, onClose }: ViewerTopBarProps): JS
       <p aria-live="polite" className="mx-auto text-sm text-white/80 tabular-nums">
         {counter}
       </p>
+      <StartFrameButton onStartFrame={onStartFrame} />
       <PhotoActionsMenu
         photo={photo}
         label="Actions sur la photo"
```

```diff
--- a/client/src/components/viewer/PhotoViewer.tsx
+++ b/client/src/components/viewer/PhotoViewer.tsx
@@ function ViewerPhoto({ library, viewer, photo, index }: ViewerPhotoProps): JSX.E
     <>
       <ViewerCarousel photos={library.photos} currentId={photo.id} onCurrentChange={viewer.show} />
       <ViewerCaption photo={photo} />
-      <ViewerTopBar photo={photo} counter={viewerCounter(index, library)} onClose={viewer.close} />
+      <ViewerTopBar
+        photo={photo}
+        counter={viewerCounter(index, library)}
+        onClose={viewer.close}
+        onStartFrame={() => viewer.startFrame(photo.id)}
+      />
     </>
   )
 }
```

- [ ] **Step 2: Start the frame from the library header**

```diff
--- a/client/src/components/library/LibrarySection.tsx
+++ b/client/src/components/library/LibrarySection.tsx
@@
+import { PlayIcon } from 'lucide-react'
 import type { JSX } from 'react'
+import { Link } from 'react-router'
 import { LayoutToggle } from '@/components/frame/LayoutToggle.tsx'
 import { PhotoGrid } from '@/components/frame/PhotoGrid.tsx'
 import { PhotoList } from '@/components/frame/PhotoList.tsx'
@@ import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'
 import { useLibraryLayout } from '@/hooks/useLibraryLayout.ts'
 import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
 import type { Photo } from '@/photo.ts'
+import { LIBRARY_BELOW_STATE } from '@/viewerHistory.ts'
 
 type LibrarySectionProps = {
   library: PhotoLibrary
@@ function LibrarySectionHeader({ layout, onLayoutChange }: LibraryHeaderProps): J
       <h2 id="library-title" className="text-xl font-medium tracking-tight">
         Ma bibliothèque
       </h2>
-      <div className="ml-auto">
+      <div className="ml-auto flex items-center gap-2">
+        <Button
+          asChild
+          size="lg"
+          className="rounded-full bg-frame-accent px-4 text-black hover:bg-frame-accent/85"
+        >
+          {/* The state: leaving the frame comes back to this library entry. */}
+          <Link to="/frame" state={LIBRARY_BELOW_STATE}>
+            <PlayIcon data-icon="inline-start" />
+            Mode cadre
+          </Link>
+        </Button>
         <LayoutToggle layout={layout} onLayoutChange={onLayoutChange} />
       </div>
     </header>
```

- [ ] **Step 3: Docs**

`ARCHITECTURE.md`, Pages, `/` row: after « en vignettes ou en liste (choix mémorisé par appareil) », add « , « Mode cadre » à côté du choix vignettes/liste lance le diaporama » and, in the viewer sentence, « ▶ « Mode cadre » lance le diaporama depuis la photo affichée ». In the Visionneuse paragraph add: « « Mode cadre » remplace l'entrée de la visionneuse (ou s'ajoute au-dessus de la bibliothèque depuis son en-tête) : quitter le cadre ramène une seule visionneuse, et le retour arrière la bibliothèque. Le lien « Cadre » de la barre reste un lien simple, pour un cadre démarré directement. »
`README.md`, the Task 7 sentence becomes: « Le cadre (`/frame`) n'affiche que le diaporama : « Mode cadre » le lance depuis la bibliothèque ou depuis une photo ouverte ; ✕ ou Échap ramène à la bibliothèque sur la photo qui était à l'écran. »
`docs/produit/bibliotheque.md`, « Ce que l'on peut faire »: « Lancer le mode cadre depuis la bibliothèque, ou depuis une photo ouverte pour que le diaporama commence par elle. » `docs/produit/cadre.md`, « Règles » (next free id): « Lancé depuis une photo, le diaporama commence par cette photo. » `a-venir.md` section 7: remove the « Mode cadre » item.

- [ ] **Step 4: Verify**

Run: `pnpm check && pnpm typecheck && pnpm --filter client build`
Expected: green. Measure: `ViewerTopBar` at most 30 lines (`StartFrameButton` is extracted for that).

- [ ] **Step 5: Commit**

Message: `feat(client): start frame mode from the library or a photo`, then the attribution lines.

**Chrome check (controller):**
- `/`: a yellow « Mode cadre » pill with ▶ sits left of the grid/list toggle; click: `/frame`, slideshow; ✕: `/?photo=<id>` viewer; ✕ again: `/` (Back would now leave the library, one entry only).
- In the viewer on the 5th photo, ▶ « Mode cadre »: `/frame?photo=<that id>`, slideshow starts on it; ✕: viewer on the photo then shown; ✕: `/`.
- The app bar « Cadre » link still opens `/frame`; ✕ from there: `/?photo=<id>`, ✕: `/`.
- Phone width: the pill and the toggle fit on one line with the section title.

---

> **Controller:** `gh stack add feat/share-sheet` before Task 9.

## PR D — `feat/share-sheet`

### Task 9: Sharing logic: several friends, one result (PR D, `feat/share-sheet`)

**Files:**
- Create: `client/src/components/sharing/shareTexts.ts`, `client/src/hooks/useMediaQuery.ts`, `client/src/hooks/useShareSending.ts`
- Modify: `client/src/photosApi.ts`, `client/src/hooks/useFriendShares.ts` (temporary, Choices 8)

**Interfaces:**
- Produces: `ShareResult` gains `{ status: 'duplicate' }`, `SHARE_DUPLICATE_MESSAGE` leaves `photosApi.ts`; `ShareOutcome`, `firstName`, `joinNames`, `sentTitle`, `sharedNames`, `failureMessages`, `sendButtonLabel`; `useMediaQuery(query): boolean`; `ShareTarget`, `ShareSending`, `useShareSending(target, onSent)`.
- No UI change in this task: the old dialog keeps working.

- [ ] **Step 1: The texts, pure**

Create `client/src/components/sharing/shareTexts.ts`:

```ts
// What one friend's share gave, under the name the sheet shows for them.
export type ShareOutcome =
  | { name: string; status: 'shared' }
  | { name: string; status: 'duplicate' }
  | { name: string; status: 'failed'; message: string }

// A grid of faces has room for one word: « Marie-Claire Dupont » shows as « Marie-Claire ».
export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0]
}

// « Mamie », « Mamie et Tata », « Mamie, Tata et Papi ».
export function joinNames(names: string[]): string {
  const lastName = names.at(-1)
  if (lastName === undefined) return ''
  const otherNames = names.slice(0, -1)
  return otherNames.length === 0 ? lastName : `${otherNames.join(', ')} et ${lastName}`
}

export function sentTitle(names: string[]): string {
  return `Envoyée à ${joinNames(names)}`
}

export function sharedNames(outcomes: ShareOutcome[]): string[] {
  return outcomes.filter(({ status }) => status === 'shared').map(({ name }) => name)
}

export function failureMessages(outcomes: ShareOutcome[]): string[] {
  return outcomes.flatMap((outcome) => {
    if (outcome.status === 'duplicate') return [`${outcome.name} a déjà cette photo.`]
    if (outcome.status === 'failed') return [`${outcome.name} : ${outcome.message}`]
    return []
  })
}

// Plain « Envoyer » while nobody is chosen: the button is disabled then.
export function sendButtonLabel(selectedCount: number): string {
  if (selectedCount === 0) return 'Envoyer'
  return selectedCount === 1 ? 'Envoyer à 1 personne' : `Envoyer à ${selectedCount} personnes`
}
```

- [ ] **Step 2: A duplicate is its own result**

```diff
--- a/client/src/photosApi.ts
+++ b/client/src/photosApi.ts
@@ export type UploadResult =
   | { status: 'failed'; message: string }
   | { status: 'unauthenticated' }
 
+// duplicate apart from failed: the share sheet names the friend who already has the photo.
 export type ShareResult =
   | { status: 'shared' }
+  | { status: 'duplicate' }
   | { status: 'failed'; message: string }
   | { status: 'unauthenticated' }
 
-// The shared PHOTO_DUPLICATE message says « votre bibliothèque »: a share hits the friend's.
-const SHARE_DUPLICATE_MESSAGE = 'Cette personne a déjà cette photo.'
-
 function photosUrl({ cursor, limit }: PageRequest): string {
   const params = new URLSearchParams()
   if (cursor !== undefined) params.set('cursor', cursor)
@@ async function sendShare(url: string, init: RequestInit): Promise<ShareResult> {
     if (res.ok) return { status: 'shared' }
     // Not JSON when the dev proxy answers for a stopped API.
     const data: unknown = await res.json().catch(() => null)
-    const message = isDuplicateError(data) ? SHARE_DUPLICATE_MESSAGE : errorMessage(data)
-    return { status: 'failed', message }
+    if (isDuplicateError(data)) return { status: 'duplicate' }
+    return { status: 'failed', message: errorMessage(data) }
   } catch {
     // fetch rejects only on network failure.
     return { status: 'failed', message: errorMessage(null) }
```

```diff
--- a/client/src/hooks/useFriendShares.ts
+++ b/client/src/hooks/useFriendShares.ts
@@ import { useAuth } from '@/auth/AuthContext.ts'
 import type { Photo } from '@/photo.ts'
 import { postDeviceShare, postLibraryShare, type ShareResult } from '@/photosApi.ts'
 
+// Until the share sheet replaces this dialog: the message the API's duplicate used to give.
+const SHARE_DUPLICATE_MESSAGE = 'Cette personne a déjà cette photo.'
+
 export type ShareTarget = { kind: 'library'; photo: Photo } | { kind: 'device'; file: File }
 
 // Keyed by the friend's user id: one dialog may send to several friends.
@@ export function useFriendShares(target: ShareTarget, onShared?: () => void): Fri
       setError(result.message)
       return
     }
+    if (result.status === 'duplicate') {
+      setError(SHARE_DUPLICATE_MESSAGE)
+      return
+    }
     setSentIds((ids) => [...ids, friendId])
     onShared?.()
   }
```

- [ ] **Step 3: Media query and sending**

Create `client/src/hooks/useMediaQuery.ts`:

```ts
import { useCallback, useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      const mediaQueryList = window.matchMedia(query)
      mediaQueryList.addEventListener('change', onChange)
      return () => mediaQueryList.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
```

Create `client/src/hooks/useShareSending.ts`:

```ts
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext.ts'
import {
  failureMessages,
  firstName,
  type ShareOutcome,
  sentTitle,
  sharedNames,
} from '@/components/sharing/shareTexts.ts'
import type { FriendUser } from '@/friendship.ts'
import type { Photo } from '@/photo.ts'
import { postDeviceShare, postLibraryShare, type ShareResult } from '@/photosApi.ts'

export type ShareTarget = { kind: 'library'; photo: Photo } | { kind: 'device'; file: File }

export type ShareSending = {
  isSending: boolean
  error: string
  sendTo: (friends: FriendUser[]) => Promise<void>
}

function postShare(target: ShareTarget, friendId: string): Promise<ShareResult> {
  return target.kind === 'library'
    ? postLibraryShare(target.photo.id, friendId)
    : postDeviceShare(target.file, friendId)
}

// One friend after the other: a device share uploads the whole file each time. null: the
// session ended, nothing more can be sent.
async function shareWithEach(
  target: ShareTarget,
  friends: FriendUser[],
): Promise<ShareOutcome[] | null> {
  const outcomes: ShareOutcome[] = []
  for (const friend of friends) {
    const result = await postShare(target, friend.id)
    if (result.status === 'unauthenticated') return null
    outcomes.push({ ...result, name: firstName(friend.displayName) })
  }
  return outcomes
}

function announceSent(names: string[], failures: string[]): void {
  if (failures.length === 0) {
    toast.success(sentTitle(names))
    return
  }
  // Sent to some, not all: the photo did leave, the warning says who is missing.
  toast.warning(sentTitle(names), { description: failures.join(' ') })
}

export function useShareSending(target: ShareTarget, onSent: () => void): ShareSending {
  const { dropUser } = useAuth()
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  async function sendTo(friends: FriendUser[]): Promise<void> {
    setIsSending(true)
    setError('')
    const outcomes = await shareWithEach(target, friends)
    setIsSending(false)
    // The session ended on the server: RequireAuth sends the user to /login.
    if (outcomes === null) {
      dropUser()
      return
    }
    const names = sharedNames(outcomes)
    // Nobody got it: the sheet stays open with the reasons, so the choice can change.
    if (names.length === 0) {
      setError(failureMessages(outcomes).join(' '))
      return
    }
    announceSent(names, failureMessages(outcomes))
    onSent()
  }

  return { isSending, error, sendTo }
}
```

- [ ] **Step 4: Verify**

Run: `pnpm check && pnpm typecheck && pnpm --filter client build`
Expected: green.

- [ ] **Step 5: Commit**

Message: `feat(client): send a photo to several friends in one go`, then the attribution lines.

**Chrome check (controller):** the old « Envoyer à un ami » dialog still sends; sending the same photo twice still shows « Cette personne a déjà cette photo. ».

### Task 10: The share sheet (PR D, `feat/share-sheet`)

**Files:**
- Create: `client/src/components/sharing/FriendPicker.tsx`, `client/src/components/sharing/ShareFriendsForm.tsx`, `client/src/components/sharing/ShareSheet.tsx`
- Modify: `client/src/components/frame/PhotoActionsMenu.tsx`, `client/src/components/library/UploadForm.tsx`
- Delete: `client/src/components/sharing/SharePhotoDialog.tsx`, `client/src/hooks/useFriendShares.ts`
- Modify: `ARCHITECTURE.md` (Pages, share paragraph), `README.md`, `docs/produit/partage.md`, `docs/produit/a-venir.md`

**Interfaces:**
- Consumes: Task 9, `useFriendships`, `friendSearch.ts` (`FRIEND_SEARCH_MIN_COUNT`, `filterFriends`), `UserAvatar`, `usePreviewUrl`, `photoLabel`, shadcn `Dialog`, `Sheet`.
- Produces: `ShareSheet({ target, onClose, onShared?, onCloseAutoFocus?, className? })`, same props as the old `SharePhotoDialog`.

- [ ] **Step 1: The friend grid**

Create `client/src/components/sharing/FriendPicker.tsx`:

```tsx
import { CheckIcon } from 'lucide-react'
import type { JSX } from 'react'
import { UserAvatar } from '@/components/auth/UserAvatar.tsx'
import { firstName } from '@/components/sharing/shareTexts.ts'
import type { Friendship, FriendUser } from '@/friendship.ts'

type FriendPickerProps = {
  friends: Friendship[]
  query: string
  selectedIds: string[]
  isDisabled: boolean
  onToggle: (friendId: string) => void
}

type FriendToggleProps = {
  friend: FriendUser
  isSelected: boolean
  isDisabled: boolean
  onToggle: (friendId: string) => void
}

function FriendToggle({
  friend,
  isSelected,
  isDisabled,
  onToggle,
}: FriendToggleProps): JSX.Element {
  return (
    // The full name for hover and screen readers: it tells two « Jean » apart.
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={friend.displayName}
      title={friend.displayName}
      disabled={isDisabled}
      onClick={() => onToggle(friend.id)}
      className="group flex w-full flex-col items-center gap-1.5 rounded-xl p-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
    >
      <span className="relative">
        <UserAvatar
          name={friend.displayName}
          className="size-14 bg-muted text-lg text-foreground ring-offset-2 ring-offset-popover group-aria-pressed:ring-2 group-aria-pressed:ring-primary"
        />
        <span
          aria-hidden
          className="absolute -right-0.5 -bottom-0.5 hidden size-5 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-popover group-aria-pressed:grid"
        >
          <CheckIcon className="size-3" />
        </span>
      </span>
      <span className="w-full truncate text-center text-sm">{firstName(friend.displayName)}</span>
    </button>
  )
}

export function FriendPicker({
  friends,
  query,
  selectedIds,
  isDisabled,
  onToggle,
}: FriendPickerProps): JSX.Element {
  if (friends.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aucun ami ne correspond à « {query.trim()} ».</p>
    )
  }
  return (
    // Scrolls on its own: with many friends, the send button stays in reach.
    <ul className="grid max-h-64 grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-1 overflow-y-auto">
      {friends.map(({ user }) => (
        <li key={user.id}>
          <FriendToggle
            friend={user}
            isSelected={selectedIds.includes(user.id)}
            isDisabled={isDisabled}
            onToggle={onToggle}
          />
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: The form**

Create `client/src/components/sharing/ShareFriendsForm.tsx`:

```tsx
import { SearchIcon } from 'lucide-react'
import { type JSX, useState } from 'react'
import { Link } from 'react-router'
import { FriendPicker } from '@/components/sharing/FriendPicker.tsx'
import { FRIEND_SEARCH_MIN_COUNT, filterFriends } from '@/components/sharing/friendSearch.ts'
import { sendButtonLabel } from '@/components/sharing/shareTexts.ts'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import type { Friendship } from '@/friendship.ts'
import { useFriendships } from '@/hooks/useFriendships.ts'
import { type ShareTarget, useShareSending } from '@/hooks/useShareSending.ts'

type ShareFriendsFormProps = {
  target: ShareTarget
  onSent: () => void
}

type FriendSelectionProps = ShareFriendsFormProps & {
  friends: Friendship[]
}

type FriendSearchFieldProps = {
  query: string
  onQueryChange: (query: string) => void
}

function NoFriends(): JSX.Element {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-muted-foreground">Vous n'avez pas encore d'amis.</p>
      <Button asChild variant="outline" size="sm">
        <Link to="/friends">Ajouter un ami</Link>
      </Button>
    </div>
  )
}

function ErrorAlert({ message }: { message: string }): JSX.Element {
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

function FriendSearchField({ query, onQueryChange }: FriendSearchFieldProps): JSX.Element {
  return (
    <div className="relative">
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        className="pl-9"
        placeholder="Rechercher un ami"
        aria-label="Rechercher un ami"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
    </div>
  )
}

function toggledIds(ids: string[], friendId: string): string[] {
  return ids.includes(friendId) ? ids.filter((id) => id !== friendId) : [...ids, friendId]
}

// The selection survives the search: a friend chosen then filtered out is still sent the photo.
function FriendSelection({ friends, target, onSent }: FriendSelectionProps): JSX.Element {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const sending = useShareSending(target, onSent)
  const selectedFriends = friends
    .map(({ user }) => user)
    .filter(({ id }) => selectedIds.includes(id))

  return (
    <div className="flex flex-col gap-4">
      {friends.length >= FRIEND_SEARCH_MIN_COUNT && (
        <FriendSearchField query={query} onQueryChange={setQuery} />
      )}
      <FriendPicker
        friends={filterFriends(friends, query)}
        query={query}
        selectedIds={selectedIds}
        isDisabled={sending.isSending}
        onToggle={(friendId) => setSelectedIds((ids) => toggledIds(ids, friendId))}
      />
      {sending.error && <ErrorAlert message={sending.error} />}
      <Button
        size="lg"
        disabled={selectedIds.length === 0 || sending.isSending}
        onClick={() => sending.sendTo(selectedFriends)}
      >
        {sending.isSending ? 'Envoi…' : sendButtonLabel(selectedIds.length)}
      </Button>
    </div>
  )
}

// Pending requests cannot receive: accepted friends only.
export function ShareFriendsForm({ target, onSent }: ShareFriendsFormProps): JSX.Element {
  const { friendships, isLoading, error } = useFriendships()
  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>
  if (error) return <ErrorAlert message={error} />
  if (friendships.friends.length === 0) return <NoFriends />
  return <FriendSelection friends={friendships.friends} target={target} onSent={onSent} />
}
```

- [ ] **Step 3: The sheet or dialog**

Create `client/src/components/sharing/ShareSheet.tsx`:

```tsx
import type { JSX } from 'react'
import { ShareFriendsForm } from '@/components/sharing/ShareFriendsForm.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx'
import { Sheet, SheetContent } from '@/components/ui/sheet.tsx'
import { useMediaQuery } from '@/hooks/useMediaQuery.ts'
import { usePreviewUrl } from '@/hooks/usePreviewUrl.ts'
import type { ShareTarget } from '@/hooks/useShareSending.ts'
import { cn } from '@/lib/utils.ts'
import { photoLabel } from '@/photoLabel.ts'

// Tailwind's md breakpoint, where the page layout switches too.
const DESKTOP_QUERY = '(min-width: 48rem)'

type ShareSheetProps = {
  // Picked when the sheet opened: the slideshow may move on while it stays open.
  target: ShareTarget | null
  onClose: () => void
  // The upload form empties its inputs once the photo is sent.
  onShared?: () => void
  onCloseAutoFocus?: (event: Event) => void
  className?: string
}

type ShareBodyProps = {
  target: ShareTarget
  onSent: () => void
}

function ShareThumbnail({ target }: { target: ShareTarget }): JSX.Element | null {
  const fileUrl = usePreviewUrl(target.kind === 'device' ? target.file : null)
  const src = target.kind === 'library' ? target.photo.thumbnailUrl : fileUrl
  if (!src) return null
  const alt = target.kind === 'library' ? photoLabel(target.photo) : 'Aperçu avant envoi'
  return <img className="size-14 shrink-0 rounded-lg object-cover" src={src} alt={alt} />
}

// Sheet and Dialog are the same Radix dialog underneath: one title and description serve both.
function ShareBody({ target, onSent }: ShareBodyProps): JSX.Element {
  return (
    <>
      {/* pr-10 keeps the text clear of the ✕ in the corner. */}
      <div className="flex items-center gap-3 pr-10">
        <ShareThumbnail target={target} />
        <div className="flex min-w-0 flex-col gap-1">
          <DialogTitle>Envoyer à des proches</DialogTitle>
          <DialogDescription className="truncate">
            La photo s'affichera aussitôt sur leur cadre.
          </DialogDescription>
        </div>
      </div>
      <ShareFriendsForm target={target} onSent={onSent} />
    </>
  )
}

export function ShareSheet({
  target,
  onClose,
  onShared,
  onCloseAutoFocus,
  className,
}: ShareSheetProps): JSX.Element | null {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  if (!target) return null
  function closeAfterSending(): void {
    onShared?.()
    onClose()
  }
  const body = <ShareBody target={target} onSent={closeAfterSending} />
  if (isDesktop) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className={cn('sm:max-w-md', className)} onCloseAutoFocus={onCloseAutoFocus}>
          {body}
        </DialogContent>
      </Dialog>
    )
  }
  return (
    // A phone gets the sheet from the bottom, under the thumb.
    <Sheet open onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className={cn('max-h-[90svh] rounded-t-2xl px-4 pt-4 pb-6', className)}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {body}
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 4: Swap the callers, delete the old dialog**

```diff
--- a/client/src/components/frame/PhotoActionsMenu.tsx
+++ b/client/src/components/frame/PhotoActionsMenu.tsx
@@ import { EllipsisIcon, SendIcon, Trash2Icon } from 'lucide-react'
 import { type JSX, type ReactNode, useRef, useState } from 'react'
 import { COARSE_POINTER_TARGET_CLASSES } from '@/components/frame/controlClasses.ts'
 import { DeletePhotoDialog } from '@/components/frame/DeletePhotoDialog.tsx'
-import { SharePhotoDialog } from '@/components/sharing/SharePhotoDialog.tsx'
+import { ShareSheet } from '@/components/sharing/ShareSheet.tsx'
 import { Button } from '@/components/ui/button.tsx'
 import {
   DropdownMenu,
@@ export function PhotoActionsMenu({
         </DropdownMenuContent>
       </DropdownMenu>
       {/* Outside the menu content: closing the menu must not unmount the dialogs. */}
-      {/* `dark`: the dialog portals to body, outside the frame's dark <main>. */}
-      <SharePhotoDialog
+      {/* `dark`: the sheet portals to body, outside the frame's dark <main>. */}
+      <ShareSheet
         target={photoToShare ? { kind: 'library', photo: photoToShare } : null}
         onClose={() => setPhotoToShare(null)}
         onCloseAutoFocus={focusTrigger}
```

```diff
--- a/client/src/components/library/UploadForm.tsx
+++ b/client/src/components/library/UploadForm.tsx
@@
 import { toast } from 'sonner'
 import { useAuth } from '@/auth/AuthContext.ts'
-import { SharePhotoDialog } from '@/components/sharing/SharePhotoDialog.tsx'
+import { ShareSheet } from '@/components/sharing/ShareSheet.tsx'
 import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
@@ export function UploadForm({ onUploaded }: UploadFormProps): JSX.Element {
     useUploadForm(onUploaded)
-  // The dialog keeps its own file: emptying the form after a send leaves it open.
+  // The sheet keeps its own file: emptying the form's inputs must not pull the photo from under it.
   const [fileToShare, setFileToShare] = useState<File | null>(null)
@@ export function UploadForm({ onUploaded }: UploadFormProps): JSX.Element {
       {/* The file goes to the friend only: the own library does not change. */}
-      <SharePhotoDialog
+      <ShareSheet
         target={fileToShare ? { kind: 'device', file: fileToShare } : null}
```

```bash
git rm client/src/components/sharing/SharePhotoDialog.tsx client/src/hooks/useFriendShares.ts
```

Run: `git grep -n "SharePhotoDialog\|useFriendShares\|SHARE_DUPLICATE_MESSAGE" -- client/src`
Expected: no output.

- [ ] **Step 5: Docs**

`ARCHITECTURE.md`: replace the paragraph starting « « Envoyer à un ami » ouvre une fenêtre (`components/sharing/SharePhotoDialog.tsx` … » up to « … et dans son texte alternatif. » with:

> « Envoyer à un ami » ouvre « Envoyer à des proches » (`components/sharing/ShareSheet.tsx`) : un panneau qui monte du bas sur téléphone (`Sheet`), une petite fenêtre sur ordinateur (`Dialog`, à partir de 48rem, `useMediaQuery`). En tête, la vignette de la photo ; dessous, les amis acceptés (`GET /api/friendships`) en grille d'avatars (initiales) avec le prénom, le nom complet au survol et pour les lecteurs d'écran, sans e-mail. Toucher un ami le coche ; « Envoyer à N personnes » envoie une requête par ami, l'une après l'autre (un envoi depuis l'appareil téléverse tout le fichier à chaque fois). Au moins un envoi réussi ferme le panneau sur une notification « Envoyée à Mamie et Tata », en avertissement avec les refus en détail (« Tata a déjà cette photo. ») si certains ont échoué ; si tous échouent, le panneau reste ouvert avec les raisons et la sélection. À partir de 6 amis, « Rechercher un ami » filtre la grille par nom ou e-mail, sans tenir compte des majuscules ni des accents (`friendSearch.ts`) ; une sélection reste cochée quand la recherche la masque. Sans ami, un lien « Ajouter un ami » mène à `/friends`. Pas de glissement vers le bas pour fermer : ✕, Échap ou un toucher à côté. Une photo reçue porte « Envoyée par » et le nom de l'expéditeur sur le cadre, dans la visionneuse, dans la liste et dans son texte alternatif.

`README.md`, the « Envoyer une photo à un ami » paragraph: replace « La fenêtre liste les amis acceptés, avec un bouton « Envoyer » par ami. » with « Le panneau « Envoyer à des proches » montre les amis acceptés : toucher ceux qui doivent la recevoir, puis « Envoyer à N personnes » ; une notification confirme à qui elle est partie. »
`docs/produit/partage.md`: « Ce que l'on peut faire »: « Envoyer une photo à plusieurs proches en une fois, en touchant leur visage puis un seul bouton. »; « Règles » (next free ids): « Les proches apparaissent avec leurs initiales et leur prénom ; le nom complet s'affiche au survol. Leur adresse e-mail n'est pas montrée. », « Le bouton indique combien de personnes recevront la photo et reste grisé tant que personne n'est choisi. », « Dès qu'au moins une personne a reçu la photo, le panneau se ferme et une notification dit à qui elle est partie, ainsi que pour qui l'envoi a échoué. Si personne ne l'a reçue, le panneau reste ouvert avec les raisons, et le choix est gardé. », « À partir de 6 amis, une recherche permet de les retrouver par nom ou adresse e-mail. » (keep the existing search rule's id if it already says this: update its wording only); « Messages affichés »: « Envoyer à des proches », « La photo s'affichera aussitôt sur leur cadre. », « Envoyer », « Envoyer à 1 personne », « Envoyer à N personnes », « Envoi… », « Envoyée à Mamie et Tata » (example), « Tata a déjà cette photo. », « Aucun ami ne correspond à « … ». », « Vous n'avez pas encore d'amis. » + « Ajouter un ami »; drop « Envoyée » per row and « Fermer » if listed. « Ce qui n'est pas possible »: « Fermer le panneau en le faisant glisser vers le bas : il se ferme avec la croix, la touche Échap ou en touchant à côté. » `a-venir.md` section 7: remove the share sheet item; move « photo de profil dans les avatars » to step 6 if it sits in section 7.

- [ ] **Step 6: Verify**

Run: `pnpm check && pnpm typecheck && pnpm --filter client build && pnpm test`
Expected: green, `Tests  180 passed (180)`. Measure: every function in the three new files at most 30 lines (`FriendSelection` is the closest).

- [ ] **Step 7: Commit**

Message: `feat(client): share photos from one sheet`, then the attribution lines.

**Chrome check (controller):**
- Desktop width, `/`, a photo's « … » → « Envoyer à un ami »: a small dialog « Envoyer à des proches » with the thumbnail and « La photo s'affichera aussitôt sur leur cadre. », no « Fermer » footer; avatars 56 px with initials, first name below, full name on hover; button « Envoyer » disabled.
- Select two friends: check badges and ring, button « Envoyer à 2 personnes »; send: « Envoi… », the dialog closes, a toast « Envoyée à <prénom> et <prénom> » (first names of the two friends); the friends' frames show the photo.
- Send the same photo to the same two again: the dialog stays open with « <prénom> a déjà cette photo. » for each, selection kept. Mix one new friend and one who has it: closes, warning toast « Envoyée à … » with « … a déjà cette photo. » as description.
- Phone width (device toolbar): the same from the bottom as a sheet, rounded top, ✕ 44 px; tapping outside closes it.
- With 6 or more friends: « Rechercher un ami » appears; a friend selected then filtered out stays selected (the button count does not drop); a query matching nobody: « Aucun ami ne correspond à « xyz ». ».
- From the upload card: choose a file, « Envoyer à un ami », pick one friend, send: toast, the sheet closes, the form empties; the own library does not change.
- From the viewer (Task 6) and the slideshow: the sheet opens dark over them; Escape closes the sheet only; focus returns to the « … » button.
- An account with no friends: « Vous n'avez pas encore d'amis. » and « Ajouter un ami » → `/friends`.

---

## Final verification (controller)

- [ ] `pnpm check && pnpm typecheck && pnpm --filter client build && pnpm test` on `feat/share-sheet`: green, `Tests  180 passed (180)`.
- [ ] `git diff 5923591..feat/share-sheet --stat -- server`: empty (no server or Bruno change).
- [ ] `git diff 5923591..feat/share-sheet -- client/package.json`: only `"sonner": "^2.0.8"`. `git grep -n "window.alert\| as " -- client/src` shows no new alert or cast.
- [ ] Each task's Chrome check passed, on the author's dev client (5180) against the author's API, never restarted by the controller; test photos and shares cleaned up by hand, **never** with `pnpm db:seed`.
- [ ] `docs/produit/a-venir.md` section 7 no longer lists anything this step delivered; every new product rule has an id that did not exist before.
- [ ] `git log --oneline 5923591..feat/share-sheet`: `docs/produit/` first, then the spec and the plan, then one concern per commit, each ending with the attribution lines; no `.env` file in `git diff --stat`.
- [ ] Fresh-context review of the whole stack diff (`superpowers:requesting-code-review`), then `gh stack submit --auto` (draft PRs) and `gh stack view --json`.

---

## Drift Log

Format: `date · task/step · what the plan said · what was done · why`.

| Date | Task / step | Plan said | Done | Why |
| ---- | ----------- | --------- | ---- | --- |
| 2026-11-24 | Plan | Spec: 8 tasks, PRs A-D | 10 tasks: Task 3 (accepted formats) and Task 5 (reconnect) added; Task 7 also covers the frame's states and its way out | Coordinator additions a-f, received after the spec was committed (Choices 1-2) |

---

## Self-review (done while writing the plan)

**1. Spec coverage**

| Spec item | Task |
| --- | --- |
| Sonner, one `<Toaster />` in `App`, adapted to `.dark` (no `next-themes`) | 1 |
| Delete errors as toasts (open question 4) | 1 |
| 44 px targets on coarse pointers (`pointer-coarse:`) | 2 |
| Viewer address `/?photo=<id>`, push on open, replace on swipe, back or replace on close, replace-only automatic closes | 4 |
| Counter « 3 / 30+ », load ahead within 3 photos, link to an older photo, deleted while shown (next, else previous, else close), deletion detection by last seen place | 4 |
| Viewer UI: Radix dialog, dark, Embla with frozen `startIndex`, arrows hidden at the ends, top bar outside the carousel, ✕ / counter / ⋯, date and « Envoyée par X », focus back on the last shown tile | 6 |
| `isOverlayOpen` ignores the viewer | 6 |
| `/frame` slideshow only: `LibraryScreen`, `LibraryHeader`, `useOnIdle`, modes removed; `useIdle` and overlays kept | 7 |
| Leaving the frame replaces with `/?photo=<id>`, carrying `isLibraryBelow`; `/frame?photo=<id>` starts there | 7 |
| « Mode cadre » next to the grid/list toggle (push with `isLibraryBelow`), ▶ in the viewer (replace with the viewer's state), app bar « Cadre » unchanged | 8 |
| Share sheet: bottom `Sheet` < 48rem, `Dialog` above, no footer, thumbnail + title + description, avatar grid, multi-select with badge, button label and disabled state, search from 6 friends, sequential requests, `duplicate` status, toasts, all-failed keeps the sheet open | 9, 10 |
| One sheet everywhere (menu, upload form; viewer and slideshow through the menu) | 10 |
| `UserAvatar` reused, no `avatarUrl` | 10 |
| UI text (French, exact) | every task, written out |
| Docs: ARCHITECTURE Pages, README, `docs/produit/` with `a-venir.md` section 7 | 1, 2, 3, 6, 7, 8, 10 (Temps réel: 5, 7) |
| Testing: check, typecheck, build, `pnpm test` 180; Chrome checks | every task, Final verification |
| Delivery: 4 PRs stacked on `feat/account-profile` | Stack section, banners |
| Out of scope (swipe-down, pinch-zoom, avatars with images, settings persistence, API total) | not planned; slideshow settings persistence stays for step 8 |
| Open questions 1-6 | defaults applied as written |
| Coordinator additions a-f | 1 (a, c), 3 (b), 5 (e), 7 (d, f) |

**2. Placeholder scan:** no "TBD" or "similar to"; every code block is the full file or a complete diff from the throwaway run. The `docs/produit/` steps say "next free id" on purpose (the files were not readable while planning); their statements are written out.

**3. Type consistency:** `ShareTarget` is defined once (`useShareSending.ts`) and imported by `ShareSheet` and `ShareFriendsForm`; `ViewerParam` gains `startFrame` in Task 8, used by `PhotoViewer` in the same task; `useLeaveFrame` takes `string | null` from its creation (Task 7); `PhotoLibrary.isFirstPageLoaded` (Task 4) is read by `missingPhotoStep` through `ViewerLibraryState`; `usePhotoFeed` changes its return type in Task 7, and `FramePage` is its only caller. `pnpm check` on this plan is a no-op: `docs/superpowers/plans` is excluded in `biome.json`.
