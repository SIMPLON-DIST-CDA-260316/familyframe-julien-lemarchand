---
plan: admin-invitations
status: done
spec: docs/superpowers/specs/2026-11-24-admin-invitations-design.md
branch: feat/invitations-schema (PR A), feat/invitations-create (PR B), feat/invitations-accept (PR C), feat/client-invitations (PR D)
worktree: false
tasks_total: 9
tasks_done: 9
current_task: —
last_commit: f3cb12c
last_updated: 2026-11-24
---

# Admin Invitations (Step 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Working agreement (mandatory):** keep this plan in sync with reality. Check a step only when it is finished and its gate is green. Append every divergence to the Drift Log. Update the frontmatter (`tasks_done`, `current_task`, `last_commit`, `last_updated`) at each task boundary. When a drift produces a durable correction (path, command, signature, decision), amend the affected task block in place and log the amendment: implementers only receive their own task block. Never check a partial step; never delete a finished step or a drift entry. Under subagent-driven development, `.superpowers/sdd/progress.md` is the runtime authority; the frontmatter mirrors it.

**Goal:** Accounts no longer come only from the seed. An admin types an email on `/admin/invitations` and gets a link valid 7 days, usable once, that he passes on himself. The person opens `/invite/<token>`, chooses a display name and a password, and lands on their library, logged in, with a `member` account. A member who calls an admin route gets `403 FORBIDDEN`; without a session it stays `401 UNAUTHENTICATED`.

**Architecture:** A new `Invitation` collection (`tokenHash` unique, `email` indexed, `invitedById` relation to `User`, `expiresAt`, `usedAt`). `requireRole(role)` (new file `features/auth/auth.guard.ts`, with `currentUser`) throws `FORBIDDEN` after `requireAuth`. A new feature folder `server/src/features/invitations/` (repository, service with injected deps, controller, routes) serves `POST /api/invitations` and `GET /api/invitations` behind `requireAuth, requireAdmin`, and the public `POST /api/invitations/accept`, which creates the member, then opens a session through the auth service's new `openSession` and sets the cookie. The token travels only in JSON bodies, never in an API path. The client gets `invitation.ts`, `invitationsApi.ts`, `postAcceptInvitation` / `acceptInvitation`, `RequireAdmin`, `InvitePage` and `AdminInvitationsPage`. Four PRs in a `gh stack`.

**Tech Stack:** Node 24, TypeScript 7 (`nodenext`, `strict`, `verbatimModuleSyntax`), Express 5, Prisma 6.19 (MongoDB), `node:crypto` through `lib/session-token.ts`, argon2 through `lib/password.ts`, Vitest 5, Biome 2, Bruno CLI 4.2.0, React 19 + react-router 7 + shadcn/ui + lucide-react, `gh stack`.

## Global Constraints

- **No new dependency**, server or client. Token helpers come from `lib/session-token.ts` (`generateToken`, `hashToken`, unchanged), password hashing from `lib/password.ts`. Prisma stays on v6.
- **No client test runner:** the client has none; do not add one. Client tasks are verified by `pnpm typecheck`, `pnpm build`, `pnpm check` and the manual checks of the final verification.
- **Error codes (exact, from the spec):** `FORBIDDEN` 403, `EMAIL_INVALID` 400, `ACCOUNT_EXISTS` 409, `INVITATION_NOT_FOUND` 404, `INVITATION_EXPIRED` 410, `INVITATION_USED` 410, `DISPLAY_NAME_INVALID` 400, `PASSWORD_INVALID` 400. A malformed JSON body answers `400 BODY_INVALID`, as on `/api/auth`.
- **Client messages (exact):** `FORBIDDEN`: « Cette action est réservée à l'administrateur. »; `EMAIL_INVALID`: « Adresse e-mail invalide. »; `ACCOUNT_EXISTS`: « Un compte existe déjà pour cette adresse e-mail. »; `INVITATION_NOT_FOUND`: « Ce lien d'invitation n'est pas valide. Demandez-en un nouveau. »; `INVITATION_EXPIRED`: « Ce lien d'invitation a expiré. Demandez-en un nouveau. »; `INVITATION_USED`: « Ce lien d'invitation a déjà servi. Connectez-vous. »; `DISPLAY_NAME_INVALID`: « Choisissez un nom de 1 à 50 caractères. »; `PASSWORD_INVALID`: « Le mot de passe doit faire entre 12 et 128 caractères. » Client error codes are synced in the same commit as the server types (both files say "keep both in sync"; see Choices).
- **Invitation DTO (exact):** `{ id, email, status, createdAt, expiresAt }` (ISO strings), `status` ∈ `pending | used | expired`. `tokenHash` and `invitedById` never leave the server. Creation answers `201 { invitation, token }` (the raw token, once); the list answers `200 { invitations }`, newest first (`id` descending), no pagination; accept answers `201 { user }` + `Set-Cookie: ff_session=…`.
- **Rules (exact):** `INVITATION_DURATION_MS` = 7 days; `EMAIL_PATTERN` = `^[^\s@]+@[^\s@]+$` on the trimmed, lowercased email; `TOKEN_PATTERN` = 64 hex characters; display name trimmed, 1 to 50 (`DISPLAY_NAME_MAX_LENGTH`); password not trimmed, 12 to 128 (`PASSWORD_MIN_LENGTH`, `PASSWORD_MAX_LENGTH`). Status: `used` when `usedAt` is set, else `expired` when `expiresAt <= now`, else `pending`. Accept checks the token (shape, lookup, used, expired) before the display name, before the password. A new invitation deletes every unused invitation for the same email first. No transaction: the unique index on `User.email` is the guarantee (P2002 → `ACCOUNT_EXISTS`).
- **The token never appears in an API path** (`http.request` logs every path): it travels in the JSON body of `POST /api/invitations/accept`. The client builds the link as `` `${window.location.origin}/invite/${token}` ``.
- **Log events (exact):** `auth.forbidden` (warn, `userId`), `invitation.created` (info: `invitationId`, `userId` = the admin, `replacedCount`), `invitation.accepted` (info: `invitationId`, `userId` = the new member), `invitation.accept_failed` (warn: `reason` ∈ `not_found | used | expired | account_exists`, plus `invitationId` when known). Never log the token, its hash, an email, a name, a password or an environment value; only ids. Log only through `server/src/lib/logger.ts` (injected `logger` in the invitations service, imported `logger` in `auth.guard.ts`), never `console`.
- **UI text (French, exact):** see the spec's Client section; every string is written out in the task that adds it.
- **MongoDB pitfall:** the repository writes `usedAt: null` explicitly on create; the "unused" filter is a plain `usedAt: null`.
- **No `vi.mock`:** fakes are `vi.fn()` passed through the factory; the only spy is `vi.spyOn(logger, 'warn')` in the guard test (restored after each test). Vitest imports are explicit (`import { describe, expect, it, vi } from 'vitest'`).
- **TypeScript (AGENTS.md):** no `as` casts, explicit return types on exported functions, literal unions rather than `enum`.
- **Code rules (`.claude/rules/`):** comment why, never what; no file-summary comments; name callback params after the item; no magic numbers in `src` code (test inputs may be literal); **every function, React components included, at most 30 lines**; **every file at most 300 lines, test files included** (split test files by concern); max 5 params; no flag parameters; booleans prefixed `is`/`has`/`should`; catch errors as `unknown`.
- Server imports use the `.js` extension; client imports use the `@/` alias with the `.ts`/`.tsx` extension (`App.tsx` keeps its relative imports).
- **Language:** code, comments, logs and commits in English; UI text, Bruno `docs` blocks, README and ARCHITECTURE in French.
- **Test API for gates:** the author's dev API may hold port 3000. From `server/`, start the test API in its **own background command**: `PORT=3002 npx tsx --env-file-if-exists=.env src/server.ts` (never combine it in one shell command with `cat`, `grep`, `sed` or another reader word: a hook blocks commands containing `.env` plus a reader word). It does not watch files: restart it after each code change. Wait for the `server.started` log line.
- **Bruno gate command** (from `server/bruno/`): `pnpm dlx @usebruno/cli@4.2.0 run . -r --env Local --disable-cookies --env-var baseUrl=http://localhost:3002` (the same as `pnpm test:bruno`, pointed at port 3002). The expected request and assertion counts are given per task; they were counted from the request files (requests = `.bru` files except `folder.bru`, `collection.bru` and `environments/`; assertions = non-empty lines inside `assert {}` blocks; `test()` calls counted apart).
- **Stopping the test API:** in PowerShell, `$listener = Get-NetTCPConnection -LocalPort 3002 -State Listen | Select-Object -First 1 -ExpandProperty OwningProcess`, check `(Get-CimInstance Win32_Process -Filter "ProcessId=$listener").CommandLine` does **not** contain `worktrees`, then `Stop-Process -Id $listener`. Never stop a process you did not start, never one whose command line contains `worktrees`.
- **Database:** `pnpm db:push` and `pnpm db:seed` are **controller only** (the dev MongoDB is shared with another session, which must be warned before a seed wipes it). Implementers only run `pnpm --filter server db:generate` (no database access). If `prisma generate` fails with `EPERM`, a running API holds the Prisma engine file: report it, do not kill processes you did not start.
- **Gates:** every commit passes `pnpm check` and `pnpm typecheck`. Every task ends green on `pnpm test`, `pnpm build`, and (server tasks that touch routes) the Bruno gate command against the test API.
- **API change → Bruno in the same commit; business rule change → its colocated `*.test.ts` in the same commit.**
- **Commits:** atomic, one concern each; Conventional Commits in English, message written to a file in the scratchpad and passed with `git commit -F <file>`. Every message ends with these two lines, after a blank line:
  ```
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Hm8u1MNisEcmacs5tNKshr
  ```
  A failing hook means no commit: fix (`pnpm check:fix`, then re-add only the task's files) and commit again. Never `--no-verify`.
- **Never read or print any `.env` file** (a hook blocks commands containing a reader word plus `.env`; the variables are listed in `server/.env.example`).
- **Stack:** the controller creates branches with `gh stack`; implementers never switch branches, push or run `gh stack`. Never `gh pr merge`.

## Choices made while planning (not in the spec, or resolving a conflict with the code or the rules)

- **`requireRole` and `currentUser` live in a new `features/auth/auth.guard.ts`, tested by `auth.guard.test.ts`** (the spec says `auth.middleware.ts` and `auth.middleware.test.ts`). `auth.middleware.ts` imports `auth.cookie.ts`, which imports `config.ts`, which throws at import time without `DATABASE_URL`: a unit test of anything in `auth.middleware.ts` cannot even load under `pnpm test` (no env). `auth.guard.ts` imports only `AppError`, `logger` and types. `auth.controller.ts` and `photos.controller.ts` import `currentUser` from the new file.
- **`requireRole` returns a `RoleGuard`** (`(req: Pick<Request, 'user'>, res: unknown, next: () => void) => void`) rather than `RequestHandler`: Express accepts it as a handler, and the test passes `{ user }` and a `vi.fn()` without casts. It throws (`UNAUTHENTICATED` without `req.user`, `FORBIDDEN` for another role); Express 5 forwards a synchronous throw to the error handler.
- **`assembleInvitationsRouter(authService, requireAuth, requireAdmin)`** takes three parameters (the spec's Controller section lists two, its Guard section says `app.ts` builds `requireAdmin` once and hands it over). `createApp` builds `requireAdmin = requireRole('admin')` next to `requireAuth`. Task 4 passes only `requireAuth, requireAdmin`; Task 6 adds `authService` in front when the controller needs `openSession`.
- **Client error codes and messages are synced in the server's commit** (Tasks 2, 3, 5), not in PR D as the spec's Delivery table says. Both `types.ts` and `client/src/api.ts` say "keep both in sync", the step 2 plan did the same, and `ERROR_MESSAGES` is an exhaustive `Record` over the server's codes: a lagging client would still compile, but the PRs in between would ship codes without a French message.
- **`hashPassword` joins the service deps in Task 5** (accept), not Task 3: Task 3's service has no use for it. `app.ts` passes it from Task 5 on.
- **No `invitation.accept_failed` log for a malformed token.** The spec lists that log for steps 2, 3 and 5 only, and step 1 answers without a lookup: a malformed token is not an invitation, there is no `invitationId` to log, and `http.request` already warns on the 404.
- **The accept tests live in `invitations.service.accept.test.ts`**: one file with the create, list and accept tests would pass 300 lines. Each file has its own small `makeDeps`.
- **Bruno 7-day check allows ±1 minute.** `createdAt` comes from the database default (`@default(now())`, Prisma's clock at insert) and `expiresAt` from the service's `now()`: two reads of the clock a few milliseconds apart. `create/01` checks `|expiresAt - createdAt - 7 days| < 60 s`; the unit test checks the exact value.
- **Bruno `create/01` also sends the email in upper case with spaces** (`inviteEmailTyped`, set in its pre-request script) and checks the lowercased `inviteEmail` comes back. Bruno interpolates `{{vars}}` after the pre-request script, so `bru.setVar` there feeds the body.
- **Bruno `accept/05-nominal` uses the display name "Invitée"** and the password `invite-bruno-dev` (16 characters). Runs leave these accounts behind until `pnpm db:seed`; `collection.bru` docs say so.
- **`TextField` is a shared component** (`client/src/components/form/TextField.tsx`, label + input): the invite form has three fields and the admin form one, and `InviteForm` must stay under 30 lines per function. `LoginForm` is not migrated (out of scope).
- **`AuthProvider` gains `useAuthActions(setUser)`**, which builds `login`, `acceptInvitation`, `logout` and `dropUser`: adding `acceptInvitation` inline would pass 30 lines. `authApi.ts` gains a private `postForUser(url, payload)` shared by `postLogin` and `postAcceptInvitation` (same `readUser`).
- **`App.tsx` routes split into `AppRoutes`, with one `RequireAuth` layout route** (`<Outlet />`) around `/`, `/frame` and `/admin/invitations`: a third wrapped route would push `App` to 38 lines. Behaviour is unchanged: each child is still rendered inside `RequireAuth`.
- **The « Invitations » link lives in `components/library/LibraryActions.tsx`** (with `LogoutButton`), placed in the library card's `CardAction`.
- **`useInvitations` keeps only the latest load** (a ref counter): the step 2 drift log showed overlapping loads applying out of order. A creation calls `reload()`; two quick creations start two loads, only the last one sets the list.
- **The invitation list date format is duplicated from `photoLabel.ts`** (`fr-FR`, day / long month / year) rather than shared: "prefer duplication over the wrong abstraction", the two labels may change separately.
- **The admin page shows two cards:** « Invitations » (form, link, « Retour à la bibliothèque » in `CardAction`) and « Invitations envoyées » (the list). The link is kept in memory only.
- **Database checkpoint C1 after Task 1 is `pnpm db:push` then `pnpm db:seed`.** The spec only asks for `db:push` (new collection, nothing to wipe); the seed runs too so its new `invitation.deleteMany()` is exercised once, and it starts the step from known accounts. Warn the other session before the seed.

### Verified behavior

- **Bruno run order (CLI 4.2.0):** folders without a `seq` are sorted by name, then each sequenced folder is inserted at index `seq - 1`. With `auth` (`seq: 1`) and `invitations` (`seq: 2`), the order is `auth`, `invitations`, then `health`, `not-found`, `photos`. Inside `invitations/`: `create` (1), `list` (2), `accept` (3).
- **Bruno scripts:** `req.setHeader`, `req.deleteHeader` and `req.setBody` exist in pre-request scripts; `bru.getEnvVar('baseUrl')` returns the `--env-var` override; interpolation happens after the pre-request script.
- **Prisma on MongoDB:** `create` without `usedAt` leaves the field absent, and `where: { usedAt: null }` does not match an absent field; hence the explicit `usedAt: null`.
- **Config at import:** `server/src/config.ts` throws when `DATABASE_URL` is missing; `pnpm test` runs without env, so no unit test may import a module that reaches `config.ts` (`auth.cookie.ts`, `lib/db.ts`, `lib/cloudinary.ts`).
- **Baselines (measured on `feat/invitations-schema` at 7feb93c):** `pnpm test` → `Tests  87 passed (87)`; Bruno: 32 requests, 70 assertions, 17 `test()` calls.
- **Every task's code was written and run in a throwaway worktree while planning:** unit test counts below are measured (`Tests  134 passed (134)` at the end of Task 6); client code passed `tsc -b` and `biome check`; every function was measured at 30 lines or fewer. Bruno counts are read from the files (the API was not started while planning).

## File Map

| File | Task | Responsibility |
| --- | --- | --- |
| `server/prisma/schema.prisma` | 1 | `Invitation` model, `User.invitations` |
| `server/prisma/seed.ts` | 1 | delete invitations before users |
| `server/src/features/auth/auth.guard.ts` (+ `.test.ts`) | 2 | `currentUser`, `requireRole` |
| `server/src/features/auth/auth.middleware.ts`, `auth.controller.ts`, `features/photos/photos.controller.ts` | 2 | `currentUser` moves to `auth.guard.ts` |
| `server/src/types.ts`, `server/src/errors/error-handler.ts` (+ `.test.ts`), `client/src/api.ts` | 2, 3, 5 | codes, statuses, messages; `Invitation`, `CreatedInvitation` |
| `server/src/features/invitations/invitations.repository.ts` | 3, 5 | only Prisma access for invitations and member creation |
| `server/src/features/invitations/invitations.service.ts` | 3, 5 | create, list, accept rules |
| `server/src/features/invitations/invitations.service.test.ts` | 3, 5 | create and list rules |
| `server/src/features/invitations/invitations.service.accept.test.ts` | 5 | accept rules |
| `server/src/features/invitations/invitations.controller.ts`, `invitations.routes.ts` | 4, 6 | HTTP layer |
| `server/src/app.ts` | 4, 5, 6 | `requireAdmin`, `assembleInvitationsRouter`, `/api/invitations` |
| `server/src/features/auth/auth.service.ts` (+ `.test.ts`) | 6 | `openSession` |
| `server/bruno/invitations/**`, `server/bruno/collection.bru`, `server/bruno/auth/folder.bru`, `server/bruno/auth/logout/04-nominal-reconnexion.bru` | 4, 6 | invitation requests, docs |
| `client/src/auth/authApi.ts`, `AuthContext.ts`, `AuthProvider.tsx` | 7 | `postAcceptInvitation`, `acceptInvitation` |
| `client/src/components/form/TextField.tsx`, `components/auth/InviteForm.tsx`, `pages/InvitePage.tsx` | 7 | `/invite/:token` |
| `client/src/invitation.ts`, `invitationsApi.ts` | 8, 9 | types, guards, link, API calls |
| `client/src/auth/RequireAdmin.tsx`, `components/admin/{BackToLibraryLink,InvitationForm,InvitationLink}.tsx`, `pages/AdminInvitationsPage.tsx` | 8, 9 | `/admin/invitations` creation |
| `client/src/components/library/LibraryActions.tsx`, `pages/LibraryPage.tsx` | 8 | « Invitations » link for admins |
| `client/src/hooks/useInvitations.ts`, `components/admin/InvitationList.tsx` | 9 | list |
| `client/src/App.tsx` | 7, 8 | routes |
| `ARCHITECTURE.md`, `README.md` | 1, 2, 4, 6, 9 | docs per PR |

## Stack and branches (controller only)

- **PR A `feat/invitations-schema`**: already checked out, stacked on `feat/library-page` (stack #50); holds the spec (7feb93c) and this plan. Tasks 1-2.
- **Before Task 3:** `gh stack add feat/invitations-create` (PR B). Tasks 3-4.
- **Before Task 5:** `gh stack add feat/invitations-accept` (PR C). Tasks 5-6.
- **Before Task 7:** `gh stack add feat/client-invitations` (PR D). Tasks 7-9.
- After the final review: `gh stack submit --auto` (draft PRs), then `gh stack view --json`.
- **Database checkpoint C1** is written after Task 1. Before its seed, warn the other session (it loses its photos, sessions and login), then run the commands from the repo root.

---

## PR A — `feat/invitations-schema`

### Task 1: The `Invitation` model (PR A, `feat/invitations-schema`)

**Files:**
- Modify: `server/prisma/schema.prisma`, `server/prisma/seed.ts`
- Modify: `ARCHITECTURE.md` (Données)

**Interfaces:**
- Produces (used by Tasks 3 and 5): the generated Prisma types `Invitation` and `User` with `invitations`, and `prisma.invitation`.

- [ ] **Step 1: Change the schema and regenerate the client**

Apply to `server/prisma/schema.prisma` (the `User` columns are realigned by `prisma format`):

```diff
--- a/server/prisma/schema.prisma
+++ b/server/prisma/schema.prisma
@@ -13,14 +13,15 @@ enum Role {
 }
 
 model User {
-  id           String    @id @default(auto()) @map("_id") @db.ObjectId
-  email        String    @unique
+  id           String       @id @default(auto()) @map("_id") @db.ObjectId
+  email        String       @unique
   displayName  String
   passwordHash String
-  role         Role      @default(member)
-  createdAt    DateTime  @default(now())
+  role         Role         @default(member)
+  createdAt    DateTime     @default(now())
   sessions     Session[]
   photos       Photo[]
+  invitations  Invitation[]
 }
 
 model Session {
@@ -47,3 +48,16 @@ model Photo {
   @@index([ownerId, id])
   @@index([cloudinaryId])
 }
+
+model Invitation {
+  id          String    @id @default(auto()) @map("_id") @db.ObjectId
+  tokenHash   String    @unique
+  email       String
+  invitedById String    @db.ObjectId
+  invitedBy   User      @relation(fields: [invitedById], references: [id])
+  expiresAt   DateTime
+  usedAt      DateTime?
+  createdAt   DateTime  @default(now())
+
+  @@index([email])
+}
```

Run: `pnpm --filter server exec prisma format` then `pnpm --filter server db:generate`
Expected: `✔ Generated Prisma Client`. (No database access: `db:push` is the controller's checkpoint C1.)

- [ ] **Step 2: Delete invitations in the seed**

Apply to `server/prisma/seed.ts`:

```diff
--- a/server/prisma/seed.ts
+++ b/server/prisma/seed.ts
@@ -22,10 +22,11 @@ const SEED_USERS: SeedUser[] = [
 ]
 
 async function seed(): Promise<void> {
-  // Sessions and photos first: Prisma emulates the relations on MongoDB and refuses
-  // to delete a user that still has sessions or photos.
+  // Sessions, photos and invitations first: Prisma emulates the relations on MongoDB
+  // and refuses to delete a user that still has any of them.
   await prisma.session.deleteMany()
   await prisma.photo.deleteMany()
+  await prisma.invitation.deleteMany()
   await prisma.user.deleteMany()
   for (const { password, ...user } of SEED_USERS) {
     await prisma.user.create({ data: { ...user, passwordHash: await hashPassword(password) } })
```

- [ ] **Step 3: Gates**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  87 passed (87)`. Bruno is unchanged (32 requests, 70 assertions); no route changed, so no Bruno run.

- [ ] **Step 4: Commit the schema**

```bash
git add server/prisma/schema.prisma server/prisma/seed.ts
git commit -F <message-file>
```

Message: `feat(server): add the invitation model`, body: `An invitation stores the SHA-256 of its token, the invited email, the admin who created it, its end date and when it was used. The seed deletes invitations before users: Prisma emulates the relation on MongoDB.` + the attribution lines.

- [ ] **Step 5: ARCHITECTURE, Données**

In `ARCHITECTURE.md`, `## Données`:

1. Replace the bullet starting with `- Collections \`User\`, \`Session\` et \`Photo\`.` with:
   ```markdown
   - Collections `User`, `Session`, `Photo` et `Invitation`. Index uniques sur `User.email`, `Session.tokenHash` et `Invitation.tokenHash` ; le rôle est un `enum Role` Prisma, que Prisma génère en union de chaînes. `Photo.ownerId` relie chaque photo à son compte ; index unique `(ownerId, sha256)` (un même fichier n'entre qu'une fois dans une bibliothèque), index `(ownerId, id)` pour la liste d'un compte, et index simple sur `cloudinaryId` (plus unique : à l'étape 5, un partage pointera vers la même image). `Invitation.invitedById` relie une invitation à l'admin qui l'a créée ; index simple sur `Invitation.email` (pas unique : une invitation utilisée reste à côté d'une plus récente pour la même adresse). `pnpm db:seed` (`server/prisma/seed.ts`) vide la base (sessions, photos et invitations avant les comptes, car Prisma émule les relations sur MongoDB) et crée les deux comptes de test du README.
   ```
2. Add after the bullet starting with `- Quand \`Photo\` gagne un champ obligatoire`:
   ```markdown
   - Piège MongoDB : Prisma n'écrit pas un champ facultatif absent du `create`, et `where: { usedAt: null }` ne trouve qu'un `null` enregistré, pas un champ absent. Le repository des invitations écrit donc `usedAt: null` explicitement à la création : le filtre « pas encore utilisée » reste un simple `usedAt: null`.
   ```

- [ ] **Step 6: Check and commit the docs**

Run: `pnpm check` (if the hook rejects the `.md` file, run `pnpm exec biome format --write ARCHITECTURE.md`).

```bash
git add ARCHITECTURE.md
git commit -F <message-file>
```

Message: `docs: describe the invitation collection` + the attribution lines.

---

### Controller checkpoint C1 — after Task 1 (controller only)

- [x] From the repo root: `pnpm db:push`. Expected: `Your database indexes are now in sync with your Prisma schema` (the `Invitation` collection, its unique `tokenHash` index and its `email` index appear; nothing else changes). If it fails with `EPERM` while regenerating the client, a running API holds the engine: stop your own test API and rerun.
- [x] Warn the other session (frame UI) that the shared dev database is about to be wiped (photos, sessions, users): it must log in again and re-upload its photos.
- [x] Then `pnpm db:seed`. Expected: a `seed.done` log line with `users=2`.
- [x] Record the checkpoint in the Drift Log (date, both commands passed).

---

### Task 2: The admin guard and `FORBIDDEN`, and the PR A docs (PR A, `feat/invitations-schema`)

**Files:**
- Create: `server/src/features/auth/auth.guard.ts`
- Test: `server/src/features/auth/auth.guard.test.ts` (new), `server/src/errors/error-handler.test.ts`
- Modify: `server/src/features/auth/auth.middleware.ts`, `auth.controller.ts`, `server/src/features/photos/photos.controller.ts`
- Modify: `server/src/types.ts`, `server/src/errors/error-handler.ts`, `client/src/api.ts`
- Modify: `ARCHITECTURE.md`

**Interfaces:**
- Consumes: `req.user` (declaration merging, set by `requireAuth`), `AppError`, `logger`.
- Produces (used by Tasks 4 and 6):
  ```ts
  // server/src/features/auth/auth.guard.ts
  export type RoleGuard = (req: Pick<Request, 'user'>, res: unknown, next: () => void) => void
  export function currentUser(req: Pick<Request, 'user'>): PublicUser
  export function requireRole(role: UserRole): RoleGuard
  // server/src/types.ts: ApiErrorCode gains 'FORBIDDEN'
  ```

- [ ] **Step 1: Write the failing unit tests**

Create `server/src/features/auth/auth.guard.test.ts`:

```ts
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
import { logger } from '../../lib/logger.js'
import type { PublicUser } from '../../types.js'
import { requireRole } from './auth.guard.js'

const ADMIN: PublicUser = {
  id: '6b044f9d56a44767c7079b01',
  email: 'admin@familyframe.test',
  displayName: 'Admin',
  role: 'admin',
}
const MEMBER: PublicUser = {
  id: '6b044f9d56a44767c7079b02',
  email: 'membre@familyframe.test',
  displayName: 'Membre',
  role: 'member',
}

// The guard only reads req.user: a plain object stands in for the Express request.
function runAdminGuard(user: PublicUser | undefined): Mock<() => void> {
  const next = vi.fn<() => void>()
  requireRole('admin')({ user }, undefined, next)
  return next
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('requireRole', () => {
  it('lets an admin through to the next handler', () => {
    const next = runAdminGuard(ADMIN)

    expect(next).toHaveBeenCalledWith()
  })

  it('refuses a member with FORBIDDEN and logs the user id only', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})

    expect(() => runAdminGuard(MEMBER)).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }))
    expect(warn).toHaveBeenCalledWith('auth.forbidden', { userId: MEMBER.id })
  })

  it('refuses a request without a user with UNAUTHENTICATED', () => {
    expect(() => runAdminGuard(undefined)).toThrow(
      expect.objectContaining({ code: 'UNAUTHENTICATED' }),
    )
  })
})
```

Apply to `server/src/errors/error-handler.test.ts`:

```diff
--- a/server/src/errors/error-handler.test.ts
+++ b/server/src/errors/error-handler.test.ts
@@ -11,6 +11,13 @@ describe('toErrorResponse', () => {
     })
   })
 
+  it('answers a member on an admin route with 403', () => {
+    expect(toErrorResponse(new AppError('FORBIDDEN'))).toEqual({
+      status: 403,
+      body: { error: 'FORBIDDEN' },
+    })
+  })
+
   it('answers an unknown route with 404', () => {
     expect(toErrorResponse(new AppError('ROUTE_NOT_FOUND'))).toEqual({
       status: 404,
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test`
Expected: FAIL: `auth.guard.test.ts` cannot resolve `./auth.guard.js`, and the new `error-handler.test.ts` case gets `status: undefined`. The other files pass.

- [ ] **Step 3: The `FORBIDDEN` code, server and client**

Apply to `server/src/types.ts`, `server/src/errors/error-handler.ts` and `client/src/api.ts`:

```diff
--- a/client/src/api.ts
+++ b/client/src/api.ts
@@ -6,6 +6,7 @@ export type ApiErrorCode =
   | 'QUERY_INVALID'
   | 'UNAUTHENTICATED'
   | 'INVALID_CREDENTIALS'
+  | 'FORBIDDEN'
   | 'ROUTE_NOT_FOUND'
   | 'PHOTO_NOT_FOUND'
   | 'PHOTO_DUPLICATE'
@@ -21,6 +22,7 @@ const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
   QUERY_INVALID: 'Requête invalide. Rechargez la page et réessayez.',
   UNAUTHENTICATED: 'Votre session a expiré. Reconnectez-vous.',
   INVALID_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
+  FORBIDDEN: "Cette action est réservée à l'administrateur.",
   ROUTE_NOT_FOUND: "Cette adresse n'existe pas sur le serveur.",
   PHOTO_NOT_FOUND: 'Cette photo a déjà été supprimée.',
   PHOTO_DUPLICATE: 'Cette photo est déjà dans votre bibliothèque.',
--- a/server/src/errors/error-handler.ts
+++ b/server/src/errors/error-handler.ts
@@ -11,6 +11,7 @@ const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
   QUERY_INVALID: 400,
   UNAUTHENTICATED: 401,
   INVALID_CREDENTIALS: 401,
+  FORBIDDEN: 403,
   ROUTE_NOT_FOUND: 404,
   PHOTO_NOT_FOUND: 404,
   PHOTO_DUPLICATE: 409,
--- a/server/src/types.ts
+++ b/server/src/types.ts
@@ -8,6 +8,7 @@ export type ApiErrorCode =
   | 'QUERY_INVALID'
   | 'UNAUTHENTICATED'
   | 'INVALID_CREDENTIALS'
+  | 'FORBIDDEN'
   | 'ROUTE_NOT_FOUND'
   | 'PHOTO_NOT_FOUND'
   | 'PHOTO_DUPLICATE'
```

- [ ] **Step 4: The guard, and `currentUser` moves next to it**

Create `server/src/features/auth/auth.guard.ts`:

```ts
import type { Request } from 'express'
import { AppError } from '../../errors/app-error.js'
import { logger } from '../../lib/logger.js'
import type { PublicUser, UserRole } from '../../types.js'

// Only req.user is read: the unit test passes a plain object instead of an Express request.
type RequestWithUser = Pick<Request, 'user'>

// Narrower than RequestHandler, which it still satisfies wherever Express expects one.
export type RoleGuard = (req: RequestWithUser, res: unknown, next: () => void) => void

// For handlers behind requireAuth: fails loudly if one is mounted without it.
export function currentUser(req: RequestWithUser): PublicUser {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED')
  }
  return req.user
}

// Mounted after requireAuth: the role comes from the session it already loaded, no extra query.
export function requireRole(role: UserRole): RoleGuard {
  return (req, _res, next) => {
    const user = currentUser(req)
    if (user.role !== role) {
      logger.warn('auth.forbidden', { userId: user.id })
      throw new AppError('FORBIDDEN')
    }
    next()
  }
}
```

Apply to `auth.middleware.ts` (remove `currentUser` and the now unused `Request` import), `auth.controller.ts` and `photos.controller.ts` (import `currentUser` from `auth.guard.js`):

```diff
--- a/server/src/features/auth/auth.controller.ts
+++ b/server/src/features/auth/auth.controller.ts
@@ -1,7 +1,7 @@
 import type { Request, Response } from 'express'
 import { readSessionToken } from '../../lib/session-token.js'
 import { clearSessionCookie, setSessionCookie } from './auth.cookie.js'
-import { currentUser } from './auth.middleware.js'
+import { currentUser } from './auth.guard.js'
 import type { AuthService } from './auth.service.js'
 
 export type AuthController = {
--- a/server/src/features/auth/auth.middleware.ts
+++ b/server/src/features/auth/auth.middleware.ts
@@ -1,4 +1,4 @@
-import type { Request, RequestHandler } from 'express'
+import type { RequestHandler } from 'express'
 import { AppError } from '../../errors/app-error.js'
 import { readSessionToken } from '../../lib/session-token.js'
 import type { PublicUser } from '../../types.js'
@@ -28,11 +28,3 @@ export function createRequireAuth(service: AuthService): RequestHandler {
     next()
   }
 }
-
-// For handlers behind requireAuth: fails loudly if one is mounted without it.
-export function currentUser(req: Request): PublicUser {
-  if (!req.user) {
-    throw new AppError('UNAUTHENTICATED')
-  }
-  return req.user
-}
--- a/server/src/features/photos/photos.controller.ts
+++ b/server/src/features/photos/photos.controller.ts
@@ -2,7 +2,7 @@ import type { Request, Response } from 'express'
 import { deliveryUrls } from '../../lib/cloudinary.js'
 import type { SocketServer } from '../../lib/socket-types.js'
 import type { Photo, PhotoPage } from '../../types.js'
-import { currentUser } from '../auth/auth.middleware.js'
+import { currentUser } from '../auth/auth.guard.js'
 import { userRoom } from '../auth/auth.socket.js'
 import type { PhotoRecord } from './photos.repository.js'
 import type { PhotosService } from './photos.service.js'
```

Run: `git grep -n "currentUser" -- server/src`
Expected: the definition in `auth.guard.ts`, its import and uses in `auth.controller.ts` and `photos.controller.ts`, and the guard's own call; no import from `auth.middleware.js`.

- [ ] **Step 5: Gates**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  91 passed (91)` (87 + 3 guard tests + 1 error-handler case).

From `server/`, start the test API (own background command), then from `server/bruno/` run the Bruno gate command.
Expected: 32 requests, 70 assertions, all passed (no route uses the guard yet; this proves the `currentUser` move). Stop the test API.

- [ ] **Step 6: Commit the guard**

```bash
git add server/src/features/auth server/src/features/photos/photos.controller.ts server/src/types.ts server/src/errors client/src/api.ts
git commit -F <message-file>
```

Message: `feat(server): add the admin role guard`, body: `requireRole(role) answers 403 FORBIDDEN, logged as auth.forbidden with the user id only, when the logged-in user has another role. It lives with currentUser in auth.guard.ts: auth.middleware.ts reaches config.ts, which a unit test cannot load without env. The client gets the FORBIDDEN message.` + the attribution lines.

- [ ] **Step 7: ARCHITECTURE**

In `ARCHITECTURE.md`:

1. In the error table, add after the `INVALID_CREDENTIALS` row:
   ```markdown
   | compte connecté sans le rôle demandé (membre sur une route admin)        | 403    | `FORBIDDEN`           |
   ```
2. In `## Authentification`, replace the bullet starting with `- **Garde HTTP**` with:
   ```markdown
   - **Garde HTTP** : `requireAuth` (`features/auth/auth.middleware.ts`) lit le cookie avec `lib/session-token.ts` (sans `cookie-parser`), valide la session et pose `req.user`, typé par _declaration merging_ sur `Request` ; `currentUser(req)` (`features/auth/auth.guard.ts`) le relit sans cast. `requireRole(role)` (même fichier), monté après `requireAuth`, compare le rôle de la session déjà chargée (aucune requête en plus) et répond `403 FORBIDDEN` à un autre rôle. Il vit à part du middleware : `auth.middleware.ts` atteint `config.ts`, qu'un test unitaire ne peut pas charger sans variables d'environnement. `/api/photos` et `/api/auth/me` sont derrière `requireAuth` ; `/api/health`, `/api/auth/login` et `/api/auth/logout` restent publics.
   ```
3. In `## Couches du backend`, in the bullet starting with `- \`features/auth/\` suit le même découpage`, replace `plus \`auth.middleware.ts\` (garde HTTP),` with `plus \`auth.middleware.ts\` (garde HTTP), \`auth.guard.ts\` (\`currentUser\`, \`requireRole\`),`.
4. In the `## Logs` table, add after the `auth.login_failed` row:
   ```markdown
   | `auth.forbidden`                                            | warn                          | `requireRole`, avec `userId` : un compte sans le rôle demandé                                                                                                               |
   ```

- [ ] **Step 8: Check and commit the docs**

Run: `pnpm check` (format with `pnpm exec biome format --write ARCHITECTURE.md` if the hook rejects it).

```bash
git add ARCHITECTURE.md
git commit -F <message-file>
```

Message: `docs: describe the admin role guard` + the attribution lines.

---

## PR B — `feat/invitations-create`

> **Controller:** before Task 3, run `gh stack add feat/invitations-create`.

### Task 3: Create and list invitations in the service (PR B, `feat/invitations-create`)

**Files:**
- Create: `server/src/features/invitations/invitations.repository.ts`, `invitations.service.ts`
- Test: `server/src/features/invitations/invitations.service.test.ts` (new), `server/src/errors/error-handler.test.ts`
- Modify: `server/src/types.ts`, `server/src/errors/error-handler.ts`, `client/src/api.ts`

**Interfaces:**
- Consumes: the Prisma `Invitation` model (Task 1), `generateToken` / `hashToken` signatures (`lib/session-token.ts`), `Logger` (`lib/logger.ts`), `AppError`.
- Produces (used by Tasks 4 and 5):
  ```ts
  // server/src/types.ts
  export type InvitationStatus = 'pending' | 'used' | 'expired'
  export type Invitation = { id: string; email: string; status: InvitationStatus; createdAt: string; expiresAt: string }
  export type CreatedInvitation = { invitation: Invitation; token: string }
  // ApiErrorCode gains 'EMAIL_INVALID' (400) and 'ACCOUNT_EXISTS' (409)
  // invitations.repository.ts
  export type InvitationRecord = Invitation // Prisma's
  export type NewInvitation = { tokenHash: string; email: string; invitedById: string; expiresAt: Date }
  export type InvitationsRepository = {
    hasUserWithEmail: (email: string) => Promise<boolean>
    deleteUnusedByEmail: (email: string) => Promise<number>
    create: (invitation: NewInvitation) => Promise<InvitationRecord>
    findAll: () => Promise<InvitationRecord[]>
  }
  export function createInvitationsRepository(prisma: PrismaClient): InvitationsRepository
  // invitations.service.ts
  export const INVITATION_DURATION_MS: number
  export type NewInvitationInput = { email: unknown; invitedById: string }
  export type InvitationsServiceDeps = { repository; generateToken; hashToken; now; logger }
  export type InvitationsService = {
    createInvitation: (input: NewInvitationInput) => Promise<CreatedInvitation>
    listInvitations: () => Promise<Invitation[]>
  }
  export function createInvitationsService(deps: InvitationsServiceDeps): InvitationsService
  ```

- [ ] **Step 1: Create the branch (controller)**

Run: `gh stack add feat/invitations-create`
Expected: the new branch is checked out on top of `feat/invitations-schema`.

- [ ] **Step 2: Write the failing unit tests**

Create `server/src/features/invitations/invitations.service.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { InvitationRecord, InvitationsRepository } from './invitations.repository.js'
import {
  createInvitationsService,
  INVITATION_DURATION_MS,
  type InvitationsServiceDeps,
} from './invitations.service.js'

const NOW = new Date('2026-11-24T10:00:00Z')
const EXPIRES_AT = new Date(NOW.getTime() + INVITATION_DURATION_MS)
const ADMIN_ID = '6b044f9d56a44767c7079b01'
const EMAIL = 'mamie@example.fr'
const TOKEN = 'a'.repeat(64)
const TOKEN_HASH = 'b'.repeat(64)

function invitationRecord(overrides: Partial<InvitationRecord> = {}): InvitationRecord {
  return {
    id: '6b044f9d56a44767c7079d01',
    tokenHash: TOKEN_HASH,
    email: EMAIL,
    invitedById: ADMIN_ID,
    expiresAt: EXPIRES_AT,
    usedAt: null,
    createdAt: NOW,
    ...overrides,
  }
}

// Every dependency succeeds by default: a new address, one older link replaced.
// Each test breaks only the one it is about.
function makeDeps() {
  return {
    repository: {
      hasUserWithEmail: vi.fn<InvitationsRepository['hasUserWithEmail']>().mockResolvedValue(false),
      deleteUnusedByEmail: vi
        .fn<InvitationsRepository['deleteUnusedByEmail']>()
        .mockResolvedValue(1),
      create: vi.fn<InvitationsRepository['create']>().mockResolvedValue(invitationRecord()),
      findAll: vi.fn<InvitationsRepository['findAll']>().mockResolvedValue([]),
    },
    generateToken: vi.fn<InvitationsServiceDeps['generateToken']>().mockReturnValue(TOKEN),
    hashToken: vi.fn<InvitationsServiceDeps['hashToken']>().mockReturnValue(TOKEN_HASH),
    now: vi.fn<InvitationsServiceDeps['now']>().mockReturnValue(NOW),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

describe('createInvitation', () => {
  it('stores the hash of a new token for the normalized email, valid 7 days', async () => {
    const deps = makeDeps()

    const result = await createInvitationsService(deps).createInvitation({
      email: '  Mamie@Example.FR ',
      invitedById: ADMIN_ID,
    })

    expect(deps.repository.hasUserWithEmail).toHaveBeenCalledWith(EMAIL)
    expect(deps.repository.deleteUnusedByEmail).toHaveBeenCalledWith(EMAIL)
    expect(deps.hashToken).toHaveBeenCalledWith(TOKEN)
    expect(deps.repository.create).toHaveBeenCalledWith({
      tokenHash: TOKEN_HASH,
      email: EMAIL,
      invitedById: ADMIN_ID,
      expiresAt: EXPIRES_AT,
    })
    expect(result).toEqual({
      invitation: {
        id: '6b044f9d56a44767c7079d01',
        email: EMAIL,
        status: 'pending',
        createdAt: NOW.toISOString(),
        expiresAt: EXPIRES_AT.toISOString(),
      },
      token: TOKEN,
    })
  })

  it.each([
    ['a number', 42],
    ['an empty string', ''],
    ['blanks only', '   '],
    ['no @', 'pas-un-email'],
    ['a space inside', 'a b@c.d'],
  ])('rejects %s with EMAIL_INVALID and writes nothing', async (_label, email) => {
    const deps = makeDeps()

    await expect(
      createInvitationsService(deps).createInvitation({ email, invitedById: ADMIN_ID }),
    ).rejects.toMatchObject({ code: 'EMAIL_INVALID' })
    expect(deps.repository.deleteUnusedByEmail).not.toHaveBeenCalled()
    expect(deps.repository.create).not.toHaveBeenCalled()
  })

  it('rejects an email that already has an account before touching the invitations', async () => {
    const deps = makeDeps()
    deps.repository.hasUserWithEmail.mockResolvedValue(true)

    await expect(
      createInvitationsService(deps).createInvitation({ email: EMAIL, invitedById: ADMIN_ID }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_EXISTS' })
    expect(deps.repository.deleteUnusedByEmail).not.toHaveBeenCalled()
    expect(deps.repository.create).not.toHaveBeenCalled()
  })

  it('logs ids and the replaced count, never the email or the token', async () => {
    const deps = makeDeps()

    await createInvitationsService(deps).createInvitation({ email: EMAIL, invitedById: ADMIN_ID })

    expect(deps.logger.info).toHaveBeenCalledWith('invitation.created', {
      invitationId: '6b044f9d56a44767c7079d01',
      userId: ADMIN_ID,
      replacedCount: 1,
    })
    const logged = JSON.stringify(deps.logger.info.mock.calls)
    expect(logged).not.toContain(EMAIL)
    expect(logged).not.toContain(TOKEN)
  })
})

describe('listInvitations', () => {
  it('marks a used invitation used, even past its end', async () => {
    const deps = makeDeps()
    const usedAt = new Date('2026-11-20T10:00:00Z')
    deps.repository.findAll.mockResolvedValue([invitationRecord({ usedAt, expiresAt: NOW })])

    const [invitation] = await createInvitationsService(deps).listInvitations()

    expect(invitation.status).toBe('used')
  })

  it('marks an unused invitation expired once its end is reached', async () => {
    const deps = makeDeps()
    deps.repository.findAll.mockResolvedValue([invitationRecord({ expiresAt: NOW })])

    const [invitation] = await createInvitationsService(deps).listInvitations()

    expect(invitation.status).toBe('expired')
  })

  it('marks an unused invitation before its end pending, without its token hash', async () => {
    const deps = makeDeps()
    deps.repository.findAll.mockResolvedValue([invitationRecord()])

    const invitations = await createInvitationsService(deps).listInvitations()

    expect(invitations).toEqual([
      {
        id: '6b044f9d56a44767c7079d01',
        email: EMAIL,
        status: 'pending',
        createdAt: NOW.toISOString(),
        expiresAt: EXPIRES_AT.toISOString(),
      },
    ])
  })
})
```

Apply to `server/src/errors/error-handler.test.ts`:

```diff
--- a/server/src/errors/error-handler.test.ts
+++ b/server/src/errors/error-handler.test.ts
@@ -39,6 +39,13 @@ describe('toErrorResponse', () => {
     })
   })
 
+  it('answers an invitation for an address that has an account with 409', () => {
+    expect(toErrorResponse(new AppError('ACCOUNT_EXISTS'))).toEqual({
+      status: 409,
+      body: { error: 'ACCOUNT_EXISTS' },
+    })
+  })
+
   it('maps a file over the size limit to PHOTO_TOO_LARGE', () => {
     expect(toErrorResponse(new multer.MulterError('LIMIT_FILE_SIZE'))).toEqual({
       status: 413,
@@ -61,6 +68,13 @@ describe('toErrorResponse', () => {
     expect(toErrorResponse(parseError)).toEqual({ status: 400, body: { error: 'BODY_INVALID' } })
   })
 
+  it('answers an invalid invitation email with 400', () => {
+    expect(toErrorResponse(new AppError('EMAIL_INVALID'))).toEqual({
+      status: 400,
+      body: { error: 'EMAIL_INVALID' },
+    })
+  })
+
   it('answers an invalid query string with 400', () => {
     expect(toErrorResponse(new AppError('QUERY_INVALID'))).toEqual({
       status: 400,
```

- [ ] **Step 3: Run them to verify they fail**

Run: `pnpm test`
Expected: FAIL: `invitations.service.test.ts` cannot resolve `./invitations.service.js`, and the two new `error-handler.test.ts` cases get `status: undefined`. The other files pass.

- [ ] **Step 4: Types and error codes, server and client**

Apply to `server/src/types.ts`, `server/src/errors/error-handler.ts` and `client/src/api.ts`:

```diff
--- a/client/src/api.ts
+++ b/client/src/api.ts
@@ -1,6 +1,7 @@
 // Copy of server/src/types.ts, see why there. Keep both in sync.
 export type ApiErrorCode =
   | 'PHOTO_MISSING'
+  | 'EMAIL_INVALID'
   | 'UPLOAD_INVALID'
   | 'BODY_INVALID'
   | 'QUERY_INVALID'
@@ -10,6 +11,7 @@ export type ApiErrorCode =
   | 'ROUTE_NOT_FOUND'
   | 'PHOTO_NOT_FOUND'
   | 'PHOTO_DUPLICATE'
+  | 'ACCOUNT_EXISTS'
   | 'PHOTO_TOO_LARGE'
   | 'FORMAT_UNSUPPORTED'
   | 'IMAGE_UNREADABLE'
@@ -17,6 +19,7 @@ export type ApiErrorCode =
 
 const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
   PHOTO_MISSING: 'Prenez ou choisissez une photo.',
+  EMAIL_INVALID: 'Adresse e-mail invalide.',
   UPLOAD_INVALID: 'Envoi invalide : une seule photo à la fois.',
   BODY_INVALID: 'Requête invalide. Rechargez la page et réessayez.',
   QUERY_INVALID: 'Requête invalide. Rechargez la page et réessayez.',
@@ -26,6 +29,7 @@ const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
   ROUTE_NOT_FOUND: "Cette adresse n'existe pas sur le serveur.",
   PHOTO_NOT_FOUND: 'Cette photo a déjà été supprimée.',
   PHOTO_DUPLICATE: 'Cette photo est déjà dans votre bibliothèque.',
+  ACCOUNT_EXISTS: 'Un compte existe déjà pour cette adresse e-mail.',
   PHOTO_TOO_LARGE: 'La photo est trop lourde (10 Mo maximum).',
   FORMAT_UNSUPPORTED: 'Format non pris en charge : JPEG, PNG ou WebP uniquement.',
   IMAGE_UNREADABLE: "Ce fichier n'est pas une image lisible.",
--- a/server/src/errors/error-handler.ts
+++ b/server/src/errors/error-handler.ts
@@ -6,6 +6,7 @@ import { AppError } from './app-error.js'
 
 const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
   PHOTO_MISSING: 400,
+  EMAIL_INVALID: 400,
   UPLOAD_INVALID: 400,
   BODY_INVALID: 400,
   QUERY_INVALID: 400,
@@ -15,6 +16,7 @@ const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
   ROUTE_NOT_FOUND: 404,
   PHOTO_NOT_FOUND: 404,
   PHOTO_DUPLICATE: 409,
+  ACCOUNT_EXISTS: 409,
   PHOTO_TOO_LARGE: 413,
   FORMAT_UNSUPPORTED: 415,
   IMAGE_UNREADABLE: 422,
--- a/server/src/types.ts
+++ b/server/src/types.ts
@@ -3,6 +3,7 @@
 
 export type ApiErrorCode =
   | 'PHOTO_MISSING'
+  | 'EMAIL_INVALID'
   | 'UPLOAD_INVALID'
   | 'BODY_INVALID'
   | 'QUERY_INVALID'
@@ -12,6 +13,7 @@ export type ApiErrorCode =
   | 'ROUTE_NOT_FOUND'
   | 'PHOTO_NOT_FOUND'
   | 'PHOTO_DUPLICATE'
+  | 'ACCOUNT_EXISTS'
   | 'PHOTO_TOO_LARGE'
   | 'FORMAT_UNSUPPORTED'
   | 'IMAGE_UNREADABLE'
@@ -29,6 +31,23 @@ export type PublicUser = {
   role: UserRole
 }
 
+export type InvitationStatus = 'pending' | 'used' | 'expired'
+
+// createdAt and expiresAt are ISO 8601 strings; the token's hash never leaves the server.
+export type Invitation = {
+  id: string
+  email: string
+  status: InvitationStatus
+  createdAt: string
+  expiresAt: string
+}
+
+// The raw token, sent once at creation: the admin's page builds the link from it.
+export type CreatedInvitation = {
+  invitation: Invitation
+  token: string
+}
+
 // createdAt is an ISO 8601 string: JSON has no dates.
 export type Photo = {
   id: string
```

- [ ] **Step 5: Repository**

Create `server/src/features/invitations/invitations.repository.ts`:

```ts
import type { Invitation, PrismaClient } from '@prisma/client'

export type InvitationRecord = Invitation

export type NewInvitation = {
  tokenHash: string
  email: string
  invitedById: string
  expiresAt: Date
}

export type InvitationsRepository = {
  hasUserWithEmail: (email: string) => Promise<boolean>
  // Pending or expired: a used invitation stays, it records a sign-up.
  deleteUnusedByEmail: (email: string) => Promise<number>
  create: (invitation: NewInvitation) => Promise<InvitationRecord>
  findAll: () => Promise<InvitationRecord[]>
}

export function createInvitationsRepository(prisma: PrismaClient): InvitationsRepository {
  return {
    hasUserWithEmail: async (email) => (await prisma.user.count({ where: { email } })) > 0,
    deleteUnusedByEmail: async (email) => {
      const { count } = await prisma.invitation.deleteMany({ where: { email, usedAt: null } })
      return count
    },
    // usedAt written on purpose: on MongoDB Prisma leaves an omitted optional field out of
    // the document, and the `usedAt: null` filter does not match a missing field.
    create: (invitation) => prisma.invitation.create({ data: { ...invitation, usedAt: null } }),
    // By id: an ObjectId starts with its creation time, so this is newest first.
    findAll: () => prisma.invitation.findMany({ orderBy: { id: 'desc' } }),
  }
}
```

- [ ] **Step 6: Service**

Create `server/src/features/invitations/invitations.service.ts`:

```ts
import { AppError } from '../../errors/app-error.js'
import type { Logger } from '../../lib/logger.js'
import type { CreatedInvitation, Invitation, InvitationStatus } from '../../types.js'
import type { InvitationRecord, InvitationsRepository } from './invitations.repository.js'

const DAY_MS = 24 * 60 * 60 * 1000
export const INVITATION_DURATION_MS = 7 * DAY_MS
// Loose on purpose: the admin types the address himself; this catches a missing @ or a
// stray space without rejecting a real address.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/

// email comes straight from the JSON body: validated here, at the boundary.
export type NewInvitationInput = { email: unknown; invitedById: string }

export type InvitationsServiceDeps = {
  repository: InvitationsRepository
  generateToken: () => string
  hashToken: (token: string) => string
  now: () => Date
  logger: Logger
}

export type InvitationsService = {
  createInvitation: (input: NewInvitationInput) => Promise<CreatedInvitation>
  listInvitations: () => Promise<Invitation[]>
}

// Same normalization as login: the account created from the invitation logs in with it.
function parseEmail(email: unknown): string {
  if (typeof email !== 'string') {
    throw new AppError('EMAIL_INVALID')
  }
  const normalizedEmail = email.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new AppError('EMAIL_INVALID')
  }
  return normalizedEmail
}

// Used comes first: the admin learns the person signed up, even after the 7 days.
function statusOf({ usedAt, expiresAt }: InvitationRecord, now: Date): InvitationStatus {
  if (usedAt !== null) {
    return 'used'
  }
  return expiresAt <= now ? 'expired' : 'pending'
}

// tokenHash and invitedById stay on the server.
function toInvitation(record: InvitationRecord, now: Date): Invitation {
  return {
    id: record.id,
    email: record.email,
    status: statusOf(record, now),
    createdAt: record.createdAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
  }
}

async function createInvitation(
  { repository, generateToken, hashToken, now, logger }: InvitationsServiceDeps,
  { email, invitedById }: NewInvitationInput,
): Promise<CreatedInvitation> {
  const normalizedEmail = parseEmail(email)
  // An admin route: telling him which addresses have an account leaks nothing to a stranger.
  if (await repository.hasUserWithEmail(normalizedEmail)) {
    throw new AppError('ACCOUNT_EXISTS')
  }
  // A new link replaces any unused one: "I lost the link" needs no revoke button.
  const replacedCount = await repository.deleteUnusedByEmail(normalizedEmail)
  const token = generateToken()
  const createdAt = now()
  const record = await repository.create({
    tokenHash: hashToken(token),
    email: normalizedEmail,
    invitedById,
    expiresAt: new Date(createdAt.getTime() + INVITATION_DURATION_MS),
  })
  logger.info('invitation.created', { invitationId: record.id, userId: invitedById, replacedCount })
  return { invitation: toInvitation(record, createdAt), token }
}

async function listInvitations({ repository, now }: InvitationsServiceDeps): Promise<Invitation[]> {
  const records = await repository.findAll()
  const listedAt = now()
  return records.map((record) => toInvitation(record, listedAt))
}

export function createInvitationsService(deps: InvitationsServiceDeps): InvitationsService {
  return {
    createInvitation: (input) => createInvitation(deps, input),
    listInvitations: () => listInvitations(deps),
  }
}
```

- [ ] **Step 7: Gates**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  104 passed (104)` (91 + 11 service tests + 2 error-handler cases). Bruno unchanged (32 requests, 70 assertions): no route yet, so no Bruno run.

- [ ] **Step 8: Commit**

```bash
git add server/src/features/invitations server/src/types.ts server/src/errors client/src/api.ts
git commit -F <message-file>
```

Message: `feat(server): create and list invitations in the service`, body: `An admin's invitation is valid 7 days. The email is trimmed and lowercased; an invalid one answers EMAIL_INVALID, an email that already has an account ACCOUNT_EXISTS. A new invitation replaces every unused one for the same email. The list computes each status (pending, used, expired) and never exposes the token hash.` + the attribution lines.

---

### Task 4: Invitation routes for the admin, and the PR B docs (PR B, `feat/invitations-create`)

**Files:**
- Create: `server/src/features/invitations/invitations.controller.ts`, `invitations.routes.ts`
- Modify: `server/src/app.ts`
- Create: `server/bruno/invitations/folder.bru`, `server/bruno/invitations/create/{folder,01-nominal,02-nominal-remplacement,03-edge-email-invalide,04-edge-compte-existant,05-edge-membre,06-edge-sans-cookie,07-edge-json-malforme}.bru`, `server/bruno/invitations/list/{folder,01-nominal,02-edge-membre,03-edge-sans-cookie}.bru`
- Modify: `server/bruno/collection.bru`, `server/bruno/auth/folder.bru`, `server/bruno/auth/logout/04-nominal-reconnexion.bru` (docs)
- Modify: `ARCHITECTURE.md`

**Interfaces:**
- Consumes: `InvitationsService` (Task 3), `currentUser`, `requireRole` (Task 2), `createRequireAuth`.
- Produces (Task 6 extends both):
  ```ts
  // invitations.controller.ts
  export type InvitationsController = { create: (req, res) => Promise<void>; list: (req, res) => Promise<void> }
  export function createInvitationsController(service: InvitationsService): InvitationsController
  // invitations.routes.ts
  export function createInvitationsRouter(controller: InvitationsController, requireAuth: RequestHandler, requireAdmin: RequestHandler): Router
  ```
  Bruno runtime variables: `inviteEmail`, `inviteEmailTyped`, `inviteToken`, `replacedInviteToken`.

- [ ] **Step 1: Write the Bruno requests (the failing tests)**

Create `server/bruno/invitations/folder.bru`:

```
meta {
  name: invitations
  seq: 2
}

docs {
  Lancé juste après `auth/` (`seq: 2`), qui range le cookie de l'admin dans
  `adminCookie`. Une requête admin l'envoie à la place de celui du membre,
  dans son script (`req.setHeader('Cookie', bru.getVar('adminCookie'))`) ;
  le membre reste le compte par défaut et reçoit 403 `FORBIDDEN`.

  Une invitation renvoyée par l'API : `{ id, email, status, createdAt,
  expiresAt }` (`status` : `pending`, `used` ou `expired` ; dates en
  ISO 8601), jamais le hash du jeton. Chaque lancement invite une adresse
  neuve (`invite-<horodatage>@familyframe.test`, variable `inviteEmail`) :
  pas de remise à zéro entre deux lancements. L'expiration (7 jours) n'est
  pas testable ici, faute de contrôle de l'horloge : les tests unitaires la
  couvrent.
}
```

Create `server/bruno/invitations/create/folder.bru`:

```
meta {
  name: create
  seq: 1
}

docs {
  `POST /api/invitations`, JSON `{ email }`, admin seulement → 201
  `{ invitation, token }`. Le jeton brut n'est renvoyé qu'ici, une fois : le
  client en fait le lien `/invite/<jeton>`. Une nouvelle invitation pour la
  même adresse remplace celle qui n'a pas servi (l'ancien lien répond
  ensuite 404).
}
```

Create `server/bruno/invitations/create/01-nominal.bru`:

```
meta {
  name: Nominal - création d'une invitation
  type: http
  seq: 1
}

post {
  url: {{baseUrl}}/api/invitations
  body: json
  auth: none
}

body:json {
  {
    "email": "{{inviteEmailTyped}}"
  }
}

script:pre-request {
  if (!bru.getVar('adminCookie')) {
    throw new Error('adminCookie absent : lancer toute la collection, auth/login/05 doit passer')
  }
  req.setHeader('Cookie', bru.getVar('adminCookie'))
  // A fresh address per run: no reset needed between two runs.
  const inviteEmail = `invite-${Date.now()}@familyframe.test`
  bru.setVar('inviteEmail', inviteEmail)
  // Typed carelessly: the server must trim and lowercase it.
  bru.setVar('inviteEmailTyped', `  ${inviteEmail.toUpperCase()} `)
}

assert {
  res.status: eq 201
  res.body.invitation.email: eq {{inviteEmail}}
  res.body.invitation.status: eq pending
  res.body.invitation.tokenHash: isUndefined
}

script:post-response {
  const { invitation, token } = res.body
  test('un jeton hexadécimal de 64 caractères', () => {
    expect(token).to.match(/^[0-9a-f]{64}$/)
  })
  test('valable 7 jours après sa création', () => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
    // createdAt comes from the database default, expiresAt from the service clock.
    const lifetimeMs = new Date(invitation.expiresAt) - new Date(invitation.createdAt)
    expect(Math.abs(lifetimeMs - SEVEN_DAYS_MS)).to.be.below(60 * 1000)
  })
  if (token) {
    bru.setVar('inviteToken', token)
  }
}

docs {
  NOMINAL → 201 `{ invitation, token }`. L'adresse part en majuscules,
  entourée d'espaces : elle revient en minuscules, sans espaces. Le jeton va
  dans `inviteToken` pour `accept/`. `expiresAt` tombe 7 jours après
  `createdAt`, à une minute près : les deux dates ne viennent pas de la même
  horloge.
}
```

Create `server/bruno/invitations/create/02-nominal-remplacement.bru`:

```
meta {
  name: Nominal - nouvelle invitation pour la même adresse
  type: http
  seq: 2
}

post {
  url: {{baseUrl}}/api/invitations
  body: json
  auth: none
}

body:json {
  {
    "email": "{{inviteEmail}}"
  }
}

script:pre-request {
  if (!bru.getVar('adminCookie') || !bru.getVar('inviteToken')) {
    throw new Error('adminCookie ou inviteToken absent : lancer toute la collection, create/01 doit passer')
  }
  req.setHeader('Cookie', bru.getVar('adminCookie'))
}

assert {
  res.status: eq 201
  res.body.invitation.status: eq pending
}

script:post-response {
  const previousToken = bru.getVar('inviteToken')
  test('un nouveau jeton, différent du premier', () => {
    expect(res.body.token).to.match(/^[0-9a-f]{64}$/)
    expect(res.body.token).to.not.equal(previousToken)
  })
  // accept/01 checks that the replaced link no longer works.
  bru.setVar('replacedInviteToken', previousToken)
  bru.setVar('inviteToken', res.body.token)
}

docs {
  NOMINAL → 201 : la même adresse reçoit un nouveau lien, qui remplace le
  premier (« j'ai perdu le lien »). L'ancien jeton passe dans
  `replacedInviteToken`, le nouveau dans `inviteToken`.
}
```

Create `server/bruno/invitations/create/03-edge-email-invalide.bru`:

```
meta {
  name: Edge - e-mail invalide
  type: http
  seq: 3
}

post {
  url: {{baseUrl}}/api/invitations
  body: json
  auth: none
}

body:json {
  {
    "email": "pas-un-email"
  }
}

script:pre-request {
  if (!bru.getVar('adminCookie')) {
    throw new Error('adminCookie absent : lancer toute la collection, auth/login/05 doit passer')
  }
  req.setHeader('Cookie', bru.getVar('adminCookie'))
}

assert {
  res.status: eq 400
  res.body.error: eq EMAIL_INVALID
}

docs {
  EDGE → 400 EMAIL_INVALID : une adresse sans `@`. Le contrôle est souple :
  il attrape une faute de frappe sans refuser une vraie adresse.
}
```

Create `server/bruno/invitations/create/04-edge-compte-existant.bru`:

```
meta {
  name: Edge - adresse qui a déjà un compte
  type: http
  seq: 4
}

post {
  url: {{baseUrl}}/api/invitations
  body: json
  auth: none
}

body:json {
  {
    "email": "{{memberEmail}}"
  }
}

script:pre-request {
  if (!bru.getVar('adminCookie')) {
    throw new Error('adminCookie absent : lancer toute la collection, auth/login/05 doit passer')
  }
  req.setHeader('Cookie', bru.getVar('adminCookie'))
}

assert {
  res.status: eq 409
  res.body.error: eq ACCOUNT_EXISTS
}

docs {
  EDGE → 409 ACCOUNT_EXISTS : le membre de test a déjà un compte, il se
  connecte sur `/login`. Route admin : dire qu'une adresse a un compte ne
  renseigne aucun inconnu.
}
```

Create `server/bruno/invitations/create/05-edge-membre.bru`:

```
meta {
  name: Edge - un membre crée une invitation
  type: http
  seq: 5
}

post {
  url: {{baseUrl}}/api/invitations
  body: json
  auth: none
}

body:json {
  {
    "email": "refuse@familyframe.test"
  }
}

assert {
  res.status: eq 403
  res.body.error: eq FORBIDDEN
}

docs {
  EDGE → 403 FORBIDDEN : le cookie de la collection est celui du membre,
  connecté mais pas admin (`requireRole('admin')`, monté après
  `requireAuth`).
}
```

Create `server/bruno/invitations/create/06-edge-sans-cookie.bru`:

```
meta {
  name: Edge - sans cookie de session
  type: http
  seq: 6
}

post {
  url: {{baseUrl}}/api/invitations
  body: json
  auth: none
}

body:json {
  {
    "email": "refuse@familyframe.test"
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
  EDGE → 401 UNAUTHENTICATED : sans session, la réponse reste 401, pas 403.
}
```

Create `server/bruno/invitations/create/07-edge-json-malforme.bru`:

```
meta {
  name: Edge - JSON malformé
  type: http
  seq: 7
}

post {
  url: {{baseUrl}}/api/invitations
  body: text
  auth: none
}

headers {
  Content-Type: application/json
}

body:text {
  {"email": "refuse@familyframe.test"
}

script:pre-request {
  if (!bru.getVar('adminCookie')) {
    throw new Error('adminCookie absent : lancer toute la collection, auth/login/05 doit passer')
  }
  req.setHeader('Cookie', bru.getVar('adminCookie'))
}

assert {
  res.status: eq 400
  res.body.error: eq BODY_INVALID
}

docs {
  EDGE → 400 BODY_INVALID : le routeur des invitations monte son propre
  `express.json()`, qui refuse un corps JSON illisible.
}
```

Create `server/bruno/invitations/list/folder.bru`:

```
meta {
  name: list
  seq: 2
}

docs {
  `GET /api/invitations`, admin seulement → 200 `{ invitations }` : toutes
  les invitations, la plus récente en premier, chacune avec son `status`
  calculé. Pas de pagination : le remplacement garde environ une ligne par
  adresse invitée.
}
```

Create `server/bruno/invitations/list/01-nominal.bru`:

```
meta {
  name: Nominal - liste des invitations
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/api/invitations
  body: none
  auth: none
}

script:pre-request {
  if (!bru.getVar('adminCookie') || !bru.getVar('inviteEmail')) {
    throw new Error('adminCookie ou inviteEmail absent : lancer toute la collection, create/01 doit passer')
  }
  req.setHeader('Cookie', bru.getVar('adminCookie'))
}

assert {
  res.status: eq 200
  res.body.invitations: isArray
}

script:post-response {
  const { invitations } = res.body
  const invited = invitations.filter(({ email }) => email === bru.getVar('inviteEmail'))
  test('une seule invitation pour l\'adresse : la seconde a remplacé la première', () => {
    expect(invited).to.have.length(1)
    expect(invited[0].status).to.equal('pending')
  })
  test('aucune invitation ne porte le hash du jeton', () => {
    for (const invitation of invitations) {
      expect(invitation).to.not.have.property('tokenHash')
    }
  })
}

docs {
  NOMINAL → 200 `{ invitations }`. L'adresse de `create/01` n'apparaît
  qu'une fois, en attente : `create/02` a supprimé la première invitation en
  la remplaçant.
}
```

Create `server/bruno/invitations/list/02-edge-membre.bru`:

```
meta {
  name: Edge - un membre liste les invitations
  type: http
  seq: 2
}

get {
  url: {{baseUrl}}/api/invitations
  body: none
  auth: none
}

assert {
  res.status: eq 403
  res.body.error: eq FORBIDDEN
}

docs {
  EDGE → 403 FORBIDDEN : le cookie de la collection est celui du membre.
}
```

Create `server/bruno/invitations/list/03-edge-sans-cookie.bru`:

```
meta {
  name: Edge - sans cookie de session
  type: http
  seq: 3
}

get {
  url: {{baseUrl}}/api/invitations
  body: none
  auth: none
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
  EDGE → 401 UNAUTHENTICATED : sans session, la réponse reste 401, pas 403.
}
```

Apply the docs changes to `server/bruno/collection.bru`, `server/bruno/auth/folder.bru` and `server/bruno/auth/logout/04-nominal-reconnexion.bru`:

```diff
--- a/server/bruno/auth/folder.bru
+++ b/server/bruno/auth/folder.bru
@@ -12,7 +12,8 @@ docs {
 
   Identifiants : ceux des deux comptes créés par `pnpm db:seed`, dans
   `environments/Local.bru`. Le membre est le compte de toutes les requêtes ;
-  l'admin sert à vérifier qu'un compte ne touche pas aux photos d'un autre.
+  l'admin crée les invitations (`invitations/`) et sert à vérifier qu'un
+  compte ne touche pas aux photos d'un autre.
   Un utilisateur renvoyé par l'API vaut `{ id, email, displayName, role }`,
   jamais le hash du mot de passe.
 }
--- a/server/bruno/auth/logout/04-nominal-reconnexion.bru
+++ b/server/bruno/auth/logout/04-nominal-reconnexion.bru
@@ -34,5 +34,5 @@ script:post-response {
 
 docs {
   NOMINAL → 200 : nouvelle session, rangée dans `sessionCookie` pour les
-  dossiers `health`, `not-found` et `photos`.
+  dossiers `invitations`, `health`, `not-found` et `photos`.
 }
--- a/server/bruno/collection.bru
+++ b/server/bruno/collection.bru
@@ -25,10 +25,11 @@ docs {
   Les envois nominaux publient de vraies photos (Cloudinary + MongoDB) dans
   la bibliothèque du membre de test : elles apparaissent sur son cadre, et
   `photos/delete` les supprime en fin de lancement. Le second compte (l'admin,
-  `auth/login/05`, cookie dans la variable `adminCookie`) vérifie qu'un compte
-  ne touche pas aux photos d'un autre. Si un lancement s'arrête avant
-  `photos/delete`, ses photos restent : le suivant répond 409
-  `PHOTO_DUPLICATE` à `create/01` ; `pnpm db:seed` remet la base à zéro.
+  `auth/login/05`, cookie dans la variable `adminCookie`) crée les
+  invitations et vérifie qu'un compte ne touche pas aux photos d'un autre. Si
+  un lancement s'arrête avant `photos/delete`, ses photos restent : le
+  suivant répond 409 `PHOTO_DUPLICATE` à `create/01` ; `pnpm db:seed` remet
+  la base à zéro.
 
   Chemins `@file()` relatifs à la racine de la collection (`server/bruno/`).
 }
```

- [ ] **Step 2: Run Bruno against the current code to verify it fails**

From `server/`, in its own background command: `PORT=3002 npx tsx --env-file-if-exists=.env src/server.ts`. Wait for `server.started`.

From `server/bruno/`: the Bruno gate command.
Expected: 42 requests, 10 failed: every `invitations/create/*` and `invitations/list/*` request (`404 ROUTE_NOT_FOUND`: no route yet; nothing is written). The 32 others pass.

Stop the test API.

- [ ] **Step 3: Controller and routes**

Create `server/src/features/invitations/invitations.controller.ts`:

```ts
import type { Request, Response } from 'express'
import { currentUser } from '../auth/auth.guard.js'
import type { InvitationsService } from './invitations.service.js'

export type InvitationsController = {
  create: (req: Request, res: Response) => Promise<void>
  list: (req: Request, res: Response) => Promise<void>
}

export function createInvitationsController(service: InvitationsService): InvitationsController {
  return {
    async create(req, res) {
      const created = await service.createInvitation({
        email: req.body?.email,
        invitedById: currentUser(req).id,
      })
      res.status(201).json(created)
    },

    async list(_req, res) {
      const invitations = await service.listInvitations()
      res.json({ invitations })
    },
  }
}
```

Create `server/src/features/invitations/invitations.routes.ts`:

```ts
import express, { type RequestHandler, Router } from 'express'
import type { InvitationsController } from './invitations.controller.js'

export function createInvitationsRouter(
  controller: InvitationsController,
  requireAuth: RequestHandler,
  requireAdmin: RequestHandler,
): Router {
  const router = Router()
  // A JSON route brings its own parser (see the logging spec).
  router.use(express.json())
  router.get('/', requireAuth, requireAdmin, controller.list)
  router.post('/', requireAuth, requireAdmin, controller.create)
  return router
}
```

- [ ] **Step 4: Mount the router**

Apply to `server/src/app.ts`:

```diff
--- a/server/src/app.ts
+++ b/server/src/app.ts
@@ -1,13 +1,18 @@
 import cors from 'cors'
-import express, { type Express, type Router } from 'express'
+import express, { type Express, type RequestHandler, type Router } from 'express'
 import { config } from './config.js'
 import { errorHandler } from './errors/error-handler.js'
 import { notFound } from './errors/not-found.js'
 import { createAuthController } from './features/auth/auth.controller.js'
+import { requireRole } from './features/auth/auth.guard.js'
 import { createRequireAuth } from './features/auth/auth.middleware.js'
 import { createAuthRepository } from './features/auth/auth.repository.js'
 import { createAuthRouter } from './features/auth/auth.routes.js'
 import { type AuthService, createAuthService } from './features/auth/auth.service.js'
+import { createInvitationsController } from './features/invitations/invitations.controller.js'
+import { createInvitationsRepository } from './features/invitations/invitations.repository.js'
+import { createInvitationsRouter } from './features/invitations/invitations.routes.js'
+import { createInvitationsService } from './features/invitations/invitations.service.js'
 import { createPhotosController } from './features/photos/photos.controller.js'
 import { createPhotosRepository } from './features/photos/photos.repository.js'
 import { createPhotosRouter } from './features/photos/photos.routes.js'
@@ -44,8 +49,23 @@ function assemblePhotosRouter(io: SocketServer): Router {
   return createPhotosRouter(createPhotosController(service, io))
 }
 
+function assembleInvitationsRouter(
+  requireAuth: RequestHandler,
+  requireAdmin: RequestHandler,
+): Router {
+  const service = createInvitationsService({
+    repository: createInvitationsRepository(prisma),
+    generateToken,
+    hashToken,
+    now: () => new Date(),
+    logger,
+  })
+  return createInvitationsRouter(createInvitationsController(service), requireAuth, requireAdmin)
+}
+
 export function createApp(io: SocketServer, authService: AuthService): Express {
   const requireAuth = createRequireAuth(authService)
+  const requireAdmin = requireRole('admin')
   const app = express()
 
   // First, so every request is timed and logged, 404s included.
@@ -58,6 +78,7 @@ export function createApp(io: SocketServer, authService: AuthService): Express {
 
   app.use('/api/auth', createAuthRouter(createAuthController(authService), requireAuth))
   app.use('/api/photos', requireAuth, assemblePhotosRouter(io))
+  app.use('/api/invitations', assembleInvitationsRouter(requireAuth, requireAdmin))
 
   app.use(notFound)
   app.use(errorHandler)
```

- [ ] **Step 5: Run Bruno against the new code**

Start the test API again (own background command, from `server/`). Wait for `server.started`.

From `server/bruno/`: the Bruno gate command.
Expected: status PASS, 42 requests, 92 assertions, 22 `test()` calls, all passed. Stop the test API.

Each run invites a fresh address (`invite-<Date.now()>@familyframe.test`) and leaves one pending invitation behind: no reset is needed between runs.

- [ ] **Step 6: Gates**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  104 passed (104)`.

- [ ] **Step 7: Commit**

```bash
git add server/src/features/invitations server/src/app.ts server/bruno
git commit -F <message-file>
```

Message: `feat(server): expose the invitation routes to the admin`, body: `POST /api/invitations answers 201 with the invitation and its raw token, sent this once; GET /api/invitations lists every invitation, newest first. Both sit behind requireAuth and requireAdmin: a member gets 403, no session 401. The router brings its own JSON parser.` + the attribution lines.

- [ ] **Step 8: ARCHITECTURE**

In `ARCHITECTURE.md`:

1. In the API table, add after the `GET /api/auth/me` row (let `pnpm format` realign the table if needed):
   ```markdown
   | `POST /api/invitations` | JSON `{ email }` → `201 { invitation, token }` : réservé à l'admin ; le jeton brut n'est envoyé qu'une fois, le client en fait le lien |
   | `GET /api/invitations`  | `200 { invitations }` : réservé à l'admin ; toutes les invitations, la plus récente en premier                                        |
   ```
2. Replace the paragraph starting with `Toutes les routes \`/api/photos\` et \`GET /api/auth/me\` demandent une session` with:
   ```markdown
   Toutes les routes `/api/photos`, `GET /api/auth/me` et les routes admin de `/api/invitations` demandent une session ; sans elle : `401 UNAUTHENTICATED`. Les routes admin répondent `403 FORBIDDEN` à un membre. Un `user` vaut `{ id, email, displayName, role }` (`role` : `member` ou `admin`), jamais le hash du mot de passe.

   Une `Invitation` vaut `{ id, email, status, createdAt, expiresAt }` (dates en ISO 8601) ; `status` vaut `pending` (en attente), `used` (utilisée) ou `expired` (expirée), calculé à chaque lecture. Le hash du jeton et l'admin qui l'a créée restent côté serveur.
   ```
3. In the error table, add after the `BODY_INVALID` row:
   ```markdown
   | e-mail absent ou mal formé (création d'invitation)                       | 400    | `EMAIL_INVALID`       |
   ```
   and after the `PHOTO_DUPLICATE` row:
   ```markdown
   | l'e-mail a déjà un compte (création d'invitation)                        | 409    | `ACCOUNT_EXISTS`      |
   ```
   and replace `corps JSON illisible (routes \`/api/auth\`)` with `corps JSON illisible (routes \`/api/auth\` et \`/api/invitations\`)`.
4. In `## Authentification`, add after the bullet starting with `- **Garde HTTP**`:
   ```markdown
   - **Invitations** : l'admin crée un lien depuis `/admin/invitations`. Le jeton suit la règle des sessions (32 octets aléatoires, `lib/session-token.ts`, seul son SHA-256 en base dans `Invitation.tokenHash`), vaut 7 jours (`INVITATION_DURATION_MS`) et sert une fois (`usedAt`). Le serveur renvoie le jeton brut une seule fois ; le client construit le lien `` `${window.location.origin}/invite/${token}` `` : l'origine que l'admin utilise est celle que la famille atteint, sans variable de configuration en plus. Une nouvelle invitation pour le même e-mail **remplace** les précédentes non utilisées (supprimées) : « j'ai perdu le lien » se règle sans bouton de révocation, et l'ancien lien répond `404 INVITATION_NOT_FOUND`. Le jeton ne passe jamais dans un chemin d'API (`http.request` journalise les chemins) : il voyage dans le corps JSON.
   ```
5. Replace the bullet starting with `- **JSON** : \`express.json()\` n'est monté que sur \`/api/auth\`` with:
   ```markdown
   - **JSON** : `express.json()` n'est monté que sur `/api/auth` et `/api/invitations`, les seules routes qui lisent du JSON ; un corps illisible répond `400 BODY_INVALID`.
   ```
6. In `## Couches du backend`, replace `Une feature par dossier (\`server/src/features/photos/\`, \`server/src/features/auth/\`)` with `Une feature par dossier (\`server/src/features/photos/\`, \`server/src/features/auth/\`, \`server/src/features/invitations/\`)`, and add after the bullet starting with `- \`features/auth/\` suit le même découpage`:
   ```markdown
   - `features/invitations/` suit le même découpage (`invitations.repository.ts`, `invitations.service.ts`, `invitations.controller.ts`, `invitations.routes.ts`). Le service reçoit `repository`, `generateToken`, `hashToken`, `now` et `logger` ; `app.ts` construit `requireAdmin = requireRole('admin')` une fois et le passe au routeur, derrière `requireAuth`.
   ```
7. In the `## Logs` table, add after the `photo.orphaned` row:
   ```markdown
   | `invitation.created`                                        | info                          | service invitations, avec `invitationId`, `userId` (l'admin) et `replacedCount` (invitations remplacées) ; jamais l'e-mail ni le jeton                                      |
   ```
8. In `## Outillage`, append to the Bruno bullet: ` Le dossier \`invitations/\` passe juste après (\`seq: 2\`) : l'admin y crée une invitation pour une adresse neuve à chaque lancement (\`invite-<horodatage>@familyframe.test\`), donc rien à remettre à zéro entre deux lancements.`

- [ ] **Step 9: Check and commit the docs**

Run: `pnpm check` (format with `pnpm exec biome format --write ARCHITECTURE.md` if the hook rejects it).

```bash
git add ARCHITECTURE.md
git commit -F <message-file>
```

Message: `docs: describe the invitation routes` + the attribution lines.

---

## PR C — `feat/invitations-accept`

> **Controller:** before Task 5, run `gh stack add feat/invitations-accept`.

### Task 5: Accept an invitation in the service (PR C, `feat/invitations-accept`)

**Files:**
- Modify: `server/src/features/invitations/invitations.repository.ts`, `invitations.service.ts`
- Test: `server/src/features/invitations/invitations.service.accept.test.ts` (new), `invitations.service.test.ts` (`makeDeps` only), `server/src/errors/error-handler.test.ts`
- Modify: `server/src/types.ts`, `server/src/errors/error-handler.ts`, `client/src/api.ts`, `server/src/app.ts`

**Interfaces:**
- Consumes: Task 3's repository and service, `hashPassword` signature (`lib/password.ts`), `PublicUser`.
- Produces (used by Task 6):
  ```ts
  // invitations.repository.ts, added
  export type UserRecord = User // Prisma's
  export type NewMember = { email: string; displayName: string; passwordHash: string }
  // InvitationsRepository gains:
  findByTokenHash: (tokenHash: string) => Promise<InvitationRecord | null>
  createUser: (member: NewMember) => Promise<UserRecord | null> // null on P2002
  markUsed: (id: string, usedAt: Date) => Promise<void>
  // invitations.service.ts, added
  export const DISPLAY_NAME_MAX_LENGTH = 50
  export const PASSWORD_MIN_LENGTH = 12
  export const PASSWORD_MAX_LENGTH = 128
  export type InvitationAcceptance = { token: unknown; displayName: unknown; password: unknown }
  // InvitationsServiceDeps gains hashPassword; InvitationsService gains:
  acceptInvitation: (acceptance: InvitationAcceptance) => Promise<PublicUser>
  // ApiErrorCode gains DISPLAY_NAME_INVALID, PASSWORD_INVALID (400), INVITATION_NOT_FOUND (404), INVITATION_EXPIRED, INVITATION_USED (410)
  ```

- [ ] **Step 1: Create the branch (controller)**

Run: `gh stack add feat/invitations-accept`
Expected: the new branch is checked out on top of `feat/invitations-create`.

- [ ] **Step 2: Write the failing unit tests**

Create `server/src/features/invitations/invitations.service.accept.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type {
  InvitationRecord,
  InvitationsRepository,
  UserRecord,
} from './invitations.repository.js'
import {
  createInvitationsService,
  type InvitationAcceptance,
  type InvitationsServiceDeps,
} from './invitations.service.js'

const NOW = new Date('2026-11-24T10:00:00Z')
const TOKEN = 'a'.repeat(64)
const TOKEN_HASH = 'b'.repeat(64)
const INVITATION_ID = '6b044f9d56a44767c7079d01'
const EMAIL = 'mamie@example.fr'
const PASSWORD = 'mot-de-passe-de-mamie'
const PASSWORD_HASH = '$argon2id$new-hash'
const NEW_USER: UserRecord = {
  id: '6b044f9d56a44767c7079b09',
  email: EMAIL,
  displayName: 'Mamie',
  passwordHash: PASSWORD_HASH,
  role: 'member',
  createdAt: NOW,
}
const ACCEPTANCE: InvitationAcceptance = { token: TOKEN, displayName: 'Mamie', password: PASSWORD }

function invitationRecord(overrides: Partial<InvitationRecord> = {}): InvitationRecord {
  return {
    id: INVITATION_ID,
    tokenHash: TOKEN_HASH,
    email: EMAIL,
    invitedById: '6b044f9d56a44767c7079b01',
    expiresAt: new Date('2026-11-30T10:00:00Z'),
    usedAt: null,
    createdAt: new Date('2026-11-23T10:00:00Z'),
    ...overrides,
  }
}

// Accepting reads only the last three repository functions: the others stay unused.
// By default a pending invitation and a free address; each test breaks one thing.
function makeDeps() {
  return {
    repository: {
      hasUserWithEmail: vi.fn<InvitationsRepository['hasUserWithEmail']>(),
      deleteUnusedByEmail: vi.fn<InvitationsRepository['deleteUnusedByEmail']>(),
      create: vi.fn<InvitationsRepository['create']>(),
      findAll: vi.fn<InvitationsRepository['findAll']>(),
      findByTokenHash: vi
        .fn<InvitationsRepository['findByTokenHash']>()
        .mockResolvedValue(invitationRecord()),
      createUser: vi.fn<InvitationsRepository['createUser']>().mockResolvedValue(NEW_USER),
      markUsed: vi.fn<InvitationsRepository['markUsed']>().mockResolvedValue(undefined),
    },
    generateToken: vi.fn<InvitationsServiceDeps['generateToken']>(),
    hashToken: vi.fn<InvitationsServiceDeps['hashToken']>().mockReturnValue(TOKEN_HASH),
    hashPassword: vi.fn<InvitationsServiceDeps['hashPassword']>().mockResolvedValue(PASSWORD_HASH),
    now: vi.fn<InvitationsServiceDeps['now']>().mockReturnValue(NOW),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

type Deps = ReturnType<typeof makeDeps>

function accept(deps: Deps, overrides: Partial<InvitationAcceptance> = {}): Promise<unknown> {
  return createInvitationsService(deps).acceptInvitation({ ...ACCEPTANCE, ...overrides })
}

describe('acceptInvitation: the link', () => {
  it.each([
    ['a token that is not a string', 42],
    ['a 63-character token', 'a'.repeat(63)],
  ])('rejects %s without a lookup', async (_label, token) => {
    const deps = makeDeps()

    await expect(accept(deps, { token })).rejects.toMatchObject({ code: 'INVITATION_NOT_FOUND' })
    expect(deps.repository.findByTokenHash).not.toHaveBeenCalled()
  })

  it('rejects a token that matches no invitation', async () => {
    const deps = makeDeps()
    deps.repository.findByTokenHash.mockResolvedValue(null)

    await expect(accept(deps)).rejects.toMatchObject({ code: 'INVITATION_NOT_FOUND' })
    expect(deps.repository.findByTokenHash).toHaveBeenCalledWith(TOKEN_HASH)
  })

  it('rejects a used invitation', async () => {
    const deps = makeDeps()
    deps.repository.findByTokenHash.mockResolvedValue(invitationRecord({ usedAt: NOW }))

    await expect(accept(deps)).rejects.toMatchObject({ code: 'INVITATION_USED' })
  })

  it('rejects an invitation whose end is reached', async () => {
    const deps = makeDeps()
    deps.repository.findByTokenHash.mockResolvedValue(invitationRecord({ expiresAt: NOW }))

    await expect(accept(deps)).rejects.toMatchObject({ code: 'INVITATION_EXPIRED' })
  })

  it('reports a dead link before an invalid name or password', async () => {
    const deps = makeDeps()
    deps.repository.findByTokenHash.mockResolvedValue(invitationRecord({ usedAt: NOW }))

    await expect(accept(deps, { displayName: '', password: 'court' })).rejects.toMatchObject({
      code: 'INVITATION_USED',
    })
  })
})

describe('acceptInvitation: the display name and the password', () => {
  it.each([
    ['blanks only', '  '],
    ['51 characters', 'n'.repeat(51)],
    ['a number', 42],
  ])('rejects a display name made of %s', async (_label, displayName) => {
    const deps = makeDeps()

    await expect(accept(deps, { displayName })).rejects.toMatchObject({
      code: 'DISPLAY_NAME_INVALID',
    })
    expect(deps.repository.createUser).not.toHaveBeenCalled()
  })

  it('stores the display name trimmed', async () => {
    const deps = makeDeps()

    await accept(deps, { displayName: '  Mamie  ' })

    expect(deps.repository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Mamie' }),
    )
  })

  it('accepts a 50-character display name', async () => {
    const deps = makeDeps()

    await accept(deps, { displayName: 'n'.repeat(50) })

    expect(deps.repository.createUser).toHaveBeenCalled()
  })

  it.each([
    ['11 characters', 'p'.repeat(11)],
    ['129 characters', 'p'.repeat(129)],
    ['a number', 42],
  ])('rejects a password of %s', async (_label, password) => {
    const deps = makeDeps()

    await expect(accept(deps, { password })).rejects.toMatchObject({ code: 'PASSWORD_INVALID' })
    expect(deps.hashPassword).not.toHaveBeenCalled()
  })

  it.each([12, 128])('accepts a password of %i characters', async (length) => {
    const deps = makeDeps()

    await accept(deps, { password: 'p'.repeat(length) })

    expect(deps.hashPassword).toHaveBeenCalledWith('p'.repeat(length))
  })

  it('hashes the password as typed, spaces included', async () => {
    const deps = makeDeps()

    await accept(deps, { password: '  mot de passe  ' })

    expect(deps.hashPassword).toHaveBeenCalledWith('  mot de passe  ')
  })
})

describe('acceptInvitation: the account', () => {
  it('creates a member with the invitation email, marks it used and returns the public user', async () => {
    const deps = makeDeps()

    const user = await accept(deps)

    expect(deps.hashPassword).toHaveBeenCalledWith(PASSWORD)
    expect(deps.repository.createUser).toHaveBeenCalledWith({
      email: EMAIL,
      displayName: 'Mamie',
      passwordHash: PASSWORD_HASH,
    })
    expect(deps.repository.markUsed).toHaveBeenCalledWith(INVITATION_ID, NOW)
    expect(user).toEqual({ id: NEW_USER.id, email: EMAIL, displayName: 'Mamie', role: 'member' })
  })

  it('rejects an address that got an account meanwhile, leaving the invitation unused', async () => {
    const deps = makeDeps()
    deps.repository.createUser.mockResolvedValue(null)

    await expect(accept(deps)).rejects.toMatchObject({ code: 'ACCOUNT_EXISTS' })
    expect(deps.repository.markUsed).not.toHaveBeenCalled()
  })
})

describe('acceptInvitation: the logs', () => {
  // Every value the person typed or received: none may reach the logs.
  function expectNoPersonalData(deps: Deps): void {
    const logged = JSON.stringify([deps.logger.info.mock.calls, deps.logger.warn.mock.calls])
    for (const secret of [TOKEN, EMAIL, 'Mamie', PASSWORD]) {
      expect(logged).not.toContain(secret)
    }
  }

  it('logs the accepted invitation by ids only', async () => {
    const deps = makeDeps()

    await accept(deps)

    expect(deps.logger.info).toHaveBeenCalledWith('invitation.accepted', {
      invitationId: INVITATION_ID,
      userId: NEW_USER.id,
    })
    expectNoPersonalData(deps)
  })

  it.each([
    ['not_found', { findByTokenHash: null }, {}],
    [
      'used',
      { findByTokenHash: invitationRecord({ usedAt: NOW }) },
      { invitationId: INVITATION_ID },
    ],
    [
      'expired',
      { findByTokenHash: invitationRecord({ expiresAt: NOW }) },
      { invitationId: INVITATION_ID },
    ],
    ['account_exists', { createUser: null }, { invitationId: INVITATION_ID }],
  ])('logs a refusal for %s with its reason only', async (reason, failure, ids) => {
    const deps = makeDeps()
    if ('findByTokenHash' in failure) {
      deps.repository.findByTokenHash.mockResolvedValue(failure.findByTokenHash)
    }
    if ('createUser' in failure) {
      deps.repository.createUser.mockResolvedValue(failure.createUser)
    }

    await expect(accept(deps)).rejects.toThrow()
    expect(deps.logger.warn).toHaveBeenCalledWith('invitation.accept_failed', { reason, ...ids })
    expectNoPersonalData(deps)
  })
})
```

Apply to `server/src/features/invitations/invitations.service.test.ts` (its `makeDeps` must satisfy the wider deps type) and `server/src/errors/error-handler.test.ts`:

```diff
--- a/server/src/errors/error-handler.test.ts
+++ b/server/src/errors/error-handler.test.ts
@@ -32,6 +32,27 @@ describe('toErrorResponse', () => {
     })
   })
 
+  it('answers an unknown, replaced or malformed invitation token with 404', () => {
+    expect(toErrorResponse(new AppError('INVITATION_NOT_FOUND'))).toEqual({
+      status: 404,
+      body: { error: 'INVITATION_NOT_FOUND' },
+    })
+  })
+
+  it('answers an invitation past its 7 days with 410', () => {
+    expect(toErrorResponse(new AppError('INVITATION_EXPIRED'))).toEqual({
+      status: 410,
+      body: { error: 'INVITATION_EXPIRED' },
+    })
+  })
+
+  it('answers an invitation already used with 410', () => {
+    expect(toErrorResponse(new AppError('INVITATION_USED'))).toEqual({
+      status: 410,
+      body: { error: 'INVITATION_USED' },
+    })
+  })
+
   it('answers a file already in the library with 409', () => {
     expect(toErrorResponse(new AppError('PHOTO_DUPLICATE'))).toEqual({
       status: 409,
@@ -75,6 +96,20 @@ describe('toErrorResponse', () => {
     })
   })
 
+  it('answers an invalid display name with 400', () => {
+    expect(toErrorResponse(new AppError('DISPLAY_NAME_INVALID'))).toEqual({
+      status: 400,
+      body: { error: 'DISPLAY_NAME_INVALID' },
+    })
+  })
+
+  it('answers a password of the wrong length with 400', () => {
+    expect(toErrorResponse(new AppError('PASSWORD_INVALID'))).toEqual({
+      status: 400,
+      body: { error: 'PASSWORD_INVALID' },
+    })
+  })
+
   it('answers an invalid query string with 400', () => {
     expect(toErrorResponse(new AppError('QUERY_INVALID'))).toEqual({
       status: 400,
--- a/server/src/features/invitations/invitations.service.test.ts
+++ b/server/src/features/invitations/invitations.service.test.ts
@@ -27,6 +27,7 @@ function invitationRecord(overrides: Partial<InvitationRecord> = {}): Invitation
   }
 }
 
+// Creating and listing read the first four repository functions: the others stay unused.
 // Every dependency succeeds by default: a new address, one older link replaced.
 // Each test breaks only the one it is about.
 function makeDeps() {
@@ -38,9 +39,13 @@ function makeDeps() {
         .mockResolvedValue(1),
       create: vi.fn<InvitationsRepository['create']>().mockResolvedValue(invitationRecord()),
       findAll: vi.fn<InvitationsRepository['findAll']>().mockResolvedValue([]),
+      findByTokenHash: vi.fn<InvitationsRepository['findByTokenHash']>(),
+      createUser: vi.fn<InvitationsRepository['createUser']>(),
+      markUsed: vi.fn<InvitationsRepository['markUsed']>(),
     },
     generateToken: vi.fn<InvitationsServiceDeps['generateToken']>().mockReturnValue(TOKEN),
     hashToken: vi.fn<InvitationsServiceDeps['hashToken']>().mockReturnValue(TOKEN_HASH),
+    hashPassword: vi.fn<InvitationsServiceDeps['hashPassword']>(),
     now: vi.fn<InvitationsServiceDeps['now']>().mockReturnValue(NOW),
     logger: {
       info: vi.fn<Logger['info']>(),
```

- [ ] **Step 3: Run them to verify they fail**

Run: `pnpm test`
Expected: FAIL: the `invitations.service.accept.test.ts` cases (`acceptInvitation` is not a function, the length constants are `undefined`) and the five new `error-handler.test.ts` cases (`status: undefined`). `invitations.service.test.ts` and the other files pass.

- [ ] **Step 4: Error codes, server and client**

Apply to `server/src/types.ts`, `server/src/errors/error-handler.ts` and `client/src/api.ts`:

```diff
--- a/client/src/api.ts
+++ b/client/src/api.ts
@@ -5,13 +5,18 @@ export type ApiErrorCode =
   | 'UPLOAD_INVALID'
   | 'BODY_INVALID'
   | 'QUERY_INVALID'
+  | 'DISPLAY_NAME_INVALID'
+  | 'PASSWORD_INVALID'
   | 'UNAUTHENTICATED'
   | 'INVALID_CREDENTIALS'
   | 'FORBIDDEN'
   | 'ROUTE_NOT_FOUND'
   | 'PHOTO_NOT_FOUND'
+  | 'INVITATION_NOT_FOUND'
   | 'PHOTO_DUPLICATE'
   | 'ACCOUNT_EXISTS'
+  | 'INVITATION_EXPIRED'
+  | 'INVITATION_USED'
   | 'PHOTO_TOO_LARGE'
   | 'FORMAT_UNSUPPORTED'
   | 'IMAGE_UNREADABLE'
@@ -23,13 +28,18 @@ const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
   UPLOAD_INVALID: 'Envoi invalide : une seule photo à la fois.',
   BODY_INVALID: 'Requête invalide. Rechargez la page et réessayez.',
   QUERY_INVALID: 'Requête invalide. Rechargez la page et réessayez.',
+  DISPLAY_NAME_INVALID: 'Choisissez un nom de 1 à 50 caractères.',
+  PASSWORD_INVALID: 'Le mot de passe doit faire entre 12 et 128 caractères.',
   UNAUTHENTICATED: 'Votre session a expiré. Reconnectez-vous.',
   INVALID_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
   FORBIDDEN: "Cette action est réservée à l'administrateur.",
   ROUTE_NOT_FOUND: "Cette adresse n'existe pas sur le serveur.",
   PHOTO_NOT_FOUND: 'Cette photo a déjà été supprimée.',
+  INVITATION_NOT_FOUND: "Ce lien d'invitation n'est pas valide. Demandez-en un nouveau.",
   PHOTO_DUPLICATE: 'Cette photo est déjà dans votre bibliothèque.',
   ACCOUNT_EXISTS: 'Un compte existe déjà pour cette adresse e-mail.',
+  INVITATION_EXPIRED: "Ce lien d'invitation a expiré. Demandez-en un nouveau.",
+  INVITATION_USED: "Ce lien d'invitation a déjà servi. Connectez-vous.",
   PHOTO_TOO_LARGE: 'La photo est trop lourde (10 Mo maximum).',
   FORMAT_UNSUPPORTED: 'Format non pris en charge : JPEG, PNG ou WebP uniquement.',
   IMAGE_UNREADABLE: "Ce fichier n'est pas une image lisible.",
--- a/server/src/errors/error-handler.ts
+++ b/server/src/errors/error-handler.ts
@@ -10,13 +10,18 @@ const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
   UPLOAD_INVALID: 400,
   BODY_INVALID: 400,
   QUERY_INVALID: 400,
+  DISPLAY_NAME_INVALID: 400,
+  PASSWORD_INVALID: 400,
   UNAUTHENTICATED: 401,
   INVALID_CREDENTIALS: 401,
   FORBIDDEN: 403,
   ROUTE_NOT_FOUND: 404,
   PHOTO_NOT_FOUND: 404,
+  INVITATION_NOT_FOUND: 404,
   PHOTO_DUPLICATE: 409,
   ACCOUNT_EXISTS: 409,
+  INVITATION_EXPIRED: 410,
+  INVITATION_USED: 410,
   PHOTO_TOO_LARGE: 413,
   FORMAT_UNSUPPORTED: 415,
   IMAGE_UNREADABLE: 422,
--- a/server/src/types.ts
+++ b/server/src/types.ts
@@ -7,13 +7,18 @@ export type ApiErrorCode =
   | 'UPLOAD_INVALID'
   | 'BODY_INVALID'
   | 'QUERY_INVALID'
+  | 'DISPLAY_NAME_INVALID'
+  | 'PASSWORD_INVALID'
   | 'UNAUTHENTICATED'
   | 'INVALID_CREDENTIALS'
   | 'FORBIDDEN'
   | 'ROUTE_NOT_FOUND'
   | 'PHOTO_NOT_FOUND'
+  | 'INVITATION_NOT_FOUND'
   | 'PHOTO_DUPLICATE'
   | 'ACCOUNT_EXISTS'
+  | 'INVITATION_EXPIRED'
+  | 'INVITATION_USED'
   | 'PHOTO_TOO_LARGE'
   | 'FORMAT_UNSUPPORTED'
   | 'IMAGE_UNREADABLE'
```

- [ ] **Step 5: Repository**

Replace `server/src/features/invitations/invitations.repository.ts` with:

```ts
import { type Invitation, Prisma, type PrismaClient, type User } from '@prisma/client'

export type InvitationRecord = Invitation

export type UserRecord = User

export type NewInvitation = {
  tokenHash: string
  email: string
  invitedById: string
  expiresAt: Date
}

export type NewMember = { email: string; displayName: string; passwordHash: string }

export type InvitationsRepository = {
  hasUserWithEmail: (email: string) => Promise<boolean>
  // Pending or expired: a used invitation stays, it records a sign-up.
  deleteUnusedByEmail: (email: string) => Promise<number>
  create: (invitation: NewInvitation) => Promise<InvitationRecord>
  findAll: () => Promise<InvitationRecord[]>
  findByTokenHash: (tokenHash: string) => Promise<InvitationRecord | null>
  // null when the email already has an account: the service decides the error.
  createUser: (member: NewMember) => Promise<UserRecord | null>
  markUsed: (id: string, usedAt: Date) => Promise<void>
}

// P2002: the unique index on User.email refused a second account for the same address.
function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export function createInvitationsRepository(prisma: PrismaClient): InvitationsRepository {
  return {
    hasUserWithEmail: async (email) => (await prisma.user.count({ where: { email } })) > 0,
    deleteUnusedByEmail: async (email) => {
      const { count } = await prisma.invitation.deleteMany({ where: { email, usedAt: null } })
      return count
    },
    // usedAt written on purpose: on MongoDB Prisma leaves an omitted optional field out of
    // the document, and the `usedAt: null` filter does not match a missing field.
    create: (invitation) => prisma.invitation.create({ data: { ...invitation, usedAt: null } }),
    // By id: an ObjectId starts with its creation time, so this is newest first.
    findAll: () => prisma.invitation.findMany({ orderBy: { id: 'desc' } }),
    findByTokenHash: (tokenHash) => prisma.invitation.findUnique({ where: { tokenHash } }),
    // Here and not in the auth repository: an invitation is the only way to create an account.
    createUser: async (member) => {
      try {
        return await prisma.user.create({ data: { ...member, role: 'member' } })
      } catch (error: unknown) {
        if (isUniqueViolation(error)) {
          return null
        }
        throw error
      }
    },
    markUsed: async (id, usedAt) => {
      await prisma.invitation.update({ where: { id }, data: { usedAt } })
    },
  }
}
```

- [ ] **Step 6: Service**

Replace `server/src/features/invitations/invitations.service.ts` with:

```ts
import { AppError } from '../../errors/app-error.js'
import type { Logger } from '../../lib/logger.js'
import type { CreatedInvitation, Invitation, InvitationStatus, PublicUser } from '../../types.js'
import type {
  InvitationRecord,
  InvitationsRepository,
  UserRecord,
} from './invitations.repository.js'

const DAY_MS = 24 * 60 * 60 * 1000
export const INVITATION_DURATION_MS = 7 * DAY_MS
// Loose on purpose: the admin types the address himself; this catches a missing @ or a
// stray space without rejecting a real address.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/
// What generateToken produces: 32 random bytes in hex.
const TOKEN_PATTERN = /^[0-9a-f]{64}$/
// Shown on frames and next to shared photos: a bound keeps the layout.
export const DISPLAY_NAME_MAX_LENGTH = 50
// OWASP ASVS: at least 12, allow up to 128; the maximum keeps argon2 away from huge inputs.
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

// email comes straight from the JSON body: validated here, at the boundary.
export type NewInvitationInput = { email: unknown; invitedById: string }

// The three fields come straight from the JSON body, like email above.
export type InvitationAcceptance = { token: unknown; displayName: unknown; password: unknown }

export type InvitationsServiceDeps = {
  repository: InvitationsRepository
  generateToken: () => string
  hashToken: (token: string) => string
  hashPassword: (plain: string) => Promise<string>
  now: () => Date
  logger: Logger
}

export type InvitationsService = {
  createInvitation: (input: NewInvitationInput) => Promise<CreatedInvitation>
  listInvitations: () => Promise<Invitation[]>
  acceptInvitation: (acceptance: InvitationAcceptance) => Promise<PublicUser>
}

// Same normalization as login: the account created from the invitation logs in with it.
function parseEmail(email: unknown): string {
  if (typeof email !== 'string') {
    throw new AppError('EMAIL_INVALID')
  }
  const normalizedEmail = email.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new AppError('EMAIL_INVALID')
  }
  return normalizedEmail
}

function parseDisplayName(displayName: unknown): string {
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
function parsePassword(password: unknown): string {
  if (
    typeof password !== 'string' ||
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    throw new AppError('PASSWORD_INVALID')
  }
  return password
}

// Used comes first: the admin learns the person signed up, even after the 7 days.
function statusOf({ usedAt, expiresAt }: InvitationRecord, now: Date): InvitationStatus {
  if (usedAt !== null) {
    return 'used'
  }
  return expiresAt <= now ? 'expired' : 'pending'
}

// tokenHash and invitedById stay on the server.
function toInvitation(record: InvitationRecord, now: Date): Invitation {
  return {
    id: record.id,
    email: record.email,
    status: statusOf(record, now),
    createdAt: record.createdAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
  }
}

// The password hash never leaves the service.
function toPublicUser({ id, email, displayName, role }: UserRecord): PublicUser {
  return { id, email, displayName, role }
}

async function createInvitation(
  { repository, generateToken, hashToken, now, logger }: InvitationsServiceDeps,
  { email, invitedById }: NewInvitationInput,
): Promise<CreatedInvitation> {
  const normalizedEmail = parseEmail(email)
  // An admin route: telling him which addresses have an account leaks nothing to a stranger.
  if (await repository.hasUserWithEmail(normalizedEmail)) {
    throw new AppError('ACCOUNT_EXISTS')
  }
  // A new link replaces any unused one: "I lost the link" needs no revoke button.
  const replacedCount = await repository.deleteUnusedByEmail(normalizedEmail)
  const token = generateToken()
  const createdAt = now()
  const record = await repository.create({
    tokenHash: hashToken(token),
    email: normalizedEmail,
    invitedById,
    expiresAt: new Date(createdAt.getTime() + INVITATION_DURATION_MS),
  })
  logger.info('invitation.created', { invitationId: record.id, userId: invitedById, replacedCount })
  return { invitation: toInvitation(record, createdAt), token }
}

async function listInvitations({ repository, now }: InvitationsServiceDeps): Promise<Invitation[]> {
  const records = await repository.findAll()
  const listedAt = now()
  return records.map((record) => toInvitation(record, listedAt))
}

// Logs ids and a reason only: never the token, the email, the name or the password.
async function findLiveInvitation(
  { repository, hashToken, now, logger }: InvitationsServiceDeps,
  token: unknown,
): Promise<InvitationRecord> {
  // Cannot match any stored hash: answered without a lookup.
  if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) {
    throw new AppError('INVITATION_NOT_FOUND')
  }
  const invitation = await repository.findByTokenHash(hashToken(token))
  if (!invitation) {
    logger.warn('invitation.accept_failed', { reason: 'not_found' })
    throw new AppError('INVITATION_NOT_FOUND')
  }
  // Before expiry: "log in" is the right advice for someone who already signed up.
  if (invitation.usedAt !== null) {
    logger.warn('invitation.accept_failed', { reason: 'used', invitationId: invitation.id })
    throw new AppError('INVITATION_USED')
  }
  if (invitation.expiresAt <= now()) {
    logger.warn('invitation.accept_failed', { reason: 'expired', invitationId: invitation.id })
    throw new AppError('INVITATION_EXPIRED')
  }
  return invitation
}

async function acceptInvitation(
  deps: InvitationsServiceDeps,
  acceptance: InvitationAcceptance,
): Promise<PublicUser> {
  const { repository, hashPassword, now, logger } = deps
  // The link first: no point choosing a password for a dead one.
  const invitation = await findLiveInvitation(deps, acceptance.token)
  const displayName = parseDisplayName(acceptance.displayName)
  const passwordHash = await hashPassword(parsePassword(acceptance.password))
  // No transaction: the unique index on User.email lets one of two concurrent accepts through.
  const user = await repository.createUser({ email: invitation.email, displayName, passwordHash })
  if (!user) {
    logger.warn('invitation.accept_failed', {
      reason: 'account_exists',
      invitationId: invitation.id,
    })
    throw new AppError('ACCOUNT_EXISTS')
  }
  await repository.markUsed(invitation.id, now())
  logger.info('invitation.accepted', { invitationId: invitation.id, userId: user.id })
  return toPublicUser(user)
}

export function createInvitationsService(deps: InvitationsServiceDeps): InvitationsService {
  return {
    createInvitation: (input) => createInvitation(deps, input),
    listInvitations: () => listInvitations(deps),
    acceptInvitation: (acceptance) => acceptInvitation(deps, acceptance),
  }
}
```

- [ ] **Step 7: Pass `hashPassword` from `app.ts`**

Apply to `server/src/app.ts`:

```diff
--- a/server/src/app.ts
+++ b/server/src/app.ts
@@ -21,7 +21,7 @@ import { deleteImage, uploadImage } from './lib/cloudinary.js'
 import { prisma } from './lib/db.js'
 import { toFrameJpeg } from './lib/image.js'
 import { logger } from './lib/logger.js'
-import { verifyPassword } from './lib/password.js'
+import { hashPassword, verifyPassword } from './lib/password.js'
 import { requestLogger } from './lib/request-logger.js'
 import { generateToken, hashToken } from './lib/session-token.js'
 import type { SocketServer } from './lib/socket-types.js'
@@ -57,6 +57,7 @@ function assembleInvitationsRouter(
     repository: createInvitationsRepository(prisma),
     generateToken,
     hashToken,
+    hashPassword,
     now: () => new Date(),
     logger,
   })
```

- [ ] **Step 8: Gates**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  133 passed (133)` (104 + 24 accept tests + 5 error-handler cases). Check the sizes: `invitations.service.accept.test.ts` 252 lines, `invitations.service.ts` under 300.

Bruno: no route changed (42 requests, 92 assertions). Run the Bruno gate command against a restarted test API anyway: `app.ts` changed. Expected: all 42 passed.

- [ ] **Step 9: Commit**

```bash
git add server/src/features/invitations server/src/types.ts server/src/errors client/src/api.ts server/src/app.ts
git commit -F <message-file>
```

Message: `feat(server): accept an invitation in the service`, body: `The token is checked first (shape, lookup, used, expired), then the display name (1 to 50 characters, trimmed), then the password (12 to 128, not trimmed). The member account takes the invitation's email; a unique-email race answers ACCOUNT_EXISTS. Refusals log invitation.accept_failed with a reason and ids only.` + the attribution lines.

---

### Task 6: `openSession`, the accept route, and the PR C docs (PR C, `feat/invitations-accept`)

**Files:**
- Modify: `server/src/features/auth/auth.service.ts`
- Test: `server/src/features/auth/auth.service.test.ts`
- Modify: `server/src/features/invitations/invitations.controller.ts`, `invitations.routes.ts`, `server/src/app.ts`
- Create: `server/bruno/invitations/accept/{folder,01-edge-lien-remplace,02-edge-jeton-invalide,03-edge-nom-vide,04-edge-mot-de-passe-court,05-nominal,06-edge-deja-utilisee}.bru`
- Modify: `server/bruno/collection.bru` (docs)
- Modify: `ARCHITECTURE.md`

**Interfaces:**
- Consumes: `acceptInvitation` (Task 5), `setSessionCookie(res, token, expiresAt)` (`auth.cookie.ts`).
- Produces:
  ```ts
  // auth.service.ts
  export type OpenedSession = { token: string; expiresAt: Date }
  // AuthService gains:
  openSession: (userId: string) => Promise<OpenedSession>
  // invitations.controller.ts
  export function createInvitationsController(service: InvitationsService, authService: AuthService): InvitationsController // gains accept
  ```

- [ ] **Step 1: Write the failing `openSession` test**

Apply to `server/src/features/auth/auth.service.test.ts` (the file ends at 286 lines):

```diff
--- a/server/src/features/auth/auth.service.test.ts
+++ b/server/src/features/auth/auth.service.test.ts
@@ -152,6 +152,22 @@ describe('login', () => {
   })
 })
 
+describe('openSession', () => {
+  it('purges the expired sessions, then stores the hash of a new 90-day session', async () => {
+    const deps = makeDeps()
+
+    const session = await createAuthService(deps).openSession(USER.id)
+
+    expect(deps.repository.deleteExpiredSessions).toHaveBeenCalledWith(NOW)
+    expect(deps.repository.createSession).toHaveBeenCalledWith({
+      tokenHash: TOKEN_HASH,
+      userId: USER.id,
+      expiresAt: SESSION_END,
+    })
+    expect(session).toEqual({ token: TOKEN, expiresAt: SESSION_END })
+  })
+})
+
 describe('logout', () => {
   it('deletes the session of the token and logs the user id', async () => {
     const deps = makeDeps()
```

Run: `pnpm test`
Expected: FAIL in `auth.service.test.ts` on the new case only (`openSession` is not a function); the login tests pass.

- [ ] **Step 2: Extract `openSession` from `login`**

Apply to `server/src/features/auth/auth.service.ts`:

```diff
--- a/server/src/features/auth/auth.service.ts
+++ b/server/src/features/auth/auth.service.ts
@@ -14,6 +14,8 @@ export type Credentials = { email: unknown; password: unknown }
 
 export type LoginResult = { user: PublicUser; token: string; expiresAt: Date }
 
+export type OpenedSession = { token: string; expiresAt: Date }
+
 export type AuthenticatedSession = { user: PublicUser; expiresAt: Date; isRenewed: boolean }
 
 export type AuthServiceDeps = {
@@ -27,6 +29,7 @@ export type AuthServiceDeps = {
 
 export type AuthService = {
   login: (credentials: Credentials) => Promise<LoginResult>
+  openSession: (userId: string) => Promise<OpenedSession>
   logout: (token: string | null) => Promise<void>
   authenticate: (token: string | null) => Promise<AuthenticatedSession>
   authenticateAndSlide: (token: string | null) => Promise<AuthenticatedSession>
@@ -82,14 +85,21 @@ async function findValidSession(
   return session
 }
 
-async function login(deps: AuthServiceDeps, credentials: Credentials): Promise<LoginResult> {
-  const { repository, hashToken, generateToken, now, logger } = deps
-  const user = await findUserByCredentials(deps, credentials)
+// The one place that creates sessions: login, and accepting an invitation.
+// Each new session also purges the expired ones, so no scheduled job is needed.
+async function openSession(deps: AuthServiceDeps, userId: string): Promise<OpenedSession> {
+  const { repository, hashToken, generateToken, now } = deps
   await repository.deleteExpiredSessions(now())
   const token = generateToken()
   const expiresAt = sessionEnd(deps)
-  await repository.createSession({ tokenHash: hashToken(token), userId: user.id, expiresAt })
-  logger.info('auth.login_succeeded', { userId: user.id })
+  await repository.createSession({ tokenHash: hashToken(token), userId, expiresAt })
+  return { token, expiresAt }
+}
+
+async function login(deps: AuthServiceDeps, credentials: Credentials): Promise<LoginResult> {
+  const user = await findUserByCredentials(deps, credentials)
+  const { token, expiresAt } = await openSession(deps, user.id)
+  deps.logger.info('auth.login_succeeded', { userId: user.id })
   return { user: toPublicUser(user), token, expiresAt }
 }
 
@@ -134,6 +144,7 @@ async function authenticateAndSlide(
 export function createAuthService(deps: AuthServiceDeps): AuthService {
   return {
     login: (credentials) => login(deps, credentials),
+    openSession: (userId) => openSession(deps, userId),
     logout: (token) => logout(deps, token),
     authenticate: (token) => authenticate(deps, token),
     authenticateAndSlide: (token) => authenticateAndSlide(deps, token),
```

Run: `pnpm test`
Expected: PASS, `Tests  134 passed (134)` (the login tests prove `login` behaves as before).

- [ ] **Step 3: Commit the extraction**

Run: `pnpm check && pnpm typecheck`
Expected: green.

```bash
git add server/src/features/auth/auth.service.ts server/src/features/auth/auth.service.test.ts
git commit -F <message-file>
```

Message: `refactor(server): extract openSession from login`, body: `Accepting an invitation will open a session too: one place purges expired sessions, creates one and returns its token and end. login keeps its behaviour and its log.` + the attribution lines.

- [ ] **Step 4: Write the Bruno requests (the failing tests)**

Create `server/bruno/invitations/accept/folder.bru`:

```
meta {
  name: accept
  seq: 3
}

docs {
  `POST /api/invitations/accept`, JSON `{ token, displayName, password }`,
  public → 201 `{ user }` et le cookie `ff_session` : le nouveau membre est
  connecté comme après `/login`. Le jeton voyage dans le corps, jamais dans
  le chemin : `http.request` écrit chaque chemin dans les logs.

  Ordre des contrôles : le lien d'abord (forme, existence, déjà servi,
  expiré), puis le nom (1 à 50 caractères), puis le mot de passe (12 à 128).
  Toutes les requêtes partent sans cookie (`req.deleteHeader('Cookie')`) :
  l'invité n'a pas encore de compte. `05` crée un compte à chaque lancement ;
  ces comptes restent jusqu'au prochain `pnpm db:seed`.
}
```

Create `server/bruno/invitations/accept/01-edge-lien-remplace.bru`:

```
meta {
  name: Edge - lien remplacé
  type: http
  seq: 1
}

post {
  url: {{baseUrl}}/api/invitations/accept
  body: json
  auth: none
}

body:json {
  {
    "token": "{{replacedInviteToken}}",
    "displayName": "Invitée",
    "password": "invite-bruno-dev"
  }
}

script:pre-request {
  if (!bru.getVar('replacedInviteToken')) {
    throw new Error('replacedInviteToken absent : lancer toute la collection, create/02 doit passer')
  }
  // The invitee has no session: collection.bru's cookie must not leave.
  req.deleteHeader('Cookie')
}

assert {
  res.status: eq 404
  res.body.error: eq INVITATION_NOT_FOUND
}

docs {
  EDGE → 404 INVITATION_NOT_FOUND : le premier lien de `create/01`, remplacé
  par `create/02`, n'existe plus.
}
```

Create `server/bruno/invitations/accept/02-edge-jeton-invalide.bru`:

```
meta {
  name: Edge - jeton invalide
  type: http
  seq: 2
}

post {
  url: {{baseUrl}}/api/invitations/accept
  body: json
  auth: none
}

body:json {
  {
    "token": "pas-un-jeton",
    "displayName": "Invitée",
    "password": "invite-bruno-dev"
  }
}

script:pre-request {
  // The invitee has no session: collection.bru's cookie must not leave.
  req.deleteHeader('Cookie')
}

assert {
  res.status: eq 404
  res.body.error: eq INVITATION_NOT_FOUND
}

docs {
  EDGE → 404 INVITATION_NOT_FOUND : un jeton qui n'a pas la forme de 64
  caractères hexadécimaux est refusé sans requête en base.
}
```

Create `server/bruno/invitations/accept/03-edge-nom-vide.bru`:

```
meta {
  name: Edge - nom vide
  type: http
  seq: 3
}

post {
  url: {{baseUrl}}/api/invitations/accept
  body: json
  auth: none
}

body:json {
  {
    "token": "{{inviteToken}}",
    "displayName": "   ",
    "password": "invite-bruno-dev"
  }
}

script:pre-request {
  if (!bru.getVar('inviteToken')) {
    throw new Error('inviteToken absent : lancer toute la collection, create/02 doit passer')
  }
  // The invitee has no session: collection.bru's cookie must not leave.
  req.deleteHeader('Cookie')
}

assert {
  res.status: eq 400
  res.body.error: eq DISPLAY_NAME_INVALID
}

docs {
  EDGE → 400 DISPLAY_NAME_INVALID : un nom fait d'espaces est vide une fois
  nettoyé. Le lien reste valable : `05` s'en sert ensuite.
}
```

Create `server/bruno/invitations/accept/04-edge-mot-de-passe-court.bru`:

```
meta {
  name: Edge - mot de passe trop court
  type: http
  seq: 4
}

post {
  url: {{baseUrl}}/api/invitations/accept
  body: json
  auth: none
}

body:json {
  {
    "token": "{{inviteToken}}",
    "displayName": "Invitée",
    "password": "onze-caract"
  }
}

script:pre-request {
  if (!bru.getVar('inviteToken')) {
    throw new Error('inviteToken absent : lancer toute la collection, create/02 doit passer')
  }
  // The invitee has no session: collection.bru's cookie must not leave.
  req.deleteHeader('Cookie')
}

assert {
  res.status: eq 400
  res.body.error: eq PASSWORD_INVALID
}

docs {
  EDGE → 400 PASSWORD_INVALID : 11 caractères, il en faut au moins 12. Le
  lien reste valable.
}
```

Create `server/bruno/invitations/accept/05-nominal.bru`:

```
meta {
  name: Nominal - création du compte
  type: http
  seq: 5
}

post {
  url: {{baseUrl}}/api/invitations/accept
  body: json
  auth: none
}

body:json {
  {
    "token": "{{inviteToken}}",
    "displayName": "Invitée",
    "password": "invite-bruno-dev"
  }
}

script:pre-request {
  if (!bru.getVar('inviteToken') || !bru.getVar('adminCookie')) {
    throw new Error('inviteToken ou adminCookie absent : lancer toute la collection, create/02 doit passer')
  }
  // The invitee has no session: collection.bru's cookie must not leave.
  req.deleteHeader('Cookie')
}

assert {
  res.status: eq 201
  res.body.user.email: eq {{inviteEmail}}
  res.body.user.displayName: eq Invitée
  res.body.user.role: eq member
  res.body.user.passwordHash: isUndefined
}

script:post-response {
  const axios = require('axios')
  const baseUrl = bru.getEnvVar('baseUrl')
  const setCookies = [].concat(res.getHeader('set-cookie') ?? [])
  const newCookie = setCookies.find((cookie) => cookie.startsWith('ff_session='))
  test('un cookie de session pour le nouveau membre', () => {
    expect(newCookie).to.match(/^ff_session=[0-9a-f]{64};/)
  })
  test('ce cookie ouvre une session du nouveau compte', async () => {
    // A script request does not get the collection headers: send the cookie itself.
    const me = await axios.get(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: newCookie.split(';')[0] },
    })
    expect(me.data.user.id).to.equal(res.body.user.id)
  })
  test('l\'invitation passe à « utilisée » dans la liste de l\'admin', async () => {
    const list = await axios.get(`${baseUrl}/api/invitations`, {
      headers: { Cookie: bru.getVar('adminCookie') },
    })
    const invited = list.data.invitations.find(({ email }) => email === bru.getVar('inviteEmail'))
    expect(invited.status).to.equal('used')
  })
}

docs {
  NOMINAL → 201 `{ user }`, un compte `member` à l'adresse de l'invitation,
  et un cookie `ff_session`. Le script vérifie que ce cookie ouvre bien une
  session du nouveau compte (`GET /api/auth/me`), puis que l'admin voit
  l'invitation « utilisée » (`GET /api/invitations`).
}
```

Create `server/bruno/invitations/accept/06-edge-deja-utilisee.bru`:

```
meta {
  name: Edge - invitation déjà utilisée
  type: http
  seq: 6
}

post {
  url: {{baseUrl}}/api/invitations/accept
  body: json
  auth: none
}

body:json {
  {
    "token": "{{inviteToken}}",
    "displayName": "Invitée",
    "password": "invite-bruno-dev"
  }
}

script:pre-request {
  if (!bru.getVar('inviteToken')) {
    throw new Error('inviteToken absent : lancer toute la collection, create/02 doit passer')
  }
  // The invitee has no session: collection.bru's cookie must not leave.
  req.deleteHeader('Cookie')
}

assert {
  res.status: eq 410
  res.body.error: eq INVITATION_USED
}

docs {
  EDGE → 410 INVITATION_USED : le lien a servi à `05`. 410 dit « a existé,
  ne sert plus » ; le client conseille de se connecter.
}
```

Apply to `server/bruno/collection.bru`:

```diff
--- a/server/bruno/collection.bru
+++ b/server/bruno/collection.bru
@@ -31,5 +31,9 @@ docs {
   suivant répond 409 `PHOTO_DUPLICATE` à `create/01` ; `pnpm db:seed` remet
   la base à zéro.
 
+  Chaque lancement crée aussi un compte membre à une adresse neuve
+  (`invitations/accept/05`, `invite-<horodatage>@familyframe.test`) : ces
+  comptes restent jusqu'au prochain `pnpm db:seed`.
+
   Chemins `@file()` relatifs à la racine de la collection (`server/bruno/`).
 }
```

- [ ] **Step 5: Run Bruno against the current code to verify it fails**

Start the test API (own background command, from `server/`). Wait for `server.started`.

From `server/bruno/`: the Bruno gate command.
Expected: 48 requests, 6 failed: every `invitations/accept/*` request (`404 ROUTE_NOT_FOUND`: no `/accept` route yet; no account is created). The 42 others pass.

Stop the test API.

- [ ] **Step 6: Controller, route and wiring**

Replace `server/src/features/invitations/invitations.controller.ts` with:

```ts
import type { Request, Response } from 'express'
import { setSessionCookie } from '../auth/auth.cookie.js'
import { currentUser } from '../auth/auth.guard.js'
import type { AuthService } from '../auth/auth.service.js'
import type { InvitationsService } from './invitations.service.js'

export type InvitationsController = {
  create: (req: Request, res: Response) => Promise<void>
  list: (req: Request, res: Response) => Promise<void>
  accept: (req: Request, res: Response) => Promise<void>
}

export function createInvitationsController(
  service: InvitationsService,
  authService: AuthService,
): InvitationsController {
  return {
    async create(req, res) {
      const created = await service.createInvitation({
        email: req.body?.email,
        invitedById: currentUser(req).id,
      })
      res.status(201).json(created)
    },

    async list(_req, res) {
      const invitations = await service.listInvitations()
      res.json({ invitations })
    },

    // The new member lands logged in, with the same cookie as after /login.
    async accept(req, res) {
      const user = await service.acceptInvitation({
        token: req.body?.token,
        displayName: req.body?.displayName,
        password: req.body?.password,
      })
      const { token, expiresAt } = await authService.openSession(user.id)
      setSessionCookie(res, token, expiresAt)
      res.status(201).json({ user })
    },
  }
}
```

Apply to `server/src/features/invitations/invitations.routes.ts` and `server/src/app.ts`:

```diff
--- a/server/src/app.ts
+++ b/server/src/app.ts
@@ -50,6 +50,7 @@ function assemblePhotosRouter(io: SocketServer): Router {
 }
 
 function assembleInvitationsRouter(
+  authService: AuthService,
   requireAuth: RequestHandler,
   requireAdmin: RequestHandler,
 ): Router {
@@ -61,7 +62,8 @@ function assembleInvitationsRouter(
     now: () => new Date(),
     logger,
   })
-  return createInvitationsRouter(createInvitationsController(service), requireAuth, requireAdmin)
+  const controller = createInvitationsController(service, authService)
+  return createInvitationsRouter(controller, requireAuth, requireAdmin)
 }
 
 export function createApp(io: SocketServer, authService: AuthService): Express {
@@ -79,7 +81,7 @@ export function createApp(io: SocketServer, authService: AuthService): Express {
 
   app.use('/api/auth', createAuthRouter(createAuthController(authService), requireAuth))
   app.use('/api/photos', requireAuth, assemblePhotosRouter(io))
-  app.use('/api/invitations', assembleInvitationsRouter(requireAuth, requireAdmin))
+  app.use('/api/invitations', assembleInvitationsRouter(authService, requireAuth, requireAdmin))
 
   app.use(notFound)
   app.use(errorHandler)
--- a/server/src/features/invitations/invitations.routes.ts
+++ b/server/src/features/invitations/invitations.routes.ts
@@ -9,6 +9,9 @@ export function createInvitationsRouter(
   const router = Router()
   // A JSON route brings its own parser (see the logging spec).
   router.use(express.json())
+  // Public: the invitee has no account yet. The token travels in the body, never in the
+  // path, which the request log writes.
+  router.post('/accept', controller.accept)
   router.get('/', requireAuth, requireAdmin, controller.list)
   router.post('/', requireAuth, requireAdmin, controller.create)
   return router
```

- [ ] **Step 7: Run Bruno against the new code**

Start the test API again. From `server/bruno/`: the Bruno gate command.
Expected: status PASS, 48 requests, 107 assertions, 25 `test()` calls, all passed. Stop the test API.

- [ ] **Step 8: Gates**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  134 passed (134)`.

- [ ] **Step 9: Commit**

```bash
git add server/src/features/invitations server/src/app.ts server/bruno
git commit -F <message-file>
```

Message: `feat(server): accept invitations over the API`, body: `POST /api/invitations/accept is public: the invitee has no account yet. It creates the member, opens a session through the auth service and sets the cookie, then answers 201 with the user, as login does. The token travels in the JSON body, never in the logged path.` + the attribution lines.

- [ ] **Step 10: ARCHITECTURE**

In `ARCHITECTURE.md`:

1. In the API table, add after the `GET /api/invitations` row:
   ```markdown
   | `POST /api/invitations/accept` | JSON `{ token, displayName, password }` → `201 { user }` + cookie `ff_session` : public ; crée un compte `member` à l'e-mail de l'invitation et le connecte |
   ```
2. In the error table, replace the `ACCOUNT_EXISTS` row's case with `l'e-mail a déjà un compte (création d'invitation, ou acceptation après une course)`; add after the `EMAIL_INVALID` row:
   ```markdown
   | nom d'affichage vide après trim, de plus de 50 caractères, ou absent     | 400    | `DISPLAY_NAME_INVALID` |
   | mot de passe de moins de 12 ou plus de 128 caractères, ou absent         | 400    | `PASSWORD_INVALID`     |
   ```
   after the `PHOTO_NOT_FOUND` row:
   ```markdown
   | jeton d'invitation inconnu, remplacé ou mal formé                        | 404    | `INVITATION_NOT_FOUND` |
   ```
   and after the `PHOTO_TOO_LARGE` row:
   ```markdown
   | invitation de plus de 7 jours                                            | 410    | `INVITATION_EXPIRED`   |
   | invitation déjà utilisée                                                 | 410    | `INVITATION_USED`      |
   ```
   (`410` dit « a existé, n'est plus utilisable » ; let `pnpm format` widen the table's last column.)
3. In `## Authentification`, in the `- **Comptes**` bullet, replace `Pas d'inscription : les comptes viennent du seed (\`pnpm db:seed\`) ; les invitations arrivent à l'étape 3.` with `Pas d'inscription libre : en dehors des deux comptes du seed (\`pnpm db:seed\`), un compte naît d'une invitation, toujours avec le rôle \`member\`.`
4. Append to the `- **Invitations**` bullet (added in Task 4): ` L'acceptation (\`POST /api/invitations/accept\`, publique) vérifie d'abord le jeton (forme, existence, déjà utilisé, expiré), puis le nom, puis le mot de passe : inutile de choisir un mot de passe pour un lien mort. Elle crée le compte, puis marque l'invitation utilisée, sans transaction : l'index unique sur \`User.email\` garantit qu'un double envoi ne crée qu'un compte (l'autre reçoit \`409 ACCOUNT_EXISTS\`). La session est ouverte par \`openSession\` du service d'auth (aussi utilisé par la connexion), et le contrôleur pose le cookie comme au login.`
5. In `## Couches du backend`, in the `features/invitations/` bullet (added in Task 4), replace `Le service reçoit \`repository\`, \`generateToken\`, \`hashToken\`, \`now\` et \`logger\`` with `Le service reçoit \`repository\` (seul endroit qui crée un compte), \`generateToken\`, \`hashToken\`, \`hashPassword\`, \`now\` et \`logger\` ; le contrôleur reçoit aussi le service d'auth pour \`openSession\``.
6. In the `## Logs` table, add after the `invitation.created` row:
   ```markdown
   | `invitation.accepted`                                       | info                          | service invitations, avec `invitationId` et `userId` (le nouveau membre)                                                                                                    |
   | `invitation.accept_failed`                                  | warn                          | service invitations, avec `reason` (`not_found`, `used`, `expired`, `account_exists`) et `invitationId` quand il est connu ; jamais le jeton, l'e-mail, le nom ni le mot de passe |
   ```

- [ ] **Step 11: Check and commit the docs**

Run: `pnpm check` (format with `pnpm exec biome format --write ARCHITECTURE.md` if the hook rejects it).

```bash
git add ARCHITECTURE.md
git commit -F <message-file>
```

Message: `docs: describe accepting an invitation` + the attribution lines.

---

## PR D — `feat/client-invitations`

> **Controller:** before Task 7, run `gh stack add feat/client-invitations`.

The client has no test runner (Global Constraints): each client task is verified by `pnpm typecheck`, `pnpm build`, `pnpm check`, the function sizes, and the manual checks of the final verification. Unit tests stay at 134, Bruno at 48 requests / 107 assertions.

### Task 7: The invitation page `/invite/:token` (PR D, `feat/client-invitations`)

**Files:**
- Modify: `client/src/auth/authApi.ts`, `client/src/auth/AuthContext.ts`, `client/src/auth/AuthProvider.tsx`, `client/src/App.tsx`
- Create: `client/src/components/form/TextField.tsx`, `client/src/components/auth/InviteForm.tsx`, `client/src/pages/InvitePage.tsx`

**Interfaces:**
- Consumes: `POST /api/invitations/accept` (Task 6), the five accept messages in `client/src/api.ts` (Task 5), `LogoutButton`, `useAuth`.
- Produces (used by Tasks 8 and 9):
  ```ts
  // client/src/auth/authApi.ts
  export type InvitationAcceptance = { token: string; displayName: string; password: string }
  export function postAcceptInvitation(acceptance: InvitationAcceptance): Promise<LoginResult>
  // client/src/auth/AuthContext.ts: AuthContextValue gains
  acceptInvitation: (acceptance: InvitationAcceptance) => Promise<LoginResult>
  // client/src/components/form/TextField.tsx
  type TextFieldProps = { id: string; label: string; type: 'email' | 'password' | 'text'; autoComplete: string; value: string; onChange: (value: string) => void; minLength?: number; maxLength?: number }
  export function TextField(props: TextFieldProps): JSX.Element
  ```

- [ ] **Step 1: Create the branch (controller)**

Run: `gh stack add feat/client-invitations`
Expected: the new branch is checked out on top of `feat/invitations-accept`.

- [ ] **Step 2: `postAcceptInvitation`, the twin of `postLogin`**

Apply to `client/src/auth/authApi.ts`:

```diff
--- a/client/src/auth/authApi.ts
+++ b/client/src/auth/authApi.ts
@@ -5,7 +5,9 @@ export type LoginResult =
   | { isSuccess: true; user: PublicUser }
   | { isSuccess: false; message: string }
 
-// Both /login and /me answer { user }.
+export type InvitationAcceptance = { token: string; displayName: string; password: string }
+
+// /login, /me and /invitations/accept all answer { user }.
 function readUser(body: unknown): PublicUser | null {
   if (typeof body === 'object' && body !== null && 'user' in body && isPublicUser(body.user)) {
     return body.user
@@ -31,12 +33,13 @@ export async function fetchCurrentUser(): Promise<CurrentUserResult> {
   }
 }
 
-export async function postLogin(email: string, password: string): Promise<LoginResult> {
+// Both ways in (login, accepting an invitation) post JSON and get the user and a cookie back.
+async function postForUser(url: string, payload: object): Promise<LoginResult> {
   try {
-    const res = await fetch('/api/auth/login', {
+    const res = await fetch(url, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
-      body: JSON.stringify({ email, password }),
+      body: JSON.stringify(payload),
     })
     // Not JSON when the dev proxy answers for a stopped API.
     const data: unknown = await res.json().catch(() => null)
@@ -47,6 +50,15 @@ export async function postLogin(email: string, password: string): Promise<LoginR
   }
 }
 
+export function postLogin(email: string, password: string): Promise<LoginResult> {
+  return postForUser('/api/auth/login', { email, password })
+}
+
+// The token goes in the body: the server logs every API path.
+export function postAcceptInvitation(acceptance: InvitationAcceptance): Promise<LoginResult> {
+  return postForUser('/api/invitations/accept', acceptance)
+}
+
 // The client forgets the user even if the call fails: the next page load asks /me again.
 export async function postLogout(): Promise<void> {
   try {
```

- [ ] **Step 3: `acceptInvitation` in the auth context**

Apply to `client/src/auth/AuthContext.ts` and `client/src/auth/AuthProvider.tsx` (the actions move to `useAuthActions` so both functions stay under 30 lines):

```diff
--- a/client/src/auth/AuthContext.ts
+++ b/client/src/auth/AuthContext.ts
@@ -1,5 +1,5 @@
 import { createContext, useContext } from 'react'
-import type { LoginResult } from '@/auth/authApi.ts'
+import type { InvitationAcceptance, LoginResult } from '@/auth/authApi.ts'
 import type { PublicUser } from '@/auth/user.ts'
 
 export type AuthContextValue = {
@@ -7,6 +7,8 @@ export type AuthContextValue = {
   // True until /api/auth/me answers: the cookie is httpOnly, only the API knows the user.
   isLoading: boolean
   login: (email: string, password: string) => Promise<LoginResult>
+  // Creates the account and logs it in, like login.
+  acceptInvitation: (acceptance: InvitationAcceptance) => Promise<LoginResult>
   logout: () => Promise<void>
   // For a 401 from the API: the session ended on the server.
   dropUser: () => void
--- a/client/src/auth/AuthProvider.tsx
+++ b/client/src/auth/AuthProvider.tsx
@@ -1,6 +1,13 @@
 import { type JSX, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
-import { AuthContext } from '@/auth/AuthContext.ts'
-import { fetchCurrentUser, type LoginResult, postLogin, postLogout } from '@/auth/authApi.ts'
+import { AuthContext, type AuthContextValue } from '@/auth/AuthContext.ts'
+import {
+  fetchCurrentUser,
+  type InvitationAcceptance,
+  type LoginResult,
+  postAcceptInvitation,
+  postLogin,
+  postLogout,
+} from '@/auth/authApi.ts'
 import type { PublicUser } from '@/auth/user.ts'
 
 // A frame powered back on can boot before the Wi-Fi or the API: ask again instead of showing /login.
@@ -49,9 +56,10 @@ function useSessionState(): {
   return { user, setUser, isLoading }
 }
 
-export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
-  const { user, setUser, isLoading } = useSessionState()
+type AuthActions = Pick<AuthContextValue, 'login' | 'acceptInvitation' | 'logout' | 'dropUser'>
 
+// Both ways in set the user on success only: a failed attempt keeps the current state.
+function useAuthActions(setUser: (user: PublicUser | null) => void): AuthActions {
   const login = useCallback(
     async (email: string, password: string): Promise<LoginResult> => {
       const result = await postLogin(email, password)
@@ -61,6 +69,15 @@ export function AuthProvider({ children }: { children: ReactNode }): JSX.Element
     [setUser],
   )
 
+  const acceptInvitation = useCallback(
+    async (acceptance: InvitationAcceptance): Promise<LoginResult> => {
+      const result = await postAcceptInvitation(acceptance)
+      if (result.isSuccess) setUser(result.user)
+      return result
+    },
+    [setUser],
+  )
+
   const logout = useCallback(async (): Promise<void> => {
     await postLogout()
     setUser(null)
@@ -68,9 +85,16 @@ export function AuthProvider({ children }: { children: ReactNode }): JSX.Element
 
   const dropUser = useCallback((): void => setUser(null), [setUser])
 
+  return { login, acceptInvitation, logout, dropUser }
+}
+
+export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
+  const { user, setUser, isLoading } = useSessionState()
+  const { login, acceptInvitation, logout, dropUser } = useAuthActions(setUser)
+
   const value = useMemo(
-    () => ({ user, isLoading, login, logout, dropUser }),
-    [user, isLoading, login, logout, dropUser],
+    () => ({ user, isLoading, login, acceptInvitation, logout, dropUser }),
+    [user, isLoading, login, acceptInvitation, logout, dropUser],
   )
 
   return <AuthContext value={value}>{children}</AuthContext>
```

- [ ] **Step 4: A shared text field**

Create `client/src/components/form/TextField.tsx`:

```tsx
import type { JSX } from 'react'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'

type TextFieldProps = {
  id: string
  label: string
  type: 'email' | 'password' | 'text'
  autoComplete: string
  value: string
  onChange: (value: string) => void
  minLength?: number
  maxLength?: number
}

// Every field of the invitation forms is required: an empty one never reaches the API.
export function TextField({
  id,
  label,
  value,
  onChange,
  ...inputProps
}: TextFieldProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        {...inputProps}
      />
    </div>
  )
}
```

- [ ] **Step 5: The invite form and page**

Create `client/src/components/auth/InviteForm.tsx`:

```tsx
import { type JSX, type SubmitEvent, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/auth/AuthContext.ts'
import { TextField } from '@/components/form/TextField.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'

// Mirror the server's limits (invitations.service.ts): the browser catches most mistakes
// before a request. Keep both in sync.
const DISPLAY_NAME_MAX_LENGTH = 50
const PASSWORD_MIN_LENGTH = 12
const PASSWORD_MAX_LENGTH = 128
const HOME_PATH = '/'
const PASSWORD_MISMATCH_MESSAGE = 'Les deux mots de passe ne correspondent pas.'

type InviteFields = { displayName: string; password: string; confirmation: string }

const EMPTY_FIELDS: InviteFields = { displayName: '', password: '', confirmation: '' }

type InviteFormState = {
  fields: InviteFields
  setField: (name: keyof InviteFields, value: string) => void
  isSending: boolean
  error: string
  handleSubmit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>
}

type InviteFieldsState = Pick<InviteFormState, 'fields' | 'setField'>

function useInviteFields(): InviteFieldsState {
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const setField = (name: keyof InviteFields, value: string): void =>
    setFields((current) => ({ ...current, [name]: value }))
  return { fields, setField }
}

function useInviteForm(token: string): InviteFormState {
  const { acceptInvitation } = useAuth()
  const navigate = useNavigate()
  const { fields, setField } = useInviteFields()
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    // No password reset exists: a typo would lock the account, so the client compares.
    if (fields.password !== fields.confirmation) {
      setError(PASSWORD_MISMATCH_MESSAGE)
      return
    }
    setError('')
    setIsSending(true)
    const { displayName, password } = fields
    const result = await acceptInvitation({ token, displayName, password })
    // Same render as the user being set: the "already logged in" card never flashes.
    if (result.isSuccess) {
      navigate(HOME_PATH, { replace: true })
      return
    }
    setError(result.message)
    setIsSending(false)
  }

  return { fields, setField, isSending, error, handleSubmit }
}

function PasswordFields({ fields, setField }: InviteFieldsState): JSX.Element {
  return (
    <>
      <TextField
        id="password"
        label="Mot de passe"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
        value={fields.password}
        onChange={(value) => setField('password', value)}
      />
      <TextField
        id="password-confirmation"
        label="Confirmer le mot de passe"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
        value={fields.confirmation}
        onChange={(value) => setField('confirmation', value)}
      />
    </>
  )
}

export function InviteForm({ token }: { token: string }): JSX.Element {
  const { fields, setField, isSending, error, handleSubmit } = useInviteForm(token)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <TextField
        id="display-name"
        label="Votre nom"
        type="text"
        autoComplete="name"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        value={fields.displayName}
        onChange={(value) => setField('displayName', value)}
      />
      <PasswordFields fields={fields} setField={setField} />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="lg" disabled={isSending}>
        {isSending ? 'Création…' : 'Créer mon compte'}
      </Button>
    </form>
  )
}
```

Create `client/src/pages/InvitePage.tsx`:

```tsx
import type { JSX } from 'react'
import { useParams } from 'react-router'
import { useAuth } from '@/auth/AuthContext.ts'
import { InviteForm } from '@/components/auth/InviteForm.tsx'
import { LogoutButton } from '@/components/auth/LogoutButton.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'

// An admin testing his own link must not burn it, nor lose his session without a word.
function LoggedInCard({ displayName }: { displayName: string }): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Rejoindre FamilyFrame</CardTitle>
        <CardDescription>
          Vous êtes connecté en tant que {displayName}. Déconnectez-vous pour utiliser cette
          invitation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LogoutButton />
      </CardContent>
    </Card>
  )
}

function JoinCard({ token }: { token: string }): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Rejoindre FamilyFrame</CardTitle>
        <CardDescription>Choisissez votre nom et votre mot de passe.</CardDescription>
      </CardHeader>
      <CardContent>
        <InviteForm token={token} />
      </CardContent>
    </Card>
  )
}

export default function InvitePage(): JSX.Element | null {
  const { user, isLoading } = useAuth()
  // The route always has the segment; an empty token is refused by the server like any other.
  const { token = '' } = useParams()

  // As on /login: no form flashing while /api/auth/me answers.
  if (isLoading) return null

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      {user === null ? <JoinCard token={token} /> : <LoggedInCard displayName={user.displayName} />}
    </main>
  )
}
```

Apply to `client/src/App.tsx` (public route, outside `RequireAuth`):

```diff
--- a/client/src/App.tsx
+++ b/client/src/App.tsx
@@ -3,6 +3,7 @@ import { BrowserRouter, Route, Routes } from 'react-router'
 import { AuthProvider } from './auth/AuthProvider.tsx'
 import { RequireAuth } from './auth/RequireAuth.tsx'
 import FramePage from './pages/FramePage.tsx'
+import InvitePage from './pages/InvitePage.tsx'
 import LibraryPage from './pages/LibraryPage.tsx'
 import LoginPage from './pages/LoginPage.tsx'
 
@@ -12,6 +13,7 @@ function App(): JSX.Element {
       <AuthProvider>
         <Routes>
           <Route path="/login" element={<LoginPage />} />
+          <Route path="/invite/:token" element={<InvitePage />} />
           <Route
             path="/"
             element={
```

- [ ] **Step 6: Gates**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  134 passed (134)`.

Check every function of the changed client files is at most 30 lines (`useAuthActions` is the longest, 28; `useInviteForm` 29).

Manual check (optional for the implementer, done by the controller in the final verification): `/invite/<token>` logged out shows « Rejoindre FamilyFrame » and the form; two different passwords show « Les deux mots de passe ne correspondent pas. » without a request; logged in, the « Vous êtes connecté en tant que … » card.

- [ ] **Step 7: Commit**

```bash
git add client/src/auth client/src/components/form client/src/components/auth/InviteForm.tsx client/src/pages/InvitePage.tsx client/src/App.tsx
git commit -F <message-file>
```

Message: `feat(client): add the invitation page`, body: `/invite/:token lets the invited person choose a display name and a password, confirmed twice since there is no reset, and lands on the library logged in. A logged-in visitor is asked to log out first, so an admin testing his own link does not burn it.` + the attribution lines.

---

### Task 8: Create invitation links on the admin page (PR D, `feat/client-invitations`)

**Files:**
- Create: `client/src/invitation.ts`, `client/src/invitationsApi.ts`, `client/src/auth/RequireAdmin.tsx`
- Create: `client/src/components/admin/BackToLibraryLink.tsx`, `InvitationForm.tsx`, `InvitationLink.tsx`, `client/src/pages/AdminInvitationsPage.tsx`
- Create: `client/src/components/library/LibraryActions.tsx`
- Modify: `client/src/App.tsx`, `client/src/pages/LibraryPage.tsx`

**Interfaces:**
- Consumes: `POST /api/invitations` (Task 4), `TextField` (Task 7), `useAuth().dropUser`, `errorMessage`, `UNAUTHORIZED_STATUS`.
- Produces (used by Task 9):
  ```ts
  // client/src/invitation.ts
  export type InvitationStatus = 'pending' | 'used' | 'expired'
  export type Invitation = { id: string; email: string; status: InvitationStatus; createdAt: string; expiresAt: string }
  export type CreatedInvitation = { invitation: Invitation; token: string }
  export function isInvitation(value: unknown): value is Invitation
  export function isCreatedInvitation(value: unknown): value is CreatedInvitation
  export function invitationLink(token: string): string
  // client/src/invitationsApi.ts
  export type CreateInvitationResult = { isSuccess: true; created: CreatedInvitation } | { isSuccess: false; message: string }
  export function postInvitation(email: string, onUnauthenticated: () => void): Promise<CreateInvitationResult>
  // client/src/components/admin/InvitationForm.tsx
  export function InvitationForm(props: { onCreated: (created: CreatedInvitation) => void }): JSX.Element
  ```

- [ ] **Step 1: Types, guards and link**

Create `client/src/invitation.ts`:

```ts
// Copy of server/src/types.ts, see why there. Keep both in sync.
export type InvitationStatus = 'pending' | 'used' | 'expired'

// createdAt and expiresAt are ISO 8601 strings: JSON has no dates.
export type Invitation = {
  id: string
  email: string
  status: InvitationStatus
  createdAt: string
  expiresAt: string
}

// The raw token, sent once at creation: the page builds the link from it.
export type CreatedInvitation = {
  invitation: Invitation
  token: string
}

const INVITATION_STATUSES: readonly InvitationStatus[] = ['pending', 'used', 'expired']

export function isInvitation(value: unknown): value is Invitation {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'email' in value &&
    typeof value.email === 'string' &&
    'status' in value &&
    INVITATION_STATUSES.some((status) => status === value.status) &&
    'createdAt' in value &&
    typeof value.createdAt === 'string' &&
    'expiresAt' in value &&
    typeof value.expiresAt === 'string'
  )
}

export function isCreatedInvitation(value: unknown): value is CreatedInvitation {
  return (
    typeof value === 'object' &&
    value !== null &&
    'invitation' in value &&
    isInvitation(value.invitation) &&
    'token' in value &&
    typeof value.token === 'string'
  )
}

// The origin the admin browses is the one the family reaches (the LAN address in dev, the
// public one later): no server setting to keep in step.
export function invitationLink(token: string): string {
  return `${window.location.origin}/invite/${token}`
}
```

Create `client/src/invitationsApi.ts`:

```ts
import { errorMessage, UNAUTHORIZED_STATUS } from '@/api.ts'
import { type CreatedInvitation, isCreatedInvitation } from '@/invitation.ts'

export type CreateInvitationResult =
  | { isSuccess: true; created: CreatedInvitation }
  | { isSuccess: false; message: string }

// A 401 calls onUnauthenticated: the session ended on the server, the provider drops the user.
export async function postInvitation(
  email: string,
  onUnauthenticated: () => void,
): Promise<CreateInvitationResult> {
  try {
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (res.status === UNAUTHORIZED_STATUS) onUnauthenticated()
    // Not JSON when the dev proxy answers for a stopped API.
    const data: unknown = await res.json().catch(() => null)
    if (res.ok && isCreatedInvitation(data)) return { isSuccess: true, created: data }
    return { isSuccess: false, message: errorMessage(data) }
  } catch {
    // fetch rejects only on network failure.
    return { isSuccess: false, message: errorMessage(null) }
  }
}
```

- [ ] **Step 2: `RequireAdmin` and the back link**

Create `client/src/components/admin/BackToLibraryLink.tsx`:

```tsx
import type { JSX } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button.tsx'

export function BackToLibraryLink(): JSX.Element {
  return (
    <Button asChild variant="ghost" size="sm">
      <Link to="/">Retour à la bibliothèque</Link>
    </Button>
  )
}
```

Create `client/src/auth/RequireAdmin.tsx`:

```tsx
import type { JSX, ReactNode } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { BackToLibraryLink } from '@/components/admin/BackToLibraryLink.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'

function AdminOnlyCard(): JSX.Element {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Invitations</CardTitle>
          <CardDescription>Cette page est réservée à l'administrateur.</CardDescription>
        </CardHeader>
        <CardContent>
          <BackToLibraryLink />
        </CardContent>
      </Card>
    </main>
  )
}

// Inside RequireAuth, so a user is there. The server's 403 is the real protection: this card
// only says why, instead of a silent redirect.
export function RequireAdmin({ children }: { children: ReactNode }): ReactNode {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <AdminOnlyCard />
  return children
}
```

- [ ] **Step 3: The creation form and the link**

Create `client/src/components/admin/InvitationForm.tsx`:

```tsx
import { type JSX, type SubmitEvent, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { TextField } from '@/components/form/TextField.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import type { CreatedInvitation } from '@/invitation.ts'
import { postInvitation } from '@/invitationsApi.ts'

type InvitationFormProps = {
  onCreated: (created: CreatedInvitation) => void
}

type InvitationFormState = {
  email: string
  setEmail: (email: string) => void
  isSending: boolean
  error: string
  handleSubmit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>
}

function useInvitationForm(onCreated: (created: CreatedInvitation) => void): InvitationFormState {
  const { dropUser } = useAuth()
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError('')
    setIsSending(true)
    const result = await postInvitation(email, dropUser)
    setIsSending(false)
    if (!result.isSuccess) {
      setError(result.message)
      return
    }
    setEmail('')
    onCreated(result.created)
  }

  return { email, setEmail, isSending, error, handleSubmit }
}

export function InvitationForm({ onCreated }: InvitationFormProps): JSX.Element {
  const { email, setEmail, isSending, error, handleSubmit } = useInvitationForm(onCreated)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <TextField
        id="invitation-email"
        label="E-mail de la personne invitée"
        type="email"
        autoComplete="off"
        value={email}
        onChange={setEmail}
      />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="lg" disabled={isSending}>
        {isSending ? 'Création…' : 'Créer le lien'}
      </Button>
    </form>
  )
}
```

Create `client/src/components/admin/InvitationLink.tsx`:

```tsx
import { type JSX, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'

const COPIED_FEEDBACK_MS = 2000

type LinkCopy = { isCopied: boolean; copy: () => Promise<void> }

function useLinkCopy(link: string): LinkCopy {
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (!isCopied) return
    const timer = setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [isCopied])

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(link)
      setIsCopied(true)
    } catch {
      // Refused by the browser: the selected input still allows a manual copy.
    }
  }

  return { isCopied, copy }
}

export function InvitationLink({ link }: { link: string }): JSX.Element {
  const { isCopied, copy } = useLinkCopy(link)

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="invitation-link">Lien d'invitation</Label>
      <Input
        id="invitation-link"
        readOnly
        value={link}
        onFocus={(event) => event.target.select()}
      />
      {/* The Clipboard API exists only in a secure context: not on http://<ip>:5180 from a phone. */}
      {'clipboard' in navigator && (
        <Button type="button" variant="outline" onClick={copy}>
          {isCopied ? 'Lien copié' : 'Copier le lien'}
        </Button>
      )}
      <p className="text-sm text-muted-foreground">
        Envoyez ce lien vous-même. Il sert une seule fois, pendant 7 jours, et ne sera plus affiché.
      </p>
    </div>
  )
}
```

Create `client/src/pages/AdminInvitationsPage.tsx`:

```tsx
import { type JSX, useState } from 'react'
import { BackToLibraryLink } from '@/components/admin/BackToLibraryLink.tsx'
import { InvitationForm } from '@/components/admin/InvitationForm.tsx'
import { InvitationLink } from '@/components/admin/InvitationLink.tsx'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import { invitationLink } from '@/invitation.ts'

export default function AdminInvitationsPage(): JSX.Element {
  // Only in memory: the server never shows the token again, a reload hides the link.
  const [link, setLink] = useState<string | null>(null)

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Invitations</CardTitle>
          <CardDescription>Créez un lien pour inviter un proche dans FamilyFrame.</CardDescription>
          <CardAction>
            <BackToLibraryLink />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <InvitationForm onCreated={({ token }) => setLink(invitationLink(token))} />
          {link && <InvitationLink link={link} />}
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 4: Route, with one `RequireAuth` layout route**

Replace `client/src/App.tsx` with (`App` would reach 38 lines with a third wrapped route: see Choices):

```tsx
import type { JSX } from 'react'
import { BrowserRouter, Outlet, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { RequireAdmin } from './auth/RequireAdmin.tsx'
import { RequireAuth } from './auth/RequireAuth.tsx'
import AdminInvitationsPage from './pages/AdminInvitationsPage.tsx'
import FramePage from './pages/FramePage.tsx'
import InvitePage from './pages/InvitePage.tsx'
import LibraryPage from './pages/LibraryPage.tsx'
import LoginPage from './pages/LoginPage.tsx'

// One layout route guards every logged-in page, instead of wrapping each one.
function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route
        element={
          <RequireAuth>
            <Outlet />
          </RequireAuth>
        }
      >
        <Route path="/" element={<LibraryPage />} />
        <Route path="/frame" element={<FramePage />} />
        <Route
          path="/admin/invitations"
          element={
            <RequireAdmin>
              <AdminInvitationsPage />
            </RequireAdmin>
          }
        />
      </Route>
    </Routes>
  )
}

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
```

- [ ] **Step 5: The « Invitations » link for admins**

Create `client/src/components/library/LibraryActions.tsx`:

```tsx
import { UserPlusIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/auth/AuthContext.ts'
import { LogoutButton } from '@/components/auth/LogoutButton.tsx'
import { Button } from '@/components/ui/button.tsx'

export function LibraryActions(): JSX.Element {
  const { user } = useAuth()

  return (
    <div className="flex gap-1">
      {user?.role === 'admin' && (
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/invitations">
            <UserPlusIcon aria-hidden data-icon="inline-start" />
            Invitations
          </Link>
        </Button>
      )}
      <LogoutButton />
    </div>
  )
}
```

Apply to `client/src/pages/LibraryPage.tsx`:

```diff
--- a/client/src/pages/LibraryPage.tsx
+++ b/client/src/pages/LibraryPage.tsx
@@ -1,5 +1,5 @@
 import type { JSX } from 'react'
-import { LogoutButton } from '@/components/auth/LogoutButton.tsx'
+import { LibraryActions } from '@/components/library/LibraryActions.tsx'
 import { LibrarySection } from '@/components/library/LibrarySection.tsx'
 import { UploadForm } from '@/components/library/UploadForm.tsx'
 import {
@@ -24,7 +24,7 @@ export default function LibraryPage(): JSX.Element {
             Ajoutez une photo à votre bibliothèque : elle s'affiche sur votre cadre.
           </CardDescription>
           <CardAction>
-            <LogoutButton />
+            <LibraryActions />
           </CardAction>
         </CardHeader>
         <CardContent>
```

- [ ] **Step 6: Gates**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  134 passed (134)`.

Check every function of the new and changed files is at most 30 lines (`AppRoutes` 26, `InvitationForm` 24, `useInvitationForm` 22).

Manual check (optional for the implementer, done by the controller): as admin, `/` shows « Invitations » next to « Se déconnecter »; `/admin/invitations` creates a link, shows it with « Copier le lien » (→ « Lien copié »), empties the email field; as member, no link on `/` and the refusal card on `/admin/invitations`.

- [ ] **Step 7: Commit**

```bash
git add client/src/invitation.ts client/src/invitationsApi.ts client/src/auth/RequireAdmin.tsx client/src/components/admin client/src/components/library/LibraryActions.tsx client/src/pages/AdminInvitationsPage.tsx client/src/pages/LibraryPage.tsx client/src/App.tsx
git commit -F <message-file>
```

Message: `feat(client): create invitation links on the admin page`, body: `/admin/invitations turns an email into a link built from the address the admin browses, shown once with a copy button when the Clipboard API exists. A member gets a card saying the page is for the admin; the library page shows the Invitations link to admins only.` + the attribution lines.

---

### Task 9: List invitations on the admin page, and the PR D docs (PR D, `feat/client-invitations`)

**Files:**
- Modify: `client/src/invitationsApi.ts`, `client/src/pages/AdminInvitationsPage.tsx`
- Create: `client/src/hooks/useInvitations.ts`, `client/src/components/admin/InvitationList.tsx`
- Modify: `ARCHITECTURE.md`, `README.md`

**Interfaces:**
- Consumes: `GET /api/invitations` (Task 4), `isInvitation` (Task 8), `Badge` (`components/ui/badge.tsx`).
- Produces:
  ```ts
  // client/src/invitationsApi.ts, added
  export type InvitationListResult = { isSuccess: true; invitations: Invitation[] } | { isSuccess: false; message: string }
  export function fetchInvitations(onUnauthenticated: () => void): Promise<InvitationListResult>
  // client/src/hooks/useInvitations.ts
  export type InvitationList = { invitations: Invitation[]; isLoading: boolean; error: string; reload: () => Promise<void> }
  export function useInvitations(): InvitationList
  ```

- [ ] **Step 1: `fetchInvitations`**

Apply to `client/src/invitationsApi.ts`:

```diff
--- a/client/src/invitationsApi.ts
+++ b/client/src/invitationsApi.ts
@@ -1,10 +1,29 @@
 import { errorMessage, UNAUTHORIZED_STATUS } from '@/api.ts'
-import { type CreatedInvitation, isCreatedInvitation } from '@/invitation.ts'
+import {
+  type CreatedInvitation,
+  type Invitation,
+  isCreatedInvitation,
+  isInvitation,
+} from '@/invitation.ts'
 
 export type CreateInvitationResult =
   | { isSuccess: true; created: CreatedInvitation }
   | { isSuccess: false; message: string }
 
+export type InvitationListResult =
+  | { isSuccess: true; invitations: Invitation[] }
+  | { isSuccess: false; message: string }
+
+function isInvitationList(value: unknown): value is { invitations: Invitation[] } {
+  return (
+    typeof value === 'object' &&
+    value !== null &&
+    'invitations' in value &&
+    Array.isArray(value.invitations) &&
+    value.invitations.every(isInvitation)
+  )
+}
+
 // A 401 calls onUnauthenticated: the session ended on the server, the provider drops the user.
 export async function postInvitation(
   email: string,
@@ -26,3 +45,17 @@ export async function postInvitation(
     return { isSuccess: false, message: errorMessage(null) }
   }
 }
+
+export async function fetchInvitations(
+  onUnauthenticated: () => void,
+): Promise<InvitationListResult> {
+  try {
+    const res = await fetch('/api/invitations')
+    if (res.status === UNAUTHORIZED_STATUS) onUnauthenticated()
+    const data: unknown = await res.json().catch(() => null)
+    if (res.ok && isInvitationList(data)) return { isSuccess: true, invitations: data.invitations }
+    return { isSuccess: false, message: errorMessage(data) }
+  } catch {
+    return { isSuccess: false, message: errorMessage(null) }
+  }
+}
```

- [ ] **Step 2: `useInvitations`, latest load only**

Create `client/src/hooks/useInvitations.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import type { Invitation } from '@/invitation.ts'
import { fetchInvitations } from '@/invitationsApi.ts'

export type InvitationList = {
  invitations: Invitation[]
  isLoading: boolean
  error: string
  reload: () => Promise<void>
}

export function useInvitations(): InvitationList {
  const { dropUser } = useAuth()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  // Two quick creations start two loads: only the latest one may set the list (step 2 lesson).
  const latestLoadId = useRef(0)

  const reload = useCallback(async (): Promise<void> => {
    latestLoadId.current += 1
    const loadId = latestLoadId.current
    const result = await fetchInvitations(dropUser)
    if (loadId !== latestLoadId.current) return
    setIsLoading(false)
    setError(result.isSuccess ? '' : result.message)
    if (result.isSuccess) setInvitations(result.invitations)
  }, [dropUser])

  useEffect(() => {
    reload()
  }, [reload])

  return { invitations, isLoading, error, reload }
}
```

- [ ] **Step 3: The list**

Create `client/src/components/admin/InvitationList.tsx`:

```tsx
import type { JSX } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import type { Invitation, InvitationStatus } from '@/invitation.ts'

type BadgeVariant = 'default' | 'secondary' | 'outline'

const STATUS_BADGES: Record<InvitationStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'En attente', variant: 'default' },
  used: { label: 'Utilisée', variant: 'secondary' },
  expired: { label: 'Expirée', variant: 'outline' },
}

// Same format as photoLabel, kept apart: the two labels may change separately.
function formatDay(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// A pending link matters by its deadline, a closed one by when it was made.
function invitationDate({ status, createdAt, expiresAt }: Invitation): string {
  if (status === 'pending') return `expire le ${formatDay(expiresAt)}`
  return `créée le ${formatDay(createdAt)}`
}

function InvitationRow({ invitation }: { invitation: Invitation }): JSX.Element {
  const { label, variant } = STATUS_BADGES[invitation.status]
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{invitation.email}</span>
        <span className="text-sm text-muted-foreground">{invitationDate(invitation)}</span>
      </div>
      <Badge variant={variant}>{label}</Badge>
    </li>
  )
}

type InvitationListProps = {
  invitations: Invitation[]
  isLoading: boolean
  error: string
}

export function InvitationList({
  invitations,
  isLoading,
  error,
}: InvitationListProps): JSX.Element {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>
  if (invitations.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune invitation pour l'instant.</p>
  }
  return (
    <ul className="divide-y">
      {invitations.map((invitation) => (
        <InvitationRow key={invitation.id} invitation={invitation} />
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: The page reloads the list after a creation**

Replace `client/src/pages/AdminInvitationsPage.tsx` with:

```tsx
import { type JSX, useState } from 'react'
import { BackToLibraryLink } from '@/components/admin/BackToLibraryLink.tsx'
import { InvitationForm } from '@/components/admin/InvitationForm.tsx'
import { InvitationLink } from '@/components/admin/InvitationLink.tsx'
import { InvitationList } from '@/components/admin/InvitationList.tsx'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import { useInvitations } from '@/hooks/useInvitations.ts'
import { type CreatedInvitation, invitationLink } from '@/invitation.ts'

function CreationCard({ onCreated }: { onCreated: () => void }): JSX.Element {
  // Only in memory: the server never shows the token again, a reload hides the link.
  const [link, setLink] = useState<string | null>(null)

  function handleCreated({ token }: CreatedInvitation): void {
    setLink(invitationLink(token))
    onCreated()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Invitations</CardTitle>
        <CardDescription>Créez un lien pour inviter un proche dans FamilyFrame.</CardDescription>
        <CardAction>
          <BackToLibraryLink />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <InvitationForm onCreated={handleCreated} />
        {link && <InvitationLink link={link} />}
      </CardContent>
    </Card>
  )
}

export default function AdminInvitationsPage(): JSX.Element {
  const { invitations, isLoading, error, reload } = useInvitations()

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-4 py-10">
      <CreationCard onCreated={reload} />
      <Card>
        <CardHeader>
          <CardTitle>Invitations envoyées</CardTitle>
        </CardHeader>
        <CardContent>
          <InvitationList invitations={invitations} isLoading={isLoading} error={error} />
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 5: Gates**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  134 passed (134)`.

Check every function of the new and changed files is at most 30 lines (`CreationCard` 25, `useInvitations` 24).

Manual check (optional for the implementer, done by the controller): the list shows each invitation with « En attente » and « expire le … », a used one with « Utilisée » and « créée le … »; a new link appears at the top right after « Créer le lien »; re-inviting the same email leaves one row for it.

- [ ] **Step 6: Commit the client**

```bash
git add client/src/invitationsApi.ts client/src/hooks/useInvitations.ts client/src/components/admin/InvitationList.tsx client/src/pages/AdminInvitationsPage.tsx
git commit -F <message-file>
```

Message: `feat(client): list invitations on the admin page`, body: `The admin sees every invitation with its status (pending, used, expired) and its end or creation date. The list reloads after each creation; only the latest load may set it.` + the attribution lines.

- [ ] **Step 7: ARCHITECTURE**

In `ARCHITECTURE.md`, `## Pages`:

1. In the Pages table, add after the `/login` row (let `pnpm format` realign the table):
   ```markdown
   | `/invite/:token` | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord |
   ```
   and after the `/frame` row:
   ```markdown
   | `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée ») |
   ```
   and in the `/` row, replace `; « Se déconnecter »` with `; « Invitations » (admin seulement) et « Se déconnecter »`.
2. Replace the beginning of the paragraph `\`/\` et \`/frame\` sont enveloppées dans \`RequireAuth\` (\`client/src/auth/\`) : sans utilisateur, redirection vers \`/login\` en gardant la page demandée.` with:
   ```markdown
   `/`, `/frame` et `/admin/invitations` sont enveloppées dans `RequireAuth` (`client/src/auth/`, une route parente dans `App.tsx`) : sans utilisateur, redirection vers `/login` en gardant la page demandée. `/admin/invitations` passe aussi par `RequireAdmin`, qui montre à un membre une carte « Cette page est réservée à l'administrateur. » plutôt qu'une redirection muette ; le `403` du serveur reste la vraie protection.
   ```
   (keep the rest of the paragraph, from `\`AuthProvider\` appelle`).
3. Add at the end of that same paragraph: ` Limite connue : le jeton d'invitation est dans l'URL de \`/invite/:token\`, donc dans l'historique du navigateur de la personne invitée ; acceptable pour un lien qui sert une fois et pendant 7 jours.`
4. In the SPA fallback paragraph, replace `pour \`/login\` et \`/frame\`` with `pour \`/login\`, \`/frame\`, \`/invite/:token\` et \`/admin/invitations\``, and append: ` Un serveur statique qui journalise les chemins écrirait aussi le jeton des liens d'invitation : à régler en J2 en choisissant son format de logs.`

- [ ] **Step 8: README**

In `README.md`:

1. In the services table, add after the `Cadre` row:
   ```markdown
   | Invitations   | http://localhost:5180/admin/invitations |
   ```
   (let `pnpm format` realign the table).
2. Add after the paragraph starting with `Sans session, la bibliothèque et le cadre redirigent`:
   ```markdown
   Inviter un proche : connecté en admin, ouvrir « Invitations » depuis la bibliothèque, saisir son e-mail et transmettre soi-même le lien obtenu (message, SMS : l'application n'envoie pas d'e-mail). Le lien sert une seule fois, pendant 7 jours ; il ouvre une page où la personne choisit son nom et son mot de passe. Créer les liens depuis l'adresse que la famille utilise (`http://<ip-du-pc>:5180` sur le réseau local), pas depuis `localhost` : le lien reprend l'adresse de la page. Réinviter le même e-mail remplace l'ancien lien.
   ```

- [ ] **Step 9: Check and commit the docs**

Run: `pnpm check` (format with `pnpm exec biome format --write README.md ARCHITECTURE.md` if the hook rejects them).

```bash
git add ARCHITECTURE.md README.md
git commit -F <message-file>
```

Message: `docs: describe the invitation pages` + the attribution lines.

---

## Final verification (controller)

- [x] `pnpm check && pnpm typecheck && pnpm build && pnpm test` on `feat/client-invitations`: green, `Tests  134 passed (134)`. Evidence: `pnpm check` (177 files, no fixes), `pnpm typecheck` and `pnpm build` green, `pnpm test`: `Tests  134 passed (134)`, 10 files.
- [x] Bruno gate command against a test API on port 3002 started from `feat/client-invitations`: 48 requests, 107 assertions, all passed. A second run right after also passes (fresh address per run). Evidence: Status PASS, `Requests 48 (48 Passed)`, `Assertions 107/107`.
- [ ] `git grep -n "currentUser" -- server/src`: every import comes from `auth.guard.js`. `git diff feat/library-page..feat/client-invitations -- server/src | grep -n "console\."`: no output.
- [x] Manual (spec, "Testing"), with Claude in Chrome or left to the author, dev client on 5180 against the API: Evidence: browser run passed (admin link, create link, `ACCOUNT_EXISTS` message, member refusal card, logged-in card on `/invite`, mismatch with zero requests, accept then logged in on `/`, reused link message, statuses). Not verified: the copy-button feedback (« Lien copié »), which browser automation could not exercise; left to the author.
  - as admin on `/admin/invitations`: create an invitation, copy the link (localhost: « Copier le lien » → « Lien copié »; from `http://<ip>:5180` on a phone: no button, manual copy from the selected input);
  - in a fresh browser context (private window, no cookie), open the link, create the account, land on `/` logged in; log out and log back in on `/login` with the new credentials;
  - reopen the used link and submit → « Ce lien d'invitation a déjà servi. Connectez-vous. »;
  - an expired link → « Ce lien d'invitation a expiré. Demandez-en un nouveau. » (no clock control from the browser: set one invitation's `expiresAt` in the past with Prisma Studio, `pnpm db:studio`, then submit its link; or note it as covered by the unit tests);
  - open a link while logged in as admin → the "already logged in" card, the invitation still « En attente » in the list;
  - re-invite the same email → the old link answers « Ce lien d'invitation n'est pas valide. Demandez-en un nouveau. », the list shows one row for it;
  - as member: no « Invitations » link on `/`, and `/admin/invitations` shows « Cette page est réservée à l'administrateur. ».
- [ ] `git log --oneline feat/library-page..feat/client-invitations`: one concern per commit, each ending with the attribution lines; `git diff --stat feat/library-page..feat/client-invitations` shows no `.env` file.
- [ ] Fresh-context review of the whole stack diff (`superpowers:requesting-code-review`), then `gh stack submit --auto` (draft PRs) and `gh stack view --json`.

---

## Drift Log

Format: `date · task/step · what the plan said · what was done · why`.

| Date | Task / step | Plan said | Done | Why |
| ---- | ----------- | --------- | ---- | --- |
| 2026-11-24 | Task 7 (`InviteForm`, 8524025) | `InviteForm` calls `setUser` then `navigate('/')` after a successful accept | `InvitePage` owns `isJoining`, raised before the request, and redirects with `<Navigate>` like `LoginPage` | `setUser` then `navigate` flashed the "already logged in" card (seen in the browser); the spec's "navigates to /" still holds |
| 2026-11-24 | Final review fix wave (controller, server tests, ARCHITECTURE) | Fixes land on the branch that owns the code | They landed on PR D's branch (`feat/client-invitations`) | Editing the lower branches would conflict on every upstack rebase (the controller was also edited in PR C) |
| 2026-11-24 | Checkpoint C1 (Task 1) | `pnpm db:push` then `pnpm db:seed`, recorded in the Drift Log | Both passed; boxes ticked | Controller checkpoint done after Task 1 |

---

## Self-review (done while writing the plan)

**1. Spec coverage**

| Spec item | Task |
| --- | --- |
| `Invitation` model (`tokenHash` unique, `email` index, `invitedById` relation, `expiresAt`, `usedAt`, `createdAt`), `User.invitations` | 1 |
| Seed deletes invitations before users, comment updated, no invitation seeded | 1 |
| `pnpm db:push` after A | C1 (plus a seed, see Choices) |
| `requireRole(role)` after `requireAuth`, `FORBIDDEN` 403, `auth.forbidden` (warn, `userId`) | 2 (in `auth.guard.ts`, see Choices) |
| `app.ts` builds `requireAdmin` once and hands it to the router | 4 |
| Token: `generateToken` / `hashToken` unchanged, SHA-256 in `tokenHash`; never in an API path | 3, 4, 6 |
| Repository `hasUserWithEmail`, `deleteUnusedByEmail`, `create` (`usedAt: null`), `findAll` (id desc) | 3 |
| Repository `findByTokenHash`, `createUser` (member, null on P2002), `markUsed` | 5 |
| Service `createInvitation` steps 1-5, `listInvitations`, `toInvitation` with status | 3 |
| Service `acceptInvitation` steps 1-7, refusal logs with `reason` | 5 |
| `openSession` extracted from `login`, behaviour and log unchanged | 6 |
| Controller `create` (201), `list` (200), `accept` (201 + cookie); router with `express.json()`, public `/accept` | 4, 6 |
| `types.ts` `InvitationStatus`, `Invitation`, `CreatedInvitation`; eight codes in `error-handler.ts` | 2, 3, 5 |
| Client `api.ts` eight codes and messages | 2, 3, 5 (see Choices) |
| `invitation.ts`, `invitationsApi.ts` (`postInvitation`, `fetchInvitations`) | 8, 9 |
| `postAcceptInvitation`, `acceptInvitation` in the provider and context | 7 |
| `RequireAdmin` refusal card with a link to `/` | 8 |
| `/invite/:token`: nothing while loading, logged-in card with `LogoutButton`, form (« Votre nom », « Mot de passe », « Confirmer le mot de passe », « Créer mon compte »), mismatch message without request, navigate to `/` | 7 |
| `/admin/invitations`: card « Invitations », « Retour à la bibliothèque », email field, « Créer le lien » / « Création… », link with copy (« Lien copié » 2 s) when the Clipboard API exists, select on focus, the « Envoyez ce lien vous-même… » text, field emptied, list reloaded | 8, 9 |
| `InvitationList`: badges, « expire le » / « créée le », `fr-FR`, empty text | 9 |
| « Invitations » ghost link (`UserPlusIcon`) for admins only | 8 |
| Unit tests: create, EMAIL_INVALID cases, ACCOUNT_EXISTS, created log, list statuses | 3 |
| Unit tests: accept token, order, display name, password, nominal, race, logs without PII | 5 |
| Unit tests: guard (admin, member + log, no user) | 2 |
| Unit tests: `openSession` | 6 |
| Unit tests: error handler, one case per new code | 2, 3, 5 |
| Bruno `invitations/` (`seq: 2`), `create/` 01-07, `list/` 01-03 | 4 |
| Bruno `accept/` 01-06, `05-nominal` checks `/api/auth/me` and the `used` status | 6 |
| Collection docs: accounts left by runs | 6 |
| Manual checks | Final verification |
| Docs: ARCHITECTURE (Données; error table; Logs; Authentification; JSON; Couches; API; Bruno; Pages, `RequireAdmin`, SPA fallback), README (how to invite, service row), `.env.example` unchanged | 1, 2, 4, 6, 9 |
| Delivery: 4 PRs, `gh stack add` at PR boundaries | Stack section, banners and first steps of Tasks 3, 5, 7 |
| Out of scope (emails, verification, reset, rate limiting, revocation, preview, admin invites, account listing, pagination, configured public URL) | not planned |

Gaps and contradictions found in the spec, resolved in "Choices made while planning": the guard's file (`auth.middleware.ts` cannot be unit-tested without env), `assembleInvitationsRouter`'s parameters (two in one section, `requireAdmin` handed over in another), the client codes' PR (D in the Delivery table, synced earlier here), the missing log for a malformed token (no lookup, no id), and the Bruno 7-day check across two clocks.

**2. Placeholder scan:** no "TBD", "TODO", "similar to Task N" or step without its content. `<message-file>` is the path of the commit message file the implementer writes in the scratchpad (same convention as the previous plans); every message's subject and body are given. Docs steps give the exact text to insert. Every code block was taken from code that passed the gates in a throwaway worktree while planning.

**3. Type consistency:** `InvitationsRepository` grows from four members (Task 3) to seven (Task 5), and `invitations.service.test.ts`'s `makeDeps` gains the three new fakes and `hashPassword` in the same task; `InvitationsServiceDeps` gains `hashPassword` in Task 5 and `app.ts` passes it in the same task; `createInvitationsController(service)` (Task 4) becomes `createInvitationsController(service, authService)` (Task 6) with `assembleInvitationsRouter` updated in the same step; `AuthService.openSession` (Task 6) is defined before the controller uses it; `RoleGuard` (Task 2) is accepted where `app.ts` expects a `RequestHandler` (Task 4); client `InvitationAcceptance` / `postAcceptInvitation` / `acceptInvitation` (Task 7), `Invitation` / `CreatedInvitation` / `isInvitation` / `invitationLink` / `postInvitation` (Task 8), `fetchInvitations` / `useInvitations` (Task 9) are defined before use. Test counts: 87 → 87 (T1) → 91 (T2) → 104 (T3) → 104 (T4) → 133 (T5) → 134 (T6) → 134 (T7-T9). Bruno counts (requests / assertions / `test()` calls): 32 / 70 / 17 → 32 / 70 / 17 (T1-T3) → 42 / 92 / 22 (T4) → 42 / 92 / 22 (T5) → 48 / 107 / 25 (T6-T9).
