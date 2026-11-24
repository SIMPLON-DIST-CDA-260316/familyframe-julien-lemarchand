# Step 3: admin invitations

- Date: 2026-11-24
- Scope: step 3 of `2026-11-23-accounts-sharing-overview.md`. The `Invitation` model, `requireRole` and `FORBIDDEN`, invitation links created by an admin, account creation on `/invite/:token`, the `/admin/invitations` page.
- AI usage: designed by the AI from the author's overview decisions while the author was away; every choice the overview left open is recorded in the Decisions table with its reason. To be validated by the author.
- Builds on: `2026-11-23-auth-sessions-design.md` (sessions, cookie, `requireAuth`, `currentUser`, `lib/session-token.ts`, `lib/password.ts`), `2026-11-24-personal-library-design.md` (Bruno `adminCookie`, repository returning `null` on P2002), `2026-11-23-server-logging-design.md` (event names, no PII).

## Goal

Accounts no longer come only from the seed. An admin types an email on `/admin/invitations` and gets a link valid 7 days, usable once, that he passes on himself (message, SMS: the app sends no email). The person opens `/invite/<token>`, chooses a display name and a password, and lands on their library, logged in like after `/login`, with a `member` account. A member who calls an admin route gets `403 FORBIDDEN`; without a session it stays `401 UNAUTHENTICATED`.

## Decisions

| Topic                        | Decision                                                                                                                                                                                                        | Main reason                                                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin guard                  | `requireRole(role)` in `auth.middleware.ts`, mounted after `requireAuth`; reads `currentUser(req).role`, throws `FORBIDDEN` (403) when it differs                                                               | the name announced in step 1; one line per route; the role comes from the session already loaded, no extra query                                         |
| Token                        | `generateToken()` and `hashToken()` from `lib/session-token.ts`, unchanged: 32 random bytes in hex, SHA-256 hex in `Invitation.tokenHash`                                                                       | same rule as sessions (overview); no second helper to explain                                                                                            |
| Token in the API             | the token travels in the JSON body of `POST /api/invitations/accept`, never in an API path                                                                                                                      | `http.request` logs every path: a token in `/api/invitations/<token>` would land in the logs                                                             |
| Link                         | the server returns the raw token once (`201 { invitation, token }`); the client builds `` `${window.location.origin}/invite/${token}` ``                                                                        | the origin the admin browses is the one the family reaches (LAN in dev, the public address in J2); no new variable, `CLIENT_ORIGIN` stays CORS-only      |
| Validity                     | `expiresAt` = creation + 7 days (`INVITATION_DURATION_MS`); single use through `usedAt`                                                                                                                         | the overview's rule                                                                                                                                      |
| Email                        | trimmed and lowercased by the server; valid when it matches `^[^\s@]+@[^\s@]+$` (`EMAIL_PATTERN`), else `400 EMAIL_INVALID`                                                                                     | same normalization as login; the admin types it himself, a loose check catches typos like a missing `@` without rejecting real addresses                 |
| Email with an account        | creating an invitation for it answers `409 ACCOUNT_EXISTS`                                                                                                                                                      | the person can already log in; an admin route, so telling which emails exist leaks nothing to a stranger                                                 |
| Email with a pending invite  | a new invitation **replaces** it: every unused invitation for that email (pending or expired) is deleted, then the new one is created; the old link answers `404 INVITATION_NOT_FOUND`                          | covers "I lost the link" without a revoke button; at most one live link per email; old unused rows do not pile up                                        |
| Listing                      | `GET /api/invitations`: every invitation, newest first (`id` descending, as photos), each with a computed `status` (`pending`, `used`, `expired`); no pagination                                                | the admin sees whether someone signed up; replacement keeps the list at about one row per invited email, a family's size                                 |
| Revocation                   | none                                                                                                                                                                                                            | YAGNI: a link dies after 7 days, after use, or when re-invited                                                                                           |
| Display name                 | trimmed, 1 to 50 characters (`DISPLAY_NAME_MAX_LENGTH`), else `400 DISPLAY_NAME_INVALID`                                                                                                                        | shown on frames and, in step 5, as "envoyée par X": a bound keeps the layout                                                                             |
| Password                     | not trimmed, 12 to 128 characters (`PASSWORD_MIN_LENGTH`, `PASSWORD_MAX_LENGTH`), else `400 PASSWORD_INVALID`; hashed with `hashPassword` (argon2id)                                                            | OWASP ASVS: at least 12 characters, allow up to 128; the maximum keeps argon2 away from huge inputs                                                      |
| Invitation errors            | unknown or malformed token → `404 INVITATION_NOT_FOUND`; expired → `410 INVITATION_EXPIRED`; used → `410 INVITATION_USED` (checked before expiry)                                                               | 410 says "existed, no longer usable"; separate codes give the right advice (ask a new link, or log in); the token is unguessable, distinguishing is safe |
| Accept: check order          | token first (shape, lookup, used, expired), then display name, then password                                                                                                                                    | a dead link is the first thing to tell: no point choosing a password for it                                                                              |
| Accept: writes               | create the `User` (role `member`, email from the invitation), then set `usedAt`; a unique-email violation (P2002) on the create answers `409 ACCOUNT_EXISTS`; no transaction                                    | the unique index on `User.email` is the real guarantee: two concurrent accepts create one account, the other gets 409                                    |
| Accept: session              | the auth service gains `openSession(userId)` (extracted from `login`: purge expired sessions, create one, return `{ token, expiresAt }`); the controller sets the cookie with `setSessionCookie`, as login does | one place creates sessions; the invitations service knows nothing about cookies or sessions                                                              |
| Accept: status               | `201 { user }` + `Set-Cookie`                                                                                                                                                                                   | an account is created; the body matches login's `{ user }`, so the client reuses `readUser`                                                              |
| Accept with a session cookie | the server ignores the current session and sets the new cookie; the client prevents the case (next row)                                                                                                         | the server stays simple; the browser rule lives where the risk is                                                                                        |
| `/invite/:token` logged in   | a card « Vous êtes connecté en tant que X. Déconnectez-vous pour utiliser cette invitation. » with « Se déconnecter »; after logout the form appears                                                            | an admin testing his own link must not burn it or lose his session silently                                                                              |
| Password confirmation        | a second password field on `/invite/:token`, compared on the client only                                                                                                                                        | there is no password reset: a typo would lock the account                                                                                                |
| `/admin/invitations` member  | `RequireAdmin` shows a refusal card « Cette page est réservée à l'administrateur. » with a link to `/`                                                                                                          | says why instead of a silent redirect; the server's 403 stays the real protection                                                                        |
| Copy                         | a read-only input with the link, and « Copier le lien » when `navigator.clipboard` exists; the input selects its text on focus                                                                                  | the Clipboard API exists only in a secure context: on `http://<ip>:5180` from a phone, manual copy must still work                                       |
| JSON body                    | `express.json()` mounted on the invitations router too                                                                                                                                                          | the logging spec's rule: a JSON route brings its own parser                                                                                              |
| Admin seed                   | the seed creates no invitation and deletes them before users                                                                                                                                                    | Prisma emulates the relation on MongoDB and refuses to delete an inviter that still has invitations                                                      |

Rejected: the token in the API path (logged), a server-built link from `CLIENT_ORIGIN` (wrong host from a phone on the LAN, and one more thing to configure in J2), refusing a second invitation with `409` (the admin is stuck 7 days when he loses a link), a revoke endpoint (YAGNI), a `GET` preview of the invitation before the form (one more public endpoint; the form reports a dead link on submit), a Mongo transaction for accept (the unique email index already prevents double accounts), silently redirecting a member away from `/admin/invitations`.

## Server

### Data

```prisma
model User {
  // fields unchanged
  sessions    Session[]
  photos      Photo[]
  invitations Invitation[]
}

model Invitation {
  id          String    @id @default(auto()) @map("_id") @db.ObjectId
  tokenHash   String    @unique
  email       String
  invitedById String    @db.ObjectId
  invitedBy   User      @relation(fields: [invitedById], references: [id])
  expiresAt   DateTime
  usedAt      DateTime?
  createdAt   DateTime  @default(now())

  @@index([email])
}
```

`email` is not unique: a used invitation stays next to a later one for the same address (only unused ones are replaced). `pnpm db:push` adds the collection; no existing data is affected.

MongoDB pitfall: Prisma does not write an optional field left out of `create`, and `where: { usedAt: null }` matches a stored `null` only, not a missing field. The repository therefore writes `usedAt: null` explicitly on create (commented), so the "unused" filter is a plain `usedAt: null`.

### Guard (`auth.middleware.ts`)

- `requireRole(role: UserRole): RequestHandler`: `currentUser(req)` (throws `UNAUTHENTICATED` when mounted without `requireAuth`), then `FORBIDDEN` when `user.role !== role`, logging `auth.forbidden` (warn, `userId`). Otherwise `next()`.
- `app.ts` builds `requireAdmin = requireRole('admin')` once and hands it to the invitations router.

### Auth service

- `openSession(userId): Promise<{ token, expiresAt }>`: `deleteExpiredSessions(now())`, `generateToken`, `createSession({ tokenHash, userId, expiresAt })`. `login` calls it after `findUserByCredentials`; its behavior and its `auth.login_succeeded` log are unchanged.

### Repository (`features/invitations/invitations.repository.ts`)

- `hasUserWithEmail(email): Promise<boolean>`: `prisma.user.count` on the email.
- `deleteUnusedByEmail(email): Promise<number>`: `deleteMany({ where: { email, usedAt: null } })`, returns the count.
- `create({ tokenHash, email, invitedById, expiresAt })`: writes `usedAt: null` (see the pitfall), returns the record.
- `findAll()`: `orderBy: { id: 'desc' }`.
- `findByTokenHash(tokenHash)`: `findUnique`, `null` when absent.
- `createUser({ email, displayName, passwordHash })`: role `member`; returns `null` on P2002, like `photos.repository.create`.
- `markUsed(id, usedAt)`: `update`.

User creation lives here, not in the auth repository: invitations are the only way to create an account, and "prefer duplication over the wrong abstraction" covers the small overlap with `findUserByEmail`.

### Service (`invitations.service.ts`)

`createInvitationsService(deps)` with deps `repository`, `generateToken`, `hashToken`, `hashPassword`, `now`, `logger`.

- `createInvitation({ email, invitedById })`, `email` arriving as `unknown`:
  1. `parseEmail`: a string, trimmed and lowercased, matching `EMAIL_PATTERN`, else `EMAIL_INVALID`;
  2. `hasUserWithEmail` → `ACCOUNT_EXISTS`;
  3. `deleteUnusedByEmail` (returns `replacedCount`);
  4. `generateToken`, `create` with `hashToken(token)` and `expiresAt = now + INVITATION_DURATION_MS`;
  5. logs `invitation.created` (`invitationId`, `userId` = the admin, `replacedCount`); returns `{ invitation: toInvitation(record), token }`.
- `listInvitations()`: `findAll().map(toInvitation)`.
- `toInvitation(record)` (needs `now`): `{ id, email, status, createdAt, expiresAt }` with `status` = `used` when `usedAt` is set, else `expired` when `expiresAt <= now`, else `pending`. Never `tokenHash` or `invitedById`.
- `acceptInvitation({ token, displayName, password })`, all three `unknown`:
  1. `token` must be a string of 64 hex characters (`TOKEN_PATTERN`), else `INVITATION_NOT_FOUND` without a lookup;
  2. `findByTokenHash(hashToken(token))` → `null` means `INVITATION_NOT_FOUND`;
  3. `usedAt` set → `INVITATION_USED`; `expiresAt <= now` → `INVITATION_EXPIRED`;
  4. `parseDisplayName` → `DISPLAY_NAME_INVALID`; `parsePassword` → `PASSWORD_INVALID`;
  5. `createUser({ email: invitation.email, displayName, passwordHash: await hashPassword(password) })` → `null` means `ACCOUNT_EXISTS`;
  6. `markUsed(invitation.id, now)`;
  7. logs `invitation.accepted` (`invitationId`, `userId` = the new member); returns the `PublicUser`.
  - Each refusal in steps 2, 3 and 5 logs `invitation.accept_failed` (warn) with `reason` (`not_found`, `used`, `expired`, `account_exists`) and `invitationId` when known. Never the token, the email, the name or the password.

### Controller, routes

- `create`: `service.createInvitation({ email: req.body?.email, invitedById: currentUser(req).id })` → `201 { invitation, token }`.
- `list`: `200 { invitations }`.
- `accept`: `service.acceptInvitation({ token: req.body?.token, displayName: req.body?.displayName, password: req.body?.password })`, then `authService.openSession(user.id)`, `setSessionCookie(res, token, expiresAt)` → `201 { user }`.
- `createInvitationsRouter(controller, requireAuth, requireAdmin)`: `express.json()`, then `POST /accept` (public), `GET /` and `POST /` behind `requireAuth, requireAdmin`.
- `app.ts`: `app.use('/api/invitations', …)`; `assembleInvitationsRouter(authService, requireAuth)` builds repository, service and controller.

### Types and errors

- `types.ts`: `InvitationStatus = 'pending' | 'used' | 'expired'`; `Invitation = { id, email, status, createdAt, expiresAt }` (ISO strings); `CreatedInvitation = { invitation: Invitation; token: string }`.
- New codes and statuses in `error-handler.ts`:

| Case                                                              | Status | `error`                |
| ----------------------------------------------------------------- | ------ | ---------------------- |
| a member calls an admin route                                     | 403    | `FORBIDDEN`            |
| missing or malformed email (create)                               | 400    | `EMAIL_INVALID`        |
| the email already has an account (create, or accept after a race) | 409    | `ACCOUNT_EXISTS`       |
| unknown, replaced or malformed token                              | 404    | `INVITATION_NOT_FOUND` |
| invitation past its 7 days                                        | 410    | `INVITATION_EXPIRED`   |
| invitation already used                                           | 410    | `INVITATION_USED`      |
| display name empty after trim, longer than 50, or not a string    | 400    | `DISPLAY_NAME_INVALID` |
| password shorter than 12, longer than 128, or not a string        | 400    | `PASSWORD_INVALID`     |

A malformed JSON body answers `400 BODY_INVALID`, as on `/api/auth`.

### Seed

`prisma.invitation.deleteMany()` before `prisma.user.deleteMany()` (the comment about emulated relations gains invitations). No invitation is seeded; the two accounts and `seed.done` are unchanged.

## Client

### Shared code

- `api.ts`: the eight codes synced, with messages:
  - `FORBIDDEN`: « Cette action est réservée à l'administrateur. »
  - `EMAIL_INVALID`: « Adresse e-mail invalide. »
  - `ACCOUNT_EXISTS`: « Un compte existe déjà pour cette adresse e-mail. »
  - `INVITATION_NOT_FOUND`: « Ce lien d'invitation n'est pas valide. Demandez-en un nouveau. »
  - `INVITATION_EXPIRED`: « Ce lien d'invitation a expiré. Demandez-en un nouveau. »
  - `INVITATION_USED`: « Ce lien d'invitation a déjà servi. Connectez-vous. »
  - `DISPLAY_NAME_INVALID`: « Choisissez un nom de 1 à 50 caractères. »
  - `PASSWORD_INVALID`: « Le mot de passe doit faire entre 12 et 128 caractères. »
- `invitation.ts` (new): the `Invitation` and `InvitationStatus` copies, `isInvitation`, `isCreatedInvitation`; `invitationLink(token)` builds the link from `window.location.origin`.
- `invitationsApi.ts` (new, next to `photosApi.ts`): `fetchInvitations(onUnauthenticated)` and `postInvitation(email, onUnauthenticated)`, results as `{ isSuccess: true, … } | { isSuccess: false, message }` like `LoginResult`; a 401 calls `onUnauthenticated` (the provider's `dropUser`).
- `auth/authApi.ts`: `postAcceptInvitation({ token, displayName, password }): Promise<LoginResult>`, the twin of `postLogin` (same `readUser`).
- `AuthProvider`: `acceptInvitation(…)` next to `login`, sets the user on success; added to `AuthContextValue`.
- `auth/RequireAdmin.tsx` (new): used inside `RequireAuth`; renders the refusal card when `user.role !== 'admin'`, else its children.

### Invitation page (`/invite/:token`, public)

- `pages/InvitePage.tsx` and `components/auth/InviteForm.tsx`.
- While `isLoading`: nothing (as `LoginPage`). With a user: the "already logged in" card (Decisions) with `LogoutButton`. Otherwise a card « Rejoindre FamilyFrame » and the form: « Votre nom » (`autoComplete="name"`), « Mot de passe » and « Confirmer le mot de passe » (`autoComplete="new-password"`, `minLength`/`maxLength` from constants mirroring the server's, commented), « Créer mon compte ».
- Mismatched confirmation: « Les deux mots de passe ne correspondent pas. », no request. Server errors: `errorMessage`.
- On success the provider sets the user and the page navigates to `/`. No `/` link for a dead invitation: the message tells what to do.
- Known limit: the token sits in this page's URL, so it stays in the invitee's browser history, and a static server that logs request paths (J2) would log it. Accepted: the link works once and for 7 days; J2 notes it when choosing the static server's log format.

### Admin page (`/admin/invitations`)

- Route wrapped in `RequireAuth` then `RequireAdmin`. `pages/AdminInvitationsPage.tsx`, `components/admin/InvitationForm.tsx`, `components/admin/InvitationLink.tsx`, `components/admin/InvitationList.tsx`, `hooks/useInvitations.ts` (`{ invitations, isLoading, error, reload }`).
- A `max-w-md` card « Invitations » with « Retour à la bibliothèque »: an email field and « Créer le lien » (« Création… » while sending). On success, `InvitationLink` shows the link in a read-only input, « Copier le lien » (→ « Lien copié » for 2 seconds) when the Clipboard API exists, and « Envoyez ce lien vous-même. Il sert une seule fois, pendant 7 jours, et ne sera plus affiché. » The email field is emptied and the list reloads.
- Below, `InvitationList`: one row per invitation, email, a `Badge` (« En attente », « Utilisée », « Expirée ») and a date (« expire le 1 décembre 2026 » for pending, « créée le … » otherwise, `fr-FR`). Empty: « Aucune invitation pour l'instant. »
- On the library page, admins see an « Invitations » ghost link (`UserPlusIcon`) next to « Se déconnecter »; members do not.

## Testing

- Unit `invitations.service.test.ts` (`vi.fn()` fakes, fixed `NOW`):
  - create nominal: email trimmed and lowercased; `hasUserWithEmail` and `deleteUnusedByEmail` get it; `create` gets `hashToken(token)`, `invitedById` and `expiresAt` = `NOW` + 7 days; returns the token and a `pending` invitation without `tokenHash`;
  - `EMAIL_INVALID` for a number, `''`, `'   '`, `'pas-un-email'`, `'a b@c.d'`; nothing written;
  - `ACCOUNT_EXISTS`: `deleteUnusedByEmail` and `create` not called;
  - `invitation.created` carries `invitationId`, `userId`, `replacedCount`, and no email or token;
  - list: `used` when `usedAt` is set (even if expired), `expired` when `expiresAt` equals `NOW`, else `pending`;
  - accept: a non-string token and a 63-character token → `INVITATION_NOT_FOUND` without lookup; lookup `null` → `INVITATION_NOT_FOUND`; used → `INVITATION_USED`; expired → `INVITATION_EXPIRED`; with a dead invitation, invalid name and password still give the invitation error (order);
  - display name: `'  '`, 51 characters, a number → `DISPLAY_NAME_INVALID`; `'  Mamie  '` stored as `'Mamie'`; 50 characters accepted;
  - password: 11 and 129 characters, a number → `PASSWORD_INVALID`; 12 and 128 accepted; not trimmed;
  - nominal: `hashPassword` gets the password, `createUser` gets the invitation's email, `markUsed` gets the id and `NOW`, the result is the public user (role `member`);
  - `createUser` returns `null` → `ACCOUNT_EXISTS` and `markUsed` not called;
  - `invitation.accepted` and `invitation.accept_failed` carry ids and `reason` only (the test checks that no logged value contains the email, the token, the name or the password).
- Unit `auth.middleware.test.ts` (new, a minimal fake request, `vi.spyOn(logger, 'warn')`): `requireRole('admin')` calls `next` for an admin; throws `FORBIDDEN` and logs `auth.forbidden` with `userId` only for a member; throws `UNAUTHENTICATED` without `req.user`.
- Unit `auth.service.test.ts`: `openSession` purges expired sessions, creates one with the token hash and a 90-day end, returns `{ token, expiresAt }`; the login tests stay green.
- Unit `error-handler.test.ts`: one case per new code (403, 400, 409, 404, 410, 410, 400, 400).
- Bruno, new folder `invitations/` (`seq: 2`, right after `auth/`, which provides `adminCookie`). Admin requests set `req.setHeader('Cookie', bru.getVar('adminCookie'))` in a pre-request script (and fail fast when it is absent, as `photos/delete/01`); the member is the collection's default cookie. Each run invites a fresh address, so no reset is needed between runs: `create/01` stores `inviteEmail` = `invite-<Date.now()>@familyframe.test`.
  - `create/` (seq 1): `01-nominal` → 201, the email sent in upper case with spaces comes back lowercased, `status` `pending`, `expiresAt` 7 days after `createdAt`, `token` of 64 hex characters (stored in `inviteToken`), no `tokenHash`; `02-nominal-remplacement` same email → 201, a new token (previous one moved to `replacedInviteToken`); `03-edge-email-invalide` → 400 `EMAIL_INVALID`; `04-edge-compte-existant` `{{memberEmail}}` → 409 `ACCOUNT_EXISTS`; `05-edge-membre` (collection cookie) → 403 `FORBIDDEN`; `06-edge-sans-cookie` → 401; `07-edge-json-malforme` → 400 `BODY_INVALID`.
  - `list/` (seq 2): `01-nominal` → 200, `inviteEmail` appears exactly once (the replacement deleted the first), `pending`, no `tokenHash` on any item; `02-edge-membre` → 403; `03-edge-sans-cookie` → 401.
  - `accept/` (seq 3), every request without cookie (`req.deleteHeader('Cookie')`): `01-edge-lien-remplace` `replacedInviteToken` → 404 `INVITATION_NOT_FOUND`; `02-edge-jeton-invalide` → 404; `03-edge-nom-vide` → 400 `DISPLAY_NAME_INVALID`; `04-edge-mot-de-passe-court` (11 characters) → 400 `PASSWORD_INVALID`; `05-nominal` → 201, `user.role` `member`, `user.email` = `inviteEmail`, a `ff_session` cookie; its script calls `GET /api/auth/me` with that cookie (same user) and `GET /api/invitations` with `adminCookie` (`status` `used`); `06-edge-deja-utilisee` → 410 `INVITATION_USED`.
  - Expiry is not reachable from Bruno (no clock control): the unit tests cover it. Accounts created by runs stay until `pnpm db:seed` (collection docs say so).
- Manual: as admin on `/admin/invitations`, create a link and copy it (localhost: copy button; phone on `http://<ip>:5180`: no button, manual copy); open it in a private window, create the account, land on `/` logged in, log out and back in on `/login` with the new credentials; reopen the link → « déjà servi »; open a link while logged in as admin → the "already logged in" card, the link still pending in the list; re-invite the same email → the old link answers « n'est pas valide »; log in as the member, open `/admin/invitations` → refusal card, no « Invitations » link on `/`.

## Docs

- README: how an admin invites someone (`/admin/invitations`, link to pass on, 7 days, single use; create links from the address the family uses, not `localhost`); service table gains « Invitations » (`/admin/invitations`).
- ARCHITECTURE: Pages table (`/invite/:token`, `/admin/invitations`, `RequireAdmin`, the SPA fallback list gains both paths); API table (three routes, `{ invitation, token }`, `{ invitations }`, `{ user }` + cookie); error table (eight codes); Authentification (accounts now come from invitations, `requireRole`, `openSession`, the token never in an API path, replacement rule, no transaction and why); JSON parser on `/api/auth` and `/api/invitations`; Couches (`features/invitations/`); Logs (`invitation.created`, `invitation.accepted`, `invitation.accept_failed`, `auth.forbidden`); Données (`Invitation`, index on `email`, the `usedAt: null` pitfall, seed order); the Bruno line (`invitations/`, fresh address per run).
- `.env.example`: no new variable.

## Delivery

A `gh stack` stacked on the step 2 stack (base branch `feat/library-page`), four draft PRs, each green on `pnpm check`, `typecheck`, `build`, `test`, `test:bruno`:

| PR  | Branch                    | Scope                                                                                                                                                                                                                            |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | `feat/invitations-schema` | This spec and its plan; `Invitation` model and `User.invitations`; seed deletes invitations first; `FORBIDDEN`, `requireRole` and its unit tests; docs (Données, error table, Logs `auth.forbidden`)                             |
| B   | `feat/invitations-create` | invitations repository, `createInvitation` and `listInvitations`, controller and router (`POST` and `GET /api/invitations` behind `requireAdmin`), `EMAIL_INVALID`, `ACCOUNT_EXISTS`; unit tests; Bruno `create/`, `list/`; docs |
| C   | `feat/invitations-accept` | `openSession` extracted from `login`, `acceptInvitation`, `POST /api/invitations/accept` with the cookie, the five accept codes; unit tests; Bruno `accept/`; docs                                                               |
| D   | `feat/client-invitations` | client codes and messages, `invitation.ts`, `invitationsApi.ts`, `postAcceptInvitation` and `acceptInvitation`, `RequireAdmin`, `InvitePage`, `AdminInvitationsPage`, the « Invitations » link; docs (Pages, README)             |

After A, the author runs `pnpm db:push` (new collection, nothing to wipe). `ACCOUNT_EXISTS` arrives in B, where creation needs it; C reuses it for the race.

## Out of scope

Sending emails, email verification, password reset and change, rate limiting on accept or login, revoking an invitation, an invitation preview endpoint, inviting an admin or changing a role, listing or deleting accounts, paginating the invitation list, a configured public URL for links (J2 may revisit, see the README note).
