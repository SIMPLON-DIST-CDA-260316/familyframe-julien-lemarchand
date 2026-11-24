# Step 5: sharing

- Date: 2026-11-24
- Scope: step 5 of `2026-11-23-accounts-sharing-overview.md`. `Photo.senderId`, sending a photo to an accepted friend from the library (same Cloudinary image) or from the device (to the friend only), `NOT_FRIENDS`, duplicates on the recipient's side, « envoyée par X », the « Envoyer à un ami » dialog.
- AI usage: designed by the AI from the author's fixed requirements while the author was away; every choice left open is recorded in the Decisions table with its reason. To be validated by the author (see Open questions).
- Builds on: `2026-11-24-personal-library-design.md` (`ownerId`, SHA-256 before sharp, `(ownerId, sha256)` index, `PHOTO_DUPLICATE`, `user:<id>` rooms, `deleteOwned`), `2026-11-24-friends-design.md` (`areFriends`, Q4: received photos stay), `2026-11-23-photo-deletion.md` (the Cloudinary image goes with the last `Photo` using it), `2026-11-23-server-logging-design.md` (event names, no PII).

## Goal

A member sends a photo to an accepted friend. From the library, the friend gets a new `Photo` pointing to the same Cloudinary image; nothing is uploaded again. From the device, the file is converted and uploaded as usual, but lands in the friend's library only. The friend's frame shows the photo at once with « Envoyée par X ». Each library deletes on its own: the received photo stays when the sender deletes the original or removes the friendship.

## Decisions

| Topic                    | Decision                                                                                                                                                                             | Main reason                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Model                    | `Photo.senderId String? @db.ObjectId` with a `sender` relation; `null` for a photo one uploaded oneself                                                                              | the overview's model; a received photo is an ordinary `Photo` of its owner, every existing query keeps working                              |
| Routes                   | two: `POST /api/photos/:id/share` (JSON `{ friendId }`) and `POST /api/photos/share` (multipart `photo` + `friendId`)                                                                | two different inputs (an existing photo, a file) and two different parsers; a sub-route like `friendships/:id/accept`                       |
| Response                 | `201` with the recipient's new `Photo`, as the recipient sees it                                                                                                                     | Bruno needs its id to check and clean up; it reveals nothing the sender does not know (the image is theirs, `senderName` is their own name) |
| Friend check             | `areFriends(senderId, friendId)` from the friendships service, injected into the photos service as a dependency; `false` → `403 NOT_FRIENDS`                                         | the friendship rule stays in step 4's service; the photos service stays testable with a `vi.fn()`                                           |
| Invalid `friendId`       | missing, not a string, not an ObjectId (no query), unknown, pending, oneself → `403 NOT_FRIENDS`                                                                                     | "is this an accepted friend" has one answer; oneself already fails `areFriends` (no pair row), no extra code                                |
| Order of checks          | request shape (photo id or file), then friendship, then the photo lookup or the SHA-256, then sharp and Cloudinary                                                                   | nothing is read or uploaded for someone who is not a friend; cheap checks first                                                             |
| Someone else's photo     | sharing a photo one does not own → `404 PHOTO_NOT_FOUND`, also for a malformed id (no query)                                                                                         | same rule as deletion: no existence leak                                                                                                    |
| Received photo, again    | allowed: a photo I received is in my library, I may send it on; the new `Photo` has `senderId` = me                                                                                  | a library has one kind of photo; « envoyée par » names who sent it to this owner; the reference count already covers any number of hops     |
| Duplicates               | the friend's `(ownerId, sha256)` is checked before any write (and before sharp/Cloudinary from the device); the unique index refuses a concurrent copy; both → `409 PHOTO_DUPLICATE` | the step 2 mechanism, applied to the recipient's library                                                                                    |
| Library duplicate race   | a P2002 on a library share answers `PHOTO_DUPLICATE` **without** destroying the image                                                                                                | the image belongs to the original photo; only a fresh device upload is destroyed on P2002 (step 2's `saveRecord`)                           |
| Cloudinary references    | unchanged: deletion destroys the image when `countByCloudinaryId` is 0 after the delete                                                                                              | step 2 already counts by `cloudinaryId` (not unique, indexed); a share is one more reference                                                |
| « Envoyée par X »        | the `Photo` DTO gains `senderName: string \| null` (sender's `displayName`), read with a Prisma `include` on `sender` selecting `displayName` only                                   | the client needs a name, not an id; no email, no role; a join keeps one source for the name                                                 |
| Real time                | `photo:new` to `user:<friendId>` only; no event for the sender (their library does not change)                                                                                       | the step 2 rule: events go to the owner's room only                                                                                         |
| Friendship removed later | received photos stay; nothing cascades                                                                                                                                               | step 4 Q4: they are separate `Photo` documents owned by the recipient                                                                       |
| Picking the friend       | the dialog loads `GET /api/friendships` when it opens and lists `friends` only; one « Envoyer » button per friend                                                                    | the route exists (step 4); pending requests cannot receive; one tap per friend also allows sending to several friends from one dialog       |
| Where the dialog opens   | from the photo's actions menu (`PhotoActionsMenu`, so library page and frame) and from the upload form (« Envoyer à un ami » next to « Ajouter à ma bibliothèque »)                  | one component already carries the per-photo actions; the upload form already holds the chosen file                                          |
| Dialog component         | shadcn `dialog` generated into `components/ui/` (Radix `Dialog` from the installed `radix-ui` package)                                                                               | no new dependency; `AlertDialog` is for confirmations, not for a list                                                                       |
| JSON body                | `express.json()` on the `/:id/share` route only                                                                                                                                      | the logging spec's rule: a JSON route brings its own parser; the multipart routes keep multer                                               |

Rejected: one route with an optional `photoId` or file (two shapes, two parsers, one handler full of branches), `friendId` on `POST /api/photos` (the same URL would add a photo to someone else's library), a separate `/api/shares` resource (a share is a `Photo`, there is no share object to read or delete), `400` for a malformed `friendId` (a second code for the same answer), `404` for a non-friend (the friend exists, the client listed them), forbidding to send on a received photo (two kinds of photos to explain), a `photo:shared` event for the sender (nothing on their screen changes), denormalizing `senderName` into `Photo` (a second copy of the name), one Cloudinary image per recipient (double storage, rejected in the overview).

## Server

### Data

```prisma
model User {
  // fields unchanged, except photos:
  photos     Photo[] @relation("PhotoOwner")
  sentPhotos Photo[] @relation("PhotoSender") // photos this account sent, in other libraries
}

model Photo {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  ownerId      String   @db.ObjectId
  owner        User     @relation("PhotoOwner", fields: [ownerId], references: [id])
  // null when the owner uploaded it; else the friend who sent it.
  senderId     String?  @db.ObjectId
  sender       User?    @relation("PhotoSender", fields: [senderId], references: [id])
  url          String
  cloudinaryId String
  sha256       String
  createdAt    DateTime @default(now())

  @@unique([ownerId, sha256])
  @@index([ownerId, id])
  @@index([cloudinaryId])
}
```

Two relations to `User` need names (Prisma rule). No index on `senderId`: nothing queries by sender. Existing documents have no `senderId`: Prisma reads it as `null`. `pnpm db:push` changes no index; the seed already deletes photos before users.

### Repository (`photos.repository.ts`)

- `PhotoRecord` becomes `Photo & { sender: { displayName: string } | null }`: `findPage` and `create` add `include: { sender: { select: { displayName: true } } }` (one `SENDER_NAME` constant).
- `NewPhoto` gains `senderId?: string`.
- `findOwned(id, ownerId): Promise<Photo | null>`: `findFirst({ where: { id, ownerId } })`, for the library share.
- `findByOwnerAndSha256`, `deleteOwned`, `countByCloudinaryId`: unchanged.

### Service (`photos.service.ts`)

Deps gain `areFriends: (userId: string, otherUserId: string) => Promise<boolean>`. New inputs: `LibraryShare = { senderId, photoId: string, friendId: unknown }`, `DeviceShare = { senderId, file, friendId: unknown }` (`friendId` from the body, validated here).

- `requireFriend(deps, friendId, senderId): Promise<string>`: not a string matching `OBJECT_ID_PATTERN`, or `areFriends` false → logs `photo.share_refused` (warn, `reason: 'not_friends'`, `userId`) and throws `NOT_FRIENDS`. Returns the friend's id.
- `shareFromLibrary({ senderId, photoId, friendId })`:
  1. `parsePhotoId(photoId)` → `PHOTO_NOT_FOUND`;
  2. `requireFriend`;
  3. `findOwned(photoId, senderId)` → `null` means `PHOTO_NOT_FOUND`;
  4. `rejectKnownFile(deps, friendId, original.sha256)` → `PHOTO_DUPLICATE`;
  5. `create({ ownerId: friendId, senderId, url, cloudinaryId, sha256 })` from the original; `null` → logs `photo.duplicate` and throws `PHOTO_DUPLICATE`, the image untouched;
  6. logs `photo.shared` (`photoId` = new, `sourcePhotoId`, `cloudinaryId`, `userId` = sender, `recipientId`, `source: 'library'`).
- `shareFromDevice({ senderId, file, friendId })`: `parseFile` → `requireFriend` → `sha256Of` → `rejectKnownFile(deps, friendId, sha256)` → convert → upload → `saveRecord(deps, { ownerId: friendId, senderId, ...image, sha256 })` (P2002 destroys this fresh image, as today) → logs `photo.shared` (`source: 'device'`, no `sourcePhotoId`).
- `createPhoto`'s steps after `parseFile` (SHA-256, duplicate check, convert, upload, save) are factored as `storeNewPhoto(deps, { ownerId, senderId, buffer })`, shared with `shareFromDevice`: the device share is an upload with another owner.
- `deletePhoto`: unchanged. The comment on `destroyUnusedImage` ("a share (step 5) points to the same image") becomes present tense.

Logs carry ids only: never a display name, an email or a file name.

### Controller, routes

- `toPhotoDto(record)` adds `senderName: record.sender?.displayName ?? null`.
- `shareFromLibrary`: `service.shareFromLibrary({ senderId: currentUser(req).id, photoId: req.params.id, friendId: req.body?.friendId })`; emits `photo:new` to `userRoom(record.ownerId)`; `201` with the DTO.
- `shareFromDevice`: same with `file: req.file`, `friendId: req.body?.friendId` (multer fills `req.body` with the text fields).
- Router: `POST /share` (`upload.single('photo')`) and `POST /:id/share` (`express.json()`). Different segment counts: no clash with `DELETE /:id`.
- `app.ts`: the friendships service is built once in `createApp` and passed to `assembleFriendshipsRouter(service)` and `assemblePhotosRouter(io, service.areFriends)`.

### Types and errors

- `types.ts` and `client/src/photo.ts`: `Photo` gains `senderName: string | null`.
- New code: `NOT_FRIENDS` → `403` (friend id that is not an accepted friend's, oneself included). `PHOTO_NOT_FOUND`, `PHOTO_DUPLICATE`, `PHOTO_MISSING`, `FORMAT_UNSUPPORTED`, `IMAGE_UNREADABLE`, `PHOTO_TOO_LARGE`, `UPLOAD_INVALID`, `BODY_INVALID` are reused.

## Client

### Shared code

- `api.ts`: `NOT_FRIENDS` synced: « Cette personne ne fait pas partie de vos amis. »
- `photo.ts`: `senderName` in the type and in `isPhoto` (`null` or string).
- `photosApi.ts`: `postLibraryShare(photoId, friendId)` and `postDeviceShare(file, friendId)`, results `{ status: 'shared' } | { status: 'failed', message } | { status: 'unauthenticated' }` like `postPhoto`. `PHOTO_DUPLICATE` there reads « Cette personne a déjà cette photo. » (the shared message says « votre bibliothèque »).
- `photoLabel.ts`: `photoLabel` becomes « Photo envoyée par X, du 24 novembre 2026 » when `senderName` is set (the comment about step 5 goes).

### « Envoyée par X »

- Frame caption (`PhotoCaption`): a second line « Envoyée par X » under the day, same style, smaller.
- Library list row (`PhotoListRow`): « Envoyée par X » under the day. Grid tile: in the label only (no room on a thumbnail).

### Dialog (`components/sharing/SharePhotoDialog.tsx`)

- Props: `target: { kind: 'library'; photo: Photo } | { kind: 'device'; file: File } | null`, `onClose`, `onShared?` (the upload form empties its inputs after the first success).
- Opens with « Envoyer à un ami », a small preview (thumbnail or the form's preview URL), then the accepted friends from `useFriendships` (`friends` only): name and email, an « Envoyer » button (« Envoi… », then « Envoyée » disabled). Errors (`NOT_FRIENDS` when removed meanwhile, `PHOTO_DUPLICATE`, upload errors) show above the list; the row stays enabled.
- No friends: « Vous n'avez pas encore d'amis. » and a link « Ajouter un ami » to `/friends`. Loading: « Chargement… ».
- « Fermer » closes it. `dark` on the content when opened from the frame (it portals to `body`, like the actions menu).

### Entry points

- `PhotoActionsMenu`: « Envoyer à un ami » (`SendIcon`) above « Supprimer », opening the dialog with the photo (the dialog lives outside the menu content, like `DeletePhotoDialog`). Every caller gets it: library page, frame library screen, slideshow menu.
- `UploadForm`: the submit button becomes « Ajouter à ma bibliothèque »; a second outline button « Envoyer à un ami », enabled once a file is chosen, opens the dialog with the file. The file reaches the friend only; « Photo envoyée ! » stays for the library path.
- `LibraryPage` card description: « Ajoutez une photo à votre bibliothèque ou envoyez-la directement à un ami. »

## Testing

- Unit `photos.service.share.test.ts` (`vi.fn()` fakes, `areFriends` among them):
  - library nominal: `create` gets `ownerId` = friend, `senderId`, the original's `url`, `cloudinaryId`, `sha256`; no upload, no conversion; logs `photo.shared` with ids only;
  - library: malformed photo id → `PHOTO_NOT_FOUND` without a query; `findOwned` `null` → `PHOTO_NOT_FOUND`; `areFriends` false, malformed or missing `friendId` → `NOT_FRIENDS`, nothing read beyond `areFriends`, nothing created; friend has the sha → `PHOTO_DUPLICATE`; `create` `null` → `PHOTO_DUPLICATE` and `deleteImage` **not** called;
  - device nominal: SHA checked against the friend, uploaded, `create` gets the friend as owner and the sender; device not friends → `NOT_FRIENDS` before `toFrameJpeg` and `uploadImage`; friend has the sha → `PHOTO_DUPLICATE` before `toFrameJpeg`; `create` `null` → the fresh image destroyed, `PHOTO_DUPLICATE`; missing file → `PHOTO_MISSING`.
- `photos.service.test.ts`: the fakes gain `areFriends`; a deletion case where `countByCloudinaryId` returns 1 (a shared copy left) keeps the image (already covered: check, add if missing).
- `error-handler.test.ts`: `NOT_FRIENDS` → 403.
- Bruno, new folder `photos/share/` (`seq: 3`; `photos/delete/` moves to `seq: 4`). The member shares to the admin. `share/01`'s pre-request reads both ids through `GET /api/auth/me` (`memberId`, `adminId`) and deletes any friendship left between them by an interrupted run.
  - `01-edge-pas-amis` → 403 `NOT_FRIENDS` (no friendship yet);
  - `02-nominal-bibliotheque`: pre-request makes the member and the admin friends through axios (request, accept), stores `shareFriendshipId`; `POST /photos/{{createdPhotoId}}/share` → 201, `senderName` `Membre`, id in `sharedPhotoId`; script: the admin's list has it with `senderName` `Membre`, the member's list does not;
  - `03-edge-doublon-bibliotheque` → 409 `PHOTO_DUPLICATE`;
  - `04-edge-photo-d-un-autre` (admin shares the member's photo to the member) → 404 `PHOTO_NOT_FOUND`;
  - `05-edge-id-invalide` → 404; `06-edge-soi-meme` (`friendId` = `memberId`) → 403 `NOT_FRIENDS`; `07-edge-json-malforme` → 400 `BODY_INVALID`;
  - `08-nominal-appareil` (`photo.png`, `friendId` = `adminId`) → 201, id in `deviceSharedPhotoId`; script: in the admin's list, not in the member's;
  - `09-edge-doublon-appareil` (`photo.jpg`, the admin has it since `02`) → 409 `PHOTO_DUPLICATE`; `10-edge-ami-invalide` (`friendId` `pas-un-id`) → 403; `11-edge-sans-fichier` → 400 `PHOTO_MISSING`; `12-edge-sans-cookie` → 401;
  - `13-nominal-fin-amitie`: the member deletes `shareFriendshipId` → 204; script: both received photos are still in the admin's list.
  - `delete/02-nominal`'s script also checks that `sharedPhotoId` is still in the admin's list after the member deleted the original; new `delete/06-nominal-photos-recues` and `07`: the admin deletes `sharedPhotoId` (last reference: the image goes) and `deviceSharedPhotoId` → 204. The collection ends with no photo and no friendship.
- Manual: as the member, make the admin a friend; send a library photo from the actions menu: the admin's frame (private window) shows it at once with « Envoyée par Membre », the member's library does not change; send the same photo again: « Cette personne a déjà cette photo. »; choose a file and « Envoyer à un ami »: it appears on the admin's frame only; delete the original as the member: the admin's copy still displays; remove the friendship: the copies stay, the dialog no longer lists the admin.

## Docs

- README: how to send a photo to a friend (actions menu, upload form).
- ARCHITECTURE: API (two routes); error table (`NOT_FRIENDS`, `PHOTO_DUPLICATE` also on sharing, `BODY_INVALID` also on `/api/photos/:id/share`); photo flow (library share: no upload, same image; device share: the upload flow with the friend as owner); Données (`senderId`, the two named relations, reference counting by `cloudinaryId`); Logs (`photo.shared`, `photo.share_refused`); Temps réel (`photo:new` to the recipient's room).
- Bruno: `photos/folder.bru` (shape gains `senderName`, `NOT_FRIENDS`, order `create`, `list`, `share`, `delete`), `photos/share/folder.bru`, `collection.bru` (the share folder makes and removes its own friendship; `memberId`, `adminId`).
- `.env.example`: no new variable.

## Delivery

A `gh stack` stacked on the step 4 stack (base branch `feat/client-friends`), four draft PRs, each green on `pnpm check`, `typecheck`, `build`, `test`, `test:bruno`:

| PR  | Branch                 | Scope                                                                                                                                                                                                                        |
| --- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | `feat/sharing-schema`  | This spec and its plan; `senderId`, named relations; repository (`PhotoRecord` with sender, `NewPhoto.senderId`, `findOwned`); `senderName` in the DTO, `types.ts`, `client/src/photo.ts`; Bruno photo shape; docs (Données) |
| B   | `feat/sharing-library` | `NOT_FRIENDS` (server and client message); `areFriends` dep and `app.ts` wiring; `shareFromLibrary`, `POST /:id/share`; unit tests; Bruno `share/01`–`07`, `13`, `delete/` changes for `sharedPhotoId`; docs                 |
| C   | `feat/sharing-device`  | `storeNewPhoto` extraction, `shareFromDevice`, `POST /share`; unit tests; Bruno `share/08`–`12`, `delete/07`; docs                                                                                                           |
| D   | `feat/client-sharing`  | shadcn `dialog`, `postLibraryShare`/`postDeviceShare`, `SharePhotoDialog`, actions menu and upload form entry points, « Envoyée par X » on caption, row and labels; docs (README)                                            |

After A, the author runs `pnpm db:push` (no index change; harmless) then `pnpm db:seed` for a clean base. `storeNewPhoto` lands in C with its second caller, not before.

## Out of scope

Frame pairing by code, email verification, password reset, login rate limiting, perceptual hashing, client-side SHA pre-check, random slideshow order, sending to several friends in one request, a « sent » history for the sender, notifying the recipient beyond the frame, un-sending a photo.

## Open questions (defaults applied meanwhile)

1. Two routes (`/:id/share`, `/share`) rather than one. Default: two, one input shape each.
2. The share answers `201` with the recipient's photo. Default: yes (Bruno cleanup; nothing secret). Alternative: `204`.
3. Every bad `friendId` (missing, malformed, oneself, pending, unknown) answers `403 NOT_FRIENDS`. Default: one code. Alternative: `400 BODY_INVALID` for missing or malformed.
4. A received photo can be sent on; « envoyée par » then names the last sender. Default: allowed.
5. « Envoyer à un ami » also appears on the frame (shared `PhotoActionsMenu`). Default: yes. Alternative: a prop to hide it on the frame.
6. The real-time event stays named `photo:new` (the goal text says `photo:created`). Default: keep the existing name; renaming touches server, client and docs for no behavior change.
7. `senderName` is read through a join, so a future rename of the sender shows on old photos. Default: join (no rename feature exists).
