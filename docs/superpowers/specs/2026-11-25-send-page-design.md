# Send page (Step 17) Design

Status: decided and built without the author (asleep), per the controller's brief. The author reviews afterwards. Brief: [2026-11-25-send-page-brief.md](2026-11-25-send-page-brief.md). Plan: [2026-11-25-send-page.md](../plans/2026-11-25-send-page.md). Base: step 14's tip (`feat/upload-print-size`, 81edf8e).

## Request

Split keeping from giving. The library only keeps: its « + » and « Ajouter » open the source choice and add to the library. A new « Envoyer » page starts with the intent (« Envoyer une photo »), then the source (camera, device gallery, my library), then friends and message, then sends. Below the button, a private, mail-like history of my sends. A new Send record backs it, and the Cloudinary image is destroyed only when no photo and no send uses it.

## Decisions

### Server

- **D1 · One `Send` document per send action.** `Send { id, senderId, recipientIds: ObjectId[], url, cloudinaryId, message?, createdAt }`, indexes `(senderId, id)` for the history page and `cloudinaryId` for the image count. `recipientIds` holds only the friends who actually received the photo: a duplicate or a former friend is not listed. No Send is written when nobody received it.
- **D2 · The send action becomes one request for several friends.** Today the client posts once per friend, so the server cannot tell one action from three. The two existing routes keep their URLs and take a list: `POST /api/photos/:id/share` with JSON `{ friendIds: string[], message? }`, `POST /api/photos/share` multipart with `photo`, one `friendIds` field per friend and `message?`. Rejected: a new `POST /api/sends` (the URL change would ripple through five Bruno folders that chain on these requests for nothing the reviewer gains); a `sendId` handed back and forth between per-friend calls (state on the client, and a device send would still upload once per friend).
- **D3 · Per-friend outcomes, one answer.** The response is `{ send: SentPhoto | null, outcomes: [{ friendId, status: 'sent' | 'duplicate' | 'not_friends' }] }`: 201 when at least one friend received it, 200 with `send: null` when nobody did. A malformed, unknown, pending or own id is `not_friends`, as `NOT_FRIENDS` was. Whole-request errors stay errors: missing or empty `friendIds`, a non-string, more than 50 ids (`400 BODY_INVALID`), the message (`400 MESSAGE_INVALID`), the file (`PHOTO_MISSING`, format, size, `IMAGE_UNREADABLE`), the photo (`404 PHOTO_NOT_FOUND`). Duplicated ids count once. Friends are handled one after the other, in the order sent: simple to read, and a family send is a handful of people.
- **D4 · A device send uploads once.** The file is hashed, each friend is checked (friendship, then « already has this file »), and only if at least one friend can receive it is the file converted and uploaded, once; every recipient's photo points to that image. If every insert then loses a race (concurrent duplicate), the fresh image is destroyed. Before, three friends meant three uploads and three images.
- **D5 · The image count includes sends.** `lib/image-uses.ts` holds `countImageUses(prisma, cloudinaryId)` (photos + sends) and `destroyUnusedImage({ countImageUses, deleteImage, logger }, cloudinaryId)`, the existing rule moved out of `photos.service.ts` so the photos and sends services share it. Deleting a photo, or a history line, destroys the image only when the count is zero. A friend deleting the photo leaves my history intact; deleting my history line leaves my friends' photos intact.
- **D6 · History routes in a new `sends` feature.** `GET /api/sends?cursor&limit` → `{ sends: SentPhoto[], nextCursor }`, newest first, keyset on the id like the library (default 30, max 100: the same `parseLimit` and `parseCursor`). `DELETE /api/sends/:id` → 204; unknown, malformed or someone else's → `404 SEND_NOT_FOUND` (new code, client message « Cet envoi a déjà été retiré de l'historique. »). Files: `sends.repository.ts`, `sends.service.ts`, `sends.controller.ts`, `sends.routes.ts`, `sends.dto.ts` (shared with the photos controller, which answers a send action with the same `SentPhoto`).
- **D7 · `SentPhoto = { id, url, thumbnailUrl, createdAt, message, recipients: [{ id, displayName }] }`.** Names are read at display time, like « Envoyée par » (R-PAR-32): the current name. An account that no longer exists drops out of the list. No avatars: the line names people, the thumbnail is the photo.
- **D8 · No socket event for the history.** The sender's other open pages are not told: the page reloads its history when it opens and after each send from it. Recipients still get `photo:received`, one per copy.
- **D9 · Send record written by the share code.** `photos.share.ts` keeps the delivery and calls `recordSend` (the sends repository's `create`, injected in `PhotosServiceDeps`). The photos feature does not import the sends service, only its repository type.

### Client

- **D10 · Route `/send`, page « Envoyer ».** Header « Envoyer » with a primary « Envoyer une photo » button (full width on a phone, in the header on a computer), then the « Mes envois » history. The tab bar becomes Bibliothèque · Envoyer · Cadre · Amis (« Compte » leaves it, « Préférences » stays in the avatar menu, and on the preferences page no tab is highlighted, like on invitations). The desktop top bar gets « Envoyer » after « Ma bibliothèque ».
- **D11 · Source choice panel.** « Envoyer une photo » opens a panel (the same `ResponsivePanel`) with three tiles: « Prendre une photo » (camera), « Choisir sur l'appareil » (gallery, one image), « Depuis ma bibliothèque ». Camera and gallery hand the file to the existing send panel (`ShareSheet`, device target: prepared once by `preparePhoto`, never added to my library, R-PAR-20). « Depuis ma bibliothèque » swaps to a picker panel: my library's thumbnails in a scrolling grid, « Charger plus » for older ones; touching one opens the send panel with it. One photo per send (R-PAR-24 stays).
- **D12 · Same send panel for both entries.** « ⋯ → Envoyer à un ami » on a photo (library, viewer, slideshow) and the « Envoyer » page both open `ShareSheet`, which now makes one request for all chosen friends and reads the outcomes; the toasts and the « stays open when nobody received it » rule (R-PAR-46) are unchanged.
- **D13 · History rows, mail-like.** Each row: the square thumbnail, « À Mamie et Tata » (first names, as the toasts), the relative date on the right (« à l'instant », « il y a 5 min », « il y a 2 h », « hier », « il y a 3 jours », then the day « 12 novembre 2026 »), the message in quotes on up to two lines, and a bin button « Retirer de l'historique » that asks first (« Retirer cet envoi de l'historique ? » — « Vos proches gardent la photo. »). The full date and time is the `<time>` tooltip. Rows do not open the photo: the history says what left, the library is for looking. No read or kept status (privacy, brief).
- **D14 · History loading.** First 30, « Afficher plus » for the next 30; reloaded from the start after a send from the page and after a removal fails with « déjà retiré ». Removal is optimistic on success only: the row leaves when the server answers 204.
- **D15 · Keep-only add panel.** « Envoyer à un ami » leaves the « Ajouter une photo » panel. With a single intent left, the confirm step is removed too: choosing photos (camera or gallery) adds them at once and closes the panel, the greyed tiles take over (R-BIB-54). More than 20 keeps the panel open with its message. The preview and « Ajouter à ma bibliothèque » go. `LibraryPage` and `LibraryHeader` are not touched (a parallel `feat/library-timeline` branch reshapes them).

## Rejected

- A copy in my library when sending from the device, or a checkbox for it (brief: no).
- A thumbnail per recipient, or one history line per recipient: one action, one line (brief).
- Opening the photo from a history row, comments or replies: out of scope.
- A retention limit: none for now (brief).
- Backfilling the history from existing photos with a `senderId`: the brief says history starts with this step.

## Product docs

- `partage.md`: the send panel opens from the « Envoyer » page and from « ⋯ »; new sections « Envoyer une photo depuis la page Envoyer » and « Historique des envois » (R-PAR-58 onwards); « Envoyer une photo depuis son appareil » rules replaced where the add panel no longer sends.
- `bibliotheque.md`: the add panel only adds, photos are added as soon as chosen (R-BIB-01, R-BIB-44, R-BIB-60, R-BIB-65 updated or replaced, R-BIB-66 onwards).
- `apparence-et-navigation.md`: the tab bar and the top bar (R-APP-60, R-APP-63 replaced, R-APP-67 onwards).
