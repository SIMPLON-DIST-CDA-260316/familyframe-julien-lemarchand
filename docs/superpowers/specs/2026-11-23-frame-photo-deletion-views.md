# Photo deletion in the frame views

Follows [photo deletion](2026-11-23-photo-deletion.md) (#38). That PR added a `DeleteButton` under every photo of the old `FramePage`. The frame views rework (#23) rewrote the page and dropped it. This note brings deletion back in the new views.

## Placement (user's decision)

- **Photo view:** a trash button in the controls pill, after the slideshow controls, behind a divider. It deletes the photo on screen and hides with the pill.
- **Contact sheet:** a small trash button on each tile, top-right, shown on hover and on keyboard focus. It is a sibling of the tile's button, not a child, because a button cannot hold a button.

Both call the same `deletePhoto`: confirm, `DELETE /api/photos/:id`, alert on failure. The list is never edited locally: `usePhotoFeed` reloads on `photo:deleted`.

Rejected options:

- **Pill only:** the contact sheet is where one picks the photo to remove, and the pill acts on the photo on screen only.
- **Sheet only:** the photo on screen would have no way to be deleted, one would first have to leave the photo view.

## Selection fixes in `useFrameSelection`

A deletion removes a photo the selection may still point to, so three cases need handling.

1. **The pinned photo is deleted:** `selectedId` is only used while `photos` still contains it, otherwise `currentId` falls back to the newest.
2. **The newest photo is deleted:** `newestId` changes without any arrival. It counts as an arrival only if the previous newest is still in `photos`, otherwise it is just recorded. No pin, no badge.
3. **Every photo is deleted:** `currentId` becomes `undefined` and `FramePage` renders `EmptyFrame`. Nothing to add.

## Known limitations

- **Delete and arrival in the same reconnect refetch:** if the newest photo is deleted while another arrives during a disconnect, the refetch shows no previous newest, so the new photo counts as no arrival: an active viewer jumps to it, with no badge and no pin. Rare, accepted.
- **Badge count after deleting an unseen photo:** the count is not lowered. Clicking the badge still shows the real newest photo.
