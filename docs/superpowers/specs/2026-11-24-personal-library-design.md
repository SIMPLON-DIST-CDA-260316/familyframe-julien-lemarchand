# Step 2: personal library

- Date: 2026-11-24
- Scope: step 2 of `2026-11-23-accounts-sharing-overview.md`. Photo ownership, SHA-256 duplicates, paginated listing, per-user real time, the library page on `/`, a complete per-user frame.
- AI usage: decisions taken by the AI while the author was away, following the overview; to be reviewed by the author. The controller (AI) wrote a brief of decisions; this spec refines them from the code and records where it departs from them (see "Deviations from the controller's brief"). The frame UI session (another AI session) supplied facts about the frame components, taken into account below.
- Builds on: `2026-11-23-auth-sessions-design.md` (sessions, `currentUser`, rooms `user:<id>`), `2026-11-23-backend-layers-errors-design.md` (factories, `AppError`, `toErrorResponse`), `2026-11-23-server-logging-design.md` (event names, no PII).

## Goal

Each account has its own library. A photo belongs to the user who uploaded it; nobody else lists it, deletes it or receives its events. The same file cannot enter a library twice. `/` becomes the library page (upload and browse, paginated), `/frame` shows the whole library of the logged-in user. `uploaderName` disappears: until step 5 adds "envoyée par X", every photo of a library is the owner's own.

## Decisions

| Topic               | Decision                                                                                                                                                                                   | Main reason                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Owner               | `Photo.ownerId` (`@db.ObjectId`, relation to `User`), required                                                                                                                             | the overview's model; the relation documents the link and lets Prisma refuse an unknown owner                                |
| `uploaderName`      | removed from the schema, the DTO, the client, Bruno and the docs                                                                                                                           | the owner is the logged-in user; the sender name returns as `senderId` in step 5                                             |
| `senderId`          | not added in this step                                                                                                                                                                     | YAGNI until sharing exists                                                                                                   |
| Existing photos     | the author re-runs `pnpm db:seed` (it already wipes photos) before `pnpm db:push`; the seed creates no photo                                                                               | dev data only; a photo without owner cannot be read by the new client                                                        |
| Duplicate hash      | SHA-256 (`node:crypto`) of the original upload bytes, computed in the service before sharp and Cloudinary                                                                                  | the overview's choice; sharp output is not guaranteed stable                                                                 |
| Duplicate check     | lookup by `(ownerId, sha256)` → `409 PHOTO_DUPLICATE` before any processing; the unique index catches a concurrent duplicate (P2002) → also 409, and its new Cloudinary image is destroyed | no sharp or Cloudinary work for a known file; the index is the real guarantee, the lookup only saves the work                |
| Pagination          | `GET /api/photos?cursor=<photoId>&limit=<n>`, newest first, keyset on the photo id (`id < cursor`), response `{ photos, nextCursor }`                                                      | stable when photos are added or deleted between two pages; one indexed range query                                           |
| Page sizes          | `DEFAULT_PAGE_SIZE = 30`, `MAX_PAGE_SIZE = 100`; an invalid `limit` or `cursor` answers `400 QUERY_INVALID` (new code)                                                                     | named constants; `BODY_INVALID` is about JSON bodies, a query string deserves its own code                                   |
| Frame               | loads every page (`limit=100`) until `nextCursor` is `null`                                                                                                                                | the overview: old photos never silently leave a gift frame                                                                   |
| Ownership on delete | `DELETE` matches `{ id, ownerId }`; another user's photo answers `404 PHOTO_NOT_FOUND`                                                                                                     | no existence leak; one atomic query, no read-then-delete race                                                                |
| Real time           | `photo:new` and `photo:deleted` go to `user:<ownerId>` only                                                                                                                                | rooms joined in step 1; other accounts never see the photo                                                                   |
| Cloudinary cleanup  | after deleting a `Photo`, the image is destroyed only when no other `Photo` has the same `cloudinaryId`                                                                                    | ready for step 5, where a share points to the same image                                                                     |
| `cloudinaryId`      | no longer `@unique`, plain `@@index`                                                                                                                                                       | step 5 shares one image between several photos; the index serves the reference count                                         |
| Library page        | `/` = upload card + the user's library (grid or list, "Charger plus"), built from the frame's `PhotoGrid`, `PhotoList` and `LayoutToggle`                                                  | one look for the library on the phone and on the wall; `LibraryScreen` carries the frame's fixed header and slideshow button |
| Layout choice       | `/` and `/frame` share the `familyframe.libraryLayout` key                                                                                                                                 | simpler, and the frame UI session prefers it                                                                                 |

Rejected: Prisma's `cursor` option (it looks the cursor row up again: a photo deleted between two pages breaks the next page, and `createdAt` ties need a compound cursor), offset pagination (skips or repeats photos when the library changes between pages), hiding another user's photo with `403` (tells that it exists), a `senderId` placeholder now, a total count endpoint for the library page (YAGNI).

## Deviations from the controller's brief

- **Ordering and index**: the brief asked for `@@index([ownerId, createdAt])` and newest first by date. The listing orders by `id` descending with `id < cursor`, on `@@index([ownerId, id])`. A MongoDB ObjectId starts with its creation time in seconds, then a per-process counter: ordering by id is ordering by creation, and the id alone is a complete, unique cursor. Ordering by `createdAt` needs either Prisma's `cursor` option (rejected above) or a compound `(createdAt, id)` cursor, harder to explain for the same result. `createdAt` stays in the schema and the DTO for display.
- **Error code for the query**: the brief left the choice open; a new `QUERY_INVALID` (400) is added rather than reusing `BODY_INVALID`.
- **Duplicate message**: the brief suggested « Cette photo est déjà dans ta bibliothèque. »; every other client message uses "vous", so the message is « Cette photo est déjà dans votre bibliothèque. »
- **Library page components**: the brief asked to reuse `LibraryScreen`/`PhotoGrid` "as far as sensible". `LibraryScreen` renders `LibraryHeader`, a fixed bar with "Lancer le diaporama" meant for the wall; under the upload card it would cover the page. `/` reuses `PhotoGrid`, `PhotoList` and `LayoutToggle` directly, and `LibraryHeader` stays frame-only.
- **Frame component changes**: beyond removing `uploaderName` and wiring pagination, three small changes are needed (the frame UI session confirmed it has no conflicting work): `PhotoGrid`/`PhotoList` take `currentId: string | null` (no amber ring on `/`); `PhotoGrid`'s `pt-24`, which clears the frame's fixed header, moves to `LibraryScreen`'s wrapper; `usePhotoFeed` removes a deleted photo locally instead of reloading.
- **Delivery**: four PRs instead of three, to keep the first one reviewable (see Delivery).

## Server

### Data

```prisma
model User {
  // fields unchanged
  sessions Session[]
  photos   Photo[]
}

model Photo {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  ownerId      String   @db.ObjectId
  owner        User     @relation(fields: [ownerId], references: [id])
  url          String
  cloudinaryId String
  sha256       String
  createdAt    DateTime @default(now())

  @@unique([ownerId, sha256])
  @@index([ownerId, id])
  @@index([cloudinaryId])
}
```

`pnpm db:push` cannot build the unique index while old photos without `ownerId`/`sha256` exist (MongoDB counts each missing value as a duplicate `null`): `pnpm db:seed` first. The seed is unchanged; it already deletes photos before users, which the new relation requires.

### Repository (`photos.repository.ts`)

- `findPage({ ownerId, beforeId, take })`: `where: { ownerId, id: beforeId ? { lt: beforeId } : undefined }`, `orderBy: { id: 'desc' }`, `take`.
- `findByOwnerAndSha256(ownerId, sha256)`: `findUnique` on the compound key `ownerId_sha256`, `null` when absent.
- `create({ ownerId, url, cloudinaryId, sha256 })`: returns `null` on P2002 (unique violation), like `deleteById` returns `null` on P2025. The repository speaks Prisma, the service decides the error.
- `deleteOwned(id, ownerId)`: `prisma.photo.delete({ where: { id, ownerId } })` (Prisma accepts extra non-unique fields next to `id`); `null` on P2025, which covers both "unknown" and "someone else's".
- `countByCloudinaryId(cloudinaryId)`: `prisma.photo.count`.
- `findLatest` and `deleteById` are removed.

### Service (`photos.service.ts`)

- `createPhoto({ ownerId, file })`:
  1. `parseFile` (unchanged: missing file, mimetype filter);
  2. `sha256 = createHash('sha256').update(file.buffer).digest('hex')`;
  3. `findByOwnerAndSha256` → when found, log `photo.duplicate` (`userId`, `photoId` of the existing photo) and throw `PHOTO_DUPLICATE`; sharp and Cloudinary are never called;
  4. convert (sharp), upload (Cloudinary), as today;
  5. `create` → when `null` (a concurrent request won the race), destroy the image just uploaded through `deleteStoredImage` (it is referenced by nothing, no count needed), log `photo.duplicate`, throw `PHOTO_DUPLICATE`; any other failure keeps today's `photo.orphaned` log and stays a 500.
  6. log `photo.created` (`photoId`, `cloudinaryId`, `userId`).
- `listPage({ ownerId, cursor, limit })`: `cursor` and `limit` arrive as `unknown` (Express 5 parses a query value as `string | string[]`), validated at the boundary:
  - `limit`: absent → `DEFAULT_PAGE_SIZE`; else a string of digits between 1 and `MAX_PAGE_SIZE`, else `QUERY_INVALID`;
  - `cursor`: absent → first page; else a string matching `OBJECT_ID_PATTERN`, else `QUERY_INVALID`;
  - fetches `take: limit + 1`: when one record more than `limit` comes back, it is dropped and `nextCursor` is the id of the last kept record; else `nextCursor` is `null`. One query, no extra count.
  - returns `{ records, nextCursor }`.
- `deletePhoto({ ownerId, id })`: `parsePhotoId` (unchanged), `deleteOwned` → `null` means `PHOTO_NOT_FOUND`; then `countByCloudinaryId(record.cloudinaryId)`: `0` → `deleteStoredImage` (unchanged: a Cloudinary failure logs `photo.orphaned`, the deletion still succeeds); log `photo.deleted` (`photoId`, `cloudinaryId`, `userId`, `isImageDestroyed`). Returns the stored id.
- `LATEST_PHOTOS_LIMIT` disappears. No new dependency: `createHash` comes from `node:crypto`, used directly (it is deterministic, a test computes the expected value the same way).

### Controller, routes, events

- `list`: `service.listPage({ ownerId: currentUser(req).id, cursor: req.query.cursor, limit: req.query.limit })` → `200 { photos: records.map(toPhotoDto), nextCursor }`.
- `create`: `ownerId: currentUser(req).id`; emits `photo:new` with `io.to(userRoom(ownerId))`.
- `remove`: `service.deletePhoto({ ownerId, id: req.params.id })`; emits `photo:deleted` with `io.to(userRoom(ownerId))`.
- `userRoom(userId)` → `` `user:${userId}` ``, exported from `features/auth/auth.socket.ts` and used by the socket middleware too: one spelling of the room name. The comment there ("broadcasting stays global for now") goes.
- `toPhotoDto` drops `uploaderName`. Routes are unchanged.

### Types and errors

- `types.ts`: `Photo = { id, url, thumbnailUrl, createdAt }`; `PhotoPage = { photos: Photo[]; nextCursor: string | null }`; new codes `PHOTO_DUPLICATE` and `QUERY_INVALID`.
- `error-handler.ts`: `PHOTO_DUPLICATE: 409`, `QUERY_INVALID: 400`.

## Client

### Shared code

- `photo.ts`: `Photo` without `uploaderName`, `isPhoto` updated; `PhotoPage` and `isPhotoPage` (an object with a `photos` array of photos and a `nextCursor` string or `null`).
- `api.ts`: codes synced; `PHOTO_DUPLICATE`: « Cette photo est déjà dans votre bibliothèque. », `QUERY_INVALID`: « Requête invalide. Rechargez la page et réessayez. »
- `photosApi.ts` (new, next to `auth/authApi.ts`):
  - `fetchPhotoPage({ cursor, limit }, onUnauthenticated): Promise<PhotoPage | null>`: today's `fetchPhotos` logic (401 → `onUnauthenticated`, payload validated, `null` on failure), with the query string built by `URLSearchParams`;
  - `fetchAllPhotos(onUnauthenticated): Promise<Photo[] | null>`: loops on `fetchPhotoPage` with `FRAME_PAGE_SIZE = 100` (equal to the server's `MAX_PAGE_SIZE`, comment says so) until `nextCursor` is `null`; `null` when any page fails, so the frame keeps what it shows. The loop ends: each cursor is strictly older than the previous one.
- `photoSocket.ts` (new): `connectPhotoSocket({ onConnect, onNewPhoto, onDeletedPhoto, onRefused })` returns the socket. The `isPhoto` check on `photo:new` and the `UNAUTHENTICATED` handshake refusal move there from `usePhotoFeed`, shared by both hooks.
- `photoLabel.ts` (new): `formatPhotoDay(iso)` (the caption's `day month year` format, moved from `PhotoCaption`) and `photoLabel(photo)` → « Photo du 24 novembre 2026 », for alt texts and aria-labels now that there is no name.

### Frame (`/frame`)

`usePhotoFeed` keeps its role and signature (`Photo[]`, newest first, the whole library):

- on (re)connect and once a day: `fetchAllPhotos` (the daily HTTP call still slides the session);
- `photo:new`: prepended when absent (unchanged; Embla re-inits on a prepend and `useCarouselPhoto`/`useSlideshow` already handle it);
- `photo:deleted`: the photo is filtered out locally. The reload existed to fill the gap under the 20-photo cap; without a cap there is no gap. This also fixes the known drift of "Photos · N": with the whole library loaded and no cap, the count is the library size.

Limit, written in the spec rather than solved: every page is fetched at each connection, and the slideshow renders one Embla slide per photo (the strip thumbnails are lazy). Fine for a few hundred photos; virtualisation is out of scope.

Frame component changes are limited to the `uploaderName` removal and the pagination wiring, plus the three small changes listed under Deviations:

| Component                  | Change                                                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PhotoCaption`             | the name line goes; the date (`formatPhotoDay`) takes its place and style. The width cap for long names goes with it                               |
| `PhotoGridTile`            | the name overlay goes (the tile has no date); `alt` and the menu label use `photoLabel`                                                            |
| `PhotoListRow`             | the name goes, the date takes the free width; the image `alt` becomes `photoLabel` (nothing reads it twice any more); menu label from `photoLabel` |
| `PhotoSlide`, `PhotoStrip` | `alt` from `photoLabel`                                                                                                                            |
| `DeletePhotoDialog`        | « Cette photo sera supprimée de votre bibliothèque et de votre cadre. Cette action est irréversible. »                                             |
| `PhotoGrid`, `PhotoList`   | `currentId: string \| null`; `PhotoGrid` loses `pt-24`, `LibraryScreen` adds it around the grid or list                                            |

`PhotoActionsMenu` keeps "Supprimer" as is: in this step every photo of a library is the viewer's own; hiding it waits for step 5.

### Library page (`/`)

- `pages/UploadPage.tsx` becomes `pages/LibraryPage.tsx` (`git mv`). The page widens (`max-w-5xl`), the upload card stays `max-w-md` on top.
- The form moves to `components/library/UploadForm.tsx`, unchanged in behaviour, with an `onUploaded(photo)` callback: on 201 the body is validated with `isPhoto` and handed to it. The card text becomes « Ajoutez une photo à votre bibliothèque : elle s'affiche sur votre cadre. » The duplicate case needs no code: `errorMessage` shows the new message.
- Below, a section "Ma bibliothèque" in the frame's dark style (`dark`, frame background, rounded panel), so the reused components look as designed: a `LayoutToggle`, then `PhotoGrid` or `PhotoList` with `currentId={null}`, then a « Charger plus » button shown while `nextCursor` is not `null`, disabled with « Chargement… » while a page loads. No count: the page knows only what it loaded. Empty library: « Aucune photo pour l'instant. »
- Selecting a photo opens its full-size `url` in a new tab: useful on a phone, no viewer to build.
- `hooks/usePhotoLibrary.ts` (new): `{ photos, hasMore, isLoadingMore, loadMore, addPhoto }`.
  - on (re)connect of its socket: loads the first page (default size) and replaces the list. A reconnection drops the extra pages: simple, and catches what changed offline;
  - `loadMore`: fetches `cursor = nextCursor` and appends (keyset pages cannot overlap);
  - `addPhoto` (from `onUploaded`) and `photo:new`: prepend when absent; the socket event and the HTTP response bring the same photo;
  - `photo:deleted`: filtered out (the delete dialog relies on this event, as on the frame);
  - a 401 or a refused handshake calls `dropUser`, like the frame.
- The logout button stays in the card header.

## Testing

- Unit `photos.service.test.ts` (`vi.fn()` fakes, `RECORD` gains `ownerId` and `sha256`, loses `uploaderName`):
  - create nominal: `repository.create` receives `ownerId` and the SHA-256 of the original bytes (computed in the test with `createHash`), not of the converted JPEG;
  - duplicate found by the lookup → `PHOTO_DUPLICATE`, and `toFrameJpeg`, `uploadImage` never called;
  - lookup misses, `create` returns `null` (race) → `PHOTO_DUPLICATE`, and `deleteImage` called with the new `cloudinaryId`;
  - a `create` failure other than the race still logs `photo.orphaned` and rethrows;
  - `photo.created` and `photo.duplicate` logs carry ids only;
  - list: no `limit` → `take` is `DEFAULT_PAGE_SIZE + 1`; `limit` of `MAX_PAGE_SIZE` accepted; `0`, `MAX_PAGE_SIZE + 1`, `abc`, `1.5`, an array → `QUERY_INVALID`; an invalid `cursor` → `QUERY_INVALID`; a valid cursor is passed as `beforeId`; `limit + 1` records → `limit` returned and `nextCursor` = last kept id; `limit` records or fewer → `nextCursor` `null`;
  - delete: `deleteOwned` called with the caller's id; `null` → `PHOTO_NOT_FOUND` and `deleteImage` not called; count `0` → image destroyed; count `1` → image kept; Cloudinary failure still resolves.
- Unit `error-handler.test.ts`: `PHOTO_DUPLICATE` → 409, `QUERY_INVALID` → 400.
- Bruno:
  - `environments/Local.bru`: `adminEmail`, `adminPassword` (the seed's public dev credentials).
  - `auth/login/05-nominal-admin.bru`: logs the admin in and stores `ff_session=…` in `adminCookie` (not `sessionCookie`): the second account a request can switch to with `req.setHeader('Cookie', bru.getVar('adminCookie'))`. The member's `logout` tests close only the member's session.
  - `photos/create/01`: `res.body.uploaderName: isUndefined` replaces the name assertion. `03-edge-doublon.bru`: the same `photo.jpg` again → 409 `PHOTO_DUPLICATE`. `02` (PNG) stores `createdPngId`: it must be deleted at the end of the run, or the next run's PNG upload would be a duplicate. `09` body loses `uploaderName`.
  - Folder order becomes `create` (1), `list` (2), `delete` (3), so the list sees the two photos just created.
  - `photos/list/`: `01-nominal` → `photos` array of at most 30, newest first (ids descending), each with `thumbnailUrl`, `nextCursor` null or string; `02-nominal-premiere-page` `?limit=1` → one photo, `nextCursor` string (stored); `03-nominal-page-suivante` `?cursor={{nextCursor}}&limit=1` → one photo, another id, older; `04-edge-limite-invalide` `?limit=0` → 400 `QUERY_INVALID`; `05-edge-curseur-invalide` `?cursor=pas-un-id` → 400 `QUERY_INVALID`; the existing "sans cookie" request → 401.
  - `photos/delete/`: `01-edge-photo-d-un-autre` with `adminCookie` on `createdPhotoId` → 404 `PHOTO_NOT_FOUND`, then a script checks that the photo is still in the member's first page and absent from the admin's; then today's requests, renumbered; last, `05-nominal-png` deletes `createdPngId`.
  - The docs blocks lose every mention of `uploaderName`. If a run stops between create and delete, the next run's `create/01` answers 409: `pnpm db:seed` resets (written in the collection docs).
- Not testable in Bruno, checked by hand: log in as the member on `/frame` and as the admin in another browser on `/frame`; an upload by the member reaches the member's frame only, a deletion removes it from the member's frame only. Also by hand: « Charger plus » with more than 30 photos, the duplicate message on `/`, the frame with more than 100 photos (several pages).

## Docs

- ARCHITECTURE: photo flow step 5 (owner and SHA-256 instead of `uploaderName`, duplicate check before sharp); Pages table (`/` = library page); API table (`GET /api/photos` query and `{ photos, nextCursor }`, `DELETE` scoped to the owner, Cloudinary destroyed only when no photo references the image); `Photo` DTO; error table (`PHOTO_DUPLICATE` 409, `QUERY_INVALID` 400, `PHOTO_NOT_FOUND` also for another user's photo); Temps réel (events to `user:<id>`, no longer `io.emit`); Logs (`photo.duplicate`, `userId` on photo events); Données (`Photo` indexes, seed before push); the Bruno line (second account via `adminCookie`).
- README: `pnpm db:seed` before `pnpm db:push` when the schema changes on a database that holds photos.
- `.env.example`: no new variable.

## Delivery

A `gh stack` stacked on the step 1 stack (base branch `feat/client-login`), four draft PRs, each green on `pnpm check`, `typecheck`, `build`, `test`, `test:bruno`:

| PR  | Branch                    | Scope                                                                                                                                                                                                                                                                                        |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | `feat/library-schema`     | This spec; `Photo.ownerId` and indexes, `uploaderName` removed (schema, server DTO, client type, frame components, `photoLabel.ts`, Bruno); list (still capped at 20) and delete scoped to the owner; events to `user:<id>`; Bruno admin login and other-user delete → 404; unit tests; docs |
| B   | `feat/library-duplicates` | `sha256` and `@@unique([ownerId, sha256])`, lookup before processing, P2002 race with image cleanup, `PHOTO_DUPLICATE` (server and client message), Cloudinary reference count on delete; unit tests; Bruno duplicate and PNG cleanup; docs                                                  |
| C   | `feat/library-pagination` | `QUERY_INVALID`, `listPage` and `{ photos, nextCursor }`, `photosApi.ts`, `usePhotoFeed` loads every page and removes deletions locally; unit tests; Bruno `list/` and folder order; docs                                                                                                    |
| D   | `feat/library-page`       | `photoSocket.ts`, `usePhotoLibrary`, `LibraryPage` and `UploadForm`, `currentId` nullable, `pt-24` moved to `LibraryScreen`; docs (Pages)                                                                                                                                                    |

`uploaderName` goes in A rather than with the client in D: the schema drops the field, so the DTO loses it, and the client's `isPhoto` would reject every photo until the client follows. The response shape of `GET /api/photos` changes in C together with the frame that reads it, for the same reason. After A and after B, the author runs `pnpm db:seed` then `pnpm db:push`.

## Out of scope

Perceptual hashing, client-side SHA pre-check, sharing and "envoyée par X" (step 5), invitations and `FORBIDDEN` (step 3), friends (step 4), a photo count on the library page, virtualisation of the frame for large libraries, a full-screen viewer on `/`.
