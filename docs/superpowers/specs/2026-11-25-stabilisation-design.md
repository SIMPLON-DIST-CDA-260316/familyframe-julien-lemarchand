# Stabilisation (Step 16) Design

Status: decided and built without the author, per « je veux que tu livres sans m'attendre ». The author reviews afterwards. Plan: [2026-11-25-stabilisation.md](../plans/2026-11-25-stabilisation.md). Brief: [2026-11-25-steps-13-16-brief.md](2026-11-25-steps-13-16-brief.md), « Step 16 ».

## Request

From the brief: triage every Minor still open in the final reviews of steps 7 to 12 (`.superpowers/sdd/step7-minors.md`, `step8-final-review.md` to `step12-final-review.md`) and the two step 12 deviations; fix those worth it and record a decision for each; run the Chrome checks left unverified (the full step 11 checklist with 25 or more photos from test uploads, never the seed; the blocked-storage toast on « Lire sur le cadre »). No new feature.

## Decisions

| #   | Decision                                                                                                                                                                                                                                               | Why                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **One branch, `fix/stabilisation`**, on `feat/library-collections` (d58d3b8).                                                                                                                                                                          | Six small fixes, three server side and three client or docs side. Two branches would make two PRs of two or three commits each and two rebases onto steps 13 and 14. Every commit stays atomic, so a reviewer still reads them one at a time. |
| D2  | **Fix what changes behaviour or wastes work**: a real bug, a promise the product docs make and the code breaks, a query that answers nothing, missing API coverage. **Skip** style preferences, file moves and anything the reviewer already accepted. | The brief's « fix those that are worth it ». A stabilisation step that refactors would collide with steps 13 and 14.                                                                                                                          |
| D3  | **Leave the files of steps 13 and 14 alone**: navigation, viewer, upload (`AddPhotoPanel`, `UploadForm`, `useLibraryUpload`, `LibraryNotices`), `ui/*.tsx`. Items that live there are « won't fix here » and handed over by name.                      | Both steps are built in parallel from the same base; this branch is rebased on top of them.                                                                                                                                                   |
| D4  | **Each decision names a commit subject, not a SHA.**                                                                                                                                                                                                   | The rebase onto steps 13 and 14 changes every SHA.                                                                                                                                                                                            |
| D5  | **New bug found while writing the step 11 checklist, fixed** (N1 below): photos of the day were ranked by hash, so with fewer than 20 older photos a photo added in the evening could push a morning photo out of the day's lot.                       | It breaks R-CAD-85 and R-CAD-86, and the checklist's own setup (25 photos uploaded the same day) is exactly that case. Photos of the day now fill the lot in the order they joined the library.                                               |

## Triage

Decision values: **fixed** (commit subject), **already fixed** (where), **won't fix** (reason).

### `step7-minors.md` (task minors of steps 4, 5 and 7)

| Item                                                                 | Decision                                                                                                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| S4 T7 · `FriendsPage` `emptyText=""` twice                           | Already fixed: the prop no longer exists.                                                                                                   |
| S4 T7 · `useFriendships` « (step 2 lesson) » comment                 | Already fixed: the comment is gone.                                                                                                         |
| S4 T8 · `actions.error` sticky over a later success                  | Already fixed: `run` clears it first (`useFriendshipActions.ts:26`) and a friend request clears it (`useFriendsPage.ts:39`).                |
| S4 T8 · `onClick` returns an unawaited promise                       | Won't fix: `run` never rejects (the API helpers return results), and React ignores the return value.                                        |
| S5 T1 · `findOwned` untested until T2                                | Already fixed: covered by the photo share tests since step 5 T2.                                                                            |
| S5 T1 · `isPhoto` requires `senderName`                              | Won't fix: intended; the API always sends it and both ship together.                                                                        |
| S5 T2 · `findOwnedPhoto` id naming                                   | Won't fix: naming; the helper `findOwnedPhoto` (`photos.share.ts`) still wraps `repository.findOwned`.                                      |
| S5 T2 · `photo.duplicate` logged in both `saveCopy` and `saveRecord` | Won't fix: two paths (a share copy, an upload), each logs once per request.                                                                 |
| S5 T5 · `delete/folder.bru` docs wrap                                | Won't fix: style.                                                                                                                           |
| S7 T1 · `sonner.tsx` `Toaster` has no return type                    | Won't fix: shadcn file; no `ui/*.tsx` component declares one, and step 13 owns `ui/`.                                                       |
| S7 T1 · R-BIB-35 narrates history                                    | Already fixed: `bibliotheque.md:123` states the rule plainly.                                                                               |
| S7 T2 · `pointer-coarse:size-11` repeated in `dialog` and `sheet`    | Won't fix: mandated by the step 7 brief; `ui/` is step 13's.                                                                                |
| S7 T4 · `lastSeen.index` one render late on delete plus add          | Won't fix: heals on the next render; viewer code is step 13's.                                                                              |
| S7 T4 · `dismiss` drops other search params and state                | Already fixed: step 12's `withPhotoParam` edits a copy of the params, so `?collection=` stays; dropping the state on a replace is intended. |
| S7 T4 · StrictMode double `loadMore` on one cursor                   | Won't fix: development only; production mounts once.                                                                                        |
| S7 T5 · `FIRST_LOAD_COUNT` repeats the server's `DEFAULT_PAGE_SIZE`  | Won't fix: client and server share no code; the comment names the server constant.                                                          |
| S7 T5 · Dense hook                                                   | Won't fix: style; `usePhotoLibrary.ts` has since been split into helpers.                                                                   |
| S7 T6 · R-BIB-39 in the « Voir » section                             | Won't fix: placement preference.                                                                                                            |
| S7 T6 · `onOpenChange={viewer.close}` receives a boolean             | Won't fix: `close` takes no parameter and the dialog is always open, so it only fires on close; viewer code is step 13's.                   |
| S7 T6 · `startIndex` frozen at mount                                 | Won't fix: the viewer mounts on each open (conditional render), by design.                                                                  |
| S7 T7 · `?photo=` with an unknown id starts on the newest            | Won't fix: intended.                                                                                                                        |
| S7 T9 · Session lost mid-batch drops the toasts of earlier sends     | Won't fix: the person is sent to the login page; rare.                                                                                      |
| S7 T9 · `ShareTarget` duplicated until `useFriendShares` goes        | Already fixed: `useFriendShares` was deleted (step 7 T10).                                                                                  |
| S7 T9 · `failures.join(' ')` assumes a trailing period               | Won't fix: every message is a full sentence (`ERROR_MESSAGES`, « … a déjà cette photo. »).                                                  |

### Step 8 final review

| Item                                                                     | Decision                                                                                            |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| I1 · Escape on an open menu in full screen leaves the frame              | Already fixed: `fix(client): keep the frame when Escape closes a menu in full screen` (e68140f).    |
| M1 · Back to « Aléatoire » resumes the old round                         | **Fixed**: `fix(client): mix anew when the frame goes back to shuffled playback`. R-CAD-64 amended. |
| M2 · StrictMode could exit a granted full screen (dev only)              | Won't fix: development only, unproven; stays in the author's UX walkthrough.                        |
| M3 · Leaving before the full-screen grant leaves the library full screen | Won't fix: rare; the reviewer advises against the coupling a fix needs.                             |
| M4 · R-CAD-69 wording                                                    | Already fixed: R-CAD-69 is « Remplacée » by R-CAD-71 (step 9).                                      |
| M5 · « Préférences » bullet between two settings                         | Already fixed: `docs: list the Préférences card after every frame setting` (f5cde18).               |
| M6 · R-PRF-04 changed in place                                           | Won't fix: the sentence only narrows the scope; accepted as a precision.                            |
| M7 · ARCHITECTURE « ne touche pas à l'historique »                       | Already fixed: `ARCHITECTURE.md:56` says the link adds an ordinary entry.                           |
| M8 · Toggle group arrows move focus without choosing                     | Won't fix: Radix behaviour; Enter and Space choose.                                                 |
| M9 · `frameSettingOptions.ts` shared across folders                      | Won't fix: a file move only.                                                                        |
| M10 · Mixed destructuring in the option components                       | Won't fix: style.                                                                                   |
| M11 · `bibliotheque.md` « Mode cadre » without full screen               | Already fixed: `bibliotheque.md:64` says « en plein écran » (50148b3).                              |
| M12 · `shuffleOrder.ts` has no unit test                                 | Won't fix: needs a client test runner, a tooling decision for the author, not a stabilisation fix.  |
| Per-task minors (T1 to T7)                                               | Won't fix: all accepted by the reviewer; none still open as a bug.                                  |

### Step 9 final review

| Item                                                                     | Decision                                                                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| I1 · A waiting photo blocks the same file with a wrong message           | Already fixed: `fix(client): say a duplicate photo may be waiting to be discovered` (ba4713f).                            |
| I2 · A long word overflows in the reveal                                 | Already fixed: `fix(client): wrap long words in the revealed message` (70943d2).                                          |
| B1 · R-PAR-48 counter wording                                            | Already fixed: `docs: say what the message counter shows` (d84bab3).                                                      |
| M1 · ARCHITECTURE « ajoute `photo:new` en tête »                         | Already fixed: `ARCHITECTURE.md:191` says both events are inserted by id.                                                 |
| M2 · « En attente… » before « Des photos vous attendent. »               | Won't fix: a flash on a new frame; a failed mail load heals on the next reconnect.                                        |
| M3 · Closing the reveal always shows the newest                          | Won't fix: what R-CAD-74 says.                                                                                            |
| M4 · ShareSheet wording between PRs A and C                              | Won't fix: obsolete, the stack merged together.                                                                           |
| M5, M6 · Write-ups for the PR A description                              | Won't fix: obsolete, merged.                                                                                              |
| A2, A3 · No test of the opened filter on an old photo, nor of the events | Won't fix: the Chrome pass on old data covered the filter; events are thin controller code.                               |
| A5 · `shareFromLibrary` at 30 lines                                      | Won't fix: within the limit.                                                                                              |
| B3, B4 · Counter read-out and colour at the limit                        | Won't fix: comfort, closer to a feature.                                                                                  |
| B5, B6 · Repeated `trim`, place of `MAX_MESSAGE_LENGTH`                  | Won't fix: style.                                                                                                         |
| C1 · An old photo opened late lands at the end of the loaded pages       | Won't fix: documented limit (ARCHITECTURE).                                                                               |
| C2, D4 · Focus on `body` after closing the reveal                        | Won't fix: the banner that opened it leaves once every photo is opened, so there is no stable target; a later focus pass. |
| C3 · `aria-live` on the reveal counter                                   | Won't fix: the counter is the dialog title; out of a stabilisation scope.                                                 |
| C4 · No sign when opening fails                                          | Won't fix: the spec's choice.                                                                                             |
| C6, D2 · Two forms of `addPhoto`, `LucideIcon` type                      | Won't fix: style.                                                                                                         |
| D3 · Race between `showNewest()` and a late `photo:opened`               | Won't fix: harmless, the frame shows the newest either way.                                                               |

### Step 10 final review

| Item                                                         | Decision                                                                                                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1 · Client behaviour only proven by Chrome                  | Won't fix here: a process item of step 10, no code.                                                                                                                       |
| M1 · Spec says `equals` never ran on a database              | Won't fix: obsolete (PR body).                                                                                                                                            |
| M2 · A write does not invalidate a `GET` in flight           | Won't fix: the `collections:changed` that follows every write starts a newer load, so the list heals at once.                                                             |
| M3 · An empty collection still queries the photos            | **Fixed**: `fix(server): skip the live photos query when no collection holds a photo`, with a unit test.                                                                  |
| M4 · R-COL-04 promises the photo is in the new collection    | **Fixed**: `docs(produit): say a collection made from a deleted photo stays empty`.                                                                                       |
| M5 · `useAddToNewCollection` typed `=> void`                 | Won't fix: the promise never rejects (`addPhoto` returns a result), and retyping runs through `CollectionNameDialog.onSaved` and `PhotoActionsMenu`, where step 13 works. |
| M6 · A no-op add or remove still emits `collections:changed` | Won't fix: harmless, one extra reload.                                                                                                                                    |
| Open questions 1 to 10                                       | Won't fix: the reviewer keeps every default.                                                                                                                              |

### Step 11 final review

| Item                                                             | Decision                                                                                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I-1 · Received yesterday, opened today, changes the lot          | Already fixed: `feat(server): count a received photo in the day of its opening` (835cab1).                                                                               |
| M-1 · Radio tail redrawn on reload                               | Already fixed: `feat(server): keep a radio's random tail for the day` (71b384e).                                                                                         |
| M-2 · The radio never retries after a failure                    | Won't fix: a retry needs a socket or a timer in `useRadioSelection`, behaviour no rule promises; R-CAD-97 says the library plays.                                        |
| M-3 · `en-CA` as a date format                                   | Already fixed: `refactor(server): build the Paris day from its date parts` (6c751ec).                                                                                    |
| M-4 · Comparator never returns 0                                 | Already fixed: `localeCompare` in `idsInDrawOrder`.                                                                                                                      |
| M-5 · False « nouvelle photo » after a daily reload              | Won't fix: accepted by the reviewer.                                                                                                                                     |
| M-6 · Upload date as « dates proches »                           | Won't fix: inherent (EXIF stripped); for the reflective analysis.                                                                                                        |
| **N1 · New**: a photo of the day can push another out of the lot | **Fixed**: `fix(server): keep the day's lot when a photo arrives after others that day`, with a unit test that failed before. R-CAD-86 and ARCHITECTURE amended. See D5. |
| Open questions 1 to 12                                           | Won't fix: the reviewer keeps every default (question 3 became I-1, fixed).                                                                                              |

### Step 12 final review and deviations

| Item                                                                    | Decision                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1 · Focus after deleting the shown collection                          | Already fixed: 5f60b59 and d58d3b8 (focus « Toutes »).                                                                                                                                                                                                                 |
| M1 · Header count over an unavailable collection                        | Already fixed: `fix(client): hide the header count over an unavailable collection` (81aa81c).                                                                                                                                                                          |
| M2 · A missing collection logs « Unexpected photos payload »            | Already fixed: `fix(client): treat a refused photos load as a plain failure` (5ef4fa0); see deviations (a) and (b).                                                                                                                                                    |
| M3 · « Ajouter » on an unavailable collection gives two toasts          | Won't fix: both toasts are true (added to the library, not filed) and R-COL-21 says so; `useLibraryUpload` is step 14's.                                                                                                                                               |
| M4 · A stale load lands between commit and cleanup                      | Won't fix: a window of one passive-effect delay that heals on the next answer; guarding `setIsLoadingMore(false)` with the stale check would leave the flag stuck after a reconnect.                                                                                   |
| M5 · Focus lost after « Envoyer à un ami » and after the first upload   | Won't fix here: `AddPhotoPanel` and `LibraryNotices` are reworked by step 14 (multi-upload). **Handed over** to step 14.                                                                                                                                               |
| M6 · Re-picking the same file does nothing; cancel clears it            | Won't fix here: `UploadForm` is rewritten by step 14. **Handed over** to step 14 (reset `input.value` after reading, ignore an empty `files`).                                                                                                                         |
| M7 · No Bruno case for a repeated `collectionId`                        | **Fixed**: `test(server): run a repeated collectionId against the API in Bruno` (`photos/list/14`).                                                                                                                                                                    |
| M8 · Each chip tap reconnects the library socket                        | Won't fix: the trade-off the spec chose.                                                                                                                                                                                                                               |
| Open question 2 · Leaving the frame drops `?collection=`                | Won't fix: carrying the params through the frame is new behaviour; Back still lands on the collection.                                                                                                                                                                 |
| Deviation (a) · A missing collection is fetched again on each reconnect | Won't fix: one silent `404` per reconnect or `collections:changed`, and only while a dead link stays open. Skipping it needs a third « no load » state through `usePhotoLibrary`, and a `failed` list must keep loading so the page recovers when the list comes back. |
| Deviation (b) · A `500` on the photos fetch is no longer logged         | **Fixed**: `fix(client): log a photos load the API refused for a reason other than 404`. Only the `404` stays silent.                                                                                                                                                  |

## Chrome checklists (controller)

### Getting 25 or more photos without the seed

Use a **fresh account** so the expected results are exact: as the admin, `/admin/invitations` → invite a new address → open the link in another browser profile and create « Test S16 ». Then, from « Amis », make it friends with the member account (« B » below). Every photo below is uploaded today, so the day's lot is the first 20 uploaded (N1), not a random draw: the random part of the draw stays covered by the unit tests.

1. Logged in as Test S16 on the dev client, open DevTools → Console and paste:

   ```js
   async function makePhoto(label, index) {
     const canvas = document.createElement('canvas')
     canvas.width = 800
     canvas.height = 600
     const context = canvas.getContext('2d')
     context.fillStyle = `hsl(${(index * 137) % 360} 70% 45%)`
     context.fillRect(0, 0, 800, 600)
     context.fillStyle = 'white'
     context.font = 'bold 200px sans-serif'
     context.fillText(`${label}${index}`, 80, 380)
     return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
   }
   async function uploadPhotos(label, count) {
     for (let index = 1; index <= count; index++) {
       const body = new FormData()
       body.append('photo', await makePhoto(label, index), `${label}${index}.jpg`)
       const res = await fetch('/api/photos', { method: 'POST', body })
       console.log(`${label}${index}`, res.status)
     }
   }
   await uploadPhotos('T', 25)
   ```

   Expect 25 lines `T1 201` … `T25 201`. Each image draws its own label, so no `PHOTO_DUPLICATE`. One at a time on purpose: each upload goes to Cloudinary.
2. In B's browser, paste `makePhoto` again, then:

   ```js
   const { friends } = await (await fetch('/api/friendships')).json()
   const friendId = friends.find(({ user }) => user.displayName === 'Test S16').user.id
   for (let index = 1; index <= 5; index++) {
     const body = new FormData()
     body.append('photo', await makePhoto('R', index), `R${index}.jpg`)
     body.append('friendId', friendId)
     console.log(`R${index}`, (await fetch('/api/photos/share', { method: 'POST', body })).status)
   }
   ```

   Expect `R1 201` … `R5 201`. Back as Test S16, « Découvrir » the 5 photos (they wait until opened).
3. As Test S16: create the collection « Radio test » and file T1 to T5 in it (« … » → « Collections »).
4. Cleanup at the end, in Test S16's browser only (it deletes every photo of the logged-in account; B's library never changed, a share copies the photo to the friend):

   ```js
   const { photos } = await (await fetch('/api/photos?limit=100')).json()
   for (const { id } of photos) await fetch(`/api/photos/${id}`, { method: 'DELETE' })
   ```

   Then delete « Radio test » from its « … » menu.

### Step 11 checklist (daily selection and radio)

Day's selection, as Test S16 (30 photos: T1 to T25, R1 to R5):

1. Frame → « … » → « Photos »: the order is « Toute la bibliothèque », « Sélection du jour », then « Radio test ». Pick « Sélection du jour »: after a short loading screen the frame restarts on T20 and the strip shows 20 photos, T20 down to T1 (R1 to R5 joined later, when opened, so they are out).
2. Reload: the same 20. Open `/frame` in a second tab: the same 20.
3. Préférences → « Cadre de cet appareil » → « Photos » shows « Sélection du jour » checked. Switch it to the library there and back: the frame follows.
4. From another tab, delete T5: within seconds it leaves the strip and T21 takes its place (still 20).
5. From another tab, run `await uploadPhotos('X', 1)` (after pasting `makePhoto` and `uploadPhotos`): the lot does not change, X1 is not in it. **This step failed before N1's fix** whenever X1's hash ranked it before a T photo.
6. « Lecture » = « Aléatoire »: the 20 play shuffled, no repeat before the round ends. Switch to « Dans l'ordre », then back to « Aléatoire »: a new mix starts from the photo on screen (R-CAD-64, step 8 M1 fix).
7. DevTools → Network → right-click `daily` → « Block request URL », reload: the whole library plays silently and « Sélection du jour » stays checked. Remove the block, then Network → throttling « Offline », then back to « No throttling »: on the socket reconnect the frame switches to the lot (otherwise within 15 minutes). If « Offline » does not cut the open WebSocket, restart the dev API instead to force the reconnect.
8. Network → WS: exactly one more `socket.io` connection while the daily plays, closed when switching to the library; one `daily` call per photo event (steps 4 and 5) or reconnect, no loop.

Radio, as Test S16 (every photo arrived within 7 days, so each has at least the date link):

9. Library → « … » on R3 → « Lancer la radio »: full screen on R3, URL `/frame?radio=<id>`, then R2 and R4 in either order, then R1 and R5 (same sender and same week, 2 links, closest in time first), then the photos with the date link only, closest in time to R3 first (T25 down to T1, X1 placed by its own time gap, usually after T25). 30 photos in all, start included.
10. « … » → « Photos »: « Radio » first and checked. Pick « Toute la bibliothèque »: the URL loses `radio`, the library plays and the choice is stored. Re-picking « Radio » while it plays does nothing.
11. From the slideshow on T3, « Lancer la radio »: it restarts on T3, then T2 and T4 in either order, then T1 (T5 was deleted in step 4), all in « Radio test » (2 links), then the rest, closest in time first.
12. Leave the frame (Escape, or exit full screen): the viewer opens on the photo shown; one Back returns to the library (not the frame, not two viewers).
13. Viewer (`/?photo=<id>`) → « … » → « Lancer la radio », then leave the frame: one viewer, then Back → library.
14. Reload `/frame?radio=<id>`: the same suite, start photo first (R-CAD-94, same day).
15. Open `/frame?radio=000000000000000000000000` and `/frame?radio=abc`: the whole library plays, no error, « Radio » checked.
16. During a radio, add a photo from another tab (`uploadPhotos('Y', 1)`): it does not join. Delete a photo of the radio: it leaves.
17. Leave and reopen the frame from the library: it plays the stored choice, not the radio.
18. Across 1 to 17, the console shows no React warning (state update on an unmounted component, keys) and no « Photos load refused by the API ».

### Blocked-storage toast on « Lire sur le cadre »

1. Library → chip « Radio test » (URL `/?collection=<id>`).
2. DevTools → Console:

   ```js
   const realSetItem = Storage.prototype.setItem
   Storage.prototype.setItem = function () {
     throw new DOMException('Blocked for the test', 'SecurityError')
   }
   ```

   This is what a browser that blocks site data does on a write. Reads still work, so the page keeps its current settings.
3. « … » next to « Radio test » → « Lire sur le cadre »: an error toast (octagon icon, neutral colours) « Cet appareil ne peut pas retenir ce choix. Choisissez la collection depuis le menu « … » du cadre. »; the URL stays `/?collection=<id>`, no full screen, no frame (R-COL-14).
4. `localStorage.getItem('familyframe.frame-settings')` still shows the previous `source`.
5. Restore with `Storage.prototype.setItem = realSetItem` (or reload the page), then « Lire sur le cadre » again: the frame opens full screen on « Radio test ».
6. Optional, a real block instead of the override: Chrome Settings → Privacy and security → Site settings → Additional content settings → On-device site data → « Not allowed to save data on your device » → add the dev client's address (`http://localhost:5180`), then reload. Reads throw too in that mode: the frame settings fall back to their defaults, and step 3 gives the same toast. Remove the entry afterwards.

## Rejected

- **Two branches** (D1).
- **Skipping the fetch for a missing collection** (deviation a): a third filter state for one cheap 404.
- **Fixing the step 12 upload and focus minors here** (M5, M6): they sit in files step 14 rewrites.
- **A Bruno case for N1**: it needs more than 20 photos uploaded in one run against the shared dev database; the unit test pins the rule.

## Open questions (default applied)

1. **Photos of the day fill the lot in joining order, not at random** (N1). Default: joining order, the only order a later photo cannot jump. It only matters on a day where the account has fewer than 20 older photos.
2. **Radio retry** (step 11 M-2). Default: none, as R-CAD-97 says. A retry on reconnect would be a small later change.

## Product docs

`cadre.md`: R-CAD-64 (a new mix when « Aléatoire » is picked again) and R-CAD-86 (photos of the day take the room left in the order they were added or discovered), both amended in place. `collections.md`: R-COL-04 (a collection made from a deleted photo stays empty). `ARCHITECTURE.md`: the shuffle and the day's draw paragraphs.
