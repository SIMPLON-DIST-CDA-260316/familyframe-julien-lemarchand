---
plan: photo-mail
status: draft
spec: docs/superpowers/specs/2026-11-25-photo-mail-design.md
branch: feat/mail-server (PR A), feat/mail-message (PR B), feat/mail-library (PR C), feat/mail-frame (PR D)
worktree: false
tasks_total: 7
tasks_done: 0
current_task: null
last_commit: null
last_updated: 2026-11-25
---

# Photo Mail (Step 9) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Working agreement (mandatory):** keep this plan in sync with reality. Check a step only when it is finished and its gate is green. Append every divergence to the Drift Log. Update the frontmatter (`tasks_done`, `current_task`, `last_commit`, `last_updated`) at each task boundary. When a drift produces a durable correction (path, command, signature, decision), amend the affected task block in place and log the amendment: implementers only receive their own task block. Never check a partial step; never delete a finished step or a drift entry. Under subagent-driven development, `.superpowers/sdd/progress.md` is the runtime authority; the frontmatter mirrors it.

**Goal:** A friend's photo can carry a message of 200 characters at most. Received photos arrive unopened: the library shows a card « Vous avez N nouvelles photos » with « Découvrir », the frame a white pill with the same words; a full-screen reveal shows them one by one, oldest first, with sender, date and message; each one joins the library and the slideshow at its reception date as soon as it is shown. The message stays under « Envoyée par » in the viewer, the slideshow caption and the polaroid band.

**Architecture:** `Photo` gains `message String?` and `isOpened Boolean?` (unset on legacy photos, which count as opened: no migration, `db:push` without seed). `photos.service.ts` first splits into `photos.store.ts` and `photos.share.ts` (refactor). `parseMessage` (`photos.input.ts`) validates the message before the friend check; `MESSAGE_INVALID` 400. Uploads write `isOpened: true`, shares `false`; `findPage` filters `OR: [{ isOpened: true }, { isOpened: { isSet: false } }]`. New `GET /api/photos/unopened` (`{ photos }`) and `POST /api/photos/:id/open` (atomic `update` on `{ id, ownerId }`, idempotent, 404 otherwise). Shares emit `photo:received`, opening emits `photo:opened`. Client: `ShareMessageField`, `quotedMessage`; optional socket handlers, ordered `withNewPhoto`, `photoMailApi.ts`, `usePhotoMail` (own socket), `useMailReveal`, `components/mail/*`, `FrameNotices` + `WaitingPhotosBadge`. Four PRs in a `gh stack`.

**Tech Stack:** Node 24, TypeScript 7, Express 5, Socket.IO 4, Prisma 6.19 (MongoDB), Vitest 5, Biome 2, Bruno CLI 4.2.0, React 19.3 (`useEffectEvent`) + Radix Dialog (shadcn `dialog`) + lucide-react (`MailIcon`), Tailwind 4, `gh stack`.

## Global Constraints

- **No new dependency**, server or client: `MailIcon` comes from the installed `lucide-react`; the reveal uses the installed `radix-ui` Dialog primitive (as `PhotoViewer` does). **Never run `shadcn` or any CLI that adds dependencies.** **Prisma stays on v6** (v7+ has no MongoDB support).
- **No client test runner:** the client has none; do not add one. Client tasks are verified by `pnpm typecheck`, `pnpm build`, `pnpm check` and the manual checks of the final verification.
- **Error code (exact, from the spec):** `MESSAGE_INVALID` → `400`, client message « Le message doit faire 200 caractères au plus. ». Reused: `PHOTO_NOT_FOUND` (404), `UNAUTHENTICATED`. **Error codes are synced server and client in the same commit** (`server/src/types.ts`, `server/src/errors/error-handler.ts` and its test, `client/src/api.ts`).
- **DTO (exact):** `Photo = { id, url, thumbnailUrl, createdAt, senderName, message }`, `message` = the text or `null`; `isOpened` stays on the server. `UnopenedPhotos = { photos: Photo[] }`. Socket events: `photo:new` (own upload), `photo:received` (share, recipient's room), `photo:opened` (owner's room), `photo:deleted`.
- **Log events (exact):** `photo.shared` gains `hasMessage: boolean` (never the text); new `photo.opened` (info: `photoId`, `userId`). Logs carry **ids only**, never `console`.
- **UI text (French, exact):** every string is written out in the task that adds it.
- **No `vi.mock`:** fakes are `vi.fn()` passed through the factory, in a per-file `makeDeps()`. Vitest imports are explicit.
- **TypeScript (AGENTS.md):** no `as` casts (not even `as const`), explicit return types on exported functions, literal unions rather than TS `enum`.
- **Code rules (`.claude/rules/`):** comment why, never what; no file-summary comments; name callback params after the item; no magic numbers in `src` code; **every function at most 30 lines** (components and hooks included); **every file at most 300 lines, test files included**; max 5 params; no flag parameters; booleans prefixed `is`/`has`/`should`; catch errors as `unknown`.
- **Files near the limits (measured in the clone):** `photos.service.share.test.ts` ends at 262 lines (add nothing more to it); `photos.service.ts` 147, `photos.controller.ts` 133, `photos.repository.ts` 132, `photos.share.ts` 118. `connectPhotoFeed` (`usePhotoFeed.ts`) ends at 29 lines: the `photo:opened` handler reuses `createPhotoAdder`.
- Server imports use the `.js` extension; client imports use the `@/` alias with the `.ts`/`.tsx` extension.
- **Language:** code, comments, logs and commits in English; UI text, Bruno `docs` blocks, README, ARCHITECTURE and `docs/produit/` in French.
- **Every business rule change updates its colocated `*.test.ts` in the same commit; every endpoint change updates `server/bruno/photos/<endpoint>/` in the same commit; every user-visible change updates `docs/produit/` in the same commit.** Product rule ids are never reused: a changed rule is kept and marked « Remplacée », the new one takes the next free number (R-PAR-48, R-BIB-42, R-CAD-71 are the next free ones at the start). **The Bruno collection passes twice in a row.**
- **Test API for gates:** the author's dev API holds port 3000 and Vite holds 5180: **never start, stop or touch anything on ports 3000 or 5180.** From `server/`, start the test API in its **own background command**: `PORT=3002 npx tsx --env-file-if-exists=.env src/server.ts` (never combine it in one shell command with `cat`, `grep`, `sed` or another reader word: a hook blocks commands containing `.env` plus a reader word). It does not watch files: restart it after each code change. Wait for the `server.started` log line.
- **Bruno gate command** (from `server/bruno/`): `pnpm dlx @usebruno/cli@4.2.0 run . -r --env Local --disable-cookies --env-var baseUrl=http://localhost:3002`. **The CLI prints `Tests 0/0`** (it does not count post-response `test()` calls): check requests and assertions; the `test()` counts below are read from the files (requests = `.bru` files except `folder.bru`, `collection.bru` and `environments/`; assertions = non-empty lines inside `assert {}` blocks).
- **Stopping the test API:** in PowerShell, `$listener = Get-NetTCPConnection -LocalPort 3002 -State Listen | Select-Object -First 1 -ExpandProperty OwningProcess`, check `(Get-CimInstance Win32_Process -Filter "ProcessId=$listener").CommandLine` does **not** contain `worktrees`, then `Stop-Process -Id $listener`. Kill only that process.
- **Database:** `pnpm db:push` is **controller only** (checkpoints C1, C2), and **nobody runs `pnpm db:seed`**: it wipes the shared dev MongoDB. Implementers only run `pnpm --filter server db:generate`. If `prisma generate` fails with `EPERM`, an API process holds the Prisma engine file: stop your own test API on 3002 and retry; if it still fails, report it to the controller, never stop a process you did not start. **Bruno for Tasks 2 and 3 needs the controller's `db:push` first**: without the new field, Prisma rejects the `create`.
- **Cloudinary:** Bruno `photos/create` and `share/08` upload to the real Cloudinary account of `server/.env`, as today; the run destroys what it creates.
- **Gates:** every commit passes `pnpm check` and `pnpm typecheck`. Every task ends green on `pnpm test`, `pnpm build`, and (Tasks 2 and 3) the Bruno gate command against the test API, twice.
- **Commits:** atomic, one concern each; Conventional Commits in English, message written to a file in the scratchpad with the Write tool and passed with `git commit -F <file>`. Every message ends with these two lines, after a blank line:
  ```
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Hm8u1MNisEcmacs5tNKshr
  ```
  A failing hook means no commit: fix (`pnpm check:fix`, then re-add only the task's files) and commit again. Never `--no-verify`.
- **Never read or print any `.env` file.**
- **Biome formats Markdown:** run `pnpm check:fix` after a docs edit (tables realign, list numbers follow the order). The docs blocks below are shown before formatting.
- **Line endings:** LF.
- **Stack:** the controller creates branches with `gh stack`; implementers never switch branches, push or run `gh stack`. Never `gh pr merge`. **Docker files are the author's work: never touch, stage or commit `Dockerfile`, `client/Dockerfile`, `server/Dockerfile`, `server/.dockerignore`, `NOTE.md` or `.vscode/settings.json`** (untracked or modified in the author's tree).

## Choices made while planning (not in the spec, or resolving a conflict with the code or the rules)

- **Refactor first (Task 1):** `photos.service.ts` is 290 lines at the base; the two new methods would push it over 300. The share and the received-file steps move out unchanged (`photos.share.ts`, `photos.store.ts`); the service keeps its public API (`createPhotosService`) and wires them.
- **The message is checked after the file and before the friend** on the device share (`PHOTO_MISSING`/format first, as today, then `MESSAGE_INVALID`, then `NOT_FRIENDS`). Bruno `share/14-16` run after `13` (friendship ended) and still answer 400: proof that the message comes first.
- **`openOwned` uses `update` + P2025 → `null`** rather than `updateMany` + `findFirst`: one round trip, returns the record with `senderName`, and is naturally idempotent (setting `true` again matches).
- **`GET /unopened` is registered right after `GET /`**, before `/:id` routes, so `unopened` is never read as an id.
- **Bruno order:** `photos/` folders become create (1), list (2), share (3), unopened (4, new), open (5, new), delete (6, was 4). `open/01` (member opens the admin's copy) runs before `open/03` (admin opens it), so it still exists unopened.
- **Client message limit `MAX_MESSAGE_LENGTH = 200` duplicated in `ShareMessageField.tsx`** with a comment pointing at the server constant, as the account rules do (`accountRules.ts`).
- **Blank message omitted client side** (`postLibraryShare` leaves `message` out of the JSON, `postDeviceShare` out of the form data), so the server does not even see blanks from the app.
- **`usePhotoMail` keeps its own socket** (spec open question 8); `connectPhotoSocket` handlers become optional so the feed, the library and the mail each listen to their events only.
- **`useOpenOnShow` (in `MailRevealDialog.tsx`)** posts the open in a `useEffect` keyed on the photo id, the callback read through `useEffectEvent`: no stale closure, no re-open on re-render. Strict Mode in dev posts twice; harmless (idempotent).
- **`FramePage` splits into `FrameScreen` + page** to stay under 30 lines with the mail and the reveal; the reveal is a `role="dialog"`, so `isOverlayOpen()` (`useIdle.ts`) keeps the frame active while it is open: the slideshow pauses, as for any other dialog, with no new flag.
- **Docs edits in the order of the tasks:** each task's ARCHITECTURE/README/product edits are in its own block below (the clone put the ARCHITECTURE and `cadre.md` edits of Tasks 1-6 in its last commit; the plan splits them back per task).

### Verified behavior

- **Every task's code was written and run in a throwaway clone while planning** (from `85e5e9e`, one commit per planned commit). Server: `tsc --noEmit` and `vitest run` measured per task (below). Client: `tsc -b` and `vite build` green on the last commit; biome clean on the whole tree (296 files). Every function measured at 30 lines or fewer. **Bruno counts are read from the files: the API was not started while planning.** The diffs below are `git diff` output from that clone.
- **Prisma 6.19.3 on MongoDB 7.0.24 (throwaway replica set):** `{ isOpened: { not: false } }` and `NOT: { isOpened: false }` do **not** return documents without the field; `OR: [{ isOpened: true }, { isOpened: { isSet: false } }]` returns both `true` and unset; `{ isOpened: false }` returns only `false`. An unset `message` reads back as `null`.
- **Baselines (on `feat/settings-frame-card` at 85e5e9e):** `pnpm test` → `Test Files  19 passed (19)`, `Tests  219 passed (219)`; Bruno: 112 requests, 242 assertions, 44 `test()` calls.
- **Expected after each server task:** Task 1: 219 / 19 (refactor). Task 2: `Tests  234 passed (234)`, `Test Files  20 passed (20)`; Bruno 115 requests, 250 assertions, 44 `test()`. Task 3: `Tests  239 passed (239)`, `Test Files  21 passed (21)`; Bruno 122 requests, 266 assertions, 52 `test()`.
- **ObjectId strings sort like their creation time**: `withNewPhoto` inserting by id descending places an opened photo at its reception date.

## File Map

| File | Task | Responsibility |
| --- | --- | --- |
| `server/src/features/photos/photos.store.ts`, `photos.share.ts` | 1, 2, 3 | received-file steps; the two shares (message, `isOpened: false`) |
| `server/prisma/schema.prisma` | 2, 3 | `Photo.message String?`, `Photo.isOpened Boolean?` |
| `server/src/features/photos/photos.input.ts` | 2 | `MAX_MESSAGE_LENGTH`, `parseMessage` |
| `server/src/features/photos/photos.repository.ts` | 2, 3 | `message`, `isOpened`, opened filter, `findUnopened`, `openOwned` |
| `server/src/features/photos/photos.service.ts` | 1, 3 | wiring, `listUnopened`, `openPhoto` |
| `server/src/features/photos/photos.{controller,routes}.ts` | 2, 3 | message field, `GET /unopened`, `POST /:id/open`, `photo:received` / `photo:opened` |
| `server/src/types.ts`, `errors/error-handler.ts` (+ test), `client/src/api.ts`, `client/src/photo.ts` | 2, 3, 5 | `message`, `MESSAGE_INVALID`, `UnopenedPhotos`, events |
| `server/src/features/photos/photos.service{,.list,.delete,.share,.message,.open}.test.ts` | 2, 3 | unit tests |
| `server/bruno/photos/{folder.bru,share/,unopened/,open/,delete/}` | 2, 3 | Bruno requests and docs |
| `client/src/components/sharing/{ShareMessageField,ShareFriendsForm}.tsx`, `hooks/useShareSending.ts`, `photosApi.ts` | 4 | the message input and its sending |
| `client/src/photoLabel.ts`, `components/viewer/ViewerCaption.tsx`, `components/frame/{PhotoCaption,PolaroidPrint}.tsx` | 4 | the message shown |
| `client/src/{photoSocket,photoList,photoMailApi}.ts`, `hooks/{usePhotoFeed,usePhotoLibrary,usePhotoMail}.ts` | 5 | waiting list, opened photos placed by date |
| `client/src/hooks/useMailReveal.ts`, `components/mail/*`, `pages/LibraryPage.tsx` | 6 | library card and reveal |
| `client/src/components/frame/{FrameNotices,WaitingPhotosBadge,NewPhotosBadge,SlideshowScreen,FrameStatusScreen}.tsx`, `pages/FramePage.tsx`, `components/sharing/ShareSheet.tsx` | 7 | frame pill, status, reveal; share sheet text |
| `docs/produit/{partage,bibliotheque,cadre,a-venir}.md` | 4, 6, 7 | product rules |
| `ARCHITECTURE.md`, `README.md` | 1, 2, 3, 5, 6, 7 | docs per task |

## Stack and branches (controller only)

- **PR A `feat/mail-server`**: `gh stack add feat/mail-server` on top of `feat/settings-frame-card` (step 8). Task 1 Step 1 commits the spec and this plan there. Tasks 1-3.
- **Checkpoint C1** after Task 2's code, before its Bruno run: `pnpm db:push` (no seed). **Checkpoint C2** after Task 3's code, before its Bruno run: `pnpm db:push` (no seed). Neither adds an index.
- **Before Task 4:** `gh stack add feat/mail-message` (PR B). Task 4.
- **Before Task 5:** `gh stack add feat/mail-library` (PR C). Tasks 5-6.
- **Before Task 7:** `gh stack add feat/mail-frame` (PR D). Task 7.
- After the final review: `gh stack submit --auto` (draft PRs), then `gh stack view --json`. Rien n'est mergé.

---

## PR A — `feat/mail-server`

### Task 1: Spec and plan, then split the photo service (PR A, `feat/mail-server`)

**Files:**
- Create: `docs/superpowers/specs/2026-11-25-photo-mail-design.md`, `docs/superpowers/plans/2026-11-25-photo-mail.md`
- Create: `server/src/features/photos/photos.store.ts`, `server/src/features/photos/photos.share.ts`
- Modify: `server/src/features/photos/photos.service.ts`, `ARCHITECTURE.md` (Couches du backend)

**Interfaces:** `createPhotosService(deps)` keeps its signature and its returned methods; `photos.store.ts` and `photos.share.ts` export factories taking the same deps, used only by the service.

- [ ] **Step 1: Commit the spec and the plan**

Copy the two files from the scratchpad to `docs/superpowers/specs/2026-11-25-photo-mail-design.md` and `docs/superpowers/plans/2026-11-25-photo-mail.md`, run `pnpm check:fix`, stage only those two files, commit with subject `docs: add the photo mail spec and plan` (body: step 9, decided and planned without the author per « je veux que tu livres 8 à 11 sans m'attendre », then the attribution lines).

- [ ] **Step 2: Baselines**

`pnpm test` → `Test Files  19 passed (19)`, `Tests  219 passed (219)`. If a number differs, write it in the Drift Log and shift every expected count of this plan by the same difference.

- [ ] **Step 3: Move the code (no behavior change)**

~~~~diff
diff --git a/server/src/features/photos/photos.service.ts b/server/src/features/photos/photos.service.ts
index 0b9bc0f..b4db4a2 100644
--- a/server/src/features/photos/photos.service.ts
+++ b/server/src/features/photos/photos.service.ts
@@ -1,31 +1,27 @@
-import { createHash } from 'node:crypto'
 import { AppError } from '../../errors/app-error.js'
 import type { UploadedImage } from '../../lib/cloudinary.js'
 import type { Logger } from '../../lib/logger.js'
 import {
-  OBJECT_ID_PATTERN,
   parseCursor,
   parseFile,
   parseLimit,
   parsePhotoId,
   type UploadedFile,
 } from './photos.input.js'
-import type { NewPhoto, PhotoRecord, PhotosRepository, StoredPhoto } from './photos.repository.js'
+import type { PhotoRecord, PhotosRepository } from './photos.repository.js'
+import {
+  type DeviceShare,
+  type LibraryShare,
+  shareFromDevice,
+  shareFromLibrary,
+} from './photos.share.js'
+import { deleteStoredImage, storeNewPhoto } from './photos.store.js'
 
 // ownerId is the logged-in account: a photo belongs to whoever uploaded it.
 export type NewPhotoInput = { ownerId: string; file: UploadedFile | undefined }
 
-// senderId only when the file goes to a friend's library.
-type NewUpload = { ownerId: string; senderId?: string; buffer: Buffer }
-
 export type PhotoDeletion = { ownerId: string; id: string }
 
-// photoId comes from the URL, friendId straight from the JSON body: validated here.
-export type LibraryShare = { senderId: string; photoId: string; friendId: unknown }
-
-// friendId is a multipart text field: validated here too.
-export type DeviceShare = { senderId: string; file: UploadedFile | undefined; friendId: unknown }
-
 // cursor and limit come straight from the query string: validated here, at the boundary.
 export type PageInput = { ownerId: string; cursor: unknown; limit: unknown }
 
@@ -51,75 +47,6 @@ export type PhotosService = {
   shareFromDevice: (share: DeviceShare) => Promise<PhotoRecord>
 }
 
-// The original bytes, before sharp: its output is not guaranteed to be stable.
-function sha256Of(buffer: Buffer): string {
-  return createHash('sha256').update(buffer).digest('hex')
-}
-
-// Saves the sharp and Cloudinary work for a known file; the unique index is the real guarantee.
-async function rejectKnownFile(
-  { repository, logger }: PhotosServiceDeps,
-  ownerId: string,
-  sha256: string,
-): Promise<void> {
-  const existing = await repository.findByOwnerAndSha256(ownerId, sha256)
-  if (existing) {
-    logger.info('photo.duplicate', { userId: ownerId, photoId: existing.id })
-    throw new AppError('PHOTO_DUPLICATE')
-  }
-}
-
-async function convertToFrameJpeg(
-  { toFrameJpeg, logger }: PhotosServiceDeps,
-  input: Buffer,
-): Promise<Buffer> {
-  try {
-    return await toFrameJpeg(input)
-  } catch (error: unknown) {
-    logger.warn('photo.unreadable', { error })
-    throw new AppError('IMAGE_UNREADABLE')
-  }
-}
-
-// true once Cloudinary destroyed the image. The record is gone, or was never saved:
-// a Cloudinary failure only leaves an orphan image, so the caller still goes on.
-async function deleteStoredImage(
-  { deleteImage, logger }: PhotosServiceDeps,
-  cloudinaryId: string,
-): Promise<boolean> {
-  try {
-    await deleteImage(cloudinaryId)
-    return true
-  } catch (error: unknown) {
-    logger.error('photo.orphaned', { cloudinaryId, error })
-    return false
-  }
-}
-
-async function insertRecord(
-  { repository, logger }: PhotosServiceDeps,
-  photo: NewPhoto,
-): Promise<PhotoRecord | null> {
-  try {
-    return await repository.create(photo)
-  } catch (error: unknown) {
-    // The image is on Cloudinary with no record pointing to it: its id is needed to clean up.
-    logger.error('photo.orphaned', { cloudinaryId: photo.cloudinaryId, error })
-    throw error
-  }
-}
-
-async function saveRecord(deps: PhotosServiceDeps, photo: NewPhoto): Promise<PhotoRecord> {
-  const record = await insertRecord(deps, photo)
-  if (record) {
-    return record
-  }
-  // A concurrent upload of the same file won: this new image is referenced by nothing.
-  await deleteStoredImage(deps, photo.cloudinaryId)
-  deps.logger.info('photo.duplicate', { userId: photo.ownerId, cloudinaryId: photo.cloudinaryId })
-  throw new AppError('PHOTO_DUPLICATE')
-}
-
 // A shared photo points to the same image: it goes with the last photo using it.
 // Counted after the deletion, so the deleted photo does not count itself.
 async function destroyUnusedImage(deps: PhotosServiceDeps, cloudinaryId: string): Promise<boolean> {
@@ -138,20 +65,6 @@ async function destroyUnusedImage(deps: PhotosServiceDeps, cloudinaryId: string)
   return deleteStoredImage(deps, cloudinaryId)
 }
 
-// From the received bytes to a saved photo of ownerId: the same steps for an upload to
-// one's own library and for a file sent to a friend.
-async function storeNewPhoto(
-  deps: PhotosServiceDeps,
-  { ownerId, senderId, buffer }: NewUpload,
-): Promise<PhotoRecord> {
-  const sha256 = sha256Of(buffer)
-  await rejectKnownFile(deps, ownerId, sha256)
-  const jpeg = await convertToFrameJpeg(deps, buffer)
-  // Cloudinary and database failures are ours: they stay 500s.
-  const image = await deps.uploadImage(jpeg)
-  return saveRecord(deps, { ownerId, senderId, ...image, sha256 })
-}
-
 async function createPhoto(
   deps: PhotosServiceDeps,
   { ownerId, file }: NewPhotoInput,
@@ -187,83 +100,6 @@ async function deletePhoto(
   return record.id
 }
 
-// Missing, malformed, unknown, pending or oneself: one answer, the id is no accepted friend's.
-// A malformed id never reaches the database: Prisma would fail on it.
-async function requireFriend(
-  { areFriends, logger }: PhotosServiceDeps,
-  friendId: unknown,
-  senderId: string,
-): Promise<string> {
-  const isObjectId = typeof friendId === 'string' && OBJECT_ID_PATTERN.test(friendId)
-  if (isObjectId && (await areFriends(senderId, friendId))) {
-    return friendId
-  }
-  logger.warn('photo.share_refused', { reason: 'not_friends', userId: senderId })
-  throw new AppError('NOT_FRIENDS')
-}
-
-async function findOwnedPhoto(
-  { repository }: PhotosServiceDeps,
-  id: string,
-  ownerId: string,
-): Promise<StoredPhoto> {
-  const photo = await repository.findOwned(id, ownerId)
-  if (!photo) {
-    throw new AppError('PHOTO_NOT_FOUND')
-  }
-  return photo
-}
-
-// A concurrent share of the same file won. Unlike a fresh upload, the image stays:
-// the original photo still uses it.
-async function saveCopy(deps: PhotosServiceDeps, photo: NewPhoto): Promise<PhotoRecord> {
-  const record = await deps.repository.create(photo)
-  if (record) {
-    return record
-  }
-  deps.logger.info('photo.duplicate', { userId: photo.ownerId, cloudinaryId: photo.cloudinaryId })
-  throw new AppError('PHOTO_DUPLICATE')
-}
-
-// The friend gets a new photo pointing to the same Cloudinary image: nothing is uploaded again.
-async function shareFromLibrary(
-  deps: PhotosServiceDeps,
-  { senderId, photoId, friendId }: LibraryShare,
-): Promise<PhotoRecord> {
-  const validPhotoId = parsePhotoId(photoId)
-  const recipientId = await requireFriend(deps, friendId, senderId)
-  const { id, url, cloudinaryId, sha256 } = await findOwnedPhoto(deps, validPhotoId, senderId)
-  await rejectKnownFile(deps, recipientId, sha256)
-  const record = await saveCopy(deps, { ownerId: recipientId, senderId, url, cloudinaryId, sha256 })
-  deps.logger.info('photo.shared', {
-    photoId: record.id,
-    sourcePhotoId: id,
-    cloudinaryId,
-    userId: senderId,
-    recipientId,
-    source: 'library',
-  })
-  return record
-}
-
-// An upload with the friend as owner: converted and uploaded like any new photo.
-async function shareFromDevice(
-  deps: PhotosServiceDeps,
-  { senderId, file, friendId }: DeviceShare,
-): Promise<PhotoRecord> {
-  const { buffer } = parseFile(file)
-  const recipientId = await requireFriend(deps, friendId, senderId)
-  const record = await storeNewPhoto(deps, { ownerId: recipientId, senderId, buffer })
-  deps.logger.info('photo.shared', {
-    photoId: record.id,
-    cloudinaryId: record.cloudinaryId,
-    userId: senderId,
-    recipientId,
-    source: 'device',
-  })
-  return record
-}
-
 // One record more than asked tells whether a next page exists, without a count query.
 async function listPage(
   { repository }: PhotosServiceDeps,
diff --git a/server/src/features/photos/photos.share.ts b/server/src/features/photos/photos.share.ts
new file mode 100644
index 0000000..577cd8c
--- /dev/null
+++ b/server/src/features/photos/photos.share.ts
@@ -0,0 +1,88 @@
+import { AppError } from '../../errors/app-error.js'
+import { OBJECT_ID_PATTERN, parseFile, parsePhotoId, type UploadedFile } from './photos.input.js'
+import type { NewPhoto, PhotoRecord, StoredPhoto } from './photos.repository.js'
+import type { PhotosServiceDeps } from './photos.service.js'
+import { rejectKnownFile, storeNewPhoto } from './photos.store.js'
+
+// photoId comes from the URL, friendId straight from the JSON body: validated here.
+export type LibraryShare = { senderId: string; photoId: string; friendId: unknown }
+
+// friendId is a multipart text field: validated here too.
+export type DeviceShare = { senderId: string; file: UploadedFile | undefined; friendId: unknown }
+
+// Missing, malformed, unknown, pending or oneself: one answer, the id is no accepted friend's.
+// A malformed id never reaches the database: Prisma would fail on it.
+async function requireFriend(
+  { areFriends, logger }: PhotosServiceDeps,
+  friendId: unknown,
+  senderId: string,
+): Promise<string> {
+  const isObjectId = typeof friendId === 'string' && OBJECT_ID_PATTERN.test(friendId)
+  if (isObjectId && (await areFriends(senderId, friendId))) {
+    return friendId
+  }
+  logger.warn('photo.share_refused', { reason: 'not_friends', userId: senderId })
+  throw new AppError('NOT_FRIENDS')
+}
+
+async function findOwnedPhoto(
+  { repository }: PhotosServiceDeps,
+  id: string,
+  ownerId: string,
+): Promise<StoredPhoto> {
+  const photo = await repository.findOwned(id, ownerId)
+  if (!photo) {
+    throw new AppError('PHOTO_NOT_FOUND')
+  }
+  return photo
+}
+
+// A concurrent share of the same file won. Unlike a fresh upload, the image stays:
+// the original photo still uses it.
+async function saveCopy(deps: PhotosServiceDeps, photo: NewPhoto): Promise<PhotoRecord> {
+  const record = await deps.repository.create(photo)
+  if (record) {
+    return record
+  }
+  deps.logger.info('photo.duplicate', { userId: photo.ownerId, cloudinaryId: photo.cloudinaryId })
+  throw new AppError('PHOTO_DUPLICATE')
+}
+
+// The friend gets a new photo pointing to the same Cloudinary image: nothing is uploaded again.
+export async function shareFromLibrary(
+  deps: PhotosServiceDeps,
+  { senderId, photoId, friendId }: LibraryShare,
+): Promise<PhotoRecord> {
+  const validPhotoId = parsePhotoId(photoId)
+  const recipientId = await requireFriend(deps, friendId, senderId)
+  const { id, url, cloudinaryId, sha256 } = await findOwnedPhoto(deps, validPhotoId, senderId)
+  await rejectKnownFile(deps, recipientId, sha256)
+  const record = await saveCopy(deps, { ownerId: recipientId, senderId, url, cloudinaryId, sha256 })
+  deps.logger.info('photo.shared', {
+    photoId: record.id,
+    sourcePhotoId: id,
+    cloudinaryId,
+    userId: senderId,
+    recipientId,
+    source: 'library',
+  })
+  return record
+}
+
+// An upload with the friend as owner: converted and uploaded like any new photo.
+export async function shareFromDevice(
+  deps: PhotosServiceDeps,
+  { senderId, file, friendId }: DeviceShare,
+): Promise<PhotoRecord> {
+  const { buffer } = parseFile(file)
+  const recipientId = await requireFriend(deps, friendId, senderId)
+  const record = await storeNewPhoto(deps, { ownerId: recipientId, senderId, buffer })
+  deps.logger.info('photo.shared', {
+    photoId: record.id,
+    cloudinaryId: record.cloudinaryId,
+    userId: senderId,
+    recipientId,
+    source: 'device',
+  })
+  return record
+}
diff --git a/server/src/features/photos/photos.store.ts b/server/src/features/photos/photos.store.ts
new file mode 100644
index 0000000..57bbc95
--- /dev/null
+++ b/server/src/features/photos/photos.store.ts
@@ -0,0 +1,90 @@
+import { createHash } from 'node:crypto'
+import { AppError } from '../../errors/app-error.js'
+import type { NewPhoto, PhotoRecord } from './photos.repository.js'
+import type { PhotosServiceDeps } from './photos.service.js'
+
+// senderId only when the file goes to a friend's library.
+export type NewUpload = { ownerId: string; senderId?: string; buffer: Buffer }
+
+// The original bytes, before sharp: its output is not guaranteed to be stable.
+function sha256Of(buffer: Buffer): string {
+  return createHash('sha256').update(buffer).digest('hex')
+}
+
+// Saves the sharp and Cloudinary work for a known file; the unique index is the real guarantee.
+export async function rejectKnownFile(
+  { repository, logger }: PhotosServiceDeps,
+  ownerId: string,
+  sha256: string,
+): Promise<void> {
+  const existing = await repository.findByOwnerAndSha256(ownerId, sha256)
+  if (existing) {
+    logger.info('photo.duplicate', { userId: ownerId, photoId: existing.id })
+    throw new AppError('PHOTO_DUPLICATE')
+  }
+}
+
+async function convertToFrameJpeg(
+  { toFrameJpeg, logger }: PhotosServiceDeps,
+  input: Buffer,
+): Promise<Buffer> {
+  try {
+    return await toFrameJpeg(input)
+  } catch (error: unknown) {
+    logger.warn('photo.unreadable', { error })
+    throw new AppError('IMAGE_UNREADABLE')
+  }
+}
+
+// true once Cloudinary destroyed the image. The record is gone, or was never saved:
+// a Cloudinary failure only leaves an orphan image, so the caller still goes on.
+export async function deleteStoredImage(
+  { deleteImage, logger }: PhotosServiceDeps,
+  cloudinaryId: string,
+): Promise<boolean> {
+  try {
+    await deleteImage(cloudinaryId)
+    return true
+  } catch (error: unknown) {
+    logger.error('photo.orphaned', { cloudinaryId, error })
+    return false
+  }
+}
+
+async function insertRecord(
+  { repository, logger }: PhotosServiceDeps,
+  photo: NewPhoto,
+): Promise<PhotoRecord | null> {
+  try {
+    return await repository.create(photo)
+  } catch (error: unknown) {
+    // The image is on Cloudinary with no record pointing to it: its id is needed to clean up.
+    logger.error('photo.orphaned', { cloudinaryId: photo.cloudinaryId, error })
+    throw error
+  }
+}
+
+async function saveRecord(deps: PhotosServiceDeps, photo: NewPhoto): Promise<PhotoRecord> {
+  const record = await insertRecord(deps, photo)
+  if (record) {
+    return record
+  }
+  // A concurrent upload of the same file won: this new image is referenced by nothing.
+  await deleteStoredImage(deps, photo.cloudinaryId)
+  deps.logger.info('photo.duplicate', { userId: photo.ownerId, cloudinaryId: photo.cloudinaryId })
+  throw new AppError('PHOTO_DUPLICATE')
+}
+
+// From the received bytes to a saved photo of ownerId: the same steps for an upload to
+// one's own library and for a file sent to a friend.
+export async function storeNewPhoto(
+  deps: PhotosServiceDeps,
+  { ownerId, senderId, buffer }: NewUpload,
+): Promise<PhotoRecord> {
+  const sha256 = sha256Of(buffer)
+  await rejectKnownFile(deps, ownerId, sha256)
+  const jpeg = await convertToFrameJpeg(deps, buffer)
+  // Cloudinary and database failures are ours: they stay 500s.
+  const image = await deps.uploadImage(jpeg)
+  return saveRecord(deps, { ownerId, senderId, ...image, sha256 })
+}
~~~~

- [ ] **Step 4: Docs**

In `ARCHITECTURE.md`, replace:

~~~~markdown
| `photos.service.ts`    | règles métier (doublon, image lisible, propriétaire, envoi à un ami accepté, image encore utilisée) ; ignore Express et Socket.IO |
~~~~

with:

~~~~markdown
| `photos.service.ts`    | règles métier (doublon, image lisible, propriétaire, envoi à un ami accepté, image encore utilisée) ; ignore Express et Socket.IO |
| `photos.share.ts`      | les deux envois à un ami (depuis la bibliothèque, depuis l'appareil), appelés par le service                                      |
| `photos.store.ts`      | les étapes communes d'un fichier reçu : SHA-256, Sharp, Cloudinary, enregistrement, nettoyage de l'image orpheline                |
~~~~

- [ ] **Step 5: Gates and commit**

`pnpm check && pnpm typecheck && pnpm test` → still `Tests  219 passed (219)`. `wc -l server/src/features/photos/photos.service.ts` → 126. Commit subject: `refactor(server): move the photo share and storage steps to their own files`.

### Task 2: An optional message with a shared photo (PR A, `feat/mail-server`)

**Files:**
- Modify: `server/prisma/schema.prisma`, `server/src/types.ts`, `server/src/errors/error-handler.ts` (+ test), `server/src/features/photos/{photos.input,photos.repository,photos.store,photos.share,photos.controller}.ts`
- Create: `server/src/features/photos/photos.service.message.test.ts`
- Modify (tests): `photos.service.test.ts`, `photos.service.list.test.ts`, `photos.service.delete.test.ts`, `photos.service.share.test.ts` (fixtures gain `message: null`)
- Modify: `client/src/api.ts` (`MESSAGE_INVALID`), `client/src/photo.ts` (`message` in `Photo` and its guard)
- Modify (Bruno): `photos/folder.bru`, `share/folder.bru`, `share/02-nominal-bibliotheque.bru`, `share/08-nominal-appareil.bru`; create `share/14-edge-message-trop-long.bru`, `share/15-edge-message-pas-texte.bru`, `share/16-edge-message-trop-long-appareil.bru`
- Modify: `ARCHITECTURE.md`

**Interfaces:**
```ts
// photos.input.ts
export const MAX_MESSAGE_LENGTH = 200
export function parseMessage(value: unknown): string | undefined // throws MESSAGE_INVALID
// types.ts
export type Photo = { id; url; thumbnailUrl; createdAt; senderName: string | null; message: string | null }
```
The two share inputs gain `message?: unknown`; `NewPhoto` gains `message?: string`.

- [ ] **Step 1: Schema, then `pnpm --filter server db:generate`**, the tests (`photos.service.message.test.ts`, the fixtures), then the code. The whole commit:

~~~~diff
diff --git a/client/src/api.ts b/client/src/api.ts
index 5045107..b0945b9 100644
--- a/client/src/api.ts
+++ b/client/src/api.ts
@@ -8,6 +8,7 @@ export type ApiErrorCode =
   | 'DISPLAY_NAME_INVALID'
   | 'PASSWORD_INVALID'
   | 'PASSWORD_INCORRECT'
+  | 'MESSAGE_INVALID'
   | 'SELF_FRIEND'
   | 'UNAUTHENTICATED'
   | 'INVALID_CREDENTIALS'
@@ -38,6 +39,7 @@ const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
   DISPLAY_NAME_INVALID: 'Choisissez un nom de 1 à 50 caractères.',
   PASSWORD_INVALID: 'Le mot de passe doit faire entre 12 et 128 caractères.',
   PASSWORD_INCORRECT: 'Mot de passe actuel incorrect.',
+  MESSAGE_INVALID: 'Le message doit faire 200 caractères au plus.',
   SELF_FRIEND: 'Vous ne pouvez pas vous ajouter vous-même.',
   UNAUTHENTICATED: 'Votre session a expiré. Reconnectez-vous.',
   INVALID_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
diff --git a/client/src/photo.ts b/client/src/photo.ts
index 38c588b..6473a6a 100644
--- a/client/src/photo.ts
+++ b/client/src/photo.ts
@@ -1,13 +1,15 @@
 // Copy of server/src/types.ts, see why there. Keep both in sync.
 
 // createdAt is an ISO 8601 string: JSON has no dates. senderName is the display name of the
-// friend who sent the photo, null for a photo its owner uploaded.
+// friend who sent the photo, null for a photo its owner uploaded. message is the note the
+// friend wrote with it, null without one.
 export type Photo = {
   id: string
   url: string
   thumbnailUrl: string
   createdAt: string
   senderName: string | null
+  message: string | null
 }
 
 // nextCursor is the id to send as cursor for the next page; null on the last page.
@@ -34,7 +36,9 @@ export function isPhoto(value: unknown): value is Photo {
     'createdAt' in value &&
     typeof value.createdAt === 'string' &&
     'senderName' in value &&
-    (value.senderName === null || typeof value.senderName === 'string')
+    (value.senderName === null || typeof value.senderName === 'string') &&
+    'message' in value &&
+    (value.message === null || typeof value.message === 'string')
   )
 }
 
diff --git a/server/bruno/photos/folder.bru b/server/bruno/photos/folder.bru
index 7fe7c45..1628dda 100644
--- a/server/bruno/photos/folder.bru
+++ b/server/bruno/photos/folder.bru
@@ -10,12 +10,14 @@ docs {
   photos du compte connecté.
 
   Une photo renvoyée par l'API : `{ id, url, thumbnailUrl, createdAt,
-  senderName }` (`createdAt` en ISO 8601 ; `senderName`, le nom de l'ami qui
-  l'a envoyée, `null` pour une photo ajoutée par son propriétaire). Une
+  senderName, message }` (`createdAt` en ISO 8601 ; `senderName`, le nom de
+  l'ami qui l'a envoyée, `null` pour une photo ajoutée par son propriétaire ;
+  `message`, le mot de l'ami joint à la photo, `null` sans message). Une
   erreur : `{ error }`, un code
   (`PHOTO_MISSING`, `UPLOAD_INVALID`, `BODY_INVALID`, `QUERY_INVALID`,
   `UNAUTHENTICATED`, `NOT_FRIENDS`, `PHOTO_NOT_FOUND`, `PHOTO_DUPLICATE`,
-  `PHOTO_TOO_LARGE`, `FORMAT_UNSUPPORTED`, `IMAGE_UNREADABLE`, `SERVER_ERROR`)
+  `PHOTO_TOO_LARGE`, `FORMAT_UNSUPPORTED`, `IMAGE_UNREADABLE`, `MESSAGE_INVALID`,
+  `SERVER_ERROR`)
   que le client traduit en français.
   Ordre des dossiers : `create`, `list`, `share`, `delete`.
 }
diff --git a/server/bruno/photos/share/02-nominal-bibliotheque.bru b/server/bruno/photos/share/02-nominal-bibliotheque.bru
index 3544a49..6c190ea 100644
--- a/server/bruno/photos/share/02-nominal-bibliotheque.bru
+++ b/server/bruno/photos/share/02-nominal-bibliotheque.bru
@@ -12,7 +12,8 @@ post {
 
 body:json {
   {
-    "friendId": "{{adminId}}"
+    "friendId": "{{adminId}}",
+    "message": "  Joyeux anniversaire !  "
   }
 }
 
@@ -39,6 +40,7 @@ assert {
   res.status: eq 201
   res.body.id: isString
   res.body.senderName: eq {{memberDisplayName}}
+  res.body.message: eq Joyeux anniversaire !
 }
 
 script:post-response {
@@ -69,7 +71,8 @@ docs {
   NOMINAL → 201 avec la nouvelle photo de l'admin, `senderName` `Membre`.
   Le script de départ rend le membre et l'admin amis (demande puis
   acceptation, id dans `shareFriendshipId`). La photo reçue pointe vers la
-  même image Cloudinary que celle du membre. Son id va dans `sharedPhotoId`.
+  même image Cloudinary que celle du membre, et le message sans les espaces
+  autour (« Joyeux anniversaire ! »). Son id va dans `sharedPhotoId`.
   Le script vérifie qu'elle est dans la liste de l'admin avec le nom du
   membre, et que la liste du membre ne gagne pas de photo.
 }
diff --git a/server/bruno/photos/share/08-nominal-appareil.bru b/server/bruno/photos/share/08-nominal-appareil.bru
index 59c2e55..d98f6f1 100644
--- a/server/bruno/photos/share/08-nominal-appareil.bru
+++ b/server/bruno/photos/share/08-nominal-appareil.bru
@@ -19,6 +19,7 @@ assert {
   res.status: eq 201
   res.body.id: isString
   res.body.senderName: eq {{memberDisplayName}}
+  res.body.message: isNull
 }
 
 script:post-response {
@@ -39,8 +40,8 @@ script:post-response {
 }
 
 docs {
-  NOMINAL → 201 avec la nouvelle photo de l'admin, `senderName` `Membre`.
-  Le fichier est converti et envoyé à Cloudinary comme un envoi normal, mais
+  NOMINAL → 201 avec la nouvelle photo de l'admin, `senderName` `Membre`,
+  `message` `null` (aucun message envoyé). Le fichier est converti et envoyé à Cloudinary comme un envoi normal, mais
   n'entre que dans la bibliothèque de l'ami. Son id va dans
   `deviceSharedPhotoId` ; le script vérifie qu'il est dans la liste de
   l'admin et absent de celle du membre.
diff --git a/server/bruno/photos/share/14-edge-message-trop-long.bru b/server/bruno/photos/share/14-edge-message-trop-long.bru
new file mode 100644
index 0000000..027260b
--- /dev/null
+++ b/server/bruno/photos/share/14-edge-message-trop-long.bru
@@ -0,0 +1,29 @@
+meta {
+  name: Edge - message trop long
+  type: http
+  seq: 14
+}
+
+post {
+  url: {{baseUrl}}/api/photos/{{createdPhotoId}}/share
+  body: json
+  auth: none
+}
+
+body:json {
+  {
+    "friendId": "{{adminId}}",
+    "message": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
+  }
+}
+
+assert {
+  res.status: eq 400
+  res.body.error: eq MESSAGE_INVALID
+}
+
+docs {
+  EDGE → 400 MESSAGE_INVALID : un message de 201 caractères, un de plus que
+  la limite. Le message est vérifié avant l'ami : la fin de l'amitié (`13`)
+  ne change pas la réponse.
+}
diff --git a/server/bruno/photos/share/15-edge-message-pas-texte.bru b/server/bruno/photos/share/15-edge-message-pas-texte.bru
new file mode 100644
index 0000000..ab38bf2
--- /dev/null
+++ b/server/bruno/photos/share/15-edge-message-pas-texte.bru
@@ -0,0 +1,28 @@
+meta {
+  name: Edge - message qui n'est pas du texte
+  type: http
+  seq: 15
+}
+
+post {
+  url: {{baseUrl}}/api/photos/{{createdPhotoId}}/share
+  body: json
+  auth: none
+}
+
+body:json {
+  {
+    "friendId": "{{adminId}}",
+    "message": 42
+  }
+}
+
+assert {
+  res.status: eq 400
+  res.body.error: eq MESSAGE_INVALID
+}
+
+docs {
+  EDGE → 400 MESSAGE_INVALID : `message` est un nombre. Seul du texte (ou
+  rien, ou `null`) est accepté.
+}
diff --git a/server/bruno/photos/share/16-edge-message-trop-long-appareil.bru b/server/bruno/photos/share/16-edge-message-trop-long-appareil.bru
new file mode 100644
index 0000000..677b4fb
--- /dev/null
+++ b/server/bruno/photos/share/16-edge-message-trop-long-appareil.bru
@@ -0,0 +1,28 @@
+meta {
+  name: Edge - message trop long avec un fichier de l'appareil
+  type: http
+  seq: 16
+}
+
+post {
+  url: {{baseUrl}}/api/photos/share
+  body: multipartForm
+  auth: none
+}
+
+body:multipart-form {
+  photo: @file(fixtures/photo.png) @contentType(image/png)
+  friendId: {{adminId}}
+  message: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
+}
+
+assert {
+  res.status: eq 400
+  res.body.error: eq MESSAGE_INVALID
+}
+
+docs {
+  EDGE → 400 MESSAGE_INVALID : le champ multipart `message` fait 201
+  caractères. Il est refusé avant toute conversion ou tout envoi à
+  Cloudinary.
+}
diff --git a/server/bruno/photos/share/folder.bru b/server/bruno/photos/share/folder.bru
index b1d8837..b68c24d 100644
--- a/server/bruno/photos/share/folder.bru
+++ b/server/bruno/photos/share/folder.bru
@@ -4,11 +4,11 @@ meta {
 }
 
 docs {
-  `POST /api/photos/:id/share`, JSON `{ friendId }` : envoie une photo de sa
+  `POST /api/photos/:id/share`, JSON `{ friendId, message }` : envoie une photo de sa
   bibliothèque à un ami accepté. L'ami reçoit une nouvelle photo qui pointe
   vers la même image Cloudinary (rien n'est renvoyé à Cloudinary), avec
   `senderName`, le nom de l'expéditeur. `POST /api/photos/share`, multipart
-  (`photo` et `friendId`) : envoie un fichier de l'appareil, converti et
+  (`photo`, `friendId` et `message`) : envoie un fichier de l'appareil, converti et
   envoyé à Cloudinary comme un envoi normal, mais qui n'entre que dans la
   bibliothèque de l'ami. Réponse : 201 avec la photo de l'ami, telle qu'il
   la voit ; l'événement Socket.IO `photo:new` part vers les connexions de
@@ -17,7 +17,10 @@ docs {
   Un `friendId` absent, mal formé, inconnu, en attente ou le sien répond
   403 `NOT_FRIENDS` ; une photo d'un autre compte ou un id mal formé, 404
   `PHOTO_NOT_FOUND` ; un fichier que l'ami a déjà (même SHA-256), 409
-  `PHOTO_DUPLICATE`.
+  `PHOTO_DUPLICATE`. `message` est facultatif : du texte de 200 caractères au
+  plus, espaces autour retirés ; vide ou absent, pas de message. Trop long ou
+  pas du texte : 400 `MESSAGE_INVALID`, vérifié avant l'ami (`14` à `16`
+  passent après la fin de l'amitié).
 
   Le membre envoie à l'admin. `01` lit les deux ids (`memberId`, `adminId`)
   par `GET /api/auth/me` et supprime une amitié laissée par un lancement
diff --git a/server/prisma/schema.prisma b/server/prisma/schema.prisma
index 05b36fd..8d359fb 100644
--- a/server/prisma/schema.prisma
+++ b/server/prisma/schema.prisma
@@ -56,6 +56,8 @@ model Photo {
   url          String
   cloudinaryId String
   sha256       String
+  // The sender's note, 200 characters at most; absent when there is none.
+  message      String?
   createdAt    DateTime @default(now())
 
   @@unique([ownerId, sha256])
diff --git a/server/src/errors/error-handler.test.ts b/server/src/errors/error-handler.test.ts
index e9f6b92..c6335f4 100644
--- a/server/src/errors/error-handler.test.ts
+++ b/server/src/errors/error-handler.test.ts
@@ -11,6 +11,13 @@ describe('toErrorResponse', () => {
     })
   })
 
+  it('answers a share message that is too long or not text with 400', () => {
+    expect(toErrorResponse(new AppError('MESSAGE_INVALID'))).toEqual({
+      status: 400,
+      body: { error: 'MESSAGE_INVALID' },
+    })
+  })
+
   it('answers a member on an admin route with 403', () => {
     expect(toErrorResponse(new AppError('FORBIDDEN'))).toEqual({
       status: 403,
diff --git a/server/src/errors/error-handler.ts b/server/src/errors/error-handler.ts
index da1b02e..63dd44e 100644
--- a/server/src/errors/error-handler.ts
+++ b/server/src/errors/error-handler.ts
@@ -14,6 +14,7 @@ const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
   PASSWORD_INVALID: 400,
   // 400, not 401: the session is valid, only the typed password is wrong.
   PASSWORD_INCORRECT: 400,
+  MESSAGE_INVALID: 400,
   SELF_FRIEND: 400,
   UNAUTHENTICATED: 401,
   INVALID_CREDENTIALS: 401,
diff --git a/server/src/features/photos/photos.controller.ts b/server/src/features/photos/photos.controller.ts
index 25b3006..5e1f662 100644
--- a/server/src/features/photos/photos.controller.ts
+++ b/server/src/features/photos/photos.controller.ts
@@ -25,6 +25,7 @@ function toPhotoDto(record: PhotoRecord): Photo {
     ...deliveryUrls(record.cloudinaryId),
     createdAt: record.createdAt.toISOString(),
     senderName: record.sender?.displayName ?? null,
+    message: record.message,
   }
 }
 
@@ -71,16 +72,18 @@ async function shareFromLibrary(
     senderId: currentUser(req).id,
     photoId: req.params.id,
     friendId: req.body?.friendId,
+    message: req.body?.message,
   })
   announceNewPhoto(deps, res, record)
 }
 
-// multer fills req.body with the text fields: friendId is one of them.
+// multer fills req.body with the text fields: friendId and message are two of them.
 async function shareFromDevice(deps: ControllerDeps, req: Request, res: Response): Promise<void> {
   const record = await deps.service.shareFromDevice({
     senderId: currentUser(req).id,
     file: req.file,
     friendId: req.body?.friendId,
+    message: req.body?.message,
   })
   announceNewPhoto(deps, res, record)
 }
diff --git a/server/src/features/photos/photos.input.ts b/server/src/features/photos/photos.input.ts
index eaf7114..eaa913b 100644
--- a/server/src/features/photos/photos.input.ts
+++ b/server/src/features/photos/photos.input.ts
@@ -5,6 +5,8 @@ export const MAX_PAGE_SIZE = 100
 const DIGITS_PATTERN = /^\d+$/
 const ALLOWED_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp']
 export const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i
+// A note on a postcard, not a letter: it has to fit under the photo on a frame.
+export const MAX_MESSAGE_LENGTH = 200
 
 export type UploadedFile = { buffer: Buffer; mimetype: string }
 
@@ -19,6 +21,22 @@ export function parseFile(file: UploadedFile | undefined): UploadedFile {
   return file
 }
 
+// undefined: no message, the field stays out of the document. A blank message is no message.
+// A repeated multipart field arrives as an array: not text, refused like a number.
+export function parseMessage(message: unknown): string | undefined {
+  if (message === undefined || message === null) {
+    return undefined
+  }
+  if (typeof message !== 'string') {
+    throw new AppError('MESSAGE_INVALID')
+  }
+  const trimmedMessage = message.trim()
+  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
+    throw new AppError('MESSAGE_INVALID')
+  }
+  return trimmedMessage === '' ? undefined : trimmedMessage
+}
+
 // Prisma fails on an id that is not an ObjectId: that would be a 500, not a 404.
 export function parsePhotoId(id: string): string {
   if (!OBJECT_ID_PATTERN.test(id)) {
diff --git a/server/src/features/photos/photos.repository.ts b/server/src/features/photos/photos.repository.ts
index e76f577..618c61a 100644
--- a/server/src/features/photos/photos.repository.ts
+++ b/server/src/features/photos/photos.repository.ts
@@ -11,10 +11,12 @@ export type StoredPhoto = Photo
 // sender is null for a photo its owner uploaded.
 export type PhotoRecord = Prisma.PhotoGetPayload<{ include: typeof SENDER_NAME }>
 
-// senderId only on a photo sent by a friend: Prisma leaves the field out, and reads it as null.
+// senderId and message only on a photo sent by a friend: Prisma leaves the fields out, and
+// reads them as null.
 export type NewPhoto = {
   ownerId: string
   senderId?: string
+  message?: string
   url: string
   cloudinaryId: string
   sha256: string
diff --git a/server/src/features/photos/photos.service.delete.test.ts b/server/src/features/photos/photos.service.delete.test.ts
index 3fae08a..03b3045 100644
--- a/server/src/features/photos/photos.service.delete.test.ts
+++ b/server/src/features/photos/photos.service.delete.test.ts
@@ -9,6 +9,7 @@ const RECORD: PhotoRecord = {
   id: '6b044f9d56a44767c7079a01',
   ownerId: OWNER_ID,
   senderId: null,
+  message: null,
   sender: null,
   ...IMAGE,
   sha256: 'sha-of-the-original-bytes',
diff --git a/server/src/features/photos/photos.service.list.test.ts b/server/src/features/photos/photos.service.list.test.ts
index 298eb41..71a2b1a 100644
--- a/server/src/features/photos/photos.service.list.test.ts
+++ b/server/src/features/photos/photos.service.list.test.ts
@@ -12,6 +12,7 @@ function recordWithId(id: string): PhotoRecord {
     id,
     ownerId: OWNER_ID,
     senderId: null,
+    message: null,
     sender: null,
     url: 'https://res.cloudinary.com/demo/photo.jpg',
     cloudinaryId: `familyframe/${id}`,
diff --git a/server/src/features/photos/photos.service.message.test.ts b/server/src/features/photos/photos.service.message.test.ts
new file mode 100644
index 0000000..639d7fa
--- /dev/null
+++ b/server/src/features/photos/photos.service.message.test.ts
@@ -0,0 +1,160 @@
+import { describe, expect, it, vi } from 'vitest'
+import type { Logger } from '../../lib/logger.js'
+import { MAX_MESSAGE_LENGTH, type UploadedFile } from './photos.input.js'
+import type { PhotoRecord, PhotosRepository, StoredPhoto } from './photos.repository.js'
+import { createPhotosService, type PhotosServiceDeps } from './photos.service.js'
+
+const SENDER_ID = '6b044f9d56a44767c7079b01'
+const FRIEND_ID = '6b044f9d56a44767c7079b02'
+const IMAGE = { url: 'https://res.cloudinary.com/demo/photo.jpg', cloudinaryId: 'familyframe/abc' }
+// Received earlier with its own message: a new share must not pass that one on.
+const ORIGINAL: StoredPhoto = {
+  id: '6b044f9d56a44767c7079a01',
+  ownerId: SENDER_ID,
+  senderId: '6b044f9d56a44767c7079b03',
+  ...IMAGE,
+  sha256: 'sha-of-the-original-bytes',
+  message: 'Le message reçu avec la photo',
+  createdAt: new Date('2026-11-23T10:00:00Z'),
+}
+const COPY: PhotoRecord = {
+  ...ORIGINAL,
+  id: '6b044f9d56a44767c7079a02',
+  ownerId: FRIEND_ID,
+  senderId: SENDER_ID,
+  sender: { displayName: 'Membre' },
+  message: 'Joyeux anniversaire !',
+}
+const PNG_FILE: UploadedFile = { buffer: Buffer.from('raw png'), mimetype: 'image/png' }
+const NOT_TEXT_MESSAGES: unknown[] = [42, ['un', 'deux'], { text: 'bonjour' }]
+
+// Every dependency succeeds by default; each test breaks only the one it is about.
+function makeDeps() {
+  return {
+    repository: {
+      findPage: vi.fn<PhotosRepository['findPage']>(),
+      findByOwnerAndSha256: vi
+        .fn<PhotosRepository['findByOwnerAndSha256']>()
+        .mockResolvedValue(null),
+      findOwned: vi.fn<PhotosRepository['findOwned']>().mockResolvedValue(ORIGINAL),
+      create: vi.fn<PhotosRepository['create']>().mockResolvedValue(COPY),
+      deleteOwned: vi.fn<PhotosRepository['deleteOwned']>(),
+      countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>(),
+    },
+    toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>().mockResolvedValue(Buffer.from('jpeg')),
+    uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>().mockResolvedValue(IMAGE),
+    deleteImage: vi.fn<PhotosServiceDeps['deleteImage']>().mockResolvedValue(undefined),
+    areFriends: vi.fn<PhotosServiceDeps['areFriends']>().mockResolvedValue(true),
+    logger: {
+      info: vi.fn<Logger['info']>(),
+      warn: vi.fn<Logger['warn']>(),
+      error: vi.fn<Logger['error']>(),
+    },
+  }
+}
+
+function shareWithMessage(deps: PhotosServiceDeps, message: unknown): Promise<PhotoRecord> {
+  return createPhotosService(deps).shareFromLibrary({
+    senderId: SENDER_ID,
+    photoId: ORIGINAL.id,
+    friendId: FRIEND_ID,
+    message,
+  })
+}
+
+function sendFileWithMessage(deps: PhotosServiceDeps, message: unknown): Promise<PhotoRecord> {
+  return createPhotosService(deps).shareFromDevice({
+    senderId: SENDER_ID,
+    file: PNG_FILE,
+    friendId: FRIEND_ID,
+    message,
+  })
+}
+
+describe('the message of a shared photo', () => {
+  it('goes with the copy, trimmed, instead of the message the original came with', async () => {
+    const deps = makeDeps()
+
+    await shareWithMessage(deps, '  Joyeux anniversaire !  ')
+
+    expect(deps.repository.create).toHaveBeenCalledWith(
+      expect.objectContaining({ ownerId: FRIEND_ID, message: 'Joyeux anniversaire !' }),
+    )
+  })
+
+  it.each([undefined, null, '', '   '])('leaves the message out for %j', async (message) => {
+    const deps = makeDeps()
+
+    await shareWithMessage(deps, message)
+
+    expect(deps.repository.create.mock.calls[0][0].message).toBeUndefined()
+  })
+
+  it('accepts a message of exactly the maximum length', async () => {
+    const deps = makeDeps()
+    const longestMessage = 'a'.repeat(MAX_MESSAGE_LENGTH)
+
+    await shareWithMessage(deps, longestMessage)
+
+    expect(deps.repository.create.mock.calls[0][0].message).toBe(longestMessage)
+  })
+
+  it('refuses a message one character too long, before asking who is friends', async () => {
+    const deps = makeDeps()
+
+    await expect(shareWithMessage(deps, 'a'.repeat(MAX_MESSAGE_LENGTH + 1))).rejects.toMatchObject({
+      code: 'MESSAGE_INVALID',
+    })
+    expect(deps.areFriends).not.toHaveBeenCalled()
+    expect(deps.repository.create).not.toHaveBeenCalled()
+  })
+
+  it.each(NOT_TEXT_MESSAGES)('refuses a message that is not text (%j)', async (message) => {
+    const deps = makeDeps()
+
+    await expect(shareWithMessage(deps, message)).rejects.toMatchObject({
+      code: 'MESSAGE_INVALID',
+    })
+  })
+
+  it('counts the length after trimming the spaces around it', async () => {
+    const deps = makeDeps()
+    const paddedMessage = ` ${'a'.repeat(MAX_MESSAGE_LENGTH)} `
+
+    await shareWithMessage(deps, paddedMessage)
+
+    expect(deps.repository.create.mock.calls[0][0].message).toBe('a'.repeat(MAX_MESSAGE_LENGTH))
+  })
+
+  it('goes with a file sent from the device too', async () => {
+    const deps = makeDeps()
+
+    await sendFileWithMessage(deps, 'Bisous de Lille')
+
+    expect(deps.repository.create).toHaveBeenCalledWith(
+      expect.objectContaining({ ownerId: FRIEND_ID, message: 'Bisous de Lille' }),
+    )
+  })
+
+  it('refuses a too long message from the device before converting or uploading', async () => {
+    const deps = makeDeps()
+
+    await expect(
+      sendFileWithMessage(deps, 'a'.repeat(MAX_MESSAGE_LENGTH + 1)),
+    ).rejects.toMatchObject({ code: 'MESSAGE_INVALID' })
+    expect(deps.toFrameJpeg).not.toHaveBeenCalled()
+    expect(deps.uploadImage).not.toHaveBeenCalled()
+  })
+
+  it('logs whether there was a message, never its text', async () => {
+    const deps = makeDeps()
+
+    await shareWithMessage(deps, 'Joyeux anniversaire !')
+
+    expect(deps.logger.info).toHaveBeenCalledWith(
+      'photo.shared',
+      expect.objectContaining({ hasMessage: true }),
+    )
+    expect(JSON.stringify(deps.logger.info.mock.calls)).not.toContain('anniversaire')
+  })
+})
diff --git a/server/src/features/photos/photos.service.share.test.ts b/server/src/features/photos/photos.service.share.test.ts
index 6a0e5a2..ea5cd34 100644
--- a/server/src/features/photos/photos.service.share.test.ts
+++ b/server/src/features/photos/photos.service.share.test.ts
@@ -12,6 +12,7 @@ const ORIGINAL: StoredPhoto = {
   id: '6b044f9d56a44767c7079a01',
   ownerId: SENDER_ID,
   senderId: null,
+  message: null,
   ...IMAGE,
   sha256: 'sha-of-the-original-bytes',
   createdAt: new Date('2026-11-23T10:00:00Z'),
@@ -66,6 +67,7 @@ function shareOriginal(deps: PhotosServiceDeps, friendId: unknown): Promise<Phot
     senderId: SENDER_ID,
     photoId: ORIGINAL.id,
     friendId,
+    message: undefined,
   })
 }
 
@@ -101,6 +103,7 @@ describe('shareFromLibrary', () => {
       userId: SENDER_ID,
       recipientId: FRIEND_ID,
       source: 'library',
+      hasMessage: false,
     })
     expect(JSON.stringify(deps.logger.info.mock.calls)).not.toContain('Membre')
   })
@@ -113,6 +116,7 @@ describe('shareFromLibrary', () => {
         senderId: SENDER_ID,
         photoId: 'pas-un-id',
         friendId: FRIEND_ID,
+        message: undefined,
       }),
     ).rejects.toMatchObject({ code: 'PHOTO_NOT_FOUND' })
     expect(deps.areFriends).not.toHaveBeenCalled()
@@ -178,6 +182,7 @@ function sharePng(deps: PhotosServiceDeps, friendId: unknown): Promise<PhotoReco
     senderId: SENDER_ID,
     file: PNG_FILE,
     friendId,
+    message: undefined,
   })
 }
 
@@ -204,6 +209,7 @@ describe('shareFromDevice', () => {
       userId: SENDER_ID,
       recipientId: FRIEND_ID,
       source: 'device',
+      hasMessage: false,
     })
   })
 
@@ -242,6 +248,7 @@ describe('shareFromDevice', () => {
         senderId: SENDER_ID,
         file: undefined,
         friendId: FRIEND_ID,
+        message: undefined,
       }),
     ).rejects.toMatchObject({ code: 'PHOTO_MISSING' })
     expect(deps.areFriends).not.toHaveBeenCalled()
diff --git a/server/src/features/photos/photos.service.test.ts b/server/src/features/photos/photos.service.test.ts
index 8dd1f66..17521ac 100644
--- a/server/src/features/photos/photos.service.test.ts
+++ b/server/src/features/photos/photos.service.test.ts
@@ -15,6 +15,7 @@ const RECORD: PhotoRecord = {
   id: '6b044f9d56a44767c7079a01',
   ownerId: OWNER_ID,
   senderId: null,
+  message: null,
   sender: null,
   ...IMAGE,
   sha256: JPEG_SHA256,
diff --git a/server/src/features/photos/photos.share.ts b/server/src/features/photos/photos.share.ts
index 577cd8c..0d2d1e8 100644
--- a/server/src/features/photos/photos.share.ts
+++ b/server/src/features/photos/photos.share.ts
@@ -1,14 +1,30 @@
 import { AppError } from '../../errors/app-error.js'
-import { OBJECT_ID_PATTERN, parseFile, parsePhotoId, type UploadedFile } from './photos.input.js'
+import {
+  OBJECT_ID_PATTERN,
+  parseFile,
+  parseMessage,
+  parsePhotoId,
+  type UploadedFile,
+} from './photos.input.js'
 import type { NewPhoto, PhotoRecord, StoredPhoto } from './photos.repository.js'
 import type { PhotosServiceDeps } from './photos.service.js'
 import { rejectKnownFile, storeNewPhoto } from './photos.store.js'
 
-// photoId comes from the URL, friendId straight from the JSON body: validated here.
-export type LibraryShare = { senderId: string; photoId: string; friendId: unknown }
+// photoId comes from the URL, friendId and message straight from the JSON body: validated here.
+export type LibraryShare = {
+  senderId: string
+  photoId: string
+  friendId: unknown
+  message: unknown
+}
 
-// friendId is a multipart text field: validated here too.
-export type DeviceShare = { senderId: string; file: UploadedFile | undefined; friendId: unknown }
+// friendId and message are multipart text fields: validated here too.
+export type DeviceShare = {
+  senderId: string
+  file: UploadedFile | undefined
+  friendId: unknown
+  message: unknown
+}
 
 // Missing, malformed, unknown, pending or oneself: one answer, the id is no accepted friend's.
 // A malformed id never reaches the database: Prisma would fail on it.
@@ -51,13 +67,16 @@ async function saveCopy(deps: PhotosServiceDeps, photo: NewPhoto): Promise<Photo
 // The friend gets a new photo pointing to the same Cloudinary image: nothing is uploaded again.
 export async function shareFromLibrary(
   deps: PhotosServiceDeps,
-  { senderId, photoId, friendId }: LibraryShare,
+  { senderId, photoId, friendId, message }: LibraryShare,
 ): Promise<PhotoRecord> {
   const validPhotoId = parsePhotoId(photoId)
+  const validMessage = parseMessage(message)
   const recipientId = await requireFriend(deps, friendId, senderId)
   const { id, url, cloudinaryId, sha256 } = await findOwnedPhoto(deps, validPhotoId, senderId)
   await rejectKnownFile(deps, recipientId, sha256)
-  const record = await saveCopy(deps, { ownerId: recipientId, senderId, url, cloudinaryId, sha256 })
+  // The copy carries this sender's message, never the one the original came with.
+  const copy = { ownerId: recipientId, senderId, message: validMessage, url, cloudinaryId, sha256 }
+  const record = await saveCopy(deps, copy)
   deps.logger.info('photo.shared', {
     photoId: record.id,
     sourcePhotoId: id,
@@ -65,6 +84,7 @@ export async function shareFromLibrary(
     userId: senderId,
     recipientId,
     source: 'library',
+    hasMessage: validMessage !== undefined,
   })
   return record
 }
@@ -72,17 +92,20 @@ export async function shareFromLibrary(
 // An upload with the friend as owner: converted and uploaded like any new photo.
 export async function shareFromDevice(
   deps: PhotosServiceDeps,
-  { senderId, file, friendId }: DeviceShare,
+  { senderId, file, friendId, message }: DeviceShare,
 ): Promise<PhotoRecord> {
   const { buffer } = parseFile(file)
+  const validMessage = parseMessage(message)
   const recipientId = await requireFriend(deps, friendId, senderId)
-  const record = await storeNewPhoto(deps, { ownerId: recipientId, senderId, buffer })
+  const upload = { ownerId: recipientId, senderId, message: validMessage, buffer }
+  const record = await storeNewPhoto(deps, upload)
   deps.logger.info('photo.shared', {
     photoId: record.id,
     cloudinaryId: record.cloudinaryId,
     userId: senderId,
     recipientId,
     source: 'device',
+    hasMessage: validMessage !== undefined,
   })
   return record
 }
diff --git a/server/src/features/photos/photos.store.ts b/server/src/features/photos/photos.store.ts
index 57bbc95..cf2c1ad 100644
--- a/server/src/features/photos/photos.store.ts
+++ b/server/src/features/photos/photos.store.ts
@@ -3,8 +3,8 @@ import { AppError } from '../../errors/app-error.js'
 import type { NewPhoto, PhotoRecord } from './photos.repository.js'
 import type { PhotosServiceDeps } from './photos.service.js'
 
-// senderId only when the file goes to a friend's library.
-export type NewUpload = { ownerId: string; senderId?: string; buffer: Buffer }
+// senderId and message only when the file goes to a friend's library.
+export type NewUpload = { ownerId: string; senderId?: string; message?: string; buffer: Buffer }
 
 // The original bytes, before sharp: its output is not guaranteed to be stable.
 function sha256Of(buffer: Buffer): string {
@@ -79,12 +79,12 @@ async function saveRecord(deps: PhotosServiceDeps, photo: NewPhoto): Promise<Pho
 // one's own library and for a file sent to a friend.
 export async function storeNewPhoto(
   deps: PhotosServiceDeps,
-  { ownerId, senderId, buffer }: NewUpload,
+  { ownerId, senderId, message, buffer }: NewUpload,
 ): Promise<PhotoRecord> {
   const sha256 = sha256Of(buffer)
   await rejectKnownFile(deps, ownerId, sha256)
   const jpeg = await convertToFrameJpeg(deps, buffer)
   // Cloudinary and database failures are ours: they stay 500s.
   const image = await deps.uploadImage(jpeg)
-  return saveRecord(deps, { ownerId, senderId, ...image, sha256 })
+  return saveRecord(deps, { ownerId, senderId, message, ...image, sha256 })
 }
diff --git a/server/src/types.ts b/server/src/types.ts
index e0c8365..5ef90eb 100644
--- a/server/src/types.ts
+++ b/server/src/types.ts
@@ -10,6 +10,7 @@ export type ApiErrorCode =
   | 'DISPLAY_NAME_INVALID'
   | 'PASSWORD_INVALID'
   | 'PASSWORD_INCORRECT'
+  | 'MESSAGE_INVALID'
   | 'SELF_FRIEND'
   | 'UNAUTHENTICATED'
   | 'INVALID_CREDENTIALS'
@@ -84,13 +85,15 @@ export type FriendshipList = {
 }
 
 // createdAt is an ISO 8601 string: JSON has no dates. senderName is the display name of the
-// friend who sent the photo, null for a photo its owner uploaded.
+// friend who sent the photo, null for a photo its owner uploaded. message is the note the
+// friend wrote with it, null without one.
 export type Photo = {
   id: string
   url: string
   thumbnailUrl: string
   createdAt: string
   senderName: string | null
+  message: string | null
 }
 
 // nextCursor is the id to send as cursor for the next page; null on the last page.
~~~~

- [ ] **Step 2: Unit gates**

`pnpm check && pnpm typecheck && pnpm test` → `Test Files  20 passed (20)`, `Tests  234 passed (234)`.

- [ ] **Step 3: Controller checkpoint C1, then Bruno**

Ask the controller for C1 (`pnpm db:push`, no seed) and wait for it. Start the test API on 3002, run the Bruno gate command twice: 115 requests, 250 assertions, all passed. Stop the test API.

- [ ] **Step 4: Docs**

In `ARCHITECTURE.md`, replace:

~~~~markdown
puis crée chez l'ami une nouvelle photo qui pointe vers **la même image Cloudinary** (`senderId` = l'expéditeur) : ni Sharp ni Cloudinary ne sont appelés.
~~~~

with:

~~~~markdown
puis crée chez l'ami une nouvelle photo qui pointe vers **la même image Cloudinary** (`senderId` = l'expéditeur, `message` = le mot facultatif de l'expéditeur, 200 caractères au plus, vérifié avant l'ami : `400 MESSAGE_INVALID`) : ni Sharp ni Cloudinary ne sont appelés. Le message de la photo d'origine ne suit pas la copie.
~~~~

In `ARCHITECTURE.md`, replace:

~~~~markdown
**Envoi à un ami depuis l'appareil** (`POST /api/photos/share`, `photo` et `friendId` en multipart) : le fichier est vérifié en premier (`400 PHOTO_MISSING`, format, taille), puis l'ami (`403 NOT_FRIENDS`),
~~~~

with:

~~~~markdown
**Envoi à un ami depuis l'appareil** (`POST /api/photos/share`, `photo`, `friendId` et `message` facultatif en multipart) : le fichier est vérifié en premier (`400 PHOTO_MISSING`, format, taille), puis le message (`400 MESSAGE_INVALID`), puis l'ami (`403 NOT_FRIENDS`),
~~~~

In `ARCHITECTURE.md`, replace:

~~~~markdown
| `POST /api/photos/:id/share`            | JSON `{ friendId }` → `201 Photo`
~~~~

with:

~~~~markdown
| `POST /api/photos/:id/share`            | JSON `{ friendId, message? }` → `201 Photo`
~~~~

In `ARCHITECTURE.md`, replace:

~~~~markdown
| `POST /api/photos/share`                | `multipart/form-data` avec `photo` (fichier) et `friendId` → `201 Photo`
~~~~

with:

~~~~markdown
| `POST /api/photos/share`                | `multipart/form-data` avec `photo` (fichier), `friendId` et `message` facultatif → `201 Photo`
~~~~

In `ARCHITECTURE.md`, replace:

~~~~markdown
Une `Photo` vaut `{ id, url, thumbnailUrl, createdAt, senderName }` (`createdAt` en ISO 8601 ; `senderName` est le nom d'affichage de l'ami qui l'a envoyée, `null` pour une photo que le compte a ajoutée lui-même).
~~~~

with:

~~~~markdown
Une `Photo` vaut `{ id, url, thumbnailUrl, createdAt, senderName, message }` (`createdAt` en ISO 8601 ; `senderName` est le nom d'affichage de l'ami qui l'a envoyée, `null` pour une photo que le compte a ajoutée lui-même ; `message` est le mot que cet ami y a joint, `null` sans message). Un message est du texte, espaces autour retirés, de 200 caractères au plus (`MAX_MESSAGE_LENGTH`, comptés après le retrait) ; vide, il compte comme absent. Les logs disent seulement s'il y en avait un (`hasMessage`), jamais son texte.
~~~~

In `ARCHITECTURE.md`, replace:

~~~~markdown
| corps JSON illisible (routes qui lisent du JSON, voir [Authentification](#authentification))                                              | 400    | `BODY_INVALID`          |
~~~~

with:

~~~~markdown
| corps JSON illisible (routes qui lisent du JSON, voir [Authentification](#authentification))                                              | 400    | `BODY_INVALID`          |
| message d'envoi trop long (plus de 200 caractères) ou qui n'est pas du texte                                                              | 400    | `MESSAGE_INVALID`       |
~~~~

In `ARCHITECTURE.md`, replace:

~~~~markdown
Le nom de l'expéditeur est lu par une jointure (`include` de `sender`, `displayName` seul), jamais recopié dans `Photo`.
~~~~

with:

~~~~markdown
Le nom de l'expéditeur est lu par une jointure (`include` de `sender`, `displayName` seul), jamais recopié dans `Photo`. `Photo.message`, facultatif, est le mot de l'expéditeur (absent sans message, et sur les photos d'avant l'étape 9, que Prisma lit comme `null`).
~~~~

- [ ] **Step 5: Commit**

`pnpm check:fix`, `pnpm build`, stage the task's files only. Subject: `feat(server): attach an optional message to a shared photo`. Body: the 200-character rule, checked before the friend; the copy carries the new sender's message; `hasMessage` in logs.

### Task 3: Shared photos stay unopened until opened (PR A, `feat/mail-server`)

**Files:**
- Modify: `server/prisma/schema.prisma`, `server/src/types.ts`, `server/src/features/photos/{photos.repository,photos.store,photos.share,photos.service,photos.controller,photos.routes}.ts`
- Create: `server/src/features/photos/photos.service.open.test.ts`
- Modify (tests): `photos.service.test.ts`, `.list`, `.delete`, `.share`, `.message` (fixtures gain `isOpened`, `makeDeps` gains `openOwned` and `findUnopened`)
- Modify (Bruno): `photos/folder.bru`, `share/folder.bru`, `share/02`, `share/08`, `share/13`, `delete/folder.bru` (seq 6), `delete/07`
- Create (Bruno): `unopened/{folder,01-nominal,02-edge-sans-cookie}.bru`, `open/{folder,01-edge-photo-d-un-autre,02-edge-id-invalide,03-nominal,04-nominal-deja-ouverte,05-edge-sans-cookie}.bru`
- Modify: `ARCHITECTURE.md`

**Interfaces:**
```ts
// photos.repository.ts
findUnopened(ownerId: string): Promise<PhotoRecord[]>
openOwned(id: string, ownerId: string): Promise<PhotoRecord | null>
// photos.service.ts
listUnopened(ownerId: string): Promise<UnopenedPhotos>
openPhoto(input: PhotoOpening): Promise<Photo> // PhotoOpening = { ownerId: string; id: string }
// types.ts
export type UnopenedPhotos = { photos: Photo[] }
// ServerToClientEvents gains 'photo:received': (photo: Photo) => void, 'photo:opened': (photo: Photo) => void
```

- [ ] **Step 1: Schema, `db:generate`, tests, code**:

~~~~diff
diff --git a/server/bruno/photos/delete/07-nominal-photo-recue-appareil.bru b/server/bruno/photos/delete/07-nominal-photo-recue-appareil.bru
index 5a01a5f..afd2228 100644
--- a/server/bruno/photos/delete/07-nominal-photo-recue-appareil.bru
+++ b/server/bruno/photos/delete/07-nominal-photo-recue-appareil.bru
@@ -25,8 +25,9 @@ assert {
 
 script:post-response {
   const axios = require('axios')
-  test('le fichier reçu ne figure plus chez l\'admin', async () => {
-    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/photos`, {
+  // Never opened: it was waiting in the unopened list, not in the library.
+  test('le fichier reçu n\'attend plus l\'admin', async () => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/photos/unopened`, {
       headers: { Cookie: bru.getVar('adminCookie') },
     })
     expect(list.data.photos.map(({ id }) => id)).to.not.include(bru.getVar('deviceSharedPhotoId'))
@@ -34,7 +35,8 @@ script:post-response {
 }
 
 docs {
-  NOMINAL → 204 : l'admin supprime le fichier reçu dans `share/08`. Aucune
+  NOMINAL → 204 : l'admin supprime le fichier reçu dans `share/08`, jamais
+  ouvert : une photo non ouverte se supprime comme les autres. Aucune
   autre photo ne renvoie à cette image : elle est détruite sur Cloudinary.
   Le lancement finit sans photo de test ni amitié.
 }
diff --git a/server/bruno/photos/delete/folder.bru b/server/bruno/photos/delete/folder.bru
index f2ae5e9..20e29a4 100644
--- a/server/bruno/photos/delete/folder.bru
+++ b/server/bruno/photos/delete/folder.bru
@@ -1,6 +1,6 @@
 meta {
   name: delete
-  seq: 4
+  seq: 6
 }
 
 docs {
diff --git a/server/bruno/photos/folder.bru b/server/bruno/photos/folder.bru
index 1628dda..ea1a83b 100644
--- a/server/bruno/photos/folder.bru
+++ b/server/bruno/photos/folder.bru
@@ -19,5 +19,9 @@ docs {
   `PHOTO_TOO_LARGE`, `FORMAT_UNSUPPORTED`, `IMAGE_UNREADABLE`, `MESSAGE_INVALID`,
   `SERVER_ERROR`)
   que le client traduit en français.
-  Ordre des dossiers : `create`, `list`, `share`, `delete`.
+  Une photo envoyée par un ami arrive non ouverte : elle attend dans
+  `unopened` jusqu'à ce que son propriétaire l'ouvre (`open`), puis rejoint
+  la bibliothèque.
+  Ordre des dossiers : `create`, `list`, `share`, `unopened`, `open`,
+  `delete`.
 }
diff --git a/server/bruno/photos/open/01-edge-photo-d-un-autre.bru b/server/bruno/photos/open/01-edge-photo-d-un-autre.bru
new file mode 100644
index 0000000..6f672e7
--- /dev/null
+++ b/server/bruno/photos/open/01-edge-photo-d-un-autre.bru
@@ -0,0 +1,39 @@
+meta {
+  name: Edge - photo d'un autre compte
+  type: http
+  seq: 1
+}
+
+post {
+  url: {{baseUrl}}/api/photos/{{sharedPhotoId}}/open
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  // Without it the request hits /api/photos//open and fails with a misleading status.
+  if (!bru.getVar('sharedPhotoId')) {
+    throw new Error('sharedPhotoId absent : lancer toute la collection, photos/share/02 doit passer')
+  }
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq PHOTO_NOT_FOUND
+}
+
+script:post-response {
+  const axios = require('axios')
+  test('la photo attend toujours l\'admin', async () => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/photos/unopened`, {
+      headers: { Cookie: bru.getVar('adminCookie') },
+    })
+    expect(list.data.photos.map(({ id }) => id)).to.include(bru.getVar('sharedPhotoId'))
+  })
+}
+
+docs {
+  EDGE → 404 PHOTO_NOT_FOUND : le membre, qui a envoyé la photo, essaie
+  d'ouvrir la copie de l'admin. La réponse est celle d'une photo inconnue ;
+  le script vérifie que la photo attend toujours l'admin.
+}
diff --git a/server/bruno/photos/open/02-edge-id-invalide.bru b/server/bruno/photos/open/02-edge-id-invalide.bru
new file mode 100644
index 0000000..1f67fbd
--- /dev/null
+++ b/server/bruno/photos/open/02-edge-id-invalide.bru
@@ -0,0 +1,21 @@
+meta {
+  name: Edge - id mal formé
+  type: http
+  seq: 2
+}
+
+post {
+  url: {{baseUrl}}/api/photos/pas-un-id/open
+  body: none
+  auth: none
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq PHOTO_NOT_FOUND
+}
+
+docs {
+  EDGE → 404 PHOTO_NOT_FOUND : un id qui n'est pas un ObjectId ne va pas
+  jusqu'à la base, il répond comme une photo inconnue.
+}
diff --git a/server/bruno/photos/open/03-nominal.bru b/server/bruno/photos/open/03-nominal.bru
new file mode 100644
index 0000000..8a50214
--- /dev/null
+++ b/server/bruno/photos/open/03-nominal.bru
@@ -0,0 +1,51 @@
+meta {
+  name: Nominal - ouvrir une photo reçue
+  type: http
+  seq: 3
+}
+
+post {
+  url: {{baseUrl}}/api/photos/{{sharedPhotoId}}/open
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('sharedPhotoId') || !bru.getVar('adminCookie')) {
+    throw new Error('sharedPhotoId ou adminCookie absent : lancer toute la collection, photos/share/02 doit passer')
+  }
+  // The received photo is the admin's.
+  req.setHeader('Cookie', bru.getVar('adminCookie'))
+}
+
+assert {
+  res.status: eq 200
+  res.body.id: eq {{sharedPhotoId}}
+  res.body.senderName: eq {{memberDisplayName}}
+  res.body.message: eq Joyeux anniversaire !
+}
+
+script:post-response {
+  const axios = require('axios')
+  const idsOf = async (path) => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}${path}`, {
+      headers: { Cookie: bru.getVar('adminCookie') },
+    })
+    return list.data.photos.map(({ id }) => id)
+  }
+  test('la photo rejoint la bibliothèque de l\'admin', async () => {
+    expect(await idsOf('/api/photos')).to.include(bru.getVar('sharedPhotoId'))
+  })
+  test('elle n\'attend plus, la photo de l\'appareil attend toujours', async () => {
+    const unopenedIds = await idsOf('/api/photos/unopened')
+    expect(unopenedIds).to.not.include(bru.getVar('sharedPhotoId'))
+    expect(unopenedIds).to.include(bru.getVar('deviceSharedPhotoId'))
+  })
+}
+
+docs {
+  NOMINAL → 200 avec la photo ouverte, son expéditeur et son message.
+  Le script vérifie qu'elle est maintenant dans la bibliothèque de l'admin,
+  plus dans ses photos en attente, et que l'autre photo reçue (`share/08`)
+  attend toujours.
+}
diff --git a/server/bruno/photos/open/04-nominal-deja-ouverte.bru b/server/bruno/photos/open/04-nominal-deja-ouverte.bru
new file mode 100644
index 0000000..d685d11
--- /dev/null
+++ b/server/bruno/photos/open/04-nominal-deja-ouverte.bru
@@ -0,0 +1,29 @@
+meta {
+  name: Nominal - photo déjà ouverte
+  type: http
+  seq: 4
+}
+
+post {
+  url: {{baseUrl}}/api/photos/{{sharedPhotoId}}/open
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('sharedPhotoId') || !bru.getVar('adminCookie')) {
+    throw new Error('sharedPhotoId ou adminCookie absent : lancer toute la collection, photos/share/02 doit passer')
+  }
+  req.setHeader('Cookie', bru.getVar('adminCookie'))
+}
+
+assert {
+  res.status: eq 200
+  res.body.id: eq {{sharedPhotoId}}
+}
+
+docs {
+  NOMINAL → 200 : ouvrir une deuxième fois ne change rien et renvoie la
+  photo. Deux appareils de l'admin peuvent l'ouvrir en même temps sans
+  erreur.
+}
diff --git a/server/bruno/photos/open/05-edge-sans-cookie.bru b/server/bruno/photos/open/05-edge-sans-cookie.bru
new file mode 100644
index 0000000..5b8c558
--- /dev/null
+++ b/server/bruno/photos/open/05-edge-sans-cookie.bru
@@ -0,0 +1,25 @@
+meta {
+  name: Edge - sans cookie de session
+  type: http
+  seq: 5
+}
+
+post {
+  url: {{baseUrl}}/api/photos/{{sharedPhotoId}}/open
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  // collection.bru sends the session cookie to every request: remove it here.
+  req.deleteHeader('Cookie')
+}
+
+assert {
+  res.status: eq 401
+  res.body.error: eq UNAUTHENTICATED
+}
+
+docs {
+  EDGE → 401 UNAUTHENTICATED : ouvrir une photo demande une session.
+}
diff --git a/server/bruno/photos/open/folder.bru b/server/bruno/photos/open/folder.bru
new file mode 100644
index 0000000..ccad244
--- /dev/null
+++ b/server/bruno/photos/open/folder.bru
@@ -0,0 +1,17 @@
+meta {
+  name: open
+  seq: 5
+}
+
+docs {
+  `POST /api/photos/:id/open`, sans corps → 200 avec la photo ouverte. Elle
+  quitte `GET /api/photos/unopened` et rejoint `GET /api/photos` à sa date de
+  réception ; l'événement Socket.IO `photo:opened` (la photo) part vers les
+  connexions du propriétaire. Ouvrir une photo déjà ouverte répond 200 de
+  nouveau, sans rien changer. Une photo d'un autre compte, inconnue ou un id
+  mal formé : 404 `PHOTO_NOT_FOUND`.
+
+  L'admin ouvre `sharedPhotoId` (reçue dans `share/02`) ;
+  `deviceSharedPhotoId` reste non ouverte jusqu'à sa suppression dans
+  `delete/07`.
+}
diff --git a/server/bruno/photos/share/02-nominal-bibliotheque.bru b/server/bruno/photos/share/02-nominal-bibliotheque.bru
index 6c190ea..c4ff229 100644
--- a/server/bruno/photos/share/02-nominal-bibliotheque.bru
+++ b/server/bruno/photos/share/02-nominal-bibliotheque.bru
@@ -48,20 +48,26 @@ script:post-response {
   if (res.body.id) {
     bru.setVar('sharedPhotoId', res.body.id)
   }
-  const photosOf = async (cookie) => {
-    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/photos`, {
+  // path is /api/photos (the library) or /api/photos/unopened (the photos waiting).
+  const photosOf = async (cookie, path) => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}${path}`, {
       headers: { Cookie: cookie },
     })
     return list.data.photos
   }
-  test('la photo reçue est dans la bibliothèque de l\'admin, envoyée par le membre', async () => {
-    const received = (await photosOf(bru.getVar('adminCookie'))).find(
+  test('la photo reçue attend l\'admin, non ouverte, avec le nom et le message', async () => {
+    const received = (await photosOf(bru.getVar('adminCookie'), '/api/photos/unopened')).find(
       ({ id }) => id === res.body.id,
     )
     expect(received?.senderName).to.equal(bru.getEnvVar('memberDisplayName'))
+    expect(received?.message).to.equal('Joyeux anniversaire !')
+  })
+  test('elle n\'est pas encore dans la bibliothèque de l\'admin', async () => {
+    const ids = (await photosOf(bru.getVar('adminCookie'), '/api/photos')).map(({ id }) => id)
+    expect(ids).to.not.include(res.body.id)
   })
   test('la bibliothèque du membre ne change pas', async () => {
-    const ids = (await photosOf(bru.getVar('sessionCookie'))).map(({ id }) => id)
+    const ids = (await photosOf(bru.getVar('sessionCookie'), '/api/photos')).map(({ id }) => id)
     expect(ids).to.not.include(res.body.id)
     expect(ids).to.include(bru.getVar('createdPhotoId'))
   })
@@ -73,6 +79,7 @@ docs {
   acceptation, id dans `shareFriendshipId`). La photo reçue pointe vers la
   même image Cloudinary que celle du membre, et le message sans les espaces
   autour (« Joyeux anniversaire ! »). Son id va dans `sharedPhotoId`.
-  Le script vérifie qu'elle est dans la liste de l'admin avec le nom du
-  membre, et que la liste du membre ne gagne pas de photo.
+  Le script vérifie qu'elle attend l'admin dans `GET /api/photos/unopened`
+  avec le nom du membre et le message, qu'elle n'est pas encore dans sa
+  bibliothèque, et que la bibliothèque du membre ne gagne pas de photo.
 }
diff --git a/server/bruno/photos/share/08-nominal-appareil.bru b/server/bruno/photos/share/08-nominal-appareil.bru
index d98f6f1..60fe7a9 100644
--- a/server/bruno/photos/share/08-nominal-appareil.bru
+++ b/server/bruno/photos/share/08-nominal-appareil.bru
@@ -27,22 +27,25 @@ script:post-response {
   if (res.body.id) {
     bru.setVar('deviceSharedPhotoId', res.body.id)
   }
-  const idsOf = async (cookie) => {
-    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/photos`, {
+  const idsOf = async (cookie, path) => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}${path}`, {
       headers: { Cookie: cookie },
     })
     return list.data.photos.map(({ id }) => id)
   }
-  test('la photo est chez l\'admin, pas chez le membre', async () => {
-    expect(await idsOf(bru.getVar('adminCookie'))).to.include(res.body.id)
-    expect(await idsOf(bru.getVar('sessionCookie'))).to.not.include(res.body.id)
+  test('la photo attend l\'admin, non ouverte, et n\'est pas chez le membre', async () => {
+    const adminCookie = bru.getVar('adminCookie')
+    expect(await idsOf(adminCookie, '/api/photos/unopened')).to.include(res.body.id)
+    expect(await idsOf(adminCookie, '/api/photos')).to.not.include(res.body.id)
+    expect(await idsOf(bru.getVar('sessionCookie'), '/api/photos')).to.not.include(res.body.id)
   })
 }
 
 docs {
   NOMINAL → 201 avec la nouvelle photo de l'admin, `senderName` `Membre`,
-  `message` `null` (aucun message envoyé). Le fichier est converti et envoyé à Cloudinary comme un envoi normal, mais
-  n'entre que dans la bibliothèque de l'ami. Son id va dans
-  `deviceSharedPhotoId` ; le script vérifie qu'il est dans la liste de
-  l'admin et absent de celle du membre.
+  `message` `null` (aucun message envoyé). Le fichier est converti et
+  envoyé à Cloudinary comme un envoi normal, mais n'entre que chez l'ami,
+  non ouvert. Son id va dans `deviceSharedPhotoId` ; le script vérifie
+  qu'il attend l'admin dans `GET /api/photos/unopened`, hors de sa
+  bibliothèque, et qu'il est absent de celle du membre.
 }
diff --git a/server/bruno/photos/share/13-nominal-fin-amitie.bru b/server/bruno/photos/share/13-nominal-fin-amitie.bru
index b08549e..4d060af 100644
--- a/server/bruno/photos/share/13-nominal-fin-amitie.bru
+++ b/server/bruno/photos/share/13-nominal-fin-amitie.bru
@@ -22,8 +22,8 @@ assert {
 
 script:post-response {
   const axios = require('axios')
-  test('les deux photos reçues restent dans la bibliothèque de l\'admin', async () => {
-    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/photos`, {
+  test('les deux photos reçues attendent toujours l\'admin', async () => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/photos/unopened`, {
       headers: { Cookie: bru.getVar('adminCookie') },
     })
     const ids = list.data.photos.map(({ id }) => id)
@@ -34,6 +34,7 @@ script:post-response {
 
 docs {
   NOMINAL → 204 : le membre retire l'admin de ses amis (l'amitié de `02`).
-  Le script vérifie que les deux photos reçues (`02` et `08`) restent chez
-  l'admin : ce sont ses photos, rien ne part en cascade.
+  Le script vérifie que les deux photos reçues (`02` et `08`) attendent
+  toujours l'admin, non ouvertes : ce sont ses photos, rien ne part en
+  cascade.
 }
diff --git a/server/bruno/photos/share/folder.bru b/server/bruno/photos/share/folder.bru
index b68c24d..2993e59 100644
--- a/server/bruno/photos/share/folder.bru
+++ b/server/bruno/photos/share/folder.bru
@@ -11,8 +11,9 @@ docs {
   (`photo`, `friendId` et `message`) : envoie un fichier de l'appareil, converti et
   envoyé à Cloudinary comme un envoi normal, mais qui n'entre que dans la
   bibliothèque de l'ami. Réponse : 201 avec la photo de l'ami, telle qu'il
-  la voit ; l'événement Socket.IO `photo:new` part vers les connexions de
-  l'ami seulement.
+  la voit. Elle arrive non ouverte : hors de sa bibliothèque (`GET
+  /api/photos`), elle attend dans `GET /api/photos/unopened`. L'événement
+  Socket.IO `photo:received` part vers les connexions de l'ami seulement.
 
   Un `friendId` absent, mal formé, inconnu, en attente ou le sien répond
   403 `NOT_FRIENDS` ; une photo d'un autre compte ou un id mal formé, 404
diff --git a/server/bruno/photos/unopened/01-nominal.bru b/server/bruno/photos/unopened/01-nominal.bru
new file mode 100644
index 0000000..e706990
--- /dev/null
+++ b/server/bruno/photos/unopened/01-nominal.bru
@@ -0,0 +1,59 @@
+meta {
+  name: Nominal - photos reçues pas encore ouvertes
+  type: http
+  seq: 1
+}
+
+get {
+  url: {{baseUrl}}/api/photos/unopened
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('sharedPhotoId') || !bru.getVar('deviceSharedPhotoId') || !bru.getVar('adminCookie')) {
+    throw new Error('sharedPhotoId, deviceSharedPhotoId ou adminCookie absent : lancer toute la collection, photos/share/02 et 08 doivent passer')
+  }
+  // The photos were sent to the admin.
+  req.setHeader('Cookie', bru.getVar('adminCookie'))
+}
+
+assert {
+  res.status: eq 200
+  res.body.photos: isArray
+}
+
+script:post-response {
+  const axios = require('axios')
+  const { photos } = res.body
+  test('les deux photos reçues dans share/ attendent, avec leur message', () => {
+    const shared = photos.find(({ id }) => id === bru.getVar('sharedPhotoId'))
+    const deviceShared = photos.find(({ id }) => id === bru.getVar('deviceSharedPhotoId'))
+    expect(shared?.message).to.equal('Joyeux anniversaire !')
+    expect(deviceShared?.message).to.equal(null)
+  })
+  test('la plus récente en premier (ids décroissants)', () => {
+    const ids = photos.map(({ id }) => id)
+    expect(ids).to.eql([...ids].sort().reverse())
+  })
+  test('chaque photo vient d\'un ami', () => {
+    for (const photo of photos) {
+      expect(photo.senderName).to.be.a('string')
+    }
+  })
+  test('elles n\'attendent pas le membre qui les a envoyées', async () => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/photos/unopened`, {
+      headers: { Cookie: bru.getVar('sessionCookie') },
+    })
+    const ids = list.data.photos.map(({ id }) => id)
+    expect(ids).to.not.include(bru.getVar('sharedPhotoId'))
+    expect(ids).to.not.include(bru.getVar('deviceSharedPhotoId'))
+  })
+}
+
+docs {
+  NOMINAL → 200 : l'admin lit ses photos en attente. Celles de `share/02`
+  (avec « Joyeux anniversaire ! ») et de `share/08` (sans message) y sont,
+  la plus récente en premier, chacune avec le nom de l'ami qui l'a envoyée.
+  La liste du membre, qui les a envoyées, ne les contient pas.
+}
diff --git a/server/bruno/photos/unopened/02-edge-sans-cookie.bru b/server/bruno/photos/unopened/02-edge-sans-cookie.bru
new file mode 100644
index 0000000..6082da1
--- /dev/null
+++ b/server/bruno/photos/unopened/02-edge-sans-cookie.bru
@@ -0,0 +1,25 @@
+meta {
+  name: Edge - sans cookie de session
+  type: http
+  seq: 2
+}
+
+get {
+  url: {{baseUrl}}/api/photos/unopened
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  // collection.bru sends the session cookie to every request: remove it here.
+  req.deleteHeader('Cookie')
+}
+
+assert {
+  res.status: eq 401
+  res.body.error: eq UNAUTHENTICATED
+}
+
+docs {
+  EDGE → 401 UNAUTHENTICATED : les photos en attente demandent une session.
+}
diff --git a/server/bruno/photos/unopened/folder.bru b/server/bruno/photos/unopened/folder.bru
new file mode 100644
index 0000000..e5d6af9
--- /dev/null
+++ b/server/bruno/photos/unopened/folder.bru
@@ -0,0 +1,15 @@
+meta {
+  name: unopened
+  seq: 4
+}
+
+docs {
+  `GET /api/photos/unopened` → 200 `{ photos }` : les photos que des amis ont
+  envoyées au compte connecté et qu'il n'a pas encore ouvertes, la plus
+  récente en premier, toutes d'un coup (pas de pages). Elles ne sont pas dans
+  `GET /api/photos` tant qu'elles ne sont pas ouvertes. Les photos ajoutées
+  par leur propriétaire n'y passent jamais.
+
+  Lancé après `share/` : l'admin y a reçu `sharedPhotoId` et
+  `deviceSharedPhotoId`.
+}
diff --git a/server/prisma/schema.prisma b/server/prisma/schema.prisma
index 8d359fb..392b655 100644
--- a/server/prisma/schema.prisma
+++ b/server/prisma/schema.prisma
@@ -58,6 +58,9 @@ model Photo {
   sha256       String
   // The sender's note, 200 characters at most; absent when there is none.
   message      String?
+  // false until the owner opens a photo a friend sent. Unset on photos saved before
+  // step 9: they count as opened.
+  isOpened     Boolean?
   createdAt    DateTime @default(now())
 
   @@unique([ownerId, sha256])
diff --git a/server/src/features/photos/photos.controller.ts b/server/src/features/photos/photos.controller.ts
index 5e1f662..acc27ba 100644
--- a/server/src/features/photos/photos.controller.ts
+++ b/server/src/features/photos/photos.controller.ts
@@ -1,7 +1,7 @@
 import type { Request, Response } from 'express'
 import { deliveryUrls } from '../../lib/cloudinary.js'
 import type { SocketServer } from '../../lib/socket-types.js'
-import type { Photo, PhotoPage } from '../../types.js'
+import type { Photo, PhotoPage, UnopenedPhotos } from '../../types.js'
 import { currentUser } from '../auth/auth.guard.js'
 import { userRoom } from '../auth/auth.socket.js'
 import type { PhotoRecord } from './photos.repository.js'
@@ -11,6 +11,8 @@ export type PhotosController = {
   list: (req: Request, res: Response) => Promise<void>
   create: (req: Request, res: Response) => Promise<void>
   remove: (req: Request<{ id: string }>, res: Response) => Promise<void>
+  listUnopened: (req: Request, res: Response) => Promise<void>
+  open: (req: Request<{ id: string }>, res: Response) => Promise<void>
   shareFromLibrary: (req: Request<{ id: string }>, res: Response) => Promise<void>
   shareFromDevice: (req: Request, res: Response) => Promise<void>
 }
@@ -36,6 +38,13 @@ function announceNewPhoto({ io }: ControllerDeps, res: Response, record: PhotoRe
   res.status(201).json(photo)
 }
 
+// A shared photo waits unopened: the friend's pages announce it instead of showing it.
+function announceReceivedPhoto({ io }: ControllerDeps, res: Response, record: PhotoRecord): void {
+  const photo = toPhotoDto(record)
+  io.to(userRoom(record.ownerId)).emit('photo:received', photo)
+  res.status(201).json(photo)
+}
+
 async function list({ service }: ControllerDeps, req: Request, res: Response): Promise<void> {
   const { records, nextCursor } = await service.listPage({
     ownerId: currentUser(req).id,
@@ -62,6 +71,28 @@ async function remove(
   res.status(204).end()
 }
 
+async function listUnopened(
+  { service }: ControllerDeps,
+  req: Request,
+  res: Response,
+): Promise<void> {
+  const records = await service.listUnopened(currentUser(req).id)
+  const unopened: UnopenedPhotos = { photos: records.map(toPhotoDto) }
+  res.json(unopened)
+}
+
+// Every page of the owner learns it: the frame adds it to the slideshow, the counters drop.
+async function open(
+  { service, io }: ControllerDeps,
+  req: Request<{ id: string }>,
+  res: Response,
+): Promise<void> {
+  const ownerId = currentUser(req).id
+  const photo = toPhotoDto(await service.openPhoto({ ownerId, id: req.params.id }))
+  io.to(userRoom(ownerId)).emit('photo:opened', photo)
+  res.json(photo)
+}
+
 // The new photo is the friend's: it goes to their room, the sender's library does not change.
 async function shareFromLibrary(
   deps: ControllerDeps,
@@ -74,7 +105,7 @@ async function shareFromLibrary(
     friendId: req.body?.friendId,
     message: req.body?.message,
   })
-  announceNewPhoto(deps, res, record)
+  announceReceivedPhoto(deps, res, record)
 }
 
 // multer fills req.body with the text fields: friendId and message are two of them.
@@ -85,7 +116,7 @@ async function shareFromDevice(deps: ControllerDeps, req: Request, res: Response
     friendId: req.body?.friendId,
     message: req.body?.message,
   })
-  announceNewPhoto(deps, res, record)
+  announceReceivedPhoto(deps, res, record)
 }
 
 export function createPhotosController(service: PhotosService, io: SocketServer): PhotosController {
@@ -94,6 +125,8 @@ export function createPhotosController(service: PhotosService, io: SocketServer)
     list: (req, res) => list(deps, req, res),
     create: (req, res) => create(deps, req, res),
     remove: (req, res) => remove(deps, req, res),
+    listUnopened: (req, res) => listUnopened(deps, req, res),
+    open: (req, res) => open(deps, req, res),
     shareFromLibrary: (req, res) => shareFromLibrary(deps, req, res),
     shareFromDevice: (req, res) => shareFromDevice(deps, req, res),
   }
diff --git a/server/src/features/photos/photos.repository.ts b/server/src/features/photos/photos.repository.ts
index 618c61a..cf4d2d8 100644
--- a/server/src/features/photos/photos.repository.ts
+++ b/server/src/features/photos/photos.repository.ts
@@ -17,6 +17,7 @@ export type NewPhoto = {
   ownerId: string
   senderId?: string
   message?: string
+  isOpened: boolean
   url: string
   cloudinaryId: string
   sha256: string
@@ -25,16 +26,27 @@ export type NewPhoto = {
 export type PageQuery = { ownerId: string; beforeId: string | undefined; take: number }
 
 export type PhotosRepository = {
+  // Opened photos only: the library and the slideshow.
   findPage: (query: PageQuery) => Promise<PhotoRecord[]>
+  // Photos friends sent that the owner has not opened yet, newest first.
+  findUnopened: (ownerId: string) => Promise<PhotoRecord[]>
   findByOwnerAndSha256: (ownerId: string, sha256: string) => Promise<StoredPhoto | null>
   // null unless this owner has a photo with this id: someone else's answers like a missing one.
   findOwned: (id: string, ownerId: string) => Promise<StoredPhoto | null>
   // null when the owner already has this file: the service decides the error.
   create: (photo: NewPhoto) => Promise<PhotoRecord | null>
   deleteOwned: (id: string, ownerId: string) => Promise<StoredPhoto | null>
+  // null unless this owner has a photo with this id, like findOwned.
+  openOwned: (id: string, ownerId: string) => Promise<PhotoRecord | null>
   countByCloudinaryId: (cloudinaryId: string) => Promise<number>
 }
 
+// isOpened is unset on photos saved before step 9: they count as opened. Prisma's
+// { not: false } would leave them out, it matches only a stored true or null.
+const IS_OPENED = {
+  OR: [{ isOpened: true }, { isOpened: { isSet: false } }],
+} satisfies Prisma.PhotoWhereInput
+
 // P2025: no record matches: unknown, already deleted by another request, or someone else's.
 function isRecordNotFound(error: unknown): boolean {
   return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
@@ -72,22 +84,49 @@ async function deleteOwned(
   }
 }
 
+// Same atomic query as deleteOwned. Opening twice changes nothing and answers the photo again.
+async function openOwned(
+  prisma: PrismaClient,
+  id: string,
+  ownerId: string,
+): Promise<PhotoRecord | null> {
+  try {
+    return await prisma.photo.update({
+      where: { id, ownerId },
+      data: { isOpened: true },
+      include: SENDER_NAME,
+    })
+  } catch (error: unknown) {
+    if (isRecordNotFound(error)) {
+      return null
+    }
+    throw error
+  }
+}
+
 export function createPhotosRepository(prisma: PrismaClient): PhotosRepository {
   return {
     // Keyset on the id: an ObjectId starts with its creation time, so by id is newest
     // first, and "older than the cursor" is a single indexed range.
     findPage: ({ ownerId, beforeId, take }) =>
       prisma.photo.findMany({
-        where: { ownerId, id: beforeId ? { lt: beforeId } : undefined },
+        where: { ownerId, id: beforeId ? { lt: beforeId } : undefined, ...IS_OPENED },
         orderBy: { id: 'desc' },
         take,
         include: SENDER_NAME,
       }),
+    findUnopened: (ownerId) =>
+      prisma.photo.findMany({
+        where: { ownerId, isOpened: false },
+        orderBy: { id: 'desc' },
+        include: SENDER_NAME,
+      }),
     findByOwnerAndSha256: (ownerId, sha256) =>
       prisma.photo.findUnique({ where: { ownerId_sha256: { ownerId, sha256 } } }),
     findOwned: (id, ownerId) => prisma.photo.findFirst({ where: { id, ownerId } }),
     create: (photo) => createRecord(prisma, photo),
     deleteOwned: (id, ownerId) => deleteOwned(prisma, id, ownerId),
+    openOwned: (id, ownerId) => openOwned(prisma, id, ownerId),
     countByCloudinaryId: (cloudinaryId) => prisma.photo.count({ where: { cloudinaryId } }),
   }
 }
diff --git a/server/src/features/photos/photos.routes.ts b/server/src/features/photos/photos.routes.ts
index a1e3d61..eeb6fb0 100644
--- a/server/src/features/photos/photos.routes.ts
+++ b/server/src/features/photos/photos.routes.ts
@@ -5,10 +5,12 @@ import { upload } from './photos.upload.js'
 export function createPhotosRouter(controller: PhotosController): Router {
   const router = Router()
   router.get('/', controller.list)
+  router.get('/unopened', controller.listUnopened)
   router.post('/', upload.single('photo'), controller.create)
   router.post('/share', upload.single('photo'), controller.shareFromDevice)
   router.delete('/:id', controller.remove)
   // A JSON route brings its own parser (see the logging spec): the others are multipart.
   router.post('/:id/share', express.json(), controller.shareFromLibrary)
+  router.post('/:id/open', controller.open)
   return router
 }
diff --git a/server/src/features/photos/photos.service.delete.test.ts b/server/src/features/photos/photos.service.delete.test.ts
index 03b3045..3c48ffe 100644
--- a/server/src/features/photos/photos.service.delete.test.ts
+++ b/server/src/features/photos/photos.service.delete.test.ts
@@ -10,6 +10,7 @@ const RECORD: PhotoRecord = {
   ownerId: OWNER_ID,
   senderId: null,
   message: null,
+  isOpened: true,
   sender: null,
   ...IMAGE,
   sha256: 'sha-of-the-original-bytes',
@@ -26,6 +27,8 @@ function makeDeps() {
       findOwned: vi.fn<PhotosRepository['findOwned']>(),
       create: vi.fn<PhotosRepository['create']>(),
       deleteOwned: vi.fn<PhotosRepository['deleteOwned']>().mockResolvedValue(RECORD),
+      openOwned: vi.fn<PhotosRepository['openOwned']>(),
+      findUnopened: vi.fn<PhotosRepository['findUnopened']>(),
       countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>().mockResolvedValue(0),
     },
     toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>(),
diff --git a/server/src/features/photos/photos.service.list.test.ts b/server/src/features/photos/photos.service.list.test.ts
index 71a2b1a..6639e97 100644
--- a/server/src/features/photos/photos.service.list.test.ts
+++ b/server/src/features/photos/photos.service.list.test.ts
@@ -13,6 +13,7 @@ function recordWithId(id: string): PhotoRecord {
     ownerId: OWNER_ID,
     senderId: null,
     message: null,
+    isOpened: true,
     sender: null,
     url: 'https://res.cloudinary.com/demo/photo.jpg',
     cloudinaryId: `familyframe/${id}`,
@@ -37,6 +38,8 @@ function makeDeps() {
       findOwned: vi.fn<PhotosRepository['findOwned']>(),
       create: vi.fn<PhotosRepository['create']>(),
       deleteOwned: vi.fn<PhotosRepository['deleteOwned']>(),
+      openOwned: vi.fn<PhotosRepository['openOwned']>(),
+      findUnopened: vi.fn<PhotosRepository['findUnopened']>(),
       countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>(),
     },
     toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>(),
diff --git a/server/src/features/photos/photos.service.message.test.ts b/server/src/features/photos/photos.service.message.test.ts
index 639d7fa..da1879b 100644
--- a/server/src/features/photos/photos.service.message.test.ts
+++ b/server/src/features/photos/photos.service.message.test.ts
@@ -15,6 +15,7 @@ const ORIGINAL: StoredPhoto = {
   ...IMAGE,
   sha256: 'sha-of-the-original-bytes',
   message: 'Le message reçu avec la photo',
+  isOpened: true,
   createdAt: new Date('2026-11-23T10:00:00Z'),
 }
 const COPY: PhotoRecord = {
@@ -24,6 +25,7 @@ const COPY: PhotoRecord = {
   senderId: SENDER_ID,
   sender: { displayName: 'Membre' },
   message: 'Joyeux anniversaire !',
+  isOpened: false,
 }
 const PNG_FILE: UploadedFile = { buffer: Buffer.from('raw png'), mimetype: 'image/png' }
 const NOT_TEXT_MESSAGES: unknown[] = [42, ['un', 'deux'], { text: 'bonjour' }]
@@ -39,6 +41,8 @@ function makeDeps() {
       findOwned: vi.fn<PhotosRepository['findOwned']>().mockResolvedValue(ORIGINAL),
       create: vi.fn<PhotosRepository['create']>().mockResolvedValue(COPY),
       deleteOwned: vi.fn<PhotosRepository['deleteOwned']>(),
+      openOwned: vi.fn<PhotosRepository['openOwned']>(),
+      findUnopened: vi.fn<PhotosRepository['findUnopened']>(),
       countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>(),
     },
     toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>().mockResolvedValue(Buffer.from('jpeg')),
diff --git a/server/src/features/photos/photos.service.open.test.ts b/server/src/features/photos/photos.service.open.test.ts
new file mode 100644
index 0000000..683b521
--- /dev/null
+++ b/server/src/features/photos/photos.service.open.test.ts
@@ -0,0 +1,98 @@
+import { describe, expect, it, vi } from 'vitest'
+import type { Logger } from '../../lib/logger.js'
+import type { PhotoRecord, PhotosRepository } from './photos.repository.js'
+import { createPhotosService, type PhotosServiceDeps } from './photos.service.js'
+
+const OWNER_ID = '6b044f9d56a44767c7079b02'
+// A photo a friend sent, once opened: the repository answers it with the sender's name.
+const OPENED: PhotoRecord = {
+  id: '6b044f9d56a44767c7079a02',
+  ownerId: OWNER_ID,
+  senderId: '6b044f9d56a44767c7079b01',
+  message: 'Joyeux anniversaire !',
+  isOpened: true,
+  url: 'https://res.cloudinary.com/demo/photo.jpg',
+  cloudinaryId: 'familyframe/abc',
+  sha256: 'sha-of-the-bytes',
+  createdAt: new Date('2026-11-24T10:00:00Z'),
+  sender: { displayName: 'Membre' },
+}
+
+// Every dependency succeeds by default; each test breaks only the one it is about.
+function makeDeps() {
+  return {
+    repository: {
+      findPage: vi.fn<PhotosRepository['findPage']>(),
+      findByOwnerAndSha256: vi.fn<PhotosRepository['findByOwnerAndSha256']>(),
+      findOwned: vi.fn<PhotosRepository['findOwned']>(),
+      create: vi.fn<PhotosRepository['create']>(),
+      deleteOwned: vi.fn<PhotosRepository['deleteOwned']>(),
+      openOwned: vi.fn<PhotosRepository['openOwned']>().mockResolvedValue(OPENED),
+      findUnopened: vi.fn<PhotosRepository['findUnopened']>().mockResolvedValue([]),
+      countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>(),
+    },
+    toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>(),
+    uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>(),
+    deleteImage: vi.fn<PhotosServiceDeps['deleteImage']>(),
+    areFriends: vi.fn<PhotosServiceDeps['areFriends']>(),
+    logger: {
+      info: vi.fn<Logger['info']>(),
+      warn: vi.fn<Logger['warn']>(),
+      error: vi.fn<Logger['error']>(),
+    },
+  }
+}
+
+describe('openPhoto', () => {
+  it("opens the owner's photo and returns it with its sender and message", async () => {
+    const deps = makeDeps()
+
+    const record = await createPhotosService(deps).openPhoto({ ownerId: OWNER_ID, id: OPENED.id })
+
+    expect(deps.repository.openOwned).toHaveBeenCalledWith(OPENED.id, OWNER_ID)
+    expect(record).toBe(OPENED)
+  })
+
+  it('logs the opening by identifiers only, never the message', async () => {
+    const deps = makeDeps()
+
+    await createPhotosService(deps).openPhoto({ ownerId: OWNER_ID, id: OPENED.id })
+
+    expect(deps.logger.info).toHaveBeenCalledWith('photo.opened', {
+      photoId: OPENED.id,
+      userId: OWNER_ID,
+    })
+  })
+
+  it('answers PHOTO_NOT_FOUND for a photo of another account or a missing one', async () => {
+    const deps = makeDeps()
+    deps.repository.openOwned.mockResolvedValue(null)
+
+    await expect(
+      createPhotosService(deps).openPhoto({ ownerId: OWNER_ID, id: OPENED.id }),
+    ).rejects.toMatchObject({ code: 'PHOTO_NOT_FOUND' })
+    expect(deps.logger.info).not.toHaveBeenCalled()
+  })
+
+  it('answers PHOTO_NOT_FOUND for a malformed id, without asking the database', async () => {
+    const deps = makeDeps()
+
+    await expect(
+      createPhotosService(deps).openPhoto({ ownerId: OWNER_ID, id: 'pas-un-id' }),
+    ).rejects.toMatchObject({ code: 'PHOTO_NOT_FOUND' })
+    expect(deps.repository.openOwned).not.toHaveBeenCalled()
+  })
+})
+
+describe('listUnopened', () => {
+  it("returns the owner's unopened photos as the repository orders them", async () => {
+    const deps = makeDeps()
+    const unopened = [{ ...OPENED, isOpened: false }]
+    deps.repository.findUnopened.mockResolvedValue(unopened)
+
+    const records = await createPhotosService(deps).listUnopened(OWNER_ID)
+
+    expect(deps.repository.findUnopened).toHaveBeenCalledWith(OWNER_ID)
+    expect(records).toBe(unopened)
+  })
+})
diff --git a/server/src/features/photos/photos.service.share.test.ts b/server/src/features/photos/photos.service.share.test.ts
index ea5cd34..1ad7fd4 100644
--- a/server/src/features/photos/photos.service.share.test.ts
+++ b/server/src/features/photos/photos.service.share.test.ts
@@ -13,6 +13,7 @@ const ORIGINAL: StoredPhoto = {
   ownerId: SENDER_ID,
   senderId: null,
   message: null,
+  isOpened: true,
   ...IMAGE,
   sha256: 'sha-of-the-original-bytes',
   createdAt: new Date('2026-11-23T10:00:00Z'),
@@ -23,6 +24,7 @@ const COPY: PhotoRecord = {
   id: '6b044f9d56a44767c7079a02',
   ownerId: FRIEND_ID,
   senderId: SENDER_ID,
+  isOpened: false,
   sender: { displayName: 'Membre' },
   createdAt: new Date('2026-11-24T10:00:00Z'),
 }
@@ -48,6 +50,8 @@ function makeDeps() {
       findOwned: vi.fn<PhotosRepository['findOwned']>().mockResolvedValue(ORIGINAL),
       create: vi.fn<PhotosRepository['create']>().mockResolvedValue(COPY),
       deleteOwned: vi.fn<PhotosRepository['deleteOwned']>(),
+      openOwned: vi.fn<PhotosRepository['openOwned']>(),
+      findUnopened: vi.fn<PhotosRepository['findUnopened']>(),
       countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>(),
     },
     toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>().mockResolvedValue(FRAME_JPEG),
@@ -72,7 +76,7 @@ function shareOriginal(deps: PhotosServiceDeps, friendId: unknown): Promise<Phot
 }
 
 describe('shareFromLibrary', () => {
-  it('gives the friend a new photo of the same image, without uploading it again', async () => {
+  it('gives the friend a new, unopened photo of the same image, without uploading it again', async () => {
     const deps = makeDeps()
 
     const record = await shareOriginal(deps, FRIEND_ID)
@@ -84,6 +88,7 @@ describe('shareFromLibrary', () => {
     expect(deps.repository.create).toHaveBeenCalledWith({
       ownerId: FRIEND_ID,
       senderId: SENDER_ID,
+      isOpened: false,
       ...IMAGE,
       sha256: ORIGINAL.sha256,
     })
@@ -187,7 +192,7 @@ function sharePng(deps: PhotosServiceDeps, friendId: unknown): Promise<PhotoReco
 }
 
 describe('shareFromDevice', () => {
-  it("converts and uploads the file into the friend's library only", async () => {
+  it("converts and uploads the file into the friend's library only, unopened", async () => {
     const deps = makeDeps()
 
     const record = await sharePng(deps, FRIEND_ID)
@@ -199,6 +204,7 @@ describe('shareFromDevice', () => {
     expect(deps.repository.create).toHaveBeenCalledWith({
       ownerId: FRIEND_ID,
       senderId: SENDER_ID,
+      isOpened: false,
       ...FRESH_IMAGE,
       sha256: PNG_SHA256,
     })
diff --git a/server/src/features/photos/photos.service.test.ts b/server/src/features/photos/photos.service.test.ts
index 17521ac..06feac5 100644
--- a/server/src/features/photos/photos.service.test.ts
+++ b/server/src/features/photos/photos.service.test.ts
@@ -16,6 +16,7 @@ const RECORD: PhotoRecord = {
   ownerId: OWNER_ID,
   senderId: null,
   message: null,
+  isOpened: true,
   sender: null,
   ...IMAGE,
   sha256: JPEG_SHA256,
@@ -33,6 +34,8 @@ function makeDeps() {
       findOwned: vi.fn<PhotosRepository['findOwned']>(),
       create: vi.fn<PhotosRepository['create']>().mockResolvedValue(RECORD),
       deleteOwned: vi.fn<PhotosRepository['deleteOwned']>().mockResolvedValue(RECORD),
+      openOwned: vi.fn<PhotosRepository['openOwned']>(),
+      findUnopened: vi.fn<PhotosRepository['findUnopened']>(),
       countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>().mockResolvedValue(0),
     },
     toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>().mockResolvedValue(FRAME_JPEG),
@@ -48,7 +51,7 @@ function makeDeps() {
 }
 
 describe('createPhoto', () => {
-  it('saves the uploaded image for its owner with the hash of the original bytes', async () => {
+  it('saves the uploaded image for its owner, already opened, with the hash of the original bytes', async () => {
     const deps = makeDeps()
 
     const record = await createPhotosService(deps).createPhoto({
@@ -63,6 +66,7 @@ describe('createPhoto', () => {
     // Not the hash of FRAME_JPEG: sharp's output is not guaranteed to be stable.
     expect(deps.repository.create).toHaveBeenCalledWith({
       ownerId: OWNER_ID,
+      isOpened: true,
       ...IMAGE,
       sha256: JPEG_SHA256,
     })
diff --git a/server/src/features/photos/photos.service.ts b/server/src/features/photos/photos.service.ts
index b4db4a2..1c9b5b8 100644
--- a/server/src/features/photos/photos.service.ts
+++ b/server/src/features/photos/photos.service.ts
@@ -22,6 +22,9 @@ export type NewPhotoInput = { ownerId: string; file: UploadedFile | undefined }
 
 export type PhotoDeletion = { ownerId: string; id: string }
 
+// id comes straight from the URL: validated here.
+export type PhotoOpening = { ownerId: string; id: string }
+
 // cursor and limit come straight from the query string: validated here, at the boundary.
 export type PageInput = { ownerId: string; cursor: unknown; limit: unknown }
 
@@ -41,6 +44,9 @@ export type PhotosService = {
   listPage: (input: PageInput) => Promise<RecordPage>
   createPhoto: (input: NewPhotoInput) => Promise<PhotoRecord>
   deletePhoto: (deletion: PhotoDeletion) => Promise<string>
+  listUnopened: (ownerId: string) => Promise<PhotoRecord[]>
+  // The opened photo joins the library: the controller sends it to the owner's room.
+  openPhoto: (opening: PhotoOpening) => Promise<PhotoRecord>
   // Returns the friend's new photo: the controller sends it to the friend's room.
   shareFromLibrary: (share: LibraryShare) => Promise<PhotoRecord>
   // The file lands in the friend's library only, not in the sender's.
@@ -100,6 +106,19 @@ async function deletePhoto(
   return record.id
 }
 
+// Someone else's photo answers like a missing one, as for a deletion.
+async function openPhoto(
+  { repository, logger }: PhotosServiceDeps,
+  { ownerId, id }: PhotoOpening,
+): Promise<PhotoRecord> {
+  const record = await repository.openOwned(parsePhotoId(id), ownerId)
+  if (!record) {
+    throw new AppError('PHOTO_NOT_FOUND')
+  }
+  logger.info('photo.opened', { photoId: record.id, userId: ownerId })
+  return record
+}
+
 // One record more than asked tells whether a next page exists, without a count query.
 async function listPage(
   { repository }: PhotosServiceDeps,
@@ -120,6 +139,8 @@ export function createPhotosService(deps: PhotosServiceDeps): PhotosService {
     listPage: (input) => listPage(deps, input),
     createPhoto: (input) => createPhoto(deps, input),
     deletePhoto: (deletion) => deletePhoto(deps, deletion),
+    listUnopened: (ownerId) => deps.repository.findUnopened(ownerId),
+    openPhoto: (opening) => openPhoto(deps, opening),
     shareFromLibrary: (share) => shareFromLibrary(deps, share),
     shareFromDevice: (share) => shareFromDevice(deps, share),
   }
diff --git a/server/src/features/photos/photos.share.ts b/server/src/features/photos/photos.share.ts
index 0d2d1e8..5e37d91 100644
--- a/server/src/features/photos/photos.share.ts
+++ b/server/src/features/photos/photos.share.ts
@@ -75,8 +75,15 @@ export async function shareFromLibrary(
   const { id, url, cloudinaryId, sha256 } = await findOwnedPhoto(deps, validPhotoId, senderId)
   await rejectKnownFile(deps, recipientId, sha256)
   // The copy carries this sender's message, never the one the original came with.
-  const copy = { ownerId: recipientId, senderId, message: validMessage, url, cloudinaryId, sha256 }
-  const record = await saveCopy(deps, copy)
+  const record = await saveCopy(deps, {
+    ownerId: recipientId,
+    senderId,
+    message: validMessage,
+    isOpened: false,
+    url,
+    cloudinaryId,
+    sha256,
+  })
   deps.logger.info('photo.shared', {
     photoId: record.id,
     sourcePhotoId: id,
diff --git a/server/src/features/photos/photos.store.ts b/server/src/features/photos/photos.store.ts
index cf2c1ad..bc0d62c 100644
--- a/server/src/features/photos/photos.store.ts
+++ b/server/src/features/photos/photos.store.ts
@@ -86,5 +86,7 @@ export async function storeNewPhoto(
   const jpeg = await convertToFrameJpeg(deps, buffer)
   // Cloudinary and database failures are ours: they stay 500s.
   const image = await deps.uploadImage(jpeg)
-  return saveRecord(deps, { ownerId, senderId, message, ...image, sha256 })
+  // A photo one adds oneself is already seen; one a friend sends waits to be opened.
+  const isOpened = senderId === undefined
+  return saveRecord(deps, { ownerId, senderId, message, isOpened, ...image, sha256 })
 }
diff --git a/server/src/types.ts b/server/src/types.ts
index 5ef90eb..f28b6a8 100644
--- a/server/src/types.ts
+++ b/server/src/types.ts
@@ -102,8 +102,15 @@ export type PhotoPage = {
   nextCursor: string | null
 }
 
+// Newest first, all at once: a handful of photos waiting, not a library to page through.
+export type UnopenedPhotos = { photos: Photo[] }
+
+// photo:new is a photo one added oneself, photo:received one a friend sent, still unopened;
+// photo:opened is a received photo that just joined the library.
 export type ServerToClientEvents = {
   'photo:new': (photo: Photo) => void
+  'photo:received': (photo: Photo) => void
+  'photo:opened': (photo: Photo) => void
   'photo:deleted': (id: string) => void
 }
~~~~

- [ ] **Step 2: Unit gates**

`pnpm check && pnpm typecheck && pnpm test` → `Test Files  21 passed (21)`, `Tests  239 passed (239)`.

- [ ] **Step 3: Controller checkpoint C2, then Bruno**

Ask the controller for C2 (`pnpm db:push`, no seed). Test API on 3002, Bruno gate command twice: 122 requests, 266 assertions, all passed. Stop the test API. Check the test API log: `photo.opened` lines carry only `photoId` and `userId`.

- [ ] **Step 4: Docs**

In `ARCHITECTURE.md`, replace:

~~~~markdown
L'événement `photo:new` part vers les connexions de l'ami ; l'image n'est détruite qu'avec la dernière photo qui y renvoie.
~~~~

with:

~~~~markdown
La copie arrive **non ouverte** (`isOpened: false`) : l'événement `photo:received` part vers les connexions de l'ami, qui l'annoncent sans l'afficher ; l'image n'est détruite qu'avec la dernière photo qui y renvoie.
~~~~

In `ARCHITECTURE.md`, replace:

~~~~markdown
Il n'entre que dans la bibliothèque de l'ami.
~~~~

with:

~~~~markdown
Il n'entre que chez l'ami, non ouvert lui aussi (`photo:received`).

**Ouverture d'une photo reçue** (`POST /api/photos/:id/open`) : `GET /api/photos/unopened` donne les photos en attente ; quand l'une s'affiche dans la découverte, le client l'ouvre. Le serveur passe `isOpened` à `true` en une requête qui vérifie aussi le propriétaire (`404 PHOTO_NOT_FOUND` sinon), puis émet `photo:opened` vers les connexions du compte : la bibliothèque et le cadre l'ajoutent à sa date de réception, l'annonce la retire. Ouvrir deux fois ne change rien.
~~~~

In `ARCHITECTURE.md`, replace:

~~~~markdown
| `GET /api/photos?cursor=<id>&limit=<n>` | `200 { photos, nextCursor }` : photos du compte connecté, la plus récente en premier ;
~~~~

with:

~~~~markdown
| `GET /api/photos?cursor=<id>&limit=<n>` | `200 { photos, nextCursor }` : photos du compte connecté, la plus récente en premier, sans les photos reçues pas encore ouvertes ;
~~~~

In `ARCHITECTURE.md`, replace:

~~~~markdown
| `DELETE /api/photos/:id`                |
~~~~

with:

~~~~markdown
| `GET /api/photos/unopened`              | `200 { photos }` : les photos reçues pas encore ouvertes, la plus récente en premier, toutes d'un coup |
| `POST /api/photos/:id/open`             | sans corps → `200 Photo` : ouvre une photo reçue, qui rejoint `GET /api/photos` ; idempotent |
| `DELETE /api/photos/:id`                |
~~~~

In `ARCHITECTURE.md`, replace:

~~~~markdown
- Deux événements, du serveur vers les connexions du propriétaire de la photo (`io.to(userRoom(ownerId))`) : `photo:new` avec la `Photo` créée, `photo:deleted` avec l'id de la photo supprimée. Les autres comptes ne les reçoivent pas. Une photo envoyée à un ami appartient à l'ami : `photo:new` part vers ses connexions, pas vers celles de l'expéditeur, dont l'écran ne change pas.
~~~~

with:

~~~~markdown
- Quatre événements, du serveur vers les connexions du propriétaire de la photo (`io.to(userRoom(ownerId))`) : `photo:new` avec la `Photo` qu'il a ajoutée, `photo:received` avec la `Photo` qu'un ami lui a envoyée (non ouverte), `photo:opened` avec la `Photo` qu'il vient d'ouvrir, `photo:deleted` avec l'id de la photo supprimée. Les autres comptes ne les reçoivent pas. Une photo envoyée à un ami appartient à l'ami : `photo:received` part vers ses connexions, pas vers celles de l'expéditeur, dont l'écran ne change pas.
~~~~

In `ARCHITECTURE.md`, replace:

~~~~markdown
- Piège MongoDB : Prisma n'écrit pas un champ facultatif absent du `create`, et `where: { usedAt: null }` ne trouve qu'un `null` enregistré, pas un champ absent.
~~~~

with:

~~~~markdown
- `Photo.isOpened`, facultatif : `true` pour une photo ajoutée par son propriétaire, `false` pour une photo reçue jusqu'à son ouverture. Les photos d'avant l'étape 9 n'ont pas le champ et comptent comme ouvertes : aucune migration, `pnpm db:push` sans seed (pas de nouvel index). La bibliothèque filtre donc avec `OR: [{ isOpened: true }, { isOpened: { isSet: false } }]` : `{ isOpened: { not: false } }` ne renverrait pas les photos sans le champ (vérifié sur MongoDB 7 avec Prisma 6.19). Les photos en attente se lisent avec un simple `isOpened: false`, servi par l'index `(ownerId, id)`.
- Piège MongoDB : Prisma n'écrit pas un champ facultatif absent du `create`, et `where: { usedAt: null }` ne trouve qu'un `null` enregistré, pas un champ absent.
~~~~

- [ ] **Step 5: Commit**

Subject: `feat(server): keep shared photos unopened until their owner opens them`. Body: `isOpened` (legacy photos unset = opened, the `isSet` filter and why), the two routes, the two events.

---

## PR B — `feat/mail-message`

### Task 4: Write a message, show it with the photo (PR B, `feat/mail-message`)

**Files:**
- Create: `client/src/components/sharing/ShareMessageField.tsx`
- Modify: `client/src/components/sharing/ShareFriendsForm.tsx`, `client/src/hooks/useShareSending.ts`, `client/src/photosApi.ts`, `client/src/photoLabel.ts`, `client/src/components/viewer/ViewerCaption.tsx`, `client/src/components/frame/{PhotoCaption,PolaroidPrint}.tsx`
- Modify: `docs/produit/{partage,a-venir,cadre}.md`

**Interfaces:** `useShareSending().sendTo(friends: FriendUser[], message: string): Promise<void>`; `quotedMessage(message: string): string` → `« message »` with non-breaking spaces.

UI text: label « Message (facultatif) », placeholder « Un mot pour accompagner la photo », counter « N / 200 ».

- [ ] **Step 1: The code**

~~~~diff
diff --git a/client/src/components/frame/PhotoCaption.tsx b/client/src/components/frame/PhotoCaption.tsx
index cebee65..2a49f20 100644
--- a/client/src/components/frame/PhotoCaption.tsx
+++ b/client/src/components/frame/PhotoCaption.tsx
@@ -1,6 +1,6 @@
 import type { JSX } from 'react'
 import type { Photo } from '@/photo.ts'
-import { formatPhotoDay } from '@/photoLabel.ts'
+import { formatPhotoDay, quotedMessage } from '@/photoLabel.ts'
 
 type PhotoCaptionProps = {
   photo: Photo
@@ -17,6 +17,12 @@ export function PhotoCaption({ photo }: PhotoCaptionProps): JSX.Element {
           Envoyée par {photo.senderName}
         </p>
       )}
+      {/* Three lines at most: the photo stays the subject, a longer note is read in the library. */}
+      {photo.message !== null && (
+        <p className="mt-3 line-clamp-3 max-w-3xl text-2xl whitespace-pre-line text-white drop-shadow-md">
+          {quotedMessage(photo.message)}
+        </p>
+      )}
     </div>
   )
 }
diff --git a/client/src/components/frame/PolaroidPrint.tsx b/client/src/components/frame/PolaroidPrint.tsx
index 788fcf5..d16f27a 100644
--- a/client/src/components/frame/PolaroidPrint.tsx
+++ b/client/src/components/frame/PolaroidPrint.tsx
@@ -1,7 +1,7 @@
 import type { JSX, ReactNode } from 'react'
 import { cn } from '@/lib/utils.ts'
 import type { Photo } from '@/photo.ts'
-import { formatPhotoDay } from '@/photoLabel.ts'
+import { formatPhotoDay, quotedMessage } from '@/photoLabel.ts'
 
 type PolaroidPrintProps = {
   photo: Photo
@@ -34,6 +34,12 @@ export function PolaroidPrint({ photo, children }: PolaroidPrintProps): JSX.Elem
         {photo.senderName !== null && (
           <p className="text-[clamp(0.875rem,2.2vmin,1.5rem)]">Envoyée par {photo.senderName}</p>
         )}
+        {/* Written on the band like a note under a print: three lines, as on the other captions. */}
+        {photo.message !== null && (
+          <p className="mt-[1vmin] line-clamp-3 text-[clamp(0.875rem,2.2vmin,1.5rem)] whitespace-pre-line italic">
+            {quotedMessage(photo.message)}
+          </p>
+        )}
       </figcaption>
     </figure>
   )
diff --git a/client/src/components/sharing/ShareFriendsForm.tsx b/client/src/components/sharing/ShareFriendsForm.tsx
index 519af25..54359aa 100644
--- a/client/src/components/sharing/ShareFriendsForm.tsx
+++ b/client/src/components/sharing/ShareFriendsForm.tsx
@@ -3,6 +3,7 @@ import { type JSX, useState } from 'react'
 import { Link } from 'react-router'
 import { FriendPicker } from '@/components/sharing/FriendPicker.tsx'
 import { FRIEND_SEARCH_MIN_COUNT, filterFriends } from '@/components/sharing/friendSearch.ts'
+import { ShareMessageField } from '@/components/sharing/ShareMessageField.tsx'
 import { sendButtonLabel } from '@/components/sharing/shareTexts.ts'
 import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
 import { Button } from '@/components/ui/button.tsx'
@@ -72,9 +73,11 @@ function selectedUsers(friends: Friendship[], selectedIds: string[]): Friendship
 }
 
 // The selection survives the search: a friend chosen then filtered out is still sent the photo.
+// One message for everyone chosen: it goes with each copy.
 function FriendSelection({ friends, target, onSent }: FriendSelectionProps): JSX.Element {
   const [selectedIds, setSelectedIds] = useState<string[]>([])
   const [query, setQuery] = useState('')
+  const [message, setMessage] = useState('')
   const sending = useShareSending(target, onSent)
 
   return (
@@ -89,11 +92,16 @@ function FriendSelection({ friends, target, onSent }: FriendSelectionProps): JSX
         isDisabled={sending.isSending}
         onToggle={(friendId) => setSelectedIds((ids) => toggledIds(ids, friendId))}
       />
+      <ShareMessageField
+        message={message}
+        isDisabled={sending.isSending}
+        onMessageChange={setMessage}
+      />
       {sending.error && <ErrorAlert message={sending.error} />}
       <Button
         size="lg"
         disabled={selectedIds.length === 0 || sending.isSending}
-        onClick={() => sending.sendTo(selectedUsers(friends, selectedIds))}
+        onClick={() => sending.sendTo(selectedUsers(friends, selectedIds), message)}
       >
         {sending.isSending ? 'Envoi…' : sendButtonLabel(selectedIds.length)}
       </Button>
diff --git a/client/src/components/sharing/ShareMessageField.tsx b/client/src/components/sharing/ShareMessageField.tsx
new file mode 100644
index 0000000..268da95
--- /dev/null
+++ b/client/src/components/sharing/ShareMessageField.tsx
@@ -0,0 +1,41 @@
+import type { JSX } from 'react'
+import { Label } from '@/components/ui/label.tsx'
+
+// The server's limit: the field stops there, so the 400 never shows in practice.
+export const MAX_MESSAGE_LENGTH = 200
+
+type ShareMessageFieldProps = {
+  message: string
+  isDisabled: boolean
+  onMessageChange: (message: string) => void
+}
+
+// The classes of ui/input.tsx, with a height for three lines instead of one.
+const TEXTAREA_CLASSES =
+  'min-h-20 w-full min-w-0 resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30'
+
+export function ShareMessageField({
+  message,
+  isDisabled,
+  onMessageChange,
+}: ShareMessageFieldProps): JSX.Element {
+  return (
+    <div className="flex flex-col gap-2">
+      <Label htmlFor="share-message">Message (facultatif)</Label>
+      <textarea
+        id="share-message"
+        className={TEXTAREA_CLASSES}
+        rows={3}
+        maxLength={MAX_MESSAGE_LENGTH}
+        placeholder="Un mot pour accompagner la photo"
+        aria-describedby="share-message-count"
+        disabled={isDisabled}
+        value={message}
+        onChange={(event) => onMessageChange(event.target.value)}
+      />
+      <p id="share-message-count" className="self-end text-xs text-muted-foreground tabular-nums">
+        {message.length} / {MAX_MESSAGE_LENGTH}
+      </p>
+    </div>
+  )
+}
diff --git a/client/src/components/viewer/ViewerCaption.tsx b/client/src/components/viewer/ViewerCaption.tsx
index 83aec88..d4e2cb1 100644
--- a/client/src/components/viewer/ViewerCaption.tsx
+++ b/client/src/components/viewer/ViewerCaption.tsx
@@ -1,6 +1,6 @@
 import type { JSX } from 'react'
 import type { Photo } from '@/photo.ts'
-import { formatPhotoDay } from '@/photoLabel.ts'
+import { formatPhotoDay, quotedMessage } from '@/photoLabel.ts'
 
 type ViewerCaptionProps = {
   photo: Photo
@@ -16,6 +16,11 @@ export function ViewerCaption({ photo }: ViewerCaptionProps): JSX.Element {
       {photo.senderName !== null && (
         <p className="text-sm text-white/80 drop-shadow-md">Envoyée par {photo.senderName}</p>
       )}
+      {photo.message !== null && (
+        <p className="mt-2 text-base whitespace-pre-line drop-shadow-md">
+          {quotedMessage(photo.message)}
+        </p>
+      )}
     </div>
   )
 }
diff --git a/client/src/hooks/useShareSending.ts b/client/src/hooks/useShareSending.ts
index 6d0753f..ce08273 100644
--- a/client/src/hooks/useShareSending.ts
+++ b/client/src/hooks/useShareSending.ts
@@ -17,13 +17,13 @@ export type ShareTarget = { kind: 'library'; photo: Photo } | { kind: 'device';
 export type ShareSending = {
   isSending: boolean
   error: string
-  sendTo: (friends: FriendUser[]) => Promise<void>
+  sendTo: (friends: FriendUser[], message: string) => Promise<void>
 }
 
-function postShare(target: ShareTarget, friendId: string): Promise<ShareResult> {
+function postShare(target: ShareTarget, friendId: string, message: string): Promise<ShareResult> {
   return target.kind === 'library'
-    ? postLibraryShare(target.photo.id, friendId)
-    : postDeviceShare(target.file, friendId)
+    ? postLibraryShare(target.photo.id, friendId, message)
+    : postDeviceShare(target.file, friendId, message)
 }
 
 // One friend after the other: a device share uploads the whole file each time. null: the
@@ -31,10 +31,11 @@ function postShare(target: ShareTarget, friendId: string): Promise<ShareResult>
 async function shareWithEach(
   target: ShareTarget,
   friends: FriendUser[],
+  message: string,
 ): Promise<ShareOutcome[] | null> {
   const outcomes: ShareOutcome[] = []
   for (const friend of friends) {
-    const result = await postShare(target, friend.id)
+    const result = await postShare(target, friend.id, message)
     if (result.status === 'unauthenticated') return null
     outcomes.push({ ...result, name: firstName(friend.displayName) })
   }
@@ -55,10 +56,10 @@ export function useShareSending(target: ShareTarget, onSent: () => void): ShareS
   const [isSending, setIsSending] = useState(false)
   const [error, setError] = useState('')
 
-  async function sendTo(friends: FriendUser[]): Promise<void> {
+  async function sendTo(friends: FriendUser[], message: string): Promise<void> {
     setIsSending(true)
     setError('')
-    const outcomes = await shareWithEach(target, friends)
+    const outcomes = await shareWithEach(target, friends, message)
     setIsSending(false)
     // The session ended on the server: RequireAuth sends the user to /login.
     if (outcomes === null) {
diff --git a/client/src/photoLabel.ts b/client/src/photoLabel.ts
index 74e1b27..84e462f 100644
--- a/client/src/photoLabel.ts
+++ b/client/src/photoLabel.ts
@@ -11,6 +11,11 @@ export function formatPhotoDay(iso: string): string {
   return new Date(iso).toLocaleDateString('fr-FR', PHOTO_DAY_FORMAT)
 }
 
+// French quotation marks with their non-breaking spaces: the message reads as said by the sender.
+export function quotedMessage(message: string): string {
+  return `«\u00a0${message}\u00a0»`
+}
+
 // Alt texts and aria-labels: the day names the photo, the sender tells a received one apart.
 export function photoLabel({ createdAt, senderName }: Photo): string {
   const day = formatPhotoDay(createdAt)
diff --git a/client/src/photosApi.ts b/client/src/photosApi.ts
index 60ff157..ef65849 100644
--- a/client/src/photosApi.ts
+++ b/client/src/photosApi.ts
@@ -124,16 +124,30 @@ async function sendShare(url: string, init: RequestInit): Promise<ShareResult> {
   }
 }
 
-export function postLibraryShare(photoId: string, friendId: string): Promise<ShareResult> {
+// A blank message is no message: the field stays out of the request.
+export function postLibraryShare(
+  photoId: string,
+  friendId: string,
+  message: string,
+): Promise<ShareResult> {
+  const trimmedMessage = message.trim()
   return sendShare(`/api/photos/${photoId}/share`, {
     headers: { 'Content-Type': 'application/json' },
-    body: JSON.stringify({ friendId }),
+    body: JSON.stringify(
+      trimmedMessage === '' ? { friendId } : { friendId, message: trimmedMessage },
+    ),
   })
 }
 
-export function postDeviceShare(file: File, friendId: string): Promise<ShareResult> {
+export function postDeviceShare(
+  file: File,
+  friendId: string,
+  message: string,
+): Promise<ShareResult> {
+  const trimmedMessage = message.trim()
   const body = new FormData()
   body.append('photo', file)
   body.append('friendId', friendId)
+  if (trimmedMessage !== '') body.append('message', trimmedMessage)
   return sendShare('/api/photos/share', { body })
 }
~~~~

- [ ] **Step 2: Product docs**

In `docs/produit/partage.md`, replace:

~~~~markdown
- Rechercher un ami par son nom ou son adresse e-mail quand on en a beaucoup.
~~~~

with:

~~~~markdown
- Rechercher un ami par son nom ou son adresse e-mail quand on en a beaucoup.
- Écrire un petit message qui accompagne la photo, si on le souhaite.
~~~~

In `docs/produit/partage.md`, replace:

~~~~markdown
13. R-PAR-47 · Le rond de chaque proche porte sa photo de profil quand il en a une, et sa première lettre en majuscule sinon.
~~~~

with:

~~~~markdown
13. R-PAR-47 · Le rond de chaque proche porte sa photo de profil quand il en a une, et sa première lettre en majuscule sinon.
14. R-PAR-48 · Le message est facultatif et fait 200 caractères au plus ; un compteur indique combien il en reste. Les espaces au début et à la fin sont retirés, et un message vide ou fait seulement d'espaces compte comme aucun message. Envoyée à plusieurs proches en une fois, la photo leur parvient à tous avec le même message.
~~~~

In `docs/produit/partage.md`, replace:

~~~~markdown
| Bouton                               | « Envoyer », « Envoyer à 1 personne », « Envoyer à N personnes »                   |
~~~~

with:

~~~~markdown
| Champ du message                     | « Message (facultatif) », avec le compteur « N / 200 »                             |
| Message trop long                    | « Le message doit faire 200 caractères au plus. »                                  |
| Bouton                               | « Envoyer », « Envoyer à 1 personne », « Envoyer à N personnes »                   |
~~~~

In `docs/produit/partage.md`, replace:

~~~~markdown
- Joindre un message à la photo : prévu, voir [a-venir.md](a-venir.md).
~~~~

with:

~~~~markdown
- Modifier ou retirer le message une fois la photo envoyée.
- Écrire un message différent à chaque proche dans le même envoi : il faut faire un envoi par personne.
~~~~

In `docs/produit/partage.md`, replace:

~~~~markdown
7. R-PAR-36 · Sur un cadre en diaporama, la photo reçue s'affiche selon les règles d'arrivée d'une nouvelle photo (voir [cadre.md](cadre.md#arrivée-dune-nouvelle-photo)).
~~~~

with:

~~~~markdown
7. R-PAR-36 · Sur un cadre en diaporama, la photo reçue s'affiche selon les règles d'arrivée d'une nouvelle photo (voir [cadre.md](cadre.md#arrivée-dune-nouvelle-photo)).
8. R-PAR-49 · Le message de l'expéditeur s'affiche entre guillemets sous la mention « Envoyée par » : sur la photo ouverte en grand, dans la légende du diaporama et sur la bande blanche du polaroid. Sur le cadre, il tient sur trois lignes au plus ; la photo ouverte en grand le montre en entier.
9. R-PAR-50 · Une photo transférée de nouveau porte le message de la dernière personne qui l'a envoyée, ou aucun message si elle n'en a pas écrit : le message reçu avec la photo ne la suit pas.
~~~~

In `docs/produit/partage.md`, replace:

~~~~markdown
| Photo reçue (légende, liste) | « Envoyée par [nom] » |
~~~~

with:

~~~~markdown
| Photo reçue (légende, liste) | « Envoyée par [nom] » |
| Photo reçue avec un message  | « « [message] » »     |
~~~~

In `docs/produit/a-venir.md`, replace:

~~~~markdown
- Un message facultatif joint à une photo envoyée.
- Les photos reçues
~~~~

with:

~~~~markdown
- Les photos reçues
~~~~

In `docs/produit/cadre.md`, replace:

~~~~markdown
18. R-CAD-69 · Avec « Polaroïd », la date et, pour une photo reçue, « Envoyée par [nom] » s'écrivent dans la bande du tirage, et plus en bas de l'écran. Une même photo penche toujours du même côté.
~~~~

with:

~~~~markdown
18. R-CAD-69 · Remplacée : la bande du tirage porte aussi le message de l'expéditeur (R-CAD-71).
~~~~

In `docs/produit/cadre.md`, replace:

~~~~markdown
20. R-CAD-30 · La légende montre la date d'ajout ou de réception (« 24 novembre 2026 »), sans l'heure.
~~~~

with:

~~~~markdown
20. R-CAD-30 · La légende montre la date d'ajout ou de réception (« 24 novembre 2026 »), sans l'heure.
21. R-CAD-71 · Avec « Polaroïd », la date, puis pour une photo reçue « Envoyée par [nom] » et le message de l'expéditeur, s'écrivent dans la bande du tirage, et plus en bas de l'écran. Une même photo penche toujours du même côté.
~~~~

In `docs/produit/cadre.md`, replace:

~~~~markdown
| Légende d'une photo                        | « [date] » et, pour une photo reçue, « Envoyée par [nom] »                                                                   |
~~~~

with:

~~~~markdown
| Légende d'une photo                        | « [date] » et, pour une photo reçue, « Envoyée par [nom] » puis son message entre guillemets, sur trois lignes au plus        |
~~~~

- [ ] **Step 3: Gates and commit**

`pnpm check:fix && pnpm typecheck && pnpm build && pnpm test` (239 still). Subject: `feat(client): write a message with a shared photo and show it with the photo`.

---

## PR C — `feat/mail-library`

### Task 5: Follow the waiting photos and open them (PR C, `feat/mail-library`)

**Files:**
- Create: `client/src/photoMailApi.ts`, `client/src/hooks/usePhotoMail.ts`
- Modify: `client/src/photo.ts`, `client/src/photoSocket.ts`, `client/src/photoList.ts`, `client/src/hooks/usePhotoFeed.ts`, `client/src/hooks/usePhotoLibrary.ts`
- Modify: `ARCHITECTURE.md` (Temps réel)

**Interfaces:**
```ts
// photoMailApi.ts
export type OpenResult = 'opened' | 'failed' | 'unauthenticated'
export function fetchUnopenedPhotos(onUnauthenticated: () => void): Promise<Photo[] | null>
export function postOpenPhoto(id: string): Promise<OpenResult>
// hooks/usePhotoMail.ts
export type PhotoMail = { photos: Photo[]; open: (id: string) => Promise<void> }
export function usePhotoMail(): PhotoMail
```
No visible change yet: nothing renders `usePhotoMail` until Task 6 (no product doc in this task).

- [ ] **Step 1: The code**

~~~~diff
diff --git a/client/src/hooks/usePhotoFeed.ts b/client/src/hooks/usePhotoFeed.ts
index f93f6d2..9cf7e11 100644
--- a/client/src/hooks/usePhotoFeed.ts
+++ b/client/src/hooks/usePhotoFeed.ts
@@ -42,18 +42,28 @@ function createFeedLoader(
   }
 }
 
+function createPhotoAdder(
+  liveLoads: LiveLoads,
+  setPhotos: FeedSetters['setPhotos'],
+): (photo: Photo) => void {
+  return (photo) => {
+    liveLoads.rememberAdded(photo)
+    setPhotos((current) => withNewPhoto(current, photo))
+  }
+}
+
 // Returns the cleanup that stops the socket, the timer and any load still running.
 function connectPhotoFeed(setters: FeedSetters, dropUser: () => void): () => void {
   const { setPhotos } = setters
   const liveLoads = createLiveLoads()
   const load = createFeedLoader(liveLoads, setters, dropUser)
+  const addPhoto = createPhotoAdder(liveLoads, setPhotos)
 
+  // A received photo plays once opened, here or on another device: not on arrival.
   const socket = connectPhotoSocket({
     onConnect: load,
-    onNewPhoto: (photo) => {
-      liveLoads.rememberAdded(photo)
-      setPhotos((current) => withNewPhoto(current, photo))
-    },
+    onNewPhoto: addPhoto,
+    onOpenedPhoto: addPhoto,
     // The whole library is loaded: no gap to fill, the photo just leaves the list.
     onDeletedPhoto: (id) => {
       liveLoads.rememberDeleted(id)
diff --git a/client/src/hooks/usePhotoLibrary.ts b/client/src/hooks/usePhotoLibrary.ts
index 64ff644..bc9fe2a 100644
--- a/client/src/hooks/usePhotoLibrary.ts
+++ b/client/src/hooks/usePhotoLibrary.ts
@@ -96,12 +96,15 @@ function connectLibrary(
   dropUser: () => void,
 ): () => void {
   const { setPhotos } = setters
+  function addPhoto(photo: Photo): void {
+    liveLoads.rememberAdded(photo)
+    setPhotos((current) => withNewPhoto(current, photo))
+  }
+  // A received photo joins the library once opened, here or on another device.
   const socket = connectPhotoSocket({
     onConnect: createFirstPageLoader(liveLoads, setters, readLoadCount, dropUser),
-    onNewPhoto: (photo) => {
-      liveLoads.rememberAdded(photo)
-      setPhotos((current) => withNewPhoto(current, photo))
-    },
+    onNewPhoto: addPhoto,
+    onOpenedPhoto: addPhoto,
     // The delete dialog relies on this event, as on the frame.
     onDeletedPhoto: (id) => {
       liveLoads.rememberDeleted(id)
diff --git a/client/src/hooks/usePhotoMail.ts b/client/src/hooks/usePhotoMail.ts
new file mode 100644
index 0000000..4523ec2
--- /dev/null
+++ b/client/src/hooks/usePhotoMail.ts
@@ -0,0 +1,81 @@
+import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from 'react'
+import { useAuth } from '@/auth/AuthContext.ts'
+import { createLiveLoads, type LiveLoads } from '@/liveLoads.ts'
+import type { Photo } from '@/photo.ts'
+import { withNewPhoto, withoutPhoto } from '@/photoList.ts'
+import { fetchUnopenedPhotos, postOpenPhoto } from '@/photoMailApi.ts'
+import { connectPhotoSocket } from '@/photoSocket.ts'
+
+export type PhotoMail = {
+  // Photos friends sent, not opened yet: newest first, like GET /api/photos/unopened.
+  photos: Photo[]
+  // The photo leaves the list once the server has opened it; failed, it keeps waiting.
+  open: (id: string) => Promise<void>
+}
+
+type SetPhotos = Dispatch<SetStateAction<Photo[]>>
+
+function createMailLoader(
+  liveLoads: LiveLoads,
+  setPhotos: SetPhotos,
+  dropUser: () => void,
+): () => Promise<void> {
+  return async () => {
+    const loadId = liveLoads.begin()
+    const loadedPhotos = await fetchUnopenedPhotos(() => {
+      if (liveLoads.isCurrent(loadId)) dropUser()
+    })
+    if (loadedPhotos === null || !liveLoads.isCurrent(loadId)) return
+    setPhotos(liveLoads.withLiveChanges(loadedPhotos))
+  }
+}
+
+// Returns the cleanup that stops the socket and any load still running.
+function connectPhotoMail(
+  liveLoads: LiveLoads,
+  setPhotos: SetPhotos,
+  dropUser: () => void,
+): () => void {
+  function removePhoto(id: string): void {
+    liveLoads.rememberDeleted(id)
+    setPhotos((current) => withoutPhoto(current, id))
+  }
+  const socket = connectPhotoSocket({
+    onConnect: createMailLoader(liveLoads, setPhotos, dropUser),
+    onReceivedPhoto: (photo) => {
+      liveLoads.rememberAdded(photo)
+      setPhotos((current) => withNewPhoto(current, photo))
+    },
+    // Opened on this device or another one: it stops waiting everywhere.
+    onOpenedPhoto: ({ id }) => removePhoto(id),
+    onDeletedPhoto: removePhoto,
+    onRefused: dropUser,
+  })
+  return () => {
+    socket.disconnect()
+    liveLoads.stop()
+  }
+}
+
+export function usePhotoMail(): PhotoMail {
+  const { dropUser } = useAuth()
+  // useState keeps one instance across renders: its load bookkeeping must survive them.
+  const [liveLoads] = useState(createLiveLoads)
+  const [photos, setPhotos] = useState<Photo[]>([])
+
+  useEffect(() => connectPhotoMail(liveLoads, setPhotos, dropUser), [liveLoads, dropUser])
+
+  // photo:opened usually removes it first; the response covers a socket that is down.
+  const open = useCallback(
+    async (id: string): Promise<void> => {
+      const result = await postOpenPhoto(id)
+      if (result === 'unauthenticated') dropUser()
+      if (result !== 'opened') return
+      liveLoads.rememberDeleted(id)
+      setPhotos((current) => withoutPhoto(current, id))
+    },
+    [liveLoads, dropUser],
+  )
+
+  return { photos, open }
+}
diff --git a/client/src/photo.ts b/client/src/photo.ts
index 6473a6a..bbd14e0 100644
--- a/client/src/photo.ts
+++ b/client/src/photo.ts
@@ -18,8 +18,15 @@ export type PhotoPage = {
   nextCursor: string | null
 }
 
+// Newest first, all at once: a handful of photos waiting, not a library to page through.
+export type UnopenedPhotos = { photos: Photo[] }
+
+// photo:new is a photo one added oneself, photo:received one a friend sent, still unopened;
+// photo:opened is a received photo that just joined the library.
 export type ServerToClientEvents = {
   'photo:new': (photo: Photo) => void
+  'photo:received': (photo: Photo) => void
+  'photo:opened': (photo: Photo) => void
   'photo:deleted': (id: string) => void
 }
 
@@ -42,6 +49,16 @@ export function isPhoto(value: unknown): value is Photo {
   )
 }
 
+export function isUnopenedPhotos(value: unknown): value is UnopenedPhotos {
+  return (
+    typeof value === 'object' &&
+    value !== null &&
+    'photos' in value &&
+    Array.isArray(value.photos) &&
+    value.photos.every(isPhoto)
+  )
+}
+
 export function isPhotoPage(value: unknown): value is PhotoPage {
   return (
     typeof value === 'object' &&
diff --git a/client/src/photoList.ts b/client/src/photoList.ts
index bbaf52f..1ff4349 100644
--- a/client/src/photoList.ts
+++ b/client/src/photoList.ts
@@ -1,8 +1,13 @@
 import type { Photo } from '@/photo.ts'
 
-// A fetch, an upload response and the socket event can bring the same photo.
+// A fetch, an upload response and the socket event can bring the same photo. Placed by id,
+// newest first like the API: an opened photo goes back to the day it was received. Ids are
+// ObjectIds of the same length, so comparing the strings compares their creation times.
 export function withNewPhoto(photos: Photo[], photo: Photo): Photo[] {
-  return photos.some(({ id }) => id === photo.id) ? photos : [photo, ...photos]
+  if (photos.some(({ id }) => id === photo.id)) return photos
+  const olderIndex = photos.findIndex(({ id }) => id < photo.id)
+  if (olderIndex === -1) return [...photos, photo]
+  return [...photos.slice(0, olderIndex), photo, ...photos.slice(olderIndex)]
 }
 
 export function withoutPhoto(photos: Photo[], deletedId: string): Photo[] {
diff --git a/client/src/photoMailApi.ts b/client/src/photoMailApi.ts
new file mode 100644
index 0000000..b7075a0
--- /dev/null
+++ b/client/src/photoMailApi.ts
@@ -0,0 +1,34 @@
+import { UNAUTHORIZED_STATUS } from '@/api.ts'
+import { isUnopenedPhotos, type Photo } from '@/photo.ts'
+
+// failed keeps the photo waiting: the next reveal shows it again.
+export type OpenResult = 'opened' | 'failed' | 'unauthenticated'
+
+// Newest first. null keeps the photos already announced when a load fails.
+export async function fetchUnopenedPhotos(onUnauthenticated: () => void): Promise<Photo[] | null> {
+  try {
+    const res = await fetch('/api/photos/unopened')
+    if (res.status === UNAUTHORIZED_STATUS) {
+      onUnauthenticated()
+      return null
+    }
+    const data: unknown = await res.json()
+    if (isUnopenedPhotos(data)) return data.photos
+    console.error('Unexpected unopened photos payload from the API')
+    return null
+  } catch (error: unknown) {
+    console.error('Could not load unopened photos', error)
+    return null
+  }
+}
+
+export async function postOpenPhoto(id: string): Promise<OpenResult> {
+  try {
+    const res = await fetch(`/api/photos/${id}/open`, { method: 'POST' })
+    if (res.status === UNAUTHORIZED_STATUS) return 'unauthenticated'
+    return res.ok ? 'opened' : 'failed'
+  } catch (error: unknown) {
+    console.error('Could not open the photo', error)
+    return 'failed'
+  }
+}
diff --git a/client/src/photoSocket.ts b/client/src/photoSocket.ts
index 042f610..8cc1666 100644
--- a/client/src/photoSocket.ts
+++ b/client/src/photoSocket.ts
@@ -6,27 +6,42 @@ const UNAUTHENTICATED_SOCKET_ERROR = 'UNAUTHENTICATED'
 
 export type PhotoSocket = Socket<ServerToClientEvents>
 
+// Each page listens to the events it shows: the library ignores photo:received, the
+// waiting photos ignore photo:new.
 export type PhotoSocketHandlers = {
   onConnect: () => void
-  onNewPhoto: (photo: Photo) => void
-  onDeletedPhoto: (id: string) => void
   onRefused: () => void
+  onNewPhoto?: (photo: Photo) => void
+  onReceivedPhoto?: (photo: Photo) => void
+  onOpenedPhoto?: (photo: Photo) => void
+  onDeletedPhoto?: (id: string) => void
 }
 
+type PhotoEvent = 'photo:new' | 'photo:received' | 'photo:opened'
+
 // Socket.IO types are a promise, not a check.
-function handleNewPhoto(photo: unknown, onNewPhoto: (photo: Photo) => void): void {
-  if (!isPhoto(photo)) {
-    console.error('Unexpected photo:new payload from the API')
-    return
-  }
-  onNewPhoto(photo)
+function listenForPhoto(
+  socket: PhotoSocket,
+  event: PhotoEvent,
+  onPhoto: ((photo: Photo) => void) | undefined,
+): void {
+  if (!onPhoto) return
+  socket.on(event, (photo: unknown) => {
+    if (!isPhoto(photo)) {
+      console.error(`Unexpected ${event} payload from the API`)
+      return
+    }
+    onPhoto(photo)
+  })
 }
 
 export function connectPhotoSocket({
   onConnect,
+  onRefused,
   onNewPhoto,
+  onReceivedPhoto,
+  onOpenedPhoto,
   onDeletedPhoto,
-  onRefused,
 }: PhotoSocketHandlers): PhotoSocket {
   // Same origin: Vite proxies /socket.io to the API, the session cookie goes with it.
   const socket: PhotoSocket = io()
@@ -36,7 +51,9 @@ export function connectPhotoSocket({
   socket.on('connect_error', ({ message }) => {
     if (message === UNAUTHENTICATED_SOCKET_ERROR) onRefused()
   })
-  socket.on('photo:new', (photo) => handleNewPhoto(photo, onNewPhoto))
-  socket.on('photo:deleted', onDeletedPhoto)
+  listenForPhoto(socket, 'photo:new', onNewPhoto)
+  listenForPhoto(socket, 'photo:received', onReceivedPhoto)
+  listenForPhoto(socket, 'photo:opened', onOpenedPhoto)
+  if (onDeletedPhoto) socket.on('photo:deleted', onDeletedPhoto)
   return socket
 }
~~~~

- [ ] **Step 2: Docs**

In `ARCHITECTURE.md`, replace:

~~~~markdown
- Les amitiés ne sont pas poussées :
~~~~

with:

~~~~markdown
- Les photos en attente (`hooks/usePhotoMail.ts`) ont leur propre connexion Socket.IO, à côté de celle de la bibliothèque ou du cadre : `GET /api/photos/unopened` à chaque connexion, `photo:received` ajoute, `photo:opened` et `photo:deleted` retirent, avec le même rejeu des événements reçus pendant un chargement (`liveLoads.ts`). `connectPhotoSocket` n'écoute que les événements dont la page passe le gestionnaire. La bibliothèque et le cadre ajoutent `photo:opened` comme `photo:new`, à sa place par id (`withNewPhoto`) : une photo ouverte reprend sa date de réception. Limite connue : dans la bibliothèque paginée, une photo ouverte plus ancienne que les pages chargées se place en fin de liste jusqu'au prochain rechargement.
- Les amitiés ne sont pas poussées :
~~~~

- [ ] **Step 3: Gates and commit**

`pnpm check && pnpm typecheck && pnpm build`. Subject: `feat(client): follow the photos waiting to be opened and open them`.

### Task 6: The library announces and reveals received photos (PR C, `feat/mail-library`)

**Files:**
- Create: `client/src/hooks/useMailReveal.ts`, `client/src/components/mail/{mailTexts.ts,MailAnnouncementCard.tsx,MailRevealDialog.tsx,LibraryMail.tsx}`
- Modify: `client/src/pages/LibraryPage.tsx`
- Modify: `docs/produit/{partage,bibliotheque,a-venir}.md`, `ARCHITECTURE.md` (Pages, Courrier photo), `README.md`

**Interfaces:**
```ts
// hooks/useMailReveal.ts
export type MailReveal = { photos: Photo[] | null; start: (waitingPhotos: Photo[]) => void; close: () => void }
// components/mail/MailRevealDialog.tsx
type MailRevealDialogProps = { photos: Photo[]; onOpen: (id: string) => Promise<void>; onClose: () => void }
```
UI text: « Vous avez 1 nouvelle photo » / « Vous avez N nouvelles photos », « De Mamie » / « De Mamie et Tata », « Découvrir », « Nouvelle photo 1 / 3 », « Envoyée par », « Photo suivante », « Terminer », « Fermer ».

- [ ] **Step 1: The code** (this is the final `MailRevealDialog.tsx`, with `RevealTopBar` extracted):

~~~~diff
diff --git a/client/src/components/mail/LibraryMail.tsx b/client/src/components/mail/LibraryMail.tsx
new file mode 100644
index 0000000..d8db882
--- /dev/null
+++ b/client/src/components/mail/LibraryMail.tsx
@@ -0,0 +1,22 @@
+import type { JSX } from 'react'
+import { MailAnnouncementCard } from '@/components/mail/MailAnnouncementCard.tsx'
+import { MailRevealDialog } from '@/components/mail/MailRevealDialog.tsx'
+import { useMailReveal } from '@/hooks/useMailReveal.ts'
+import { usePhotoMail } from '@/hooks/usePhotoMail.ts'
+
+// Nothing while no photo waits. An opened photo reaches the library grid through photo:opened.
+export function LibraryMail(): JSX.Element {
+  const mail = usePhotoMail()
+  const reveal = useMailReveal()
+
+  return (
+    <>
+      {mail.photos.length > 0 && (
+        <MailAnnouncementCard photos={mail.photos} onDiscover={() => reveal.start(mail.photos)} />
+      )}
+      {reveal.photos !== null && (
+        <MailRevealDialog photos={reveal.photos} onOpen={mail.open} onClose={reveal.close} />
+      )}
+    </>
+  )
+}
diff --git a/client/src/components/mail/MailAnnouncementCard.tsx b/client/src/components/mail/MailAnnouncementCard.tsx
new file mode 100644
index 0000000..6141feb
--- /dev/null
+++ b/client/src/components/mail/MailAnnouncementCard.tsx
@@ -0,0 +1,34 @@
+import { MailIcon } from 'lucide-react'
+import type { JSX } from 'react'
+import { sendersLabel, waitingPhotosLabel } from '@/components/mail/mailTexts.ts'
+import { Button } from '@/components/ui/button.tsx'
+import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
+import type { Photo } from '@/photo.ts'
+
+type MailAnnouncementCardProps = {
+  // Newest first, as the server sends them.
+  photos: Photo[]
+  onDiscover: () => void
+}
+
+export function MailAnnouncementCard({
+  photos,
+  onDiscover,
+}: MailAnnouncementCardProps): JSX.Element {
+  return (
+    <Card className="w-full border-frame-accent/60">
+      <CardHeader>
+        <CardTitle className="flex items-center gap-2 text-xl">
+          <MailIcon aria-hidden className="size-5 text-frame-accent" />
+          {waitingPhotosLabel(photos.length)}
+        </CardTitle>
+        <CardDescription>{sendersLabel([...photos].reverse())}</CardDescription>
+      </CardHeader>
+      <CardContent>
+        <Button size="lg" onClick={onDiscover}>
+          Découvrir
+        </Button>
+      </CardContent>
+    </Card>
+  )
+}
diff --git a/client/src/components/mail/MailRevealDialog.tsx b/client/src/components/mail/MailRevealDialog.tsx
new file mode 100644
index 0000000..8e3aff5
--- /dev/null
+++ b/client/src/components/mail/MailRevealDialog.tsx
@@ -0,0 +1,91 @@
+import { XIcon } from 'lucide-react'
+import { Dialog as DialogPrimitive } from 'radix-ui'
+import { type JSX, useEffect, useEffectEvent, useState } from 'react'
+import { revealButtonLabel } from '@/components/mail/mailTexts.ts'
+import { Button } from '@/components/ui/button.tsx'
+import type { Photo } from '@/photo.ts'
+import { formatPhotoDay, photoLabel, quotedMessage } from '@/photoLabel.ts'
+
+type MailRevealDialogProps = {
+  // Oldest first, never empty.
+  photos: Photo[]
+  onOpen: (id: string) => Promise<void>
+  onClose: () => void
+}
+
+function RevealedPhoto({ photo }: { photo: Photo }): JSX.Element {
+  return (
+    <div className="flex min-h-0 flex-1 flex-col items-center gap-6 px-6 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-700">
+      <img
+        src={photo.url}
+        alt={photoLabel(photo)}
+        className="min-h-0 flex-1 rounded-sm object-contain shadow-2xl shadow-black/60"
+      />
+      <div className="flex max-w-xl flex-col items-center gap-1 text-center">
+        {photo.senderName !== null && (
+          <p className="text-xl font-medium">Envoyée par {photo.senderName}</p>
+        )}
+        <p className="text-sm text-muted-foreground tabular-nums">
+          <time dateTime={photo.createdAt}>{formatPhotoDay(photo.createdAt)}</time>
+        </p>
+        {photo.message !== null && (
+          <p className="mt-2 text-lg whitespace-pre-line">{quotedMessage(photo.message)}</p>
+        )}
+      </div>
+    </div>
+  )
+}
+
+function RevealTopBar({ position, count }: { position: number; count: number }): JSX.Element {
+  return (
+    <div className="flex items-center gap-2 px-4 py-3">
+      <DialogPrimitive.Close asChild>
+        <Button variant="ghost" size="icon-lg" aria-label="Fermer">
+          <XIcon />
+        </Button>
+      </DialogPrimitive.Close>
+      {/* pr-9 balances the ✕, so the counter sits in the middle of the screen. */}
+      <DialogPrimitive.Title className="mx-auto pr-9 text-sm text-muted-foreground tabular-nums">
+        Nouvelle photo {position} / {count}
+      </DialogPrimitive.Title>
+    </div>
+  )
+}
+
+// A photo counts as opened once it is on screen: closing halfway keeps the others waiting.
+function useOpenOnShow(photoId: string, onOpen: (id: string) => Promise<void>): void {
+  const openShownPhoto = useEffectEvent(onOpen)
+  useEffect(() => {
+    openShownPhoto(photoId)
+  }, [photoId])
+}
+
+export function MailRevealDialog({ photos, onOpen, onClose }: MailRevealDialogProps): JSX.Element {
+  const [index, setIndex] = useState(0)
+  const photo = photos[index]
+  const isLastPhoto = index === photos.length - 1
+  useOpenOnShow(photo.id, onOpen)
+
+  return (
+    <DialogPrimitive.Root open onOpenChange={onClose}>
+      <DialogPrimitive.Portal>
+        {/* Above the photo viewer and the frame's buttons: the reveal has the whole screen. */}
+        <DialogPrimitive.Content
+          aria-describedby={undefined}
+          className="dark fixed inset-0 z-50 flex flex-col gap-6 bg-frame-background pb-8 text-foreground outline-none"
+        >
+          <RevealTopBar position={index + 1} count={photos.length} />
+          {/* The key restarts the reveal animation for each photo. */}
+          <RevealedPhoto key={photo.id} photo={photo} />
+          <Button
+            size="lg"
+            className="mx-auto min-w-48"
+            onClick={isLastPhoto ? onClose : () => setIndex(index + 1)}
+          >
+            {revealButtonLabel(isLastPhoto)}
+          </Button>
+        </DialogPrimitive.Content>
+      </DialogPrimitive.Portal>
+    </DialogPrimitive.Root>
+  )
+}
diff --git a/client/src/components/mail/mailTexts.ts b/client/src/components/mail/mailTexts.ts
new file mode 100644
index 0000000..0d76180
--- /dev/null
+++ b/client/src/components/mail/mailTexts.ts
@@ -0,0 +1,18 @@
+import { firstName, joinNames } from '@/components/sharing/shareTexts.ts'
+import type { Photo } from '@/photo.ts'
+
+export function waitingPhotosLabel(count: number): string {
+  return count === 1 ? 'Vous avez 1 nouvelle photo' : `Vous avez ${count} nouvelles photos`
+}
+
+// Each friend once, in the order their first photo arrived: « De Mamie et Tata ».
+export function sendersLabel(photos: Photo[]): string {
+  const names = photos.flatMap(({ senderName }) =>
+    senderName === null ? [] : [firstName(senderName)],
+  )
+  return `De ${joinNames([...new Set(names)])}`
+}
+
+export function revealButtonLabel(isLastPhoto: boolean): string {
+  return isLastPhoto ? 'Terminer' : 'Photo suivante'
+}
diff --git a/client/src/hooks/useMailReveal.ts b/client/src/hooks/useMailReveal.ts
new file mode 100644
index 0000000..4402632
--- /dev/null
+++ b/client/src/hooks/useMailReveal.ts
@@ -0,0 +1,20 @@
+import { useState } from 'react'
+import type { Photo } from '@/photo.ts'
+
+export type MailReveal = {
+  // The photos waiting when the reveal started, oldest first: they are discovered in the order
+  // they were sent. null while closed.
+  photos: Photo[] | null
+  start: (waitingPhotos: Photo[]) => void
+  close: () => void
+}
+
+// A copy, not the live list: a photo opened, or one arriving meanwhile, must not shift the reveal.
+export function useMailReveal(): MailReveal {
+  const [photos, setPhotos] = useState<Photo[] | null>(null)
+  return {
+    photos,
+    start: (waitingPhotos) => setPhotos([...waitingPhotos].reverse()),
+    close: () => setPhotos(null),
+  }
+}
diff --git a/client/src/pages/LibraryPage.tsx b/client/src/pages/LibraryPage.tsx
index 9b35fb0..9967d3f 100644
--- a/client/src/pages/LibraryPage.tsx
+++ b/client/src/pages/LibraryPage.tsx
@@ -2,6 +2,7 @@ import type { JSX } from 'react'
 import { FriendsCallToAction } from '@/components/library/FriendsCallToAction.tsx'
 import { LibrarySection } from '@/components/library/LibrarySection.tsx'
 import { UploadForm } from '@/components/library/UploadForm.tsx'
+import { LibraryMail } from '@/components/mail/LibraryMail.tsx'
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
 import { PhotoViewer } from '@/components/viewer/PhotoViewer.tsx'
 import { usePhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
@@ -13,6 +14,8 @@ export default function LibraryPage(): JSX.Element {
 
   return (
     <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
+      {/* First on the page: news from the family comes before adding one's own photos. */}
+      <LibraryMail />
       <div className="grid gap-6 md:grid-cols-2">
         <Card className="w-full">
           <CardHeader>
~~~~

- [ ] **Step 2: Docs**

In `docs/produit/partage.md`, replace:

~~~~markdown
Envoyer une photo à un ou plusieurs amis la fait entrer dans sa bibliothèque et l'affiche aussitôt sur son cadre. On ne peut envoyer qu'à un ami, c'est-à-dire après une demande acceptée (voir [amis.md](amis.md)).
~~~~

with:

~~~~markdown
Envoyer une photo à un ou plusieurs amis la leur fait parvenir comme du courrier : elle les attend, non ouverte, jusqu'à ce qu'ils la découvrent, puis entre dans leur bibliothèque. On ne peut envoyer qu'à un ami, c'est-à-dire après une demande acceptée (voir [amis.md](amis.md)).
~~~~

In `docs/produit/partage.md`, replace:

~~~~markdown
- Voir la photo reçue apparaître seule, sans recharger, en tête de sa bibliothèque et sur son cadre.
- La garder, la supprimer ou l'envoyer à son tour à ses propres amis, comme n'importe quelle photo de sa bibliothèque.
~~~~

with:

~~~~markdown
- Voir l'annonce « Vous avez N nouvelles photos » en haut de sa bibliothèque dès qu'une photo arrive, sans recharger.
- Toucher « Découvrir » pour voir les photos reçues une à une, en grand, avec leur expéditeur, leur date et leur message.
- Une fois découverte, la garder, la supprimer ou l'envoyer à son tour à ses propres amis, comme n'importe quelle photo de sa bibliothèque.
~~~~

In `docs/produit/partage.md`, replace:

~~~~markdown
1. R-PAR-30 · Une photo reçue devient une photo de la bibliothèque du destinataire, à part entière.
~~~~

with:

~~~~markdown
1. R-PAR-30 · Remplacée : une photo reçue entre dans la bibliothèque une fois découverte (R-PAR-51, R-PAR-55).
~~~~

In `docs/produit/partage.md`, replace:

~~~~markdown
5. R-PAR-34 · Sa date est celle de sa réception, pas celle de son ajout chez l'expéditeur : elle se range donc en tête de la bibliothèque.
6. R-PAR-35 · La photo s'affiche sur tous les appareils du destinataire connectés à ce moment-là ; l'expéditeur ne voit aucun changement sur ses propres écrans.
~~~~

with:

~~~~markdown
5. R-PAR-34 · Remplacée : la photo découverte se range à sa date de réception, pas forcément en tête (R-PAR-55).
6. R-PAR-35 · Remplacée : l'annonce et la photo découverte apparaissent sur tous les appareils du destinataire (R-PAR-52, R-PAR-55) ; l'expéditeur ne voit rien changer (R-PAR-56).
~~~~

In `docs/produit/partage.md`, replace:

~~~~markdown
9. R-PAR-50 · Une photo transférée de nouveau porte le message de la dernière personne qui l'a envoyée, ou aucun message si elle n'en a pas écrit : le message reçu avec la photo ne la suit pas.
~~~~

with:

~~~~markdown
9. R-PAR-50 · Une photo transférée de nouveau porte le message de la dernière personne qui l'a envoyée, ou aucun message si elle n'en a pas écrit : le message reçu avec la photo ne la suit pas.
10. R-PAR-51 · Une photo reçue arrive non ouverte : elle n'entre ni dans la bibliothèque ni dans le diaporama tant que le destinataire ne l'a pas découverte. Les photos reçues avant l'arrivée de cette fonctionnalité comptent comme déjà découvertes.
11. R-PAR-52 · L'annonce « Vous avez N nouvelles photos » s'affiche en tête de la bibliothèque tant qu'au moins une photo attend, avec le prénom de chaque expéditeur, une seule fois chacun. Elle se met à jour seule, sur tous les appareils connectés, quand une photo arrive ou est découverte ailleurs.
12. R-PAR-53 · « Découvrir » montre les photos en attente une à une, de la plus ancienne à la plus récente : la photo en grand, « Envoyée par » suivi du nom, la date de réception et le message. « Photo suivante » passe à la suivante ; sur la dernière, « Terminer » referme. Une photo arrivée pendant la découverte attend la suivante.
13. R-PAR-54 · Une photo compte comme découverte dès qu'elle s'affiche, pour tous les appareils du destinataire. Fermer avant la fin, avec la croix ou la touche Échap, laisse les photos suivantes en attente.
14. R-PAR-55 · Une fois découverte, la photo entre dans la bibliothèque à sa date de réception, sur tous les appareils connectés, sans recharger : elle n'est en tête que si rien n'a été ajouté depuis.
15. R-PAR-56 · L'expéditeur ne voit aucun changement sur ses propres écrans et ne sait pas si la photo a été découverte.
~~~~

In `docs/produit/partage.md`, replace:

~~~~markdown
| Photo reçue avec un message  | « « [message] » »     |
~~~~

with:

~~~~markdown
| Photo reçue avec un message  | « « [message] » »     |
| Annonce, une photo en attente | « Vous avez 1 nouvelle photo » — « De Mamie » (exemple) et le bouton « Découvrir » |
| Annonce, plusieurs photos     | « Vous avez N nouvelles photos » — « De Mamie et Tata » (exemple)                |
| Découverte                    | « Nouvelle photo 1 / 3 », puis « Photo suivante » ou, sur la dernière, « Terminer » |
~~~~

In `docs/produit/partage.md`, replace:

~~~~markdown
- Refuser une photo avant qu'elle arrive : elle entre directement dans la bibliothèque.
- Être prévenu autrement que par son apparition sur le cadre et dans la bibliothèque : prévu, voir [a-venir.md](a-venir.md).
~~~~

with:

~~~~markdown
- Refuser une photo : une fois découverte, on peut la supprimer.
- Découvrir une photo sans qu'elle compte comme ouverte, ou la remettre en attente.
- Savoir si un proche a découvert la photo qu'on lui a envoyée.
- Être prévenu en dehors de FamilyFrame, par e-mail ou par une notification du téléphone.
~~~~

In `docs/produit/bibliotheque.md`, replace:

~~~~markdown
- Lancer le mode cadre depuis la bibliothèque, ou depuis une photo ouverte pour que le diaporama commence par elle.
~~~~

with:

~~~~markdown
- Lancer le mode cadre depuis la bibliothèque, ou depuis une photo ouverte pour que le diaporama commence par elle.
- Découvrir les photos envoyées par ses proches depuis l'annonce en haut de la page (voir [partage.md](partage.md#recevoir-une-photo)).
~~~~

In `docs/produit/bibliotheque.md`, replace:

~~~~markdown
7. R-BIB-26 · La bibliothèque se met à jour seule : une photo ajoutée depuis un autre appareil ou reçue d'un ami apparaît en tête, une photo supprimée disparaît, sans recharger la page.
~~~~

with:

~~~~markdown
7. R-BIB-26 · Remplacée : une photo reçue n'apparaît plus dès son arrivée, mais une fois découverte (R-BIB-42).
~~~~

In `docs/produit/bibliotheque.md`, replace:

~~~~markdown
16. R-BIB-41 · Un lien vers une photo qui n'existe plus ramène simplement à la bibliothèque.
~~~~

with:

~~~~markdown
16. R-BIB-41 · Un lien vers une photo qui n'existe plus ramène simplement à la bibliothèque.
17. R-BIB-42 · La bibliothèque se met à jour seule, sans recharger la page : une photo ajoutée depuis un autre appareil apparaît en tête, une photo reçue y entre à sa date de réception dès qu'elle est découverte (sur cet appareil ou un autre), une photo supprimée disparaît.
~~~~

In `docs/produit/bibliotheque.md`, replace:

~~~~markdown
| Carte d'accès aux amis                    | « Vos proches » — « Ajoutez vos proches en amis pour leur envoyer des photos. » et le bouton « Gérer mes amis » |
~~~~

with:

~~~~markdown
| Carte d'accès aux amis                    | « Vos proches » — « Ajoutez vos proches en amis pour leur envoyer des photos. » et le bouton « Gérer mes amis » |
| Photos reçues en attente                  | « Vous avez N nouvelles photos » et le bouton « Découvrir » (voir [partage.md](partage.md#recevoir-une-photo))  |
~~~~

In `docs/produit/a-venir.md`, replace:

~~~~markdown
- Les photos reçues restent « non ouvertes » tant que le destinataire ne les a pas regardées.
- Une annonce « Vous avez N nouvelles photos ».
- La découverte des photos reçues une à une.
~~~~

with:

~~~~markdown
- Une annonce « Vous avez N nouvelles photos » sur le cadre, et la découverte des photos reçues depuis le cadre.
~~~~

In `ARCHITECTURE.md`, replace:

~~~~markdown
| `/`                  | bibliothèque : carte d'envoi
~~~~

with:

~~~~markdown
| `/`                  | bibliothèque : en tête, quand des photos reçues attendent, l'annonce « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la carte d'envoi
~~~~

In `ARCHITECTURE.md`, replace:

~~~~markdown
Le menu du compte (avatar sur ordinateur, ☰ sur mobile) mène à « Préférences »
~~~~

with:

~~~~markdown
Courrier photo (`components/mail/`) : « Découvrir » copie la liste des photos en attente (`useMailReveal`), de la plus ancienne à la plus récente, et l'ouvre dans `MailRevealDialog`, une fenêtre plein écran (`z-50`, au-dessus de la visionneuse). Chaque photo est ouverte (`POST /api/photos/:id/open`) dès qu'elle s'affiche, sans attendre la réponse ; un échec la laisse en attente pour la découverte suivante. Une photo arrivée pendant la découverte attend la suivante.

Le menu du compte (avatar sur ordinateur, ☰ sur mobile) mène à « Préférences »
~~~~

In `README.md`, replace:

~~~~markdown
La photo n'entre que dans la bibliothèque de l'ami et s'affiche aussitôt sur son cadre, avec « Envoyée par » et votre nom.
~~~~

with:

~~~~markdown
Un message facultatif (200 caractères au plus) peut l'accompagner. La photo n'entre que chez l'ami, comme une lettre non ouverte : sa bibliothèque annonce « Vous avez 1 nouvelle photo », et « Découvrir » la montre en grand avec « Envoyée par », votre nom et votre message, avant qu'elle rejoigne sa bibliothèque et son cadre.
~~~~

- [ ] **Step 3: Gates and commit**

`pnpm check:fix && pnpm typecheck && pnpm build`; every function at most 30 lines (`MailRevealDialog`, `LibraryPage`). Subject: `feat(client): announce received photos in the library and reveal them one by one`.

---

## PR D — `feat/mail-frame`

### Task 7: The frame announces and reveals received photos (PR D, `feat/mail-frame`)

**Files:**
- Create: `client/src/components/frame/FrameNotices.tsx`, `client/src/components/frame/WaitingPhotosBadge.tsx`
- Modify: `client/src/components/frame/{NewPhotosBadge,SlideshowScreen,FrameStatusScreen}.tsx`, `client/src/pages/FramePage.tsx`, `client/src/components/sharing/ShareSheet.tsx`
- Modify: `docs/produit/{partage,cadre,a-venir}.md`, `ARCHITECTURE.md` (Pages), `README.md`

UI text: the pill « Vous avez N nouvelles photos », status « Des photos vous attendent. », share sheet description « Elle les attendra sur leur cadre et dans leur bibliothèque. ».

- [ ] **Step 1: The code**

~~~~diff
diff --git a/client/src/components/frame/FrameNotices.tsx b/client/src/components/frame/FrameNotices.tsx
new file mode 100644
index 0000000..3280bcf
--- /dev/null
+++ b/client/src/components/frame/FrameNotices.tsx
@@ -0,0 +1,26 @@
+import type { JSX } from 'react'
+import { NewPhotosBadge } from '@/components/frame/NewPhotosBadge.tsx'
+import { WaitingPhotosBadge } from '@/components/frame/WaitingPhotosBadge.tsx'
+
+type FrameNoticesProps = {
+  waitingCount: number
+  newPhotoCount: number
+  onReveal: () => void
+  onShowNewest: () => void
+}
+
+// One column at the top centre, between ✕ and ⋯: two pills stack instead of covering each other.
+// Outside the slideshow, so the waiting photos show on the screens without photos too.
+export function FrameNotices({
+  waitingCount,
+  newPhotoCount,
+  onReveal,
+  onShowNewest,
+}: FrameNoticesProps): JSX.Element {
+  return (
+    <div className="fixed top-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3">
+      <WaitingPhotosBadge count={waitingCount} onSelect={onReveal} />
+      <NewPhotosBadge count={newPhotoCount} onSelect={onShowNewest} />
+    </div>
+  )
+}
diff --git a/client/src/components/frame/FrameStatusScreen.tsx b/client/src/components/frame/FrameStatusScreen.tsx
index cadb238..62de4e0 100644
--- a/client/src/components/frame/FrameStatusScreen.tsx
+++ b/client/src/components/frame/FrameStatusScreen.tsx
@@ -1,11 +1,19 @@
-import { ImagesIcon, TriangleAlertIcon } from 'lucide-react'
+import { ImagesIcon, MailIcon, TriangleAlertIcon } from 'lucide-react'
 import type { JSX, ReactNode } from 'react'
 import { FullscreenButton } from '@/components/frame/FullscreenButton.tsx'
 import { Button } from '@/components/ui/button.tsx'
 import { cn } from '@/lib/utils.ts'
 
 // Why the frame shows no photo: each case needs its own words.
-export type FrameStatus = 'loading' | 'empty' | 'failed'
+// unopened: nothing in the library yet, but friends' photos wait to be discovered.
+export type FrameStatus = 'loading' | 'empty' | 'unopened' | 'failed'
+
+const STATUS_ICONS = {
+  loading: ImagesIcon,
+  empty: ImagesIcon,
+  unopened: MailIcon,
+  failed: TriangleAlertIcon,
+} satisfies Record<FrameStatus, typeof ImagesIcon>
 
 type FrameStatusScreenProps = {
   status: FrameStatus
@@ -15,6 +23,8 @@ type FrameStatusScreenProps = {
 
 function StatusMessage({ status }: { status: FrameStatus }): ReactNode {
   if (status === 'loading') return <p className="text-3xl font-medium">Chargement des photos…</p>
+  if (status === 'unopened')
+    return <p className="text-3xl font-medium">Des photos vous attendent.</p>
   if (status === 'failed') {
     return (
       <>
@@ -41,7 +51,7 @@ export function FrameStatusScreen({
   className,
   onLeave,
 }: FrameStatusScreenProps): JSX.Element {
-  const Icon = status === 'failed' ? TriangleAlertIcon : ImagesIcon
+  const Icon = STATUS_ICONS[status]
   return (
     <main
       className={cn(
diff --git a/client/src/components/frame/NewPhotosBadge.tsx b/client/src/components/frame/NewPhotosBadge.tsx
index 5f88d00..a34af4c 100644
--- a/client/src/components/frame/NewPhotosBadge.tsx
+++ b/client/src/components/frame/NewPhotosBadge.tsx
@@ -13,7 +13,7 @@ function newPhotosLabel(count: number): string {
 export function NewPhotosBadge({ count, onSelect }: NewPhotosBadgeProps): JSX.Element {
   return (
     // The live region stays mounted: screen readers only announce changes to one that exists.
-    <div aria-live="polite" className="fixed top-6 left-1/2 z-20 -translate-x-1/2">
+    <div aria-live="polite">
       {count > 0 && (
         <Badge
           asChild
diff --git a/client/src/components/frame/SlideshowScreen.tsx b/client/src/components/frame/SlideshowScreen.tsx
index 83dd17e..6ebf1c1 100644
--- a/client/src/components/frame/SlideshowScreen.tsx
+++ b/client/src/components/frame/SlideshowScreen.tsx
@@ -1,5 +1,4 @@
 import type { JSX } from 'react'
-import { NewPhotosBadge } from '@/components/frame/NewPhotosBadge.tsx'
 import { PhotoStrip } from '@/components/frame/PhotoStrip.tsx'
 import { PhotoView } from '@/components/frame/PhotoView.tsx'
 import { SlideshowBottomBar } from '@/components/frame/SlideshowBottomBar.tsx'
@@ -54,7 +53,6 @@ export function SlideshowScreen({
           onSelect={selection.selectPhoto}
         />
       </PhotoView>
-      <NewPhotosBadge count={selection.newPhotoCount} onSelect={selection.showNewest} />
     </>
   )
 }
diff --git a/client/src/components/frame/WaitingPhotosBadge.tsx b/client/src/components/frame/WaitingPhotosBadge.tsx
new file mode 100644
index 0000000..952d119
--- /dev/null
+++ b/client/src/components/frame/WaitingPhotosBadge.tsx
@@ -0,0 +1,29 @@
+import { MailIcon } from 'lucide-react'
+import type { JSX } from 'react'
+import { waitingPhotosLabel } from '@/components/mail/mailTexts.ts'
+import { Badge } from '@/components/ui/badge.tsx'
+
+type WaitingPhotosBadgeProps = {
+  count: number
+  onSelect: () => void
+}
+
+// The print's white, not the accent of the arrivals pill: a letter waiting, not a photo playing.
+export function WaitingPhotosBadge({ count, onSelect }: WaitingPhotosBadgeProps): JSX.Element {
+  return (
+    // The live region stays mounted: screen readers only announce changes to one that exists.
+    <div aria-live="polite">
+      {count > 0 && (
+        <Badge
+          asChild
+          className="h-auto gap-2 rounded-full bg-frame-print px-5 py-2 text-base font-medium text-black shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4 motion-safe:duration-500"
+        >
+          <button type="button" onClick={onSelect}>
+            <MailIcon aria-hidden className="size-4" />
+            {waitingPhotosLabel(count)}
+          </button>
+        </Badge>
+      )}
+    </div>
+  )
+}
diff --git a/client/src/components/sharing/ShareSheet.tsx b/client/src/components/sharing/ShareSheet.tsx
index d872011..ba51f02 100644
--- a/client/src/components/sharing/ShareSheet.tsx
+++ b/client/src/components/sharing/ShareSheet.tsx
@@ -50,7 +50,9 @@ function ShareBody({ target, onShared, onClose }: ShareBodyProps): JSX.Element {
         <ShareThumbnail target={target} />
         <div className="flex min-w-0 flex-col gap-1">
           <DialogTitle>Envoyer à des proches</DialogTitle>
-          <DialogDescription>La photo s'affichera aussitôt sur leur cadre.</DialogDescription>
+          <DialogDescription>
+            Elle les attendra sur leur cadre et dans leur bibliothèque.
+          </DialogDescription>
         </div>
       </div>
       <ShareFriendsForm target={target} onSent={closeAfterSending} />
diff --git a/client/src/pages/FramePage.tsx b/client/src/pages/FramePage.tsx
index ef00367..b59a940 100644
--- a/client/src/pages/FramePage.tsx
+++ b/client/src/pages/FramePage.tsx
@@ -1,25 +1,33 @@
 import type { JSX } from 'react'
+import { FrameNotices } from '@/components/frame/FrameNotices.tsx'
 import { type FrameStatus, FrameStatusScreen } from '@/components/frame/FrameStatusScreen.tsx'
 import { SlideshowScreen } from '@/components/frame/SlideshowScreen.tsx'
-import { useFrameMode } from '@/hooks/useFrameMode.ts'
+import { MailRevealDialog } from '@/components/mail/MailRevealDialog.tsx'
+import { type FrameMode, useFrameMode } from '@/hooks/useFrameMode.ts'
+import { useMailReveal } from '@/hooks/useMailReveal.ts'
 import type { FeedStatus } from '@/hooks/usePhotoFeed.ts'
+import { usePhotoMail } from '@/hooks/usePhotoMail.ts'
 import { cn } from '@/lib/utils.ts'
 
 // The frame is a screen on a wall: dark keeps the photos in front.
 const FRAME_CLASSES = 'dark min-h-svh bg-frame-background text-foreground'
 
-// Reached only without photos: once loaded, that means an empty library.
-function frameStatus(status: FeedStatus): FrameStatus {
-  return status === 'loaded' ? 'empty' : status
+type FrameScreenProps = {
+  frame: FrameMode
+  hasWaitingPhotos: boolean
 }
 
-export default function FramePage(): JSX.Element {
-  const frame = useFrameMode()
+// Reached only without photos: once loaded, that means an empty library, maybe with mail.
+function frameStatus(status: FeedStatus, hasWaitingPhotos: boolean): FrameStatus {
+  if (status !== 'loaded') return status
+  return hasWaitingPhotos ? 'unopened' : 'empty'
+}
 
+function FrameScreen({ frame, hasWaitingPhotos }: FrameScreenProps): JSX.Element {
   if (frame.currentPhoto === undefined) {
     return (
       <FrameStatusScreen
-        status={frameStatus(frame.status)}
+        status={frameStatus(frame.status, hasWaitingPhotos)}
         className={FRAME_CLASSES}
         onLeave={frame.leave}
       />
@@ -43,3 +51,31 @@ export default function FramePage(): JSX.Element {
     </main>
   )
 }
+
+export default function FramePage(): JSX.Element {
+  const frame = useFrameMode()
+  const mail = usePhotoMail()
+  const reveal = useMailReveal()
+
+  // The photos just opened joined the slideshow while the reveal was open: they were seen,
+  // no pill should announce them again.
+  function closeReveal(): void {
+    reveal.close()
+    frame.selection.showNewest()
+  }
+
+  return (
+    <>
+      <FrameScreen frame={frame} hasWaitingPhotos={mail.photos.length > 0} />
+      <FrameNotices
+        waitingCount={mail.photos.length}
+        newPhotoCount={frame.selection.newPhotoCount}
+        onReveal={() => reveal.start(mail.photos)}
+        onShowNewest={frame.selection.showNewest}
+      />
+      {reveal.photos !== null && (
+        <MailRevealDialog photos={reveal.photos} onOpen={mail.open} onClose={closeReveal} />
+      )}
+    </>
+  )
+}
~~~~

- [ ] **Step 2: Docs**

In `docs/produit/partage.md`, replace:

~~~~markdown
| En-tête                              | « Envoyer à des proches » — « La photo s'affichera aussitôt sur leur cadre. »      |
~~~~

with:

~~~~markdown
| En-tête                              | « Envoyer à des proches » — « Elle les attendra sur leur cadre et dans leur bibliothèque. » |
~~~~

In `docs/produit/partage.md`, replace:

~~~~markdown
7. R-PAR-36 · Sur un cadre en diaporama, la photo reçue s'affiche selon les règles d'arrivée d'une nouvelle photo (voir [cadre.md](cadre.md#arrivée-dune-nouvelle-photo)).
~~~~

with:

~~~~markdown
7. R-PAR-36 · Remplacée : sur le cadre aussi, la photo reçue attend d'être découverte (R-PAR-57).
~~~~

In `docs/produit/partage.md`, replace:

~~~~markdown
15. R-PAR-56 · L'expéditeur ne voit aucun changement sur ses propres écrans et ne sait pas si la photo a été découverte.
~~~~

with:

~~~~markdown
15. R-PAR-56 · L'expéditeur ne voit aucun changement sur ses propres écrans et ne sait pas si la photo a été découverte.
16. R-PAR-57 · Sur le cadre, une pastille annonce aussi les photos en attente et lance la même découverte ; une fois découvertes, elles entrent dans le diaporama (voir [cadre.md](cadre.md#photos-reçues-en-attente)).
~~~~

In `docs/produit/cadre.md`, replace:

~~~~markdown
- Voir une photo ajoutée depuis un téléphone ou envoyée par un ami arriver sur le cadre en quelques instants, sans recharger.
~~~~

with:

~~~~markdown
- Voir une photo ajoutée depuis un téléphone, ou découverte sur un autre appareil, arriver sur le cadre en quelques instants, sans recharger.
~~~~

In `docs/produit/cadre.md`, replace:

~~~~markdown
6. R-CAD-45 · Une photo supprimée depuis un autre appareil disparaît du cadre en quelques instants, sans recharger.
~~~~

with:

~~~~markdown
6. R-CAD-45 · Une photo supprimée depuis un autre appareil disparaît du cadre en quelques instants, sans recharger.
7. R-CAD-76 · Une photo envoyée par un ami ne s'affiche pas à son arrivée : elle attend d'être découverte (voir [Photos reçues en attente](#photos-reçues-en-attente)). Découverte sur un autre appareil, elle entre dans le diaporama à sa date de réception ; si c'est la plus récente, les règles d'arrivée ci-dessus s'appliquent.
~~~~

In `docs/produit/cadre.md`, replace:

~~~~markdown
**Ce qui n'est pas possible**

- Être averti par un son ou une vibration.
- Voir la liste des photos reçues mais pas encore regardées : prévu, voir [a-venir.md](a-venir.md).
~~~~

with:

~~~~markdown
**Ce qui n'est pas possible**

- Être averti par un son ou une vibration.

## Photos reçues en attente

**Ce que l'on peut faire**

- Voir en haut du cadre la pastille « Vous avez N nouvelles photos » quand des proches ont envoyé des photos.
- Toucher la pastille pour découvrir les photos une à une, en grand, avec leur expéditeur, leur date et leur message.

**Règles**

1. R-CAD-72 · Tant qu'au moins une photo reçue attend, une pastille blanche, marquée d'une enveloppe, s'affiche en haut au centre du cadre, même quand personne ne l'utilise. Elle se place au-dessus de la pastille des nouvelles photos, sans la cacher, et se met à jour seule.
2. R-CAD-73 · Toucher la pastille lance la découverte, comme dans la bibliothèque (voir [partage.md](partage.md#recevoir-une-photo), R-PAR-53 et R-PAR-54). Le diaporama s'arrête pendant ce temps.
3. R-CAD-74 · Après « Terminer » ou la fermeture, le diaporama repart de la photo la plus récente. Les photos découvertes y sont déjà, à leur date de réception : la pastille des nouvelles photos ne les annonce pas.
4. R-CAD-75 · Sans aucune photo dans la bibliothèque mais avec des photos en attente, le cadre affiche « Des photos vous attendent. » sous la pastille.

**Messages affichés**

| Situation                       | Message                           |
| ------------------------------- | --------------------------------- |
| Une photo en attente            | « Vous avez 1 nouvelle photo »    |
| Plusieurs photos en attente     | « Vous avez N nouvelles photos »  |
| Bibliothèque vide, photos en attente | « Des photos vous attendent. » |

**Ce qui n'est pas possible**

- Voir la liste des photos en attente sans les découvrir.
- Découvrir les photos sans que le diaporama s'arrête.
~~~~

In `docs/produit/a-venir.md`, delete:

~~~~markdown
## Étape 9 · Courrier photo

**Prévu**

- Une annonce « Vous avez N nouvelles photos » sur le cadre, et la découverte des photos reçues depuis le cadre.
~~~~

In `ARCHITECTURE.md`, replace:

~~~~markdown
cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête),
~~~~

with:

~~~~markdown
cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide),
~~~~

In `README.md`, replace:

~~~~markdown
avant qu'elle rejoigne sa bibliothèque et son cadre.
~~~~

with:

~~~~markdown
avant qu'elle rejoigne sa bibliothèque et son cadre. Le cadre affiche la même annonce en haut de l'écran et lance la découverte d'un toucher.
~~~~

- [ ] **Step 3: Gates and commit**

`pnpm check:fix && pnpm typecheck && pnpm build && pnpm test`. `a-venir.md` no longer has an « Étape 9 » section. Subject: `feat(client): announce and reveal received photos on the frame`.

---

## Final verification (controller)

- [ ] `pnpm check && pnpm typecheck && pnpm build && pnpm test` on `feat/mail-frame`: green, `Test Files  21 passed (21)`, `Tests  239 passed (239)`.
- [ ] Bruno gate command against a test API on port 3002 started from `feat/mail-frame`: 122 requests, 266 assertions, all passed, twice.
- [ ] Logs carry no PII: `photo.shared` shows `hasMessage` and never the text; `photo.opened` only ids.
- [ ] `git diff 85e5e9e..feat/mail-frame -- client/package.json server/package.json pnpm-lock.yaml`: empty. No `console.` added in `server/src`; `git grep -n " as " -- server/src client/src` shows no new cast.
- [ ] Manual, with Claude in Chrome (dev client on 5180 against the author's API, never restarted), two accounts that are friends (one a throwaway invitee):
  - share a photo with « Joyeux anniversaire » to the other account: the sender's screens do not change;
  - the recipient's library shows « Vous avez 1 nouvelle photo », « De [prénom] », « Découvrir »; the photo is not in the grid;
  - « Découvrir »: full screen, « Nouvelle photo 1 / 1 », the photo, « Envoyée par », the date, « « Joyeux anniversaire » », « Terminer »; after closing, the photo is in the grid at its date and the card is gone; a second tab of the same account loses its card live;
  - send two more: « Vous avez 2 nouvelles photos », the reveal goes oldest first, « Photo suivante » then « Terminer »; ✕ after the first leaves « Vous avez 1 nouvelle photo »;
  - `/frame` of the recipient: the white pill at the top, above the accent pill when both show; a tap reveals, the slideshow pauses, then restarts on the newest photo with the message under « Envoyée par »;
  - a new throwaway account whose only photos are received: `/frame` shows « Des photos vous attendent. » under the pill;
  - a 201-character message cannot be typed (`maxLength`), the counter reads « 200 / 200 ».
- [ ] Left to the author (UX walkthrough): the reveal's feel on the real frame, the pill legibility across a room, the textarea with a phone keyboard.
- [ ] Clean up the manual test photos from the app (delete): **never** with `pnpm db:seed`.
- [ ] `git log --oneline 85e5e9e..feat/mail-frame`: one concern per commit, each ending with the attribution lines; no Docker file and no `.env` in `git diff --stat`.
- [ ] Fresh-context review of the whole stack diff (`superpowers:requesting-code-review`), then `gh stack submit --auto` (draft PRs) and `gh stack view --json`.

---

## Drift Log

Format: `date · task/step · what the plan said · what was done · why`.

| Date | Task / step | Plan said | Done | Why |
| ---- | ----------- | --------- | ---- | --- |

---

## Self-review (done while writing the plan)

**1. Spec coverage**

| Spec item | Task |
| --- | --- |
| Split `photos.service.ts` (290 lines) | 1 |
| `Photo.message`, `parseMessage` (200, trimmed, blank = none, not text = 400), before the friend check, carried by the copy only, `hasMessage` log | 2 |
| `MESSAGE_INVALID` server, error handler test, client message | 2 |
| Bruno message requests (`share/02`, `08`, `14`-`16`) | 2 |
| `pnpm db:push` without seed | C1, C2 |
| `Photo.isOpened` (true on upload, false on share, unset = opened), library filter with `isSet` | 3 |
| `GET /api/photos/unopened`, `POST /api/photos/:id/open` (idempotent, 404), `photo:received`, `photo:opened`, `photo.opened` log | 3 |
| Bruno `unopened/`, `open/`, share and delete follow the unopened list | 3 |
| Share sheet message field, counter, `maxLength`; blank omitted | 4 |
| Message in the viewer, the slideshow caption, the polaroid | 4 |
| Optional socket handlers, ordered insert, `photo:opened` in feed and library, `usePhotoMail` | 5 |
| Library card, reveal (oldest first, snapshot, opened when shown, ✕, counter) | 6 |
| Frame pill above the arrivals pill, `'unopened'` status, slideshow paused and back to newest | 7 |
| Share sheet description | 7 |
| Product docs (R-PAR-48..57, R-BIB-42, R-CAD-71..76, « Remplacée » marks, `a-venir.md`) | 4, 6, 7 |
| ARCHITECTURE and README | 1, 2, 3, 5, 6, 7 |
| Manual checks | Final verification |
| Delivery: 4 PRs, `gh stack add` at PR boundaries | Stack section, banners |

**2. Placeholder scan:** every code step is a full diff from the clone; every docs step is an exact replace.

**3. Type consistency:** `PhotoOpening`, `UnopenedPhotos`, `OpenResult`, `PhotoMail`, `MailReveal` are named once and used with the same shape in later tasks; the server and client `Photo` both gain `message: string | null` in Task 2.

**4. Contradictions found while planning:** R-PAR-31 (`partage.md`) says « Envoyée par » shows in the list view too; the list row (`PhotoListRow`) shows the sender but this plan does not add the message there (one line per photo). Left as is; listed for the author.
