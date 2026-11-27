# Step 6: account settings

- Date: 2026-11-24
- Scope: step 6, after the five steps of `2026-11-23-accounts-sharing-overview.md`. A « Préférences » page where a logged-in user changes their display name, their password and their profile photo; the email is shown read-only. `User.avatarCloudinaryId`, `avatarUrl` on every user sent to the client, `PASSWORD_INCORRECT`.
- AI usage: written by the AI from the design the author approved (routes, codes, cards, PR split, out of scope); every choice the approved design left open is recorded in the Decisions table with its reason. To be validated by the author (see Open questions).
- Builds on: `2026-11-23-auth-sessions-design.md` (argon2, `Session` documents, sliding expiry), `2026-11-24-admin-invitations-design.md` (display name and password rules), `2026-11-24-personal-library-design.md` (Multer settings, file error codes), `2026-11-23-signed-photo-urls.md` (signed delivery URLs, strict transformations), `2026-11-23-server-logging-design.md` (event names, no PII).

## Goal

A user opens « Préférences » from the account menu (or the mobile menu) and edits their account in four cards, each saved on its own: « Photo de profil » (choose a file, preview it, save, or remove the photo), « Nom affiché », « Adresse e-mail » (read-only, « Bientôt »), « Mot de passe » (current, new, confirmation). After each save the app bar shows the change without a reload. A profile photo replaces the initial wherever an avatar appears: the app bar, the menus, the friends list and the share dialog. A password change logs out every other device of the account, the frame included.

## Decisions

| Topic                | Decision                                                                                                                                                      | Main reason                                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature              | new `server/src/features/account/` (repository, service, controller, routes), mounted `app.use('/api/account', requireAuth, …)`                               | one router, every route acts on the logged-in account; same layering as the other features                                                                                |
| Response             | rename and avatar routes answer `200 { user: PublicUser }`; the password route answers `204`                                                                  | the `{ user }` envelope of `GET /api/auth/me`, so the client replaces its user as is; a password change has nothing new to show                                           |
| Shared rules         | `parseDisplayName`, `parsePassword` and their limits move from `invitations.service.ts` to `server/src/lib/account-input.ts`                                  | used by invitations and account; `lib/` already holds `parseEmail` (`lib/email.ts`); invitations must not import the account feature                                      |
| Avatar storage       | `User.avatarCloudinaryId String?`; the URL is computed on every read, never stored                                                                            | the photo URLs are signed and computed from the id already (`2026-11-23-signed-photo-urls.md`)                                                                            |
| `avatarUrl`          | `PublicUser` and `FriendUser` gain `avatarUrl: string \| null`, built by `avatarUrl(cloudinaryId)` in `lib/cloudinary.ts` (the optimized delivery, as photos) | the client needs a URL, not an id; one helper for every DTO                                                                                                               |
| `toPublicUser`       | moves to `features/auth/public-user.ts` with `toAvatarUrl`, and receives the URL builder (`AvatarUrlBuilder`) injected                                        | auth, invitations and account all build a `PublicUser`; `lib/cloudinary.ts` reads the config, so services receive the builder and their tests need no Cloudinary settings |
| Avatar image         | `toAvatarJpeg` in `lib/image.ts`: EXIF rotation, 256 × 256 centre crop (`fit: cover`), white background, JPEG 85                                              | a square the size of the largest avatar shown (96 px, at 2x and more); no crop UI (out of scope)                                                                          |
| Avatar upload        | `uploadAvatar` in `lib/cloudinary.ts`, folder `familyframe/avatars`, through a private helper shared with `uploadImage`                                       | avatars stay apart from library photos in the Cloudinary console; one upload path                                                                                         |
| File checks          | the photo upload's Multer settings (`photos.upload.ts`: memory, 10 MB, one file) on field `avatar`, and `parseFile` from `photos.input.ts`                    | same limits and codes as a photo: `PHOTO_MISSING`, `UPLOAD_INVALID`, `PHOTO_TOO_LARGE`, `FORMAT_UNSUPPORTED`, `IMAGE_UNREADABLE`                                          |
| Previous avatar      | destroyed **after** the database write; a Cloudinary failure is logged and does not fail the request                                                          | the user's change is saved either way; an orphan image costs storage, a lost photo costs the user                                                                         |
| Avatar removal       | idempotent: no photo → `200 { user }`, no write, no log                                                                                                       | the client cannot hold a stale « Retirer » that errors                                                                                                                    |
| Password check order | new password rule first (`PASSWORD_INVALID`), then the current password (`PASSWORD_INCORRECT`)                                                                | no argon2 work for a request that cannot succeed                                                                                                                          |
| `PASSWORD_INCORRECT` | `400`, distinct from `INVALID_CREDENTIALS` (401)                                                                                                              | the user is logged in: a 401 would make the client drop the session                                                                                                       |
| Current session      | `AuthenticatedSession` gains `sessionId`; `requireAuth` sets `req.sessionId` next to `req.user`; `currentSessionId(req)` in `auth.guard.ts` reads it          | the password change keeps the session that made it; the smallest change to the existing middleware                                                                        |
| Other sessions       | `deleteMany` of the account's sessions except the current one, count logged                                                                                   | every other device must log in again with the new password                                                                                                                |
| Open sockets         | a password change does not cut open Socket.IO connections; the frame logs out at its next HTTP request, reconnection or daily reload                          | Socket.IO checks the session at connection only (step 1); cutting sockets needs a session-to-socket map, out of this step                                                 |
| Email                | read-only card with a « Bientôt » badge, no endpoint, no save button                                                                                          | email change needs verification (out of scope)                                                                                                                            |
| Client state         | `AuthContext` gains `replaceUser(user)`; each save replaces the user with the response                                                                        | the bar, the menus and the badge read the context                                                                                                                         |
| Page                 | `/settings`, inside the `AccountBar` layout, behind `RequireAuth`; « Préférences » entry above the theme toggle in `UserMenu` and `MobileNav`                 | the approved design                                                                                                                                                       |

## Server

### Data

```prisma
model User {
  // …
  avatarCloudinaryId String?
}
```

Optional, no index: existing users read `null`. `pnpm db:push` only, **no seed** (shared dev database).

### Shared input (`lib/account-input.ts`)

`DISPLAY_NAME_MAX_LENGTH` (50), `PASSWORD_MIN_LENGTH` (12), `PASSWORD_MAX_LENGTH` (128), `parseDisplayName(unknown)` (trimmed, 1 to 50 characters, else `DISPLAY_NAME_INVALID`), `parsePassword(unknown)` (12 to 128 characters, not trimmed, else `PASSWORD_INVALID`). Moved verbatim from the invitations service.

### Repository (`account.repository.ts`)

`findUserById`, `updateDisplayName`, `updatePasswordHash`, `deleteOtherSessions(userId, keptSessionId)` (returns the count), `updateAvatar(id, cloudinaryId | null)`.

### Service (`account.service.ts`)

- `changeDisplayName({ userId, displayName })`: parse, write, log `account.renamed`.
- `changePassword({ userId, sessionId, currentPassword, newPassword })`: parse the new one; load the user (missing → `UNAUTHENTICATED`); check the current one with argon2 (not a string or wrong → warn `account.password_change_failed` with `reason: 'incorrect_password'`, `PASSWORD_INCORRECT`); store the new hash; delete the other sessions; log `account.password_changed` with `closedSessionCount`.
- `changeAvatar({ userId, file })`: `parseFile`; `toAvatarJpeg` (sharp failure → warn `account.avatar_unreadable`, `IMAGE_UNREADABLE`); load the user; upload; write (failure → error `account.avatar_orphaned` with the new `cloudinaryId`, rethrow); destroy the previous image if any (failure logged, request still succeeds); log `account.avatar_changed` (`cloudinaryId`, `previousCloudinaryId`, `isPreviousDestroyed`).
- `removeAvatar(userId)`: no photo → the user as is; else write `null`, destroy, log `account.avatar_removed` (`cloudinaryId`, `isImageDestroyed`).

Every log carries ids only (`userId`, Cloudinary ids, counts): never a name, an email or a password.

### Controller, routes

| Method   | Path                    | Body                                    | Answer         |
| -------- | ----------------------- | --------------------------------------- | -------------- |
| `PATCH`  | `/api/account`          | JSON `{ displayName }`                  | `200 { user }` |
| `PUT`    | `/api/account/password` | JSON `{ currentPassword, newPassword }` | `204`          |
| `PUT`    | `/api/account/avatar`   | multipart `avatar`                      | `200 { user }` |
| `DELETE` | `/api/account/avatar`   | —                                       | `200 { user }` |

JSON routes bring their own `express.json()` (malformed body → `BODY_INVALID`).

### Types and errors

`PublicUser.avatarUrl`, `FriendUser.avatarUrl`, server and client copies with their type guards. `PASSWORD_INCORRECT` → 400 in `types.ts`, `error-handler.ts` (+ test), and `client/src/api.ts` with « Mot de passe actuel incorrect. ».

## Client

- `auth/accountRules.ts`: the form limits and the mismatch message, shared by `InviteForm` and the password card.
- `accountApi.ts`: `patchDisplayName`, `putAvatar` (FormData), `deleteAvatar`, `putPassword`; results `saved` (with the user), `failed` (French message), `unauthenticated`.
- `hooks/useAccountSave.ts`: per card status `idle | saving | saved | error`; a 401 drops the user (back to login), a saved user goes through `replaceUser`.
- `components/settings/`: `SettingsCard` (form, « Enregistrer » / « Enregistrement… », « Enregistré. », error alert), `AvatarCard` (96 px avatar with the preview of the chosen file, « Changer la photo », « Annuler », « Retirer »), `DisplayNameCard`, `EmailCard`, `PasswordCard` (three password fields with the existing eye toggle, mismatch alert, the warning about other devices and the frame).
- `pages/SettingsPage.tsx` « Préférences », route `/settings`.
- `UserAvatar` takes `avatarUrl` and shows the image (`object-cover`) when set, else the initial; `UserBadge`, `UserMenu` and `FriendshipRow` pass it (the share dialog lists friends through `FriendshipRow`).

## Testing

- Unit:
  - `public-user.test.ts`: no photo → `avatarUrl` null; a photo → the URL built from the id, neither the id nor the hash sent;
  - `account.service.test.ts` (rename): trims, writes, accepts 50 characters, keeps the avatar URL, logs ids only, `DISPLAY_NAME_INVALID` for blank, too long, missing, non-string;
  - `account.service.password.test.ts`: nominal (hash, other sessions deleted with the current id kept, log with the count, no password in logs), invalid new password before any read, wrong or non-string current password, missing user;
  - `account.service.avatar.test.ts`: first photo, replacement (previous destroyed after the write), destroy failure still succeeds, write failure logs the orphan, missing file, GIF, unreadable image before any upload, removal with and without a photo, removal destroy failure;
  - `lib/image.test.ts`: a 800 × 400 PNG becomes a 256 × 256 JPEG;
  - `auth.guard.test.ts`: `currentSessionId` present and absent; `error-handler.test.ts`: `PASSWORD_INCORRECT` → 400.
- Bruno `account/` (`seq: 4`), on the throwaway account created by `invitations/accept/05` (`inviteeCookie`), never the member (see Open questions 1):
  - `rename/` 01-06: nominal with trim, blank, missing field, malformed JSON, no cookie, name restored;
  - `password/` 01-10: wrong current, too short, malformed JSON, no cookie, nominal (a second session opened by the pre-request), the second session closed, the current one kept, login with the new password, the old one refused, password restored;
  - `avatar/` 01-09: no file, wrong field, GIF, fake JPEG, nominal JPEG (the signed URL loads), replacement PNG, removal, removal again, no cookie.
  - The collection stays re-runnable: each run creates a new invitee, and each folder restores what it changed.
- Manual: change the name (the bar updates), upload, replace and remove a photo (menu and friends list follow), change the password with a second browser logged in (it falls back to login at its next request), wrong current password message, mismatch message.

## Docs

- ARCHITECTURE: API (four routes), error table (`PASSWORD_INCORRECT`, `BODY_INVALID` on JSON routes), password change and its limitation (open sockets), backend layers (`features/account`, `lib/account-input.ts`, `public-user.ts`), Données (`avatarCloudinaryId`), Logs (`account.*`), Pages (`/settings`), `RequireAuth` and SPA fallback lists.
- README: the « Préférences » URL and how to edit one's account (and when the frame logs out).
- Bruno: `account/folder.bru` (why the invitee), each subfolder's docs, `collection.bru`.
- `.env.example`: no new variable.

## Delivery

A `gh stack` on top of #69, four draft PRs, each green on `pnpm check`, `typecheck`, `build`, `test`, `test:bruno`:

| PR  | Branch                  | Scope                                                                                                                                               |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | `feat/account-profile`  | this spec and its plan; `avatarCloudinaryId`, `avatarUrl` in every user DTO (server, client, Bruno); shared input rules; `PATCH /api/account`; docs |
| B   | `feat/account-password` | `sessionId` on the request; `PASSWORD_INCORRECT` (server and client message); `PUT /api/account/password`; unit tests, Bruno, docs                  |
| C   | `feat/account-avatar`   | `toAvatarJpeg`, `uploadAvatar`; `PUT` and `DELETE /api/account/avatar`; unit tests, Bruno, docs                                                     |
| D   | `feat/client-settings`  | avatar image in `UserAvatar`; `replaceUser`; `/settings` and its four cards; menu entries; docs (README, ARCHITECTURE)                              |

After A, the controller runs `pnpm db:push` (optional field, no index). No seed.

## Out of scope

Email change, avatar crop UI, password reset by email, login rate limiting, cutting open Socket.IO connections on a password change, account deletion.

## Open questions (defaults applied meanwhile)

1. Bruno edits the throwaway invitee account rather than the member (the approved design named the member). Default: the invitee. Changing the member's password closes the member's other sessions, which on the shared dev database are the author's browser and frame; the invitee has none, and each run creates a new one.
2. The log field is `closedSessionCount` (the approved design said "closedSessions count"). Default: `closedSessionCount`, a number named as one.
3. Three log events beyond the approved four: `account.password_change_failed` (warn), `account.avatar_unreadable` (warn), `account.avatar_orphaned` (error). Default: kept, as `photo.unreadable` and `auth.login_failed` do for their features.
4. The new password is validated before the current one is checked. Default: yes (no argon2 work for a doomed request). Consequence: a too short new password with a wrong current one answers `PASSWORD_INVALID`.
5. Two avatar changes racing can leave one image orphaned in Cloudinary (both read the same previous id). Default: accepted (one user, one browser at a time; storage only).
6. Open Socket.IO connections survive a password change until the next HTTP request, reconnection or daily reload. Default: documented limitation.
7. The account feature imports `parseFile` and the Multer `upload` from the photos feature. Default: accepted (same file rules on purpose); moving them to `lib/` would touch photos for no behavior change.
