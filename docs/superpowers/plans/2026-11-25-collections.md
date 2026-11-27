---
plan: collections
status: draft
spec: docs/superpowers/specs/2026-11-25-collections-design.md
branch: feat/collections-server (PR A), feat/collections-library (PR B), feat/collections-frame (PR C)
worktree: false
tasks_total: 7
tasks_done: 0
current_task: null
last_commit: null
last_updated: 2026-11-25
---

# Collections (Step 10) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Working agreement (mandatory):** keep this plan in sync with reality. Check a step only when it is finished and its gate is green. Append every divergence to the Drift Log. Update the frontmatter (`tasks_done`, `current_task`, `last_commit`, `last_updated`) at each task boundary. When a drift changes a decision of the spec, add a new spec doc rather than rewriting this one.

**Goal:** A member creates, renames and deletes private collections, files library photos into them from the « … » menu (grid, list, viewer, slideshow), and the frame plays the whole library or one collection, in order or shuffled, chosen from the slideshow menu, the preferences or « Lire sur le cadre ». An unopened received photo never enters a collection.

**Architecture:** a new `Collection` model holds `photoIds` (`String[] @db.ObjectId`, written `[]` at creation) and a unique `(ownerId, name)` index. A `features/collections/` slice (repository, service, controller, routes) serves six endpoints behind `requireAuth`; every write emits a payload-less `collections:changed` to the owner's room. Adding is one guarded `push`; removing is read-then-`set`; dead ids are filtered on read. On the client, `CollectionsProvider` (behind `RequireAuth`) shares the list and its actions; the library gets a « Mes collections » card, `PhotoActionsMenu` a « Collections » submenu. The frame gains a `PhotoSource` setting, `useSourcePhotos` filters its feed, and a source change restarts the selection and the shuffle.

**Tech Stack:** Node 24, TypeScript 7, Express 5, Socket.IO 4, Prisma 6.19 (MongoDB), Vitest, Biome 2, Bruno CLI 4.2.0, React 19 + Radix (shadcn `dropdown-menu`, `dialog`, `alert-dialog`, `toggle-group`) + lucide-react (`FolderIcon`, `ImagesIcon`, `MonitorIcon`, `PencilIcon`, `PlusIcon`), sonner, Tailwind 4, `gh stack`.

## Global Constraints

- **No new dependency**, server or client: every icon and primitive above is installed. **Never run `shadcn` or any CLI that adds dependencies.** **Prisma stays on v6** (v7+ has no MongoDB support).
- **No client test runner:** the client has none; do not add one. Client tasks are verified by `pnpm typecheck`, `pnpm build`, `pnpm check` and the manual checks of the final verification.
- **Error codes (exact, from the spec):** `COLLECTION_NAME_INVALID` → `400` « Choisissez un nom de 1 à 50 caractères. », `COLLECTION_NOT_FOUND` → `404` « Cette collection n'existe plus. », `COLLECTION_EXISTS` → `409` « Vous avez déjà une collection de ce nom. ». Reused: `PHOTO_NOT_FOUND` (404), `BODY_INVALID` (400), `UNAUTHENTICATED` (401). Server codes in Task 1, client messages in Task 3.
- **DTO (exact):** `Collection = { id, name, photoIds }` (`photoIds`: live, opened photos of the owner, in the order they were added); `CollectionList = { collections: Collection[] }`. Socket event: `collections:changed` (no payload, owner's room).
- **Log events (exact):** `collection.created`, `collection.renamed`, `collection.deleted`, `collection.photo_added` (only when the photo was not in yet), `collection.photo_removed` (only when it was): info, `{ collectionId, userId }` plus `photoId` for membership. **Ids only, never the name**, never `console`.
- **UI text (French, exact):** every string is in the diff of the task that adds it, and listed in the spec.
- **No `vi.mock`:** fakes are `vi.fn()` passed through the factory, in a per-file `makeDeps()`. Vitest imports are explicit.
- **TypeScript (AGENTS.md):** no `as` casts (not even `as const`), explicit return types on exported functions, literal unions rather than TS `enum`.
- **Code rules (`.claude/rules/`):** comment why, never what; no magic numbers in `src` code; **every function at most 30 lines** (components and hooks included, counting the signature and the closing brace); every file at most 300 lines; long user text wraps (`wrap-anywhere`).
- **Functions over 30 lines at the base, touched here, and split:** `PhotoActionsMenu` (59 → `MenuTrigger`, `MenuItems`, `MenuDialogs`, `PhotoActionsMenu`), `AppRoutes` in `App.tsx` (40 → `LoggedInLayout`, `AccountBarLayout`). `useFrameSelection` (54) is **not** touched: the source restart lives in `useFrameMode`.
- Server imports use the `.js` extension; client imports use the `@/` alias with the `.ts`/`.tsx` extension.
- **Language:** code, comments, logs and commits in English; UI text, Bruno `docs` blocks, README, ARCHITECTURE and `docs/produit/` in French.
- **Every business rule change updates its colocated `*.test.ts` in the same commit; every endpoint change updates `server/bruno/collections/` in the same commit; every user-visible change updates `docs/produit/` in the same commit.** Product rule ids are never reused: a changed rule keeps its id, a replaced one is marked « Remplacée ».
- **Test API for gates:** the author's dev API holds port 3000 and Vite holds 5180: **never start, stop or touch anything on ports 3000 or 5180.** From `server/`, start the test API in its **own background command**: `PORT=3002 npx tsx --env-file-if-exists=.env src/server.ts`.
- **Bruno gate command** (from `server/bruno/`): `pnpm dlx @usebruno/cli@4.2.0 run . -r --env Local --disable-cookies --env-var baseUrl=http://localhost:3002`. Check the request and assertion counts given per task.
- **Stopping the test API:** in PowerShell, find the listener on 3002, check its command line does **not** contain `worktrees`, then stop only that process.
- **Database:** `pnpm db:push` is **controller only** (checkpoint C1), and **nobody runs `pnpm db:seed`**: it wipes the shared dev MongoDB. Implementers only run `pnpm --filter server db:generate`.
- **Gates:** every commit passes `pnpm check` and `pnpm typecheck`. Every task ends green on `pnpm test`, `pnpm build`, and (Tasks 1 and 2) the Bruno gate command against the test API, twice.
- **Commits:** atomic, one concern each; Conventional Commits in English, message written to a file in the scratchpad with the Write tool and passed with `git commit -F <file>`. Every message ends with these two lines, after a blank line:
  ```
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Hm8u1MNisEcmacs5tNKshr
  ```
  A failing hook means no commit: fix (`pnpm check:fix`, then re-add only the task's files) and commit again. Never `--no-verify`.
- **Never read or print any `.env` file.**
- **Biome formats Markdown:** run `pnpm check:fix` after a docs edit (tables realign, list numbers follow the order). The diffs below are after formatting.
- **Line endings:** LF.
- **Stack:** the controller creates branches with `gh stack`; implementers never switch branches, push or run `gh stack`. Never `gh pr merge`. **Docker files are the author's work: never touch, stage or commit `Dockerfile`, `client/Dockerfile`, `server/Dockerfile`, `server/.dockerignore`, `NOTE.md` or `.vscode/settings.json`.**

## Choices made while planning (not in the spec, or resolving a conflict with the code or the rules)

- **`photoIds: []` at creation** (found on the throwaway MongoDB): without it the field is absent and the guarded add never matches. The schema comment and ARCHITECTURE say why.
- **`nullWhenNotFound` / `refusalOnPrismaError`** in the repository map P2025 and P2002 to `null` or `'not_found' | 'name_taken'`, so the service never imports Prisma error classes.
- **`findLiveIds` reads the live photo ids of every listed collection in one `findMany`** (`id: { in }`, `ownerId`, `IS_OPENED`), then each DTO keeps its own.
- **The service test table `REFUSALS: [WriteRefusal, ApiErrorCode][]`** is typed, not `as const` (no casts rule).
- **Bruno runs on the throwaway invitee** (`invitations/accept/05`, `inviteeCookie`), never the member: the shared dev DB's member may already own collections. The member is the « autre compte ». `collections/` runs at seq 5, before `photos/`, while the invitee still exists. `photos/07` shares a photo from the member to the invitee (friendship created and accepted in its pre-script, deleted in its post-script) to prove an unopened photo is refused; `photos/13` deletes a photo and checks it left the collection.
- **`LoggedInLayout`** (`RequireAuth` > `CollectionsProvider` > `Outlet`) wraps `/frame` and the account-bar pages, so the frame and the preferences read the same list as the library.
- **The provider re-reads on `photo:deleted`** too: the server already answers collections without the deleted photo, so counts and checkboxes follow without a payload.
- **`CollectionsSubmenu` keeps the menu open** (`onSelect` → `preventDefault`) so several boxes can be ticked in a row; a failed toggle shows a toast and the box keeps following the list.
- **« Nouvelle collection… » from the photo menu** opens the same `CollectionNameDialog` in create mode; its `onSaved` files the menu's photo and toasts « Photo ajoutée à « [nom] ». ». The dialogs keep the photo picked when they opened (`MenuDialog = { kind, photo }`), as the slideshow may move on.
- **`FrameStatusScreen` texts become a table** (`STATUS_TEXTS`) to add `emptyCollection` without pushing `StatusMessage` over 30 lines.
- **`wrap-anywhere` on the submenu content** (`RadioSubmenu`, inherited by its items) rather than on each item, and `SettingToggleGroup` items become `h-auto min-h-8 shrink py-1 whitespace-normal wrap-anywhere`: a 50-character name without spaces wraps instead of widening the menu or the card.
- **« Lire sur le cadre »** writes the setting through `writeFrameSettings({ ...readFrameSettings(), source })` rather than mounting `useFrameSettings` in every row (one `storage` listener per row otherwise), then `enterFullscreen()` from the click and `navigate('/frame', { state: LIBRARY_BELOW_STATE })`, as « Mode cadre » does. When the device cannot store the setting (blocked site data), the frame would open on its old source: `writeFrameSettings` answers `false`, a toast says to choose the collection from the frame's « … » menu, and the frame stays closed (simpler than carrying the source in the URL or the history state, which the frame would then have to read and store too).
- **Remove is a conditional write** (`photoIds: { equals: readIds }` in the `update` filter) with one re-read and retry: an add from another device between the read and the write is kept, never overwritten.
- **Focus after a deletion** goes to the card's « Nouvelle collection » button (`onDeleted`, called once the server agreed): the row and its menu button leave the list.
- **The restart returns the photo to play** (the newest of the new source) in the render of the change, so `usePlaybackPhotos` draws its new round from it rather than from the previous photo.
- **Restart on source change** is a render-phase adjustment in `useFrameMode` calling `selection.showNewest()`: it runs after `useFrameSelection`'s own adjustment in the same render, so a false « nouvelle photo » count from the newest photo changing is reset to 0. `useFrameSelection` (54 lines at the base) stays untouched.
- **Docs edits in the order of the tasks:** each task's ARCHITECTURE/README/product edits are in its own commit; the review moved the « Photos » bullet of `cadre.md` after the preferences line until Task 7 adds the preferences toggle.

### Verified behavior

- **Every task's code was written and run in a throwaway clone while planning** (from `4e3fc8f`, one commit per task). Gates per task: `pnpm check`, `pnpm typecheck`, `pnpm build`, `pnpm test`. Every new or touched function measured at 30 lines or fewer (Babel-based counter). **Bruno counts are read from the files: the API was not started while planning.** The diffs below are `git show` output from that clone, after a fresh-context review.
- **Docker:** used once, early, for the throwaway MongoDB below; the controller then forbade Docker for this work, and the container is gone. **`photoIds: { equals }`** (Task 2's conditional remove) was not run on a database: it relies on Prisma's documented scalar list filter `equals` (MongoDB supported) and extended unique `where` in `update`; the generated client types it, and the unit tests cover the service logic. The controller's Bruno run of `collections/photos/12-13` exercises it for real.
- **Prisma 6.19.3 on MongoDB (throwaway, port 27099):** a create without `photoIds` stores no field and `NOT: { photoIds: { has } }` never matches it; with `photoIds: []` the guarded `push` adds once, a second push gives P2025, two concurrent pushes of the same id store it once; a wrong owner gives P2025; a duplicate `(ownerId, name)` gives P2002; renaming to the same name succeeds; `set` replaces the list; `id: { in }` drops dead ids; the `IS_OPENED` filter matches opened (`true`) and legacy (unset) photos, not `false`; `user.deleteMany` with a collection left fails with P2014 (hence the seed change).
- **Baselines (on `feat/mail-frame` at 4e3fc8f):** `pnpm test` → `Test Files  21 passed (21)`, `Tests  239 passed (239)`; Bruno: 122 requests, 266 assertions.
- **Expected after each server task:** Task 1: `Test Files  22 passed (22)`, `Tests  259 passed (259)`; Bruno 145 requests, 316 assertions. Task 2: `Test Files  23 passed (23)`, `Tests  273 passed (273)`; Bruno 159 requests, 344 assertions. Client tasks leave both unchanged.

## File Map

| File | Task | Responsibility |
| --- | --- | --- |
| `server/prisma/schema.prisma`, `seed.ts` | 1 | `Collection`, `User.collections`; seed deletes collections first |
| `server/src/features/collections/collections.{repository,service,controller,routes}.ts` | 1, 2 | the slice: CRUD, then membership |
| `server/src/features/collections/collections.service{,.photos}.test.ts` | 1, 2 | unit tests |
| `server/src/types.ts`, `errors/error-handler.ts` (+ test), `app.ts` | 1 | DTOs, codes, event, mount |
| `server/src/features/photos/photos.repository.ts` | 2 | export `IS_OPENED` |
| `server/bruno/collections/**` | 1, 2 | Bruno requests and docs |
| `client/src/collections/*`, `photo.ts`, `photoSocket.ts`, `api.ts`, `App.tsx` | 3 | provider, API, event, messages, layouts |
| `client/src/components/collections/{CollectionsCard,CollectionRow,CollectionNameDialog,DeleteCollectionDialog}.tsx`, `pages/LibraryPage.tsx` | 4, 6, 7 | library card |
| `client/src/components/collections/CollectionsSubmenu.tsx`, `components/frame/PhotoActionsMenu.tsx` | 5 | photo menu |
| `client/src/photoSource.ts`, `frameSettings.ts`, `hooks/{useFrameSettings,useSourcePhotos,useFrameMode,usePlaybackPhotos}.ts` | 6 | frame source |
| `client/src/components/frame/{FrameStatusScreen,SlideshowMenu,RadioSubmenu}.tsx`, `frameSettingOptions.ts`, `pages/FramePage.tsx` | 6 | frame UI |
| `client/src/components/settings/{FrameSettingsCard,SettingToggleGroup}.tsx` | 7 | preferences |
| `docs/produit/{collections,README,a-venir,bibliotheque,cadre,partage,preferences}.md` | 4, 5, 6, 7 | product rules |
| `ARCHITECTURE.md` | 1 to 7 | docs per task |

## Stack and branches (controller only)

- **PR A `feat/collections-server`**: `gh stack add feat/collections-server` on top of `feat/mail-frame` (step 9). Task 1 Step 1 commits the spec and this plan there. Tasks 1-2.
- **Checkpoint C1** after Task 1's code, before its Bruno run: `pnpm db:push` (no seed). It creates the `Collection` collection and its unique `(ownerId, name)` index on an empty collection: nothing to clean first. Task 2 changes no schema.
- **Before Task 3:** `gh stack add feat/collections-library` (PR B). Tasks 3-5.
- **Before Task 6:** `gh stack add feat/collections-frame` (PR C). Tasks 6-7.
- After the final review: `gh stack submit --auto` (draft PRs), then `gh stack view --json`. Rien n'est mergé.

---

## PR A — `feat/collections-server`

### Task 1: Spec and plan, then create, rename and delete collections (PR A, `feat/collections-server`)

**Files:**
- Create: `docs/superpowers/specs/2026-11-25-collections-design.md`, `docs/superpowers/plans/2026-11-25-collections.md`
- Create: `server/src/features/collections/collections.{repository,service,controller,routes}.ts`, `collections.service.test.ts`, `server/bruno/collections/{folder.bru,create/,list/,rename/,delete/}`
- Modify: `server/prisma/schema.prisma`, `server/prisma/seed.ts`, `server/src/types.ts`, `server/src/errors/error-handler.ts` (+ test), `server/src/app.ts`, `ARCHITECTURE.md`

**Interfaces:**
- `createCollectionsRepository(prisma)` → `{ findAllOf(ownerId), findLivePhotoIds(ownerId, ids), create(ownerId, name), rename(id, ownerId, name), deleteOwned(id, ownerId) }`; writes answer `CollectionRecord | WriteRefusal` (`'not_found' | 'name_taken'`).
- `createCollectionsService({ repository, logger })` → `{ list(ownerId), create(ownerId, rawName), rename(ownerId, rawId, rawName), remove(ownerId, rawId) }`; `parseCollectionName(raw: unknown): string` (exported, throws `COLLECTION_NAME_INVALID`); `MAX_COLLECTION_NAME_LENGTH = 50`; the id check reuses `OBJECT_ID_PATTERN` from `photos.input.ts`.
- `createCollectionsController({ service, io })`; `assembleCollectionsRouter(io)` in `app.ts`.

- [ ] **Step 1: Commit the spec and the plan**

Copy the two files from the scratchpad to `docs/superpowers/specs/2026-11-25-collections-design.md` and `docs/superpowers/plans/2026-11-25-collections.md`, run `pnpm check:fix`, stage only those two files, commit with subject `docs: add the collections spec and plan` (body: step 10, decided and planned without the author per « je veux que tu livres 8 à 11 sans m'attendre », then the attribution lines).

- [ ] **Step 2: Baselines**

`pnpm test` → `Test Files  21 passed (21)`, `Tests  239 passed (239)`. Bruno files: 122 requests, 266 assertions. If a number differs, write it in the Drift Log and shift every expected count of this plan by the same difference.

- [ ] **Step 3: Schema, then `pnpm --filter server db:generate`**, the tests, the code, the Bruno folders and the docs. The whole commit:

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index be21ac5..6f88c3a 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -96,6 +96,10 @@ Le routage est fait côté navigateur (`react-router`). En production (J2), le s
 | `PUT /api/account/password`             | JSON `{ currentPassword, newPassword }` → `204` sans corps : vérifie le mot de passe actuel, enregistre le nouveau et ferme toutes les autres sessions du compte (celle de la requête reste ouverte)                                                           |
 | `PUT /api/account/avatar`               | `multipart/form-data` avec `avatar` (fichier) → `200 { user }` : carré JPEG de 256 px recadré au centre, envoyé sur Cloudinary (`familyframe/avatars`) ; l'ancienne image est détruite après l'enregistrement ; mêmes limites que `POST /api/photos`           |
 | `DELETE /api/account/avatar`            | `200 { user }` avec `avatarUrl` à `null` : efface la photo de profil, puis détruit l'image ; répond de même sans photo                                                                                                                                         |
+| `GET /api/collections`                  | `200 { collections }` : les collections du compte connecté, triées par nom comme en français (« Été » avant « Noël »)                                                                                                                                          |
+| `POST /api/collections`                 | JSON `{ name }` → `201 Collection`, sans photo                                                                                                                                                                                                                 |
+| `PATCH /api/collections/:id`            | JSON `{ name }` → `200 Collection` : renomme une collection du compte connecté ; garder son propre nom n'est pas un doublon                                                                                                                                    |
+| `DELETE /api/collections/:id`           | `204` sans corps : supprime la collection, jamais ses photos                                                                                                                                                                                                   |
 | `GET /api/photos?cursor=<id>&limit=<n>` | `200 { photos, nextCursor }` : photos du compte connecté, la plus récente en premier, sans les photos reçues pas encore ouvertes ; `limit` de 1 à 100 (30 par défaut) ; `nextCursor` est l'id à passer en `cursor` pour la page suivante, `null` à la dernière |
 | `POST /api/photos`                      | `multipart/form-data` avec `photo` (fichier) → `201 Photo`                                                                                                                                                                                                     |
 | `POST /api/photos/:id/share`            | JSON `{ friendId, message? }` → `201 Photo` : envoie une photo de sa bibliothèque à un ami accepté ; l'ami reçoit une nouvelle photo qui pointe vers la même image Cloudinary, et la réponse est cette photo telle qu'il la voit                               |
@@ -104,7 +108,7 @@ Le routage est fait côté navigateur (`react-router`). En production (J2), le s
 | `POST /api/photos/:id/open`             | sans corps → `200 Photo` : ouvre une photo reçue, qui rejoint `GET /api/photos` ; idempotent                                                                                                                                                                   |
 | `DELETE /api/photos/:id`                | `204` sans corps, pour une photo du compte connecté ; supprime l'enregistrement, puis l'image Cloudinary (cache CDN compris) si plus aucune photo n'y renvoie                                                                                                  |
 
-Toutes les routes `/api/photos`, `/api/friendships`, `/api/account`, `GET /api/auth/me` et les routes admin de `/api/invitations` demandent une session ; sans elle : `401 UNAUTHENTICATED`. Les routes admin répondent `403 FORBIDDEN` à un membre. Un `user` vaut `{ id, email, displayName, role, avatarUrl }` (`role` : `member` ou `admin` ; `avatarUrl` : l'URL signée de sa photo de profil, `null` tant qu'il n'en a pas choisi), jamais le hash du mot de passe ni l'identifiant Cloudinary de la photo.
+Toutes les routes `/api/photos`, `/api/friendships`, `/api/account`, `/api/collections`, `GET /api/auth/me` et les routes admin de `/api/invitations` demandent une session ; sans elle : `401 UNAUTHENTICATED`. Les routes admin répondent `403 FORBIDDEN` à un membre. Un `user` vaut `{ id, email, displayName, role, avatarUrl }` (`role` : `member` ou `admin` ; `avatarUrl` : l'URL signée de sa photo de profil, `null` tant qu'il n'en a pas choisi), jamais le hash du mot de passe ni l'identifiant Cloudinary de la photo.
 
 Une `Invitation` vaut `{ id, email, status, createdAt, expiresAt }` (dates en ISO 8601) ; `status` vaut `pending` (en attente), `used` (utilisée) ou `expired` (expirée), calculé à chaque lecture. Le hash du jeton et l'admin qui l'a créée restent côté serveur.
 
@@ -112,41 +116,46 @@ Une `Friendship` vaut `{ id, user, createdAt }` (`createdAt` en ISO 8601) : `id`
 
 Une `Photo` vaut `{ id, url, thumbnailUrl, createdAt, senderName, message }` (`createdAt` en ISO 8601 ; `senderName` est le nom d'affichage de l'ami qui l'a envoyée, `null` pour une photo que le compte a ajoutée lui-même ; `message` est le mot que cet ami y a joint, `null` sans message). Un message est du texte, espaces autour retirés, de 200 caractères au plus (`MAX_MESSAGE_LENGTH`, comptés après le retrait) ; vide, il compte comme absent. Les logs disent seulement s'il y en avait un (`hasMessage`), jamais son texte. Chaque photo appartient à un compte (`ownerId`, côté serveur seulement) : celui qui l'a ajoutée, ou l'ami qui l'a reçue. La liste, la suppression et les événements ne concernent que les photos du compte connecté. Une photo envoyée à un ami est une nouvelle photo **de l'ami** (`senderId` = l'expéditeur) : la bibliothèque de l'expéditeur ne change pas, et chacun supprime ses photos de son côté (la photo reçue reste quand l'expéditeur supprime l'original ou retire l'amitié). L'identifiant Cloudinary reste côté serveur : le client reçoit des URL prêtes à l'emploi.
 
+Une `Collection` vaut `{ id, name, photoIds }`, jamais son propriétaire : `photoIds` liste les photos du compte, dans l'ordre où elles y ont été ajoutées. Un nom est du texte, espaces autour retirés, de 1 à 50 caractères (`MAX_COLLECTION_NAME_LENGTH`, comme un nom d'affichage) ; deux collections d'un même compte ne portent pas le même nom (index unique `(ownerId, name)`, comparaison exacte après le trim : « noël » et « Noël » sont deux noms). Une collection d'un autre compte répond comme une inconnue.
+
 La liste est paginée par curseur (_keyset_) sur l'id : un ObjectId commence par sa date de création, trier par id revient donc à trier par date, et `id < cursor` est une seule requête sur l'index `(ownerId, id)`. Une photo ajoutée ou supprimée entre deux pages ne décale rien, contrairement à une pagination par numéro de page.
 
 En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code en message français :
 
-| Cas                                                                                                                                       | Statut | `error`                 |
-| ----------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------- |
-| aucun fichier (photo ou photo de profil)                                                                                                  | 400    | `PHOTO_MISSING`         |
-| autre erreur Multer (mauvais champ, plusieurs fichiers)                                                                                   | 400    | `UPLOAD_INVALID`        |
-| corps JSON illisible (routes qui lisent du JSON, voir [Authentification](#authentification))                                              | 400    | `BODY_INVALID`          |
-| message d'envoi trop long (plus de 200 caractères) ou qui n'est pas du texte                                                              | 400    | `MESSAGE_INVALID`       |
-| e-mail absent ou mal formé (création d'invitation, demande d'ami)                                                                         | 400    | `EMAIL_INVALID`         |
-| nom d'affichage vide après trim, de plus de 50 caractères, ou absent                                                                      | 400    | `DISPLAY_NAME_INVALID`  |
-| mot de passe de moins de 12 ou plus de 128 caractères, ou absent                                                                          | 400    | `PASSWORD_INVALID`      |
-| mot de passe actuel faux ou absent (`PUT /api/account/password`) ; 400 et non 401 : la session reste valide                               | 400    | `PASSWORD_INCORRECT`    |
-| demande d'ami à sa propre adresse                                                                                                         | 400    | `SELF_FRIEND`           |
-| `limit` ou `cursor` invalide (`GET /api/photos`)                                                                                          | 400    | `QUERY_INVALID`         |
-| pas de session, session inconnue ou expirée                                                                                               | 401    | `UNAUTHENTICATED`       |
-| e-mail inconnu ou mauvais mot de passe                                                                                                    | 401    | `INVALID_CREDENTIALS`   |
-| compte connecté sans le rôle demandé (membre sur une route admin)                                                                         | 403    | `FORBIDDEN`             |
-| envoi d'une photo à un compte qui n'est pas un ami accepté (soi-même, demande en attente, compte inconnu, `friendId` absent ou mal formé) | 403    | `NOT_FRIENDS`           |
-| route inconnue                                                                                                                            | 404    | `ROUTE_NOT_FOUND`       |
-| photo inconnue, photo d'un autre compte, ou id qui n'est pas un ObjectId                                                                  | 404    | `PHOTO_NOT_FOUND`       |
-| jeton d'invitation inconnu, remplacé ou mal formé                                                                                         | 404    | `INVITATION_NOT_FOUND`  |
-| demande d'ami à un e-mail sans compte                                                                                                     | 404    | `USER_NOT_FOUND`        |
-| amitié ou demande inconnue, d'autres comptes, déjà supprimée, déjà acceptée (acceptation), ou id qui n'est pas un ObjectId                | 404    | `FRIENDSHIP_NOT_FOUND`  |
-| fichier déjà dans la bibliothèque du compte, ou dans celle de l'ami lors d'un envoi (même SHA-256)                                        | 409    | `PHOTO_DUPLICATE`       |
-| l'e-mail a déjà un compte (création d'invitation, ou acceptation après une course)                                                        | 409    | `ACCOUNT_EXISTS`        |
-| demande d'ami entre deux comptes déjà amis                                                                                                | 409    | `ALREADY_FRIENDS`       |
-| demande d'ami alors que ma demande attend déjà, ou que la sienne a disparu avant l'acceptation                                            | 409    | `FRIEND_REQUEST_EXISTS` |
-| invitation de plus de 7 jours                                                                                                             | 410    | `INVITATION_EXPIRED`    |
-| invitation déjà utilisée                                                                                                                  | 410    | `INVITATION_USED`       |
-| fichier de plus de 10 Mo                                                                                                                  | 413    | `PHOTO_TOO_LARGE`       |
-| type autre que JPEG, PNG ou WebP                                                                                                          | 415    | `FORMAT_UNSUPPORTED`    |
-| image illisible par Sharp                                                                                                                 | 422    | `IMAGE_UNREADABLE`      |
-| toute autre erreur (Cloudinary, base)                                                                                                     | 500    | `SERVER_ERROR`          |
+| Cas                                                                                                                                       | Statut | `error`                   |
+| ----------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------- |
+| aucun fichier (photo ou photo de profil)                                                                                                  | 400    | `PHOTO_MISSING`           |
+| autre erreur Multer (mauvais champ, plusieurs fichiers)                                                                                   | 400    | `UPLOAD_INVALID`          |
+| corps JSON illisible (routes qui lisent du JSON, voir [Authentification](#authentification))                                              | 400    | `BODY_INVALID`            |
+| message d'envoi trop long (plus de 200 caractères) ou qui n'est pas du texte                                                              | 400    | `MESSAGE_INVALID`         |
+| e-mail absent ou mal formé (création d'invitation, demande d'ami)                                                                         | 400    | `EMAIL_INVALID`           |
+| nom d'affichage vide après trim, de plus de 50 caractères, ou absent                                                                      | 400    | `DISPLAY_NAME_INVALID`    |
+| mot de passe de moins de 12 ou plus de 128 caractères, ou absent                                                                          | 400    | `PASSWORD_INVALID`        |
+| mot de passe actuel faux ou absent (`PUT /api/account/password`) ; 400 et non 401 : la session reste valide                               | 400    | `PASSWORD_INCORRECT`      |
+| demande d'ami à sa propre adresse                                                                                                         | 400    | `SELF_FRIEND`             |
+| nom de collection vide après trim, de plus de 50 caractères, absent ou qui n'est pas du texte                                             | 400    | `COLLECTION_NAME_INVALID` |
+| `limit` ou `cursor` invalide (`GET /api/photos`)                                                                                          | 400    | `QUERY_INVALID`           |
+| pas de session, session inconnue ou expirée                                                                                               | 401    | `UNAUTHENTICATED`         |
+| e-mail inconnu ou mauvais mot de passe                                                                                                    | 401    | `INVALID_CREDENTIALS`     |
+| compte connecté sans le rôle demandé (membre sur une route admin)                                                                         | 403    | `FORBIDDEN`               |
+| envoi d'une photo à un compte qui n'est pas un ami accepté (soi-même, demande en attente, compte inconnu, `friendId` absent ou mal formé) | 403    | `NOT_FRIENDS`             |
+| route inconnue                                                                                                                            | 404    | `ROUTE_NOT_FOUND`         |
+| photo inconnue, photo d'un autre compte, ou id qui n'est pas un ObjectId                                                                  | 404    | `PHOTO_NOT_FOUND`         |
+| jeton d'invitation inconnu, remplacé ou mal formé                                                                                         | 404    | `INVITATION_NOT_FOUND`    |
+| demande d'ami à un e-mail sans compte                                                                                                     | 404    | `USER_NOT_FOUND`          |
+| amitié ou demande inconnue, d'autres comptes, déjà supprimée, déjà acceptée (acceptation), ou id qui n'est pas un ObjectId                | 404    | `FRIENDSHIP_NOT_FOUND`    |
+| collection inconnue, d'un autre compte, déjà supprimée, ou id qui n'est pas un ObjectId                                                   | 404    | `COLLECTION_NOT_FOUND`    |
+| fichier déjà dans la bibliothèque du compte, ou dans celle de l'ami lors d'un envoi (même SHA-256)                                        | 409    | `PHOTO_DUPLICATE`         |
+| l'e-mail a déjà un compte (création d'invitation, ou acceptation après une course)                                                        | 409    | `ACCOUNT_EXISTS`          |
+| demande d'ami entre deux comptes déjà amis                                                                                                | 409    | `ALREADY_FRIENDS`         |
+| demande d'ami alors que ma demande attend déjà, ou que la sienne a disparu avant l'acceptation                                            | 409    | `FRIEND_REQUEST_EXISTS`   |
+| nom qu'une autre collection du compte porte déjà (création, renommage)                                                                    | 409    | `COLLECTION_EXISTS`       |
+| invitation de plus de 7 jours                                                                                                             | 410    | `INVITATION_EXPIRED`      |
+| invitation déjà utilisée                                                                                                                  | 410    | `INVITATION_USED`         |
+| fichier de plus de 10 Mo                                                                                                                  | 413    | `PHOTO_TOO_LARGE`         |
+| type autre que JPEG, PNG ou WebP                                                                                                          | 415    | `FORMAT_UNSUPPORTED`      |
+| image illisible par Sharp                                                                                                                 | 422    | `IMAGE_UNREADABLE`        |
+| toute autre erreur (Cloudinary, base)                                                                                                     | 500    | `SERVER_ERROR`            |
 
 ## Authentification
 
@@ -157,9 +166,9 @@ En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code e
 - **Expiration** : Prisma 6 ne sait pas déclarer d'index TTL MongoDB. Une session expirée est supprimée quand on la lit, et toutes les sessions expirées à chaque session ouverte (connexion, invitation).
 - **Changement de mot de passe** : `PUT /api/account/password` demande le mot de passe actuel (une session volée ne suffit pas), puis supprime toutes les autres sessions du compte et garde celle de la requête. Un autre appareil, le cadre compris, doit se reconnecter avec le nouveau mot de passe : sa connexion Socket.IO déjà ouverte n'est pas coupée (elle ne relit pas la session), il revient à `/login` à sa prochaine requête HTTP ou reconnexion, le cadre au plus tard à son rechargement quotidien. `requireAuth` pose aussi `req.sessionId`, relu par `currentSessionId(req)` (`features/auth/auth.guard.ts`).
 - **Connexion refusée** : e-mail inconnu et mauvais mot de passe répondent tous deux `401 INVALID_CREDENTIALS`, et un e-mail inconnu coûte quand même une vérification argon2 (contre un hash factice) : ni le message ni le temps de réponse ne disent qui a un compte.
-- **Garde HTTP** : `requireAuth` (`features/auth/auth.middleware.ts`) lit le cookie avec `lib/session-token.ts` (sans `cookie-parser`), valide la session et pose `req.user`, typé par _declaration merging_ sur `Request` ; `currentUser(req)` (`features/auth/auth.guard.ts`) le relit sans cast. `requireRole(role)` (même fichier), monté après `requireAuth`, compare le rôle de la session déjà chargée (aucune requête en plus) et répond `403 FORBIDDEN` à un autre rôle. Il vit à part du middleware : `auth.middleware.ts` atteint `config.ts`, qu'un test unitaire ne peut pas charger sans variables d'environnement. `/api/photos`, `/api/auth/me`, `/api/friendships`, `/api/account` et les routes admin de `/api/invitations` (puis `requireRole('admin')`) sont derrière `requireAuth` ; `/api/health`, `/api/auth/login`, `/api/auth/logout` et `/api/invitations/accept` restent publics.
+- **Garde HTTP** : `requireAuth` (`features/auth/auth.middleware.ts`) lit le cookie avec `lib/session-token.ts` (sans `cookie-parser`), valide la session et pose `req.user`, typé par _declaration merging_ sur `Request` ; `currentUser(req)` (`features/auth/auth.guard.ts`) le relit sans cast. `requireRole(role)` (même fichier), monté après `requireAuth`, compare le rôle de la session déjà chargée (aucune requête en plus) et répond `403 FORBIDDEN` à un autre rôle. Il vit à part du middleware : `auth.middleware.ts` atteint `config.ts`, qu'un test unitaire ne peut pas charger sans variables d'environnement. `/api/photos`, `/api/auth/me`, `/api/friendships`, `/api/account`, `/api/collections` et les routes admin de `/api/invitations` (puis `requireRole('admin')`) sont derrière `requireAuth` ; `/api/health`, `/api/auth/login`, `/api/auth/logout` et `/api/invitations/accept` restent publics.
 - **Invitations** : l'admin crée un lien depuis `/admin/invitations`. Le jeton suit la règle des sessions (32 octets aléatoires, `lib/session-token.ts`, seul son SHA-256 en base dans `Invitation.tokenHash`), vaut 7 jours (`INVITATION_DURATION_MS`) et sert une fois (`usedAt`). Le serveur renvoie le jeton brut une seule fois ; le client construit le lien `` `${window.location.origin}/invite/${token}` `` : l'origine que l'admin utilise est celle que la famille atteint, sans variable de configuration en plus. Une nouvelle invitation pour le même e-mail **remplace** les précédentes non utilisées (supprimées) : « j'ai perdu le lien » se règle sans bouton de révocation, et l'ancien lien répond `404 INVITATION_NOT_FOUND`. Le jeton ne passe jamais dans un chemin d'API (`http.request` journalise les chemins) : il voyage dans le corps JSON. L'acceptation (`POST /api/invitations/accept`, publique) vérifie d'abord le jeton (forme, existence, déjà utilisé, expiré), puis le nom, puis le mot de passe : inutile de choisir un mot de passe pour un lien mort. Elle crée le compte, puis marque l'invitation utilisée, sans transaction : l'index unique sur `User.email` garantit qu'un double envoi ne crée qu'un compte (l'autre reçoit `409 ACCOUNT_EXISTS`). Limite connue : si l'admin réinvite la même adresse pendant une acceptation, le compte peut être créé alors que la réponse est une `500` ; le compte fonctionne, la personne se connecte sur `/login`. La session est ouverte par `openSession` du service d'auth (aussi utilisé par la connexion), et le contrôleur pose le cookie comme au login.
-- **JSON** : `express.json()` n'est monté que sur `/api/auth`, `/api/invitations`, `/api/friendships`, `PATCH /api/account`, `PUT /api/account/password` et `POST /api/photos/:id/share` (les autres routes photos sont en multipart), les seules routes qui lisent du JSON ; un corps illisible répond `400 BODY_INVALID`.
+- **JSON** : `express.json()` n'est monté que sur `/api/auth`, `/api/invitations`, `/api/friendships`, `/api/collections`, `PATCH /api/account`, `PUT /api/account/password` et `POST /api/photos/:id/share` (les autres routes photos sont en multipart), les seules routes qui lisent du JSON ; un corps illisible répond `400 BODY_INVALID`.
 
 ## Temps réel
 
@@ -167,6 +176,7 @@ En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code e
 - Quatre événements, du serveur vers les connexions du propriétaire de la photo (`io.to(userRoom(ownerId))`) : `photo:new` avec la `Photo` qu'il a ajoutée, `photo:received` avec la `Photo` qu'un ami lui a envoyée (non ouverte), `photo:opened` avec la `Photo` qu'il vient d'ouvrir, `photo:deleted` avec l'id de la photo supprimée. Les autres comptes ne les reçoivent pas. Une photo envoyée à un ami appartient à l'ami : `photo:received` part vers ses connexions, pas vers celles de l'expéditeur, dont l'écran ne change pas.
 - Le cadre recharge toute la bibliothèque (toutes les pages) à chaque connexion Socket.IO, reconnexions comprises : une photo envoyée pendant une coupure n'est pas perdue. Tant qu'aucun chargement n'a réussi, le cadre l'indique (`usePhotoFeed` renvoie `status`) ; un rechargement qui échoue ensuite garde les photos affichées. Ensuite il insère `photo:new` et chaque `photo:opened` à leur date (par id) et retire `photo:deleted` de la liste, sans recharger. Les événements reçus pendant un chargement sont rejoués sur la liste chargée, et seul le dernier chargement lancé s'applique. Limite connue : chaque connexion relit toutes les pages et le diaporama crée une diapositive par photo, ce qui convient à quelques centaines de photos. La page bibliothèque (`/`) recharge à chaque connexion autant de photos qu'elle en avait chargé (au moins 30, par requêtes de 100, `fetchNewestPhotos`) : une reconnexion ne la ramène pas aux 30 premières, et la photo ouverte dans la visionneuse reste dans la liste et suit les mêmes événements (`usePhotoLibrary`, socket partagée dans `client/src/photoSocket.ts`).
 - Les photos en attente (`hooks/usePhotoMail.ts`) ont leur propre connexion Socket.IO, à côté de celle de la bibliothèque ou du cadre : `GET /api/photos/unopened` à chaque connexion, `photo:received` ajoute, `photo:opened` et `photo:deleted` retirent, avec le même rejeu des événements reçus pendant un chargement (`liveLoads.ts`). `connectPhotoSocket` n'écoute que les événements dont la page passe le gestionnaire. La bibliothèque et le cadre ajoutent `photo:opened` comme `photo:new`, à sa place par id (`withNewPhoto`) : une photo ouverte reprend sa date de réception. Limite connue : dans la bibliothèque paginée, une photo ouverte plus ancienne que les pages chargées se place en fin de liste jusqu'au prochain rechargement.
+- Chaque écriture sur une collection envoie `collections:changed`, sans contenu, aux connexions de son propriétaire : chaque page relit `GET /api/collections`. La liste est petite et le serveur reste la seule source ; un événement par sorte de changement demanderait autant d'écouteurs côté client.
 - Les amitiés ne sont pas poussées : la page `/friends` recharge ses listes à l'ouverture et après chaque action. Les demandes sont rares et la page est ouverte exprès ; un événement Socket.IO demanderait un type d'événement, un écouteur côté client et `io` dans un quatrième contrôleur.
 - Les types partagés (`Photo`, codes d'erreur, événements) sont dupliqués entre `server/src/types.ts` et `client/src` : un package commun compliquerait les builds Docker.
 
@@ -179,7 +189,7 @@ En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code e
 
 ## Couches du backend
 
-Une feature par dossier (`server/src/features/photos/`, `server/src/features/auth/`, `server/src/features/invitations/`, `server/src/features/friendships/`, `server/src/features/account/`), un fichier par couche. Pour les photos :
+Une feature par dossier (`server/src/features/photos/`, `server/src/features/auth/`, `server/src/features/invitations/`, `server/src/features/friendships/`, `server/src/features/account/`, `server/src/features/collections/`), un fichier par couche. Pour les photos :
 
 | Fichier                | Rôle                                                                                                                              |
 | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
@@ -196,6 +206,7 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 - `features/invitations/` suit le même découpage (`invitations.repository.ts`, `invitations.service.ts`, `invitations.controller.ts`, `invitations.routes.ts`). Le service reçoit `repository` (seul endroit qui crée un compte), `generateToken`, `hashToken`, `hashPassword`, `avatarUrl`, `now` et `logger` ; le contrôleur reçoit aussi le service d'auth pour `openSession` ; `app.ts` construit `requireAdmin = requireRole('admin')` une fois et le passe au routeur, derrière `requireAuth`.
 - `features/friendships/` suit le même découpage (`friendships.repository.ts`, `friendships.service.ts`, `friendships.controller.ts`, `friendships.routes.ts`). Le service reçoit `repository`, `avatarUrl` et `logger` ; le repository calcule `pairKey` et ne lit des comptes que `id`, `email`, `displayName` et `avatarCloudinaryId`. `app.ts` monte le routeur derrière `requireAuth`, comme les photos. Le service expose aussi `areFriends(userId, otherUserId)`, que le service photos reçoit en dépendance : la règle « amis = ligne acceptée » reste ici. `app.ts` construit le service amis une fois (`assembleFriendshipsService`) et le passe aux deux routeurs.
 - `features/account/` suit le même découpage (`account.repository.ts`, `account.service.ts`, `account.controller.ts`, `account.routes.ts`) : le compte de la personne connectée, jamais un autre (l'id vient de la session, pas de l'URL). Le service reçoit `repository`, `hashPassword`, `verifyPassword`, `toAvatarJpeg`, `uploadAvatar`, `deleteImage`, `avatarUrl` et `logger`. La photo de profil reprend la configuration Multer (`photos.upload.ts`) et `parseFile` (`photos.input.ts`) des photos : mêmes formats, même taille maximale, mêmes codes d'erreur. `app.ts` monte le routeur derrière `requireAuth`.
+- `features/collections/` suit le même découpage (`collections.repository.ts`, `collections.service.ts`, `collections.controller.ts`, `collections.routes.ts`). Le service reçoit `repository` et `logger`, valide le nom (`parseCollectionName`) et l'id, et trie la liste. Le repository traduit les refus de Prisma en `'not_found'` ou `'name_taken'`, que le service change en code d'erreur ; il lit aussi les photos (`findLivePhotoIds`, les ids encore dans la bibliothèque). Le contrôleur reçoit `io` pour `collections:changed`.
 - `features/auth/public-user.ts` construit le `user` renvoyé par l'API (`toPublicUser`, utilisé par les services auth, invitations et compte) : l'URL de la photo de profil vient de `avatarUrl` (`lib/cloudinary.ts`), reçu en dépendance pour qu'un test unitaire n'ait pas besoin de la configuration Cloudinary. Le service amis s'en sert aussi (`toAvatarUrl`) pour l'autre compte d'une amitié.
 - Les dépendances sont passées par des fonctions-fabriques (`createPhotosService({ repository, toFrameJpeg, uploadImage, deleteImage, areFriends, logger })`), assemblées dans `app.ts` : un test peut fournir de fausses implémentations.
 - `server/src/lib/` regroupe les clients techniques : Prisma (`db.ts`), Cloudinary, sharp (`image.ts`), `email.ts` (`parseEmail`, la même règle pour une invitation et une demande d'ami) et `account-input.ts` (`parseDisplayName`, `parsePassword` et leurs bornes, les mêmes règles à la création du compte par invitation et à sa modification par son propriétaire).
@@ -207,7 +218,7 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 - **Format** : JSON par défaut, filtrable (`{"time":"…","level":"info","event":"photo.created","photoId":"…"}`) ; `LOG_FORMAT=pretty` en dev donne `14:37:17 INFO  photo.created photoId=…`. Une `Error` est écrite avec son nom, son message et sa pile.
 - **Niveaux** : `info` < `warn` < `error` ; `LOG_LEVEL` fixe le niveau minimum écrit.
 - **Noms d'événements stables** `domaine.action` : on filtre sur le nom (`docker logs <conteneur> | grep photo.`), pas sur un texte qui change à chaque reformulation.
-- **Pas de données personnelles** : jamais un nom, l'e-mail, le mot de passe ni le jeton de session ; seulement des identifiants (`photoId`, `sourcePhotoId`, `cloudinaryId`, `socketId`, `userId`, `recipientId`, `friendshipId`) ; les chemins sans leur query string.
+- **Pas de données personnelles** : jamais un nom, l'e-mail, le mot de passe ni le jeton de session ; seulement des identifiants (`photoId`, `sourcePhotoId`, `cloudinaryId`, `socketId`, `userId`, `recipientId`, `friendshipId`, `collectionId`) ; les chemins sans leur query string.
 - Le service photos reçoit le logger par injection ; le reste du serveur importe `logger`.
 
 | Événement                                                             | Niveau                        | Écrit par                                                                                                                                                                                                                       |
@@ -231,6 +242,7 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 | `invitation.accept_failed`                                            | warn                          | service invitations, avec `reason` (`not_found`, `used`, `expired`, `account_exists`) et `invitationId` quand il est connu ; jamais le jeton, l'e-mail, le nom ni le mot de passe                                               |
 | `friendship.requested` / `friendship.accepted` / `friendship.deleted` | info                          | service amis, avec `friendshipId` et `userId` (qui agit) ; `friendship.deleted` dit aussi ce qui s'est passé (`reason` : `removed`, `cancelled`, `refused`)                                                                     |
 | `friendship.request_failed`                                           | warn                          | service amis, avec `reason` (`user_not_found`, `self`, `already_friends`, `request_exists`) et `userId` ; jamais l'e-mail                                                                                                       |
+| `collection.created` / `collection.renamed` / `collection.deleted`    | info                          | service collections, avec `collectionId` et `userId` (le propriétaire) ; jamais le nom                                                                                                                                          |
 | `account.renamed`                                                     | info                          | service compte, avec `userId` ; jamais le nom                                                                                                                                                                                   |
 | `account.password_changed`                                            | info                          | service compte, avec `userId` et `closedSessionCount` (autres sessions fermées) ; jamais un mot de passe                                                                                                                        |
 | `account.password_change_failed`                                      | warn                          | service compte : mot de passe actuel faux, avec `reason` (`incorrect_password`) et `userId`                                                                                                                                     |
@@ -266,7 +278,8 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 
 - **MongoDB Atlas** via **Prisma 6**. Prisma 7+ ne supporte pas encore MongoDB : la version est volontairement figée.
 - Le client Prisma est généré à l'installation (`postinstall`) ; le schéma est poussé avec `pnpm --filter server db:push` (pas de migrations avec MongoDB).
-- Collections `User`, `Session`, `Photo`, `Invitation` et `Friendship`. `User.avatarCloudinaryId`, facultatif, est l'identifiant Cloudinary de la photo de profil (absent des anciens comptes, que Prisma lit comme `null`). Index uniques sur `User.email`, `Session.tokenHash`, `Invitation.tokenHash` et `Friendship.pairKey` ; le rôle est un `enum Role` Prisma et l'état d'une amitié un `enum FriendshipStatus` (`pending`, `accepted`), que Prisma génère en unions de chaînes. `Photo.ownerId` relie chaque photo à son compte ; index unique `(ownerId, sha256)` (un même fichier n'entre qu'une fois dans une bibliothèque), index `(ownerId, id)` pour la liste d'un compte, et index simple sur `cloudinaryId` (pas unique : une photo envoyée depuis la bibliothèque pointe vers la même image, détruite avec la dernière photo qui y renvoie). `Photo.senderId`, facultatif, relie une photo reçue au compte qui l'a envoyée (`null` pour une photo ajoutée par son propriétaire) : `User` a donc deux relations vers `Photo`, que Prisma exige de nommer (`PhotoOwner` pour `ownerId`, `PhotoSender` pour `senderId`). Le nom de l'expéditeur est lu par une jointure (`include` de `sender`, `displayName` seul), jamais recopié dans `Photo`. `Photo.message`, facultatif, est le mot de l'expéditeur (absent sans message, et sur les photos d'avant l'étape 9, que Prisma lit comme `null`). `Invitation.invitedById` relie une invitation à l'admin qui l'a créée ; index simple sur `Invitation.email` (pas unique : une invitation utilisée reste à côté d'une plus récente pour la même adresse). `pnpm db:seed` (`server/prisma/seed.ts`) vide la base (sessions, photos, invitations et amitiés avant les comptes, car Prisma émule les relations sur MongoDB) et crée les deux comptes de test du README.
+- Collections `User`, `Session`, `Photo`, `Invitation`, `Friendship` et `Collection`. `User.avatarCloudinaryId`, facultatif, est l'identifiant Cloudinary de la photo de profil (absent des anciens comptes, que Prisma lit comme `null`). Index uniques sur `User.email`, `Session.tokenHash`, `Invitation.tokenHash`, `Friendship.pairKey` et `Collection (ownerId, name)` ; le rôle est un `enum Role` Prisma et l'état d'une amitié un `enum FriendshipStatus` (`pending`, `accepted`), que Prisma génère en unions de chaînes. `Photo.ownerId` relie chaque photo à son compte ; index unique `(ownerId, sha256)` (un même fichier n'entre qu'une fois dans une bibliothèque), index `(ownerId, id)` pour la liste d'un compte, et index simple sur `cloudinaryId` (pas unique : une photo envoyée depuis la bibliothèque pointe vers la même image, détruite avec la dernière photo qui y renvoie). `Photo.senderId`, facultatif, relie une photo reçue au compte qui l'a envoyée (`null` pour une photo ajoutée par son propriétaire) : `User` a donc deux relations vers `Photo`, que Prisma exige de nommer (`PhotoOwner` pour `ownerId`, `PhotoSender` pour `senderId`). Le nom de l'expéditeur est lu par une jointure (`include` de `sender`, `displayName` seul), jamais recopié dans `Photo`. `Photo.message`, facultatif, est le mot de l'expéditeur (absent sans message, et sur les photos d'avant l'étape 9, que Prisma lit comme `null`). `Invitation.invitedById` relie une invitation à l'admin qui l'a créée ; index simple sur `Invitation.email` (pas unique : une invitation utilisée reste à côté d'une plus récente pour la même adresse). `pnpm db:seed` (`server/prisma/seed.ts`) vide la base (sessions, photos, invitations, amitiés et collections avant les comptes, car Prisma émule les relations sur MongoDB) et crée les deux comptes de test du README.
+- **Collections** : une `Collection` porte `ownerId`, `name` et `photoIds`, la liste des photos (`String[] @db.ObjectId`) ; la photo, elle, ne sait pas dans quelles collections elle est, donc ni le DTO `Photo` ni ses événements ne changent. `photoIds` est écrit `[]` dès la création : MongoDB ne trouve « ne contient pas » que sur un champ qui existe. Prisma ne sait pas retirer un élément d'une liste (pas de `$pull`) : l'id d'une photo supprimée reste dans `photoIds`, et chaque lecture ne garde que les ids encore dans la bibliothèque (`findLivePhotoIds`, une requête pour toutes les collections). L'index unique `(ownerId, name)` est né avec la collection : aucune donnée existante à remettre en ordre avant `pnpm db:push`.
 - **Amitiés** : un seul document `Friendship` par paire de comptes porte la demande, puis l'amitié (`requesterId`, `addresseeId`, `status`). `pairKey` vaut les deux ids triés et joints par `:`, sous un index unique : MongoDB ne sait pas indexer « cette paire, dans un sens ou dans l'autre », et la clé triée fait refuser par l'index lui-même A→B à côté de B→A, demandes simultanées comprises. Seul le repository calcule `pairKey`. Index simples sur `requesterId` et `addresseeId` pour la liste d'un compte. Une demande refusée ou annulée, comme une amitié retirée, est supprimée : pas de troisième état.
 - Quand `Photo` gagne un champ obligatoire ou un index unique, `pnpm db:seed` passe **avant** `pnpm db:push` : MongoDB compte un champ absent comme `null`, et d'anciennes photos sans ce champ empêcheraient l'index unique de se créer.
 - `Photo.isOpened`, facultatif : `true` pour une photo ajoutée par son propriétaire, `false` pour une photo reçue jusqu'à son ouverture. Les photos d'avant l'étape 9 n'ont pas le champ et comptent comme ouvertes : aucune migration, `pnpm db:push` sans seed (pas de nouvel index). La bibliothèque filtre donc avec `OR: [{ isOpened: true }, { isOpened: { isSet: false } }]` : `{ isOpened: { not: false } }` ne renverrait pas les photos sans le champ (vérifié sur MongoDB 7 avec Prisma 6.19). Les photos en attente se lisent avec un simple `isOpened: false`, servi par l'index `(ownerId, id)`.
@@ -278,7 +291,7 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 - **Biome** : lint, formatage et tri des imports (remplace ESLint + Prettier). Dans `server/src`, `noConsole` interdit `console` : on passe par le logger.
 - **lefthook** : `biome check` au pre-commit, **commitlint** au commit-msg.
 - **Vitest** : tests unitaires du serveur, colocalisés (`*.test.ts`), lancés par `pnpm test` sans API ; exclus du build par `server/tsconfig.build.json`.
-- **Bruno** (`server/bruno/`) : requêtes de l'API avec assertions, un dossier par endpoint, des fichiers `NN-nominal-…` / `NN-edge-…`. Lancées par `pnpm test:bruno` contre l'API démarrée et la base remplie par le seed (CLI via `pnpm dlx`, version figée, pas de dépendance). Le dossier `auth/` passe en premier (`seq: 1`) et range le cookie de session dans une variable, envoyée à toutes les requêtes par un en-tête de collection ; le CLI tourne avec `--disable-cookies` pour que sa boîte à cookies ne renvoie pas la session aux requêtes « sans cookie ». Un second compte (l'admin, `auth/login/05`) range son cookie dans `adminCookie` : les requêtes qui vérifient qu'un compte ne touche pas aux photos d'un autre l'envoient à la place de celui du membre. Le dossier `invitations/` passe juste après (`seq: 2`) : l'admin y crée une invitation pour une adresse neuve à chaque lancement (`invite-<horodatage>@familyframe.test`), donc rien à remettre à zéro entre deux lancements. Le dossier `friendships/` suit (`seq: 3`) : le membre y envoie une demande à l'admin, et `invitations/accept/05` range le cookie du compte créé dans `inviteeCookie`, un tiers qui ne doit toucher à aucune amitié. Le dossier finit sans amitié entre le membre et l'admin ; `create/01` efface d'abord celle d'un lancement interrompu. Dans `photos/`, le dossier `share/` (`seq: 3`, avant `delete/`) lit les ids des deux comptes (`memberId`, `adminId`), rend le membre et l'admin amis, le membre envoie à l'admin une photo de sa bibliothèque et un fichier, puis l'amitié est supprimée ; `delete/` supprime ensuite les photos reçues par l'admin.
+- **Bruno** (`server/bruno/`) : requêtes de l'API avec assertions, un dossier par endpoint, des fichiers `NN-nominal-…` / `NN-edge-…`. Lancées par `pnpm test:bruno` contre l'API démarrée et la base remplie par le seed (CLI via `pnpm dlx`, version figée, pas de dépendance). Le dossier `auth/` passe en premier (`seq: 1`) et range le cookie de session dans une variable, envoyée à toutes les requêtes par un en-tête de collection ; le CLI tourne avec `--disable-cookies` pour que sa boîte à cookies ne renvoie pas la session aux requêtes « sans cookie ». Un second compte (l'admin, `auth/login/05`) range son cookie dans `adminCookie` : les requêtes qui vérifient qu'un compte ne touche pas aux photos d'un autre l'envoient à la place de celui du membre. Le dossier `invitations/` passe juste après (`seq: 2`) : l'admin y crée une invitation pour une adresse neuve à chaque lancement (`invite-<horodatage>@familyframe.test`), donc rien à remettre à zéro entre deux lancements. Le dossier `friendships/` suit (`seq: 3`) : le membre y envoie une demande à l'admin, et `invitations/accept/05` range le cookie du compte créé dans `inviteeCookie`, un tiers qui ne doit toucher à aucune amitié. Le dossier finit sans amitié entre le membre et l'admin ; `create/01` efface d'abord celle d'un lancement interrompu. Dans `photos/`, le dossier `share/` (`seq: 3`, avant `delete/`) lit les ids des deux comptes (`memberId`, `adminId`), rend le membre et l'admin amis, le membre envoie à l'admin une photo de sa bibliothèque et un fichier, puis l'amitié est supprimée ; `delete/` supprime ensuite les photos reçues par l'admin. Le dossier `collections/` (`seq: 5`, avant `photos/`) passe tout entier par le compte jetable (`inviteeCookie`), jamais par le membre dont les collections sont celles de la base partagée ; le membre y sert d'« autre compte ». Il crée deux collections, les renomme, puis les supprime : le compte finit sans collection.
 - **Hooks Claude Code** (`.claude/hooks/`) : garde-fous pour l'agent IA, testés avec `node:test`.
 
 ## Conteneurisation
diff --git a/server/bruno/collections/create/01-nominal.bru b/server/bruno/collections/create/01-nominal.bru
new file mode 100644
index 0000000..d5256c6
--- /dev/null
+++ b/server/bruno/collections/create/01-nominal.bru
@@ -0,0 +1,54 @@
+meta {
+  name: Nominal - nouvelle collection
+  type: http
+  seq: 1
+}
+
+post {
+  url: {{baseUrl}}/api/collections
+  body: json
+  auth: none
+}
+
+body:json {
+  {
+    "name": "  Noël  "
+  }
+}
+
+script:pre-request {
+  if (!bru.getVar('inviteeCookie')) {
+    throw new Error('inviteeCookie absent : lancer toute la collection, invitations/accept/05 doit passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 201
+  res.body.id: isString
+  res.body.name: eq Noël
+  res.body.photoIds: isArray
+  res.body.photoIds.length: eq 0
+  res.body.ownerId: isUndefined
+}
+
+script:post-response {
+  bru.setVar('collectionId', res.body.id)
+  const axios = require('axios')
+  // A script request does not get the collection headers: send the cookie itself.
+  const namesOf = async (cookie) => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/collections`, {
+      headers: { Cookie: cookie },
+    })
+    return list.data.collections.map(({ name }) => name)
+  }
+  test('la collection est dans la liste du compte', async () => {
+    expect(await namesOf(bru.getVar('inviteeCookie'))).to.include('Noël')
+  })
+}
+
+docs {
+  NOMINAL → 201 `{ id, name, photoIds }`, sans photo. Le nom part entouré d'espaces : le serveur
+  le rogne. Le script relit la liste : la collection est bien enregistrée.
+}
diff --git a/server/bruno/collections/create/02-nominal-seconde.bru b/server/bruno/collections/create/02-nominal-seconde.bru
new file mode 100644
index 0000000..ffbd6fb
--- /dev/null
+++ b/server/bruno/collections/create/02-nominal-seconde.bru
@@ -0,0 +1,39 @@
+meta {
+  name: Nominal - seconde collection
+  type: http
+  seq: 2
+}
+
+post {
+  url: {{baseUrl}}/api/collections
+  body: json
+  auth: none
+}
+
+body:json {
+  {
+    "name": "Été 2026"
+  }
+}
+
+script:pre-request {
+  if (!bru.getVar('inviteeCookie')) {
+    throw new Error('inviteeCookie absent : lancer toute la collection, invitations/accept/05 doit passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 201
+  res.body.name: eq Été 2026
+}
+
+script:post-response {
+  bru.setVar('secondCollectionId', res.body.id)
+}
+
+docs {
+  NOMINAL → 201. Une seconde collection, dont le nom commence par un
+  accent : `list/01` vérifie le tri à la française.
+}
diff --git a/server/bruno/collections/create/03-edge-nom-existant.bru b/server/bruno/collections/create/03-edge-nom-existant.bru
new file mode 100644
index 0000000..4bb7fb5
--- /dev/null
+++ b/server/bruno/collections/create/03-edge-nom-existant.bru
@@ -0,0 +1,35 @@
+meta {
+  name: Edge - nom déjà utilisé
+  type: http
+  seq: 3
+}
+
+post {
+  url: {{baseUrl}}/api/collections
+  body: json
+  auth: none
+}
+
+body:json {
+  {
+    "name": "Noël"
+  }
+}
+
+script:pre-request {
+  if (!bru.getVar('inviteeCookie')) {
+    throw new Error('inviteeCookie absent : lancer toute la collection, invitations/accept/05 doit passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 409
+  res.body.error: eq COLLECTION_EXISTS
+}
+
+docs {
+  EDGE → 409 COLLECTION_EXISTS : le compte a déjà une collection « Noël »
+  (`01`). Deux collections du même nom se confondraient dans les menus.
+}
diff --git a/server/bruno/collections/create/04-edge-nom-vide.bru b/server/bruno/collections/create/04-edge-nom-vide.bru
new file mode 100644
index 0000000..17b4ce4
--- /dev/null
+++ b/server/bruno/collections/create/04-edge-nom-vide.bru
@@ -0,0 +1,35 @@
+meta {
+  name: Edge - nom vide
+  type: http
+  seq: 4
+}
+
+post {
+  url: {{baseUrl}}/api/collections
+  body: json
+  auth: none
+}
+
+body:json {
+  {
+    "name": "   "
+  }
+}
+
+script:pre-request {
+  if (!bru.getVar('inviteeCookie')) {
+    throw new Error('inviteeCookie absent : lancer toute la collection, invitations/accept/05 doit passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 400
+  res.body.error: eq COLLECTION_NAME_INVALID
+}
+
+docs {
+  EDGE → 400 COLLECTION_NAME_INVALID : un nom fait d'espaces est vide une
+  fois rogné.
+}
diff --git a/server/bruno/collections/create/05-edge-nom-trop-long.bru b/server/bruno/collections/create/05-edge-nom-trop-long.bru
new file mode 100644
index 0000000..ba3d680
--- /dev/null
+++ b/server/bruno/collections/create/05-edge-nom-trop-long.bru
@@ -0,0 +1,35 @@
+meta {
+  name: Edge - nom de 51 caractères
+  type: http
+  seq: 5
+}
+
+post {
+  url: {{baseUrl}}/api/collections
+  body: json
+  auth: none
+}
+
+body:json {
+  {
+    "name": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
+  }
+}
+
+script:pre-request {
+  if (!bru.getVar('inviteeCookie')) {
+    throw new Error('inviteeCookie absent : lancer toute la collection, invitations/accept/05 doit passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 400
+  res.body.error: eq COLLECTION_NAME_INVALID
+}
+
+docs {
+  EDGE → 400 COLLECTION_NAME_INVALID : 50 caractères au plus, pour tenir
+  dans le menu du cadre.
+}
diff --git a/server/bruno/collections/create/06-edge-nom-pas-texte.bru b/server/bruno/collections/create/06-edge-nom-pas-texte.bru
new file mode 100644
index 0000000..22c647d
--- /dev/null
+++ b/server/bruno/collections/create/06-edge-nom-pas-texte.bru
@@ -0,0 +1,35 @@
+meta {
+  name: Edge - nom qui n'est pas du texte
+  type: http
+  seq: 6
+}
+
+post {
+  url: {{baseUrl}}/api/collections
+  body: json
+  auth: none
+}
+
+body:json {
+  {
+    "name": 42
+  }
+}
+
+script:pre-request {
+  if (!bru.getVar('inviteeCookie')) {
+    throw new Error('inviteeCookie absent : lancer toute la collection, invitations/accept/05 doit passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 400
+  res.body.error: eq COLLECTION_NAME_INVALID
+}
+
+docs {
+  EDGE → 400 COLLECTION_NAME_INVALID : un nombre n'est pas un nom, même
+  court. Le serveur ne le convertit pas en texte.
+}
diff --git a/server/bruno/collections/create/07-edge-json-malforme.bru b/server/bruno/collections/create/07-edge-json-malforme.bru
new file mode 100644
index 0000000..64b6c4e
--- /dev/null
+++ b/server/bruno/collections/create/07-edge-json-malforme.bru
@@ -0,0 +1,37 @@
+meta {
+  name: Edge - JSON malformé
+  type: http
+  seq: 7
+}
+
+post {
+  url: {{baseUrl}}/api/collections
+  body: text
+  auth: none
+}
+
+headers {
+  Content-Type: application/json
+}
+
+body:text {
+  {"name": "Noël"
+}
+
+script:pre-request {
+  if (!bru.getVar('inviteeCookie')) {
+    throw new Error('inviteeCookie absent : lancer toute la collection, invitations/accept/05 doit passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 400
+  res.body.error: eq BODY_INVALID
+}
+
+docs {
+  EDGE → 400 BODY_INVALID : le routeur monte son propre `express.json()`, qui
+  refuse un corps JSON illisible.
+}
diff --git a/server/bruno/collections/create/08-edge-sans-cookie.bru b/server/bruno/collections/create/08-edge-sans-cookie.bru
new file mode 100644
index 0000000..542c797
--- /dev/null
+++ b/server/bruno/collections/create/08-edge-sans-cookie.bru
@@ -0,0 +1,32 @@
+meta {
+  name: Edge - sans cookie de session
+  type: http
+  seq: 8
+}
+
+post {
+  url: {{baseUrl}}/api/collections
+  body: json
+  auth: none
+}
+
+body:json {
+  {
+    "name": "Personne"
+  }
+}
+
+script:pre-request {
+  // collection.bru sends the session cookie to every request: remove it here.
+  req.deleteHeader('Cookie')
+}
+
+assert {
+  res.status: eq 401
+  res.body.error: eq UNAUTHENTICATED
+}
+
+docs {
+  EDGE → 401 UNAUTHENTICATED : toutes les routes des collections demandent
+  une session.
+}
diff --git a/server/bruno/collections/create/folder.bru b/server/bruno/collections/create/folder.bru
new file mode 100644
index 0000000..0540266
--- /dev/null
+++ b/server/bruno/collections/create/folder.bru
@@ -0,0 +1,10 @@
+meta {
+  name: create
+  seq: 1
+}
+
+docs {
+  `POST /api/collections`, JSON `{ name }` → 201 avec la collection créée.
+  `01` et `02` créent les deux collections du dossier (`collectionId`,
+  `secondCollectionId`), supprimées par `delete/`.
+}
diff --git a/server/bruno/collections/delete/01-edge-autre-compte.bru b/server/bruno/collections/delete/01-edge-autre-compte.bru
new file mode 100644
index 0000000..cdb8a23
--- /dev/null
+++ b/server/bruno/collections/delete/01-edge-autre-compte.bru
@@ -0,0 +1,35 @@
+meta {
+  name: Edge - collection d'un autre compte
+  type: http
+  seq: 1
+}
+
+delete {
+  url: {{baseUrl}}/api/collections/{{collectionId}}
+  body: none
+  auth: none
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq COLLECTION_NOT_FOUND
+}
+
+script:post-response {
+  const axios = require('axios')
+  // A script request does not get the collection headers: send the cookie itself.
+  const namesOf = async (cookie) => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/collections`, {
+      headers: { Cookie: cookie },
+    })
+    return list.data.collections.map(({ name }) => name)
+  }
+  test('la collection est toujours là', async () => {
+    expect(await namesOf(bru.getVar('inviteeCookie'))).to.include('Noël 2026')
+  })
+}
+
+docs {
+  EDGE → 404 COLLECTION_NOT_FOUND : le membre essaie de supprimer la
+  collection du compte jetable ; elle reste.
+}
diff --git a/server/bruno/collections/delete/02-nominal.bru b/server/bruno/collections/delete/02-nominal.bru
new file mode 100644
index 0000000..ce62e27
--- /dev/null
+++ b/server/bruno/collections/delete/02-nominal.bru
@@ -0,0 +1,40 @@
+meta {
+  name: Nominal - suppression d'une collection
+  type: http
+  seq: 2
+}
+
+delete {
+  url: {{baseUrl}}/api/collections/{{collectionId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('collectionId') || !bru.getVar('inviteeCookie')) {
+    throw new Error('collectionId ou inviteeCookie absent : lancer toute la collection, collections/create/01 doit passer')
+  }
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 204
+}
+
+script:post-response {
+  const axios = require('axios')
+  // A script request does not get the collection headers: send the cookie itself.
+  const namesOf = async (cookie) => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/collections`, {
+      headers: { Cookie: cookie },
+    })
+    return list.data.collections.map(({ name }) => name)
+  }
+  test('la collection ne figure plus dans la liste', async () => {
+    expect(await namesOf(bru.getVar('inviteeCookie'))).to.eql(['Été 2026'])
+  })
+}
+
+docs {
+  NOMINAL → 204, puis la liste ne contient plus que « Été 2026 ».
+}
diff --git a/server/bruno/collections/delete/03-edge-deja-supprimee.bru b/server/bruno/collections/delete/03-edge-deja-supprimee.bru
new file mode 100644
index 0000000..0315c39
--- /dev/null
+++ b/server/bruno/collections/delete/03-edge-deja-supprimee.bru
@@ -0,0 +1,28 @@
+meta {
+  name: Edge - collection déjà supprimée
+  type: http
+  seq: 3
+}
+
+delete {
+  url: {{baseUrl}}/api/collections/{{collectionId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('collectionId') || !bru.getVar('inviteeCookie')) {
+    throw new Error('collectionId ou inviteeCookie absent : lancer toute la collection, collections/create/01 doit passer')
+  }
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq COLLECTION_NOT_FOUND
+}
+
+docs {
+  EDGE → 404 COLLECTION_NOT_FOUND : `02` vient de la supprimer, depuis un
+  autre appareil par exemple.
+}
diff --git a/server/bruno/collections/delete/04-edge-id-invalide.bru b/server/bruno/collections/delete/04-edge-id-invalide.bru
new file mode 100644
index 0000000..95f5f80
--- /dev/null
+++ b/server/bruno/collections/delete/04-edge-id-invalide.bru
@@ -0,0 +1,29 @@
+meta {
+  name: Edge - id mal formé
+  type: http
+  seq: 4
+}
+
+delete {
+  url: {{baseUrl}}/api/collections/pas-un-id
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('inviteeCookie')) {
+    throw new Error('inviteeCookie absent : lancer toute la collection, invitations/accept/05 doit passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq COLLECTION_NOT_FOUND
+}
+
+docs {
+  EDGE → 404 COLLECTION_NOT_FOUND : un id mal formé répond comme une
+  collection inconnue.
+}
diff --git a/server/bruno/collections/delete/05-nominal-seconde.bru b/server/bruno/collections/delete/05-nominal-seconde.bru
new file mode 100644
index 0000000..faaab16
--- /dev/null
+++ b/server/bruno/collections/delete/05-nominal-seconde.bru
@@ -0,0 +1,41 @@
+meta {
+  name: Nominal - suppression de la seconde collection
+  type: http
+  seq: 5
+}
+
+delete {
+  url: {{baseUrl}}/api/collections/{{secondCollectionId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('inviteeCookie')) {
+    throw new Error('inviteeCookie absent : lancer toute la collection, invitations/accept/05 doit passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 204
+}
+
+script:post-response {
+  const axios = require('axios')
+  // A script request does not get the collection headers: send the cookie itself.
+  const namesOf = async (cookie) => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/collections`, {
+      headers: { Cookie: cookie },
+    })
+    return list.data.collections.map(({ name }) => name)
+  }
+  test('le compte n\'a plus aucune collection', async () => {
+    expect(await namesOf(bru.getVar('inviteeCookie'))).to.eql([])
+  })
+}
+
+docs {
+  NOMINAL → 204 : le dossier se termine sans collection.
+}
diff --git a/server/bruno/collections/delete/06-edge-sans-cookie.bru b/server/bruno/collections/delete/06-edge-sans-cookie.bru
new file mode 100644
index 0000000..a9d35c7
--- /dev/null
+++ b/server/bruno/collections/delete/06-edge-sans-cookie.bru
@@ -0,0 +1,25 @@
+meta {
+  name: Edge - sans cookie de session
+  type: http
+  seq: 6
+}
+
+delete {
+  url: {{baseUrl}}/api/collections/{{secondCollectionId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  // collection.bru sends the session cookie to every request: remove it here.
+  req.deleteHeader('Cookie')
+}
+
+assert {
+  res.status: eq 401
+  res.body.error: eq UNAUTHENTICATED
+}
+
+docs {
+  EDGE → 401 UNAUTHENTICATED : supprimer demande une session.
+}
diff --git a/server/bruno/collections/delete/folder.bru b/server/bruno/collections/delete/folder.bru
new file mode 100644
index 0000000..a394492
--- /dev/null
+++ b/server/bruno/collections/delete/folder.bru
@@ -0,0 +1,11 @@
+meta {
+  name: delete
+  seq: 4
+}
+
+docs {
+  `DELETE /api/collections/:id` → 204 sans corps. Les photos de la
+  collection restent dans la bibliothèque : seule la collection disparaît.
+  Supprime les deux collections de
+  `create/` : le compte jetable finit sans collection.
+}
diff --git a/server/bruno/collections/folder.bru b/server/bruno/collections/folder.bru
new file mode 100644
index 0000000..28bf8d6
--- /dev/null
+++ b/server/bruno/collections/folder.bru
@@ -0,0 +1,27 @@
+meta {
+  name: collections
+  seq: 5
+}
+
+docs {
+  Les collections du compte connecté : `GET /api/collections` → 200
+  `{ collections }`, `POST /api/collections` (JSON `{ name }`) → 201,
+  `PATCH /api/collections/:id` (JSON `{ name }`) → 200, `DELETE
+  /api/collections/:id` → 204. Une collection renvoyée par l'API vaut
+  `{ id, name, photoIds }`, jamais son propriétaire. Chaque écriture envoie
+  l'événement Socket.IO `collections:changed`, sans contenu, aux connexions
+  du propriétaire : elles relisent la liste.
+
+  Le nom est rogné et fait 1 à 50 caractères, sinon 400
+  `COLLECTION_NAME_INVALID` ; un nom que le compte utilise déjà, 409
+  `COLLECTION_EXISTS`. La collection d'un autre compte, inconnue ou un id mal
+  formé : 404 `COLLECTION_NOT_FOUND`. La liste est triée par nom, comme en
+  français (« Été » avant « Noël »).
+
+  Toutes les requêtes passent par le compte jetable créé par
+  `invitations/accept/05` (cookie `inviteeCookie`), jamais par le membre,
+  dont les collections sont celles de la base de dev partagée : un compte
+  neuf à chaque lancement, donc pas de reste d'un lancement interrompu. Le
+  membre (cookie par défaut) sert d'« autre compte ». Le dossier finit sans
+  aucune collection. Ordre : `create`, `list`, `rename`, `delete`.
+}
diff --git a/server/bruno/collections/list/01-nominal.bru b/server/bruno/collections/list/01-nominal.bru
new file mode 100644
index 0000000..3f5201a
--- /dev/null
+++ b/server/bruno/collections/list/01-nominal.bru
@@ -0,0 +1,48 @@
+meta {
+  name: Nominal - collections triées par nom
+  type: http
+  seq: 1
+}
+
+get {
+  url: {{baseUrl}}/api/collections
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('inviteeCookie')) {
+    throw new Error('inviteeCookie absent : lancer toute la collection, invitations/accept/05 doit passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 200
+  res.body.collections: isArray
+  res.body.collections.length: eq 2
+}
+
+script:post-response {
+  const axios = require('axios')
+  // A script request does not get the collection headers: send the cookie itself.
+  const namesOf = async (cookie) => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/collections`, {
+      headers: { Cookie: cookie },
+    })
+    return list.data.collections.map(({ name }) => name)
+  }
+  test('triées à la française : « Été 2026 » avant « Noël »', () => {
+    expect(res.body.collections.map(({ name }) => name)).to.eql(['Été 2026', 'Noël'])
+  })
+  test('le membre ne voit pas les collections du compte jetable', async () => {
+    expect(await namesOf(bru.getVar('sessionCookie'))).to.not.include('Été 2026')
+  })
+}
+
+docs {
+  NOMINAL → 200 avec les deux collections de `create/`. Un tri par octets
+  placerait « Été » après « Noël » : le serveur trie comme en français. Le
+  script vérifie aussi que le membre ne les voit pas.
+}
diff --git a/server/bruno/collections/list/02-edge-sans-cookie.bru b/server/bruno/collections/list/02-edge-sans-cookie.bru
new file mode 100644
index 0000000..55b8916
--- /dev/null
+++ b/server/bruno/collections/list/02-edge-sans-cookie.bru
@@ -0,0 +1,25 @@
+meta {
+  name: Edge - sans cookie de session
+  type: http
+  seq: 2
+}
+
+get {
+  url: {{baseUrl}}/api/collections
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  // collection.bru sends the session cookie to every request: remove it here.
+  req.deleteHeader('Cookie')
+}
+
+assert {
+  res.status: eq 401
+  res.body.error: eq UNAUTHENTICATED
+}
+
+docs {
+  EDGE → 401 UNAUTHENTICATED : la liste demande une session.
+}
diff --git a/server/bruno/collections/list/folder.bru b/server/bruno/collections/list/folder.bru
new file mode 100644
index 0000000..413df37
--- /dev/null
+++ b/server/bruno/collections/list/folder.bru
@@ -0,0 +1,9 @@
+meta {
+  name: list
+  seq: 2
+}
+
+docs {
+  `GET /api/collections` → 200 `{ collections }` : toutes les collections du
+  compte connecté, triées par nom comme en français, sans pages.
+}
diff --git a/server/bruno/collections/rename/01-nominal.bru b/server/bruno/collections/rename/01-nominal.bru
new file mode 100644
index 0000000..c263fb6
--- /dev/null
+++ b/server/bruno/collections/rename/01-nominal.bru
@@ -0,0 +1,51 @@
+meta {
+  name: Nominal - nouveau nom
+  type: http
+  seq: 1
+}
+
+patch {
+  url: {{baseUrl}}/api/collections/{{collectionId}}
+  body: json
+  auth: none
+}
+
+body:json {
+  {
+    "name": " Noël 2026 "
+  }
+}
+
+script:pre-request {
+  if (!bru.getVar('collectionId') || !bru.getVar('inviteeCookie')) {
+    throw new Error('collectionId ou inviteeCookie absent : lancer toute la collection, collections/create/01 doit passer')
+  }
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 200
+  res.body.id: eq {{collectionId}}
+  res.body.name: eq Noël 2026
+}
+
+script:post-response {
+  const axios = require('axios')
+  // A script request does not get the collection headers: send the cookie itself.
+  const namesOf = async (cookie) => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/collections`, {
+      headers: { Cookie: cookie },
+    })
+    return list.data.collections.map(({ name }) => name)
+  }
+  test('la liste porte le nouveau nom', async () => {
+    const names = await namesOf(bru.getVar('inviteeCookie'))
+    expect(names).to.include('Noël 2026')
+    expect(names).to.not.include('Noël')
+  })
+}
+
+docs {
+  NOMINAL → 200 avec le nom rogné. Le script relit la liste : l'ancien nom
+  a disparu.
+}
diff --git a/server/bruno/collections/rename/02-edge-nom-existant.bru b/server/bruno/collections/rename/02-edge-nom-existant.bru
new file mode 100644
index 0000000..ce08c16
--- /dev/null
+++ b/server/bruno/collections/rename/02-edge-nom-existant.bru
@@ -0,0 +1,35 @@
+meta {
+  name: Edge - nom d'une autre collection
+  type: http
+  seq: 2
+}
+
+patch {
+  url: {{baseUrl}}/api/collections/{{secondCollectionId}}
+  body: json
+  auth: none
+}
+
+body:json {
+  {
+    "name": "Noël 2026"
+  }
+}
+
+script:pre-request {
+  if (!bru.getVar('inviteeCookie')) {
+    throw new Error('inviteeCookie absent : lancer toute la collection, invitations/accept/05 doit passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 409
+  res.body.error: eq COLLECTION_EXISTS
+}
+
+docs {
+  EDGE → 409 COLLECTION_EXISTS : « Été 2026 » prend le nom de l'autre
+  collection du compte.
+}
diff --git a/server/bruno/collections/rename/03-nominal-meme-nom.bru b/server/bruno/collections/rename/03-nominal-meme-nom.bru
new file mode 100644
index 0000000..26c5293
--- /dev/null
+++ b/server/bruno/collections/rename/03-nominal-meme-nom.bru
@@ -0,0 +1,34 @@
+meta {
+  name: Nominal - garder son propre nom
+  type: http
+  seq: 3
+}
+
+patch {
+  url: {{baseUrl}}/api/collections/{{collectionId}}
+  body: json
+  auth: none
+}
+
+body:json {
+  {
+    "name": "Noël 2026"
+  }
+}
+
+script:pre-request {
+  if (!bru.getVar('collectionId') || !bru.getVar('inviteeCookie')) {
+    throw new Error('collectionId ou inviteeCookie absent : lancer toute la collection, collections/create/01 doit passer')
+  }
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 200
+  res.body.name: eq Noël 2026
+}
+
+docs {
+  NOMINAL → 200 : enregistrer une collection sous le nom qu'elle porte déjà
+  n'est pas un doublon.
+}
diff --git a/server/bruno/collections/rename/04-edge-autre-compte.bru b/server/bruno/collections/rename/04-edge-autre-compte.bru
new file mode 100644
index 0000000..d2c143d
--- /dev/null
+++ b/server/bruno/collections/rename/04-edge-autre-compte.bru
@@ -0,0 +1,42 @@
+meta {
+  name: Edge - collection d'un autre compte
+  type: http
+  seq: 4
+}
+
+patch {
+  url: {{baseUrl}}/api/collections/{{collectionId}}
+  body: json
+  auth: none
+}
+
+body:json {
+  {
+    "name": "Piratée"
+  }
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq COLLECTION_NOT_FOUND
+}
+
+script:post-response {
+  const axios = require('axios')
+  // A script request does not get the collection headers: send the cookie itself.
+  const namesOf = async (cookie) => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/collections`, {
+      headers: { Cookie: cookie },
+    })
+    return list.data.collections.map(({ name }) => name)
+  }
+  test('la collection garde son nom', async () => {
+    expect(await namesOf(bru.getVar('inviteeCookie'))).to.include('Noël 2026')
+  })
+}
+
+docs {
+  EDGE → 404 COLLECTION_NOT_FOUND : le membre (cookie par défaut) essaie de
+  renommer la collection du compte jetable. La réponse est celle d'une
+  collection inconnue (pas de 403, qui dirait qu'elle existe).
+}
diff --git a/server/bruno/collections/rename/05-edge-id-invalide.bru b/server/bruno/collections/rename/05-edge-id-invalide.bru
new file mode 100644
index 0000000..a7b413a
--- /dev/null
+++ b/server/bruno/collections/rename/05-edge-id-invalide.bru
@@ -0,0 +1,35 @@
+meta {
+  name: Edge - id mal formé
+  type: http
+  seq: 5
+}
+
+patch {
+  url: {{baseUrl}}/api/collections/pas-un-id
+  body: json
+  auth: none
+}
+
+body:json {
+  {
+    "name": "Noël"
+  }
+}
+
+script:pre-request {
+  if (!bru.getVar('inviteeCookie')) {
+    throw new Error('inviteeCookie absent : lancer toute la collection, invitations/accept/05 doit passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq COLLECTION_NOT_FOUND
+}
+
+docs {
+  EDGE → 404 COLLECTION_NOT_FOUND : un id qui n'est pas un ObjectId ne va
+  pas jusqu'à la base.
+}
diff --git a/server/bruno/collections/rename/06-edge-nom-vide.bru b/server/bruno/collections/rename/06-edge-nom-vide.bru
new file mode 100644
index 0000000..0e3c594
--- /dev/null
+++ b/server/bruno/collections/rename/06-edge-nom-vide.bru
@@ -0,0 +1,33 @@
+meta {
+  name: Edge - nom vide
+  type: http
+  seq: 6
+}
+
+patch {
+  url: {{baseUrl}}/api/collections/{{collectionId}}
+  body: json
+  auth: none
+}
+
+body:json {
+  {
+    "name": ""
+  }
+}
+
+script:pre-request {
+  if (!bru.getVar('collectionId') || !bru.getVar('inviteeCookie')) {
+    throw new Error('collectionId ou inviteeCookie absent : lancer toute la collection, collections/create/01 doit passer')
+  }
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 400
+  res.body.error: eq COLLECTION_NAME_INVALID
+}
+
+docs {
+  EDGE → 400 COLLECTION_NAME_INVALID : une collection a toujours un nom.
+}
diff --git a/server/bruno/collections/rename/07-edge-sans-cookie.bru b/server/bruno/collections/rename/07-edge-sans-cookie.bru
new file mode 100644
index 0000000..4b9f305
--- /dev/null
+++ b/server/bruno/collections/rename/07-edge-sans-cookie.bru
@@ -0,0 +1,31 @@
+meta {
+  name: Edge - sans cookie de session
+  type: http
+  seq: 7
+}
+
+patch {
+  url: {{baseUrl}}/api/collections/{{collectionId}}
+  body: json
+  auth: none
+}
+
+body:json {
+  {
+    "name": "Personne"
+  }
+}
+
+script:pre-request {
+  // collection.bru sends the session cookie to every request: remove it here.
+  req.deleteHeader('Cookie')
+}
+
+assert {
+  res.status: eq 401
+  res.body.error: eq UNAUTHENTICATED
+}
+
+docs {
+  EDGE → 401 UNAUTHENTICATED : renommer demande une session.
+}
diff --git a/server/bruno/collections/rename/folder.bru b/server/bruno/collections/rename/folder.bru
new file mode 100644
index 0000000..70bda7b
--- /dev/null
+++ b/server/bruno/collections/rename/folder.bru
@@ -0,0 +1,9 @@
+meta {
+  name: rename
+  seq: 3
+}
+
+docs {
+  `PATCH /api/collections/:id`, JSON `{ name }` → 200 avec la collection
+  renommée. Mêmes règles de nom qu'à la création.
+}
diff --git a/server/prisma/schema.prisma b/server/prisma/schema.prisma
index 392b655..60ac66f 100644
--- a/server/prisma/schema.prisma
+++ b/server/prisma/schema.prisma
@@ -30,6 +30,7 @@ model User {
   photos                 Photo[]      @relation("PhotoOwner")
   // Photos this account sent to friends: they live in the friends' libraries.
   sentPhotos             Photo[]      @relation("PhotoSender")
+  collections            Collection[]
   invitations            Invitation[]
   sentFriendRequests     Friendship[] @relation("FriendshipRequester")
   receivedFriendRequests Friendship[] @relation("FriendshipAddressee")
@@ -95,3 +96,18 @@ model Friendship {
   @@index([requesterId])
   @@index([addresseeId])
 }
+
+model Collection {
+  id        String   @id @default(auto()) @map("_id") @db.ObjectId
+  ownerId   String   @db.ObjectId
+  owner     User     @relation(fields: [ownerId], references: [id])
+  name      String
+  // The owner's photos, in the order they were added. Prisma has no $pull: a deleted photo's id
+  // stays here, and reads keep only the photos still in the library. Written as [] at creation:
+  // MongoDB matches « does not have » only on a field that exists.
+  photoIds  String[] @db.ObjectId
+  createdAt DateTime @default(now())
+
+  // Two collections with the same name would look alike in every menu.
+  @@unique([ownerId, name])
+}
diff --git a/server/prisma/seed.ts b/server/prisma/seed.ts
index 0a011a5..7880477 100644
--- a/server/prisma/seed.ts
+++ b/server/prisma/seed.ts
@@ -22,12 +22,13 @@ const SEED_USERS: SeedUser[] = [
 ]
 
 async function seed(): Promise<void> {
-  // Sessions, photos, invitations and friendships first: Prisma emulates the relations on
-  // MongoDB and refuses to delete a user that still has any of them.
+  // Sessions, photos, invitations, friendships and collections first: Prisma emulates the
+  // relations on MongoDB and refuses to delete a user that still has any of them.
   await prisma.session.deleteMany()
   await prisma.photo.deleteMany()
   await prisma.invitation.deleteMany()
   await prisma.friendship.deleteMany()
+  await prisma.collection.deleteMany()
   await prisma.user.deleteMany()
   for (const { password, ...user } of SEED_USERS) {
     await prisma.user.create({ data: { ...user, passwordHash: await hashPassword(password) } })
diff --git a/server/src/app.ts b/server/src/app.ts
index d95e42f..fccd06b 100644
--- a/server/src/app.ts
+++ b/server/src/app.ts
@@ -13,6 +13,10 @@ import { createRequireAuth } from './features/auth/auth.middleware.js'
 import { createAuthRepository } from './features/auth/auth.repository.js'
 import { createAuthRouter } from './features/auth/auth.routes.js'
 import { type AuthService, createAuthService } from './features/auth/auth.service.js'
+import { createCollectionsController } from './features/collections/collections.controller.js'
+import { createCollectionsRepository } from './features/collections/collections.repository.js'
+import { createCollectionsRouter } from './features/collections/collections.routes.js'
+import { createCollectionsService } from './features/collections/collections.service.js'
 import { createFriendshipsController } from './features/friendships/friendships.controller.js'
 import { createFriendshipsRepository } from './features/friendships/friendships.repository.js'
 import { createFriendshipsRouter } from './features/friendships/friendships.routes.js'
@@ -65,6 +69,14 @@ function assemblePhotosRouter(
   return createPhotosRouter(createPhotosController(service, io))
 }
 
+function assembleCollectionsRouter(io: SocketServer): Router {
+  const service = createCollectionsService({
+    repository: createCollectionsRepository(prisma),
+    logger,
+  })
+  return createCollectionsRouter(createCollectionsController(service, io))
+}
+
 function assembleFriendshipsService(): FriendshipsService {
   return createFriendshipsService({
     repository: createFriendshipsRepository(prisma),
@@ -130,6 +142,7 @@ export function createApp(io: SocketServer, authService: AuthService): Express {
   app.use('/api/invitations', assembleInvitationsRouter(authService, requireAuth, requireAdmin))
   app.use('/api/friendships', requireAuth, assembleFriendshipsRouter(friendships))
   app.use('/api/account', requireAuth, assembleAccountRouter())
+  app.use('/api/collections', requireAuth, assembleCollectionsRouter(io))
 
   app.use(notFound)
   app.use(errorHandler)
diff --git a/server/src/errors/error-handler.test.ts b/server/src/errors/error-handler.test.ts
index c6335f4..622b5e8 100644
--- a/server/src/errors/error-handler.test.ts
+++ b/server/src/errors/error-handler.test.ts
@@ -67,6 +67,27 @@ describe('toErrorResponse', () => {
     })
   })
 
+  it('answers a collection name that is blank, too long or not text with 400', () => {
+    expect(toErrorResponse(new AppError('COLLECTION_NAME_INVALID'))).toEqual({
+      status: 400,
+      body: { error: 'COLLECTION_NAME_INVALID' },
+    })
+  })
+
+  it('answers an unknown, malformed or foreign collection id with 404', () => {
+    expect(toErrorResponse(new AppError('COLLECTION_NOT_FOUND'))).toEqual({
+      status: 404,
+      body: { error: 'COLLECTION_NOT_FOUND' },
+    })
+  })
+
+  it('answers a collection name the account already uses with 409', () => {
+    expect(toErrorResponse(new AppError('COLLECTION_EXISTS'))).toEqual({
+      status: 409,
+      body: { error: 'COLLECTION_EXISTS' },
+    })
+  })
+
   it('answers an invitation past its 7 days with 410', () => {
     expect(toErrorResponse(new AppError('INVITATION_EXPIRED'))).toEqual({
       status: 410,
diff --git a/server/src/errors/error-handler.ts b/server/src/errors/error-handler.ts
index 63dd44e..aa810fc 100644
--- a/server/src/errors/error-handler.ts
+++ b/server/src/errors/error-handler.ts
@@ -16,6 +16,7 @@ const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
   PASSWORD_INCORRECT: 400,
   MESSAGE_INVALID: 400,
   SELF_FRIEND: 400,
+  COLLECTION_NAME_INVALID: 400,
   UNAUTHENTICATED: 401,
   INVALID_CREDENTIALS: 401,
   FORBIDDEN: 403,
@@ -25,10 +26,12 @@ const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
   INVITATION_NOT_FOUND: 404,
   USER_NOT_FOUND: 404,
   FRIENDSHIP_NOT_FOUND: 404,
+  COLLECTION_NOT_FOUND: 404,
   PHOTO_DUPLICATE: 409,
   ACCOUNT_EXISTS: 409,
   ALREADY_FRIENDS: 409,
   FRIEND_REQUEST_EXISTS: 409,
+  COLLECTION_EXISTS: 409,
   INVITATION_EXPIRED: 410,
   INVITATION_USED: 410,
   PHOTO_TOO_LARGE: 413,
diff --git a/server/src/features/collections/collections.controller.ts b/server/src/features/collections/collections.controller.ts
new file mode 100644
index 0000000..42a7bab
--- /dev/null
+++ b/server/src/features/collections/collections.controller.ts
@@ -0,0 +1,72 @@
+import type { Request, Response } from 'express'
+import type { SocketServer } from '../../lib/socket-types.js'
+import type { CollectionList } from '../../types.js'
+import { currentUser } from '../auth/auth.guard.js'
+import { userRoom } from '../auth/auth.socket.js'
+import type { CollectionsService } from './collections.service.js'
+
+export type CollectionsController = {
+  list: (req: Request, res: Response) => Promise<void>
+  create: (req: Request, res: Response) => Promise<void>
+  rename: (req: Request<{ id: string }>, res: Response) => Promise<void>
+  remove: (req: Request<{ id: string }>, res: Response) => Promise<void>
+}
+
+type ControllerDeps = { service: CollectionsService; io: SocketServer }
+
+// Every page of the owner reloads its list: menus, cards and frames stay in step.
+function announceChange({ io }: ControllerDeps, ownerId: string): void {
+  io.to(userRoom(ownerId)).emit('collections:changed')
+}
+
+async function list({ service }: ControllerDeps, req: Request, res: Response): Promise<void> {
+  const collections = await service.listCollections(currentUser(req).id)
+  const body: CollectionList = { collections }
+  res.json(body)
+}
+
+async function create(deps: ControllerDeps, req: Request, res: Response): Promise<void> {
+  const ownerId = currentUser(req).id
+  const collection = await deps.service.createCollection({ ownerId, name: req.body?.name })
+  announceChange(deps, ownerId)
+  res.status(201).json(collection)
+}
+
+async function rename(
+  deps: ControllerDeps,
+  req: Request<{ id: string }>,
+  res: Response,
+): Promise<void> {
+  const ownerId = currentUser(req).id
+  const collection = await deps.service.renameCollection({
+    id: req.params.id,
+    ownerId,
+    name: req.body?.name,
+  })
+  announceChange(deps, ownerId)
+  res.json(collection)
+}
+
+async function remove(
+  deps: ControllerDeps,
+  req: Request<{ id: string }>,
+  res: Response,
+): Promise<void> {
+  const ownerId = currentUser(req).id
+  await deps.service.deleteCollection({ id: req.params.id, ownerId })
+  announceChange(deps, ownerId)
+  res.status(204).end()
+}
+
+export function createCollectionsController(
+  service: CollectionsService,
+  io: SocketServer,
+): CollectionsController {
+  const deps: ControllerDeps = { service, io }
+  return {
+    list: (req, res) => list(deps, req, res),
+    create: (req, res) => create(deps, req, res),
+    rename: (req, res) => rename(deps, req, res),
+    remove: (req, res) => remove(deps, req, res),
+  }
+}
diff --git a/server/src/features/collections/collections.repository.ts b/server/src/features/collections/collections.repository.ts
new file mode 100644
index 0000000..78163fb
--- /dev/null
+++ b/server/src/features/collections/collections.repository.ts
@@ -0,0 +1,79 @@
+import { type Collection, Prisma, type PrismaClient } from '@prisma/client'
+
+export type CollectionRecord = Collection
+
+// Why a write found nothing to change: the service turns it into the error code.
+export type WriteRefusal = 'not_found' | 'name_taken'
+
+export type CollectionsRepository = {
+  findAllOf: (ownerId: string) => Promise<CollectionRecord[]>
+  // Among ids, the ones still in the owner's library: a deleted photo stays in photoIds.
+  findLivePhotoIds: (ownerId: string, ids: string[]) => Promise<string[]>
+  create: (ownerId: string, name: string) => Promise<CollectionRecord | WriteRefusal>
+  rename: (id: string, ownerId: string, name: string) => Promise<CollectionRecord | WriteRefusal>
+  // null unless id is one of ownerId's collections.
+  deleteOwned: (id: string, ownerId: string) => Promise<CollectionRecord | null>
+}
+
+// P2002: the unique (ownerId, name) index refused the write. P2025: no record matched.
+function toRefusal(error: unknown): WriteRefusal {
+  if (error instanceof Prisma.PrismaClientKnownRequestError) {
+    if (error.code === 'P2002') {
+      return 'name_taken'
+    }
+    if (error.code === 'P2025') {
+      return 'not_found'
+    }
+  }
+  throw error
+}
+
+async function refusalOnPrismaError(
+  query: Promise<CollectionRecord>,
+): Promise<CollectionRecord | WriteRefusal> {
+  try {
+    return await query
+  } catch (error: unknown) {
+    return toRefusal(error)
+  }
+}
+
+async function findLivePhotoIds(
+  prisma: PrismaClient,
+  ownerId: string,
+  ids: string[],
+): Promise<string[]> {
+  const photos = await prisma.photo.findMany({
+    where: { ownerId, id: { in: ids } },
+    select: { id: true },
+  })
+  return photos.map((photo) => photo.id)
+}
+
+async function nullWhenNotFound(
+  query: Promise<CollectionRecord>,
+): Promise<CollectionRecord | null> {
+  try {
+    return await query
+  } catch (error: unknown) {
+    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
+      return null
+    }
+    throw error
+  }
+}
+
+export function createCollectionsRepository(prisma: PrismaClient): CollectionsRepository {
+  return {
+    findAllOf: (ownerId) => prisma.collection.findMany({ where: { ownerId } }),
+    findLivePhotoIds: (ownerId, ids) => findLivePhotoIds(prisma, ownerId, ids),
+    // photoIds: [] written for real: a missing field would never match « does not have ».
+    create: (ownerId, name) =>
+      refusalOnPrismaError(prisma.collection.create({ data: { ownerId, name, photoIds: [] } })),
+    // The owner next to the unique id: someone else's collection is not found.
+    rename: (id, ownerId, name) =>
+      refusalOnPrismaError(prisma.collection.update({ where: { id, ownerId }, data: { name } })),
+    deleteOwned: (id, ownerId) =>
+      nullWhenNotFound(prisma.collection.delete({ where: { id, ownerId } })),
+  }
+}
diff --git a/server/src/features/collections/collections.routes.ts b/server/src/features/collections/collections.routes.ts
new file mode 100644
index 0000000..eb6449d
--- /dev/null
+++ b/server/src/features/collections/collections.routes.ts
@@ -0,0 +1,13 @@
+import express, { Router } from 'express'
+import type { CollectionsController } from './collections.controller.js'
+
+export function createCollectionsRouter(controller: CollectionsController): Router {
+  const router = Router()
+  // A JSON route brings its own parser (see the logging spec).
+  router.use(express.json())
+  router.get('/', controller.list)
+  router.post('/', controller.create)
+  router.patch('/:id', controller.rename)
+  router.delete('/:id', controller.remove)
+  return router
+}
diff --git a/server/src/features/collections/collections.service.test.ts b/server/src/features/collections/collections.service.test.ts
new file mode 100644
index 0000000..836969f
--- /dev/null
+++ b/server/src/features/collections/collections.service.test.ts
@@ -0,0 +1,192 @@
+import { describe, expect, it, vi } from 'vitest'
+import { AppError } from '../../errors/app-error.js'
+import type { Logger } from '../../lib/logger.js'
+import type { ApiErrorCode } from '../../types.js'
+import type {
+  CollectionRecord,
+  CollectionsRepository,
+  WriteRefusal,
+} from './collections.repository.js'
+import { createCollectionsService, parseCollectionName } from './collections.service.js'
+
+const OWNER_ID = '6b044f9d56a44767c7079b02'
+const PHOTO_ID = '6b044f9d56a44767c7079a01'
+const DELETED_PHOTO_ID = '6b044f9d56a44767c7079a09'
+const NOEL: CollectionRecord = {
+  id: '6b044f9d56a44767c7079c01',
+  ownerId: OWNER_ID,
+  name: 'Noël',
+  photoIds: [PHOTO_ID, DELETED_PHOTO_ID],
+  createdAt: new Date('2026-11-25T10:00:00Z'),
+}
+const ETE: CollectionRecord = { ...NOEL, id: '6b044f9d56a44767c7079c02', name: 'Été', photoIds: [] }
+const REFUSALS: [WriteRefusal, ApiErrorCode][] = [
+  ['not_found', 'COLLECTION_NOT_FOUND'],
+  ['name_taken', 'COLLECTION_EXISTS'],
+]
+
+// Every dependency succeeds by default; each test breaks only the one it is about.
+function makeDeps() {
+  return {
+    repository: {
+      findAllOf: vi.fn<CollectionsRepository['findAllOf']>().mockResolvedValue([NOEL, ETE]),
+      // The deleted photo is no longer in the library.
+      findLivePhotoIds: vi
+        .fn<CollectionsRepository['findLivePhotoIds']>()
+        .mockResolvedValue([PHOTO_ID]),
+      create: vi.fn<CollectionsRepository['create']>().mockResolvedValue(ETE),
+      rename: vi.fn<CollectionsRepository['rename']>().mockResolvedValue(NOEL),
+      deleteOwned: vi.fn<CollectionsRepository['deleteOwned']>().mockResolvedValue(NOEL),
+    },
+    logger: {
+      info: vi.fn<Logger['info']>(),
+      warn: vi.fn<Logger['warn']>(),
+      error: vi.fn<Logger['error']>(),
+    },
+  }
+}
+
+describe('parseCollectionName', () => {
+  it('trims the name', () => {
+    expect(parseCollectionName('  Vacances  ')).toBe('Vacances')
+  })
+
+  it('accepts 50 characters', () => {
+    expect(parseCollectionName('a'.repeat(50))).toBe('a'.repeat(50))
+  })
+
+  it.each([
+    ['blank', '   '],
+    ['longer than 50 characters', 'a'.repeat(51)],
+    ['not text', 42],
+    ['missing', undefined],
+  ])('refuses a name %s', (_case, name) => {
+    expect(() => parseCollectionName(name)).toThrow(new AppError('COLLECTION_NAME_INVALID'))
+  })
+})
+
+describe('listCollections', () => {
+  it('sorts by name in French order', async () => {
+    const collections = await createCollectionsService(makeDeps()).listCollections(OWNER_ID)
+
+    expect(collections.map((collection) => collection.name)).toEqual(['Été', 'Noël'])
+  })
+
+  it('leaves out the photos deleted from the library, with one query for all', async () => {
+    const deps = makeDeps()
+
+    const collections = await createCollectionsService(deps).listCollections(OWNER_ID)
+
+    expect(collections[1]).toEqual({ id: NOEL.id, name: 'Noël', photoIds: [PHOTO_ID] })
+    expect(deps.repository.findLivePhotoIds).toHaveBeenCalledOnce()
+    expect(deps.repository.findLivePhotoIds).toHaveBeenCalledWith(OWNER_ID, NOEL.photoIds)
+  })
+})
+
+describe('createCollection', () => {
+  it('creates the collection under the trimmed name', async () => {
+    const deps = makeDeps()
+
+    const collection = await createCollectionsService(deps).createCollection({
+      ownerId: OWNER_ID,
+      name: ' Été ',
+    })
+
+    expect(deps.repository.create).toHaveBeenCalledWith(OWNER_ID, 'Été')
+    expect(collection).toEqual({ id: ETE.id, name: 'Été', photoIds: [] })
+  })
+
+  it('refuses a name the account already uses', async () => {
+    const deps = makeDeps()
+    deps.repository.create.mockResolvedValue('name_taken')
+
+    const creation = createCollectionsService(deps).createCollection({
+      ownerId: OWNER_ID,
+      name: 'Été',
+    })
+
+    await expect(creation).rejects.toThrow(new AppError('COLLECTION_EXISTS'))
+  })
+
+  it('logs the creation by identifiers only, never the name', async () => {
+    const deps = makeDeps()
+
+    await createCollectionsService(deps).createCollection({ ownerId: OWNER_ID, name: 'Été' })
+
+    expect(deps.logger.info).toHaveBeenCalledWith('collection.created', {
+      collectionId: ETE.id,
+      userId: OWNER_ID,
+    })
+  })
+})
+
+describe('renameCollection', () => {
+  it('renames the collection and keeps its photos still in the library', async () => {
+    const deps = makeDeps()
+
+    const collection = await createCollectionsService(deps).renameCollection({
+      id: NOEL.id,
+      ownerId: OWNER_ID,
+      name: 'Noël',
+    })
+
+    expect(deps.repository.rename).toHaveBeenCalledWith(NOEL.id, OWNER_ID, 'Noël')
+    expect(collection.photoIds).toEqual([PHOTO_ID])
+    expect(deps.logger.info).toHaveBeenCalledWith('collection.renamed', {
+      collectionId: NOEL.id,
+      userId: OWNER_ID,
+    })
+  })
+
+  it('answers a malformed id as not found, without a query', async () => {
+    const deps = makeDeps()
+
+    const rename = createCollectionsService(deps).renameCollection({
+      id: 'abc',
+      ownerId: OWNER_ID,
+      name: 'Noël',
+    })
+
+    await expect(rename).rejects.toThrow(new AppError('COLLECTION_NOT_FOUND'))
+    expect(deps.repository.rename).not.toHaveBeenCalled()
+  })
+
+  it.each(REFUSALS)('answers a %s refusal with %s', async (refusal, code) => {
+    const deps = makeDeps()
+    deps.repository.rename.mockResolvedValue(refusal)
+
+    const rename = createCollectionsService(deps).renameCollection({
+      id: NOEL.id,
+      ownerId: OWNER_ID,
+      name: 'Été',
+    })
+
+    await expect(rename).rejects.toThrow(new AppError(code))
+  })
+})
+
+describe('deleteCollection', () => {
+  it('deletes the collection and logs it by identifiers', async () => {
+    const deps = makeDeps()
+
+    await createCollectionsService(deps).deleteCollection({ id: NOEL.id, ownerId: OWNER_ID })
+
+    expect(deps.repository.deleteOwned).toHaveBeenCalledWith(NOEL.id, OWNER_ID)
+    expect(deps.logger.info).toHaveBeenCalledWith('collection.deleted', {
+      collectionId: NOEL.id,
+      userId: OWNER_ID,
+    })
+  })
+
+  it("answers an unknown or someone else's collection as not found", async () => {
+    const deps = makeDeps()
+    deps.repository.deleteOwned.mockResolvedValue(null)
+
+    const deletion = createCollectionsService(deps).deleteCollection({
+      id: NOEL.id,
+      ownerId: OWNER_ID,
+    })
+
+    await expect(deletion).rejects.toThrow(new AppError('COLLECTION_NOT_FOUND'))
+  })
+})
diff --git a/server/src/features/collections/collections.service.ts b/server/src/features/collections/collections.service.ts
new file mode 100644
index 0000000..d4a64b3
--- /dev/null
+++ b/server/src/features/collections/collections.service.ts
@@ -0,0 +1,142 @@
+import { AppError } from '../../errors/app-error.js'
+import type { Logger } from '../../lib/logger.js'
+import type { ApiErrorCode, Collection } from '../../types.js'
+import { OBJECT_ID_PATTERN } from '../photos/photos.input.js'
+import type {
+  CollectionRecord,
+  CollectionsRepository,
+  WriteRefusal,
+} from './collections.repository.js'
+
+// A menu entry, like a display name: a bound keeps the menus and the frame settings readable.
+export const MAX_COLLECTION_NAME_LENGTH = 50
+
+const ERROR_BY_REFUSAL: Record<WriteRefusal, ApiErrorCode> = {
+  not_found: 'COLLECTION_NOT_FOUND',
+  name_taken: 'COLLECTION_EXISTS',
+}
+
+// name comes straight from the JSON body: validated here, at the boundary.
+export type NewCollection = { ownerId: string; name: unknown }
+
+// id comes from the URL; ownerId is the logged-in account.
+export type CollectionAction = { id: string; ownerId: string }
+
+export type CollectionRename = CollectionAction & { name: unknown }
+
+export type CollectionsServiceDeps = {
+  repository: CollectionsRepository
+  logger: Logger
+}
+
+export type CollectionsService = {
+  listCollections: (ownerId: string) => Promise<Collection[]>
+  createCollection: (collection: NewCollection) => Promise<Collection>
+  renameCollection: (rename: CollectionRename) => Promise<Collection>
+  deleteCollection: (action: CollectionAction) => Promise<void>
+}
+
+// Trimmed, like a display name: « Noël » and « Noël  » are the same name.
+export function parseCollectionName(name: unknown): string {
+  if (typeof name !== 'string') {
+    throw new AppError('COLLECTION_NAME_INVALID')
+  }
+  const trimmedName = name.trim()
+  if (trimmedName.length === 0 || trimmedName.length > MAX_COLLECTION_NAME_LENGTH) {
+    throw new AppError('COLLECTION_NAME_INVALID')
+  }
+  return trimmedName
+}
+
+// Prisma fails on an id that is not an ObjectId: that would be a 500, not a 404.
+function parseCollectionId(id: string): string {
+  if (!OBJECT_ID_PATTERN.test(id)) {
+    throw new AppError('COLLECTION_NOT_FOUND')
+  }
+  return id
+}
+
+function orThrow(result: CollectionRecord | WriteRefusal): CollectionRecord {
+  if (typeof result === 'string') {
+    throw new AppError(ERROR_BY_REFUSAL[result])
+  }
+  return result
+}
+
+// A deleted photo's id stays in photoIds: the DTO keeps the photos still in the library.
+function toCollectionDto(
+  { id, name, photoIds }: CollectionRecord,
+  liveIds: Set<string>,
+): Collection {
+  return { id, name, photoIds: photoIds.filter((photoId) => liveIds.has(photoId)) }
+}
+
+// One query for every collection, however many there are.
+async function findLiveIds(
+  { repository }: CollectionsServiceDeps,
+  ownerId: string,
+  records: CollectionRecord[],
+): Promise<Set<string>> {
+  const allIds = records.flatMap((record) => record.photoIds)
+  return new Set(await repository.findLivePhotoIds(ownerId, allIds))
+}
+
+async function toCollection(
+  deps: CollectionsServiceDeps,
+  record: CollectionRecord,
+): Promise<Collection> {
+  return toCollectionDto(record, await findLiveIds(deps, record.ownerId, [record]))
+}
+
+// « Été » before « Noël »: French order, not the order of the character codes.
+async function listCollections(
+  deps: CollectionsServiceDeps,
+  ownerId: string,
+): Promise<Collection[]> {
+  const records = await deps.repository.findAllOf(ownerId)
+  const liveIds = await findLiveIds(deps, ownerId, records)
+  const collections = records.map((record) => toCollectionDto(record, liveIds))
+  return collections.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
+}
+
+// Ids only in the logs: a collection's name is the owner's words.
+async function createCollection(
+  deps: CollectionsServiceDeps,
+  { ownerId, name }: NewCollection,
+): Promise<Collection> {
+  const record = orThrow(await deps.repository.create(ownerId, parseCollectionName(name)))
+  deps.logger.info('collection.created', { collectionId: record.id, userId: ownerId })
+  return toCollection(deps, record)
+}
+
+async function renameCollection(
+  deps: CollectionsServiceDeps,
+  { id, ownerId, name }: CollectionRename,
+): Promise<Collection> {
+  const collectionId = parseCollectionId(id)
+  const newName = parseCollectionName(name)
+  const record = orThrow(await deps.repository.rename(collectionId, ownerId, newName))
+  deps.logger.info('collection.renamed', { collectionId, userId: ownerId })
+  return toCollection(deps, record)
+}
+
+// The photos stay in the library: only the list of ids goes.
+async function deleteCollection(
+  { repository, logger }: CollectionsServiceDeps,
+  { id, ownerId }: CollectionAction,
+): Promise<void> {
+  const deleted = await repository.deleteOwned(parseCollectionId(id), ownerId)
+  if (!deleted) {
+    throw new AppError('COLLECTION_NOT_FOUND')
+  }
+  logger.info('collection.deleted', { collectionId: deleted.id, userId: ownerId })
+}
+
+export function createCollectionsService(deps: CollectionsServiceDeps): CollectionsService {
+  return {
+    listCollections: (ownerId) => listCollections(deps, ownerId),
+    createCollection: (collection) => createCollection(deps, collection),
+    renameCollection: (rename) => renameCollection(deps, rename),
+    deleteCollection: (action) => deleteCollection(deps, action),
+  }
+}
diff --git a/server/src/types.ts b/server/src/types.ts
index f28b6a8..73eda96 100644
--- a/server/src/types.ts
+++ b/server/src/types.ts
@@ -12,6 +12,7 @@ export type ApiErrorCode =
   | 'PASSWORD_INCORRECT'
   | 'MESSAGE_INVALID'
   | 'SELF_FRIEND'
+  | 'COLLECTION_NAME_INVALID'
   | 'UNAUTHENTICATED'
   | 'INVALID_CREDENTIALS'
   | 'FORBIDDEN'
@@ -21,10 +22,12 @@ export type ApiErrorCode =
   | 'INVITATION_NOT_FOUND'
   | 'USER_NOT_FOUND'
   | 'FRIENDSHIP_NOT_FOUND'
+  | 'COLLECTION_NOT_FOUND'
   | 'PHOTO_DUPLICATE'
   | 'ACCOUNT_EXISTS'
   | 'ALREADY_FRIENDS'
   | 'FRIEND_REQUEST_EXISTS'
+  | 'COLLECTION_EXISTS'
   | 'INVITATION_EXPIRED'
   | 'INVITATION_USED'
   | 'PHOTO_TOO_LARGE'
@@ -105,6 +108,16 @@ export type PhotoPage = {
 // Newest first, all at once: a handful of photos waiting, not a library to page through.
 export type UnopenedPhotos = { photos: Photo[] }
 
+// photoIds: the owner's photos, in the order they were added; a deleted photo is not listed.
+export type Collection = {
+  id: string
+  name: string
+  photoIds: string[]
+}
+
+// Sorted by name: the order of every menu that lists them.
+export type CollectionList = { collections: Collection[] }
+
 // photo:new is a photo one added oneself, photo:received one a friend sent, still unopened;
 // photo:opened is a received photo that just joined the library.
 export type ServerToClientEvents = {
@@ -112,6 +125,8 @@ export type ServerToClientEvents = {
   'photo:received': (photo: Photo) => void
   'photo:opened': (photo: Photo) => void
   'photo:deleted': (id: string) => void
+  // No payload: each page reloads the list, the server stays the only source.
+  'collections:changed': () => void
 }
 
 export type ClientToServerEvents = Record<string, never>
~~~~

- [ ] **Step 4: Unit gates**

`pnpm check && pnpm typecheck && pnpm test` → `Test Files  22 passed (22)`, `Tests  259 passed (259)`.

- [ ] **Step 5: Controller checkpoint C1, then Bruno**

Ask the controller for C1 (`pnpm db:push`, no seed) and wait for it. Start the test API on 3002, run the Bruno gate command twice: 145 requests, 316 assertions, all passed. Stop the test API.

- [ ] **Step 6: Commit**

`pnpm build` green. Subject: `feat(server): create, rename and delete collections`.

### Task 2: Add and remove photos in a collection (PR A, `feat/collections-server`)

**Files:**
- Create: `collections.service.photos.test.ts`, `server/bruno/collections/photos/`
- Modify: `collections.{repository,service,controller,routes}.ts`, `collections.service.test.ts` (four new fakes), `photos.repository.ts` (`export const IS_OPENED`), `server/bruno/collections/{folder.bru,delete/folder.bru}` (delete moves to seq 5); `photos/11-edge-retrait-autre-compte.bru` (remove from a foreign collection → 404), `ARCHITECTURE.md`

**Interfaces:**
- Repository gains `findOwned(id, ownerId)`, `hasOpenedPhoto(ownerId, photoId)`, `addPhoto(id, ownerId, photoId)` (`null` when the collection is missing or already holds the photo), `setPhotoIds(id, ownerId, readIds, photoIds)` (writes only if the list still equals `readIds`; `null` when the collection is gone or the list changed).
- Service gains `addPhoto({ id, ownerId, photoId })` and `removePhoto(…)` (`PhotoMembership`), both answering the `Collection` DTO; both lowercase the photo id after `parsePhotoId` (MongoDB answers ObjectIds in lowercase, the list compare must match); `removePhoto` re-reads and retries once when the conditional write misses, then throws a plain `Error` (500).
- Routes: `PUT /:id/photos/:photoId`, `DELETE /:id/photos/:photoId`, both `200 Collection`.

- [ ] **Step 1: Tests, code, Bruno, docs.** The whole commit:

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 6f88c3a..45340b9 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -79,34 +79,36 @@ Le routage est fait côté navigateur (`react-router`). En production (J2), le s
 
 ## API
 
-| Route                                   | Réponse                                                                                                                                                                                                                                                        |
-| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| `GET /api/health`                       | `200 { "status": "ok" }` (servira de healthcheck Docker en J2)                                                                                                                                                                                                 |
-| `POST /api/auth/login`                  | JSON `{ email, password }` → `200 { user }` + cookie `ff_session`                                                                                                                                                                                              |
-| `POST /api/auth/logout`                 | `204` ; supprime la session et efface le cookie (répond `204` aussi sans session)                                                                                                                                                                              |
-| `GET /api/auth/me`                      | `200 { user }`, l'utilisateur de la session                                                                                                                                                                                                                    |
-| `POST /api/invitations`                 | JSON `{ email }` → `201 { invitation, token }` : réservé à l'admin ; le jeton brut n'est envoyé qu'une fois, le client en fait le lien                                                                                                                         |
-| `GET /api/invitations`                  | `200 { invitations }` : réservé à l'admin ; toutes les invitations, la plus récente en premier                                                                                                                                                                 |
-| `POST /api/invitations/accept`          | JSON `{ token, displayName, password }` → `201 { user }` + cookie `ff_session` : public ; crée un compte `member` à l'e-mail de l'invitation et le connecte                                                                                                    |
-| `GET /api/friendships`                  | `200 { friends, incoming, outgoing }` : amis, demandes reçues et demandes envoyées du compte connecté, la plus récente en premier                                                                                                                              |
-| `POST /api/friendships`                 | JSON `{ email }` → `201 { friendship }` : demande d'ami à l'e-mail exact d'un compte existant ; `200 { friendship }` si sa demande m'attendait (acceptée)                                                                                                      |
-| `POST /api/friendships/:id/accept`      | `200 { friendship }` : le destinataire d'une demande en attente l'accepte ; l'amitié devient mutuelle                                                                                                                                                          |
-| `DELETE /api/friendships/:id`           | `204` sans corps, pour l'un ou l'autre côté : refuse une demande reçue, annule une demande envoyée ou retire un ami                                                                                                                                            |
-| `PATCH /api/account`                    | JSON `{ displayName }` → `200 { user }` : change le nom affiché du compte connecté ; l'e-mail ne se modifie pas                                                                                                                                                |
-| `PUT /api/account/password`             | JSON `{ currentPassword, newPassword }` → `204` sans corps : vérifie le mot de passe actuel, enregistre le nouveau et ferme toutes les autres sessions du compte (celle de la requête reste ouverte)                                                           |
-| `PUT /api/account/avatar`               | `multipart/form-data` avec `avatar` (fichier) → `200 { user }` : carré JPEG de 256 px recadré au centre, envoyé sur Cloudinary (`familyframe/avatars`) ; l'ancienne image est détruite après l'enregistrement ; mêmes limites que `POST /api/photos`           |
-| `DELETE /api/account/avatar`            | `200 { user }` avec `avatarUrl` à `null` : efface la photo de profil, puis détruit l'image ; répond de même sans photo                                                                                                                                         |
-| `GET /api/collections`                  | `200 { collections }` : les collections du compte connecté, triées par nom comme en français (« Été » avant « Noël »)                                                                                                                                          |
-| `POST /api/collections`                 | JSON `{ name }` → `201 Collection`, sans photo                                                                                                                                                                                                                 |
-| `PATCH /api/collections/:id`            | JSON `{ name }` → `200 Collection` : renomme une collection du compte connecté ; garder son propre nom n'est pas un doublon                                                                                                                                    |
-| `DELETE /api/collections/:id`           | `204` sans corps : supprime la collection, jamais ses photos                                                                                                                                                                                                   |
-| `GET /api/photos?cursor=<id>&limit=<n>` | `200 { photos, nextCursor }` : photos du compte connecté, la plus récente en premier, sans les photos reçues pas encore ouvertes ; `limit` de 1 à 100 (30 par défaut) ; `nextCursor` est l'id à passer en `cursor` pour la page suivante, `null` à la dernière |
-| `POST /api/photos`                      | `multipart/form-data` avec `photo` (fichier) → `201 Photo`                                                                                                                                                                                                     |
-| `POST /api/photos/:id/share`            | JSON `{ friendId, message? }` → `201 Photo` : envoie une photo de sa bibliothèque à un ami accepté ; l'ami reçoit une nouvelle photo qui pointe vers la même image Cloudinary, et la réponse est cette photo telle qu'il la voit                               |
-| `POST /api/photos/share`                | `multipart/form-data` avec `photo` (fichier), `friendId` et `message` facultatif → `201 Photo` : envoie un fichier de l'appareil à un ami accepté ; il n'entre que dans la bibliothèque de l'ami                                                               |
-| `GET /api/photos/unopened`              | `200 { photos }` : les photos reçues pas encore ouvertes, la plus récente en premier, toutes d'un coup                                                                                                                                                         |
-| `POST /api/photos/:id/open`             | sans corps → `200 Photo` : ouvre une photo reçue, qui rejoint `GET /api/photos` ; idempotent                                                                                                                                                                   |
-| `DELETE /api/photos/:id`                | `204` sans corps, pour une photo du compte connecté ; supprime l'enregistrement, puis l'image Cloudinary (cache CDN compris) si plus aucune photo n'y renvoie                                                                                                  |
+| Route                                         | Réponse                                                                                                                                                                                                                                                        |
+| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| `GET /api/health`                             | `200 { "status": "ok" }` (servira de healthcheck Docker en J2)                                                                                                                                                                                                 |
+| `POST /api/auth/login`                        | JSON `{ email, password }` → `200 { user }` + cookie `ff_session`                                                                                                                                                                                              |
+| `POST /api/auth/logout`                       | `204` ; supprime la session et efface le cookie (répond `204` aussi sans session)                                                                                                                                                                              |
+| `GET /api/auth/me`                            | `200 { user }`, l'utilisateur de la session                                                                                                                                                                                                                    |
+| `POST /api/invitations`                       | JSON `{ email }` → `201 { invitation, token }` : réservé à l'admin ; le jeton brut n'est envoyé qu'une fois, le client en fait le lien                                                                                                                         |
+| `GET /api/invitations`                        | `200 { invitations }` : réservé à l'admin ; toutes les invitations, la plus récente en premier                                                                                                                                                                 |
+| `POST /api/invitations/accept`                | JSON `{ token, displayName, password }` → `201 { user }` + cookie `ff_session` : public ; crée un compte `member` à l'e-mail de l'invitation et le connecte                                                                                                    |
+| `GET /api/friendships`                        | `200 { friends, incoming, outgoing }` : amis, demandes reçues et demandes envoyées du compte connecté, la plus récente en premier                                                                                                                              |
+| `POST /api/friendships`                       | JSON `{ email }` → `201 { friendship }` : demande d'ami à l'e-mail exact d'un compte existant ; `200 { friendship }` si sa demande m'attendait (acceptée)                                                                                                      |
+| `POST /api/friendships/:id/accept`            | `200 { friendship }` : le destinataire d'une demande en attente l'accepte ; l'amitié devient mutuelle                                                                                                                                                          |
+| `DELETE /api/friendships/:id`                 | `204` sans corps, pour l'un ou l'autre côté : refuse une demande reçue, annule une demande envoyée ou retire un ami                                                                                                                                            |
+| `PATCH /api/account`                          | JSON `{ displayName }` → `200 { user }` : change le nom affiché du compte connecté ; l'e-mail ne se modifie pas                                                                                                                                                |
+| `PUT /api/account/password`                   | JSON `{ currentPassword, newPassword }` → `204` sans corps : vérifie le mot de passe actuel, enregistre le nouveau et ferme toutes les autres sessions du compte (celle de la requête reste ouverte)                                                           |
+| `PUT /api/account/avatar`                     | `multipart/form-data` avec `avatar` (fichier) → `200 { user }` : carré JPEG de 256 px recadré au centre, envoyé sur Cloudinary (`familyframe/avatars`) ; l'ancienne image est détruite après l'enregistrement ; mêmes limites que `POST /api/photos`           |
+| `DELETE /api/account/avatar`                  | `200 { user }` avec `avatarUrl` à `null` : efface la photo de profil, puis détruit l'image ; répond de même sans photo                                                                                                                                         |
+| `GET /api/collections`                        | `200 { collections }` : les collections du compte connecté, triées par nom comme en français (« Été » avant « Noël »)                                                                                                                                          |
+| `POST /api/collections`                       | JSON `{ name }` → `201 Collection`, sans photo                                                                                                                                                                                                                 |
+| `PATCH /api/collections/:id`                  | JSON `{ name }` → `200 Collection` : renomme une collection du compte connecté ; garder son propre nom n'est pas un doublon                                                                                                                                    |
+| `DELETE /api/collections/:id`                 | `204` sans corps : supprime la collection, jamais ses photos                                                                                                                                                                                                   |
+| `PUT /api/collections/:id/photos/:photoId`    | sans corps → `200 Collection` : ajoute à la fin une photo ouverte de la bibliothèque ; idempotent                                                                                                                                                              |
+| `DELETE /api/collections/:id/photos/:photoId` | `200 Collection` : retire la photo de la collection, jamais de la bibliothèque ; idempotent                                                                                                                                                                    |
+| `GET /api/photos?cursor=<id>&limit=<n>`       | `200 { photos, nextCursor }` : photos du compte connecté, la plus récente en premier, sans les photos reçues pas encore ouvertes ; `limit` de 1 à 100 (30 par défaut) ; `nextCursor` est l'id à passer en `cursor` pour la page suivante, `null` à la dernière |
+| `POST /api/photos`                            | `multipart/form-data` avec `photo` (fichier) → `201 Photo`                                                                                                                                                                                                     |
+| `POST /api/photos/:id/share`                  | JSON `{ friendId, message? }` → `201 Photo` : envoie une photo de sa bibliothèque à un ami accepté ; l'ami reçoit une nouvelle photo qui pointe vers la même image Cloudinary, et la réponse est cette photo telle qu'il la voit                               |
+| `POST /api/photos/share`                      | `multipart/form-data` avec `photo` (fichier), `friendId` et `message` facultatif → `201 Photo` : envoie un fichier de l'appareil à un ami accepté ; il n'entre que dans la bibliothèque de l'ami                                                               |
+| `GET /api/photos/unopened`                    | `200 { photos }` : les photos reçues pas encore ouvertes, la plus récente en premier, toutes d'un coup                                                                                                                                                         |
+| `POST /api/photos/:id/open`                   | sans corps → `200 Photo` : ouvre une photo reçue, qui rejoint `GET /api/photos` ; idempotent                                                                                                                                                                   |
+| `DELETE /api/photos/:id`                      | `204` sans corps, pour une photo du compte connecté ; supprime l'enregistrement, puis l'image Cloudinary (cache CDN compris) si plus aucune photo n'y renvoie                                                                                                  |
 
 Toutes les routes `/api/photos`, `/api/friendships`, `/api/account`, `/api/collections`, `GET /api/auth/me` et les routes admin de `/api/invitations` demandent une session ; sans elle : `401 UNAUTHENTICATED`. Les routes admin répondent `403 FORBIDDEN` à un membre. Un `user` vaut `{ id, email, displayName, role, avatarUrl }` (`role` : `member` ou `admin` ; `avatarUrl` : l'URL signée de sa photo de profil, `null` tant qu'il n'en a pas choisi), jamais le hash du mot de passe ni l'identifiant Cloudinary de la photo.
 
@@ -116,7 +118,7 @@ Une `Friendship` vaut `{ id, user, createdAt }` (`createdAt` en ISO 8601) : `id`
 
 Une `Photo` vaut `{ id, url, thumbnailUrl, createdAt, senderName, message }` (`createdAt` en ISO 8601 ; `senderName` est le nom d'affichage de l'ami qui l'a envoyée, `null` pour une photo que le compte a ajoutée lui-même ; `message` est le mot que cet ami y a joint, `null` sans message). Un message est du texte, espaces autour retirés, de 200 caractères au plus (`MAX_MESSAGE_LENGTH`, comptés après le retrait) ; vide, il compte comme absent. Les logs disent seulement s'il y en avait un (`hasMessage`), jamais son texte. Chaque photo appartient à un compte (`ownerId`, côté serveur seulement) : celui qui l'a ajoutée, ou l'ami qui l'a reçue. La liste, la suppression et les événements ne concernent que les photos du compte connecté. Une photo envoyée à un ami est une nouvelle photo **de l'ami** (`senderId` = l'expéditeur) : la bibliothèque de l'expéditeur ne change pas, et chacun supprime ses photos de son côté (la photo reçue reste quand l'expéditeur supprime l'original ou retire l'amitié). L'identifiant Cloudinary reste côté serveur : le client reçoit des URL prêtes à l'emploi.
 
-Une `Collection` vaut `{ id, name, photoIds }`, jamais son propriétaire : `photoIds` liste les photos du compte, dans l'ordre où elles y ont été ajoutées. Un nom est du texte, espaces autour retirés, de 1 à 50 caractères (`MAX_COLLECTION_NAME_LENGTH`, comme un nom d'affichage) ; deux collections d'un même compte ne portent pas le même nom (index unique `(ownerId, name)`, comparaison exacte après le trim : « noël » et « Noël » sont deux noms). Une collection d'un autre compte répond comme une inconnue.
+Une `Collection` vaut `{ id, name, photoIds }`, jamais son propriétaire : `photoIds` liste les photos du compte, dans l'ordre où elles y ont été ajoutées. Un nom est du texte, espaces autour retirés, de 1 à 50 caractères (`MAX_COLLECTION_NAME_LENGTH`, comme un nom d'affichage) ; deux collections d'un même compte ne portent pas le même nom (index unique `(ownerId, name)`, comparaison exacte après le trim : « noël » et « Noël » sont deux noms). Une collection d'un autre compte répond comme une inconnue. Seule une photo ouverte de la bibliothèque du compte entre dans une collection : inconnue, d'un autre compte ou reçue pas encore ouverte, elle répond `404 PHOTO_NOT_FOUND`, comme `GET /api/photos` ne la montre pas. Ajouter une photo déjà là, ou retirer une photo absente, répond la collection telle quelle.
 
 La liste est paginée par curseur (_keyset_) sur l'id : un ObjectId commence par sa date de création, trier par id revient donc à trier par date, et `id < cursor` est une seule requête sur l'index `(ownerId, id)`. Une photo ajoutée ou supprimée entre deux pages ne décale rien, contrairement à une pagination par numéro de page.
 
@@ -140,7 +142,7 @@ En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code e
 | compte connecté sans le rôle demandé (membre sur une route admin)                                                                         | 403    | `FORBIDDEN`               |
 | envoi d'une photo à un compte qui n'est pas un ami accepté (soi-même, demande en attente, compte inconnu, `friendId` absent ou mal formé) | 403    | `NOT_FRIENDS`             |
 | route inconnue                                                                                                                            | 404    | `ROUTE_NOT_FOUND`         |
-| photo inconnue, photo d'un autre compte, ou id qui n'est pas un ObjectId                                                                  | 404    | `PHOTO_NOT_FOUND`         |
+| photo inconnue, photo d'un autre compte, reçue pas encore ouverte (ajout à une collection), ou id qui n'est pas un ObjectId               | 404    | `PHOTO_NOT_FOUND`         |
 | jeton d'invitation inconnu, remplacé ou mal formé                                                                                         | 404    | `INVITATION_NOT_FOUND`    |
 | demande d'ami à un e-mail sans compte                                                                                                     | 404    | `USER_NOT_FOUND`          |
 | amitié ou demande inconnue, d'autres comptes, déjà supprimée, déjà acceptée (acceptation), ou id qui n'est pas un ObjectId                | 404    | `FRIENDSHIP_NOT_FOUND`    |
@@ -243,6 +245,7 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 | `friendship.requested` / `friendship.accepted` / `friendship.deleted` | info                          | service amis, avec `friendshipId` et `userId` (qui agit) ; `friendship.deleted` dit aussi ce qui s'est passé (`reason` : `removed`, `cancelled`, `refused`)                                                                     |
 | `friendship.request_failed`                                           | warn                          | service amis, avec `reason` (`user_not_found`, `self`, `already_friends`, `request_exists`) et `userId` ; jamais l'e-mail                                                                                                       |
 | `collection.created` / `collection.renamed` / `collection.deleted`    | info                          | service collections, avec `collectionId` et `userId` (le propriétaire) ; jamais le nom                                                                                                                                          |
+| `collection.photo_added` / `collection.photo_removed`                 | info                          | service collections, avec `collectionId`, `photoId` et `userId` ; rien quand la collection ne change pas                                                                                                                        |
 | `account.renamed`                                                     | info                          | service compte, avec `userId` ; jamais le nom                                                                                                                                                                                   |
 | `account.password_changed`                                            | info                          | service compte, avec `userId` et `closedSessionCount` (autres sessions fermées) ; jamais un mot de passe                                                                                                                        |
 | `account.password_change_failed`                                      | warn                          | service compte : mot de passe actuel faux, avec `reason` (`incorrect_password`) et `userId`                                                                                                                                     |
@@ -279,7 +282,7 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 - **MongoDB Atlas** via **Prisma 6**. Prisma 7+ ne supporte pas encore MongoDB : la version est volontairement figée.
 - Le client Prisma est généré à l'installation (`postinstall`) ; le schéma est poussé avec `pnpm --filter server db:push` (pas de migrations avec MongoDB).
 - Collections `User`, `Session`, `Photo`, `Invitation`, `Friendship` et `Collection`. `User.avatarCloudinaryId`, facultatif, est l'identifiant Cloudinary de la photo de profil (absent des anciens comptes, que Prisma lit comme `null`). Index uniques sur `User.email`, `Session.tokenHash`, `Invitation.tokenHash`, `Friendship.pairKey` et `Collection (ownerId, name)` ; le rôle est un `enum Role` Prisma et l'état d'une amitié un `enum FriendshipStatus` (`pending`, `accepted`), que Prisma génère en unions de chaînes. `Photo.ownerId` relie chaque photo à son compte ; index unique `(ownerId, sha256)` (un même fichier n'entre qu'une fois dans une bibliothèque), index `(ownerId, id)` pour la liste d'un compte, et index simple sur `cloudinaryId` (pas unique : une photo envoyée depuis la bibliothèque pointe vers la même image, détruite avec la dernière photo qui y renvoie). `Photo.senderId`, facultatif, relie une photo reçue au compte qui l'a envoyée (`null` pour une photo ajoutée par son propriétaire) : `User` a donc deux relations vers `Photo`, que Prisma exige de nommer (`PhotoOwner` pour `ownerId`, `PhotoSender` pour `senderId`). Le nom de l'expéditeur est lu par une jointure (`include` de `sender`, `displayName` seul), jamais recopié dans `Photo`. `Photo.message`, facultatif, est le mot de l'expéditeur (absent sans message, et sur les photos d'avant l'étape 9, que Prisma lit comme `null`). `Invitation.invitedById` relie une invitation à l'admin qui l'a créée ; index simple sur `Invitation.email` (pas unique : une invitation utilisée reste à côté d'une plus récente pour la même adresse). `pnpm db:seed` (`server/prisma/seed.ts`) vide la base (sessions, photos, invitations, amitiés et collections avant les comptes, car Prisma émule les relations sur MongoDB) et crée les deux comptes de test du README.
-- **Collections** : une `Collection` porte `ownerId`, `name` et `photoIds`, la liste des photos (`String[] @db.ObjectId`) ; la photo, elle, ne sait pas dans quelles collections elle est, donc ni le DTO `Photo` ni ses événements ne changent. `photoIds` est écrit `[]` dès la création : MongoDB ne trouve « ne contient pas » que sur un champ qui existe. Prisma ne sait pas retirer un élément d'une liste (pas de `$pull`) : l'id d'une photo supprimée reste dans `photoIds`, et chaque lecture ne garde que les ids encore dans la bibliothèque (`findLivePhotoIds`, une requête pour toutes les collections). L'index unique `(ownerId, name)` est né avec la collection : aucune donnée existante à remettre en ordre avant `pnpm db:push`.
+- **Collections** : une `Collection` porte `ownerId`, `name` et `photoIds`, la liste des photos (`String[] @db.ObjectId`) ; la photo, elle, ne sait pas dans quelles collections elle est, donc ni le DTO `Photo` ni ses événements ne changent. `photoIds` est écrit `[]` dès la création : MongoDB ne trouve « ne contient pas » que sur un champ qui existe. Prisma ne sait pas retirer un élément d'une liste (pas de `$pull`) : l'id d'une photo supprimée reste dans `photoIds`, et chaque lecture ne garde que les ids encore dans la bibliothèque (`findLivePhotoIds`, une requête pour toutes les collections). Ajouter est une seule écriture filtrée sur `{ id, ownerId, NOT: { photoIds: { has: photoId } } }` avec `push` : deux ajouts simultanés de la même photo n'en gardent qu'un. Retirer relit la liste et la réécrit sans la photo (`set`), seulement si elle est encore celle lue (`photoIds: { equals }` dans le filtre) : un ajout fait entre-temps depuis un autre appareil n'est pas écrasé. Si la liste a changé, le service relit et réessaie une fois ; un second échec répond 500 plutôt que de perdre une écriture. L'index unique `(ownerId, name)` est né avec la collection : aucune donnée existante à remettre en ordre avant `pnpm db:push`.
 - **Amitiés** : un seul document `Friendship` par paire de comptes porte la demande, puis l'amitié (`requesterId`, `addresseeId`, `status`). `pairKey` vaut les deux ids triés et joints par `:`, sous un index unique : MongoDB ne sait pas indexer « cette paire, dans un sens ou dans l'autre », et la clé triée fait refuser par l'index lui-même A→B à côté de B→A, demandes simultanées comprises. Seul le repository calcule `pairKey`. Index simples sur `requesterId` et `addresseeId` pour la liste d'un compte. Une demande refusée ou annulée, comme une amitié retirée, est supprimée : pas de troisième état.
 - Quand `Photo` gagne un champ obligatoire ou un index unique, `pnpm db:seed` passe **avant** `pnpm db:push` : MongoDB compte un champ absent comme `null`, et d'anciennes photos sans ce champ empêcheraient l'index unique de se créer.
 - `Photo.isOpened`, facultatif : `true` pour une photo ajoutée par son propriétaire, `false` pour une photo reçue jusqu'à son ouverture. Les photos d'avant l'étape 9 n'ont pas le champ et comptent comme ouvertes : aucune migration, `pnpm db:push` sans seed (pas de nouvel index). La bibliothèque filtre donc avec `OR: [{ isOpened: true }, { isOpened: { isSet: false } }]` : `{ isOpened: { not: false } }` ne renverrait pas les photos sans le champ (vérifié sur MongoDB 7 avec Prisma 6.19). Les photos en attente se lisent avec un simple `isOpened: false`, servi par l'index `(ownerId, id)`.
@@ -291,7 +294,7 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 - **Biome** : lint, formatage et tri des imports (remplace ESLint + Prettier). Dans `server/src`, `noConsole` interdit `console` : on passe par le logger.
 - **lefthook** : `biome check` au pre-commit, **commitlint** au commit-msg.
 - **Vitest** : tests unitaires du serveur, colocalisés (`*.test.ts`), lancés par `pnpm test` sans API ; exclus du build par `server/tsconfig.build.json`.
-- **Bruno** (`server/bruno/`) : requêtes de l'API avec assertions, un dossier par endpoint, des fichiers `NN-nominal-…` / `NN-edge-…`. Lancées par `pnpm test:bruno` contre l'API démarrée et la base remplie par le seed (CLI via `pnpm dlx`, version figée, pas de dépendance). Le dossier `auth/` passe en premier (`seq: 1`) et range le cookie de session dans une variable, envoyée à toutes les requêtes par un en-tête de collection ; le CLI tourne avec `--disable-cookies` pour que sa boîte à cookies ne renvoie pas la session aux requêtes « sans cookie ». Un second compte (l'admin, `auth/login/05`) range son cookie dans `adminCookie` : les requêtes qui vérifient qu'un compte ne touche pas aux photos d'un autre l'envoient à la place de celui du membre. Le dossier `invitations/` passe juste après (`seq: 2`) : l'admin y crée une invitation pour une adresse neuve à chaque lancement (`invite-<horodatage>@familyframe.test`), donc rien à remettre à zéro entre deux lancements. Le dossier `friendships/` suit (`seq: 3`) : le membre y envoie une demande à l'admin, et `invitations/accept/05` range le cookie du compte créé dans `inviteeCookie`, un tiers qui ne doit toucher à aucune amitié. Le dossier finit sans amitié entre le membre et l'admin ; `create/01` efface d'abord celle d'un lancement interrompu. Dans `photos/`, le dossier `share/` (`seq: 3`, avant `delete/`) lit les ids des deux comptes (`memberId`, `adminId`), rend le membre et l'admin amis, le membre envoie à l'admin une photo de sa bibliothèque et un fichier, puis l'amitié est supprimée ; `delete/` supprime ensuite les photos reçues par l'admin. Le dossier `collections/` (`seq: 5`, avant `photos/`) passe tout entier par le compte jetable (`inviteeCookie`), jamais par le membre dont les collections sont celles de la base partagée ; le membre y sert d'« autre compte ». Il crée deux collections, les renomme, puis les supprime : le compte finit sans collection.
+- **Bruno** (`server/bruno/`) : requêtes de l'API avec assertions, un dossier par endpoint, des fichiers `NN-nominal-…` / `NN-edge-…`. Lancées par `pnpm test:bruno` contre l'API démarrée et la base remplie par le seed (CLI via `pnpm dlx`, version figée, pas de dépendance). Le dossier `auth/` passe en premier (`seq: 1`) et range le cookie de session dans une variable, envoyée à toutes les requêtes par un en-tête de collection ; le CLI tourne avec `--disable-cookies` pour que sa boîte à cookies ne renvoie pas la session aux requêtes « sans cookie ». Un second compte (l'admin, `auth/login/05`) range son cookie dans `adminCookie` : les requêtes qui vérifient qu'un compte ne touche pas aux photos d'un autre l'envoient à la place de celui du membre. Le dossier `invitations/` passe juste après (`seq: 2`) : l'admin y crée une invitation pour une adresse neuve à chaque lancement (`invite-<horodatage>@familyframe.test`), donc rien à remettre à zéro entre deux lancements. Le dossier `friendships/` suit (`seq: 3`) : le membre y envoie une demande à l'admin, et `invitations/accept/05` range le cookie du compte créé dans `inviteeCookie`, un tiers qui ne doit toucher à aucune amitié. Le dossier finit sans amitié entre le membre et l'admin ; `create/01` efface d'abord celle d'un lancement interrompu. Dans `photos/`, le dossier `share/` (`seq: 3`, avant `delete/`) lit les ids des deux comptes (`memberId`, `adminId`), rend le membre et l'admin amis, le membre envoie à l'admin une photo de sa bibliothèque et un fichier, puis l'amitié est supprimée ; `delete/` supprime ensuite les photos reçues par l'admin. Le dossier `collections/` (`seq: 5`, avant `photos/`) passe tout entier par le compte jetable (`inviteeCookie`), jamais par le membre dont les collections sont celles de la base partagée ; le membre y sert d'« autre compte ». Il crée deux collections et les renomme ; `photos/` (`seq: 4`) ajoute au compte jetable une photo et en reçoit une du membre (amis le temps de l'envoi), range et retire la photo, puis la supprime de la bibliothèque ; `delete/` (`seq: 5`) supprime les collections : le compte finit sans collection ni photo.
 - **Hooks Claude Code** (`.claude/hooks/`) : garde-fous pour l'agent IA, testés avec `node:test`.
 
 ## Conteneurisation
diff --git a/server/bruno/collections/delete/folder.bru b/server/bruno/collections/delete/folder.bru
index a394492..597b1ae 100644
--- a/server/bruno/collections/delete/folder.bru
+++ b/server/bruno/collections/delete/folder.bru
@@ -1,6 +1,6 @@
 meta {
   name: delete
-  seq: 4
+  seq: 5
 }
 
 docs {
diff --git a/server/bruno/collections/folder.bru b/server/bruno/collections/folder.bru
index 28bf8d6..94167c2 100644
--- a/server/bruno/collections/folder.bru
+++ b/server/bruno/collections/folder.bru
@@ -16,12 +16,15 @@ docs {
   `COLLECTION_NAME_INVALID` ; un nom que le compte utilise déjà, 409
   `COLLECTION_EXISTS`. La collection d'un autre compte, inconnue ou un id mal
   formé : 404 `COLLECTION_NOT_FOUND`. La liste est triée par nom, comme en
-  français (« Été » avant « Noël »).
+  français (« Été » avant « Noël »). Une photo entre dans une collection par
+  `PUT /api/collections/:id/photos/:photoId` et en sort par `DELETE` sur le
+  même chemin ; une photo supprimée de la bibliothèque disparaît de ses
+  collections.
 
   Toutes les requêtes passent par le compte jetable créé par
   `invitations/accept/05` (cookie `inviteeCookie`), jamais par le membre,
   dont les collections sont celles de la base de dev partagée : un compte
   neuf à chaque lancement, donc pas de reste d'un lancement interrompu. Le
   membre (cookie par défaut) sert d'« autre compte ». Le dossier finit sans
-  aucune collection. Ordre : `create`, `list`, `rename`, `delete`.
+  aucune collection. Ordre : `create`, `list`, `rename`, `photos`, `delete`.
 }
diff --git a/server/bruno/collections/photos/01-nominal-prepa-photo.bru b/server/bruno/collections/photos/01-nominal-prepa-photo.bru
new file mode 100644
index 0000000..b764609
--- /dev/null
+++ b/server/bruno/collections/photos/01-nominal-prepa-photo.bru
@@ -0,0 +1,37 @@
+meta {
+  name: Nominal - photo dans la bibliothèque du compte jetable
+  type: http
+  seq: 1
+}
+
+post {
+  url: {{baseUrl}}/api/photos
+  body: multipartForm
+  auth: none
+}
+
+body:multipart-form {
+  photo: @file(fixtures/photo.jpg) @contentType(image/jpeg)
+}
+
+script:pre-request {
+  if (!bru.getVar('inviteeCookie')) {
+    throw new Error('inviteeCookie absent : lancer toute la collection, invitations/accept/05 doit passer')
+  }
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 201
+  res.body.id: isString
+}
+
+script:post-response {
+  bru.setVar('collectionPhotoId', res.body.id)
+}
+
+docs {
+  NOMINAL → 201. Préparation : le compte jetable n'a encore aucune photo.
+  Celle-ci entre dans sa bibliothèque ; son id va dans
+  `collectionPhotoId`, et `14` la supprime.
+}
diff --git a/server/bruno/collections/photos/02-nominal-ajout.bru b/server/bruno/collections/photos/02-nominal-ajout.bru
new file mode 100644
index 0000000..86b40a9
--- /dev/null
+++ b/server/bruno/collections/photos/02-nominal-ajout.bru
@@ -0,0 +1,44 @@
+meta {
+  name: Nominal - ajouter une photo
+  type: http
+  seq: 2
+}
+
+put {
+  url: {{baseUrl}}/api/collections/{{collectionId}}/photos/{{collectionPhotoId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('collectionId') || !bru.getVar('collectionPhotoId')) {
+    throw new Error('collectionId ou collectionPhotoId absent : lancer toute la collection, collections/create/01 et photos/01 doivent passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 200
+  res.body.id: eq {{collectionId}}
+  res.body.photoIds.length: eq 1
+}
+
+script:post-response {
+  const axios = require('axios')
+  // A script request does not get the collection headers: send the cookie itself.
+  const photoIdsOf = async (collectionId) => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/collections`, {
+      headers: { Cookie: bru.getVar('inviteeCookie') },
+    })
+    return list.data.collections.find(({ id }) => id === collectionId).photoIds
+  }
+  test('la liste des collections porte la photo', async () => {
+    expect(await photoIdsOf(bru.getVar('collectionId'))).to.eql([bru.getVar('collectionPhotoId')])
+  })
+}
+
+docs {
+  NOMINAL → 200 avec la collection, qui contient la photo. Le script relit
+  la liste : l'ajout est enregistré.
+}
diff --git a/server/bruno/collections/photos/03-nominal-ajout-deja-la.bru b/server/bruno/collections/photos/03-nominal-ajout-deja-la.bru
new file mode 100644
index 0000000..13976d3
--- /dev/null
+++ b/server/bruno/collections/photos/03-nominal-ajout-deja-la.bru
@@ -0,0 +1,29 @@
+meta {
+  name: Nominal - ajouter une photo déjà là
+  type: http
+  seq: 3
+}
+
+put {
+  url: {{baseUrl}}/api/collections/{{collectionId}}/photos/{{collectionPhotoId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('collectionId') || !bru.getVar('collectionPhotoId')) {
+    throw new Error('collectionId ou collectionPhotoId absent : lancer toute la collection, collections/create/01 et photos/01 doivent passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 200
+  res.body.photoIds.length: eq 1
+}
+
+docs {
+  NOMINAL → 200, la photo une seule fois : ajouter une photo déjà dans la
+  collection ne la double pas (un double clic, deux appareils).
+}
diff --git a/server/bruno/collections/photos/04-edge-photo-inconnue.bru b/server/bruno/collections/photos/04-edge-photo-inconnue.bru
new file mode 100644
index 0000000..1f8aa02
--- /dev/null
+++ b/server/bruno/collections/photos/04-edge-photo-inconnue.bru
@@ -0,0 +1,28 @@
+meta {
+  name: Edge - photo inconnue
+  type: http
+  seq: 4
+}
+
+put {
+  url: {{baseUrl}}/api/collections/{{collectionId}}/photos/000000000000000000000000
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('collectionId') || !bru.getVar('collectionPhotoId')) {
+    throw new Error('collectionId ou collectionPhotoId absent : lancer toute la collection, collections/create/01 et photos/01 doivent passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq PHOTO_NOT_FOUND
+}
+
+docs {
+  EDGE → 404 PHOTO_NOT_FOUND : aucune photo n'a cet id.
+}
diff --git a/server/bruno/collections/photos/05-edge-autre-compte.bru b/server/bruno/collections/photos/05-edge-autre-compte.bru
new file mode 100644
index 0000000..bd96f45
--- /dev/null
+++ b/server/bruno/collections/photos/05-edge-autre-compte.bru
@@ -0,0 +1,42 @@
+meta {
+  name: Edge - collection et photo d'un autre compte
+  type: http
+  seq: 5
+}
+
+put {
+  url: {{baseUrl}}/api/collections/{{collectionId}}/photos/{{collectionPhotoId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('collectionId') || !bru.getVar('collectionPhotoId')) {
+    throw new Error('collectionId ou collectionPhotoId absent : lancer toute la collection, collections/create/01 et photos/01 doivent passer')
+  }
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq PHOTO_NOT_FOUND
+}
+
+script:post-response {
+  const axios = require('axios')
+  // A script request does not get the collection headers: send the cookie itself.
+  const photoIdsOf = async (collectionId) => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/collections`, {
+      headers: { Cookie: bru.getVar('inviteeCookie') },
+    })
+    return list.data.collections.find(({ id }) => id === collectionId).photoIds
+  }
+  test('la collection du compte jetable n\'a pas changé', async () => {
+    expect(await photoIdsOf(bru.getVar('collectionId'))).to.eql([bru.getVar('collectionPhotoId')])
+  })
+}
+
+docs {
+  EDGE → 404 PHOTO_NOT_FOUND : le membre (cookie par défaut) vise la
+  collection et la photo du compte jetable. La photo n'est pas la sienne :
+  il n'apprend rien, et la collection ne change pas.
+}
diff --git a/server/bruno/collections/photos/06-edge-collection-inconnue.bru b/server/bruno/collections/photos/06-edge-collection-inconnue.bru
new file mode 100644
index 0000000..b076455
--- /dev/null
+++ b/server/bruno/collections/photos/06-edge-collection-inconnue.bru
@@ -0,0 +1,29 @@
+meta {
+  name: Edge - collection inconnue
+  type: http
+  seq: 6
+}
+
+put {
+  url: {{baseUrl}}/api/collections/000000000000000000000000/photos/{{collectionPhotoId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('collectionId') || !bru.getVar('collectionPhotoId')) {
+    throw new Error('collectionId ou collectionPhotoId absent : lancer toute la collection, collections/create/01 et photos/01 doivent passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq COLLECTION_NOT_FOUND
+}
+
+docs {
+  EDGE → 404 COLLECTION_NOT_FOUND : la photo est bien celle du compte,
+  mais aucune collection n'a cet id.
+}
diff --git a/server/bruno/collections/photos/07-nominal-prepa-photo-recue.bru b/server/bruno/collections/photos/07-nominal-prepa-photo-recue.bru
new file mode 100644
index 0000000..60f4ea7
--- /dev/null
+++ b/server/bruno/collections/photos/07-nominal-prepa-photo-recue.bru
@@ -0,0 +1,58 @@
+meta {
+  name: Nominal - photo reçue d'un ami, pas encore ouverte
+  type: http
+  seq: 7
+}
+
+post {
+  url: {{baseUrl}}/api/photos/share
+  body: multipartForm
+  auth: none
+}
+
+body:multipart-form {
+  photo: @file(fixtures/photo.png) @contentType(image/png)
+  friendId: {{inviteeId}}
+}
+
+script:pre-request {
+  const axios = require('axios')
+  if (!bru.getVar('inviteeCookie') || !bru.getVar('inviteEmail')) {
+    throw new Error('inviteeCookie ou inviteEmail absent : lancer toute la collection, invitations/accept/05 doit passer')
+  }
+  const baseUrl = bru.getEnvVar('baseUrl')
+  const inviteeHeaders = { Cookie: bru.getVar('inviteeCookie') }
+  const { data: me } = await axios.get(`${baseUrl}/api/auth/me`, { headers: inviteeHeaders })
+  bru.setVar('inviteeId', me.user.id)
+  // The member asks, the throwaway account accepts: only friends can send a photo.
+  const { data } = await axios.post(
+    `${baseUrl}/api/friendships`,
+    { email: bru.getVar('inviteEmail') },
+    { headers: { Cookie: bru.getVar('sessionCookie') } },
+  )
+  await axios.post(`${baseUrl}/api/friendships/${data.friendship.id}/accept`, null, {
+    headers: inviteeHeaders,
+  })
+  bru.setVar('collectionFriendshipId', data.friendship.id)
+}
+
+assert {
+  res.status: eq 201
+  res.body.id: isString
+}
+
+script:post-response {
+  const axios = require('axios')
+  bru.setVar('unopenedPhotoId', res.body.id)
+  // The friendship was only for this photo: the member keeps no tie to the throwaway account.
+  await axios.delete(
+    `${bru.getEnvVar('baseUrl')}/api/friendships/${bru.getVar('collectionFriendshipId')}`,
+    { headers: { Cookie: bru.getVar('sessionCookie') } },
+  )
+}
+
+docs {
+  NOMINAL → 201. Préparation : le membre devient l'ami du compte jetable,
+  lui envoie un fichier, puis l'amitié est supprimée. La photo attend le
+  compte jetable, non ouverte ; son id va dans `unopenedPhotoId`.
+}
diff --git a/server/bruno/collections/photos/08-edge-photo-pas-ouverte.bru b/server/bruno/collections/photos/08-edge-photo-pas-ouverte.bru
new file mode 100644
index 0000000..c4c0190
--- /dev/null
+++ b/server/bruno/collections/photos/08-edge-photo-pas-ouverte.bru
@@ -0,0 +1,37 @@
+meta {
+  name: Edge - photo reçue pas encore ouverte
+  type: http
+  seq: 8
+}
+
+put {
+  url: {{baseUrl}}/api/collections/{{collectionId}}/photos/{{unopenedPhotoId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('collectionId') || !bru.getVar('unopenedPhotoId')) {
+    throw new Error('collectionId ou unopenedPhotoId absent : lancer tout le dossier, photos/07 doit passer')
+  }
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq PHOTO_NOT_FOUND
+}
+
+script:post-response {
+  const axios = require('axios')
+  // The photo was only for this test: deleted, its image leaves Cloudinary.
+  await axios.delete(`${bru.getEnvVar('baseUrl')}/api/photos/${bru.getVar('unopenedPhotoId')}`, {
+    headers: { Cookie: bru.getVar('inviteeCookie') },
+  })
+}
+
+docs {
+  EDGE → 404 PHOTO_NOT_FOUND : une photo reçue n'entre dans une collection
+  qu'une fois ouverte, comme dans la bibliothèque. Le script supprime
+  ensuite la photo reçue.
+}
diff --git a/server/bruno/collections/photos/09-edge-id-invalide.bru b/server/bruno/collections/photos/09-edge-id-invalide.bru
new file mode 100644
index 0000000..252ea9f
--- /dev/null
+++ b/server/bruno/collections/photos/09-edge-id-invalide.bru
@@ -0,0 +1,29 @@
+meta {
+  name: Edge - id de collection mal formé
+  type: http
+  seq: 9
+}
+
+put {
+  url: {{baseUrl}}/api/collections/pas-un-id/photos/{{collectionPhotoId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('collectionId') || !bru.getVar('collectionPhotoId')) {
+    throw new Error('collectionId ou collectionPhotoId absent : lancer toute la collection, collections/create/01 et photos/01 doivent passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq COLLECTION_NOT_FOUND
+}
+
+docs {
+  EDGE → 404 COLLECTION_NOT_FOUND : un id mal formé répond comme une
+  collection inconnue.
+}
diff --git a/server/bruno/collections/photos/10-edge-sans-cookie.bru b/server/bruno/collections/photos/10-edge-sans-cookie.bru
new file mode 100644
index 0000000..0010ec3
--- /dev/null
+++ b/server/bruno/collections/photos/10-edge-sans-cookie.bru
@@ -0,0 +1,25 @@
+meta {
+  name: Edge - sans cookie de session
+  type: http
+  seq: 10
+}
+
+put {
+  url: {{baseUrl}}/api/collections/{{collectionId}}/photos/{{collectionPhotoId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  // collection.bru sends the session cookie to every request: remove it here.
+  req.deleteHeader('Cookie')
+}
+
+assert {
+  res.status: eq 401
+  res.body.error: eq UNAUTHENTICATED
+}
+
+docs {
+  EDGE → 401 UNAUTHENTICATED : ajouter une photo demande une session.
+}
diff --git a/server/bruno/collections/photos/11-edge-retrait-autre-compte.bru b/server/bruno/collections/photos/11-edge-retrait-autre-compte.bru
new file mode 100644
index 0000000..d7ff869
--- /dev/null
+++ b/server/bruno/collections/photos/11-edge-retrait-autre-compte.bru
@@ -0,0 +1,42 @@
+meta {
+  name: Edge - retirer d'une collection d'un autre compte
+  type: http
+  seq: 11
+}
+
+delete {
+  url: {{baseUrl}}/api/collections/{{collectionId}}/photos/{{collectionPhotoId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('collectionId') || !bru.getVar('collectionPhotoId')) {
+    throw new Error('collectionId ou collectionPhotoId absent : lancer toute la collection, collections/create/01 et photos/01 doivent passer')
+  }
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq COLLECTION_NOT_FOUND
+}
+
+script:post-response {
+  const axios = require('axios')
+  // A script request does not get the collection headers: send the cookie itself.
+  const photoIdsOf = async (collectionId) => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/collections`, {
+      headers: { Cookie: bru.getVar('inviteeCookie') },
+    })
+    return list.data.collections.find(({ id }) => id === collectionId).photoIds
+  }
+  test('la photo est toujours dans la collection du compte jetable', async () => {
+    expect(await photoIdsOf(bru.getVar('collectionId'))).to.eql([bru.getVar('collectionPhotoId')])
+  })
+}
+
+docs {
+  EDGE → 404 COLLECTION_NOT_FOUND : le membre (cookie par défaut) veut
+  retirer la photo de la collection du compte jetable. La collection n'est
+  pas la sienne : il n'apprend rien, et la photo y reste.
+}
diff --git a/server/bruno/collections/photos/12-nominal-retrait.bru b/server/bruno/collections/photos/12-nominal-retrait.bru
new file mode 100644
index 0000000..1efd44e
--- /dev/null
+++ b/server/bruno/collections/photos/12-nominal-retrait.bru
@@ -0,0 +1,48 @@
+meta {
+  name: Nominal - retirer une photo
+  type: http
+  seq: 12
+}
+
+delete {
+  url: {{baseUrl}}/api/collections/{{collectionId}}/photos/{{collectionPhotoId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('collectionId') || !bru.getVar('collectionPhotoId')) {
+    throw new Error('collectionId ou collectionPhotoId absent : lancer toute la collection, collections/create/01 et photos/01 doivent passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 200
+  res.body.photoIds.length: eq 0
+}
+
+script:post-response {
+  const axios = require('axios')
+  // A script request does not get the collection headers: send the cookie itself.
+  const photoIdsOf = async (collectionId) => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/collections`, {
+      headers: { Cookie: bru.getVar('inviteeCookie') },
+    })
+    return list.data.collections.find(({ id }) => id === collectionId).photoIds
+  }
+  test('la photo reste dans la bibliothèque', async () => {
+    const { data } = await axios.get(`${bru.getEnvVar('baseUrl')}/api/photos`, {
+      headers: { Cookie: bru.getVar('inviteeCookie') },
+    })
+    expect(data.photos.map(({ id }) => id)).to.include(bru.getVar('collectionPhotoId'))
+    expect(await photoIdsOf(bru.getVar('collectionId'))).to.eql([])
+  })
+}
+
+docs {
+  NOMINAL → 200 avec la collection vide. Retirer une photo d'une
+  collection ne la supprime pas : le script la retrouve dans la
+  bibliothèque.
+}
diff --git a/server/bruno/collections/photos/13-nominal-retrait-deja-fait.bru b/server/bruno/collections/photos/13-nominal-retrait-deja-fait.bru
new file mode 100644
index 0000000..122b825
--- /dev/null
+++ b/server/bruno/collections/photos/13-nominal-retrait-deja-fait.bru
@@ -0,0 +1,29 @@
+meta {
+  name: Nominal - retirer une photo absente
+  type: http
+  seq: 13
+}
+
+delete {
+  url: {{baseUrl}}/api/collections/{{collectionId}}/photos/{{collectionPhotoId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('collectionId') || !bru.getVar('collectionPhotoId')) {
+    throw new Error('collectionId ou collectionPhotoId absent : lancer toute la collection, collections/create/01 et photos/01 doivent passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see collections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 200
+  res.body.photoIds.length: eq 0
+}
+
+docs {
+  NOMINAL → 200 avec la collection telle quelle : retirer une photo qui
+  n'y est pas ne change rien.
+}
diff --git a/server/bruno/collections/photos/14-nominal-photo-supprimee.bru b/server/bruno/collections/photos/14-nominal-photo-supprimee.bru
new file mode 100644
index 0000000..c01452b
--- /dev/null
+++ b/server/bruno/collections/photos/14-nominal-photo-supprimee.bru
@@ -0,0 +1,51 @@
+meta {
+  name: Nominal - photo supprimée de la bibliothèque
+  type: http
+  seq: 14
+}
+
+delete {
+  url: {{baseUrl}}/api/photos/{{collectionPhotoId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  const axios = require('axios')
+  if (!bru.getVar('collectionId') || !bru.getVar('collectionPhotoId')) {
+    throw new Error('collectionId ou collectionPhotoId absent : lancer toute la collection, collections/create/01 et photos/01 doivent passer')
+  }
+  const headers = { Cookie: bru.getVar('inviteeCookie') }
+  req.setHeader('Cookie', headers.Cookie)
+  // The photo goes back in the collection, then this request deletes it from the library.
+  await axios.put(
+    `${bru.getEnvVar('baseUrl')}/api/collections/${bru.getVar('collectionId')}/photos/${bru.getVar('collectionPhotoId')}`,
+    null,
+    { headers },
+  )
+}
+
+assert {
+  res.status: eq 204
+}
+
+script:post-response {
+  const axios = require('axios')
+  // A script request does not get the collection headers: send the cookie itself.
+  const photoIdsOf = async (collectionId) => {
+    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/collections`, {
+      headers: { Cookie: bru.getVar('inviteeCookie') },
+    })
+    return list.data.collections.find(({ id }) => id === collectionId).photoIds
+  }
+  test('la collection ne liste plus la photo supprimée', async () => {
+    expect(await photoIdsOf(bru.getVar('collectionId'))).to.eql([])
+  })
+}
+
+docs {
+  NOMINAL → 204 : le compte jetable supprime de sa bibliothèque une photo
+  rangée dans la collection (le script de départ l'y remet). Le script
+  relit la liste : la collection ne la montre plus. Supprime aussi la
+  photo de `01`.
+}
diff --git a/server/bruno/collections/photos/folder.bru b/server/bruno/collections/photos/folder.bru
new file mode 100644
index 0000000..7a563d9
--- /dev/null
+++ b/server/bruno/collections/photos/folder.bru
@@ -0,0 +1,19 @@
+meta {
+  name: photos
+  seq: 4
+}
+
+docs {
+  `PUT /api/collections/:id/photos/:photoId` → 200 avec la collection, la
+  photo à la fin ; `DELETE` sur le même chemin → 200 avec la collection sans
+  la photo. Les deux sont idempotents : ajouter une photo déjà là, ou
+  retirer une photo absente, répond la collection telle quelle. Seule une
+  photo ouverte de la bibliothèque du compte entre dans une collection :
+  inconnue, d'un autre compte ou reçue pas encore ouverte, elle répond 404
+  `PHOTO_NOT_FOUND`.
+
+  Travaille sur la collection `collectionId` (« Noël 2026 » après
+  `rename/`) avec une photo que `01` ajoute à la bibliothèque du compte
+  jetable ; `14` supprime cette photo, `08` la photo reçue pour le test :
+  rien ne reste sur Cloudinary.
+}
diff --git a/server/src/features/collections/collections.controller.ts b/server/src/features/collections/collections.controller.ts
index 42a7bab..dc38435 100644
--- a/server/src/features/collections/collections.controller.ts
+++ b/server/src/features/collections/collections.controller.ts
@@ -10,8 +10,12 @@ export type CollectionsController = {
   create: (req: Request, res: Response) => Promise<void>
   rename: (req: Request<{ id: string }>, res: Response) => Promise<void>
   remove: (req: Request<{ id: string }>, res: Response) => Promise<void>
+  addPhoto: (req: Request<MembershipParams>, res: Response) => Promise<void>
+  removePhoto: (req: Request<MembershipParams>, res: Response) => Promise<void>
 }
 
+type MembershipParams = { id: string; photoId: string }
+
 type ControllerDeps = { service: CollectionsService; io: SocketServer }
 
 // Every page of the owner reloads its list: menus, cards and frames stay in step.
@@ -58,6 +62,30 @@ async function remove(
   res.status(204).end()
 }
 
+async function addPhoto(
+  deps: ControllerDeps,
+  req: Request<MembershipParams>,
+  res: Response,
+): Promise<void> {
+  const ownerId = currentUser(req).id
+  const { id, photoId } = req.params
+  const collection = await deps.service.addPhoto({ id, ownerId, photoId })
+  announceChange(deps, ownerId)
+  res.json(collection)
+}
+
+async function removePhoto(
+  deps: ControllerDeps,
+  req: Request<MembershipParams>,
+  res: Response,
+): Promise<void> {
+  const ownerId = currentUser(req).id
+  const { id, photoId } = req.params
+  const collection = await deps.service.removePhoto({ id, ownerId, photoId })
+  announceChange(deps, ownerId)
+  res.json(collection)
+}
+
 export function createCollectionsController(
   service: CollectionsService,
   io: SocketServer,
@@ -68,5 +96,7 @@ export function createCollectionsController(
     create: (req, res) => create(deps, req, res),
     rename: (req, res) => rename(deps, req, res),
     remove: (req, res) => remove(deps, req, res),
+    addPhoto: (req, res) => addPhoto(deps, req, res),
+    removePhoto: (req, res) => removePhoto(deps, req, res),
   }
 }
diff --git a/server/src/features/collections/collections.repository.ts b/server/src/features/collections/collections.repository.ts
index 78163fb..c63053f 100644
--- a/server/src/features/collections/collections.repository.ts
+++ b/server/src/features/collections/collections.repository.ts
@@ -1,4 +1,5 @@
 import { type Collection, Prisma, type PrismaClient } from '@prisma/client'
+import { IS_OPENED } from '../photos/photos.repository.js'
 
 export type CollectionRecord = Collection
 
@@ -13,6 +14,18 @@ export type CollectionsRepository = {
   rename: (id: string, ownerId: string, name: string) => Promise<CollectionRecord | WriteRefusal>
   // null unless id is one of ownerId's collections.
   deleteOwned: (id: string, ownerId: string) => Promise<CollectionRecord | null>
+  findOwned: (id: string, ownerId: string) => Promise<CollectionRecord | null>
+  // A received photo joins a collection only once opened, like it joins the library.
+  hasOpenedPhoto: (ownerId: string, photoId: string) => Promise<boolean>
+  // null unless id is one of ownerId's collections without photoId yet.
+  addPhoto: (id: string, ownerId: string, photoId: string) => Promise<CollectionRecord | null>
+  // null unless id is one of ownerId's collections and its list is still readIds.
+  setPhotoIds: (
+    id: string,
+    ownerId: string,
+    readIds: string[],
+    photoIds: string[],
+  ) => Promise<CollectionRecord | null>
 }
 
 // P2002: the unique (ownerId, name) index refused the write. P2025: no record matched.
@@ -63,6 +76,36 @@ async function nullWhenNotFound(
   }
 }
 
+// One atomic write: the filter refuses a photo already in, so two clicks never add it twice.
+function addPhoto(
+  prisma: PrismaClient,
+  id: string,
+  ownerId: string,
+  photoId: string,
+): Promise<CollectionRecord | null> {
+  return nullWhenNotFound(
+    prisma.collection.update({
+      where: { id, ownerId, NOT: { photoIds: { has: photoId } } },
+      data: { photoIds: { push: photoId } },
+    }),
+  )
+}
+
+type PhotoIdsWrite = { id: string; ownerId: string; readIds: string[]; photoIds: string[] }
+
+// A list changed since it was read (an add from another device) is not overwritten.
+function setPhotoIds(
+  prisma: PrismaClient,
+  { id, ownerId, readIds, photoIds }: PhotoIdsWrite,
+): Promise<CollectionRecord | null> {
+  return nullWhenNotFound(
+    prisma.collection.update({
+      where: { id, ownerId, photoIds: { equals: readIds } },
+      data: { photoIds: { set: photoIds } },
+    }),
+  )
+}
+
 export function createCollectionsRepository(prisma: PrismaClient): CollectionsRepository {
   return {
     findAllOf: (ownerId) => prisma.collection.findMany({ where: { ownerId } }),
@@ -75,5 +118,16 @@ export function createCollectionsRepository(prisma: PrismaClient): CollectionsRe
       refusalOnPrismaError(prisma.collection.update({ where: { id, ownerId }, data: { name } })),
     deleteOwned: (id, ownerId) =>
       nullWhenNotFound(prisma.collection.delete({ where: { id, ownerId } })),
+    findOwned: (id, ownerId) => prisma.collection.findFirst({ where: { id, ownerId } }),
+    hasOpenedPhoto: async (ownerId, photoId) => {
+      const photo = await prisma.photo.findFirst({
+        where: { id: photoId, ownerId, ...IS_OPENED },
+        select: { id: true },
+      })
+      return photo !== null
+    },
+    addPhoto: (id, ownerId, photoId) => addPhoto(prisma, id, ownerId, photoId),
+    setPhotoIds: (id, ownerId, readIds, photoIds) =>
+      setPhotoIds(prisma, { id, ownerId, readIds, photoIds }),
   }
 }
diff --git a/server/src/features/collections/collections.routes.ts b/server/src/features/collections/collections.routes.ts
index eb6449d..c18c0fe 100644
--- a/server/src/features/collections/collections.routes.ts
+++ b/server/src/features/collections/collections.routes.ts
@@ -9,5 +9,8 @@ export function createCollectionsRouter(controller: CollectionsController): Rout
   router.post('/', controller.create)
   router.patch('/:id', controller.rename)
   router.delete('/:id', controller.remove)
+  // PUT, not POST: adding the same photo twice leaves the collection as it was.
+  router.put('/:id/photos/:photoId', controller.addPhoto)
+  router.delete('/:id/photos/:photoId', controller.removePhoto)
   return router
 }
diff --git a/server/src/features/collections/collections.service.photos.test.ts b/server/src/features/collections/collections.service.photos.test.ts
new file mode 100644
index 0000000..073413b
--- /dev/null
+++ b/server/src/features/collections/collections.service.photos.test.ts
@@ -0,0 +1,220 @@
+import { describe, expect, it, vi } from 'vitest'
+import { AppError } from '../../errors/app-error.js'
+import type { Logger } from '../../lib/logger.js'
+import type { CollectionRecord, CollectionsRepository } from './collections.repository.js'
+import { createCollectionsService } from './collections.service.js'
+
+const OWNER_ID = '6b044f9d56a44767c7079b02'
+const PHOTO_ID = '6b044f9d56a44767c7079a01'
+const OTHER_PHOTO_ID = '6b044f9d56a44767c7079a02'
+const DELETED_PHOTO_ID = '6b044f9d56a44767c7079a09'
+const ADDED_ELSEWHERE_ID = '6b044f9d56a44767c7079a03'
+const NOEL: CollectionRecord = {
+  id: '6b044f9d56a44767c7079c01',
+  ownerId: OWNER_ID,
+  name: 'Noël',
+  photoIds: [OTHER_PHOTO_ID],
+  createdAt: new Date('2026-11-25T10:00:00Z'),
+}
+const WITH_PHOTO: CollectionRecord = { ...NOEL, photoIds: [OTHER_PHOTO_ID, PHOTO_ID] }
+const MEMBERSHIP = { id: NOEL.id, ownerId: OWNER_ID, photoId: PHOTO_ID }
+
+// Every dependency succeeds by default; each test breaks only the one it is about.
+function makeDeps() {
+  return {
+    repository: {
+      findAllOf: vi.fn<CollectionsRepository['findAllOf']>(),
+      findLivePhotoIds: vi
+        .fn<CollectionsRepository['findLivePhotoIds']>()
+        .mockResolvedValue([PHOTO_ID, OTHER_PHOTO_ID]),
+      create: vi.fn<CollectionsRepository['create']>(),
+      rename: vi.fn<CollectionsRepository['rename']>(),
+      deleteOwned: vi.fn<CollectionsRepository['deleteOwned']>(),
+      findOwned: vi.fn<CollectionsRepository['findOwned']>().mockResolvedValue(NOEL),
+      hasOpenedPhoto: vi.fn<CollectionsRepository['hasOpenedPhoto']>().mockResolvedValue(true),
+      addPhoto: vi.fn<CollectionsRepository['addPhoto']>().mockResolvedValue(WITH_PHOTO),
+      setPhotoIds: vi.fn<CollectionsRepository['setPhotoIds']>().mockResolvedValue(NOEL),
+    },
+    logger: {
+      info: vi.fn<Logger['info']>(),
+      warn: vi.fn<Logger['warn']>(),
+      error: vi.fn<Logger['error']>(),
+    },
+  }
+}
+
+describe('addPhoto', () => {
+  it('adds the photo at the end and logs it by identifiers', async () => {
+    const deps = makeDeps()
+
+    const collection = await createCollectionsService(deps).addPhoto(MEMBERSHIP)
+
+    expect(deps.repository.addPhoto).toHaveBeenCalledWith(NOEL.id, OWNER_ID, PHOTO_ID)
+    expect(collection.photoIds).toEqual([OTHER_PHOTO_ID, PHOTO_ID])
+    expect(deps.logger.info).toHaveBeenCalledWith('collection.photo_added', {
+      collectionId: NOEL.id,
+      photoId: PHOTO_ID,
+      userId: OWNER_ID,
+    })
+  })
+
+  it('answers a photo already in with the collection as it is, without a log', async () => {
+    const deps = makeDeps()
+    deps.repository.addPhoto.mockResolvedValue(null)
+    deps.repository.findOwned.mockResolvedValue(WITH_PHOTO)
+
+    const collection = await createCollectionsService(deps).addPhoto(MEMBERSHIP)
+
+    expect(collection.photoIds).toEqual([OTHER_PHOTO_ID, PHOTO_ID])
+    expect(deps.logger.info).not.toHaveBeenCalled()
+  })
+
+  it("refuses an unknown, someone else's or unopened photo, before any write", async () => {
+    const deps = makeDeps()
+    deps.repository.hasOpenedPhoto.mockResolvedValue(false)
+
+    const addition = createCollectionsService(deps).addPhoto(MEMBERSHIP)
+
+    await expect(addition).rejects.toThrow(new AppError('PHOTO_NOT_FOUND'))
+    expect(deps.repository.hasOpenedPhoto).toHaveBeenCalledWith(OWNER_ID, PHOTO_ID)
+    expect(deps.repository.addPhoto).not.toHaveBeenCalled()
+  })
+
+  it("answers an unknown or someone else's collection as not found", async () => {
+    const deps = makeDeps()
+    deps.repository.addPhoto.mockResolvedValue(null)
+    deps.repository.findOwned.mockResolvedValue(null)
+
+    const addition = createCollectionsService(deps).addPhoto(MEMBERSHIP)
+
+    await expect(addition).rejects.toThrow(new AppError('COLLECTION_NOT_FOUND'))
+  })
+
+  it.each([
+    ['collection', { ...MEMBERSHIP, id: 'abc' }, 'COLLECTION_NOT_FOUND'],
+    ['photo', { ...MEMBERSHIP, photoId: 'abc' }, 'PHOTO_NOT_FOUND'],
+  ])('answers a malformed %s id as not found, without a query', async (_id, membership, code) => {
+    const deps = makeDeps()
+
+    const addition = createCollectionsService(deps).addPhoto(membership)
+
+    await expect(addition).rejects.toThrow(code)
+    expect(deps.repository.hasOpenedPhoto).not.toHaveBeenCalled()
+  })
+})
+
+describe('removePhoto', () => {
+  it('writes the list back without the photo and logs it by identifiers', async () => {
+    const deps = makeDeps()
+    deps.repository.findOwned.mockResolvedValue(WITH_PHOTO)
+
+    const collection = await createCollectionsService(deps).removePhoto(MEMBERSHIP)
+
+    expect(deps.repository.setPhotoIds).toHaveBeenCalledWith(
+      NOEL.id,
+      OWNER_ID,
+      [OTHER_PHOTO_ID, PHOTO_ID],
+      [OTHER_PHOTO_ID],
+    )
+    expect(collection.photoIds).toEqual([OTHER_PHOTO_ID])
+    expect(deps.logger.info).toHaveBeenCalledWith('collection.photo_removed', {
+      collectionId: NOEL.id,
+      photoId: PHOTO_ID,
+      userId: OWNER_ID,
+    })
+  })
+
+  it('finds a photo id sent in capitals, as MongoDB answers it in lowercase', async () => {
+    const deps = makeDeps()
+    deps.repository.findOwned.mockResolvedValue(WITH_PHOTO)
+
+    await createCollectionsService(deps).removePhoto({
+      ...MEMBERSHIP,
+      photoId: PHOTO_ID.toUpperCase(),
+    })
+
+    expect(deps.repository.setPhotoIds).toHaveBeenCalledWith(
+      NOEL.id,
+      OWNER_ID,
+      [OTHER_PHOTO_ID, PHOTO_ID],
+      [OTHER_PHOTO_ID],
+    )
+    expect(deps.logger.info).toHaveBeenCalledWith('collection.photo_removed', {
+      collectionId: NOEL.id,
+      photoId: PHOTO_ID,
+      userId: OWNER_ID,
+    })
+  })
+
+  it('answers a photo that is not in the collection with the collection as it is', async () => {
+    const deps = makeDeps()
+
+    const collection = await createCollectionsService(deps).removePhoto(MEMBERSHIP)
+
+    expect(collection.photoIds).toEqual([OTHER_PHOTO_ID])
+    expect(deps.repository.setPhotoIds).not.toHaveBeenCalled()
+    expect(deps.logger.info).not.toHaveBeenCalled()
+  })
+
+  it("answers an unknown or someone else's collection as not found", async () => {
+    const deps = makeDeps()
+    deps.repository.findOwned.mockResolvedValue(null)
+
+    const removal = createCollectionsService(deps).removePhoto(MEMBERSHIP)
+
+    await expect(removal).rejects.toThrow(new AppError('COLLECTION_NOT_FOUND'))
+  })
+
+  it('answers a collection deleted between the read and the write as not found', async () => {
+    const deps = makeDeps()
+    deps.repository.findOwned.mockResolvedValueOnce(WITH_PHOTO).mockResolvedValueOnce(null)
+    deps.repository.setPhotoIds.mockResolvedValue(null)
+
+    const removal = createCollectionsService(deps).removePhoto(MEMBERSHIP)
+
+    await expect(removal).rejects.toThrow(new AppError('COLLECTION_NOT_FOUND'))
+  })
+
+  it('keeps a photo added from another device between the read and the write', async () => {
+    const deps = makeDeps()
+    const withAdded = { ...WITH_PHOTO, photoIds: [OTHER_PHOTO_ID, PHOTO_ID, ADDED_ELSEWHERE_ID] }
+    deps.repository.findOwned.mockResolvedValueOnce(WITH_PHOTO).mockResolvedValueOnce(withAdded)
+    deps.repository.setPhotoIds
+      .mockResolvedValueOnce(null)
+      .mockResolvedValueOnce({ ...NOEL, photoIds: [OTHER_PHOTO_ID, ADDED_ELSEWHERE_ID] })
+
+    await createCollectionsService(deps).removePhoto(MEMBERSHIP)
+
+    expect(deps.repository.setPhotoIds).toHaveBeenLastCalledWith(
+      NOEL.id,
+      OWNER_ID,
+      withAdded.photoIds,
+      [OTHER_PHOTO_ID, ADDED_ELSEWHERE_ID],
+    )
+    expect(deps.logger.info).toHaveBeenCalledTimes(1)
+  })
+
+  it('gives up after one retry when the list keeps changing, without a log', async () => {
+    const deps = makeDeps()
+    deps.repository.findOwned.mockResolvedValue(WITH_PHOTO)
+    deps.repository.setPhotoIds.mockResolvedValue(null)
+
+    const removal = createCollectionsService(deps).removePhoto(MEMBERSHIP)
+
+    await expect(removal).rejects.toThrow('Collection kept changing')
+    expect(deps.repository.setPhotoIds).toHaveBeenCalledTimes(2)
+    expect(deps.logger.info).not.toHaveBeenCalled()
+  })
+})
+
+describe('a photo deleted from the library', () => {
+  it('is left out of the collection the server answers', async () => {
+    const deps = makeDeps()
+    deps.repository.addPhoto.mockResolvedValue({ ...NOEL, photoIds: [DELETED_PHOTO_ID, PHOTO_ID] })
+    deps.repository.findLivePhotoIds.mockResolvedValue([PHOTO_ID])
+
+    const collection = await createCollectionsService(deps).addPhoto(MEMBERSHIP)
+
+    expect(collection.photoIds).toEqual([PHOTO_ID])
+  })
+})
diff --git a/server/src/features/collections/collections.service.test.ts b/server/src/features/collections/collections.service.test.ts
index 836969f..39e7fda 100644
--- a/server/src/features/collections/collections.service.test.ts
+++ b/server/src/features/collections/collections.service.test.ts
@@ -37,6 +37,10 @@ function makeDeps() {
       create: vi.fn<CollectionsRepository['create']>().mockResolvedValue(ETE),
       rename: vi.fn<CollectionsRepository['rename']>().mockResolvedValue(NOEL),
       deleteOwned: vi.fn<CollectionsRepository['deleteOwned']>().mockResolvedValue(NOEL),
+      findOwned: vi.fn<CollectionsRepository['findOwned']>(),
+      hasOpenedPhoto: vi.fn<CollectionsRepository['hasOpenedPhoto']>(),
+      addPhoto: vi.fn<CollectionsRepository['addPhoto']>(),
+      setPhotoIds: vi.fn<CollectionsRepository['setPhotoIds']>(),
     },
     logger: {
       info: vi.fn<Logger['info']>(),
diff --git a/server/src/features/collections/collections.service.ts b/server/src/features/collections/collections.service.ts
index d4a64b3..9749c94 100644
--- a/server/src/features/collections/collections.service.ts
+++ b/server/src/features/collections/collections.service.ts
@@ -1,7 +1,7 @@
 import { AppError } from '../../errors/app-error.js'
 import type { Logger } from '../../lib/logger.js'
 import type { ApiErrorCode, Collection } from '../../types.js'
-import { OBJECT_ID_PATTERN } from '../photos/photos.input.js'
+import { OBJECT_ID_PATTERN, parsePhotoId } from '../photos/photos.input.js'
 import type {
   CollectionRecord,
   CollectionsRepository,
@@ -24,6 +24,9 @@ export type CollectionAction = { id: string; ownerId: string }
 
 export type CollectionRename = CollectionAction & { name: unknown }
 
+// photoId comes from the URL too.
+export type PhotoMembership = CollectionAction & { photoId: string }
+
 export type CollectionsServiceDeps = {
   repository: CollectionsRepository
   logger: Logger
@@ -34,6 +37,8 @@ export type CollectionsService = {
   createCollection: (collection: NewCollection) => Promise<Collection>
   renameCollection: (rename: CollectionRename) => Promise<Collection>
   deleteCollection: (action: CollectionAction) => Promise<void>
+  addPhoto: (membership: PhotoMembership) => Promise<Collection>
+  removePhoto: (membership: PhotoMembership) => Promise<Collection>
 }
 
 // Trimmed, like a display name: « Noël » and « Noël  » are the same name.
@@ -132,11 +137,88 @@ async function deleteCollection(
   logger.info('collection.deleted', { collectionId: deleted.id, userId: ownerId })
 }
 
+// MongoDB answers ObjectIds in lowercase: an id sent in capitals must compare equal to it.
+function parseMemberPhotoId(photoId: string): string {
+  return parsePhotoId(photoId).toLowerCase()
+}
+
+async function findOwnedOrThrow(
+  { repository }: CollectionsServiceDeps,
+  id: string,
+  ownerId: string,
+): Promise<CollectionRecord> {
+  const record = await repository.findOwned(id, ownerId)
+  if (!record) {
+    throw new AppError('COLLECTION_NOT_FOUND')
+  }
+  return record
+}
+
+// Unknown, someone else's and still unopened photos all answer « not found ». Adding a photo
+// already in changes nothing: the write found no match, the collection is read as it is.
+async function addPhoto(
+  deps: CollectionsServiceDeps,
+  { id, ownerId, ...membership }: PhotoMembership,
+): Promise<Collection> {
+  const collectionId = parseCollectionId(id)
+  const photoId = parseMemberPhotoId(membership.photoId)
+  if (!(await deps.repository.hasOpenedPhoto(ownerId, photoId))) {
+    throw new AppError('PHOTO_NOT_FOUND')
+  }
+  const added = await deps.repository.addPhoto(collectionId, ownerId, photoId)
+  if (added) {
+    deps.logger.info('collection.photo_added', { collectionId, photoId, userId: ownerId })
+  }
+  return toCollection(deps, added ?? (await findOwnedOrThrow(deps, collectionId, ownerId)))
+}
+
+type Removal = { record: CollectionRecord; isRemoved: boolean }
+
+// Prisma has no $pull: the list is written back without the photo, only if it is still the
+// list read. null: it changed in between, nothing was written.
+async function removeOnce(
+  deps: CollectionsServiceDeps,
+  collectionId: string,
+  { ownerId, photoId }: Omit<PhotoMembership, 'id'>,
+): Promise<Removal | null> {
+  const record = await findOwnedOrThrow(deps, collectionId, ownerId)
+  if (!record.photoIds.includes(photoId)) {
+    return { record, isRemoved: false }
+  }
+  const kept = record.photoIds.filter((inCollection) => inCollection !== photoId)
+  const updated = await deps.repository.setPhotoIds(collectionId, ownerId, record.photoIds, kept)
+  return updated ? { record: updated, isRemoved: true } : null
+}
+
+// A photo that is not in the collection, or no longer exists, changes nothing. One retry: the
+// second read sees the other device's write, or the collection gone (404).
+async function removePhoto(
+  deps: CollectionsServiceDeps,
+  { id, ownerId, ...input }: PhotoMembership,
+): Promise<Collection> {
+  const collectionId = parseCollectionId(id)
+  const photoId = parseMemberPhotoId(input.photoId)
+  const membership = { ownerId, photoId }
+  const removal =
+    (await removeOnce(deps, collectionId, membership)) ??
+    (await removeOnce(deps, collectionId, membership))
+  if (!removal) {
+    // Changed again between the second read and write: a 500, never a silent loss.
+    throw new Error('Collection kept changing while a photo was removed')
+  }
+  if (removal.isRemoved) {
+    deps.logger.info('collection.photo_removed', { collectionId, photoId, userId: ownerId })
+  }
+  return toCollection(deps, removal.record)
+}
+
 export function createCollectionsService(deps: CollectionsServiceDeps): CollectionsService {
   return {
     listCollections: (ownerId) => listCollections(deps, ownerId),
     createCollection: (collection) => createCollection(deps, collection),
     renameCollection: (rename) => renameCollection(deps, rename),
     deleteCollection: (action) => deleteCollection(deps, action),
+    addPhoto: (membership) => addPhoto(deps, membership),
+    removePhoto: (membership) => removePhoto(deps, membership),
   }
 }
diff --git a/server/src/features/photos/photos.repository.ts b/server/src/features/photos/photos.repository.ts
index cf4d2d8..4f0714a 100644
--- a/server/src/features/photos/photos.repository.ts
+++ b/server/src/features/photos/photos.repository.ts
@@ -43,7 +43,7 @@ export type PhotosRepository = {
 
 // isOpened is unset on photos saved before step 9: they count as opened. Prisma's
 // { not: false } would leave them out, it matches only a stored true or null.
-const IS_OPENED = {
+export const IS_OPENED = {
   OR: [{ isOpened: true }, { isOpened: { isSet: false } }],
 } satisfies Prisma.PhotoWhereInput
 
~~~~

- [ ] **Step 2: Unit gates**

`pnpm check && pnpm typecheck && pnpm test` → `Test Files  23 passed (23)`, `Tests  273 passed (273)`.

- [ ] **Step 3: Bruno**

No schema change: no checkpoint. Start the test API on 3002, run the Bruno gate command twice: 159 requests, 344 assertions, all passed. Stop the test API.

- [ ] **Step 4: Commit**

`pnpm build` green. Subject: `feat(server): add and remove photos in a collection`.

---

## PR B — `feat/collections-library`

### Task 3: Load the collections once for every logged-in page (PR B, `feat/collections-library`)

**Files:**
- Create: `client/src/collections/{collection.ts, collectionsApi.ts, CollectionsContext.ts, CollectionsProvider.tsx}`
- Modify: `client/src/{api.ts, photo.ts, photoSocket.ts, App.tsx}`, `ARCHITECTURE.md`

**Interfaces:**
- `Collection`, `MAX_COLLECTION_NAME_LENGTH`, `isCollection`, `isCollectionList`, `withCollection(collections, collection)` (`collection.ts`).
- `fetchCollections`, `postCollection`, `patchCollection`, `deleteCollection`, `putCollectionPhoto`, `deleteCollectionPhoto` (`collectionsApi.ts`), answering `CollectionsResult`, `CollectionResult` or `CollectionDeletion`.
- `useCollections(): CollectionsContextValue` = `{ collections, status: 'loading' | 'loaded' | 'failed', create, rename, remove, addPhoto, removePhoto }`.

- [ ] **Step 1: The code.** The whole commit:

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 45340b9..0f91129 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -178,7 +178,7 @@ En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code e
 - Quatre événements, du serveur vers les connexions du propriétaire de la photo (`io.to(userRoom(ownerId))`) : `photo:new` avec la `Photo` qu'il a ajoutée, `photo:received` avec la `Photo` qu'un ami lui a envoyée (non ouverte), `photo:opened` avec la `Photo` qu'il vient d'ouvrir, `photo:deleted` avec l'id de la photo supprimée. Les autres comptes ne les reçoivent pas. Une photo envoyée à un ami appartient à l'ami : `photo:received` part vers ses connexions, pas vers celles de l'expéditeur, dont l'écran ne change pas.
 - Le cadre recharge toute la bibliothèque (toutes les pages) à chaque connexion Socket.IO, reconnexions comprises : une photo envoyée pendant une coupure n'est pas perdue. Tant qu'aucun chargement n'a réussi, le cadre l'indique (`usePhotoFeed` renvoie `status`) ; un rechargement qui échoue ensuite garde les photos affichées. Ensuite il insère `photo:new` et chaque `photo:opened` à leur date (par id) et retire `photo:deleted` de la liste, sans recharger. Les événements reçus pendant un chargement sont rejoués sur la liste chargée, et seul le dernier chargement lancé s'applique. Limite connue : chaque connexion relit toutes les pages et le diaporama crée une diapositive par photo, ce qui convient à quelques centaines de photos. La page bibliothèque (`/`) recharge à chaque connexion autant de photos qu'elle en avait chargé (au moins 30, par requêtes de 100, `fetchNewestPhotos`) : une reconnexion ne la ramène pas aux 30 premières, et la photo ouverte dans la visionneuse reste dans la liste et suit les mêmes événements (`usePhotoLibrary`, socket partagée dans `client/src/photoSocket.ts`).
 - Les photos en attente (`hooks/usePhotoMail.ts`) ont leur propre connexion Socket.IO, à côté de celle de la bibliothèque ou du cadre : `GET /api/photos/unopened` à chaque connexion, `photo:received` ajoute, `photo:opened` et `photo:deleted` retirent, avec le même rejeu des événements reçus pendant un chargement (`liveLoads.ts`). `connectPhotoSocket` n'écoute que les événements dont la page passe le gestionnaire. La bibliothèque et le cadre ajoutent `photo:opened` comme `photo:new`, à sa place par id (`withNewPhoto`) : une photo ouverte reprend sa date de réception. Limite connue : dans la bibliothèque paginée, une photo ouverte plus ancienne que les pages chargées se place en fin de liste jusqu'au prochain rechargement.
-- Chaque écriture sur une collection envoie `collections:changed`, sans contenu, aux connexions de son propriétaire : chaque page relit `GET /api/collections`. La liste est petite et le serveur reste la seule source ; un événement par sorte de changement demanderait autant d'écouteurs côté client.
+- Chaque écriture sur une collection envoie `collections:changed`, sans contenu, aux connexions de son propriétaire : chaque page relit `GET /api/collections`. La liste est petite et le serveur reste la seule source ; un événement par sorte de changement demanderait autant d'écouteurs côté client. Côté client, `CollectionsProvider` (`client/src/collections/`), monté une fois derrière `RequireAuth`, partage la liste entre la bibliothèque, les menus et le cadre (`useCollections`). Il a sa propre connexion Socket.IO et relit la liste à chaque connexion, à `collections:changed` et à `photo:deleted` (le serveur répond les collections sans la photo supprimée) ; seul le dernier chargement lancé s'applique. Une action réussie applique tout de suite la collection répondue (`withCollection`, à sa place par nom), sans attendre l'événement.
 - Les amitiés ne sont pas poussées : la page `/friends` recharge ses listes à l'ouverture et après chaque action. Les demandes sont rares et la page est ouverte exprès ; un événement Socket.IO demanderait un type d'événement, un écouteur côté client et `io` dans un quatrième contrôleur.
 - Les types partagés (`Photo`, codes d'erreur, événements) sont dupliqués entre `server/src/types.ts` et `client/src` : un package commun compliquerait les builds Docker.
 
diff --git a/client/src/App.tsx b/client/src/App.tsx
index 8a772ad..fd685b3 100644
--- a/client/src/App.tsx
+++ b/client/src/App.tsx
@@ -3,6 +3,7 @@ import { BrowserRouter, Outlet, Route, Routes } from 'react-router'
 import { AuthProvider } from './auth/AuthProvider.tsx'
 import { RequireAdmin } from './auth/RequireAdmin.tsx'
 import { RequireAuth } from './auth/RequireAuth.tsx'
+import { CollectionsProvider } from './collections/CollectionsProvider.tsx'
 import { AccountBar } from './components/auth/AccountBar.tsx'
 import { Toaster } from './components/ui/sonner.tsx'
 import AdminInvitationsPage from './pages/AdminInvitationsPage.tsx'
@@ -14,29 +15,36 @@ import LoginPage from './pages/LoginPage.tsx'
 import NotFoundPage from './pages/NotFoundPage.tsx'
 import SettingsPage from './pages/SettingsPage.tsx'
 
-// One layout route guards every logged-in page, instead of wrapping each one.
+// One layout route guards every logged-in page, instead of wrapping each one. The collections
+// load once for all of them: the library, the menus and the frame show the same list.
+function LoggedInLayout(): JSX.Element {
+  return (
+    <RequireAuth>
+      <CollectionsProvider>
+        <Outlet />
+      </CollectionsProvider>
+    </RequireAuth>
+  )
+}
+
+// The frame is full screen: only the other pages get the account bar.
+function AccountBarLayout(): JSX.Element {
+  return (
+    <>
+      <AccountBar />
+      <Outlet />
+    </>
+  )
+}
+
 function AppRoutes(): JSX.Element {
   return (
     <Routes>
       <Route path="/login" element={<LoginPage />} />
       <Route path="/invite/:token" element={<InvitePage />} />
-      <Route
-        element={
-          <RequireAuth>
-            <Outlet />
-          </RequireAuth>
-        }
-      >
+      <Route element={<LoggedInLayout />}>
         <Route path="/frame" element={<FramePage />} />
-        {/* The frame is full screen: only the other pages get the account bar. */}
-        <Route
-          element={
-            <>
-              <AccountBar />
-              <Outlet />
-            </>
-          }
-        >
+        <Route element={<AccountBarLayout />}>
           <Route path="/" element={<LibraryPage />} />
           <Route path="/friends" element={<FriendsPage />} />
           <Route path="/settings" element={<SettingsPage />} />
diff --git a/client/src/api.ts b/client/src/api.ts
index 470abb5..a0e4a5a 100644
--- a/client/src/api.ts
+++ b/client/src/api.ts
@@ -10,6 +10,7 @@ export type ApiErrorCode =
   | 'PASSWORD_INCORRECT'
   | 'MESSAGE_INVALID'
   | 'SELF_FRIEND'
+  | 'COLLECTION_NAME_INVALID'
   | 'UNAUTHENTICATED'
   | 'INVALID_CREDENTIALS'
   | 'FORBIDDEN'
@@ -19,10 +20,12 @@ export type ApiErrorCode =
   | 'INVITATION_NOT_FOUND'
   | 'USER_NOT_FOUND'
   | 'FRIENDSHIP_NOT_FOUND'
+  | 'COLLECTION_NOT_FOUND'
   | 'PHOTO_DUPLICATE'
   | 'ACCOUNT_EXISTS'
   | 'ALREADY_FRIENDS'
   | 'FRIEND_REQUEST_EXISTS'
+  | 'COLLECTION_EXISTS'
   | 'INVITATION_EXPIRED'
   | 'INVITATION_USED'
   | 'PHOTO_TOO_LARGE'
@@ -41,6 +44,7 @@ const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
   PASSWORD_INCORRECT: 'Mot de passe actuel incorrect.',
   MESSAGE_INVALID: 'Le message doit faire 200 caractères au plus.',
   SELF_FRIEND: 'Vous ne pouvez pas vous ajouter vous-même.',
+  COLLECTION_NAME_INVALID: 'Choisissez un nom de 1 à 50 caractères.',
   UNAUTHENTICATED: 'Votre session a expiré. Reconnectez-vous.',
   INVALID_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
   FORBIDDEN: "Cette action est réservée à l'administrateur.",
@@ -51,9 +55,11 @@ const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
   USER_NOT_FOUND:
     "Aucun compte n'utilise cette adresse e-mail. Demandez à l'administrateur d'inviter cette personne.",
   FRIENDSHIP_NOT_FOUND: "Cette demande ou cette amitié n'existe plus.",
+  COLLECTION_NOT_FOUND: "Cette collection n'existe plus.",
   PHOTO_DUPLICATE: "Cette photo est déjà dans votre bibliothèque, ou attend d'être découverte.",
   ACCOUNT_EXISTS: 'Un compte existe déjà pour cette adresse e-mail.',
   ALREADY_FRIENDS: 'Vous êtes déjà amis.',
+  COLLECTION_EXISTS: 'Vous avez déjà une collection de ce nom.',
   FRIEND_REQUEST_EXISTS:
     'Vous avez déjà envoyé une demande à cette personne : elle attend sa réponse.',
   INVITATION_EXPIRED: "Ce lien d'invitation a expiré. Demandez-en un nouveau.",
diff --git a/client/src/collections/CollectionsContext.ts b/client/src/collections/CollectionsContext.ts
new file mode 100644
index 0000000..5dcd6fe
--- /dev/null
+++ b/client/src/collections/CollectionsContext.ts
@@ -0,0 +1,25 @@
+import { createContext, useContext } from 'react'
+import type { Collection } from '@/collections/collection.ts'
+import type { CollectionDeletion, CollectionResult } from '@/collections/collectionsApi.ts'
+
+// failed: no list loaded yet. A reload that fails keeps the list shown, still 'loaded'.
+export type CollectionsStatus = 'loading' | 'loaded' | 'failed'
+
+export type CollectionsContextValue = {
+  // Sorted by name, like the server answers them.
+  collections: Collection[]
+  status: CollectionsStatus
+  create: (name: string) => Promise<CollectionResult>
+  rename: (id: string, name: string) => Promise<CollectionResult>
+  remove: (id: string) => Promise<CollectionDeletion>
+  addPhoto: (id: string, photoId: string) => Promise<CollectionResult>
+  removePhoto: (id: string, photoId: string) => Promise<CollectionResult>
+}
+
+export const CollectionsContext = createContext<CollectionsContextValue | null>(null)
+
+export function useCollections(): CollectionsContextValue {
+  const value = useContext(CollectionsContext)
+  if (value === null) throw new Error('useCollections must be used inside CollectionsProvider')
+  return value
+}
diff --git a/client/src/collections/CollectionsProvider.tsx b/client/src/collections/CollectionsProvider.tsx
new file mode 100644
index 0000000..f49db24
--- /dev/null
+++ b/client/src/collections/CollectionsProvider.tsx
@@ -0,0 +1,126 @@
+import {
+  type Dispatch,
+  type JSX,
+  type ReactNode,
+  type SetStateAction,
+  useEffect,
+  useMemo,
+  useState,
+} from 'react'
+import { useAuth } from '@/auth/AuthContext.ts'
+import {
+  CollectionsContext,
+  type CollectionsContextValue,
+  type CollectionsStatus,
+} from '@/collections/CollectionsContext.ts'
+import { type Collection, withCollection } from '@/collections/collection.ts'
+import {
+  type CollectionDeletion,
+  type CollectionResult,
+  deleteCollection,
+  deleteCollectionPhoto,
+  fetchCollections,
+  patchCollection,
+  postCollection,
+  putCollectionPhoto,
+} from '@/collections/collectionsApi.ts'
+import { connectPhotoSocket } from '@/photoSocket.ts'
+
+type CollectionsState = { collections: Collection[]; status: CollectionsStatus }
+
+type SetState = Dispatch<SetStateAction<CollectionsState>>
+
+type CollectionActions = Omit<CollectionsContextValue, 'collections' | 'status'>
+
+type CollectionsLoader = { load: () => Promise<void>; stop: () => void }
+
+// Only the latest load applies its answer: an older one may have left before a change.
+function createCollectionsLoader(setState: SetState, dropUser: () => void): CollectionsLoader {
+  let latestLoadId = 0
+  return {
+    load: async () => {
+      latestLoadId += 1
+      const loadId = latestLoadId
+      const result = await fetchCollections(() => {
+        if (loadId === latestLoadId) dropUser()
+      })
+      if (loadId !== latestLoadId) return
+      setState((current) => {
+        if (result.isSuccess) return { collections: result.collections, status: 'loaded' }
+        return current.status === 'loaded' ? current : { ...current, status: 'failed' }
+      })
+    },
+    stop: () => {
+      latestLoadId += 1
+    },
+  }
+}
+
+// Returns the cleanup that stops the socket and any load still running.
+function connectCollections(setState: SetState, dropUser: () => void): () => void {
+  const loader = createCollectionsLoader(setState, dropUser)
+  // A deleted photo leaves its collections too: the server answers them without it.
+  const socket = connectPhotoSocket({
+    onConnect: loader.load,
+    onCollectionsChanged: loader.load,
+    onDeletedPhoto: loader.load,
+    onRefused: dropUser,
+  })
+  return () => {
+    socket.disconnect()
+    loader.stop()
+  }
+}
+
+// The answer applies at once: collections:changed reloads the list on the other pages.
+function applyResult(setState: SetState, result: CollectionResult): CollectionResult {
+  if (result.isSuccess) {
+    const { collection } = result
+    setState((current) => ({
+      ...current,
+      collections: withCollection(current.collections, collection),
+    }))
+  }
+  return result
+}
+
+async function removeCollection(
+  setState: SetState,
+  id: string,
+  dropUser: () => void,
+): Promise<CollectionDeletion> {
+  const result = await deleteCollection(id, dropUser)
+  if (result.isSuccess) {
+    setState((current) => ({
+      ...current,
+      collections: current.collections.filter((collection) => collection.id !== id),
+    }))
+  }
+  return result
+}
+
+function useCollectionActions(setState: SetState, dropUser: () => void): CollectionActions {
+  return useMemo(() => {
+    const apply = (result: CollectionResult): CollectionResult => applyResult(setState, result)
+    return {
+      create: async (name) => apply(await postCollection(name, dropUser)),
+      rename: async (id, name) => apply(await patchCollection(id, name, dropUser)),
+      remove: (id) => removeCollection(setState, id, dropUser),
+      addPhoto: async (id, photoId) => apply(await putCollectionPhoto(id, photoId, dropUser)),
+      removePhoto: async (id, photoId) => apply(await deleteCollectionPhoto(id, photoId, dropUser)),
+    }
+  }, [setState, dropUser])
+}
+
+// Mounted behind RequireAuth: the library, the menus and the frame share one list.
+export function CollectionsProvider({ children }: { children: ReactNode }): JSX.Element {
+  const { dropUser } = useAuth()
+  const [state, setState] = useState<CollectionsState>({ collections: [], status: 'loading' })
+  const actions = useCollectionActions(setState, dropUser)
+
+  useEffect(() => connectCollections(setState, dropUser), [dropUser])
+
+  const value = useMemo(() => ({ ...state, ...actions }), [state, actions])
+
+  return <CollectionsContext value={value}>{children}</CollectionsContext>
+}
diff --git a/client/src/collections/collection.ts b/client/src/collections/collection.ts
new file mode 100644
index 0000000..a370738
--- /dev/null
+++ b/client/src/collections/collection.ts
@@ -0,0 +1,41 @@
+// Copy of server/src/types.ts, see why there. Keep both in sync.
+
+// photoIds: the owner's photos, in the order they were added; a deleted photo is not listed.
+export type Collection = {
+  id: string
+  name: string
+  photoIds: string[]
+}
+
+// Same bound as the server: the field stops there instead of answering an error.
+export const MAX_COLLECTION_NAME_LENGTH = 50
+
+export function isCollection(value: unknown): value is Collection {
+  return (
+    typeof value === 'object' &&
+    value !== null &&
+    'id' in value &&
+    typeof value.id === 'string' &&
+    'name' in value &&
+    typeof value.name === 'string' &&
+    'photoIds' in value &&
+    Array.isArray(value.photoIds) &&
+    value.photoIds.every((photoId) => typeof photoId === 'string')
+  )
+}
+
+export function isCollectionList(value: unknown): value is { collections: Collection[] } {
+  return (
+    typeof value === 'object' &&
+    value !== null &&
+    'collections' in value &&
+    Array.isArray(value.collections) &&
+    value.collections.every(isCollection)
+  )
+}
+
+// The server's order, « Été » before « Noël »: a created or renamed collection takes its place.
+export function withCollection(collections: Collection[], collection: Collection): Collection[] {
+  const others = collections.filter(({ id }) => id !== collection.id)
+  return [...others, collection].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
+}
diff --git a/client/src/collections/collectionsApi.ts b/client/src/collections/collectionsApi.ts
new file mode 100644
index 0000000..624a330
--- /dev/null
+++ b/client/src/collections/collectionsApi.ts
@@ -0,0 +1,96 @@
+import { errorMessage, UNAUTHORIZED_STATUS } from '@/api.ts'
+import { type Collection, isCollection, isCollectionList } from '@/collections/collection.ts'
+
+export type CollectionsResult =
+  | { isSuccess: true; collections: Collection[] }
+  | { isSuccess: false; message: string }
+
+// Every write but a deletion answers the collection as the server saved it.
+export type CollectionResult =
+  | { isSuccess: true; collection: Collection }
+  | { isSuccess: false; message: string }
+
+export type CollectionDeletion = { isSuccess: true } | { isSuccess: false; message: string }
+
+const JSON_HEADERS = { 'Content-Type': 'application/json' }
+
+// A 401 calls onUnauthenticated: the session ended on the server, the provider drops the user.
+export async function fetchCollections(onUnauthenticated: () => void): Promise<CollectionsResult> {
+  try {
+    const res = await fetch('/api/collections')
+    if (res.status === UNAUTHORIZED_STATUS) onUnauthenticated()
+    // Not JSON when the dev proxy answers for a stopped API.
+    const data: unknown = await res.json().catch(() => null)
+    if (res.ok && isCollectionList(data)) return { isSuccess: true, collections: data.collections }
+    return { isSuccess: false, message: errorMessage(data) }
+  } catch {
+    // fetch rejects only on network failure.
+    return { isSuccess: false, message: errorMessage(null) }
+  }
+}
+
+async function sendForCollection(
+  url: string,
+  init: RequestInit,
+  onUnauthenticated: () => void,
+): Promise<CollectionResult> {
+  try {
+    const res = await fetch(url, init)
+    if (res.status === UNAUTHORIZED_STATUS) onUnauthenticated()
+    const data: unknown = await res.json().catch(() => null)
+    if (res.ok && isCollection(data)) return { isSuccess: true, collection: data }
+    return { isSuccess: false, message: errorMessage(data) }
+  } catch {
+    return { isSuccess: false, message: errorMessage(null) }
+  }
+}
+
+export function postCollection(
+  name: string,
+  onUnauthenticated: () => void,
+): Promise<CollectionResult> {
+  const init = { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ name }) }
+  return sendForCollection('/api/collections', init, onUnauthenticated)
+}
+
+export function patchCollection(
+  id: string,
+  name: string,
+  onUnauthenticated: () => void,
+): Promise<CollectionResult> {
+  const init = { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ name }) }
+  return sendForCollection(`/api/collections/${id}`, init, onUnauthenticated)
+}
+
+export async function deleteCollection(
+  id: string,
+  onUnauthenticated: () => void,
+): Promise<CollectionDeletion> {
+  try {
+    const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' })
+    if (res.status === UNAUTHORIZED_STATUS) onUnauthenticated()
+    if (res.ok) return { isSuccess: true }
+    const data: unknown = await res.json().catch(() => null)
+    return { isSuccess: false, message: errorMessage(data) }
+  } catch {
+    return { isSuccess: false, message: errorMessage(null) }
+  }
+}
+
+export function putCollectionPhoto(
+  id: string,
+  photoId: string,
+  onUnauthenticated: () => void,
+): Promise<CollectionResult> {
+  const url = `/api/collections/${id}/photos/${photoId}`
+  return sendForCollection(url, { method: 'PUT' }, onUnauthenticated)
+}
+
+export function deleteCollectionPhoto(
+  id: string,
+  photoId: string,
+  onUnauthenticated: () => void,
+): Promise<CollectionResult> {
+  const url = `/api/collections/${id}/photos/${photoId}`
+  return sendForCollection(url, { method: 'DELETE' }, onUnauthenticated)
+}
diff --git a/client/src/photo.ts b/client/src/photo.ts
index bbd14e0..ee57a4a 100644
--- a/client/src/photo.ts
+++ b/client/src/photo.ts
@@ -28,6 +28,8 @@ export type ServerToClientEvents = {
   'photo:received': (photo: Photo) => void
   'photo:opened': (photo: Photo) => void
   'photo:deleted': (id: string) => void
+  // No payload: each page reloads the list, the server stays the only source.
+  'collections:changed': () => void
 }
 
 export function isPhoto(value: unknown): value is Photo {
diff --git a/client/src/photoSocket.ts b/client/src/photoSocket.ts
index 8cc1666..f4cbeea 100644
--- a/client/src/photoSocket.ts
+++ b/client/src/photoSocket.ts
@@ -15,6 +15,7 @@ export type PhotoSocketHandlers = {
   onReceivedPhoto?: (photo: Photo) => void
   onOpenedPhoto?: (photo: Photo) => void
   onDeletedPhoto?: (id: string) => void
+  onCollectionsChanged?: () => void
 }
 
 type PhotoEvent = 'photo:new' | 'photo:received' | 'photo:opened'
@@ -42,6 +43,7 @@ export function connectPhotoSocket({
   onReceivedPhoto,
   onOpenedPhoto,
   onDeletedPhoto,
+  onCollectionsChanged,
 }: PhotoSocketHandlers): PhotoSocket {
   // Same origin: Vite proxies /socket.io to the API, the session cookie goes with it.
   const socket: PhotoSocket = io()
@@ -55,5 +57,6 @@ export function connectPhotoSocket({
   listenForPhoto(socket, 'photo:received', onReceivedPhoto)
   listenForPhoto(socket, 'photo:opened', onOpenedPhoto)
   if (onDeletedPhoto) socket.on('photo:deleted', onDeletedPhoto)
+  if (onCollectionsChanged) socket.on('collections:changed', onCollectionsChanged)
   return socket
 }
~~~~

- [ ] **Step 2: Gates and commit**

`pnpm check:fix && pnpm typecheck && pnpm build && pnpm test` (unchanged: 23 / 273). Subject: `feat(client): load the collections once for every logged-in page`.

### Task 4: Create, rename and delete collections in the library (PR B, `feat/collections-library`)

**Files:**
- Create: `client/src/components/collections/{CollectionsCard, CollectionRow, CollectionNameDialog, DeleteCollectionDialog}.tsx`, `docs/produit/collections.md`
- Modify: `client/src/pages/LibraryPage.tsx`, `docs/produit/{README, a-venir, bibliotheque}.md`, `ARCHITECTURE.md`

**Interfaces:** `CollectionNameDialog({ target: NameDialogTarget | null, onClose, onSaved?, onCloseAutoFocus?, className? })` with `NameDialogTarget = { kind: 'create' } | { kind: 'rename'; collection }`; `DeleteCollectionDialog({ collection | null, onClose, onCloseAutoFocus, onDeleted })`; `CollectionRow({ collection, onDeleted })`.

- [ ] **Step 1: The code and the product docs.** The whole commit:

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 0f91129..cb80d7f 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -43,15 +43,15 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 
 ## Pages
 
-| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
-| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
-| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
-| `/`                  | bibliothèque : en tête, quand des photos reçues attendent, l'annonce « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la carte d'envoi (« Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui n'envoie le fichier qu'à l'ami), puis les photos du compte en vignettes ou en liste (choix mémorisé par appareil), « Mode cadre » à côté du choix vignettes/liste lance le diaporama, 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/`) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Envoyer à un ami » et « Supprimer » ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
-| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                  |
-| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
-| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                    |
-| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
+| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
+| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
+| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
+| `/`                  | bibliothèque : en tête, quand des photos reçues attendent, l'annonce « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la carte d'envoi (« Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui n'envoie le fichier qu'à l'ami), puis « Mes collections » (`components/collections/` : « Nouvelle collection », une ligne par collection avec son nombre de photos et un menu « … » « Renommer » / « Supprimer »), puis les photos du compte en vignettes ou en liste (choix mémorisé par appareil), « Mode cadre » à côté du choix vignettes/liste lance le diaporama, 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/`) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Envoyer à un ami » et « Supprimer » ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
+| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                    |
+| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
+| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
+| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
 
 Visionneuse : l'adresse `/?photo=<id>` ouvre la photo, un lien la partage. Ouvrir depuis la bibliothèque ajoute une entrée d'historique, passer d'une photo à l'autre la remplace, et fermer revient en arrière : le bouton retour d'Android ferme la visionneuse. Près de la fin des photos chargées, la page suivante se charge. Une photo supprimée pendant qu'on la regarde laisse sa place à la suivante (la précédente si c'était la plus ancienne), et la visionneuse se ferme quand il n'en reste aucune ; un lien vers une photo inconnue charge les pages jusqu'à la trouver, puis ferme s'il n'y en a plus. « Mode cadre » remplace l'entrée de la visionneuse (ou s'ajoute au-dessus de la bibliothèque depuis son en-tête) : quitter le cadre ramène une seule visionneuse, et le retour arrière la bibliothèque. Le lien « Cadre » de la barre ajoute une entrée d'historique ordinaire : c'est aussi l'adresse qu'un cadre ouvre au démarrage.
 
diff --git a/client/src/components/collections/CollectionNameDialog.tsx b/client/src/components/collections/CollectionNameDialog.tsx
new file mode 100644
index 0000000..14131b3
--- /dev/null
+++ b/client/src/components/collections/CollectionNameDialog.tsx
@@ -0,0 +1,133 @@
+import { type JSX, type SubmitEvent, useState } from 'react'
+import { useCollections } from '@/collections/CollectionsContext.ts'
+import { type Collection, MAX_COLLECTION_NAME_LENGTH } from '@/collections/collection.ts'
+import { TextField } from '@/components/form/TextField.tsx'
+import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
+import { Button } from '@/components/ui/button.tsx'
+import {
+  Dialog,
+  DialogContent,
+  DialogDescription,
+  DialogHeader,
+  DialogTitle,
+} from '@/components/ui/dialog.tsx'
+
+// rename carries the collection: the field starts from its current name.
+export type NameDialogTarget = { kind: 'create' } | { kind: 'rename'; collection: Collection }
+
+type CollectionNameDialogProps = {
+  target: NameDialogTarget | null
+  onClose: () => void
+  // After a success: the photo menu adds its photo to the collection it just created.
+  onSaved?: (collection: Collection) => void
+  onCloseAutoFocus?: (event: Event) => void
+  // `dark` from the frame: the dialog portals to body, outside the frame's dark <main>.
+  className?: string
+}
+
+type CollectionNameFormProps = {
+  target: NameDialogTarget
+  onDone: (collection: Collection) => void
+}
+
+const TEXTS = {
+  create: {
+    title: 'Nouvelle collection',
+    description: 'Donnez-lui un nom, puis rangez-y vos photos depuis leur menu « … ».',
+    submit: 'Créer',
+  },
+  rename: {
+    title: 'Renommer la collection',
+    description: "Le nouveau nom s'affiche partout, sur tous vos appareils.",
+    submit: 'Renommer',
+  },
+}
+
+type NameFormState = {
+  name: string
+  changeName: (name: string) => void
+  isSaving: boolean
+  error: string
+  handleSubmit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>
+}
+
+function useCollectionNameForm(
+  target: NameDialogTarget,
+  onDone: (collection: Collection) => void,
+): NameFormState {
+  const { create, rename } = useCollections()
+  const [name, setName] = useState(target.kind === 'rename' ? target.collection.name : '')
+  const [isSaving, setIsSaving] = useState(false)
+  const [error, setError] = useState('')
+
+  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
+    event.preventDefault()
+    setIsSaving(true)
+    const result =
+      target.kind === 'create' ? await create(name) : await rename(target.collection.id, name)
+    setIsSaving(false)
+    if (result.isSuccess) onDone(result.collection)
+    else setError(result.message)
+  }
+
+  // Editing the name makes the last error stale.
+  function changeName(nextName: string): void {
+    setName(nextName)
+    setError('')
+  }
+
+  return { name, changeName, isSaving, error, handleSubmit }
+}
+
+// Inside the dialog content: closing unmounts it, so the next opening starts afresh.
+function CollectionNameForm({ target, onDone }: CollectionNameFormProps): JSX.Element {
+  const { name, changeName, isSaving, error, handleSubmit } = useCollectionNameForm(target, onDone)
+
+  return (
+    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
+      <TextField
+        id="collection-name"
+        label="Nom de la collection"
+        type="text"
+        autoComplete="off"
+        value={name}
+        onChange={changeName}
+        maxLength={MAX_COLLECTION_NAME_LENGTH}
+      />
+      {error && (
+        <Alert variant="destructive">
+          <AlertDescription>{error}</AlertDescription>
+        </Alert>
+      )}
+      <Button type="submit" size="lg" disabled={isSaving}>
+        {isSaving ? 'Enregistrement…' : TEXTS[target.kind].submit}
+      </Button>
+    </form>
+  )
+}
+
+export function CollectionNameDialog({
+  target,
+  onClose,
+  onSaved,
+  onCloseAutoFocus,
+  className,
+}: CollectionNameDialogProps): JSX.Element | null {
+  if (!target) return null
+  const texts = TEXTS[target.kind]
+  function handleDone(collection: Collection): void {
+    onSaved?.(collection)
+    onClose()
+  }
+  return (
+    <Dialog open onOpenChange={onClose}>
+      <DialogContent className={className} onCloseAutoFocus={onCloseAutoFocus}>
+        <DialogHeader>
+          <DialogTitle>{texts.title}</DialogTitle>
+          <DialogDescription>{texts.description}</DialogDescription>
+        </DialogHeader>
+        <CollectionNameForm target={target} onDone={handleDone} />
+      </DialogContent>
+    </Dialog>
+  )
+}
diff --git a/client/src/components/collections/CollectionRow.tsx b/client/src/components/collections/CollectionRow.tsx
new file mode 100644
index 0000000..63b9ffd
--- /dev/null
+++ b/client/src/components/collections/CollectionRow.tsx
@@ -0,0 +1,105 @@
+import { EllipsisIcon, PencilIcon, Trash2Icon } from 'lucide-react'
+import { type JSX, type RefObject, useRef, useState } from 'react'
+import type { Collection } from '@/collections/collection.ts'
+import { CollectionNameDialog } from '@/components/collections/CollectionNameDialog.tsx'
+import { DeleteCollectionDialog } from '@/components/collections/DeleteCollectionDialog.tsx'
+import { Button } from '@/components/ui/button.tsx'
+import {
+  DropdownMenu,
+  DropdownMenuContent,
+  DropdownMenuItem,
+  DropdownMenuTrigger,
+} from '@/components/ui/dropdown-menu.tsx'
+
+type RowDialog = 'rename' | 'delete' | null
+
+type CollectionRowProps = { collection: Collection; onDeleted: () => void }
+
+type CollectionMenuProps = {
+  name: string
+  onSelect: (dialog: RowDialog) => void
+  triggerRef: RefObject<HTMLButtonElement | null>
+}
+
+type RowDialogsProps = {
+  collection: Collection
+  onDeleted: () => void
+  dialog: RowDialog
+  onClose: () => void
+  triggerRef: RefObject<HTMLButtonElement | null>
+}
+
+function photoCountLabel(count: number): string {
+  if (count === 0) return 'Aucune photo'
+  return count === 1 ? '1 photo' : `${count} photos`
+}
+
+function CollectionMenu({ name, onSelect, triggerRef }: CollectionMenuProps): JSX.Element {
+  return (
+    <DropdownMenu>
+      <DropdownMenuTrigger asChild>
+        <Button ref={triggerRef} variant="ghost" size="icon" aria-label={`Actions pour ${name}`}>
+          <EllipsisIcon />
+        </Button>
+      </DropdownMenuTrigger>
+      <DropdownMenuContent align="end">
+        <DropdownMenuItem onSelect={() => onSelect('rename')}>
+          <PencilIcon />
+          Renommer
+        </DropdownMenuItem>
+        <DropdownMenuItem variant="destructive" onSelect={() => onSelect('delete')}>
+          <Trash2Icon />
+          Supprimer
+        </DropdownMenuItem>
+      </DropdownMenuContent>
+    </DropdownMenu>
+  )
+}
+
+// Outside the menu: closing the menu must not unmount the dialogs.
+function RowDialogs({ collection, dialog, onClose, ...props }: RowDialogsProps): JSX.Element {
+  // Radix would focus the menu item that opened the dialog, gone by now: focus would fall to body.
+  function focusTrigger(event: Event): void {
+    event.preventDefault()
+    props.triggerRef.current?.focus()
+  }
+  return (
+    <>
+      <CollectionNameDialog
+        target={dialog === 'rename' ? { kind: 'rename', collection } : null}
+        onClose={onClose}
+        onCloseAutoFocus={focusTrigger}
+      />
+      <DeleteCollectionDialog
+        collection={dialog === 'delete' ? collection : null}
+        onClose={onClose}
+        onCloseAutoFocus={focusTrigger}
+        onDeleted={props.onDeleted}
+      />
+    </>
+  )
+}
+
+export function CollectionRow({ collection, onDeleted }: CollectionRowProps): JSX.Element {
+  const [dialog, setDialog] = useState<RowDialog>(null)
+  const triggerRef = useRef<HTMLButtonElement>(null)
+
+  return (
+    <li className="flex items-center justify-between gap-3 px-4 py-3">
+      <div className="flex min-w-0 flex-col">
+        <span className="font-medium wrap-anywhere">{collection.name}</span>
+        <span className="text-sm text-muted-foreground">
+          {photoCountLabel(collection.photoIds.length)}
+        </span>
+      </div>
+      <CollectionMenu name={collection.name} onSelect={setDialog} triggerRef={triggerRef} />
+      <RowDialogs
+        collection={collection}
+        onDeleted={onDeleted}
+        dialog={dialog}
+        onClose={() => setDialog(null)}
+        triggerRef={triggerRef}
+      />
+    </li>
+  )
+}
diff --git a/client/src/components/collections/CollectionsCard.tsx b/client/src/components/collections/CollectionsCard.tsx
new file mode 100644
index 0000000..b913af1
--- /dev/null
+++ b/client/src/components/collections/CollectionsCard.tsx
@@ -0,0 +1,66 @@
+import { PlusIcon } from 'lucide-react'
+import { type JSX, useRef, useState } from 'react'
+import { useCollections } from '@/collections/CollectionsContext.ts'
+import {
+  CollectionNameDialog,
+  type NameDialogTarget,
+} from '@/components/collections/CollectionNameDialog.tsx'
+import { CollectionRow } from '@/components/collections/CollectionRow.tsx'
+import { Button } from '@/components/ui/button.tsx'
+import {
+  Card,
+  CardAction,
+  CardContent,
+  CardDescription,
+  CardHeader,
+  CardTitle,
+} from '@/components/ui/card.tsx'
+
+function CollectionsList({ onDeleted }: { onDeleted: () => void }): JSX.Element {
+  const { collections, status } = useCollections()
+  if (status === 'loading') return <p className="text-muted-foreground">Chargement…</p>
+  if (status === 'failed') {
+    return <p className="text-muted-foreground">Vos collections n'ont pas pu être chargées.</p>
+  }
+  if (collections.length === 0) {
+    return <p className="text-muted-foreground">Aucune collection pour l'instant.</p>
+  }
+  return (
+    <ul className="-mx-4 divide-y">
+      {collections.map((collection) => (
+        <CollectionRow key={collection.id} collection={collection} onDeleted={onDeleted} />
+      ))}
+    </ul>
+  )
+}
+
+export function CollectionsCard(): JSX.Element {
+  const [createTarget, setCreateTarget] = useState<NameDialogTarget | null>(null)
+  // A deleted row takes its menu button along: focus goes to the card's own button.
+  const newButtonRef = useRef<HTMLButtonElement>(null)
+
+  return (
+    <Card className="w-full">
+      <CardHeader>
+        <CardTitle className="text-xl">Mes collections</CardTitle>
+        <CardDescription>
+          Rangez vos photos par thème : Noël, les vacances, le jardin…
+        </CardDescription>
+        <CardAction>
+          <Button
+            ref={newButtonRef}
+            variant="outline"
+            onClick={() => setCreateTarget({ kind: 'create' })}
+          >
+            <PlusIcon aria-hidden data-icon="inline-start" />
+            Nouvelle collection
+          </Button>
+        </CardAction>
+      </CardHeader>
+      <CardContent>
+        <CollectionsList onDeleted={() => newButtonRef.current?.focus()} />
+      </CardContent>
+      <CollectionNameDialog target={createTarget} onClose={() => setCreateTarget(null)} />
+    </Card>
+  )
+}
diff --git a/client/src/components/collections/DeleteCollectionDialog.tsx b/client/src/components/collections/DeleteCollectionDialog.tsx
new file mode 100644
index 0000000..5259b55
--- /dev/null
+++ b/client/src/components/collections/DeleteCollectionDialog.tsx
@@ -0,0 +1,63 @@
+import type { JSX } from 'react'
+import { toast } from 'sonner'
+import { useCollections } from '@/collections/CollectionsContext.ts'
+import type { Collection } from '@/collections/collection.ts'
+import {
+  AlertDialog,
+  AlertDialogAction,
+  AlertDialogCancel,
+  AlertDialogContent,
+  AlertDialogDescription,
+  AlertDialogFooter,
+  AlertDialogHeader,
+  AlertDialogTitle,
+} from '@/components/ui/alert-dialog.tsx'
+
+type DeleteCollectionDialogProps = {
+  collection: Collection | null
+  onClose: () => void
+  onCloseAutoFocus: (event: Event) => void
+  // The row and its menu leave the list: focus needs a place that stays.
+  onDeleted: () => void
+}
+
+// A failure shows in a toast: the dialog is closed by then.
+function useConfirmDeletion(onDeleted: () => void): (id: string) => Promise<void> {
+  const { remove } = useCollections()
+  return async (id) => {
+    const result = await remove(id)
+    if (result.isSuccess) onDeleted()
+    else toast.error(result.message)
+  }
+}
+
+// No pending state, like a photo deletion: the row leaves the list once the server agrees.
+export function DeleteCollectionDialog({
+  collection,
+  onClose,
+  onCloseAutoFocus,
+  onDeleted,
+}: DeleteCollectionDialogProps): JSX.Element | null {
+  const confirm = useConfirmDeletion(onDeleted)
+  if (!collection) return null
+  return (
+    <AlertDialog open onOpenChange={onClose}>
+      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
+        <AlertDialogHeader>
+          <AlertDialogTitle className="wrap-anywhere">
+            Supprimer la collection « {collection.name} » ?
+          </AlertDialogTitle>
+          <AlertDialogDescription>
+            Les photos restent dans votre bibliothèque.
+          </AlertDialogDescription>
+        </AlertDialogHeader>
+        <AlertDialogFooter>
+          <AlertDialogCancel>Annuler</AlertDialogCancel>
+          <AlertDialogAction variant="destructive" onClick={() => confirm(collection.id)}>
+            Supprimer
+          </AlertDialogAction>
+        </AlertDialogFooter>
+      </AlertDialogContent>
+    </AlertDialog>
+  )
+}
diff --git a/client/src/pages/LibraryPage.tsx b/client/src/pages/LibraryPage.tsx
index 9967d3f..dd4f8c2 100644
--- a/client/src/pages/LibraryPage.tsx
+++ b/client/src/pages/LibraryPage.tsx
@@ -1,4 +1,5 @@
 import type { JSX } from 'react'
+import { CollectionsCard } from '@/components/collections/CollectionsCard.tsx'
 import { FriendsCallToAction } from '@/components/library/FriendsCallToAction.tsx'
 import { LibrarySection } from '@/components/library/LibrarySection.tsx'
 import { UploadForm } from '@/components/library/UploadForm.tsx'
@@ -30,6 +31,7 @@ export default function LibraryPage(): JSX.Element {
         </Card>
         <FriendsCallToAction />
       </div>
+      <CollectionsCard />
       <LibrarySection library={library} onOpenPhoto={viewer.open} />
       {viewer.openId !== null && (
         <PhotoViewer library={library} openId={viewer.openId} viewer={viewer} />
diff --git a/docs/produit/README.md b/docs/produit/README.md
index babc2a2..7a48b00 100644
--- a/docs/produit/README.md
+++ b/docs/produit/README.md
@@ -1,6 +1,6 @@
 # FamilyFrame : description du produit
 
-FamilyFrame est un cadre photo connecté pour les familles éloignées. Chaque membre de la famille a un compte, une bibliothèque de photos et un cadre : un écran (tablette, vieil ordinateur, télévision) qui fait défiler ses photos. Les membres deviennent amis entre eux et s'envoient des photos : une photo envoyée est annoncée sur le cadre et dans la bibliothèque de l'ami, qui la découvre quand bon lui semble, sans que personne ait à recharger la page.
+FamilyFrame est un cadre photo connecté pour les familles éloignées. Chaque membre de la famille a un compte, une bibliothèque de photos qu'il peut ranger en collections, et un cadre : un écran (tablette, vieil ordinateur, télévision) qui fait défiler ses photos. Les membres deviennent amis entre eux et s'envoient des photos : une photo envoyée est annoncée sur le cadre et dans la bibliothèque de l'ami, qui la découvre quand bon lui semble, sans que personne ait à recharger la page.
 
 Cette documentation décrit ce que l'application permet de faire et selon quelles règles. Elle ne parle pas de la manière dont c'est construit.
 
@@ -8,7 +8,7 @@ Cette documentation décrit ce que l'application permet de faire et selon quelle
 
 | Rôle               | Ce qu'il peut faire                                                                                                                                                                             |
 | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| **Membre**         | Se connecter, gérer sa bibliothèque, afficher son cadre, ajouter des amis, envoyer des photos à ses amis, choisir son thème.                                                                    |
+| **Membre**         | Se connecter, gérer sa bibliothèque et ses collections, afficher son cadre, ajouter des amis, envoyer des photos à ses amis, choisir son thème.                                                 |
 | **Administrateur** | Tout ce que fait un membre, plus inviter de nouvelles personnes dans FamilyFrame. Il n'y a qu'un administrateur, créé à l'installation de l'application. Personne ne s'inscrit sans invitation. |
 
 ## Glossaire
@@ -24,6 +24,7 @@ Cette documentation décrit ce que l'application permet de faire et selon quelle
 | **Bibliothèque**       | L'ensemble des photos d'un compte : celles qu'il a ajoutées et celles que ses amis lui ont envoyées. Elle est privée : personne d'autre ne la voit.                    |
 | **Photo reçue**        | Une photo qu'un ami a envoyée. Elle fait partie de la bibliothèque du destinataire comme les autres et porte la mention « Envoyée par » suivie du nom de l'expéditeur. |
 | **Expéditeur**         | Le membre qui a envoyé une photo reçue.                                                                                                                                |
+| **Collection**         | Une liste de photos de sa bibliothèque, rangées sous un nom (« Noël », « Les vacances »). Elle est privée.                                                             |
 | **Cadre**              | L'affichage plein écran de sa bibliothèque, pensé pour un écran posé chez soi. Il montre toutes les photos du compte connecté.                                         |
 | **Diaporama**          | Le mode du cadre qui affiche une photo à la fois, en grand, et passe seul à la suivante.                                                                               |
 | **Modèle d'affichage** | La façon dont le cadre présente chaque photo : ajustée sur un fond flouté, en plein format, dans un passe-partout ou en polaroïd. Chaque appareil garde le sien.       |
@@ -39,6 +40,7 @@ Cette documentation décrit ce que l'application permet de faire et selon quelle
 | [amis.md](amis.md)                                       | Demandes d'ami, acceptation, refus, annulation, retrait d'un ami.                                                     |
 | [bibliotheque.md](bibliotheque.md)                       | Ajout de photos, formats acceptés, doublons, affichage, chargement, suppression.                                      |
 | [partage.md](partage.md)                                 | Envoi d'une photo à un ami, depuis sa bibliothèque ou depuis son appareil.                                            |
+| [collections.md](collections.md)                         | Création, renommage et suppression des collections.                                                                   |
 | [cadre.md](cadre.md)                                     | Vue cadre, diaporama, arrivée des photos en direct, comportement sans activité ou sans connexion.                     |
 | [apparence-et-navigation.md](apparence-et-navigation.md) | Barre du haut, menus, thème, page introuvable, messages d'erreur communs.                                             |
 | [preferences.md](preferences.md)                         | Page « Préférences » : photo de profil, nom affiché, mot de passe, adresse e-mail, réglages du cadre de cet appareil. |
diff --git a/docs/produit/a-venir.md b/docs/produit/a-venir.md
index bfb37ae..5dcb1d6 100644
--- a/docs/produit/a-venir.md
+++ b/docs/produit/a-venir.md
@@ -8,8 +8,8 @@ Les règles ci-dessous décrivent l'intention ; elles recevront leur identifiant
 
 **Prévu**
 
-- Des collections : des listes de lecture de photos à faire passer sur le cadre.
-- Chaque collection se lit en boucle ou en ordre aléatoire.
+- Ranger ses photos dans ses collections, depuis leur menu « … ».
+- Faire passer une collection sur le cadre, en boucle ou en ordre aléatoire.
 
 ## Étape 11 · Sélections automatiques
 
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index 6f12eaf..bbe2c43 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -61,6 +61,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 - Ouvrir le menu « … » d'une photo pour l'envoyer à un ami ou la supprimer.
 - Lancer le mode cadre, en plein écran, depuis la bibliothèque, ou depuis une photo ouverte pour que le diaporama commence par elle (voir [cadre.md](cadre.md)).
 - Découvrir les photos envoyées par ses proches depuis l'annonce en haut de la page (voir [partage.md](partage.md#recevoir-une-photo)).
+- Gérer ses collections dans la carte « Mes collections » (voir [collections.md](collections.md)).
 
 **Règles**
 
diff --git a/docs/produit/collections.md b/docs/produit/collections.md
new file mode 100644
index 0000000..3b39af7
--- /dev/null
+++ b/docs/produit/collections.md
@@ -0,0 +1,44 @@
+# Collections
+
+Une collection est une liste de photos de sa bibliothèque, rangées sous un nom : « Noël », « Les vacances », « Le jardin »… Elle est privée, comme la bibliothèque (voir [bibliotheque.md](bibliotheque.md)).
+
+## Créer, renommer et supprimer une collection
+
+**Ce que l'on peut faire**
+
+- Dans la carte « Mes collections » de la bibliothèque, créer une collection avec « Nouvelle collection ».
+- Voir ses collections, chacune avec son nom et son nombre de photos.
+- Depuis le menu « … » d'une collection, la renommer ou la supprimer.
+
+**Règles**
+
+1. R-COL-01 · Un nom fait de 1 à 50 caractères ; les espaces au début et à la fin ne comptent pas.
+2. R-COL-02 · Deux collections d'un même compte ne portent pas le même nom. Les majuscules et les accents comptent : « noël » et « Noël » sont deux noms différents. Renommer une collection sous le nom qu'elle porte déjà est permis.
+3. R-COL-03 · Les collections sont classées par ordre alphabétique (« Été » avant « Noël »).
+4. R-COL-04 · Une nouvelle collection est vide.
+5. R-COL-05 · Supprimer une collection demande une confirmation ; « Annuler » ferme la fenêtre sans rien changer. Ses photos restent dans la bibliothèque.
+6. R-COL-06 · Une collection créée, renommée ou supprimée l'est aussitôt sur tous les appareils connectés au compte, sans recharger la page.
+7. R-COL-07 · Les collections sont privées : personne d'autre ne les voit, pas même les amis.
+
+**Messages affichés**
+
+| Situation                     | Message                                                                                                                                            |
+| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
+| En-tête de la carte           | « Mes collections » — « Rangez vos photos par thème : Noël, les vacances, le jardin… » et le bouton « Nouvelle collection »                        |
+| Aucune collection             | « Aucune collection pour l'instant. »                                                                                                              |
+| Chargement                    | « Chargement… »                                                                                                                                    |
+| Chargement impossible         | « Vos collections n'ont pas pu être chargées. »                                                                                                    |
+| Nombre de photos              | « Aucune photo », « 1 photo », « 12 photos »                                                                                                       |
+| Création                      | « Nouvelle collection » — « Donnez-lui un nom, puis rangez-y vos photos depuis leur menu « … ». » Champ « Nom de la collection », bouton « Créer » |
+| Renommage                     | « Renommer la collection » — « Le nouveau nom s'affiche partout, sur tous vos appareils. » Champ « Nom de la collection », bouton « Renommer »     |
+| Enregistrement en cours       | « Enregistrement… »                                                                                                                                |
+| Nom vide ou trop long         | « Choisissez un nom de 1 à 50 caractères. »                                                                                                        |
+| Nom déjà pris                 | « Vous avez déjà une collection de ce nom. »                                                                                                       |
+| Collection supprimée ailleurs | « Cette collection n'existe plus. »                                                                                                                |
+| Confirmation de suppression   | « Supprimer la collection « Noël » ? » — « Les photos restent dans votre bibliothèque. » Boutons « Annuler » et « Supprimer »                      |
+
+**Ce qui n'est pas possible**
+
+- Partager une collection avec un ami, ou voir celles d'un autre membre.
+- Changer l'ordre des collections ou leur choisir une photo de couverture.
+- Ranger une collection dans une autre.
~~~~

- [ ] **Step 2: Gates and commit**

`pnpm check:fix && pnpm typecheck && pnpm build && pnpm test`. Subject: `feat(client): create, rename and delete collections in the library`.

### Task 5: Put photos in collections from their menu (PR B, `feat/collections-library`)

**Files:**
- Create: `client/src/components/collections/CollectionsSubmenu.tsx`
- Modify: `client/src/components/frame/PhotoActionsMenu.tsx` (split), `docs/produit/{collections, bibliotheque, cadre, a-venir, README}.md`, `ARCHITECTURE.md`

**Interfaces:** `CollectionsSubmenu({ photoId, onCreate })`; `PhotoActionsMenu` keeps its props (`photo`, `label`, `className`, `children`).

- [ ] **Step 1: The code and the docs.** The whole commit:

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index cb80d7f..b4c2e8e 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -43,15 +43,15 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 
 ## Pages
 
-| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
-| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
-| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
-| `/`                  | bibliothèque : en tête, quand des photos reçues attendent, l'annonce « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la carte d'envoi (« Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui n'envoie le fichier qu'à l'ami), puis « Mes collections » (`components/collections/` : « Nouvelle collection », une ligne par collection avec son nombre de photos et un menu « … » « Renommer » / « Supprimer »), puis les photos du compte en vignettes ou en liste (choix mémorisé par appareil), « Mode cadre » à côté du choix vignettes/liste lance le diaporama, 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/`) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Envoyer à un ami » et « Supprimer » ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
-| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                    |
-| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
-| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
-| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
+| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
+| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
+| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
+| `/`                  | bibliothèque : en tête, quand des photos reçues attendent, l'annonce « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la carte d'envoi (« Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui n'envoie le fichier qu'à l'ami), puis « Mes collections » (`components/collections/` : « Nouvelle collection », une ligne par collection avec son nombre de photos et un menu « … » « Renommer » / « Supprimer »), puis les photos du compte en vignettes ou en liste (choix mémorisé par appareil), « Mode cadre » à côté du choix vignettes/liste lance le diaporama, 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/`) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
+| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                               |
+| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
+| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
+| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
 
 Visionneuse : l'adresse `/?photo=<id>` ouvre la photo, un lien la partage. Ouvrir depuis la bibliothèque ajoute une entrée d'historique, passer d'une photo à l'autre la remplace, et fermer revient en arrière : le bouton retour d'Android ferme la visionneuse. Près de la fin des photos chargées, la page suivante se charge. Une photo supprimée pendant qu'on la regarde laisse sa place à la suivante (la précédente si c'était la plus ancienne), et la visionneuse se ferme quand il n'en reste aucune ; un lien vers une photo inconnue charge les pages jusqu'à la trouver, puis ferme s'il n'y en a plus. « Mode cadre » remplace l'entrée de la visionneuse (ou s'ajoute au-dessus de la bibliothèque depuis son en-tête) : quitter le cadre ramène une seule visionneuse, et le retour arrière la bibliothèque. Le lien « Cadre » de la barre ajoute une entrée d'historique ordinaire : c'est aussi l'adresse qu'un cadre ouvre au démarrage.
 
diff --git a/client/src/components/collections/CollectionsSubmenu.tsx b/client/src/components/collections/CollectionsSubmenu.tsx
new file mode 100644
index 0000000..acd75eb
--- /dev/null
+++ b/client/src/components/collections/CollectionsSubmenu.tsx
@@ -0,0 +1,76 @@
+import { FolderIcon, PlusIcon } from 'lucide-react'
+import type { JSX } from 'react'
+import { toast } from 'sonner'
+import { useCollections } from '@/collections/CollectionsContext.ts'
+import {
+  DropdownMenuCheckboxItem,
+  DropdownMenuItem,
+  DropdownMenuPortal,
+  DropdownMenuSeparator,
+  DropdownMenuSub,
+  DropdownMenuSubContent,
+  DropdownMenuSubTrigger,
+} from '@/components/ui/dropdown-menu.tsx'
+
+// `dark`: the submenu portals to body, outside the frame's dark <main>. A long list scrolls
+// inside the screen instead of being cut.
+const SUB_CONTENT_CLASS =
+  'dark max-h-(--radix-dropdown-menu-content-available-height) max-w-64 overflow-y-auto'
+
+type CollectionsSubmenuProps = {
+  photoId: string
+  // Opens the naming dialog: the photo menu adds its photo to the new collection.
+  onCreate: () => void
+}
+
+// A failure shows in a toast; the box follows the list, so it stays as it was.
+function useMembershipToggle(photoId: string): (id: string, isChecked: boolean) => Promise<void> {
+  const { addPhoto, removePhoto } = useCollections()
+  return async (id, isChecked) => {
+    const result = isChecked ? await addPhoto(id, photoId) : await removePhoto(id, photoId)
+    if (!result.isSuccess) toast.error(result.message)
+  }
+}
+
+// One box per collection, ticked when the photo is in it.
+function CollectionCheckboxes({ photoId }: { photoId: string }): JSX.Element {
+  const { collections } = useCollections()
+  const toggle = useMembershipToggle(photoId)
+  return (
+    <>
+      {collections.map(({ id, name, photoIds }) => (
+        // preventDefault keeps the menu open: several boxes can be ticked in a row.
+        <DropdownMenuCheckboxItem
+          key={id}
+          checked={photoIds.includes(photoId)}
+          onSelect={(event) => event.preventDefault()}
+          onCheckedChange={(isChecked) => toggle(id, isChecked)}
+          className="wrap-anywhere"
+        >
+          {name}
+        </DropdownMenuCheckboxItem>
+      ))}
+      {collections.length > 0 && <DropdownMenuSeparator />}
+    </>
+  )
+}
+
+export function CollectionsSubmenu({ photoId, onCreate }: CollectionsSubmenuProps): JSX.Element {
+  return (
+    <DropdownMenuSub>
+      <DropdownMenuSubTrigger>
+        <FolderIcon />
+        Collections
+      </DropdownMenuSubTrigger>
+      <DropdownMenuPortal>
+        <DropdownMenuSubContent className={SUB_CONTENT_CLASS}>
+          <CollectionCheckboxes photoId={photoId} />
+          <DropdownMenuItem onSelect={onCreate}>
+            <PlusIcon />
+            Nouvelle collection…
+          </DropdownMenuItem>
+        </DropdownMenuSubContent>
+      </DropdownMenuPortal>
+    </DropdownMenuSub>
+  )
+}
diff --git a/client/src/components/frame/PhotoActionsMenu.tsx b/client/src/components/frame/PhotoActionsMenu.tsx
index e79bec0..f4f9547 100644
--- a/client/src/components/frame/PhotoActionsMenu.tsx
+++ b/client/src/components/frame/PhotoActionsMenu.tsx
@@ -1,5 +1,10 @@
 import { EllipsisIcon, SendIcon, Trash2Icon } from 'lucide-react'
-import { type JSX, type ReactNode, useRef, useState } from 'react'
+import { type JSX, type ReactNode, type RefObject, useRef, useState } from 'react'
+import { toast } from 'sonner'
+import { useCollections } from '@/collections/CollectionsContext.ts'
+import type { Collection } from '@/collections/collection.ts'
+import { CollectionNameDialog } from '@/components/collections/CollectionNameDialog.tsx'
+import { CollectionsSubmenu } from '@/components/collections/CollectionsSubmenu.tsx'
 import { COARSE_POINTER_TARGET_CLASSES } from '@/components/frame/controlClasses.ts'
 import { DeletePhotoDialog } from '@/components/frame/DeletePhotoDialog.tsx'
 import { ShareSheet } from '@/components/sharing/ShareSheet.tsx'
@@ -21,62 +26,131 @@ type PhotoActionsMenuProps = {
   children?: ReactNode
 }
 
-export function PhotoActionsMenu({
-  photo,
-  label,
-  className,
-  children,
-}: PhotoActionsMenuProps): JSX.Element {
-  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null)
-  const [photoToShare, setPhotoToShare] = useState<Photo | null>(null)
-  const triggerRef = useRef<HTMLButtonElement>(null)
+// The photo picked when a dialog opened: the slideshow may move on while it stays open.
+type MenuDialog = { kind: 'share' | 'delete' | 'createCollection'; photo: Photo } | null
 
-  function focusTrigger(event: Event): void {
-    // Radix would focus the menu item that opened the dialog, gone by now: focus would fall to body.
+type MenuDialogsProps = {
+  dialog: MenuDialog
+  onClose: () => void
+  triggerRef: RefObject<HTMLButtonElement | null>
+}
+
+// The menu is closed by then: a toast tells where the photo went.
+function useAddToNewCollection(photo: Photo | undefined): (collection: Collection) => void {
+  const { addPhoto } = useCollections()
+  return async ({ id, name }) => {
+    if (!photo) return
+    const result = await addPhoto(id, photo.id)
+    if (result.isSuccess) toast.success(`Photo ajoutée à « ${name} ».`)
+    else toast.error(result.message)
+  }
+}
+
+// Radix would focus the menu item that opened the dialog, gone by now: focus would fall to body.
+function focusOnClose(triggerRef: RefObject<HTMLButtonElement | null>): (event: Event) => void {
+  return (event) => {
     event.preventDefault()
     triggerRef.current?.focus()
   }
+}
 
+// Outside the menu content: closing the menu must not unmount the dialogs.
+// `dark`: the sheet and dialogs portal to body, outside the frame's dark <main>.
+function MenuDialogs({ dialog, onClose, triggerRef }: MenuDialogsProps): JSX.Element {
+  const addToNewCollection = useAddToNewCollection(dialog?.photo)
+  const focusTrigger = focusOnClose(triggerRef)
+  const photoFor = (kind: NonNullable<MenuDialog>['kind']) =>
+    dialog?.kind === kind ? dialog.photo : null
+  const sharedPhoto = photoFor('share')
   return (
     <>
-      <DropdownMenu>
-        <DropdownMenuTrigger asChild>
-          <Button
-            ref={triggerRef}
-            variant="ghost"
-            size="icon-sm"
-            aria-label={label}
-            className={cn(COARSE_POINTER_TARGET_CLASSES, className)}
-          >
-            <EllipsisIcon />
-          </Button>
-        </DropdownMenuTrigger>
-        {/* `dark`: the menu portals to body, outside the frame's dark <main>. */}
-        <DropdownMenuContent align="end" className="dark">
-          {children}
-          <DropdownMenuItem onSelect={() => setPhotoToShare(photo)}>
-            <SendIcon />
-            Envoyer à un ami
-          </DropdownMenuItem>
-          <DropdownMenuItem variant="destructive" onSelect={() => setPhotoToDelete(photo)}>
-            <Trash2Icon />
-            Supprimer
-          </DropdownMenuItem>
-        </DropdownMenuContent>
-      </DropdownMenu>
-      {/* Outside the menu content: closing the menu must not unmount the dialogs. */}
-      {/* `dark`: the sheet portals to body, outside the frame's dark <main>. */}
       <ShareSheet
-        target={photoToShare ? { kind: 'library', photo: photoToShare } : null}
-        onClose={() => setPhotoToShare(null)}
+        target={sharedPhoto ? { kind: 'library', photo: sharedPhoto } : null}
+        onClose={onClose}
         onCloseAutoFocus={focusTrigger}
         className="dark"
       />
       <DeletePhotoDialog
-        photo={photoToDelete}
-        onClose={() => setPhotoToDelete(null)}
+        photo={photoFor('delete')}
+        onClose={onClose}
         onCloseAutoFocus={focusTrigger}
       />
+      <CollectionNameDialog
+        target={photoFor('createCollection') ? { kind: 'create' } : null}
+        onClose={onClose}
+        onSaved={addToNewCollection}
+        onCloseAutoFocus={focusTrigger}
+        className="dark"
+      />
+    </>
+  )
+}
+
+type MenuTriggerProps = Pick<PhotoActionsMenuProps, 'label' | 'className'> & {
+  triggerRef: RefObject<HTMLButtonElement | null>
+}
+
+function MenuTrigger({ label, className, triggerRef }: MenuTriggerProps): JSX.Element {
+  return (
+    <DropdownMenuTrigger asChild>
+      <Button
+        ref={triggerRef}
+        variant="ghost"
+        size="icon-sm"
+        aria-label={label}
+        className={cn(COARSE_POINTER_TARGET_CLASSES, className)}
+      >
+        <EllipsisIcon />
+      </Button>
+    </DropdownMenuTrigger>
+  )
+}
+
+type MenuItemsProps = {
+  photo: Photo
+  onOpen: (dialog: MenuDialog) => void
+  children?: ReactNode
+}
+
+function MenuItems({ photo, onOpen, children }: MenuItemsProps): JSX.Element {
+  return (
+    // `dark`: the menu portals to body, outside the frame's dark <main>.
+    <DropdownMenuContent align="end" className="dark">
+      {children}
+      <DropdownMenuItem onSelect={() => onOpen({ kind: 'share', photo })}>
+        <SendIcon />
+        Envoyer à un ami
+      </DropdownMenuItem>
+      <CollectionsSubmenu
+        photoId={photo.id}
+        onCreate={() => onOpen({ kind: 'createCollection', photo })}
+      />
+      <DropdownMenuItem variant="destructive" onSelect={() => onOpen({ kind: 'delete', photo })}>
+        <Trash2Icon />
+        Supprimer
+      </DropdownMenuItem>
+    </DropdownMenuContent>
+  )
+}
+
+export function PhotoActionsMenu({
+  photo,
+  label,
+  className,
+  children,
+}: PhotoActionsMenuProps): JSX.Element {
+  const [dialog, setDialog] = useState<MenuDialog>(null)
+  const triggerRef = useRef<HTMLButtonElement>(null)
+
+  return (
+    <>
+      <DropdownMenu>
+        <MenuTrigger label={label} className={className} triggerRef={triggerRef} />
+        <MenuItems photo={photo} onOpen={setDialog}>
+          {children}
+        </MenuItems>
+      </DropdownMenu>
+      <MenuDialogs dialog={dialog} onClose={() => setDialog(null)} triggerRef={triggerRef} />
     </>
   )
 }
diff --git a/docs/produit/README.md b/docs/produit/README.md
index 7a48b00..9d8dded 100644
--- a/docs/produit/README.md
+++ b/docs/produit/README.md
@@ -40,7 +40,7 @@ Cette documentation décrit ce que l'application permet de faire et selon quelle
 | [amis.md](amis.md)                                       | Demandes d'ami, acceptation, refus, annulation, retrait d'un ami.                                                     |
 | [bibliotheque.md](bibliotheque.md)                       | Ajout de photos, formats acceptés, doublons, affichage, chargement, suppression.                                      |
 | [partage.md](partage.md)                                 | Envoi d'une photo à un ami, depuis sa bibliothèque ou depuis son appareil.                                            |
-| [collections.md](collections.md)                         | Création, renommage et suppression des collections.                                                                   |
+| [collections.md](collections.md)                         | Création, renommage et suppression des collections ; ranger ses photos dedans.                                        |
 | [cadre.md](cadre.md)                                     | Vue cadre, diaporama, arrivée des photos en direct, comportement sans activité ou sans connexion.                     |
 | [apparence-et-navigation.md](apparence-et-navigation.md) | Barre du haut, menus, thème, page introuvable, messages d'erreur communs.                                             |
 | [preferences.md](preferences.md)                         | Page « Préférences » : photo de profil, nom affiché, mot de passe, adresse e-mail, réglages du cadre de cet appareil. |
diff --git a/docs/produit/a-venir.md b/docs/produit/a-venir.md
index 5dcb1d6..b24e4e5 100644
--- a/docs/produit/a-venir.md
+++ b/docs/produit/a-venir.md
@@ -8,7 +8,6 @@ Les règles ci-dessous décrivent l'intention ; elles recevront leur identifiant
 
 **Prévu**
 
-- Ranger ses photos dans ses collections, depuis leur menu « … ».
 - Faire passer une collection sur le cadre, en boucle ou en ordre aléatoire.
 
 ## Étape 11 · Sélections automatiques
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index bbe2c43..76158a0 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -58,7 +58,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 - Passer de l'un à l'autre avec les boutons « Miniatures » et « Liste ».
 - Charger les photos plus anciennes avec « Charger plus ».
 - Ouvrir une photo en grand dans l'application, puis passer à la suivante ou à la précédente d'un geste du doigt, avec les flèches à l'écran ou celles du clavier.
-- Ouvrir le menu « … » d'une photo pour l'envoyer à un ami ou la supprimer.
+- Ouvrir le menu « … » d'une photo pour l'envoyer à un ami, la ranger dans ses collections (voir [collections.md](collections.md#ranger-ses-photos-dans-une-collection)) ou la supprimer.
 - Lancer le mode cadre, en plein écran, depuis la bibliothèque, ou depuis une photo ouverte pour que le diaporama commence par elle (voir [cadre.md](cadre.md)).
 - Découvrir les photos envoyées par ses proches depuis l'annonce en haut de la page (voir [partage.md](partage.md#recevoir-une-photo)).
 - Gérer ses collections dans la carte « Mes collections » (voir [collections.md](collections.md)).
@@ -97,7 +97,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 **Ce qui n'est pas possible**
 
 - Trier ou filtrer les photos (par date, par expéditeur…), ou les rechercher.
-- Ranger les photos dans des albums ou des collections : prévu, voir [a-venir.md](a-venir.md).
+- Ranger les photos dans des albums : les collections en tiennent lieu (voir [collections.md](collections.md)).
 - Voir la bibliothèque d'un autre membre.
 
 ## Supprimer une photo
diff --git a/docs/produit/cadre.md b/docs/produit/cadre.md
index 2795474..496cb32 100644
--- a/docs/produit/cadre.md
+++ b/docs/produit/cadre.md
@@ -76,7 +76,7 @@ Le cadre n'a plus de vue bibliothèque : voir R-CAD-53. Les règles ci-dessous g
 - Choisir l'ordre de lecture : « Dans l'ordre » (des plus récentes aux plus anciennes) ou « Aléatoire » (menu « … », « Lecture ») ; l'appareil le retient.
 - Faire ces mêmes réglages depuis la page « Préférences », encart « Cadre de cet appareil » (voir [preferences.md](preferences.md#cadre-de-cet-appareil)).
 - Afficher ou masquer un bandeau de vignettes (« Vignettes ») et toucher une vignette pour aller à cette photo.
-- Envoyer la photo affichée à un ami ou la supprimer (menu « … »).
+- Envoyer la photo affichée à un ami, la ranger dans ses collections ou la supprimer (menu « … »).
 - Quitter le mode cadre (bouton ✕, touche Échap ou sortie du plein écran) pour revenir à la bibliothèque, sur la photo affichée.
 
 **Règles**
diff --git a/docs/produit/collections.md b/docs/produit/collections.md
index 3b39af7..ad40339 100644
--- a/docs/produit/collections.md
+++ b/docs/produit/collections.md
@@ -15,7 +15,7 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 1. R-COL-01 · Un nom fait de 1 à 50 caractères ; les espaces au début et à la fin ne comptent pas.
 2. R-COL-02 · Deux collections d'un même compte ne portent pas le même nom. Les majuscules et les accents comptent : « noël » et « Noël » sont deux noms différents. Renommer une collection sous le nom qu'elle porte déjà est permis.
 3. R-COL-03 · Les collections sont classées par ordre alphabétique (« Été » avant « Noël »).
-4. R-COL-04 · Une nouvelle collection est vide.
+4. R-COL-04 · Une collection créée depuis la carte « Mes collections » est vide ; créée depuis le menu « … » d'une photo, elle contient cette photo.
 5. R-COL-05 · Supprimer une collection demande une confirmation ; « Annuler » ferme la fenêtre sans rien changer. Ses photos restent dans la bibliothèque.
 6. R-COL-06 · Une collection créée, renommée ou supprimée l'est aussitôt sur tous les appareils connectés au compte, sans recharger la page.
 7. R-COL-07 · Les collections sont privées : personne d'autre ne les voit, pas même les amis.
@@ -42,3 +42,34 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 - Partager une collection avec un ami, ou voir celles d'un autre membre.
 - Changer l'ordre des collections ou leur choisir une photo de couverture.
 - Ranger une collection dans une autre.
+
+## Ranger ses photos dans une collection
+
+**Ce que l'on peut faire**
+
+- Dans le menu « … » d'une photo (bibliothèque, photo ouverte en grand ou diaporama), ouvrir « Collections » : une case par collection, cochée quand la photo y est.
+- Cocher une case pour ranger la photo dans cette collection, la décocher pour l'en retirer. Le menu reste ouvert : on peut cocher plusieurs cases à la suite.
+- Choisir « Nouvelle collection… » pour créer une collection et y ranger aussitôt la photo.
+
+**Règles**
+
+1. R-COL-08 · Une photo peut être dans plusieurs collections, mais une seule fois dans chacune : la ranger une deuxième fois ne change rien.
+2. R-COL-09 · Retirer une photo d'une collection la laisse dans la bibliothèque et dans ses autres collections.
+3. R-COL-10 · Une photo supprimée de la bibliothèque quitte toutes ses collections.
+4. R-COL-11 · Une photo reçue d'un proche ne peut être rangée qu'une fois découverte (voir [partage.md](partage.md#recevoir-une-photo)) ; avant, elle n'apparaît dans aucune collection.
+5. R-COL-12 · Seules les photos de sa propre bibliothèque peuvent être rangées dans ses collections.
+6. R-COL-13 · Une photo rangée ou retirée l'est aussitôt sur tous les appareils connectés au compte : les cases et le nombre de photos de chaque collection suivent.
+
+**Messages affichés**
+
+| Situation                                               | Message                               |
+| ------------------------------------------------------- | ------------------------------------- |
+| Photo rangée dans une nouvelle collection               | « Photo ajoutée à « Noël ». »         |
+| Photo supprimée entre-temps                             | « Cette photo a déjà été supprimée. » |
+| Collection supprimée entre-temps, sur un autre appareil | « Cette collection n'existe plus. »   |
+
+**Ce qui n'est pas possible**
+
+- Ranger plusieurs photos d'un coup.
+- Changer l'ordre des photos dans une collection.
+- Voir les photos d'une collection en dehors du cadre.
~~~~

- [ ] **Step 2: Gates and commit**

`pnpm check:fix && pnpm typecheck && pnpm build && pnpm test`. Subject: `feat(client): put photos in collections from their menu`.

---

## PR C — `feat/collections-frame`

### Task 6: Play a collection on the frame (PR C, `feat/collections-frame`)

**Files:**
- Create: `client/src/photoSource.ts`, `client/src/hooks/useSourcePhotos.ts`
- Modify: `client/src/{frameSettings.ts, hooks/useFrameSettings.ts, hooks/useFrameMode.ts, hooks/usePlaybackPhotos.ts, pages/FramePage.tsx}`, `client/src/components/frame/{FrameStatusScreen.tsx, SlideshowMenu.tsx, RadioSubmenu.tsx, frameSettingOptions.ts}`, `client/src/components/collections/DeleteCollectionDialog.tsx`, `docs/produit/{cadre, collections, a-venir, README, bibliotheque, partage}.md`, `ARCHITECTURE.md`

**Interfaces:**
- `PhotoSource = { kind: 'library' } | { kind: 'collection'; collectionId: string }`, `LIBRARY_SOURCE`, `isPhotoSource`, `sourceKey`, `sourceFromKey`, `playedSourceKey(source, collections)`, `sourceCollection(source, collections)`.
- `FrameSettings.source`; `FrameSettingsControls.onSourceChange(source)`.
- `useSourcePhotos(feed, source): PhotoFeed & { source }` (the source actually played); `FrameMode.source`.
- `usePlaybackPhotos(photos, order, currentId, sourceKey)`; `FrameStatus` gains `'emptyCollection'`; `sourceOptions(collections): SettingOption<string>[]`.

- [ ] **Step 1: The code and the docs.** The whole commit:

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index b4c2e8e..8da05cb 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -48,7 +48,7 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 | `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
 | `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
 | `/`                  | bibliothèque : en tête, quand des photos reçues attendent, l'annonce « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la carte d'envoi (« Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui n'envoie le fichier qu'à l'ami), puis « Mes collections » (`components/collections/` : « Nouvelle collection », une ligne par collection avec son nombre de photos et un menu « … » « Renommer » / « Supprimer »), puis les photos du compte en vignettes ou en liste (choix mémorisé par appareil), « Mode cadre » à côté du choix vignettes/liste lance le diaporama, 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/`) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
-| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                               |
+| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), ou d'une de ses collections, avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                      |
 | `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
 | `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
 | `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
@@ -57,7 +57,9 @@ Visionneuse : l'adresse `/?photo=<id>` ouvre la photo, un lien la partage. Ouvri
 
 Plein écran (`client/src/fullscreen.ts`) : le navigateur ne l'accorde que pendant un geste de la personne, donc les trois entrées (lien « Cadre » de la barre, « Mode cadre » de la bibliothèque et de la visionneuse) appellent `enterFullscreen()` dans le clic lui-même, avant la navigation ; c'est tout le document qui passe en plein écran, et la navigation de l'application, sans rechargement, l'y laisse. Un refus (réglage du navigateur, iPhone qui n'a pas de plein écran d'élément) est ignoré : le cadre fonctionne dans la fenêtre. En plein écran, le navigateur garde Échap pour lui : `useFrameFullscreen` écoute `fullscreenchange` et quitte le cadre quand le plein écran se termine, quelle qu'en soit la cause, sauf si un menu ou une fenêtre est ouvert (`isOverlayOpen`) : cet Échap visait la fenêtre, le cadre reste, hors plein écran ; au démontage (✕, retour arrière, lien), il retire son écouteur puis sort du plein écran, pour que la bibliothèque n'y reste jamais. Hors plein écran, Échap quitte le cadre comme avant (`useEscapeToClose`). Un cadre ouvert directement sur `/frame` n'a pas eu de clic : un bouton « Plein écran » (`components/frame/FullscreenButton.tsx`, état lu par `useIsFullscreen` avec `useSyncExternalStore`) s'affiche en haut à droite, sur le diaporama comme sur les écrans sans photo, tant que le document n'est pas en plein écran.
 
-Réglages du cadre (`client/src/frameSettings.ts`) : le modèle d'affichage, l'ordre de lecture et la vitesse sont gardés par appareil dans le `localStorage` (clé `familyframe.frame-settings`, un objet JSON). Chaque valeur est vérifiée seule à la lecture : une valeur inconnue revient à sa valeur par défaut sans effacer les autres. Chaque accès est dans un `try/catch` : en navigation privée, ou si le stockage est bloqué, les choix valent pour la visite. `useFrameSettings` relit le stockage sur l'événement `storage`, que le navigateur envoie aux autres onglets du même site. La pause et le bandeau de vignettes restent en mémoire (`useSlideshowSettings`) : ils reviennent à leur valeur par défaut à chaque ouverture.
+Réglages du cadre (`client/src/frameSettings.ts`) : le modèle d'affichage, l'ordre de lecture, la vitesse et la source des photos sont gardés par appareil dans le `localStorage` (clé `familyframe.frame-settings`, un objet JSON). Chaque valeur est vérifiée seule à la lecture : une valeur inconnue revient à sa valeur par défaut sans effacer les autres. Chaque accès est dans un `try/catch` : en navigation privée, ou si le stockage est bloqué, les choix valent pour la visite. `useFrameSettings` relit le stockage sur l'événement `storage`, que le navigateur envoie aux autres onglets du même site. La pause et le bandeau de vignettes restent en mémoire (`useSlideshowSettings`) : ils reviennent à leur valeur par défaut à chaque ouverture.
+
+Source des photos (`client/src/photoSource.ts`) : `PhotoSource` vaut `{ kind: 'library' }` (par défaut) ou `{ kind: 'collection', collectionId }` ; l'étape 11 y ajoutera ses propres sortes. Les menus et les groupes de boutons ne manient que des chaînes : `sourceKey` et `sourceFromKey` passent de l'une à l'autre (`library`, `collection:<id>`). `useSourcePhotos` filtre le flux du cadre avec les `photoIds` de la collection, lus dans `CollectionsProvider` : pas de requête de plus, l'ordre reste celui du flux (du plus récent au plus ancien), une photo pas encore découverte, absente du flux, n'est jamais lue, et une photo rangée ou retirée suit `collections:changed`. Tant que les collections chargent, le cadre reste sur « Chargement des photos… » ; une collection inconnue (supprimée, ou liste en échec) fait lire la bibliothèque, jusqu'à ce qu'une liste qui la contient arrive, et une collection vide affiche `emptyCollection`. Le stockage garde le choix fait, même si la collection disparaît : `playedSourceKey` donne la source vraiment lue, celle que cochent les menus. Changer de source repart de la photo la plus récente (`useRestartOnSourceChange` dans `useFrameMode`, pendant le rendu ; la première source connue après le chargement n'est pas un changement, `/frame?photo=<id>` garde sa photo) et tire un nouveau mélange qui commence par cette photo : le hook rend la plus récente dès le rendu du changement, avant que la sélection ne la rejoigne (`usePlaybackPhotos` garde la clé de la source du tour tiré).
 
 Lecture aléatoire (`hooks/usePlaybackPhotos.ts`, fonctions pures dans `shuffleOrder.ts`) : un mélange de Fisher-Yates tiré une fois et gardé dans l'état, recalculé pendant le rendu comme la sélection du cadre. Une photo arrivée s'insère juste après la photo affichée, une photo supprimée sort de l'ordre ; quand la dernière photo du tour laisse la place à la première, un nouveau tour est tiré, qui commence par la photo affichée. La sélection (`useFrameSelection`) reste calculée sur le flux, du plus récent au plus ancien : seul l'ordre du carrousel et du bandeau change.
 
diff --git a/client/src/components/collections/DeleteCollectionDialog.tsx b/client/src/components/collections/DeleteCollectionDialog.tsx
index 5259b55..a5e2e28 100644
--- a/client/src/components/collections/DeleteCollectionDialog.tsx
+++ b/client/src/components/collections/DeleteCollectionDialog.tsx
@@ -48,7 +48,8 @@ export function DeleteCollectionDialog({
             Supprimer la collection « {collection.name} » ?
           </AlertDialogTitle>
           <AlertDialogDescription>
-            Les photos restent dans votre bibliothèque.
+            Les photos restent dans votre bibliothèque. Un cadre qui la lisait repasse à toute la
+            bibliothèque.
           </AlertDialogDescription>
         </AlertDialogHeader>
         <AlertDialogFooter>
diff --git a/client/src/components/frame/FrameStatusScreen.tsx b/client/src/components/frame/FrameStatusScreen.tsx
index 62de4e0..d9816c6 100644
--- a/client/src/components/frame/FrameStatusScreen.tsx
+++ b/client/src/components/frame/FrameStatusScreen.tsx
@@ -1,47 +1,59 @@
-import { ImagesIcon, MailIcon, TriangleAlertIcon } from 'lucide-react'
-import type { JSX, ReactNode } from 'react'
+import { FolderIcon, ImagesIcon, MailIcon, TriangleAlertIcon } from 'lucide-react'
+import type { JSX } from 'react'
 import { FullscreenButton } from '@/components/frame/FullscreenButton.tsx'
 import { Button } from '@/components/ui/button.tsx'
 import { cn } from '@/lib/utils.ts'
 
 // Why the frame shows no photo: each case needs its own words.
 // unopened: nothing in the library yet, but friends' photos wait to be discovered.
-export type FrameStatus = 'loading' | 'empty' | 'unopened' | 'failed'
+// emptyCollection: the frame plays a collection that holds no photo.
+export type FrameStatus = 'loading' | 'empty' | 'unopened' | 'failed' | 'emptyCollection'
 
 const STATUS_ICONS = {
   loading: ImagesIcon,
   empty: ImagesIcon,
   unopened: MailIcon,
   failed: TriangleAlertIcon,
+  emptyCollection: FolderIcon,
 } satisfies Record<FrameStatus, typeof ImagesIcon>
 
+// hint: the line under the message, when the case needs one.
+type StatusText = { message: string; hint?: string }
+
+const STATUS_TEXTS = {
+  loading: { message: 'Chargement des photos…' },
+  unopened: { message: 'Des photos vous attendent.' },
+  failed: {
+    message: "Les photos n'ont pas pu être chargées.",
+    hint: 'Le cadre réessaiera dès que la connexion reviendra.',
+  },
+  emptyCollection: {
+    message: 'Cette collection est vide.',
+    hint: 'Ajoutez-y des photos depuis la bibliothèque.',
+  },
+} satisfies Record<Exclude<FrameStatus, 'empty'>, StatusText>
+
+// A first visitor needs the way in, not only the news that the frame is empty.
+function statusText(status: FrameStatus): StatusText {
+  if (status !== 'empty') return STATUS_TEXTS[status]
+  return {
+    message: 'En attente de la première photo…',
+    hint: `Envoyez-en une depuis votre téléphone : ${window.location.host}`,
+  }
+}
+
 type FrameStatusScreenProps = {
   status: FrameStatus
   className: string
   onLeave: () => void
 }
 
-function StatusMessage({ status }: { status: FrameStatus }): ReactNode {
-  if (status === 'loading') return <p className="text-3xl font-medium">Chargement des photos…</p>
-  if (status === 'unopened')
-    return <p className="text-3xl font-medium">Des photos vous attendent.</p>
-  if (status === 'failed') {
-    return (
-      <>
-        <p className="text-3xl font-medium">Les photos n'ont pas pu être chargées.</p>
-        <p className="text-lg text-muted-foreground">
-          Le cadre réessaiera dès que la connexion reviendra.
-        </p>
-      </>
-    )
-  }
+function StatusMessage({ status }: { status: FrameStatus }): JSX.Element {
+  const { message, hint } = statusText(status)
   return (
     <>
-      <p className="text-3xl font-medium">En attente de la première photo…</p>
-      {/* A first visitor needs the way in, not only the news that the frame is empty. */}
-      <p className="text-lg text-muted-foreground">
-        Envoyez-en une depuis votre téléphone : {window.location.host}
-      </p>
+      <p className="text-3xl font-medium">{message}</p>
+      {hint !== undefined && <p className="text-lg text-muted-foreground">{hint}</p>}
     </>
   )
 }
diff --git a/client/src/components/frame/RadioSubmenu.tsx b/client/src/components/frame/RadioSubmenu.tsx
index c67950c..d34fe5f 100644
--- a/client/src/components/frame/RadioSubmenu.tsx
+++ b/client/src/components/frame/RadioSubmenu.tsx
@@ -10,6 +10,12 @@ import {
   DropdownMenuSubTrigger,
 } from '@/components/ui/dropdown-menu.tsx'
 
+// `dark`: the submenu portals to body, outside the frame's dark <main>. A long list scrolls
+// inside the screen instead of being cut. A collection's name can be one long word: it wraps
+// instead of widening the menu.
+const SUB_CONTENT_CLASS =
+  'dark max-h-(--radix-dropdown-menu-content-available-height) max-w-64 overflow-y-auto wrap-anywhere'
+
 type RadioSubmenuProps<Value extends string | number> = {
   icon: LucideIcon
   label: string
@@ -30,8 +36,7 @@ export function RadioSubmenu<Value extends string | number>({
         {props.label}
       </DropdownMenuSubTrigger>
       <DropdownMenuPortal>
-        {/* `dark`: the submenu portals to body, outside the frame's dark <main>. */}
-        <DropdownMenuSubContent className="dark">
+        <DropdownMenuSubContent className={SUB_CONTENT_CLASS}>
           <DropdownMenuRadioGroup
             value={String(props.value)}
             onValueChange={optionSelector(options, props.onValueChange)}
diff --git a/client/src/components/frame/SlideshowMenu.tsx b/client/src/components/frame/SlideshowMenu.tsx
index b78921a..15b0aac 100644
--- a/client/src/components/frame/SlideshowMenu.tsx
+++ b/client/src/components/frame/SlideshowMenu.tsx
@@ -1,9 +1,11 @@
-import { FrameIcon, ShuffleIcon, TimerIcon } from 'lucide-react'
+import { FrameIcon, ImagesIcon, ShuffleIcon, TimerIcon } from 'lucide-react'
 import type { JSX } from 'react'
+import { useCollections } from '@/collections/CollectionsContext.ts'
 import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
 import {
   INTERVAL_OPTIONS,
   ORDER_OPTIONS,
+  sourceOptions,
   TEMPLATE_OPTIONS,
 } from '@/components/frame/frameSettingOptions.ts'
 import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
@@ -11,15 +13,31 @@ import { RadioSubmenu } from '@/components/frame/RadioSubmenu.tsx'
 import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu.tsx'
 import type { FrameSettingsControls } from '@/hooks/useFrameSettings.ts'
 import type { Photo } from '@/photo.ts'
+import { playedSourceKey, sourceFromKey } from '@/photoSource.ts'
 
 type SlideshowMenuProps = {
   photo: Photo
   settings: FrameSettingsControls
 }
 
+// What the frame plays: the library or one collection.
+function SourceSubmenu({ settings }: { settings: FrameSettingsControls }): JSX.Element {
+  const { collections } = useCollections()
+  return (
+    <RadioSubmenu
+      icon={ImagesIcon}
+      label="Photos"
+      options={sourceOptions(collections)}
+      value={playedSourceKey(settings.source, collections)}
+      onValueChange={(key) => settings.onSourceChange(sourceFromKey(key))}
+    />
+  )
+}
+
 export function SlideshowMenu({ photo, settings }: SlideshowMenuProps): JSX.Element {
   return (
     <PhotoActionsMenu photo={photo} label="Actions sur la photo" className={GLASS_BUTTON_CLASSES}>
+      <SourceSubmenu settings={settings} />
       <RadioSubmenu
         icon={FrameIcon}
         label="Affichage"
diff --git a/client/src/components/frame/frameSettingOptions.ts b/client/src/components/frame/frameSettingOptions.ts
index 39a22e6..28bde75 100644
--- a/client/src/components/frame/frameSettingOptions.ts
+++ b/client/src/components/frame/frameSettingOptions.ts
@@ -1,4 +1,6 @@
+import type { Collection } from '@/collections/collection.ts'
 import { type FrameTemplate, type PlaybackOrder, SLIDESHOW_INTERVALS_MS } from '@/frameSettings.ts'
+import { LIBRARY_SOURCE, sourceKey } from '@/photoSource.ts'
 
 export type SettingOption<Value> = { value: Value; label: string }
 
@@ -30,3 +32,14 @@ export const ORDER_OPTIONS: SettingOption<PlaybackOrder>[] = [
 export const INTERVAL_OPTIONS: SettingOption<number>[] = SLIDESHOW_INTERVALS_MS.map(
   (intervalMs) => ({ value: intervalMs, label: `${intervalMs / MS_PER_SECOND} s` }),
 )
+
+// The library first, then each collection by name, as the collections list shows them.
+export function sourceOptions(collections: Collection[]): SettingOption<string>[] {
+  return [
+    { value: sourceKey(LIBRARY_SOURCE), label: 'Toute la bibliothèque' },
+    ...collections.map(({ id, name }) => ({
+      value: sourceKey({ kind: 'collection', collectionId: id }),
+      label: name,
+    })),
+  ]
+}
diff --git a/client/src/frameSettings.ts b/client/src/frameSettings.ts
index c19284d..c69f55c 100644
--- a/client/src/frameSettings.ts
+++ b/client/src/frameSettings.ts
@@ -1,3 +1,5 @@
+import { isPhotoSource, LIBRARY_SOURCE, type PhotoSource } from '@/photoSource.ts'
+
 export type FrameTemplate = 'fit' | 'fill' | 'mat' | 'polaroid'
 export type PlaybackOrder = 'newest' | 'shuffle'
 
@@ -5,6 +7,7 @@ export type FrameSettings = {
   template: FrameTemplate
   order: PlaybackOrder
   intervalMs: number
+  source: PhotoSource
 }
 
 export const SLIDESHOW_INTERVALS_MS = [5_000, 10_000, 20_000]
@@ -15,6 +18,7 @@ export const DEFAULT_FRAME_SETTINGS: FrameSettings = {
   template: 'fit',
   order: 'newest',
   intervalMs: 10_000,
+  source: LIBRARY_SOURCE,
 }
 
 export const FRAME_SETTINGS_KEY = 'familyframe.frame-settings'
@@ -45,6 +49,8 @@ export function parseFrameSettings(raw: unknown): FrameSettings {
       'intervalMs' in raw && isSlideshowInterval(raw.intervalMs)
         ? raw.intervalMs
         : DEFAULT_FRAME_SETTINGS.intervalMs,
+    source:
+      'source' in raw && isPhotoSource(raw.source) ? raw.source : DEFAULT_FRAME_SETTINGS.source,
   }
 }
 
diff --git a/client/src/hooks/useFrameMode.ts b/client/src/hooks/useFrameMode.ts
index 7be00b0..93aedd7 100644
--- a/client/src/hooks/useFrameMode.ts
+++ b/client/src/hooks/useFrameMode.ts
@@ -1,3 +1,4 @@
+import { useState } from 'react'
 import { useSearchParams } from 'react-router'
 import { useFrameFullscreen } from '@/hooks/useFrameFullscreen.ts'
 import { type FrameSelection, useFrameSelection } from '@/hooks/useFrameSelection.ts'
@@ -6,7 +7,9 @@ import { useLeaveFrame } from '@/hooks/useLeaveFrame.ts'
 import { type FeedStatus, usePhotoFeed } from '@/hooks/usePhotoFeed.ts'
 import { usePlaybackPhotos } from '@/hooks/usePlaybackPhotos.ts'
 import { type SlideshowSettings, useSlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
+import { type SourcePhotos, useSourcePhotos } from '@/hooks/useSourcePhotos.ts'
 import type { Photo } from '@/photo.ts'
+import { type PhotoSource, sourceKey } from '@/photoSource.ts'
 import { PHOTO_PARAM } from '@/viewerHistory.ts'
 
 // The controls step aside quickly: the photo is what the wall is for.
@@ -16,6 +19,8 @@ export type FrameMode = {
   // In the order they play.
   photos: Photo[]
   status: FeedStatus
+  // The source played: the library when the chosen collection is gone.
+  source: PhotoSource
   // undefined while there is no photo to show.
   currentPhoto: Photo | undefined
   isActive: boolean
@@ -24,10 +29,28 @@ export type FrameMode = {
   leave: () => void
 }
 
+// A new source starts on its newest photo: the photo picked and the count of arrivals belonged to
+// the previous one. Adjusted during render, like the selection itself. Returns the photo to play
+// now: the newest already, so the shuffle draws its new round from it, not from the old photo.
+// The first source known after loading is no change: /frame?photo=<id> keeps its photo.
+function useRestartOnSourceChange(
+  { photos, status, source }: SourcePhotos,
+  selection: FrameSelection,
+): string | undefined {
+  const key = status === 'loading' ? null : sourceKey(source)
+  const [shownKey, setShownKey] = useState(key)
+  if (key === null || key === shownKey) return selection.currentId
+  setShownKey(key)
+  if (shownKey === null) return selection.currentId
+  selection.showNewest()
+  return photos.at(0)?.id
+}
+
 export function useFrameMode(): FrameMode {
-  const { photos, status } = usePhotoFeed()
-  const isActive = useIdle(CONTROLS_HIDE_DELAY_MS)
   const settings = useSlideshowSettings()
+  const sourcePhotos = useSourcePhotos(usePhotoFeed(), settings.source)
+  const { photos, status, source } = sourcePhotos
+  const isActive = useIdle(CONTROLS_HIDE_DELAY_MS)
   const [searchParams] = useSearchParams()
   // A paused photo was chosen by someone: a new arrival raises the badge instead of replacing it.
   const selection = useFrameSelection(
@@ -35,11 +58,21 @@ export function useFrameMode(): FrameMode {
     isActive || !settings.isPlaying,
     searchParams.get(PHOTO_PARAM),
   )
+  const currentId = useRestartOnSourceChange(sourcePhotos, selection)
   const leaveFrame = useLeaveFrame()
-  const currentPhoto = photos.find(({ id }) => id === selection.currentId)
+  const currentPhoto = photos.find(({ id }) => id === currentId)
   const leave = (): void => leaveFrame(currentPhoto?.id ?? null)
   useFrameFullscreen(leave)
-  const playbackPhotos = usePlaybackPhotos(photos, settings.order, selection.currentId)
+  const playbackPhotos = usePlaybackPhotos(photos, settings.order, currentId, sourceKey(source))
 
-  return { photos: playbackPhotos, status, currentPhoto, isActive, settings, selection, leave }
+  return {
+    photos: playbackPhotos,
+    status,
+    source,
+    currentPhoto,
+    isActive,
+    settings,
+    selection,
+    leave,
+  }
 }
diff --git a/client/src/hooks/useFrameSettings.ts b/client/src/hooks/useFrameSettings.ts
index 2c4152d..46b09e9 100644
--- a/client/src/hooks/useFrameSettings.ts
+++ b/client/src/hooks/useFrameSettings.ts
@@ -7,11 +7,13 @@ import {
   readFrameSettings,
   writeFrameSettings,
 } from '@/frameSettings.ts'
+import type { PhotoSource } from '@/photoSource.ts'
 
 export type FrameSettingsControls = FrameSettings & {
   onTemplateChange: (template: FrameTemplate) => void
   onOrderChange: (order: PlaybackOrder) => void
   onIntervalChange: (intervalMs: number) => void
+  onSourceChange: (source: PhotoSource) => void
 }
 
 // Per device, in this browser: a kitchen tablet and a living-room TV keep their own choices.
@@ -40,5 +42,6 @@ export function useFrameSettings(): FrameSettingsControls {
     onTemplateChange: (template) => change({ template }),
     onOrderChange: (order) => change({ order }),
     onIntervalChange: (intervalMs) => change({ intervalMs }),
+    onSourceChange: (source) => change({ source }),
   }
 }
diff --git a/client/src/hooks/usePlaybackPhotos.ts b/client/src/hooks/usePlaybackPhotos.ts
index 34f43d3..751a678 100644
--- a/client/src/hooks/usePlaybackPhotos.ts
+++ b/client/src/hooks/usePlaybackPhotos.ts
@@ -10,20 +10,26 @@ function inPlaybackOrder(photos: Photo[], ids: readonly string[]): Photo[] {
 
 // The slideshow's photos in the order they play: the feed's own (newest first), or a shuffle
 // drawn once and kept, so no photo comes back before the round is over.
+// sourceKey: another source draws a new round, instead of slotting its photos into the old one.
 export function usePlaybackPhotos(
   photos: Photo[],
   order: PlaybackOrder,
   currentId: string | undefined,
+  sourceKey: string,
 ): Photo[] {
-  const [drawnIds, setDrawnIds] = useState<readonly string[]>([])
+  const [drawn, setDrawn] = useState<{ sourceKey: string; ids: readonly string[] }>({
+    sourceKey,
+    ids: [],
+  })
   const [shownId, setShownId] = useState(currentId)
+  const drawnIds = drawn.sourceKey === sourceKey ? drawn.ids : []
 
   // Adjusted during render, like the frame's selection: an effect would paint the old order once.
   if (currentId !== shownId) setShownId(currentId)
   if (order === 'shuffle') {
     const photoIds = photos.map(({ id }) => id)
     const nextIds = nextShuffledIds({ drawnIds, photoIds, shownId, currentId }, Math.random)
-    if (!isSameOrder(nextIds, drawnIds)) setDrawnIds(nextIds)
+    if (!isSameOrder(nextIds, drawnIds)) setDrawn({ sourceKey, ids: nextIds })
   }
 
   const shuffledPhotos = useMemo(() => inPlaybackOrder(photos, drawnIds), [photos, drawnIds])
diff --git a/client/src/hooks/useSourcePhotos.ts b/client/src/hooks/useSourcePhotos.ts
new file mode 100644
index 0000000..7ca41de
--- /dev/null
+++ b/client/src/hooks/useSourcePhotos.ts
@@ -0,0 +1,32 @@
+import { useMemo } from 'react'
+import { useCollections } from '@/collections/CollectionsContext.ts'
+import type { Collection } from '@/collections/collection.ts'
+import type { PhotoFeed } from '@/hooks/usePhotoFeed.ts'
+import type { Photo } from '@/photo.ts'
+import { LIBRARY_SOURCE, type PhotoSource, sourceCollection } from '@/photoSource.ts'
+
+// source: the one actually played, the library when the chosen collection is gone.
+export type SourcePhotos = PhotoFeed & { source: PhotoSource }
+
+// Still newest first: the feed's order, whatever order the photos were added in.
+function photosIn(photos: Photo[], collection: Collection | undefined): Photo[] {
+  if (collection === undefined) return photos
+  const photoIds = new Set(collection.photoIds)
+  return photos.filter(({ id }) => photoIds.has(id))
+}
+
+// The collection's photos come from the feed, not a request of their own: the frame keeps one
+// live list, and an unopened photo, absent from the feed, never plays.
+export function useSourcePhotos(feed: PhotoFeed, source: PhotoSource): SourcePhotos {
+  const { collections, status } = useCollections()
+  const collection = sourceCollection(source, collections)
+  const photos = useMemo(() => photosIn(feed.photos, collection), [feed.photos, collection])
+
+  // Until the list arrives, a deleted collection looks like one still loading.
+  if (source.kind === 'collection' && status === 'loading') {
+    return { photos: [], status: 'loading', source }
+  }
+  // Deleted, or the list failed to load: the frame plays the library rather than nothing.
+  if (collection === undefined) return { ...feed, source: LIBRARY_SOURCE }
+  return { photos, status: feed.status, source }
+}
diff --git a/client/src/pages/FramePage.tsx b/client/src/pages/FramePage.tsx
index b59a940..1aa83c7 100644
--- a/client/src/pages/FramePage.tsx
+++ b/client/src/pages/FramePage.tsx
@@ -5,7 +5,6 @@ import { SlideshowScreen } from '@/components/frame/SlideshowScreen.tsx'
 import { MailRevealDialog } from '@/components/mail/MailRevealDialog.tsx'
 import { type FrameMode, useFrameMode } from '@/hooks/useFrameMode.ts'
 import { useMailReveal } from '@/hooks/useMailReveal.ts'
-import type { FeedStatus } from '@/hooks/usePhotoFeed.ts'
 import { usePhotoMail } from '@/hooks/usePhotoMail.ts'
 import { cn } from '@/lib/utils.ts'
 
@@ -17,9 +16,14 @@ type FrameScreenProps = {
   hasWaitingPhotos: boolean
 }
 
-// Reached only without photos: once loaded, that means an empty library, maybe with mail.
-function frameStatus(status: FeedStatus, hasWaitingPhotos: boolean): FrameStatus {
+// Reached only without photos: once loaded, that means an empty collection, or an empty library
+// maybe with mail.
+function frameStatus(
+  { status, source }: Pick<FrameMode, 'status' | 'source'>,
+  hasWaitingPhotos: boolean,
+): FrameStatus {
   if (status !== 'loaded') return status
+  if (source.kind === 'collection') return 'emptyCollection'
   return hasWaitingPhotos ? 'unopened' : 'empty'
 }
 
@@ -27,7 +31,7 @@ function FrameScreen({ frame, hasWaitingPhotos }: FrameScreenProps): JSX.Element
   if (frame.currentPhoto === undefined) {
     return (
       <FrameStatusScreen
-        status={frameStatus(frame.status, hasWaitingPhotos)}
+        status={frameStatus(frame, hasWaitingPhotos)}
         className={FRAME_CLASSES}
         onLeave={frame.leave}
       />
diff --git a/client/src/photoSource.ts b/client/src/photoSource.ts
new file mode 100644
index 0000000..fb2f0d9
--- /dev/null
+++ b/client/src/photoSource.ts
@@ -0,0 +1,40 @@
+import type { Collection } from '@/collections/collection.ts'
+
+// What the frame plays. Step 11 adds its own kinds (the day's selection, the radio).
+export type PhotoSource = { kind: 'library' } | { kind: 'collection'; collectionId: string }
+
+export const LIBRARY_SOURCE: PhotoSource = { kind: 'library' }
+
+const COLLECTION_KEY_PREFIX = 'collection:'
+
+export function isPhotoSource(value: unknown): value is PhotoSource {
+  if (typeof value !== 'object' || value === null || !('kind' in value)) return false
+  if (value.kind === 'library') return true
+  return (
+    value.kind === 'collection' && 'collectionId' in value && typeof value.collectionId === 'string'
+  )
+}
+
+// Radio and toggle values are strings: one string per source.
+export function sourceKey(source: PhotoSource): string {
+  return source.kind === 'library' ? 'library' : `${COLLECTION_KEY_PREFIX}${source.collectionId}`
+}
+
+export function sourceFromKey(key: string): PhotoSource {
+  if (!key.startsWith(COLLECTION_KEY_PREFIX)) return LIBRARY_SOURCE
+  return { kind: 'collection', collectionId: key.slice(COLLECTION_KEY_PREFIX.length) }
+}
+
+// The key of the source the frame plays: the library when the chosen collection is gone.
+export function playedSourceKey(source: PhotoSource, collections: Collection[]): string {
+  return sourceKey(sourceCollection(source, collections) ? source : LIBRARY_SOURCE)
+}
+
+// undefined plays the library: the source is the library, or its collection was deleted.
+export function sourceCollection(
+  source: PhotoSource,
+  collections: Collection[],
+): Collection | undefined {
+  if (source.kind !== 'collection') return undefined
+  return collections.find(({ id }) => id === source.collectionId)
+}
diff --git a/docs/produit/README.md b/docs/produit/README.md
index 9d8dded..6c0279b 100644
--- a/docs/produit/README.md
+++ b/docs/produit/README.md
@@ -25,7 +25,7 @@ Cette documentation décrit ce que l'application permet de faire et selon quelle
 | **Photo reçue**        | Une photo qu'un ami a envoyée. Elle fait partie de la bibliothèque du destinataire comme les autres et porte la mention « Envoyée par » suivie du nom de l'expéditeur. |
 | **Expéditeur**         | Le membre qui a envoyé une photo reçue.                                                                                                                                |
 | **Collection**         | Une liste de photos de sa bibliothèque, rangées sous un nom (« Noël », « Les vacances »). Elle est privée.                                                             |
-| **Cadre**              | L'affichage plein écran de sa bibliothèque, pensé pour un écran posé chez soi. Il montre toutes les photos du compte connecté.                                         |
+| **Cadre**              | L'affichage plein écran de sa bibliothèque, pensé pour un écran posé chez soi. Il montre toutes les photos du compte connecté, ou celles d'une de ses collections.     |
 | **Diaporama**          | Le mode du cadre qui affiche une photo à la fois, en grand, et passe seul à la suivante.                                                                               |
 | **Modèle d'affichage** | La façon dont le cadre présente chaque photo : ajustée sur un fond flouté, en plein format, dans un passe-partout ou en polaroïd. Chaque appareil garde le sien.       |
 | **Vignette**           | La petite image carrée qui représente une photo dans une grille, une liste ou un bandeau.                                                                              |
diff --git a/docs/produit/a-venir.md b/docs/produit/a-venir.md
index b24e4e5..d4103f9 100644
--- a/docs/produit/a-venir.md
+++ b/docs/produit/a-venir.md
@@ -4,12 +4,6 @@ Fonctionnalités prévues mais pas encore livrées, regroupées par étape. Rien
 
 Les règles ci-dessous décrivent l'intention ; elles recevront leur identifiant définitif à la livraison.
 
-## Étape 10 · Collections
-
-**Prévu**
-
-- Faire passer une collection sur le cadre, en boucle ou en ordre aléatoire.
-
 ## Étape 11 · Sélections automatiques
 
 **Prévu**
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index 76158a0..7c325e8 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -24,7 +24,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 10. R-BIB-09 · Les informations cachées de la photo, dont le lieu de prise de vue, sont retirées à l'ajout : elles ne sont jamais conservées ni montrées.
 11. R-BIB-10 · Une photo ajoutée porte la date et l'heure de son ajout. La date de prise de vue n'est pas utilisée.
 12. R-BIB-11 · Pendant l'envoi, les deux boutons sont désactivés et le premier affiche « Envoi… ».
-13. R-BIB-12 · Après un ajout réussi, le formulaire se vide, un message de réussite s'affiche, et la photo apparaît en tête de la bibliothèque et sur le cadre, sur tous les appareils connectés au compte, sans recharger la page.
+13. R-BIB-12 · Après un ajout réussi, le formulaire se vide, un message de réussite s'affiche, et la photo apparaît en tête de la bibliothèque et sur le cadre qui lit toute la bibliothèque, sur tous les appareils connectés au compte, sans recharger la page.
 14. R-BIB-13 · Après un échec, la photo reste choisie dans le formulaire et un message explique la raison.
 
 **Messages affichés**
diff --git a/docs/produit/cadre.md b/docs/produit/cadre.md
index 496cb32..2505b4f 100644
--- a/docs/produit/cadre.md
+++ b/docs/produit/cadre.md
@@ -1,6 +1,6 @@
 # Cadre
 
-Le cadre est la page à laisser affichée en plein écran sur l'appareil posé chez soi (tablette, vieil ordinateur, télévision). Il montre toutes les photos de la bibliothèque du compte connecté (voir [bibliotheque.md](bibliotheque.md)) et reçoit les nouvelles en direct. On l'ouvre avec l'entrée « Cadre » de la barre du haut, ou avec « Mode cadre » depuis la bibliothèque ou une photo ouverte : il passe alors en plein écran. Il n'affiche que le diaporama (une photo à la fois) ; les vignettes et la liste sont dans la bibliothèque.
+Le cadre est la page à laisser affichée en plein écran sur l'appareil posé chez soi (tablette, vieil ordinateur, télévision). Il montre toutes les photos de la bibliothèque du compte connecté (voir [bibliotheque.md](bibliotheque.md)), ou celles d'une de ses collections (voir [collections.md](collections.md)), et reçoit les nouvelles en direct. On l'ouvre avec l'entrée « Cadre » de la barre du haut, ou avec « Mode cadre » depuis la bibliothèque ou une photo ouverte : il passe alors en plein écran. Il n'affiche que le diaporama (une photo à la fois) ; les vignettes et la liste sont dans la bibliothèque.
 
 ## Mettre en place un cadre
 
@@ -17,14 +17,14 @@ Le cadre est la page à laisser affichée en plein écran sur l'appareil posé c
 1. R-CAD-01 · Un cadre affiche les photos d'un seul compte : celui qui y est connecté.
 2. R-CAD-02 · Le cadre est toujours sombre, quel que soit le thème choisi, pour mettre les photos en valeur.
 3. R-CAD-03 · Le cadre occupe toute la page : la barre du haut et les menus de l'application n'y sont pas affichés.
-4. R-CAD-04 · Le cadre affiche toutes les photos de la bibliothèque, des plus récentes aux plus anciennes, sans limite de nombre : les anciennes photos ne disparaissent jamais du cadre.
+4. R-CAD-04 · Le cadre affiche toutes les photos de la bibliothèque, ou de la collection choisie (R-CAD-77), des plus récentes aux plus anciennes, sans limite de nombre : les anciennes photos ne disparaissent jamais du cadre.
 5. R-CAD-05 · Le cadre recharge toutes ses photos une fois par jour. Cela garde sa connexion active (voir [comptes-et-connexion.md](comptes-et-connexion.md#rester-connecté)) : un cadre allumé en continu ne se déconnecte jamais.
 6. R-CAD-06 · Un cadre rallumé alors que le réseau n'est pas encore prêt attend et réessaie seul toutes les 5 secondes, sans afficher la page de connexion (R-CNX-16).
 7. R-CAD-07 · Si sa connexion au compte a expiré ou a été fermée, le cadre revient à la page de connexion : il faut se reconnecter sur l'appareil.
 8. R-CAD-08 · Remplacée : le cadre distingue désormais le chargement de la bibliothèque vide ; seul le message « bibliothèque vide » montre l'adresse du site (R-CAD-55).
 9. R-CAD-53 · Le cadre n'affiche que le diaporama : les vignettes et la liste sont dans la bibliothèque.
 10. R-CAD-54 · Le diaporama ne démarre plus de lui-même après une minute : il est déjà la seule vue du cadre.
-11. R-CAD-55 · Sans photo à montrer, le cadre dit pourquoi : chargement en cours, aucune photo encore, ou chargement impossible ; il réessaie tout seul quand la connexion revient.
+11. R-CAD-55 · Sans photo à montrer, le cadre dit pourquoi : chargement en cours, aucune photo encore, collection lue vide (R-CAD-82), ou chargement impossible ; il réessaie tout seul quand la connexion revient.
 12. R-CAD-56 · Un bouton « Retour à la bibliothèque » permet toujours de sortir du cadre.
 13. R-CAD-57 · Lancé depuis une photo, le diaporama commence par cette photo.
 14. R-CAD-58 · Ouvert depuis l'application (« Cadre » dans la barre du haut, « Mode cadre » dans la bibliothèque ou sur une photo ouverte), le cadre passe en plein écran. Sur un appareil qui ne le permet pas (iPhone), ou si le navigateur le refuse, le cadre s'affiche dans la page, sans message.
@@ -75,6 +75,7 @@ Le cadre n'a plus de vue bibliothèque : voir R-CAD-53. Les règles ci-dessous g
 - Choisir la vitesse : 5 s, 10 s ou 20 s par photo (menu « … », « Vitesse ») ; l'appareil la retient.
 - Choisir l'ordre de lecture : « Dans l'ordre » (des plus récentes aux plus anciennes) ou « Aléatoire » (menu « … », « Lecture ») ; l'appareil le retient.
 - Faire ces mêmes réglages depuis la page « Préférences », encart « Cadre de cet appareil » (voir [preferences.md](preferences.md#cadre-de-cet-appareil)).
+- Choisir les photos lues : toute la bibliothèque ou une collection (menu « … », « Photos ») ; l'appareil le retient (voir [Choisir les photos du cadre](#choisir-les-photos-du-cadre)).
 - Afficher ou masquer un bandeau de vignettes (« Vignettes ») et toucher une vignette pour aller à cette photo.
 - Envoyer la photo affichée à un ami, la ranger dans ses collections ou la supprimer (menu « … »).
 - Quitter le mode cadre (bouton ✕, touche Échap ou sortie du plein écran) pour revenir à la bibliothèque, sur la photo affichée.
@@ -108,6 +109,7 @@ Le cadre n'a plus de vue bibliothèque : voir R-CAD-53. Les règles ci-dessous g
 | Situation                                  | Message                                                                                                                      |
 | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
 | Légende d'une photo                        | « [date] » et, pour une photo reçue, « Envoyée par [nom] » puis son message entre guillemets, sur trois lignes au plus       |
+| Choix des photos                           | « Photos » : « Toute la bibliothèque », puis le nom de chaque collection                                                     |
 | Choix du modèle                            | « Affichage » : « Ajusté », « Plein format », « Passe-partout », « Polaroïd »                                                |
 | Choix de l'ordre                           | « Lecture » : « Dans l'ordre », « Aléatoire »                                                                                |
 | Choix de vitesse                           | « Vitesse » : « 5 s », « 10 s », « 20 s »                                                                                    |
@@ -118,11 +120,38 @@ Le cadre n'a plus de vue bibliothèque : voir R-CAD-53. Les règles ci-dessous g
 - Choisir une autre vitesse que 5, 10 ou 20 secondes.
 - Retrouver ses réglages sur un autre appareil ou dans un autre navigateur : chaque appareil garde les siens.
 
+## Choisir les photos du cadre
+
+**Ce que l'on peut faire**
+
+- Dans le menu « … » du diaporama, « Photos », choisir « Toute la bibliothèque » ou l'une de ses collections.
+
+**Règles**
+
+1. R-CAD-77 · Le cadre lit toute la bibliothèque (par défaut) ou une seule collection. Le choix est retenu sur l'appareil, comme la vitesse (R-CAD-62, R-CAD-63).
+2. R-CAD-78 · Une collection se lit comme la bibliothèque : des plus récentes aux plus anciennes et en boucle, ou en ordre aléatoire, selon « Lecture » ; avec la même vitesse et le même modèle d'affichage.
+3. R-CAD-79 · Changer de photos fait repartir le diaporama de la photo la plus récente du nouveau choix ; en « Aléatoire », un nouveau mélange commence.
+4. R-CAD-80 · Une photo rangée dans la collection lue, ou retirée, depuis cet appareil ou un autre, entre dans le diaporama ou en sort en quelques instants, sans recharger. Une photo ajoutée à la bibliothèque n'arrive sur le cadre que si elle est rangée dans la collection lue.
+5. R-CAD-81 · Si la collection lue est supprimée, le cadre repasse à toute la bibliothèque. Si les collections n'ont pas pu être chargées, il lit toute la bibliothèque en attendant, puis passe à la collection dès qu'elles arrivent.
+6. R-CAD-82 · Une collection vide ne repasse pas à la bibliothèque : le cadre dit qu'elle est vide, avec le bouton « Retour à la bibliothèque » (R-CAD-56).
+7. R-CAD-83 · Lancé depuis une photo qui n'est pas dans la collection lue, le diaporama commence par la photo la plus récente de la collection (exception à R-CAD-57).
+
+**Messages affichés**
+
+| Situation       | Message                                                                           |
+| --------------- | --------------------------------------------------------------------------------- |
+| Collection vide | « Cette collection est vide. » — « Ajoutez-y des photos depuis la bibliothèque. » |
+
+**Ce qui n'est pas possible**
+
+- Lire plusieurs collections à la fois.
+- Garder le choix d'une collection sur un autre appareil : chaque appareil garde le sien.
+
 ## Arrivée d'une nouvelle photo
 
 **Ce que l'on peut faire**
 
-- Voir une photo ajoutée depuis un téléphone, ou découverte sur un autre appareil, arriver sur le cadre en quelques instants, sans recharger.
+- Voir une photo ajoutée depuis un téléphone, ou découverte sur un autre appareil, arriver sur le cadre en quelques instants, sans recharger (quand il lit toute la bibliothèque, R-CAD-80).
 - Quand quelqu'un regarde le cadre, aller à la nouvelle photo en touchant la pastille « 1 nouvelle photo ».
 
 **Règles**
@@ -133,7 +162,7 @@ Le cadre n'a plus de vue bibliothèque : voir R-CAD-53. Les règles ci-dessous g
 4. R-CAD-43 · Remplacée : le cadre n'a plus de vue bibliothèque (R-CAD-53).
 5. R-CAD-44 · La pastille additionne les photos arrivées tant qu'elle n'a pas été touchée.
 6. R-CAD-45 · Une photo supprimée depuis un autre appareil disparaît du cadre en quelques instants, sans recharger.
-7. R-CAD-76 · Une photo envoyée par un ami ne s'affiche pas à son arrivée : elle attend d'être découverte (voir [Photos reçues en attente](#photos-reçues-en-attente)). Découverte sur un autre appareil, elle entre dans le diaporama à sa date de réception ; si c'est la plus récente, les règles d'arrivée ci-dessus s'appliquent.
+7. R-CAD-76 · Une photo envoyée par un ami ne s'affiche pas à son arrivée : elle attend d'être découverte (voir [Photos reçues en attente](#photos-reçues-en-attente)). Découverte sur un autre appareil, elle entre dans le diaporama à sa date de réception, quand il lit toute la bibliothèque (R-CAD-80) ; si c'est la plus récente, les règles d'arrivée ci-dessus s'appliquent.
 
 **Messages affichés**
 
@@ -157,7 +186,7 @@ Le cadre n'a plus de vue bibliothèque : voir R-CAD-53. Les règles ci-dessous g
 
 1. R-CAD-72 · Tant qu'au moins une photo reçue attend, une pastille blanche, marquée d'une enveloppe, s'affiche en haut au centre du cadre, même quand personne ne l'utilise. Elle se place au-dessus de la pastille des nouvelles photos, sans la cacher, et se met à jour seule.
 2. R-CAD-73 · Toucher la pastille lance la découverte, comme dans la bibliothèque (voir [partage.md](partage.md#recevoir-une-photo), R-PAR-53 et R-PAR-54). Le diaporama s'arrête pendant ce temps.
-3. R-CAD-74 · Après « Terminer » ou la fermeture, le diaporama repart de la photo la plus récente. Les photos découvertes y sont déjà, à leur date de réception : la pastille des nouvelles photos ne les annonce pas.
+3. R-CAD-74 · Après « Terminer » ou la fermeture, le diaporama repart de la photo la plus récente. Les photos découvertes y sont déjà, à leur date de réception, quand il lit toute la bibliothèque (R-CAD-80) : la pastille des nouvelles photos ne les annonce pas.
 4. R-CAD-75 · Sans aucune photo dans la bibliothèque mais avec des photos en attente, le cadre affiche « Des photos vous attendent. » sous la pastille.
 
 **Messages affichés**
diff --git a/docs/produit/collections.md b/docs/produit/collections.md
index ad40339..8cbb66e 100644
--- a/docs/produit/collections.md
+++ b/docs/produit/collections.md
@@ -16,26 +16,26 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 2. R-COL-02 · Deux collections d'un même compte ne portent pas le même nom. Les majuscules et les accents comptent : « noël » et « Noël » sont deux noms différents. Renommer une collection sous le nom qu'elle porte déjà est permis.
 3. R-COL-03 · Les collections sont classées par ordre alphabétique (« Été » avant « Noël »).
 4. R-COL-04 · Une collection créée depuis la carte « Mes collections » est vide ; créée depuis le menu « … » d'une photo, elle contient cette photo.
-5. R-COL-05 · Supprimer une collection demande une confirmation ; « Annuler » ferme la fenêtre sans rien changer. Ses photos restent dans la bibliothèque.
+5. R-COL-05 · Supprimer une collection demande une confirmation ; « Annuler » ferme la fenêtre sans rien changer. Ses photos restent dans la bibliothèque ; un cadre qui la lisait repasse à toute la bibliothèque (R-CAD-81).
 6. R-COL-06 · Une collection créée, renommée ou supprimée l'est aussitôt sur tous les appareils connectés au compte, sans recharger la page.
 7. R-COL-07 · Les collections sont privées : personne d'autre ne les voit, pas même les amis.
 
 **Messages affichés**
 
-| Situation                     | Message                                                                                                                                            |
-| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
-| En-tête de la carte           | « Mes collections » — « Rangez vos photos par thème : Noël, les vacances, le jardin… » et le bouton « Nouvelle collection »                        |
-| Aucune collection             | « Aucune collection pour l'instant. »                                                                                                              |
-| Chargement                    | « Chargement… »                                                                                                                                    |
-| Chargement impossible         | « Vos collections n'ont pas pu être chargées. »                                                                                                    |
-| Nombre de photos              | « Aucune photo », « 1 photo », « 12 photos »                                                                                                       |
-| Création                      | « Nouvelle collection » — « Donnez-lui un nom, puis rangez-y vos photos depuis leur menu « … ». » Champ « Nom de la collection », bouton « Créer » |
-| Renommage                     | « Renommer la collection » — « Le nouveau nom s'affiche partout, sur tous vos appareils. » Champ « Nom de la collection », bouton « Renommer »     |
-| Enregistrement en cours       | « Enregistrement… »                                                                                                                                |
-| Nom vide ou trop long         | « Choisissez un nom de 1 à 50 caractères. »                                                                                                        |
-| Nom déjà pris                 | « Vous avez déjà une collection de ce nom. »                                                                                                       |
-| Collection supprimée ailleurs | « Cette collection n'existe plus. »                                                                                                                |
-| Confirmation de suppression   | « Supprimer la collection « Noël » ? » — « Les photos restent dans votre bibliothèque. » Boutons « Annuler » et « Supprimer »                      |
+| Situation                     | Message                                                                                                                                                                               |
+| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| En-tête de la carte           | « Mes collections » — « Rangez vos photos par thème : Noël, les vacances, le jardin… » et le bouton « Nouvelle collection »                                                           |
+| Aucune collection             | « Aucune collection pour l'instant. »                                                                                                                                                 |
+| Chargement                    | « Chargement… »                                                                                                                                                                       |
+| Chargement impossible         | « Vos collections n'ont pas pu être chargées. »                                                                                                                                       |
+| Nombre de photos              | « Aucune photo », « 1 photo », « 12 photos »                                                                                                                                          |
+| Création                      | « Nouvelle collection » — « Donnez-lui un nom, puis rangez-y vos photos depuis leur menu « … ». » Champ « Nom de la collection », bouton « Créer »                                    |
+| Renommage                     | « Renommer la collection » — « Le nouveau nom s'affiche partout, sur tous vos appareils. » Champ « Nom de la collection », bouton « Renommer »                                        |
+| Enregistrement en cours       | « Enregistrement… »                                                                                                                                                                   |
+| Nom vide ou trop long         | « Choisissez un nom de 1 à 50 caractères. »                                                                                                                                           |
+| Nom déjà pris                 | « Vous avez déjà une collection de ce nom. »                                                                                                                                          |
+| Collection supprimée ailleurs | « Cette collection n'existe plus. »                                                                                                                                                   |
+| Confirmation de suppression   | « Supprimer la collection « Noël » ? » — « Les photos restent dans votre bibliothèque. Un cadre qui la lisait repasse à toute la bibliothèque. » Boutons « Annuler » et « Supprimer » |
 
 **Ce qui n'est pas possible**
 
@@ -50,6 +50,7 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 - Dans le menu « … » d'une photo (bibliothèque, photo ouverte en grand ou diaporama), ouvrir « Collections » : une case par collection, cochée quand la photo y est.
 - Cocher une case pour ranger la photo dans cette collection, la décocher pour l'en retirer. Le menu reste ouvert : on peut cocher plusieurs cases à la suite.
 - Choisir « Nouvelle collection… » pour créer une collection et y ranger aussitôt la photo.
+- Faire passer une collection sur le cadre, en boucle ou en ordre aléatoire (voir [cadre.md](cadre.md#choisir-les-photos-du-cadre)).
 
 **Règles**
 
@@ -72,4 +73,4 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 
 - Ranger plusieurs photos d'un coup.
 - Changer l'ordre des photos dans une collection.
-- Voir les photos d'une collection en dehors du cadre.
+- Voir les photos d'une collection ailleurs que sur le cadre.
diff --git a/docs/produit/partage.md b/docs/produit/partage.md
index cf4229d..299073a 100644
--- a/docs/produit/partage.md
+++ b/docs/produit/partage.md
@@ -121,7 +121,7 @@ Ceux du panneau d'envoi (voir [Choisir à qui envoyer](#choisir-à-qui-envoyer))
 13. R-PAR-54 · Une photo compte comme découverte dès qu'elle s'affiche, pour tous les appareils du destinataire. Fermer avant la fin, avec la croix ou la touche Échap, laisse les photos suivantes en attente.
 14. R-PAR-55 · Une fois découverte, la photo entre dans la bibliothèque à sa date de réception, sur tous les appareils connectés, sans recharger : elle n'est en tête que si rien n'a été ajouté depuis.
 15. R-PAR-56 · L'expéditeur ne voit aucun changement sur ses propres écrans et ne sait pas si la photo a été découverte.
-16. R-PAR-57 · Sur le cadre, une pastille annonce aussi les photos en attente et lance la même découverte ; une fois découvertes, elles entrent dans le diaporama (voir [cadre.md](cadre.md#photos-reçues-en-attente)).
+16. R-PAR-57 · Sur le cadre, une pastille annonce aussi les photos en attente et lance la même découverte ; une fois découvertes, elles entrent dans le diaporama quand il lit toute la bibliothèque (voir [cadre.md](cadre.md#photos-reçues-en-attente)).
 
 **Messages affichés**
 
~~~~

- [ ] **Step 2: Gates and commit**

`pnpm check:fix && pnpm typecheck && pnpm build && pnpm test`. `a-venir.md` no longer has an « Étape 10 » section. Subject: `feat(client): play a collection on the frame`.

### Task 7: Choose the frame photos from the preferences and the collections (PR C, `feat/collections-frame`)

**Files:**
- Modify: `client/src/frameSettings.ts` (`writeFrameSettings` answers whether it saved), `client/src/components/collections/CollectionRow.tsx`, `client/src/components/settings/{FrameSettingsCard, SettingToggleGroup}.tsx`, `docs/produit/{cadre, collections, preferences}.md`, `ARCHITECTURE.md`

**Interfaces:** `writeFrameSettings(settings): boolean`; `usePlayOnFrame(collectionId): () => void` (local to `CollectionRow.tsx`; on `false`, a toast and no navigation); `SourceToggleGroup({ settings })` (local to `FrameSettingsCard.tsx`).

- [ ] **Step 1: The code and the docs.** The whole commit:

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 8da05cb..8b9e78c 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -43,15 +43,15 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 
 ## Pages
 
-| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
-| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
-| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
-| `/`                  | bibliothèque : en tête, quand des photos reçues attendent, l'annonce « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la carte d'envoi (« Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui n'envoie le fichier qu'à l'ami), puis « Mes collections » (`components/collections/` : « Nouvelle collection », une ligne par collection avec son nombre de photos et un menu « … » « Renommer » / « Supprimer »), puis les photos du compte en vignettes ou en liste (choix mémorisé par appareil), « Mode cadre » à côté du choix vignettes/liste lance le diaporama, 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/`) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
-| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), ou d'une de ses collections, avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                      |
-| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
-| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
-| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
+| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
+| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
+| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
+| `/`                  | bibliothèque : en tête, quand des photos reçues attendent, l'annonce « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la carte d'envoi (« Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui n'envoie le fichier qu'à l'ami), puis « Mes collections » (`components/collections/` : « Nouvelle collection », une ligne par collection avec son nombre de photos et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer »), puis les photos du compte en vignettes ou en liste (choix mémorisé par appareil), « Mode cadre » à côté du choix vignettes/liste lance le diaporama, 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/`) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
+| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), ou d'une de ses collections, avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                                 |
+| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
+| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
+| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
 
 Visionneuse : l'adresse `/?photo=<id>` ouvre la photo, un lien la partage. Ouvrir depuis la bibliothèque ajoute une entrée d'historique, passer d'une photo à l'autre la remplace, et fermer revient en arrière : le bouton retour d'Android ferme la visionneuse. Près de la fin des photos chargées, la page suivante se charge. Une photo supprimée pendant qu'on la regarde laisse sa place à la suivante (la précédente si c'était la plus ancienne), et la visionneuse se ferme quand il n'en reste aucune ; un lien vers une photo inconnue charge les pages jusqu'à la trouver, puis ferme s'il n'y en a plus. « Mode cadre » remplace l'entrée de la visionneuse (ou s'ajoute au-dessus de la bibliothèque depuis son en-tête) : quitter le cadre ramène une seule visionneuse, et le retour arrière la bibliothèque. Le lien « Cadre » de la barre ajoute une entrée d'historique ordinaire : c'est aussi l'adresse qu'un cadre ouvre au démarrage.
 
diff --git a/client/src/components/collections/CollectionRow.tsx b/client/src/components/collections/CollectionRow.tsx
index 63b9ffd..6bdaf6f 100644
--- a/client/src/components/collections/CollectionRow.tsx
+++ b/client/src/components/collections/CollectionRow.tsx
@@ -1,5 +1,7 @@
-import { EllipsisIcon, PencilIcon, Trash2Icon } from 'lucide-react'
+import { EllipsisIcon, MonitorIcon, PencilIcon, Trash2Icon } from 'lucide-react'
 import { type JSX, type RefObject, useRef, useState } from 'react'
+import { useNavigate } from 'react-router'
+import { toast } from 'sonner'
 import type { Collection } from '@/collections/collection.ts'
 import { CollectionNameDialog } from '@/components/collections/CollectionNameDialog.tsx'
 import { DeleteCollectionDialog } from '@/components/collections/DeleteCollectionDialog.tsx'
@@ -10,14 +12,21 @@ import {
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu.tsx'
+import { type FrameSettings, readFrameSettings, writeFrameSettings } from '@/frameSettings.ts'
+import { enterFullscreen } from '@/fullscreen.ts'
+import { LIBRARY_BELOW_STATE } from '@/viewerHistory.ts'
 
 type RowDialog = 'rename' | 'delete' | null
 
+const UNSAVED_SOURCE_MESSAGE =
+  'Cet appareil ne peut pas retenir ce choix. Choisissez la collection depuis le menu « … » du cadre.'
+
 type CollectionRowProps = { collection: Collection; onDeleted: () => void }
 
 type CollectionMenuProps = {
   name: string
   onSelect: (dialog: RowDialog) => void
+  onPlay: () => void
   triggerRef: RefObject<HTMLButtonElement | null>
 }
 
@@ -34,7 +43,26 @@ function photoCountLabel(count: number): string {
   return count === 1 ? '1 photo' : `${count} photos`
 }
 
-function CollectionMenu({ name, onSelect, triggerRef }: CollectionMenuProps): JSX.Element {
+// The frame reads its settings as it opens: the choice is stored first. A device that cannot store
+// it would open the frame on its old photos, so the frame stays closed. Full screen comes from the
+// click itself, browsers grant it only during a gesture.
+function usePlayOnFrame(collectionId: string): () => void {
+  const navigate = useNavigate()
+  return () => {
+    const settings: FrameSettings = {
+      ...readFrameSettings(),
+      source: { kind: 'collection', collectionId },
+    }
+    if (!writeFrameSettings(settings)) {
+      toast.error(UNSAVED_SOURCE_MESSAGE)
+      return
+    }
+    enterFullscreen()
+    navigate('/frame', { state: LIBRARY_BELOW_STATE })
+  }
+}
+
+function CollectionMenu({ name, onSelect, onPlay, triggerRef }: CollectionMenuProps): JSX.Element {
   return (
     <DropdownMenu>
       <DropdownMenuTrigger asChild>
@@ -43,6 +71,10 @@ function CollectionMenu({ name, onSelect, triggerRef }: CollectionMenuProps): JS
         </Button>
       </DropdownMenuTrigger>
       <DropdownMenuContent align="end">
+        <DropdownMenuItem onSelect={onPlay}>
+          <MonitorIcon />
+          Lire sur le cadre
+        </DropdownMenuItem>
         <DropdownMenuItem onSelect={() => onSelect('rename')}>
           <PencilIcon />
           Renommer
@@ -83,6 +115,7 @@ function RowDialogs({ collection, dialog, onClose, ...props }: RowDialogsProps):
 export function CollectionRow({ collection, onDeleted }: CollectionRowProps): JSX.Element {
   const [dialog, setDialog] = useState<RowDialog>(null)
   const triggerRef = useRef<HTMLButtonElement>(null)
+  const playOnFrame = usePlayOnFrame(collection.id)
 
   return (
     <li className="flex items-center justify-between gap-3 px-4 py-3">
@@ -92,7 +125,12 @@ export function CollectionRow({ collection, onDeleted }: CollectionRowProps): JS
           {photoCountLabel(collection.photoIds.length)}
         </span>
       </div>
-      <CollectionMenu name={collection.name} onSelect={setDialog} triggerRef={triggerRef} />
+      <CollectionMenu
+        name={collection.name}
+        onSelect={setDialog}
+        onPlay={playOnFrame}
+        triggerRef={triggerRef}
+      />
       <RowDialogs
         collection={collection}
         onDeleted={onDeleted}
diff --git a/client/src/components/settings/FrameSettingsCard.tsx b/client/src/components/settings/FrameSettingsCard.tsx
index 86038f0..103f928 100644
--- a/client/src/components/settings/FrameSettingsCard.tsx
+++ b/client/src/components/settings/FrameSettingsCard.tsx
@@ -1,16 +1,33 @@
 import type { JSX } from 'react'
+import { useCollections } from '@/collections/CollectionsContext.ts'
 import {
   INTERVAL_OPTIONS,
   ORDER_OPTIONS,
+  sourceOptions,
   TEMPLATE_OPTIONS,
 } from '@/components/frame/frameSettingOptions.ts'
 import { SettingToggleGroup } from '@/components/settings/SettingToggleGroup.tsx'
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
 import { type FrameSettingsControls, useFrameSettings } from '@/hooks/useFrameSettings.ts'
+import { playedSourceKey, sourceFromKey } from '@/photoSource.ts'
+
+// What the frame plays, as in its menu: the library or one collection.
+function SourceToggleGroup({ settings }: { settings: FrameSettingsControls }): JSX.Element {
+  const { collections } = useCollections()
+  return (
+    <SettingToggleGroup
+      label="Photos"
+      options={sourceOptions(collections)}
+      value={playedSourceKey(settings.source, collections)}
+      onValueChange={(key) => settings.onSourceChange(sourceFromKey(key))}
+    />
+  )
+}
 
 function FrameSettingsGroups({ settings }: { settings: FrameSettingsControls }): JSX.Element {
   return (
     <>
+      <SourceToggleGroup settings={settings} />
       <SettingToggleGroup
         label="Affichage"
         options={TEMPLATE_OPTIONS}
diff --git a/client/src/components/settings/SettingToggleGroup.tsx b/client/src/components/settings/SettingToggleGroup.tsx
index c80e3e9..1bd82b7 100644
--- a/client/src/components/settings/SettingToggleGroup.tsx
+++ b/client/src/components/settings/SettingToggleGroup.tsx
@@ -1,10 +1,14 @@
 import { type JSX, useId } from 'react'
 import { optionSelector, type SettingOption } from '@/components/frame/frameSettingOptions.ts'
 import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'
+import { cn } from '@/lib/utils.ts'
 
 // The muted pressed background barely shows on the dark card: the chosen item is inverted.
-const ITEM_CLASSES =
-  'data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:hover:bg-foreground/90'
+// A collection's name can be long: the item grows and wraps instead of leaving the card.
+const ITEM_CLASSES = cn(
+  'data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:hover:bg-foreground/90',
+  'h-auto min-h-8 shrink py-1 whitespace-normal wrap-anywhere',
+)
 
 type SettingToggleGroupProps<Value extends string | number> = {
   label: string
diff --git a/client/src/frameSettings.ts b/client/src/frameSettings.ts
index c69f55c..d07b098 100644
--- a/client/src/frameSettings.ts
+++ b/client/src/frameSettings.ts
@@ -65,10 +65,13 @@ export function readFrameSettings(): FrameSettings {
   }
 }
 
-export function writeFrameSettings(settings: FrameSettings): void {
+// Answers whether the device remembered the settings.
+export function writeFrameSettings(settings: FrameSettings): boolean {
   try {
     localStorage.setItem(FRAME_SETTINGS_KEY, JSON.stringify(settings))
+    return true
   } catch (_error: unknown) {
     // Not remembered on this device: the choice holds until the page closes.
+    return false
   }
 }
diff --git a/docs/produit/cadre.md b/docs/produit/cadre.md
index 2505b4f..9611b2c 100644
--- a/docs/produit/cadre.md
+++ b/docs/produit/cadre.md
@@ -125,6 +125,8 @@ Le cadre n'a plus de vue bibliothèque : voir R-CAD-53. Les règles ci-dessous g
 **Ce que l'on peut faire**
 
 - Dans le menu « … » du diaporama, « Photos », choisir « Toute la bibliothèque » ou l'une de ses collections.
+- Faire ce choix depuis la page « Préférences », encart « Cadre de cet appareil » (voir [preferences.md](preferences.md#cadre-de-cet-appareil)).
+- Depuis la carte « Mes collections » de la bibliothèque, choisir « Lire sur le cadre » dans le menu « … » d'une collection : le cadre s'ouvre en plein écran sur elle (voir [collections.md](collections.md)).
 
 **Règles**
 
diff --git a/docs/produit/collections.md b/docs/produit/collections.md
index 8cbb66e..56a962f 100644
--- a/docs/produit/collections.md
+++ b/docs/produit/collections.md
@@ -8,7 +8,7 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 
 - Dans la carte « Mes collections » de la bibliothèque, créer une collection avec « Nouvelle collection ».
 - Voir ses collections, chacune avec son nom et son nombre de photos.
-- Depuis le menu « … » d'une collection, la renommer ou la supprimer.
+- Depuis le menu « … » d'une collection, la lire sur le cadre de cet appareil, la renommer ou la supprimer.
 
 **Règles**
 
@@ -19,23 +19,26 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 5. R-COL-05 · Supprimer une collection demande une confirmation ; « Annuler » ferme la fenêtre sans rien changer. Ses photos restent dans la bibliothèque ; un cadre qui la lisait repasse à toute la bibliothèque (R-CAD-81).
 6. R-COL-06 · Une collection créée, renommée ou supprimée l'est aussitôt sur tous les appareils connectés au compte, sans recharger la page.
 7. R-COL-07 · Les collections sont privées : personne d'autre ne les voit, pas même les amis.
+8. R-COL-14 · « Lire sur le cadre » ouvre le cadre en plein écran sur cette collection ; l'appareil retient ce choix (voir [cadre.md](cadre.md#choisir-les-photos-du-cadre), R-CAD-77). Si l'appareil ne peut rien retenir (navigateur qui bloque les données des sites), le cadre ne s'ouvre pas : un message invite à choisir la collection depuis le menu « … » du cadre.
 
 **Messages affichés**
 
-| Situation                     | Message                                                                                                                                                                               |
-| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| En-tête de la carte           | « Mes collections » — « Rangez vos photos par thème : Noël, les vacances, le jardin… » et le bouton « Nouvelle collection »                                                           |
-| Aucune collection             | « Aucune collection pour l'instant. »                                                                                                                                                 |
-| Chargement                    | « Chargement… »                                                                                                                                                                       |
-| Chargement impossible         | « Vos collections n'ont pas pu être chargées. »                                                                                                                                       |
-| Nombre de photos              | « Aucune photo », « 1 photo », « 12 photos »                                                                                                                                          |
-| Création                      | « Nouvelle collection » — « Donnez-lui un nom, puis rangez-y vos photos depuis leur menu « … ». » Champ « Nom de la collection », bouton « Créer »                                    |
-| Renommage                     | « Renommer la collection » — « Le nouveau nom s'affiche partout, sur tous vos appareils. » Champ « Nom de la collection », bouton « Renommer »                                        |
-| Enregistrement en cours       | « Enregistrement… »                                                                                                                                                                   |
-| Nom vide ou trop long         | « Choisissez un nom de 1 à 50 caractères. »                                                                                                                                           |
-| Nom déjà pris                 | « Vous avez déjà une collection de ce nom. »                                                                                                                                          |
-| Collection supprimée ailleurs | « Cette collection n'existe plus. »                                                                                                                                                   |
-| Confirmation de suppression   | « Supprimer la collection « Noël » ? » — « Les photos restent dans votre bibliothèque. Un cadre qui la lisait repasse à toute la bibliothèque. » Boutons « Annuler » et « Supprimer » |
+| Situation                       | Message                                                                                                                                                                               |
+| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| En-tête de la carte             | « Mes collections » — « Rangez vos photos par thème : Noël, les vacances, le jardin… » et le bouton « Nouvelle collection »                                                           |
+| Aucune collection               | « Aucune collection pour l'instant. »                                                                                                                                                 |
+| Chargement                      | « Chargement… »                                                                                                                                                                       |
+| Chargement impossible           | « Vos collections n'ont pas pu être chargées. »                                                                                                                                       |
+| Nombre de photos                | « Aucune photo », « 1 photo », « 12 photos »                                                                                                                                          |
+| Création                        | « Nouvelle collection » — « Donnez-lui un nom, puis rangez-y vos photos depuis leur menu « … ». » Champ « Nom de la collection », bouton « Créer »                                    |
+| Renommage                       | « Renommer la collection » — « Le nouveau nom s'affiche partout, sur tous vos appareils. » Champ « Nom de la collection », bouton « Renommer »                                        |
+| Enregistrement en cours         | « Enregistrement… »                                                                                                                                                                   |
+| Nom vide ou trop long           | « Choisissez un nom de 1 à 50 caractères. »                                                                                                                                           |
+| Nom déjà pris                   | « Vous avez déjà une collection de ce nom. »                                                                                                                                          |
+| Collection supprimée ailleurs   | « Cette collection n'existe plus. »                                                                                                                                                   |
+| Menu d'une collection           | « Lire sur le cadre », « Renommer », « Supprimer »                                                                                                                                    |
+| Choix non retenu par l'appareil | « Cet appareil ne peut pas retenir ce choix. Choisissez la collection depuis le menu « … » du cadre. »                                                                                |
+| Confirmation de suppression     | « Supprimer la collection « Noël » ? » — « Les photos restent dans votre bibliothèque. Un cadre qui la lisait repasse à toute la bibliothèque. » Boutons « Annuler » et « Supprimer » |
 
 **Ce qui n'est pas possible**
 
@@ -50,7 +53,7 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 - Dans le menu « … » d'une photo (bibliothèque, photo ouverte en grand ou diaporama), ouvrir « Collections » : une case par collection, cochée quand la photo y est.
 - Cocher une case pour ranger la photo dans cette collection, la décocher pour l'en retirer. Le menu reste ouvert : on peut cocher plusieurs cases à la suite.
 - Choisir « Nouvelle collection… » pour créer une collection et y ranger aussitôt la photo.
-- Faire passer une collection sur le cadre, en boucle ou en ordre aléatoire (voir [cadre.md](cadre.md#choisir-les-photos-du-cadre)).
+- Faire passer une collection sur le cadre, en boucle ou en ordre aléatoire : « Lire sur le cadre » dans la carte « Mes collections », « Photos » dans le menu « … » du cadre ou dans les préférences (voir [cadre.md](cadre.md#choisir-les-photos-du-cadre)).
 
 **Règles**
 
diff --git a/docs/produit/preferences.md b/docs/produit/preferences.md
index 850bcda..48b7125 100644
--- a/docs/produit/preferences.md
+++ b/docs/produit/preferences.md
@@ -153,12 +153,12 @@ La page où chacun règle son compte : sa photo de profil, son nom affiché et s
 
 **Ce que l'on peut faire**
 
-- Choisir, pour le cadre de l'appareil utilisé, le modèle d'affichage, l'ordre de lecture et la vitesse, dans l'encart « Cadre de cet appareil ».
+- Choisir, pour le cadre de l'appareil utilisé, les photos lues (toute la bibliothèque ou une collection), le modèle d'affichage, l'ordre de lecture et la vitesse, dans l'encart « Cadre de cet appareil ».
 
 **Règles**
 
 1. R-PRF-50 · Cet encart n'a pas de bouton « Enregistrer » : chaque choix est retenu aussitôt. Un choix déjà sélectionné le reste quand on le touche de nouveau.
-2. R-PRF-51 · Ces réglages sont ceux du menu « … » du cadre (voir [cadre.md](cadre.md#diaporama), R-CAD-62, R-CAD-66, R-CAD-70) : ils ne valent que pour cet appareil, dans ce navigateur. Changés d'un côté, ils s'appliquent de l'autre.
+2. R-PRF-51 · Ces réglages sont ceux du menu « … » du cadre (voir [cadre.md](cadre.md#diaporama), R-CAD-62, R-CAD-66, R-CAD-70, R-CAD-77) : ils ne valent que pour cet appareil, dans ce navigateur. Changés d'un côté, ils s'appliquent de l'autre.
 3. R-PRF-52 · Un cadre ouvert dans un autre onglet du même navigateur applique un choix aussitôt, sans recharger.
 
 **Messages affichés**
@@ -166,6 +166,7 @@ La page où chacun règle son compte : sa photo de profil, son nom affiché et s
 | Situation         | Message                                                                       |
 | ----------------- | ----------------------------------------------------------------------------- |
 | Titre de l'encart | « Cadre de cet appareil » — « Ces réglages ne concernent que cet appareil. »  |
+| Choix des photos  | « Photos » : « Toute la bibliothèque », puis le nom de chaque collection      |
 | Choix du modèle   | « Affichage » : « Ajusté », « Plein format », « Passe-partout », « Polaroïd » |
 | Choix de l'ordre  | « Lecture » : « Dans l'ordre », « Aléatoire »                                 |
 | Choix de vitesse  | « Vitesse » : « 5 s », « 10 s », « 20 s »                                     |
~~~~

- [ ] **Step 2: Gates and commit**

`pnpm check:fix && pnpm typecheck && pnpm build && pnpm test`. Subject: `feat(client): choose the frame photos from the preferences and the collections`.

---

## Final verification (controller)

- [ ] `pnpm check && pnpm typecheck && pnpm build && pnpm test` on `feat/collections-frame`: green, `Test Files  23 passed (23)`, `Tests  273 passed (273)`.
- [ ] Bruno gate command against a test API on port 3002 started from `feat/collections-frame`: 159 requests, 344 assertions, all passed, twice.
- [ ] Logs carry no PII: the `collection.*` events show ids only, never a name.
- [ ] `git diff 4e3fc8f..feat/collections-frame -- client/package.json server/package.json pnpm-lock.yaml`: empty. No `console.` added in `server/src`; `git grep -n " as " -- server/src client/src` shows no new cast.
- [ ] Manual, with Claude in Chrome (dev client on 5180 against the author's API, never restarted):
  - « Mes collections »: create « Noël » then « Été » (« Été » listed first), « Noël » again → « Vous avez déjà une collection de ce nom. », rename « Été » to « Vacances », delete it (confirmation, « Annuler » first);
  - the « … » menu of a grid photo, « Collections »: tick « Noël », the box stays ticked and the menu open; the card reads « 1 photo », and so does a second tab without reload; same from the viewer and the slideshow menus; untick → « Aucune photo »;
  - « Nouvelle collection… » from a photo menu: the dialog, then « Photo ajoutée à « [nom] ». » and the count « 1 photo »;
  - a received, still unopened photo is not in the grid, so it has no menu; after « Découvrir » it can be filed;
  - « Lire sur le cadre » on « Noël »: the frame opens full screen on its photos only; the slideshow « Photos » shows « Noël » checked; « Toute la bibliothèque » goes back to every photo, from the newest; « Aléatoire » then « Noël » draws a new round;
  - a collection with no photo: « Cette collection est vide. » and « Retour à la bibliothèque »;
  - delete the played collection from another tab: the frame plays the library within a few seconds;
  - the preferences « Photos »: the same choices, and a frame tab follows a change live;
  - a 50-character name without spaces wraps in the card, the submenus and the toggles; nothing scrolls sideways on a phone width.
- [ ] Left to the author (UX walkthrough): ticking several boxes in a row on a touch screen, the card's place on the library page.
- [ ] Clean up the manual test collections from the app: **never** with `pnpm db:seed`.
- [ ] `git log --oneline 4e3fc8f..feat/collections-frame`: one concern per commit, each ending with the attribution lines; no Docker file and no `.env` in `git diff --stat`.
- [ ] Fresh-context review of the whole stack diff (`superpowers:requesting-code-review`), then `gh stack submit --auto` (draft PRs) and `gh stack view --json`.

---

## Drift Log

Format: `date · task/step · what the plan said · what was done · why`.

| Date | Task / step | Plan said | Done | Why |
| ---- | ----------- | --------- | ---- | --- |
| 2026-11-25 | Planning (clone), Task 6 | the empty-collection hint would also say « ou changez la lecture du cadre dans les préférences » once Task 7 lands | the hint stays « Ajoutez-y des photos depuis la bibliothèque. » | the empty screen already offers « Retour à la bibliothèque »; one hint is enough, and Task 7 needs no edit of Task 6's text |
| 2026-11-25 | Planning (clone), Task 6 | the delete dialog's frame sentence in Task 7 | in Task 6 | the behaviour (a deleted played collection falls back to the library) is Task 6's: its words go with it |
| 2026-11-25 | Planning (review), Task 6 | the restart ran on any played-source change | the first source known after loading is no change (`key: null` while loading) | review: a deleted stored collection resolved after loading dropped the `/frame?photo=<id>` start photo (R-CAD-57) |
| 2026-11-25 | Planning (review), Task 6 | R-CAD-74, R-CAD-76, R-PAR-57, R-BIB-12 untouched | each says « quand il lit toute la bibliothèque » | review: those rules said every added or discovered photo joins the frame, false while a collection plays |
| 2026-11-25 | Planning (review), Task 6 | the « Photos » bullet before the preferences line in `cadre.md` | after it | review: before Task 7 the preferences have no « Photos » toggle |
| 2026-11-25 | Planning (review), Task 2 | remove = read, filter, unconditional `set` (lost update accepted) | conditional `set` on the list read, one re-read and retry, 500 after a second miss; two more unit tests (270 → 272) | controller: an add from another device between the read and the write was silently lost |
| 2026-11-25 | Planning (review), Task 6 | the shuffle round drawn from `selection.currentId` in the render of a source change | drawn from the newest photo of the new source (`useRestartOnSourceChange` returns it) | review: the round started on the old photo, skipping some until it wrapped |
| 2026-11-25 | Planning (review), Task 4 | focus after a deletion fell to `body` | focus goes to « Nouvelle collection » | review: the row and its menu button are unmounted |
| 2026-11-25 | Planning (review), Task 2 | the photo id compared as sent | lowercased after `parsePhotoId`, in add and remove; one unit test with a capitalised id (272 → 273) | review: an id sent in capitals never matched the stored lowercase id, so remove answered « already absent » |
| 2026-11-25 | Planning (review), Task 1 | `OBJECT_ID_PATTERN` redeclared in `collections.service.ts` | imported from `photos.input.ts` | review: one pattern for every ObjectId check |
| 2026-11-25 | Planning (review), Task 2 | no Bruno case for removing from a foreign collection | `photos/11-edge-retrait-autre-compte.bru` (404 `COLLECTION_NOT_FOUND`, the photo stays), the removal cases move to 12-14 (158/342 → 159/344) | review: the add had that edge case, the remove did not |
| 2026-11-25 | Planning (review), Tasks 5 and 6 | submenus capped in width only | `max-h-(--radix-dropdown-menu-content-available-height) overflow-y-auto` on the « Photos » and « Collections » submenus | review: a long list of collections was cut at the screen edge |
| 2026-11-25 | Planning (review), Task 6 | R-CAD-55 listed loading, no photo yet and loading failed | it also lists the played collection being empty (R-CAD-82), edited in place | review: the empty collection is one more reason the frame shows no photo; R-CAD-55 comes from the unmerged step 8 stack, so no new id |
| 2026-11-25 | Planning (review), Task 7 | « Lire sur le cadre » ignored a failed save | `writeFrameSettings` answers `false`, a toast, the frame stays closed; documented in R-COL-14 and the messages table | review: with blocked storage the frame opened on its old source without a word |

---

## Self-review (done while writing the plan)

**1. Spec coverage**

| Spec item | Task |
| --- | --- |
| `Collection` model, `photoIds: []`, unique `(ownerId, name)`, seed | 1 |
| Names (trim, 1-50, not text), 409 on a duplicate, French order, 404 on unknown or malformed | 1 |
| `GET`/`POST`/`PATCH`/`DELETE /api/collections`, `collections:changed`, logs | 1 |
| Guarded add, idempotent; remove by `set`; dead ids filtered; unopened refused as `PHOTO_NOT_FOUND` | 2 |
| Bruno `create/`, `list/`, `rename/`, `delete/`, then `photos/` | 1, 2 |
| `pnpm db:push` without seed | C1 |
| `CollectionsProvider`, live re-reads, three messages | 3 |
| « Mes collections » card, name and delete dialogs | 4 |
| « Collections » submenu everywhere `PhotoActionsMenu` is, « Nouvelle collection… » files the photo | 5 |
| `PhotoSource`, frame filter, fallback, `emptyCollection`, restart and reshuffle, slideshow « Photos » | 6 |
| Preferences « Photos », « Lire sur le cadre » | 7 |
| Product docs (R-COL-01..14, R-CAD-77..83, qualified rules, `a-venir.md`) | 4, 5, 6, 7 |
| ARCHITECTURE | 1 to 7 |
| Manual checks | Final verification |
| Delivery: 3 PRs, `gh stack add` at PR boundaries | Stack section, banners |

**2. Placeholder scan:** every step is a full diff from the clone, docs included (exact French text).

**3. Type consistency:** `Collection`, `CollectionRecord`, `WriteRefusal`, `PhotoMembership`, `PhotoSource`, `SourcePhotos` are named once and used with the same shape in later tasks; the server and client `Collection` share `{ id, name, photoIds }`.

**4. Contradictions found while planning:**
- The brief says « from the viewer »: the viewer has no menu of its own, it uses `PhotoActionsMenu` (`ViewerTopBar`), so the submenu reaches it with no viewer-specific code.
- R-CAD-04 promised that every library photo plays on the frame; with a collection that is no longer true. The rule keeps its id with « ou de la collection choisie (R-CAD-77) » rather than being replaced, since its point (no limit, old photos never vanish) still holds.
- R-COL-04 (« Une nouvelle collection est vide ») became false in Task 5 (« Nouvelle collection… » from a photo menu files it): reworded in the same task.
- `bibliotheque.md` listed « Ranger les photos dans des albums ou des collections : prévu » under « Ce qui n'est pas possible »: rewritten in Task 5 (albums are what collections are for).
