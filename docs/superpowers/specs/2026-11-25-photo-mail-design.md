# Step 9: photo mail

- Date: 2026-11-25
- Scope: step 9 « Courrier photo ». A friend's photo can carry a short message; received photos arrive unopened, are announced « Vous avez N nouvelles photos » on the library and the frame, and are revealed one by one before they join the library and the slideshow. Server (schema, two endpoints, two socket events, Bruno) and client. **No new dependency, Prisma stays on v6.**
- AI usage: the author asked the AI to design and deliver steps 8 to 11 without waiting for a design session (« je veux que tu livres 8 à 11 sans m'attendre, c'est tout l'intérêt des PR stackées. Rien n'est mergé », 2026-11-25). Every decision below was taken by the AI from the goal's brief, with its reason; the author reviews them afterwards on the draft PRs. The ones most worth a second look are listed under Open questions. The AI verified the Prisma/MongoDB query semantics on a throwaway MongoDB 7 replica set, and built every task in a throwaway clone (gates green) before writing the plan.
- Builds on: `2026-11-24-photo-sharing-design.md` (shares, `senderId`, `photo:new` to the friend's room), `2026-11-25-share-sheet-design.md` (`ShareSheet`, `ShareFriendsForm`, `useShareSending`), `2026-11-25-frame-mode-design.md` (`useFrameMode`, `PolaroidPrint`, `NewPhotosBadge`, templates).

## Goal

A photo from the family feels like a letter. The sender can add a few words; the person receiving it sees « Vous avez 2 nouvelles photos » on their library and on their frame, taps « Découvrir », and the photos appear one at a time, in large, with who sent them, when, and what they wrote. Only then do they take their place in the library and the slideshow.

## Brief (from the goal)

- An optional, length-limited message attached to a sent photo, shown with the sender.
- Received photos arrive « non ouvertes ». The frame and the library show « Vous avez N nouvelles photos ».
- On click, the photos are revealed one by one, with sender and message; they then join the library and the slideshow.

## Decisions

| Topic                         | Decision                                                                                                                                                                                                                                     | Main reason                                                                                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Message storage               | `Photo.message String?`, on the recipient's copy only; absent without a message                                                                                                                                                              | the copy is the recipient's photo; a message belongs to one send, not to the image                                                                          |
| Message length                | 200 characters at most, counted after trimming (UTF-16 `.length`, the same count as the browser's `maxLength`)                                                                                                                               | a postcard, not a letter: it must fit under the photo on a frame (three lines on the slideshow caption and the polaroid band)                               |
| Message input                 | trimmed; empty or blanks = no message; not a string (number, repeated multipart field, object) → `400 MESSAGE_INVALID`; validated **before** the friend check                                                                                | fail fast on the input itself; a refused message must not depend on the friendship state                                                                    |
| Message on a re-share         | a photo re-sent carries the new sender's message, never the one it came with                                                                                                                                                                 | « Envoyée par » already names the last sender (R-PAR-33): the message follows the same person                                                               |
| Message in logs               | `hasMessage: boolean` on `photo.shared`, never the text                                                                                                                                                                                      | the text is personal content (security logging rule: no PII)                                                                                                |
| Unopened storage              | `Photo.isOpened Boolean?`: `true` on an own upload, `false` on a share, set to `true` when opened                                                                                                                                            | one field, one query each way; the frame and the library already filter by owner                                                                            |
| Existing photos               | left untouched: the field is unset and counts as opened; no migration, `pnpm db:push` without seed                                                                                                                                           | the brief: existing received photos stay in the library. No new index, so no seed is needed                                                                 |
| Library query                 | `findPage` adds `OR: [{ isOpened: true }, { isOpened: { isSet: false } }]`                                                                                                                                                                   | verified on MongoDB 7 + Prisma 6.19: `{ not: false }` and `NOT: { isOpened: false }` **exclude** unset fields; `isSet: false` is the only way to match them |
| Waiting photos query          | `{ ownerId, isOpened: false }`, newest first, no pagination                                                                                                                                                                                  | a handful of photos at a time; served by the existing `(ownerId, id)` index                                                                                 |
| API                           | `GET /api/photos/unopened` → `200 { photos }`; `POST /api/photos/:id/open` → `200 Photo` (no body)                                                                                                                                           | REST-ish and minimal: one read, one action; no `PATCH` with a body to validate                                                                              |
| Open semantics                | one atomic `update({ where: { id, ownerId } })`; idempotent (opening twice answers 200 again); foreign, unknown or malformed id → `404 PHOTO_NOT_FOUND`                                                                                      | same pattern and same existence-hiding rule as delete; two devices opening together must not error                                                          |
| Socket events                 | shares emit **`photo:received`** (was `photo:new`) to the recipient's room; opening emits **`photo:opened`** to the owner's room; `photo:new` stays for own uploads                                                                          | the frame and the library must not show an unopened photo; every page of the owner must learn an opening                                                    |
| When a photo counts as opened | as soon as it is **shown** in the reveal (not on « Photo suivante »)                                                                                                                                                                         | the person has seen it; closing halfway keeps only the unseen ones waiting                                                                                  |
| Reveal order                  | oldest first                                                                                                                                                                                                                                 | letters are read in the order they came; the last one shown is the newest                                                                                   |
| Reveal snapshot               | the reveal works on a copy of the waiting list taken on « Découvrir »                                                                                                                                                                        | a photo arriving or opened elsewhere must not shift the reveal; a new one waits for the next reveal                                                         |
| Place of an opened photo      | its reception date (`createdAt`, i.e. its id), not the top of the library                                                                                                                                                                    | the library and the slideshow are ordered by date everywhere; the date shown is the reception date (R-PAR-34)                                               |
| Client insert                 | `withNewPhoto` inserts by id, newest first (was: prepend)                                                                                                                                                                                    | an opened photo lands at its date in both the library and the frame without a reload                                                                        |
| Waiting list on the client    | `usePhotoMail()`: its own Socket.IO connection, `GET /api/photos/unopened` at each connection, `photo:received` adds, `photo:opened` / `photo:deleted` remove; `open(id)` posts and removes on success                                       | the same live-load pattern as the feed and the library; keeps those hooks unchanged in shape                                                                |
| Socket handlers               | `connectPhotoSocket` handlers become optional per event                                                                                                                                                                                      | each page listens only to what it shows                                                                                                                     |
| Library announcement          | a card at the top of the library: « Vous avez N nouvelles photos », « De Mamie et Tata », button « Découvrir »                                                                                                                               | news from the family comes first; the first names reuse the share sheet's `firstName` / `joinNames`                                                         |
| Reveal UI                     | a full-screen dark dialog (`z-50`, above the viewer): « Nouvelle photo 1 / 3 », ✕, the photo with a soft zoom-in fade (`motion-safe`), « Envoyée par [nom] », the date, the message in « guillemets », and « Photo suivante » / « Terminer » | the same visual language as the viewer and the frame; one photo at a time is the « letter » feeling of the brief                                            |
| Frame announcement            | a white pill with an envelope, « Vous avez N nouvelles photos », top centre, stacked above the existing accent pill (« N nouvelles photos »), visible even when idle; both pills live in a new `FrameNotices` column                         | the two pills must not overlap; the white of the print says « letter », the accent says « photo now playing »                                               |
| Frame, empty library          | a new status « Des photos vous attendent. » under the pill                                                                                                                                                                                   | without it, a brand-new frame would say « En attente de la première photo… » while photos wait                                                              |
| Frame after the reveal        | closing calls `selection.showNewest()`                                                                                                                                                                                                       | the opened photos joined the slideshow while the dialog was open; the arrivals pill must not announce photos just seen                                      |
| Message display               | in « guillemets » (non-breaking spaces) under « Envoyée par », in the viewer caption (whole), the slideshow caption and the polaroid band (`line-clamp-3`)                                                                                   | shown with the sender, as the brief says; the frame stays about the photo                                                                                   |
| Share sheet                   | a « Message (facultatif) » textarea, three rows, counter « N / 200 », `maxLength` 200, one message for all chosen friends; the description becomes « Elle les attendra sur leur cadre et dans leur bibliothèque. »                           | one sheet, one message, as the share sends one photo to several friends; the old description (« aussitôt sur leur cadre ») becomes false                    |

## Rejected

- **A separate `Mail` / `Delivery` collection** holding the message and the opened state: one more model, one more join, for a one-to-one relation with the copy.
- **`isOpened` backfill or `openedAt DateTime?`**: a backfill needs a script against the shared dev DB; `openedAt` would need the same `isSet` trick and adds a date nobody displays.
- **`{ isOpened: { not: false } }`**: excludes legacy documents (verified).
- **Reusing `photo:new` with an `isOpened` flag**: every page would have to filter, and an old client would show unopened photos.
- **Marking opened on « Photo suivante »**: the last photo would need « Terminer » to count, and closing on a photo already seen would keep it waiting.
- **Putting the waiting list into `usePhotoFeed` / `usePhotoLibrary`**: both are near their size limits and already carry pagination or the daily refresh; one more socket connection is cheaper than a shared socket refactor.
- **A per-friend message** in a multi-friend send: the sheet sends one photo to several people at once; one message keeps it simple.

## Server

### PR A: `feat/mail-server`

- Refactor first: `photos.service.ts` (290 lines) splits into `photos.store.ts` (the received-file steps) and `photos.share.ts` (the two shares). Bodies unchanged.
- `schema.prisma`: `message String?`, `isOpened Boolean?` (controller: `pnpm db:push`, never the seed).
- `photos.input.ts`: `MAX_MESSAGE_LENGTH = 200`, `parseMessage(unknown): string | undefined`.
- `photos.repository.ts`: `NewPhoto.message?`, `NewPhoto.isOpened`; `findPage` filters opened; `findUnopened(ownerId)`; `openOwned(id, ownerId)` (null on P2025).
- `photos.service.ts`: `listUnopened(ownerId)`, `openPhoto({ ownerId, id })` (log `photo.opened`, ids only).
- `photos.controller.ts` / `photos.routes.ts`: `GET /unopened`, `POST /:id/open`; shares emit `photo:received`.
- `types.ts`: `Photo.message`, `UnopenedPhotos`, `MESSAGE_INVALID`, `photo:received`, `photo:opened`.
- Unit tests: `photos.service.message.test.ts`, `photos.service.open.test.ts`; existing tests gain `isOpened` and `message`.
- Bruno: share `02`/`08`/`13` follow the unopened list; new `share/14-16` (`MESSAGE_INVALID`); new folders `unopened/` (seq 4) and `open/` (seq 5); `delete/` moves to seq 6.

## Client

### PR B: `feat/mail-message`

- `ShareMessageField.tsx` (label, textarea, counter); `ShareFriendsForm` holds the message; `useShareSending.sendTo(friends, message)`; `postLibraryShare` / `postDeviceShare` leave out a blank message.
- `quotedMessage()` in `photoLabel.ts`; the message in `ViewerCaption`, `PhotoCaption`, `PolaroidPrint`.

### PR C: `feat/mail-library`

- Plumbing: optional socket handlers, ordered `withNewPhoto`, `photo:opened` in the feed and the library, `photoMailApi.ts`, `usePhotoMail.ts`.
- UI: `useMailReveal.ts`, `components/mail/{mailTexts.ts, MailAnnouncementCard.tsx, MailRevealDialog.tsx, LibraryMail.tsx}`, `LibraryPage` renders `LibraryMail` first.

### PR D: `feat/mail-frame`

- `FrameNotices.tsx` (column), `WaitingPhotosBadge.tsx`, `NewPhotosBadge` loses its fixed position and leaves `SlideshowScreen`; `FrameStatus` gains `'unopened'`; `FramePage` splits into `FrameScreen` + the page (mail, reveal, notices); the share sheet's description changes.

### UI text (French, exact)

- Share sheet: « Message (facultatif) », placeholder « Un mot pour accompagner la photo », counter « N / 200 », error « Le message doit faire 200 caractères au plus. », description « Elle les attendra sur leur cadre et dans leur bibliothèque. ».
- Captions: « « [message] » » under « Envoyée par [nom] ».
- Library: « Vous avez 1 nouvelle photo » / « Vous avez N nouvelles photos », « De Mamie » / « De Mamie et Tata », « Découvrir ».
- Reveal: « Nouvelle photo 1 / 3 », « Envoyée par [nom] », the date, « Photo suivante », « Terminer », ✕ « Fermer ».
- Frame: the pill « Vous avez N nouvelles photos »; status « Des photos vous attendent. ».

## Testing

- Server unit tests (Vitest, fakes, no `vi.mock`): message trimmed and carried by the copy, not the original's; blank and `null` leave it out; 200 accepted, 201 refused before `areFriends` and before Sharp/Cloudinary; non-strings refused; length after trimming; `hasMessage` logged without the text; `isOpened: true` on an upload, `false` on both shares; `openPhoto` returns the record, logs ids only, 404 for null and for a malformed id without a database call; `listUnopened` delegates.
- Bruno: share with a message (trimmed in the response), without (`null`), too long (JSON and multipart), not text; the received photos are in the recipient's unopened list and not in their library; the unopened list (ids descending, messages, not the sender's list, 401); open (foreign 404, malformed 404, nominal then in the library and out of the list, again 200, 401). Counts: 122 requests, 266 assertions, 52 `test()` calls.
- Chrome (controller): send with a message to a second account; that account's library shows the card, « Découvrir » reveals with message, the photo joins the grid; a second tab's card disappears live; the frame shows the white pill, the reveal, then the photo in the slideshow; a new account with only received photos shows « Des photos vous attendent. ».
- Left to the author (UX walkthrough): the reveal's feel on the real frame, the white pill legibility across a room, the textarea on a phone keyboard.

## Docs

- `docs/produit/partage.md` (R-PAR-48..57; R-PAR-30, 34, 35, 36 « Remplacée »), `bibliotheque.md` (R-BIB-42; R-BIB-26 « Remplacée »), `cadre.md` (R-CAD-71..76; R-CAD-69 « Remplacée »), `a-venir.md` (« Étape 9 » emptied, then removed).
- `ARCHITECTURE.md`: photo flow, API rows, error row, `Photo` shape, real-time events, client mail paragraph, data (`message`, `isOpened`, the `isSet` trap), backend layers (`photos.share.ts`, `photos.store.ts`). `README.md`: the share paragraph.

## Delivery

Four draft PRs stacked above step 8 (`feat/settings-frame-card`): A (server), B, C, D (client), atomic commits, gates green. Rien n'est mergé: the author merges.

## Out of scope

Editing or recalling a message; a per-friend message; read receipts for the sender; email or push notifications; a list of waiting photos without revealing them; a sound on the frame; emojis or formatting in the message beyond line breaks.

## Open questions (defaults applied meanwhile)

1. **200 characters** for the message (default). Alternative: 140 (one tweet), or 500 with a « Lire la suite » in the library.
2. **Reveal oldest first** (default). Alternative: newest first, like the library.
3. **Opened when shown** (default). Alternative: opened on « Photo suivante » / « Terminer » only.
4. **An opened photo keeps its reception date** and may land below newer uploads (default). Alternative: it jumps to the top (its date would then be the opening date, changing R-PAR-34).
5. **The message stays on the frame captions** (three lines, every time the photo plays) (default). Alternative: only in the reveal and the viewer.
6. **Two « nouvelles photos » pills on the frame** (« Vous avez N nouvelles photos » in white for waiting mail, « N nouvelles photos » in accent for arrivals). Alternative: rename the arrivals pill (« N photos ajoutées ») to avoid the near-duplicate wording.
7. **Intermediate stack state**: after PR A alone, shared photos are hidden until PR C/D land (they wait unopened, with no client to open them). Acceptable because nothing is merged separately.
8. **A second Socket.IO connection** per page for the mail (default). Alternative: one shared socket per page (a larger refactor of `photoSocket.ts` and both hooks).
