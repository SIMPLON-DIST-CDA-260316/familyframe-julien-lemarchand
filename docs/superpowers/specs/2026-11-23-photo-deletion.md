# Photo deletion

- Date: 2026-11-23
- Changes: adds a feature to [the J1 MVP plan](../plans/2026-11-23-j1-mvp.md)
- AI usage: the author set the goal "deliver the deletion of received photos". Claude Code picked the defaults below without a design round, and the author reviews them in the PR.

## Decisions

- **Endpoint**: `DELETE /api/photos/:id` → `204` with no body. An unknown id, or one that is not a MongoDB ObjectId, answers `404 PHOTO_NOT_FOUND`. Checking the format first keeps Prisma from failing on a malformed id, which would be a 500.
- **Order**: the database first, then Cloudinary. The database decides what the frame shows. If Cloudinary fails after that, the photo is gone for the family and only an orphan image remains: logged with its Cloudinary id, the request still succeeds. The reverse order could leave a record pointing to a missing image, which breaks the frame.
- **CDN**: `destroy` with `invalidate: true`, so the cached derived images (full photo, thumbnail) stop being served too.
- **Real time**: the server emits `photo:deleted` with the photo id to every client, like `photo:new`. Every open frame reloads its list, not just the one that deleted it. Reloading rather than dropping the one photo lets the next photo beyond the 20 latest fill the gap. The event uses the stored id, not the one from the URL, which may differ in case.
- **Concurrent deletions**: one Prisma `delete`, no prior lookup. When two frames delete the same photo, the second gets `PHOTO_NOT_FOUND` (Prisma's P2025), not a 500.
- **Who can delete**: anyone who reaches the frame page, as anyone can upload. The brief has no accounts (see [photo field names](2026-11-23-photo-field-names.md)). A delete button on the upload page is left out: without accounts, a sender could delete anyone's photo just as well.
- **Client**: a "Supprimer" button on each photo of the frame, with a browser confirmation (`window.confirm`). Kept minimal on purpose: the frame views stack (PRs #19 to #31) rewrites `FramePage`, so its owner moves the button into the new views when rebasing.

## Verification

- Unit tests of `deletePhoto` in `photos.service.test.ts`: nominal order, unknown id, malformed id, Cloudinary failure.
- Bruno `photos/delete/`: deletes the photo created by `create/01`, then checks the 404 for the same id and for a malformed one.
- By hand in Chrome: delete from one frame tab, the photo disappears from a second tab without reloading.
