---
plan: account-settings
status: ready
spec: docs/superpowers/specs/2026-11-24-account-settings-design.md
branch: feat/account-profile (PR A), feat/account-password (PR B), feat/account-avatar (PR C), feat/client-settings (PR D)
worktree: false
tasks_total: 9
tasks_done: 0
current_task: 1
last_commit: f5c8339
last_updated: 2026-11-24
---

# Account Settings (Step 6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Working agreement (mandatory):** keep this plan in sync with reality. Check a step only when it is finished and its gate is green. Append every divergence to the Drift Log. Update the frontmatter (`tasks_done`, `current_task`, `last_commit`, `last_updated`) at each task boundary. When a drift produces a durable correction (path, command, signature, decision), amend the affected task block in place and log the amendment: implementers only receive their own task block. Never check a partial step; never delete a finished step or a drift entry. Under subagent-driven development, `.superpowers/sdd/progress.md` is the runtime authority; the frontmatter mirrors it.

**Goal:** A logged-in user opens « Préférences » (`/settings`) from the account menu or the mobile menu and edits their account in four cards, each saved on its own: profile photo (choose, preview, save, remove), display name, email (read-only, « Bientôt »), password (current, new, confirmation). The app bar follows each save without a reload. The profile photo replaces the initial in every avatar. A password change closes every other session of the account, the frame's included.

**Architecture:** `User` gains an optional `avatarCloudinaryId`; `PublicUser` and `FriendUser` gain `avatarUrl: string | null`, built by `avatarUrl()` in `lib/cloudinary.ts` and injected into the services as `AvatarUrlBuilder` (`toPublicUser` moves to `features/auth/public-user.ts`). The display name and password rules move to `lib/account-input.ts`. A new `features/account/` (repository, service, controller, routes), mounted at `/api/account` behind `requireAuth`: `PATCH /` (`{ displayName }` → `{ user }`), `PUT /password` (→ 204, keeps the request's session — `req.sessionId`, set by `requireAuth` — and deletes the others; `PASSWORD_INCORRECT` 400), `PUT /avatar` (multipart `avatar`, the photo upload's Multer settings and `parseFile`, `toAvatarJpeg` 256 px square, `uploadAvatar` to `familyframe/avatars`, previous image destroyed after the write → `{ user }`), `DELETE /avatar` (idempotent → `{ user }`). The client gets `replaceUser` in `AuthContext`, `accountApi.ts`, `useAccountSave`, `components/settings/*` cards, `SettingsPage`, menu entries, and `UserAvatar` shows the photo. Four PRs in a `gh stack`.

**Tech Stack:** Node 24, TypeScript 7 (`nodenext`, `strict`, `verbatimModuleSyntax`), Express 5, Multer 2, sharp, Cloudinary SDK, argon2, Prisma 6.19 (MongoDB), Vitest 5, Biome 2, Bruno CLI 4.2.0, React 19 + react-router 7 + shadcn/ui + lucide-react (`SettingsIcon`), `gh stack`.

## Global Constraints

- **No new dependency**, server or client: `sharp`, `multer`, `cloudinary` and `argon2` are installed already (checked in `server/package.json`); the client uses the existing shadcn `card`, `badge`, `alert`, `input`, `label`, `button` files. **Never run `shadcn` or any CLI that adds dependencies.** **Prisma stays on v6** (v7+ has no MongoDB support).
- **No client test runner:** the client has none; do not add one. Client tasks are verified by `pnpm typecheck`, `pnpm build`, `pnpm check` and the manual checks of the final verification.
- **Error code (exact, from the spec):** `PASSWORD_INCORRECT` → `400` (wrong current password), client message « Mot de passe actuel incorrect. ». Reused: `DISPLAY_NAME_INVALID`, `PASSWORD_INVALID`, `BODY_INVALID`, `UNAUTHENTICATED`, and the photo file codes `PHOTO_MISSING`, `UPLOAD_INVALID`, `PHOTO_TOO_LARGE`, `FORMAT_UNSUPPORTED`, `IMAGE_UNREADABLE`. **Error codes are synced server and client in the same commit** (`server/src/types.ts`, `server/src/errors/error-handler.ts` and its test, `client/src/api.ts`).
- **DTO (exact):** `PublicUser = { id, email, displayName, role, avatarUrl }`, `FriendUser = { id, displayName, email, avatarUrl }`, `avatarUrl` = the signed delivery URL or `null`. `avatarCloudinaryId` and `passwordHash` stay on the server. Rename and avatar routes answer `200 { user }`; the password route answers `204`.
- **Log events (exact):** `account.renamed` (info: `userId`), `account.password_changed` (info: `userId`, `closedSessionCount`), `account.password_change_failed` (warn: `reason: 'incorrect_password'`, `userId`), `account.avatar_changed` (info: `userId`, `cloudinaryId`, `previousCloudinaryId`, `isPreviousDestroyed`), `account.avatar_removed` (info: `userId`, `cloudinaryId`, `isImageDestroyed`), `account.avatar_unreadable` (warn: `userId`, `error`), `account.avatar_orphaned` (error: `userId`, `cloudinaryId`, `error`). Logs carry **ids only**: never a name, an email, a password, a token or any other PII, never an environment value, never `console`. The account service receives the logger injected.
- **UI text (French, exact):** every string is written out in the task that adds it.
- **No `vi.mock`:** fakes are `vi.fn()` passed through the factory, in a per-file `makeDeps()`. Vitest imports are explicit.
- **TypeScript (AGENTS.md):** no `as` casts (not even `as const`), explicit return types on exported functions, literal unions rather than TS `enum`.
- **Code rules (`.claude/rules/`):** comment why, never what; no file-summary comments; name callback params after the item; no magic numbers in `src` code (test inputs may be literal); **every function at most 30 lines** (factories included); **every file at most 300 lines, test files included**; max 5 params; no flag parameters; booleans prefixed `is`/`has`/`should`; catch errors as `unknown`.
- **Files near 300 lines:** `server/src/features/auth/auth.service.test.ts` ends Task 4 at **297 lines**: add nothing more to it. `account.service.ts` ends at 173 lines; the three account test files at most 195; `app.ts` at 138.
- Server imports use the `.js` extension; client imports use the `@/` alias with the `.ts`/`.tsx` extension.
- **Language:** code, comments, logs and commits in English; UI text, Bruno `docs` blocks, README and ARCHITECTURE in French.
- **Every business rule change updates its colocated `*.test.ts` in the same commit; every endpoint gets Bruno requests under `server/bruno/account/` in the same commit; docs change in the task that changes the behavior.** Bruno `docs` blocks are in French. **Bruno account requests use `inviteeCookie` only, never the member's or the admin's cookie** (Choices). **The collection passes twice in a row.**
- **Test API for gates:** the author's dev API holds port 3000 and Vite holds 5180, run by the controller: **never start, stop or touch anything on ports 3000 or 5180.** From `server/`, start the test API in its **own background command**: `PORT=3002 npx tsx --env-file-if-exists=.env src/server.ts` (never combine it in one shell command with `cat`, `grep`, `sed` or another reader word: a hook blocks commands containing `.env` plus a reader word). It does not watch files: restart it after each code change. Wait for the `server.started` log line.
- **Bruno gate command** (from `server/bruno/`): `pnpm dlx @usebruno/cli@4.2.0 run . -r --env Local --disable-cookies --env-var baseUrl=http://localhost:3002` (the same as `pnpm test:bruno`, pointed at port 3002). The expected counts were counted from the request files (requests = `.bru` files except `folder.bru`, `collection.bru` and `environments/`; assertions = non-empty lines inside `assert {}` blocks; `test()` calls counted apart).
- **Stopping the test API:** in PowerShell, `$listener = Get-NetTCPConnection -LocalPort 3002 -State Listen | Select-Object -First 1 -ExpandProperty OwningProcess`, check `(Get-CimInstance Win32_Process -Filter "ProcessId=$listener").CommandLine` does **not** contain `worktrees`, then `Stop-Process -Id $listener`. Kill only that process: never one you did not start, never one whose command line contains `worktrees`.
- **Database:** `pnpm db:push` is **controller only**, and **nobody runs `pnpm db:seed`**: it wipes the shared dev MongoDB, whose data another session uses. Implementers only run `pnpm --filter server db:generate` (no database access). If `prisma generate` fails with `EPERM`, an API process holds the Prisma engine file: stop your own test API on 3002 and retry; if it still fails, report it to the controller (the author's dev API holds it), never stop a process you did not start.
- **Cloudinary:** Bruno `avatar/05`-`08` upload to and destroy from the real Cloudinary account of `server/.env` (folder `familyframe/avatars`), as `photos/create` does. The images are destroyed by the run itself.
- **Gates:** every commit passes `pnpm check` and `pnpm typecheck`. Every task ends green on `pnpm test`, `pnpm build`, and (tasks that touch routes) the Bruno gate command against the test API, twice.
- **Commits:** atomic, one concern each; Conventional Commits in English, message written to a file in the scratchpad with the Write tool (shell heredocs fail here) and passed with `git commit -F <file>`. Every message ends with these two lines, after a blank line:
  ```
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Hm8u1MNisEcmacs5tNKshr
  ```
  A failing hook means no commit: fix (`pnpm check:fix`, then re-add only the task's files) and commit again. Never `--no-verify`.
- **Never read or print any `.env` file** (a hook blocks commands containing a reader word plus `.env`; the variables are listed in `server/.env.example`).
- **Biome formats Markdown:** an added row wider than a table's column makes `pnpm check` fail on `ARCHITECTURE.md` or `README.md`; `pnpm check:fix` realigns the table. The docs diffs below are shown already aligned.
- **Line endings:** LF.
- **Stack:** the controller creates branches with `gh stack`; implementers never switch branches, push or run `gh stack`. Never `gh pr merge`.

## Choices made while planning (not in the spec, or resolving a conflict with the code or the rules)

- **Bruno uses the throwaway invitee account, not the member** (the approved design named the member). `invitations/accept/05` creates a new account each run (`inviteeCookie`, password `invite-bruno-dev`, name « Invitée »). Changing the member's password would delete the member's other sessions: on the shared dev database those are the author's browser and frame. `account/` is `seq: 4`, after `invitations/` (which creates the invitee) and `friendships/`. Open question 1 of the spec.
- **`toPublicUser` moves to `features/auth/public-user.ts` and takes the URL builder** (Task 1): it is used by auth, invitations and account, and `lib/cloudinary.ts` imports `config.ts`, which requires the environment variables. `app.ts` passes `avatarUrl` from `lib/cloudinary.ts`; tests pass a typed `vi.fn<AccountServiceDeps['avatarUrl']>()` (or the service's own deps type) that returns `https://cdn.test/<id>`.
- **`FriendshipParty`** (Task 1): the friendships repository's `select` gains `avatarCloudinaryId`; the service maps it with `toAvatarUrl`. The type is named from the Prisma payload (`FriendshipRecord['requester']`).
- **The auth service's avatar test was not added to `auth.service.test.ts`** (Task 1): the file sits near 300 lines; `public-user.test.ts` covers the mapping and `auth.service.test.ts` only gains the `avatarUrl` key in its expectations.
- **`lib/account-input.ts`** rather than `features/account/account.input.ts` (Task 2): invitations would otherwise import from the account feature; `lib/email.ts` (`parseEmail`) sets the precedent.
- **The service method is `changeDisplayName`**, not `rename`: it matches `changePassword` and `changeAvatar`.
- **`requireAuth` sets `req.sessionId`** (Task 4) via Express `Request` declaration merging next to `req.user`; `currentSessionId(req)` throws `UNAUTHENTICATED` when absent (a route mounted without `requireAuth`). `AuthenticatedSession` gains `sessionId`.
- **Password check order:** `parsePassword(newPassword)` first, then the user, then argon2 (spec open question 4). A non-string current password answers `PASSWORD_INCORRECT` (no argon2 call).
- **`deleteOtherSessions` returns the count** (`deleteMany(...).count`) for `closedSessionCount`; `updatePasswordHash` returns nothing (the route answers 204).
- **`changeAvatar` order:** `parseFile` → `toAvatarJpeg` → find the user → upload → write → destroy the previous image. The user is read after the conversion so a bad file costs no database read; the previous id comes from that read. Two concurrent changes may orphan one image (spec open question 5).
- **`PHOTO_MISSING` unit test calls the service directly** (Task 6): the test helper's default parameter would replace an explicit `undefined` file.
- **`account.service.test.ts` and `.password.test.ts` gain fakes in Tasks 4 and 6** (`hashPassword`, `verifyPassword`, `findUserById`, `updatePasswordHash`, `deleteOtherSessions`, `toAvatarJpeg`, `uploadAvatar`, `deleteImage`, `updateAvatar`): each `makeDeps` builds the full `AccountServiceDeps`.
- **`lib/image.test.ts` runs the real sharp** on an 800 × 400 PNG built in memory (no fixture file); it checks a 256 × 256 JPEG.
- **Bruno `password/05`'s pre-request opens a second invitee session by `axios`** (`inviteeOtherCookie`); `06` checks it is closed, `07` that `inviteeCookie` is not. `08` logs in with the new password (one more session), `09` checks the old one fails with `INVALID_CREDENTIALS`, `10` restores `invite-bruno-dev` (closing `08`'s session).
- **Bruno `avatar/05` checks the signed URL loads** (a fetch in the test script): a 401 there means Cloudinary « Strict transformations » refused the transformation (README prerequisite), as `photos/create/01` does.
- **Client:** `useAccountSave` (per card status) and `SettingsCard` (shared form frame) keep each card under 30 lines per function; `accountRules.ts` holds the limits shared with `InviteForm`; `readUser` from `authApi.ts` is exported for `accountApi.ts`.
- **The email card has no save button** (nothing to save); its input is disabled and shows a « Bientôt » badge.
- **Checkpoint C1 is `pnpm db:push` only, no seed** (shared dev DB). `avatarCloudinaryId` is optional, without index.

### Verified behavior

- **Every task's code was written and run in a throwaway clone while planning** (from `82c2ea9`, one commit per planned commit): server code passed `tsc --noEmit` and `biome check`, and the unit test counts below are measured, including the intermediate commits of Tasks 4 and 6 (`193` and `208`); client code passed `tsc -b` and `biome check`. Every function was measured at 30 lines or fewer. **Bruno counts are read from the files: the API was not started while planning** (the clone could not run `tsx`). The implementer confirms them on the first run of Tasks 1, 3, 5 and 7.
- **Baselines (on `feat/account-profile` at 82c2ea9):** `pnpm test` → `Test Files  14 passed (14)`, `Tests  180 passed (180)`; Bruno: 87 requests, 186 assertions, 37 `test()` calls.
- **Bruno run order (CLI 4.2.0):** a sequenced folder is inserted at index `seq - 1`. Top level: `auth` (1), `invitations` (2), `friendships` (3), `account` (4, new), `photos` after. Inside `account/`: `rename` (1), `password` (2), `avatar` (3).
- **Bruno scripts (verified in steps 3 to 5):** top-level `await axios…` works in pre-request scripts; `req.deleteHeader('Cookie')` removes the collection cookie; a script request (axios) does not get the collection headers; the `isNull` assertion exists.
- **Express 5:** without a body parser `req.body` is `undefined`; `express.json()` on one route throws `BODY_INVALID` (400) on a malformed body. Multer's `LIMIT_UNEXPECTED_FILE` on a wrong field name maps to `UPLOAD_INVALID` through the existing error handler.
- **Prisma 6 on MongoDB:** an optional scalar absent from the document reads back as `null`; `updateMany`/`deleteMany` return `{ count }`.

## File Map

| File | Task | Responsibility |
| --- | --- | --- |
| `server/prisma/schema.prisma` | 1 | `User.avatarCloudinaryId String?` |
| `server/src/lib/cloudinary.ts` | 1, 6 | `avatarUrl`; `uploadAvatar` and the private `uploadToFolder` |
| `server/src/types.ts`, `client/src/auth/user.ts`, `client/src/friendship.ts` | 1, 4 | `avatarUrl` on `PublicUser` / `FriendUser` and guards; `PASSWORD_INCORRECT` |
| `server/src/features/auth/public-user.ts` (+ test) | 1 | `AvatarUrlBuilder`, `toAvatarUrl`, `toPublicUser` |
| `server/src/features/auth/auth.service.ts` (+ test), `auth.middleware.ts`, `auth.guard.ts` (+ test) | 1, 4 | `avatarUrl` dep; `sessionId`, `currentSessionId` |
| `server/src/features/invitations/invitations.service.ts` (+ tests) | 1, 2 | `avatarUrl` dep; rules moved out |
| `server/src/features/friendships/friendships.{repository,service}.ts` (+ tests) | 1 | `avatarCloudinaryId` selected, `avatarUrl` mapped |
| `server/src/lib/account-input.ts` | 2 | display name and password rules |
| `server/src/features/account/account.repository.ts` | 2, 4, 6 | user reads and writes, other sessions |
| `server/src/features/account/account.service.ts` | 2, 4, 6 | the four account rules |
| `server/src/features/account/account.service{,.password,.avatar}.test.ts` | 2, 4, 6 | unit tests |
| `server/src/features/account/account.{controller,routes}.ts` | 3, 5, 7 | handlers and routes |
| `server/src/app.ts` | 1, 3, 4, 6 | wiring |
| `server/src/errors/error-handler.ts` (+ test), `client/src/api.ts` | 4 | `PASSWORD_INCORRECT` |
| `server/src/lib/image.ts` (+ test) | 6 | `toAvatarJpeg` |
| `server/bruno/account/**`, `server/bruno/collection.bru`, `auth/`, `invitations/accept/05`, `friendships/` | 1, 3, 5, 7 | Bruno requests and docs |
| `client/src/auth/accountRules.ts`, `components/auth/InviteForm.tsx` | 2, 8 | shared form rules (comment in Task 2) |
| `client/src/accountApi.ts`, `hooks/useAccountSave.ts` | 8, 9 | account calls, per card save state |
| `client/src/auth/{authApi.ts,AuthContext.ts,AuthProvider.tsx}` | 8 | `readUser` export, `replaceUser` |
| `client/src/components/auth/{UserAvatar,UserBadge,UserMenu}.tsx`, `friends/FriendshipRow.tsx`, `nav/MobileNav.tsx`, `form/TextField.tsx` | 8 | photo in avatars, « Préférences » entries |
| `client/src/components/settings/*.tsx`, `pages/SettingsPage.tsx`, `App.tsx` | 8, 9 | the page and its cards |
| `ARCHITECTURE.md`, `README.md` | 1, 2, 3, 5, 7, 8, 9 | docs per task |

## Stack and branches (controller only)

- **PR A `feat/account-profile`**: already checked out (on top of #69), holds the spec (f5c8339) and this plan. Tasks 1-3.
- **Checkpoint C1** after Task 1: `pnpm db:push` (no seed).
- **Before Task 4:** `gh stack add feat/account-password` (PR B). Tasks 4-5.
- **Before Task 6:** `gh stack add feat/account-avatar` (PR C). Tasks 6-7.
- **Before Task 8:** `gh stack add feat/client-settings` (PR D). Tasks 8-9.
- After the final review: `gh stack submit --auto` (draft PRs), then `gh stack view --json`.

---

## PR A — `feat/account-profile`

### Task 1: An avatar URL on every user, server and client (PR A, `feat/account-profile`)

**Files:**
- Modify: `server/prisma/schema.prisma`, `server/src/lib/cloudinary.ts`, `server/src/types.ts`
- Create: `server/src/features/auth/public-user.ts`, `server/src/features/auth/public-user.test.ts`
- Modify: `server/src/features/auth/auth.service.ts`, `server/src/features/invitations/invitations.service.ts`, `server/src/features/friendships/friendships.repository.ts`, `server/src/features/friendships/friendships.service.ts`, `server/src/app.ts`
- Modify (tests): `auth.service.test.ts`, `auth.guard.test.ts`, `invitations.service.test.ts`, `invitations.service.accept.test.ts`, `friendships.service.test.ts`, `friendships.service.respond.test.ts`
- Modify: `client/src/auth/user.ts`, `client/src/friendship.ts`
- Modify (Bruno): `auth/me/01-nominal.bru`, `auth/folder.bru`, `invitations/accept/05-nominal.bru`, `friendships/list/01-nominal-membre.bru`, `friendships/folder.bru`
- Modify: `ARCHITECTURE.md` (API, Couches du backend, Données)

**Interfaces:**
- Produces (used by Tasks 2-9):
  ```ts
  // server/src/features/auth/public-user.ts
  export type AvatarUrlBuilder = (cloudinaryId: string) => string
  export function toAvatarUrl(avatarCloudinaryId: string | null, avatarUrl: AvatarUrlBuilder): string | null
  export function toPublicUser(user: User, avatarUrl: AvatarUrlBuilder): PublicUser
  // server/src/lib/cloudinary.ts
  export function avatarUrl(cloudinaryId: string): string
  // server/src/types.ts and client copies
  export type PublicUser = { id: string; email: string; displayName: string; role: UserRole; avatarUrl: string | null }
  export type FriendUser = { id: string; displayName: string; email: string; avatarUrl: string | null }
  // friendships.repository.ts
  export type FriendshipParty = FriendshipRecord['requester'] // { id, displayName, email, avatarCloudinaryId }
  ```
- `AuthServiceDeps`, `InvitationsServiceDeps` and `FriendshipsServiceDeps` gain `avatarUrl: AvatarUrlBuilder`.

- [ ] **Step 1: Baselines**

From the repo root on `feat/account-profile`: `pnpm test` → `Test Files  14 passed (14)` and `Tests  180 passed (180)`. Bruno (with the test API, see below): 87 requests, 186 assertions, 37 `test()` calls, all passed. If a number differs, write it in the Drift Log and shift every expected count of this plan by the same difference.

- [ ] **Step 2: The schema field, then regenerate the Prisma client**

Modify `server/prisma/schema.prisma`:

```diff
--- a/server/prisma/schema.prisma
+++ b/server/prisma/schema.prisma
@@ -23,6 +23,8 @@ model User {
   displayName            String
   passwordHash           String
   role                   Role         @default(member)
+  // null until the account picks a profile photo; the image lives on Cloudinary.
+  avatarCloudinaryId     String?
   createdAt              DateTime     @default(now())
   sessions               Session[]
   photos                 Photo[]      @relation("PhotoOwner")
```

Run: `pnpm --filter server db:generate`. Expected: `Generated Prisma Client`. (No `db:push` here: the controller runs it at checkpoint C1.)

- [ ] **Step 3: Write the tests first**

Create `server/src/features/auth/public-user.test.ts`:

```ts
import type { User } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { type AvatarUrlBuilder, toPublicUser } from './public-user.js'

const USER: User = {
  id: '6b044f9d56a44767c7079b01',
  email: 'membre@familyframe.test',
  displayName: 'Membre',
  passwordHash: '$argon2id$stored-hash',
  role: 'member',
  avatarCloudinaryId: null,
  createdAt: new Date('2026-11-01T10:00:00Z'),
}

function fakeAvatarUrl() {
  return vi.fn<AvatarUrlBuilder>((cloudinaryId) => `https://cdn.test/${cloudinaryId}.jpg`)
}

describe('toPublicUser', () => {
  it('gives no avatar URL to an account without a profile photo', () => {
    const avatarUrl = fakeAvatarUrl()

    expect(toPublicUser(USER, avatarUrl)).toEqual({
      id: USER.id,
      email: USER.email,
      displayName: 'Membre',
      role: 'member',
      avatarUrl: null,
    })
    expect(avatarUrl).not.toHaveBeenCalled()
  })

  it('builds the avatar URL from the stored id, and sends neither the id nor the hash', () => {
    const user = toPublicUser(
      { ...USER, avatarCloudinaryId: 'familyframe/avatars/abc' },
      fakeAvatarUrl(),
    )

    expect(user.avatarUrl).toBe('https://cdn.test/familyframe/avatars/abc.jpg')
    expect(user).not.toHaveProperty('avatarCloudinaryId')
    expect(user).not.toHaveProperty('passwordHash')
  })
})
```

Modify `server/src/features/auth/auth.service.test.ts`:

```diff
--- a/server/src/features/auth/auth.service.test.ts
+++ b/server/src/features/auth/auth.service.test.ts
@@ -14,6 +14,7 @@ const USER: UserRecord = {
   displayName: 'Membre',
   passwordHash: '$argon2id$stored-hash',
   role: 'member',
+  avatarCloudinaryId: null,
   createdAt: new Date('2026-11-01T10:00:00Z'),
 }
 const PUBLIC_USER = {
@@ -21,6 +22,7 @@ const PUBLIC_USER = {
   email: 'membre@familyframe.test',
   displayName: 'Membre',
   role: 'member',
+  avatarUrl: null,
 }
 const CREDENTIALS = { email: 'membre@familyframe.test', password: 'secret' }
 
@@ -54,6 +56,9 @@ function makeDeps() {
     hashToken: vi.fn<AuthServiceDeps['hashToken']>().mockReturnValue(TOKEN_HASH),
     generateToken: vi.fn<AuthServiceDeps['generateToken']>().mockReturnValue(TOKEN),
     verifyPassword: vi.fn<AuthServiceDeps['verifyPassword']>().mockResolvedValue(true),
+    avatarUrl: vi.fn<AuthServiceDeps['avatarUrl']>(
+      (cloudinaryId) => `https://cdn.test/${cloudinaryId}`,
+    ),
     now: vi.fn<AuthServiceDeps['now']>().mockReturnValue(NOW),
     logger: {
       info: vi.fn<Logger['info']>(),
```

Modify `server/src/features/auth/auth.guard.test.ts`:

```diff
--- a/server/src/features/auth/auth.guard.test.ts
+++ b/server/src/features/auth/auth.guard.test.ts
@@ -8,12 +8,14 @@ const ADMIN: PublicUser = {
   email: 'admin@familyframe.test',
   displayName: 'Admin',
   role: 'admin',
+  avatarUrl: null,
 }
 const MEMBER: PublicUser = {
   id: '6b044f9d56a44767c7079b02',
   email: 'membre@familyframe.test',
   displayName: 'Membre',
   role: 'member',
+  avatarUrl: null,
 }
 
 // The guard only reads req.user: a plain object stands in for the Express request.
```

Modify `server/src/features/invitations/invitations.service.test.ts`:

```diff
--- a/server/src/features/invitations/invitations.service.test.ts
+++ b/server/src/features/invitations/invitations.service.test.ts
@@ -46,6 +46,7 @@ function makeDeps() {
     generateToken: vi.fn<InvitationsServiceDeps['generateToken']>().mockReturnValue(TOKEN),
     hashToken: vi.fn<InvitationsServiceDeps['hashToken']>().mockReturnValue(TOKEN_HASH),
     hashPassword: vi.fn<InvitationsServiceDeps['hashPassword']>(),
+    avatarUrl: vi.fn<InvitationsServiceDeps['avatarUrl']>(),
     now: vi.fn<InvitationsServiceDeps['now']>().mockReturnValue(NOW),
     logger: {
       info: vi.fn<Logger['info']>(),
```

Modify `server/src/features/invitations/invitations.service.accept.test.ts`:

```diff
--- a/server/src/features/invitations/invitations.service.accept.test.ts
+++ b/server/src/features/invitations/invitations.service.accept.test.ts
@@ -24,6 +24,7 @@ const NEW_USER: UserRecord = {
   displayName: 'Mamie',
   passwordHash: PASSWORD_HASH,
   role: 'member',
+  avatarCloudinaryId: null,
   createdAt: NOW,
 }
 const ACCEPTANCE: InvitationAcceptance = { token: TOKEN, displayName: 'Mamie', password: PASSWORD }
@@ -59,6 +60,7 @@ function makeDeps() {
     generateToken: vi.fn<InvitationsServiceDeps['generateToken']>(),
     hashToken: vi.fn<InvitationsServiceDeps['hashToken']>().mockReturnValue(TOKEN_HASH),
     hashPassword: vi.fn<InvitationsServiceDeps['hashPassword']>().mockResolvedValue(PASSWORD_HASH),
+    avatarUrl: vi.fn<InvitationsServiceDeps['avatarUrl']>(),
     now: vi.fn<InvitationsServiceDeps['now']>().mockReturnValue(NOW),
     logger: {
       info: vi.fn<Logger['info']>(),
@@ -190,7 +192,13 @@ describe('acceptInvitation: the account', () => {
       passwordHash: PASSWORD_HASH,
     })
     expect(deps.repository.markUsed).toHaveBeenCalledWith(INVITATION_ID, NOW)
-    expect(user).toEqual({ id: NEW_USER.id, email: EMAIL, displayName: 'Mamie', role: 'member' })
+    expect(user).toEqual({
+      id: NEW_USER.id,
+      email: EMAIL,
+      displayName: 'Mamie',
+      role: 'member',
+      avatarUrl: null,
+    })
   })
 
   it('rejects an address that got an account meanwhile, leaving the invitation unused', async () => {
```

Modify `server/src/features/friendships/friendships.service.test.ts`:

```diff
--- a/server/src/features/friendships/friendships.service.test.ts
+++ b/server/src/features/friendships/friendships.service.test.ts
@@ -1,13 +1,33 @@
 import { describe, expect, it, vi } from 'vitest'
 import type { Logger } from '../../lib/logger.js'
-import type { FriendshipRecord, FriendshipsRepository } from './friendships.repository.js'
-import { createFriendshipsService } from './friendships.service.js'
+import type { FriendUser } from '../../types.js'
+import type {
+  FriendshipParty,
+  FriendshipRecord,
+  FriendshipsRepository,
+} from './friendships.repository.js'
+import { createFriendshipsService, type FriendshipsServiceDeps } from './friendships.service.js'
 
 const CREATED_AT = new Date('2026-11-24T10:00:00Z')
-const MEMBER = { id: '6b044f9d56a44767c7079b02', email: 'membre@example.fr', displayName: 'Membre' }
-const MAMIE = { id: '6b044f9d56a44767c7079b05', email: 'mamie@example.fr', displayName: 'Mamie' }
+const MEMBER: FriendshipParty = {
+  id: '6b044f9d56a44767c7079b02',
+  email: 'membre@example.fr',
+  displayName: 'Membre',
+  avatarCloudinaryId: null,
+}
+const MAMIE: FriendshipParty = {
+  id: '6b044f9d56a44767c7079b05',
+  email: 'mamie@example.fr',
+  displayName: 'Mamie',
+  avatarCloudinaryId: null,
+}
 const FRIENDSHIP_ID = '6b044f9d56a44767c7079f01'
 
+// What the client gets of a party without a profile photo.
+function friendUser({ id, email, displayName }: FriendshipParty): FriendUser {
+  return { id, displayName, email, avatarUrl: null }
+}
+
 // The member asked Mamie by default; each test changes only what it is about.
 function friendshipRecord(overrides: Partial<FriendshipRecord> = {}): FriendshipRecord {
   return {
@@ -36,6 +56,9 @@ function makeDeps() {
       acceptReceived: vi.fn<FriendshipsRepository['acceptReceived']>(),
       deleteOf: vi.fn<FriendshipsRepository['deleteOf']>(),
     },
+    avatarUrl: vi.fn<FriendshipsServiceDeps['avatarUrl']>(
+      (cloudinaryId) => `https://cdn.test/${cloudinaryId}`,
+    ),
     logger: {
       info: vi.fn<Logger['info']>(),
       warn: vi.fn<Logger['warn']>(),
@@ -70,7 +93,11 @@ describe('requestFriendship', () => {
       addresseeId: MAMIE.id,
     })
     expect(friendship).toEqual({
-      friendship: { id: FRIENDSHIP_ID, user: MAMIE, createdAt: CREATED_AT.toISOString() },
+      friendship: {
+        id: FRIENDSHIP_ID,
+        user: friendUser(MAMIE),
+        createdAt: CREATED_AT.toISOString(),
+      },
       isAccepted: false,
     })
   })
@@ -149,7 +176,11 @@ describe('requestFriendship', () => {
     expect(deps.repository.acceptReceived).toHaveBeenCalledWith(FRIENDSHIP_ID, MEMBER.id)
     expect(deps.repository.create).not.toHaveBeenCalled()
     expect(outcome).toEqual({
-      friendship: { id: FRIENDSHIP_ID, user: MAMIE, createdAt: CREATED_AT.toISOString() },
+      friendship: {
+        id: FRIENDSHIP_ID,
+        user: friendUser(MAMIE),
+        createdAt: CREATED_AT.toISOString(),
+      },
       isAccepted: true,
     })
     expect(deps.logger.info).toHaveBeenCalledWith('friendship.accepted', {
@@ -193,8 +224,8 @@ describe('requestFriendship', () => {
 describe('listFriendships', () => {
   it('puts each record in its list, with the other side as user', async () => {
     const deps = makeDeps()
-    const PAPI = { id: '6b044f9d56a44767c7079b07', email: 'papi@example.fr', displayName: 'Papi' }
-    const TATA = { id: '6b044f9d56a44767c7079b08', email: 'tata@example.fr', displayName: 'Tata' }
+    const PAPI = { ...MAMIE, id: '6b044f9d56a44767c7079b07', displayName: 'Papi' }
+    const TATA = { ...MAMIE, id: '6b044f9d56a44767c7079b08', displayName: 'Tata' }
     const outgoing = friendshipRecord()
     const incoming = friendshipRecord({
       id: '6b044f9d56a44767c7079f02',
@@ -216,9 +247,22 @@ describe('listFriendships', () => {
     expect(deps.repository.findAllOf).toHaveBeenCalledWith(MEMBER.id)
     const createdAt = CREATED_AT.toISOString()
     expect(list).toEqual({
-      friends: [{ id: '6b044f9d56a44767c7079f03', user: TATA, createdAt }],
-      incoming: [{ id: '6b044f9d56a44767c7079f02', user: PAPI, createdAt }],
-      outgoing: [{ id: FRIENDSHIP_ID, user: MAMIE, createdAt }],
+      friends: [{ id: '6b044f9d56a44767c7079f03', user: friendUser(TATA), createdAt }],
+      incoming: [{ id: '6b044f9d56a44767c7079f02', user: friendUser(PAPI), createdAt }],
+      outgoing: [{ id: FRIENDSHIP_ID, user: friendUser(MAMIE), createdAt }],
+    })
+  })
+
+  it("gives the other side's avatar URL, never its Cloudinary id", async () => {
+    const deps = makeDeps()
+    const addressee = { ...MAMIE, avatarCloudinaryId: 'familyframe/avatars/abc' }
+    deps.repository.findAllOf.mockResolvedValue([friendshipRecord({ addressee })])
+
+    const { outgoing } = await createFriendshipsService(deps).listFriendships(MEMBER.id)
+
+    expect(outgoing[0]?.user).toEqual({
+      ...friendUser(MAMIE),
+      avatarUrl: 'https://cdn.test/familyframe/avatars/abc',
     })
   })
 })
```

Modify `server/src/features/friendships/friendships.service.respond.test.ts`:

```diff
--- a/server/src/features/friendships/friendships.service.respond.test.ts
+++ b/server/src/features/friendships/friendships.service.respond.test.ts
@@ -1,10 +1,24 @@
 import { describe, expect, it, vi } from 'vitest'
 import type { Logger } from '../../lib/logger.js'
-import type { FriendshipRecord, FriendshipsRepository } from './friendships.repository.js'
-import { createFriendshipsService } from './friendships.service.js'
-
-const MEMBER = { id: '6b044f9d56a44767c7079b02', email: 'membre@example.fr', displayName: 'Membre' }
-const MAMIE = { id: '6b044f9d56a44767c7079b05', email: 'mamie@example.fr', displayName: 'Mamie' }
+import type {
+  FriendshipParty,
+  FriendshipRecord,
+  FriendshipsRepository,
+} from './friendships.repository.js'
+import { createFriendshipsService, type FriendshipsServiceDeps } from './friendships.service.js'
+
+const MEMBER: FriendshipParty = {
+  id: '6b044f9d56a44767c7079b02',
+  email: 'membre@example.fr',
+  displayName: 'Membre',
+  avatarCloudinaryId: null,
+}
+const MAMIE: FriendshipParty = {
+  id: '6b044f9d56a44767c7079b05',
+  email: 'mamie@example.fr',
+  displayName: 'Mamie',
+  avatarCloudinaryId: null,
+}
 const FRIENDSHIP_ID = '6b044f9d56a44767c7079f01'
 
 // The member asked Mamie by default; each test changes only what it is about.
@@ -35,6 +49,7 @@ function makeDeps() {
         .mockResolvedValue(friendshipRecord({ status: 'accepted' })),
       deleteOf: vi.fn<FriendshipsRepository['deleteOf']>().mockResolvedValue(friendshipRecord()),
     },
+    avatarUrl: vi.fn<FriendshipsServiceDeps['avatarUrl']>(),
     logger: {
       info: vi.fn<Logger['info']>(),
       warn: vi.fn<Logger['warn']>(),
@@ -81,7 +96,7 @@ describe('acceptFriendship', () => {
 
     expect(friendship).toEqual({
       id: FRIENDSHIP_ID,
-      user: MEMBER,
+      user: { id: MEMBER.id, displayName: 'Membre', email: MEMBER.email, avatarUrl: null },
       createdAt: '2026-11-24T10:00:00.000Z',
     })
     expect(deps.logger.info).toHaveBeenCalledWith('friendship.accepted', {
```

Run: `pnpm test`. Expected: FAIL, `public-user.test.ts` cannot import `./public-user.js`, and the type errors do not stop Vitest but the auth and friendships tests that expect `avatarUrl` fail (`toEqual` mismatches).

- [ ] **Step 4: The code**

Modify `server/prisma/schema.prisma`:

```diff
--- a/server/prisma/schema.prisma
+++ b/server/prisma/schema.prisma
@@ -23,6 +23,8 @@ model User {
   displayName            String
   passwordHash           String
   role                   Role         @default(member)
+  // null until the account picks a profile photo; the image lives on Cloudinary.
+  avatarCloudinaryId     String?
   createdAt              DateTime     @default(now())
   sessions               Session[]
   photos                 Photo[]      @relation("PhotoOwner")
```

Modify `server/src/lib/cloudinary.ts`:

```diff
--- a/server/src/lib/cloudinary.ts
+++ b/server/src/lib/cloudinary.ts
@@ -61,3 +61,8 @@ export function deliveryUrls(cloudinaryId: string): DeliveryUrls {
     thumbnailUrl: deliveryUrl(cloudinaryId, [thumbnail, OPTIMIZED_DELIVERY]),
   }
 }
+
+// toAvatarJpeg already made it a 256 px square: only the format and the compression change.
+export function avatarUrl(cloudinaryId: string): string {
+  return deliveryUrl(cloudinaryId, [OPTIMIZED_DELIVERY])
+}
```

Modify `server/src/types.ts`:

```diff
--- a/server/src/types.ts
+++ b/server/src/types.ts
@@ -34,12 +34,14 @@ export type ApiError = { error: ApiErrorCode }
 
 export type UserRole = 'member' | 'admin'
 
-// What the API says about a user: never the password hash.
+// What the API says about a user: never the password hash. avatarUrl is null until the account
+// picks a profile photo.
 export type PublicUser = {
   id: string
   email: string
   displayName: string
   role: UserRole
+  avatarUrl: string | null
 }
 
 export type InvitationStatus = 'pending' | 'used' | 'expired'
@@ -64,6 +66,7 @@ export type FriendUser = {
   id: string
   displayName: string
   email: string
+  avatarUrl: string | null
 }
 
 // id is the friendship's, user the other side; createdAt is an ISO 8601 string.
```

Create `server/src/features/auth/public-user.ts`:

```ts
import type { User } from '@prisma/client'
import type { PublicUser } from '../../types.js'

// lib/cloudinary.ts's avatarUrl, injected: a service test runs without the Cloudinary settings.
export type AvatarUrlBuilder = (cloudinaryId: string) => string

export function toAvatarUrl(
  avatarCloudinaryId: string | null,
  avatarUrl: AvatarUrlBuilder,
): string | null {
  return avatarCloudinaryId === null ? null : avatarUrl(avatarCloudinaryId)
}

// The password hash and the Cloudinary id never leave the server: the client gets a ready URL.
export function toPublicUser(user: User, avatarUrl: AvatarUrlBuilder): PublicUser {
  const { id, email, displayName, role, avatarCloudinaryId } = user
  return { id, email, displayName, role, avatarUrl: toAvatarUrl(avatarCloudinaryId, avatarUrl) }
}
```

Modify `server/src/features/auth/auth.service.ts`:

```diff
--- a/server/src/features/auth/auth.service.ts
+++ b/server/src/features/auth/auth.service.ts
@@ -3,6 +3,7 @@ import type { Logger } from '../../lib/logger.js'
 import { DUMMY_PASSWORD_HASH } from '../../lib/password.js'
 import type { PublicUser } from '../../types.js'
 import type { AuthRepository, SessionWithUser, UserRecord } from './auth.repository.js'
+import { type AvatarUrlBuilder, toPublicUser } from './public-user.js'
 
 const DAY_MS = 24 * 60 * 60 * 1000
 const SESSION_DURATION_MS = 90 * DAY_MS
@@ -23,6 +24,7 @@ export type AuthServiceDeps = {
   hashToken: (token: string) => string
   generateToken: () => string
   verifyPassword: (passwordHash: string, plain: string) => Promise<boolean>
+  avatarUrl: AvatarUrlBuilder
   now: () => Date
   logger: Logger
 }
@@ -35,11 +37,6 @@ export type AuthService = {
   authenticateAndSlide: (token: string | null) => Promise<AuthenticatedSession>
 }
 
-// The password hash never leaves the service.
-function toPublicUser({ id, email, displayName, role }: UserRecord): PublicUser {
-  return { id, email, displayName, role }
-}
-
 function isFilledString(value: unknown): value is string {
   return typeof value === 'string' && value.length > 0
 }
@@ -100,7 +97,7 @@ async function login(deps: AuthServiceDeps, credentials: Credentials): Promise<L
   const user = await findUserByCredentials(deps, credentials)
   const { token, expiresAt } = await openSession(deps, user.id)
   deps.logger.info('auth.login_succeeded', { userId: user.id })
-  return { user: toPublicUser(user), token, expiresAt }
+  return { user: toPublicUser(user, deps.avatarUrl), token, expiresAt }
 }
 
 // Idempotent: logging out without a session, or twice, is not an error.
@@ -124,7 +121,8 @@ async function authenticate(
   token: string | null,
 ): Promise<AuthenticatedSession> {
   const session = await findValidSession(deps, token)
-  return { user: toPublicUser(session.user), expiresAt: session.expiresAt, isRenewed: false }
+  const user = toPublicUser(session.user, deps.avatarUrl)
+  return { user, expiresAt: session.expiresAt, isRenewed: false }
 }
 
 async function authenticateAndSlide(
@@ -132,13 +130,14 @@ async function authenticateAndSlide(
   token: string | null,
 ): Promise<AuthenticatedSession> {
   const session = await findValidSession(deps, token)
+  const user = toPublicUser(session.user, deps.avatarUrl)
   const remainingMs = session.expiresAt.getTime() - deps.now().getTime()
   if (remainingMs >= RENEWAL_THRESHOLD_MS) {
-    return { user: toPublicUser(session.user), expiresAt: session.expiresAt, isRenewed: false }
+    return { user, expiresAt: session.expiresAt, isRenewed: false }
   }
   const expiresAt = sessionEnd(deps)
   await deps.repository.extendSession(session.id, expiresAt)
-  return { user: toPublicUser(session.user), expiresAt, isRenewed: true }
+  return { user, expiresAt, isRenewed: true }
 }
 
 export function createAuthService(deps: AuthServiceDeps): AuthService {
```

Modify `server/src/features/invitations/invitations.service.ts`:

```diff
--- a/server/src/features/invitations/invitations.service.ts
+++ b/server/src/features/invitations/invitations.service.ts
@@ -2,11 +2,8 @@ import { AppError } from '../../errors/app-error.js'
 import { parseEmail } from '../../lib/email.js'
 import type { Logger } from '../../lib/logger.js'
 import type { CreatedInvitation, Invitation, InvitationStatus, PublicUser } from '../../types.js'
-import type {
-  InvitationRecord,
-  InvitationsRepository,
-  UserRecord,
-} from './invitations.repository.js'
+import { type AvatarUrlBuilder, toPublicUser } from '../auth/public-user.js'
+import type { InvitationRecord, InvitationsRepository } from './invitations.repository.js'
 
 const DAY_MS = 24 * 60 * 60 * 1000
 export const INVITATION_DURATION_MS = 7 * DAY_MS
@@ -29,6 +26,7 @@ export type InvitationsServiceDeps = {
   generateToken: () => string
   hashToken: (token: string) => string
   hashPassword: (plain: string) => Promise<string>
+  avatarUrl: AvatarUrlBuilder
   now: () => Date
   logger: Logger
 }
@@ -81,11 +79,6 @@ function toInvitation(record: InvitationRecord, now: Date): Invitation {
   }
 }
 
-// The password hash never leaves the service.
-function toPublicUser({ id, email, displayName, role }: UserRecord): PublicUser {
-  return { id, email, displayName, role }
-}
-
 async function createInvitation(
   { repository, generateToken, hashToken, now, logger }: InvitationsServiceDeps,
   { email, invitedById }: NewInvitationInput,
@@ -161,7 +154,7 @@ async function acceptInvitation(
   }
   await repository.markUsed(invitation.id, now())
   logger.info('invitation.accepted', { invitationId: invitation.id, userId: user.id })
-  return toPublicUser(user)
+  return toPublicUser(user, deps.avatarUrl)
 }
 
 export function createInvitationsService(deps: InvitationsServiceDeps): InvitationsService {
```

Modify `server/src/features/friendships/friendships.repository.ts`:

```diff
--- a/server/src/features/friendships/friendships.repository.ts
+++ b/server/src/features/friendships/friendships.repository.ts
@@ -1,7 +1,12 @@
 import { Prisma, type PrismaClient } from '@prisma/client'
 
 // The other side's public fields only: the password hash never leaves the repository.
-const PARTY_FIELDS = { id: true, email: true, displayName: true } satisfies Prisma.UserSelect
+const PARTY_FIELDS = {
+  id: true,
+  email: true,
+  displayName: true,
+  avatarCloudinaryId: true,
+} satisfies Prisma.UserSelect
 const WITH_PARTIES = {
   requester: { select: PARTY_FIELDS },
   addressee: { select: PARTY_FIELDS },
@@ -9,6 +14,8 @@ const WITH_PARTIES = {
 
 export type FriendshipRecord = Prisma.FriendshipGetPayload<{ include: typeof WITH_PARTIES }>
 
+export type FriendshipParty = FriendshipRecord['requester']
+
 export type NewFriendship = { requesterId: string; addresseeId: string }
 
 export type FriendshipsRepository = {
```

Modify `server/src/features/friendships/friendships.service.ts`:

```diff
--- a/server/src/features/friendships/friendships.service.ts
+++ b/server/src/features/friendships/friendships.service.ts
@@ -1,8 +1,13 @@
 import { AppError } from '../../errors/app-error.js'
 import { parseEmail } from '../../lib/email.js'
 import type { Logger } from '../../lib/logger.js'
-import type { ApiErrorCode, Friendship, FriendshipList } from '../../types.js'
-import type { FriendshipRecord, FriendshipsRepository } from './friendships.repository.js'
+import type { ApiErrorCode, Friendship, FriendshipList, FriendUser } from '../../types.js'
+import { type AvatarUrlBuilder, toAvatarUrl } from '../auth/public-user.js'
+import type {
+  FriendshipParty,
+  FriendshipRecord,
+  FriendshipsRepository,
+} from './friendships.repository.js'
 
 // Prisma fails on an id that is not an ObjectId: that would be a 500, not a 404.
 const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i
@@ -29,6 +34,7 @@ type DeletionReason = 'removed' | 'cancelled' | 'refused'
 
 export type FriendshipsServiceDeps = {
   repository: FriendshipsRepository
+  avatarUrl: AvatarUrlBuilder
   logger: Logger
 }
 
@@ -41,11 +47,24 @@ export type FriendshipsService = {
   areFriends: (userId: string, otherUserId: string) => Promise<boolean>
 }
 
+// The Cloudinary id stays on the server: the client gets a ready URL.
+function toFriendUser(
+  { id, displayName, email, avatarCloudinaryId }: FriendshipParty,
+  avatarUrl: AvatarUrlBuilder,
+): FriendUser {
+  return { id, displayName, email, avatarUrl: toAvatarUrl(avatarCloudinaryId, avatarUrl) }
+}
+
 // user is the other side: whoever reads the friendship already knows who they are.
-function toFriendship(record: FriendshipRecord, userId: string): Friendship {
+function toFriendship(
+  record: FriendshipRecord,
+  userId: string,
+  avatarUrl: AvatarUrlBuilder,
+): Friendship {
+  const otherSide = record.requester.id === userId ? record.addressee : record.requester
   return {
     id: record.id,
-    user: record.requester.id === userId ? record.addressee : record.requester,
+    user: toFriendUser(otherSide, avatarUrl),
     createdAt: record.createdAt.toISOString(),
   }
 }
@@ -81,7 +100,7 @@ async function findAddresseeId(
 // The reverse request is accepted by the same atomic write as « Accepter »: null means it was
 // cancelled or answered in between.
 async function acceptReverseRequest(
-  { repository, logger }: FriendshipsServiceDeps,
+  { repository, avatarUrl, logger }: FriendshipsServiceDeps,
   reverse: FriendshipRecord,
   requesterId: string,
 ): Promise<FriendRequestOutcome> {
@@ -90,11 +109,11 @@ async function acceptReverseRequest(
     throw refusal(logger, 'request_exists', requesterId)
   }
   logger.info('friendship.accepted', { friendshipId: record.id, userId: requesterId })
-  return { friendship: toFriendship(record, requesterId), isAccepted: true }
+  return { friendship: toFriendship(record, requesterId, avatarUrl), isAccepted: true }
 }
 
 async function createRequest(
-  { repository, logger }: FriendshipsServiceDeps,
+  { repository, avatarUrl, logger }: FriendshipsServiceDeps,
   requesterId: string,
   addresseeId: string,
 ): Promise<FriendRequestOutcome> {
@@ -104,7 +123,7 @@ async function createRequest(
     throw refusal(logger, 'request_exists', requesterId)
   }
   logger.info('friendship.requested', { friendshipId: record.id, userId: requesterId })
-  return { friendship: toFriendship(record, requesterId), isAccepted: false }
+  return { friendship: toFriendship(record, requesterId, avatarUrl), isAccepted: false }
 }
 
 // Asking someone who already asked me means yes: the request accepts theirs.
@@ -128,12 +147,12 @@ async function requestFriendship(
 }
 
 async function listFriendships(
-  { repository }: FriendshipsServiceDeps,
+  { repository, avatarUrl }: FriendshipsServiceDeps,
   userId: string,
 ): Promise<FriendshipList> {
   const records = await repository.findAllOf(userId)
   const toFriendships = (selected: FriendshipRecord[]): Friendship[] =>
-    selected.map((record) => toFriendship(record, userId))
+    selected.map((record) => toFriendship(record, userId, avatarUrl))
   const pendingRecords = records.filter(({ status }) => status === 'pending')
   return {
     friends: toFriendships(records.filter(({ status }) => status === 'accepted')),
@@ -169,7 +188,7 @@ async function deleteFriendship(
 // Filtered on the addressee and the pending status: one atomic write, no read-then-write race,
 // and the requester cannot accept their own request.
 async function acceptFriendship(
-  { repository, logger }: FriendshipsServiceDeps,
+  { repository, avatarUrl, logger }: FriendshipsServiceDeps,
   { id, userId }: FriendshipAction,
 ): Promise<Friendship> {
   const record = await repository.acceptReceived(parseFriendshipId(id), userId)
@@ -177,7 +196,7 @@ async function acceptFriendship(
     throw new AppError('FRIENDSHIP_NOT_FOUND')
   }
   logger.info('friendship.accepted', { friendshipId: record.id, userId })
-  return toFriendship(record, userId)
+  return toFriendship(record, userId, avatarUrl)
 }
 
 async function areFriends(
```

Modify `server/src/app.ts`:

```diff
--- a/server/src/app.ts
+++ b/server/src/app.ts
@@ -24,7 +24,7 @@ import { createPhotosController } from './features/photos/photos.controller.js'
 import { createPhotosRepository } from './features/photos/photos.repository.js'
 import { createPhotosRouter } from './features/photos/photos.routes.js'
 import { createPhotosService, type PhotosServiceDeps } from './features/photos/photos.service.js'
-import { deleteImage, uploadImage } from './lib/cloudinary.js'
+import { avatarUrl, deleteImage, uploadImage } from './lib/cloudinary.js'
 import { prisma } from './lib/db.js'
 import { toFrameJpeg } from './lib/image.js'
 import { logger } from './lib/logger.js'
@@ -40,6 +40,7 @@ export function assembleAuthService(): AuthService {
     hashToken,
     generateToken,
     verifyPassword,
+    avatarUrl,
     now: () => new Date(),
     logger,
   })
@@ -63,6 +64,7 @@ function assemblePhotosRouter(
 function assembleFriendshipsService(): FriendshipsService {
   return createFriendshipsService({
     repository: createFriendshipsRepository(prisma),
+    avatarUrl,
     logger,
   })
 }
@@ -81,6 +83,7 @@ function assembleInvitationsRouter(
     generateToken,
     hashToken,
     hashPassword,
+    avatarUrl,
     now: () => new Date(),
     logger,
   })
```

Modify `client/src/auth/user.ts`:

```diff
--- a/client/src/auth/user.ts
+++ b/client/src/auth/user.ts
@@ -1,11 +1,13 @@
 // Copy of server/src/types.ts, see why there. Keep both in sync.
 export type UserRole = 'member' | 'admin'
 
+// avatarUrl is null until the account picks a profile photo.
 export type PublicUser = {
   id: string
   email: string
   displayName: string
   role: UserRole
+  avatarUrl: string | null
 }
 
 const USER_ROLES: readonly UserRole[] = ['member', 'admin']
@@ -21,6 +23,8 @@ export function isPublicUser(value: unknown): value is PublicUser {
     'displayName' in value &&
     typeof value.displayName === 'string' &&
     'role' in value &&
-    USER_ROLES.some((role) => role === value.role)
+    USER_ROLES.some((role) => role === value.role) &&
+    'avatarUrl' in value &&
+    (value.avatarUrl === null || typeof value.avatarUrl === 'string')
   )
 }
```

Modify `client/src/friendship.ts`:

```diff
--- a/client/src/friendship.ts
+++ b/client/src/friendship.ts
@@ -3,6 +3,7 @@ export type FriendUser = {
   id: string
   displayName: string
   email: string
+  avatarUrl: string | null
 }
 
 // id is the friendship's, user the other side; createdAt is an ISO 8601 string.
@@ -27,7 +28,9 @@ function isFriendUser(value: unknown): value is FriendUser {
     'displayName' in value &&
     typeof value.displayName === 'string' &&
     'email' in value &&
-    typeof value.email === 'string'
+    typeof value.email === 'string' &&
+    'avatarUrl' in value &&
+    (value.avatarUrl === null || typeof value.avatarUrl === 'string')
   )
 }
 
```

- [ ] **Step 5: Bruno**

Modify `server/bruno/auth/me/01-nominal.bru`:

```diff
--- a/server/bruno/auth/me/01-nominal.bru
+++ b/server/bruno/auth/me/01-nominal.bru
@@ -15,8 +15,18 @@ assert {
   res.body.user.email: eq {{memberEmail}}
   res.body.user.role: eq member
   res.body.user.passwordHash: isUndefined
+  res.body.user.avatarCloudinaryId: isUndefined
+}
+
+script:post-response {
+  test('avatarUrl : null, ou une URL Cloudinary si le membre a choisi une photo', () => {
+    const { avatarUrl } = res.body.user
+    expect(avatarUrl === null || avatarUrl.startsWith('https://res.cloudinary.com/')).to.equal(true)
+  })
 }
 
 docs {
-  NOMINAL → 200 `{ user }`, avec le cookie rangé par `login/01`.
+  NOMINAL → 200 `{ user }`, avec le cookie rangé par `login/01`. `avatarUrl`
+  n'est pas comparé à `null` : la base de dev est partagée, le membre peut y
+  avoir choisi une photo de profil. L'id Cloudinary ne sort jamais.
 }
```

Modify `server/bruno/auth/folder.bru`:

```diff
--- a/server/bruno/auth/folder.bru
+++ b/server/bruno/auth/folder.bru
@@ -14,6 +14,7 @@ docs {
   `environments/Local.bru`. Le membre est le compte de toutes les requêtes ;
   l'admin crée les invitations (`invitations/`) et sert à vérifier qu'un
   compte ne touche pas aux photos d'un autre.
-  Un utilisateur renvoyé par l'API vaut `{ id, email, displayName, role }`,
-  jamais le hash du mot de passe.
+  Un utilisateur renvoyé par l'API vaut `{ id, email, displayName, role,
+  avatarUrl }` (`avatarUrl` : `null` sans photo de profil), jamais le hash du
+  mot de passe ni l'id Cloudinary de la photo.
 }
```

Modify `server/bruno/invitations/accept/05-nominal.bru`:

```diff
--- a/server/bruno/invitations/accept/05-nominal.bru
+++ b/server/bruno/invitations/accept/05-nominal.bru
@@ -32,6 +32,7 @@ assert {
   res.body.user.displayName: eq Invitée
   res.body.user.role: eq member
   res.body.user.passwordHash: isUndefined
+  res.body.user.avatarUrl: isNull
 }
 
 script:post-response {
@@ -64,7 +65,7 @@ script:post-response {
 
 docs {
   NOMINAL → 201 `{ user }`, un compte `member` à l'adresse de l'invitation,
-  et un cookie `ff_session`. Le script vérifie que ce cookie ouvre bien une
+  sans photo de profil (`avatarUrl` à `null`), et un cookie `ff_session`. Le script vérifie que ce cookie ouvre bien une
   session du nouveau compte (`GET /api/auth/me`), puis que l'admin voit
   l'invitation « utilisée » (`GET /api/invitations`). Le cookie du nouveau
   compte va dans `inviteeCookie` : `friendships/` s'en sert comme tiers.
```

Modify `server/bruno/friendships/list/01-nominal-membre.bru`:

```diff
--- a/server/bruno/friendships/list/01-nominal-membre.bru
+++ b/server/bruno/friendships/list/01-nominal-membre.bru
@@ -29,9 +29,16 @@ script:post-response {
     expect(idsOf(res.body.incoming)).to.not.include(friendshipId)
     expect(idsOf(res.body.friends)).to.not.include(friendshipId)
   })
+  test('chaque compte listé a un avatarUrl, jamais son id Cloudinary', () => {
+    for (const { user } of res.body.outgoing) {
+      expect(user).to.have.property('avatarUrl')
+      expect(user).to.not.have.property('avatarCloudinaryId')
+    }
+  })
 }
 
 docs {
   NOMINAL → 200 : la demande de `create/01` est dans `outgoing` du membre,
-  ni dans `incoming` ni dans `friends`.
+  ni dans `incoming` ni dans `friends`. Chaque compte listé porte
+  `avatarUrl` (`null` sans photo de profil), jamais l'id Cloudinary.
 }
```

Modify `server/bruno/friendships/folder.bru`:

```diff
--- a/server/bruno/friendships/folder.bru
+++ b/server/bruno/friendships/folder.bru
@@ -12,7 +12,7 @@ docs {
 
   Une amitié renvoyée par l'API : `{ id, user, createdAt }`. `id` est celui
   de l'amitié (c'est lui qu'on accepte ou supprime), `user` l'autre compte,
-  `{ id, displayName, email }`, jamais son rôle ni le hash de son mot de
-  passe. La liste : `{ friends, incoming, outgoing }`. Le dossier finit sans
+  `{ id, displayName, email, avatarUrl }`, jamais son rôle, le hash de son
+  mot de passe ni l'id Cloudinary de sa photo. La liste : `{ friends, incoming, outgoing }`. Le dossier finit sans
   aucune amitié entre le membre et l'admin : on peut le relancer.
 }
```

- [ ] **Step 6: Gates**

Run from the repo root: `pnpm check` (expected: `Checked … files … No fixes applied.`), `pnpm typecheck` (no output besides the two package names), `pnpm test` (expected below). Expected: `Test Files  15 passed (15)`, `Tests  183 passed (183)` (+2 `public-user.test.ts`, +1 friendships).

Start the test API (Global Constraints, « Test API »): from `server/`, in its own background command, `PORT=3002 npx tsx --env-file-if-exists=.env src/server.ts`; wait for `server.started`. It does not watch files: restart it after each code change (stop it as described in Global Constraints).

From `server/bruno/`: `pnpm dlx @usebruno/cli@4.2.0 run . -r --env Local --disable-cookies --env-var baseUrl=http://localhost:3002`. Expected: 87 requests, 188 assertions, 39 `test()` calls, all passed. Run it a second time: same result.

- [ ] **Step 7: Commit**

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add server/prisma/schema.prisma server/src client/src/auth/user.ts client/src/friendship.ts server/bruno
git commit -F <message-file>
```

Message subject: `feat(server): send an avatar URL with every user`. Body: one paragraph: `User.avatarCloudinaryId` (optional), `toPublicUser` shared in `features/auth/public-user.ts`, `avatarUrl` injected into the auth, invitations and friendships services so their tests need no Cloudinary settings; the client copies and type guards follow. Then a blank line and the two attribution lines (Global Constraints).

- [ ] **Step 8: Docs**

Modify `ARCHITECTURE.md`:

```diff
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -79,11 +79,11 @@ Le routage est fait côté navigateur (`react-router`). En production (J2), le s
 | `POST /api/photos/share`                | `multipart/form-data` avec `photo` (fichier) et `friendId` → `201 Photo` : envoie un fichier de l'appareil à un ami accepté ; il n'entre que dans la bibliothèque de l'ami                                             |
 | `DELETE /api/photos/:id`                | `204` sans corps, pour une photo du compte connecté ; supprime l'enregistrement, puis l'image Cloudinary (cache CDN compris) si plus aucune photo n'y renvoie                                                          |
 
-Toutes les routes `/api/photos`, `/api/friendships`, `GET /api/auth/me` et les routes admin de `/api/invitations` demandent une session ; sans elle : `401 UNAUTHENTICATED`. Les routes admin répondent `403 FORBIDDEN` à un membre. Un `user` vaut `{ id, email, displayName, role }` (`role` : `member` ou `admin`), jamais le hash du mot de passe.
+Toutes les routes `/api/photos`, `/api/friendships`, `GET /api/auth/me` et les routes admin de `/api/invitations` demandent une session ; sans elle : `401 UNAUTHENTICATED`. Les routes admin répondent `403 FORBIDDEN` à un membre. Un `user` vaut `{ id, email, displayName, role, avatarUrl }` (`role` : `member` ou `admin` ; `avatarUrl` : l'URL signée de sa photo de profil, `null` tant qu'il n'en a pas choisi), jamais le hash du mot de passe ni l'identifiant Cloudinary de la photo.
 
 Une `Invitation` vaut `{ id, email, status, createdAt, expiresAt }` (dates en ISO 8601) ; `status` vaut `pending` (en attente), `used` (utilisée) ou `expired` (expirée), calculé à chaque lecture. Le hash du jeton et l'admin qui l'a créée restent côté serveur.
 
-Une `Friendship` vaut `{ id, user, createdAt }` (`createdAt` en ISO 8601) : `id` est celui de l'amitié (c'est lui qu'on accepte ou supprime), `user` l'autre compte, `{ id, displayName, email }`, jamais son rôle ni le hash de son mot de passe. Une demande vise l'e-mail exact d'un compte (même normalisation qu'au login) ; ma demande en attente bloque une nouvelle demande ; demander quelqu'un dont la demande m'attend l'accepte, par la même écriture que le bouton (voir [la demande croisée](docs/superpowers/specs/2026-11-24-friends-cross-request.md)). Refuser, annuler et retirer sont la même suppression, permise aux deux côtés : seul le log les distingue. Accepter est une seule écriture filtrée sur `{ id, addresseeId, status: 'pending' }` : seul le destinataire accepte, sans course entre lecture et écriture. L'admin est ici un membre comme un autre.
+Une `Friendship` vaut `{ id, user, createdAt }` (`createdAt` en ISO 8601) : `id` est celui de l'amitié (c'est lui qu'on accepte ou supprime), `user` l'autre compte, `{ id, displayName, email, avatarUrl }`, jamais son rôle ni le hash de son mot de passe. Une demande vise l'e-mail exact d'un compte (même normalisation qu'au login) ; ma demande en attente bloque une nouvelle demande ; demander quelqu'un dont la demande m'attend l'accepte, par la même écriture que le bouton (voir [la demande croisée](docs/superpowers/specs/2026-11-24-friends-cross-request.md)). Refuser, annuler et retirer sont la même suppression, permise aux deux côtés : seul le log les distingue. Accepter est une seule écriture filtrée sur `{ id, addresseeId, status: 'pending' }` : seul le destinataire accepte, sans course entre lecture et écriture. L'admin est ici un membre comme un autre.
 
 Une `Photo` vaut `{ id, url, thumbnailUrl, createdAt, senderName }` (`createdAt` en ISO 8601 ; `senderName` est le nom d'affichage de l'ami qui l'a envoyée, `null` pour une photo que le compte a ajoutée lui-même). Chaque photo appartient à un compte (`ownerId`, côté serveur seulement) : celui qui l'a ajoutée, ou l'ami qui l'a reçue. La liste, la suppression et les événements ne concernent que les photos du compte connecté. Une photo envoyée à un ami est une nouvelle photo **de l'ami** (`senderId` = l'expéditeur) : la bibliothèque de l'expéditeur ne change pas, et chacun supprime ses photos de son côté (la photo reçue reste quand l'expéditeur supprime l'original ou retire l'amitié). L'identifiant Cloudinary reste côté serveur : le client reçoit des URL prêtes à l'emploi.
 
@@ -161,9 +161,10 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 | `photos.service.ts`    | règles métier (doublon, image lisible, propriétaire, envoi à un ami accepté, image encore utilisée) ; ignore Express et Socket.IO |
 | `photos.repository.ts` | seul accès à Prisma                                                                                                               |
 
-- `features/auth/` suit le même découpage (`auth.repository.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`), plus `auth.middleware.ts` (garde HTTP), `auth.guard.ts` (`currentUser`, `requireRole`), `auth.socket.ts` (garde Socket.IO) et `auth.cookie.ts` (pose et efface le cookie). Le service d'auth reçoit ses dépendances (`repository`, `hashToken`, `generateToken`, `verifyPassword`, `now`, `logger`) ; `app.ts` l'assemble une fois (`assembleAuthService`) et `server.ts` le partage avec Socket.IO.
-- `features/invitations/` suit le même découpage (`invitations.repository.ts`, `invitations.service.ts`, `invitations.controller.ts`, `invitations.routes.ts`). Le service reçoit `repository` (seul endroit qui crée un compte), `generateToken`, `hashToken`, `hashPassword`, `now` et `logger` ; le contrôleur reçoit aussi le service d'auth pour `openSession` ; `app.ts` construit `requireAdmin = requireRole('admin')` une fois et le passe au routeur, derrière `requireAuth`.
-- `features/friendships/` suit le même découpage (`friendships.repository.ts`, `friendships.service.ts`, `friendships.controller.ts`, `friendships.routes.ts`). Le service reçoit `repository` et `logger` ; le repository calcule `pairKey` et ne lit des comptes que `id`, `email` et `displayName`. `app.ts` monte le routeur derrière `requireAuth`, comme les photos. Le service expose aussi `areFriends(userId, otherUserId)`, que le service photos reçoit en dépendance : la règle « amis = ligne acceptée » reste ici. `app.ts` construit le service amis une fois (`assembleFriendshipsService`) et le passe aux deux routeurs.
+- `features/auth/` suit le même découpage (`auth.repository.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`), plus `auth.middleware.ts` (garde HTTP), `auth.guard.ts` (`currentUser`, `requireRole`), `auth.socket.ts` (garde Socket.IO) et `auth.cookie.ts` (pose et efface le cookie). Le service d'auth reçoit ses dépendances (`repository`, `hashToken`, `generateToken`, `verifyPassword`, `avatarUrl`, `now`, `logger`) ; `app.ts` l'assemble une fois (`assembleAuthService`) et `server.ts` le partage avec Socket.IO.
+- `features/invitations/` suit le même découpage (`invitations.repository.ts`, `invitations.service.ts`, `invitations.controller.ts`, `invitations.routes.ts`). Le service reçoit `repository` (seul endroit qui crée un compte), `generateToken`, `hashToken`, `hashPassword`, `avatarUrl`, `now` et `logger` ; le contrôleur reçoit aussi le service d'auth pour `openSession` ; `app.ts` construit `requireAdmin = requireRole('admin')` une fois et le passe au routeur, derrière `requireAuth`.
+- `features/friendships/` suit le même découpage (`friendships.repository.ts`, `friendships.service.ts`, `friendships.controller.ts`, `friendships.routes.ts`). Le service reçoit `repository`, `avatarUrl` et `logger` ; le repository calcule `pairKey` et ne lit des comptes que `id`, `email`, `displayName` et `avatarCloudinaryId`. `app.ts` monte le routeur derrière `requireAuth`, comme les photos. Le service expose aussi `areFriends(userId, otherUserId)`, que le service photos reçoit en dépendance : la règle « amis = ligne acceptée » reste ici. `app.ts` construit le service amis une fois (`assembleFriendshipsService`) et le passe aux deux routeurs.
+- `features/auth/public-user.ts` construit le `user` renvoyé par l'API (`toPublicUser`, utilisé par les services auth et invitations) : l'URL de la photo de profil vient de `avatarUrl` (`lib/cloudinary.ts`), reçu en dépendance pour qu'un test unitaire n'ait pas besoin de la configuration Cloudinary. Le service amis s'en sert aussi (`toAvatarUrl`) pour l'autre compte d'une amitié.
 - Les dépendances sont passées par des fonctions-fabriques (`createPhotosService({ repository, toFrameJpeg, uploadImage, deleteImage, areFriends, logger })`), assemblées dans `app.ts` : un test peut fournir de fausses implémentations.
 - `server/src/lib/` regroupe les clients techniques : Prisma (`db.ts`), Cloudinary, sharp (`image.ts`), et `email.ts` (`parseEmail`, la même règle pour une invitation et une demande d'ami).
 - **Erreurs** : le service lève une `AppError` portant un code ; le contrôleur n'a pas de try/catch (Express 5 transmet les rejets). Une route inconnue tombe sur `errors/not-found.ts` (monté après les routes), qui lève `ROUTE_NOT_FOUND`. `errors/error-handler.ts` est le seul endroit qui écrit une réponse d'erreur, avec un statut tiré d'un `Record` exhaustif sur les codes. Une erreur de sharp devient `IMAGE_UNREADABLE` (faute de l'utilisateur) ; une erreur de Cloudinary ou de Prisma reste une 500.
@@ -226,7 +227,7 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 
 - **MongoDB Atlas** via **Prisma 6**. Prisma 7+ ne supporte pas encore MongoDB : la version est volontairement figée.
 - Le client Prisma est généré à l'installation (`postinstall`) ; le schéma est poussé avec `pnpm --filter server db:push` (pas de migrations avec MongoDB).
-- Collections `User`, `Session`, `Photo`, `Invitation` et `Friendship`. Index uniques sur `User.email`, `Session.tokenHash`, `Invitation.tokenHash` et `Friendship.pairKey` ; le rôle est un `enum Role` Prisma et l'état d'une amitié un `enum FriendshipStatus` (`pending`, `accepted`), que Prisma génère en unions de chaînes. `Photo.ownerId` relie chaque photo à son compte ; index unique `(ownerId, sha256)` (un même fichier n'entre qu'une fois dans une bibliothèque), index `(ownerId, id)` pour la liste d'un compte, et index simple sur `cloudinaryId` (pas unique : une photo envoyée depuis la bibliothèque pointe vers la même image, détruite avec la dernière photo qui y renvoie). `Photo.senderId`, facultatif, relie une photo reçue au compte qui l'a envoyée (`null` pour une photo ajoutée par son propriétaire) : `User` a donc deux relations vers `Photo`, que Prisma exige de nommer (`PhotoOwner` pour `ownerId`, `PhotoSender` pour `senderId`). Le nom de l'expéditeur est lu par une jointure (`include` de `sender`, `displayName` seul), jamais recopié dans `Photo`. `Invitation.invitedById` relie une invitation à l'admin qui l'a créée ; index simple sur `Invitation.email` (pas unique : une invitation utilisée reste à côté d'une plus récente pour la même adresse). `pnpm db:seed` (`server/prisma/seed.ts`) vide la base (sessions, photos, invitations et amitiés avant les comptes, car Prisma émule les relations sur MongoDB) et crée les deux comptes de test du README.
+- Collections `User`, `Session`, `Photo`, `Invitation` et `Friendship`. `User.avatarCloudinaryId`, facultatif, est l'identifiant Cloudinary de la photo de profil (absent des anciens comptes, que Prisma lit comme `null`). Index uniques sur `User.email`, `Session.tokenHash`, `Invitation.tokenHash` et `Friendship.pairKey` ; le rôle est un `enum Role` Prisma et l'état d'une amitié un `enum FriendshipStatus` (`pending`, `accepted`), que Prisma génère en unions de chaînes. `Photo.ownerId` relie chaque photo à son compte ; index unique `(ownerId, sha256)` (un même fichier n'entre qu'une fois dans une bibliothèque), index `(ownerId, id)` pour la liste d'un compte, et index simple sur `cloudinaryId` (pas unique : une photo envoyée depuis la bibliothèque pointe vers la même image, détruite avec la dernière photo qui y renvoie). `Photo.senderId`, facultatif, relie une photo reçue au compte qui l'a envoyée (`null` pour une photo ajoutée par son propriétaire) : `User` a donc deux relations vers `Photo`, que Prisma exige de nommer (`PhotoOwner` pour `ownerId`, `PhotoSender` pour `senderId`). Le nom de l'expéditeur est lu par une jointure (`include` de `sender`, `displayName` seul), jamais recopié dans `Photo`. `Invitation.invitedById` relie une invitation à l'admin qui l'a créée ; index simple sur `Invitation.email` (pas unique : une invitation utilisée reste à côté d'une plus récente pour la même adresse). `pnpm db:seed` (`server/prisma/seed.ts`) vide la base (sessions, photos, invitations et amitiés avant les comptes, car Prisma émule les relations sur MongoDB) et crée les deux comptes de test du README.
 - **Amitiés** : un seul document `Friendship` par paire de comptes porte la demande, puis l'amitié (`requesterId`, `addresseeId`, `status`). `pairKey` vaut les deux ids triés et joints par `:`, sous un index unique : MongoDB ne sait pas indexer « cette paire, dans un sens ou dans l'autre », et la clé triée fait refuser par l'index lui-même A→B à côté de B→A, demandes simultanées comprises. Seul le repository calcule `pairKey`. Index simples sur `requesterId` et `addresseeId` pour la liste d'un compte. Une demande refusée ou annulée, comme une amitié retirée, est supprimée : pas de troisième état.
 - Quand `Photo` gagne un champ obligatoire ou un index unique, `pnpm db:seed` passe **avant** `pnpm db:push` : MongoDB compte un champ absent comme `null`, et d'anciennes photos sans ce champ empêcheraient l'index unique de se créer.
 - Piège MongoDB : Prisma n'écrit pas un champ facultatif absent du `create`, et `where: { usedAt: null }` ne trouve qu'un `null` enregistré, pas un champ absent. Le repository des invitations écrit donc `usedAt: null` explicitement à la création : le filtre « pas encore utilisée » reste un simple `usedAt: null`.
```

Run `pnpm check` (Biome formats Markdown: if it reports the tables, run `pnpm check:fix`).

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add ARCHITECTURE.md
git commit -F <message-file>
```

Message subject: `docs: describe the avatar URL`. Body: the user and friendship shapes, the new deps, `public-user.ts`, the `User.avatarCloudinaryId` field. Then a blank line and the two attribution lines (Global Constraints).

### Controller checkpoint C1 — after Task 1 (controller only)

- [ ] Stop your own API processes that hold the Prisma engine (never the author's on 3000), then from the repo root: `pnpm db:push`. Expected: `Your database is now in sync with your Prisma schema`. `avatarCloudinaryId` is optional and adds no index: no data is touched.
- [ ] **No seed**: the dev MongoDB is shared.
- [ ] Record the checkpoint in the Drift Log.

---

### Task 2: Shared input rules, and renaming in the service (PR A, `feat/account-profile`)

**Files:**
- Create: `server/src/lib/account-input.ts`
- Modify: `server/src/features/invitations/invitations.service.ts`, `client/src/components/auth/InviteForm.tsx` (comment only), `ARCHITECTURE.md` (lib bullet)
- Create: `server/src/features/account/account.repository.ts`, `server/src/features/account/account.service.ts`, `server/src/features/account/account.service.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // server/src/lib/account-input.ts
  export const DISPLAY_NAME_MAX_LENGTH = 50
  export const PASSWORD_MIN_LENGTH = 12
  export const PASSWORD_MAX_LENGTH = 128
  export function parseDisplayName(displayName: unknown): string // DISPLAY_NAME_INVALID
  export function parsePassword(password: unknown): string // PASSWORD_INVALID
  // account.repository.ts (grows in Tasks 4 and 6)
  export type UserRecord = User
  export type AccountRepository = { updateDisplayName: (id: string, displayName: string) => Promise<UserRecord> }
  // account.service.ts (grows in Tasks 4 and 6)
  export type DisplayNameChange = { userId: string; displayName: unknown }
  export type AccountServiceDeps = { repository: AccountRepository; avatarUrl: AvatarUrlBuilder; logger: Logger }
  export type AccountService = { changeDisplayName: (change: DisplayNameChange) => Promise<PublicUser> }
  ```

- [ ] **Step 1: Move the rules (refactor, no behavior change)**

Create `server/src/lib/account-input.ts`:

```ts
import { AppError } from '../errors/app-error.js'

// Shown on frames and next to shared photos: a bound keeps the layout.
export const DISPLAY_NAME_MAX_LENGTH = 50
// OWASP ASVS: at least 12, allow up to 128; the maximum keeps argon2 away from huge inputs.
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

// The same rules when an invitation creates the account and when its owner edits it.
export function parseDisplayName(displayName: unknown): string {
  if (typeof displayName !== 'string') {
    throw new AppError('DISPLAY_NAME_INVALID')
  }
  const trimmedName = displayName.trim()
  if (trimmedName.length === 0 || trimmedName.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new AppError('DISPLAY_NAME_INVALID')
  }
  return trimmedName
}

// Not trimmed: a space is a character the person chose.
export function parsePassword(password: unknown): string {
  if (
    typeof password !== 'string' ||
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    throw new AppError('PASSWORD_INVALID')
  }
  return password
}
```

Modify `server/src/features/invitations/invitations.service.ts`:

```diff
--- a/server/src/features/invitations/invitations.service.ts
+++ b/server/src/features/invitations/invitations.service.ts
@@ -1,4 +1,5 @@
 import { AppError } from '../../errors/app-error.js'
+import { parseDisplayName, parsePassword } from '../../lib/account-input.js'
 import { parseEmail } from '../../lib/email.js'
 import type { Logger } from '../../lib/logger.js'
 import type { CreatedInvitation, Invitation, InvitationStatus, PublicUser } from '../../types.js'
@@ -9,11 +10,6 @@ const DAY_MS = 24 * 60 * 60 * 1000
 export const INVITATION_DURATION_MS = 7 * DAY_MS
 // What generateToken produces: 32 random bytes in hex.
 const TOKEN_PATTERN = /^[0-9a-f]{64}$/
-// Shown on frames and next to shared photos: a bound keeps the layout.
-export const DISPLAY_NAME_MAX_LENGTH = 50
-// OWASP ASVS: at least 12, allow up to 128; the maximum keeps argon2 away from huge inputs.
-export const PASSWORD_MIN_LENGTH = 12
-export const PASSWORD_MAX_LENGTH = 128
 
 // email comes straight from the JSON body: validated here, at the boundary.
 export type NewInvitationInput = { email: unknown; invitedById: string }
@@ -37,29 +33,6 @@ export type InvitationsService = {
   acceptInvitation: (acceptance: InvitationAcceptance) => Promise<PublicUser>
 }
 
-function parseDisplayName(displayName: unknown): string {
-  if (typeof displayName !== 'string') {
-    throw new AppError('DISPLAY_NAME_INVALID')
-  }
-  const trimmedName = displayName.trim()
-  if (trimmedName.length === 0 || trimmedName.length > DISPLAY_NAME_MAX_LENGTH) {
-    throw new AppError('DISPLAY_NAME_INVALID')
-  }
-  return trimmedName
-}
-
-// Not trimmed: a space is a character the person chose.
-function parsePassword(password: unknown): string {
-  if (
-    typeof password !== 'string' ||
-    password.length < PASSWORD_MIN_LENGTH ||
-    password.length > PASSWORD_MAX_LENGTH
-  ) {
-    throw new AppError('PASSWORD_INVALID')
-  }
-  return password
-}
-
 // Used comes first: the admin learns the person signed up, even after the 7 days.
 function statusOf({ usedAt, expiresAt }: InvitationRecord, now: Date): InvitationStatus {
   if (usedAt !== null) {
```

Modify `client/src/components/auth/InviteForm.tsx`:

```diff
--- a/client/src/components/auth/InviteForm.tsx
+++ b/client/src/components/auth/InviteForm.tsx
@@ -4,8 +4,8 @@ import { TextField } from '@/components/form/TextField.tsx'
 import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
 import { Button } from '@/components/ui/button.tsx'
 
-// Mirror the server's limits (invitations.service.ts): the browser catches most mistakes
-// before a request. Keep both in sync.
+// Mirror the server's limits (server/src/lib/account-input.ts): the browser catches most
+// mistakes before a request. Keep both in sync.
 const DISPLAY_NAME_MAX_LENGTH = 50
 const PASSWORD_MIN_LENGTH = 12
 const PASSWORD_MAX_LENGTH = 128
```

Modify `ARCHITECTURE.md`:

```diff
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -166,7 +166,7 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 - `features/friendships/` suit le même découpage (`friendships.repository.ts`, `friendships.service.ts`, `friendships.controller.ts`, `friendships.routes.ts`). Le service reçoit `repository`, `avatarUrl` et `logger` ; le repository calcule `pairKey` et ne lit des comptes que `id`, `email`, `displayName` et `avatarCloudinaryId`. `app.ts` monte le routeur derrière `requireAuth`, comme les photos. Le service expose aussi `areFriends(userId, otherUserId)`, que le service photos reçoit en dépendance : la règle « amis = ligne acceptée » reste ici. `app.ts` construit le service amis une fois (`assembleFriendshipsService`) et le passe aux deux routeurs.
 - `features/auth/public-user.ts` construit le `user` renvoyé par l'API (`toPublicUser`, utilisé par les services auth et invitations) : l'URL de la photo de profil vient de `avatarUrl` (`lib/cloudinary.ts`), reçu en dépendance pour qu'un test unitaire n'ait pas besoin de la configuration Cloudinary. Le service amis s'en sert aussi (`toAvatarUrl`) pour l'autre compte d'une amitié.
 - Les dépendances sont passées par des fonctions-fabriques (`createPhotosService({ repository, toFrameJpeg, uploadImage, deleteImage, areFriends, logger })`), assemblées dans `app.ts` : un test peut fournir de fausses implémentations.
-- `server/src/lib/` regroupe les clients techniques : Prisma (`db.ts`), Cloudinary, sharp (`image.ts`), et `email.ts` (`parseEmail`, la même règle pour une invitation et une demande d'ami).
+- `server/src/lib/` regroupe les clients techniques : Prisma (`db.ts`), Cloudinary, sharp (`image.ts`), `email.ts` (`parseEmail`, la même règle pour une invitation et une demande d'ami) et `account-input.ts` (`parseDisplayName`, `parsePassword` et leurs bornes, les mêmes règles à la création du compte par invitation et à sa modification par son propriétaire).
 - **Erreurs** : le service lève une `AppError` portant un code ; le contrôleur n'a pas de try/catch (Express 5 transmet les rejets). Une route inconnue tombe sur `errors/not-found.ts` (monté après les routes), qui lève `ROUTE_NOT_FOUND`. `errors/error-handler.ts` est le seul endroit qui écrit une réponse d'erreur, avec un statut tiré d'un `Record` exhaustif sur les codes. Une erreur de sharp devient `IMAGE_UNREADABLE` (faute de l'utilisateur) ; une erreur de Cloudinary ou de Prisma reste une 500.
 
 ## Logs
```

Run: `pnpm check`, `pnpm typecheck`, `pnpm test`. Expected: `Tests  183 passed (183)` (the invitation tests cover the moved rules unchanged).

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add server/src/lib/account-input.ts server/src/features/invitations/invitations.service.ts client/src/components/auth/InviteForm.tsx ARCHITECTURE.md
git commit -F <message-file>
```

Message subject: `refactor(server): share the account input rules`. Body: the display name and password rules move from the invitations service to `lib/account-input.ts`, as `parseEmail` lives in `lib/email.ts`: the account feature will use them too, and invitations must not depend on it. Then a blank line and the two attribution lines (Global Constraints).

- [ ] **Step 2: The rename tests first**

Create `server/src/features/account/account.service.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { AccountRepository, UserRecord } from './account.repository.js'
import { type AccountServiceDeps, createAccountService } from './account.service.js'

const USER_ID = '6b044f9d56a44767c7079b02'
const USER: UserRecord = {
  id: USER_ID,
  email: 'membre@familyframe.test',
  displayName: 'Membre',
  passwordHash: '$argon2id$stored-hash',
  role: 'member',
  avatarCloudinaryId: null,
  createdAt: new Date('2026-11-01T10:00:00Z'),
}

// The update returns the account with the name it was given; each test breaks one thing.
function makeDeps() {
  return {
    repository: {
      updateDisplayName: vi
        .fn<AccountRepository['updateDisplayName']>()
        .mockImplementation(async (_id, displayName) => ({ ...USER, displayName })),
    },
    avatarUrl: vi.fn<AccountServiceDeps['avatarUrl']>(
      (cloudinaryId) => `https://cdn.test/${cloudinaryId}`,
    ),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

type Deps = ReturnType<typeof makeDeps>

function changeDisplayName(deps: Deps, displayName: unknown): Promise<unknown> {
  return createAccountService(deps).changeDisplayName({ userId: USER_ID, displayName })
}

describe('changeDisplayName', () => {
  it('stores the name trimmed and returns the public user', async () => {
    const deps = makeDeps()

    const user = await changeDisplayName(deps, '  Mamie Jo  ')

    expect(deps.repository.updateDisplayName).toHaveBeenCalledWith(USER_ID, 'Mamie Jo')
    expect(user).toEqual({
      id: USER_ID,
      email: USER.email,
      displayName: 'Mamie Jo',
      role: 'member',
      avatarUrl: null,
    })
  })

  it.each([
    ['blanks only', '  '],
    ['51 characters', 'n'.repeat(51)],
    ['a number', 42],
    ['nothing', undefined],
  ])('rejects a name made of %s without writing', async (_label, displayName) => {
    const deps = makeDeps()

    await expect(changeDisplayName(deps, displayName)).rejects.toMatchObject({
      code: 'DISPLAY_NAME_INVALID',
    })
    expect(deps.repository.updateDisplayName).not.toHaveBeenCalled()
    expect(deps.logger.info).not.toHaveBeenCalled()
  })

  it('accepts a 50-character name', async () => {
    const deps = makeDeps()

    await changeDisplayName(deps, 'n'.repeat(50))

    expect(deps.repository.updateDisplayName).toHaveBeenCalledWith(USER_ID, 'n'.repeat(50))
  })

  it('keeps the avatar URL of an account with a profile photo', async () => {
    const deps = makeDeps()
    deps.repository.updateDisplayName.mockResolvedValue({
      ...USER,
      avatarCloudinaryId: 'familyframe/avatars/abc',
    })

    await expect(changeDisplayName(deps, 'Membre')).resolves.toMatchObject({
      avatarUrl: 'https://cdn.test/familyframe/avatars/abc',
    })
  })

  it('logs the user id, never the name', async () => {
    const deps = makeDeps()

    await changeDisplayName(deps, 'Mamie Jo')

    expect(deps.logger.info).toHaveBeenCalledWith('account.renamed', { userId: USER_ID })
    expect(JSON.stringify(deps.logger.info.mock.calls)).not.toContain('Mamie')
  })
})
```

Run: `pnpm test`. Expected: FAIL, `account.service.test.ts` cannot import `./account.repository.js` / `./account.service.js`.

- [ ] **Step 3: The repository and the service**

Create `server/src/features/account/account.repository.ts`:

```ts
import type { PrismaClient, User } from '@prisma/client'

export type UserRecord = User

export type AccountRepository = {
  updateDisplayName: (id: string, displayName: string) => Promise<UserRecord>
}

export function createAccountRepository(prisma: PrismaClient): AccountRepository {
  return {
    updateDisplayName: (id, displayName) =>
      prisma.user.update({ where: { id }, data: { displayName } }),
  }
}
```

Create `server/src/features/account/account.service.ts`:

```ts
import { parseDisplayName } from '../../lib/account-input.js'
import type { Logger } from '../../lib/logger.js'
import type { PublicUser } from '../../types.js'
import { type AvatarUrlBuilder, toPublicUser } from '../auth/public-user.js'
import type { AccountRepository } from './account.repository.js'

// userId is the logged-in account: one edits only oneself. displayName comes straight from the
// JSON body: validated here, at the boundary.
export type DisplayNameChange = { userId: string; displayName: unknown }

export type AccountServiceDeps = {
  repository: AccountRepository
  avatarUrl: AvatarUrlBuilder
  logger: Logger
}

export type AccountService = {
  changeDisplayName: (change: DisplayNameChange) => Promise<PublicUser>
}

// Received photos show the new name at once: « Envoyée par » reads it through a join.
async function changeDisplayName(
  { repository, avatarUrl, logger }: AccountServiceDeps,
  { userId, displayName }: DisplayNameChange,
): Promise<PublicUser> {
  const user = await repository.updateDisplayName(userId, parseDisplayName(displayName))
  // The id only: a display name is personal data.
  logger.info('account.renamed', { userId })
  return toPublicUser(user, avatarUrl)
}

export function createAccountService(deps: AccountServiceDeps): AccountService {
  return {
    changeDisplayName: (change) => changeDisplayName(deps, change),
  }
}
```

- [ ] **Step 4: Gates and commit**

Run from the repo root: `pnpm check` (expected: `Checked … files … No fixes applied.`), `pnpm typecheck` (no output besides the two package names), `pnpm test` (expected below). Expected: `Test Files  16 passed (16)`, `Tests  191 passed (191)` (+8).

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add server/src/features/account/account.service.test.ts server/src/features/account/account.repository.ts server/src/features/account/account.service.ts
git commit -F <message-file>
```

Message subject: `feat(server): rename the account in the service`. Body: `changeDisplayName` validates with `parseDisplayName`, writes, logs `account.renamed` with the user id only, and answers the public user. Then a blank line and the two attribution lines (Global Constraints).

### Task 3: `PATCH /api/account`, Bruno and docs (PR A, `feat/account-profile`)

**Files:**
- Create: `server/src/features/account/account.controller.ts`, `server/src/features/account/account.routes.ts`
- Modify: `server/src/app.ts`
- Create (Bruno): `server/bruno/account/folder.bru`, `server/bruno/account/rename/folder.bru` and `01`-`06`
- Modify: `server/bruno/collection.bru`, `ARCHITECTURE.md`

**Interfaces:**
- Produces: `createAccountController(service): AccountController` (`changeDisplayName`), `createAccountRouter(controller): Router`; `app.ts` mounts `app.use('/api/account', requireAuth, assembleAccountRouter())`.
- Bruno: `account/` is `seq: 4` (after `friendships/`): it needs `inviteeCookie` from `invitations/accept/05` and `inviteEmail`. Every request uses the invitee account, never the member (see Choices).

- [ ] **Step 1: The Bruno requests first**

Create `server/bruno/account/folder.bru`:

```text
meta {
  name: account
  seq: 4
}

docs {
  Le compte de la personne connectée : `PATCH /api/account` (nom affiché).
  Pas d'id dans l'URL : chaque route agit sur le compte de la session.

  Toutes les requêtes passent par le compte créé par
  `invitations/accept/05` (cookie `inviteeCookie`, mot de passe
  `invite-bruno-dev`), jamais par le membre : la base de dev est partagée, et
  un lancement interrompu laisserait le membre renommé, ce que
  `auth/login/01` refuse au lancement suivant. Au pire, il reste un compte
  jetable modifié ; chaque dossier remet quand même le compte dans son état
  de départ.
}
```

Create `server/bruno/account/rename/folder.bru`:

```text
meta {
  name: rename
  seq: 1
}

docs {
  `PATCH /api/account`, JSON `{ displayName }` → 200 `{ user }`. Mêmes règles
  qu'à la création du compte : rogné, 1 à 50 caractères, sinon 400
  `DISPLAY_NAME_INVALID`. L'e-mail ne change pas ici. `06` rend au compte son
  nom de départ, « Invitée ».
}
```

Create `server/bruno/account/rename/01-nominal.bru`:

```text
meta {
  name: Nominal - nouveau nom affiché
  type: http
  seq: 1
}

patch {
  url: {{baseUrl}}/api/account
  body: json
  auth: none
}

body:json {
  {
    "displayName": "  Invitée renommée  "
  }
}

script:pre-request {
  if (!bru.getVar('inviteeCookie')) {
    throw new Error('inviteeCookie absent : lancer toute la collection, invitations/accept/05 doit passer')
  }
  // The throwaway account of invitations/accept/05, never the member (see account/folder.bru).
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 200
  res.body.user.displayName: eq Invitée renommée
  res.body.user.email: eq {{inviteEmail}}
  res.body.user.avatarUrl: isNull
  res.body.user.passwordHash: isUndefined
}

script:post-response {
  const axios = require('axios')
  const baseUrl = bru.getEnvVar('baseUrl')
  test('GET /api/auth/me renvoie le nouveau nom', async () => {
    // A script request does not get the collection headers: send the cookie itself.
    const me = await axios.get(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: bru.getVar('inviteeCookie') },
    })
    expect(me.data.user.displayName).to.equal('Invitée renommée')
  })
}

docs {
  NOMINAL → 200 `{ user }`. Le nom part entouré d'espaces : le serveur le
  rogne. Le script relit le compte par `GET /api/auth/me` : le nom est bien
  enregistré, pas seulement renvoyé.
}
```

Create `server/bruno/account/rename/02-edge-nom-vide.bru`:

```text
meta {
  name: Edge - nom fait d'espaces
  type: http
  seq: 2
}

patch {
  url: {{baseUrl}}/api/account
  body: json
  auth: none
}

body:json {
  {
    "displayName": "   "
  }
}

script:pre-request {
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 400
  res.body.error: eq DISPLAY_NAME_INVALID
}

docs {
  EDGE → 400 DISPLAY_NAME_INVALID : rogné, le nom est vide. Les 51
  caractères et les types autres que texte sont couverts par les tests
  unitaires.
}
```

Create `server/bruno/account/rename/03-edge-champ-absent.bru`:

```text
meta {
  name: Edge - champ displayName absent
  type: http
  seq: 3
}

patch {
  url: {{baseUrl}}/api/account
  body: json
  auth: none
}

body:json {
  {
    "name": "Invitée"
  }
}

script:pre-request {
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 400
  res.body.error: eq DISPLAY_NAME_INVALID
}

docs {
  EDGE → 400 DISPLAY_NAME_INVALID : sans `displayName`, rien à enregistrer.
}
```

Create `server/bruno/account/rename/04-edge-json-malforme.bru`:

```text
meta {
  name: Edge - JSON malformé
  type: http
  seq: 4
}

patch {
  url: {{baseUrl}}/api/account
  body: text
  auth: none
}

headers {
  Content-Type: application/json
}

body:text {
  {"displayName": "Invitée"
}

script:pre-request {
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 400
  res.body.error: eq BODY_INVALID
}

docs {
  EDGE → 400 BODY_INVALID : la route monte son propre `express.json()`, qui
  refuse un corps JSON illisible.
}
```

Create `server/bruno/account/rename/05-edge-sans-cookie.bru`:

```text
meta {
  name: Edge - sans cookie de session
  type: http
  seq: 5
}

patch {
  url: {{baseUrl}}/api/account
  body: json
  auth: none
}

body:json {
  {
    "displayName": "Personne"
  }
}

script:pre-request {
  // collection.bru sends the session cookie to every request: remove it here.
  req.deleteHeader('Cookie')
}

assert {
  res.status: eq 401
  res.body.error: eq UNAUTHENTICATED
}

docs {
  EDGE → 401 UNAUTHENTICATED : toutes les routes du compte demandent une
  session.
}
```

Create `server/bruno/account/rename/06-nominal-retour.bru`:

```text
meta {
  name: Nominal - retour au nom de départ
  type: http
  seq: 6
}

patch {
  url: {{baseUrl}}/api/account
  body: json
  auth: none
}

body:json {
  {
    "displayName": "Invitée"
  }
}

script:pre-request {
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 200
  res.body.user.displayName: eq Invitée
}

docs {
  NOMINAL → 200 : le compte reprend le nom donné par
  `invitations/accept/05`. Le dossier finit comme il a commencé.
}
```

Modify `server/bruno/collection.bru`:

```diff
--- a/server/bruno/collection.bru
+++ b/server/bruno/collection.bru
@@ -39,6 +39,10 @@ docs {
   membre et l'admin : il n'en laisse aucune, et commence par effacer celles
   d'un lancement interrompu.
 
+  Le dossier `account/` modifie aussi ce compte jetable, jamais le membre, et
+  le remet dans son état de départ en fin de dossier (voir
+  `account/folder.bru`).
+
   Le dossier `photos/share/` lit les ids du membre et de l'admin
   (`memberId`, `adminId`, par `GET /api/auth/me`), rend les deux comptes amis
   le temps de ses requêtes, puis supprime cette amitié. Les photos que l'admin
```

Start the test API (Global Constraints, « Test API »): from `server/`, in its own background command, `PORT=3002 npx tsx --env-file-if-exists=.env src/server.ts`; wait for `server.started`. It does not watch files: restart it after each code change (stop it as described in Global Constraints).

From `server/bruno/`: `pnpm dlx @usebruno/cli@4.2.0 run . -r --env Local --disable-cookies --env-var baseUrl=http://localhost:3002`. Expected: the 6 `account/rename/` requests FAIL with `404 ROUTE_NOT_FOUND` (the route does not exist yet); everything else passes.

- [ ] **Step 2: Controller, routes, wiring**

Create `server/src/features/account/account.controller.ts`:

```ts
import type { Request, Response } from 'express'
import { currentUser } from '../auth/auth.guard.js'
import type { AccountService } from './account.service.js'

export type AccountController = {
  changeDisplayName: (req: Request, res: Response) => Promise<void>
}

// Every route edits the logged-in account: the id comes from the session, never from the URL.
export function createAccountController(service: AccountService): AccountController {
  return {
    async changeDisplayName(req, res) {
      const user = await service.changeDisplayName({
        userId: currentUser(req).id,
        displayName: req.body?.displayName,
      })
      res.json({ user })
    },
  }
}
```

Create `server/src/features/account/account.routes.ts`:

```ts
import express, { Router } from 'express'
import type { AccountController } from './account.controller.js'

// app.ts mounts the router behind requireAuth: every route acts on the logged-in account.
export function createAccountRouter(controller: AccountController): Router {
  const router = Router()
  // A JSON route brings its own parser (see the logging spec).
  router.patch('/', express.json(), controller.changeDisplayName)
  return router
}
```

Modify `server/src/app.ts`:

```diff
--- a/server/src/app.ts
+++ b/server/src/app.ts
@@ -3,6 +3,10 @@ import express, { type Express, type RequestHandler, type Router } from 'express
 import { config } from './config.js'
 import { errorHandler } from './errors/error-handler.js'
 import { notFound } from './errors/not-found.js'
+import { createAccountController } from './features/account/account.controller.js'
+import { createAccountRepository } from './features/account/account.repository.js'
+import { createAccountRouter } from './features/account/account.routes.js'
+import { createAccountService } from './features/account/account.service.js'
 import { createAuthController } from './features/auth/auth.controller.js'
 import { requireRole } from './features/auth/auth.guard.js'
 import { createRequireAuth } from './features/auth/auth.middleware.js'
@@ -73,6 +77,15 @@ function assembleFriendshipsRouter(service: FriendshipsService): Router {
   return createFriendshipsRouter(createFriendshipsController(service))
 }
 
+function assembleAccountRouter(): Router {
+  const service = createAccountService({
+    repository: createAccountRepository(prisma),
+    avatarUrl,
+    logger,
+  })
+  return createAccountRouter(createAccountController(service))
+}
+
 function assembleInvitationsRouter(
   authService: AuthService,
   requireAuth: RequestHandler,
@@ -111,6 +124,7 @@ export function createApp(io: SocketServer, authService: AuthService): Express {
   // Unlike photos, the router gets requireAuth itself: its accept route is public.
   app.use('/api/invitations', assembleInvitationsRouter(authService, requireAuth, requireAdmin))
   app.use('/api/friendships', requireAuth, assembleFriendshipsRouter(friendships))
+  app.use('/api/account', requireAuth, assembleAccountRouter())
 
   app.use(notFound)
   app.use(errorHandler)
```

- [ ] **Step 3: Gates**

Run from the repo root: `pnpm check` (expected: `Checked … files … No fixes applied.`), `pnpm typecheck` (no output besides the two package names), `pnpm test` (expected below). Expected: `Tests  191 passed (191)` (no rule changed).

Restart the test API, then the Bruno gate. Expected: 93 requests, 203 assertions, 40 `test()` calls, all passed. A second run: same result (`06` restored « Invitée »).

- [ ] **Step 4: Commit**

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add server/src/features/account/account.controller.ts server/src/features/account/account.routes.ts server/src/app.ts server/bruno/account server/bruno/collection.bru
git commit -F <message-file>
```

Message subject: `feat(server): let users rename their account`. Body: `PATCH /api/account` behind `requireAuth`, with its own `express.json()`; Bruno `account/rename/` acts on the throwaway invitee account and restores its name. Then a blank line and the two attribution lines (Global Constraints).

- [ ] **Step 5: Docs**

Modify `ARCHITECTURE.md`:

```diff
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -73,13 +73,14 @@ Le routage est fait côté navigateur (`react-router`). En production (J2), le s
 | `POST /api/friendships`                 | JSON `{ email }` → `201 { friendship }` : demande d'ami à l'e-mail exact d'un compte existant ; `200 { friendship }` si sa demande m'attendait (acceptée)                                                              |
 | `POST /api/friendships/:id/accept`      | `200 { friendship }` : le destinataire d'une demande en attente l'accepte ; l'amitié devient mutuelle                                                                                                                  |
 | `DELETE /api/friendships/:id`           | `204` sans corps, pour l'un ou l'autre côté : refuse une demande reçue, annule une demande envoyée ou retire un ami                                                                                                    |
+| `PATCH /api/account`                    | JSON `{ displayName }` → `200 { user }` : change le nom affiché du compte connecté ; l'e-mail ne se modifie pas                                                                                                        |
 | `GET /api/photos?cursor=<id>&limit=<n>` | `200 { photos, nextCursor }` : photos du compte connecté, la plus récente en premier ; `limit` de 1 à 100 (30 par défaut) ; `nextCursor` est l'id à passer en `cursor` pour la page suivante, `null` à la dernière     |
 | `POST /api/photos`                      | `multipart/form-data` avec `photo` (fichier) → `201 Photo`                                                                                                                                                             |
 | `POST /api/photos/:id/share`            | JSON `{ friendId }` → `201 Photo` : envoie une photo de sa bibliothèque à un ami accepté ; l'ami reçoit une nouvelle photo qui pointe vers la même image Cloudinary, et la réponse est cette photo telle qu'il la voit |
 | `POST /api/photos/share`                | `multipart/form-data` avec `photo` (fichier) et `friendId` → `201 Photo` : envoie un fichier de l'appareil à un ami accepté ; il n'entre que dans la bibliothèque de l'ami                                             |
 | `DELETE /api/photos/:id`                | `204` sans corps, pour une photo du compte connecté ; supprime l'enregistrement, puis l'image Cloudinary (cache CDN compris) si plus aucune photo n'y renvoie                                                          |
 
-Toutes les routes `/api/photos`, `/api/friendships`, `GET /api/auth/me` et les routes admin de `/api/invitations` demandent une session ; sans elle : `401 UNAUTHENTICATED`. Les routes admin répondent `403 FORBIDDEN` à un membre. Un `user` vaut `{ id, email, displayName, role, avatarUrl }` (`role` : `member` ou `admin` ; `avatarUrl` : l'URL signée de sa photo de profil, `null` tant qu'il n'en a pas choisi), jamais le hash du mot de passe ni l'identifiant Cloudinary de la photo.
+Toutes les routes `/api/photos`, `/api/friendships`, `/api/account`, `GET /api/auth/me` et les routes admin de `/api/invitations` demandent une session ; sans elle : `401 UNAUTHENTICATED`. Les routes admin répondent `403 FORBIDDEN` à un membre. Un `user` vaut `{ id, email, displayName, role, avatarUrl }` (`role` : `member` ou `admin` ; `avatarUrl` : l'URL signée de sa photo de profil, `null` tant qu'il n'en a pas choisi), jamais le hash du mot de passe ni l'identifiant Cloudinary de la photo.
 
 Une `Invitation` vaut `{ id, email, status, createdAt, expiresAt }` (dates en ISO 8601) ; `status` vaut `pending` (en attente), `used` (utilisée) ou `expired` (expirée), calculé à chaque lecture. Le hash du jeton et l'admin qui l'a créée restent côté serveur.
 
@@ -95,7 +96,7 @@ En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code e
 | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------- |
 | aucun fichier                                                                                                                             | 400    | `PHOTO_MISSING`         |
 | autre erreur Multer (mauvais champ, plusieurs fichiers)                                                                                   | 400    | `UPLOAD_INVALID`        |
-| corps JSON illisible (routes `/api/auth`, `/api/invitations`, `/api/friendships` et `POST /api/photos/:id/share`)                         | 400    | `BODY_INVALID`          |
+| corps JSON illisible (routes `/api/auth`, `/api/invitations`, `/api/friendships`, `PATCH /api/account` et `POST /api/photos/:id/share`)   | 400    | `BODY_INVALID`          |
 | e-mail absent ou mal formé (création d'invitation, demande d'ami)                                                                         | 400    | `EMAIL_INVALID`         |
 | nom d'affichage vide après trim, de plus de 50 caractères, ou absent                                                                      | 400    | `DISPLAY_NAME_INVALID`  |
 | mot de passe de moins de 12 ou plus de 128 caractères, ou absent                                                                          | 400    | `PASSWORD_INVALID`      |
@@ -129,9 +130,9 @@ En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code e
 - **Glissement** : une session dure 90 jours ; une requête HTTP authentifiée qui arrive à moins de 45 jours de la fin la prolonge à 90 jours et renvoie le cookie. Le cadre recharge ses photos une fois par jour (`usePhotoFeed`) : cet appel HTTP prolonge la session, ce que la connexion Socket.IO ne ferait pas. Un cadre allumé ne se déconnecte donc jamais, pour au plus une écriture en base tous les 45 jours. Une socket déjà ouverte n'est pas revérifiée par le serveur quand sa session expire ou est supprimée par une déconnexion : elle est refusée à la reconnexion suivante.
 - **Expiration** : Prisma 6 ne sait pas déclarer d'index TTL MongoDB. Une session expirée est supprimée quand on la lit, et toutes les sessions expirées à chaque session ouverte (connexion, invitation).
 - **Connexion refusée** : e-mail inconnu et mauvais mot de passe répondent tous deux `401 INVALID_CREDENTIALS`, et un e-mail inconnu coûte quand même une vérification argon2 (contre un hash factice) : ni le message ni le temps de réponse ne disent qui a un compte.
-- **Garde HTTP** : `requireAuth` (`features/auth/auth.middleware.ts`) lit le cookie avec `lib/session-token.ts` (sans `cookie-parser`), valide la session et pose `req.user`, typé par _declaration merging_ sur `Request` ; `currentUser(req)` (`features/auth/auth.guard.ts`) le relit sans cast. `requireRole(role)` (même fichier), monté après `requireAuth`, compare le rôle de la session déjà chargée (aucune requête en plus) et répond `403 FORBIDDEN` à un autre rôle. Il vit à part du middleware : `auth.middleware.ts` atteint `config.ts`, qu'un test unitaire ne peut pas charger sans variables d'environnement. `/api/photos`, `/api/auth/me`, `/api/friendships` et les routes admin de `/api/invitations` (puis `requireRole('admin')`) sont derrière `requireAuth` ; `/api/health`, `/api/auth/login`, `/api/auth/logout` et `/api/invitations/accept` restent publics.
+- **Garde HTTP** : `requireAuth` (`features/auth/auth.middleware.ts`) lit le cookie avec `lib/session-token.ts` (sans `cookie-parser`), valide la session et pose `req.user`, typé par _declaration merging_ sur `Request` ; `currentUser(req)` (`features/auth/auth.guard.ts`) le relit sans cast. `requireRole(role)` (même fichier), monté après `requireAuth`, compare le rôle de la session déjà chargée (aucune requête en plus) et répond `403 FORBIDDEN` à un autre rôle. Il vit à part du middleware : `auth.middleware.ts` atteint `config.ts`, qu'un test unitaire ne peut pas charger sans variables d'environnement. `/api/photos`, `/api/auth/me`, `/api/friendships`, `/api/account` et les routes admin de `/api/invitations` (puis `requireRole('admin')`) sont derrière `requireAuth` ; `/api/health`, `/api/auth/login`, `/api/auth/logout` et `/api/invitations/accept` restent publics.
 - **Invitations** : l'admin crée un lien depuis `/admin/invitations`. Le jeton suit la règle des sessions (32 octets aléatoires, `lib/session-token.ts`, seul son SHA-256 en base dans `Invitation.tokenHash`), vaut 7 jours (`INVITATION_DURATION_MS`) et sert une fois (`usedAt`). Le serveur renvoie le jeton brut une seule fois ; le client construit le lien `` `${window.location.origin}/invite/${token}` `` : l'origine que l'admin utilise est celle que la famille atteint, sans variable de configuration en plus. Une nouvelle invitation pour le même e-mail **remplace** les précédentes non utilisées (supprimées) : « j'ai perdu le lien » se règle sans bouton de révocation, et l'ancien lien répond `404 INVITATION_NOT_FOUND`. Le jeton ne passe jamais dans un chemin d'API (`http.request` journalise les chemins) : il voyage dans le corps JSON. L'acceptation (`POST /api/invitations/accept`, publique) vérifie d'abord le jeton (forme, existence, déjà utilisé, expiré), puis le nom, puis le mot de passe : inutile de choisir un mot de passe pour un lien mort. Elle crée le compte, puis marque l'invitation utilisée, sans transaction : l'index unique sur `User.email` garantit qu'un double envoi ne crée qu'un compte (l'autre reçoit `409 ACCOUNT_EXISTS`). Limite connue : si l'admin réinvite la même adresse pendant une acceptation, le compte peut être créé alors que la réponse est une `500` ; le compte fonctionne, la personne se connecte sur `/login`. La session est ouverte par `openSession` du service d'auth (aussi utilisé par la connexion), et le contrôleur pose le cookie comme au login.
-- **JSON** : `express.json()` n'est monté que sur `/api/auth`, `/api/invitations`, `/api/friendships` et `POST /api/photos/:id/share` (les autres routes photos sont en multipart), les seules routes qui lisent du JSON ; un corps illisible répond `400 BODY_INVALID`.
+- **JSON** : `express.json()` n'est monté que sur `/api/auth`, `/api/invitations`, `/api/friendships`, `PATCH /api/account` et `POST /api/photos/:id/share` (les autres routes photos sont en multipart), les seules routes qui lisent du JSON ; un corps illisible répond `400 BODY_INVALID`.
 
 ## Temps réel
 
@@ -150,7 +151,7 @@ En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code e
 
 ## Couches du backend
 
-Une feature par dossier (`server/src/features/photos/`, `server/src/features/auth/`, `server/src/features/invitations/`, `server/src/features/friendships/`), un fichier par couche. Pour les photos :
+Une feature par dossier (`server/src/features/photos/`, `server/src/features/auth/`, `server/src/features/invitations/`, `server/src/features/friendships/`, `server/src/features/account/`), un fichier par couche. Pour les photos :
 
 | Fichier                | Rôle                                                                                                                              |
 | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
@@ -164,7 +165,8 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 - `features/auth/` suit le même découpage (`auth.repository.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`), plus `auth.middleware.ts` (garde HTTP), `auth.guard.ts` (`currentUser`, `requireRole`), `auth.socket.ts` (garde Socket.IO) et `auth.cookie.ts` (pose et efface le cookie). Le service d'auth reçoit ses dépendances (`repository`, `hashToken`, `generateToken`, `verifyPassword`, `avatarUrl`, `now`, `logger`) ; `app.ts` l'assemble une fois (`assembleAuthService`) et `server.ts` le partage avec Socket.IO.
 - `features/invitations/` suit le même découpage (`invitations.repository.ts`, `invitations.service.ts`, `invitations.controller.ts`, `invitations.routes.ts`). Le service reçoit `repository` (seul endroit qui crée un compte), `generateToken`, `hashToken`, `hashPassword`, `avatarUrl`, `now` et `logger` ; le contrôleur reçoit aussi le service d'auth pour `openSession` ; `app.ts` construit `requireAdmin = requireRole('admin')` une fois et le passe au routeur, derrière `requireAuth`.
 - `features/friendships/` suit le même découpage (`friendships.repository.ts`, `friendships.service.ts`, `friendships.controller.ts`, `friendships.routes.ts`). Le service reçoit `repository`, `avatarUrl` et `logger` ; le repository calcule `pairKey` et ne lit des comptes que `id`, `email`, `displayName` et `avatarCloudinaryId`. `app.ts` monte le routeur derrière `requireAuth`, comme les photos. Le service expose aussi `areFriends(userId, otherUserId)`, que le service photos reçoit en dépendance : la règle « amis = ligne acceptée » reste ici. `app.ts` construit le service amis une fois (`assembleFriendshipsService`) et le passe aux deux routeurs.
-- `features/auth/public-user.ts` construit le `user` renvoyé par l'API (`toPublicUser`, utilisé par les services auth et invitations) : l'URL de la photo de profil vient de `avatarUrl` (`lib/cloudinary.ts`), reçu en dépendance pour qu'un test unitaire n'ait pas besoin de la configuration Cloudinary. Le service amis s'en sert aussi (`toAvatarUrl`) pour l'autre compte d'une amitié.
+- `features/account/` suit le même découpage (`account.repository.ts`, `account.service.ts`, `account.controller.ts`, `account.routes.ts`) : le compte de la personne connectée, jamais un autre (l'id vient de la session, pas de l'URL). Le service reçoit `repository`, `avatarUrl` et `logger`. `app.ts` monte le routeur derrière `requireAuth`.
+- `features/auth/public-user.ts` construit le `user` renvoyé par l'API (`toPublicUser`, utilisé par les services auth, invitations et compte) : l'URL de la photo de profil vient de `avatarUrl` (`lib/cloudinary.ts`), reçu en dépendance pour qu'un test unitaire n'ait pas besoin de la configuration Cloudinary. Le service amis s'en sert aussi (`toAvatarUrl`) pour l'autre compte d'une amitié.
 - Les dépendances sont passées par des fonctions-fabriques (`createPhotosService({ repository, toFrameJpeg, uploadImage, deleteImage, areFriends, logger })`), assemblées dans `app.ts` : un test peut fournir de fausses implémentations.
 - `server/src/lib/` regroupe les clients techniques : Prisma (`db.ts`), Cloudinary, sharp (`image.ts`), `email.ts` (`parseEmail`, la même règle pour une invitation et une demande d'ami) et `account-input.ts` (`parseDisplayName`, `parsePassword` et leurs bornes, les mêmes règles à la création du compte par invitation et à sa modification par son propriétaire).
 - **Erreurs** : le service lève une `AppError` portant un code ; le contrôleur n'a pas de try/catch (Express 5 transmet les rejets). Une route inconnue tombe sur `errors/not-found.ts` (monté après les routes), qui lève `ROUTE_NOT_FOUND`. `errors/error-handler.ts` est le seul endroit qui écrit une réponse d'erreur, avec un statut tiré d'un `Record` exhaustif sur les codes. Une erreur de sharp devient `IMAGE_UNREADABLE` (faute de l'utilisateur) ; une erreur de Cloudinary ou de Prisma reste une 500.
@@ -199,6 +201,7 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 | `invitation.accept_failed`                                            | warn                          | service invitations, avec `reason` (`not_found`, `used`, `expired`, `account_exists`) et `invitationId` quand il est connu ; jamais le jeton, l'e-mail, le nom ni le mot de passe                                               |
 | `friendship.requested` / `friendship.accepted` / `friendship.deleted` | info                          | service amis, avec `friendshipId` et `userId` (qui agit) ; `friendship.deleted` dit aussi ce qui s'est passé (`reason` : `removed`, `cancelled`, `refused`)                                                                     |
 | `friendship.request_failed`                                           | warn                          | service amis, avec `reason` (`user_not_found`, `self`, `already_friends`, `request_exists`) et `userId` ; jamais l'e-mail                                                                                                       |
+| `account.renamed`                                                     | info                          | service compte, avec `userId` ; jamais le nom                                                                                                                                                                                   |
 | `server.error`                                                        | error                         | `errors/error-handler.ts` (chaque 500), `auth.socket.ts` (handshake)                                                                                                                                                            |
 | `server.stopping` / `server.stopped` / `server.stop_failed`           | info / info / error           | `server.ts`, à l'arrêt                                                                                                                                                                                                          |
 | `process.crashed`                                                     | error                         | `server.ts`, exception ou rejet non géré, puis arrêt                                                                                                                                                                            |
```

Run `pnpm check` (`pnpm check:fix` if Biome realigns a table).

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add ARCHITECTURE.md
git commit -F <message-file>
```

Message subject: `docs: describe renaming the account`. Body: the route, the session list, the JSON parsers, the account feature, the `account.renamed` log. Then a blank line and the two attribution lines (Global Constraints).

> **Controller:** PR A is complete (spec, plan, Tasks 1-3). Before Task 4: `gh stack add feat/account-password`.

---

## PR B — `feat/account-password`

### Task 4: The session id, `PASSWORD_INCORRECT`, and the password change in the service (PR B, `feat/account-password`)

**Files:**
- Modify: `server/src/features/auth/auth.service.ts`, `auth.middleware.ts`, `auth.guard.ts` (+ `auth.service.test.ts`, `auth.guard.test.ts`)
- Modify: `server/src/types.ts`, `server/src/errors/error-handler.ts` (+ test), `client/src/api.ts`
- Modify: `server/src/features/account/account.repository.ts`, `account.service.ts`, `account.service.test.ts`, `server/src/app.ts`
- Create: `server/src/features/account/account.service.password.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // auth.service.ts
  export type AuthenticatedSession = { user: PublicUser; sessionId: string; expiresAt: Date; isRenewed: boolean }
  // auth.middleware.ts: Express.Request gains `sessionId?: string`, set next to req.user
  // auth.guard.ts
  export function currentSessionId(req: Pick<Request, 'sessionId'>): string // UNAUTHENTICATED when absent
  // ApiErrorCode gains 'PASSWORD_INCORRECT' (400), client message « Mot de passe actuel incorrect. »
  // account.repository.ts
  findUserById: (id: string) => Promise<UserRecord | null>
  updatePasswordHash: (id: string, passwordHash: string) => Promise<void>
  deleteOtherSessions: (userId: string, keptSessionId: string) => Promise<number>
  // account.service.ts
  export type PasswordChange = { userId: string; sessionId: string; currentPassword: unknown; newPassword: unknown }
  // AccountServiceDeps gains hashPassword, verifyPassword; AccountService gains changePassword: (change) => Promise<void>
  ```

- [ ] **Step 1: The session id — tests first**

Modify `server/src/features/auth/auth.service.test.ts`:

```diff
--- a/server/src/features/auth/auth.service.test.ts
+++ b/server/src/features/auth/auth.service.test.ts
@@ -233,13 +233,14 @@ describe('authenticate', () => {
     expect(deps.repository.deleteSession).toHaveBeenCalledWith('6b044f9d56a44767c7079c01')
   })
 
-  it('returns the public user and the session end', async () => {
+  it('returns the public user, the session id and the session end', async () => {
     const deps = makeDeps()
     const session = sessionExpiringIn(60 * DAY_MS)
     deps.repository.findSessionByTokenHash.mockResolvedValue(session)
 
     await expect(createAuthService(deps).authenticate(TOKEN)).resolves.toEqual({
       user: PUBLIC_USER,
+      sessionId: '6b044f9d56a44767c7079c01',
       expiresAt: session.expiresAt,
       isRenewed: false,
     })
@@ -272,7 +273,12 @@ describe('authenticateAndSlide', () => {
 
     const result = await createAuthService(deps).authenticateAndSlide(TOKEN)
 
-    expect(result).toEqual({ user: PUBLIC_USER, expiresAt: SESSION_END, isRenewed: true })
+    expect(result).toEqual({
+      user: PUBLIC_USER,
+      sessionId: '6b044f9d56a44767c7079c01',
+      expiresAt: SESSION_END,
+      isRenewed: true,
+    })
     expect(deps.repository.extendSession).toHaveBeenCalledWith(
       '6b044f9d56a44767c7079c01',
       SESSION_END,
```

Modify `server/src/features/auth/auth.guard.test.ts`:

```diff
--- a/server/src/features/auth/auth.guard.test.ts
+++ b/server/src/features/auth/auth.guard.test.ts
@@ -1,7 +1,7 @@
 import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
 import { logger } from '../../lib/logger.js'
 import type { PublicUser } from '../../types.js'
-import { requireRole } from './auth.guard.js'
+import { currentSessionId, requireRole } from './auth.guard.js'
 
 const ADMIN: PublicUser = {
   id: '6b044f9d56a44767c7079b01',
@@ -59,3 +59,15 @@ describe('requireRole', () => {
     )
   })
 })
+
+describe('currentSessionId', () => {
+  it('returns the session id that requireAuth set', () => {
+    expect(currentSessionId({ sessionId: '6b044f9d56a44767c7079c01' })).toBe(
+      '6b044f9d56a44767c7079c01',
+    )
+  })
+
+  it('refuses a request without a session id with UNAUTHENTICATED', () => {
+    expect(() => currentSessionId({})).toThrow(expect.objectContaining({ code: 'UNAUTHENTICATED' }))
+  })
+})
```

Run: `pnpm test`. Expected: FAIL, the two `toEqual` on `authenticate` / `authenticateAndSlide` miss `sessionId`, and `auth.guard.test.ts` cannot find `currentSessionId`.

- [ ] **Step 2: The session id — code**

Modify `server/src/features/auth/auth.service.ts`:

```diff
--- a/server/src/features/auth/auth.service.ts
+++ b/server/src/features/auth/auth.service.ts
@@ -17,7 +17,13 @@ export type LoginResult = { user: PublicUser; token: string; expiresAt: Date }
 
 export type OpenedSession = { token: string; expiresAt: Date }
 
-export type AuthenticatedSession = { user: PublicUser; expiresAt: Date; isRenewed: boolean }
+// sessionId lets a password change close every other session and keep this one.
+export type AuthenticatedSession = {
+  user: PublicUser
+  sessionId: string
+  expiresAt: Date
+  isRenewed: boolean
+}
 
 export type AuthServiceDeps = {
   repository: AuthRepository
@@ -122,7 +128,7 @@ async function authenticate(
 ): Promise<AuthenticatedSession> {
   const session = await findValidSession(deps, token)
   const user = toPublicUser(session.user, deps.avatarUrl)
-  return { user, expiresAt: session.expiresAt, isRenewed: false }
+  return { user, sessionId: session.id, expiresAt: session.expiresAt, isRenewed: false }
 }
 
 async function authenticateAndSlide(
@@ -133,11 +139,11 @@ async function authenticateAndSlide(
   const user = toPublicUser(session.user, deps.avatarUrl)
   const remainingMs = session.expiresAt.getTime() - deps.now().getTime()
   if (remainingMs >= RENEWAL_THRESHOLD_MS) {
-    return { user, expiresAt: session.expiresAt, isRenewed: false }
+    return { user, sessionId: session.id, expiresAt: session.expiresAt, isRenewed: false }
   }
   const expiresAt = sessionEnd(deps)
   await deps.repository.extendSession(session.id, expiresAt)
-  return { user, expiresAt, isRenewed: true }
+  return { user, sessionId: session.id, expiresAt, isRenewed: true }
 }
 
 export function createAuthService(deps: AuthServiceDeps): AuthService {
```

Modify `server/src/features/auth/auth.middleware.ts`:

```diff
--- a/server/src/features/auth/auth.middleware.ts
+++ b/server/src/features/auth/auth.middleware.ts
@@ -5,11 +5,12 @@ import type { PublicUser } from '../../types.js'
 import { setSessionCookie } from './auth.cookie.js'
 import type { AuthService } from './auth.service.js'
 
-// Declaration merging: every Express handler sees req.user typed, without casts.
+// Declaration merging: every Express handler sees req.user and req.sessionId typed, without casts.
 declare global {
   namespace Express {
     interface Request {
       user?: PublicUser
+      sessionId?: string
     }
   }
 }
@@ -20,11 +21,12 @@ export function createRequireAuth(service: AuthService): RequestHandler {
     if (token === null) {
       throw new AppError('UNAUTHENTICATED')
     }
-    const { user, expiresAt, isRenewed } = await service.authenticateAndSlide(token)
+    const { user, sessionId, expiresAt, isRenewed } = await service.authenticateAndSlide(token)
     if (isRenewed) {
       setSessionCookie(res, token, expiresAt)
     }
     req.user = user
+    req.sessionId = sessionId
     next()
   }
 }
```

Modify `server/src/features/auth/auth.guard.ts`:

```diff
--- a/server/src/features/auth/auth.guard.ts
+++ b/server/src/features/auth/auth.guard.ts
@@ -17,6 +17,14 @@ export function currentUser(req: RequestWithUser): PublicUser {
   return req.user
 }
 
+// Same contract as currentUser: a password change keeps this session and closes the others.
+export function currentSessionId(req: Pick<Request, 'sessionId'>): string {
+  if (!req.sessionId) {
+    throw new AppError('UNAUTHENTICATED')
+  }
+  return req.sessionId
+}
+
 // Mounted after requireAuth: the role comes from the session it already loaded, no extra query.
 export function requireRole(role: UserRole): RoleGuard {
   return (req, _res, next) => {
```

Run from the repo root: `pnpm check` (expected: `Checked … files … No fixes applied.`), `pnpm typecheck` (no output besides the two package names), `pnpm test` (expected below). Expected: `Test Files  16 passed (16)`, `Tests  193 passed (193)` (+2 guard tests). `auth.service.test.ts` ends at 297 lines: do not add to it (300-line limit).

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add server/src/features/auth/auth.service.ts server/src/features/auth/auth.middleware.ts server/src/features/auth/auth.guard.ts server/src/features/auth/auth.service.test.ts server/src/features/auth/auth.guard.test.ts
git commit -F <message-file>
```

Message subject: `feat(server): give handlers the current session id`. Body: `requireAuth` sets `req.sessionId` next to `req.user`, read by `currentSessionId(req)`: a password change will keep this session and close the others. Then a blank line and the two attribution lines (Global Constraints).

- [ ] **Step 3: The password change — tests first**

Modify `server/src/errors/error-handler.test.ts`:

```diff
--- a/server/src/errors/error-handler.test.ts
+++ b/server/src/errors/error-handler.test.ts
@@ -152,6 +152,13 @@ describe('toErrorResponse', () => {
     })
   })
 
+  it('answers a wrong current password with 400, not 401', () => {
+    expect(toErrorResponse(new AppError('PASSWORD_INCORRECT'))).toEqual({
+      status: 400,
+      body: { error: 'PASSWORD_INCORRECT' },
+    })
+  })
+
   it('answers an invalid query string with 400', () => {
     expect(toErrorResponse(new AppError('QUERY_INVALID'))).toEqual({
       status: 400,
```

Create `server/src/features/account/account.service.password.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { AccountRepository, UserRecord } from './account.repository.js'
import { type AccountServiceDeps, createAccountService } from './account.service.js'

const USER_ID = '6b044f9d56a44767c7079b02'
const SESSION_ID = '6b044f9d56a44767c7079c01'
const CURRENT_PASSWORD = 'membre-familyframe-dev'
const NEW_PASSWORD = 'un-nouveau-mot-de-passe'
const USER: UserRecord = {
  id: USER_ID,
  email: 'membre@familyframe.test',
  displayName: 'Membre',
  passwordHash: '$argon2id$stored-hash',
  role: 'member',
  avatarCloudinaryId: null,
  createdAt: new Date('2026-11-01T10:00:00Z'),
}

// Every step succeeds by default: the account exists, the current password matches, two other
// devices are logged in. Each test breaks only the one it is about.
function makeDeps() {
  return {
    repository: {
      findUserById: vi.fn<AccountRepository['findUserById']>().mockResolvedValue(USER),
      updateDisplayName: vi.fn<AccountRepository['updateDisplayName']>(),
      updatePasswordHash: vi.fn<AccountRepository['updatePasswordHash']>().mockResolvedValue(),
      deleteOtherSessions: vi.fn<AccountRepository['deleteOtherSessions']>().mockResolvedValue(2),
    },
    hashPassword: vi.fn<AccountServiceDeps['hashPassword']>().mockResolvedValue('$argon2id$new'),
    verifyPassword: vi.fn<AccountServiceDeps['verifyPassword']>().mockResolvedValue(true),
    avatarUrl: vi.fn<AccountServiceDeps['avatarUrl']>(),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

type Deps = ReturnType<typeof makeDeps>

function changePassword(
  deps: Deps,
  passwords: { currentPassword?: unknown; newPassword?: unknown } = {},
): Promise<void> {
  return createAccountService(deps).changePassword({
    userId: USER_ID,
    sessionId: SESSION_ID,
    currentPassword: CURRENT_PASSWORD,
    newPassword: NEW_PASSWORD,
    ...passwords,
  })
}

describe('changePassword', () => {
  it('checks the current password against the stored hash', async () => {
    const deps = makeDeps()

    await changePassword(deps)

    expect(deps.verifyPassword).toHaveBeenCalledWith(USER.passwordHash, CURRENT_PASSWORD)
  })

  it('stores the hash of the new password', async () => {
    const deps = makeDeps()

    await changePassword(deps)

    expect(deps.hashPassword).toHaveBeenCalledWith(NEW_PASSWORD)
    expect(deps.repository.updatePasswordHash).toHaveBeenCalledWith(USER_ID, '$argon2id$new')
  })

  it('closes every other session of the account and keeps the current one', async () => {
    const deps = makeDeps()

    await changePassword(deps)

    expect(deps.repository.deleteOtherSessions).toHaveBeenCalledWith(USER_ID, SESSION_ID)
  })

  it('logs the user id and the number of closed sessions, never a password', async () => {
    const deps = makeDeps()

    await changePassword(deps)

    expect(deps.logger.info).toHaveBeenCalledWith('account.password_changed', {
      userId: USER_ID,
      closedSessionCount: 2,
    })
    expect(JSON.stringify(deps.logger.info.mock.calls)).not.toContain('mot-de-passe')
  })

  it('refuses a wrong current password with PASSWORD_INCORRECT and changes nothing', async () => {
    const deps = makeDeps()
    deps.verifyPassword.mockResolvedValue(false)

    await expect(changePassword(deps)).rejects.toMatchObject({ code: 'PASSWORD_INCORRECT' })
    expect(deps.repository.updatePasswordHash).not.toHaveBeenCalled()
    expect(deps.repository.deleteOtherSessions).not.toHaveBeenCalled()
    expect(deps.logger.warn).toHaveBeenCalledWith('account.password_change_failed', {
      reason: 'incorrect_password',
      userId: USER_ID,
    })
  })

  it.each([
    ['missing', undefined],
    ['not a string', 42],
  ])('refuses a current password %s without calling argon2', async (_label, currentPassword) => {
    const deps = makeDeps()

    await expect(changePassword(deps, { currentPassword })).rejects.toMatchObject({
      code: 'PASSWORD_INCORRECT',
    })
    expect(deps.verifyPassword).not.toHaveBeenCalled()
  })

  it.each([
    ['11 characters', 'p'.repeat(11)],
    ['129 characters', 'p'.repeat(129)],
    ['missing', undefined],
  ])('refuses a new password of %s before reading the account', async (_label, newPassword) => {
    const deps = makeDeps()

    await expect(changePassword(deps, { newPassword })).rejects.toMatchObject({
      code: 'PASSWORD_INVALID',
    })
    expect(deps.repository.findUserById).not.toHaveBeenCalled()
    expect(deps.repository.updatePasswordHash).not.toHaveBeenCalled()
  })

  it('accepts a new password of 12 and of 128 characters', async () => {
    const deps = makeDeps()

    await changePassword(deps, { newPassword: 'p'.repeat(12) })
    await changePassword(deps, { newPassword: 'p'.repeat(128) })

    expect(deps.repository.updatePasswordHash).toHaveBeenCalledTimes(2)
  })

  it('refuses with UNAUTHENTICATED when the account no longer exists', async () => {
    const deps = makeDeps()
    deps.repository.findUserById.mockResolvedValue(null)

    await expect(changePassword(deps)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    expect(deps.repository.updatePasswordHash).not.toHaveBeenCalled()
  })
})
```

Modify `server/src/features/account/account.service.test.ts`:

```diff
--- a/server/src/features/account/account.service.test.ts
+++ b/server/src/features/account/account.service.test.ts
@@ -18,10 +18,15 @@ const USER: UserRecord = {
 function makeDeps() {
   return {
     repository: {
+      findUserById: vi.fn<AccountRepository['findUserById']>(),
       updateDisplayName: vi
         .fn<AccountRepository['updateDisplayName']>()
         .mockImplementation(async (_id, displayName) => ({ ...USER, displayName })),
+      updatePasswordHash: vi.fn<AccountRepository['updatePasswordHash']>(),
+      deleteOtherSessions: vi.fn<AccountRepository['deleteOtherSessions']>(),
     },
+    hashPassword: vi.fn<AccountServiceDeps['hashPassword']>(),
+    verifyPassword: vi.fn<AccountServiceDeps['verifyPassword']>(),
     avatarUrl: vi.fn<AccountServiceDeps['avatarUrl']>(
       (cloudinaryId) => `https://cdn.test/${cloudinaryId}`,
     ),
```

Run: `pnpm test`. Expected: FAIL, `toErrorResponse` returns 500 for the unknown `PASSWORD_INCORRECT` code (and TypeScript rejects it), `changePassword` is not a function, the fakes have members the types do not know yet.

- [ ] **Step 4: The password change — code**

Modify `server/src/types.ts`:

```diff
--- a/server/src/types.ts
+++ b/server/src/types.ts
@@ -9,6 +9,7 @@ export type ApiErrorCode =
   | 'QUERY_INVALID'
   | 'DISPLAY_NAME_INVALID'
   | 'PASSWORD_INVALID'
+  | 'PASSWORD_INCORRECT'
   | 'SELF_FRIEND'
   | 'UNAUTHENTICATED'
   | 'INVALID_CREDENTIALS'
```

Modify `server/src/errors/error-handler.ts`:

```diff
--- a/server/src/errors/error-handler.ts
+++ b/server/src/errors/error-handler.ts
@@ -12,6 +12,8 @@ const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
   QUERY_INVALID: 400,
   DISPLAY_NAME_INVALID: 400,
   PASSWORD_INVALID: 400,
+  // 400, not 401: the session is valid, only the typed password is wrong.
+  PASSWORD_INCORRECT: 400,
   SELF_FRIEND: 400,
   UNAUTHENTICATED: 401,
   INVALID_CREDENTIALS: 401,
```

Modify `client/src/api.ts`:

```diff
--- a/client/src/api.ts
+++ b/client/src/api.ts
@@ -7,6 +7,7 @@ export type ApiErrorCode =
   | 'QUERY_INVALID'
   | 'DISPLAY_NAME_INVALID'
   | 'PASSWORD_INVALID'
+  | 'PASSWORD_INCORRECT'
   | 'SELF_FRIEND'
   | 'UNAUTHENTICATED'
   | 'INVALID_CREDENTIALS'
@@ -36,6 +37,7 @@ const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
   QUERY_INVALID: 'Requête invalide. Rechargez la page et réessayez.',
   DISPLAY_NAME_INVALID: 'Choisissez un nom de 1 à 50 caractères.',
   PASSWORD_INVALID: 'Le mot de passe doit faire entre 12 et 128 caractères.',
+  PASSWORD_INCORRECT: 'Mot de passe actuel incorrect.',
   SELF_FRIEND: 'Vous ne pouvez pas vous ajouter vous-même.',
   UNAUTHENTICATED: 'Votre session a expiré. Reconnectez-vous.',
   INVALID_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
```

Modify `server/src/features/account/account.repository.ts`:

```diff
--- a/server/src/features/account/account.repository.ts
+++ b/server/src/features/account/account.repository.ts
@@ -3,12 +3,26 @@ import type { PrismaClient, User } from '@prisma/client'
 export type UserRecord = User
 
 export type AccountRepository = {
+  findUserById: (id: string) => Promise<UserRecord | null>
   updateDisplayName: (id: string, displayName: string) => Promise<UserRecord>
+  updatePasswordHash: (id: string, passwordHash: string) => Promise<void>
+  deleteOtherSessions: (userId: string, keptSessionId: string) => Promise<number>
 }
 
 export function createAccountRepository(prisma: PrismaClient): AccountRepository {
   return {
+    findUserById: (id) => prisma.user.findUnique({ where: { id } }),
     updateDisplayName: (id, displayName) =>
       prisma.user.update({ where: { id }, data: { displayName } }),
+    updatePasswordHash: async (id, passwordHash) => {
+      await prisma.user.update({ where: { id }, data: { passwordHash } })
+    },
+    // Returns how many were closed: the log tells how many devices must log in again.
+    deleteOtherSessions: async (userId, keptSessionId) => {
+      const { count } = await prisma.session.deleteMany({
+        where: { userId, id: { not: keptSessionId } },
+      })
+      return count
+    },
   }
 }
```

Modify `server/src/features/account/account.service.ts`:

```diff
--- a/server/src/features/account/account.service.ts
+++ b/server/src/features/account/account.service.ts
@@ -1,21 +1,33 @@
-import { parseDisplayName } from '../../lib/account-input.js'
+import { AppError } from '../../errors/app-error.js'
+import { parseDisplayName, parsePassword } from '../../lib/account-input.js'
 import type { Logger } from '../../lib/logger.js'
 import type { PublicUser } from '../../types.js'
 import { type AvatarUrlBuilder, toPublicUser } from '../auth/public-user.js'
-import type { AccountRepository } from './account.repository.js'
+import type { AccountRepository, UserRecord } from './account.repository.js'
 
 // userId is the logged-in account: one edits only oneself. displayName comes straight from the
 // JSON body: validated here, at the boundary.
 export type DisplayNameChange = { userId: string; displayName: unknown }
 
+// sessionId is the session making the request: the only one left open afterwards.
+export type PasswordChange = {
+  userId: string
+  sessionId: string
+  currentPassword: unknown
+  newPassword: unknown
+}
+
 export type AccountServiceDeps = {
   repository: AccountRepository
+  hashPassword: (plain: string) => Promise<string>
+  verifyPassword: (passwordHash: string, plain: string) => Promise<boolean>
   avatarUrl: AvatarUrlBuilder
   logger: Logger
 }
 
 export type AccountService = {
   changeDisplayName: (change: DisplayNameChange) => Promise<PublicUser>
+  changePassword: (change: PasswordChange) => Promise<void>
 }
 
 // Received photos show the new name at once: « Envoyée par » reads it through a join.
@@ -29,8 +41,48 @@ async function changeDisplayName(
   return toPublicUser(user, avatarUrl)
 }
 
+// requireAuth loaded this account a moment ago: missing now means it was deleted meanwhile.
+async function findUser({ repository }: AccountServiceDeps, userId: string): Promise<UserRecord> {
+  const user = await repository.findUserById(userId)
+  if (!user) {
+    throw new AppError('UNAUTHENTICATED')
+  }
+  return user
+}
+
+// A stolen session alone cannot lock the owner out: changing the password asks for the current one.
+async function checkCurrentPassword(
+  { verifyPassword, logger }: AccountServiceDeps,
+  user: UserRecord,
+  currentPassword: unknown,
+): Promise<void> {
+  const isValid =
+    typeof currentPassword === 'string' &&
+    (await verifyPassword(user.passwordHash, currentPassword))
+  if (!isValid) {
+    logger.warn('account.password_change_failed', {
+      reason: 'incorrect_password',
+      userId: user.id,
+    })
+    throw new AppError('PASSWORD_INCORRECT')
+  }
+}
+
+// The other sessions close: a device that knew the old password, or a stolen cookie, is out.
+// The frame logs in again with the new one.
+async function changePassword(deps: AccountServiceDeps, change: PasswordChange): Promise<void> {
+  const { repository, hashPassword, logger } = deps
+  const newPassword = parsePassword(change.newPassword)
+  const user = await findUser(deps, change.userId)
+  await checkCurrentPassword(deps, user, change.currentPassword)
+  await repository.updatePasswordHash(user.id, await hashPassword(newPassword))
+  const closedSessionCount = await repository.deleteOtherSessions(user.id, change.sessionId)
+  logger.info('account.password_changed', { userId: user.id, closedSessionCount })
+}
+
 export function createAccountService(deps: AccountServiceDeps): AccountService {
   return {
     changeDisplayName: (change) => changeDisplayName(deps, change),
+    changePassword: (change) => changePassword(deps, change),
   }
 }
```

Modify `server/src/app.ts`:

```diff
--- a/server/src/app.ts
+++ b/server/src/app.ts
@@ -80,6 +80,8 @@ function assembleFriendshipsRouter(service: FriendshipsService): Router {
 function assembleAccountRouter(): Router {
   const service = createAccountService({
     repository: createAccountRepository(prisma),
+    hashPassword,
+    verifyPassword,
     avatarUrl,
     logger,
   })
```

- [ ] **Step 5: Gates and commit**

Run from the repo root: `pnpm check` (expected: `Checked … files … No fixes applied.`), `pnpm typecheck` (no output besides the two package names), `pnpm test` (expected below). Expected: `Test Files  17 passed (17)`, `Tests  206 passed (206)` (+1 error handler, +12 password).

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add server/src/types.ts server/src/errors/error-handler.ts client/src/api.ts server/src/features/account/account.repository.ts server/src/features/account/account.service.ts server/src/app.ts server/src/errors/error-handler.test.ts server/src/features/account/account.service.password.test.ts server/src/features/account/account.service.test.ts
git commit -F <message-file>
```

Message subject: `feat(server): change the password in the service`. Body: the current password is checked with argon2 (`PASSWORD_INCORRECT`, 400), the new one follows the invitation rule, then every other session of the account is deleted; logs `account.password_changed` with `closedSessionCount`, `account.password_change_failed` on a wrong password. The client message is added with the code. Then a blank line and the two attribution lines (Global Constraints).

### Task 5: `PUT /api/account/password`, Bruno and docs (PR B, `feat/account-password`)

**Files:**
- Modify: `server/src/features/account/account.controller.ts`, `account.routes.ts`
- Create (Bruno): `server/bruno/account/password/folder.bru` and `01`-`10`
- Modify: `server/bruno/account/folder.bru`, `ARCHITECTURE.md`

**Bruno and the session deletion (analysed):** the route deletes every session of the account except the request's. `inviteeCookie` is the request's session: it stays valid, `avatar/` uses it afterwards. `sessionCookie` (member) and `adminCookie` belong to other accounts: untouched. `05`'s pre-request opens a second invitee session by `axios` (`inviteeOtherCookie`): `06` checks it is closed (401), `07` that the current one is not (200). `08` logs in with the new password (one more session, closed by `10`), `09` checks the old one is refused, `10` restores `invite-bruno-dev`. The member's sessions — the author's browser and frame on the shared dev DB — are never involved.

- [ ] **Step 1: The Bruno requests first**

Modify `server/bruno/account/folder.bru`:

```diff
--- a/server/bruno/account/folder.bru
+++ b/server/bruno/account/folder.bru
@@ -4,14 +4,16 @@ meta {
 }
 
 docs {
-  Le compte de la personne connectée : `PATCH /api/account` (nom affiché).
-  Pas d'id dans l'URL : chaque route agit sur le compte de la session.
+  Le compte de la personne connectée : `PATCH /api/account` (nom affiché),
+  `PUT /api/account/password`. Pas d'id dans l'URL : chaque route agit sur
+  le compte de la session.
 
   Toutes les requêtes passent par le compte créé par
   `invitations/accept/05` (cookie `inviteeCookie`, mot de passe
-  `invite-bruno-dev`), jamais par le membre : la base de dev est partagée, et
-  un lancement interrompu laisserait le membre renommé, ce que
-  `auth/login/01` refuse au lancement suivant. Au pire, il reste un compte
-  jetable modifié ; chaque dossier remet quand même le compte dans son état
-  de départ.
+  `invite-bruno-dev`), jamais par le membre : changer le mot de passe ferme
+  les autres sessions du compte, et celles du membre sont le navigateur et le
+  cadre de la base de dev partagée. Un lancement interrompu laisserait aussi
+  le membre renommé, ce que `auth/login/01` refuse au lancement suivant. Au
+  pire, il reste un compte jetable modifié ; chaque dossier remet quand même
+  le compte dans son état de départ.
 }
```

Create `server/bruno/account/password/folder.bru`:

```text
meta {
  name: password
  seq: 2
}

docs {
  `PUT /api/account/password`, JSON `{ currentPassword, newPassword }` → 204
  sans corps. Le mot de passe actuel est vérifié (sinon 400
  `PASSWORD_INCORRECT`, pas 401 : la session reste valide), le nouveau suit
  la règle de l'invitation (12 à 128 caractères, sinon 400
  `PASSWORD_INVALID`).

  Toutes les autres sessions du compte sont fermées, celle de la requête
  reste ouverte. Effet sur les cookies de la collection : `inviteeCookie` est
  la session de la requête, il reste valide ; `sessionCookie` (membre) et
  `adminCookie` sont d'autres comptes, intouchés. `05` ouvre d'abord une
  seconde session du compte (`inviteeOtherCookie`) : `06` vérifie qu'elle est
  fermée, `07` que la session courante ne l'est pas. `08` se connecte avec le
  nouveau mot de passe (une session de plus, que `10` ferme), `10` remet
  `invite-bruno-dev`.
}
```

Create `server/bruno/account/password/01-edge-mauvais-mot-de-passe.bru`:

```text
meta {
  name: Edge - mot de passe actuel faux
  type: http
  seq: 1
}

put {
  url: {{baseUrl}}/api/account/password
  body: json
  auth: none
}

body:json {
  {
    "currentPassword": "pas-le-bon-mot-de-passe",
    "newPassword": "invite-bruno-nouveau"
  }
}

script:pre-request {
  if (!bru.getVar('inviteeCookie')) {
    throw new Error('inviteeCookie absent : lancer toute la collection, invitations/accept/05 doit passer')
  }
  // The throwaway account of invitations/accept/05, never the member (see account/folder.bru).
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 400
  res.body.error: eq PASSWORD_INCORRECT
}

docs {
  EDGE → 400 PASSWORD_INCORRECT : une session seule ne suffit pas à changer
  le mot de passe. Rien ne change : `05` part toujours de `invite-bruno-dev`.
}
```

Create `server/bruno/account/password/02-edge-nouveau-trop-court.bru`:

```text
meta {
  name: Edge - nouveau mot de passe trop court
  type: http
  seq: 2
}

put {
  url: {{baseUrl}}/api/account/password
  body: json
  auth: none
}

body:json {
  {
    "currentPassword": "invite-bruno-dev",
    "newPassword": "trop-court"
  }
}

script:pre-request {
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 400
  res.body.error: eq PASSWORD_INVALID
}

docs {
  EDGE → 400 PASSWORD_INVALID : 10 caractères, il en faut 12. La borne de
  128 est couverte par les tests unitaires.
}
```

Create `server/bruno/account/password/03-edge-json-malforme.bru`:

```text
meta {
  name: Edge - JSON malformé
  type: http
  seq: 3
}

put {
  url: {{baseUrl}}/api/account/password
  body: text
  auth: none
}

headers {
  Content-Type: application/json
}

body:text {
  {"currentPassword": "invite-bruno-dev"
}

script:pre-request {
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 400
  res.body.error: eq BODY_INVALID
}

docs {
  EDGE → 400 BODY_INVALID : la route monte son propre `express.json()`.
}
```

Create `server/bruno/account/password/04-edge-sans-cookie.bru`:

```text
meta {
  name: Edge - sans cookie de session
  type: http
  seq: 4
}

put {
  url: {{baseUrl}}/api/account/password
  body: json
  auth: none
}

body:json {
  {
    "currentPassword": "invite-bruno-dev",
    "newPassword": "invite-bruno-nouveau"
  }
}

script:pre-request {
  // collection.bru sends the session cookie to every request: remove it here.
  req.deleteHeader('Cookie')
}

assert {
  res.status: eq 401
  res.body.error: eq UNAUTHENTICATED
}

docs {
  EDGE → 401 UNAUTHENTICATED : sans session, pas de compte à modifier.
}
```

Create `server/bruno/account/password/05-nominal.bru`:

```text
meta {
  name: Nominal - nouveau mot de passe
  type: http
  seq: 5
}

put {
  url: {{baseUrl}}/api/account/password
  body: json
  auth: none
}

body:json {
  {
    "currentPassword": "invite-bruno-dev",
    "newPassword": "invite-bruno-nouveau"
  }
}

script:pre-request {
  const axios = require('axios')
  const baseUrl = bru.getEnvVar('baseUrl')
  // A second device of the same account: the change must close its session.
  const login = await axios.post(`${baseUrl}/api/auth/login`, {
    email: bru.getVar('inviteEmail'),
    password: 'invite-bruno-dev',
  })
  const otherCookie = [].concat(login.headers['set-cookie'] ?? [])
    .find((cookie) => cookie.startsWith('ff_session='))
  bru.setVar('inviteeOtherCookie', otherCookie.split(';')[0])
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 204
}

docs {
  NOMINAL → 204 sans corps. Le script de départ connecte le compte une
  seconde fois (`POST /api/auth/login`) et range ce cookie dans
  `inviteeOtherCookie` : c'est l'« autre appareil » que `06` vérifie.
}
```

Create `server/bruno/account/password/06-nominal-autre-session-fermee.bru`:

```text
meta {
  name: Nominal - l'autre session est fermée
  type: http
  seq: 6
}

get {
  url: {{baseUrl}}/api/auth/me
  body: none
  auth: none
}

script:pre-request {
  req.setHeader('Cookie', bru.getVar('inviteeOtherCookie'))
}

assert {
  res.status: eq 401
  res.body.error: eq UNAUTHENTICATED
}

docs {
  NOMINAL → 401 UNAUTHENTICATED : la session ouverte par le script de `05`
  n'existe plus. Le cadre, connecté de la même façon, doit se reconnecter.
}
```

Create `server/bruno/account/password/07-nominal-session-courante-gardee.bru`:

```text
meta {
  name: Nominal - la session de la requête reste ouverte
  type: http
  seq: 7
}

get {
  url: {{baseUrl}}/api/auth/me
  body: none
  auth: none
}

script:pre-request {
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 200
  res.body.user.email: eq {{inviteEmail}}
}

docs {
  NOMINAL → 200 : `inviteeCookie`, la session qui a changé le mot de passe,
  marche toujours. `avatar/` s'en sert ensuite.
}
```

Create `server/bruno/account/password/08-nominal-connexion-nouveau.bru`:

```text
meta {
  name: Nominal - connexion avec le nouveau mot de passe
  type: http
  seq: 8
}

post {
  url: {{baseUrl}}/api/auth/login
  body: json
  auth: none
}

body:json {
  {
    "email": "{{inviteEmail}}",
    "password": "invite-bruno-nouveau"
  }
}

script:pre-request {
  req.deleteHeader('Cookie')
}

assert {
  res.status: eq 200
  res.body.user.email: eq {{inviteEmail}}
}

docs {
  NOMINAL → 200 : le nouveau mot de passe est bien enregistré. Cette session
  n'est pas gardée : `10` la ferme en remettant l'ancien mot de passe.
}
```

Create `server/bruno/account/password/09-edge-connexion-ancien.bru`:

```text
meta {
  name: Edge - connexion avec l'ancien mot de passe
  type: http
  seq: 9
}

post {
  url: {{baseUrl}}/api/auth/login
  body: json
  auth: none
}

body:json {
  {
    "email": "{{inviteEmail}}",
    "password": "invite-bruno-dev"
  }
}

script:pre-request {
  req.deleteHeader('Cookie')
}

assert {
  res.status: eq 401
  res.body.error: eq INVALID_CREDENTIALS
}

docs {
  EDGE → 401 INVALID_CREDENTIALS : l'ancien mot de passe ne marche plus.
}
```

Create `server/bruno/account/password/10-nominal-retour.bru`:

```text
meta {
  name: Nominal - retour au mot de passe de départ
  type: http
  seq: 10
}

put {
  url: {{baseUrl}}/api/account/password
  body: json
  auth: none
}

body:json {
  {
    "currentPassword": "invite-bruno-nouveau",
    "newPassword": "invite-bruno-dev"
  }
}

script:pre-request {
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 204
}

docs {
  NOMINAL → 204 : le compte reprend `invite-bruno-dev`, et la session de
  `08` est fermée au passage. Le dossier finit comme il a commencé.
}
```

Start the test API (Global Constraints, « Test API »): from `server/`, in its own background command, `PORT=3002 npx tsx --env-file-if-exists=.env src/server.ts`; wait for `server.started`. It does not watch files: restart it after each code change (stop it as described in Global Constraints).

From `server/bruno/`: `pnpm dlx @usebruno/cli@4.2.0 run . -r --env Local --disable-cookies --env-var baseUrl=http://localhost:3002`. Expected FAIL: `01`, `02`, `03`, `05`, `10` (`404 ROUTE_NOT_FOUND`), `06` (the other session is still open: 200), `08` (the new password is unknown: 401), `09` (the old one still works: 200). `04` (401 from `requireAuth`) and `07` already pass.

- [ ] **Step 2: Controller and route**

Modify `server/src/features/account/account.controller.ts`:

```diff
--- a/server/src/features/account/account.controller.ts
+++ b/server/src/features/account/account.controller.ts
@@ -1,9 +1,10 @@
 import type { Request, Response } from 'express'
-import { currentUser } from '../auth/auth.guard.js'
+import { currentSessionId, currentUser } from '../auth/auth.guard.js'
 import type { AccountService } from './account.service.js'
 
 export type AccountController = {
   changeDisplayName: (req: Request, res: Response) => Promise<void>
+  changePassword: (req: Request, res: Response) => Promise<void>
 }
 
 // Every route edits the logged-in account: the id comes from the session, never from the URL.
@@ -16,5 +17,15 @@ export function createAccountController(service: AccountService): AccountControl
       })
       res.json({ user })
     },
+    // 204: the cookie of this request stays valid, nothing to send back.
+    async changePassword(req, res) {
+      await service.changePassword({
+        userId: currentUser(req).id,
+        sessionId: currentSessionId(req),
+        currentPassword: req.body?.currentPassword,
+        newPassword: req.body?.newPassword,
+      })
+      res.status(204).end()
+    },
   }
 }
```

Modify `server/src/features/account/account.routes.ts`:

```diff
--- a/server/src/features/account/account.routes.ts
+++ b/server/src/features/account/account.routes.ts
@@ -6,5 +6,6 @@ export function createAccountRouter(controller: AccountController): Router {
   const router = Router()
   // A JSON route brings its own parser (see the logging spec).
   router.patch('/', express.json(), controller.changeDisplayName)
+  router.put('/password', express.json(), controller.changePassword)
   return router
 }
```

- [ ] **Step 3: Gates**

Run from the repo root: `pnpm check` (expected: `Checked … files … No fixes applied.`), `pnpm typecheck` (no output besides the two package names), `pnpm test` (expected below). Expected: `Tests  206 passed (206)`.

Restart the test API, then the Bruno gate. Expected: 103 requests, 221 assertions, 40 `test()` calls, all passed. A second run: same result (the invitee is back on `invite-bruno-dev`; each run creates a new invitee anyway).

- [ ] **Step 4: Commit**

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add server/src/features/account/account.controller.ts server/src/features/account/account.routes.ts server/bruno/account
git commit -F <message-file>
```

Message subject: `feat(server): let users change their password`. Body: `PUT /api/account/password` answers 204 and keeps the session of the request; Bruno checks a second session of the account is closed, then restores the password. Then a blank line and the two attribution lines (Global Constraints).

- [ ] **Step 5: Docs**

Modify `ARCHITECTURE.md`:

```diff
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -74,6 +74,7 @@ Le routage est fait côté navigateur (`react-router`). En production (J2), le s
 | `POST /api/friendships/:id/accept`      | `200 { friendship }` : le destinataire d'une demande en attente l'accepte ; l'amitié devient mutuelle                                                                                                                  |
 | `DELETE /api/friendships/:id`           | `204` sans corps, pour l'un ou l'autre côté : refuse une demande reçue, annule une demande envoyée ou retire un ami                                                                                                    |
 | `PATCH /api/account`                    | JSON `{ displayName }` → `200 { user }` : change le nom affiché du compte connecté ; l'e-mail ne se modifie pas                                                                                                        |
+| `PUT /api/account/password`             | JSON `{ currentPassword, newPassword }` → `204` sans corps : vérifie le mot de passe actuel, enregistre le nouveau et ferme toutes les autres sessions du compte (celle de la requête reste ouverte)                   |
 | `GET /api/photos?cursor=<id>&limit=<n>` | `200 { photos, nextCursor }` : photos du compte connecté, la plus récente en premier ; `limit` de 1 à 100 (30 par défaut) ; `nextCursor` est l'id à passer en `cursor` pour la page suivante, `null` à la dernière     |
 | `POST /api/photos`                      | `multipart/form-data` avec `photo` (fichier) → `201 Photo`                                                                                                                                                             |
 | `POST /api/photos/:id/share`            | JSON `{ friendId }` → `201 Photo` : envoie une photo de sa bibliothèque à un ami accepté ; l'ami reçoit une nouvelle photo qui pointe vers la même image Cloudinary, et la réponse est cette photo telle qu'il la voit |
@@ -96,10 +97,11 @@ En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code e
 | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------- |
 | aucun fichier                                                                                                                             | 400    | `PHOTO_MISSING`         |
 | autre erreur Multer (mauvais champ, plusieurs fichiers)                                                                                   | 400    | `UPLOAD_INVALID`        |
-| corps JSON illisible (routes `/api/auth`, `/api/invitations`, `/api/friendships`, `PATCH /api/account` et `POST /api/photos/:id/share`)   | 400    | `BODY_INVALID`          |
+| corps JSON illisible (routes qui lisent du JSON, voir [Authentification](#authentification))                                              | 400    | `BODY_INVALID`          |
 | e-mail absent ou mal formé (création d'invitation, demande d'ami)                                                                         | 400    | `EMAIL_INVALID`         |
 | nom d'affichage vide après trim, de plus de 50 caractères, ou absent                                                                      | 400    | `DISPLAY_NAME_INVALID`  |
 | mot de passe de moins de 12 ou plus de 128 caractères, ou absent                                                                          | 400    | `PASSWORD_INVALID`      |
+| mot de passe actuel faux ou absent (`PUT /api/account/password`) ; 400 et non 401 : la session reste valide                               | 400    | `PASSWORD_INCORRECT`    |
 | demande d'ami à sa propre adresse                                                                                                         | 400    | `SELF_FRIEND`           |
 | `limit` ou `cursor` invalide (`GET /api/photos`)                                                                                          | 400    | `QUERY_INVALID`         |
 | pas de session, session inconnue ou expirée                                                                                               | 401    | `UNAUTHENTICATED`       |
@@ -129,10 +131,11 @@ En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code e
 - **Cookie** : `httpOnly` (illisible en JavaScript), `SameSite=Lax`, `Secure` quand `NODE_ENV=production`, `path=/`, expire avec la session. En dev, le proxy Vite rend l'API same-origin : le navigateur envoie le cookie sans réglage CORS.
 - **Glissement** : une session dure 90 jours ; une requête HTTP authentifiée qui arrive à moins de 45 jours de la fin la prolonge à 90 jours et renvoie le cookie. Le cadre recharge ses photos une fois par jour (`usePhotoFeed`) : cet appel HTTP prolonge la session, ce que la connexion Socket.IO ne ferait pas. Un cadre allumé ne se déconnecte donc jamais, pour au plus une écriture en base tous les 45 jours. Une socket déjà ouverte n'est pas revérifiée par le serveur quand sa session expire ou est supprimée par une déconnexion : elle est refusée à la reconnexion suivante.
 - **Expiration** : Prisma 6 ne sait pas déclarer d'index TTL MongoDB. Une session expirée est supprimée quand on la lit, et toutes les sessions expirées à chaque session ouverte (connexion, invitation).
+- **Changement de mot de passe** : `PUT /api/account/password` demande le mot de passe actuel (une session volée ne suffit pas), puis supprime toutes les autres sessions du compte et garde celle de la requête. Un autre appareil, le cadre compris, doit se reconnecter avec le nouveau mot de passe : sa connexion Socket.IO déjà ouverte n'est pas coupée (elle ne relit pas la session), il revient à `/login` à sa prochaine requête HTTP ou reconnexion, le cadre au plus tard à son rechargement quotidien. `requireAuth` pose aussi `req.sessionId`, relu par `currentSessionId(req)` (`features/auth/auth.guard.ts`).
 - **Connexion refusée** : e-mail inconnu et mauvais mot de passe répondent tous deux `401 INVALID_CREDENTIALS`, et un e-mail inconnu coûte quand même une vérification argon2 (contre un hash factice) : ni le message ni le temps de réponse ne disent qui a un compte.
 - **Garde HTTP** : `requireAuth` (`features/auth/auth.middleware.ts`) lit le cookie avec `lib/session-token.ts` (sans `cookie-parser`), valide la session et pose `req.user`, typé par _declaration merging_ sur `Request` ; `currentUser(req)` (`features/auth/auth.guard.ts`) le relit sans cast. `requireRole(role)` (même fichier), monté après `requireAuth`, compare le rôle de la session déjà chargée (aucune requête en plus) et répond `403 FORBIDDEN` à un autre rôle. Il vit à part du middleware : `auth.middleware.ts` atteint `config.ts`, qu'un test unitaire ne peut pas charger sans variables d'environnement. `/api/photos`, `/api/auth/me`, `/api/friendships`, `/api/account` et les routes admin de `/api/invitations` (puis `requireRole('admin')`) sont derrière `requireAuth` ; `/api/health`, `/api/auth/login`, `/api/auth/logout` et `/api/invitations/accept` restent publics.
 - **Invitations** : l'admin crée un lien depuis `/admin/invitations`. Le jeton suit la règle des sessions (32 octets aléatoires, `lib/session-token.ts`, seul son SHA-256 en base dans `Invitation.tokenHash`), vaut 7 jours (`INVITATION_DURATION_MS`) et sert une fois (`usedAt`). Le serveur renvoie le jeton brut une seule fois ; le client construit le lien `` `${window.location.origin}/invite/${token}` `` : l'origine que l'admin utilise est celle que la famille atteint, sans variable de configuration en plus. Une nouvelle invitation pour le même e-mail **remplace** les précédentes non utilisées (supprimées) : « j'ai perdu le lien » se règle sans bouton de révocation, et l'ancien lien répond `404 INVITATION_NOT_FOUND`. Le jeton ne passe jamais dans un chemin d'API (`http.request` journalise les chemins) : il voyage dans le corps JSON. L'acceptation (`POST /api/invitations/accept`, publique) vérifie d'abord le jeton (forme, existence, déjà utilisé, expiré), puis le nom, puis le mot de passe : inutile de choisir un mot de passe pour un lien mort. Elle crée le compte, puis marque l'invitation utilisée, sans transaction : l'index unique sur `User.email` garantit qu'un double envoi ne crée qu'un compte (l'autre reçoit `409 ACCOUNT_EXISTS`). Limite connue : si l'admin réinvite la même adresse pendant une acceptation, le compte peut être créé alors que la réponse est une `500` ; le compte fonctionne, la personne se connecte sur `/login`. La session est ouverte par `openSession` du service d'auth (aussi utilisé par la connexion), et le contrôleur pose le cookie comme au login.
-- **JSON** : `express.json()` n'est monté que sur `/api/auth`, `/api/invitations`, `/api/friendships`, `PATCH /api/account` et `POST /api/photos/:id/share` (les autres routes photos sont en multipart), les seules routes qui lisent du JSON ; un corps illisible répond `400 BODY_INVALID`.
+- **JSON** : `express.json()` n'est monté que sur `/api/auth`, `/api/invitations`, `/api/friendships`, `PATCH /api/account`, `PUT /api/account/password` et `POST /api/photos/:id/share` (les autres routes photos sont en multipart), les seules routes qui lisent du JSON ; un corps illisible répond `400 BODY_INVALID`.
 
 ## Temps réel
 
@@ -165,7 +168,7 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 - `features/auth/` suit le même découpage (`auth.repository.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`), plus `auth.middleware.ts` (garde HTTP), `auth.guard.ts` (`currentUser`, `requireRole`), `auth.socket.ts` (garde Socket.IO) et `auth.cookie.ts` (pose et efface le cookie). Le service d'auth reçoit ses dépendances (`repository`, `hashToken`, `generateToken`, `verifyPassword`, `avatarUrl`, `now`, `logger`) ; `app.ts` l'assemble une fois (`assembleAuthService`) et `server.ts` le partage avec Socket.IO.
 - `features/invitations/` suit le même découpage (`invitations.repository.ts`, `invitations.service.ts`, `invitations.controller.ts`, `invitations.routes.ts`). Le service reçoit `repository` (seul endroit qui crée un compte), `generateToken`, `hashToken`, `hashPassword`, `avatarUrl`, `now` et `logger` ; le contrôleur reçoit aussi le service d'auth pour `openSession` ; `app.ts` construit `requireAdmin = requireRole('admin')` une fois et le passe au routeur, derrière `requireAuth`.
 - `features/friendships/` suit le même découpage (`friendships.repository.ts`, `friendships.service.ts`, `friendships.controller.ts`, `friendships.routes.ts`). Le service reçoit `repository`, `avatarUrl` et `logger` ; le repository calcule `pairKey` et ne lit des comptes que `id`, `email`, `displayName` et `avatarCloudinaryId`. `app.ts` monte le routeur derrière `requireAuth`, comme les photos. Le service expose aussi `areFriends(userId, otherUserId)`, que le service photos reçoit en dépendance : la règle « amis = ligne acceptée » reste ici. `app.ts` construit le service amis une fois (`assembleFriendshipsService`) et le passe aux deux routeurs.
-- `features/account/` suit le même découpage (`account.repository.ts`, `account.service.ts`, `account.controller.ts`, `account.routes.ts`) : le compte de la personne connectée, jamais un autre (l'id vient de la session, pas de l'URL). Le service reçoit `repository`, `avatarUrl` et `logger`. `app.ts` monte le routeur derrière `requireAuth`.
+- `features/account/` suit le même découpage (`account.repository.ts`, `account.service.ts`, `account.controller.ts`, `account.routes.ts`) : le compte de la personne connectée, jamais un autre (l'id vient de la session, pas de l'URL). Le service reçoit `repository`, `hashPassword`, `verifyPassword`, `avatarUrl` et `logger`. `app.ts` monte le routeur derrière `requireAuth`.
 - `features/auth/public-user.ts` construit le `user` renvoyé par l'API (`toPublicUser`, utilisé par les services auth, invitations et compte) : l'URL de la photo de profil vient de `avatarUrl` (`lib/cloudinary.ts`), reçu en dépendance pour qu'un test unitaire n'ait pas besoin de la configuration Cloudinary. Le service amis s'en sert aussi (`toAvatarUrl`) pour l'autre compte d'une amitié.
 - Les dépendances sont passées par des fonctions-fabriques (`createPhotosService({ repository, toFrameJpeg, uploadImage, deleteImage, areFriends, logger })`), assemblées dans `app.ts` : un test peut fournir de fausses implémentations.
 - `server/src/lib/` regroupe les clients techniques : Prisma (`db.ts`), Cloudinary, sharp (`image.ts`), `email.ts` (`parseEmail`, la même règle pour une invitation et une demande d'ami) et `account-input.ts` (`parseDisplayName`, `parsePassword` et leurs bornes, les mêmes règles à la création du compte par invitation et à sa modification par son propriétaire).
@@ -202,6 +205,8 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 | `friendship.requested` / `friendship.accepted` / `friendship.deleted` | info                          | service amis, avec `friendshipId` et `userId` (qui agit) ; `friendship.deleted` dit aussi ce qui s'est passé (`reason` : `removed`, `cancelled`, `refused`)                                                                     |
 | `friendship.request_failed`                                           | warn                          | service amis, avec `reason` (`user_not_found`, `self`, `already_friends`, `request_exists`) et `userId` ; jamais l'e-mail                                                                                                       |
 | `account.renamed`                                                     | info                          | service compte, avec `userId` ; jamais le nom                                                                                                                                                                                   |
+| `account.password_changed`                                            | info                          | service compte, avec `userId` et `closedSessionCount` (autres sessions fermées) ; jamais un mot de passe                                                                                                                        |
+| `account.password_change_failed`                                      | warn                          | service compte : mot de passe actuel faux, avec `reason` (`incorrect_password`) et `userId`                                                                                                                                     |
 | `server.error`                                                        | error                         | `errors/error-handler.ts` (chaque 500), `auth.socket.ts` (handshake)                                                                                                                                                            |
 | `server.stopping` / `server.stopped` / `server.stop_failed`           | info / info / error           | `server.ts`, à l'arrêt                                                                                                                                                                                                          |
 | `process.crashed`                                                     | error                         | `server.ts`, exception ou rejet non géré, puis arrêt                                                                                                                                                                            |
```

Run `pnpm check` (`pnpm check:fix` if Biome realigns a table).

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add ARCHITECTURE.md
git commit -F <message-file>
```

Message subject: `docs: describe the password change`. Body: the route, `PASSWORD_INCORRECT`, the closed sessions (an open Socket.IO connection is not cut), the two logs, the `BODY_INVALID` row pointing to the JSON list. Then a blank line and the two attribution lines (Global Constraints).

> **Controller:** before Task 6, `gh stack add feat/account-avatar`.

---

## PR C — `feat/account-avatar`

### Task 6: Square avatar images, and changing or removing the avatar in the service (PR C, `feat/account-avatar`)

**Files:**
- Modify: `server/src/lib/image.ts`, `server/src/lib/cloudinary.ts`; Create: `server/src/lib/image.test.ts`
- Modify: `server/src/features/account/account.repository.ts`, `account.service.ts`, `account.service.test.ts`, `account.service.password.test.ts`, `server/src/app.ts`
- Create: `server/src/features/account/account.service.avatar.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // lib/image.ts
  export async function toAvatarJpeg(input: Buffer): Promise<Buffer> // 256 x 256, centre crop, JPEG 85
  // lib/cloudinary.ts
  export function uploadAvatar(jpeg: Buffer): Promise<UploadedImage> // folder familyframe/avatars
  // account.repository.ts
  updateAvatar: (id: string, avatarCloudinaryId: string | null) => Promise<UserRecord>
  // account.service.ts
  export type AvatarChange = { userId: string; file: UploadedFile | undefined }
  // AccountServiceDeps gains toAvatarJpeg, uploadAvatar, deleteImage
  // AccountService gains changeAvatar: (change) => Promise<PublicUser>, removeAvatar: (userId) => Promise<PublicUser>
  ```

- [ ] **Step 1: The avatar image — test first**

Create `server/src/lib/image.test.ts`:

```ts
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { toAvatarJpeg } from './image.js'

// Built in memory: a test fixture file would hide the size the test depends on.
function landscapePng(): Promise<Buffer> {
  return sharp({
    create: { width: 800, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .png()
    .toBuffer()
}

describe('toAvatarJpeg', () => {
  it('turns a landscape PNG into a 256 px JPEG square', async () => {
    const avatar = await toAvatarJpeg(await landscapePng())

    const { format, width, height } = await sharp(avatar).metadata()
    expect({ format, width, height }).toEqual({ format: 'jpeg', width: 256, height: 256 })
  })

  it('throws on a file that is not an image', async () => {
    await expect(toAvatarJpeg(Buffer.from('pas une image'))).rejects.toThrow()
  })
})
```

Run: `pnpm test`. Expected: FAIL, `toAvatarJpeg` is not exported by `./image.js`. (This test runs the real sharp, in memory: no fixture file, no network.)

- [ ] **Step 2: The avatar image — code**

Modify `server/src/lib/image.ts`:

```diff
--- a/server/src/lib/image.ts
+++ b/server/src/lib/image.ts
@@ -1,6 +1,8 @@
 import sharp from 'sharp'
 
 const MAX_SIZE = 1920
+// Shown at most 128 CSS px wide (the settings page) on a 2x screen.
+const AVATAR_SIZE = 256
 const JPEG_QUALITY = 85
 
 // Throws on unreadable input: the real format check, as the browser's mimetype can lie.
@@ -12,3 +14,13 @@ export async function toFrameJpeg(input: Buffer): Promise<Buffer> {
     .jpeg({ quality: JPEG_QUALITY })
     .toBuffer() // drops metadata, GPS included
 }
+
+// A square cropped around the centre: the client shows it in a circle, without a crop tool.
+export async function toAvatarJpeg(input: Buffer): Promise<Buffer> {
+  return sharp(input)
+    .rotate()
+    .resize({ width: AVATAR_SIZE, height: AVATAR_SIZE, fit: 'cover', position: 'centre' })
+    .flatten({ background: '#ffffff' })
+    .jpeg({ quality: JPEG_QUALITY })
+    .toBuffer()
+}
```

Modify `server/src/lib/cloudinary.ts`:

```diff
--- a/server/src/lib/cloudinary.ts
+++ b/server/src/lib/cloudinary.ts
@@ -21,12 +21,21 @@ export type UploadedImage = { url: string; cloudinaryId: string }
 export type DeliveryUrls = { url: string; thumbnailUrl: string }
 
 // Data URI rather than a stream: simpler, and fine up to 10 MB.
-export async function uploadImage(jpeg: Buffer): Promise<UploadedImage> {
+async function uploadToFolder(jpeg: Buffer, folder: string): Promise<UploadedImage> {
   const dataUri = `data:image/jpeg;base64,${jpeg.toString('base64')}`
-  const result = await cloudinary.uploader.upload(dataUri, { folder: 'familyframe' })
+  const result = await cloudinary.uploader.upload(dataUri, { folder })
   return { url: result.secure_url, cloudinaryId: result.public_id }
 }
 
+export function uploadImage(jpeg: Buffer): Promise<UploadedImage> {
+  return uploadToFolder(jpeg, 'familyframe')
+}
+
+// A folder of their own: the Cloudinary console tells profile photos from library photos.
+export function uploadAvatar(jpeg: Buffer): Promise<UploadedImage> {
+  return uploadToFolder(jpeg, 'familyframe/avatars')
+}
+
 // invalidate: the CDN would otherwise keep serving the cached derived images.
 // destroy answers "not found" instead of failing: throw so the caller logs it.
 export async function deleteImage(cloudinaryId: string): Promise<void> {
```

Run from the repo root: `pnpm check` (expected: `Checked … files … No fixes applied.`), `pnpm typecheck` (no output besides the two package names), `pnpm test` (expected below). Expected: `Test Files  18 passed (18)`, `Tests  208 passed (208)`.

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add server/src/lib/image.ts server/src/lib/cloudinary.ts server/src/lib/image.test.ts
git commit -F <message-file>
```

Message subject: `feat(server): make square avatar images`. Body: `toAvatarJpeg` crops a 256 px square around the centre; `uploadAvatar` stores it under `familyframe/avatars`, through the same private upload helper as `uploadImage`. Then a blank line and the two attribution lines (Global Constraints).

- [ ] **Step 3: The avatar rules — tests first**

Create `server/src/features/account/account.service.avatar.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { UploadedFile } from '../photos/photos.input.js'
import type { AccountRepository, UserRecord } from './account.repository.js'
import { type AccountServiceDeps, createAccountService } from './account.service.js'

const USER_ID = '6b044f9d56a44767c7079b02'
const PREVIOUS_ID = 'familyframe/avatars/previous'
const NEW_ID = 'familyframe/avatars/new'
const FILE: UploadedFile = { buffer: Buffer.from('raw upload'), mimetype: 'image/png' }
const USER: UserRecord = {
  id: USER_ID,
  email: 'membre@familyframe.test',
  displayName: 'Membre',
  passwordHash: '$argon2id$stored-hash',
  role: 'member',
  avatarCloudinaryId: PREVIOUS_ID,
  createdAt: new Date('2026-11-01T10:00:00Z'),
}

// Every step succeeds by default, on an account that already has a profile photo: the file
// converts, uploads, the account is saved, the previous image is destroyed.
function makeDeps() {
  return {
    repository: {
      findUserById: vi.fn<AccountRepository['findUserById']>().mockResolvedValue(USER),
      updateDisplayName: vi.fn<AccountRepository['updateDisplayName']>(),
      updatePasswordHash: vi.fn<AccountRepository['updatePasswordHash']>(),
      deleteOtherSessions: vi.fn<AccountRepository['deleteOtherSessions']>(),
      updateAvatar: vi
        .fn<AccountRepository['updateAvatar']>()
        .mockImplementation(async (_id, avatarCloudinaryId) => ({ ...USER, avatarCloudinaryId })),
    },
    hashPassword: vi.fn<AccountServiceDeps['hashPassword']>(),
    verifyPassword: vi.fn<AccountServiceDeps['verifyPassword']>(),
    toAvatarJpeg: vi
      .fn<AccountServiceDeps['toAvatarJpeg']>()
      .mockResolvedValue(Buffer.from('avatar jpeg')),
    uploadAvatar: vi
      .fn<AccountServiceDeps['uploadAvatar']>()
      .mockResolvedValue({ url: 'https://cdn.test/new', cloudinaryId: NEW_ID }),
    deleteImage: vi.fn<AccountServiceDeps['deleteImage']>().mockResolvedValue(),
    avatarUrl: vi.fn<AccountServiceDeps['avatarUrl']>(
      (cloudinaryId) => `https://cdn.test/${cloudinaryId}`,
    ),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

type Deps = ReturnType<typeof makeDeps>

function changeAvatar(deps: Deps, file: UploadedFile | undefined = FILE): Promise<unknown> {
  return createAccountService(deps).changeAvatar({ userId: USER_ID, file })
}

describe('changeAvatar', () => {
  it('uploads the converted JPEG, saves its id and returns the new avatar URL', async () => {
    const deps = makeDeps()

    const user = await changeAvatar(deps)

    expect(deps.toAvatarJpeg).toHaveBeenCalledWith(FILE.buffer)
    expect(deps.uploadAvatar).toHaveBeenCalledWith(Buffer.from('avatar jpeg'))
    expect(deps.repository.updateAvatar).toHaveBeenCalledWith(USER_ID, NEW_ID)
    expect(user).toMatchObject({ id: USER_ID, avatarUrl: `https://cdn.test/${NEW_ID}` })
  })

  it('destroys the previous image after saving the new one', async () => {
    const deps = makeDeps()

    await changeAvatar(deps)

    expect(deps.deleteImage).toHaveBeenCalledWith(PREVIOUS_ID)
    const savedAt = deps.repository.updateAvatar.mock.invocationCallOrder[0]
    expect(deps.deleteImage.mock.invocationCallOrder[0]).toBeGreaterThan(savedAt)
    expect(deps.logger.info).toHaveBeenCalledWith('account.avatar_changed', {
      userId: USER_ID,
      cloudinaryId: NEW_ID,
      previousCloudinaryId: PREVIOUS_ID,
      isPreviousDestroyed: true,
    })
  })

  it('destroys nothing for a first profile photo', async () => {
    const deps = makeDeps()
    deps.repository.findUserById.mockResolvedValue({ ...USER, avatarCloudinaryId: null })

    await changeAvatar(deps)

    expect(deps.deleteImage).not.toHaveBeenCalled()
    expect(deps.logger.info).toHaveBeenCalledWith(
      'account.avatar_changed',
      expect.objectContaining({ previousCloudinaryId: null, isPreviousDestroyed: false }),
    )
  })

  it('still succeeds when the previous image cannot be destroyed, and logs it', async () => {
    const deps = makeDeps()
    deps.deleteImage.mockRejectedValue(new Error('Cloudinary down'))

    await expect(changeAvatar(deps)).resolves.toMatchObject({
      avatarUrl: `https://cdn.test/${NEW_ID}`,
    })
    expect(deps.logger.error).toHaveBeenCalledWith('account.avatar_orphaned', {
      cloudinaryId: PREVIOUS_ID,
      error: expect.any(Error),
    })
  })

  it('logs the new image as orphaned when the account cannot be saved', async () => {
    const deps = makeDeps()
    deps.repository.updateAvatar.mockRejectedValue(new Error('database down'))

    await expect(changeAvatar(deps)).rejects.toThrow('database down')
    expect(deps.logger.error).toHaveBeenCalledWith('account.avatar_orphaned', {
      cloudinaryId: NEW_ID,
      error: expect.any(Error),
    })
    expect(deps.deleteImage).not.toHaveBeenCalled()
  })

  it('refuses a request without a file with PHOTO_MISSING', async () => {
    const deps = makeDeps()

    // Not through changeAvatar(deps, undefined): undefined would pick its default FILE.
    const change = createAccountService(deps).changeAvatar({ userId: USER_ID, file: undefined })

    await expect(change).rejects.toMatchObject({ code: 'PHOTO_MISSING' })
    expect(deps.uploadAvatar).not.toHaveBeenCalled()
  })

  it('refuses a GIF with FORMAT_UNSUPPORTED', async () => {
    const deps = makeDeps()

    await expect(changeAvatar(deps, { ...FILE, mimetype: 'image/gif' })).rejects.toMatchObject({
      code: 'FORMAT_UNSUPPORTED',
    })
  })

  it('refuses an unreadable image with IMAGE_UNREADABLE, before any upload', async () => {
    const deps = makeDeps()
    deps.toAvatarJpeg.mockRejectedValue(new Error('unsupported image format'))

    await expect(changeAvatar(deps)).rejects.toMatchObject({ code: 'IMAGE_UNREADABLE' })
    expect(deps.uploadAvatar).not.toHaveBeenCalled()
    expect(deps.logger.warn).toHaveBeenCalledWith('account.avatar_unreadable', {
      error: expect.any(Error),
    })
  })
})

describe('removeAvatar', () => {
  it('clears the id, destroys the image and returns a user without avatar', async () => {
    const deps = makeDeps()

    const user = await createAccountService(deps).removeAvatar(USER_ID)

    expect(deps.repository.updateAvatar).toHaveBeenCalledWith(USER_ID, null)
    expect(deps.deleteImage).toHaveBeenCalledWith(PREVIOUS_ID)
    expect(user.avatarUrl).toBeNull()
    expect(deps.logger.info).toHaveBeenCalledWith('account.avatar_removed', {
      userId: USER_ID,
      cloudinaryId: PREVIOUS_ID,
      isImageDestroyed: true,
    })
  })

  it('answers the same account, without writing, when there is no photo', async () => {
    const deps = makeDeps()
    deps.repository.findUserById.mockResolvedValue({ ...USER, avatarCloudinaryId: null })

    const user = await createAccountService(deps).removeAvatar(USER_ID)

    expect(user.avatarUrl).toBeNull()
    expect(deps.repository.updateAvatar).not.toHaveBeenCalled()
    expect(deps.deleteImage).not.toHaveBeenCalled()
  })

  it('still succeeds when the image cannot be destroyed', async () => {
    const deps = makeDeps()
    deps.deleteImage.mockRejectedValue(new Error('Cloudinary down'))

    await expect(createAccountService(deps).removeAvatar(USER_ID)).resolves.toMatchObject({
      avatarUrl: null,
    })
    expect(deps.logger.info).toHaveBeenCalledWith(
      'account.avatar_removed',
      expect.objectContaining({ isImageDestroyed: false }),
    )
  })
})
```

Modify `server/src/features/account/account.service.test.ts`:

```diff
--- a/server/src/features/account/account.service.test.ts
+++ b/server/src/features/account/account.service.test.ts
@@ -24,9 +24,13 @@ function makeDeps() {
         .mockImplementation(async (_id, displayName) => ({ ...USER, displayName })),
       updatePasswordHash: vi.fn<AccountRepository['updatePasswordHash']>(),
       deleteOtherSessions: vi.fn<AccountRepository['deleteOtherSessions']>(),
+      updateAvatar: vi.fn<AccountRepository['updateAvatar']>(),
     },
     hashPassword: vi.fn<AccountServiceDeps['hashPassword']>(),
     verifyPassword: vi.fn<AccountServiceDeps['verifyPassword']>(),
+    toAvatarJpeg: vi.fn<AccountServiceDeps['toAvatarJpeg']>(),
+    uploadAvatar: vi.fn<AccountServiceDeps['uploadAvatar']>(),
+    deleteImage: vi.fn<AccountServiceDeps['deleteImage']>(),
     avatarUrl: vi.fn<AccountServiceDeps['avatarUrl']>(
       (cloudinaryId) => `https://cdn.test/${cloudinaryId}`,
     ),
```

Modify `server/src/features/account/account.service.password.test.ts`:

```diff
--- a/server/src/features/account/account.service.password.test.ts
+++ b/server/src/features/account/account.service.password.test.ts
@@ -26,9 +26,13 @@ function makeDeps() {
       updateDisplayName: vi.fn<AccountRepository['updateDisplayName']>(),
       updatePasswordHash: vi.fn<AccountRepository['updatePasswordHash']>().mockResolvedValue(),
       deleteOtherSessions: vi.fn<AccountRepository['deleteOtherSessions']>().mockResolvedValue(2),
+      updateAvatar: vi.fn<AccountRepository['updateAvatar']>(),
     },
     hashPassword: vi.fn<AccountServiceDeps['hashPassword']>().mockResolvedValue('$argon2id$new'),
     verifyPassword: vi.fn<AccountServiceDeps['verifyPassword']>().mockResolvedValue(true),
+    toAvatarJpeg: vi.fn<AccountServiceDeps['toAvatarJpeg']>(),
+    uploadAvatar: vi.fn<AccountServiceDeps['uploadAvatar']>(),
+    deleteImage: vi.fn<AccountServiceDeps['deleteImage']>(),
     avatarUrl: vi.fn<AccountServiceDeps['avatarUrl']>(),
     logger: {
       info: vi.fn<Logger['info']>(),
```

Run: `pnpm test`. Expected: FAIL, `changeAvatar` / `removeAvatar` are not functions and the fakes carry members the types do not know.

- [ ] **Step 4: The avatar rules — code**

Modify `server/src/features/account/account.repository.ts`:

```diff
--- a/server/src/features/account/account.repository.ts
+++ b/server/src/features/account/account.repository.ts
@@ -7,6 +7,7 @@ export type AccountRepository = {
   updateDisplayName: (id: string, displayName: string) => Promise<UserRecord>
   updatePasswordHash: (id: string, passwordHash: string) => Promise<void>
   deleteOtherSessions: (userId: string, keptSessionId: string) => Promise<number>
+  updateAvatar: (id: string, avatarCloudinaryId: string | null) => Promise<UserRecord>
 }
 
 export function createAccountRepository(prisma: PrismaClient): AccountRepository {
@@ -24,5 +25,7 @@ export function createAccountRepository(prisma: PrismaClient): AccountRepository
       })
       return count
     },
+    updateAvatar: (id, avatarCloudinaryId) =>
+      prisma.user.update({ where: { id }, data: { avatarCloudinaryId } }),
   }
 }
```

Modify `server/src/features/account/account.service.ts`:

```diff
--- a/server/src/features/account/account.service.ts
+++ b/server/src/features/account/account.service.ts
@@ -1,8 +1,10 @@
 import { AppError } from '../../errors/app-error.js'
 import { parseDisplayName, parsePassword } from '../../lib/account-input.js'
+import type { UploadedImage } from '../../lib/cloudinary.js'
 import type { Logger } from '../../lib/logger.js'
 import type { PublicUser } from '../../types.js'
 import { type AvatarUrlBuilder, toPublicUser } from '../auth/public-user.js'
+import { parseFile, type UploadedFile } from '../photos/photos.input.js'
 import type { AccountRepository, UserRecord } from './account.repository.js'
 
 // userId is the logged-in account: one edits only oneself. displayName comes straight from the
@@ -17,10 +19,16 @@ export type PasswordChange = {
   newPassword: unknown
 }
 
+// file is what multer left on req.file: undefined when the form had no file.
+export type AvatarChange = { userId: string; file: UploadedFile | undefined }
+
 export type AccountServiceDeps = {
   repository: AccountRepository
   hashPassword: (plain: string) => Promise<string>
   verifyPassword: (passwordHash: string, plain: string) => Promise<boolean>
+  toAvatarJpeg: (input: Buffer) => Promise<Buffer>
+  uploadAvatar: (jpeg: Buffer) => Promise<UploadedImage>
+  deleteImage: (cloudinaryId: string) => Promise<void>
   avatarUrl: AvatarUrlBuilder
   logger: Logger
 }
@@ -28,6 +36,8 @@ export type AccountServiceDeps = {
 export type AccountService = {
   changeDisplayName: (change: DisplayNameChange) => Promise<PublicUser>
   changePassword: (change: PasswordChange) => Promise<void>
+  changeAvatar: (change: AvatarChange) => Promise<PublicUser>
+  removeAvatar: (userId: string) => Promise<PublicUser>
 }
 
 // Received photos show the new name at once: « Envoyée par » reads it through a join.
@@ -80,9 +90,84 @@ async function changePassword(deps: AccountServiceDeps, change: PasswordChange):
   logger.info('account.password_changed', { userId: user.id, closedSessionCount })
 }
 
+async function convertAvatar(
+  { toAvatarJpeg, logger }: AccountServiceDeps,
+  input: Buffer,
+): Promise<Buffer> {
+  try {
+    return await toAvatarJpeg(input)
+  } catch (error: unknown) {
+    logger.warn('account.avatar_unreadable', { error })
+    throw new AppError('IMAGE_UNREADABLE')
+  }
+}
+
+// The image is already on Cloudinary: if the account cannot point to it, say so before failing.
+async function saveAvatar(
+  { repository, logger }: AccountServiceDeps,
+  userId: string,
+  cloudinaryId: string,
+): Promise<UserRecord> {
+  try {
+    return await repository.updateAvatar(userId, cloudinaryId)
+  } catch (error: unknown) {
+    logger.error('account.avatar_orphaned', { cloudinaryId, error })
+    throw error
+  }
+}
+
+// After the database write, and never fatal: the account already shows its new state, a leftover
+// image only costs storage.
+async function destroyAvatar(
+  { deleteImage, logger }: AccountServiceDeps,
+  cloudinaryId: string,
+): Promise<boolean> {
+  try {
+    await deleteImage(cloudinaryId)
+    return true
+  } catch (error: unknown) {
+    logger.error('account.avatar_orphaned', { cloudinaryId, error })
+    return false
+  }
+}
+
+async function changeAvatar(deps: AccountServiceDeps, change: AvatarChange): Promise<PublicUser> {
+  const jpeg = await convertAvatar(deps, parseFile(change.file).buffer)
+  const { id: userId, avatarCloudinaryId: previousCloudinaryId } = await findUser(
+    deps,
+    change.userId,
+  )
+  const { cloudinaryId } = await deps.uploadAvatar(jpeg)
+  const user = await saveAvatar(deps, userId, cloudinaryId)
+  const isPreviousDestroyed =
+    previousCloudinaryId !== null && (await destroyAvatar(deps, previousCloudinaryId))
+  deps.logger.info('account.avatar_changed', {
+    userId,
+    cloudinaryId,
+    previousCloudinaryId,
+    isPreviousDestroyed,
+  })
+  return toPublicUser(user, deps.avatarUrl)
+}
+
+// Idempotent, like logout: removing a photo that is already gone answers the same account.
+async function removeAvatar(deps: AccountServiceDeps, userId: string): Promise<PublicUser> {
+  const current = await findUser(deps, userId)
+  const cloudinaryId = current.avatarCloudinaryId
+  if (cloudinaryId === null) {
+    return toPublicUser(current, deps.avatarUrl)
+  }
+  const user = await deps.repository.updateAvatar(userId, null)
+  const isImageDestroyed = await destroyAvatar(deps, cloudinaryId)
+  deps.logger.info('account.avatar_removed', { userId, cloudinaryId, isImageDestroyed })
+  return toPublicUser(user, deps.avatarUrl)
+}
+
 export function createAccountService(deps: AccountServiceDeps): AccountService {
   return {
     changeDisplayName: (change) => changeDisplayName(deps, change),
     changePassword: (change) => changePassword(deps, change),
+    changeAvatar: (change) => changeAvatar(deps, change),
+    removeAvatar: (userId) => removeAvatar(deps, userId),
   }
 }
```

Modify `server/src/app.ts`:

```diff
--- a/server/src/app.ts
+++ b/server/src/app.ts
@@ -28,9 +28,9 @@ import { createPhotosController } from './features/photos/photos.controller.js'
 import { createPhotosRepository } from './features/photos/photos.repository.js'
 import { createPhotosRouter } from './features/photos/photos.routes.js'
 import { createPhotosService, type PhotosServiceDeps } from './features/photos/photos.service.js'
-import { avatarUrl, deleteImage, uploadImage } from './lib/cloudinary.js'
+import { avatarUrl, deleteImage, uploadAvatar, uploadImage } from './lib/cloudinary.js'
 import { prisma } from './lib/db.js'
-import { toFrameJpeg } from './lib/image.js'
+import { toAvatarJpeg, toFrameJpeg } from './lib/image.js'
 import { logger } from './lib/logger.js'
 import { hashPassword, verifyPassword } from './lib/password.js'
 import { requestLogger } from './lib/request-logger.js'
@@ -82,6 +82,9 @@ function assembleAccountRouter(): Router {
     repository: createAccountRepository(prisma),
     hashPassword,
     verifyPassword,
+    toAvatarJpeg,
+    uploadAvatar,
+    deleteImage,
     avatarUrl,
     logger,
   })
```

- [ ] **Step 5: Gates and commit**

Run from the repo root: `pnpm check` (expected: `Checked … files … No fixes applied.`), `pnpm typecheck` (no output besides the two package names), `pnpm test` (expected below). Expected: `Test Files  19 passed (19)`, `Tests  219 passed (219)` (+11 avatar). `account.service.ts` ends at 173 lines.

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add server/src/features/account/account.repository.ts server/src/features/account/account.service.ts server/src/app.ts server/src/features/account/account.service.avatar.test.ts server/src/features/account/account.service.test.ts server/src/features/account/account.service.password.test.ts
git commit -F <message-file>
```

Message subject: `feat(server): change and remove the avatar in the service`. Body: the file is checked as a photo (`parseFile`), converted, uploaded, saved, and the previous image destroyed after the database write without failing the request; removing is idempotent. Logs `account.avatar_changed`, `account.avatar_removed`, `account.avatar_unreadable`, `account.avatar_orphaned`. Then a blank line and the two attribution lines (Global Constraints).

### Task 7: `PUT` and `DELETE /api/account/avatar`, Bruno and docs (PR C, `feat/account-avatar`)

**Files:**
- Modify: `server/src/features/account/account.controller.ts`, `account.routes.ts`
- Create (Bruno): `server/bruno/account/avatar/folder.bru` and `01`-`09`
- Modify: `server/bruno/account/folder.bru`, `server/bruno/collection.bru`, `ARCHITECTURE.md`

- [ ] **Step 1: The Bruno requests first**

Modify `server/bruno/account/folder.bru`:

```diff
--- a/server/bruno/account/folder.bru
+++ b/server/bruno/account/folder.bru
@@ -5,8 +5,8 @@ meta {
 
 docs {
   Le compte de la personne connectée : `PATCH /api/account` (nom affiché),
-  `PUT /api/account/password`. Pas d'id dans l'URL : chaque route agit sur
-  le compte de la session.
+  `PUT /api/account/password`, `PUT` et `DELETE /api/account/avatar`. Pas
+  d'id dans l'URL : chaque route agit sur le compte de la session.
 
   Toutes les requêtes passent par le compte créé par
   `invitations/accept/05` (cookie `inviteeCookie`, mot de passe
@@ -14,6 +14,7 @@ docs {
   les autres sessions du compte, et celles du membre sont le navigateur et le
   cadre de la base de dev partagée. Un lancement interrompu laisserait aussi
   le membre renommé, ce que `auth/login/01` refuse au lancement suivant. Au
-  pire, il reste un compte jetable modifié ; chaque dossier remet quand même
-  le compte dans son état de départ.
+  pire, il reste un compte jetable modifié (et sa photo de profil sur
+  Cloudinary) ; chaque dossier remet quand même le compte dans son état de
+  départ.
 }
```

Create `server/bruno/account/avatar/folder.bru`:

```text
meta {
  name: avatar
  seq: 3
}

docs {
  `PUT /api/account/avatar`, `multipart/form-data` avec `avatar` (fichier)
  → 200 `{ user }` : le serveur en fait un carré JPEG de 256 px (recadré au
  centre), l'envoie sur Cloudinary (dossier `familyframe/avatars`) et
  détruit l'ancienne image après l'enregistrement. Mêmes limites et mêmes
  codes que l'envoi d'une photo. `DELETE /api/account/avatar` → 200
  `{ user }` avec `avatarUrl` à `null`, même sans photo.

  `05` et `06` publient deux vraies images sur Cloudinary ; `07` détruit la
  dernière (`06` a déjà détruit celle de `05`). Le dossier finit sans photo
  de profil, comme le compte au départ.
}
```

Create `server/bruno/account/avatar/01-edge-sans-fichier.bru`:

```text
meta {
  name: Edge - sans fichier
  type: http
  seq: 1
}

put {
  url: {{baseUrl}}/api/account/avatar
  body: multipartForm
  auth: none
}

body:multipart-form {
  legende: une photo de profil sans fichier
}

script:pre-request {
  if (!bru.getVar('inviteeCookie')) {
    throw new Error('inviteeCookie absent : lancer toute la collection, invitations/accept/05 doit passer')
  }
  // The throwaway account of invitations/accept/05, never the member (see account/folder.bru).
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 400
  res.body.error: eq PHOTO_MISSING
}

docs {
  EDGE → 400 PHOTO_MISSING : un champ texte (le corps multipart n'est pas
  vide), mais aucun fichier dans `avatar`.
}
```

Create `server/bruno/account/avatar/02-edge-autre-champ.bru`:

```text
meta {
  name: Edge - fichier dans un autre champ
  type: http
  seq: 2
}

put {
  url: {{baseUrl}}/api/account/avatar
  body: multipartForm
  auth: none
}

body:multipart-form {
  photo: @file(fixtures/photo.jpg) @contentType(image/jpeg)
}

script:pre-request {
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 400
  res.body.error: eq UPLOAD_INVALID
}

docs {
  EDGE → 400 UPLOAD_INVALID : le champ de l'envoi d'une photo (`photo`) n'est
  pas celui de la photo de profil (`avatar`), Multer le refuse.
}
```

Create `server/bruno/account/avatar/03-edge-gif.bru`:

```text
meta {
  name: Edge - image GIF
  type: http
  seq: 3
}

put {
  url: {{baseUrl}}/api/account/avatar
  body: multipartForm
  auth: none
}

body:multipart-form {
  avatar: @file(fixtures/animation.gif) @contentType(image/gif)
}

script:pre-request {
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 415
  res.body.error: eq FORMAT_UNSUPPORTED
}

docs {
  EDGE → 415 FORMAT_UNSUPPORTED : seuls JPEG, PNG et WebP sont acceptés,
  comme pour une photo.
}
```

Create `server/bruno/account/avatar/04-edge-faux-jpeg.bru`:

```text
meta {
  name: Edge - texte déguisé en JPEG
  type: http
  seq: 4
}

put {
  url: {{baseUrl}}/api/account/avatar
  body: multipartForm
  auth: none
}

body:multipart-form {
  avatar: @file(fixtures/pas-une-image.jpg) @contentType(image/jpeg)
}

script:pre-request {
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 422
  res.body.error: eq IMAGE_UNREADABLE
}

docs {
  EDGE → 422 IMAGE_UNREADABLE : le type annoncé est `image/jpeg`, mais Sharp
  ne décode pas le fichier. Rien n'est envoyé sur Cloudinary.
}
```

Create `server/bruno/account/avatar/05-nominal.bru`:

```text
meta {
  name: Nominal - première photo de profil
  type: http
  seq: 5
}

put {
  url: {{baseUrl}}/api/account/avatar
  body: multipartForm
  auth: none
}

body:multipart-form {
  avatar: @file(fixtures/photo.jpg) @contentType(image/jpeg)
}

script:pre-request {
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 200
  res.body.user.email: eq {{inviteEmail}}
  res.body.user.avatarUrl: isString
  res.body.user.avatarCloudinaryId: isUndefined
}

script:post-response {
  const axios = require('axios')
  const { avatarUrl } = res.body.user
  test('une URL Cloudinary signée, dans le dossier des photos de profil', () => {
    expect(avatarUrl).to.match(/^https:\/\/res\.cloudinary\.com\/.+\/familyframe\/avatars\//)
  })
  test('l\'image se charge (transformations strictes comprises)', async () => {
    const image = await axios.get(avatarUrl, { responseType: 'arraybuffer' })
    expect(image.headers['content-type']).to.match(/^image\//)
  })
  bru.setVar('firstAvatarUrl', avatarUrl)
}

docs {
  NOMINAL → 200 `{ user }` avec `avatarUrl`, l'URL signée de l'image dans
  `familyframe/avatars`, jamais son id Cloudinary. Le script charge l'image :
  une URL qui ne passe pas les transformations strictes répondrait 401.
}
```

Create `server/bruno/account/avatar/06-nominal-remplacement.bru`:

```text
meta {
  name: Nominal - nouvelle photo à la place de l'ancienne
  type: http
  seq: 6
}

put {
  url: {{baseUrl}}/api/account/avatar
  body: multipartForm
  auth: none
}

body:multipart-form {
  avatar: @file(fixtures/photo.png) @contentType(image/png)
}

script:pre-request {
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 200
  res.body.user.avatarUrl: isString
}

script:post-response {
  const axios = require('axios')
  const baseUrl = bru.getEnvVar('baseUrl')
  test('une autre image que celle de 05', () => {
    expect(res.body.user.avatarUrl).to.not.equal(bru.getVar('firstAvatarUrl'))
  })
  test('GET /api/auth/me renvoie la nouvelle URL', async () => {
    // A script request does not get the collection headers: send the cookie itself.
    const me = await axios.get(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: bru.getVar('inviteeCookie') },
    })
    expect(me.data.user.avatarUrl).to.equal(res.body.user.avatarUrl)
  })
}

docs {
  NOMINAL → 200 : un PNG remplace le JPEG de `05`. L'URL change (nouvelle
  image), `GET /api/auth/me` la renvoie. Le serveur détruit l'image de `05`
  après l'enregistrement : le CDN peut encore la servir un moment, le test
  ne la recharge donc pas.
}
```

Create `server/bruno/account/avatar/07-nominal-retrait.bru`:

```text
meta {
  name: Nominal - retrait de la photo de profil
  type: http
  seq: 7
}

delete {
  url: {{baseUrl}}/api/account/avatar
  body: none
  auth: none
}

script:pre-request {
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 200
  res.body.user.email: eq {{inviteEmail}}
  res.body.user.avatarUrl: isNull
}

docs {
  NOMINAL → 200 `{ user }` sans photo : l'id est effacé, puis l'image de
  `06` détruite sur Cloudinary. Le client affiche de nouveau l'initiale.
}
```

Create `server/bruno/account/avatar/08-nominal-retrait-sans-photo.bru`:

```text
meta {
  name: Nominal - retrait sans photo
  type: http
  seq: 8
}

delete {
  url: {{baseUrl}}/api/account/avatar
  body: none
  auth: none
}

script:pre-request {
  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
}

assert {
  res.status: eq 200
  res.body.user.avatarUrl: isNull
}

docs {
  NOMINAL → 200 : retirer une photo déjà retirée n'est pas une erreur, comme
  une déconnexion répétée. Un double clic ne montre pas d'erreur.
}
```

Create `server/bruno/account/avatar/09-edge-sans-cookie.bru`:

```text
meta {
  name: Edge - sans cookie de session
  type: http
  seq: 9
}

put {
  url: {{baseUrl}}/api/account/avatar
  body: multipartForm
  auth: none
}

body:multipart-form {
  avatar: @file(fixtures/photo.jpg) @contentType(image/jpeg)
}

script:pre-request {
  // collection.bru sends the session cookie to every request: remove it here.
  req.deleteHeader('Cookie')
}

assert {
  res.status: eq 401
  res.body.error: eq UNAUTHENTICATED
}

docs {
  EDGE → 401 UNAUTHENTICATED : `requireAuth` répond avant Multer, rien n'est
  lu ni envoyé.
}
```

Modify `server/bruno/collection.bru`:

```diff
--- a/server/bruno/collection.bru
+++ b/server/bruno/collection.bru
@@ -41,7 +41,8 @@ docs {
 
   Le dossier `account/` modifie aussi ce compte jetable, jamais le membre, et
   le remet dans son état de départ en fin de dossier (voir
-  `account/folder.bru`).
+  `account/folder.bru`). `account/avatar/` publie deux photos de profil sur
+  Cloudinary et les détruit avant la fin.
 
   Le dossier `photos/share/` lit les ids du membre et de l'admin
   (`memberId`, `adminId`, par `GET /api/auth/me`), rend les deux comptes amis
```

Start the test API (Global Constraints, « Test API »): from `server/`, in its own background command, `PORT=3002 npx tsx --env-file-if-exists=.env src/server.ts`; wait for `server.started`. It does not watch files: restart it after each code change (stop it as described in Global Constraints).

From `server/bruno/`: `pnpm dlx @usebruno/cli@4.2.0 run . -r --env Local --disable-cookies --env-var baseUrl=http://localhost:3002`. Expected FAIL: `01`-`08` (`404 ROUTE_NOT_FOUND`); `09` (401 from `requireAuth`) already passes.

- [ ] **Step 2: Controller and routes**

Modify `server/src/features/account/account.controller.ts`:

```diff
--- a/server/src/features/account/account.controller.ts
+++ b/server/src/features/account/account.controller.ts
@@ -5,6 +5,8 @@ import type { AccountService } from './account.service.js'
 export type AccountController = {
   changeDisplayName: (req: Request, res: Response) => Promise<void>
   changePassword: (req: Request, res: Response) => Promise<void>
+  changeAvatar: (req: Request, res: Response) => Promise<void>
+  removeAvatar: (req: Request, res: Response) => Promise<void>
 }
 
 // Every route edits the logged-in account: the id comes from the session, never from the URL.
@@ -27,5 +29,13 @@ export function createAccountController(service: AccountService): AccountControl
       })
       res.status(204).end()
     },
+    async changeAvatar(req, res) {
+      const user = await service.changeAvatar({ userId: currentUser(req).id, file: req.file })
+      res.json({ user })
+    },
+    async removeAvatar(req, res) {
+      const user = await service.removeAvatar(currentUser(req).id)
+      res.json({ user })
+    },
   }
 }
```

Modify `server/src/features/account/account.routes.ts`:

```diff
--- a/server/src/features/account/account.routes.ts
+++ b/server/src/features/account/account.routes.ts
@@ -1,4 +1,5 @@
 import express, { Router } from 'express'
+import { upload } from '../photos/photos.upload.js'
 import type { AccountController } from './account.controller.js'
 
 // app.ts mounts the router behind requireAuth: every route acts on the logged-in account.
@@ -7,5 +8,8 @@ export function createAccountRouter(controller: AccountController): Router {
   // A JSON route brings its own parser (see the logging spec).
   router.patch('/', express.json(), controller.changeDisplayName)
   router.put('/password', express.json(), controller.changePassword)
+  // The photo upload's Multer settings: in memory, 10 MB, one file.
+  router.put('/avatar', upload.single('avatar'), controller.changeAvatar)
+  router.delete('/avatar', controller.removeAvatar)
   return router
 }
```

- [ ] **Step 3: Gates**

Run from the repo root: `pnpm check` (expected: `Checked … files … No fixes applied.`), `pnpm typecheck` (no output besides the two package names), `pnpm test` (expected below). Expected: `Tests  219 passed (219)`.

Restart the test API, then the Bruno gate. Expected: 112 requests, 242 assertions, 44 `test()` calls, all passed. `05` loads the signed avatar URL: a 401 from Cloudinary there means « Strict transformations » rejected it (README prerequisite). A second run: same result (`07` left the invitee without a photo; `06` destroyed `05`'s image, `07` destroyed `06`'s).

- [ ] **Step 4: Commit**

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add server/src/features/account/account.controller.ts server/src/features/account/account.routes.ts server/bruno/account server/bruno/collection.bru
git commit -F <message-file>
```

Message subject: `feat(server): let users change their profile photo`. Body: `PUT /api/account/avatar` (multipart `avatar`, the Multer settings of the photo upload) and `DELETE /api/account/avatar`, both answering the public user; Bruno uploads two images and ends without any. Then a blank line and the two attribution lines (Global Constraints).

- [ ] **Step 5: Docs**

Modify `ARCHITECTURE.md`:

```diff
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -60,26 +60,28 @@ Le routage est fait côté navigateur (`react-router`). En production (J2), le s
 
 ## API
 
-| Route                                   | Réponse                                                                                                                                                                                                                |
-| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| `GET /api/health`                       | `200 { "status": "ok" }` (servira de healthcheck Docker en J2)                                                                                                                                                         |
-| `POST /api/auth/login`                  | JSON `{ email, password }` → `200 { user }` + cookie `ff_session`                                                                                                                                                      |
-| `POST /api/auth/logout`                 | `204` ; supprime la session et efface le cookie (répond `204` aussi sans session)                                                                                                                                      |
-| `GET /api/auth/me`                      | `200 { user }`, l'utilisateur de la session                                                                                                                                                                            |
-| `POST /api/invitations`                 | JSON `{ email }` → `201 { invitation, token }` : réservé à l'admin ; le jeton brut n'est envoyé qu'une fois, le client en fait le lien                                                                                 |
-| `GET /api/invitations`                  | `200 { invitations }` : réservé à l'admin ; toutes les invitations, la plus récente en premier                                                                                                                         |
-| `POST /api/invitations/accept`          | JSON `{ token, displayName, password }` → `201 { user }` + cookie `ff_session` : public ; crée un compte `member` à l'e-mail de l'invitation et le connecte                                                            |
-| `GET /api/friendships`                  | `200 { friends, incoming, outgoing }` : amis, demandes reçues et demandes envoyées du compte connecté, la plus récente en premier                                                                                      |
-| `POST /api/friendships`                 | JSON `{ email }` → `201 { friendship }` : demande d'ami à l'e-mail exact d'un compte existant ; `200 { friendship }` si sa demande m'attendait (acceptée)                                                              |
-| `POST /api/friendships/:id/accept`      | `200 { friendship }` : le destinataire d'une demande en attente l'accepte ; l'amitié devient mutuelle                                                                                                                  |
-| `DELETE /api/friendships/:id`           | `204` sans corps, pour l'un ou l'autre côté : refuse une demande reçue, annule une demande envoyée ou retire un ami                                                                                                    |
-| `PATCH /api/account`                    | JSON `{ displayName }` → `200 { user }` : change le nom affiché du compte connecté ; l'e-mail ne se modifie pas                                                                                                        |
-| `PUT /api/account/password`             | JSON `{ currentPassword, newPassword }` → `204` sans corps : vérifie le mot de passe actuel, enregistre le nouveau et ferme toutes les autres sessions du compte (celle de la requête reste ouverte)                   |
-| `GET /api/photos?cursor=<id>&limit=<n>` | `200 { photos, nextCursor }` : photos du compte connecté, la plus récente en premier ; `limit` de 1 à 100 (30 par défaut) ; `nextCursor` est l'id à passer en `cursor` pour la page suivante, `null` à la dernière     |
-| `POST /api/photos`                      | `multipart/form-data` avec `photo` (fichier) → `201 Photo`                                                                                                                                                             |
-| `POST /api/photos/:id/share`            | JSON `{ friendId }` → `201 Photo` : envoie une photo de sa bibliothèque à un ami accepté ; l'ami reçoit une nouvelle photo qui pointe vers la même image Cloudinary, et la réponse est cette photo telle qu'il la voit |
-| `POST /api/photos/share`                | `multipart/form-data` avec `photo` (fichier) et `friendId` → `201 Photo` : envoie un fichier de l'appareil à un ami accepté ; il n'entre que dans la bibliothèque de l'ami                                             |
-| `DELETE /api/photos/:id`                | `204` sans corps, pour une photo du compte connecté ; supprime l'enregistrement, puis l'image Cloudinary (cache CDN compris) si plus aucune photo n'y renvoie                                                          |
+| Route                                   | Réponse                                                                                                                                                                                                                                              |
+| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| `GET /api/health`                       | `200 { "status": "ok" }` (servira de healthcheck Docker en J2)                                                                                                                                                                                       |
+| `POST /api/auth/login`                  | JSON `{ email, password }` → `200 { user }` + cookie `ff_session`                                                                                                                                                                                    |
+| `POST /api/auth/logout`                 | `204` ; supprime la session et efface le cookie (répond `204` aussi sans session)                                                                                                                                                                    |
+| `GET /api/auth/me`                      | `200 { user }`, l'utilisateur de la session                                                                                                                                                                                                          |
+| `POST /api/invitations`                 | JSON `{ email }` → `201 { invitation, token }` : réservé à l'admin ; le jeton brut n'est envoyé qu'une fois, le client en fait le lien                                                                                                               |
+| `GET /api/invitations`                  | `200 { invitations }` : réservé à l'admin ; toutes les invitations, la plus récente en premier                                                                                                                                                       |
+| `POST /api/invitations/accept`          | JSON `{ token, displayName, password }` → `201 { user }` + cookie `ff_session` : public ; crée un compte `member` à l'e-mail de l'invitation et le connecte                                                                                          |
+| `GET /api/friendships`                  | `200 { friends, incoming, outgoing }` : amis, demandes reçues et demandes envoyées du compte connecté, la plus récente en premier                                                                                                                    |
+| `POST /api/friendships`                 | JSON `{ email }` → `201 { friendship }` : demande d'ami à l'e-mail exact d'un compte existant ; `200 { friendship }` si sa demande m'attendait (acceptée)                                                                                            |
+| `POST /api/friendships/:id/accept`      | `200 { friendship }` : le destinataire d'une demande en attente l'accepte ; l'amitié devient mutuelle                                                                                                                                                |
+| `DELETE /api/friendships/:id`           | `204` sans corps, pour l'un ou l'autre côté : refuse une demande reçue, annule une demande envoyée ou retire un ami                                                                                                                                  |
+| `PATCH /api/account`                    | JSON `{ displayName }` → `200 { user }` : change le nom affiché du compte connecté ; l'e-mail ne se modifie pas                                                                                                                                      |
+| `PUT /api/account/password`             | JSON `{ currentPassword, newPassword }` → `204` sans corps : vérifie le mot de passe actuel, enregistre le nouveau et ferme toutes les autres sessions du compte (celle de la requête reste ouverte)                                                 |
+| `PUT /api/account/avatar`               | `multipart/form-data` avec `avatar` (fichier) → `200 { user }` : carré JPEG de 256 px recadré au centre, envoyé sur Cloudinary (`familyframe/avatars`) ; l'ancienne image est détruite après l'enregistrement ; mêmes limites que `POST /api/photos` |
+| `DELETE /api/account/avatar`            | `200 { user }` avec `avatarUrl` à `null` : efface la photo de profil, puis détruit l'image ; répond de même sans photo                                                                                                                               |
+| `GET /api/photos?cursor=<id>&limit=<n>` | `200 { photos, nextCursor }` : photos du compte connecté, la plus récente en premier ; `limit` de 1 à 100 (30 par défaut) ; `nextCursor` est l'id à passer en `cursor` pour la page suivante, `null` à la dernière                                   |
+| `POST /api/photos`                      | `multipart/form-data` avec `photo` (fichier) → `201 Photo`                                                                                                                                                                                           |
+| `POST /api/photos/:id/share`            | JSON `{ friendId }` → `201 Photo` : envoie une photo de sa bibliothèque à un ami accepté ; l'ami reçoit une nouvelle photo qui pointe vers la même image Cloudinary, et la réponse est cette photo telle qu'il la voit                               |
+| `POST /api/photos/share`                | `multipart/form-data` avec `photo` (fichier) et `friendId` → `201 Photo` : envoie un fichier de l'appareil à un ami accepté ; il n'entre que dans la bibliothèque de l'ami                                                                           |
+| `DELETE /api/photos/:id`                | `204` sans corps, pour une photo du compte connecté ; supprime l'enregistrement, puis l'image Cloudinary (cache CDN compris) si plus aucune photo n'y renvoie                                                                                        |
 
 Toutes les routes `/api/photos`, `/api/friendships`, `/api/account`, `GET /api/auth/me` et les routes admin de `/api/invitations` demandent une session ; sans elle : `401 UNAUTHENTICATED`. Les routes admin répondent `403 FORBIDDEN` à un membre. Un `user` vaut `{ id, email, displayName, role, avatarUrl }` (`role` : `member` ou `admin` ; `avatarUrl` : l'URL signée de sa photo de profil, `null` tant qu'il n'en a pas choisi), jamais le hash du mot de passe ni l'identifiant Cloudinary de la photo.
 
@@ -95,7 +97,7 @@ En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code e
 
 | Cas                                                                                                                                       | Statut | `error`                 |
 | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------- |
-| aucun fichier                                                                                                                             | 400    | `PHOTO_MISSING`         |
+| aucun fichier (photo ou photo de profil)                                                                                                  | 400    | `PHOTO_MISSING`         |
 | autre erreur Multer (mauvais champ, plusieurs fichiers)                                                                                   | 400    | `UPLOAD_INVALID`        |
 | corps JSON illisible (routes qui lisent du JSON, voir [Authentification](#authentification))                                              | 400    | `BODY_INVALID`          |
 | e-mail absent ou mal formé (création d'invitation, demande d'ami)                                                                         | 400    | `EMAIL_INVALID`         |
@@ -168,7 +170,7 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 - `features/auth/` suit le même découpage (`auth.repository.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`), plus `auth.middleware.ts` (garde HTTP), `auth.guard.ts` (`currentUser`, `requireRole`), `auth.socket.ts` (garde Socket.IO) et `auth.cookie.ts` (pose et efface le cookie). Le service d'auth reçoit ses dépendances (`repository`, `hashToken`, `generateToken`, `verifyPassword`, `avatarUrl`, `now`, `logger`) ; `app.ts` l'assemble une fois (`assembleAuthService`) et `server.ts` le partage avec Socket.IO.
 - `features/invitations/` suit le même découpage (`invitations.repository.ts`, `invitations.service.ts`, `invitations.controller.ts`, `invitations.routes.ts`). Le service reçoit `repository` (seul endroit qui crée un compte), `generateToken`, `hashToken`, `hashPassword`, `avatarUrl`, `now` et `logger` ; le contrôleur reçoit aussi le service d'auth pour `openSession` ; `app.ts` construit `requireAdmin = requireRole('admin')` une fois et le passe au routeur, derrière `requireAuth`.
 - `features/friendships/` suit le même découpage (`friendships.repository.ts`, `friendships.service.ts`, `friendships.controller.ts`, `friendships.routes.ts`). Le service reçoit `repository`, `avatarUrl` et `logger` ; le repository calcule `pairKey` et ne lit des comptes que `id`, `email`, `displayName` et `avatarCloudinaryId`. `app.ts` monte le routeur derrière `requireAuth`, comme les photos. Le service expose aussi `areFriends(userId, otherUserId)`, que le service photos reçoit en dépendance : la règle « amis = ligne acceptée » reste ici. `app.ts` construit le service amis une fois (`assembleFriendshipsService`) et le passe aux deux routeurs.
-- `features/account/` suit le même découpage (`account.repository.ts`, `account.service.ts`, `account.controller.ts`, `account.routes.ts`) : le compte de la personne connectée, jamais un autre (l'id vient de la session, pas de l'URL). Le service reçoit `repository`, `hashPassword`, `verifyPassword`, `avatarUrl` et `logger`. `app.ts` monte le routeur derrière `requireAuth`.
+- `features/account/` suit le même découpage (`account.repository.ts`, `account.service.ts`, `account.controller.ts`, `account.routes.ts`) : le compte de la personne connectée, jamais un autre (l'id vient de la session, pas de l'URL). Le service reçoit `repository`, `hashPassword`, `verifyPassword`, `toAvatarJpeg`, `uploadAvatar`, `deleteImage`, `avatarUrl` et `logger`. La photo de profil reprend la configuration Multer (`photos.upload.ts`) et `parseFile` (`photos.input.ts`) des photos : mêmes formats, même taille maximale, mêmes codes d'erreur. `app.ts` monte le routeur derrière `requireAuth`.
 - `features/auth/public-user.ts` construit le `user` renvoyé par l'API (`toPublicUser`, utilisé par les services auth, invitations et compte) : l'URL de la photo de profil vient de `avatarUrl` (`lib/cloudinary.ts`), reçu en dépendance pour qu'un test unitaire n'ait pas besoin de la configuration Cloudinary. Le service amis s'en sert aussi (`toAvatarUrl`) pour l'autre compte d'une amitié.
 - Les dépendances sont passées par des fonctions-fabriques (`createPhotosService({ repository, toFrameJpeg, uploadImage, deleteImage, areFriends, logger })`), assemblées dans `app.ts` : un test peut fournir de fausses implémentations.
 - `server/src/lib/` regroupe les clients techniques : Prisma (`db.ts`), Cloudinary, sharp (`image.ts`), `email.ts` (`parseEmail`, la même règle pour une invitation et une demande d'ami) et `account-input.ts` (`parseDisplayName`, `parsePassword` et leurs bornes, les mêmes règles à la création du compte par invitation et à sa modification par son propriétaire).
@@ -207,6 +209,10 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 | `account.renamed`                                                     | info                          | service compte, avec `userId` ; jamais le nom                                                                                                                                                                                   |
 | `account.password_changed`                                            | info                          | service compte, avec `userId` et `closedSessionCount` (autres sessions fermées) ; jamais un mot de passe                                                                                                                        |
 | `account.password_change_failed`                                      | warn                          | service compte : mot de passe actuel faux, avec `reason` (`incorrect_password`) et `userId`                                                                                                                                     |
+| `account.avatar_changed`                                              | info                          | service compte, avec `userId`, `cloudinaryId`, `previousCloudinaryId` (`null` pour une première photo) et `isPreviousDestroyed`                                                                                                 |
+| `account.avatar_removed`                                              | info                          | service compte, avec `userId`, `cloudinaryId` et `isImageDestroyed` ; rien quand le compte n'avait pas de photo                                                                                                                 |
+| `account.avatar_unreadable`                                           | warn                          | service compte, erreur de sharp                                                                                                                                                                                                 |
+| `account.avatar_orphaned`                                             | error                         | service compte : image de profil sur Cloudinary sans compte qui y renvoie (échec d'enregistrement ou de destruction)                                                                                                            |
 | `server.error`                                                        | error                         | `errors/error-handler.ts` (chaque 500), `auth.socket.ts` (handshake)                                                                                                                                                            |
 | `server.stopping` / `server.stopped` / `server.stop_failed`           | info / info / error           | `server.ts`, à l'arrêt                                                                                                                                                                                                          |
 | `process.crashed`                                                     | error                         | `server.ts`, exception ou rejet non géré, puis arrêt                                                                                                                                                                            |
```

Run `pnpm check:fix` (the API table's widest row changes: Biome realigns the whole table), then `pnpm check`.

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add ARCHITECTURE.md
git commit -F <message-file>
```

Message subject: `docs: describe the profile photo routes`. Body: the two routes, the shared Multer and `parseFile`, the four `account.avatar_*` logs. Then a blank line and the two attribution lines (Global Constraints).

> **Controller:** before Task 8, `gh stack add feat/client-settings`.

---

## PR D — `feat/client-settings`

### Task 8: Avatars with photos, the settings page, its name and email cards (PR D, `feat/client-settings`)

**Files:**
- Create: `client/src/auth/accountRules.ts`; Modify: `client/src/components/auth/InviteForm.tsx`
- Create: `client/src/accountApi.ts`, `client/src/hooks/useAccountSave.ts`, `client/src/components/settings/{SettingsCard,DisplayNameCard,EmailCard}.tsx`, `client/src/pages/SettingsPage.tsx`
- Modify: `client/src/auth/{authApi.ts,AuthContext.ts,AuthProvider.tsx}`, `client/src/components/auth/{UserAvatar,UserBadge,UserMenu}.tsx`, `client/src/components/friends/FriendshipRow.tsx`, `client/src/components/nav/MobileNav.tsx`, `client/src/components/form/TextField.tsx`, `client/src/App.tsx`
- Modify: `README.md`, `ARCHITECTURE.md`

**Interfaces:**
- Produces:
  ```ts
  // auth/authApi.ts: readUser is now exported
  export function readUser(body: unknown): PublicUser | null
  // AuthContextValue gains
  replaceUser: (user: PublicUser) => void
  // accountApi.ts (Task 9 adds putAvatar, deleteAvatar, putPassword, PasswordChangeResult)
  export type AccountSaveResult = { status: 'saved'; user: PublicUser } | { status: 'failed'; message: string } | { status: 'unauthenticated' }
  export function patchDisplayName(displayName: string): Promise<AccountSaveResult>
  // hooks/useAccountSave.ts
  export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
  export type AccountSave = { status: SaveStatus; error: string; run: (request) => Promise<boolean> }
  // components/auth/UserAvatar.tsx
  type UserAvatarProps = { name: string; avatarUrl?: string | null; className?: string }
  // components/settings/SettingsCard.tsx
  type SettingsCardProps = { title; description; save: AccountSave; onSubmit: () => Promise<void>; children; extraActions?; isSubmitDisabled? }
  ```
- No client test runner: client tasks are verified by `pnpm typecheck`, `pnpm build`, `pnpm check` and the manual checks of the final verification.

- [ ] **Step 1: Share the form rules (refactor)**

Create `client/src/auth/accountRules.ts`:

```ts
// Mirror the server's limits (server/src/lib/account-input.ts): the browser catches most
// mistakes before a request. Keep both in sync.
export const DISPLAY_NAME_MAX_LENGTH = 50
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

// No password reset exists: a typo would lock the account, so the client compares both entries.
export const PASSWORD_MISMATCH_MESSAGE = 'Les deux mots de passe ne correspondent pas.'
```

Modify `client/src/components/auth/InviteForm.tsx`:

```diff
--- a/client/src/components/auth/InviteForm.tsx
+++ b/client/src/components/auth/InviteForm.tsx
@@ -1,16 +1,15 @@
 import { type JSX, type SubmitEvent, useState } from 'react'
 import { useAuth } from '@/auth/AuthContext.ts'
+import {
+  DISPLAY_NAME_MAX_LENGTH,
+  PASSWORD_MAX_LENGTH,
+  PASSWORD_MIN_LENGTH,
+  PASSWORD_MISMATCH_MESSAGE,
+} from '@/auth/accountRules.ts'
 import { TextField } from '@/components/form/TextField.tsx'
 import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
 import { Button } from '@/components/ui/button.tsx'
 
-// Mirror the server's limits (server/src/lib/account-input.ts): the browser catches most
-// mistakes before a request. Keep both in sync.
-const DISPLAY_NAME_MAX_LENGTH = 50
-const PASSWORD_MIN_LENGTH = 12
-const PASSWORD_MAX_LENGTH = 128
-const PASSWORD_MISMATCH_MESSAGE = 'Les deux mots de passe ne correspondent pas.'
-
 type InviteFields = { displayName: string; password: string; confirmation: string }
 
 const EMPTY_FIELDS: InviteFields = { displayName: '', password: '', confirmation: '' }
@@ -42,7 +41,6 @@ function useInviteForm({ token, onJoiningChange }: InviteFormProps): InviteFormS
 
   async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
     event.preventDefault()
-    // No password reset exists: a typo would lock the account, so the client compares.
     if (fields.password !== fields.confirmation) {
       setError(PASSWORD_MISMATCH_MESSAGE)
       return
```

Run: `pnpm check`, `pnpm typecheck`.

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add client/src/auth/accountRules.ts client/src/components/auth/InviteForm.tsx
git commit -F <message-file>
```

Message subject: `refactor(client): share the account form rules`. Body: the length limits and the mismatch message leave `InviteForm` for `auth/accountRules.ts`: the password card uses them too. Then a blank line and the two attribution lines (Global Constraints).

- [ ] **Step 2: The settings page, the avatar image, the menu entries**

Modify `client/src/auth/authApi.ts`:

```diff
--- a/client/src/auth/authApi.ts
+++ b/client/src/auth/authApi.ts
@@ -7,8 +7,8 @@ export type LoginResult =
 
 export type InvitationAcceptance = { token: string; displayName: string; password: string }
 
-// /login, /me and /invitations/accept all answer { user }.
-function readUser(body: unknown): PublicUser | null {
+// /login, /me, /invitations/accept and the account routes all answer { user }.
+export function readUser(body: unknown): PublicUser | null {
   if (typeof body === 'object' && body !== null && 'user' in body && isPublicUser(body.user)) {
     return body.user
   }
```

Create `client/src/accountApi.ts`:

```ts
import { errorMessage, UNAUTHORIZED_STATUS } from '@/api.ts'
import { readUser } from '@/auth/authApi.ts'
import type { PublicUser } from '@/auth/user.ts'

// user: the account as the server saved it, for AuthContext.
export type AccountSaveResult =
  | { status: 'saved'; user: PublicUser }
  | { status: 'failed'; message: string }
  | { status: 'unauthenticated' }

// Every route that edits the account answers { user }.
async function sendForUser(url: string, init: RequestInit): Promise<AccountSaveResult> {
  try {
    const res = await fetch(url, init)
    if (res.status === UNAUTHORIZED_STATUS) return { status: 'unauthenticated' }
    // Not JSON when the dev proxy answers for a stopped API.
    const data: unknown = await res.json().catch(() => null)
    const user = res.ok ? readUser(data) : null
    return user ? { status: 'saved', user } : { status: 'failed', message: errorMessage(data) }
  } catch {
    // fetch rejects only on network failure.
    return { status: 'failed', message: errorMessage(null) }
  }
}

export function patchDisplayName(displayName: string): Promise<AccountSaveResult> {
  return sendForUser('/api/account', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  })
}
```

Modify `client/src/auth/AuthContext.ts`:

```diff
--- a/client/src/auth/AuthContext.ts
+++ b/client/src/auth/AuthContext.ts
@@ -12,6 +12,8 @@ export type AuthContextValue = {
   logout: () => Promise<void>
   // For a 401 from the API: the session ended on the server.
   dropUser: () => void
+  // After an edit on /settings: the server answered the account as it saved it.
+  replaceUser: (user: PublicUser) => void
 }
 
 export const AuthContext = createContext<AuthContextValue | null>(null)
```

Modify `client/src/auth/AuthProvider.tsx`:

```diff
--- a/client/src/auth/AuthProvider.tsx
+++ b/client/src/auth/AuthProvider.tsx
@@ -56,7 +56,10 @@ function useSessionState(): {
   return { user, setUser, isLoading }
 }
 
-type AuthActions = Pick<AuthContextValue, 'login' | 'acceptInvitation' | 'logout' | 'dropUser'>
+type AuthActions = Pick<
+  AuthContextValue,
+  'login' | 'acceptInvitation' | 'logout' | 'dropUser' | 'replaceUser'
+>
 
 // Both ways in set the user on success only: a failed attempt keeps the current state.
 function useAuthActions(setUser: (user: PublicUser | null) => void): AuthActions {
@@ -85,17 +88,16 @@ function useAuthActions(setUser: (user: PublicUser | null) => void): AuthActions
 
   const dropUser = useCallback((): void => setUser(null), [setUser])
 
-  return { login, acceptInvitation, logout, dropUser }
+  const replaceUser = useCallback((user: PublicUser): void => setUser(user), [setUser])
+
+  return { login, acceptInvitation, logout, dropUser, replaceUser }
 }
 
 export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
   const { user, setUser, isLoading } = useSessionState()
-  const { login, acceptInvitation, logout, dropUser } = useAuthActions(setUser)
+  const actions = useAuthActions(setUser)
 
-  const value = useMemo(
-    () => ({ user, isLoading, login, acceptInvitation, logout, dropUser }),
-    [user, isLoading, login, acceptInvitation, logout, dropUser],
-  )
+  const value = useMemo(() => ({ user, isLoading, ...actions }), [user, isLoading, actions])
 
   return <AuthContext value={value}>{children}</AuthContext>
 }
```

Create `client/src/hooks/useAccountSave.ts`:

```ts
import { useState } from 'react'
import type { AccountSaveResult } from '@/accountApi.ts'
import { useAuth } from '@/auth/AuthContext.ts'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export type AccountSave = {
  status: SaveStatus
  error: string
  // true when the server saved it: the card then empties what must not stay on screen.
  run: (request: () => Promise<AccountSaveResult>) => Promise<boolean>
}

// One per settings card: each card saves on its own and shows its own result.
export function useAccountSave(): AccountSave {
  const { dropUser, replaceUser } = useAuth()
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState('')

  async function run(request: () => Promise<AccountSaveResult>): Promise<boolean> {
    setStatus('saving')
    const result = await request()
    // The session ended on the server: RequireAuth sends the user to /login.
    if (result.status === 'unauthenticated') {
      dropUser()
      return false
    }
    if (result.status === 'failed') {
      setError(result.message)
      setStatus('error')
      return false
    }
    // The app bar, the menus and the other cards read the user from AuthContext.
    replaceUser(result.user)
    setStatus('saved')
    return true
  }

  return { status, error, run }
}
```

Modify `client/src/components/auth/UserAvatar.tsx`:

```diff
--- a/client/src/components/auth/UserAvatar.tsx
+++ b/client/src/components/auth/UserAvatar.tsx
@@ -1,17 +1,26 @@
 import type { JSX } from 'react'
 import { cn } from '@/lib/utils.ts'
 
-type UserAvatarProps = { name: string; className?: string }
+// avatarUrl: null or absent shows the initial, as before any profile photo.
+type UserAvatarProps = { name: string; avatarUrl?: string | null; className?: string }
 
-export function UserAvatar({ name, className }: UserAvatarProps): JSX.Element {
+const AVATAR_CLASSES =
+  'grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground uppercase'
+
+// Decorative (aria-hidden, empty alt): the name is always written next to it.
+export function UserAvatar({ name, avatarUrl, className }: UserAvatarProps): JSX.Element {
+  if (avatarUrl) {
+    return (
+      <img
+        src={avatarUrl}
+        alt=""
+        aria-hidden
+        className={cn(AVATAR_CLASSES, 'object-cover', className)}
+      />
+    )
+  }
   return (
-    <span
-      aria-hidden
-      className={cn(
-        'grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground uppercase',
-        className,
-      )}
-    >
+    <span aria-hidden className={cn(AVATAR_CLASSES, className)}>
       {name.charAt(0)}
     </span>
   )
```

Modify `client/src/components/auth/UserBadge.tsx`:

```diff
--- a/client/src/components/auth/UserBadge.tsx
+++ b/client/src/components/auth/UserBadge.tsx
@@ -9,7 +9,7 @@ export function UserBadge(): JSX.Element | null {
 
   return (
     <div className="flex min-w-0 items-center gap-3">
-      <UserAvatar name={user.displayName} />
+      <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} />
       <div className="flex min-w-0 flex-col leading-tight">
         <span className="flex items-center gap-2 truncate text-sm font-medium">
           {user.displayName}
```

Modify `client/src/components/friends/FriendshipRow.tsx`:

```diff
--- a/client/src/components/friends/FriendshipRow.tsx
+++ b/client/src/components/friends/FriendshipRow.tsx
@@ -10,11 +10,11 @@ type FriendshipRowProps = {
 
 // The email tells two « Mamie » apart.
 export function FriendshipRow({ friendship, children }: FriendshipRowProps): JSX.Element {
-  const { displayName, email } = friendship.user
+  const { displayName, email, avatarUrl } = friendship.user
   return (
     <li className="flex items-center justify-between gap-3 px-4 py-3">
       <div className="flex min-w-0 items-center gap-3">
-        <UserAvatar name={displayName} className="bg-muted text-foreground" />
+        <UserAvatar name={displayName} avatarUrl={avatarUrl} className="bg-muted text-foreground" />
         <div className="flex min-w-0 flex-col">
           <span className="truncate font-medium">{displayName}</span>
           <span className="truncate text-sm text-muted-foreground">{email}</span>
```

Modify `client/src/components/auth/UserMenu.tsx`:

```diff
--- a/client/src/components/auth/UserMenu.tsx
+++ b/client/src/components/auth/UserMenu.tsx
@@ -1,5 +1,6 @@
-import { LogOutIcon } from 'lucide-react'
+import { LogOutIcon, SettingsIcon } from 'lucide-react'
 import type { JSX } from 'react'
+import { Link } from 'react-router'
 import { useAuth } from '@/auth/AuthContext.ts'
 import { UserAvatar } from '@/components/auth/UserAvatar.tsx'
 import { UserBadge } from '@/components/auth/UserBadge.tsx'
@@ -23,13 +24,19 @@ export function UserMenu(): JSX.Element | null {
         className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
         aria-label="Menu du compte"
       >
-        <UserAvatar name={user.displayName} />
+        <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} />
       </DropdownMenuTrigger>
       <DropdownMenuContent align="end" className="w-64">
         <DropdownMenuLabel className="font-normal">
           <UserBadge />
         </DropdownMenuLabel>
         <DropdownMenuSeparator />
+        <DropdownMenuItem asChild>
+          <Link to="/settings">
+            <SettingsIcon aria-hidden />
+            Préférences
+          </Link>
+        </DropdownMenuItem>
         <ThemeToggle />
         <DropdownMenuSeparator />
         <DropdownMenuItem onSelect={logout}>
```

Modify `client/src/components/nav/MobileNav.tsx`:

```diff
--- a/client/src/components/nav/MobileNav.tsx
+++ b/client/src/components/nav/MobileNav.tsx
@@ -1,4 +1,4 @@
-import { MenuIcon } from 'lucide-react'
+import { MenuIcon, SettingsIcon } from 'lucide-react'
 import { type JSX, useState } from 'react'
 import { NavLink } from 'react-router'
 import { LogoutButton } from '@/components/auth/LogoutButton.tsx'
@@ -55,7 +55,12 @@ export function MobileNav(): JSX.Element {
             </NavLink>
           ))}
         </nav>
-        <div className="mt-auto border-t p-2">
+        <div className="mt-auto flex flex-col border-t p-2">
+          {/* With the account actions, not in the pages list: it is about me, not a place. */}
+          <NavLink to="/settings" className={navLinkClasses} onClick={() => setIsOpen(false)}>
+            <SettingsIcon aria-hidden className="size-4" />
+            Préférences
+          </NavLink>
           <ThemeToggle />
           <LogoutButton />
         </div>
```

Modify `client/src/components/form/TextField.tsx`:

```diff
--- a/client/src/components/form/TextField.tsx
+++ b/client/src/components/form/TextField.tsx
@@ -14,7 +14,7 @@ type TextFieldProps = {
   maxLength?: number
 }
 
-// Every field of the invitation forms is required: an empty one never reaches the API.
+// Every field of the invitation and settings forms is required: an empty one never reaches the API.
 export function TextField({
   id,
   label,
```

Create `client/src/components/settings/SettingsCard.tsx`:

```tsx
import type { JSX, ReactNode, SubmitEvent } from 'react'
import { Button } from '@/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import type { AccountSave } from '@/hooks/useAccountSave.ts'

type SettingsCardProps = {
  title: string
  description: string
  save: AccountSave
  onSubmit: () => Promise<void>
  children: ReactNode
  // Buttons next to « Enregistrer », such as « Retirer » on the photo card.
  extraActions?: ReactNode
  isSubmitDisabled?: boolean
}

function SaveFeedback({ save }: { save: AccountSave }): JSX.Element | null {
  if (save.status === 'saved') {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Enregistré.
      </p>
    )
  }
  if (save.status === 'error') {
    return (
      <p role="alert" className="text-sm text-destructive">
        {save.error}
      </p>
    )
  }
  return null
}

// One form per card: « Enregistrer » sends only that card, the others keep what is typed.
export function SettingsCard({ save, onSubmit, ...props }: SettingsCardProps): JSX.Element {
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    await onSubmit()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <CardContent className="flex flex-col gap-4">{props.children}</CardContent>
        <CardFooter className="flex flex-wrap items-center justify-end gap-3">
          <SaveFeedback save={save} />
          {props.extraActions}
          <Button type="submit" disabled={save.status === 'saving' || props.isSubmitDisabled}>
            {save.status === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
```

Create `client/src/components/settings/DisplayNameCard.tsx`:

```tsx
import { type JSX, useState } from 'react'
import { patchDisplayName } from '@/accountApi.ts'
import { DISPLAY_NAME_MAX_LENGTH } from '@/auth/accountRules.ts'
import { TextField } from '@/components/form/TextField.tsx'
import { SettingsCard } from '@/components/settings/SettingsCard.tsx'
import { useAccountSave } from '@/hooks/useAccountSave.ts'

export function DisplayNameCard({ displayName }: { displayName: string }): JSX.Element {
  const [name, setName] = useState(displayName)
  const save = useAccountSave()

  return (
    <SettingsCard
      title="Nom affiché"
      description="Vos amis le voient sur les photos que vous leur envoyez."
      save={save}
      onSubmit={async () => {
        await save.run(() => patchDisplayName(name))
      }}
    >
      <TextField
        id="display-name"
        label="Nom"
        type="text"
        autoComplete="name"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        value={name}
        onChange={setName}
      />
    </SettingsCard>
  )
}
```

Create `client/src/components/settings/EmailCard.tsx`:

```tsx
import type { JSX } from 'react'
import { Badge } from '@/components/ui/badge.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'

// Read only: changing the email would need a confirmation by email, which the app cannot send.
// No « Enregistrer » either, there is nothing to save.
export function EmailCard({ email }: { email: string }): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Adresse e-mail
          <Badge variant="secondary">Bientôt</Badge>
        </CardTitle>
        <CardDescription>Elle sert à vous connecter et à vous ajouter en ami.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" value={email} disabled readOnly />
      </CardContent>
    </Card>
  )
}
```

Create `client/src/pages/SettingsPage.tsx`:

```tsx
import type { JSX } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { DisplayNameCard } from '@/components/settings/DisplayNameCard.tsx'
import { EmailCard } from '@/components/settings/EmailCard.tsx'

export default function SettingsPage(): JSX.Element | null {
  const { user } = useAuth()
  // RequireAuth renders this page only with a user: the check only narrows the type.
  if (user === null) return null

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Préférences</h1>
        <p className="text-sm text-muted-foreground">
          Votre profil et la sécurité de votre compte.
        </p>
      </header>
      <DisplayNameCard displayName={user.displayName} />
      <EmailCard email={user.email} />
    </main>
  )
}
```

Modify `client/src/App.tsx`:

```diff
--- a/client/src/App.tsx
+++ b/client/src/App.tsx
@@ -11,6 +11,7 @@ import InvitePage from './pages/InvitePage.tsx'
 import LibraryPage from './pages/LibraryPage.tsx'
 import LoginPage from './pages/LoginPage.tsx'
 import NotFoundPage from './pages/NotFoundPage.tsx'
+import SettingsPage from './pages/SettingsPage.tsx'
 
 // One layout route guards every logged-in page, instead of wrapping each one.
 function AppRoutes(): JSX.Element {
@@ -37,6 +38,7 @@ function AppRoutes(): JSX.Element {
         >
           <Route path="/" element={<LibraryPage />} />
           <Route path="/friends" element={<FriendsPage />} />
+          <Route path="/settings" element={<SettingsPage />} />
           <Route
             path="/admin/invitations"
             element={
```

- [ ] **Step 3: Gates and commit**

Run: `pnpm check`, `pnpm typecheck`, `pnpm build` (expected: `✓ built in …`), `pnpm test` (`Tests  219 passed (219)`, unchanged).

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add client/src/auth/authApi.ts client/src/accountApi.ts client/src/auth/AuthContext.ts client/src/auth/AuthProvider.tsx client/src/hooks/useAccountSave.ts client/src/components/auth/UserAvatar.tsx client/src/components/auth/UserBadge.tsx client/src/components/friends/FriendshipRow.tsx client/src/components/auth/UserMenu.tsx client/src/components/nav/MobileNav.tsx client/src/components/form/TextField.tsx client/src/components/settings/SettingsCard.tsx client/src/components/settings/DisplayNameCard.tsx client/src/components/settings/EmailCard.tsx client/src/pages/SettingsPage.tsx client/src/App.tsx
git commit -F <message-file>
```

Message subject: `feat(client): add the settings page with the name and email cards`. Body: « Préférences » in the account menu and the mobile menu, above the theme toggle, opens `/settings`; each card saves on its own and replaces the user in `AuthContext`; `UserAvatar` shows the profile photo when there is one. Then a blank line and the two attribution lines (Global Constraints).

- [ ] **Step 4: Docs**

Modify `README.md`:

```diff
--- a/README.md
+++ b/README.md
@@ -51,6 +51,7 @@ Quand le schéma change sur une base qui contient déjà des photos, lancer `pnp
 | Bibliothèque  | http://localhost:5180                   |
 | Cadre         | http://localhost:5180/frame             |
 | Amis          | http://localhost:5180/friends           |
+| Préférences   | http://localhost:5180/settings          |
 | Invitations   | http://localhost:5180/admin/invitations |
 | API (Express) | http://localhost:3000                   |
 
```

Modify `ARCHITECTURE.md`:

```diff
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -48,15 +48,18 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 | `/`                  | bibliothèque : carte d'envoi (« Prendre une photo » ou « Choisir une image », puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui n'envoie le fichier qu'à l'ami), puis les photos du compte en vignettes ou en liste (même choix mémorisé que le cadre), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans un nouvel onglet, et son menu propose « Envoyer à un ami » et « Supprimer » ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
 | `/frame`             | cadre : toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), en vignettes ou en liste (choix mémorisé par appareil), chacune avec « Envoyer à un ami » et « Supprimer » ; « Lancer le diaporama » ou une minute sans activité lance le diaporama                                                                                                                                                                                                          |
 | `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                        |
+| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte : une carte par réglage, chacune avec son « Enregistrer » ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt »                                                                                                                                                                                                                                                                 |
 | `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                   |
 
 « Envoyer à un ami » ouvre une fenêtre (`components/sharing/SharePhotoDialog.tsx`, sur le `Dialog` de shadcn) qui charge les amis acceptés (`GET /api/friendships`), avec un bouton « Envoyer » par ami (« Envoi… », puis « Envoyée ») : une photo peut partir chez plusieurs amis depuis la même fenêtre. Une erreur (« Cette personne a déjà cette photo. », ami retiré entre-temps) s'affiche au-dessus de la liste ; sans ami, un lien « Ajouter un ami » mène à `/friends`. Une photo reçue porte « Envoyée par » et le nom de l'expéditeur sur le cadre (légende du diaporama), dans la liste et dans son texte alternatif.
 
-`/`, `/frame`, `/friends` et `/admin/invitations` sont enveloppées dans `RequireAuth` (`client/src/auth/`, une route parente dans `App.tsx`) : sans utilisateur, redirection vers `/login` en gardant la page demandée. `/admin/invitations` passe aussi par `RequireAdmin`, qui montre à un membre une carte « Cette page est réservée à l'administrateur. » plutôt qu'une redirection muette ; le `403` du serveur reste la vraie protection. Toute autre adresse affiche une page 404, « Cette page n'existe pas » (route `*`, aussi derrière `RequireAuth`). `AuthProvider` appelle `GET /api/auth/me` au chargement (le cookie est `httpOnly`, seul le serveur sait qui est connecté) et oublie l'utilisateur quand l'API répond 401 ou que Socket.IO refuse la connexion (`UNAUTHENTICATED`). Seul un 401 renvoie vers `/login` : si l'API est injoignable au démarrage (erreur réseau ou 5xx, par exemple un cadre rallumé avant le Wi-Fi), `AuthProvider` reste en chargement et réessaie toutes les 5 secondes. Le cadre recharge ses photos une fois par jour : cet appel HTTP prolonge la session (voir [Authentification](#authentification)). Limite connue : le jeton d'invitation est dans l'URL de `/invite/:token`, donc dans l'historique du navigateur de la personne invitée ; acceptable pour un lien qui sert une fois et pendant 7 jours.
+`/`, `/frame`, `/friends`, `/settings` et `/admin/invitations` sont enveloppées dans `RequireAuth` (`client/src/auth/`, une route parente dans `App.tsx`) : sans utilisateur, redirection vers `/login` en gardant la page demandée. `/admin/invitations` passe aussi par `RequireAdmin`, qui montre à un membre une carte « Cette page est réservée à l'administrateur. » plutôt qu'une redirection muette ; le `403` du serveur reste la vraie protection. Toute autre adresse affiche une page 404, « Cette page n'existe pas » (route `*`, aussi derrière `RequireAuth`). `AuthProvider` appelle `GET /api/auth/me` au chargement (le cookie est `httpOnly`, seul le serveur sait qui est connecté) et oublie l'utilisateur quand l'API répond 401 ou que Socket.IO refuse la connexion (`UNAUTHENTICATED`). Seul un 401 renvoie vers `/login` : si l'API est injoignable au démarrage (erreur réseau ou 5xx, par exemple un cadre rallumé avant le Wi-Fi), `AuthProvider` reste en chargement et réessaie toutes les 5 secondes. Le cadre recharge ses photos une fois par jour : cet appel HTTP prolonge la session (voir [Authentification](#authentification)). Limite connue : le jeton d'invitation est dans l'URL de `/invite/:token`, donc dans l'historique du navigateur de la personne invitée ; acceptable pour un lien qui sert une fois et pendant 7 jours.
 
-Thème : le menu du compte (avatar sur ordinateur, ☰ sur mobile) propose Clair, Sombre ou Système (par défaut). Le choix est gardé dans le `localStorage` du navigateur (`client/src/theme.ts`), qui pose ou retire la classe `.dark` sur `<html>` ; en navigation privée, ou si le stockage est bloqué, le choix vaut pour la visite seulement.
+Le menu du compte (avatar sur ordinateur, ☰ sur mobile) mène à « Préférences » (`/settings`). Chaque carte enregistre seule (`hooks/useAccountSave.ts`) puis remplace l'utilisateur dans `AuthContext` (`replaceUser`) : la barre et les menus montrent aussitôt le nouveau nom. `UserAvatar` affiche la photo de profil quand `avatarUrl` existe, l'initiale sinon (barre, menus, listes d'amis, fenêtre d'envoi).
 
-Le routage est fait côté navigateur (`react-router`). En production (J2), le serveur qui sert le client devra donc renvoyer `index.html` pour `/login`, `/frame`, `/friends`, `/invite/:token` et `/admin/invitations` (« SPA fallback »), sinon un rechargement de la page donne une 404. Un serveur statique qui journalise les chemins écrirait aussi le jeton des liens d'invitation : à régler en J2 en choisissant son format de logs.
+Thème : le menu du compte propose aussi Clair, Sombre ou Système (par défaut). Le choix est gardé dans le `localStorage` du navigateur (`client/src/theme.ts`), qui pose ou retire la classe `.dark` sur `<html>` ; en navigation privée, ou si le stockage est bloqué, le choix vaut pour la visite seulement.
+
+Le routage est fait côté navigateur (`react-router`). En production (J2), le serveur qui sert le client devra donc renvoyer `index.html` pour `/login`, `/frame`, `/friends`, `/settings`, `/invite/:token` et `/admin/invitations` (« SPA fallback »), sinon un rechargement de la page donne une 404. Un serveur statique qui journalise les chemins écrirait aussi le jeton des liens d'invitation : à régler en J2 en choisissant son format de logs.
 
 ## API
 
@@ -263,5 +266,5 @@ Points déjà connus :
 
 - **Sharp** embarque des binaires propres à chaque plateforme : il doit être installé dans l'image, jamais copié depuis le `node_modules` Windows.
 - **argon2** charge un binaire précompilé livré dans le paquet (Linux x64/arm64, glibc et musl, Windows x64) : son script de build reste bloqué par pnpm (`ignoredBuiltDependencies`). Comme Sharp, il doit être installé dans l'image, jamais copié depuis le `node_modules` Windows.
-- Le serveur qui sert le client doit faire le **SPA fallback** pour `/login`, `/frame`, `/friends`, `/invite/:token` et `/admin/invitations` (voir [Pages](#pages)).
+- Le serveur qui sert le client doit faire le **SPA fallback** pour `/login`, `/frame`, `/friends`, `/settings`, `/invite/:token` et `/admin/invitations` (voir [Pages](#pages)).
 - Avec `NODE_ENV=production`, le cookie de session est `Secure` : servi en http simple (cadre sur le réseau local, Compose en local), le navigateur l'ignore et la connexion échoue sans message. Servir en HTTPS, ou ne pas définir `NODE_ENV=production` en http.
```

Run `pnpm check` (`pnpm check:fix` if Biome realigns a table).

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add README.md ARCHITECTURE.md
git commit -F <message-file>
```

Message subject: `docs: describe the settings page`. Body: the `/settings` URL, the Pages row, `RequireAuth` and the SPA fallback lists, `replaceUser` and the avatar image. Then a blank line and the two attribution lines (Global Constraints).

### Task 9: The profile photo and password cards (PR D, `feat/client-settings`)

**Files:**
- Modify: `client/src/accountApi.ts`, `client/src/hooks/useAccountSave.ts`, `client/src/pages/SettingsPage.tsx`
- Create: `client/src/components/settings/AvatarCard.tsx`, `client/src/components/settings/PasswordCard.tsx`
- Modify: `README.md`, `ARCHITECTURE.md`

**Interfaces:**
- Produces:
  ```ts
  // accountApi.ts
  export type PasswordChangeResult = { status: 'saved' } | { status: 'failed'; message: string } | { status: 'unauthenticated' }
  export function putAvatar(file: File): Promise<AccountSaveResult>
  export function deleteAvatar(): Promise<AccountSaveResult>
  export async function putPassword(currentPassword: string, newPassword: string): Promise<PasswordChangeResult>
  // useAccountSave: run accepts both result types; replaceUser only when the result carries a user
  ```

- [ ] **Step 1: The API calls and the two cards**

Modify `client/src/accountApi.ts`:

```diff
--- a/client/src/accountApi.ts
+++ b/client/src/accountApi.ts
@@ -8,6 +8,12 @@ export type AccountSaveResult =
   | { status: 'failed'; message: string }
   | { status: 'unauthenticated' }
 
+// 204 without a body: the account the client knows does not change.
+export type PasswordChangeResult =
+  | { status: 'saved' }
+  | { status: 'failed'; message: string }
+  | { status: 'unauthenticated' }
+
 // Every route that edits the account answers { user }.
 async function sendForUser(url: string, init: RequestInit): Promise<AccountSaveResult> {
   try {
@@ -30,3 +36,33 @@ export function patchDisplayName(displayName: string): Promise<AccountSaveResult
     body: JSON.stringify({ displayName }),
   })
 }
+
+// No Content-Type: the browser sets multipart/form-data with its boundary.
+export function putAvatar(file: File): Promise<AccountSaveResult> {
+  const body = new FormData()
+  body.append('avatar', file)
+  return sendForUser('/api/account/avatar', { method: 'PUT', body })
+}
+
+export function deleteAvatar(): Promise<AccountSaveResult> {
+  return sendForUser('/api/account/avatar', { method: 'DELETE' })
+}
+
+export async function putPassword(
+  currentPassword: string,
+  newPassword: string,
+): Promise<PasswordChangeResult> {
+  try {
+    const res = await fetch('/api/account/password', {
+      method: 'PUT',
+      headers: { 'Content-Type': 'application/json' },
+      body: JSON.stringify({ currentPassword, newPassword }),
+    })
+    if (res.status === UNAUTHORIZED_STATUS) return { status: 'unauthenticated' }
+    if (res.ok) return { status: 'saved' }
+    const data: unknown = await res.json().catch(() => null)
+    return { status: 'failed', message: errorMessage(data) }
+  } catch {
+    return { status: 'failed', message: errorMessage(null) }
+  }
+}
```

Modify `client/src/hooks/useAccountSave.ts`:

```diff
--- a/client/src/hooks/useAccountSave.ts
+++ b/client/src/hooks/useAccountSave.ts
@@ -1,5 +1,5 @@
 import { useState } from 'react'
-import type { AccountSaveResult } from '@/accountApi.ts'
+import type { AccountSaveResult, PasswordChangeResult } from '@/accountApi.ts'
 import { useAuth } from '@/auth/AuthContext.ts'
 
 export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
@@ -8,16 +8,18 @@ export type AccountSave = {
   status: SaveStatus
   error: string
   // true when the server saved it: the card then empties what must not stay on screen.
-  run: (request: () => Promise<AccountSaveResult>) => Promise<boolean>
+  run: (request: () => Promise<SaveResult>) => Promise<boolean>
 }
 
+type SaveResult = AccountSaveResult | PasswordChangeResult
+
 // One per settings card: each card saves on its own and shows its own result.
 export function useAccountSave(): AccountSave {
   const { dropUser, replaceUser } = useAuth()
   const [status, setStatus] = useState<SaveStatus>('idle')
   const [error, setError] = useState('')
 
-  async function run(request: () => Promise<AccountSaveResult>): Promise<boolean> {
+  async function run(request: () => Promise<SaveResult>): Promise<boolean> {
     setStatus('saving')
     const result = await request()
     // The session ended on the server: RequireAuth sends the user to /login.
@@ -31,7 +33,7 @@ export function useAccountSave(): AccountSave {
       return false
     }
     // The app bar, the menus and the other cards read the user from AuthContext.
-    replaceUser(result.user)
+    if ('user' in result) replaceUser(result.user)
     setStatus('saved')
     return true
   }
```

Create `client/src/components/settings/AvatarCard.tsx`:

```tsx
import { type ChangeEvent, type JSX, useState } from 'react'
import { deleteAvatar, putAvatar } from '@/accountApi.ts'
import { UserAvatar } from '@/components/auth/UserAvatar.tsx'
import { SettingsCard } from '@/components/settings/SettingsCard.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { type AccountSave, useAccountSave } from '@/hooks/useAccountSave.ts'
import { usePreviewUrl } from '@/hooks/usePreviewUrl.ts'

type AvatarCardProps = { name: string; avatarUrl: string | null }

type AvatarForm = {
  save: AccountSave
  file: File | null
  // A new key remounts the file input, which empties it.
  inputKey: number
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  clearFile: () => void
  submit: () => Promise<void>
}

function useAvatarForm(): AvatarForm {
  const save = useAccountSave()
  const [file, setFile] = useState<File | null>(null)
  const [inputKey, setInputKey] = useState(0)

  function clearFile(): void {
    setFile(null)
    setInputKey((key) => key + 1)
  }

  async function submit(): Promise<void> {
    if (!file) return
    if (await save.run(() => putAvatar(file))) clearFile()
  }

  return {
    save,
    file,
    inputKey,
    handleFileChange: (event) => setFile(event.target.files?.[0] ?? null),
    clearFile,
    submit,
  }
}

// A chosen file can be dropped before saving; otherwise a saved photo can be removed.
function AvatarActions({
  form,
  hasAvatar,
}: {
  form: AvatarForm
  hasAvatar: boolean
}): JSX.Element | null {
  const isSaving = form.save.status === 'saving'
  if (form.file) {
    return (
      <Button type="button" variant="ghost" disabled={isSaving} onClick={form.clearFile}>
        Annuler
      </Button>
    )
  }
  if (!hasAvatar) return null
  return (
    <Button
      type="button"
      variant="outline"
      disabled={isSaving}
      onClick={async () => {
        await form.save.run(deleteAvatar)
      }}
    >
      Retirer
    </Button>
  )
}

function AvatarFileInput({ form }: { form: AvatarForm }): JSX.Element {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <Label htmlFor="avatar-file">Changer la photo</Label>
      <Input
        key={form.inputKey}
        id="avatar-file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={form.handleFileChange}
      />
      <p className="text-xs text-muted-foreground">
        JPEG, PNG ou WebP, 10 Mo au plus. Recadrée en carré, au centre.
      </p>
    </div>
  )
}

export function AvatarCard({ name, avatarUrl }: AvatarCardProps): JSX.Element {
  const form = useAvatarForm()
  // The preview shows what « Enregistrer » would send; the server crops it to a square.
  const previewUrl = usePreviewUrl(form.file)

  return (
    <SettingsCard
      title="Photo de profil"
      description="Elle remplace votre initiale dans le menu et dans la liste d'amis de vos proches."
      save={form.save}
      onSubmit={form.submit}
      isSubmitDisabled={form.file === null}
      extraActions={<AvatarActions form={form} hasAvatar={avatarUrl !== null} />}
    >
      <div className="flex flex-wrap items-center gap-6">
        <UserAvatar name={name} avatarUrl={previewUrl ?? avatarUrl} className="size-24 text-3xl" />
        <AvatarFileInput form={form} />
      </div>
    </SettingsCard>
  )
}
```

Create `client/src/components/settings/PasswordCard.tsx`:

```tsx
import { type JSX, useState } from 'react'
import { putPassword } from '@/accountApi.ts'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MISMATCH_MESSAGE,
} from '@/auth/accountRules.ts'
import { TextField } from '@/components/form/TextField.tsx'
import { SettingsCard } from '@/components/settings/SettingsCard.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { type AccountSave, useAccountSave } from '@/hooks/useAccountSave.ts'

type PasswordFields = { current: string; next: string; confirmation: string }

type FieldsState = {
  fields: PasswordFields
  setField: (name: keyof PasswordFields, value: string) => void
}

type PasswordForm = FieldsState & {
  save: AccountSave
  isMismatch: boolean
  submit: () => Promise<void>
}

const EMPTY_FIELDS: PasswordFields = { current: '', next: '', confirmation: '' }

function usePasswordForm(): PasswordForm {
  const save = useAccountSave()
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [isMismatch, setIsMismatch] = useState(false)
  const setField = (name: keyof PasswordFields, value: string): void =>
    setFields((current) => ({ ...current, [name]: value }))

  async function submit(): Promise<void> {
    const isTypo = fields.next !== fields.confirmation
    setIsMismatch(isTypo)
    if (isTypo) return
    // Passwords do not stay on screen once saved.
    if (await save.run(() => putPassword(fields.current, fields.next))) setFields(EMPTY_FIELDS)
  }

  return { fields, setField, save, isMismatch, submit }
}

function NewPasswordFields({ fields, setField }: FieldsState): JSX.Element {
  const limits = { minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH }
  return (
    <>
      <TextField
        id="new-password"
        label="Nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        {...limits}
        value={fields.next}
        onChange={(value) => setField('next', value)}
      />
      <TextField
        id="new-password-confirmation"
        label="Confirmer le nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        {...limits}
        value={fields.confirmation}
        onChange={(value) => setField('confirmation', value)}
      />
    </>
  )
}

export function PasswordCard(): JSX.Element {
  const { fields, setField, save, isMismatch, submit } = usePasswordForm()

  return (
    <SettingsCard
      title="Mot de passe"
      description="Les autres appareils connectés à votre compte, le cadre compris, devront se reconnecter avec le nouveau mot de passe."
      save={save}
      onSubmit={submit}
    >
      <TextField
        id="current-password"
        label="Mot de passe actuel"
        type="password"
        autoComplete="current-password"
        value={fields.current}
        onChange={(value) => setField('current', value)}
      />
      <NewPasswordFields fields={fields} setField={setField} />
      {isMismatch && (
        <Alert variant="destructive">
          <AlertDescription>{PASSWORD_MISMATCH_MESSAGE}</AlertDescription>
        </Alert>
      )}
    </SettingsCard>
  )
}
```

Modify `client/src/pages/SettingsPage.tsx`:

```diff
--- a/client/src/pages/SettingsPage.tsx
+++ b/client/src/pages/SettingsPage.tsx
@@ -1,7 +1,9 @@
 import type { JSX } from 'react'
 import { useAuth } from '@/auth/AuthContext.ts'
+import { AvatarCard } from '@/components/settings/AvatarCard.tsx'
 import { DisplayNameCard } from '@/components/settings/DisplayNameCard.tsx'
 import { EmailCard } from '@/components/settings/EmailCard.tsx'
+import { PasswordCard } from '@/components/settings/PasswordCard.tsx'
 
 export default function SettingsPage(): JSX.Element | null {
   const { user } = useAuth()
@@ -16,8 +18,10 @@ export default function SettingsPage(): JSX.Element | null {
           Votre profil et la sécurité de votre compte.
         </p>
       </header>
+      <AvatarCard name={user.displayName} avatarUrl={user.avatarUrl} />
       <DisplayNameCard displayName={user.displayName} />
       <EmailCard email={user.email} />
+      <PasswordCard />
     </main>
   )
 }
```

- [ ] **Step 2: Gates and commit**

Run: `pnpm check`, `pnpm typecheck`, `pnpm build`, `pnpm test` (`Tests  219 passed (219)`).

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add client/src/accountApi.ts client/src/hooks/useAccountSave.ts client/src/components/settings/AvatarCard.tsx client/src/components/settings/PasswordCard.tsx client/src/pages/SettingsPage.tsx
git commit -F <message-file>
```

Message subject: `feat(client): change the profile photo and the password from the settings`. Body: « Photo de profil » previews the chosen file, saves it, or removes the current photo; « Mot de passe » asks for the current one and the new one twice, and warns that the other devices, the frame included, will have to log in again. Then a blank line and the two attribution lines (Global Constraints).

- [ ] **Step 3: Docs**

Modify `README.md`:

```diff
--- a/README.md
+++ b/README.md
@@ -63,6 +63,8 @@ Ajouter un ami : ouvrir « Amis » depuis la bibliothèque et saisir l'adresse e
 
 Envoyer une photo à un ami : dans la bibliothèque ou sur le cadre, le menu « … » d'une photo propose « Envoyer à un ami » ; dans la carte d'envoi, choisir un fichier puis « Envoyer à un ami » plutôt que « Ajouter à ma bibliothèque ». La fenêtre liste les amis acceptés, avec un bouton « Envoyer » par ami. La photo n'entre que dans la bibliothèque de l'ami et s'affiche aussitôt sur son cadre, avec « Envoyée par » et votre nom. Chacun supprime ses photos de son côté : retirer l'ami ou supprimer l'original ne retire pas la photo reçue.
 
+Modifier son compte : « Préférences », dans le menu du compte (l'avatar en haut à droite, ou ☰ sur mobile). Chaque carte a son « Enregistrer » : photo de profil (JPEG, PNG ou WebP, recadrée en carré), nom affiché et mot de passe. L'adresse e-mail ne se modifie pas encore. Changer de mot de passe déconnecte les autres appareils du compte : le cadre revient à la page de connexion à son prochain rechargement des photos (au plus tard le lendemain) ou à sa prochaine reconnexion ; s'y reconnecter avec le nouveau mot de passe.
+
 Depuis un smartphone sur le même réseau : `http://<ip-du-pc>:5180` (le pare-feu Windows doit autoriser Node sur les réseaux privés, et le Wi-Fi ne doit pas isoler les appareils entre eux).
 
 ### Scripts racine
```

Modify `ARCHITECTURE.md`:

```diff
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -48,7 +48,7 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 | `/`                  | bibliothèque : carte d'envoi (« Prendre une photo » ou « Choisir une image », puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui n'envoie le fichier qu'à l'ami), puis les photos du compte en vignettes ou en liste (même choix mémorisé que le cadre), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans un nouvel onglet, et son menu propose « Envoyer à un ami » et « Supprimer » ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
 | `/frame`             | cadre : toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), en vignettes ou en liste (choix mémorisé par appareil), chacune avec « Envoyer à un ami » et « Supprimer » ; « Lancer le diaporama » ou une minute sans activité lance le diaporama                                                                                                                                                                                                          |
 | `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                        |
-| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte : une carte par réglage, chacune avec son « Enregistrer » ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt »                                                                                                                                                                                                                                                                 |
+| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte : une carte par réglage, chacune avec son « Enregistrer » ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter                                                         |
 | `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                   |
 
 « Envoyer à un ami » ouvre une fenêtre (`components/sharing/SharePhotoDialog.tsx`, sur le `Dialog` de shadcn) qui charge les amis acceptés (`GET /api/friendships`), avec un bouton « Envoyer » par ami (« Envoi… », puis « Envoyée ») : une photo peut partir chez plusieurs amis depuis la même fenêtre. Une erreur (« Cette personne a déjà cette photo. », ami retiré entre-temps) s'affiche au-dessus de la liste ; sans ami, un lien « Ajouter un ami » mène à `/friends`. Une photo reçue porte « Envoyée par » et le nom de l'expéditeur sur le cadre (légende du diaporama), dans la liste et dans son texte alternatif.
```

Run `pnpm check` (`pnpm check:fix` if Biome realigns a table).

Write the message to a file in your scratchpad with the Write tool, then from the repo root:

```bash
git add README.md ARCHITECTURE.md
git commit -F <message-file>
```

Message subject: `docs: describe the profile photo and password cards`. Body: how to change the account in the README (and when the frame logs out), the full `/settings` row. Then a blank line and the two attribution lines (Global Constraints).

---

## Final verification (controller)

- [ ] `pnpm check && pnpm typecheck && pnpm build && pnpm test` on `feat/client-settings`: green, `Test Files  19 passed (19)`, `Tests  219 passed (219)`.
- [ ] Bruno gate command against a test API on port 3002 started from `feat/client-settings`: 112 requests, 242 assertions, 44 `test()` calls, all passed. A second run right after also passes.
- [ ] Logs carry no PII: during the Bruno run, the test API's `account.*` lines show only ids, Cloudinary ids, `closedSessionCount`, booleans and `reason` (no name, no email, no password).
- [ ] `git diff 82c2ea9..feat/client-settings -- client/package.json server/package.json pnpm-lock.yaml`: empty (no new dependency). `git diff 82c2ea9..feat/client-settings -- server/src | grep -n "console\."`: no output. `git grep -n " as " -- server/src client/src` shows no new cast.
- [ ] `wc -l server/src/features/auth/auth.service.test.ts`: 297 or fewer.
- [ ] Manual (spec, "Testing"), with Claude in Chrome or left to the author, dev client on 5180 against the API (the author's servers, never restarted by the controller), **on a throwaway account** (an invitation link from `/admin/invitations`), never the member's password:
  - « Préférences » in the account menu (desktop) and in the burger menu (mobile width), above the theme toggle, opens `/settings`;
  - « Nom affiché »: change it, « Enregistrer » → « Enregistrement… » then « Enregistré. »; the app bar badge shows the new name without a reload; a name of spaces only is refused by the browser (`required`) or the API (« Choisissez un nom de 1 à 50 caractères. »);
  - « Photo de profil »: choose a JPEG, the large avatar previews it, « Annuler » drops it; choose again and save: the bar avatar, the menu and (as a friend of another account) that account's `/friends` row and share dialog show the photo; « Retirer » brings the initial back;
  - « Adresse e-mail »: disabled, « Bientôt » badge, no button;
  - « Mot de passe »: a different confirmation shows « Les deux mots de passe ne correspondent pas. » without a request; a wrong current password shows « Mot de passe actuel incorrect. »; a valid change shows « Enregistré. » and empties the fields; a second browser logged in to the same account falls back to the login page at its next request; the first one stays logged in.
- [ ] Clean up the manual test data by hand (the throwaway account's photo is removed by « Retirer »): **never** with `pnpm db:seed`.
- [ ] `git log --oneline 82c2ea9..feat/client-settings`: one concern per commit, each ending with the attribution lines; `git diff --stat 82c2ea9..feat/client-settings` shows no `.env` file.
- [ ] Fresh-context review of the whole stack diff (`superpowers:requesting-code-review`), then `gh stack submit --auto` (draft PRs) and `gh stack view --json`.

---

## Drift Log

Format: `date · task/step · what the plan said · what was done · why`.

| Date | Task / step | Plan said | Done | Why |
| ---- | ----------- | --------- | ---- | --- |

---

## Self-review (done while writing the plan)

**1. Spec coverage**

| Spec item | Task |
| --- | --- |
| `User.avatarCloudinaryId` (optional) | 1 |
| `avatarUrl` helper (optimized signed delivery), `PublicUser.avatarUrl`, `FriendUser.avatarUrl`, server and client types and guards | 1 |
| `toPublicUser` / `toAvatarUrl` in `public-user.ts`, `AvatarUrlBuilder` injected into auth, invitations, friendships | 1 |
| Bruno user and friendship shapes (`auth/me/01`, `invitations/accept/05`, `friendships/list/01`, folder docs) | 1 |
| Docs: Données, user shapes, backend layers | 1 |
| `pnpm db:push` after A, no seed | C1 |
| Shared input rules in `lib/account-input.ts`, invitations unchanged | 2 |
| `changeDisplayName` (trim, `DISPLAY_NAME_INVALID`, `account.renamed` ids only) + unit tests | 2 |
| `PATCH /api/account` with its `express.json()`, `200 { user }`, mounted behind `requireAuth` | 3 |
| Bruno `account/` (`seq: 4`, invitee), `rename/` 01-06 | 3 |
| Docs: API, JSON parsers, sessions list, `features/account`, `account.renamed` | 3 |
| `AuthenticatedSession.sessionId`, `req.sessionId`, `currentSessionId` + tests | 4 |
| `PASSWORD_INCORRECT` 400, server, error handler test, client message | 4 |
| `changePassword` (new rule first, argon2 check, hash, other sessions deleted, `account.password_changed` with `closedSessionCount`, `account.password_change_failed`) + unit tests | 4 |
| `PUT /api/account/password` → 204 | 5 |
| Bruno `password/` 01-10, the session analysis | 5 |
| Docs: API, error table, password change and the open-socket limitation, logs | 5 |
| `toAvatarJpeg` (256 px square, centre, JPEG) + test; `uploadAvatar` (`familyframe/avatars`) | 6 |
| `changeAvatar` (photo file rules, convert, upload, write, previous destroyed after the write, failures logged), `removeAvatar` (idempotent) + unit tests | 6 |
| `PUT /api/account/avatar` (Multer `avatar`), `DELETE /api/account/avatar`, `200 { user }` | 7 |
| Bruno `avatar/` 01-09 | 7 |
| Docs: API, Multer and `parseFile` reuse, `account.avatar_*` logs | 7 |
| `accountRules.ts` shared with `InviteForm` | 8 |
| `UserAvatar` image (`UserBadge`, `UserMenu`, `FriendshipRow`, hence the share dialog) | 8 |
| `replaceUser` in `AuthContext`, `accountApi.ts`, `useAccountSave` | 8, 9 |
| `/settings` « Préférences » in the `AccountBar` layout, `RequireAuth`; menu entries above the theme toggle | 8 |
| « Nom affiché » and « Adresse e-mail » (disabled, « Bientôt ») cards | 8 |
| « Photo de profil » card (preview, « Changer la photo », « Annuler », « Retirer ») and « Mot de passe » card (eye toggle through `PasswordInput`, mismatch, other devices warning) | 9 |
| Docs: README (URL, how to edit, when the frame logs out), ARCHITECTURE Pages and lists | 8, 9 |
| Manual checks | Final verification |
| Delivery: 4 PRs, `gh stack add` at PR boundaries | Stack section, banners |
| Out of scope (email change, crop UI, password reset, rate limiting, cutting sockets, account deletion) | not planned |
| Open questions 1-7 | defaults applied as written (invitee in Bruno, `closedSessionCount`, three extra logs, new rule first, avatar race accepted, open sockets documented, photos imports) |

Conflicts between the approved design and the code or rules, resolved in "Choices": Bruno on the member account (would close the author's sessions on the shared DB: the invitee instead), "closedSessions count" (named `closedSessionCount`), "reuse uploadImage" (a private `uploadToFolder` shared by `uploadImage` and `uploadAvatar`, for the avatar folder), the shared module location (`lib/account-input.ts`). The brief's `pnpm check` on this plan is a no-op: `docs/superpowers/plans` is excluded in `biome.json`.

**2. Placeholder scan:** no "TBD", "TODO", "similar to Task N" or step without its content. `<message-file>` is the path of the commit message file the implementer writes in the scratchpad (same convention as the previous plans); every message's subject and body are given. Every code block and diff was generated from the commits of a throwaway clone that passed the gates while planning (`tsc`, `biome`, `vitest`), so file contents and diffs match each other across tasks. Unverified, flagged where it matters: the Bruno counts (read from the files) and the expected failure lists of the Bruno-first steps.

**3. Type consistency:** `AvatarUrlBuilder` (Task 1) is the `avatarUrl` dep of the auth, invitations, friendships (Task 1) and account (Task 2) services, and the type of `avatarUrl` in `lib/cloudinary.ts` passed by `app.ts`. `AccountRepository` grows from one member (Task 2) to four (Task 4: `findUserById`, `updatePasswordHash`, `deleteOtherSessions`) to five (Task 6: `updateAvatar`); `AccountServiceDeps` from three to five (Task 4: `hashPassword`, `verifyPassword`) to eight (Task 6: `toAvatarJpeg`, `uploadAvatar`, `deleteImage`); every test file's `makeDeps` builds the full type of its task. `AccountService` grows from one method to two (Task 4) to four (Task 6); `AccountController` and the routes follow one PR later each (Tasks 3, 5, 7). `AuthenticatedSession.sessionId` (Task 4) feeds `req.sessionId`, read by `currentSessionId` in the controller (Task 5). `ApiErrorCode` gains `PASSWORD_INCORRECT` in Task 4 with its status in the exhaustive `HTTP_STATUS_BY_CODE` and its message in the exhaustive `ERROR_MESSAGES` in the same commit. Client: `AccountSaveResult` (Task 8) and `PasswordChangeResult` (Task 9) are both accepted by `useAccountSave.run`, which calls `replaceUser` only when the result carries a user. Unit test counts: 180 (baseline) → 183 (T1) → 191 (T2) → 191 (T3) → 193 → 206 (T4) → 206 (T5) → 208 → 219 (T6) → 219 (T7-T9). Bruno counts (requests / assertions / `test()` calls): 87 / 186 / 37 (baseline) → 87 / 188 / 39 (T1-T2) → 93 / 203 / 40 (T3-T4) → 103 / 221 / 40 (T5-T6) → 112 / 242 / 44 (T7-T9).
