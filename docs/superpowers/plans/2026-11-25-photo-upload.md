---
plan: photo-upload
status: done
spec: docs/superpowers/specs/2026-11-25-photo-upload-design.md
branch: feat/upload-progress (PR A), feat/upload-multiple (PR B), feat/upload-downscale (PR C)
worktree: false
tasks_total: 8
tasks_done: 8
current_task: null
last_commit: null
last_updated: 2026-11-25
---

# Photo upload (Step 14) Implementation Plan

> **For agentic workers:** this plan was built while executing it, in a throwaway clone; every task below is a final diff (`git show` output, after formatting and the review fixes). Replaying it means applying each diff and running its gates.

**Working agreement (mandatory):** keep this plan in sync with reality. Append every divergence to the Drift Log. When a drift changes a decision of the spec, add a new spec doc rather than rewriting this one.

**Goal:** adding photos shows what happens: the add panel closes at once, each photo appears as a greyed tile with its real progress, then the real photo replaces it; up to 20 photos per choice go one after another with one summary toast; a photo too large for the server (48–50 MP phones) is reduced on the device to 4096 px first.

**Architecture:** `postWithProgress` wraps `XMLHttpRequest` (`upload.onprogress`) and `postPhoto` keeps its error mapping on top. `UploadsProvider`, above the routes in `LoggedInLayout`, holds the pending uploads and a sequential promise-chain queue (`upload/uploadQueue.ts`); the library page registers its `addPhoto` in the provider's `photoListener` ref and shows the tiles of the view shown. Before each upload, `preparePhoto` decodes the file and, only when `resizeDecision` says so, redraws it in a canvas as JPEG 0.92. No server change.

**Tech Stack:** Node 24, TypeScript, React 19 + React Router + Radix (shadcn `sheet`, `dialog`) + lucide-react, sonner, Tailwind 4, Biome 2. Server untouched (Express 5, multer, Prisma 6.19).

## Global Constraints

- **No new dependency**, server or client. **No server change**, so no Bruno or unit test change and no `pnpm db:push` checkpoint.
- **Never Docker, never start the API or Vite, never `pnpm db:push` / `db:seed`, never read `.env` files** (controller's hard rules for this step). Bruno is counted from the files, not run.
- **No client test runner** (none added, controller): the pure rules (`resizeDecision`, `uploadSummary`, the labels) live in their own files and were exercised once with Node; client tasks are verified by `pnpm check`, `pnpm typecheck`, `pnpm build` and the Chrome checklist.
- **TypeScript (AGENTS.md):** no `as` casts, explicit return types on exported functions, literal unions rather than `enum`.
- **Code rules (`.claude/rules/`):** comment why, never what; every function at most 30 lines and every file at most 300 (measured by a script on every touched file). Client logging is `console.error`, never the file name or other personal data.
- **UI:** French strings; 44 px touch targets on coarse pointers; works at 360 px with no horizontal page scroll.
- **Same commit rules:** user-visible change → `docs/produit/` (French, no technical terms; a changed rule keeps its id, a replaced one is marked « Remplacée »); flow change → `ARCHITECTURE.md`.
- **Step 13 was built in parallel** and this stack is rebased on it (`feat/library-surface`, final tip 2af118f): stay in the upload flow, do not reshape `LibraryHeader`, the navigation or the viewer, keep `docs/produit/` edits targeted; step 14's rules come after step 13's (R-BIB-54 onwards).
- **Biome formats Markdown:** `pnpm check:fix` after a docs edit; the diffs below are after formatting.
- **Commits:** atomic, Conventional Commits in English, message in a scratchpad file passed with `git commit -F`, ending with the two attribution lines. Never `--no-verify`. The clone's `.npmrc` (virtual store outside the clone) is never committed.
- **Docker files are the author's work:** never touch `Dockerfile`, `server/Dockerfile`, `server/.dockerignore`, `compose.yaml`, `NOTE.md`, `.vscode/settings.json`.

## Interfaces

- `upload/postWithProgress.ts`: `ProgressResponse = { isOk: boolean; status: number; body: unknown }`; `postWithProgress(url: string, body: FormData, onProgress: (percent: number) => void): Promise<ProgressResponse | null>` (`null` on network error or abort, never rejects).
- `photosApi`: `postPhoto(file: File, onProgress: (percent: number) => void)`, same outcomes as before (`uploaded`, `unauthenticated`, `failed` + `message`).
- `upload/uploadQueue.ts`: `PendingUpload = { id: number; file: File; collectionId: string | null; progress: number | null }`; `UploadedHandler = (photo: Photo, collectionId: string | null) => Promise<string | null>`; `QueueState`, `QueueContext`; `createQueueState()`, `enqueueUploads(context, files, collectionId)`.
- `upload/UploadsContext.ts`: `UploadsContextValue = { pending, enqueue(files, collectionId), photoListener: RefObject<UploadedPhotoListener | null> }`, `useUploads()`. `upload/UploadsProvider.tsx` mounted in `LoggedInLayout` inside `CollectionsProvider`.
- Hooks: `useLibraryUpload(photoListener): UploadedHandler`; `usePhotoUploads(collectionId, library): PhotoUploads` (`pending` of the view, `enqueue(files)`).
- `upload/photoResize.ts`: `MAX_LONG_SIDE = 4096`, `MAX_UPLOAD_BYTES = 10 * 1024 * 1024`, `resizeDecision(width, height, byteSize): ResizeDecision` (`{ shouldResize: false }` | `{ shouldResize: true; width; height }`). `upload/preparePhoto.ts`: `preparePhoto(file: File): Promise<File>`.
- `components/library/uploadTexts.ts`: `UploadTally`, `uploadSummary`, `pendingAnnouncement`, `pendingProgressLabel`, `chosenPhotosLabel`, `tooManyPhotosMessage`.
- Components: `PendingGridTile`, `PendingListRow`, `PendingAnnouncement`, `UploadPreview`; `PhotoGrid` and `PhotoList` take optional `children` rendered before the photos; `LibrarySection` takes `pending`; `AddPhotoPanel({ isOpen, onClose, onUpload, returnFocusRefs })`; `UploadForm({ onUpload, onShare })`; `LibraryHeader` gains `addButtonRef`; step 13's `AddPhotoFab` gains `buttonRef` and `useHideOnScrollDown(ref)` takes the button's ref instead of returning one.

## Stack and branches

- **PR A `feat/upload-progress`** on top of step 13's `feat/library-surface` (2af118f; rebased from bd9e332, first built on `feat/library-collections`, d58d3b8): the spec and this plan, then Tasks 1 to 1b.
- **PR B `feat/upload-multiple`**: Tasks 2 to 2b.
- **PR C `feat/upload-downscale`**: Tasks 3 and 3a.

## Baselines

- `pnpm test` at d58d3b8, bd9e332 and 2af118f (step 13 left the server untouched): `Test Files  25 passed (25)`, `Tests  301 passed (301)`; unchanged by every task (server only).
- Bruno files at d58d3b8, bd9e332 and 2af118f: 184 requests; unchanged.

---

## PR A — `feat/upload-progress`

### Task 1: Pending tile with real progress

**Commit:** `feat(client): show a pending tile with progress while a photo uploads`

**Scope:** XHR helper, `postPhoto` with progress, queue, pending tiles in grid and list, live announcement, summary toast; product docs, ARCHITECTURE step 2.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 3f17da2..e804436 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -28,7 +28,7 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 ## Parcours d'une photo
 
 1. Le proche, connecté à son compte, prend ou choisit une photo (`<input type="file" accept="image/*" capture>`).
-2. Le client envoie l'image en `multipart/form-data` à une route Express ; **Multer** la reçoit en mémoire.
+2. Le client envoie l'image en `multipart/form-data` à une route Express ; **Multer** la reçoit en mémoire. L'envoi passe par `XMLHttpRequest` plutôt que `fetch` : seul `upload.onprogress` donne la progression, affichée sur une vignette grisée en tête de la bibliothèque (`usePhotoUploads`). Les photos partent une par une, dans une file d'attente côté client.
 3. Le serveur vérifie la session (cookie `ff_session`, voir [Authentification](#authentification)) et le fichier (10 Mo max, JPEG/PNG/WebP), calcule le **SHA-256** des octets reçus et refuse un fichier déjà présent dans la bibliothèque du compte, photos en attente d'ouverture comprises (`409 PHOTO_DUPLICATE`, sans appeler Sharp ni Cloudinary), puis le **décode et le réencode avec Sharp** : JPEG de 1920 px max, orientation EXIF appliquée, métadonnées (GPS compris) supprimées. Le type déclaré par le navigateur n'est pas fiable : c'est le décodage par Sharp qui valide vraiment l'image.
 4. L'image réencodée est envoyée à **Cloudinary**, dans le dossier `familyframe`.
 5. **Prisma** enregistre dans MongoDB l'URL, l'identifiant Cloudinary, le propriétaire (`ownerId`, le compte connecté), le SHA-256 du fichier reçu et la date. L'index unique `(ownerId, sha256)` est la vraie garantie : deux envois simultanés du même fichier passent la vérification, le second est refusé à l'enregistrement (`409` aussi) et son image Cloudinary est détruite.
diff --git a/client/src/components/frame/PhotoGrid.tsx b/client/src/components/frame/PhotoGrid.tsx
index 44976c7..102af49 100644
--- a/client/src/components/frame/PhotoGrid.tsx
+++ b/client/src/components/frame/PhotoGrid.tsx
@@ -1,4 +1,4 @@
-import type { JSX } from 'react'
+import type { JSX, ReactNode } from 'react'
 import { PhotoGridTile } from '@/components/frame/PhotoGridTile.tsx'
 import type { Photo } from '@/photo.ts'
 
@@ -7,6 +7,8 @@ type PhotoGridProps = {
   // null on the library page: no photo is on screen there.
   currentId: string | null
   onSelect: (id: string) => void
+  // Items placed before the photos: the library's uploads still on their way.
+  children?: ReactNode
 }
 
 // Edge to edge with the page's header. Three tight columns on a phone, as photo apps do, so a
@@ -14,9 +16,10 @@ type PhotoGridProps = {
 const GRID_CLASSES =
   'grid grid-cols-3 gap-1 sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] sm:gap-4'
 
-export function PhotoGrid({ photos, currentId, onSelect }: PhotoGridProps): JSX.Element {
+export function PhotoGrid({ photos, currentId, onSelect, children }: PhotoGridProps): JSX.Element {
   return (
     <ul className={GRID_CLASSES}>
+      {children}
       {photos.map((photo) => (
         <PhotoGridTile
           key={photo.id}
diff --git a/client/src/components/frame/PhotoList.tsx b/client/src/components/frame/PhotoList.tsx
index 819efb2..90e5095 100644
--- a/client/src/components/frame/PhotoList.tsx
+++ b/client/src/components/frame/PhotoList.tsx
@@ -1,4 +1,4 @@
-import type { JSX } from 'react'
+import type { JSX, ReactNode } from 'react'
 import { PhotoListRow } from '@/components/frame/PhotoListRow.tsx'
 import type { Photo } from '@/photo.ts'
 
@@ -7,12 +7,15 @@ type PhotoListProps = {
   // null on the library page: no photo is on screen there.
   currentId: string | null
   onSelect: (id: string) => void
+  // Items placed before the photos: the library's uploads still on their way.
+  children?: ReactNode
 }
 
-export function PhotoList({ photos, currentId, onSelect }: PhotoListProps): JSX.Element {
+export function PhotoList({ photos, currentId, onSelect, children }: PhotoListProps): JSX.Element {
   return (
     // The page's full width: thumbnails and « … » line up with the header's edges.
     <ul className="flex flex-col gap-1">
+      {children}
       {photos.map((photo) => (
         <PhotoListRow
           key={photo.id}
diff --git a/client/src/components/library/AddPhotoPanel.tsx b/client/src/components/library/AddPhotoPanel.tsx
index 39119a4..141760e 100644
--- a/client/src/components/library/AddPhotoPanel.tsx
+++ b/client/src/components/library/AddPhotoPanel.tsx
@@ -3,12 +3,11 @@ import { UploadForm } from '@/components/library/UploadForm.tsx'
 import { ResponsivePanel } from '@/components/panel/ResponsivePanel.tsx'
 import { ShareSheet } from '@/components/sharing/ShareSheet.tsx'
 import { DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx'
-import type { Photo } from '@/photo.ts'
 
 type AddPhotoPanelProps = {
   isOpen: boolean
   onClose: () => void
-  onUploaded: (photo: Photo) => void
+  onUpload: (files: File[]) => void
 }
 
 function AddPhotoHeading(): JSX.Element {
@@ -24,11 +23,12 @@ function AddPhotoHeading(): JSX.Element {
 }
 
 // « Envoyer à un ami » swaps this panel for the send panel, which keeps its own copy of the file.
-export function AddPhotoPanel({ isOpen, onClose, onUploaded }: AddPhotoPanelProps): JSX.Element {
+export function AddPhotoPanel({ isOpen, onClose, onUpload }: AddPhotoPanelProps): JSX.Element {
   const [fileToShare, setFileToShare] = useState<File | null>(null)
 
-  function handleUploaded(photo: Photo): void {
-    onUploaded(photo)
+  // Closes at once: the photos' progress shows on their tiles in the library.
+  function handleUpload(files: File[]): void {
+    onUpload(files)
     onClose()
   }
 
@@ -42,7 +42,7 @@ export function AddPhotoPanel({ isOpen, onClose, onUploaded }: AddPhotoPanelProp
       {isOpen && (
         <ResponsivePanel onClose={onClose}>
           <AddPhotoHeading />
-          <UploadForm onUploaded={handleUploaded} onShare={handleShare} />
+          <UploadForm onUpload={handleUpload} onShare={handleShare} />
         </ResponsivePanel>
       )}
       <ShareSheet
diff --git a/client/src/components/library/LibrarySection.tsx b/client/src/components/library/LibrarySection.tsx
index 27cce7f..e9aae60 100644
--- a/client/src/components/library/LibrarySection.tsx
+++ b/client/src/components/library/LibrarySection.tsx
@@ -1,13 +1,21 @@
 import type { JSX } from 'react'
 import { PhotoGrid } from '@/components/frame/PhotoGrid.tsx'
 import { PhotoList } from '@/components/frame/PhotoList.tsx'
+import {
+  PendingAnnouncement,
+  PendingGridTile,
+  PendingListRow,
+} from '@/components/library/PendingUploads.tsx'
 import { Button } from '@/components/ui/button.tsx'
 import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'
 import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
+import type { PendingUpload } from '@/hooks/usePhotoUploads.ts'
 
 type LibrarySectionProps = {
   library: PhotoLibrary
   layout: LibraryLayout
+  // The uploads chosen from the view shown, in the order they were chosen.
+  pending: PendingUpload[]
   onOpenPhoto: (id: string) => void
   // The library and a collection say different things when they have no photo.
   emptyState: JSX.Element
@@ -28,18 +36,30 @@ function LoadMoreButton({ isLoadingMore, loadMore }: LoadMoreButtonProps): JSX.E
 function LibraryPhotos({
   library,
   layout,
+  pending,
   onOpenPhoto,
   emptyState,
 }: LibrarySectionProps): JSX.Element {
   if (!library.isFirstPageLoaded) {
     return <p className="px-6 py-16 text-center text-muted-foreground">Chargement…</p>
   }
-  if (library.photos.length === 0) return emptyState
+  if (library.photos.length === 0 && pending.length === 0) return emptyState
+  // Newest first, like the photos: the upload in progress sits right above the photos, where
+  // its photo appears once sent.
+  const newestFirst = pending.toReversed()
   // currentId null: no photo is on screen here, so no tile gets the frame's ring.
   return layout === 'grid' ? (
-    <PhotoGrid photos={library.photos} currentId={null} onSelect={onOpenPhoto} />
+    <PhotoGrid photos={library.photos} currentId={null} onSelect={onOpenPhoto}>
+      {newestFirst.map((upload) => (
+        <PendingGridTile key={upload.id} upload={upload} />
+      ))}
+    </PhotoGrid>
   ) : (
-    <PhotoList photos={library.photos} currentId={null} onSelect={onOpenPhoto} />
+    <PhotoList photos={library.photos} currentId={null} onSelect={onOpenPhoto}>
+      {newestFirst.map((upload) => (
+        <PendingListRow key={upload.id} upload={upload} />
+      ))}
+    </PhotoList>
   )
 }
 
@@ -49,6 +69,7 @@ export function LibrarySection(props: LibrarySectionProps): JSX.Element {
   return (
     // The page's own surface: the library follows the app's theme; only the frame is always dark.
     <section aria-label="Photos">
+      <PendingAnnouncement count={props.pending.length} />
       <LibraryPhotos {...props} />
       {hasMore && <LoadMoreButton isLoadingMore={isLoadingMore} loadMore={loadMore} />}
     </section>
diff --git a/client/src/components/library/PendingUploads.tsx b/client/src/components/library/PendingUploads.tsx
new file mode 100644
index 0000000..9f6d287
--- /dev/null
+++ b/client/src/components/library/PendingUploads.tsx
@@ -0,0 +1,115 @@
+import type { JSX } from 'react'
+import {
+  pendingAnnouncement,
+  pendingProgressLabel,
+  pendingShortLabel,
+} from '@/components/library/uploadTexts.ts'
+import type { PendingUpload } from '@/hooks/usePhotoUploads.ts'
+import { usePreviewUrl } from '@/hooks/usePreviewUrl.ts'
+import { cn } from '@/lib/utils.ts'
+
+type PendingProps = { upload: PendingUpload }
+
+// onPhoto: drawn over the greyed preview, on a dark pill whatever the theme. onPage: on the
+// library's own surface, which follows the theme.
+type BarTone = 'onPhoto' | 'onPage'
+
+const BAR_CLASSES: Record<BarTone, { track: string; fill: string }> = {
+  onPhoto: { track: 'bg-white/25', fill: 'bg-frame-accent' },
+  onPage: { track: 'bg-foreground/15', fill: 'bg-primary' },
+}
+
+const PENDING_ALT = "Photo en cours d'envoi"
+
+// Same corners as the photo tiles. Square before the preview is ready: no jump when it appears.
+const GRID_TILE_CLASSES = 'relative aspect-square overflow-hidden rounded-sm bg-muted sm:rounded-xl'
+
+// The same dark pill as the tiles' « … »: readable over any photo, in either theme. Tighter on a
+// phone, where three columns leave each tile about 100 px.
+const GRID_PILL_CLASSES =
+  'absolute inset-x-1 bottom-1 flex flex-col gap-1 rounded-md bg-black/55 px-1.5 py-1 text-xs font-medium text-white backdrop-blur-sm sm:inset-x-2 sm:bottom-2 sm:gap-1.5 sm:rounded-lg sm:px-2.5 sm:py-2 sm:text-sm'
+
+const PROGRESS_MAX = 100
+
+// Not a live region itself: one announcement per photo is enough, not one per percent.
+function ProgressBar({ progress, tone }: { progress: number | null; tone: BarTone }): JSX.Element {
+  const { track, fill } = BAR_CLASSES[tone]
+  return (
+    <div
+      role="progressbar"
+      aria-label="Progression de l'envoi"
+      aria-valuemin={0}
+      aria-valuemax={PROGRESS_MAX}
+      aria-valuenow={progress ?? 0}
+      className={cn('h-1.5 w-full overflow-hidden rounded-full', track)}
+    >
+      <div
+        className={cn('h-full rounded-full motion-safe:transition-[width]', fill)}
+        style={{ width: `${progress ?? 0}%` }}
+      />
+    </div>
+  )
+}
+
+// The whole label from sm, the percentage alone on a phone (hidden, not read twice).
+function GridTileLabel({ progress }: { progress: number | null }): JSX.Element {
+  const shortLabel = pendingShortLabel(progress)
+  return (
+    <>
+      {shortLabel && <span className="tabular-nums sm:hidden">{shortLabel}</span>}
+      <span className="tabular-nums max-sm:hidden">{pendingProgressLabel(progress)}</span>
+    </>
+  )
+}
+
+// No button: the photo does not exist on the server yet, the viewer could not open it.
+export function PendingGridTile({ upload }: PendingProps): JSX.Element {
+  const previewUrl = usePreviewUrl(upload.file)
+  return (
+    <li className={GRID_TILE_CLASSES}>
+      {previewUrl && (
+        <img
+          className="size-full object-cover opacity-50 grayscale"
+          src={previewUrl}
+          alt={PENDING_ALT}
+          decoding="async"
+        />
+      )}
+      <div className={GRID_PILL_CLASSES}>
+        <GridTileLabel progress={upload.progress} />
+        <ProgressBar progress={upload.progress} tone="onPhoto" />
+      </div>
+    </li>
+  )
+}
+
+export function PendingListRow({ upload }: PendingProps): JSX.Element {
+  const previewUrl = usePreviewUrl(upload.file)
+  return (
+    <li className="flex items-center gap-4 rounded-xl p-2">
+      <span className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
+        {previewUrl && (
+          <img
+            className="size-full object-cover opacity-50 grayscale"
+            src={previewUrl}
+            alt={PENDING_ALT}
+            decoding="async"
+          />
+        )}
+      </span>
+      <span className="flex min-w-0 flex-1 flex-col gap-1.5 text-muted-foreground">
+        <span className="text-lg tabular-nums">{pendingProgressLabel(upload.progress)}</span>
+        <ProgressBar progress={upload.progress} tone="onPage" />
+      </span>
+    </li>
+  )
+}
+
+// Always mounted: a live region only announces changes made after it appeared.
+export function PendingAnnouncement({ count }: { count: number }): JSX.Element {
+  return (
+    <p className="sr-only" aria-live="polite">
+      {pendingAnnouncement(count)}
+    </p>
+  )
+}
diff --git a/client/src/components/library/UploadForm.tsx b/client/src/components/library/UploadForm.tsx
index cf989ce..edfdcb7 100644
--- a/client/src/components/library/UploadForm.tsx
+++ b/client/src/components/library/UploadForm.tsx
@@ -1,27 +1,13 @@
 import { CameraIcon, ImageIcon, SendIcon } from 'lucide-react'
 import { type ChangeEvent, type JSX, type SubmitEvent, useRef, useState } from 'react'
-import { toast } from 'sonner'
-import { useAuth } from '@/auth/AuthContext.ts'
-import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
 import { Button } from '@/components/ui/button.tsx'
 import { usePreviewUrl } from '@/hooks/usePreviewUrl.ts'
-import type { Photo } from '@/photo.ts'
-import { postPhoto } from '@/photosApi.ts'
 
 // The server's accepted types: a HEIC or GIF picked here would only be refused after the upload.
 const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp'
 
-type UploadStatus = 'idle' | 'sending' | 'error'
-
-type PhotoUpload = {
-  status: UploadStatus
-  error: string
-  send: (file: File) => Promise<void>
-  clearStatus: () => void
-}
-
 type UploadFormProps = {
-  onUploaded: (photo: Photo) => void
+  onUpload: (files: File[]) => void
   // The file goes to a friend only: the own library does not change.
   onShare: (file: File) => void
 }
@@ -35,36 +21,9 @@ type PickButtonProps = {
 
 type UploadButtonsProps = {
   hasFile: boolean
-  isSending: boolean
   onShare: () => void
 }
 
-function usePhotoUpload(onUploaded: (photo: Photo) => void): PhotoUpload {
-  const { dropUser } = useAuth()
-  const [status, setStatus] = useState<UploadStatus>('idle')
-  const [error, setError] = useState('')
-
-  async function send(file: File): Promise<void> {
-    setStatus('sending')
-    const result = await postPhoto(file)
-    // The session ended on the server: RequireAuth sends the user to /login.
-    if (result.status === 'unauthenticated') {
-      dropUser()
-      return
-    }
-    if (result.status === 'failed') {
-      setError(result.message)
-      setStatus('error')
-      return
-    }
-    // A toast, not an alert: the panel closes, and the message must outlast it.
-    toast.success('Photo ajoutée à votre bibliothèque.')
-    onUploaded(result.photo)
-  }
-
-  return { status, error, send, clearStatus: () => setStatus('idle') }
-}
-
 // A button rather than the raw file input: the browser's « Choose file » cannot be styled or
 // translated. The hidden input does the picking.
 function PickButton({ label, icon, capture, onChange }: PickButtonProps): JSX.Element {
@@ -111,19 +70,13 @@ function PickButtons({ onChange }: Pick<PickButtonProps, 'onChange'>): JSX.Eleme
   )
 }
 
-function UploadButtons({ hasFile, isSending, onShare }: UploadButtonsProps): JSX.Element {
+function UploadButtons({ hasFile, onShare }: UploadButtonsProps): JSX.Element {
   return (
     <div className="flex flex-col gap-2">
-      <Button type="submit" size="lg" disabled={!hasFile || isSending}>
-        {isSending ? 'Envoi…' : 'Ajouter à ma bibliothèque'}
+      <Button type="submit" size="lg" disabled={!hasFile}>
+        Ajouter à ma bibliothèque
       </Button>
-      <Button
-        type="button"
-        variant="outline"
-        size="lg"
-        disabled={!hasFile || isSending}
-        onClick={onShare}
-      >
+      <Button type="button" variant="outline" size="lg" disabled={!hasFile} onClick={onShare}>
         <SendIcon aria-hidden data-icon="inline-start" />
         Envoyer à un ami
       </Button>
@@ -131,15 +84,6 @@ function UploadButtons({ hasFile, isSending, onShare }: UploadButtonsProps): JSX
   )
 }
 
-function UploadAlert({ status, error }: Pick<PhotoUpload, 'status' | 'error'>): JSX.Element | null {
-  if (status !== 'error') return null
-  return (
-    <Alert variant="destructive">
-      <AlertDescription>{error}</AlertDescription>
-    </Alert>
-  )
-}
-
 function FilePreview({ file }: { file: File | null }): JSX.Element | null {
   const previewUrl = usePreviewUrl(file)
   if (!previewUrl) return null
@@ -152,30 +96,23 @@ function FilePreview({ file }: { file: File | null }): JSX.Element | null {
   )
 }
 
-export function UploadForm({ onUploaded, onShare }: UploadFormProps): JSX.Element {
-  const upload = usePhotoUpload(onUploaded)
+export function UploadForm({ onUpload, onShare }: UploadFormProps): JSX.Element {
   const [file, setFile] = useState<File | null>(null)
 
   function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
     setFile(event.target.files?.[0] ?? null)
-    upload.clearStatus()
   }
 
-  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
+  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
     event.preventDefault()
-    if (file) await upload.send(file)
+    if (file) onUpload([file])
   }
 
   return (
     <form onSubmit={handleSubmit} className="flex flex-col gap-4">
       <PickButtons onChange={handleFileChange} />
       <FilePreview file={file} />
-      <UploadButtons
-        hasFile={file !== null}
-        isSending={upload.status === 'sending'}
-        onShare={() => file && onShare(file)}
-      />
-      <UploadAlert status={upload.status} error={upload.error} />
+      <UploadButtons hasFile={file !== null} onShare={() => file && onShare(file)} />
     </form>
   )
 }
diff --git a/client/src/components/library/uploadTexts.ts b/client/src/components/library/uploadTexts.ts
new file mode 100644
index 0000000..3277f08
--- /dev/null
+++ b/client/src/components/library/uploadTexts.ts
@@ -0,0 +1,57 @@
+const FULL_PERCENT = 100
+
+// collectionName: where the photos were filed, null when they only went to the library.
+export type UploadTally = {
+  addedCount: number
+  refusedCount: number
+  collectionName: string | null
+}
+
+function destination(collectionName: string | null): string {
+  return collectionName === null ? 'à votre bibliothèque' : `à « ${collectionName} »`
+}
+
+function addedPhotos(addedCount: number): string {
+  return addedCount === 1 ? '1 photo ajoutée' : `${addedCount} photos ajoutées`
+}
+
+function refusedPhotos(refusedCount: number): string {
+  return refusedCount === 1 ? '1 refusée' : `${refusedCount} refusées`
+}
+
+// One line for a whole queue. null for a single refused photo: its own message gave the reason.
+export function uploadSummary({
+  addedCount,
+  refusedCount,
+  collectionName,
+}: UploadTally): string | null {
+  const place = destination(collectionName)
+  if (refusedCount === 0) {
+    return addedCount === 1 ? `Photo ajoutée ${place}.` : `${addedCount} photos ajoutées ${place}.`
+  }
+  if (addedCount === 0) {
+    return refusedCount === 1 ? null : `Aucune photo ajoutée, ${refusedPhotos(refusedCount)}.`
+  }
+  return `${addedPhotos(addedCount)} ${place}, ${refusedPhotos(refusedCount)}.`
+}
+
+// Polite announcement for screen readers: it changes only when a photo leaves the queue.
+export function pendingAnnouncement(pendingCount: number): string {
+  if (pendingCount === 0) return ''
+  return pendingCount === 1
+    ? "Envoi d'une photo en cours."
+    : `Envoi de ${pendingCount} photos en cours.`
+}
+
+// A phone's tile is about 100 px wide: only the percentage fits. null while waiting: the empty
+// bar says it alone.
+export function pendingShortLabel(progress: number | null): string | null {
+  return progress === null ? null : `${progress} %`
+}
+
+// null: still waiting its turn. 100: every byte has left, the server prepares the photo.
+export function pendingProgressLabel(progress: number | null): string {
+  if (progress === null) return 'En attente'
+  if (progress === FULL_PERCENT) return 'Finalisation…'
+  return `${progress} %`
+}
diff --git a/client/src/hooks/useLibraryUpload.ts b/client/src/hooks/useLibraryUpload.ts
index c4a65bc..2739304 100644
--- a/client/src/hooks/useLibraryUpload.ts
+++ b/client/src/hooks/useLibraryUpload.ts
@@ -1,23 +1,23 @@
 import { toast } from 'sonner'
 import { useCollections } from '@/collections/CollectionsContext.ts'
 import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
-import { type SelectedCollection, selectedCollectionId } from '@/hooks/useSelectedCollection.ts'
 import type { Photo } from '@/photo.ts'
 
+// Resolves to the collection's name once filed, null when nothing was filed.
+export type UploadedHandler = (photo: Photo, collectionId: string | null) => Promise<string | null>
+
 // Added while a collection is shown, the photo is filed there too: that is where it was wanted.
-// The collection's list then reloads on collections:changed, like any filing. Filed by id: the
-// collections list may still be loading, and the answer names the collection.
-export function useLibraryUpload(
-  selected: SelectedCollection,
-  library: PhotoLibrary,
-): (photo: Photo) => void {
+// collectionId is the one shown when the photo was chosen. The collection's list then reloads on
+// collections:changed, like any filing. Filed by id: the collections list may still be loading,
+// and the answer names the collection.
+export function useLibraryUpload(library: PhotoLibrary): UploadedHandler {
   const { addPhoto } = useCollections()
-  return async (photo) => {
+  return async (photo, collectionId) => {
     library.addPhoto(photo)
-    const collectionId = selectedCollectionId(selected)
-    if (collectionId === null) return
+    if (collectionId === null) return null
     const result = await addPhoto(collectionId, photo.id)
-    if (result.isSuccess) toast.success(`Photo ajoutée à « ${result.collection.name} ».`)
-    else toast.error(result.message)
+    if (result.isSuccess) return result.collection.name
+    toast.error(result.message)
+    return null
   }
 }
diff --git a/client/src/hooks/usePhotoUploads.ts b/client/src/hooks/usePhotoUploads.ts
new file mode 100644
index 0000000..eae4d92
--- /dev/null
+++ b/client/src/hooks/usePhotoUploads.ts
@@ -0,0 +1,141 @@
+import { type Dispatch, type SetStateAction, useState } from 'react'
+import { toast } from 'sonner'
+import { useAuth } from '@/auth/AuthContext.ts'
+import { type UploadTally, uploadSummary } from '@/components/library/uploadTexts.ts'
+import { type UploadedHandler, useLibraryUpload } from '@/hooks/useLibraryUpload.ts'
+import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
+import { postPhoto } from '@/photosApi.ts'
+
+// collectionId: the view the photo was chosen from, where its tile shows. progress null: still
+// waiting its turn.
+export type PendingUpload = {
+  id: number
+  file: File
+  collectionId: string | null
+  progress: number | null
+}
+
+export type PhotoUploads = {
+  // Only the uploads chosen from the view shown: a tile stays where its photo was wanted.
+  pending: PendingUpload[]
+  enqueue: (files: File[]) => void
+}
+
+type UploadOutcome =
+  | { status: 'added'; collectionName: string | null }
+  | { status: 'refused' }
+  | { status: 'unauthenticated' }
+
+const EMPTY_TALLY: UploadTally = { addedCount: 0, refusedCount: 0, collectionName: null }
+
+type SetPending = Dispatch<SetStateAction<PendingUpload[]>>
+
+function updateProgress(setPending: SetPending, id: number, progress: number): void {
+  setPending((current) =>
+    current.map((upload) => (upload.id === id ? { ...upload, progress } : upload)),
+  )
+}
+
+// The tile leaves as the answer arrives, in the same render as the real photo: never both.
+async function uploadOne(
+  upload: PendingUpload,
+  setPending: SetPending,
+  onUploaded: UploadedHandler,
+): Promise<UploadOutcome> {
+  updateProgress(setPending, upload.id, 0)
+  const result = await postPhoto(upload.file, (percent) =>
+    updateProgress(setPending, upload.id, percent),
+  )
+  setPending((current) => current.filter(({ id }) => id !== upload.id))
+  if (result.status === 'unauthenticated') return result
+  if (result.status === 'failed') {
+    toast.error(result.message, { description: upload.file.name })
+    return { status: 'refused' }
+  }
+  const collectionName = await onUploaded(result.photo, upload.collectionId)
+  return { status: 'added', collectionName }
+}
+
+function withOutcome(tally: UploadTally, outcome: UploadOutcome): UploadTally {
+  if (outcome.status === 'refused') return { ...tally, refusedCount: tally.refusedCount + 1 }
+  if (outcome.status === 'unauthenticated') return tally
+  const collectionName = outcome.collectionName ?? tally.collectionName
+  return { ...tally, addedCount: tally.addedCount + 1, collectionName }
+}
+
+function announceTally(tally: UploadTally): void {
+  const summary = uploadSummary(tally)
+  if (summary === null) return
+  if (tally.refusedCount === 0) toast.success(summary)
+  else if (tally.addedCount === 0) toast.error(summary)
+  else toast.warning(summary)
+}
+
+// Mutable on purpose, like liveLoads: the queue's steps read and change it between renders.
+type QueueState = {
+  chain: Promise<void>
+  nextId: number
+  waitingCount: number
+  tally: UploadTally
+  isStopped: boolean
+}
+
+type QueueContext = {
+  state: QueueState
+  setPending: SetPending
+  onUploaded: UploadedHandler
+  dropUser: () => void
+}
+
+function createQueueState(): QueueState {
+  return {
+    chain: Promise.resolve(),
+    nextId: 0,
+    waitingCount: 0,
+    tally: EMPTY_TALLY,
+    isStopped: false,
+  }
+}
+
+async function runUpload(context: QueueContext, upload: PendingUpload): Promise<void> {
+  const { state, setPending, onUploaded, dropUser } = context
+  if (state.isStopped) return
+  const outcome = await uploadOne(upload, setPending, onUploaded)
+  // The session ended on the server: RequireAuth sends the user to /login, the rest is dropped.
+  if (outcome.status === 'unauthenticated') {
+    state.isStopped = true
+    setPending([])
+    dropUser()
+    return
+  }
+  state.tally = withOutcome(state.tally, outcome)
+  state.waitingCount -= 1
+  if (state.waitingCount > 0) return
+  announceTally(state.tally)
+  state.tally = EMPTY_TALLY
+}
+
+// One upload at a time, in the order chosen: each waits for the previous one through the chain.
+// The summary comes once the queue is empty, however many choices filled it.
+function enqueueUploads(context: QueueContext, files: File[], collectionId: string | null): void {
+  const { state, setPending } = context
+  const uploads = files.map((file) => ({ id: state.nextId++, file, collectionId, progress: null }))
+  state.waitingCount += uploads.length
+  setPending((current) => [...current, ...uploads])
+  for (const upload of uploads) {
+    state.chain = state.chain.then(() => runUpload(context, upload))
+  }
+}
+
+export function usePhotoUploads(collectionId: string | null, library: PhotoLibrary): PhotoUploads {
+  const { dropUser } = useAuth()
+  const onUploaded = useLibraryUpload(library)
+  const [pending, setPending] = useState<PendingUpload[]>([])
+  // useState keeps one queue across renders.
+  const [state] = useState(createQueueState)
+  const context = { state, setPending, onUploaded, dropUser }
+  return {
+    pending: pending.filter((upload) => upload.collectionId === collectionId),
+    enqueue: (files) => enqueueUploads(context, files, collectionId),
+  }
+}
diff --git a/client/src/pages/LibraryPage.tsx b/client/src/pages/LibraryPage.tsx
index 3103c08..50e78ac 100644
--- a/client/src/pages/LibraryPage.tsx
+++ b/client/src/pages/LibraryPage.tsx
@@ -13,19 +13,19 @@ import { LibrarySection } from '@/components/library/LibrarySection.tsx'
 import { LibraryMail } from '@/components/mail/LibraryMail.tsx'
 import { PhotoViewer } from '@/components/viewer/PhotoViewer.tsx'
 import { type LibraryLayout, useLibraryLayout } from '@/hooks/useLibraryLayout.ts'
-import { useLibraryUpload } from '@/hooks/useLibraryUpload.ts'
 import { type PhotoLibrary, usePhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
+import { type PendingUpload, usePhotoUploads } from '@/hooks/usePhotoUploads.ts'
 import {
   type SelectedCollection,
   selectedCollectionId,
   useSelectedCollection,
 } from '@/hooks/useSelectedCollection.ts'
 import { useViewerParam, type ViewerParam } from '@/hooks/useViewerParam.ts'
-import type { Photo } from '@/photo.ts'
 
 type LibraryContentProps = {
   selected: SelectedCollection
   library: PhotoLibrary
+  pending: PendingUpload[]
   viewer: ViewerParam
   onAdd: () => void
   allChipRef: RefObject<HTMLAnchorElement | null>
@@ -38,11 +38,12 @@ type LibraryOverlaysProps = {
   viewer: ViewerParam
   isAdding: boolean
   onAddClose: () => void
-  onUploaded: (photo: Photo) => void
+  onUpload: (files: File[]) => void
   isShowingPhotos: boolean
 }
 
-function LibraryBody({ selected, library, layout, viewer, onAdd }: LibraryBodyProps): JSX.Element {
+function LibraryBody(props: LibraryBodyProps): JSX.Element {
+  const { selected, library, pending, layout, viewer, onAdd } = props
   if (selected.status === 'missing') {
     return <UnavailableCollection message="Cette collection n'existe plus." />
   }
@@ -55,6 +56,7 @@ function LibraryBody({ selected, library, layout, viewer, onAdd }: LibraryBodyPr
     <LibrarySection
       library={library}
       layout={layout}
+      pending={pending}
       onOpenPhoto={viewer.open}
       emptyState={emptyState}
     />
@@ -95,12 +97,12 @@ function LibraryOverlays({
   viewer,
   isAdding,
   onAddClose,
-  onUploaded,
+  onUpload,
   isShowingPhotos,
 }: LibraryOverlaysProps): JSX.Element {
   return (
     <>
-      <AddPhotoPanel isOpen={isAdding} onClose={onAddClose} onUploaded={onUploaded} />
+      <AddPhotoPanel isOpen={isAdding} onClose={onAddClose} onUpload={onUpload} />
       {viewer.openId !== null && isShowingPhotos && (
         <PhotoViewer library={library} openId={viewer.openId} viewer={viewer} />
       )}
@@ -110,9 +112,10 @@ function LibraryOverlays({
 
 export default function LibraryPage(): JSX.Element {
   const selected = useSelectedCollection()
-  const library = usePhotoLibrary(selectedCollectionId(selected))
+  const collectionId = selectedCollectionId(selected)
+  const library = usePhotoLibrary(collectionId)
   const viewer = useViewerParam()
-  const handleUploaded = useLibraryUpload(selected, library)
+  const uploads = usePhotoUploads(collectionId, library)
   const [isAdding, setIsAdding] = useState(false)
   const allChipRef = useRef<HTMLAnchorElement>(null)
 
@@ -123,6 +126,7 @@ export default function LibraryPage(): JSX.Element {
       <LibraryContent
         selected={selected}
         library={library}
+        pending={uploads.pending}
         viewer={viewer}
         onAdd={() => setIsAdding(true)}
         allChipRef={allChipRef}
@@ -132,7 +136,7 @@ export default function LibraryPage(): JSX.Element {
         viewer={viewer}
         isAdding={isAdding}
         onAddClose={() => setIsAdding(false)}
-        onUploaded={handleUploaded}
+        onUpload={uploads.enqueue}
         isShowingPhotos={isShowingPhotos(selected)}
       />
       <AddPhotoFab onAdd={() => setIsAdding(true)} />
diff --git a/client/src/photosApi.ts b/client/src/photosApi.ts
index bd15c90..acb4a5b 100644
--- a/client/src/photosApi.ts
+++ b/client/src/photosApi.ts
@@ -1,5 +1,6 @@
 import { errorMessage, UNAUTHORIZED_STATUS } from '@/api.ts'
 import { isPhoto, isPhotoPage, type Photo, type PhotoPage } from '@/photo.ts'
+import { postWithProgress } from '@/upload/postWithProgress.ts'
 
 // The server's MAX_PAGE_SIZE: the fewest requests for many photos.
 const MAX_PAGE_SIZE = 100
@@ -91,20 +92,20 @@ export async function fetchNewestPhotos(
   return { photos, nextCursor: cursor ?? null }
 }
 
-export async function postPhoto(file: File): Promise<UploadResult> {
+// The same answers as the fetch calls below, with the upload's progress on the way.
+export async function postPhoto(
+  file: File,
+  onProgress: (percent: number) => void,
+): Promise<UploadResult> {
   const body = new FormData()
   body.append('photo', file)
-  try {
-    const res = await fetch('/api/photos', { method: 'POST', body })
-    if (res.status === UNAUTHORIZED_STATUS) return { status: 'unauthenticated' }
-    // Not JSON when the dev proxy answers for a stopped API.
-    const data: unknown = await res.json().catch(() => null)
-    if (res.ok && isPhoto(data)) return { status: 'uploaded', photo: data }
-    return { status: 'failed', message: errorMessage(data) }
-  } catch {
-    // fetch rejects only on network failure.
-    return { status: 'failed', message: errorMessage(null) }
+  const response = await postWithProgress('/api/photos', body, onProgress)
+  if (response === null) return { status: 'failed', message: errorMessage(null) }
+  if (response.status === UNAUTHORIZED_STATUS) return { status: 'unauthenticated' }
+  if (response.isOk && isPhoto(response.body)) {
+    return { status: 'uploaded', photo: response.body }
   }
+  return { status: 'failed', message: errorMessage(response.body) }
 }
 
 function isDuplicateError(body: unknown): boolean {
diff --git a/client/src/upload/postWithProgress.ts b/client/src/upload/postWithProgress.ts
new file mode 100644
index 0000000..19d6f55
--- /dev/null
+++ b/client/src/upload/postWithProgress.ts
@@ -0,0 +1,36 @@
+// isOk is fetch's `res.ok`. body is null when the answer is not JSON, such as the dev proxy's
+// page for a stopped API.
+export type ProgressResponse = { isOk: boolean; status: number; body: unknown }
+
+const FULL_PERCENT = 100
+const SUCCESS_STATUS_MIN = 200
+const SUCCESS_STATUS_MAX = 299
+
+function toResponse(request: XMLHttpRequest): ProgressResponse {
+  const { status, response } = request
+  const isOk = status >= SUCCESS_STATUS_MIN && status <= SUCCESS_STATUS_MAX
+  return { isOk, status, body: response }
+}
+
+// XMLHttpRequest rather than fetch: only it reports how much of the body has left. A same-origin
+// request sends the session cookie, as fetch does. null: the network failed, nothing came back.
+export function postWithProgress(
+  url: string,
+  body: FormData,
+  onProgress: (percent: number) => void,
+): Promise<ProgressResponse | null> {
+  return new Promise((resolve) => {
+    const request = new XMLHttpRequest()
+    request.open('POST', url)
+    request.responseType = 'json'
+    request.upload.onprogress = (event) => {
+      if (event.lengthComputable) {
+        onProgress(Math.round((event.loaded / event.total) * FULL_PERCENT))
+      }
+    }
+    request.onload = () => resolve(toResponse(request))
+    request.onerror = () => resolve(null)
+    request.onabort = () => resolve(null)
+    request.send(body)
+  })
+}
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index f7602a3..e488e9c 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -10,11 +10,12 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 - Dans ce panneau, prendre une photo avec l'appareil photo du téléphone (« Prendre une photo ») ou choisir une image déjà enregistrée (« Choisir une image »).
 - Voir un aperçu de la photo choisie avant de l'envoyer.
 - L'ajouter à sa bibliothèque avec « Ajouter à ma bibliothèque », ou l'envoyer directement à un ami avec « Envoyer à un ami » (voir [partage.md](partage.md#envoyer-une-photo-depuis-son-appareil)).
+- Suivre l'envoi sur la vignette de la photo, qui apparaît aussitôt dans la bibliothèque.
 
 **Règles**
 
 1. R-BIB-01 · Les deux boutons restent désactivés tant qu'aucune photo n'est choisie.
-2. R-BIB-02 · Une seule photo est ajoutée à la fois. Choisir une nouvelle photo remplace la précédente dans le panneau et efface le dernier message.
+2. R-BIB-02 · Une seule photo est ajoutée à la fois. Choisir une nouvelle photo remplace la précédente dans le panneau.
 3. R-BIB-03 · Formats acceptés : JPEG, PNG et WebP. Seuls ces formats peuvent être choisis ; le téléphone convertit lui-même une photo prise avec l'appareil photo. Tout autre format (GIF, HEIC, vidéo…) est refusé.
 4. R-BIB-04 · Une photo pèse au plus 10 Mo.
 5. R-BIB-05 · Le fichier doit être une image lisible ; un fichier abîmé ou déguisé en image est refusé.
@@ -24,11 +25,17 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 9. R-BIB-08 · La photo ajoutée est préparée pour l'affichage : elle est remise dans le bon sens (photo prise téléphone tourné), réduite à 1920 pixels au plus sur son plus grand côté (jamais agrandie), et les zones transparentes deviennent blanches.
 10. R-BIB-09 · Les informations cachées de la photo, dont le lieu de prise de vue, sont retirées à l'ajout : elles ne sont jamais conservées ni montrées.
 11. R-BIB-10 · Une photo ajoutée porte la date et l'heure de son ajout. La date de prise de vue n'est pas utilisée.
-12. R-BIB-11 · Pendant l'envoi, les deux boutons sont désactivés et le premier affiche « Envoi… ».
-13. R-BIB-12 · Après un ajout réussi, le panneau se ferme, un message de réussite s'affiche, et la photo apparaît en tête de la bibliothèque et sur le cadre qui lit toute la bibliothèque, sur tous les appareils connectés au compte, sans recharger la page. Ajoutée pendant qu'une collection est affichée, elle est aussi rangée dans cette collection (R-COL-21).
-14. R-BIB-13 · Après un échec, la photo reste choisie dans le panneau et un message explique la raison.
+12. R-BIB-11 · Remplacée : le panneau n'attend plus la fin de l'envoi (R-BIB-54).
+13. R-BIB-12 · Après un ajout réussi, la vignette grisée laisse place à la photo, un message de réussite s'affiche, et la photo apparaît en tête de la bibliothèque et sur le cadre qui lit toute la bibliothèque, sur tous les appareils connectés au compte, sans recharger la page. Ajoutée pendant qu'une collection est affichée, elle est aussi rangée dans cette collection (R-COL-21).
+14. R-BIB-13 · Remplacée : un échec se signale sur la bibliothèque, le panneau étant déjà fermé (R-BIB-55).
 15. R-BIB-44 · Fermer le panneau sans rien envoyer abandonne la photo choisie : il s'ouvre vide la fois suivante.
 16. R-BIB-48 · Sur un téléphone, « Ajouter » est un bouton rond « + » en bas à droite de l'écran, au-dessus de la barre d'onglets, bien visible en thème clair comme sombre ; il n'apparaît que sur la bibliothèque. Il s'efface pendant que l'on fait défiler les photos vers le bas, pour ne pas cacher leurs boutons « … », et revient dès que l'on remonte, en haut de la page ou à la fin de la liste. Au clavier, il revient quand on l'atteint ; effacé, il ne garde pas la sélection. Si l'appareil demande de réduire les animations, il disparaît et revient sans glisser. L'en-tête n'y montre plus « Ajouter » ni « Mode cadre » : le cadre s'ouvre avec l'onglet « Cadre » (R-APP-64). La fin de la page reste visible au-dessus du bouton.
+17. R-BIB-54 · « Ajouter à ma bibliothèque » ferme aussitôt le panneau. La photo apparaît tout de suite en tête des photos affichées, en vignette grisée qui indique où en est l'envoi : « En attente », puis le pourcentage envoyé (« 42 % »), puis « Finalisation… » pendant que la photo est préparée. Sur un téléphone, où les vignettes sont petites, seuls le pourcentage et la barre de progression s'affichent. Tant qu'elle est grisée, elle ne s'ouvre pas et n'a pas de menu « … ».
+18. R-BIB-55 · Après un échec, la vignette grisée disparaît et une notification donne la raison, avec le nom du fichier.
+19. R-BIB-56 · Les photos partent une par une, dans l'ordre où elles ont été ajoutées : ajouter une photo pendant qu'une autre s'envoie la met en attente derrière. Un seul message de réussite s'affiche, quand la dernière est envoyée.
+20. R-BIB-57 · La vignette grisée s'affiche dans la vue d'où la photo a été ajoutée : toute la bibliothèque, ou la collection affichée (voir [collections.md](collections.md#parcourir-une-collection)). Dans une collection, la photo apparaît quand elle y est rangée, juste après la fin de l'envoi.
+21. R-BIB-58 · Quitter la bibliothèque pour une autre page de l'application n'interrompt pas les envois ; fermer l'application ou recharger la page interrompt ceux qui ne sont pas terminés.
+22. R-BIB-59 · Un lecteur d'écran annonce le nombre de photos en cours d'envoi chaque fois qu'il change.
 
 **Messages affichés**
 
@@ -36,8 +43,13 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 | ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
 | En-tête du panneau              | « Ajouter une photo » — « Ajoutez-la à votre bibliothèque ou envoyez-la directement à un ami. »                   |
 | Aperçu                          | Image décrite comme « Aperçu avant envoi »                                                                        |
-| Envoi en cours                  | « Envoi… »                                                                                                        |
+| Envoi en attente                | « En attente », sur la vignette grisée (la barre vide seule sur un téléphone)                                     |
+| Envoi en cours                  | « 42 % » et une barre de progression, sur la vignette grisée                                                      |
+| Photo en préparation            | « Finalisation… », sur la vignette grisée (« 100 % » sur un téléphone)                                            |
+| Annonce du lecteur d'écran      | « Envoi d'une photo en cours. » ou « Envoi de 3 photos en cours. »                                                |
 | Photo ajoutée                   | « Photo ajoutée à votre bibliothèque. », dans une courte notification en bas de l'écran qui disparaît d'elle-même |
+| Plusieurs photos ajoutées       | « 3 photos ajoutées à votre bibliothèque. », dans la même notification, une fois la dernière envoyée              |
+| Photo refusée                   | La raison (voir ci-dessous) et le nom du fichier, dans une notification                                           |
 | Aucun fichier reçu              | « Prenez ou choisissez une photo. »                                                                               |
 | Plusieurs fichiers d'un coup    | « Envoi invalide : une seule photo à la fois. »                                                                   |
 | Format refusé                   | « Format non pris en charge : JPEG, PNG ou WebP uniquement. »                                                     |
diff --git a/docs/produit/collections.md b/docs/produit/collections.md
index 1bd4aaa..1a72cdf 100644
--- a/docs/produit/collections.md
+++ b/docs/produit/collections.md
@@ -99,7 +99,7 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
 | Collection vide                            | « Cette collection est vide. » — « Ajoutez-y une photo, ou rangez-y celles de « Toutes » depuis leur menu « … ». » et le bouton « Ajouter une photo » |
 | Collection introuvable                     | « Cette collection n'existe plus. » et le bouton « Voir toutes les photos »                                                                           |
-| Photo ajoutée dans une collection affichée | « Photo ajoutée à votre bibliothèque. » puis « Photo ajoutée à « Noël ». »                                                                            |
+| Photo ajoutée dans une collection affichée | « Photo ajoutée à « Noël ». » (« 3 photos ajoutées à « Noël ». » pour plusieurs photos)                                                               |
 | Collections non chargées                   | « Cette collection n'a pas pu être chargée. » et le bouton « Voir toutes les photos »                                                                 |
 
 **Ce qui n'est pas possible**
diff --git a/docs/produit/partage.md b/docs/produit/partage.md
index 087c557..450d5cb 100644
--- a/docs/produit/partage.md
+++ b/docs/produit/partage.md
@@ -85,7 +85,7 @@ Ceux du panneau d'envoi (voir [Choisir à qui envoyer](#choisir-à-qui-envoyer))
 1. R-PAR-20 · La photo entre uniquement dans la bibliothèque de l'ami : elle n'est pas ajoutée à celle de l'expéditeur.
 2. R-PAR-21 · Les règles d'ajout s'appliquent comme pour sa propre bibliothèque : formats JPEG, PNG ou WebP, 10 Mo au plus, image lisible, photo préparée pour l'affichage et informations cachées retirées (voir [bibliotheque.md](bibliotheque.md#ajouter-une-photo), R-BIB-03 à R-BIB-09). Les messages d'erreur sont les mêmes.
 3. R-PAR-22 · « Envoyer à un ami » ferme le panneau « Ajouter une photo » et ouvre le panneau d'envoi avec la photo choisie. Après un envoi réussi, il se ferme ; le fermer sans envoyer abandonne la photo.
-4. R-PAR-23 · La notification « Photo ajoutée à votre bibliothèque. » du panneau d'ajout ne concerne que l'ajout à sa bibliothèque ; l'envoi à des amis se confirme par sa propre notification (« Envoyée à … »).
+4. R-PAR-23 · La notification « Photo ajoutée à votre bibliothèque. » et la vignette grisée de l'envoi en cours ne concernent que l'ajout à sa bibliothèque ; l'envoi à des amis se confirme par sa propre notification (« Envoyée à … »).
 
 **Messages affichés**
 
~~~~

### Task 1a: Review fix, queue above the routes

**Commit:** `fix(client): keep the upload queue across pages`

**Scope:** Review fixes 2, 3, 4, 5, 6, 9: `UploadsProvider` in `LoggedInLayout`, `upload/uploadQueue.ts`, tile kept until filing in a collection, a throwing step counts as refused, collection named only when all photos went there, indeterminate bar while waiting.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index e804436..310991a 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -28,7 +28,7 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 ## Parcours d'une photo
 
 1. Le proche, connecté à son compte, prend ou choisit une photo (`<input type="file" accept="image/*" capture>`).
-2. Le client envoie l'image en `multipart/form-data` à une route Express ; **Multer** la reçoit en mémoire. L'envoi passe par `XMLHttpRequest` plutôt que `fetch` : seul `upload.onprogress` donne la progression, affichée sur une vignette grisée en tête de la bibliothèque (`usePhotoUploads`). Les photos partent une par une, dans une file d'attente côté client.
+2. Le client envoie l'image en `multipart/form-data` à une route Express ; **Multer** la reçoit en mémoire. L'envoi passe par `XMLHttpRequest` plutôt que `fetch` : seul `upload.onprogress` donne la progression, affichée sur une vignette grisée en tête de la bibliothèque. Les photos partent une par une, dans une file d'attente côté client (`upload/uploadQueue.ts`) tenue par `UploadsProvider`, monté au-dessus des routes comme `CollectionsProvider` : quitter la bibliothèque n'arrête pas la file et ses vignettes reviennent au retour. La page ouverte reçoit chaque photo envoyée par un écouteur (`usePhotoUploads`) ; le rangement dans une collection se fait dans la file, page ouverte ou non.
 3. Le serveur vérifie la session (cookie `ff_session`, voir [Authentification](#authentification)) et le fichier (10 Mo max, JPEG/PNG/WebP), calcule le **SHA-256** des octets reçus et refuse un fichier déjà présent dans la bibliothèque du compte, photos en attente d'ouverture comprises (`409 PHOTO_DUPLICATE`, sans appeler Sharp ni Cloudinary), puis le **décode et le réencode avec Sharp** : JPEG de 1920 px max, orientation EXIF appliquée, métadonnées (GPS compris) supprimées. Le type déclaré par le navigateur n'est pas fiable : c'est le décodage par Sharp qui valide vraiment l'image.
 4. L'image réencodée est envoyée à **Cloudinary**, dans le dossier `familyframe`.
 5. **Prisma** enregistre dans MongoDB l'URL, l'identifiant Cloudinary, le propriétaire (`ownerId`, le compte connecté), le SHA-256 du fichier reçu et la date. L'index unique `(ownerId, sha256)` est la vraie garantie : deux envois simultanés du même fichier passent la vérification, le second est refusé à l'enregistrement (`409` aussi) et son image Cloudinary est détruite.
diff --git a/client/src/App.tsx b/client/src/App.tsx
index b8c5bdb..fc8e291 100644
--- a/client/src/App.tsx
+++ b/client/src/App.tsx
@@ -15,14 +15,18 @@ import LibraryPage from './pages/LibraryPage.tsx'
 import LoginPage from './pages/LoginPage.tsx'
 import NotFoundPage from './pages/NotFoundPage.tsx'
 import SettingsPage from './pages/SettingsPage.tsx'
+import { UploadsProvider } from './upload/UploadsProvider.tsx'
 
 // One layout route guards every logged-in page, instead of wrapping each one. The collections
-// load once for all of them: the library, the menus and the frame show the same list.
+// load once for all of them: the library, the menus and the frame show the same list. The upload
+// queue lives here too, inside the collections it files photos into.
 function LoggedInLayout(): JSX.Element {
   return (
     <RequireAuth>
       <CollectionsProvider>
-        <Outlet />
+        <UploadsProvider>
+          <Outlet />
+        </UploadsProvider>
       </CollectionsProvider>
     </RequireAuth>
   )
diff --git a/client/src/components/library/LibrarySection.tsx b/client/src/components/library/LibrarySection.tsx
index e9aae60..3f5c22c 100644
--- a/client/src/components/library/LibrarySection.tsx
+++ b/client/src/components/library/LibrarySection.tsx
@@ -9,7 +9,7 @@ import {
 import { Button } from '@/components/ui/button.tsx'
 import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'
 import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
-import type { PendingUpload } from '@/hooks/usePhotoUploads.ts'
+import type { PendingUpload } from '@/upload/uploadQueue.ts'
 
 type LibrarySectionProps = {
   library: PhotoLibrary
diff --git a/client/src/components/library/PendingUploads.tsx b/client/src/components/library/PendingUploads.tsx
index 9f6d287..818949f 100644
--- a/client/src/components/library/PendingUploads.tsx
+++ b/client/src/components/library/PendingUploads.tsx
@@ -4,9 +4,9 @@ import {
   pendingProgressLabel,
   pendingShortLabel,
 } from '@/components/library/uploadTexts.ts'
-import type { PendingUpload } from '@/hooks/usePhotoUploads.ts'
 import { usePreviewUrl } from '@/hooks/usePreviewUrl.ts'
 import { cn } from '@/lib/utils.ts'
+import type { PendingUpload } from '@/upload/uploadQueue.ts'
 
 type PendingProps = { upload: PendingUpload }
 
@@ -31,7 +31,8 @@ const GRID_PILL_CLASSES =
 
 const PROGRESS_MAX = 100
 
-// Not a live region itself: one announcement per photo is enough, not one per percent.
+// Not a live region itself: one announcement per photo is enough, not one per percent. No value
+// while waiting: an indeterminate bar, not « 0 % » under « En attente ».
 function ProgressBar({ progress, tone }: { progress: number | null; tone: BarTone }): JSX.Element {
   const { track, fill } = BAR_CLASSES[tone]
   return (
@@ -40,7 +41,7 @@ function ProgressBar({ progress, tone }: { progress: number | null; tone: BarTon
       aria-label="Progression de l'envoi"
       aria-valuemin={0}
       aria-valuemax={PROGRESS_MAX}
-      aria-valuenow={progress ?? 0}
+      aria-valuenow={progress ?? undefined}
       className={cn('h-1.5 w-full overflow-hidden rounded-full', track)}
     >
       <div
diff --git a/client/src/hooks/useLibraryUpload.ts b/client/src/hooks/useLibraryUpload.ts
index 2739304..398d9bb 100644
--- a/client/src/hooks/useLibraryUpload.ts
+++ b/client/src/hooks/useLibraryUpload.ts
@@ -1,19 +1,20 @@
+import type { RefObject } from 'react'
 import { toast } from 'sonner'
 import { useCollections } from '@/collections/CollectionsContext.ts'
-import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
-import type { Photo } from '@/photo.ts'
-
-// Resolves to the collection's name once filed, null when nothing was filed.
-export type UploadedHandler = (photo: Photo, collectionId: string | null) => Promise<string | null>
+import type { UploadedPhotoListener } from '@/upload/UploadsContext.ts'
+import type { UploadedHandler } from '@/upload/uploadQueue.ts'
 
 // Added while a collection is shown, the photo is filed there too: that is where it was wanted.
-// collectionId is the one shown when the photo was chosen. The collection's list then reloads on
-// collections:changed, like any filing. Filed by id: the collections list may still be loading,
-// and the answer names the collection.
-export function useLibraryUpload(library: PhotoLibrary): UploadedHandler {
+// collectionId is the one shown when the photo was chosen; the filing happens even if the library
+// page was left meanwhile. The collection's list then reloads on collections:changed, like any
+// filing. Filed by id: the collections list may still be loading, and the answer names the
+// collection. The ref reaches the library open now, if any.
+export function useLibraryUpload(
+  photoListener: RefObject<UploadedPhotoListener | null>,
+): UploadedHandler {
   const { addPhoto } = useCollections()
   return async (photo, collectionId) => {
-    library.addPhoto(photo)
+    photoListener.current?.(photo)
     if (collectionId === null) return null
     const result = await addPhoto(collectionId, photo.id)
     if (result.isSuccess) return result.collection.name
diff --git a/client/src/hooks/usePhotoUploads.ts b/client/src/hooks/usePhotoUploads.ts
index eae4d92..3ce9c9b 100644
--- a/client/src/hooks/usePhotoUploads.ts
+++ b/client/src/hooks/usePhotoUploads.ts
@@ -1,19 +1,7 @@
-import { type Dispatch, type SetStateAction, useState } from 'react'
-import { toast } from 'sonner'
-import { useAuth } from '@/auth/AuthContext.ts'
-import { type UploadTally, uploadSummary } from '@/components/library/uploadTexts.ts'
-import { type UploadedHandler, useLibraryUpload } from '@/hooks/useLibraryUpload.ts'
+import { useEffect } from 'react'
 import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
-import { postPhoto } from '@/photosApi.ts'
-
-// collectionId: the view the photo was chosen from, where its tile shows. progress null: still
-// waiting its turn.
-export type PendingUpload = {
-  id: number
-  file: File
-  collectionId: string | null
-  progress: number | null
-}
+import { useUploads } from '@/upload/UploadsContext.ts'
+import type { PendingUpload } from '@/upload/uploadQueue.ts'
 
 export type PhotoUploads = {
   // Only the uploads chosen from the view shown: a tile stays where its photo was wanted.
@@ -21,121 +9,21 @@ export type PhotoUploads = {
   enqueue: (files: File[]) => void
 }
 
-type UploadOutcome =
-  | { status: 'added'; collectionName: string | null }
-  | { status: 'refused' }
-  | { status: 'unauthenticated' }
-
-const EMPTY_TALLY: UploadTally = { addedCount: 0, refusedCount: 0, collectionName: null }
-
-type SetPending = Dispatch<SetStateAction<PendingUpload[]>>
-
-function updateProgress(setPending: SetPending, id: number, progress: number): void {
-  setPending((current) =>
-    current.map((upload) => (upload.id === id ? { ...upload, progress } : upload)),
-  )
-}
-
-// The tile leaves as the answer arrives, in the same render as the real photo: never both.
-async function uploadOne(
-  upload: PendingUpload,
-  setPending: SetPending,
-  onUploaded: UploadedHandler,
-): Promise<UploadOutcome> {
-  updateProgress(setPending, upload.id, 0)
-  const result = await postPhoto(upload.file, (percent) =>
-    updateProgress(setPending, upload.id, percent),
-  )
-  setPending((current) => current.filter(({ id }) => id !== upload.id))
-  if (result.status === 'unauthenticated') return result
-  if (result.status === 'failed') {
-    toast.error(result.message, { description: upload.file.name })
-    return { status: 'refused' }
-  }
-  const collectionName = await onUploaded(result.photo, upload.collectionId)
-  return { status: 'added', collectionName }
-}
-
-function withOutcome(tally: UploadTally, outcome: UploadOutcome): UploadTally {
-  if (outcome.status === 'refused') return { ...tally, refusedCount: tally.refusedCount + 1 }
-  if (outcome.status === 'unauthenticated') return tally
-  const collectionName = outcome.collectionName ?? tally.collectionName
-  return { ...tally, addedCount: tally.addedCount + 1, collectionName }
-}
-
-function announceTally(tally: UploadTally): void {
-  const summary = uploadSummary(tally)
-  if (summary === null) return
-  if (tally.refusedCount === 0) toast.success(summary)
-  else if (tally.addedCount === 0) toast.error(summary)
-  else toast.warning(summary)
-}
-
-// Mutable on purpose, like liveLoads: the queue's steps read and change it between renders.
-type QueueState = {
-  chain: Promise<void>
-  nextId: number
-  waitingCount: number
-  tally: UploadTally
-  isStopped: boolean
-}
-
-type QueueContext = {
-  state: QueueState
-  setPending: SetPending
-  onUploaded: UploadedHandler
-  dropUser: () => void
-}
-
-function createQueueState(): QueueState {
-  return {
-    chain: Promise.resolve(),
-    nextId: 0,
-    waitingCount: 0,
-    tally: EMPTY_TALLY,
-    isStopped: false,
-  }
-}
+// The library page's side of the queue: its view filters the tiles and tags new choices, and its
+// adder receives each photo sent while the page is open.
+export function usePhotoUploads(collectionId: string | null, library: PhotoLibrary): PhotoUploads {
+  const { pending, enqueue, photoListener } = useUploads()
+  const { addPhoto } = library
 
-async function runUpload(context: QueueContext, upload: PendingUpload): Promise<void> {
-  const { state, setPending, onUploaded, dropUser } = context
-  if (state.isStopped) return
-  const outcome = await uploadOne(upload, setPending, onUploaded)
-  // The session ended on the server: RequireAuth sends the user to /login, the rest is dropped.
-  if (outcome.status === 'unauthenticated') {
-    state.isStopped = true
-    setPending([])
-    dropUser()
-    return
-  }
-  state.tally = withOutcome(state.tally, outcome)
-  state.waitingCount -= 1
-  if (state.waitingCount > 0) return
-  announceTally(state.tally)
-  state.tally = EMPTY_TALLY
-}
+  useEffect(() => {
+    photoListener.current = addPhoto
+    return () => {
+      photoListener.current = null
+    }
+  }, [photoListener, addPhoto])
 
-// One upload at a time, in the order chosen: each waits for the previous one through the chain.
-// The summary comes once the queue is empty, however many choices filled it.
-function enqueueUploads(context: QueueContext, files: File[], collectionId: string | null): void {
-  const { state, setPending } = context
-  const uploads = files.map((file) => ({ id: state.nextId++, file, collectionId, progress: null }))
-  state.waitingCount += uploads.length
-  setPending((current) => [...current, ...uploads])
-  for (const upload of uploads) {
-    state.chain = state.chain.then(() => runUpload(context, upload))
-  }
-}
-
-export function usePhotoUploads(collectionId: string | null, library: PhotoLibrary): PhotoUploads {
-  const { dropUser } = useAuth()
-  const onUploaded = useLibraryUpload(library)
-  const [pending, setPending] = useState<PendingUpload[]>([])
-  // useState keeps one queue across renders.
-  const [state] = useState(createQueueState)
-  const context = { state, setPending, onUploaded, dropUser }
   return {
     pending: pending.filter((upload) => upload.collectionId === collectionId),
-    enqueue: (files) => enqueueUploads(context, files, collectionId),
+    enqueue: (files) => enqueue(files, collectionId),
   }
 }
diff --git a/client/src/pages/LibraryPage.tsx b/client/src/pages/LibraryPage.tsx
index 50e78ac..b16818a 100644
--- a/client/src/pages/LibraryPage.tsx
+++ b/client/src/pages/LibraryPage.tsx
@@ -14,13 +14,14 @@ import { LibraryMail } from '@/components/mail/LibraryMail.tsx'
 import { PhotoViewer } from '@/components/viewer/PhotoViewer.tsx'
 import { type LibraryLayout, useLibraryLayout } from '@/hooks/useLibraryLayout.ts'
 import { type PhotoLibrary, usePhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
-import { type PendingUpload, usePhotoUploads } from '@/hooks/usePhotoUploads.ts'
+import { usePhotoUploads } from '@/hooks/usePhotoUploads.ts'
 import {
   type SelectedCollection,
   selectedCollectionId,
   useSelectedCollection,
 } from '@/hooks/useSelectedCollection.ts'
 import { useViewerParam, type ViewerParam } from '@/hooks/useViewerParam.ts'
+import type { PendingUpload } from '@/upload/uploadQueue.ts'
 
 type LibraryContentProps = {
   selected: SelectedCollection
diff --git a/client/src/upload/UploadsContext.ts b/client/src/upload/UploadsContext.ts
new file mode 100644
index 0000000..42856c5
--- /dev/null
+++ b/client/src/upload/UploadsContext.ts
@@ -0,0 +1,21 @@
+import { createContext, type RefObject, useContext } from 'react'
+import type { Photo } from '@/photo.ts'
+import type { PendingUpload } from '@/upload/uploadQueue.ts'
+
+// The open library's adder; the ref holds null while no library page is open.
+export type UploadedPhotoListener = (photo: Photo) => void
+
+export type UploadsContextValue = {
+  // Every upload still on its way, in the order chosen, whatever the view.
+  pending: PendingUpload[]
+  enqueue: (files: File[], collectionId: string | null) => void
+  photoListener: RefObject<UploadedPhotoListener | null>
+}
+
+export const UploadsContext = createContext<UploadsContextValue | null>(null)
+
+export function useUploads(): UploadsContextValue {
+  const value = useContext(UploadsContext)
+  if (value === null) throw new Error('useUploads must be used inside UploadsProvider')
+  return value
+}
diff --git a/client/src/upload/UploadsProvider.tsx b/client/src/upload/UploadsProvider.tsx
new file mode 100644
index 0000000..6539644
--- /dev/null
+++ b/client/src/upload/UploadsProvider.tsx
@@ -0,0 +1,21 @@
+import { type JSX, type ReactNode, useRef, useState } from 'react'
+import { useAuth } from '@/auth/AuthContext.ts'
+import { useLibraryUpload } from '@/hooks/useLibraryUpload.ts'
+import { type UploadedPhotoListener, UploadsContext } from '@/upload/UploadsContext.ts'
+import { createQueueState, enqueueUploads, type PendingUpload } from '@/upload/uploadQueue.ts'
+
+// Above the routes, like the collections: leaving the library does not stop the queue, and its
+// tiles are back on return. A second choice joins the same queue, so photos still go one by one.
+export function UploadsProvider({ children }: { children: ReactNode }): JSX.Element {
+  const { dropUser } = useAuth()
+  const [pending, setPending] = useState<PendingUpload[]>([])
+  // useState keeps one queue across renders.
+  const [state] = useState(createQueueState)
+  const photoListener = useRef<UploadedPhotoListener | null>(null)
+  const onUploaded = useLibraryUpload(photoListener)
+  const context = { state, setPending, onUploaded, dropUser }
+  const enqueue = (files: File[], collectionId: string | null): void =>
+    enqueueUploads(context, files, collectionId)
+
+  return <UploadsContext value={{ pending, enqueue, photoListener }}>{children}</UploadsContext>
+}
diff --git a/client/src/upload/uploadQueue.ts b/client/src/upload/uploadQueue.ts
new file mode 100644
index 0000000..4918149
--- /dev/null
+++ b/client/src/upload/uploadQueue.ts
@@ -0,0 +1,149 @@
+import type { Dispatch, SetStateAction } from 'react'
+import { toast } from 'sonner'
+import { errorMessage } from '@/api.ts'
+import { type UploadTally, uploadSummary } from '@/components/library/uploadTexts.ts'
+import type { Photo } from '@/photo.ts'
+import { postPhoto } from '@/photosApi.ts'
+
+// collectionId: the view the photo was chosen from, where its tile shows. progress null: still
+// waiting its turn.
+export type PendingUpload = {
+  id: number
+  file: File
+  collectionId: string | null
+  progress: number | null
+}
+
+// Resolves to the collection's name once filed there, null when nothing was filed.
+export type UploadedHandler = (photo: Photo, collectionId: string | null) => Promise<string | null>
+
+export type SetPending = Dispatch<SetStateAction<PendingUpload[]>>
+
+// Mutable on purpose, like liveLoads: the queue's steps read and change it between renders.
+export type QueueState = {
+  chain: Promise<void>
+  nextId: number
+  waitingCount: number
+  tally: UploadTally
+  isStopped: boolean
+}
+
+export type QueueContext = {
+  state: QueueState
+  setPending: SetPending
+  onUploaded: UploadedHandler
+  dropUser: () => void
+}
+
+type UploadOutcome =
+  | { status: 'added'; collectionName: string | null }
+  | { status: 'refused' }
+  | { status: 'unauthenticated' }
+
+const EMPTY_TALLY: UploadTally = { addedCount: 0, refusedCount: 0, collectionName: null }
+
+export function createQueueState(): QueueState {
+  return {
+    chain: Promise.resolve(),
+    nextId: 0,
+    waitingCount: 0,
+    tally: EMPTY_TALLY,
+    isStopped: false,
+  }
+}
+
+function updateProgress(setPending: SetPending, id: number, progress: number): void {
+  setPending((current) =>
+    current.map((upload) => (upload.id === id ? { ...upload, progress } : upload)),
+  )
+}
+
+function removePending(setPending: SetPending, id: number): void {
+  setPending((current) => current.filter((upload) => upload.id !== id))
+}
+
+async function uploadOne(
+  upload: PendingUpload,
+  setPending: SetPending,
+  onUploaded: UploadedHandler,
+): Promise<UploadOutcome> {
+  updateProgress(setPending, upload.id, 0)
+  const result = await postPhoto(upload.file, (percent) =>
+    updateProgress(setPending, upload.id, percent),
+  )
+  if (result.status === 'unauthenticated') return result
+  if (result.status === 'failed') {
+    toast.error(result.message, { description: upload.file.name })
+    return { status: 'refused' }
+  }
+  const collectionName = await onUploaded(result.photo, upload.collectionId)
+  return { status: 'added', collectionName }
+}
+
+// The tile leaves once the photo is where it was wanted: in a collection, after the filing. In
+// « Toutes » the socket's photo:new often brings the photo just before the answer: both may show
+// for a moment, never two photos. A step that throws counts as refused: the queue goes on.
+async function settleUpload(context: QueueContext, upload: PendingUpload): Promise<UploadOutcome> {
+  const { setPending, onUploaded } = context
+  try {
+    return await uploadOne(upload, setPending, onUploaded)
+  } catch (error: unknown) {
+    console.error('Photo upload failed unexpectedly', error)
+    toast.error(errorMessage(null), { description: upload.file.name })
+    return { status: 'refused' }
+  } finally {
+    removePending(setPending, upload.id)
+  }
+}
+
+// The collection is named only when every added photo was filed in that same one. Names are
+// unique per account, so comparing them compares the collections.
+function withOutcome(tally: UploadTally, outcome: UploadOutcome): UploadTally {
+  if (outcome.status === 'refused') return { ...tally, refusedCount: tally.refusedCount + 1 }
+  if (outcome.status === 'unauthenticated') return tally
+  const isSamePlace = tally.addedCount === 0 || tally.collectionName === outcome.collectionName
+  const collectionName = isSamePlace ? outcome.collectionName : null
+  return { ...tally, addedCount: tally.addedCount + 1, collectionName }
+}
+
+function announceTally(tally: UploadTally): void {
+  const summary = uploadSummary(tally)
+  if (summary === null) return
+  if (tally.refusedCount === 0) toast.success(summary)
+  else if (tally.addedCount === 0) toast.error(summary)
+  else toast.warning(summary)
+}
+
+async function runUpload(context: QueueContext, upload: PendingUpload): Promise<void> {
+  const { state, setPending, dropUser } = context
+  if (state.isStopped) return
+  const outcome = await settleUpload(context, upload)
+  // The session ended on the server: RequireAuth sends the user to /login, the rest is dropped.
+  if (outcome.status === 'unauthenticated') {
+    state.isStopped = true
+    setPending([])
+    dropUser()
+    return
+  }
+  state.tally = withOutcome(state.tally, outcome)
+  state.waitingCount -= 1
+  if (state.waitingCount > 0) return
+  announceTally(state.tally)
+  state.tally = EMPTY_TALLY
+}
+
+// One upload at a time, in the order chosen: each waits for the previous one through the chain.
+// The summary comes once the queue is empty, however many choices filled it.
+export function enqueueUploads(
+  context: QueueContext,
+  files: File[],
+  collectionId: string | null,
+): void {
+  const { state, setPending } = context
+  const uploads = files.map((file) => ({ id: state.nextId++, file, collectionId, progress: null }))
+  state.waitingCount += uploads.length
+  setPending((current) => [...current, ...uploads])
+  for (const upload of uploads) {
+    state.chain = state.chain.then(() => runUpload(context, upload))
+  }
+}
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index e488e9c..2691030 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -33,8 +33,8 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 17. R-BIB-54 · « Ajouter à ma bibliothèque » ferme aussitôt le panneau. La photo apparaît tout de suite en tête des photos affichées, en vignette grisée qui indique où en est l'envoi : « En attente », puis le pourcentage envoyé (« 42 % »), puis « Finalisation… » pendant que la photo est préparée. Sur un téléphone, où les vignettes sont petites, seuls le pourcentage et la barre de progression s'affichent. Tant qu'elle est grisée, elle ne s'ouvre pas et n'a pas de menu « … ».
 18. R-BIB-55 · Après un échec, la vignette grisée disparaît et une notification donne la raison, avec le nom du fichier.
 19. R-BIB-56 · Les photos partent une par une, dans l'ordre où elles ont été ajoutées : ajouter une photo pendant qu'une autre s'envoie la met en attente derrière. Un seul message de réussite s'affiche, quand la dernière est envoyée.
-20. R-BIB-57 · La vignette grisée s'affiche dans la vue d'où la photo a été ajoutée : toute la bibliothèque, ou la collection affichée (voir [collections.md](collections.md#parcourir-une-collection)). Dans une collection, la photo apparaît quand elle y est rangée, juste après la fin de l'envoi.
-21. R-BIB-58 · Quitter la bibliothèque pour une autre page de l'application n'interrompt pas les envois ; fermer l'application ou recharger la page interrompt ceux qui ne sont pas terminés.
+20. R-BIB-57 · La vignette grisée s'affiche dans la vue d'où la photo a été ajoutée : toute la bibliothèque, ou la collection affichée (voir [collections.md](collections.md#parcourir-une-collection)). Dans une collection, la vignette grisée reste jusqu'à ce que la photo y soit rangée.
+21. R-BIB-58 · Quitter la bibliothèque pour une autre page de l'application n'interrompt pas les envois, qui continuent un par un ; les vignettes grisées sont de nouveau là au retour. Choisir d'autres photos entre-temps les met en attente derrière les premières. Fermer l'application ou recharger la page interrompt ceux qui ne sont pas terminés.
 22. R-BIB-59 · Un lecteur d'écran annonce le nombre de photos en cours d'envoi chaque fois qu'il change.
 
 **Messages affichés**
~~~~

### Task 1b: Step 12 minor M5, focus after the panels

**Commit:** `fix(client): give focus back to « Ajouter » when the add panels close`

**Scope:** Spec D18: `returnFocusRef` to the header's « Ajouter », hand-over guard for the send panel; R-BIB-65.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/components/library/AddPhotoFab.tsx b/client/src/components/library/AddPhotoFab.tsx
index 142a2db..54409da 100644
--- a/client/src/components/library/AddPhotoFab.tsx
+++ b/client/src/components/library/AddPhotoFab.tsx
@@ -1,5 +1,5 @@
 import { PlusIcon } from 'lucide-react'
-import { type JSX, useEffect } from 'react'
+import { type JSX, type RefObject, useEffect } from 'react'
 import { Button } from '@/components/ui/button.tsx'
 import { useHideOnScrollDown } from '@/hooks/useHideOnScrollDown.ts'
 import { cn } from '@/lib/utils.ts'
@@ -27,16 +27,18 @@ function useLiftToasts(isShown: boolean): void {
 
 type AddPhotoFabProps = {
   onAdd: () => void
+  // The library page focuses it when the add panels close.
+  buttonRef: RefObject<HTMLButtonElement | null>
 }
 
 // A phone's « Ajouter », where the thumb rests: bottom right, above the tab bar and the home bar.
 // A computer keeps the button in the header.
-export function AddPhotoFab({ onAdd }: AddPhotoFabProps): JSX.Element {
-  const { isHidden, ref, onFocus } = useHideOnScrollDown()
+export function AddPhotoFab({ onAdd, buttonRef }: AddPhotoFabProps): JSX.Element {
+  const { isHidden, onFocus } = useHideOnScrollDown(buttonRef)
   useLiftToasts(!isHidden)
   return (
     <Button
-      ref={ref}
+      ref={buttonRef}
       onClick={onAdd}
       onFocus={onFocus}
       aria-label="Ajouter une photo"
diff --git a/client/src/components/library/AddPhotoPanel.tsx b/client/src/components/library/AddPhotoPanel.tsx
index 141760e..c5ff969 100644
--- a/client/src/components/library/AddPhotoPanel.tsx
+++ b/client/src/components/library/AddPhotoPanel.tsx
@@ -1,13 +1,22 @@
-import { type JSX, useState } from 'react'
+import { type JSX, type RefObject, useRef, useState } from 'react'
 import { UploadForm } from '@/components/library/UploadForm.tsx'
 import { ResponsivePanel } from '@/components/panel/ResponsivePanel.tsx'
 import { ShareSheet } from '@/components/sharing/ShareSheet.tsx'
 import { DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx'
 
+type ShareHandOver = {
+  fileToShare: File | null
+  startShare: (file: File) => void
+  closeShare: () => void
+  returnFocus: (event: Event) => void
+}
+
 type AddPhotoPanelProps = {
   isOpen: boolean
   onClose: () => void
   onUpload: (files: File[]) => void
+  // The « Ajouter » triggers; the one shown takes focus back.
+  returnFocusRefs: RefObject<HTMLButtonElement | null>[]
 }
 
 function AddPhotoHeading(): JSX.Element {
@@ -22,32 +31,69 @@ function AddPhotoHeading(): JSX.Element {
   )
 }
 
-// « Envoyer à un ami » swaps this panel for the send panel, which keeps its own copy of the file.
-export function AddPhotoPanel({ isOpen, onClose, onUpload }: AddPhotoPanelProps): JSX.Element {
+// display: none (hidden md:inline-flex, md:hidden) leaves no box. Not offsetParent: it is always
+// null for the fixed floating button.
+function shownButton(refs: RefObject<HTMLButtonElement | null>[]): HTMLButtonElement | undefined {
+  return refs
+    .map((ref) => ref.current)
+    .find(
+      (button): button is HTMLButtonElement =>
+        button !== null && button.getClientRects().length > 0,
+    )
+}
+
+// Focus goes back to the shown « Ajouter », always there: the empty library's « Ajouter une
+// photo » leaves with the first tile, and the send panel was opened from a panel already gone.
+// The floating button shows itself when it takes focus, even if scrolling had hidden it.
+function useShareHandOver(returnFocusRefs: RefObject<HTMLButtonElement | null>[]): ShareHandOver {
   const [fileToShare, setFileToShare] = useState<File | null>(null)
+  // Set while the send panel takes over: it holds focus, « Ajouter » must not take it.
+  const isHandingOver = useRef(false)
+  return {
+    fileToShare,
+    startShare: (file) => {
+      isHandingOver.current = true
+      setFileToShare(file)
+    },
+    closeShare: () => {
+      isHandingOver.current = false
+      setFileToShare(null)
+    },
+    returnFocus: (event) => {
+      event.preventDefault()
+      if (!isHandingOver.current) shownButton(returnFocusRefs)?.focus()
+    },
+  }
+}
+
+// « Envoyer à un ami » swaps this panel for the send panel, which keeps its own copy of the file.
+// « Ajouter à ma bibliothèque » closes it at once: the progress shows on the library's tiles.
+export function AddPhotoPanel(props: AddPhotoPanelProps): JSX.Element {
+  const { isOpen, onClose, onUpload, returnFocusRefs } = props
+  const { fileToShare, startShare, closeShare, returnFocus } = useShareHandOver(returnFocusRefs)
 
-  // Closes at once: the photos' progress shows on their tiles in the library.
   function handleUpload(files: File[]): void {
     onUpload(files)
     onClose()
   }
 
   function handleShare(file: File): void {
+    startShare(file)
     onClose()
-    setFileToShare(file)
   }
 
   return (
     <>
       {isOpen && (
-        <ResponsivePanel onClose={onClose}>
+        <ResponsivePanel onClose={onClose} onCloseAutoFocus={returnFocus}>
           <AddPhotoHeading />
           <UploadForm onUpload={handleUpload} onShare={handleShare} />
         </ResponsivePanel>
       )}
       <ShareSheet
         target={fileToShare ? { kind: 'device', file: fileToShare } : null}
-        onClose={() => setFileToShare(null)}
+        onClose={closeShare}
+        onCloseAutoFocus={returnFocus}
       />
     </>
   )
diff --git a/client/src/components/library/LibraryHeader.tsx b/client/src/components/library/LibraryHeader.tsx
index 0691a9f..87c5bf7 100644
--- a/client/src/components/library/LibraryHeader.tsx
+++ b/client/src/components/library/LibraryHeader.tsx
@@ -1,5 +1,5 @@
 import { PlayIcon, PlusIcon } from 'lucide-react'
-import type { JSX } from 'react'
+import type { JSX, RefObject } from 'react'
 import { Link } from 'react-router'
 import { LayoutToggle } from '@/components/frame/LayoutToggle.tsx'
 import { libraryCountLabel } from '@/components/library/libraryTexts.ts'
@@ -16,6 +16,8 @@ type LibraryHeaderProps = {
   onAdd: () => void
   // false over a collection that cannot be shown: its photos, if any were loaded, are stale.
   showsCount: boolean
+  // The add and send panels give focus back to « Ajouter » when they close.
+  addButtonRef: RefObject<HTMLButtonElement | null>
 }
 
 function FrameModeButton(): JSX.Element {
@@ -42,6 +44,7 @@ export function LibraryHeader({
   onLayoutChange,
   onAdd,
   showsCount,
+  addButtonRef,
 }: LibraryHeaderProps): JSX.Element {
   return (
     // A phone has the floating « Ajouter » and the Cadre tab: only the layout toggle stays here.
@@ -55,7 +58,7 @@ export function LibraryHeader({
         </p>
       </div>
       <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
-        <Button size="lg" className="hidden md:inline-flex" onClick={onAdd}>
+        <Button ref={addButtonRef} size="lg" className="hidden md:inline-flex" onClick={onAdd}>
           <PlusIcon aria-hidden data-icon="inline-start" />
           Ajouter
         </Button>
diff --git a/client/src/hooks/useHideOnScrollDown.ts b/client/src/hooks/useHideOnScrollDown.ts
index f354a8a..d9b3412 100644
--- a/client/src/hooks/useHideOnScrollDown.ts
+++ b/client/src/hooks/useHideOnScrollDown.ts
@@ -1,4 +1,4 @@
-import { type RefObject, useEffect, useRef, useState } from 'react'
+import { type RefObject, useEffect, useState } from 'react'
 
 // Smaller moves are a finger resting on the screen, not a scroll: the button would flicker.
 const SCROLL_THRESHOLD_PX = 12
@@ -7,7 +7,6 @@ const END_MARGIN_PX = 48
 
 export type HideOnScrollDown = {
   isHidden: boolean
-  ref: RefObject<HTMLButtonElement | null>
   onFocus: () => void
 }
 
@@ -26,10 +25,10 @@ function keepsKeyboardFocus(button: HTMLButtonElement | null): boolean {
 }
 
 // A floating button covers what scrolls under it: it steps aside while the page goes down and
-// comes back when it goes up, at the top, at the end, or when the keyboard reaches it.
-export function useHideOnScrollDown(): HideOnScrollDown {
+// comes back when it goes up, at the top, at the end, or when the keyboard reaches it. ref: the
+// button, owned by the page, which also focuses it when a panel closes.
+export function useHideOnScrollDown(ref: RefObject<HTMLButtonElement | null>): HideOnScrollDown {
   const [isHidden, setIsHidden] = useState(false)
-  const ref = useRef<HTMLButtonElement>(null)
 
   useEffect(() => {
     let lastY = window.scrollY
@@ -44,7 +43,7 @@ export function useHideOnScrollDown(): HideOnScrollDown {
     }
     window.addEventListener('scroll', handleScroll, { passive: true })
     return () => window.removeEventListener('scroll', handleScroll)
-  }, [])
+  }, [ref])
 
-  return { isHidden, ref, onFocus: () => setIsHidden(false) }
+  return { isHidden, onFocus: () => setIsHidden(false) }
 }
diff --git a/client/src/pages/LibraryPage.tsx b/client/src/pages/LibraryPage.tsx
index b16818a..67a4464 100644
--- a/client/src/pages/LibraryPage.tsx
+++ b/client/src/pages/LibraryPage.tsx
@@ -29,20 +29,42 @@ type LibraryContentProps = {
   pending: PendingUpload[]
   viewer: ViewerParam
   onAdd: () => void
-  allChipRef: RefObject<HTMLAnchorElement | null>
+  addButtonRef: RefObject<HTMLButtonElement | null>
 }
 
 type LibraryBodyProps = LibraryContentProps & { layout: LibraryLayout }
 
+// The two « Ajouter » triggers, one shown at a time: the header's on a computer, the floating
+// button on a phone. Focus returns to the shown one when the panels close.
+type AddPanel = {
+  isOpen: boolean
+  open: () => void
+  close: () => void
+  headerButtonRef: RefObject<HTMLButtonElement | null>
+  fabRef: RefObject<HTMLButtonElement | null>
+}
+
 type LibraryOverlaysProps = {
   library: PhotoLibrary
   viewer: ViewerParam
-  isAdding: boolean
-  onAddClose: () => void
+  addPanel: AddPanel
   onUpload: (files: File[]) => void
   isShowingPhotos: boolean
 }
 
+function useAddPanel(): AddPanel {
+  const [isOpen, setIsOpen] = useState(false)
+  const headerButtonRef = useRef<HTMLButtonElement>(null)
+  const fabRef = useRef<HTMLButtonElement>(null)
+  return {
+    isOpen,
+    open: () => setIsOpen(true),
+    close: () => setIsOpen(false),
+    headerButtonRef,
+    fabRef,
+  }
+}
+
 function LibraryBody(props: LibraryBodyProps): JSX.Element {
   const { selected, library, pending, layout, viewer, onAdd } = props
   if (selected.status === 'missing') {
@@ -66,7 +88,9 @@ function LibraryBody(props: LibraryBodyProps): JSX.Element {
 
 function LibraryContent(props: LibraryContentProps): JSX.Element {
   const [layout, setLayout] = useLibraryLayout()
-  const { selected, library, onAdd, allChipRef } = props
+  const { selected, library, onAdd, addButtonRef } = props
+  // « Toutes »: where focus lands once the shown collection is deleted.
+  const allChipRef = useRef<HTMLAnchorElement>(null)
   return (
     <>
       <LibraryHeader
@@ -75,6 +99,7 @@ function LibraryContent(props: LibraryContentProps): JSX.Element {
         onLayoutChange={setLayout}
         onAdd={onAdd}
         showsCount={isShowingPhotos(selected)}
+        addButtonRef={addButtonRef}
       />
       {/* Above the photos: news from the family comes first. */}
       <LibraryMail />
@@ -96,14 +121,19 @@ function isShowingPhotos(selected: SelectedCollection): boolean {
 function LibraryOverlays({
   library,
   viewer,
-  isAdding,
-  onAddClose,
+  addPanel,
   onUpload,
   isShowingPhotos,
 }: LibraryOverlaysProps): JSX.Element {
   return (
     <>
-      <AddPhotoPanel isOpen={isAdding} onClose={onAddClose} onUpload={onUpload} />
+      <AddPhotoPanel
+        isOpen={addPanel.isOpen}
+        onClose={addPanel.close}
+        onUpload={onUpload}
+        returnFocusRefs={[addPanel.headerButtonRef, addPanel.fabRef]}
+      />
+      <AddPhotoFab onAdd={addPanel.open} buttonRef={addPanel.fabRef} />
       {viewer.openId !== null && isShowingPhotos && (
         <PhotoViewer library={library} openId={viewer.openId} viewer={viewer} />
       )}
@@ -117,8 +147,7 @@ export default function LibraryPage(): JSX.Element {
   const library = usePhotoLibrary(collectionId)
   const viewer = useViewerParam()
   const uploads = usePhotoUploads(collectionId, library)
-  const [isAdding, setIsAdding] = useState(false)
-  const allChipRef = useRef<HTMLAnchorElement>(null)
+  const addPanel = useAddPanel()
 
   return (
     // pb-24 below md: the floating « Ajouter » never covers the last photos or « Charger plus ».
@@ -129,18 +158,16 @@ export default function LibraryPage(): JSX.Element {
         library={library}
         pending={uploads.pending}
         viewer={viewer}
-        onAdd={() => setIsAdding(true)}
-        allChipRef={allChipRef}
+        onAdd={addPanel.open}
+        addButtonRef={addPanel.headerButtonRef}
       />
       <LibraryOverlays
         library={library}
         viewer={viewer}
-        isAdding={isAdding}
-        onAddClose={() => setIsAdding(false)}
+        addPanel={addPanel}
         onUpload={uploads.enqueue}
         isShowingPhotos={isShowingPhotos(selected)}
       />
-      <AddPhotoFab onAdd={() => setIsAdding(true)} />
     </main>
   )
 }
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index 2691030..6633da6 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -36,6 +36,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 20. R-BIB-57 · La vignette grisée s'affiche dans la vue d'où la photo a été ajoutée : toute la bibliothèque, ou la collection affichée (voir [collections.md](collections.md#parcourir-une-collection)). Dans une collection, la vignette grisée reste jusqu'à ce que la photo y soit rangée.
 21. R-BIB-58 · Quitter la bibliothèque pour une autre page de l'application n'interrompt pas les envois, qui continuent un par un ; les vignettes grisées sont de nouveau là au retour. Choisir d'autres photos entre-temps les met en attente derrière les premières. Fermer l'application ou recharger la page interrompt ceux qui ne sont pas terminés.
 22. R-BIB-59 · Un lecteur d'écran annonce le nombre de photos en cours d'envoi chaque fois qu'il change.
+23. R-BIB-65 · Quand le panneau « Ajouter une photo » se ferme, ou le panneau d'envoi ouvert depuis lui avec « Envoyer à un ami », la navigation au clavier reprend sur le bouton « Ajouter » affiché : celui de l'en-tête sur un ordinateur, le bouton rond « + » sur un téléphone (qui réapparaît s'il s'était effacé), même si le panneau avait été ouvert depuis une bibliothèque vide.
 
 **Messages affichés**
 
~~~~

## PR B — `feat/upload-multiple`

### Task 2: Up to 20 photos at once

**Commit:** `feat(client): add up to 20 photos at once`

**Scope:** `multiple` on the gallery picker, preview grid, 20 per choice, single-photo friend sending; product docs.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/components/library/AddPhotoPanel.tsx b/client/src/components/library/AddPhotoPanel.tsx
index c5ff969..fba46ef 100644
--- a/client/src/components/library/AddPhotoPanel.tsx
+++ b/client/src/components/library/AddPhotoPanel.tsx
@@ -25,7 +25,7 @@ function AddPhotoHeading(): JSX.Element {
     <div className="flex flex-col gap-1 pr-10">
       <DialogTitle>Ajouter une photo</DialogTitle>
       <DialogDescription>
-        Ajoutez-la à votre bibliothèque ou envoyez-la directement à un ami.
+        Ajoutez-en une ou plusieurs à votre bibliothèque, ou envoyez-en une directement à un ami.
       </DialogDescription>
     </div>
   )
diff --git a/client/src/components/library/UploadForm.tsx b/client/src/components/library/UploadForm.tsx
index edfdcb7..c643b22 100644
--- a/client/src/components/library/UploadForm.tsx
+++ b/client/src/components/library/UploadForm.tsx
@@ -1,11 +1,17 @@
 import { CameraIcon, ImageIcon, SendIcon } from 'lucide-react'
-import { type ChangeEvent, type JSX, type SubmitEvent, useRef, useState } from 'react'
+import { type ChangeEvent, type JSX, type SubmitEvent, useId, useRef, useState } from 'react'
+import { UploadPreview } from '@/components/library/UploadPreview.tsx'
+import { tooManyPhotosMessage } from '@/components/library/uploadTexts.ts'
+import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
 import { Button } from '@/components/ui/button.tsx'
-import { usePreviewUrl } from '@/hooks/usePreviewUrl.ts'
 
 // The server's accepted types: a HEIC or GIF picked here would only be refused after the upload.
 const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp'
 
+// Enough for an outing's best shots; past it the queue would run for many minutes on a phone
+// network, and the preview would push the buttons out of the panel.
+const MAX_PHOTOS_PER_CHOICE = 20
+
 type UploadFormProps = {
   onUpload: (files: File[]) => void
   // The file goes to a friend only: the own library does not change.
@@ -16,17 +22,19 @@ type PickButtonProps = {
   label: string
   icon: JSX.Element
   capture?: 'environment'
+  // The gallery only: the camera takes one photo at a time.
+  multiple?: boolean
   onChange: (event: ChangeEvent<HTMLInputElement>) => void
 }
 
 type UploadButtonsProps = {
-  hasFile: boolean
+  fileCount: number
   onShare: () => void
 }
 
 // A button rather than the raw file input: the browser's « Choose file » cannot be styled or
 // translated. The hidden input does the picking.
-function PickButton({ label, icon, capture, onChange }: PickButtonProps): JSX.Element {
+function PickButton({ label, icon, capture, multiple, onChange }: PickButtonProps): JSX.Element {
   const inputRef = useRef<HTMLInputElement>(null)
   return (
     <>
@@ -45,6 +53,7 @@ function PickButton({ label, icon, capture, onChange }: PickButtonProps): JSX.El
         type="file"
         accept={ACCEPTED_IMAGE_TYPES}
         capture={capture}
+        multiple={multiple}
         className="hidden"
         onChange={onChange}
       />
@@ -62,57 +71,78 @@ function PickButtons({ onChange }: Pick<PickButtonProps, 'onChange'>): JSX.Eleme
         onChange={onChange}
       />
       <PickButton
-        label="Choisir une image"
+        label="Choisir des images"
         icon={<ImageIcon aria-hidden className="size-6" />}
+        multiple
         onChange={onChange}
       />
     </div>
   )
 }
 
-function UploadButtons({ hasFile, onShare }: UploadButtonsProps): JSX.Element {
+// A friend gets one photo at a time: the send panel shows one photo with its message.
+function UploadButtons({ fileCount, onShare }: UploadButtonsProps): JSX.Element {
+  const shareHintId = useId()
   return (
     <div className="flex flex-col gap-2">
-      <Button type="submit" size="lg" disabled={!hasFile}>
+      <Button type="submit" size="lg" disabled={fileCount === 0}>
         Ajouter à ma bibliothèque
       </Button>
-      <Button type="button" variant="outline" size="lg" disabled={!hasFile} onClick={onShare}>
+      <Button
+        type="button"
+        variant="outline"
+        size="lg"
+        disabled={fileCount !== 1}
+        aria-describedby={fileCount > 1 ? shareHintId : undefined}
+        onClick={onShare}
+      >
         <SendIcon aria-hidden data-icon="inline-start" />
         Envoyer à un ami
       </Button>
+      {fileCount > 1 && (
+        <p id={shareHintId} className="text-sm text-muted-foreground">
+          Pour envoyer à un ami, choisissez une seule photo.
+        </p>
+      )}
     </div>
   )
 }
 
-function FilePreview({ file }: { file: File | null }): JSX.Element | null {
-  const previewUrl = usePreviewUrl(file)
-  if (!previewUrl) return null
+function TooManyAlert({ message }: { message: string }): JSX.Element | null {
+  if (message === '') return null
   return (
-    <img
-      className="max-h-[35svh] w-full rounded-lg object-contain"
-      src={previewUrl}
-      alt="Aperçu avant envoi"
-    />
+    <Alert variant="destructive">
+      <AlertDescription>{message}</AlertDescription>
+    </Alert>
   )
 }
 
 export function UploadForm({ onUpload, onShare }: UploadFormProps): JSX.Element {
-  const [file, setFile] = useState<File | null>(null)
+  const [files, setFiles] = useState<File[]>([])
+  const [tooManyMessage, setTooManyMessage] = useState('')
 
+  // Too many: nothing is kept, so the message never sits next to photos that would be sent.
   function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
-    setFile(event.target.files?.[0] ?? null)
+    const chosen = Array.from(event.target.files ?? [])
+    const isTooMany = chosen.length > MAX_PHOTOS_PER_CHOICE
+    setFiles(isTooMany ? [] : chosen)
+    setTooManyMessage(isTooMany ? tooManyPhotosMessage(MAX_PHOTOS_PER_CHOICE, chosen.length) : '')
   }
 
   function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
     event.preventDefault()
-    if (file) onUpload([file])
+    if (files.length > 0) onUpload(files)
   }
 
   return (
     <form onSubmit={handleSubmit} className="flex flex-col gap-4">
       <PickButtons onChange={handleFileChange} />
-      <FilePreview file={file} />
-      <UploadButtons hasFile={file !== null} onShare={() => file && onShare(file)} />
+      <TooManyAlert message={tooManyMessage} />
+      <UploadPreview files={files} />
+      <UploadButtons
+        fileCount={files.length}
+        onShare={() => files.length === 1 && onShare(files[0])}
+      />
     </form>
   )
 }
diff --git a/client/src/components/library/UploadPreview.tsx b/client/src/components/library/UploadPreview.tsx
new file mode 100644
index 0000000..827f65f
--- /dev/null
+++ b/client/src/components/library/UploadPreview.tsx
@@ -0,0 +1,49 @@
+import type { JSX } from 'react'
+import { chosenPhotosLabel } from '@/components/library/uploadTexts.ts'
+import { usePreviewUrl } from '@/hooks/usePreviewUrl.ts'
+
+function SinglePreview({ file }: { file: File }): JSX.Element | null {
+  const previewUrl = usePreviewUrl(file)
+  if (!previewUrl) return null
+  return (
+    <img
+      className="max-h-[35svh] w-full rounded-lg object-contain"
+      src={previewUrl}
+      alt="Aperçu avant envoi"
+    />
+  )
+}
+
+function PreviewThumbnail({ file }: { file: File }): JSX.Element {
+  const previewUrl = usePreviewUrl(file)
+  return (
+    <li className="aspect-square overflow-hidden rounded-md bg-muted">
+      {previewUrl && (
+        <img className="size-full object-cover" src={previewUrl} alt="" decoding="async" />
+      )}
+    </li>
+  )
+}
+
+// Several photos: small squares, so twenty still fit in the panel without hiding its buttons.
+function PreviewGrid({ files }: { files: File[] }): JSX.Element {
+  return (
+    <figure className="flex flex-col gap-2">
+      <ul className="grid max-h-[35svh] grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-5">
+        {files.map((file) => (
+          // A picker never returns the same file twice; two albums may hold the same name.
+          <PreviewThumbnail key={`${file.name}-${file.size}-${file.lastModified}`} file={file} />
+        ))}
+      </ul>
+      <figcaption className="text-sm text-muted-foreground">
+        {chosenPhotosLabel(files.length)}
+      </figcaption>
+    </figure>
+  )
+}
+
+export function UploadPreview({ files }: { files: File[] }): JSX.Element | null {
+  if (files.length === 0) return null
+  if (files.length === 1) return <SinglePreview file={files[0]} />
+  return <PreviewGrid files={files} />
+}
diff --git a/client/src/components/library/uploadTexts.ts b/client/src/components/library/uploadTexts.ts
index 3277f08..09f26ba 100644
--- a/client/src/components/library/uploadTexts.ts
+++ b/client/src/components/library/uploadTexts.ts
@@ -55,3 +55,12 @@ export function pendingProgressLabel(progress: number | null): string {
   if (progress === FULL_PERCENT) return 'Finalisation…'
   return `${progress} %`
 }
+
+export function chosenPhotosLabel(count: number): string {
+  return count === 1 ? '1 photo choisie' : `${count} photos choisies`
+}
+
+// Only reached above the maximum, so the count is always plural.
+export function tooManyPhotosMessage(maxCount: number, chosenCount: number): string {
+  return `${maxCount} photos au plus à la fois : vous en avez choisi ${chosenCount}.`
+}
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index 6633da6..e94547f 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -7,15 +7,15 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 **Ce que l'on peut faire**
 
 - Toucher « Ajouter », en haut de la bibliothèque sur un ordinateur, ou le bouton rond « + » en bas à droite de l'écran sur un téléphone : le panneau « Ajouter une photo » s'ouvre, par le bas de l'écran sur un téléphone, au centre sur un ordinateur.
-- Dans ce panneau, prendre une photo avec l'appareil photo du téléphone (« Prendre une photo ») ou choisir une image déjà enregistrée (« Choisir une image »).
-- Voir un aperçu de la photo choisie avant de l'envoyer.
+- Dans ce panneau, prendre une photo avec l'appareil photo du téléphone (« Prendre une photo ») ou choisir une ou plusieurs images déjà enregistrées (« Choisir une image »).
+- Voir un aperçu de la photo choisie avant de l'envoyer, ou de petites vignettes quand plusieurs photos sont choisies.
 - L'ajouter à sa bibliothèque avec « Ajouter à ma bibliothèque », ou l'envoyer directement à un ami avec « Envoyer à un ami » (voir [partage.md](partage.md#envoyer-une-photo-depuis-son-appareil)).
 - Suivre l'envoi sur la vignette de la photo, qui apparaît aussitôt dans la bibliothèque.
 
 **Règles**
 
 1. R-BIB-01 · Les deux boutons restent désactivés tant qu'aucune photo n'est choisie.
-2. R-BIB-02 · Une seule photo est ajoutée à la fois. Choisir une nouvelle photo remplace la précédente dans le panneau.
+2. R-BIB-02 · Remplacée : plusieurs photos peuvent être ajoutées d'un coup (R-BIB-60).
 3. R-BIB-03 · Formats acceptés : JPEG, PNG et WebP. Seuls ces formats peuvent être choisis ; le téléphone convertit lui-même une photo prise avec l'appareil photo. Tout autre format (GIF, HEIC, vidéo…) est refusé.
 4. R-BIB-04 · Une photo pèse au plus 10 Mo.
 5. R-BIB-05 · Le fichier doit être une image lisible ; un fichier abîmé ou déguisé en image est refusé.
@@ -37,30 +37,39 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 21. R-BIB-58 · Quitter la bibliothèque pour une autre page de l'application n'interrompt pas les envois, qui continuent un par un ; les vignettes grisées sont de nouveau là au retour. Choisir d'autres photos entre-temps les met en attente derrière les premières. Fermer l'application ou recharger la page interrompt ceux qui ne sont pas terminés.
 22. R-BIB-59 · Un lecteur d'écran annonce le nombre de photos en cours d'envoi chaque fois qu'il change.
 23. R-BIB-65 · Quand le panneau « Ajouter une photo » se ferme, ou le panneau d'envoi ouvert depuis lui avec « Envoyer à un ami », la navigation au clavier reprend sur le bouton « Ajouter » affiché : celui de l'en-tête sur un ordinateur, le bouton rond « + » sur un téléphone (qui réapparaît s'il s'était effacé), même si le panneau avait été ouvert depuis une bibliothèque vide.
+24. R-BIB-60 · « Choisir une image » permet de choisir jusqu'à 20 photos d'un coup ; « Prendre une photo » en prend une à la fois. Choisir de nouveau remplace les photos choisies dans le panneau.
+25. R-BIB-61 · Au-delà de 20 photos choisies d'un coup, aucune n'est gardée et un message demande d'en choisir moins.
+26. R-BIB-62 · Chaque photo choisie a sa propre vignette grisée. Une photo refusée n'arrête pas les suivantes : sa vignette disparaît, sa raison s'affiche, et le message de fin compte les photos ajoutées et refusées.
 
 **Messages affichés**
 
-| Situation                       | Message                                                                                                           |
-| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
-| En-tête du panneau              | « Ajouter une photo » — « Ajoutez-la à votre bibliothèque ou envoyez-la directement à un ami. »                   |
-| Aperçu                          | Image décrite comme « Aperçu avant envoi »                                                                        |
-| Envoi en attente                | « En attente », sur la vignette grisée (la barre vide seule sur un téléphone)                                     |
-| Envoi en cours                  | « 42 % » et une barre de progression, sur la vignette grisée                                                      |
-| Photo en préparation            | « Finalisation… », sur la vignette grisée (« 100 % » sur un téléphone)                                            |
-| Annonce du lecteur d'écran      | « Envoi d'une photo en cours. » ou « Envoi de 3 photos en cours. »                                                |
-| Photo ajoutée                   | « Photo ajoutée à votre bibliothèque. », dans une courte notification en bas de l'écran qui disparaît d'elle-même |
-| Plusieurs photos ajoutées       | « 3 photos ajoutées à votre bibliothèque. », dans la même notification, une fois la dernière envoyée              |
-| Photo refusée                   | La raison (voir ci-dessous) et le nom du fichier, dans une notification                                           |
-| Aucun fichier reçu              | « Prenez ou choisissez une photo. »                                                                               |
-| Plusieurs fichiers d'un coup    | « Envoi invalide : une seule photo à la fois. »                                                                   |
-| Format refusé                   | « Format non pris en charge : JPEG, PNG ou WebP uniquement. »                                                     |
-| Fichier trop lourd              | « La photo est trop lourde (10 Mo maximum). »                                                                     |
-| Fichier illisible               | « Ce fichier n'est pas une image lisible. »                                                                       |
-| Photo déjà dans la bibliothèque | « Cette photo est déjà dans votre bibliothèque, ou attend d'être découverte. »                                    |
+| Situation                       | Message                                                                                                               |
+| ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
+| En-tête du panneau              | « Ajouter une photo » — « Ajoutez-en une ou plusieurs à votre bibliothèque, ou envoyez-en une directement à un ami. » |
+| Aperçu                          | Image décrite comme « Aperçu avant envoi »                                                                            |
+| Aperçu de plusieurs photos      | De petites vignettes et « 3 photos choisies »                                                                         |
+| Trop de photos choisies         | « 20 photos au plus à la fois : vous en avez choisi 25. »                                                             |
+| Plusieurs photos choisies       | « Pour envoyer à un ami, choisissez une seule photo. », sous « Envoyer à un ami » désactivé                           |
+| Envoi en attente                | « En attente », sur la vignette grisée (la barre vide seule sur un téléphone)                                         |
+| Envoi en cours                  | « 42 % » et une barre de progression, sur la vignette grisée                                                          |
+| Photo en préparation            | « Finalisation… », sur la vignette grisée (« 100 % » sur un téléphone)                                                |
+| Annonce du lecteur d'écran      | « Envoi d'une photo en cours. » ou « Envoi de 3 photos en cours. »                                                    |
+| Photo ajoutée                   | « Photo ajoutée à votre bibliothèque. », dans une courte notification en bas de l'écran qui disparaît d'elle-même     |
+| Plusieurs photos ajoutées       | « 3 photos ajoutées à votre bibliothèque. », dans la même notification, une fois la dernière envoyée                  |
+| Certaines photos refusées       | « 2 photos ajoutées à votre bibliothèque, 1 refusée. », en avertissement                                              |
+| Toutes les photos refusées      | « Aucune photo ajoutée, 3 refusées. », en erreur                                                                      |
+| Photo refusée                   | La raison (voir ci-dessous) et le nom du fichier, dans une notification                                               |
+| Aucun fichier reçu              | « Prenez ou choisissez une photo. »                                                                                   |
+| Plusieurs fichiers d'un coup    | « Envoi invalide : une seule photo à la fois. »                                                                       |
+| Format refusé                   | « Format non pris en charge : JPEG, PNG ou WebP uniquement. »                                                         |
+| Fichier trop lourd              | « La photo est trop lourde (10 Mo maximum). »                                                                         |
+| Fichier illisible               | « Ce fichier n'est pas une image lisible. »                                                                           |
+| Photo déjà dans la bibliothèque | « Cette photo est déjà dans votre bibliothèque, ou attend d'être découverte. »                                        |
 
 **Ce qui n'est pas possible**
 
-- Ajouter plusieurs photos en une fois, ou des vidéos.
+- Ajouter plus de 20 photos d'un coup, ou des vidéos.
+- Envoyer plusieurs photos à un ami en une fois (voir [partage.md](partage.md#envoyer-une-photo-depuis-son-appareil)).
 - Ajouter une légende, un titre ou un lieu à une photo.
 - Retoucher, recadrer ou faire pivoter une photo dans l'application.
 - Récupérer le fichier d'origine en pleine résolution : seule la version préparée est conservée.
diff --git a/docs/produit/partage.md b/docs/produit/partage.md
index 450d5cb..865dfbd 100644
--- a/docs/produit/partage.md
+++ b/docs/produit/partage.md
@@ -86,6 +86,7 @@ Ceux du panneau d'envoi (voir [Choisir à qui envoyer](#choisir-à-qui-envoyer))
 2. R-PAR-21 · Les règles d'ajout s'appliquent comme pour sa propre bibliothèque : formats JPEG, PNG ou WebP, 10 Mo au plus, image lisible, photo préparée pour l'affichage et informations cachées retirées (voir [bibliotheque.md](bibliotheque.md#ajouter-une-photo), R-BIB-03 à R-BIB-09). Les messages d'erreur sont les mêmes.
 3. R-PAR-22 · « Envoyer à un ami » ferme le panneau « Ajouter une photo » et ouvre le panneau d'envoi avec la photo choisie. Après un envoi réussi, il se ferme ; le fermer sans envoyer abandonne la photo.
 4. R-PAR-23 · La notification « Photo ajoutée à votre bibliothèque. » et la vignette grisée de l'envoi en cours ne concernent que l'ajout à sa bibliothèque ; l'envoi à des amis se confirme par sa propre notification (« Envoyée à … »).
+5. R-PAR-24 · « Envoyer à un ami » envoie une seule photo : quand plusieurs photos sont choisies, le bouton reste désactivé et le panneau demande d'en choisir une seule. Chaque photo envoyée garde ainsi son propre message.
 
 **Messages affichés**
 
@@ -93,6 +94,7 @@ Ceux du panneau d'envoi (voir [Choisir à qui envoyer](#choisir-à-qui-envoyer))
 
 **Ce qui n'est pas possible**
 
+- Envoyer plusieurs photos à un ami en une fois : les ajouter à sa bibliothèque, puis les envoyer une par une depuis leur menu « … ».
 - Envoyer une photo à un ami et la garder dans sa bibliothèque en une seule action : il faut l'ajouter à sa bibliothèque, puis l'envoyer depuis son menu « … ».
 
 ## Recevoir une photo
~~~~

### Task 2a: Review fixes 1 and 11, labels and inputs in the docs

**Commit:** `docs: name « Choisir des images » and the real inputs`

**Scope:** Product doc and ARCHITECTURE step 1 and `/` row.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 310991a..8f14865 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -27,7 +27,7 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 
 ## Parcours d'une photo
 
-1. Le proche, connecté à son compte, prend ou choisit une photo (`<input type="file" accept="image/*" capture>`).
+1. Le proche, connecté à son compte, prend une photo (`<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment">`) ou en choisit jusqu'à 20 (même `accept`, `multiple`).
 2. Le client envoie l'image en `multipart/form-data` à une route Express ; **Multer** la reçoit en mémoire. L'envoi passe par `XMLHttpRequest` plutôt que `fetch` : seul `upload.onprogress` donne la progression, affichée sur une vignette grisée en tête de la bibliothèque. Les photos partent une par une, dans une file d'attente côté client (`upload/uploadQueue.ts`) tenue par `UploadsProvider`, monté au-dessus des routes comme `CollectionsProvider` : quitter la bibliothèque n'arrête pas la file et ses vignettes reviennent au retour. La page ouverte reçoit chaque photo envoyée par un écouteur (`usePhotoUploads`) ; le rangement dans une collection se fait dans la file, page ouverte ou non.
 3. Le serveur vérifie la session (cookie `ff_session`, voir [Authentification](#authentification)) et le fichier (10 Mo max, JPEG/PNG/WebP), calcule le **SHA-256** des octets reçus et refuse un fichier déjà présent dans la bibliothèque du compte, photos en attente d'ouverture comprises (`409 PHOTO_DUPLICATE`, sans appeler Sharp ni Cloudinary), puis le **décode et le réencode avec Sharp** : JPEG de 1920 px max, orientation EXIF appliquée, métadonnées (GPS compris) supprimées. Le type déclaré par le navigateur n'est pas fiable : c'est le décodage par Sharp qui valide vraiment l'image.
 4. L'image réencodée est envoyée à **Cloudinary**, dans le dossier `familyframe`.
@@ -43,15 +43,15 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 
 ## Pages
 
-| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
-| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
-| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
-| `/`                  | bibliothèque, consacrée aux photos (les amis sont sur `/friends`) : en tête « Bibliothèque », le nombre de photos (« Plus de N photos » tant que des pages restent), « Ajouter », « Mode cadre » et le choix vignettes/liste (`LibraryHeader`) ; sous `md`, « Ajouter » devient un bouton flottant en bas à droite (`AddPhotoFab`) et « Mode cadre » laisse la place à l'onglet « Cadre » ; « Ajouter » ouvre le panneau « Ajouter une photo » (`AddPhotoPanel`, feuille par le bas sur mobile, fenêtre au centre sur ordinateur, comme le panneau d'envoi : `ResponsivePanel`) : « Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui ferme le panneau et ouvre celui de l'envoi, pour l'ami seulement ; puis, quand des photos reçues attendent, l'annonce compacte « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la rangée de collections « Toutes », « Noël »…, « Nouvelle collection » (`components/collections/CollectionChips`, des liens `/?collection=<id>` qui défilent de côté : retour et rechargement gardent la collection ; `useSelectedCollection` la retrouve dans la liste, « Cette collection n'existe plus. » sinon ; la collection affichée a son nom et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer » (`SelectedCollectionBar`, retour à `/` après suppression)), puis les photos du compte ou de la collection choisie (`usePhotoLibrary` passe `collectionId` à `GET /api/photos` et recharge la collection sur `collections:changed` ; une photo ajoutée depuis une collection y est rangée, `useLibraryUpload`) en vignettes ou en liste (choix mémorisé par appareil ; vide : « Ajouter une photo »), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/` ; `collection` reste dans l'adresse et la visionneuse ne parcourt que les photos affichées) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Lancer la radio », « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
-| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour, d'une de ses collections ou d'une radio (`/frame?radio=<id>`), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; tant qu'une radio joue, « Photos » la montre en tête, cochée (« Radio ») ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
-| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
-| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et l'onglet « Compte » du téléphone : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
-| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
+| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
+| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
+| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
+| `/`                  | bibliothèque, consacrée aux photos (les amis sont sur `/friends`) : en tête « Bibliothèque », le nombre de photos (« Plus de N photos » tant que des pages restent), « Ajouter », « Mode cadre » et le choix vignettes/liste (`LibraryHeader`) ; sous `md`, « Ajouter » devient un bouton flottant en bas à droite (`AddPhotoFab`) et « Mode cadre » laisse la place à l'onglet « Cadre » ; « Ajouter » ouvre le panneau « Ajouter une photo » (`AddPhotoPanel`, feuille par le bas sur mobile, fenêtre au centre sur ordinateur, comme le panneau d'envoi : `ResponsivePanel`) : « Prendre une photo » ou « Choisir des images » (jusqu'à 20 ; JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui ferme le panneau et ouvre celui de l'envoi, pour l'ami seulement ; puis, quand des photos reçues attendent, l'annonce compacte « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la rangée de collections « Toutes », « Noël »…, « Nouvelle collection » (`components/collections/CollectionChips`, des liens `/?collection=<id>` qui défilent de côté : retour et rechargement gardent la collection ; `useSelectedCollection` la retrouve dans la liste, « Cette collection n'existe plus. » sinon ; la collection affichée a son nom et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer » (`SelectedCollectionBar`, retour à `/` après suppression)), puis les photos du compte ou de la collection choisie (`usePhotoLibrary` passe `collectionId` à `GET /api/photos` et recharge la collection sur `collections:changed` ; une photo ajoutée depuis une collection y est rangée, `useLibraryUpload`) en vignettes ou en liste (choix mémorisé par appareil ; vide : « Ajouter une photo »), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/` ; `collection` reste dans l'adresse et la visionneuse ne parcourt que les photos affichées) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Lancer la radio », « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
+| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour, d'une de ses collections ou d'une radio (`/frame?radio=<id>`), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; tant qu'une radio joue, « Photos » la montre en tête, cochée (« Radio ») ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
+| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
+| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et l'onglet « Compte » du téléphone : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
+| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
 
 Visionneuse : l'adresse `/?photo=<id>` ouvre la photo, un lien la partage. Ouvrir depuis la bibliothèque ajoute une entrée d'historique, passer d'une photo à l'autre la remplace, et fermer revient en arrière : le bouton retour d'Android ferme la visionneuse. Près de la fin des photos chargées, la page suivante se charge. Une photo supprimée pendant qu'on la regarde laisse sa place à la suivante (la précédente si c'était la plus ancienne), et la visionneuse se ferme quand il n'en reste aucune ; un lien vers une photo inconnue charge les pages jusqu'à la trouver, puis ferme s'il n'y en a plus. « Mode cadre » remplace l'entrée de la visionneuse (ou s'ajoute au-dessus de la bibliothèque depuis son en-tête) : quitter le cadre ramène une seule visionneuse, et le retour arrière la bibliothèque. Le lien « Cadre » de la barre ajoute une entrée d'historique ordinaire : c'est aussi l'adresse qu'un cadre ouvre au démarrage.
 
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index e94547f..cb7dbcf 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -7,7 +7,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 **Ce que l'on peut faire**
 
 - Toucher « Ajouter », en haut de la bibliothèque sur un ordinateur, ou le bouton rond « + » en bas à droite de l'écran sur un téléphone : le panneau « Ajouter une photo » s'ouvre, par le bas de l'écran sur un téléphone, au centre sur un ordinateur.
-- Dans ce panneau, prendre une photo avec l'appareil photo du téléphone (« Prendre une photo ») ou choisir une ou plusieurs images déjà enregistrées (« Choisir une image »).
+- Dans ce panneau, prendre une photo avec l'appareil photo du téléphone (« Prendre une photo ») ou choisir une ou plusieurs images déjà enregistrées (« Choisir des images »).
 - Voir un aperçu de la photo choisie avant de l'envoyer, ou de petites vignettes quand plusieurs photos sont choisies.
 - L'ajouter à sa bibliothèque avec « Ajouter à ma bibliothèque », ou l'envoyer directement à un ami avec « Envoyer à un ami » (voir [partage.md](partage.md#envoyer-une-photo-depuis-son-appareil)).
 - Suivre l'envoi sur la vignette de la photo, qui apparaît aussitôt dans la bibliothèque.
@@ -37,7 +37,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 21. R-BIB-58 · Quitter la bibliothèque pour une autre page de l'application n'interrompt pas les envois, qui continuent un par un ; les vignettes grisées sont de nouveau là au retour. Choisir d'autres photos entre-temps les met en attente derrière les premières. Fermer l'application ou recharger la page interrompt ceux qui ne sont pas terminés.
 22. R-BIB-59 · Un lecteur d'écran annonce le nombre de photos en cours d'envoi chaque fois qu'il change.
 23. R-BIB-65 · Quand le panneau « Ajouter une photo » se ferme, ou le panneau d'envoi ouvert depuis lui avec « Envoyer à un ami », la navigation au clavier reprend sur le bouton « Ajouter » affiché : celui de l'en-tête sur un ordinateur, le bouton rond « + » sur un téléphone (qui réapparaît s'il s'était effacé), même si le panneau avait été ouvert depuis une bibliothèque vide.
-24. R-BIB-60 · « Choisir une image » permet de choisir jusqu'à 20 photos d'un coup ; « Prendre une photo » en prend une à la fois. Choisir de nouveau remplace les photos choisies dans le panneau.
+24. R-BIB-60 · « Choisir des images » permet de choisir jusqu'à 20 photos d'un coup ; « Prendre une photo » en prend une à la fois. Choisir de nouveau remplace les photos choisies dans le panneau.
 25. R-BIB-61 · Au-delà de 20 photos choisies d'un coup, aucune n'est gardée et un message demande d'en choisir moins.
 26. R-BIB-62 · Chaque photo choisie a sa propre vignette grisée. Une photo refusée n'arrête pas les suivantes : sa vignette disparaît, sa raison s'affiche, et le message de fin compte les photos ajoutées et refusées.
 
~~~~

### Task 2b: Step 12 minor M6, same file again

**Commit:** `fix(client): read each file choice once and ignore an empty one`

**Scope:** Spec D19: `input.value = ''`, empty `files` ignored; R-BIB-60.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/components/library/UploadForm.tsx b/client/src/components/library/UploadForm.tsx
index c643b22..909e5ff 100644
--- a/client/src/components/library/UploadForm.tsx
+++ b/client/src/components/library/UploadForm.tsx
@@ -27,6 +27,12 @@ type PickButtonProps = {
   onChange: (event: ChangeEvent<HTMLInputElement>) => void
 }
 
+type FileChoice = {
+  files: File[]
+  tooManyMessage: string
+  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void
+}
+
 type UploadButtonsProps = {
   fileCount: number
   onShare: () => void
@@ -117,18 +123,29 @@ function TooManyAlert({ message }: { message: string }): JSX.Element | null {
   )
 }
 
-export function UploadForm({ onUpload, onShare }: UploadFormProps): JSX.Element {
+// Too many: nothing is kept, so the message never sits next to photos that would be sent.
+// The input is emptied once read, so choosing the same file again still fires change. A picker
+// closed without a choice sends no file on some browsers: the previous choice stays.
+function useFileChoice(): FileChoice {
   const [files, setFiles] = useState<File[]>([])
   const [tooManyMessage, setTooManyMessage] = useState('')
 
-  // Too many: nothing is kept, so the message never sits next to photos that would be sent.
   function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
-    const chosen = Array.from(event.target.files ?? [])
+    const input = event.target
+    const chosen = Array.from(input.files ?? [])
+    input.value = ''
+    if (chosen.length === 0) return
     const isTooMany = chosen.length > MAX_PHOTOS_PER_CHOICE
     setFiles(isTooMany ? [] : chosen)
     setTooManyMessage(isTooMany ? tooManyPhotosMessage(MAX_PHOTOS_PER_CHOICE, chosen.length) : '')
   }
 
+  return { files, tooManyMessage, handleFileChange }
+}
+
+export function UploadForm({ onUpload, onShare }: UploadFormProps): JSX.Element {
+  const { files, tooManyMessage, handleFileChange } = useFileChoice()
+
   function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
     event.preventDefault()
     if (files.length > 0) onUpload(files)
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index cb7dbcf..d075177 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -37,7 +37,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 21. R-BIB-58 · Quitter la bibliothèque pour une autre page de l'application n'interrompt pas les envois, qui continuent un par un ; les vignettes grisées sont de nouveau là au retour. Choisir d'autres photos entre-temps les met en attente derrière les premières. Fermer l'application ou recharger la page interrompt ceux qui ne sont pas terminés.
 22. R-BIB-59 · Un lecteur d'écran annonce le nombre de photos en cours d'envoi chaque fois qu'il change.
 23. R-BIB-65 · Quand le panneau « Ajouter une photo » se ferme, ou le panneau d'envoi ouvert depuis lui avec « Envoyer à un ami », la navigation au clavier reprend sur le bouton « Ajouter » affiché : celui de l'en-tête sur un ordinateur, le bouton rond « + » sur un téléphone (qui réapparaît s'il s'était effacé), même si le panneau avait été ouvert depuis une bibliothèque vide.
-24. R-BIB-60 · « Choisir des images » permet de choisir jusqu'à 20 photos d'un coup ; « Prendre une photo » en prend une à la fois. Choisir de nouveau remplace les photos choisies dans le panneau.
+24. R-BIB-60 · « Choisir des images » permet de choisir jusqu'à 20 photos d'un coup ; « Prendre une photo » en prend une à la fois. Choisir de nouveau remplace les photos choisies dans le panneau. Refermer le sélecteur sans rien choisir garde les photos déjà choisies ; choisir de nouveau la même photo fonctionne.
 25. R-BIB-61 · Au-delà de 20 photos choisies d'un coup, aucune n'est gardée et un message demande d'en choisir moins.
 26. R-BIB-62 · Chaque photo choisie a sa propre vignette grisée. Une photo refusée n'arrête pas les suivantes : sa vignette disparaît, sa raison s'affiche, et le message de fin compte les photos ajoutées et refusées.
 
~~~~

## PR C — `feat/upload-downscale`

### Task 3: Reduce very large photos

**Commit:** `feat(client): reduce very large photos before sending them`

**Scope:** Pure `resizeDecision`, `preparePhoto` (canvas, JPEG 0.92), used by the queue and the device share; R-BIB-63, R-BIB-64, R-PAR-21; ARCHITECTURE.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 8f14865..a531cb2 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -28,7 +28,7 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 ## Parcours d'une photo
 
 1. Le proche, connecté à son compte, prend une photo (`<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment">`) ou en choisit jusqu'à 20 (même `accept`, `multiple`).
-2. Le client envoie l'image en `multipart/form-data` à une route Express ; **Multer** la reçoit en mémoire. L'envoi passe par `XMLHttpRequest` plutôt que `fetch` : seul `upload.onprogress` donne la progression, affichée sur une vignette grisée en tête de la bibliothèque. Les photos partent une par une, dans une file d'attente côté client (`upload/uploadQueue.ts`) tenue par `UploadsProvider`, monté au-dessus des routes comme `CollectionsProvider` : quitter la bibliothèque n'arrête pas la file et ses vignettes reviennent au retour. La page ouverte reçoit chaque photo envoyée par un écouteur (`usePhotoUploads`) ; le rangement dans une collection se fait dans la file, page ouverte ou non.
+2. Le client envoie l'image en `multipart/form-data` à une route Express ; **Multer** la reçoit en mémoire. L'envoi passe par `XMLHttpRequest` plutôt que `fetch` : seul `upload.onprogress` donne la progression, affichée sur une vignette grisée en tête de la bibliothèque. Les photos partent une par une, dans une file d'attente côté client (`upload/uploadQueue.ts`) tenue par `UploadsProvider`, monté au-dessus des routes comme `CollectionsProvider` : quitter la bibliothèque n'arrête pas la file et ses vignettes reviennent au retour. La page ouverte reçoit chaque photo envoyée par un écouteur (`usePhotoUploads`) ; le rangement dans une collection se fait dans la file, page ouverte ou non. Juste avant l'envoi, une photo de plus de 4096 px sur son grand côté ou de plus de 10 Mo est redessinée dans un `canvas` à 4096 px et encodée en JPEG qualité 0,92 (`upload/preparePhoto.ts`, règle pure dans `upload/photoResize.ts`) : un capteur de 48 Mpx dépasse sinon la limite du serveur. Les autres partent intactes ; un fichier que le navigateur ne sait pas décoder (HEIC sur ordinateur) part tel quel, le serveur tranche. L'envoi à un ami depuis l'appareil passe par la même préparation.
 3. Le serveur vérifie la session (cookie `ff_session`, voir [Authentification](#authentification)) et le fichier (10 Mo max, JPEG/PNG/WebP), calcule le **SHA-256** des octets reçus et refuse un fichier déjà présent dans la bibliothèque du compte, photos en attente d'ouverture comprises (`409 PHOTO_DUPLICATE`, sans appeler Sharp ni Cloudinary), puis le **décode et le réencode avec Sharp** : JPEG de 1920 px max, orientation EXIF appliquée, métadonnées (GPS compris) supprimées. Le type déclaré par le navigateur n'est pas fiable : c'est le décodage par Sharp qui valide vraiment l'image.
 4. L'image réencodée est envoyée à **Cloudinary**, dans le dossier `familyframe`.
 5. **Prisma** enregistre dans MongoDB l'URL, l'identifiant Cloudinary, le propriétaire (`ownerId`, le compte connecté), le SHA-256 du fichier reçu et la date. L'index unique `(ownerId, sha256)` est la vraie garantie : deux envois simultanés du même fichier passent la vérification, le second est refusé à l'enregistrement (`409` aussi) et son image Cloudinary est détruite.
diff --git a/client/src/hooks/useShareSending.ts b/client/src/hooks/useShareSending.ts
index ce08273..0169c04 100644
--- a/client/src/hooks/useShareSending.ts
+++ b/client/src/hooks/useShareSending.ts
@@ -11,6 +11,7 @@ import {
 import type { FriendUser } from '@/friendship.ts'
 import type { Photo } from '@/photo.ts'
 import { postDeviceShare, postLibraryShare, type ShareResult } from '@/photosApi.ts'
+import { preparePhoto } from '@/upload/preparePhoto.ts'
 
 export type ShareTarget = { kind: 'library'; photo: Photo } | { kind: 'device'; file: File }
 
@@ -26,6 +27,12 @@ function postShare(target: ShareTarget, friendId: string, message: string): Prom
     : postDeviceShare(target.file, friendId, message)
 }
 
+// Prepared once, before the first friend: each one then gets the same file.
+async function preparedTarget(target: ShareTarget): Promise<ShareTarget> {
+  if (target.kind === 'library') return target
+  return { kind: 'device', file: await preparePhoto(target.file) }
+}
+
 // One friend after the other: a device share uploads the whole file each time. null: the
 // session ended, nothing more can be sent.
 async function shareWithEach(
@@ -59,7 +66,7 @@ export function useShareSending(target: ShareTarget, onSent: () => void): ShareS
   async function sendTo(friends: FriendUser[], message: string): Promise<void> {
     setIsSending(true)
     setError('')
-    const outcomes = await shareWithEach(target, friends, message)
+    const outcomes = await shareWithEach(await preparedTarget(target), friends, message)
     setIsSending(false)
     // The session ended on the server: RequireAuth sends the user to /login.
     if (outcomes === null) {
diff --git a/client/src/upload/photoResize.ts b/client/src/upload/photoResize.ts
new file mode 100644
index 0000000..da7597b
--- /dev/null
+++ b/client/src/upload/photoResize.ts
@@ -0,0 +1,21 @@
+// A 20×30 cm print at 300 dpi needs 3543 px on its long side: 4096 px keeps a margin.
+const MAX_LONG_SIDE = 4096
+// The server's MAX_FILE_SIZE (photos.upload.ts): a heavier file is refused.
+const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
+
+export type ResizeDecision =
+  | { shouldResize: false }
+  | { shouldResize: true; width: number; height: number }
+
+// Pure, so the rule reads on its own: only too large or too heavy photos are redrawn, never
+// enlarged. Too heavy but small enough keeps its size: the JPEG encoding alone makes it lighter.
+export function resizeDecision(width: number, height: number, byteSize: number): ResizeDecision {
+  const longSide = Math.max(width, height)
+  if (longSide <= MAX_LONG_SIDE && byteSize <= MAX_UPLOAD_BYTES) return { shouldResize: false }
+  const scale = Math.min(1, MAX_LONG_SIDE / longSide)
+  return {
+    shouldResize: true,
+    width: Math.round(width * scale),
+    height: Math.round(height * scale),
+  }
+}
diff --git a/client/src/upload/preparePhoto.ts b/client/src/upload/preparePhoto.ts
new file mode 100644
index 0000000..8dec26c
--- /dev/null
+++ b/client/src/upload/preparePhoto.ts
@@ -0,0 +1,45 @@
+import { type ResizeDecision, resizeDecision } from '@/upload/photoResize.ts'
+
+const JPEG_TYPE = 'image/jpeg'
+const JPEG_QUALITY = 0.92
+
+type TargetSize = Extract<ResizeDecision, { shouldResize: true }>
+
+// null: the browser cannot read this file (a HEIC on a computer, a damaged file).
+// from-image: the photo is drawn the right way up, as the phone's sensor saw it turned.
+async function decode(file: File): Promise<ImageBitmap | null> {
+  try {
+    return await createImageBitmap(file, { imageOrientation: 'from-image' })
+  } catch {
+    return null
+  }
+}
+
+function drawAsJpeg(bitmap: ImageBitmap, { width, height }: TargetSize): Promise<Blob | null> {
+  const canvas = document.createElement('canvas')
+  canvas.width = width
+  canvas.height = height
+  const context = canvas.getContext('2d')
+  if (context === null) return Promise.resolve(null)
+  // JPEG has no transparency: white behind it, as the server does for its own copy.
+  context.fillStyle = 'white'
+  context.fillRect(0, 0, width, height)
+  context.drawImage(bitmap, 0, 0, width, height)
+  return new Promise((resolve) => canvas.toBlob(resolve, JPEG_TYPE, JPEG_QUALITY))
+}
+
+function jpegName(fileName: string): string {
+  return `${fileName.replace(/\.[^.]+$/, '')}.jpg`
+}
+
+// The original file whenever it fits the server, so nothing is lost; otherwise a lighter JPEG.
+// A file the browser cannot read goes as it is: the server decides and explains a refusal.
+export async function preparePhoto(file: File): Promise<File> {
+  const bitmap = await decode(file)
+  if (bitmap === null) return file
+  const decision = resizeDecision(bitmap.width, bitmap.height, file.size)
+  const blob = decision.shouldResize ? await drawAsJpeg(bitmap, decision) : null
+  bitmap.close()
+  if (blob === null) return file
+  return new File([blob], jpegName(file.name), { type: JPEG_TYPE })
+}
diff --git a/client/src/upload/uploadQueue.ts b/client/src/upload/uploadQueue.ts
index 4918149..787f67b 100644
--- a/client/src/upload/uploadQueue.ts
+++ b/client/src/upload/uploadQueue.ts
@@ -4,6 +4,7 @@ import { errorMessage } from '@/api.ts'
 import { type UploadTally, uploadSummary } from '@/components/library/uploadTexts.ts'
 import type { Photo } from '@/photo.ts'
 import { postPhoto } from '@/photosApi.ts'
+import { preparePhoto } from '@/upload/preparePhoto.ts'
 
 // collectionId: the view the photo was chosen from, where its tile shows. progress null: still
 // waiting its turn.
@@ -68,9 +69,8 @@ async function uploadOne(
   onUploaded: UploadedHandler,
 ): Promise<UploadOutcome> {
   updateProgress(setPending, upload.id, 0)
-  const result = await postPhoto(upload.file, (percent) =>
-    updateProgress(setPending, upload.id, percent),
-  )
+  const file = await preparePhoto(upload.file)
+  const result = await postPhoto(file, (percent) => updateProgress(setPending, upload.id, percent))
   if (result.status === 'unauthenticated') return result
   if (result.status === 'failed') {
     toast.error(result.message, { description: upload.file.name })
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index d075177..b1bb43a 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -17,7 +17,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 1. R-BIB-01 · Les deux boutons restent désactivés tant qu'aucune photo n'est choisie.
 2. R-BIB-02 · Remplacée : plusieurs photos peuvent être ajoutées d'un coup (R-BIB-60).
 3. R-BIB-03 · Formats acceptés : JPEG, PNG et WebP. Seuls ces formats peuvent être choisis ; le téléphone convertit lui-même une photo prise avec l'appareil photo. Tout autre format (GIF, HEIC, vidéo…) est refusé.
-4. R-BIB-04 · Une photo pèse au plus 10 Mo.
+4. R-BIB-04 · Une photo envoyée pèse au plus 10 Mo. Une photo plus lourde est d'abord réduite sur l'appareil (R-BIB-63) ; si l'appareil ne sait pas la lire, elle part telle quelle et elle est refusée.
 5. R-BIB-05 · Le fichier doit être une image lisible ; un fichier abîmé ou déguisé en image est refusé.
 6. R-BIB-06 · Remplacée : une photo reçue en attente d'être découverte compte aussi (R-BIB-43).
 7. R-BIB-43 · Une photo identique, octet pour octet, à une photo déjà présente dans la bibliothèque, ou reçue d'un ami et en attente d'être découverte, est refusée, qu'elle ait été ajoutée par soi ou reçue d'un ami. Une version retouchée, recadrée ou réenregistrée de la même photo est un autre fichier : elle est acceptée.
@@ -40,6 +40,8 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 24. R-BIB-60 · « Choisir des images » permet de choisir jusqu'à 20 photos d'un coup ; « Prendre une photo » en prend une à la fois. Choisir de nouveau remplace les photos choisies dans le panneau. Refermer le sélecteur sans rien choisir garde les photos déjà choisies ; choisir de nouveau la même photo fonctionne.
 25. R-BIB-61 · Au-delà de 20 photos choisies d'un coup, aucune n'est gardée et un message demande d'en choisir moins.
 26. R-BIB-62 · Chaque photo choisie a sa propre vignette grisée. Une photo refusée n'arrête pas les suivantes : sa vignette disparaît, sa raison s'affiche, et le message de fin compte les photos ajoutées et refusées.
+27. R-BIB-63 · Une très grande photo, de plus de 4096 pixels sur son plus grand côté ou de plus de 10 Mo, est légèrement réduite sur l'appareil avant l'envoi, à 4096 pixels au plus, pour pouvoir être envoyée. Cette réduction garde toujours assez de détail pour un tirage 20×30 cm. Les autres photos partent telles quelles, sans aucune retouche. Il n'y a rien à régler. La photo gardée dans la bibliothèque reste ensuite celle préparée pour l'affichage (R-BIB-08).
+28. R-BIB-64 · Une image que l'appareil ne sait pas lire part telle quelle : l'application l'accepte ou la refuse avec sa raison, comme toute photo.
 
 **Messages affichés**
 
diff --git a/docs/produit/partage.md b/docs/produit/partage.md
index 865dfbd..70aa7a8 100644
--- a/docs/produit/partage.md
+++ b/docs/produit/partage.md
@@ -83,7 +83,7 @@ Ceux du panneau d'envoi (voir [Choisir à qui envoyer](#choisir-à-qui-envoyer))
 **Règles**
 
 1. R-PAR-20 · La photo entre uniquement dans la bibliothèque de l'ami : elle n'est pas ajoutée à celle de l'expéditeur.
-2. R-PAR-21 · Les règles d'ajout s'appliquent comme pour sa propre bibliothèque : formats JPEG, PNG ou WebP, 10 Mo au plus, image lisible, photo préparée pour l'affichage et informations cachées retirées (voir [bibliotheque.md](bibliotheque.md#ajouter-une-photo), R-BIB-03 à R-BIB-09). Les messages d'erreur sont les mêmes.
+2. R-PAR-21 · Les règles d'ajout s'appliquent comme pour sa propre bibliothèque : formats JPEG, PNG ou WebP, 10 Mo au plus (une photo très grande ou plus lourde étant d'abord réduite, R-BIB-63), image lisible, photo préparée pour l'affichage et informations cachées retirées (voir [bibliotheque.md](bibliotheque.md#ajouter-une-photo), R-BIB-03 à R-BIB-09). Les messages d'erreur sont les mêmes.
 3. R-PAR-22 · « Envoyer à un ami » ferme le panneau « Ajouter une photo » et ouvre le panneau d'envoi avec la photo choisie. Après un envoi réussi, il se ferme ; le fermer sans envoyer abandonne la photo.
 4. R-PAR-23 · La notification « Photo ajoutée à votre bibliothèque. » et la vignette grisée de l'envoi en cours ne concernent que l'ajout à sa bibliothèque ; l'envoi à des amis se confirme par sa propre notification (« Envoyée à … »).
 5. R-PAR-24 · « Envoyer à un ami » envoie une seule photo : quand plusieurs photos sont choisies, le bouton reste désactivé et le panneau demande d'en choisir une seule. Chaque photo envoyée garde ainsi son propre message.
~~~~

### Task 3a: Review fixes 7, 8, 10, decoding and canvas memory

**Commit:** `fix(client): resize on older browsers and free each canvas`

**Scope:** `TypeError` retry without options, canvas emptied after `toBlob`, R-BIB-63 and ARCHITECTURE wording.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index a531cb2..c5a1fef 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -28,7 +28,7 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 ## Parcours d'une photo
 
 1. Le proche, connecté à son compte, prend une photo (`<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment">`) ou en choisit jusqu'à 20 (même `accept`, `multiple`).
-2. Le client envoie l'image en `multipart/form-data` à une route Express ; **Multer** la reçoit en mémoire. L'envoi passe par `XMLHttpRequest` plutôt que `fetch` : seul `upload.onprogress` donne la progression, affichée sur une vignette grisée en tête de la bibliothèque. Les photos partent une par une, dans une file d'attente côté client (`upload/uploadQueue.ts`) tenue par `UploadsProvider`, monté au-dessus des routes comme `CollectionsProvider` : quitter la bibliothèque n'arrête pas la file et ses vignettes reviennent au retour. La page ouverte reçoit chaque photo envoyée par un écouteur (`usePhotoUploads`) ; le rangement dans une collection se fait dans la file, page ouverte ou non. Juste avant l'envoi, une photo de plus de 4096 px sur son grand côté ou de plus de 10 Mo est redessinée dans un `canvas` à 4096 px et encodée en JPEG qualité 0,92 (`upload/preparePhoto.ts`, règle pure dans `upload/photoResize.ts`) : un capteur de 48 Mpx dépasse sinon la limite du serveur. Les autres partent intactes ; un fichier que le navigateur ne sait pas décoder (HEIC sur ordinateur) part tel quel, le serveur tranche. L'envoi à un ami depuis l'appareil passe par la même préparation.
+2. Le client envoie l'image en `multipart/form-data` à une route Express ; **Multer** la reçoit en mémoire. L'envoi passe par `XMLHttpRequest` plutôt que `fetch` : seul `upload.onprogress` donne la progression, affichée sur une vignette grisée en tête de la bibliothèque. Les photos partent une par une, dans une file d'attente côté client (`upload/uploadQueue.ts`) tenue par `UploadsProvider`, monté au-dessus des routes comme `CollectionsProvider` : quitter la bibliothèque n'arrête pas la file et ses vignettes reviennent au retour. La page ouverte reçoit chaque photo envoyée par un écouteur (`usePhotoUploads`) ; le rangement dans une collection se fait dans la file, page ouverte ou non. Juste avant l'envoi, une photo de plus de 4096 px sur son grand côté ou de plus de 10 Mo est redessinée dans un `canvas` à 4096 px au plus sur son grand côté (jamais agrandie : une photo de plus de 10 Mo mais plus petite garde sa taille, seul l'encodage l'allège) et encodée en JPEG qualité 0,92 ; `createImageBitmap` est appelé avec `imageOrientation: 'from-image'`, puis sans option si le navigateur refuse l'option (`TypeError`), et le `canvas` est vidé après `toBlob` (mémoire limitée sur iOS) (`upload/preparePhoto.ts`, règle pure dans `upload/photoResize.ts`) : un capteur de 48 Mpx dépasse sinon la limite du serveur. Les autres partent intactes ; un fichier que le navigateur ne sait pas décoder (HEIC sur ordinateur) part tel quel, le serveur tranche. L'envoi à un ami depuis l'appareil passe par la même préparation.
 3. Le serveur vérifie la session (cookie `ff_session`, voir [Authentification](#authentification)) et le fichier (10 Mo max, JPEG/PNG/WebP), calcule le **SHA-256** des octets reçus et refuse un fichier déjà présent dans la bibliothèque du compte, photos en attente d'ouverture comprises (`409 PHOTO_DUPLICATE`, sans appeler Sharp ni Cloudinary), puis le **décode et le réencode avec Sharp** : JPEG de 1920 px max, orientation EXIF appliquée, métadonnées (GPS compris) supprimées. Le type déclaré par le navigateur n'est pas fiable : c'est le décodage par Sharp qui valide vraiment l'image.
 4. L'image réencodée est envoyée à **Cloudinary**, dans le dossier `familyframe`.
 5. **Prisma** enregistre dans MongoDB l'URL, l'identifiant Cloudinary, le propriétaire (`ownerId`, le compte connecté), le SHA-256 du fichier reçu et la date. L'index unique `(ownerId, sha256)` est la vraie garantie : deux envois simultanés du même fichier passent la vérification, le second est refusé à l'enregistrement (`409` aussi) et son image Cloudinary est détruite.
diff --git a/client/src/upload/preparePhoto.ts b/client/src/upload/preparePhoto.ts
index 8dec26c..1158b69 100644
--- a/client/src/upload/preparePhoto.ts
+++ b/client/src/upload/preparePhoto.ts
@@ -5,16 +5,33 @@ const JPEG_QUALITY = 0.92
 
 type TargetSize = Extract<ResizeDecision, { shouldResize: true }>
 
+// from-image: the photo is drawn the right way up, as the phone's sensor saw it turned. Older
+// browsers reject the option itself with a TypeError: they decode without it.
+async function decodeUpright(file: File): Promise<ImageBitmap> {
+  try {
+    return await createImageBitmap(file, { imageOrientation: 'from-image' })
+  } catch (error: unknown) {
+    if (!(error instanceof TypeError)) throw error
+    return createImageBitmap(file)
+  }
+}
+
 // null: the browser cannot read this file (a HEIC on a computer, a damaged file).
-// from-image: the photo is drawn the right way up, as the phone's sensor saw it turned.
 async function decode(file: File): Promise<ImageBitmap | null> {
   try {
-    return await createImageBitmap(file, { imageOrientation: 'from-image' })
+    return await decodeUpright(file)
   } catch {
     return null
   }
 }
 
+// iOS Safari counts every live canvas against a small memory budget: twenty large photos in a
+// row would exhaust it unless each canvas gives its pixels back.
+function releaseCanvas(canvas: HTMLCanvasElement): void {
+  canvas.width = 0
+  canvas.height = 0
+}
+
 function drawAsJpeg(bitmap: ImageBitmap, { width, height }: TargetSize): Promise<Blob | null> {
   const canvas = document.createElement('canvas')
   canvas.width = width
@@ -25,7 +42,16 @@ function drawAsJpeg(bitmap: ImageBitmap, { width, height }: TargetSize): Promise
   context.fillStyle = 'white'
   context.fillRect(0, 0, width, height)
   context.drawImage(bitmap, 0, 0, width, height)
-  return new Promise((resolve) => canvas.toBlob(resolve, JPEG_TYPE, JPEG_QUALITY))
+  return new Promise((resolve) => {
+    canvas.toBlob(
+      (blob) => {
+        releaseCanvas(canvas)
+        resolve(blob)
+      },
+      JPEG_TYPE,
+      JPEG_QUALITY,
+    )
+  })
 }
 
 function jpegName(fileName: string): string {
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index b1bb43a..a1d108a 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -40,7 +40,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 24. R-BIB-60 · « Choisir des images » permet de choisir jusqu'à 20 photos d'un coup ; « Prendre une photo » en prend une à la fois. Choisir de nouveau remplace les photos choisies dans le panneau. Refermer le sélecteur sans rien choisir garde les photos déjà choisies ; choisir de nouveau la même photo fonctionne.
 25. R-BIB-61 · Au-delà de 20 photos choisies d'un coup, aucune n'est gardée et un message demande d'en choisir moins.
 26. R-BIB-62 · Chaque photo choisie a sa propre vignette grisée. Une photo refusée n'arrête pas les suivantes : sa vignette disparaît, sa raison s'affiche, et le message de fin compte les photos ajoutées et refusées.
-27. R-BIB-63 · Une très grande photo, de plus de 4096 pixels sur son plus grand côté ou de plus de 10 Mo, est légèrement réduite sur l'appareil avant l'envoi, à 4096 pixels au plus, pour pouvoir être envoyée. Cette réduction garde toujours assez de détail pour un tirage 20×30 cm. Les autres photos partent telles quelles, sans aucune retouche. Il n'y a rien à régler. La photo gardée dans la bibliothèque reste ensuite celle préparée pour l'affichage (R-BIB-08).
+27. R-BIB-63 · Une très grande photo, de plus de 4096 pixels sur son plus grand côté, est réduite sur l'appareil avant l'envoi, à 4096 pixels sur ce côté, pour pouvoir être envoyée. Une photo de plus de 10 Mo mais moins grande garde sa taille : elle est seulement réenregistrée plus légère. Cette réduction garde toujours assez de détail pour un tirage 20×30 cm. Les autres photos partent telles quelles, sans aucune retouche. Il n'y a rien à régler. La photo gardée dans la bibliothèque reste ensuite celle préparée pour l'affichage (R-BIB-08).
 28. R-BIB-64 · Une image que l'appareil ne sait pas lire part telle quelle : l'application l'accepte ou la refuse avec sa raison, comme toute photo.
 
 **Messages affichés**
~~~~

## Final verification (controller)

- No Bruno run needed for this step (no endpoint change); a regression run of `pnpm test:bruno` against a running API should still show 184 requests green.
- Chrome checklist and real-phone gestures: see the report to the controller.

## Drift Log

- **Order of work:** the spec and this plan were written after the code (the main decisions were fixed by the controller up front) and committed first by reordering the stack with `git cherry-pick`. The diffs above are the cherry-picked commits; blob hashes are unchanged.
- **CRLF incident:** the first Python edits wrote files in text mode on Windows and produced CRLF line endings; normalised before committing, every later script writes with `newline=''`.
- **Function splits (30-line rule):** `LibraryPage` reached 31 then 33 lines (filter and handler moved into `usePhotoUploads`, then the `useAddPanel` hook); `usePhotoUploads` was split into module functions before the queue moved to `uploadQueue.ts`; `AddPhotoPanel` reached 48, 35 then 31 lines (the `useShareHandOver` hook, a props destructure); `UploadForm` reached 34 lines with M6, caught by the final size check and fixed in Task 2b itself (the `useFileChoice` hook).
- **Biome `noArrayIndexKey`:** the preview thumbnails are keyed by `name-size-lastModified`.
- **Cherry-pick conflicts** when the downscale moved on top of the review fixes: the R-BIB rule list (merged, renumbered), ARCHITECTURE step 2 (kept the queue wording, appended the downscale sentences), `usePhotoUploads.ts` (kept the provider version, moved the `preparePhoto` call into `uploadQueue.ts`).
- **Rebase risks with step 13:** `LibraryHeader` gained an `addButtonRef` prop (Task 1b); ARCHITECTURE's long `/` row of the pages table changes (Task 2a), and Biome realigns the whole table.
- **Fresh-context review** (after Task 3), outcome:
  - Fix 1, product doc said « Choisir une image »: Task 2a.
  - Fix 2, queue lost when leaving the library: queue lifted into `UploadsProvider` above the routes (Task 1a). Changes spec D2 and D8 (updated in the spec before it was first committed).
  - Fix 3, in a collection the tile left before the photo was filed: the tile now leaves after the filing (Task 1a, spec D7, open question 3 resolved).
  - Fix 4, the « never both » comment was wrong (tile and photo can show together for a moment): reworded in `settleUpload` (Task 1a).
  - Fix 5, a rejection killed the promise chain: `settleUpload` catches, logs with `console.error` (no file name), toasts the generic message and counts the photo refused (Task 1a).
  - Fix 6, the summary named the last collection for a queue fed from two views: named only when every added photo went to the same collection (Task 1a, spec D9).
  - Fix 7, `createImageBitmap` options rejected with `TypeError` by older browsers: retried without options (Task 3a, spec D13).
  - Fix 8, canvas memory on iOS: width and height set to 0 after `toBlob` (Task 3a, spec D13).
  - Fix 9, `aria-valuenow` of a waiting tile: `undefined` when progress is `null`, so the bar is indeterminate (Task 1a).
  - Fix 10, R-BIB-63 said « légèrement réduite »: reworded, and ARCHITECTURE says a heavy photo under 4096 px is only re-encoded (Task 3a).
  - Fix 11, ARCHITECTURE step 1 showed `accept="image/*"` without `multiple`: the real `accept` list, `capture="environment"`, `multiple` (Task 2a).
  - Won't fix 12, `toReversed()` needs Safari 16+: the client already relies on ES2023-era APIs (spec open question 8).
  - Won't fix 13, the full decode just to read the size: accepted (spec open question 6).
- **Step 12 minors handed over by the stabilisation step:**
  - M5 (Task 1b, spec D18): focus goes to the header's « Ajouter ». Why that target: it is always rendered (the empty library's « Ajouter une photo » unmounts with the first tile, and the send panel is opened from an add panel already closed, so Radix has no trigger to return to), and it is where the next photo is added from. An `isHandingOver` ref keeps it from stealing focus from the send panel while the panels swap.
  - M6 (Task 2b, spec D19): `input.value = ''` after reading, an empty `files` is ignored.
- **Rebase on step 13** (`feat/library-surface`, bd9e332), controller's go after step 13 landed:
  - **Rules renumbered:** step 13 uses R-BIB-48 to R-BIB-53, so step 14's R-BIB-48 to R-BIB-59 became R-BIB-54 to R-BIB-65, in the product docs, ARCHITECTURE, this plan, the spec and the commit messages. Done first, as a renumbered copy of the stack on its old base (step 14's commits only ever referred to their own rules above R-BIB-47), so the rebase itself only met real conflicts.
  - **Conflicts:** the rule list of `bibliotheque.md` at every commit (step 13's R-BIB-48 kept before step 14's rules, lists renumbered), its first bullet (step 13's floating « + » wording kept, the multi-photo wording added), ARCHITECTURE's pages table (step 13's row kept, « Choisir des images (jusqu'à 20 ; » applied to it), `LibrarySection` (step 13's plain section, the live line added), `UploadForm` (step 13 dropped `pointer-coarse:h-11`: the Button has it built in now, so the multi-photo buttons drop it too), `LibraryHeader` (step 13's `hidden md:inline-flex`, the ref added).
  - **Task 1, pending tiles on the new surface** (spec D3): `bg-muted` placeholders, a dark pill for the grid's label, theme colours for the list row; sizes still come from `PhotoGrid` and `PhotoList`.
  - **Task 1b, focus to the shown « Ajouter »** (spec D18): two refs and `getClientRects()`. `useHideOnScrollDown` takes the floating button's ref from the page. The floating button moved into `LibraryOverlays` and the « Toutes » chip ref into `LibraryContent`, its only user, to keep `LibraryPage` within 30 lines. R-BIB-65 says which button gets focus. Commit message updated.
  - **A first rebase attempt was aborted:** a resolution script stopped on an unexpected doc conflict while the command chain went on, so a broken commit (conflict markers, a cut JSX line) was recorded. The rebase was aborted and resumed from the last good commit (Task 1b) with a script that verifies markers, check, typecheck and function sizes before each `--continue`.
- **Second rebase, on step 13's final tip** (`feat/library-surface`, 2af118f: bd9e332 plus 11 commits, the phone grid, review fixes, the compact tile ⋯ and its long press). No new R-BIB number on step 13's side: R-BIB-54 to R-BIB-65 stay.
  - **Conflicts:** `PhotoGrid` and `PhotoList` (step 13's classes without padding kept, `{children}` added), `AddPhotoFab` (step 13's `useLiftToasts(!isHidden)` kept next to the `buttonRef` passed to `useHideOnScrollDown`), the messages table of `bibliotheque.md` (step 13's table kept at each commit, the two phone mentions applied to it).
  - **Task 1, pending tiles in the three phone columns** (spec D3): at 360 px a tile is about 100 px wide and « Finalisation… » no longer fit. The pill is tighter on a phone and shows only the percentage (`pendingShortLabel`), the whole label from `sm`; the tile takes step 13's corners. R-BIB-54 and the messages table say what a phone shows.
  - **Known overrun:** `LibraryPage` measures 33 lines by the size script at Tasks 1 and 1a (step 13's own version measures 31); Task 1b brings it back under the limit. Left as is rather than reshaping the page twice.
