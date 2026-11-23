# Accounts, libraries, friends and sharing: overview

- Date: 2026-11-23
- Scope: the whole "accounts" goal, split into 5 steps. Each step gets its own design spec, plan and `gh stack`.
- AI usage: designed with the `superpowers:brainstorming` skill; each decision below was asked to the author one at a time, with a recommendation. Best practices for duplicate detection were checked with a web search.
- Context: the author wants to offer the frame as a Christmas present, so the app goes beyond the Simplon brief. The work happens on `develop` before containerization (J2–J4) without blocking it: features and Docker touch different files; auth only adds settings to Compose.

## Goal

Turn FamilyFrame from one public, anonymous photo feed into a family platform with accounts. Each member has a library and a frame. Members add friends and send them photos, which land on the friend's frame.

## Decisions

| Topic            | Decision                                                                                           | Main reason                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Roles            | `member` and `admin`; admin = member + invitations                                                 | the smallest model that covers the need                                                     |
| Auth             | home-made server sessions stored with Prisma, token in an `httpOnly` cookie                        | real logout and revocation (a frame stays logged in for months); no JWT secret to manage    |
| Session store    | MongoDB through Prisma, not Redis                                                                  | no new service; durable across restarts; a family's traffic needs no cache                  |
| Password hashing | `argon2` (argon2id)                                                                                | already used by the author in a previous project; current OWASP recommendation              |
| Invitations      | single-use link valid 7 days, sent by the admin himself                                            | the admin never knows the password; no email sending                                        |
| Friends          | request by exact email, accept or decline, then mutual                                             | nobody receives photos from a stranger; exact email avoids listing accounts                 |
| Frame            | logs in like any device, 90-day sliding session                                                    | no extra mechanism; pairing by code comes later                                             |
| Existing data    | the seed wipes the database and creates 1 admin + 1 member                                         | only dev data exists; Mongo has no migrations                                               |
| Photo model      | one `Photo` document = one photo in someone's library; a share points to the same Cloudinary image | no re-upload; each library deletes independently                                            |
| Duplicates       | SHA-256 of the original file bytes, checked before sharp/Cloudinary, unique `(ownerId, sha256)`    | exact-duplicate best practice (Immich does the same); the index resists concurrent requests |
| Slideshow        | the whole library; the library page is paginated                                                   | old photos never silently leave a gift frame                                                |

Rejected: JWT in a cookie (no revocation without a blocklist), JWT in `localStorage` (XSS), `express-session` + `connect-mongo` (hidden behavior, separate connection, signing secret), Redis (extra service, volatile by default), temporary passwords (admin handles a password), a shared invitation code (no per-person control), one-way or automatic friendship (anyone can fill a frame), one Cloudinary image per recipient (double storage), a normalized `Image`/`LibraryEntry` model (more code for little gain), SHA of the converted JPEG (convert before knowing, sharp output not guaranteed stable), only the latest N photos on the frame.

## Data model (target, after step 5)

```prisma
enum Role { member admin }

model User         { id, email @unique, displayName, passwordHash, role Role, createdAt }
model Session      { id, tokenHash @unique, userId, expiresAt, createdAt }
model Invitation   { id, tokenHash @unique, email, invitedById, expiresAt, usedAt?, createdAt }
model Friendship   { id, requesterId, addresseeId, status (pending | accepted), createdAt; @@unique([requesterId, addresseeId]) }
model Photo        { id, ownerId, senderId?, url, cloudinaryId, sha256, createdAt; @@unique([ownerId, sha256]) }
```

Tokens (session, invitation) are 32 random bytes sent to the client; the database stores only their SHA-256, so a database leak opens nothing.

## Steps

Each step is a `gh stack` of scoped draft PRs with atomic commits, green on `pnpm check`, `typecheck`, `build`, `test` and `test:bruno`, with unit tests for the services and Bruno requests per endpoint. A step may stack on top of the previous one while it awaits review; stacks are merged bottom-up on the author's request only.

1. **Accounts and sessions**: `User`, `Session`, seed, login/logout/me, every business route and Socket.IO behind a session, client login.
2. **Personal library**: `Photo.ownerId`, SHA-256 duplicates, frame and real-time per user (`user:<id>` rooms), paginated library page.
3. **Admin invitations**: invitation links, `/invite/:token`, `/admin/invitations`, `FORBIDDEN` for non-admins.
4. **Friends**: requests, accept/decline, remove, `/friends`.
5. **Sharing**: send to a friend from the library (same image) or from the device (to the friend only), `NOT_FRIENDS`, recipient-side duplicates, "sent by X".

## Out of scope

Frame pairing by code, email verification, password reset, login rate limiting, perceptual hashing, client-side SHA pre-check, random slideshow order (J5).
