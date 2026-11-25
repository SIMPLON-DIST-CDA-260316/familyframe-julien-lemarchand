# Step 4: friends

- Date: 2026-11-24
- Scope: step 4 of `2026-11-23-accounts-sharing-overview.md`. The `Friendship` model, friend requests by exact email, accept, refuse, cancel and remove, the `areFriends` check step 5 needs, the `/friends` page.
- AI usage: designed by the AI from the author's fixed requirements while the author was away; every choice left open is recorded in the Decisions table with its reason. To be validated by the author (see Open questions).
- Builds on: `2026-11-24-admin-invitations-design.md` (`currentUser`, `EMAIL_INVALID`, repository returning `null` on P2002/P2025, Bruno `adminCookie`), `2026-11-24-personal-library-design.md` (`OBJECT_ID_PATTERN`, `deleteOwned` with extra filters next to `id`), `2026-11-23-server-logging-design.md` (event names, no PII).

## Goal

A member types the exact email of another account on `/friends` and sends a friend request. The other account sees it under « Demandes reçues » and accepts or refuses it. Once accepted, the friendship is mutual and either side can remove it. Step 5 sends photos only between friends: this step gives it `areFriends(userId, otherUserId)`. The admin is a member like any other here.

## Decisions

| Topic                     | Decision                                                                                                                                                                                | Main reason                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model                     | one `Friendship` document per pair: `requesterId`, `addresseeId`, `status` (`pending` \| `accepted`), `pairKey`, `createdAt`                                                            | the overview's model; one row carries the request and then the friendship, no second collection                                                           |
| Duplicates both ways      | `pairKey` = the two user ids sorted and joined by `:`, `@unique`; computed by the repository on create and on lookup                                                                    | MongoDB has no "unique in either order" index; a sorted key makes the index itself refuse A→B next to B→A, concurrent requests included                   |
| Refused request           | the row is deleted; the requester's outgoing request disappears, he may ask again later                                                                                                 | no third status to explain; a family app needs no block list                                                                                              |
| Refuse, cancel, remove    | one route, `DELETE /api/friendships/:id`, allowed to either side: the addressee of a pending request refuses it, its requester cancels it, either friend removes an accepted friendship | the three are the same write, "this link stops existing"; the log tells them apart                                                                        |
| Accept                    | `POST /api/friendships/:id/accept`, addressee only, pending only; one `update` filtered on `{ id, addresseeId, status: 'pending' }`                                                     | one atomic query, no read-then-write race; the requester cannot accept his own request                                                                    |
| Unknown email             | `404 USER_NOT_FOUND`                                                                                                                                                                    | the sender learns he must ask the admin for an invitation; only logged-in members, all invited by the admin, can probe, and only by guessing exact emails |
| Own email                 | `400 SELF_FRIEND`                                                                                                                                                                       | a request to oneself is a wrong input, not a conflict                                                                                                     |
| Existing pair             | accepted → `409 ALREADY_FRIENDS`; pending in either direction → `409 FRIEND_REQUEST_EXISTS`; a P2002 on create (concurrent request) → `409 FRIEND_REQUEST_EXISTS`                       | the reverse pending request is already on the sender's page with « Accepter »: the message points to it                                                   |
| Not found or not yours    | `404 FRIENDSHIP_NOT_FOUND` for accept and delete: unknown id, id that is not an ObjectId (no query), someone else's friendship, already accepted (accept), already deleted              | one resource, one not-found code, like `PHOTO_NOT_FOUND`; no existence leak                                                                               |
| `NOT_FRIENDS`             | introduced in step 5, with the sharing route that throws it                                                                                                                             | an error code lives with the code that throws it; step 4 has no route that sends anything                                                                 |
| `areFriends`              | `areFriends(userId, otherUserId): Promise<boolean>` on the friendships service: the pair's row exists and is `accepted`                                                                 | step 5 receives it as a dependency, the friendship rule stays in one place                                                                                |
| Admin                     | same routes as a member, behind `requireAuth` only                                                                                                                                      | the overview: admin = member + invitations                                                                                                                |
| Friend as seen by the API | `FriendUser = { id, displayName, email }`, never `role` or the password hash; the repository selects only these three fields                                                            | the email tells two « Mamie » apart and the requester typed it anyway; `id` is what step 5 sends to                                                       |
| Listing                   | `GET /api/friendships` → `{ friends, incoming, outgoing }`, each item `{ id, user, createdAt }` (`id` is the friendship's, `user` the other side), newest first, no pagination          | one query and one call fill the whole page; a family is small                                                                                             |
| Email                     | `parseEmail` moves from the invitations service to `lib/email.ts`, shared by both features                                                                                              | the same rule by definition: the address an account logs in with                                                                                          |
| Real time                 | none: the page loads the list on mount and after each action                                                                                                                            | requests are rare, the page is visited on purpose; Socket.IO events would add an event type, a client listener and `io` in a fourth controller            |
| Remove confirmation       | « Retirer » asks for confirmation (`AlertDialog`); « Refuser » and « Annuler » do not                                                                                                   | removing stops sharing between two people; a refused or cancelled request can be sent again                                                               |
| JSON body                 | `express.json()` on the friendships router                                                                                                                                              | the logging spec's rule: a JSON route brings its own parser                                                                                               |

Rejected: `@@unique([requesterId, addresseeId])` plus a lookup in both directions (the overview's sketch: two concurrent opposite requests both pass the lookup and create two rows), a `refused` status (a third state for nothing the app shows), separate `/refuse` and `/cancel` routes (three routes for one delete), auto-accepting a reverse request on send (a second write path and two response shapes for a rare case), answering an unknown email like a success (the sender would wait for a request that does not exist), `403` for someone else's friendship (tells it exists), Socket.IO notifications (see above).

## Deviation from the overview

The overview sketched `@@unique([requesterId, addresseeId])`. It only refuses a second A→B, not B→A, and MongoDB cannot index "either order". `pairKey @unique` replaces it: the database guarantees one row per pair, so the service needs no race note.

## Server

### Data

```prisma
enum FriendshipStatus {
  pending
  accepted
}

model User {
  // fields unchanged
  sentFriendRequests     Friendship[] @relation("FriendshipRequester")
  receivedFriendRequests Friendship[] @relation("FriendshipAddressee")
}

model Friendship {
  id          String           @id @default(auto()) @map("_id") @db.ObjectId
  requesterId String           @db.ObjectId
  requester   User             @relation("FriendshipRequester", fields: [requesterId], references: [id])
  addresseeId String           @db.ObjectId
  addressee   User             @relation("FriendshipAddressee", fields: [addresseeId], references: [id])
  // Both ids sorted: the unique index then refuses a pair in either order.
  pairKey     String           @unique
  status      FriendshipStatus @default(pending)
  createdAt   DateTime         @default(now())

  @@index([requesterId])
  @@index([addresseeId])
}
```

Two relations to `User` need names (Prisma rule). `status` is a Prisma enum like `Role`, generated as a string union. `pnpm db:push` adds the collection; no existing data is affected.

### Repository (`features/friendships/friendships.repository.ts`)

`pairKeyOf(userId, otherUserId)` (not exported): `[userId, otherUserId].sort().join(':')`. Every query that returns a friendship includes `requester` and `addressee` with `select: { id: true, email: true, displayName: true }` (`FriendshipRecord`): the password hash never leaves the repository.

- `findUserIdByEmail(email): Promise<string | null>`: `prisma.user.findUnique({ where: { email }, select: { id: true } })`.
- `findBetween(userId, otherUserId)`: `findUnique({ where: { pairKey } })`, `null` when absent.
- `create({ requesterId, addresseeId })`: writes `pairKey` and `status: 'pending'`; `null` on P2002.
- `findAllOf(userId)`: `where: { OR: [{ requesterId: userId }, { addresseeId: userId }] }`, `orderBy: { id: 'desc' }`.
- `acceptReceived(id, addresseeId)`: `update({ where: { id, addresseeId, status: 'pending' }, data: { status: 'accepted' } })`; `null` on P2025.
- `deleteOf(id, userId)`: `delete({ where: { id, OR: [{ requesterId: userId }, { addresseeId: userId }] } })`; `null` on P2025. Returns the deleted record so the service can name what happened.

Prisma 6 accepts non-unique filters, `OR` included, next to `id` in `update` and `delete` (as `photos.deleteOwned`).

### Service (`friendships.service.ts`)

`createFriendshipsService(deps)` with deps `repository`, `logger`. `toFriendship(record, userId)`: `{ id, user, createdAt }` where `user` is whichever of `requester`/`addressee` is not `userId`; `createdAt` as ISO string.

- `requestFriendship({ email, requesterId })`, `email` as `unknown`:
  1. `parseEmail` (`lib/email.ts`) → `EMAIL_INVALID`;
  2. `findUserIdByEmail` → `null` means `USER_NOT_FOUND`;
  3. same id as `requesterId` → `SELF_FRIEND`;
  4. `findBetween`: `accepted` → `ALREADY_FRIENDS`, `pending` → `FRIEND_REQUEST_EXISTS`;
  5. `create` → `null` means `FRIEND_REQUEST_EXISTS`;
  6. logs `friendship.requested` (`friendshipId`, `userId` = requester); returns `toFriendship`.
  - Refusals in steps 2 to 5 log `friendship.request_failed` (warn) with `reason` (`user_not_found`, `self`, `already_friends`, `request_exists`) and `userId`. Never the email.
- `listFriendships(userId)`: `findAllOf`, split into `friends` (`accepted`), `incoming` (`pending`, addressee = `userId`), `outgoing` (`pending`, requester = `userId`), each mapped by `toFriendship`.
- `acceptFriendship({ id, userId })`, `id` as `string`: not matching `OBJECT_ID_PATTERN` → `FRIENDSHIP_NOT_FOUND` without a query (duplicated from photos: two lines, see "prefer duplication"); `acceptReceived` → `null` means `FRIENDSHIP_NOT_FOUND`; logs `friendship.accepted` (`friendshipId`, `userId`); returns `toFriendship`.
- `deleteFriendship({ id, userId })`: same id check; `deleteOf` → `null` means `FRIENDSHIP_NOT_FOUND`; logs `friendship.deleted` (`friendshipId`, `userId`, `reason`: `removed` when it was `accepted`, else `cancelled` when `userId` is the requester, else `refused`).
- `areFriends(userId, otherUserId)`: `(await findBetween(…))?.status === 'accepted'`.

### Controller, routes

- `request`: `service.requestFriendship({ email: req.body?.email, requesterId: currentUser(req).id })` → `201 { friendship }`.
- `list`: `200 { friends, incoming, outgoing }`.
- `accept`: `service.acceptFriendship({ id: req.params.id, userId })` → `200 { friendship }`.
- `remove`: `service.deleteFriendship(…)` → `204`.
- `createFriendshipsRouter(controller)`: `express.json()`, `GET /`, `POST /`, `POST /:id/accept`, `DELETE /:id`.
- `app.ts`: `app.use('/api/friendships', requireAuth, assembleFriendshipsRouter())`, as photos (no public route). The service built there is the one step 5 hands `areFriends` from.

### Types and errors

- `types.ts`: `FriendUser = { id, displayName, email }`; `Friendship = { id, user: FriendUser, createdAt }`; `FriendshipList = { friends, incoming, outgoing }` (three `Friendship[]`).
- New codes in `error-handler.ts`:

| Case                                                                               | Status | `error`                 |
| ---------------------------------------------------------------------------------- | ------ | ----------------------- |
| no account uses that email                                                         | 404    | `USER_NOT_FOUND`        |
| the email is the caller's own                                                      | 400    | `SELF_FRIEND`           |
| the two accounts are already friends                                               | 409    | `ALREADY_FRIENDS`       |
| a request is pending between the two, in either direction                          | 409    | `FRIEND_REQUEST_EXISTS` |
| unknown or malformed id, someone else's, already accepted (accept) or already gone | 404    | `FRIENDSHIP_NOT_FOUND`  |

`EMAIL_INVALID` and `BODY_INVALID` are reused.

### Seed

`prisma.friendship.deleteMany()` before `prisma.user.deleteMany()` (the emulated-relations comment gains friendships). No friendship is seeded.

## Client

### Shared code

- `api.ts`: the five codes synced, with messages:
  - `USER_NOT_FOUND`: « Aucun compte n'utilise cette adresse e-mail. Demandez à l'administrateur d'inviter cette personne. »
  - `SELF_FRIEND`: « Vous ne pouvez pas vous ajouter vous-même. »
  - `ALREADY_FRIENDS`: « Vous êtes déjà amis. »
  - `FRIEND_REQUEST_EXISTS`: « Une demande est déjà en attente avec cette personne. Si elle vous l'a envoyée, acceptez-la ci-dessous. »
  - `FRIENDSHIP_NOT_FOUND`: « Cette demande ou cette amitié n'existe plus. »
- `friendship.ts` (new): the `FriendUser`, `Friendship`, `FriendshipList` copies and their guards.
- `friendshipsApi.ts` (new): `fetchFriendships`, `postFriendRequest(email)`, `postAcceptFriendship(id)`, `deleteFriendship(id)`, each taking `onUnauthenticated`, results as `{ isSuccess: true, … } | { isSuccess: false, message }` like `invitationsApi.ts`.
- `hooks/useFriendships.ts`: `{ friendships, isLoading, error, reload }`, the `latestLoadId` guard of `useInvitations`.
- `BackToLibraryLink` moves from `components/admin/` to `components/library/` (no longer admin-only).

### Friends page (`/friends`)

- Route inside the `RequireAuth` layout. `pages/FriendsPage.tsx`, `components/friends/FriendRequestForm.tsx`, `components/friends/FriendshipRow.tsx` (name, email, action buttons passed as children), `components/friends/RemoveFriendDialog.tsx`.
- A `max-w-md` column, as `/admin/invitations`:
  - card « Amis » with « Retour à la bibliothèque », « Ajoutez un proche avec l'adresse e-mail de son compte FamilyFrame. », an email field and « Envoyer la demande » (« Envoi… »); on success the field empties and the list reloads; errors under the field (`errorMessage`);
  - « Demandes reçues », shown when not empty: « Accepter » and « Refuser » per row;
  - « Demandes envoyées », shown when not empty: « Annuler » per row;
  - « Mes amis », always: « Retirer » opens « Retirer X de vos amis ? » / « Vous ne pourrez plus vous envoyer de photos. Chacun pourra refaire une demande. » (« Annuler », « Retirer »). Empty: « Vous n'avez pas encore d'amis. »
- A row's buttons are disabled while its request runs. After any action, success or failure, the list reloads; a failure shows its message above the lists (`FRIENDSHIP_NOT_FOUND` when the other side acted first).
- On the library page, `LibraryActions` gains an « Amis » ghost link (`UsersIcon`) for every account, before « Invitations ».

## Testing

- Unit `friendships.service.test.ts` (request and list, `vi.fn()` fakes):
  - request nominal: email trimmed and lowercased, `create` gets both ids, the result's `user` is the addressee, no role or hash;
  - `EMAIL_INVALID` (number, `'pas-un-email'`), `USER_NOT_FOUND`, `SELF_FRIEND`, `ALREADY_FRIENDS`, `FRIEND_REQUEST_EXISTS` for a pending pair in each direction and for `create` returning `null`; nothing created in each case;
  - `friendship.requested` and `friendship.request_failed` carry ids and `reason` only (no logged value contains the email);
  - list: one accepted, one incoming, one outgoing record land in the right array, each with the other side as `user`.
- Unit `friendships.service.respond.test.ts` (accept, delete, `areFriends`):
  - accept: `'pas-un-id'` → `FRIENDSHIP_NOT_FOUND` without a query; `acceptReceived` gets the id and the caller as addressee; `null` → `FRIENDSHIP_NOT_FOUND`; nominal returns the requester as `user` and logs `friendship.accepted`;
  - delete: malformed id without a query; `null` → `FRIENDSHIP_NOT_FOUND`; `reason` is `removed`, `cancelled` or `refused` according to status and caller;
  - `areFriends`: `true` for accepted, `false` for pending and for no row.
- Unit `error-handler.test.ts`: one case per new code (404, 400, 409, 409, 404).
- Bruno, new folder `friendships/` (`seq: 3`, after `invitations/`). The member is the collection's default cookie and always the requester; admin requests set `adminCookie` in a pre-request script (fail fast when absent). `invitations/accept/05` now also stores the new account's cookie in `inviteeCookie`: the third party. Repeatable runs: `create/01`'s pre-request lists the member's friendships (axios) and deletes any with the admin, left by an interrupted run; the folder ends with no friendship.
  - `create/` (seq 1): `01-nominal` ` ADMIN@…` → 201, `user.email` = `adminEmail`, `user.displayName` `Admin`, no `role` or `passwordHash`, id stored in `friendshipId`; `02-edge-demande-existante` → 409 `FRIEND_REQUEST_EXISTS`; `03-edge-demande-inverse` (admin → member) → 409 `FRIEND_REQUEST_EXISTS`; `04-edge-soi-meme` → 400 `SELF_FRIEND`; `05-edge-compte-inconnu` → 404 `USER_NOT_FOUND`; `06-edge-email-invalide` → 400 `EMAIL_INVALID`; `07-edge-sans-cookie` → 401; `08-edge-json-malforme` → 400 `BODY_INVALID`.
  - `list/` (seq 2): `01-nominal-membre` `friendshipId` in `outgoing` only; `02-nominal-admin` in `incoming` only, `user.email` = `memberEmail`; `03-edge-sans-cookie` → 401.
  - `accept/` (seq 3): `01-edge-demandeur` (member) → 404 `FRIENDSHIP_NOT_FOUND`; `02-edge-id-invalide` → 404; `03-nominal` (admin) → 200, `user.email` = `memberEmail`, its script checks the member's `friends`; `04-edge-deja-acceptee` → 404; `05-edge-deja-amis` (member sends again) → 409 `ALREADY_FRIENDS`; `06-edge-sans-cookie` → 401.
  - `delete/` (seq 4): `01-edge-tiers` (`inviteeCookie`) → 404; `02-nominal-retrait` (member deletes `friendshipId`) → 204, its script checks that none of the admin's three lists has it (a removal after C, a cancel in B: same request, so the folder works in both PRs); `03-edge-deja-retiree` → 404; `04-nominal-refus` (pre-request: member sends a new request via axios; admin deletes) → 204; `05-nominal-annulation` (same, the member deletes) → 204; `06-edge-sans-cookie` → 401.
- Manual: as the member on `/friends`, send to the admin's email; log in as the admin in a private window, reload `/friends`, accept; both see each other under « Mes amis »; remove from one side with the dialog, the other side loses it after a reload; send again and refuse, then send and cancel; an unknown email and one's own email show their messages; a request towards someone who already asked shows the « acceptez-la ci-dessous » message.

## Docs

- README: how to add a friend (`/friends`, exact email of an existing account); service table gains « Amis » (`/friends`).
- ARCHITECTURE: Pages (`/friends`, the SPA fallback lists gain it, also under Conteneurisation); API (four routes); error table (five codes, `BODY_INVALID` now also on `/api/friendships`, `EMAIL_INVALID` also on a friend request); Couches (`features/friendships/`, `lib/email.ts`); Logs (`friendship.requested`, `friendship.request_failed`, `friendship.accepted`, `friendship.deleted`); Données (`Friendship`, `pairKey` and why, two indexes, seed order); Temps réel (friendships are not pushed, and why).
- Bruno: `collection.bru` docs (`inviteeCookie`, the friendships folder leaves no friendship behind), `friendships/folder.bru` docs (shape of an item, who sends which cookie).
- `.env.example`: no new variable.

## Delivery

A `gh stack` stacked on the step 3 stack (base branch `feat/client-invitations`), four draft PRs, each green on `pnpm check`, `typecheck`, `build`, `test`, `test:bruno`:

| PR  | Branch                 | Scope                                                                                                                                                                                                                                                                                                 |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | `feat/friends-schema`  | This spec and its plan; `FriendshipStatus`, `Friendship`, the two `User` relations; seed deletes friendships first; friendships repository; docs (Données)                                                                                                                                            |
| B   | `feat/friends-request` | `parseEmail` to `lib/email.ts`; `requestFriendship`, `listFriendships`, `deleteFriendship`; controller, router, `app.ts`; `USER_NOT_FOUND`, `SELF_FRIEND`, `ALREADY_FRIENDS`, `FRIEND_REQUEST_EXISTS`, `FRIENDSHIP_NOT_FOUND`; unit tests; `inviteeCookie`; Bruno `create/`, `list/`, `delete/`; docs |
| C   | `feat/friends-accept`  | `acceptFriendship`, `POST /:id/accept`, `areFriends`; unit tests; Bruno `accept/` (`delete/` then removes an accepted friendship, unchanged); docs                                                                                                                                                    |
| D   | `feat/client-friends`  | client codes and messages, `friendship.ts`, `friendshipsApi.ts`, `useFriendships`, `BackToLibraryLink` move, `FriendsPage` and its components, the « Amis » link; docs (Pages, README)                                                                                                                |

Delete lands in B with request, not with accept: without it, the second `pnpm test:bruno` run of B could not clean up and would answer 409. `ALREADY_FRIENDS` is unit-tested in B (the fake returns an accepted row) and reached by Bruno in C. After A, the author runs `pnpm db:push` (new collection, nothing to wipe).

## Out of scope

Sending emails, rate limiting (on requests too), real-time notifications, searching or suggesting accounts, blocking someone, friend lists of friends, paginating the lists, sharing photos and `NOT_FRIENDS` (step 5).

## Open questions (defaults applied meanwhile)

1. `USER_NOT_FOUND` tells a logged-in member whether an email has an account. Default: accepted (members are invited family; the message tells what to do). Alternative: a vaguer shared message for unknown and self.
2. A reverse pending request answers `FRIEND_REQUEST_EXISTS` instead of auto-accepting. Default: error, the page offers « Accepter » right below.
3. Friends see each other's email. Default: yes (the requester typed it; it tells homonyms apart).
4. Step 5: when a friendship is removed, photos already received stay in the recipient's library (they are separate `Photo` documents). Default assumed for step 5; confirm then.
5. API path `/api/friendships` (the id is a friendship's, not a user's) while the page is `/friends`. Default: keep both.
