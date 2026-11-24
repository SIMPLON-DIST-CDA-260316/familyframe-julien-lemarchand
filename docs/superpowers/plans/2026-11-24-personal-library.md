---
plan: personal-library
status: done
spec: docs/superpowers/specs/2026-11-24-personal-library-design.md
branch: feat/library-schema (PR A), feat/library-duplicates (PR B), feat/library-pagination (PR C), feat/library-page (PR D)
worktree: false
tasks_total: 8
tasks_done: 8
current_task: —
last_commit: e50e1f3
last_updated: 2026-11-24
---

# Personal Library (Step 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Working agreement (mandatory):** keep this plan in sync with reality. Check a step only when it is finished and its gate is green. Append every divergence to the Drift Log. Update the frontmatter (`tasks_done`, `current_task`, `last_commit`, `last_updated`) at each task boundary. When a drift produces a durable correction (path, command, signature, decision), amend the affected task block in place and log the amendment: implementers only receive their own task block. Never check a partial step; never delete a finished step or a drift entry. Under subagent-driven development, `.superpowers/sdd/progress.md` is the runtime authority; the frontmatter mirrors it.

**Goal:** Each account has its own library: a photo belongs to the user who uploaded it, the same file cannot enter a library twice, the list is paginated, real-time events reach only the owner, `/` becomes the library page and `/frame` shows the whole library of the logged-in user.

**Architecture:** `Photo` gains `ownerId` (relation to `User`) and `sha256`; `uploaderName` disappears. The photos service (factory with injected deps, `server/src/features/photos/`) scopes list and delete to the owner, refuses a known SHA-256 before sharp and Cloudinary, pages the list with a keyset cursor on the ObjectId, and destroys a Cloudinary image only when no photo references it. Events go to the `user:<id>` room. The client gets `photosApi.ts` (pages, all pages, upload), `photoSocket.ts` (shared socket), `usePhotoLibrary` and a `LibraryPage` built from the frame's grid and list. Four PRs in a `gh stack`.

**Tech Stack:** Node 24, TypeScript 7 (`nodenext`, `strict`, `verbatimModuleSyntax`), Express 5, Socket.IO 4, Prisma 6.19 (MongoDB), `node:crypto`, Vitest 5, Biome 2, Bruno CLI 4.2.0, React 19 + react-router 7 + shadcn/ui, `gh stack`.

## Global Constraints

- **No new dependency**, server or client. `createHash` comes from `node:crypto`. Prisma stays on v6.
- **Error codes (exact):** `PHOTO_DUPLICATE` 409, `QUERY_INVALID` 400 (new); `PHOTO_NOT_FOUND` 404 also for another user's photo (never 403).
- **Client messages (exact):** `PHOTO_DUPLICATE`: « Cette photo est déjà dans votre bibliothèque. »; `QUERY_INVALID`: « Requête invalide. Rechargez la page et réessayez. » Client error codes are synced in the same commit as the server types (both files say "keep both in sync").
- **Photo DTO (exact):** `{ id, url, thumbnailUrl, createdAt }`. `ownerId`, `sha256` and `cloudinaryId` never leave the server.
- **List (exact, from PR C):** `GET /api/photos?cursor=<photoId>&limit=<n>` → `200 { photos, nextCursor }`, newest first, keyset `id < cursor`; `DEFAULT_PAGE_SIZE = 30`, `MAX_PAGE_SIZE = 100`; the frame's `FRAME_PAGE_SIZE = 100`.
- **Real time:** `photo:new` and `photo:deleted` go to `io.to(userRoom(ownerId))` only; `userRoom(userId)` → `` `user:${userId}` ``, exported from `server/src/features/auth/auth.socket.ts`.
- **Log events (exact):** `photo.created` (info: `photoId`, `cloudinaryId`, `userId`), `photo.deleted` (info: `photoId`, `cloudinaryId`, `userId`, and from PR B `isImageDestroyed`), `photo.duplicate` (info: `userId` + `photoId` of the existing photo, or `userId` + `cloudinaryId` of the destroyed image after a race), `photo.orphaned` and `photo.unreadable` unchanged. Never log an email, a name, a password, a token, a hash of a secret or an environment value; only ids. Log only through `server/src/lib/logger.ts` (injected `logger` in the photos service).
- **UI text (French, exact):** « Photo du 24 novembre 2026 » (`photoLabel`), « Cette photo sera supprimée de votre bibliothèque et de votre cadre. Cette action est irréversible. », « Ajoutez une photo à votre bibliothèque : elle s'affiche sur votre cadre. », « Ma bibliothèque », « Charger plus », « Chargement… », « Aucune photo pour l'instant. ». `/` and `/frame` share the `familyframe.libraryLayout` storage key (`useLibraryLayout`, unchanged).
- **No `vi.mock`:** fakes are `vi.fn()` passed through the factory. Vitest imports are explicit (`import { describe, expect, it, vi } from 'vitest'`).
- **TypeScript (AGENTS.md):** no `as` casts, explicit return types on exported functions, literal unions rather than `enum`.
- **Code rules (`.claude/rules/`):** comment why, never what; no file-summary comments; name callback params after the item; no magic numbers in `src` code (test inputs may be literal); max 30 lines per function (logic; JSX-returning components follow the existing pages, but their handlers stay under 30), 300 per file; max 5 params; no flag parameters; booleans prefixed `is`/`has`/`should`; catch errors as `unknown`.
- Server imports use the `.js` extension; client imports use the `@/` alias with the `.ts`/`.tsx` extension.
- **Language:** code, comments, logs and commits in English; UI text, Bruno `docs` blocks, README and ARCHITECTURE in French.
- **Test API for gates:** the author's dev API may hold port 3000. From `server/`, start the test API in its **own background command**: `PORT=3002 npx tsx --env-file-if-exists=.env src/server.ts` (never combine it in one shell command with `cat`, `grep`, `sed` or another reader word: a hook blocks commands containing `.env` plus a reader word). It does not watch files: restart it after each code change. Wait for the `server.started` log line.
- **Bruno gate command** (from `server/bruno/`): `pnpm dlx @usebruno/cli@4.2.0 run . -r --env Local --disable-cookies --env-var baseUrl=http://localhost:3002` (the same as `pnpm test:bruno`, pointed at port 3002).
- **Stopping the test API:** in PowerShell, `$listener = Get-NetTCPConnection -LocalPort 3002 -State Listen | Select-Object -First 1 -ExpandProperty OwningProcess`, check `(Get-CimInstance Win32_Process -Filter "ProcessId=$listener").CommandLine` does **not** contain `worktrees`, then `Stop-Process -Id $listener`. Never stop a process you did not start, never one whose command line contains `worktrees`.
- **Database:** `pnpm db:seed` and `pnpm db:push` are **controller only** (the dev MongoDB is shared with another session, which must be warned before a wipe). Implementers only run `pnpm --filter server db:generate` (no database access). If `prisma generate` fails with `EPERM`, a running API holds the Prisma engine file: report it, do not kill processes you did not start.
- **Gates:** every commit passes `pnpm check` and `pnpm typecheck`. Every task ends green on `pnpm test`, `pnpm build`, and (server tasks) the Bruno gate command against the test API.
- **API change → Bruno in the same commit; business rule change → its colocated `*.test.ts` in the same commit.**
- **Commits:** Conventional Commits in English, message written to a file in the scratchpad and passed with `git commit -F <file>`. Every message ends with these two lines, after a blank line:
  ```
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Hm8u1MNisEcmacs5tNKshr
  ```
  A failing hook means no commit: fix (`pnpm check:fix`, then re-add only the task's files) and commit again.
- **Never read or print a `.env` file** (the variables are listed in `server/.env.example`).
- **Stack:** the controller creates branches with `gh stack`; implementers never switch branches, push or run `gh stack`. Never `gh pr merge`.

## Choices made while planning (not in the spec, or resolving a conflict with the code or the rules)

- **PNG cleanup moves from PR B to PR A.** `create/02` stores `createdPngId` and `delete/05-nominal-png` deletes it from Task 1 on, so every complete Bruno run leaves the member's library as it found it. Without it, the PNGs saved in PR A (no `sha256`) would break every read of the member's photos once PR B makes `sha256` required (Prisma rejects a document missing a required field).
- **No red Bruno run in Task 3.** Running the duplicate request against the old code would save a second `photo.jpg` without `sha256`, which the new code cannot read. Task 3 is red on its unit tests only; its Bruno requests run once, against the new code.
- **Database checkpoints (controller only):** C1 after Task 1 (`db:seed` then `db:push`), C2 before Task 3 (`db:seed` only if a Bruno run since C1 stopped before `photos/delete` finished, or someone uploaded by hand), C3 after Task 3 (`db:seed` then `db:push`). Task 3's Bruno gate passes before C3: the lookup works without the unique index, which only matters for the concurrent race (unit-tested).
- **`deleteOwned` uses `prisma.photo.delete({ where: { id, ownerId } })`** (one atomic query, as the spec wants). Extended unique filters are GA since Prisma 5 for every connector; verified in the generated client 6.19.3: `SessionWhereUniqueInput` is `AtLeast<{ id?, tokenHash?, userId?: StringFilter | string, … }, "id" | "tokenHash">`, so `PhotoWhereUniqueInput` will accept `ownerId` next to `id`. Bruno `delete/01-edge-photo-d-un-autre` proves the runtime behaviour (404, photo still listed for the member). Fallback, only if that request shows a 204: `findFirst({ where: { id, ownerId } })` then `deleteMany({ where: { id, ownerId } })`, returning `null` when the find misses or `count` is 0 (log it in the Drift Log).
- **The photos service is restructured like `auth.service.ts`** in Task 1: module-level functions taking `deps`, the factory only wires them. The nested version would pass 30 lines once duplicates and pagination arrive.
- **The listing orders by `id` from PR A** (`findLatest`, still capped at 20): the `(ownerId, id)` index lands in PR A, and ordering by id is ordering by creation.
- **`deleteStoredImage` returns a boolean** (true once Cloudinary destroyed the image), so `isImageDestroyed` is `false` when Cloudinary fails, not only when another photo still uses the image.
- **`photo.duplicate` is logged at `info`** (a user action; `http.request` already warns on the 409). The race variant logs `cloudinaryId` (the destroyed image) instead of `photoId` (the winner's id is unknown).
- **The listing tests live in `photos.service.list.test.ts`** with their own small `makeDeps`: the main test file would pass 300 lines.
- **Client file placement:** `photosApi.ts`, `photoSocket.ts`, `photoLabel.ts` and a new `photoList.ts` (`withNewPhoto`, `withoutPhoto`, shared by both hooks) sit in `client/src/`, next to `photo.ts` and `deletePhoto.ts`.
- **Upload code:** `postPhoto(file)` goes to `photosApi.ts` (result union like `CurrentUserResult`), so `UploadForm`'s handlers stay under 30 lines; the form uses a local `usePhotoUpload` hook and a `FileField` component. The success / error alerts move inside the card, under the form.
- **"Ma bibliothèque" is its own component** (`components/library/LibrarySection.tsx`), `LibraryPage` composes the upload card and it.
- **`pt-24` move:** the grid and the list keep their `p-8`; `LibraryScreen`'s wrapper gets `pt-16`, so the first row stays 6rem below the top, as before.
- **Menu label:** `` `Actions : ${photoLabel(photo)}` `` (« Actions : Photo du 24 novembre 2026 »).
- **Bruno list requests put the query in the `url`** (`/api/photos?limit=1`), without a `params:query` block.
- **The relation does not check the owner on create:** Prisma emulates relations on MongoDB and does not verify `ownerId` on insert. Nothing relies on it: `ownerId` always comes from the session.
- **The seed** is unchanged except its comment (photos now also block a user's deletion; it already deletes photos before users).

### Verified behavior

- **Express 5 query values:** the default "simple" parser gives `string` or `string[]` for a repeated key (`?limit=1&limit=2`); the service receives them as `unknown`.
- **Bruno `bru.getEnvVar('baseUrl')`** returns the `--env-var` override (step 1 runs on port 3002 used it in `delete/01-nominal`).
- **Bruno run order:** sub-folders sorted by `meta { seq }` in `folder.bru` (step 1 plan, "Verified tool behavior"). `auth/` (seq 1) runs first; inside `photos/`, `create` 1, `delete` 2, `list` 3 until Task 5 makes it `create` 1, `list` 2, `delete` 3.
- **Baselines (measured on `feat/library-schema` at e95a237):** `pnpm test` → `Test Files  6 passed (6)`, `Tests  70 passed (70)`; Bruno: 24 requests.

## File Map

| File | Task | Responsibility |
| --- | --- | --- |
| `server/prisma/schema.prisma` | 1, 3 | `Photo.ownerId`, relation, indexes; `sha256`, unique `(ownerId, sha256)` |
| `server/prisma/seed.ts` | 1 | comment only |
| `server/src/features/photos/photos.repository.ts` | 1, 3, 4, 5 | owner-scoped queries, P2002/P2025, count, page |
| `server/src/features/photos/photos.service.ts` | 1, 3, 4, 5 | ownership, SHA-256 duplicates, reference count, pagination rules |
| `server/src/features/photos/photos.service.test.ts` | 1, 3, 4, 5 | create / delete rules |
| `server/src/features/photos/photos.service.list.test.ts` | 5 | listing rules |
| `server/src/features/photos/photos.controller.ts` | 1, 5 | owner from the session, room events, page DTO |
| `server/src/features/auth/auth.socket.ts` | 1 | `userRoom` |
| `server/src/types.ts`, `client/src/api.ts` | 1, 3, 5 | `Photo`, `PhotoPage`, error codes, messages |
| `server/src/errors/error-handler.ts` (+ `.test.ts`) | 3, 5 | 409, 400 |
| `server/bruno/**` | 1, 3, 4, 5 | admin cookie, ownership, duplicate, pages, folder order |
| `client/src/photo.ts` | 2, 6 | `Photo` without name, `PhotoPage`, guards |
| `client/src/photoLabel.ts` | 2 | `formatPhotoDay`, `photoLabel` |
| `client/src/components/frame/{PhotoCaption,PhotoGridTile,PhotoListRow,PhotoSlide,PhotoStrip,DeletePhotoDialog}.tsx` | 2 | no name, labels by day |
| `client/src/photosApi.ts` | 6, 8 | page, all pages, upload |
| `client/src/hooks/usePhotoFeed.ts` | 6, 7 | whole library, local deletion, shared socket |
| `client/src/photoList.ts`, `client/src/photoSocket.ts` | 7 | list helpers, shared socket |
| `client/src/liveLoads.ts` | 6, 7, 8 | generation counter and replay of live events during a load, shared by both hooks |
| `client/src/components/frame/{PhotoGrid,PhotoList,LibraryScreen}.tsx` | 7 | `currentId` nullable, header offset |
| `client/src/hooks/usePhotoLibrary.ts` | 8 | library page state |
| `client/src/components/library/{UploadForm,LibrarySection}.tsx` | 8 | upload card form, "Ma bibliothèque" |
| `client/src/pages/LibraryPage.tsx` (was `UploadPage.tsx`), `client/src/App.tsx`, `client/src/pages/LoginPage.tsx`, `client/src/deletePhoto.ts` | 8 | route `/`, comments |
| `ARCHITECTURE.md`, `README.md` | 2, 4, 6, 8 | docs per PR |

## Stack and branches (controller only)

- **PR A `feat/library-schema`**: already checked out; holds the spec (e95a237) and this plan. Tasks 1-2. Base: `feat/client-login` (step 1 stack).
- **Before Task 3:** `gh stack add feat/library-duplicates` (PR B). Tasks 3-4.
- **Before Task 5:** `gh stack add feat/library-pagination` (PR C). Tasks 5-6.
- **Before Task 7:** `gh stack add feat/library-page` (PR D). Tasks 7-8.
- After the final review: `gh stack submit --auto` (draft PRs), then `gh stack view --json`.
- **Database checkpoints C1, C2, C3** are written between the tasks below. Each wipe: warn the other session first (it loses its photos, sessions and login), then run the commands from the repo root.

---

## PR A — `feat/library-schema`

### Task 1: Photos belong to their owner (PR A, `feat/library-schema`)

**Files:**
- Modify: `server/prisma/schema.prisma`, `server/prisma/seed.ts` (comment)
- Modify: `server/src/features/photos/photos.repository.ts`, `photos.service.ts`, `photos.controller.ts`
- Modify: `server/src/features/auth/auth.socket.ts`, `server/src/types.ts`
- Test: `server/src/features/photos/photos.service.test.ts`
- Modify: `server/bruno/environments/Local.bru`, `server/bruno/collection.bru`, `server/bruno/auth/folder.bru`, `server/bruno/photos/folder.bru`, `server/bruno/photos/create/{folder,01-nominal-jpeg,02-nominal-png,09-edge-json-malforme}.bru`, `server/bruno/photos/list/01-nominal.bru`, `server/bruno/photos/delete/folder.bru`
- Create: `server/bruno/auth/login/05-nominal-admin.bru`, `server/bruno/photos/delete/01-edge-photo-d-un-autre.bru`, `server/bruno/photos/delete/05-nominal-png.bru`
- Rename: `server/bruno/photos/delete/01-nominal.bru` → `02-nominal.bru`, `02-edge-deja-supprimee.bru` → `03-…`, `03-edge-id-invalide.bru` → `04-…`

**Interfaces:**
- Consumes: `currentUser(req)` (`features/auth/auth.middleware.ts`), `SocketServer` (`lib/socket-types.ts`).
- Produces (used by Tasks 3-5):
  ```ts
  // photos.repository.ts
  export type NewPhoto = { ownerId: string; url: string; cloudinaryId: string }
  export type PhotosRepository = {
    findLatest: (ownerId: string, limit: number) => Promise<PhotoRecord[]>
    create: (photo: NewPhoto) => Promise<PhotoRecord>
    deleteOwned: (id: string, ownerId: string) => Promise<PhotoRecord | null>
  }
  // photos.service.ts
  export type NewPhotoInput = { ownerId: string; file: UploadedFile | undefined }
  export type PhotoDeletion = { ownerId: string; id: string }
  export type PhotosService = {
    listLatest: (ownerId: string) => Promise<PhotoRecord[]>
    createPhoto: (input: NewPhotoInput) => Promise<PhotoRecord>
    deletePhoto: (deletion: PhotoDeletion) => Promise<string>
  }
  // auth.socket.ts
  export function userRoom(userId: string): string
  // types.ts
  export type Photo = { id: string; url: string; thumbnailUrl: string; createdAt: string }
  ```
  Bruno runtime variables: `adminCookie` (admin session), `createdPngId` (PNG of `create/02`).

- [x] **Step 1: Update the Bruno requests (the failing tests)**

Replace `server/bruno/environments/Local.bru` with:

```
vars {
  baseUrl: http://localhost:3000
  memberEmail: membre@familyframe.test
  memberPassword: membre-familyframe-dev
  memberDisplayName: Membre
  adminEmail: admin@familyframe.test
  adminPassword: admin-familyframe-dev
}
```

Create `server/bruno/auth/login/05-nominal-admin.bru`:

```
meta {
  name: Nominal - connexion de l'admin
  type: http
  seq: 5
}

post {
  url: {{baseUrl}}/api/auth/login
  body: json
  auth: none
}

body:json {
  {
    "email": "{{adminEmail}}",
    "password": "{{adminPassword}}"
  }
}

assert {
  res.status: eq 200
  res.body.user.role: eq admin
}

script:post-response {
  const setCookies = [].concat(res.getHeader('set-cookie') ?? [])
  const adminCookie = setCookies.find((cookie) => cookie.startsWith('ff_session='))
  test('un cookie de session pour l\'admin', () => {
    expect(adminCookie).to.match(/^ff_session=[0-9a-f]{64};/)
  })
  // Not sessionCookie: the member stays the account of every other request.
  if (adminCookie) {
    bru.setVar('adminCookie', adminCookie.split(';')[0])
  }
}

docs {
  NOMINAL → 200, le second compte de test. Son cookie va dans `adminCookie`,
  pas dans `sessionCookie` : les autres requêtes restent celles du membre, et
  les tests de `logout/` ne ferment que la session du membre. Une requête
  passe à l'admin avec `req.setHeader('Cookie', bru.getVar('adminCookie'))`
  dans son script.
}
```

In `server/bruno/auth/folder.bru`, replace the `docs` block with:

```
docs {
  Lancé avant les autres dossiers (`seq: 1`). `login/01` range le cookie de
  session du membre dans la variable `sessionCookie` ; `login/05` connecte
  aussi l'admin et range son cookie dans `adminCookie`. `logout/` ferme la
  session du membre, vérifie qu'elle ne sert plus, puis se reconnecte : les
  dossiers suivants gardent une session valide.

  Identifiants : ceux des deux comptes créés par `pnpm db:seed`, dans
  `environments/Local.bru`. Le membre est le compte de toutes les requêtes ;
  l'admin sert à vérifier qu'un compte ne touche pas aux photos d'un autre.
  Un utilisateur renvoyé par l'API vaut `{ id, email, displayName, role }`,
  jamais le hash du mot de passe.
}
```

In `server/bruno/collection.bru`, replace the paragraph that starts with `Les envois nominaux publient` with:

```
  Les envois nominaux publient de vraies photos (Cloudinary + MongoDB) dans
  la bibliothèque du membre de test : elles apparaissent sur son cadre, et
  `photos/delete` les supprime en fin de lancement. Le second compte (l'admin,
  `auth/login/05`, cookie dans la variable `adminCookie`) vérifie qu'un compte
  ne touche pas aux photos d'un autre.
```

Replace the `docs` block of `server/bruno/photos/folder.bru` with:

```
docs {
  Toutes les routes demandent une session (cookie `ff_session`, envoyé par
  `collection.bru`) : sans elle, 401 `UNAUTHENTICATED`. Chaque photo
  appartient au compte qui l'a envoyée : la liste, la suppression et les
  événements Socket.IO ne concernent que les photos du compte connecté.

  Une photo renvoyée par l'API : `{ id, url, thumbnailUrl, createdAt }`
  (`createdAt` en ISO 8601). Une erreur : `{ error }`, un code
  (`PHOTO_MISSING`, `UPLOAD_INVALID`, `UNAUTHENTICATED`,
  `PHOTO_NOT_FOUND`, `PHOTO_TOO_LARGE`, `FORMAT_UNSUPPORTED`, `IMAGE_UNREADABLE`,
  `SERVER_ERROR`) que le client traduit en français.
}
```

Replace the `docs` block of `server/bruno/photos/create/folder.bru` with:

```
docs {
  `POST /api/photos`, multipart : `photo` (un fichier JPEG, PNG ou WebP,
  10 Mo max). La photo entre dans la bibliothèque du compte connecté.

  Non couvert ici : le 413 `PHOTO_TOO_LARGE` demande un fichier de plus de
  10 Mo, trop lourd pour le dépôt. À tester à la main.
}
```

In `server/bruno/photos/create/01-nominal-jpeg.bru`, in the `assert` block replace `res.body.uploaderName: eq {{memberDisplayName}}` with `res.body.uploaderName: isUndefined`, and replace the first paragraph of its `docs` block (the three lines from `NOMINAL → 201` to `pas exposé : le serveur envoie des URL prêtes, …`) so that the block reads:

```
docs {
  NOMINAL → 201 avec la photo créée, dans la bibliothèque du compte connecté :
  la réponse ne porte plus de nom d'expéditeur (`uploaderName`).
  `cloudinaryId` n'est pas exposé : le serveur envoie des URL prêtes, `url`
  (photo entière) et `thumbnailUrl` (miniature), toutes deux en
  `f_auto,q_auto`. Le test télécharge les deux URL : une transformation
  refusée par Cloudinary ferait échouer le test.

  Les URL sont signées (`s--…--`). Le test de l'URL modifiée suppose
  « Strict transformations » activé dans la console Cloudinary (Settings →
  Security) : sans ce réglage, Cloudinary accepte n'importe quelle
  transformation et le test échoue.
}
```

In `server/bruno/photos/create/02-nominal-png.bru`, add after the `assert` block:

```
script:post-response {
  // photos/delete/05 deletes it: each run leaves the member's library as it found it.
  bru.setVar('createdPngId', res.body.id)
}
```

In `server/bruno/photos/create/09-edge-json-malforme.bru`, replace the `body:text` block with:

```
body:text {
  {"photo": "pas un fichier"
}
```

In `server/bruno/photos/list/01-nominal.bru`, replace the `docs` block with:

```
docs {
  NOMINAL → 200, au plus 20 photos du compte connecté, la plus récente en
  premier, chacune avec `url` et `thumbnailUrl`.
}
```

Rename the delete requests and fix their `seq`:

```bash
git mv server/bruno/photos/delete/03-edge-id-invalide.bru server/bruno/photos/delete/04-edge-id-invalide.bru
git mv server/bruno/photos/delete/02-edge-deja-supprimee.bru server/bruno/photos/delete/03-edge-deja-supprimee.bru
git mv server/bruno/photos/delete/01-nominal.bru server/bruno/photos/delete/02-nominal.bru
```

In the `meta` block, set `seq: 4` in `04-edge-id-invalide.bru`, `seq: 3` in `03-edge-deja-supprimee.bru`, `seq: 2` in `02-nominal.bru` (nothing else changes in them).

Create `server/bruno/photos/delete/01-edge-photo-d-un-autre.bru`:

```
meta {
  name: Edge - photo d'un autre compte
  type: http
  seq: 1
}

delete {
  url: {{baseUrl}}/api/photos/{{createdPhotoId}}
  body: none
  auth: none
}

script:pre-request {
  // Without them the request would test nothing, or the wrong account.
  if (!bru.getVar('createdPhotoId') || !bru.getVar('adminCookie')) {
    throw new Error('createdPhotoId ou adminCookie absent : lancer toute la collection, auth/login/05 et photos/create/01 doivent passer')
  }
  // The photo belongs to the member: the admin asks to delete it.
  req.setHeader('Cookie', bru.getVar('adminCookie'))
}

assert {
  res.status: eq 404
  res.body.error: eq PHOTO_NOT_FOUND
}

script:post-response {
  const axios = require('axios')
  // A script request does not get the collection headers: send the cookie itself.
  const listIds = async (cookie) => {
    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/photos`, {
      headers: { Cookie: cookie },
    })
    return list.data.map(({ id }) => id)
  }
  test('la photo est toujours dans la bibliothèque du membre', async () => {
    expect(await listIds(bru.getVar('sessionCookie'))).to.include(bru.getVar('createdPhotoId'))
  })
  test('elle n\'apparaît pas dans celle de l\'admin', async () => {
    expect(await listIds(bru.getVar('adminCookie'))).to.not.include(bru.getVar('createdPhotoId'))
  })
}

docs {
  EDGE → 404 PHOTO_NOT_FOUND : l'admin demande la suppression de la photo du
  membre. La réponse est celle d'une photo inconnue (pas de 403, qui dirait
  qu'elle existe). Le script vérifie ensuite que la photo est toujours dans
  la liste du membre et absente de celle de l'admin.
}
```

Create `server/bruno/photos/delete/05-nominal-png.bru`:

```
meta {
  name: Nominal - suppression du PNG
  type: http
  seq: 5
}

delete {
  url: {{baseUrl}}/api/photos/{{createdPngId}}
  body: none
  auth: none
}

script:pre-request {
  // Without it the request hits /api/photos/ and fails with a misleading status.
  if (!bru.getVar('createdPngId')) {
    throw new Error('createdPngId absent : lancer le dossier photos en entier, create/02 doit passer')
  }
}

assert {
  res.status: eq 204
}

docs {
  NOMINAL → 204 : supprime le PNG de `create/02`. Avec `02-nominal` (le JPEG
  de `create/01`), chaque lancement laisse la bibliothèque du membre comme il
  l'a trouvée.
}
```

Replace the `docs` block of `server/bruno/photos/delete/folder.bru` with:

```
docs {
  `DELETE /api/photos/:id` → 204 sans corps, et l'événement Socket.IO
  `photo:deleted` (l'id) pour les connexions du propriétaire. La photo d'un
  autre compte répond 404 `PHOTO_NOT_FOUND`, comme une photo inconnue.

  Ces requêtes suppriment les photos créées par `create/01` (variable
  `createdPhotoId`) et `create/02` (`createdPngId`) : lancer toute la
  collection, pas une requête seule (`01` demande aussi `adminCookie`, rangé
  par `auth/login/05`).
}
```

- [x] **Step 2: Run Bruno against the current code to verify it fails**

From `server/`, in its own background command: `PORT=3002 npx tsx --env-file-if-exists=.env src/server.ts`. Wait for `server.started`.

From `server/bruno/`: `pnpm dlx @usebruno/cli@4.2.0 run . -r --env Local --disable-cookies --env-var baseUrl=http://localhost:3002`
Expected: 27 requests, 3 failed: `photos/create/01-nominal-jpeg` (`uploaderName` is still returned), `photos/delete/01-edge-photo-d-un-autre` (204: the admin deleted the member's photo), `photos/delete/02-nominal` (404: already deleted). The 24 others pass.

Stop the test API (Global Constraints, "Stopping the test API").

- [x] **Step 3: Write the failing unit tests**

Replace `server/src/features/photos/photos.service.test.ts` with:

```ts
import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { PhotoRecord, PhotosRepository } from './photos.repository.js'
import { createPhotosService, type PhotosServiceDeps, type UploadedFile } from './photos.service.js'

const OWNER_ID = '6b044f9d56a44767c7079b01'
const JPEG_FILE: UploadedFile = { buffer: Buffer.from('raw upload'), mimetype: 'image/jpeg' }
const FRAME_JPEG = Buffer.from('frame jpeg')
const IMAGE = { url: 'https://res.cloudinary.com/demo/photo.jpg', cloudinaryId: 'familyframe/abc' }
const RECORD: PhotoRecord = {
  id: '6b044f9d56a44767c7079a01',
  ownerId: OWNER_ID,
  ...IMAGE,
  createdAt: new Date('2026-11-23T10:00:00Z'),
}
const LATEST_PHOTOS_LIMIT = 20

// Every dependency succeeds by default; each test breaks only the one it is about.
function makeDeps() {
  return {
    repository: {
      findLatest: vi.fn<PhotosRepository['findLatest']>().mockResolvedValue([RECORD]),
      create: vi.fn<PhotosRepository['create']>().mockResolvedValue(RECORD),
      deleteOwned: vi.fn<PhotosRepository['deleteOwned']>().mockResolvedValue(RECORD),
    },
    toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>().mockResolvedValue(FRAME_JPEG),
    uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>().mockResolvedValue(IMAGE),
    deleteImage: vi.fn<PhotosServiceDeps['deleteImage']>().mockResolvedValue(undefined),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

describe('createPhoto', () => {
  it('saves the uploaded image for its owner and returns the record', async () => {
    const deps = makeDeps()

    const record = await createPhotosService(deps).createPhoto({
      ownerId: OWNER_ID,
      file: JPEG_FILE,
    })

    expect(record).toBe(RECORD)
    expect(deps.toFrameJpeg).toHaveBeenCalledWith(JPEG_FILE.buffer)
    expect(deps.uploadImage).toHaveBeenCalledWith(FRAME_JPEG)
    expect(deps.repository.create).toHaveBeenCalledWith({ ownerId: OWNER_ID, ...IMAGE })
  })

  it('logs the created photo by its identifiers and its owner id', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file: JPEG_FILE })

    expect(deps.logger.info).toHaveBeenCalledWith('photo.created', {
      photoId: RECORD.id,
      cloudinaryId: RECORD.cloudinaryId,
      userId: OWNER_ID,
    })
  })

  it('rejects a missing file', async () => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file: undefined }),
    ).rejects.toMatchObject({ code: 'PHOTO_MISSING' })
  })

  it('rejects a format other than JPEG, PNG or WebP', async () => {
    const deps = makeDeps()
    const gif: UploadedFile = { buffer: Buffer.from('gif'), mimetype: 'image/gif' }

    await expect(
      createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file: gif }),
    ).rejects.toMatchObject({ code: 'FORMAT_UNSUPPORTED' })
    expect(deps.toFrameJpeg).not.toHaveBeenCalled()
  })

  it.each(['image/png', 'image/webp'])('accepts %s', async (mimetype) => {
    const deps = makeDeps()
    const file: UploadedFile = { buffer: Buffer.from('image'), mimetype }

    await createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file })

    expect(deps.toFrameJpeg).toHaveBeenCalledWith(file.buffer)
  })

  it('turns an image sharp cannot read into IMAGE_UNREADABLE and logs the sharp error', async () => {
    const deps = makeDeps()
    const sharpError = new Error('Input buffer contains unsupported image format')
    deps.toFrameJpeg.mockRejectedValue(sharpError)

    await expect(
      createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file: JPEG_FILE }),
    ).rejects.toMatchObject({ code: 'IMAGE_UNREADABLE' })
    expect(deps.uploadImage).not.toHaveBeenCalled()
    expect(deps.logger.warn).toHaveBeenCalledWith('photo.unreadable', { error: sharpError })
  })

  it('lets a Cloudinary failure through unchanged', async () => {
    const deps = makeDeps()
    const cloudinaryError = new Error('Cloudinary is down')
    deps.uploadImage.mockRejectedValue(cloudinaryError)

    await expect(
      createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file: JPEG_FILE }),
    ).rejects.toBe(cloudinaryError)
    expect(deps.repository.create).not.toHaveBeenCalled()
  })

  it('logs the orphaned Cloudinary image when the database fails', async () => {
    const deps = makeDeps()
    const databaseError = new Error('database is down')
    deps.repository.create.mockRejectedValue(databaseError)

    await expect(
      createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file: JPEG_FILE }),
    ).rejects.toBe(databaseError)
    expect(deps.logger.error).toHaveBeenCalledWith('photo.orphaned', {
      cloudinaryId: IMAGE.cloudinaryId,
      error: databaseError,
    })
    expect(deps.logger.info).not.toHaveBeenCalled()
  })
})

describe('listLatest', () => {
  it("returns the owner's latest photos from the repository", async () => {
    const deps = makeDeps()

    const records = await createPhotosService(deps).listLatest(OWNER_ID)

    expect(records).toEqual([RECORD])
    expect(deps.repository.findLatest).toHaveBeenCalledWith(OWNER_ID, LATEST_PHOTOS_LIMIT)
  })
})

describe('deletePhoto', () => {
  it("deletes the owner's record, then its Cloudinary image, and returns the stored id", async () => {
    const deps = makeDeps()

    const deletedId = await createPhotosService(deps).deletePhoto({
      ownerId: OWNER_ID,
      id: RECORD.id,
    })

    expect(deletedId).toBe(RECORD.id)
    expect(deps.repository.deleteOwned).toHaveBeenCalledWith(RECORD.id, OWNER_ID)
    expect(deps.deleteImage).toHaveBeenCalledWith(IMAGE.cloudinaryId)
    expect(deps.repository.deleteOwned.mock.invocationCallOrder[0]).toBeLessThan(
      deps.deleteImage.mock.invocationCallOrder[0],
    )
  })

  it('logs the deleted photo by its identifiers and its owner id', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).deletePhoto({ ownerId: OWNER_ID, id: RECORD.id })

    expect(deps.logger.info).toHaveBeenCalledWith('photo.deleted', {
      photoId: RECORD.id,
      cloudinaryId: RECORD.cloudinaryId,
      userId: OWNER_ID,
    })
  })

  it('returns the stored id when the URL has it in upper case', async () => {
    const deps = makeDeps()

    const deletedId = await createPhotosService(deps).deletePhoto({
      ownerId: OWNER_ID,
      id: RECORD.id.toUpperCase(),
    })

    expect(deletedId).toBe(RECORD.id)
  })

  it("rejects an id with no photo of this owner: unknown, already deleted, or someone else's", async () => {
    const deps = makeDeps()
    deps.repository.deleteOwned.mockResolvedValue(null)

    await expect(
      createPhotosService(deps).deletePhoto({ ownerId: OWNER_ID, id: RECORD.id }),
    ).rejects.toMatchObject({ code: 'PHOTO_NOT_FOUND' })
    expect(deps.deleteImage).not.toHaveBeenCalled()
  })

  it('rejects an id that is not an ObjectId without querying the database', async () => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).deletePhoto({ ownerId: OWNER_ID, id: 'abc' }),
    ).rejects.toMatchObject({ code: 'PHOTO_NOT_FOUND' })
    expect(deps.repository.deleteOwned).not.toHaveBeenCalled()
  })

  it('still succeeds when Cloudinary fails, and logs the orphaned image', async () => {
    const deps = makeDeps()
    const cloudinaryError = new Error('Cloudinary is down')
    deps.deleteImage.mockRejectedValue(cloudinaryError)

    await expect(
      createPhotosService(deps).deletePhoto({ ownerId: OWNER_ID, id: RECORD.id }),
    ).resolves.toBe(RECORD.id)
    expect(deps.logger.error).toHaveBeenCalledWith('photo.orphaned', {
      cloudinaryId: IMAGE.cloudinaryId,
      error: cloudinaryError,
    })
  })

  it('lets a database failure through without touching Cloudinary', async () => {
    const deps = makeDeps()
    const databaseError = new Error('database is down')
    deps.repository.deleteOwned.mockRejectedValue(databaseError)

    await expect(
      createPhotosService(deps).deletePhoto({ ownerId: OWNER_ID, id: RECORD.id }),
    ).rejects.toBe(databaseError)
    expect(deps.deleteImage).not.toHaveBeenCalled()
  })
})
```

- [x] **Step 4: Run the unit tests to verify they fail**

Run: `pnpm test`
Expected: FAIL in `photos.service.test.ts` (the service still calls `deleteById` and logs without `userId`); the other files pass.

- [x] **Step 5: Change the schema and regenerate the client**

In `server/prisma/schema.prisma`, add `photos       Photo[]` as the last field of `model User` (after `sessions     Session[]`), and replace `model Photo` with:

```prisma
model Photo {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  ownerId      String   @db.ObjectId
  owner        User     @relation(fields: [ownerId], references: [id])
  url          String
  cloudinaryId String
  createdAt    DateTime @default(now())

  @@index([ownerId, id])
  @@index([cloudinaryId])
}
```

Run: `pnpm --filter server exec prisma format` then `pnpm --filter server db:generate`
Expected: `✔ Generated Prisma Client`. (No database access: `db:push` is the controller's checkpoint C1.)

In `server/prisma/seed.ts`, replace the two comment lines above `await prisma.session.deleteMany()` with:

```ts
  // Sessions and photos first: Prisma emulates the relations on MongoDB and refuses
  // to delete a user that still has sessions or photos.
```

- [x] **Step 6: Scope the repository to the owner**

Replace `server/src/features/photos/photos.repository.ts` with:

```ts
import { type Photo, Prisma, type PrismaClient } from '@prisma/client'

export type PhotoRecord = Photo

export type NewPhoto = { ownerId: string; url: string; cloudinaryId: string }

export type PhotosRepository = {
  findLatest: (ownerId: string, limit: number) => Promise<PhotoRecord[]>
  create: (photo: NewPhoto) => Promise<PhotoRecord>
  deleteOwned: (id: string, ownerId: string) => Promise<PhotoRecord | null>
}

// P2025: no record matches: unknown, already deleted by another request, or someone else's.
function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}

export function createPhotosRepository(prisma: PrismaClient): PhotosRepository {
  return {
    // An ObjectId starts with its creation time: by id is newest first.
    findLatest: (ownerId, limit) =>
      prisma.photo.findMany({ where: { ownerId }, orderBy: { id: 'desc' }, take: limit }),
    create: (photo) => prisma.photo.create({ data: photo }),
    // One atomic query: Prisma accepts the owner next to the unique id.
    deleteOwned: async (id, ownerId) => {
      try {
        return await prisma.photo.delete({ where: { id, ownerId } })
      } catch (error: unknown) {
        if (isRecordNotFound(error)) {
          return null
        }
        throw error
      }
    },
  }
}
```

- [x] **Step 7: Scope the service to the owner**

Replace `server/src/features/photos/photos.service.ts` with:

```ts
import { AppError } from '../../errors/app-error.js'
import type { UploadedImage } from '../../lib/cloudinary.js'
import type { Logger } from '../../lib/logger.js'
import type { NewPhoto, PhotoRecord, PhotosRepository } from './photos.repository.js'

const LATEST_PHOTOS_LIMIT = 20
const ALLOWED_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp']
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i

export type UploadedFile = { buffer: Buffer; mimetype: string }

// ownerId is the logged-in account: a photo belongs to whoever uploaded it.
export type NewPhotoInput = { ownerId: string; file: UploadedFile | undefined }

export type PhotoDeletion = { ownerId: string; id: string }

export type PhotosServiceDeps = {
  repository: PhotosRepository
  toFrameJpeg: (input: Buffer) => Promise<Buffer>
  uploadImage: (jpeg: Buffer) => Promise<UploadedImage>
  deleteImage: (cloudinaryId: string) => Promise<void>
  logger: Logger
}

export type PhotosService = {
  listLatest: (ownerId: string) => Promise<PhotoRecord[]>
  createPhoto: (input: NewPhotoInput) => Promise<PhotoRecord>
  deletePhoto: (deletion: PhotoDeletion) => Promise<string>
}

function parseFile(file: UploadedFile | undefined): UploadedFile {
  if (!file) {
    throw new AppError('PHOTO_MISSING')
  }
  // Cheap first filter: the browser's mimetype can lie, sharp checks for real.
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new AppError('FORMAT_UNSUPPORTED')
  }
  return file
}

// Prisma fails on an id that is not an ObjectId: that would be a 500, not a 404.
function parsePhotoId(id: string): string {
  if (!OBJECT_ID_PATTERN.test(id)) {
    throw new AppError('PHOTO_NOT_FOUND')
  }
  return id
}

async function convertToFrameJpeg(
  { toFrameJpeg, logger }: PhotosServiceDeps,
  input: Buffer,
): Promise<Buffer> {
  try {
    return await toFrameJpeg(input)
  } catch (error: unknown) {
    logger.warn('photo.unreadable', { error })
    throw new AppError('IMAGE_UNREADABLE')
  }
}

async function saveRecord(
  { repository, logger }: PhotosServiceDeps,
  photo: NewPhoto,
): Promise<PhotoRecord> {
  try {
    return await repository.create(photo)
  } catch (error: unknown) {
    // The image is on Cloudinary with no record pointing to it: its id is needed to clean up.
    logger.error('photo.orphaned', { cloudinaryId: photo.cloudinaryId, error })
    throw error
  }
}

// The record is already gone: a Cloudinary failure only leaves an orphan image,
// so the deletion still succeeds.
async function deleteStoredImage(
  { deleteImage, logger }: PhotosServiceDeps,
  cloudinaryId: string,
): Promise<void> {
  try {
    await deleteImage(cloudinaryId)
  } catch (error: unknown) {
    logger.error('photo.orphaned', { cloudinaryId, error })
  }
}

async function createPhoto(
  deps: PhotosServiceDeps,
  { ownerId, file }: NewPhotoInput,
): Promise<PhotoRecord> {
  const validFile = parseFile(file)
  const jpeg = await convertToFrameJpeg(deps, validFile.buffer)
  // Cloudinary and database failures are ours: they stay 500s.
  const image = await deps.uploadImage(jpeg)
  const record = await saveRecord(deps, { ownerId, ...image })
  deps.logger.info('photo.created', {
    photoId: record.id,
    cloudinaryId: record.cloudinaryId,
    userId: ownerId,
  })
  return record
}

// Database first: it decides what the frame shows.
// Returns the stored id: the one in the URL may differ in case.
async function deletePhoto(
  deps: PhotosServiceDeps,
  { ownerId, id }: PhotoDeletion,
): Promise<string> {
  // Someone else's photo answers like a missing one: its existence does not leak.
  const record = await deps.repository.deleteOwned(parsePhotoId(id), ownerId)
  if (!record) {
    throw new AppError('PHOTO_NOT_FOUND')
  }
  await deleteStoredImage(deps, record.cloudinaryId)
  deps.logger.info('photo.deleted', {
    photoId: record.id,
    cloudinaryId: record.cloudinaryId,
    userId: ownerId,
  })
  return record.id
}

export function createPhotosService(deps: PhotosServiceDeps): PhotosService {
  return {
    listLatest: (ownerId) => deps.repository.findLatest(ownerId, LATEST_PHOTOS_LIMIT),
    createPhoto: (input) => createPhoto(deps, input),
    deletePhoto: (deletion) => deletePhoto(deps, deletion),
  }
}
```

- [x] **Step 8: Room helper, controller and DTO**

In `server/src/features/auth/auth.socket.ts`, add after `toHandshakeError`:

```ts
// One spelling of the room name: the socket joins it, the photos controller emits to it.
export function userRoom(userId: string): string {
  return `user:${userId}`
}
```

and replace the two lines

```ts
    // Step 2 sends each user's photos to this room; broadcasting stays global for now.
    socket.join(`user:${userId}`)
```

with:

```ts
    socket.join(userRoom(userId))
```

In `server/src/types.ts`, remove the line `  uploaderName: string` from `Photo`.

Replace `server/src/features/photos/photos.controller.ts` with:

```ts
import type { Request, Response } from 'express'
import { deliveryUrls } from '../../lib/cloudinary.js'
import type { SocketServer } from '../../lib/socket-types.js'
import type { Photo } from '../../types.js'
import { currentUser } from '../auth/auth.middleware.js'
import { userRoom } from '../auth/auth.socket.js'
import type { PhotoRecord } from './photos.repository.js'
import type { PhotosService } from './photos.service.js'

export type PhotosController = {
  list: (req: Request, res: Response) => Promise<void>
  create: (req: Request, res: Response) => Promise<void>
  remove: (req: Request<{ id: string }>, res: Response) => Promise<void>
}

// cloudinaryId and ownerId stay on the server: the client gets ready-made URLs.
function toPhotoDto(record: PhotoRecord): Photo {
  return {
    id: record.id,
    ...deliveryUrls(record.cloudinaryId),
    createdAt: record.createdAt.toISOString(),
  }
}

export function createPhotosController(service: PhotosService, io: SocketServer): PhotosController {
  return {
    async list(req, res) {
      const records = await service.listLatest(currentUser(req).id)
      res.json(records.map(toPhotoDto))
    },

    async create(req, res) {
      const ownerId = currentUser(req).id
      const record = await service.createPhoto({ ownerId, file: req.file })
      const photo = toPhotoDto(record)
      // Only the owner's frames and pages: other accounts never see the photo.
      io.to(userRoom(ownerId)).emit('photo:new', photo)
      res.status(201).json(photo)
    },

    async remove(req, res) {
      const ownerId = currentUser(req).id
      const deletedId = await service.deletePhoto({ ownerId, id: req.params.id })
      io.to(userRoom(ownerId)).emit('photo:deleted', deletedId)
      res.status(204).end()
    },
  }
}
```

- [x] **Step 9: Run the unit tests and the typecheck**

Run: `pnpm test`
Expected: PASS, `Tests  70 passed (70)`.

Run: `pnpm --filter server typecheck`
Expected: no error. (`pnpm typecheck` for the whole repo still passes: the client's `Photo` copy is its own type; Task 2 updates it.)

- [x] **Step 10: Run Bruno against the new code**

Start the test API again (own background command, from `server/`): `PORT=3002 npx tsx --env-file-if-exists=.env src/server.ts`. Wait for `server.started`.

From `server/bruno/`: `pnpm dlx @usebruno/cli@4.2.0 run . -r --env Local --disable-cookies --env-var baseUrl=http://localhost:3002`
Expected: status PASS, 27 requests, all passed. If `delete/01-edge-photo-d-un-autre` answers 204, the extended unique filter did not apply: switch `deleteOwned` to the fallback written in "Choices made while planning", rerun, and log it in the Drift Log.

Stop the test API.

- [x] **Step 11: Gates**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  70 passed (70)`.

Run: `git grep -n uploaderName -- server/src server/bruno server/prisma`
Expected: one hit only, `server/bruno/photos/create/01-nominal-jpeg.bru` (`res.body.uploaderName: isUndefined` and its docs line).

- [x] **Step 12: Commit**

```bash
git add -A server/prisma server/src/features server/src/types.ts server/bruno
git commit -F <message-file>
```

Message: `feat(server): scope photos to their owner`, body: `A photo now belongs to the account that uploaded it (ownerId) instead of carrying an uploader name. The list, the deletion and the Socket.IO events only reach that account; another user's photo answers 404.` + the attribution lines.

---

### Controller checkpoint C1 — after Task 1 (controller only)

- [x] Warn the other session (frame UI) that the shared dev database is about to be wiped (photos, sessions, users): it must log in again and re-upload its photos.
- [x] From the repo root: `pnpm db:seed`. Expected: a `seed.done` log line with `users=2`.
- [x] Then `pnpm db:push`. Expected: `Your database indexes are now in sync with your Prisma schema` (the `cloudinaryId` unique index goes, `(ownerId, id)` and `cloudinaryId` indexes appear). If it fails with `EPERM` while regenerating the client, a running API holds the engine: stop your own test API and rerun.
- [x] Record the checkpoint in the Drift Log (date, both commands passed).

---

### Task 2: Frame without uploader names, and the PR A docs (PR A, `feat/library-schema`)

**Files:**
- Modify: `client/src/photo.ts`
- Create: `client/src/photoLabel.ts`
- Modify: `client/src/components/frame/PhotoCaption.tsx`, `PhotoGridTile.tsx`, `PhotoListRow.tsx`, `PhotoSlide.tsx`, `PhotoStrip.tsx`, `DeletePhotoDialog.tsx`
- Modify: `ARCHITECTURE.md`, `README.md`

**Interfaces:**
- Consumes: the server's `Photo` DTO without `uploaderName` (Task 1).
- Produces (used by Tasks 6-8):
  ```ts
  // client/src/photo.ts
  export type Photo = { id: string; url: string; thumbnailUrl: string; createdAt: string }
  export function isPhoto(value: unknown): value is Photo
  // client/src/photoLabel.ts
  export function formatPhotoDay(iso: string): string // "24 novembre 2026"
  export function photoLabel(photo: Photo): string    // "Photo du 24 novembre 2026"
  ```

- [x] **Step 1: Drop the name from the client type**

In `client/src/photo.ts`, remove the line `  uploaderName: string` from `Photo`, and remove these two lines from `isPhoto`:

```ts
    'uploaderName' in value &&
    typeof value.uploaderName === 'string' &&
```

Run: `pnpm --filter client typecheck`
Expected: FAIL, the six frame components still read `photo.uploaderName` (`Property 'uploaderName' does not exist on type 'Photo'`). This is the failing check for this task.

- [x] **Step 2: Labels by day**

Create `client/src/photoLabel.ts`:

```ts
import type { Photo } from '@/photo.ts'

// The day is what matters on a wall: the time of the upload was noise.
const PHOTO_DAY_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}

export function formatPhotoDay(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', PHOTO_DAY_FORMAT)
}

// Alt texts and aria-labels: with no sender name until step 5, the day names the photo.
export function photoLabel({ createdAt }: Photo): string {
  return `Photo du ${formatPhotoDay(createdAt)}`
}
```

- [x] **Step 3: Update the frame components**

Replace `client/src/components/frame/PhotoCaption.tsx` with:

```tsx
import type { JSX } from 'react'
import type { Photo } from '@/photo.ts'
import { formatPhotoDay } from '@/photoLabel.ts'

type PhotoCaptionProps = {
  photo: Photo
}

export function PhotoCaption({ photo }: PhotoCaptionProps): JSX.Element {
  return (
    <div className="px-10 pt-24 pb-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700">
      <p className="text-3xl font-medium tracking-tight text-white tabular-nums drop-shadow-md">
        <time dateTime={photo.createdAt}>{formatPhotoDay(photo.createdAt)}</time>
      </p>
    </div>
  )
}
```

Replace `client/src/components/frame/PhotoGridTile.tsx` with:

```tsx
import type { JSX } from 'react'
import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
import type { Photo } from '@/photo.ts'
import { photoLabel } from '@/photoLabel.ts'

type PhotoGridTileProps = {
  photo: Photo
  isCurrent: boolean
  onSelect: (id: string) => void
}

export function PhotoGridTile({ photo, isCurrent, onSelect }: PhotoGridTileProps): JSX.Element {
  return (
    // The ellipsis is a sibling of the tile button: a button cannot hold a button.
    <li className="group/tile relative">
      <button
        type="button"
        onClick={() => onSelect(photo.id)}
        aria-current={isCurrent}
        className="group relative block w-full overflow-hidden rounded-xl outline-none ring-offset-4 ring-offset-frame-background focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
      >
        <img
          className="aspect-square w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover/tile:scale-105"
          src={photo.thumbnailUrl}
          alt={photoLabel(photo)}
          loading="lazy"
          decoding="async"
        />
      </button>
      <PhotoActionsMenu
        photo={photo}
        label={`Actions : ${photoLabel(photo)}`}
        className="absolute top-2 right-2 rounded-full bg-black/55 text-white/80 backdrop-blur-sm hover:bg-black/75 hover:text-white dark:hover:bg-black/75"
      />
    </li>
  )
}
```

Replace `client/src/components/frame/PhotoListRow.tsx` with:

```tsx
import type { JSX } from 'react'
import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
import type { Photo } from '@/photo.ts'
import { photoLabel } from '@/photoLabel.ts'

// In a list, photos of the same day are told apart by their time.
const ROW_DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

type PhotoListRowProps = {
  photo: Photo
  isCurrent: boolean
  onSelect: (id: string) => void
}

export function PhotoListRow({ photo, isCurrent, onSelect }: PhotoListRowProps): JSX.Element {
  return (
    // The ellipsis is a sibling of the row button: a button cannot hold a button.
    <li className="relative">
      <button
        type="button"
        onClick={() => onSelect(photo.id)}
        aria-current={isCurrent}
        className="flex w-full items-center gap-4 rounded-xl p-2 pr-14 text-left outline-none hover:bg-white/5 focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
      >
        <img
          className="size-14 shrink-0 rounded-lg object-cover"
          src={photo.thumbnailUrl}
          alt={photoLabel(photo)}
          loading="lazy"
          decoding="async"
        />
        <time dateTime={photo.createdAt} className="min-w-0 flex-1 text-lg tabular-nums">
          {ROW_DATE_FORMAT.format(new Date(photo.createdAt))}
        </time>
      </button>
      <PhotoActionsMenu
        photo={photo}
        label={`Actions : ${photoLabel(photo)}`}
        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full text-white/80"
      />
    </li>
  )
}
```

In `client/src/components/frame/PhotoSlide.tsx`, add `import { photoLabel } from '@/photoLabel.ts'` after the `Photo` import, and replace `` alt={`Envoyée par ${photo.uploaderName}`} `` with `alt={photoLabel(photo)}`.

In `client/src/components/frame/PhotoStrip.tsx`, add `import { photoLabel } from '@/photoLabel.ts'` after the `Photo` import, and replace `` alt={`Envoyée par ${photo.uploaderName}`} `` with `alt={photoLabel(photo)}`.

In `client/src/components/frame/DeletePhotoDialog.tsx`, replace the content of `<AlertDialogDescription>` (the two lines starting with `La photo envoyée par`) with:

```tsx
            Cette photo sera supprimée de votre bibliothèque et de votre cadre. Cette action est
            irréversible.
```

- [x] **Step 4: Gates**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  70 passed (70)`.

Run: `git grep -n uploaderName -- client/src`
Expected: no output.

Manual check (optional for the implementer, done by the controller in the final verification): `/frame` shows the date as the slideshow caption, tiles without a name overlay, rows with the date in full width; the delete dialog text above.

- [x] **Step 5: Commit the client**

```bash
git add client/src/photo.ts client/src/photoLabel.ts client/src/components/frame
git commit -F <message-file>
```

Message: `feat(client): label photos by their day instead of the uploader name` + the attribution lines.

- [x] **Step 6: ARCHITECTURE**

In `ARCHITECTURE.md`:

1. Replace the line starting with `5. **Prisma** enregistre` with:
   ```markdown
   5. **Prisma** enregistre dans MongoDB l'URL, l'identifiant Cloudinary, le propriétaire (`ownerId`, le compte connecté) et la date.
   ```
2. Replace the line starting with `6. Le serveur émet un événement` with:
   ```markdown
   6. Le serveur émet un événement **Socket.IO** vers les connexions de ce compte ; son cadre affiche la nouvelle photo sans rechargement.
   ```
3. In the Pages table, replace the `/` row's description with `envoi : « Prendre une photo » ou « Choisir une image », dans la bibliothèque du compte connecté ; « Se déconnecter »` and, in the `/frame` row, replace `cadre : bibliothèque des photos en vignettes` with `cadre : bibliothèque du compte connecté, en vignettes` (keep the rest of the row; let `pnpm format` realign the table if needed).
4. In the API table, replace the `GET /api/photos` description with `` `200 Photo[]`, les 20 plus récentes du compte connecté en premier `` and the `DELETE /api/photos/:id` description with `` `204` sans corps, pour une photo du compte connecté ; supprime l'enregistrement puis l'image Cloudinary (cache CDN compris) ``.
5. Replace the paragraph starting with `Une \`Photo\` vaut` with:
   ```markdown
   Une `Photo` vaut `{ id, url, thumbnailUrl, createdAt }` (`createdAt` en ISO 8601). Chaque photo appartient au compte qui l'a envoyée (`ownerId`, côté serveur seulement) : la liste, la suppression et les événements ne concernent que les photos du compte connecté. L'identifiant Cloudinary reste côté serveur : le client reçoit des URL prêtes à l'emploi.
   ```
6. In the error table, replace the `PHOTO_NOT_FOUND` row's case with `photo inconnue, photo d'un autre compte, ou id qui n'est pas un ObjectId` (a 403 dirait que la photo existe: no extra text needed in the table).
7. In `## Temps réel`, replace the end of the first bullet, from `Chaque socket rejoint la room` to the end of the line, with:
   ```markdown
   Chaque socket rejoint la room `user:<id>` (`userRoom`, même fichier).
   ```
   and replace the second bullet with:
   ```markdown
   - Deux événements, du serveur vers les connexions du propriétaire de la photo (`io.to(userRoom(ownerId))`) : `photo:new` avec la `Photo` créée, `photo:deleted` avec l'id de la photo supprimée. Les autres comptes ne les reçoivent pas.
   ```
8. In the backend layers table, replace the `photos.controller.ts` role with `lit la requête et le compte connecté, appelle le service, convertit en DTO, diffuse à la room du propriétaire, répond`.
9. In `## Logs`, replace `jamais le pseudo, l'e-mail, le mot de passe ni le jeton de session` with `jamais un nom, l'e-mail, le mot de passe ni le jeton de session`, and in the events table replace the `photo.created` / `photo.deleted` row's last cell with `service photos, avec \`userId\` (le propriétaire)`.
10. In `## Données`, replace the bullet starting with `Collections \`User\` et \`Session\`` with:
    ```markdown
    - Collections `User`, `Session` et `Photo`. Index uniques sur `User.email` et `Session.tokenHash` ; le rôle est un `enum Role` Prisma, que Prisma génère en union de chaînes. `Photo.ownerId` relie chaque photo à son compte ; index `(ownerId, id)` pour la liste d'un compte, et index simple sur `cloudinaryId` (plus unique : à l'étape 5, un partage pointera vers la même image). `pnpm db:seed` (`server/prisma/seed.ts`) vide la base et crée les deux comptes de test du README.
    - Quand `Photo` gagne un champ obligatoire ou un index unique, `pnpm db:seed` passe **avant** `pnpm db:push` : MongoDB compte un champ absent comme `null`, et d'anciennes photos sans ce champ empêcheraient l'index unique de se créer.
    ```
11. In `## Outillage`, append to the Bruno bullet: ` Un second compte (l'admin, \`auth/login/05\`) range son cookie dans \`adminCookie\` : les requêtes qui vérifient qu'un compte ne touche pas aux photos d'un autre l'envoient à la place de celui du membre.`

- [x] **Step 7: README**

In `README.md`, add after the paragraph starting with `Le seed efface toutes les photos`:

```markdown
Quand le schéma change sur une base qui contient déjà des photos, lancer `pnpm db:seed` **avant** `pnpm db:push` : un nouvel index unique ne peut pas se créer tant que d'anciennes photos n'ont pas les nouveaux champs.
```

- [x] **Step 8: Check and commit the docs**

Run: `pnpm check`
Expected: green (if the hook rejects a `.md` file, run `pnpm exec biome format --write README.md ARCHITECTURE.md`).

Run: `git grep -n uploaderName -- ARCHITECTURE.md README.md`
Expected: no output.

```bash
git add ARCHITECTURE.md README.md
git commit -F <message-file>
```

Message: `docs: describe photo ownership` + the attribution lines.

---

## PR B — `feat/library-duplicates`

> **Controller:** before Task 3, run `gh stack add feat/library-duplicates`.

### Controller checkpoint C2 — before Task 3 (controller only)

- [x] If any Bruno run since C1 stopped before `photos/delete` finished, or someone uploaded photos by hand, warn the other session and run `pnpm db:seed` (expected: `seed.done`, `users=2`): those photos have no `sha256`, which Task 3 makes required. Otherwise nothing to do: every complete run deletes the photos it created. Record the decision in the Drift Log.

### Task 3: Refuse a photo already in the library (PR B, `feat/library-duplicates`)

**Files:**
- Modify: `server/prisma/schema.prisma`
- Modify: `server/src/features/photos/photos.repository.ts`, `photos.service.ts`
- Test: `server/src/features/photos/photos.service.test.ts`, `server/src/errors/error-handler.test.ts`
- Modify: `server/src/types.ts`, `server/src/errors/error-handler.ts`, `client/src/api.ts`
- Create: `server/bruno/photos/create/03-edge-doublon.bru`
- Modify: `server/bruno/photos/create/folder.bru`, `server/bruno/photos/folder.bru`, `server/bruno/collection.bru`

**Interfaces:**
- Consumes: Task 1's repository and service.
- Produces (used by Tasks 4-5):
  ```ts
  // photos.repository.ts
  export type NewPhoto = { ownerId: string; url: string; cloudinaryId: string; sha256: string }
  // added: findByOwnerAndSha256: (ownerId: string, sha256: string) => Promise<PhotoRecord | null>
  // changed: create: (photo: NewPhoto) => Promise<PhotoRecord | null>   // null on P2002
  ```
  `ApiErrorCode` gains `'PHOTO_DUPLICATE'` (409), server and client.

**No red Bruno run in this task** (see "Choices made while planning"): an old-code run would save a second `photo.jpg` without `sha256`, which the new code cannot read.

- [x] **Step 1: Write the failing unit tests**

In `server/src/errors/error-handler.test.ts`, add after the test `answers an unknown photo with 404`:

```ts
  it('answers a file already in the library with 409', () => {
    expect(toErrorResponse(new AppError('PHOTO_DUPLICATE'))).toEqual({
      status: 409,
      body: { error: 'PHOTO_DUPLICATE' },
    })
  })
```

In `server/src/features/photos/photos.service.test.ts`:

1. Add `import { createHash } from 'node:crypto'` as the first import.
2. Add after the `JPEG_FILE` constant:
   ```ts
   // Computed like the service does: the hash of the original upload bytes.
   const JPEG_SHA256 = createHash('sha256').update(JPEG_FILE.buffer).digest('hex')
   ```
3. Replace the `RECORD` constant with:
   ```ts
   const RECORD: PhotoRecord = {
     id: '6b044f9d56a44767c7079a01',
     ownerId: OWNER_ID,
     ...IMAGE,
     sha256: JPEG_SHA256,
     createdAt: new Date('2026-11-23T10:00:00Z'),
   }
   ```
4. In `makeDeps`, add in `repository`, after `findLatest`:
   ```ts
         findByOwnerAndSha256: vi
           .fn<PhotosRepository['findByOwnerAndSha256']>()
           .mockResolvedValue(null),
   ```
5. Replace the test `saves the uploaded image for its owner and returns the record` with:
   ```ts
     it('saves the uploaded image for its owner with the hash of the original bytes', async () => {
       const deps = makeDeps()

       const record = await createPhotosService(deps).createPhoto({
         ownerId: OWNER_ID,
         file: JPEG_FILE,
       })

       expect(record).toBe(RECORD)
       expect(deps.repository.findByOwnerAndSha256).toHaveBeenCalledWith(OWNER_ID, JPEG_SHA256)
       expect(deps.toFrameJpeg).toHaveBeenCalledWith(JPEG_FILE.buffer)
       expect(deps.uploadImage).toHaveBeenCalledWith(FRAME_JPEG)
       // Not the hash of FRAME_JPEG: sharp's output is not guaranteed to be stable.
       expect(deps.repository.create).toHaveBeenCalledWith({
         ownerId: OWNER_ID,
         ...IMAGE,
         sha256: JPEG_SHA256,
       })
     })
   ```
6. Add after the test `logs the created photo by its identifiers and its owner id`:
   ```ts
     it('rejects a file already in the library before any image work', async () => {
       const deps = makeDeps()
       deps.repository.findByOwnerAndSha256.mockResolvedValue(RECORD)

       await expect(
         createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file: JPEG_FILE }),
       ).rejects.toMatchObject({ code: 'PHOTO_DUPLICATE' })
       expect(deps.toFrameJpeg).not.toHaveBeenCalled()
       expect(deps.uploadImage).not.toHaveBeenCalled()
       expect(deps.logger.info).toHaveBeenCalledWith('photo.duplicate', {
         userId: OWNER_ID,
         photoId: RECORD.id,
       })
     })

     it('rejects a duplicate a concurrent upload saved first, and destroys the new image', async () => {
       const deps = makeDeps()
       deps.repository.create.mockResolvedValue(null)

       await expect(
         createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file: JPEG_FILE }),
       ).rejects.toMatchObject({ code: 'PHOTO_DUPLICATE' })
       expect(deps.deleteImage).toHaveBeenCalledWith(IMAGE.cloudinaryId)
       expect(deps.logger.info).toHaveBeenCalledWith('photo.duplicate', {
         userId: OWNER_ID,
         cloudinaryId: IMAGE.cloudinaryId,
       })
       expect(deps.logger.info).not.toHaveBeenCalledWith('photo.created', expect.anything())
     })
   ```
7. In the test `logs the orphaned Cloudinary image when the database fails`, add as its last line:
   ```ts
       expect(deps.deleteImage).not.toHaveBeenCalled()
   ```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm test`
Expected: FAIL, 4 failed (`answers a file already in the library with 409`, `saves the uploaded image for its owner with the hash of the original bytes`, the two duplicate tests), `Tests  4 failed | 69 passed (73)`.

- [x] **Step 3: Schema**

In `server/prisma/schema.prisma`, `model Photo`, add the field `sha256       String` after `cloudinaryId`, and the line `@@unique([ownerId, sha256])` before `@@index([ownerId, id])`. The model reads:

```prisma
model Photo {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  ownerId      String   @db.ObjectId
  owner        User     @relation(fields: [ownerId], references: [id])
  url          String
  cloudinaryId String
  sha256       String
  createdAt    DateTime @default(now())

  @@unique([ownerId, sha256])
  @@index([ownerId, id])
  @@index([cloudinaryId])
}
```

Run: `pnpm --filter server exec prisma format` then `pnpm --filter server db:generate`
Expected: `✔ Generated Prisma Client`.

- [x] **Step 4: Error code, server and client**

In `server/src/types.ts`, add `  | 'PHOTO_DUPLICATE'` after `  | 'PHOTO_NOT_FOUND'` in `ApiErrorCode`.

In `server/src/errors/error-handler.ts`, add `  PHOTO_DUPLICATE: 409,` after `  PHOTO_NOT_FOUND: 404,` in `HTTP_STATUS_BY_CODE`.

In `client/src/api.ts`, add `  | 'PHOTO_DUPLICATE'` after `  | 'PHOTO_NOT_FOUND'`, and in `ERROR_MESSAGES` after the `PHOTO_NOT_FOUND` line:

```ts
  PHOTO_DUPLICATE: 'Cette photo est déjà dans votre bibliothèque.',
```

- [x] **Step 5: Repository**

Replace `server/src/features/photos/photos.repository.ts` with:

```ts
import { type Photo, Prisma, type PrismaClient } from '@prisma/client'

export type PhotoRecord = Photo

export type NewPhoto = { ownerId: string; url: string; cloudinaryId: string; sha256: string }

export type PhotosRepository = {
  findLatest: (ownerId: string, limit: number) => Promise<PhotoRecord[]>
  findByOwnerAndSha256: (ownerId: string, sha256: string) => Promise<PhotoRecord | null>
  // null when the owner already has this file: the service decides the error.
  create: (photo: NewPhoto) => Promise<PhotoRecord | null>
  deleteOwned: (id: string, ownerId: string) => Promise<PhotoRecord | null>
}

// P2025: no record matches: unknown, already deleted by another request, or someone else's.
function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}

// P2002: the unique index (ownerId, sha256) refused a second copy of the same file.
function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export function createPhotosRepository(prisma: PrismaClient): PhotosRepository {
  return {
    // An ObjectId starts with its creation time: by id is newest first.
    findLatest: (ownerId, limit) =>
      prisma.photo.findMany({ where: { ownerId }, orderBy: { id: 'desc' }, take: limit }),
    findByOwnerAndSha256: (ownerId, sha256) =>
      prisma.photo.findUnique({ where: { ownerId_sha256: { ownerId, sha256 } } }),
    create: async (photo) => {
      try {
        return await prisma.photo.create({ data: photo })
      } catch (error: unknown) {
        if (isUniqueViolation(error)) {
          return null
        }
        throw error
      }
    },
    // One atomic query: Prisma accepts the owner next to the unique id.
    deleteOwned: async (id, ownerId) => {
      try {
        return await prisma.photo.delete({ where: { id, ownerId } })
      } catch (error: unknown) {
        if (isRecordNotFound(error)) {
          return null
        }
        throw error
      }
    },
  }
}
```

- [x] **Step 6: Service**

In `server/src/features/photos/photos.service.ts`:

1. Add `import { createHash } from 'node:crypto'` as the first import.
2. Add after `parsePhotoId`:
   ```ts
   // The original bytes, before sharp: its output is not guaranteed to be stable.
   function sha256Of(buffer: Buffer): string {
     return createHash('sha256').update(buffer).digest('hex')
   }

   // Saves the sharp and Cloudinary work for a known file; the unique index is the real guarantee.
   async function rejectKnownFile(
     { repository, logger }: PhotosServiceDeps,
     ownerId: string,
     sha256: string,
   ): Promise<void> {
     const existing = await repository.findByOwnerAndSha256(ownerId, sha256)
     if (existing) {
       logger.info('photo.duplicate', { userId: ownerId, photoId: existing.id })
       throw new AppError('PHOTO_DUPLICATE')
     }
   }
   ```
3. Replace the functions `saveRecord` and `deleteStoredImage` with (`deleteStoredImage` now comes first, `saveRecord` uses it):
   ```ts
   // The record is gone, or was never saved: a Cloudinary failure only leaves an orphan
   // image, so the caller still goes on.
   async function deleteStoredImage(
     { deleteImage, logger }: PhotosServiceDeps,
     cloudinaryId: string,
   ): Promise<void> {
     try {
       await deleteImage(cloudinaryId)
     } catch (error: unknown) {
       logger.error('photo.orphaned', { cloudinaryId, error })
     }
   }

   async function insertRecord(
     { repository, logger }: PhotosServiceDeps,
     photo: NewPhoto,
   ): Promise<PhotoRecord | null> {
     try {
       return await repository.create(photo)
     } catch (error: unknown) {
       // The image is on Cloudinary with no record pointing to it: its id is needed to clean up.
       logger.error('photo.orphaned', { cloudinaryId: photo.cloudinaryId, error })
       throw error
     }
   }

   async function saveRecord(deps: PhotosServiceDeps, photo: NewPhoto): Promise<PhotoRecord> {
     const record = await insertRecord(deps, photo)
     if (record) {
       return record
     }
     // A concurrent upload of the same file won: this new image is referenced by nothing.
     await deleteStoredImage(deps, photo.cloudinaryId)
     deps.logger.info('photo.duplicate', { userId: photo.ownerId, cloudinaryId: photo.cloudinaryId })
     throw new AppError('PHOTO_DUPLICATE')
   }
   ```
4. Replace the function `createPhoto` with:
   ```ts
   async function createPhoto(
     deps: PhotosServiceDeps,
     { ownerId, file }: NewPhotoInput,
   ): Promise<PhotoRecord> {
     const validFile = parseFile(file)
     const sha256 = sha256Of(validFile.buffer)
     await rejectKnownFile(deps, ownerId, sha256)
     const jpeg = await convertToFrameJpeg(deps, validFile.buffer)
     // Cloudinary and database failures are ours: they stay 500s.
     const image = await deps.uploadImage(jpeg)
     const record = await saveRecord(deps, { ownerId, ...image, sha256 })
     deps.logger.info('photo.created', {
       photoId: record.id,
       cloudinaryId: record.cloudinaryId,
       userId: ownerId,
     })
     return record
   }
   ```

- [x] **Step 7: Run the unit tests**

Run: `pnpm test`
Expected: PASS, `Tests  73 passed (73)`.

Run: `pnpm typecheck`
Expected: no error.

- [x] **Step 8: Bruno requests**

Create `server/bruno/photos/create/03-edge-doublon.bru`:

```
meta {
  name: Edge - photo déjà dans la bibliothèque
  type: http
  seq: 3
}

post {
  url: {{baseUrl}}/api/photos
  body: multipartForm
  auth: none
}

body:multipart-form {
  photo: @file(fixtures/photo.jpg) @contentType(image/jpeg)
}

assert {
  res.status: eq 409
  res.body.error: eq PHOTO_DUPLICATE
}

docs {
  EDGE → 409 PHOTO_DUPLICATE : le même `photo.jpg` que `01`, toujours dans
  la bibliothèque du membre. Le serveur reconnaît le fichier à son SHA-256,
  calculé sur les octets reçus, avant Sharp et Cloudinary : aucune image
  n'est envoyée.
}
```

Replace the `docs` block of `server/bruno/photos/create/folder.bru` with:

```
docs {
  `POST /api/photos`, multipart : `photo` (un fichier JPEG, PNG ou WebP,
  10 Mo max). La photo entre dans la bibliothèque du compte connecté ; un
  fichier déjà présent dans cette bibliothèque (même SHA-256) répond 409
  `PHOTO_DUPLICATE`.

  Si un lancement s'arrête entre `create` et `delete`, ses photos restent et
  le lancement suivant répond 409 à `01` : `pnpm db:seed` remet la base à
  zéro.

  Non couvert ici : le 413 `PHOTO_TOO_LARGE` demande un fichier de plus de
  10 Mo, trop lourd pour le dépôt. À tester à la main.
}
```

In `server/bruno/photos/folder.bru`, replace the line `` `PHOTO_NOT_FOUND`, `PHOTO_TOO_LARGE`, `FORMAT_UNSUPPORTED`, `IMAGE_UNREADABLE`, `` with:

```
  `PHOTO_NOT_FOUND`, `PHOTO_DUPLICATE`, `PHOTO_TOO_LARGE`, `FORMAT_UNSUPPORTED`,
  `IMAGE_UNREADABLE`,
```

In `server/bruno/collection.bru`, append to the paragraph that starts with `Les envois nominaux publient` (as its last sentence):

```
  Si un lancement s'arrête avant `photos/delete`, ses photos restent : le
  suivant répond 409 `PHOTO_DUPLICATE` à `create/01` ; `pnpm db:seed` remet la
  base à zéro.
```

- [x] **Step 9: Run Bruno**

Start the test API (own background command, from `server/`): `PORT=3002 npx tsx --env-file-if-exists=.env src/server.ts`. Wait for `server.started`.

From `server/bruno/`: `pnpm dlx @usebruno/cli@4.2.0 run . -r --env Local --disable-cookies --env-var baseUrl=http://localhost:3002`
Expected: status PASS, 28 requests, all passed. If `photos/list/01` or `delete/01`'s scripts fail with a 500 and the API log shows `server.error` mentioning `sha256`, the member still has photos from before this schema: stop and ask the controller for `pnpm db:seed` (checkpoint C2), then rerun.

The API log shows one `photo.duplicate` line with `userId` and `photoId` only.

Stop the test API.

- [x] **Step 10: Gates and commit**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  73 passed (73)`.

```bash
git add server/prisma/schema.prisma server/src/features/photos server/src/types.ts server/src/errors client/src/api.ts server/bruno
git commit -F <message-file>
```

Message: `feat(server): refuse a photo already in the library`, body: `The SHA-256 of the uploaded bytes is looked up per owner before sharp and Cloudinary; the unique index (ownerId, sha256) catches a concurrent duplicate, whose new image is destroyed. Both answer 409 PHOTO_DUPLICATE.` + the attribution lines.

---

### Controller checkpoint C3 — after Task 3 (controller only)

- [x] Warn the other session, then from the repo root: `pnpm db:seed` (expected: `seed.done`, `users=2`), then `pnpm db:push` (expected: `Your database indexes are now in sync with your Prisma schema`; the unique `(ownerId, sha256)` index is created). Seed first: photos without `sha256` (from any API still running older code on the shared database) would count as duplicate `null`s and block the index.
- [x] Record the checkpoint in the Drift Log.

### Task 4: Keep a Cloudinary image while a photo uses it, and the PR B docs (PR B, `feat/library-duplicates`)

**Files:**
- Modify: `server/src/features/photos/photos.repository.ts`, `photos.service.ts`
- Test: `server/src/features/photos/photos.service.test.ts`
- Modify: `server/bruno/photos/delete/folder.bru` (docs)
- Modify: `ARCHITECTURE.md`

**Interfaces:**
- Consumes: Task 3's repository and service.
- Produces: `PhotosRepository.countByCloudinaryId: (cloudinaryId: string) => Promise<number>` (used by Task 5's fakes). `photo.deleted` gains `isImageDestroyed: boolean`.

- [x] **Step 1: Write the failing unit tests**

In `server/src/features/photos/photos.service.test.ts`:

1. In `makeDeps`, add in `repository`, after `deleteOwned`:
   ```ts
         countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>().mockResolvedValue(0),
   ```
2. In `describe('deletePhoto', …)`, replace the first test (`deletes the owner's record, then its Cloudinary image, and returns the stored id`) with:
   ```ts
     it("deletes the owner's record, then its image once no photo uses it, and returns the id", async () => {
       const deps = makeDeps()

       const deletedId = await createPhotosService(deps).deletePhoto({
         ownerId: OWNER_ID,
         id: RECORD.id,
       })

       expect(deletedId).toBe(RECORD.id)
       expect(deps.repository.deleteOwned).toHaveBeenCalledWith(RECORD.id, OWNER_ID)
       expect(deps.repository.countByCloudinaryId).toHaveBeenCalledWith(IMAGE.cloudinaryId)
       // Counted after the deletion: the deleted photo must not count itself.
       expect(deps.repository.deleteOwned.mock.invocationCallOrder[0]).toBeLessThan(
         deps.repository.countByCloudinaryId.mock.invocationCallOrder[0],
       )
       expect(deps.deleteImage).toHaveBeenCalledWith(IMAGE.cloudinaryId)
     })

     it('keeps the image while another photo still uses it', async () => {
       const deps = makeDeps()
       deps.repository.countByCloudinaryId.mockResolvedValue(1)

       await expect(
         createPhotosService(deps).deletePhoto({ ownerId: OWNER_ID, id: RECORD.id }),
       ).resolves.toBe(RECORD.id)
       expect(deps.deleteImage).not.toHaveBeenCalled()
       expect(deps.logger.info).toHaveBeenCalledWith('photo.deleted', {
         photoId: RECORD.id,
         cloudinaryId: RECORD.cloudinaryId,
         userId: OWNER_ID,
         isImageDestroyed: false,
       })
     })
   ```
3. In the test `logs the deleted photo by its identifiers and its owner id`, replace the expected data object with:
   ```ts
       expect(deps.logger.info).toHaveBeenCalledWith('photo.deleted', {
         photoId: RECORD.id,
         cloudinaryId: RECORD.cloudinaryId,
         userId: OWNER_ID,
         isImageDestroyed: true,
       })
   ```
4. In the test `still succeeds when Cloudinary fails, and logs the orphaned image`, add as its last lines:
   ```ts
       expect(deps.logger.info).toHaveBeenCalledWith(
         'photo.deleted',
         expect.objectContaining({ isImageDestroyed: false }),
       )
   ```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm test`
Expected: FAIL in `photos.service.test.ts` (no `countByCloudinaryId` call, no `isImageDestroyed`), `Tests  4 failed | 70 passed (74)`.

- [x] **Step 3: Repository**

In `server/src/features/photos/photos.repository.ts`, add to `PhotosRepository` after `deleteOwned`:

```ts
  countByCloudinaryId: (cloudinaryId: string) => Promise<number>
```

and to the returned object, after `deleteOwned`:

```ts
    countByCloudinaryId: (cloudinaryId) => prisma.photo.count({ where: { cloudinaryId } }),
```

- [x] **Step 4: Service**

In `server/src/features/photos/photos.service.ts`:

1. Replace `deleteStoredImage` with:
   ```ts
   // true once Cloudinary destroyed the image. The record is gone, or was never saved:
   // a Cloudinary failure only leaves an orphan image, so the caller still goes on.
   async function deleteStoredImage(
     { deleteImage, logger }: PhotosServiceDeps,
     cloudinaryId: string,
   ): Promise<boolean> {
     try {
       await deleteImage(cloudinaryId)
       return true
     } catch (error: unknown) {
       logger.error('photo.orphaned', { cloudinaryId, error })
       return false
     }
   }
   ```
2. Add after `saveRecord`:
   ```ts
   // A share (step 5) points to the same image: it goes with the last photo using it.
   // Counted after the deletion, so the deleted photo does not count itself.
   async function destroyUnusedImage(deps: PhotosServiceDeps, cloudinaryId: string): Promise<boolean> {
     const remainingCount = await deps.repository.countByCloudinaryId(cloudinaryId)
     if (remainingCount > 0) {
       return false
     }
     return deleteStoredImage(deps, cloudinaryId)
   }
   ```
3. In `deletePhoto`, replace from `await deleteStoredImage(deps, record.cloudinaryId)` to the end of the `logger.info` call with:
   ```ts
     const isImageDestroyed = await destroyUnusedImage(deps, record.cloudinaryId)
     deps.logger.info('photo.deleted', {
       photoId: record.id,
       cloudinaryId: record.cloudinaryId,
       userId: ownerId,
       isImageDestroyed,
     })
   ```

- [x] **Step 5: Run the unit tests**

Run: `pnpm test`
Expected: PASS, `Tests  74 passed (74)`.

- [x] **Step 6: Bruno docs and run**

Replace the `docs` block of `server/bruno/photos/delete/folder.bru` with:

```
docs {
  `DELETE /api/photos/:id` → 204 sans corps, et l'événement Socket.IO
  `photo:deleted` (l'id) pour les connexions du propriétaire. La photo d'un
  autre compte répond 404 `PHOTO_NOT_FOUND`, comme une photo inconnue.
  L'image Cloudinary n'est détruite que si plus aucune photo n'y renvoie (à
  l'étape 5, un partage pointera vers la même image).

  Ces requêtes suppriment les photos créées par `create/01` (variable
  `createdPhotoId`) et `create/02` (`createdPngId`) : lancer toute la
  collection, pas une requête seule (`01` demande aussi `adminCookie`, rangé
  par `auth/login/05`).
}
```

Start the test API (own background command, from `server/`): `PORT=3002 npx tsx --env-file-if-exists=.env src/server.ts`; from `server/bruno/`: `pnpm dlx @usebruno/cli@4.2.0 run . -r --env Local --disable-cookies --env-var baseUrl=http://localhost:3002`
Expected: status PASS, 28 requests, all passed; the API log shows two `photo.deleted` lines with `isImageDestroyed=true`. Stop the test API.

- [x] **Step 7: Gates and commit**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  74 passed (74)`.

```bash
git add server/src/features/photos server/bruno/photos/delete/folder.bru
git commit -F <message-file>
```

Message: `feat(server): keep a Cloudinary image while a photo still uses it` + the attribution lines.

- [x] **Step 8: ARCHITECTURE**

In `ARCHITECTURE.md`:

1. In step 3 of `## Parcours d'une photo`, replace `et le fichier (10 Mo max, JPEG/PNG/WebP), puis le **décode et le réencode avec Sharp**` with `et le fichier (10 Mo max, JPEG/PNG/WebP), calcule le **SHA-256** des octets reçus et refuse un fichier déjà présent dans la bibliothèque du compte (\`409 PHOTO_DUPLICATE\`, sans appeler Sharp ni Cloudinary), puis le **décode et le réencode avec Sharp**`.
2. Replace step 5 with:
   ```markdown
   5. **Prisma** enregistre dans MongoDB l'URL, l'identifiant Cloudinary, le propriétaire (`ownerId`, le compte connecté), le SHA-256 du fichier reçu et la date. L'index unique `(ownerId, sha256)` est la vraie garantie : deux envois simultanés du même fichier passent la vérification, le second est refusé à l'enregistrement (`409` aussi) et son image Cloudinary est détruite.
   ```
3. In the API table, replace the `DELETE /api/photos/:id` description with `` `204` sans corps, pour une photo du compte connecté ; supprime l'enregistrement, puis l'image Cloudinary (cache CDN compris) si plus aucune photo n'y renvoie ``.
4. In the error table, add after the `PHOTO_NOT_FOUND` row:
   ```markdown
   | fichier déjà dans la bibliothèque du compte (même SHA-256) | 409 | `PHOTO_DUPLICATE` |
   ```
5. In the backend layers table, replace the `photos.service.ts` role with `règles métier (fichier, format, doublon, image lisible, propriétaire, image encore utilisée) ; ignore Express et Socket.IO`.
6. In the events table of `## Logs`, replace the `photo.created` / `photo.deleted` row's last cell with `service photos, avec \`userId\` (le propriétaire) ; \`photo.deleted\` dit aussi si l'image Cloudinary a été détruite (\`isImageDestroyed\`)`, and add after it:
   ```markdown
   | `photo.duplicate` | info | service photos : fichier déjà dans la bibliothèque, avec `userId` et le `photoId` de la photo existante (ou le `cloudinaryId` de l'image détruite après un envoi simultané) |
   ```
7. In `## Données`, in the first bullet, replace `index \`(ownerId, id)\` pour la liste d'un compte,` with `index unique \`(ownerId, sha256)\` (un même fichier n'entre qu'une fois dans une bibliothèque), index \`(ownerId, id)\` pour la liste d'un compte,`.

Run: `pnpm check` (format the `.md` files with `pnpm exec biome format --write ARCHITECTURE.md` if the hook rejects them).

```bash
git add ARCHITECTURE.md
git commit -F <message-file>
```

Message: `docs: describe duplicate detection and image cleanup` + the attribution lines.

---

## PR C — `feat/library-pagination`

> **Controller:** before Task 5, run `gh stack add feat/library-pagination`.

### Task 5: Paginate the photo list with a cursor (PR C, `feat/library-pagination`)

**Files:**
- Modify: `server/src/features/photos/photos.repository.ts`, `photos.service.ts`, `photos.controller.ts`
- Test: `server/src/features/photos/photos.service.test.ts` (listing test removed), `server/src/errors/error-handler.test.ts`
- Create: `server/src/features/photos/photos.service.list.test.ts`
- Modify: `server/src/types.ts`, `server/src/errors/error-handler.ts`, `client/src/api.ts`
- Modify: `server/bruno/photos/folder.bru`, `server/bruno/photos/list/{folder,01-nominal}.bru`, `server/bruno/photos/delete/{folder,01-edge-photo-d-un-autre,02-nominal}.bru`
- Create: `server/bruno/photos/list/02-nominal-premiere-page.bru`, `03-nominal-page-suivante.bru`, `04-edge-limite-invalide.bru`, `05-edge-curseur-invalide.bru`
- Rename: `server/bruno/photos/list/02-edge-sans-cookie.bru` → `06-edge-sans-cookie.bru`

**Interfaces:**
- Consumes: Task 4's repository and service.
- Produces (used by Task 6):
  ```ts
  // photos.repository.ts
  export type PageQuery = { ownerId: string; beforeId: string | undefined; take: number }
  // replaces findLatest: findPage: (query: PageQuery) => Promise<PhotoRecord[]>
  // photos.service.ts
  export const DEFAULT_PAGE_SIZE = 30
  export const MAX_PAGE_SIZE = 100
  export type PageInput = { ownerId: string; cursor: unknown; limit: unknown }
  export type RecordPage = { records: PhotoRecord[]; nextCursor: string | null }
  // replaces listLatest: listPage: (input: PageInput) => Promise<RecordPage>
  // types.ts
  export type PhotoPage = { photos: Photo[]; nextCursor: string | null }
  ```
  `GET /api/photos?cursor=<id>&limit=<n>` → `200 PhotoPage`; `400 QUERY_INVALID` for a bad `limit` or `cursor`.

- [x] **Step 1: Update the Bruno requests (the failing tests)**

Set `seq: 2` in `server/bruno/photos/list/folder.bru` and `seq: 3` in `server/bruno/photos/delete/folder.bru`. Give `list/folder.bru` this `docs` block (after `meta`):

```
docs {
  `GET /api/photos?cursor=<id>&limit=<n>` → 200 `{ photos, nextCursor }`, les
  photos du compte connecté, la plus récente en premier. `limit` va de 1 à
  100 (30 par défaut) ; `nextCursor` est l'id à passer en `cursor` pour la
  page suivante, `null` à la dernière.

  Lancé entre `create` et `delete` (`seq: 2`) : il voit les deux photos que
  `create` vient d'ajouter, donc au moins deux pages de une photo.
}
```

In `server/bruno/photos/folder.bru`, replace the lines from `` (`PHOTO_MISSING`, `` to `` `SERVER_ERROR`) que le client traduit en français. `` with:

```
  (`PHOTO_MISSING`, `UPLOAD_INVALID`, `QUERY_INVALID`, `UNAUTHENTICATED`,
  `PHOTO_NOT_FOUND`, `PHOTO_DUPLICATE`, `PHOTO_TOO_LARGE`, `FORMAT_UNSUPPORTED`,
  `IMAGE_UNREADABLE`, `SERVER_ERROR`) que le client traduit en français.
  Ordre des dossiers : `create`, `list`, `delete`.
```

Replace `server/bruno/photos/list/01-nominal.bru` with:

```
meta {
  name: Nominal - première page de la bibliothèque
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/api/photos
  body: none
  auth: none
}

assert {
  res.status: eq 200
  res.body.photos: isArray
  res.body.photos.length: lte 30
}

script:post-response {
  const { photos, nextCursor } = res.body
  test('la plus récente en premier (ids décroissants)', () => {
    const ids = photos.map(({ id }) => id)
    expect(ids).to.eql([...ids].sort().reverse())
  })
  test('chaque photo a sa miniature', () => {
    for (const photo of photos) {
      expect(photo.thumbnailUrl).to.contain('c_fill,g_auto')
    }
  })
  test('nextCursor vaut null ou un id', () => {
    expect(nextCursor === null || typeof nextCursor === 'string').to.equal(true)
  })
}

docs {
  NOMINAL → 200 `{ photos, nextCursor }` : au plus 30 photos (taille par
  défaut) du compte connecté, chacune avec `url` et `thumbnailUrl`. Un
  ObjectId commence par sa date de création : des ids décroissants, c'est la
  plus récente en premier.
}
```

Create `server/bruno/photos/list/02-nominal-premiere-page.bru`:

```
meta {
  name: Nominal - première page d'une photo
  type: http
  seq: 2
}

get {
  url: {{baseUrl}}/api/photos?limit=1
  body: none
  auth: none
}

assert {
  res.status: eq 200
  res.body.photos.length: eq 1
  res.body.nextCursor: isString
}

script:post-response {
  // 03 asks for the page after this one.
  bru.setVar('firstPagePhotoId', res.body.photos?.[0]?.id)
  bru.setVar('nextCursor', res.body.nextCursor)
}

docs {
  NOMINAL → 200, une seule photo et un `nextCursor` : `create/01` et
  `create/02` viennent d'ajouter deux photos, il y a donc une page suivante.
}
```

Create `server/bruno/photos/list/03-nominal-page-suivante.bru`:

```
meta {
  name: Nominal - page suivante
  type: http
  seq: 3
}

get {
  url: {{baseUrl}}/api/photos?cursor={{nextCursor}}&limit=1
  body: none
  auth: none
}

script:pre-request {
  // Without it the request would test the first page again.
  if (!bru.getVar('nextCursor')) {
    throw new Error('nextCursor absent : lancer le dossier photos en entier, list/02 doit passer')
  }
}

assert {
  res.status: eq 200
  res.body.photos.length: eq 1
}

script:post-response {
  const firstId = bru.getVar('firstPagePhotoId')
  test('une autre photo, plus ancienne que celle de la première page', () => {
    const [photo] = res.body.photos
    expect(photo.id).to.not.equal(firstId)
    expect(photo.id < firstId).to.equal(true)
  })
}

docs {
  NOMINAL → 200 : la page qui suit `02`, une photo plus ancienne. Le curseur
  est l'id de la dernière photo reçue : une photo ajoutée ou supprimée entre
  deux pages ne décale rien.
}
```

Create `server/bruno/photos/list/04-edge-limite-invalide.bru`:

```
meta {
  name: Edge - limite invalide
  type: http
  seq: 4
}

get {
  url: {{baseUrl}}/api/photos?limit=0
  body: none
  auth: none
}

assert {
  res.status: eq 400
  res.body.error: eq QUERY_INVALID
}

docs {
  EDGE → 400 QUERY_INVALID : `limit` va de 1 à 100. Les autres cas (101,
  `abc`, `1.5`, paramètre répété) sont dans `photos.service.list.test.ts`.
}
```

Create `server/bruno/photos/list/05-edge-curseur-invalide.bru`:

```
meta {
  name: Edge - curseur invalide
  type: http
  seq: 5
}

get {
  url: {{baseUrl}}/api/photos?cursor=pas-un-id
  body: none
  auth: none
}

assert {
  res.status: eq 400
  res.body.error: eq QUERY_INVALID
}

docs {
  EDGE → 400 QUERY_INVALID : le curseur doit être un ObjectId (l'id d'une
  photo). Le service le vérifie avant d'interroger MongoDB.
}
```

Rename the "sans cookie" request and set its `seq: 6`:

```bash
git mv server/bruno/photos/list/02-edge-sans-cookie.bru server/bruno/photos/list/06-edge-sans-cookie.bru
```

In `server/bruno/photos/delete/01-edge-photo-d-un-autre.bru`, replace `return list.data.map(({ id }) => id)` with `return list.data.photos.map(({ id }) => id)`, and append to its `docs` block's paragraph: ` (première page de chaque compte).`

In `server/bruno/photos/delete/02-nominal.bru`, replace `const ids = list.data.map(({ id }) => id)` with `const ids = list.data.photos.map(({ id }) => id)`.

- [x] **Step 2: Run Bruno against the current code to verify it fails**

Start the test API (own background command, from `server/`): `PORT=3002 npx tsx --env-file-if-exists=.env src/server.ts`; from `server/bruno/`: `pnpm dlx @usebruno/cli@4.2.0 run . -r --env Local --disable-cookies --env-var baseUrl=http://localhost:3002`
Expected: 32 requests, 7 failed: `list/01` to `list/05` (the API still answers an array and ignores the query) and the scripts of `delete/01`, `delete/02` (`list.data.photos` is undefined). The photos created by the run are still deleted by `delete/02` and `delete/05`. Stop the test API.

- [x] **Step 3: Write the failing unit tests**

In `server/src/errors/error-handler.test.ts`, add after the test `maps a malformed JSON body to BODY_INVALID`:

```ts
  it('answers an invalid query string with 400', () => {
    expect(toErrorResponse(new AppError('QUERY_INVALID'))).toEqual({
      status: 400,
      body: { error: 'QUERY_INVALID' },
    })
  })
```

In `server/src/features/photos/photos.service.test.ts`: delete the constant `LATEST_PHOTOS_LIMIT` and the whole `describe('listLatest', …)` block, and in `makeDeps` replace the `findLatest` line with:

```ts
      findPage: vi.fn<PhotosRepository['findPage']>().mockResolvedValue([RECORD]),
```

Create `server/src/features/photos/photos.service.list.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { PhotoRecord, PhotosRepository } from './photos.repository.js'
import {
  createPhotosService,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type PhotosServiceDeps,
} from './photos.service.js'

const OWNER_ID = '6b044f9d56a44767c7079b01'
const CURSOR = '6b044f9d56a44767c7079a05'

function recordWithId(id: string): PhotoRecord {
  return {
    id,
    ownerId: OWNER_ID,
    url: 'https://res.cloudinary.com/demo/photo.jpg',
    cloudinaryId: `familyframe/${id}`,
    sha256: `sha-${id}`,
    createdAt: new Date('2026-11-23T10:00:00Z'),
  }
}

// Newest first, like the repository returns them.
const RECORDS = [
  '6b044f9d56a44767c7079a03',
  '6b044f9d56a44767c7079a02',
  '6b044f9d56a44767c7079a01',
].map(recordWithId)

// Listing only reads findPage: the other fakes stay unused.
function makeDeps() {
  return {
    repository: {
      findPage: vi.fn<PhotosRepository['findPage']>().mockResolvedValue([]),
      findByOwnerAndSha256: vi.fn<PhotosRepository['findByOwnerAndSha256']>(),
      create: vi.fn<PhotosRepository['create']>(),
      deleteOwned: vi.fn<PhotosRepository['deleteOwned']>(),
      countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>(),
    },
    toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>(),
    uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>(),
    deleteImage: vi.fn<PhotosServiceDeps['deleteImage']>(),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

describe('listPage', () => {
  it('asks for one record more than the default page size', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).listPage({ ownerId: OWNER_ID, cursor: undefined, limit: undefined })

    expect(deps.repository.findPage).toHaveBeenCalledWith({
      ownerId: OWNER_ID,
      beforeId: undefined,
      take: DEFAULT_PAGE_SIZE + 1,
    })
  })

  it('accepts the largest page size', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).listPage({
      ownerId: OWNER_ID,
      cursor: undefined,
      limit: String(MAX_PAGE_SIZE),
    })

    expect(deps.repository.findPage).toHaveBeenCalledWith({
      ownerId: OWNER_ID,
      beforeId: undefined,
      take: MAX_PAGE_SIZE + 1,
    })
  })

  it.each([
    ['zero', '0'],
    ['above the largest page size', String(MAX_PAGE_SIZE + 1)],
    ['not a number', 'abc'],
    ['a decimal', '1.5'],
    ['repeated in the query', ['10', '20']],
  ])('rejects a limit that is %s', async (_case, limit) => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).listPage({ ownerId: OWNER_ID, cursor: undefined, limit }),
    ).rejects.toMatchObject({ code: 'QUERY_INVALID' })
    expect(deps.repository.findPage).not.toHaveBeenCalled()
  })

  it.each([
    ['not an ObjectId', 'pas-un-id'],
    ['repeated in the query', [CURSOR, CURSOR]],
  ])('rejects a cursor that is %s', async (_case, cursor) => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).listPage({ ownerId: OWNER_ID, cursor, limit: undefined }),
    ).rejects.toMatchObject({ code: 'QUERY_INVALID' })
    expect(deps.repository.findPage).not.toHaveBeenCalled()
  })

  it('lists the photos older than a valid cursor', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).listPage({ ownerId: OWNER_ID, cursor: CURSOR, limit: undefined })

    expect(deps.repository.findPage).toHaveBeenCalledWith({
      ownerId: OWNER_ID,
      beforeId: CURSOR,
      take: DEFAULT_PAGE_SIZE + 1,
    })
  })

  it('drops the extra record and points the next cursor at the last one kept', async () => {
    const deps = makeDeps()
    deps.repository.findPage.mockResolvedValue(RECORDS)

    const page = await createPhotosService(deps).listPage({
      ownerId: OWNER_ID,
      cursor: undefined,
      limit: '2',
    })

    expect(page).toEqual({ records: RECORDS.slice(0, 2), nextCursor: RECORDS[1].id })
  })

  it('has no next page when no more records than the limit come back', async () => {
    const deps = makeDeps()
    deps.repository.findPage.mockResolvedValue(RECORDS.slice(0, 2))

    const page = await createPhotosService(deps).listPage({
      ownerId: OWNER_ID,
      cursor: undefined,
      limit: '2',
    })

    expect(page).toEqual({ records: RECORDS.slice(0, 2), nextCursor: null })
  })
})
```

- [x] **Step 4: Run them to verify they fail**

Run: `pnpm test`
Expected: FAIL, `Tests  13 failed | 73 passed (86)` (the 12 listing tests: `listPage` is not a function; the `QUERY_INVALID` status).

- [x] **Step 5: Types, error code, client message**

In `server/src/types.ts`, add `  | 'QUERY_INVALID'` after `  | 'BODY_INVALID'` in `ApiErrorCode`, and add after `Photo`:

```ts
// nextCursor is the id to send as cursor for the next page; null on the last page.
export type PhotoPage = {
  photos: Photo[]
  nextCursor: string | null
}
```

In `server/src/errors/error-handler.ts`, add `  QUERY_INVALID: 400,` after `  BODY_INVALID: 400,`.

In `client/src/api.ts`, add `  | 'QUERY_INVALID'` after `  | 'BODY_INVALID'`, and in `ERROR_MESSAGES` after the `BODY_INVALID` line:

```ts
  QUERY_INVALID: 'Requête invalide. Rechargez la page et réessayez.',
```

- [x] **Step 6: Repository**

In `server/src/features/photos/photos.repository.ts`:

1. Add after `NewPhoto`:
   ```ts
   export type PageQuery = { ownerId: string; beforeId: string | undefined; take: number }
   ```
2. In `PhotosRepository`, replace the `findLatest` line with:
   ```ts
     findPage: (query: PageQuery) => Promise<PhotoRecord[]>
   ```
3. In the returned object, replace the `findLatest` entry (its comment and its two lines) with:
   ```ts
       // Keyset on the id: an ObjectId starts with its creation time, so by id is newest
       // first, and "older than the cursor" is a single indexed range.
       findPage: ({ ownerId, beforeId, take }) =>
         prisma.photo.findMany({
           where: { ownerId, id: beforeId ? { lt: beforeId } : undefined },
           orderBy: { id: 'desc' },
           take,
         }),
   ```

- [x] **Step 7: Service**

In `server/src/features/photos/photos.service.ts`:

1. Replace the line `const LATEST_PHOTOS_LIMIT = 20` with:
   ```ts
   export const DEFAULT_PAGE_SIZE = 30
   export const MAX_PAGE_SIZE = 100
   const DIGITS_PATTERN = /^\d+$/
   ```
2. Add after `PhotoDeletion`:
   ```ts
   // cursor and limit come straight from the query string: validated here, at the boundary.
   export type PageInput = { ownerId: string; cursor: unknown; limit: unknown }

   export type RecordPage = { records: PhotoRecord[]; nextCursor: string | null }
   ```
3. In `PhotosService`, replace the `listLatest` line with:
   ```ts
     listPage: (input: PageInput) => Promise<RecordPage>
   ```
4. Add after `parsePhotoId`:
   ```ts
   // Express 5 gives a string, or an array for a repeated key: only one string of digits passes.
   function parseLimit(limit: unknown): number {
     if (limit === undefined) {
       return DEFAULT_PAGE_SIZE
     }
     if (typeof limit !== 'string' || !DIGITS_PATTERN.test(limit)) {
       throw new AppError('QUERY_INVALID')
     }
     const pageSize = Number(limit)
     if (pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
       throw new AppError('QUERY_INVALID')
     }
     return pageSize
   }

   function parseCursor(cursor: unknown): string | undefined {
     if (cursor === undefined) {
       return undefined
     }
     if (typeof cursor !== 'string' || !OBJECT_ID_PATTERN.test(cursor)) {
       throw new AppError('QUERY_INVALID')
     }
     return cursor
   }
   ```
5. Add before `createPhotosService`:
   ```ts
   // One record more than asked tells whether a next page exists, without a count query.
   async function listPage(
     { repository }: PhotosServiceDeps,
     { ownerId, cursor, limit }: PageInput,
   ): Promise<RecordPage> {
     const pageSize = parseLimit(limit)
     const beforeId = parseCursor(cursor)
     const records = await repository.findPage({ ownerId, beforeId, take: pageSize + 1 })
     if (records.length <= pageSize) {
       return { records, nextCursor: null }
     }
     const pageRecords = records.slice(0, pageSize)
     return { records: pageRecords, nextCursor: pageRecords[pageRecords.length - 1].id }
   }
   ```
6. In `createPhotosService`, replace the `listLatest` entry with:
   ```ts
       listPage: (input) => listPage(deps, input),
   ```

- [x] **Step 8: Controller**

In `server/src/features/photos/photos.controller.ts`, replace `import type { Photo } from '../../types.js'` with `import type { Photo, PhotoPage } from '../../types.js'`, and replace the `list` method with:

```ts
    async list(req, res) {
      const { records, nextCursor } = await service.listPage({
        ownerId: currentUser(req).id,
        cursor: req.query.cursor,
        limit: req.query.limit,
      })
      const page: PhotoPage = { photos: records.map(toPhotoDto), nextCursor }
      res.json(page)
    },
```

- [x] **Step 9: Run the unit tests and Bruno**

Run: `pnpm test`
Expected: PASS, `Test Files  7 passed (7)`, `Tests  86 passed (86)`.

Run: `pnpm --filter server typecheck`
Expected: no error. (The client still reads an array: Task 6 follows; `pnpm typecheck` passes anyway since the client parses `unknown`.)

Start the test API (own background command, from `server/`): `PORT=3002 npx tsx --env-file-if-exists=.env src/server.ts`; from `server/bruno/`: `pnpm dlx @usebruno/cli@4.2.0 run . -r --env Local --disable-cookies --env-var baseUrl=http://localhost:3002`
Expected: status PASS, 32 requests, all passed. Stop the test API.

- [x] **Step 10: Gates and commit**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  86 passed (86)`.

```bash
git add -A server/src server/bruno client/src/api.ts
git commit -F <message-file>
```

Message: `feat(server): paginate the photo list with a cursor`, body: `GET /api/photos takes cursor and limit and answers { photos, nextCursor }, newest first, keyset on the ObjectId (id < cursor). A bad limit or cursor answers 400 QUERY_INVALID.` + the attribution lines.

---

### Task 6: The frame loads the whole library, and the PR C docs (PR C, `feat/library-pagination`)

**Files:**
- Modify: `client/src/photo.ts`
- Create: `client/src/photosApi.ts`
- Modify: `client/src/hooks/usePhotoFeed.ts`
- Modify: `ARCHITECTURE.md`

**Interfaces:**
- Consumes: `GET /api/photos` → `{ photos, nextCursor }` (Task 5), `UNAUTHORIZED_STATUS` (`client/src/api.ts`).
- Produces (used by Tasks 7-8):
  ```ts
  // client/src/photo.ts
  export type PhotoPage = { photos: Photo[]; nextCursor: string | null }
  export function isPhotoPage(value: unknown): value is PhotoPage
  // client/src/photosApi.ts
  export type PageRequest = { cursor?: string; limit?: number }
  export function fetchPhotoPage(request: PageRequest, onUnauthenticated: () => void): Promise<PhotoPage | null>
  export function fetchAllPhotos(onUnauthenticated: () => void): Promise<Photo[] | null>
  ```

- [x] **Step 1: Page type**

In `client/src/photo.ts`, add after `Photo`:

```ts
// nextCursor is the id to send as cursor for the next page; null on the last page.
export type PhotoPage = {
  photos: Photo[]
  nextCursor: string | null
}
```

and at the end of the file:

```ts
export function isPhotoPage(value: unknown): value is PhotoPage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'photos' in value &&
    Array.isArray(value.photos) &&
    value.photos.every(isPhoto) &&
    'nextCursor' in value &&
    (value.nextCursor === null || typeof value.nextCursor === 'string')
  )
}
```

- [x] **Step 2: Photos API**

Create `client/src/photosApi.ts`:

```ts
import { UNAUTHORIZED_STATUS } from '@/api.ts'
import { isPhotoPage, type Photo, type PhotoPage } from '@/photo.ts'

// The server's MAX_PAGE_SIZE: the fewest requests for a whole library.
const FRAME_PAGE_SIZE = 100

export type PageRequest = { cursor?: string; limit?: number }

function photosUrl({ cursor, limit }: PageRequest): string {
  const params = new URLSearchParams()
  if (cursor !== undefined) params.set('cursor', cursor)
  if (limit !== undefined) params.set('limit', String(limit))
  const query = params.toString()
  return query === '' ? '/api/photos' : `/api/photos?${query}`
}

// null keeps the photos already shown when a load fails.
export async function fetchPhotoPage(
  request: PageRequest,
  onUnauthenticated: () => void,
): Promise<PhotoPage | null> {
  try {
    const res = await fetch(photosUrl(request))
    if (res.status === UNAUTHORIZED_STATUS) {
      onUnauthenticated()
      return null
    }
    const data: unknown = await res.json()
    if (isPhotoPage(data)) return data
    // Client and API images out of sync: say so instead of waiting forever.
    console.error('Unexpected photos payload from the API')
    return null
  } catch (error: unknown) {
    console.error('Could not load photos', error)
    return null
  }
}

// Every page: old photos never silently leave a gift frame. The loop ends: each cursor
// is strictly older than the previous one. null as soon as one page fails.
export async function fetchAllPhotos(onUnauthenticated: () => void): Promise<Photo[] | null> {
  const photos: Photo[] = []
  let cursor: string | undefined
  do {
    const page = await fetchPhotoPage({ cursor, limit: FRAME_PAGE_SIZE }, onUnauthenticated)
    if (page === null) return null
    photos.push(...page.photos)
    cursor = page.nextCursor ?? undefined
  } while (cursor !== undefined)
  return photos
}
```

- [x] **Step 3: The frame's feed**

Replace `client/src/hooks/usePhotoFeed.ts` with:

```ts
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuth } from '@/auth/AuthContext.ts'
import { isPhoto, type Photo, type ServerToClientEvents } from '@/photo.ts'
import { fetchAllPhotos } from '@/photosApi.ts'

// The message the server's Socket.IO middleware rejects a handshake with, like the HTTP code.
const UNAUTHENTICATED_SOCKET_ERROR = 'UNAUTHENTICATED'

// Once a day: far below the 45 days left under which the server renews a session.
const SESSION_REFRESH_MS = 24 * 60 * 60 * 1000

// The fetch and the event can bring the same photo.
function withNewPhoto(photos: Photo[], photo: Photo): Photo[] {
  return photos.some(({ id }) => id === photo.id) ? photos : [photo, ...photos]
}

// The whole library is loaded: no gap to fill, the photo just leaves the list.
function withoutPhoto(photos: Photo[], deletedId: string): Photo[] {
  return photos.filter(({ id }) => id !== deletedId)
}

// Socket.IO types are a promise, not a check.
function addPhotoIfValid(photo: unknown, setPhotos: Dispatch<SetStateAction<Photo[]>>): void {
  if (!isPhoto(photo)) {
    console.error('Unexpected photo:new payload from the API')
    return
  }
  setPhotos((current) => withNewPhoto(current, photo))
}

// Socket.IO does not retry a handshake its server refused: back to /login.
function dropUserIfRefused({ message }: Error, dropUser: () => void): void {
  if (message === UNAUTHENTICATED_SOCKET_ERROR) dropUser()
}

// Returns the cleanup that stops the socket and the timer.
function connectPhotoFeed(
  setPhotos: Dispatch<SetStateAction<Photo[]>>,
  dropUser: () => void,
): () => void {
  // Same origin: Vite proxies /socket.io to the API, the session cookie goes with it.
  const socket: Socket<ServerToClientEvents> = io()

  async function loadPhotos(): Promise<void> {
    const loadedPhotos = await fetchAllPhotos(dropUser)
    if (loadedPhotos) setPhotos(loadedPhotos)
  }

  // Reconnections too: catches photos sent while offline.
  socket.on('connect', loadPhotos)
  socket.on('connect_error', (error) => dropUserIfRefused(error, dropUser))
  socket.on('photo:new', (photo) => addPhotoIfValid(photo, setPhotos))
  socket.on('photo:deleted', (id) => setPhotos((current) => withoutPhoto(current, id)))

  // An HTTP call slides the session, the socket handshake does not: without it a frame
  // that never reconnects would see its session expire. It also refreshes the feed.
  const refreshTimer = setInterval(loadPhotos, SESSION_REFRESH_MS)

  return () => {
    clearInterval(refreshTimer)
    socket.disconnect()
  }
}

// The whole library of the logged-in user, newest first like GET /api/photos.
export function usePhotoFeed(): Photo[] {
  const { dropUser } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => connectPhotoFeed(setPhotos, dropUser), [dropUser])

  return photos
}
```

- [x] **Step 4: Gates**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  86 passed (86)`.

Manual check (optional for the implementer, done by the controller in the final verification): with the test API on 3002 and the client dev server pointed at it, `/frame` lists every photo of the member; "Photos · N" equals the library size; a deletion from the frame's menu removes the tile without a reload.

- [x] **Step 5: Commit the client**

```bash
git add client/src/photo.ts client/src/photosApi.ts client/src/hooks/usePhotoFeed.ts
git commit -F <message-file>
```

Message: `feat(client): load the whole library on the frame`, body: `The frame fetches every page (100 photos per request) on each connection and once a day, and drops a deleted photo locally: without the 20-photo cap there is no gap to refill.` + the attribution lines.

- [x] **Step 6: ARCHITECTURE**

In `ARCHITECTURE.md`:

1. In the API table, replace the `GET /api/photos` row with:
   ```markdown
   | `GET /api/photos?cursor=<id>&limit=<n>` | `200 { photos, nextCursor }` : photos du compte connecté, la plus récente en premier ; `limit` de 1 à 100 (30 par défaut) ; `nextCursor` est l'id à passer en `cursor` pour la page suivante, `null` à la dernière |
   ```
2. Add after the paragraph starting with `Une \`Photo\` vaut`:
   ```markdown
   La liste est paginée par curseur (_keyset_) sur l'id : un ObjectId commence par sa date de création, trier par id revient donc à trier par date, et `id < cursor` est une seule requête sur l'index `(ownerId, id)`. Une photo ajoutée ou supprimée entre deux pages ne décale rien, contrairement à une pagination par numéro de page.
   ```
3. In the error table, add after the `BODY_INVALID` row:
   ```markdown
   | `limit` ou `cursor` invalide (`GET /api/photos`) | 400 | `QUERY_INVALID` |
   ```
4. In the Pages table, in the `/frame` row, replace `cadre : bibliothèque du compte connecté, en vignettes` with `cadre : toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), en vignettes`.
5. In `## Temps réel`, replace the bullet starting with `Le cadre recharge la liste` with:
   ```markdown
   - Le cadre recharge toute la bibliothèque (toutes les pages) à chaque connexion Socket.IO, reconnexions comprises : une photo envoyée pendant une coupure n'est pas perdue. Ensuite il ajoute `photo:new` en tête et retire `photo:deleted` de la liste, sans recharger. Limite connue : chaque connexion relit toutes les pages et le diaporama crée une diapositive par photo, ce qui convient à quelques centaines de photos.
   ```

Run: `pnpm check` (format with `pnpm exec biome format --write ARCHITECTURE.md` if the hook rejects it).

```bash
git add ARCHITECTURE.md
git commit -F <message-file>
```

Message: `docs: describe the paginated photo list` + the attribution lines.

---

## PR D — `feat/library-page`

> **Controller:** before Task 7, run `gh stack add feat/library-page`.

### Task 7: Shared photo socket, and frame components ready for the library page (PR D, `feat/library-page`)

**Files:**
- Create: `client/src/photoList.ts`, `client/src/photoSocket.ts`
- Modify: `client/src/hooks/usePhotoFeed.ts`
- Modify: `client/src/components/frame/PhotoGrid.tsx`, `PhotoList.tsx`, `LibraryScreen.tsx`

**Interfaces:**
- Consumes: `fetchAllPhotos` (Task 6), `isPhoto`, `ServerToClientEvents` (`client/src/photo.ts`).
- Produces (used by Task 8):
  ```ts
  // client/src/photoList.ts
  export function withNewPhoto(photos: Photo[], photo: Photo): Photo[]
  export function withoutPhoto(photos: Photo[], deletedId: string): Photo[]
  // client/src/photoSocket.ts
  export type PhotoSocket = Socket<ServerToClientEvents>
  export type PhotoSocketHandlers = {
    onConnect: () => void
    onNewPhoto: (photo: Photo) => void
    onDeletedPhoto: (id: string) => void
    onRefused: () => void
  }
  export function connectPhotoSocket(handlers: PhotoSocketHandlers): PhotoSocket
  // PhotoGrid / PhotoList props: currentId: string | null
  ```

This task changes no behaviour: its check is the build plus the frame still working.

- [x] **Step 1: List helpers and shared socket**

Create `client/src/photoList.ts`:

```ts
import type { Photo } from '@/photo.ts'

// A fetch, an upload response and the socket event can bring the same photo.
export function withNewPhoto(photos: Photo[], photo: Photo): Photo[] {
  return photos.some(({ id }) => id === photo.id) ? photos : [photo, ...photos]
}

export function withoutPhoto(photos: Photo[], deletedId: string): Photo[] {
  return photos.filter(({ id }) => id !== deletedId)
}
```

Create `client/src/photoSocket.ts`:

```ts
import { io, type Socket } from 'socket.io-client'
import { isPhoto, type Photo, type ServerToClientEvents } from '@/photo.ts'

// The message the server's Socket.IO middleware rejects a handshake with, like the HTTP code.
const UNAUTHENTICATED_SOCKET_ERROR = 'UNAUTHENTICATED'

export type PhotoSocket = Socket<ServerToClientEvents>

export type PhotoSocketHandlers = {
  onConnect: () => void
  onNewPhoto: (photo: Photo) => void
  onDeletedPhoto: (id: string) => void
  onRefused: () => void
}

// Socket.IO types are a promise, not a check.
function handleNewPhoto(photo: unknown, onNewPhoto: (photo: Photo) => void): void {
  if (!isPhoto(photo)) {
    console.error('Unexpected photo:new payload from the API')
    return
  }
  onNewPhoto(photo)
}

export function connectPhotoSocket({
  onConnect,
  onNewPhoto,
  onDeletedPhoto,
  onRefused,
}: PhotoSocketHandlers): PhotoSocket {
  // Same origin: Vite proxies /socket.io to the API, the session cookie goes with it.
  const socket: PhotoSocket = io()
  // Reconnections too: catches what changed while offline.
  socket.on('connect', onConnect)
  // Socket.IO does not retry a handshake its server refused.
  socket.on('connect_error', ({ message }) => {
    if (message === UNAUTHENTICATED_SOCKET_ERROR) onRefused()
  })
  socket.on('photo:new', (photo) => handleNewPhoto(photo, onNewPhoto))
  socket.on('photo:deleted', onDeletedPhoto)
  return socket
}
```

- [x] **Step 2: The frame's feed on the shared socket**

Replace `client/src/hooks/usePhotoFeed.ts` with:

```ts
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import type { Photo } from '@/photo.ts'
import { withNewPhoto, withoutPhoto } from '@/photoList.ts'
import { connectPhotoSocket } from '@/photoSocket.ts'
import { fetchAllPhotos } from '@/photosApi.ts'

// Once a day: far below the 45 days left under which the server renews a session.
const SESSION_REFRESH_MS = 24 * 60 * 60 * 1000

// Returns the cleanup that stops the socket and the timer.
function connectPhotoFeed(
  setPhotos: Dispatch<SetStateAction<Photo[]>>,
  dropUser: () => void,
): () => void {
  async function loadPhotos(): Promise<void> {
    const loadedPhotos = await fetchAllPhotos(dropUser)
    if (loadedPhotos) setPhotos(loadedPhotos)
  }

  const socket = connectPhotoSocket({
    onConnect: loadPhotos,
    onNewPhoto: (photo) => setPhotos((current) => withNewPhoto(current, photo)),
    // The whole library is loaded: no gap to fill, the photo just leaves the list.
    onDeletedPhoto: (id) => setPhotos((current) => withoutPhoto(current, id)),
    onRefused: dropUser,
  })

  // An HTTP call slides the session, the socket handshake does not: without it a frame
  // that never reconnects would see its session expire. It also refreshes the feed.
  const refreshTimer = setInterval(loadPhotos, SESSION_REFRESH_MS)

  return () => {
    clearInterval(refreshTimer)
    socket.disconnect()
  }
}

// The whole library of the logged-in user, newest first like GET /api/photos.
export function usePhotoFeed(): Photo[] {
  const { dropUser } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => connectPhotoFeed(setPhotos, dropUser), [dropUser])

  return photos
}
```

Run: `pnpm check && pnpm typecheck && pnpm build`
Expected: all green.

```bash
git add client/src/photoList.ts client/src/photoSocket.ts client/src/hooks/usePhotoFeed.ts
git commit -F <message-file>
```

Message: `refactor(client): share the photo socket between hooks` + the attribution lines.

- [x] **Step 3: Grid and list without a current photo, header offset in LibraryScreen**

Replace `client/src/components/frame/PhotoGrid.tsx` with:

```tsx
import type { JSX } from 'react'
import { PhotoGridTile } from '@/components/frame/PhotoGridTile.tsx'
import type { Photo } from '@/photo.ts'

type PhotoGridProps = {
  photos: Photo[]
  // null on the library page: no photo is on screen there.
  currentId: string | null
  onSelect: (id: string) => void
}

export function PhotoGrid({ photos, currentId, onSelect }: PhotoGridProps): JSX.Element {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4 p-8">
      {photos.map((photo) => (
        <PhotoGridTile
          key={photo.id}
          photo={photo}
          isCurrent={photo.id === currentId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}
```

Replace `client/src/components/frame/PhotoList.tsx` with:

```tsx
import type { JSX } from 'react'
import { PhotoListRow } from '@/components/frame/PhotoListRow.tsx'
import type { Photo } from '@/photo.ts'

type PhotoListProps = {
  photos: Photo[]
  // null on the library page: no photo is on screen there.
  currentId: string | null
  onSelect: (id: string) => void
}

export function PhotoList({ photos, currentId, onSelect }: PhotoListProps): JSX.Element {
  return (
    <ul className="mx-auto flex max-w-3xl flex-col gap-1 p-8">
      {photos.map((photo) => (
        <PhotoListRow
          key={photo.id}
          photo={photo}
          isCurrent={photo.id === currentId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}
```

In `client/src/components/frame/LibraryScreen.tsx`, replace the ternary block

```tsx
      {layout === 'grid' ? (
        <PhotoGrid photos={photos} currentId={currentId} onSelect={onOpenPhoto} />
      ) : (
        <PhotoList photos={photos} currentId={currentId} onSelect={onOpenPhoto} />
      )}
```

with:

```tsx
      {/* With the grid's or list's own p-8, keeps the first row clear of the fixed header. */}
      <div className="pt-16">
        {layout === 'grid' ? (
          <PhotoGrid photos={photos} currentId={currentId} onSelect={onOpenPhoto} />
        ) : (
          <PhotoList photos={photos} currentId={currentId} onSelect={onOpenPhoto} />
        )}
      </div>
```

- [x] **Step 4: Gates and commit**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  86 passed (86)`.

Manual check (optional for the implementer, done by the controller in the final verification): on `/frame`, the library's first row sits under the fixed header exactly as before; the slideshow still receives new photos live.

```bash
git add client/src/components/frame/PhotoGrid.tsx client/src/components/frame/PhotoList.tsx client/src/components/frame/LibraryScreen.tsx
git commit -F <message-file>
```

Message: `refactor(client): let the photo grid and list show no current photo` + the attribution lines.

---

### Task 8: The library page on `/`, and the PR D docs (PR D, `feat/library-page`)

**Files:**
- Modify: `client/src/photosApi.ts` (adds `postPhoto`)
- Create: `client/src/hooks/usePhotoLibrary.ts`
- Create: `client/src/components/library/UploadForm.tsx`, `client/src/components/library/LibrarySection.tsx`
- Rename + rewrite: `client/src/pages/UploadPage.tsx` → `client/src/pages/LibraryPage.tsx`
- Modify: `client/src/App.tsx`, `client/src/pages/LoginPage.tsx` (comment), `client/src/deletePhoto.ts` (comment)
- Modify: `ARCHITECTURE.md`, `README.md`

**Interfaces:**
- Consumes: `fetchPhotoPage` (Task 6), `connectPhotoSocket`, `withNewPhoto`, `withoutPhoto` (Task 7), `PhotoGrid` / `PhotoList` with `currentId={null}` (Task 7), `LayoutToggle`, `useLibraryLayout`, `useAuth().dropUser`.
- Produces:
  ```ts
  // client/src/photosApi.ts
  export type UploadResult =
    | { status: 'uploaded'; photo: Photo }
    | { status: 'failed'; message: string }
    | { status: 'unauthenticated' }
  export function postPhoto(file: File): Promise<UploadResult>
  // client/src/hooks/usePhotoLibrary.ts
  export type PhotoLibrary = {
    photos: Photo[]
    hasMore: boolean
    isLoadingMore: boolean
    loadMore: () => Promise<void>
    addPhoto: (photo: Photo) => void
  }
  export function usePhotoLibrary(): PhotoLibrary
  ```

- [x] **Step 1: Upload call**

Replace `client/src/photosApi.ts` with:

```ts
import { errorMessage, UNAUTHORIZED_STATUS } from '@/api.ts'
import { isPhoto, isPhotoPage, type Photo, type PhotoPage } from '@/photo.ts'

// The server's MAX_PAGE_SIZE: the fewest requests for a whole library.
const FRAME_PAGE_SIZE = 100

export type PageRequest = { cursor?: string; limit?: number }

export type UploadResult =
  | { status: 'uploaded'; photo: Photo }
  | { status: 'failed'; message: string }
  | { status: 'unauthenticated' }

function photosUrl({ cursor, limit }: PageRequest): string {
  const params = new URLSearchParams()
  if (cursor !== undefined) params.set('cursor', cursor)
  if (limit !== undefined) params.set('limit', String(limit))
  const query = params.toString()
  return query === '' ? '/api/photos' : `/api/photos?${query}`
}

// null keeps the photos already shown when a load fails.
export async function fetchPhotoPage(
  request: PageRequest,
  onUnauthenticated: () => void,
): Promise<PhotoPage | null> {
  try {
    const res = await fetch(photosUrl(request))
    if (res.status === UNAUTHORIZED_STATUS) {
      onUnauthenticated()
      return null
    }
    const data: unknown = await res.json()
    if (isPhotoPage(data)) return data
    // Client and API images out of sync: say so instead of waiting forever.
    console.error('Unexpected photos payload from the API')
    return null
  } catch (error: unknown) {
    console.error('Could not load photos', error)
    return null
  }
}

// Every page: old photos never silently leave a gift frame. The loop ends: each cursor
// is strictly older than the previous one. null as soon as one page fails.
export async function fetchAllPhotos(onUnauthenticated: () => void): Promise<Photo[] | null> {
  const photos: Photo[] = []
  let cursor: string | undefined
  do {
    const page = await fetchPhotoPage({ cursor, limit: FRAME_PAGE_SIZE }, onUnauthenticated)
    if (page === null) return null
    photos.push(...page.photos)
    cursor = page.nextCursor ?? undefined
  } while (cursor !== undefined)
  return photos
}

export async function postPhoto(file: File): Promise<UploadResult> {
  const body = new FormData()
  body.append('photo', file)
  try {
    const res = await fetch('/api/photos', { method: 'POST', body })
    if (res.status === UNAUTHORIZED_STATUS) return { status: 'unauthenticated' }
    // Not JSON when the dev proxy answers for a stopped API.
    const data: unknown = await res.json().catch(() => null)
    if (res.ok && isPhoto(data)) return { status: 'uploaded', photo: data }
    return { status: 'failed', message: errorMessage(data) }
  } catch {
    // fetch rejects only on network failure.
    return { status: 'failed', message: errorMessage(null) }
  }
}
```

- [x] **Step 2: Library state hook**

Create `client/src/hooks/usePhotoLibrary.ts`:

```ts
import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import type { Photo } from '@/photo.ts'
import { withNewPhoto, withoutPhoto } from '@/photoList.ts'
import { connectPhotoSocket } from '@/photoSocket.ts'
import { fetchPhotoPage } from '@/photosApi.ts'

export type PhotoLibrary = {
  photos: Photo[]
  hasMore: boolean
  isLoadingMore: boolean
  loadMore: () => Promise<void>
  addPhoto: (photo: Photo) => void
}

type LibrarySetters = {
  setPhotos: Dispatch<SetStateAction<Photo[]>>
  setNextCursor: Dispatch<SetStateAction<string | null>>
}

// Returns the cleanup that stops the socket.
function connectLibrary(
  { setPhotos, setNextCursor }: LibrarySetters,
  dropUser: () => void,
): () => void {
  // Each (re)connection starts over from the first page: simple, and catches what changed offline.
  async function loadFirstPage(): Promise<void> {
    const page = await fetchPhotoPage({}, dropUser)
    if (page === null) return
    setPhotos(page.photos)
    setNextCursor(page.nextCursor)
  }

  const socket = connectPhotoSocket({
    onConnect: loadFirstPage,
    onNewPhoto: (photo) => setPhotos((current) => withNewPhoto(current, photo)),
    // The delete dialog relies on this event, as on the frame.
    onDeletedPhoto: (id) => setPhotos((current) => withoutPhoto(current, id)),
    onRefused: dropUser,
  })
  return () => {
    socket.disconnect()
  }
}

export function usePhotoLibrary(): PhotoLibrary {
  const { dropUser } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  useEffect(() => connectLibrary({ setPhotos, setNextCursor }, dropUser), [dropUser])

  const loadMore = useCallback(async (): Promise<void> => {
    if (nextCursor === null) return
    setIsLoadingMore(true)
    const page = await fetchPhotoPage({ cursor: nextCursor }, dropUser)
    setIsLoadingMore(false)
    if (page === null) return
    // Keyset pages never overlap: the next one goes at the end as is.
    setPhotos((current) => [...current, ...page.photos])
    setNextCursor(page.nextCursor)
  }, [nextCursor, dropUser])

  // The upload response and the photo:new event bring the same photo: withNewPhoto keeps one.
  const addPhoto = useCallback((photo: Photo): void => {
    setPhotos((current) => withNewPhoto(current, photo))
  }, [])

  return { photos, hasMore: nextCursor !== null, isLoadingMore, loadMore, addPhoto }
}
```

- [x] **Step 3: Upload form**

Create `client/src/components/library/UploadForm.tsx`:

```tsx
import { type ChangeEvent, type JSX, type SubmitEvent, useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import type { Photo } from '@/photo.ts'
import { postPhoto } from '@/photosApi.ts'

type UploadStatus = 'idle' | 'sending' | 'success' | 'error'

type PhotoUpload = {
  status: UploadStatus
  error: string
  // true when the photo was saved: the form then empties its inputs.
  send: (file: File) => Promise<boolean>
  clearStatus: () => void
}

type UploadFormProps = {
  onUploaded: (photo: Photo) => void
}

type FileFieldProps = {
  id: string
  label: string
  capture?: 'environment'
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

function usePreviewUrl(file: File | null): string | null {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return previewUrl
}

function usePhotoUpload(onUploaded: (photo: Photo) => void): PhotoUpload {
  const { dropUser } = useAuth()
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [error, setError] = useState('')

  async function send(file: File): Promise<boolean> {
    setStatus('sending')
    const result = await postPhoto(file)
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
    onUploaded(result.photo)
    setStatus('success')
    return true
  }

  return { status, error, send, clearStatus: () => setStatus('idle') }
}

function FileField({ id, label, capture, onChange }: FileFieldProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="file" accept="image/*" capture={capture} onChange={onChange} />
    </div>
  )
}

function UploadAlert({ status, error }: Pick<PhotoUpload, 'status' | 'error'>): JSX.Element | null {
  if (status === 'success') {
    return (
      <Alert>
        <AlertDescription>Photo envoyée !</AlertDescription>
      </Alert>
    )
  }
  if (status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  return null
}

export function UploadForm({ onUploaded }: UploadFormProps): JSX.Element {
  const upload = usePhotoUpload(onUploaded)
  const [file, setFile] = useState<File | null>(null)
  // A new key remounts the file inputs, which empties them.
  const [inputsKey, setInputsKey] = useState(0)
  const previewUrl = usePreviewUrl(file)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    setFile(event.target.files?.[0] ?? null)
    upload.clearStatus()
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!file) return
    if (await upload.send(file)) {
      setFile(null)
      setInputsKey((key) => key + 1)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FileField
        key={`camera-${inputsKey}`}
        id="camera-photo"
        label="Prendre une photo"
        capture="environment"
        onChange={handleFileChange}
      />
      <FileField
        key={`gallery-${inputsKey}`}
        id="gallery-photo"
        label="Choisir une image"
        onChange={handleFileChange}
      />
      {previewUrl && (
        <img
          className="max-h-[40vh] w-full rounded-lg object-contain"
          src={previewUrl}
          alt="Aperçu avant envoi"
        />
      )}
      <Button type="submit" size="lg" disabled={!file || upload.status === 'sending'}>
        {upload.status === 'sending' ? 'Envoi…' : 'Envoyer'}
      </Button>
      <UploadAlert status={upload.status} error={upload.error} />
    </form>
  )
}
```

- [x] **Step 4: "Ma bibliothèque" section**

Create `client/src/components/library/LibrarySection.tsx`:

```tsx
import type { JSX } from 'react'
import { LayoutToggle } from '@/components/frame/LayoutToggle.tsx'
import { PhotoGrid } from '@/components/frame/PhotoGrid.tsx'
import { PhotoList } from '@/components/frame/PhotoList.tsx'
import { Button } from '@/components/ui/button.tsx'
import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'
import { useLibraryLayout } from '@/hooks/useLibraryLayout.ts'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import type { Photo } from '@/photo.ts'

type LibrarySectionProps = {
  library: PhotoLibrary
}

type LibraryPhotosProps = {
  photos: Photo[]
  layout: LibraryLayout
  onSelect: (id: string) => void
}

function LibraryPhotos({ photos, layout, onSelect }: LibraryPhotosProps): JSX.Element {
  if (photos.length === 0) {
    return <p className="px-8 py-10 text-muted-foreground">Aucune photo pour l'instant.</p>
  }
  // currentId null: no photo is on screen here, so no tile gets the frame's ring.
  return layout === 'grid' ? (
    <PhotoGrid photos={photos} currentId={null} onSelect={onSelect} />
  ) : (
    <PhotoList photos={photos} currentId={null} onSelect={onSelect} />
  )
}

export function LibrarySection({ library }: LibrarySectionProps): JSX.Element {
  const [layout, setLayout] = useLibraryLayout()
  const { photos, hasMore, isLoadingMore, loadMore } = library

  // No viewer to build: on a phone, the full photo in a new tab is enough.
  function openPhoto(id: string): void {
    const photo = photos.find((candidate) => candidate.id === id)
    if (photo) window.open(photo.url, '_blank', 'noopener')
  }

  return (
    // `dark` and the frame background: the frame's components look as designed.
    <section
      aria-labelledby="library-title"
      className="dark rounded-2xl bg-frame-background text-foreground"
    >
      <header className="flex items-center gap-4 px-8 pt-6">
        <h2 id="library-title" className="text-xl font-medium tracking-tight">
          Ma bibliothèque
        </h2>
        <div className="ml-auto">
          <LayoutToggle layout={layout} onLayoutChange={setLayout} />
        </div>
      </header>
      <LibraryPhotos photos={photos} layout={layout} onSelect={openPhoto} />
      {hasMore && (
        <div className="flex justify-center px-8 pb-8">
          <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? 'Chargement…' : 'Charger plus'}
          </Button>
        </div>
      )}
    </section>
  )
}
```

(If Biome's import sorting merges the two `@/hooks/useLibraryLayout.ts` imports into `import { type LibraryLayout, useLibraryLayout } from …`, accept its fix: `pnpm check:fix`.)

- [x] **Step 5: The page and the route**

```bash
git mv client/src/pages/UploadPage.tsx client/src/pages/LibraryPage.tsx
```

Replace `client/src/pages/LibraryPage.tsx` with:

```tsx
import type { JSX } from 'react'
import { LogoutButton } from '@/components/auth/LogoutButton.tsx'
import { LibrarySection } from '@/components/library/LibrarySection.tsx'
import { UploadForm } from '@/components/library/UploadForm.tsx'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import { usePhotoLibrary } from '@/hooks/usePhotoLibrary.ts'

export default function LibraryPage(): JSX.Element {
  const library = usePhotoLibrary()

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">FamilyFrame</CardTitle>
          <CardDescription>
            Ajoutez une photo à votre bibliothèque : elle s'affiche sur votre cadre.
          </CardDescription>
          <CardAction>
            <LogoutButton />
          </CardAction>
        </CardHeader>
        <CardContent>
          <UploadForm onUploaded={library.addPhoto} />
        </CardContent>
      </Card>
      <LibrarySection library={library} />
    </main>
  )
}
```

In `client/src/App.tsx`, replace `import UploadPage from './pages/UploadPage.tsx'` with `import LibraryPage from './pages/LibraryPage.tsx'` (keep the imports sorted: it goes before `LoginPage`), and `<UploadPage />` with `<LibraryPage />`.

In `client/src/pages/LoginPage.tsx`, replace the comment `// RequireAuth stores the page the user asked for; otherwise the upload page.` with `// RequireAuth stores the page the user asked for; otherwise the library page.`

In `client/src/deletePhoto.ts`, replace the comment line `// The list is not touched here: the server's photo:deleted reaches every frame, this one included.` with `// The list is not touched here: the server's photo:deleted reaches every page and frame of the owner, this one included.`

- [x] **Step 6: Gates**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  86 passed (86)`.

Run: `git grep -n UploadPage -- client/src`
Expected: no output.

Manual check (optional for the implementer, done by the controller in the final verification): on `/`, the upload card then « Ma bibliothèque »; an upload appears at the top of the library at once (and only once); sending the same file again shows « Cette photo est déjà dans votre bibliothèque. »; « Supprimer » from a tile's menu removes it; a click on a tile opens the full photo in a new tab; the grid/list choice is the one `/frame` uses.

- [x] **Step 7: Commit**

```bash
git add -A client/src
git commit -F <message-file>
```

Message: `feat(client): turn the upload page into the library page`, body: `/ shows the upload card and, below it, the user's library from the frame's grid and list, 30 photos per page with "Charger plus", kept live by the same socket events as the frame.` + the attribution lines.

- [x] **Step 8: Docs**

In `ARCHITECTURE.md`:

1. In the mermaid diagram, replace `phone["Smartphone<br/>(page d'envoi)"]` with `phone["Smartphone<br/>(bibliothèque)"]`.
2. Replace `Trois pages React (connexion, envoi, cadre)` with `Trois pages React (connexion, bibliothèque, cadre)`, and in `## Organisation du dépôt` replace `les pages React (connexion, envoi, cadre)` with `les pages React (connexion, bibliothèque, cadre)`.
3. In the Pages table, replace the `/` row's description with `bibliothèque : carte d'envoi (« Prendre une photo » ou « Choisir une image »), puis les photos du compte en vignettes ou en liste (même choix mémorisé que le cadre), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans un nouvel onglet ; « Se déconnecter »`.
4. In `## Temps réel`, append to the bullet starting with `Le cadre recharge toute la bibliothèque`: ` La page bibliothèque (\`/\`) recharge sa première page à chaque connexion et suit les mêmes événements (\`usePhotoLibrary\`, socket partagée dans \`client/src/photoSocket.ts\`).`

In `README.md`, in the services table replace the row `| Envoi         | http://localhost:5180       |` with `| Bibliothèque  | http://localhost:5180       |`, and in the paragraph starting with `Sans session, l'envoi et le cadre redirigent` replace `l'envoi et le cadre` with `la bibliothèque et le cadre`.

Run: `pnpm check` (format the `.md` files with `pnpm exec biome format --write README.md ARCHITECTURE.md` if the hook rejects them).

```bash
git add ARCHITECTURE.md README.md
git commit -F <message-file>
```

Message: `docs: describe the library page` + the attribution lines.

---

## Final verification (controller)

- [x] `pnpm check && pnpm typecheck && pnpm build && pnpm test` on `feat/library-page`: green, `Tests  87 passed (87)`.
- [x] Bruno gate command against a test API on port 3002 started from `feat/library-page`: 32/32.
- [x] `git grep -n uploaderName -- client/src server/src server/prisma ARCHITECTURE.md README.md`: no output; `server/bruno` has only the `isUndefined` assertion of `create/01`.
- [ ] Manual (spec, "Testing"), with Claude in Chrome or left to the author: the member on `/frame` in one browser, the admin on `/frame` in another; an upload by the member reaches the member's frame only; a deletion removes it from the member's frame only. On `/`: the duplicate message; « Charger plus » with more than 30 photos; the frame with more than 100 photos (several pages). Distinct test images can come from a throwaway script outside the repo (never committed).
- [ ] `git log --oneline feat/client-login..feat/library-page`: one concern per commit, each ending with the attribution lines; `git diff --stat feat/client-login..feat/library-page` shows no `.env` file.
- [ ] Fresh-context review of the whole stack diff (`superpowers:requesting-code-review`), then `gh stack submit --auto` (draft PRs) and `gh stack view --json`.

---

## Drift Log

Format: `date · task/step · what the plan said · what was done · why`.

| Date | Task / step | Plan said | Done | Why |
| ---- | ----------- | --------- | ---- | --- |
| 2026-11-24 | Task 6, step 3 (`usePhotoFeed`) | The frame's load replaces the list when the pages arrive | Generation counter and replay of live events (`photo:new`, `photo:deleted`) received during a load, in `client/src/liveLoads.ts`; only the latest load applies | Replace-on-load lost a `photo:new` received mid-load, resurrected a photo deleted mid-load and let overlapping loads apply out of order. Controller decision while the author was away: pending author validation |
| 2026-11-24 | Task 6, step 2 (`fetchAllPhotos`) | No guard on the cursor | Stops when a page returns the same cursor as the previous one | Defensive against an endless loop on a misbehaving server |
| 2026-11-24 | Task 7 (`usePhotoFeed`) | Paste the brief's `usePhotoFeed` replacement | Not pasted: the extraction of the shared load logic was done on top of the Task 6 fix | The brief's version predates the generation counter and would have dropped it |
| 2026-11-24 | Task 8 (`usePhotoLibrary`) | Own load and buffers in the hook | Rebuilt on `liveLoads.ts`; the next-page cursor is bound to the load that produced it (`{ cursor, loadId }`) | A click after a reconnect's `begin()` but before its result paired the new generation with the old cursor. Controller decision while the author was away: pending author validation |
| 2026-11-24 | Task 8 (`addPhoto`) | `addPhoto` only adds the photo to the list | It also calls `rememberAdded` | A first page landing after the 201 would have hidden the upload |
| 2026-11-24 | Final review, Task 4 (`destroyUnusedImage`) | A failing `countByCloudinaryId` after the delete propagates | Caught: `photo.orphaned` logged, image kept, the delete completes (unit tests 86 to 87) | Otherwise a completed delete answered 500, sent no `photo:deleted` event and leaked the image silently |

---

## Self-review (done while writing the plan)

**1. Spec coverage**

| Spec item | Task |
| --- | --- |
| `Photo.ownerId` (`@db.ObjectId`, relation, required), `User.photos`, `@@index([ownerId, id])`, `cloudinaryId` plain `@@index` | 1 |
| `uploaderName` removed: schema, DTO, server type, client type, frame components, Bruno, docs | 1, 2 |
| `senderId` not added | nothing planned |
| Existing photos: seed then push, seed unchanged | C1, C3 (seed comment only, Task 1) |
| SHA-256 of the original bytes before sharp; lookup → 409 before processing; P2002 → 409 and new image destroyed; `@@unique([ownerId, sha256])` | 3 |
| Cloudinary destroyed only when no other photo has the `cloudinaryId` | 4 |
| `GET /api/photos?cursor&limit`, keyset `id < cursor`, `{ photos, nextCursor }`, 30 / 100, `QUERY_INVALID` 400 | 5 |
| Frame loads every page (`limit=100`) | 6 |
| `DELETE` matches `{ id, ownerId }`, another user's photo → 404 | 1 |
| Events to `user:<ownerId>`; `userRoom` exported from `auth.socket.ts`, used by the middleware; comment removed | 1 |
| Repository functions `findPage`, `findByOwnerAndSha256`, `create` (null on P2002), `deleteOwned` (null on P2025), `countByCloudinaryId`; `findLatest` / `deleteById` removed | 1, 3, 4, 5 (`findLatest` kept until 5, capped at 20 as the spec's PR A scope says) |
| Service `createPhoto` steps 1-6, `listPage` validation and `take: limit + 1`, `deletePhoto` with count and `isImageDestroyed`, `LATEST_PHOTOS_LIMIT` gone | 1, 3, 4, 5 |
| Controller `list` / `create` / `remove` per spec; `toPhotoDto` without name | 1, 5 |
| `types.ts` `Photo`, `PhotoPage`, codes; `error-handler.ts` 409 / 400 | 1, 3, 5 |
| Client `photo.ts` (`isPhoto`, `PhotoPage`, `isPhotoPage`), `api.ts` codes and messages | 2, 3, 5, 6 |
| `photosApi.ts` (`fetchPhotoPage`, `fetchAllPhotos`, `FRAME_PAGE_SIZE`) | 6 (+ `postPhoto` in 8) |
| `photoSocket.ts` (`connectPhotoSocket`, `isPhoto` check, `UNAUTHENTICATED` refusal) | 7 |
| `photoLabel.ts` (`formatPhotoDay`, `photoLabel`) | 2 |
| `usePhotoFeed`: same signature, all pages on connect and daily, local deletion | 6, 7 |
| Frame component table (caption, tile, row, slide, strip, dialog, grid/list `currentId`, `pt-24`) | 2, 7 |
| `PhotoActionsMenu` unchanged | nothing planned |
| `LibraryPage` (`git mv`), `max-w-5xl`, card `max-w-md`, `UploadForm` with `onUploaded` and `isPhoto`, card text, "Ma bibliothèque" dark section, `LayoutToggle`, grid/list `currentId={null}`, « Charger plus » / « Chargement… », empty text, new tab, `usePhotoLibrary` behaviour, logout in the card header | 8 |
| Unit tests listed in the spec's Testing section | 1, 3, 4, 5 |
| Bruno: `Local.bru` admin vars, `login/05` → `adminCookie`, `create/01` `isUndefined`, `03-edge-doublon`, `createdPngId` + `delete/05`, `09` body, folder order, `list/01`–`05` + sans cookie, `delete/01-edge` with list checks, renumbering, docs without `uploaderName`, seed reset note | 1, 3, 5 (PNG cleanup moved to 1: see Choices) |
| Docs: ARCHITECTURE sections listed in the spec, README seed-before-push, `.env.example` unchanged | 2, 4, 6, 8 |
| Delivery: 4 PRs, `gh stack add` at PR boundaries, seed + push after A and after B | Stack section, banners before Tasks 3, 5, 7, checkpoints C1-C3 |
| Manual checks (two browsers, « Charger plus », duplicate message, >100 photos) | Final verification |
| Out of scope (perceptual hash, client pre-check, sharing, invitations, friends, count, virtualisation, viewer) | not planned |

No gap found.

**2. Placeholder scan:** no "TBD", "TODO", "similar to Task N" or step without its content. `<message-file>` is the path of the commit message file the implementer writes in the scratchpad (same convention as the previous plans); every message's subject and body are given. Docs steps give the exact text to insert.

**3. Type consistency:** `NewPhoto` gains `sha256` in Task 3 and every caller (`saveRecord`) passes it; `PhotosRepository` members (`findLatest` → `findPage`, `findByOwnerAndSha256`, `create`, `deleteOwned`, `countByCloudinaryId`) match between the repository, the service and both test files' `makeDeps` at each task; `PhotosService` (`listLatest` → `listPage`, `createPhoto`, `deletePhoto({ ownerId, id })`) matches the controller; `PageInput`, `RecordPage`, `PageQuery`, `DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE` match between Task 5's service, repository and `photos.service.list.test.ts`; client `PhotoPage` / `isPhotoPage` (Task 6), `fetchPhotoPage(request, onUnauthenticated)` (Tasks 6, 8), `connectPhotoSocket(handlers)` and `withNewPhoto` / `withoutPhoto` (Task 7), `PhotoLibrary` (Task 8) are defined before use. Test counts: 70 → 70 (T1) → 73 (T3) → 74 (T4) → 86 (T5). Bruno counts: 24 → 27 (T1) → 28 (T3) → 28 (T4) → 32 (T5).
