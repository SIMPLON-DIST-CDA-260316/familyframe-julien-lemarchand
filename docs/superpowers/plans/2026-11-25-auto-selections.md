---
plan: auto-selections
status: done
spec: docs/superpowers/specs/2026-11-25-auto-selections-design.md
branch: feat/selections-server (PR A), feat/selections-daily (PR B), feat/selections-radio (PR C)
worktree: false
tasks_total: 4
tasks_done: 4
current_task: null
last_commit: 815f010
last_updated: 2026-11-25
---

# Auto Selections (Step 11) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Working agreement (mandatory):** keep this plan in sync with reality. Check a step only when it is finished and its gate is green. Append every divergence to the Drift Log. When a drift changes a decision of the spec, add a new spec doc rather than rewriting this one.

**Status:** every task below was built and committed by the AI in a throwaway clone as the three stacked branches (gates per commit in the report to the controller). A first agent wrote the spec, this plan and its diffs, then was stopped by a reboot before committing; a second agent replayed the diffs on `f212b85`, fixed what the build and a fresh-context review found (Drift Log), and regenerated the diffs below from the final commits. The diffs are the final ones, after the fresh-context review. What is left: the controller's Bruno run, the Chrome checks and the author's UX walkthrough (Final verification).

**Goal:** the frame plays « Sélection du jour » (20 opened photos drawn at random, the same lot all day in Paris time, a new lot every day) as a stored source like a collection, and a « radio » started from any photo's « … » menu: the start photo, then the photos linked to it (same friend sender, at most 7 days apart, same collections), topped up at random, 30 photos at most.

**Architecture:** a read-only `features/selections/` slice serves `GET /api/selections/daily` and `GET /api/selections/radio/:photoId`, both answering `Selection = { photoIds }`. The draw lives in pure functions (`selections.daily.ts`: SHA-256 rank seeded by owner and Paris day, older photos first; `selections.radio.ts`: link count, ties by time, Fisher-Yates tail with an injected `random`). No schema change, no log, no event. On the client, `PhotoSource` gains `daily`; `useDailySelection` keeps the lot live through its own socket and a 15-minute timer; the radio is an address parameter (`/frame?radio=<id>`) read by `useSlideshowSettings` as a `PlayedSource`, fetched once by `useRadioSelection`; `useSourcePhotos` filters the feed with the selected ids (`SelectedIds`). `PhotoActionsMenu` gains « Lancer la radio » (`useStartRadio`).

**Tech Stack:** Node 24, TypeScript 7, Express 5, Socket.IO 4, Prisma 6.19 (MongoDB), Vitest, Biome 2, Bruno CLI 4.2.0, React 19 + Radix (shadcn `dropdown-menu`) + lucide-react (`RadioIcon`), react-router, Tailwind 4, Node `crypto` and `Intl` (no new dependency).

## Global Constraints

- **No new dependency**, server or client. **Prisma stays on v6.** **No schema change**: no `db:push` checkpoint in this step.
- **No Docker** (not even a throwaway container), **never start the API or Vite**, **never run `pnpm db:push` or `pnpm db:seed`** (the database is shared; the controller pushes schemas). Bruno files are counted, not run, while planning.
- **Never read, print or log a `.env` file**; `server/.env.example` is the reference. A command holding both a reader word and `.env` is blocked by a hook: pass long text through a file.
- **No client test runner:** client tasks are verified by `pnpm typecheck`, `pnpm build`, `pnpm check`.
- **DTO (exact):** `Selection = { photoIds: string[] }`. Reused codes only: `PHOTO_NOT_FOUND` (404), `UNAUTHENTICATED` (401). No new socket event, no new log event.
- **UI text (French, exact):** « Sélection du jour », « Radio », « Lancer la radio ».
- **No `vi.mock`:** fakes are `vi.fn()` passed through the factory, in a per-file `makeDeps()`.
- **TypeScript (AGENTS.md):** no `as` casts, explicit return types on exported functions, literal unions rather than `enum`.
- **Code rules (`.claude/rules/`):** comment why, never what; no magic numbers; no flag parameters; every function at most 30 lines, every file at most 300 lines; log through `logger.ts` with ids only.
- Server imports use `.js`; client imports use `@/` with `.ts`/`.tsx`.
- **Language:** code, comments and commits in English; UI text, Bruno `docs` blocks, ARCHITECTURE and `docs/produit/` in French.
- **Same commit:** an endpoint change updates `server/bruno/selections/`; a service rule updates its colocated `*.test.ts`; a user-visible change updates `docs/produit/` (new rule ids, never reused); a flow change updates `ARCHITECTURE.md`.
- **Gates:** every commit passes `pnpm check` and `pnpm typecheck`; every task ends green on `pnpm test` and `pnpm build`.
- **Commits:** atomic, Conventional Commits in English, `git commit -F <file>`, ending with the two attribution lines. Never `--no-verify`. Never commit `.npmrc`. **Never touch `Dockerfile`, `NOTE.md`, `server/.dockerignore`, `server/Dockerfile` or `.vscode/settings.json`.**
- **Biome formats Markdown:** `pnpm check:fix` after a docs edit. The diffs below are after formatting.

## Interfaces

- `createSelectionsRepository(prisma)` → `{ findOpenedPhotos(ownerId): Promise<SelectionPhoto[]>, findCollectionPhotoIds(ownerId): Promise<string[][]> }`; `SelectionPhoto = { id, createdAt, senderId }`.
- `selections.daily.ts`: `DAILY_SELECTION_SIZE = 20`, `FAMILY_TIME_ZONE = 'Europe/Paris'` (module constant), `dayOf(date): string` (`YYYY-MM-DD`), `drawDailySelection(photos, ownerId, now): string[]`.
- `selections.radio.ts`: `RADIO_LENGTH = 30`, `buildRadio({ photos, start, collections, random }): string[]`.
- `createSelectionsService({ repository, now, random })` → `{ dailySelection(ownerId): Promise<Selection>, radioSelection({ ownerId, photoId }): Promise<Selection> }`; `assembleSelectionsRouter()` in `app.ts`.
- Client: `Selection`, `isSelection`, `SelectedIds = { status: 'loading' } | { status: 'unavailable' } | { status: 'ready'; photoIds }`; `fetchDailySelection(onUnauthenticated)`, `fetchRadioSelection(photoId, onUnauthenticated)` → `Promise<Selection | null>`; `useDailySelection(isEnabled): SelectedIds`; `useRadioSelection(photoId | null): SelectedIds`; `useStartRadio(): (photoId) => void`; `PhotoSource` += `{ kind: 'daily' }`, `DAILY_SOURCE`; `PlayedSource = PhotoSource | { kind: 'radio'; photoId }`; `RADIO_PARAM`, `radioPath(photoId)`; `playedSourceOptions(source, collections)`; `SlideshowSettings.source: PlayedSource`.

## Choices made while planning

- **The daily lot is reloaded through a socket**, not an effect keyed on the feed: Biome's `useExhaustiveDependencies` refuses a dependency the effect body does not read (checked on a throwaway file), and the repo has no `biome-ignore`. The socket mirrors `CollectionsProvider` (latest load wins, a failed reload keeps the shown list).
- **The socket only lives while `daily` plays** (`useDailySelection(isEnabled)`), and its cleanup forgets the lot: coming back to the selection waits for a fresh one instead of flashing yesterday's.
- **Radio is one client commit** (Tasks 4 and 5 of the first draft merged): the frame half alone had no way in, and its product rules could not be written without the menu entry.
- **Bruno runs on the throwaway invitee** (`inviteeCookie`), seq 6 after `collections/`, while the invitee still exists; the member is the « autre compte ». `radio/09` makes the member and the invitee friends for one share (deleted in its post-script) to prove an unopened photo is refused and absent from the day's lot.
- **No new error code**: every refused radio is `PHOTO_NOT_FOUND`, checked before the collections are read.

### Verified behavior

- Every task was written and committed in a throwaway clone from `f212b85`. Gates per commit: `pnpm check`, `pnpm typecheck`; per task: `pnpm test`, `pnpm build`. Every new or touched function measured at 30 lines or fewer.
- **Baselines (on `feat/collections-frame` at `f212b85`):** `pnpm test` → `Test Files  23 passed (23)`, `Tests  273 passed (273)`; Bruno files: 159 requests, 344 assertion lines, 65 `test()` calls.
- **After Task 1:** `Test Files  24 passed (24)`, `Tests  284 passed (284)`; Bruno 166 requests, 358 assertion lines, 69 `test()` calls.
- **After Task 2:** `Test Files  25 passed (25)`, `Tests  294 passed (294)`; Bruno 177 requests, 380 assertion lines, 72 `test()` calls. Client tasks leave both unchanged.
- **Not run:** Bruno against a live API, the browser checks. `Intl.DateTimeFormat` with `Europe/Paris` relies on Node's bundled ICU (full ICU since Node 13); the unit tests cover midnight and summer time.

## File Map

| File | Task | Responsibility |
| --- | --- | --- |
| `server/src/features/selections/selections.{repository,service,controller,routes}.ts` | 1, 2 | the slice |
| `server/src/features/selections/selections.{daily,radio}.ts` | 1, 2 | pure draws |
| `server/src/features/selections/selections.service.{daily,radio}.test.ts` | 1, 2 | unit tests |
| `server/src/types.ts`, `app.ts` | 1, 2 | DTO, mount, deps |
| `server/bruno/selections/**`, `server/bruno/collection.bru` | 1, 2 | Bruno |
| `client/src/selections/{selection,selectionsApi}.ts` | 3, 4 | DTO copy, fetches |
| `client/src/hooks/{useDailySelection,useRadioSelection,useStartRadio}.ts` | 3, 4 | loading, launching |
| `client/src/photoSource.ts`, `hooks/{useSourcePhotos,useFrameMode,useSlideshowSettings}.ts`, `viewerHistory.ts` | 3, 4 | frame source |
| `client/src/components/frame/{frameSettingOptions.ts,SlideshowMenu.tsx,PhotoActionsMenu.tsx}` | 3, 4 | menus |
| `docs/produit/{cadre,preferences,bibliotheque,README,a-venir}.md` | 3, 4 | product rules |
| `ARCHITECTURE.md` | 1 to 4 | docs per task |

## Stack and branches (controller only)

- **PR A `feat/selections-server`** on top of `feat/collections-frame` (`f212b85`): this spec and plan (`docs: add the auto selections spec and plan`), then Tasks 1-2.
- **PR B `feat/selections-daily`**: Task 3.
- **PR C `feat/selections-radio`**: Task 4.
- **db:push checkpoints: none** (no schema change).

---

## PR A — `feat/selections-server`

### Task 1: Spec and plan, then draw the photos of the day (PR A, `feat/selections-server`)

**Files:**
- Create: `docs/superpowers/specs/2026-11-25-auto-selections-design.md`, `docs/superpowers/plans/2026-11-25-auto-selections.md` (commit `docs: add the auto selections spec and plan`, alone, first)
- Create: `server/src/features/selections/selections.{repository,daily,service,controller,routes}.ts`, `selections.service.daily.test.ts`, `server/bruno/selections/{folder.bru,daily/}`
- Modify: `server/src/types.ts`, `server/src/app.ts`, `server/bruno/collection.bru`, `ARCHITECTURE.md`

- [x] **Step 1: Apply the diff** (final, after the review)

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 8b9e78c..f52bf4d 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -104,6 +104,7 @@ Le routage est fait côté navigateur (`react-router`). En production (J2), le s
 | `DELETE /api/collections/:id`                 | `204` sans corps : supprime la collection, jamais ses photos                                                                                                                                                                                                   |
 | `PUT /api/collections/:id/photos/:photoId`    | sans corps → `200 Collection` : ajoute à la fin une photo ouverte de la bibliothèque ; idempotent                                                                                                                                                              |
 | `DELETE /api/collections/:id/photos/:photoId` | `200 Collection` : retire la photo de la collection, jamais de la bibliothèque ; idempotent                                                                                                                                                                    |
+| `GET /api/selections/daily`                   | `200 Selection` : la sélection du jour du compte connecté, 20 photos au plus, le même lot toute la journée (jour de Paris)                                                                                                                                     |
 | `GET /api/photos?cursor=<id>&limit=<n>`       | `200 { photos, nextCursor }` : photos du compte connecté, la plus récente en premier, sans les photos reçues pas encore ouvertes ; `limit` de 1 à 100 (30 par défaut) ; `nextCursor` est l'id à passer en `cursor` pour la page suivante, `null` à la dernière |
 | `POST /api/photos`                            | `multipart/form-data` avec `photo` (fichier) → `201 Photo`                                                                                                                                                                                                     |
 | `POST /api/photos/:id/share`                  | JSON `{ friendId, message? }` → `201 Photo` : envoie une photo de sa bibliothèque à un ami accepté ; l'ami reçoit une nouvelle photo qui pointe vers la même image Cloudinary, et la réponse est cette photo telle qu'il la voit                               |
@@ -112,7 +113,7 @@ Le routage est fait côté navigateur (`react-router`). En production (J2), le s
 | `POST /api/photos/:id/open`                   | sans corps → `200 Photo` : ouvre une photo reçue, qui rejoint `GET /api/photos` ; idempotent                                                                                                                                                                   |
 | `DELETE /api/photos/:id`                      | `204` sans corps, pour une photo du compte connecté ; supprime l'enregistrement, puis l'image Cloudinary (cache CDN compris) si plus aucune photo n'y renvoie                                                                                                  |
 
-Toutes les routes `/api/photos`, `/api/friendships`, `/api/account`, `/api/collections`, `GET /api/auth/me` et les routes admin de `/api/invitations` demandent une session ; sans elle : `401 UNAUTHENTICATED`. Les routes admin répondent `403 FORBIDDEN` à un membre. Un `user` vaut `{ id, email, displayName, role, avatarUrl }` (`role` : `member` ou `admin` ; `avatarUrl` : l'URL signée de sa photo de profil, `null` tant qu'il n'en a pas choisi), jamais le hash du mot de passe ni l'identifiant Cloudinary de la photo.
+Toutes les routes `/api/photos`, `/api/friendships`, `/api/account`, `/api/collections`, `/api/selections`, `GET /api/auth/me` et les routes admin de `/api/invitations` demandent une session ; sans elle : `401 UNAUTHENTICATED`. Les routes admin répondent `403 FORBIDDEN` à un membre. Un `user` vaut `{ id, email, displayName, role, avatarUrl }` (`role` : `member` ou `admin` ; `avatarUrl` : l'URL signée de sa photo de profil, `null` tant qu'il n'en a pas choisi), jamais le hash du mot de passe ni l'identifiant Cloudinary de la photo.
 
 Une `Invitation` vaut `{ id, email, status, createdAt, expiresAt }` (dates en ISO 8601) ; `status` vaut `pending` (en attente), `used` (utilisée) ou `expired` (expirée), calculé à chaque lecture. Le hash du jeton et l'admin qui l'a créée restent côté serveur.
 
@@ -122,6 +123,8 @@ Une `Photo` vaut `{ id, url, thumbnailUrl, createdAt, senderName, message }` (`c
 
 Une `Collection` vaut `{ id, name, photoIds }`, jamais son propriétaire : `photoIds` liste les photos du compte, dans l'ordre où elles y ont été ajoutées. Un nom est du texte, espaces autour retirés, de 1 à 50 caractères (`MAX_COLLECTION_NAME_LENGTH`, comme un nom d'affichage) ; deux collections d'un même compte ne portent pas le même nom (index unique `(ownerId, name)`, comparaison exacte après le trim : « noël » et « Noël » sont deux noms). Une collection d'un autre compte répond comme une inconnue. Seule une photo ouverte de la bibliothèque du compte entre dans une collection : inconnue, d'un autre compte ou reçue pas encore ouverte, elle répond `404 PHOTO_NOT_FOUND`, comme `GET /api/photos` ne la montre pas. Ajouter une photo déjà là, ou retirer une photo absente, répond la collection telle quelle.
 
+Une `Selection` vaut `{ photoIds }` : des ids de photos ouvertes de la bibliothèque du compte, jamais les photos elles-mêmes, que le cadre a déjà chargées. La sélection du jour (`features/selections/selections.daily.ts`) range chaque photo selon le SHA-256 de `<ownerId>:<jour>:<photoId>`, le jour étant la date à Paris (`Intl.DateTimeFormat`, fuseau `Europe/Paris`) : le même jour donne le même ordre sur tous les appareils et à chaque rechargement, sans rien enregistrer, et le lendemain un autre. Les photos arrivées avant aujourd'hui passent d'abord, celles du jour ensuite, et le lot garde les 20 premières (`DAILY_SELECTION_SIZE`) : une photo ajoutée aujourd'hui n'entre que dans un lot qui a encore de la place. Limite connue : une photo reçue hier et ouverte aujourd'hui compte comme arrivée hier (sa date est celle de la réception) et peut remplacer une photo du lot en cours de journée.
+
 La liste est paginée par curseur (_keyset_) sur l'id : un ObjectId commence par sa date de création, trier par id revient donc à trier par date, et `id < cursor` est une seule requête sur l'index `(ownerId, id)`. Une photo ajoutée ou supprimée entre deux pages ne décale rien, contrairement à une pagination par numéro de page.
 
 En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code en message français :
@@ -170,7 +173,7 @@ En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code e
 - **Expiration** : Prisma 6 ne sait pas déclarer d'index TTL MongoDB. Une session expirée est supprimée quand on la lit, et toutes les sessions expirées à chaque session ouverte (connexion, invitation).
 - **Changement de mot de passe** : `PUT /api/account/password` demande le mot de passe actuel (une session volée ne suffit pas), puis supprime toutes les autres sessions du compte et garde celle de la requête. Un autre appareil, le cadre compris, doit se reconnecter avec le nouveau mot de passe : sa connexion Socket.IO déjà ouverte n'est pas coupée (elle ne relit pas la session), il revient à `/login` à sa prochaine requête HTTP ou reconnexion, le cadre au plus tard à son rechargement quotidien. `requireAuth` pose aussi `req.sessionId`, relu par `currentSessionId(req)` (`features/auth/auth.guard.ts`).
 - **Connexion refusée** : e-mail inconnu et mauvais mot de passe répondent tous deux `401 INVALID_CREDENTIALS`, et un e-mail inconnu coûte quand même une vérification argon2 (contre un hash factice) : ni le message ni le temps de réponse ne disent qui a un compte.
-- **Garde HTTP** : `requireAuth` (`features/auth/auth.middleware.ts`) lit le cookie avec `lib/session-token.ts` (sans `cookie-parser`), valide la session et pose `req.user`, typé par _declaration merging_ sur `Request` ; `currentUser(req)` (`features/auth/auth.guard.ts`) le relit sans cast. `requireRole(role)` (même fichier), monté après `requireAuth`, compare le rôle de la session déjà chargée (aucune requête en plus) et répond `403 FORBIDDEN` à un autre rôle. Il vit à part du middleware : `auth.middleware.ts` atteint `config.ts`, qu'un test unitaire ne peut pas charger sans variables d'environnement. `/api/photos`, `/api/auth/me`, `/api/friendships`, `/api/account`, `/api/collections` et les routes admin de `/api/invitations` (puis `requireRole('admin')`) sont derrière `requireAuth` ; `/api/health`, `/api/auth/login`, `/api/auth/logout` et `/api/invitations/accept` restent publics.
+- **Garde HTTP** : `requireAuth` (`features/auth/auth.middleware.ts`) lit le cookie avec `lib/session-token.ts` (sans `cookie-parser`), valide la session et pose `req.user`, typé par _declaration merging_ sur `Request` ; `currentUser(req)` (`features/auth/auth.guard.ts`) le relit sans cast. `requireRole(role)` (même fichier), monté après `requireAuth`, compare le rôle de la session déjà chargée (aucune requête en plus) et répond `403 FORBIDDEN` à un autre rôle. Il vit à part du middleware : `auth.middleware.ts` atteint `config.ts`, qu'un test unitaire ne peut pas charger sans variables d'environnement. `/api/photos`, `/api/auth/me`, `/api/friendships`, `/api/account`, `/api/collections`, `/api/selections` et les routes admin de `/api/invitations` (puis `requireRole('admin')`) sont derrière `requireAuth` ; `/api/health`, `/api/auth/login`, `/api/auth/logout` et `/api/invitations/accept` restent publics.
 - **Invitations** : l'admin crée un lien depuis `/admin/invitations`. Le jeton suit la règle des sessions (32 octets aléatoires, `lib/session-token.ts`, seul son SHA-256 en base dans `Invitation.tokenHash`), vaut 7 jours (`INVITATION_DURATION_MS`) et sert une fois (`usedAt`). Le serveur renvoie le jeton brut une seule fois ; le client construit le lien `` `${window.location.origin}/invite/${token}` `` : l'origine que l'admin utilise est celle que la famille atteint, sans variable de configuration en plus. Une nouvelle invitation pour le même e-mail **remplace** les précédentes non utilisées (supprimées) : « j'ai perdu le lien » se règle sans bouton de révocation, et l'ancien lien répond `404 INVITATION_NOT_FOUND`. Le jeton ne passe jamais dans un chemin d'API (`http.request` journalise les chemins) : il voyage dans le corps JSON. L'acceptation (`POST /api/invitations/accept`, publique) vérifie d'abord le jeton (forme, existence, déjà utilisé, expiré), puis le nom, puis le mot de passe : inutile de choisir un mot de passe pour un lien mort. Elle crée le compte, puis marque l'invitation utilisée, sans transaction : l'index unique sur `User.email` garantit qu'un double envoi ne crée qu'un compte (l'autre reçoit `409 ACCOUNT_EXISTS`). Limite connue : si l'admin réinvite la même adresse pendant une acceptation, le compte peut être créé alors que la réponse est une `500` ; le compte fonctionne, la personne se connecte sur `/login`. La session est ouverte par `openSession` du service d'auth (aussi utilisé par la connexion), et le contrôleur pose le cookie comme au login.
 - **JSON** : `express.json()` n'est monté que sur `/api/auth`, `/api/invitations`, `/api/friendships`, `/api/collections`, `PATCH /api/account`, `PUT /api/account/password` et `POST /api/photos/:id/share` (les autres routes photos sont en multipart), les seules routes qui lisent du JSON ; un corps illisible répond `400 BODY_INVALID`.
 
@@ -193,7 +196,7 @@ En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code e
 
 ## Couches du backend
 
-Une feature par dossier (`server/src/features/photos/`, `server/src/features/auth/`, `server/src/features/invitations/`, `server/src/features/friendships/`, `server/src/features/account/`, `server/src/features/collections/`), un fichier par couche. Pour les photos :
+Une feature par dossier (`server/src/features/photos/`, `server/src/features/auth/`, `server/src/features/invitations/`, `server/src/features/friendships/`, `server/src/features/account/`, `server/src/features/collections/`, `server/src/features/selections/`), un fichier par couche. Pour les photos :
 
 | Fichier                | Rôle                                                                                                                              |
 | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
@@ -211,6 +214,7 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 - `features/friendships/` suit le même découpage (`friendships.repository.ts`, `friendships.service.ts`, `friendships.controller.ts`, `friendships.routes.ts`). Le service reçoit `repository`, `avatarUrl` et `logger` ; le repository calcule `pairKey` et ne lit des comptes que `id`, `email`, `displayName` et `avatarCloudinaryId`. `app.ts` monte le routeur derrière `requireAuth`, comme les photos. Le service expose aussi `areFriends(userId, otherUserId)`, que le service photos reçoit en dépendance : la règle « amis = ligne acceptée » reste ici. `app.ts` construit le service amis une fois (`assembleFriendshipsService`) et le passe aux deux routeurs.
 - `features/account/` suit le même découpage (`account.repository.ts`, `account.service.ts`, `account.controller.ts`, `account.routes.ts`) : le compte de la personne connectée, jamais un autre (l'id vient de la session, pas de l'URL). Le service reçoit `repository`, `hashPassword`, `verifyPassword`, `toAvatarJpeg`, `uploadAvatar`, `deleteImage`, `avatarUrl` et `logger`. La photo de profil reprend la configuration Multer (`photos.upload.ts`) et `parseFile` (`photos.input.ts`) des photos : mêmes formats, même taille maximale, mêmes codes d'erreur. `app.ts` monte le routeur derrière `requireAuth`.
 - `features/collections/` suit le même découpage (`collections.repository.ts`, `collections.service.ts`, `collections.controller.ts`, `collections.routes.ts`). Le service reçoit `repository` et `logger`, valide le nom (`parseCollectionName`) et l'id, et trie la liste. Le repository traduit les refus de Prisma en `'not_found'` ou `'name_taken'`, que le service change en code d'erreur ; il lit aussi les photos (`findLivePhotoIds`, les ids encore dans la bibliothèque). Le contrôleur reçoit `io` pour `collections:changed`.
+- `features/selections/` suit le même découpage (`selections.repository.ts`, `selections.service.ts`, `selections.controller.ts`, `selections.routes.ts`), en lecture seule : ni écriture, ni événement, ni log en plus de `http.request`. Le tirage vit à part, en fonctions pures (`selections.daily.ts`). Le service reçoit `repository` et `now`, pour qu'un test choisisse le jour. Le repository ne lit des photos que `id` et `createdAt`.
 - `features/auth/public-user.ts` construit le `user` renvoyé par l'API (`toPublicUser`, utilisé par les services auth, invitations et compte) : l'URL de la photo de profil vient de `avatarUrl` (`lib/cloudinary.ts`), reçu en dépendance pour qu'un test unitaire n'ait pas besoin de la configuration Cloudinary. Le service amis s'en sert aussi (`toAvatarUrl`) pour l'autre compte d'une amitié.
 - Les dépendances sont passées par des fonctions-fabriques (`createPhotosService({ repository, toFrameJpeg, uploadImage, deleteImage, areFriends, logger })`), assemblées dans `app.ts` : un test peut fournir de fausses implémentations.
 - `server/src/lib/` regroupe les clients techniques : Prisma (`db.ts`), Cloudinary, sharp (`image.ts`), `email.ts` (`parseEmail`, la même règle pour une invitation et une demande d'ami) et `account-input.ts` (`parseDisplayName`, `parsePassword` et leurs bornes, les mêmes règles à la création du compte par invitation et à sa modification par son propriétaire).
diff --git a/server/bruno/collection.bru b/server/bruno/collection.bru
index 65497bc..2528ba6 100644
--- a/server/bruno/collection.bru
+++ b/server/bruno/collection.bru
@@ -39,6 +39,9 @@ docs {
   membre et l'admin : il n'en laisse aucune, et commence par effacer celles
   d'un lancement interrompu.
 
+  Le dossier `selections/` lit les sélections de ce compte jetable, qu'il
+  remplit de ses propres photos puis vide.
+
   Le dossier `account/` modifie aussi ce compte jetable, jamais le membre, et
   le remet dans son état de départ en fin de dossier (voir
   `account/folder.bru`). `account/avatar/` publie deux photos de profil sur
diff --git a/server/bruno/selections/daily/01-nominal-bibliotheque-vide.bru b/server/bruno/selections/daily/01-nominal-bibliotheque-vide.bru
new file mode 100644
index 0000000..5353db7
--- /dev/null
+++ b/server/bruno/selections/daily/01-nominal-bibliotheque-vide.bru
@@ -0,0 +1,30 @@
+meta {
+  name: Nominal - bibliothèque vide
+  type: http
+  seq: 1
+}
+
+get {
+  url: {{baseUrl}}/api/selections/daily
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('inviteeCookie')) {
+    throw new Error('inviteeCookie absent : lancer toute la collection, invitations/accept/05 doit passer')
+  }
+  // The throwaway account of invitations/accept/05, never the member (see selections/folder.bru).
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 200
+  res.body.photoIds: isArray
+  res.body.photoIds.length: eq 0
+}
+
+docs {
+  NOMINAL → 200 avec un lot vide : le compte jetable n'a encore aucune
+  photo.
+}
diff --git a/server/bruno/selections/daily/02-nominal-prepa-photo.bru b/server/bruno/selections/daily/02-nominal-prepa-photo.bru
new file mode 100644
index 0000000..936b850
--- /dev/null
+++ b/server/bruno/selections/daily/02-nominal-prepa-photo.bru
@@ -0,0 +1,33 @@
+meta {
+  name: Nominal - première photo du compte jetable
+  type: http
+  seq: 2
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
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 201
+  res.body.id: isString
+}
+
+script:post-response {
+  bru.setVar('dailyPhotoId', res.body.id)
+}
+
+docs {
+  NOMINAL → 201. Préparation : une photo dans la bibliothèque du compte
+  jetable ; son id va dans `dailyPhotoId`, et `07` la supprime.
+}
diff --git a/server/bruno/selections/daily/03-nominal-prepa-seconde-photo.bru b/server/bruno/selections/daily/03-nominal-prepa-seconde-photo.bru
new file mode 100644
index 0000000..7649258
--- /dev/null
+++ b/server/bruno/selections/daily/03-nominal-prepa-seconde-photo.bru
@@ -0,0 +1,33 @@
+meta {
+  name: Nominal - seconde photo du compte jetable
+  type: http
+  seq: 3
+}
+
+post {
+  url: {{baseUrl}}/api/photos
+  body: multipartForm
+  auth: none
+}
+
+body:multipart-form {
+  photo: @file(fixtures/photo.png) @contentType(image/png)
+}
+
+script:pre-request {
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 201
+  res.body.id: isString
+}
+
+script:post-response {
+  bru.setVar('dailySecondPhotoId', res.body.id)
+}
+
+docs {
+  NOMINAL → 201. Préparation : un second fichier, donc pas un doublon ; son
+  id va dans `dailySecondPhotoId`, et `07` le supprime.
+}
diff --git a/server/bruno/selections/daily/04-nominal-lot-du-jour.bru b/server/bruno/selections/daily/04-nominal-lot-du-jour.bru
new file mode 100644
index 0000000..78a2534
--- /dev/null
+++ b/server/bruno/selections/daily/04-nominal-lot-du-jour.bru
@@ -0,0 +1,45 @@
+meta {
+  name: Nominal - les photos du jour complètent le lot
+  type: http
+  seq: 4
+}
+
+get {
+  url: {{baseUrl}}/api/selections/daily
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('dailyPhotoId') || !bru.getVar('dailySecondPhotoId')) {
+    throw new Error('dailyPhotoId ou dailySecondPhotoId absent : lancer tout le dossier, daily/02 et 03 doivent passer')
+  }
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 200
+  res.body.photoIds.length: eq 2
+}
+
+script:post-response {
+  const axios = require('axios')
+  test('le lot contient les deux photos du compte', () => {
+    expect(res.body.photoIds).to.have.members([
+      bru.getVar('dailyPhotoId'),
+      bru.getVar('dailySecondPhotoId'),
+    ])
+  })
+  test('une seconde demande donne le même lot', async () => {
+    const again = await axios.get(`${bru.getEnvVar('baseUrl')}/api/selections/daily`, {
+      headers: { Cookie: bru.getVar('inviteeCookie') },
+    })
+    expect(again.data.photoIds).to.eql(res.body.photoIds)
+  })
+}
+
+docs {
+  NOMINAL → 200 avec les deux photos : arrivées aujourd'hui, elles
+  complètent un lot qui a de la place (moins de 20 photos plus anciennes).
+  Le script redemande le lot : le même, dans le même ordre.
+}
diff --git a/server/bruno/selections/daily/05-nominal-autre-compte.bru b/server/bruno/selections/daily/05-nominal-autre-compte.bru
new file mode 100644
index 0000000..a7e5cd6
--- /dev/null
+++ b/server/bruno/selections/daily/05-nominal-autre-compte.bru
@@ -0,0 +1,28 @@
+meta {
+  name: Nominal - un autre compte a son propre lot
+  type: http
+  seq: 5
+}
+
+get {
+  url: {{baseUrl}}/api/selections/daily
+  body: none
+  auth: none
+}
+
+assert {
+  res.status: eq 200
+  res.body.photoIds: isArray
+}
+
+script:post-response {
+  test('le lot du membre ne contient aucune photo du compte jetable', () => {
+    expect(res.body.photoIds).to.not.include(bru.getVar('dailyPhotoId'))
+    expect(res.body.photoIds).to.not.include(bru.getVar('dailySecondPhotoId'))
+  })
+}
+
+docs {
+  NOMINAL → 200 pour le membre (cookie par défaut) : son lot vient de sa
+  propre bibliothèque, jamais de celle du compte jetable.
+}
diff --git a/server/bruno/selections/daily/06-edge-sans-cookie.bru b/server/bruno/selections/daily/06-edge-sans-cookie.bru
new file mode 100644
index 0000000..271a90f
--- /dev/null
+++ b/server/bruno/selections/daily/06-edge-sans-cookie.bru
@@ -0,0 +1,25 @@
+meta {
+  name: Edge - sans cookie de session
+  type: http
+  seq: 6
+}
+
+get {
+  url: {{baseUrl}}/api/selections/daily
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
+  EDGE → 401 UNAUTHENTICATED : la sélection du jour demande une session.
+}
diff --git a/server/bruno/selections/daily/07-nominal-photo-supprimee.bru b/server/bruno/selections/daily/07-nominal-photo-supprimee.bru
new file mode 100644
index 0000000..7cfbbf4
--- /dev/null
+++ b/server/bruno/selections/daily/07-nominal-photo-supprimee.bru
@@ -0,0 +1,40 @@
+meta {
+  name: Nominal - une photo supprimée quitte le lot
+  type: http
+  seq: 7
+}
+
+delete {
+  url: {{baseUrl}}/api/photos/{{dailyPhotoId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('dailyPhotoId') || !bru.getVar('dailySecondPhotoId')) {
+    throw new Error('dailyPhotoId ou dailySecondPhotoId absent : lancer tout le dossier, daily/02 et 03 doivent passer')
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
+  const baseUrl = bru.getEnvVar('baseUrl')
+  const headers = { Cookie: bru.getVar('inviteeCookie') }
+  test('le lot ne garde que la photo restante', async () => {
+    const lot = await axios.get(`${baseUrl}/api/selections/daily`, { headers })
+    expect(lot.data.photoIds).to.eql([bru.getVar('dailySecondPhotoId')])
+  })
+  // The second photo was only for this folder: deleted, its image leaves Cloudinary.
+  await axios.delete(`${baseUrl}/api/photos/${bru.getVar('dailySecondPhotoId')}`, { headers })
+}
+
+docs {
+  NOMINAL → 204 : le compte jetable supprime la photo de `02`. Le script
+  relit le lot : seule la photo de `03` y reste. Il supprime ensuite cette
+  seconde photo : le dossier ne laisse rien.
+}
diff --git a/server/bruno/selections/daily/folder.bru b/server/bruno/selections/daily/folder.bru
new file mode 100644
index 0000000..ebc63e0
--- /dev/null
+++ b/server/bruno/selections/daily/folder.bru
@@ -0,0 +1,17 @@
+meta {
+  name: daily
+  seq: 1
+}
+
+docs {
+  `GET /api/selections/daily` → 200 `{ photoIds }` : la sélection du jour,
+  20 photos au plus, tirées d'abord parmi les photos arrivées avant
+  aujourd'hui (jour de Paris), puis complétées par celles du jour. Le même
+  lot toute la journée, sur tous les appareils ; un autre le lendemain.
+
+  Toutes les photos de ce dossier arrivent le jour même et le compte en a
+  moins de 20 : le lot les contient toutes. Le tirage lui-même (même lot
+  toute la journée, autre lot le lendemain, minuit à Paris) est vérifié par
+  les tests unitaires, qui choisissent l'heure. Un lancement à cheval sur
+  minuit (heure de Paris) peut échouer : le relancer.
+}
diff --git a/server/bruno/selections/folder.bru b/server/bruno/selections/folder.bru
new file mode 100644
index 0000000..318b4d4
--- /dev/null
+++ b/server/bruno/selections/folder.bru
@@ -0,0 +1,18 @@
+meta {
+  name: selections
+  seq: 6
+}
+
+docs {
+  Les sélections automatiques du compte connecté, en lecture seule. Une
+  sélection renvoyée par l'API vaut `{ photoIds }` : des ids de photos
+  ouvertes de la bibliothèque, que le cadre retrouve parmi les photos qu'il
+  a déjà chargées.
+
+  Toutes les requêtes passent par le compte jetable créé par
+  `invitations/accept/05` (cookie `inviteeCookie`), jamais par le membre,
+  dont la bibliothèque est celle de la base de dev partagée : le compte
+  jetable n'a aucune photo en arrivant ici (`collections/` a supprimé les
+  siennes). Le membre (cookie par défaut) sert d'« autre compte ». Chaque
+  sous-dossier ajoute ses propres photos et les supprime avant la fin.
+}
diff --git a/server/src/app.ts b/server/src/app.ts
index fccd06b..fe5e0ee 100644
--- a/server/src/app.ts
+++ b/server/src/app.ts
@@ -32,6 +32,10 @@ import { createPhotosController } from './features/photos/photos.controller.js'
 import { createPhotosRepository } from './features/photos/photos.repository.js'
 import { createPhotosRouter } from './features/photos/photos.routes.js'
 import { createPhotosService, type PhotosServiceDeps } from './features/photos/photos.service.js'
+import { createSelectionsController } from './features/selections/selections.controller.js'
+import { createSelectionsRepository } from './features/selections/selections.repository.js'
+import { createSelectionsRouter } from './features/selections/selections.routes.js'
+import { createSelectionsService } from './features/selections/selections.service.js'
 import { avatarUrl, deleteImage, uploadAvatar, uploadImage } from './lib/cloudinary.js'
 import { prisma } from './lib/db.js'
 import { toAvatarJpeg, toFrameJpeg } from './lib/image.js'
@@ -77,6 +81,14 @@ function assembleCollectionsRouter(io: SocketServer): Router {
   return createCollectionsRouter(createCollectionsController(service, io))
 }
 
+function assembleSelectionsRouter(): Router {
+  const service = createSelectionsService({
+    repository: createSelectionsRepository(prisma),
+    now: () => new Date(),
+  })
+  return createSelectionsRouter(createSelectionsController(service))
+}
+
 function assembleFriendshipsService(): FriendshipsService {
   return createFriendshipsService({
     repository: createFriendshipsRepository(prisma),
@@ -143,6 +155,7 @@ export function createApp(io: SocketServer, authService: AuthService): Express {
   app.use('/api/friendships', requireAuth, assembleFriendshipsRouter(friendships))
   app.use('/api/account', requireAuth, assembleAccountRouter())
   app.use('/api/collections', requireAuth, assembleCollectionsRouter(io))
+  app.use('/api/selections', requireAuth, assembleSelectionsRouter())
 
   app.use(notFound)
   app.use(errorHandler)
diff --git a/server/src/features/selections/selections.controller.ts b/server/src/features/selections/selections.controller.ts
new file mode 100644
index 0000000..83f2994
--- /dev/null
+++ b/server/src/features/selections/selections.controller.ts
@@ -0,0 +1,19 @@
+import type { Request, Response } from 'express'
+import type { Selection } from '../../types.js'
+import { currentUser } from '../auth/auth.guard.js'
+import type { SelectionsService } from './selections.service.js'
+
+export type SelectionsController = {
+  daily: (req: Request, res: Response) => Promise<void>
+}
+
+async function daily(service: SelectionsService, req: Request, res: Response): Promise<void> {
+  const body: Selection = await service.dailySelection(currentUser(req).id)
+  res.json(body)
+}
+
+export function createSelectionsController(service: SelectionsService): SelectionsController {
+  return {
+    daily: (req, res) => daily(service, req, res),
+  }
+}
diff --git a/server/src/features/selections/selections.daily.ts b/server/src/features/selections/selections.daily.ts
new file mode 100644
index 0000000..e7f0fbe
--- /dev/null
+++ b/server/src/features/selections/selections.daily.ts
@@ -0,0 +1,45 @@
+import { createHash } from 'node:crypto'
+import type { SelectionPhoto } from './selections.repository.js'
+
+// A few minutes of frame at any speed, few enough to feel like a choice.
+export const DAILY_SELECTION_SIZE = 20
+
+// A family frame lives in one home: the day changes at midnight in France, not in UTC.
+const FAMILY_TIME_ZONE = 'Europe/Paris'
+
+// en-CA writes YYYY-MM-DD: two days compare in calendar order as plain strings.
+const DAY_FORMAT = new Intl.DateTimeFormat('en-CA', {
+  timeZone: FAMILY_TIME_ZONE,
+  year: 'numeric',
+  month: '2-digit',
+  day: '2-digit',
+})
+
+export function dayOf(date: Date): string {
+  return DAY_FORMAT.format(date)
+}
+
+// A hash, not Math.random: the same seed and photo always get the same rank, so every device and
+// every reload shows the same lot all day, and another seed shuffles them anew.
+function drawRank(seed: string, photoId: string): string {
+  return createHash('sha256').update(`${seed}:${photoId}`).digest('hex')
+}
+
+function idsInDrawOrder(photos: SelectionPhoto[], seed: string): string[] {
+  return photos
+    .map(({ id }) => ({ id, rank: drawRank(seed, id) }))
+    .sort((a, b) => (a.rank < b.rank ? -1 : 1))
+    .map(({ id }) => id)
+}
+
+// Photos from before today come first: one added today only fills a lot with room left. The lot
+// still changes during the day when a photo leaves it (deleted, the next one in draw order takes
+// its place), or when a photo received before today is opened: its date is its reception.
+export function drawDailySelection(photos: SelectionPhoto[], ownerId: string, now: Date): string[] {
+  const today = dayOf(now)
+  const seed = `${ownerId}:${today}`
+  const olderPhotos = photos.filter(({ createdAt }) => dayOf(createdAt) < today)
+  const todaysPhotos = photos.filter(({ createdAt }) => dayOf(createdAt) >= today)
+  const drawnIds = [...idsInDrawOrder(olderPhotos, seed), ...idsInDrawOrder(todaysPhotos, seed)]
+  return drawnIds.slice(0, DAILY_SELECTION_SIZE)
+}
diff --git a/server/src/features/selections/selections.repository.ts b/server/src/features/selections/selections.repository.ts
new file mode 100644
index 0000000..27d1836
--- /dev/null
+++ b/server/src/features/selections/selections.repository.ts
@@ -0,0 +1,20 @@
+import type { PrismaClient } from '@prisma/client'
+import { IS_OPENED } from '../photos/photos.repository.js'
+
+// What a draw needs to know of a photo: never its image, its owner or its message.
+export type SelectionPhoto = { id: string; createdAt: Date }
+
+export type SelectionsRepository = {
+  // The library: opened photos only, like GET /api/photos.
+  findOpenedPhotos: (ownerId: string) => Promise<SelectionPhoto[]>
+}
+
+export function createSelectionsRepository(prisma: PrismaClient): SelectionsRepository {
+  return {
+    findOpenedPhotos: (ownerId) =>
+      prisma.photo.findMany({
+        where: { ownerId, ...IS_OPENED },
+        select: { id: true, createdAt: true },
+      }),
+  }
+}
diff --git a/server/src/features/selections/selections.routes.ts b/server/src/features/selections/selections.routes.ts
new file mode 100644
index 0000000..a04826e
--- /dev/null
+++ b/server/src/features/selections/selections.routes.ts
@@ -0,0 +1,9 @@
+import { Router } from 'express'
+import type { SelectionsController } from './selections.controller.js'
+
+// Reads only: no JSON body to parse.
+export function createSelectionsRouter(controller: SelectionsController): Router {
+  const router = Router()
+  router.get('/daily', controller.daily)
+  return router
+}
diff --git a/server/src/features/selections/selections.service.daily.test.ts b/server/src/features/selections/selections.service.daily.test.ts
new file mode 100644
index 0000000..fba3f3e
--- /dev/null
+++ b/server/src/features/selections/selections.service.daily.test.ts
@@ -0,0 +1,107 @@
+import { describe, expect, it, vi } from 'vitest'
+import { DAILY_SELECTION_SIZE, dayOf } from './selections.daily.js'
+import type { SelectionPhoto, SelectionsRepository } from './selections.repository.js'
+import { createSelectionsService } from './selections.service.js'
+
+const OWNER_ID = '6b044f9d56a44767c7079b02'
+const OTHER_OWNER_ID = '6b044f9d56a44767c7079b03'
+// 11:00 in Paris, 25 November 2026.
+const MORNING = new Date('2026-11-25T10:00:00Z')
+const EVENING = new Date('2026-11-25T21:00:00Z')
+const NEXT_DAY = new Date('2026-11-26T10:00:00Z')
+const YESTERDAY = new Date('2026-11-24T10:00:00Z')
+
+function photosOn(createdAt: Date, count: number, firstNumber = 1): SelectionPhoto[] {
+  return Array.from({ length: count }, (_, index) => ({
+    id: (firstNumber + index).toString(16).padStart(24, '0'),
+    createdAt,
+  }))
+}
+
+const LIBRARY = photosOn(YESTERDAY, 30)
+// Ranked 6th of the library on MORNING's day if it counted as an older photo: a test that keeps it
+// out of the lot fails when the rule on photos of the day breaks.
+const RANKED_IN_LOT_NUMBER = 103
+
+function makeDeps(photos: SelectionPhoto[] = LIBRARY, now: Date = MORNING) {
+  return {
+    repository: {
+      findOpenedPhotos: vi.fn<SelectionsRepository['findOpenedPhotos']>().mockResolvedValue(photos),
+    },
+    now: () => now,
+  }
+}
+
+function drawOn(now: Date, photos: SelectionPhoto[] = LIBRARY, ownerId = OWNER_ID) {
+  return createSelectionsService(makeDeps(photos, now)).dailySelection(ownerId)
+}
+
+describe('dayOf', () => {
+  it('changes day at midnight in Paris, not in UTC', () => {
+    expect(dayOf(new Date('2026-11-25T22:59:00Z'))).toBe('2026-11-25')
+    expect(dayOf(new Date('2026-11-25T23:00:00Z'))).toBe('2026-11-26')
+  })
+
+  it('follows summer time', () => {
+    expect(dayOf(new Date('2026-07-01T22:00:00Z'))).toBe('2026-07-02')
+  })
+})
+
+describe('dailySelection', () => {
+  it('draws DAILY_SELECTION_SIZE different photos of the library', async () => {
+    const { photoIds } = await drawOn(MORNING)
+
+    expect(photoIds).toHaveLength(DAILY_SELECTION_SIZE)
+    expect(new Set(photoIds).size).toBe(DAILY_SELECTION_SIZE)
+    expect(LIBRARY.map(({ id }) => id)).toEqual(expect.arrayContaining(photoIds))
+  })
+
+  it('reads the opened photos of the logged-in account', async () => {
+    const deps = makeDeps()
+
+    await createSelectionsService(deps).dailySelection(OWNER_ID)
+
+    expect(deps.repository.findOpenedPhotos).toHaveBeenCalledWith(OWNER_ID)
+  })
+
+  it('draws the same lot all day', async () => {
+    expect(await drawOn(EVENING)).toEqual(await drawOn(MORNING))
+  })
+
+  it('draws another lot the next day', async () => {
+    expect(await drawOn(NEXT_DAY)).not.toEqual(await drawOn(MORNING))
+  })
+
+  it('draws another lot for another account', async () => {
+    const otherLot = await drawOn(MORNING, LIBRARY, OTHER_OWNER_ID)
+
+    expect(otherLot).not.toEqual(await drawOn(MORNING))
+  })
+
+  it('keeps the lot when a photo arrives during the day', async () => {
+    const todaysPhoto = photosOn(MORNING, 1, RANKED_IN_LOT_NUMBER)
+
+    expect(await drawOn(EVENING, [...LIBRARY, ...todaysPhoto])).toEqual(await drawOn(MORNING))
+  })
+
+  it('counts a photo of 00:30 in Paris as one of the day', async () => {
+    const justAfterMidnight = photosOn(new Date('2026-11-24T23:30:00Z'), 1, RANKED_IN_LOT_NUMBER)
+    const { photoIds } = await drawOn(MORNING, [...LIBRARY, ...justAfterMidnight])
+
+    expect(photoIds).not.toContain(justAfterMidnight[0].id)
+  })
+
+  it('fills a lot with room left with the photos of the day, after the older ones', async () => {
+    const olderPhotos = photosOn(YESTERDAY, 3)
+    // Numbered after the whole library: apart from the older photos' ids.
+    const todaysPhotos = photosOn(MORNING, 2, LIBRARY.length + 1)
+    const { photoIds } = await drawOn(MORNING, [...todaysPhotos, ...olderPhotos])
+
+    expect(photoIds.slice(0, 3).sort()).toEqual(olderPhotos.map(({ id }) => id))
+    expect(photoIds.slice(3).sort()).toEqual(todaysPhotos.map(({ id }) => id))
+  })
+
+  it('answers an empty lot for an empty library', async () => {
+    expect(await drawOn(MORNING, [])).toEqual({ photoIds: [] })
+  })
+})
diff --git a/server/src/features/selections/selections.service.ts b/server/src/features/selections/selections.service.ts
new file mode 100644
index 0000000..003b881
--- /dev/null
+++ b/server/src/features/selections/selections.service.ts
@@ -0,0 +1,27 @@
+import type { Selection } from '../../types.js'
+import { drawDailySelection } from './selections.daily.js'
+import type { SelectionsRepository } from './selections.repository.js'
+
+export type SelectionsServiceDeps = {
+  repository: SelectionsRepository
+  // Injected: a test picks the day.
+  now: () => Date
+}
+
+export type SelectionsService = {
+  dailySelection: (ownerId: string) => Promise<Selection>
+}
+
+async function dailySelection(
+  { repository, now }: SelectionsServiceDeps,
+  ownerId: string,
+): Promise<Selection> {
+  const photos = await repository.findOpenedPhotos(ownerId)
+  return { photoIds: drawDailySelection(photos, ownerId, now()) }
+}
+
+export function createSelectionsService(deps: SelectionsServiceDeps): SelectionsService {
+  return {
+    dailySelection: (ownerId) => dailySelection(deps, ownerId),
+  }
+}
diff --git a/server/src/types.ts b/server/src/types.ts
index 73eda96..d1c8a4a 100644
--- a/server/src/types.ts
+++ b/server/src/types.ts
@@ -118,6 +118,9 @@ export type Collection = {
 // Sorted by name: the order of every menu that lists them.
 export type CollectionList = { collections: Collection[] }
 
+// A selection names its photos by id: the frame finds them in the library it already holds.
+export type Selection = { photoIds: string[] }
+
 // photo:new is a photo one added oneself, photo:received one a friend sent, still unopened;
 // photo:opened is a received photo that just joined the library.
 export type ServerToClientEvents = {
~~~~

- [x] **Step 2: Gates and commit**

`pnpm check:fix && pnpm typecheck && pnpm build && pnpm test`. `pnpm test` → `Test Files  24 passed (24)`, `Tests  284 passed (284)`. Bruno files: 166 requests, 358 assertion lines, 69 `test()` calls. Subject: `feat(server): draw the photos of the day`.

---

### Task 2: Build a radio from a photo (PR A, `feat/selections-server`)

**Files:**
- Create: `server/src/features/selections/selections.radio.ts`, `selections.service.radio.test.ts`, `server/bruno/selections/radio/`
- Modify: `selections.{repository,service,controller,routes}.ts`, `selections.service.daily.test.ts`, `server/src/app.ts`, `ARCHITECTURE.md`

- [x] **Step 1: Apply the diff** (final, after the review)

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index f52bf4d..5edf383 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -105,6 +105,7 @@ Le routage est fait côté navigateur (`react-router`). En production (J2), le s
 | `PUT /api/collections/:id/photos/:photoId`    | sans corps → `200 Collection` : ajoute à la fin une photo ouverte de la bibliothèque ; idempotent                                                                                                                                                              |
 | `DELETE /api/collections/:id/photos/:photoId` | `200 Collection` : retire la photo de la collection, jamais de la bibliothèque ; idempotent                                                                                                                                                                    |
 | `GET /api/selections/daily`                   | `200 Selection` : la sélection du jour du compte connecté, 20 photos au plus, le même lot toute la journée (jour de Paris)                                                                                                                                     |
+| `GET /api/selections/radio/:photoId`          | `200 Selection` : la radio construite sur une photo ouverte du compte connecté, 30 photos au plus, la photo de départ en premier                                                                                                                               |
 | `GET /api/photos?cursor=<id>&limit=<n>`       | `200 { photos, nextCursor }` : photos du compte connecté, la plus récente en premier, sans les photos reçues pas encore ouvertes ; `limit` de 1 à 100 (30 par défaut) ; `nextCursor` est l'id à passer en `cursor` pour la page suivante, `null` à la dernière |
 | `POST /api/photos`                            | `multipart/form-data` avec `photo` (fichier) → `201 Photo`                                                                                                                                                                                                     |
 | `POST /api/photos/:id/share`                  | JSON `{ friendId, message? }` → `201 Photo` : envoie une photo de sa bibliothèque à un ami accepté ; l'ami reçoit une nouvelle photo qui pointe vers la même image Cloudinary, et la réponse est cette photo telle qu'il la voit                               |
@@ -125,6 +126,8 @@ Une `Collection` vaut `{ id, name, photoIds }`, jamais son propriétaire : `phot
 
 Une `Selection` vaut `{ photoIds }` : des ids de photos ouvertes de la bibliothèque du compte, jamais les photos elles-mêmes, que le cadre a déjà chargées. La sélection du jour (`features/selections/selections.daily.ts`) range chaque photo selon le SHA-256 de `<ownerId>:<jour>:<photoId>`, le jour étant la date à Paris (`Intl.DateTimeFormat`, fuseau `Europe/Paris`) : le même jour donne le même ordre sur tous les appareils et à chaque rechargement, sans rien enregistrer, et le lendemain un autre. Les photos arrivées avant aujourd'hui passent d'abord, celles du jour ensuite, et le lot garde les 20 premières (`DAILY_SELECTION_SIZE`) : une photo ajoutée aujourd'hui n'entre que dans un lot qui a encore de la place. Limite connue : une photo reçue hier et ouverte aujourd'hui compte comme arrivée hier (sa date est celle de la réception) et peut remplacer une photo du lot en cours de journée.
 
+La radio (`features/selections/selections.radio.ts`) part d'une photo ouverte du compte (sinon `404 PHOTO_NOT_FOUND`, comme l'ouverture, id comparé en minuscules comme pour les collections) et compte, pour chaque autre photo, un point par lien : le même ami expéditeur (deux photos ajoutées par le compte lui-même ne comptent pas, ce serait presque toute la bibliothèque), 7 jours d'écart au plus entre leurs dates d'arrivée, et chaque collection qui contient les deux. Les photos liées passent de la plus liée à la moins liée, la plus proche dans le temps d'abord à égalité ; les photos sans lien complètent ensuite dans un ordre tiré au hasard (Fisher-Yates, `random` reçu en dépendance), jusqu'à 30 photos (`RADIO_LENGTH`) départ compris. La date est celle de l'ajout ou de la réception : Sharp retire les métadonnées, la date de prise de vue n'existe plus. Les collections sont lues en une requête (leurs `photoIds` seulement) ; un id de photo supprimée qui y traîne ne compte pas, la photo n'étant plus dans la bibliothèque lue.
+
 La liste est paginée par curseur (_keyset_) sur l'id : un ObjectId commence par sa date de création, trier par id revient donc à trier par date, et `id < cursor` est une seule requête sur l'index `(ownerId, id)`. Une photo ajoutée ou supprimée entre deux pages ne décale rien, contrairement à une pagination par numéro de page.
 
 En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code en message français :
@@ -214,7 +217,7 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 - `features/friendships/` suit le même découpage (`friendships.repository.ts`, `friendships.service.ts`, `friendships.controller.ts`, `friendships.routes.ts`). Le service reçoit `repository`, `avatarUrl` et `logger` ; le repository calcule `pairKey` et ne lit des comptes que `id`, `email`, `displayName` et `avatarCloudinaryId`. `app.ts` monte le routeur derrière `requireAuth`, comme les photos. Le service expose aussi `areFriends(userId, otherUserId)`, que le service photos reçoit en dépendance : la règle « amis = ligne acceptée » reste ici. `app.ts` construit le service amis une fois (`assembleFriendshipsService`) et le passe aux deux routeurs.
 - `features/account/` suit le même découpage (`account.repository.ts`, `account.service.ts`, `account.controller.ts`, `account.routes.ts`) : le compte de la personne connectée, jamais un autre (l'id vient de la session, pas de l'URL). Le service reçoit `repository`, `hashPassword`, `verifyPassword`, `toAvatarJpeg`, `uploadAvatar`, `deleteImage`, `avatarUrl` et `logger`. La photo de profil reprend la configuration Multer (`photos.upload.ts`) et `parseFile` (`photos.input.ts`) des photos : mêmes formats, même taille maximale, mêmes codes d'erreur. `app.ts` monte le routeur derrière `requireAuth`.
 - `features/collections/` suit le même découpage (`collections.repository.ts`, `collections.service.ts`, `collections.controller.ts`, `collections.routes.ts`). Le service reçoit `repository` et `logger`, valide le nom (`parseCollectionName`) et l'id, et trie la liste. Le repository traduit les refus de Prisma en `'not_found'` ou `'name_taken'`, que le service change en code d'erreur ; il lit aussi les photos (`findLivePhotoIds`, les ids encore dans la bibliothèque). Le contrôleur reçoit `io` pour `collections:changed`.
-- `features/selections/` suit le même découpage (`selections.repository.ts`, `selections.service.ts`, `selections.controller.ts`, `selections.routes.ts`), en lecture seule : ni écriture, ni événement, ni log en plus de `http.request`. Le tirage vit à part, en fonctions pures (`selections.daily.ts`). Le service reçoit `repository` et `now`, pour qu'un test choisisse le jour. Le repository ne lit des photos que `id` et `createdAt`.
+- `features/selections/` suit le même découpage (`selections.repository.ts`, `selections.service.ts`, `selections.controller.ts`, `selections.routes.ts`), en lecture seule : ni écriture, ni événement, ni log en plus de `http.request`. Le tirage vit à part, en fonctions pures (`selections.daily.ts`, `selections.radio.ts`). Le service reçoit `repository`, `now` et `random`, pour qu'un test choisisse le jour et fige le hasard. Le repository ne lit des photos que `id`, `createdAt` et `senderId`, et des collections que `photoIds`.
 - `features/auth/public-user.ts` construit le `user` renvoyé par l'API (`toPublicUser`, utilisé par les services auth, invitations et compte) : l'URL de la photo de profil vient de `avatarUrl` (`lib/cloudinary.ts`), reçu en dépendance pour qu'un test unitaire n'ait pas besoin de la configuration Cloudinary. Le service amis s'en sert aussi (`toAvatarUrl`) pour l'autre compte d'une amitié.
 - Les dépendances sont passées par des fonctions-fabriques (`createPhotosService({ repository, toFrameJpeg, uploadImage, deleteImage, areFriends, logger })`), assemblées dans `app.ts` : un test peut fournir de fausses implémentations.
 - `server/src/lib/` regroupe les clients techniques : Prisma (`db.ts`), Cloudinary, sharp (`image.ts`), `email.ts` (`parseEmail`, la même règle pour une invitation et une demande d'ami) et `account-input.ts` (`parseDisplayName`, `parsePassword` et leurs bornes, les mêmes règles à la création du compte par invitation et à sa modification par son propriétaire).
diff --git a/server/bruno/selections/radio/01-nominal-prepa-photo.bru b/server/bruno/selections/radio/01-nominal-prepa-photo.bru
new file mode 100644
index 0000000..46e3386
--- /dev/null
+++ b/server/bruno/selections/radio/01-nominal-prepa-photo.bru
@@ -0,0 +1,33 @@
+meta {
+  name: Nominal - première photo du compte jetable
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
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 201
+  res.body.id: isString
+}
+
+script:post-response {
+  bru.setVar('radioPhotoId', res.body.id)
+}
+
+docs {
+  NOMINAL → 201. Préparation : une photo dans la bibliothèque du compte
+  jetable ; son id va dans `radioPhotoId`, et `08` la supprime.
+}
diff --git a/server/bruno/selections/radio/02-nominal-prepa-seconde-photo.bru b/server/bruno/selections/radio/02-nominal-prepa-seconde-photo.bru
new file mode 100644
index 0000000..94b24f2
--- /dev/null
+++ b/server/bruno/selections/radio/02-nominal-prepa-seconde-photo.bru
@@ -0,0 +1,33 @@
+meta {
+  name: Nominal - seconde photo du compte jetable
+  type: http
+  seq: 2
+}
+
+post {
+  url: {{baseUrl}}/api/photos
+  body: multipartForm
+  auth: none
+}
+
+body:multipart-form {
+  photo: @file(fixtures/photo.png) @contentType(image/png)
+}
+
+script:pre-request {
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 201
+  res.body.id: isString
+}
+
+script:post-response {
+  bru.setVar('radioSecondPhotoId', res.body.id)
+}
+
+docs {
+  NOMINAL → 201. Préparation : un second fichier, donc pas un doublon ; son
+  id va dans `radioSecondPhotoId`, et `08` le supprime.
+}
diff --git a/server/bruno/selections/radio/03-nominal-radio.bru b/server/bruno/selections/radio/03-nominal-radio.bru
new file mode 100644
index 0000000..564a2a9
--- /dev/null
+++ b/server/bruno/selections/radio/03-nominal-radio.bru
@@ -0,0 +1,34 @@
+meta {
+  name: Nominal - radio à partir d'une photo
+  type: http
+  seq: 3
+}
+
+get {
+  url: {{baseUrl}}/api/selections/radio/{{radioPhotoId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('radioPhotoId') || !bru.getVar('radioSecondPhotoId')) {
+    throw new Error('radioPhotoId ou radioSecondPhotoId absent : lancer tout le dossier, radio/01 et 02 doivent passer')
+  }
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 200
+  res.body.photoIds.length: eq 2
+}
+
+script:post-response {
+  test('la radio commence par sa photo, puis la photo du même jour', () => {
+    expect(res.body.photoIds).to.eql([bru.getVar('radioPhotoId'), bru.getVar('radioSecondPhotoId')])
+  })
+}
+
+docs {
+  NOMINAL → 200 : la photo de `01` d'abord, puis celle de `02`, arrivée le
+  même jour.
+}
diff --git a/server/bruno/selections/radio/04-nominal-majuscules.bru b/server/bruno/selections/radio/04-nominal-majuscules.bru
new file mode 100644
index 0000000..1b179b6
--- /dev/null
+++ b/server/bruno/selections/radio/04-nominal-majuscules.bru
@@ -0,0 +1,35 @@
+meta {
+  name: Nominal - id de photo en majuscules
+  type: http
+  seq: 4
+}
+
+get {
+  url: {{baseUrl}}/api/selections/radio/{{radioPhotoIdUpper}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('radioPhotoId')) {
+    throw new Error('radioPhotoId absent : lancer tout le dossier, radio/01 doit passer')
+  }
+  bru.setVar('radioPhotoIdUpper', bru.getVar('radioPhotoId').toUpperCase())
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 200
+  res.body.photoIds.length: eq 2
+}
+
+script:post-response {
+  test('la radio commence par la photo, son id en minuscules', () => {
+    expect(res.body.photoIds[0]).to.equal(bru.getVar('radioPhotoId'))
+  })
+}
+
+docs {
+  NOMINAL → 200 : un ObjectId ne distingue pas les majuscules. La radio
+  commence par la même photo, avec l'id tel que la bibliothèque l'écrit.
+}
diff --git a/server/bruno/selections/radio/05-edge-autre-compte.bru b/server/bruno/selections/radio/05-edge-autre-compte.bru
new file mode 100644
index 0000000..308bf88
--- /dev/null
+++ b/server/bruno/selections/radio/05-edge-autre-compte.bru
@@ -0,0 +1,22 @@
+meta {
+  name: Edge - photo d'un autre compte
+  type: http
+  seq: 5
+}
+
+get {
+  url: {{baseUrl}}/api/selections/radio/{{radioPhotoId}}
+  body: none
+  auth: none
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq PHOTO_NOT_FOUND
+}
+
+docs {
+  EDGE → 404 PHOTO_NOT_FOUND : le membre (cookie par défaut) demande une
+  radio sur une photo du compte jetable. La réponse est celle d'une photo
+  inconnue.
+}
diff --git a/server/bruno/selections/radio/06-edge-photo-inconnue.bru b/server/bruno/selections/radio/06-edge-photo-inconnue.bru
new file mode 100644
index 0000000..a8b7c15
--- /dev/null
+++ b/server/bruno/selections/radio/06-edge-photo-inconnue.bru
@@ -0,0 +1,25 @@
+meta {
+  name: Edge - photo inconnue
+  type: http
+  seq: 6
+}
+
+get {
+  url: {{baseUrl}}/api/selections/radio/6b044f9d56a44767c7079a99
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq PHOTO_NOT_FOUND
+}
+
+docs {
+  EDGE → 404 PHOTO_NOT_FOUND : un ObjectId bien formé qu'aucune photo ne
+  porte.
+}
diff --git a/server/bruno/selections/radio/07-edge-id-invalide.bru b/server/bruno/selections/radio/07-edge-id-invalide.bru
new file mode 100644
index 0000000..7bcd379
--- /dev/null
+++ b/server/bruno/selections/radio/07-edge-id-invalide.bru
@@ -0,0 +1,25 @@
+meta {
+  name: Edge - id mal formé
+  type: http
+  seq: 7
+}
+
+get {
+  url: {{baseUrl}}/api/selections/radio/pas-un-id
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  req.setHeader('Cookie', bru.getVar('inviteeCookie'))
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq PHOTO_NOT_FOUND
+}
+
+docs {
+  EDGE → 404 PHOTO_NOT_FOUND : un id qui n'est pas un ObjectId ne va pas
+  jusqu'à la base, il répond comme une photo inconnue.
+}
diff --git a/server/bruno/selections/radio/08-edge-photo-supprimee.bru b/server/bruno/selections/radio/08-edge-photo-supprimee.bru
new file mode 100644
index 0000000..3e3e856
--- /dev/null
+++ b/server/bruno/selections/radio/08-edge-photo-supprimee.bru
@@ -0,0 +1,43 @@
+meta {
+  name: Edge - photo supprimée
+  type: http
+  seq: 8
+}
+
+get {
+  url: {{baseUrl}}/api/selections/radio/{{radioPhotoId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  const axios = require('axios')
+  if (!bru.getVar('radioPhotoId') || !bru.getVar('radioSecondPhotoId')) {
+    throw new Error('radioPhotoId ou radioSecondPhotoId absent : lancer tout le dossier, radio/01 et 02 doivent passer')
+  }
+  const headers = { Cookie: bru.getVar('inviteeCookie') }
+  req.setHeader('Cookie', headers.Cookie)
+  // The photo leaves the library first, then this request asks for its radio.
+  await axios.delete(`${bru.getEnvVar('baseUrl')}/api/photos/${bru.getVar('radioPhotoId')}`, {
+    headers,
+  })
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq PHOTO_NOT_FOUND
+}
+
+script:post-response {
+  const axios = require('axios')
+  // The second photo was only for this folder: deleted, its image leaves Cloudinary.
+  await axios.delete(`${bru.getEnvVar('baseUrl')}/api/photos/${bru.getVar('radioSecondPhotoId')}`, {
+    headers: { Cookie: bru.getVar('inviteeCookie') },
+  })
+}
+
+docs {
+  EDGE → 404 PHOTO_NOT_FOUND : le script de départ supprime la photo de
+  `01`, puis la requête demande sa radio. Le script de fin supprime la
+  photo de `02` : le compte jetable n'a plus de photo.
+}
diff --git a/server/bruno/selections/radio/09-nominal-prepa-photo-recue.bru b/server/bruno/selections/radio/09-nominal-prepa-photo-recue.bru
new file mode 100644
index 0000000..b324e1e
--- /dev/null
+++ b/server/bruno/selections/radio/09-nominal-prepa-photo-recue.bru
@@ -0,0 +1,58 @@
+meta {
+  name: Nominal - photo reçue d'un ami, pas encore ouverte
+  type: http
+  seq: 9
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
+  bru.setVar('radioFriendshipId', data.friendship.id)
+}
+
+assert {
+  res.status: eq 201
+  res.body.id: isString
+}
+
+script:post-response {
+  const axios = require('axios')
+  bru.setVar('radioUnopenedPhotoId', res.body.id)
+  // The friendship was only for this photo: the member keeps no tie to the throwaway account.
+  await axios.delete(
+    `${bru.getEnvVar('baseUrl')}/api/friendships/${bru.getVar('radioFriendshipId')}`,
+    { headers: { Cookie: bru.getVar('sessionCookie') } },
+  )
+}
+
+docs {
+  NOMINAL → 201. Préparation : le membre devient l'ami du compte jetable,
+  lui envoie un fichier, puis l'amitié est supprimée. La photo attend le
+  compte jetable, non ouverte ; son id va dans `radioUnopenedPhotoId`.
+}
diff --git a/server/bruno/selections/radio/10-edge-photo-pas-ouverte.bru b/server/bruno/selections/radio/10-edge-photo-pas-ouverte.bru
new file mode 100644
index 0000000..585e449
--- /dev/null
+++ b/server/bruno/selections/radio/10-edge-photo-pas-ouverte.bru
@@ -0,0 +1,41 @@
+meta {
+  name: Edge - photo reçue pas encore ouverte
+  type: http
+  seq: 10
+}
+
+get {
+  url: {{baseUrl}}/api/selections/radio/{{radioUnopenedPhotoId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('radioUnopenedPhotoId')) {
+    throw new Error('radioUnopenedPhotoId absent : lancer tout le dossier, radio/09 doit passer')
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
+  const baseUrl = bru.getEnvVar('baseUrl')
+  const headers = { Cookie: bru.getVar('inviteeCookie') }
+  test('la sélection du jour ne la tire pas non plus', async () => {
+    const lot = await axios.get(`${baseUrl}/api/selections/daily`, { headers })
+    expect(lot.data.photoIds).to.eql([])
+  })
+  // The photo was only for this test: deleted, its image leaves Cloudinary.
+  await axios.delete(`${baseUrl}/api/photos/${bru.getVar('radioUnopenedPhotoId')}`, { headers })
+}
+
+docs {
+  EDGE → 404 PHOTO_NOT_FOUND : une photo reçue n'entre dans les sélections
+  qu'une fois ouverte, comme dans la bibliothèque. Le script vérifie que la
+  sélection du jour reste vide, puis supprime la photo reçue.
+}
diff --git a/server/bruno/selections/radio/11-edge-sans-cookie.bru b/server/bruno/selections/radio/11-edge-sans-cookie.bru
new file mode 100644
index 0000000..f21e77a
--- /dev/null
+++ b/server/bruno/selections/radio/11-edge-sans-cookie.bru
@@ -0,0 +1,26 @@
+meta {
+  name: Edge - sans cookie de session
+  type: http
+  seq: 11
+}
+
+get {
+  url: {{baseUrl}}/api/selections/radio/6b044f9d56a44767c7079a99
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
+  EDGE → 401 UNAUTHENTICATED : la radio demande une session, avant même de
+  regarder la photo.
+}
diff --git a/server/bruno/selections/radio/folder.bru b/server/bruno/selections/radio/folder.bru
new file mode 100644
index 0000000..2d377bb
--- /dev/null
+++ b/server/bruno/selections/radio/folder.bru
@@ -0,0 +1,19 @@
+meta {
+  name: radio
+  seq: 2
+}
+
+docs {
+  `GET /api/selections/radio/:photoId` → 200 `{ photoIds }` : la radio
+  construite sur une photo de la bibliothèque, 30 photos au plus. La photo
+  de départ d'abord, puis les photos qui lui sont liées (même ami
+  expéditeur, arrivées à 7 jours d'écart au plus, collections en commun),
+  les plus liées d'abord, puis les autres au hasard. Une photo d'un autre
+  compte, inconnue, reçue pas encore ouverte, supprimée ou un id mal formé :
+  404 `PHOTO_NOT_FOUND`.
+
+  Les deux photos de ce dossier arrivent le même jour : la seconde est liée
+  à la première par la date. Le classement lui-même (expéditeur,
+  collections, égalités, complément au hasard) est vérifié par les tests
+  unitaires.
+}
diff --git a/server/src/app.ts b/server/src/app.ts
index fe5e0ee..5af74e3 100644
--- a/server/src/app.ts
+++ b/server/src/app.ts
@@ -85,6 +85,7 @@ function assembleSelectionsRouter(): Router {
   const service = createSelectionsService({
     repository: createSelectionsRepository(prisma),
     now: () => new Date(),
+    random: Math.random,
   })
   return createSelectionsRouter(createSelectionsController(service))
 }
diff --git a/server/src/features/selections/selections.controller.ts b/server/src/features/selections/selections.controller.ts
index 83f2994..507b4f0 100644
--- a/server/src/features/selections/selections.controller.ts
+++ b/server/src/features/selections/selections.controller.ts
@@ -5,6 +5,7 @@ import type { SelectionsService } from './selections.service.js'
 
 export type SelectionsController = {
   daily: (req: Request, res: Response) => Promise<void>
+  radio: (req: Request<{ photoId: string }>, res: Response) => Promise<void>
 }
 
 async function daily(service: SelectionsService, req: Request, res: Response): Promise<void> {
@@ -12,8 +13,19 @@ async function daily(service: SelectionsService, req: Request, res: Response): P
   res.json(body)
 }
 
+async function radio(
+  service: SelectionsService,
+  req: Request<{ photoId: string }>,
+  res: Response,
+): Promise<void> {
+  const ownerId = currentUser(req).id
+  const body: Selection = await service.radioSelection({ ownerId, photoId: req.params.photoId })
+  res.json(body)
+}
+
 export function createSelectionsController(service: SelectionsService): SelectionsController {
   return {
     daily: (req, res) => daily(service, req, res),
+    radio: (req, res) => radio(service, req, res),
   }
 }
diff --git a/server/src/features/selections/selections.radio.ts b/server/src/features/selections/selections.radio.ts
new file mode 100644
index 0000000..d64bd9e
--- /dev/null
+++ b/server/src/features/selections/selections.radio.ts
@@ -0,0 +1,73 @@
+import type { SelectionPhoto } from './selections.repository.js'
+
+// The photo it starts from and 29 more: a few minutes of frame before it loops.
+export const RADIO_LENGTH = 30
+
+const MS_PER_DAY = 24 * 60 * 60 * 1000
+// The same week: a holiday, a birthday, a family visit.
+const CLOSE_DATES_MS = 7 * MS_PER_DAY
+
+export type RadioDraw = {
+  photos: SelectionPhoto[]
+  start: SelectionPhoto
+  // One list of photo ids per collection of the owner.
+  collections: string[][]
+  random: () => number
+}
+
+type RadioContext = { start: SelectionPhoto; startCollections: string[][] }
+
+type ScoredPhoto = { photo: SelectionPhoto; linkCount: number; gapMs: number }
+
+function timeGapMs(photo: SelectionPhoto, start: SelectionPhoto): number {
+  return Math.abs(photo.createdAt.getTime() - start.createdAt.getTime())
+}
+
+// One point per link: the same friend sent both, they arrived within a week of each other, and
+// each collection holding both. Two photos the owner added share no sender: that is most of a
+// library, it would link everything.
+function countLinks(photo: SelectionPhoto, { start, startCollections }: RadioContext): number {
+  const isSameSender = start.senderId !== null && photo.senderId === start.senderId
+  const isCloseInTime = timeGapMs(photo, start) <= CLOSE_DATES_MS
+  const sharedCollectionCount = startCollections.filter((photoIds) =>
+    photoIds.includes(photo.id),
+  ).length
+  return Number(isSameSender) + Number(isCloseInTime) + sharedCollectionCount
+}
+
+// Most links first; between equals, the closest in time.
+function byLinks(a: ScoredPhoto, b: ScoredPhoto): number {
+  return b.linkCount - a.linkCount || a.gapMs - b.gapMs
+}
+
+// Fisher-Yates on a copy: every order is equally likely.
+function shuffled(items: ScoredPhoto[], random: () => number): ScoredPhoto[] {
+  const result = [...items]
+  for (let index = result.length - 1; index > 0; index--) {
+    const swapIndex = Math.floor(random() * (index + 1))
+    const swapped = result[index]
+    result[index] = result[swapIndex]
+    result[swapIndex] = swapped
+  }
+  return result
+}
+
+// The start photo, then the photos linked to it, then, when they run out, the others at random.
+export function buildRadio({ photos, start, collections, random }: RadioDraw): string[] {
+  const startCollections = collections.filter((photoIds) => photoIds.includes(start.id))
+  const context = { start, startCollections }
+  const scored = photos
+    .filter(({ id }) => id !== start.id)
+    .map((photo) => ({
+      photo,
+      linkCount: countLinks(photo, context),
+      gapMs: timeGapMs(photo, start),
+    }))
+  const linked = scored.filter(({ linkCount }) => linkCount > 0).sort(byLinks)
+  const unlinked = shuffled(
+    scored.filter(({ linkCount }) => linkCount === 0),
+    random,
+  )
+  const followingIds = [...linked, ...unlinked].map(({ photo }) => photo.id)
+  return [start.id, ...followingIds].slice(0, RADIO_LENGTH)
+}
diff --git a/server/src/features/selections/selections.repository.ts b/server/src/features/selections/selections.repository.ts
index 27d1836..8688eaf 100644
--- a/server/src/features/selections/selections.repository.ts
+++ b/server/src/features/selections/selections.repository.ts
@@ -1,12 +1,15 @@
 import type { PrismaClient } from '@prisma/client'
 import { IS_OPENED } from '../photos/photos.repository.js'
 
-// What a draw needs to know of a photo: never its image, its owner or its message.
-export type SelectionPhoto = { id: string; createdAt: Date }
+// What a draw needs to know of a photo: never its image, its owner or its message. senderId is
+// null for a photo its owner added.
+export type SelectionPhoto = { id: string; createdAt: Date; senderId: string | null }
 
 export type SelectionsRepository = {
   // The library: opened photos only, like GET /api/photos.
   findOpenedPhotos: (ownerId: string) => Promise<SelectionPhoto[]>
+  // One list of photo ids per collection of the owner, deleted photos maybe included.
+  findCollectionPhotoIds: (ownerId: string) => Promise<string[][]>
 }
 
 export function createSelectionsRepository(prisma: PrismaClient): SelectionsRepository {
@@ -14,7 +17,14 @@ export function createSelectionsRepository(prisma: PrismaClient): SelectionsRepo
     findOpenedPhotos: (ownerId) =>
       prisma.photo.findMany({
         where: { ownerId, ...IS_OPENED },
-        select: { id: true, createdAt: true },
+        select: { id: true, createdAt: true, senderId: true },
       }),
+    findCollectionPhotoIds: async (ownerId) => {
+      const collections = await prisma.collection.findMany({
+        where: { ownerId },
+        select: { photoIds: true },
+      })
+      return collections.map(({ photoIds }) => photoIds)
+    },
   }
 }
diff --git a/server/src/features/selections/selections.routes.ts b/server/src/features/selections/selections.routes.ts
index a04826e..8ac6a68 100644
--- a/server/src/features/selections/selections.routes.ts
+++ b/server/src/features/selections/selections.routes.ts
@@ -5,5 +5,6 @@ import type { SelectionsController } from './selections.controller.js'
 export function createSelectionsRouter(controller: SelectionsController): Router {
   const router = Router()
   router.get('/daily', controller.daily)
+  router.get('/radio/:photoId', controller.radio)
   return router
 }
diff --git a/server/src/features/selections/selections.service.daily.test.ts b/server/src/features/selections/selections.service.daily.test.ts
index fba3f3e..ba1fe24 100644
--- a/server/src/features/selections/selections.service.daily.test.ts
+++ b/server/src/features/selections/selections.service.daily.test.ts
@@ -15,6 +15,7 @@ function photosOn(createdAt: Date, count: number, firstNumber = 1): SelectionPho
   return Array.from({ length: count }, (_, index) => ({
     id: (firstNumber + index).toString(16).padStart(24, '0'),
     createdAt,
+    senderId: null,
   }))
 }
 
@@ -27,8 +28,10 @@ function makeDeps(photos: SelectionPhoto[] = LIBRARY, now: Date = MORNING) {
   return {
     repository: {
       findOpenedPhotos: vi.fn<SelectionsRepository['findOpenedPhotos']>().mockResolvedValue(photos),
+      findCollectionPhotoIds: vi.fn<SelectionsRepository['findCollectionPhotoIds']>(),
     },
     now: () => now,
+    random: Math.random,
   }
 }
 
diff --git a/server/src/features/selections/selections.service.radio.test.ts b/server/src/features/selections/selections.service.radio.test.ts
new file mode 100644
index 0000000..bc4361b
--- /dev/null
+++ b/server/src/features/selections/selections.service.radio.test.ts
@@ -0,0 +1,141 @@
+import { describe, expect, it, vi } from 'vitest'
+import { AppError } from '../../errors/app-error.js'
+import { RADIO_LENGTH } from './selections.radio.js'
+import type { SelectionPhoto, SelectionsRepository } from './selections.repository.js'
+import { createSelectionsService } from './selections.service.js'
+
+const OWNER_ID = '6b044f9d56a44767c7079b02'
+const MAMIE_ID = '6b044f9d56a44767c7079b05'
+
+function photo(number: number, createdAt: string, senderId: string | null = null): SelectionPhoto {
+  return { id: number.toString(16).padStart(24, 'a'), createdAt: new Date(createdAt), senderId }
+}
+
+// Sent by Mamie on 1 June: the radio starts from it.
+const START = photo(1, '2026-06-01T10:00:00Z', MAMIE_ID)
+const SAME_SENDER = photo(2, '2026-01-01T10:00:00Z', MAMIE_ID)
+const FOUR_DAYS_LATER = photo(3, '2026-06-05T10:00:00Z')
+const EIGHT_DAYS_LATER = photo(4, '2026-06-09T10:00:00Z')
+const IN_TWO_COLLECTIONS = photo(5, '2026-01-01T10:00:00Z')
+const UNRELATED = photo(6, '2026-01-01T10:00:00Z')
+const LIBRARY = [
+  START,
+  SAME_SENDER,
+  FOUR_DAYS_LATER,
+  EIGHT_DAYS_LATER,
+  IN_TWO_COLLECTIONS,
+  UNRELATED,
+]
+const COLLECTIONS = [
+  [START.id, IN_TWO_COLLECTIONS.id],
+  [IN_TWO_COLLECTIONS.id, START.id],
+  // Without the start photo: it links nothing to it.
+  [UNRELATED.id],
+]
+
+// With random always 0, Fisher-Yates swaps each item with the first: [a, b] becomes [b, a].
+function makeDeps(photos: SelectionPhoto[] = LIBRARY, collections: string[][] = COLLECTIONS) {
+  return {
+    repository: {
+      findOpenedPhotos: vi.fn<SelectionsRepository['findOpenedPhotos']>().mockResolvedValue(photos),
+      findCollectionPhotoIds: vi
+        .fn<SelectionsRepository['findCollectionPhotoIds']>()
+        .mockResolvedValue(collections),
+    },
+    now: () => new Date('2026-11-25T10:00:00Z'),
+    random: vi.fn(() => 0),
+  }
+}
+
+async function radioFrom(photoId: string, deps = makeDeps()): Promise<string[]> {
+  const { photoIds } = await createSelectionsService(deps).radioSelection({
+    ownerId: OWNER_ID,
+    photoId,
+  })
+  return photoIds
+}
+
+describe('radioSelection', () => {
+  it('starts with the photo it is built on', async () => {
+    expect((await radioFrom(START.id))[0]).toBe(START.id)
+  })
+
+  it('reads the photos and the collections of the logged-in account', async () => {
+    const deps = makeDeps()
+
+    await radioFrom(START.id, deps)
+
+    expect(deps.repository.findOpenedPhotos).toHaveBeenCalledWith(OWNER_ID)
+    expect(deps.repository.findCollectionPhotoIds).toHaveBeenCalledWith(OWNER_ID)
+  })
+
+  it('plays the most linked photos first, the closest in time between equals', async () => {
+    expect(await radioFrom(START.id)).toEqual([
+      START.id,
+      // Two shared collections.
+      IN_TWO_COLLECTIONS.id,
+      // One link each: the same week, then the same sender five months earlier.
+      FOUR_DAYS_LATER.id,
+      SAME_SENDER.id,
+      // No link: eight days is no longer close, and the collection without START does not count.
+      UNRELATED.id,
+      EIGHT_DAYS_LATER.id,
+    ])
+  })
+
+  it('does not link two photos the owner added as the same sender', async () => {
+    const ownStart = photo(10, '2026-06-01T10:00:00Z')
+    const ownCloser = photo(11, '2026-02-01T10:00:00Z')
+    const ownFarther = photo(12, '2026-01-01T10:00:00Z')
+    const deps = makeDeps([ownStart, ownCloser, ownFarther], [])
+
+    // Linked, they would come closest first; unlinked, the draw swaps them.
+    expect(await radioFrom(ownStart.id, deps)).toEqual([ownStart.id, ownFarther.id, ownCloser.id])
+  })
+
+  it('tops up with the unlinked photos in the order the draw gives', async () => {
+    const deps = makeDeps()
+    // Close to 1, Fisher-Yates swaps nothing: the library's order, where a draw of 0 reverses it.
+    const drawWithoutSwap = 0.99
+    deps.random.mockReturnValue(drawWithoutSwap)
+
+    const unlinkedTail = (await radioFrom(START.id, deps)).slice(-2)
+
+    expect(unlinkedTail).toEqual([EIGHT_DAYS_LATER.id, UNRELATED.id])
+  })
+
+  it('stops at RADIO_LENGTH photos, without a draw when the linked photos fill it', async () => {
+    const moreThanRadioLength = RADIO_LENGTH + 10
+    const sameWeek = Array.from({ length: moreThanRadioLength }, (_, index) =>
+      photo(LIBRARY.length + 1 + index, '2026-06-02T10:00:00Z'),
+    )
+    const deps = makeDeps([START, ...sameWeek], [])
+
+    expect(await radioFrom(START.id, deps)).toHaveLength(RADIO_LENGTH)
+    expect(deps.random).not.toHaveBeenCalled()
+  })
+
+  it('plays the photo alone in a library of one', async () => {
+    expect(await radioFrom(START.id, makeDeps([START], []))).toEqual([START.id])
+  })
+
+  it('finds a photo id sent in capitals', async () => {
+    expect((await radioFrom(START.id.toUpperCase()))[0]).toBe(START.id)
+  })
+
+  it('refuses a photo outside the opened library before reading the collections', async () => {
+    const deps = makeDeps()
+
+    await expect(radioFrom('6b044f9d56a44767c7079a99', deps)).rejects.toThrow(
+      new AppError('PHOTO_NOT_FOUND'),
+    )
+    expect(deps.repository.findCollectionPhotoIds).not.toHaveBeenCalled()
+  })
+
+  it('refuses an id that is not an ObjectId before any query', async () => {
+    const deps = makeDeps()
+
+    await expect(radioFrom('pas-un-id', deps)).rejects.toThrow(new AppError('PHOTO_NOT_FOUND'))
+    expect(deps.repository.findOpenedPhotos).not.toHaveBeenCalled()
+  })
+})
diff --git a/server/src/features/selections/selections.service.ts b/server/src/features/selections/selections.service.ts
index 003b881..6c287f6 100644
--- a/server/src/features/selections/selections.service.ts
+++ b/server/src/features/selections/selections.service.ts
@@ -1,15 +1,23 @@
+import { AppError } from '../../errors/app-error.js'
 import type { Selection } from '../../types.js'
+import { parsePhotoId } from '../photos/photos.input.js'
 import { drawDailySelection } from './selections.daily.js'
+import { buildRadio } from './selections.radio.js'
 import type { SelectionsRepository } from './selections.repository.js'
 
 export type SelectionsServiceDeps = {
   repository: SelectionsRepository
-  // Injected: a test picks the day.
+  // Injected: a test picks the day, and fixes the radio's draw.
   now: () => Date
+  random: () => number
 }
 
+// photoId comes from the URL; ownerId is the logged-in account.
+export type RadioRequest = { ownerId: string; photoId: string }
+
 export type SelectionsService = {
   dailySelection: (ownerId: string) => Promise<Selection>
+  radioSelection: (request: RadioRequest) => Promise<Selection>
 }
 
 async function dailySelection(
@@ -20,8 +28,25 @@ async function dailySelection(
   return { photoIds: drawDailySelection(photos, ownerId, now()) }
 }
 
+// Unknown, someone else's and still unopened photos all answer « not found », like opening one.
+async function radioSelection(
+  { repository, random }: SelectionsServiceDeps,
+  { ownerId, photoId }: RadioRequest,
+): Promise<Selection> {
+  // MongoDB answers ObjectIds in lowercase: an id sent in capitals must compare equal to it.
+  const startId = parsePhotoId(photoId).toLowerCase()
+  const photos = await repository.findOpenedPhotos(ownerId)
+  const start = photos.find(({ id }) => id === startId)
+  if (!start) {
+    throw new AppError('PHOTO_NOT_FOUND')
+  }
+  const collections = await repository.findCollectionPhotoIds(ownerId)
+  return { photoIds: buildRadio({ photos, start, collections, random }) }
+}
+
 export function createSelectionsService(deps: SelectionsServiceDeps): SelectionsService {
   return {
     dailySelection: (ownerId) => dailySelection(deps, ownerId),
+    radioSelection: (request) => radioSelection(deps, request),
   }
 }
~~~~

- [x] **Step 2: Gates and commit**

`pnpm check:fix && pnpm typecheck && pnpm build && pnpm test`. `pnpm test` → `Test Files  25 passed (25)`, `Tests  294 passed (294)`. Bruno files: 177 requests, 380 assertion lines, 72 `test()` calls. Subject: `feat(server): build a radio from a photo`.

---

## PR B — `feat/selections-daily`

### Task 3: Play the photos of the day on the frame (PR B, `feat/selections-daily`)

**Files:**
- Create: `client/src/selections/{selection,selectionsApi}.ts`, `client/src/hooks/useDailySelection.ts`
- Modify: `client/src/photoSource.ts`, `hooks/{useSourcePhotos,useFrameMode}.ts`, `components/frame/frameSettingOptions.ts`, `docs/produit/{cadre,preferences,README,a-venir}.md`, `ARCHITECTURE.md`

- [x] **Step 1: Apply the diff** (final, after the review)

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 5edf383..709e1c9 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -48,9 +48,9 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 | `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
 | `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
 | `/`                  | bibliothèque : en tête, quand des photos reçues attendent, l'annonce « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la carte d'envoi (« Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui n'envoie le fichier qu'à l'ami), puis « Mes collections » (`components/collections/` : « Nouvelle collection », une ligne par collection avec son nombre de photos et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer »), puis les photos du compte en vignettes ou en liste (choix mémorisé par appareil), « Mode cadre » à côté du choix vignettes/liste lance le diaporama, 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/`) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
-| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), ou d'une de ses collections, avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                                 |
+| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour ou d'une de ses collections, avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                      |
 | `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
-| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
+| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
 | `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
 
 Visionneuse : l'adresse `/?photo=<id>` ouvre la photo, un lien la partage. Ouvrir depuis la bibliothèque ajoute une entrée d'historique, passer d'une photo à l'autre la remplace, et fermer revient en arrière : le bouton retour d'Android ferme la visionneuse. Près de la fin des photos chargées, la page suivante se charge. Une photo supprimée pendant qu'on la regarde laisse sa place à la suivante (la précédente si c'était la plus ancienne), et la visionneuse se ferme quand il n'en reste aucune ; un lien vers une photo inconnue charge les pages jusqu'à la trouver, puis ferme s'il n'y en a plus. « Mode cadre » remplace l'entrée de la visionneuse (ou s'ajoute au-dessus de la bibliothèque depuis son en-tête) : quitter le cadre ramène une seule visionneuse, et le retour arrière la bibliothèque. Le lien « Cadre » de la barre ajoute une entrée d'historique ordinaire : c'est aussi l'adresse qu'un cadre ouvre au démarrage.
@@ -59,7 +59,9 @@ Plein écran (`client/src/fullscreen.ts`) : le navigateur ne l'accorde que penda
 
 Réglages du cadre (`client/src/frameSettings.ts`) : le modèle d'affichage, l'ordre de lecture, la vitesse et la source des photos sont gardés par appareil dans le `localStorage` (clé `familyframe.frame-settings`, un objet JSON). Chaque valeur est vérifiée seule à la lecture : une valeur inconnue revient à sa valeur par défaut sans effacer les autres. Chaque accès est dans un `try/catch` : en navigation privée, ou si le stockage est bloqué, les choix valent pour la visite. `useFrameSettings` relit le stockage sur l'événement `storage`, que le navigateur envoie aux autres onglets du même site. La pause et le bandeau de vignettes restent en mémoire (`useSlideshowSettings`) : ils reviennent à leur valeur par défaut à chaque ouverture.
 
-Source des photos (`client/src/photoSource.ts`) : `PhotoSource` vaut `{ kind: 'library' }` (par défaut) ou `{ kind: 'collection', collectionId }` ; l'étape 11 y ajoutera ses propres sortes. Les menus et les groupes de boutons ne manient que des chaînes : `sourceKey` et `sourceFromKey` passent de l'une à l'autre (`library`, `collection:<id>`). `useSourcePhotos` filtre le flux du cadre avec les `photoIds` de la collection, lus dans `CollectionsProvider` : pas de requête de plus, l'ordre reste celui du flux (du plus récent au plus ancien), une photo pas encore découverte, absente du flux, n'est jamais lue, et une photo rangée ou retirée suit `collections:changed`. Tant que les collections chargent, le cadre reste sur « Chargement des photos… » ; une collection inconnue (supprimée, ou liste en échec) fait lire la bibliothèque, jusqu'à ce qu'une liste qui la contient arrive, et une collection vide affiche `emptyCollection`. Le stockage garde le choix fait, même si la collection disparaît : `playedSourceKey` donne la source vraiment lue, celle que cochent les menus. Changer de source repart de la photo la plus récente (`useRestartOnSourceChange` dans `useFrameMode`, pendant le rendu ; la première source connue après le chargement n'est pas un changement, `/frame?photo=<id>` garde sa photo) et tire un nouveau mélange qui commence par cette photo : le hook rend la plus récente dès le rendu du changement, avant que la sélection ne la rejoigne (`usePlaybackPhotos` garde la clé de la source du tour tiré).
+Source des photos (`client/src/photoSource.ts`) : `PhotoSource` vaut `{ kind: 'library' }` (par défaut), `{ kind: 'daily' }` (la sélection du jour) ou `{ kind: 'collection', collectionId }`. Les menus et les groupes de boutons ne manient que des chaînes : `sourceKey` et `sourceFromKey` passent de l'une à l'autre (`library`, `daily`, `collection:<id>`). `useSourcePhotos` filtre le flux du cadre avec des ids (`SelectedIds` : `loading`, `unavailable` ou `ready`), ceux de la collection, lus dans `CollectionsProvider`, ou ceux de la sélection du jour, lus par `useDailySelection` : pas de requête de plus, l'ordre reste celui du flux (du plus récent au plus ancien), une photo pas encore découverte, absente du flux, n'est jamais lue, et une photo rangée ou retirée suit `collections:changed`. Tant que les collections chargent, le cadre reste sur « Chargement des photos… » ; une collection inconnue (supprimée, ou liste en échec) fait lire la bibliothèque, jusqu'à ce qu'une liste qui la contient arrive, et une collection vide affiche `emptyCollection`. Le stockage garde le choix fait, même si la collection disparaît : `playedSourceKey` donne la source vraiment lue, celle que cochent les menus. Changer de source repart de la photo la plus récente (`useRestartOnSourceChange` dans `useFrameMode`, pendant le rendu ; la première source connue après le chargement n'est pas un changement, `/frame?photo=<id>` garde sa photo) et tire un nouveau mélange qui commence par cette photo : le hook rend la plus récente dès le rendu du changement, avant que la sélection ne la rejoigne (`usePlaybackPhotos` garde la clé de la source du tour tiré).
+
+Sélection du jour sur le cadre (`hooks/useDailySelection.ts`, `selections/selectionsApi.ts`) : tant que la source est `daily`, le hook ouvre sa propre connexion Socket.IO, comme `CollectionsProvider`, et relit `GET /api/selections/daily` à chaque connexion, à `photo:new`, `photo:opened` et `photo:deleted` (le serveur tire le lot à nouveau : une photo du jour n'entre que s'il reste de la place, une photo supprimée laisse sa place à une autre), et tous les quarts d'heure, car minuit n'envoie aucun événement ; seul le dernier chargement lancé s'applique. Un premier échec rend `unavailable` : le cadre lit la bibliothèque, et le menu garde « Sélection du jour » coché ; un échec plus tard garde le lot affiché. Les photos restent celles du flux, dans son ordre : une photo pas encore découverte n'est jamais lue. Quitter la source ferme la connexion et oublie le lot : y revenir attend un lot neuf (« Chargement des photos… »). Une sélection vide veut dire une bibliothèque vide : l'écran est celui de la bibliothèque (« En attente de la première photo… » ou « Des photos vous attendent. »).
 
 Lecture aléatoire (`hooks/usePlaybackPhotos.ts`, fonctions pures dans `shuffleOrder.ts`) : un mélange de Fisher-Yates tiré une fois et gardé dans l'état, recalculé pendant le rendu comme la sélection du cadre. Une photo arrivée s'insère juste après la photo affichée, une photo supprimée sort de l'ordre ; quand la dernière photo du tour laisse la place à la première, un nouveau tour est tiré, qui commence par la photo affichée. La sélection (`useFrameSelection`) reste calculée sur le flux, du plus récent au plus ancien : seul l'ordre du carrousel et du bandeau change.
 
diff --git a/client/src/components/frame/frameSettingOptions.ts b/client/src/components/frame/frameSettingOptions.ts
index 28bde75..a4f4f2a 100644
--- a/client/src/components/frame/frameSettingOptions.ts
+++ b/client/src/components/frame/frameSettingOptions.ts
@@ -1,6 +1,6 @@
 import type { Collection } from '@/collections/collection.ts'
 import { type FrameTemplate, type PlaybackOrder, SLIDESHOW_INTERVALS_MS } from '@/frameSettings.ts'
-import { LIBRARY_SOURCE, sourceKey } from '@/photoSource.ts'
+import { DAILY_SOURCE, LIBRARY_SOURCE, sourceKey } from '@/photoSource.ts'
 
 export type SettingOption<Value> = { value: Value; label: string }
 
@@ -33,10 +33,12 @@ export const INTERVAL_OPTIONS: SettingOption<number>[] = SLIDESHOW_INTERVALS_MS.
   (intervalMs) => ({ value: intervalMs, label: `${intervalMs / MS_PER_SECOND} s` }),
 )
 
-// The library first, then each collection by name, as the collections list shows them.
+// The library and the day's selection first, then each collection by name, as the collections
+// list shows them.
 export function sourceOptions(collections: Collection[]): SettingOption<string>[] {
   return [
     { value: sourceKey(LIBRARY_SOURCE), label: 'Toute la bibliothèque' },
+    { value: sourceKey(DAILY_SOURCE), label: 'Sélection du jour' },
     ...collections.map(({ id, name }) => ({
       value: sourceKey({ kind: 'collection', collectionId: id }),
       label: name,
diff --git a/client/src/hooks/useDailySelection.ts b/client/src/hooks/useDailySelection.ts
new file mode 100644
index 0000000..dacfc3c
--- /dev/null
+++ b/client/src/hooks/useDailySelection.ts
@@ -0,0 +1,67 @@
+import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
+import { useAuth } from '@/auth/AuthContext.ts'
+import { connectPhotoSocket } from '@/photoSocket.ts'
+import type { SelectedIds } from '@/selections/selection.ts'
+import { fetchDailySelection } from '@/selections/selectionsApi.ts'
+
+// Midnight sends no event: a check every quarter of an hour picks up the new day's lot.
+const DAY_CHECK_MS = 15 * 60 * 1000
+
+type SetIds = Dispatch<SetStateAction<SelectedIds>>
+
+type DailyLoader = { load: () => Promise<void>; stop: () => void }
+
+// Only the latest load applies its answer. A failed reload keeps the lot on screen.
+function createDailyLoader(setIds: SetIds, dropUser: () => void): DailyLoader {
+  let latestLoadId = 0
+  return {
+    load: async () => {
+      latestLoadId += 1
+      const loadId = latestLoadId
+      const selection = await fetchDailySelection(() => {
+        if (loadId === latestLoadId) dropUser()
+      })
+      if (loadId !== latestLoadId) return
+      setIds((current) => {
+        if (selection) return { status: 'ready', photoIds: selection.photoIds }
+        return current.status === 'ready' ? current : { status: 'unavailable' }
+      })
+    },
+    stop: () => {
+      latestLoadId += 1
+    },
+  }
+}
+
+// A photo added, opened or deleted may change the lot: the server draws it again. Returns the
+// cleanup, which also forgets the lot: the next start waits for a fresh one.
+function connectDailySelection(setIds: SetIds, dropUser: () => void): () => void {
+  const loader = createDailyLoader(setIds, dropUser)
+  const socket = connectPhotoSocket({
+    onConnect: loader.load,
+    onNewPhoto: loader.load,
+    onOpenedPhoto: loader.load,
+    onDeletedPhoto: loader.load,
+    onRefused: dropUser,
+  })
+  const timer = setInterval(loader.load, DAY_CHECK_MS)
+  return () => {
+    socket.disconnect()
+    clearInterval(timer)
+    loader.stop()
+    setIds({ status: 'loading' })
+  }
+}
+
+// Asks the server only while the frame plays the day's selection.
+export function useDailySelection(isEnabled: boolean): SelectedIds {
+  const { dropUser } = useAuth()
+  const [ids, setIds] = useState<SelectedIds>({ status: 'loading' })
+
+  useEffect(() => {
+    if (!isEnabled) return
+    return connectDailySelection(setIds, dropUser)
+  }, [isEnabled, dropUser])
+
+  return ids
+}
diff --git a/client/src/hooks/useFrameMode.ts b/client/src/hooks/useFrameMode.ts
index 93aedd7..196e93a 100644
--- a/client/src/hooks/useFrameMode.ts
+++ b/client/src/hooks/useFrameMode.ts
@@ -19,7 +19,7 @@ export type FrameMode = {
   // In the order they play.
   photos: Photo[]
   status: FeedStatus
-  // The source played: the library when the chosen collection is gone.
+  // The source played: the library when the chosen one is unavailable.
   source: PhotoSource
   // undefined while there is no photo to show.
   currentPhoto: Photo | undefined
diff --git a/client/src/hooks/useSourcePhotos.ts b/client/src/hooks/useSourcePhotos.ts
index 7ca41de..aa83dc8 100644
--- a/client/src/hooks/useSourcePhotos.ts
+++ b/client/src/hooks/useSourcePhotos.ts
@@ -1,32 +1,49 @@
 import { useMemo } from 'react'
+import type { CollectionsStatus } from '@/collections/CollectionsContext.ts'
 import { useCollections } from '@/collections/CollectionsContext.ts'
 import type { Collection } from '@/collections/collection.ts'
+import { useDailySelection } from '@/hooks/useDailySelection.ts'
 import type { PhotoFeed } from '@/hooks/usePhotoFeed.ts'
 import type { Photo } from '@/photo.ts'
 import { LIBRARY_SOURCE, type PhotoSource, sourceCollection } from '@/photoSource.ts'
+import type { SelectedIds } from '@/selections/selection.ts'
 
-// source: the one actually played, the library when the chosen collection is gone.
+// source: the one actually played, the library when the chosen one is unavailable.
 export type SourcePhotos = PhotoFeed & { source: PhotoSource }
 
-// Still newest first: the feed's order, whatever order the photos were added in.
-function photosIn(photos: Photo[], collection: Collection | undefined): Photo[] {
-  if (collection === undefined) return photos
-  const photoIds = new Set(collection.photoIds)
-  return photos.filter(({ id }) => photoIds.has(id))
-}
+type CollectionsState = { collections: Collection[]; status: CollectionsStatus }
 
-// The collection's photos come from the feed, not a request of their own: the frame keeps one
-// live list, and an unopened photo, absent from the feed, never plays.
-export function useSourcePhotos(feed: PhotoFeed, source: PhotoSource): SourcePhotos {
-  const { collections, status } = useCollections()
-  const collection = sourceCollection(source, collections)
-  const photos = useMemo(() => photosIn(feed.photos, collection), [feed.photos, collection])
+// Still newest first: the feed's order, whatever order the ids come in.
+function photosIn(photos: Photo[], photoIds: string[] | null): Photo[] {
+  if (photoIds === null) return photos
+  const kept = new Set(photoIds)
+  return photos.filter(({ id }) => kept.has(id))
+}
 
+// null: the library was chosen, every photo plays.
+function selectedIds(
+  source: PhotoSource,
+  daily: SelectedIds,
+  { collections, status }: CollectionsState,
+): SelectedIds | null {
+  if (source.kind === 'library') return null
+  if (source.kind === 'daily') return daily
   // Until the list arrives, a deleted collection looks like one still loading.
-  if (source.kind === 'collection' && status === 'loading') {
-    return { photos: [], status: 'loading', source }
-  }
+  if (status === 'loading') return { status: 'loading' }
+  const collection = sourceCollection(source, collections)
   // Deleted, or the list failed to load: the frame plays the library rather than nothing.
-  if (collection === undefined) return { ...feed, source: LIBRARY_SOURCE }
+  return collection ? { status: 'ready', photoIds: collection.photoIds } : { status: 'unavailable' }
+}
+
+// The source's photos come from the feed, not a request of their own: the frame keeps one live
+// list, and an unopened photo, absent from the feed, never plays.
+export function useSourcePhotos(feed: PhotoFeed, source: PhotoSource): SourcePhotos {
+  const daily = useDailySelection(source.kind === 'daily')
+  const ids = selectedIds(source, daily, useCollections())
+  const photoIds = ids?.status === 'ready' ? ids.photoIds : null
+  const photos = useMemo(() => photosIn(feed.photos, photoIds), [feed.photos, photoIds])
+
+  if (ids?.status === 'loading') return { photos: [], status: 'loading', source }
+  if (photoIds === null) return { ...feed, source: LIBRARY_SOURCE }
   return { photos, status: feed.status, source }
 }
diff --git a/client/src/photoSource.ts b/client/src/photoSource.ts
index fb2f0d9..316e515 100644
--- a/client/src/photoSource.ts
+++ b/client/src/photoSource.ts
@@ -1,15 +1,20 @@
 import type { Collection } from '@/collections/collection.ts'
 
-// What the frame plays. Step 11 adds its own kinds (the day's selection, the radio).
-export type PhotoSource = { kind: 'library' } | { kind: 'collection'; collectionId: string }
+// What the frame plays. daily: the day's selection, drawn by the server.
+export type PhotoSource =
+  | { kind: 'library' }
+  | { kind: 'daily' }
+  | { kind: 'collection'; collectionId: string }
 
 export const LIBRARY_SOURCE: PhotoSource = { kind: 'library' }
 
+export const DAILY_SOURCE: PhotoSource = { kind: 'daily' }
+
 const COLLECTION_KEY_PREFIX = 'collection:'
 
 export function isPhotoSource(value: unknown): value is PhotoSource {
   if (typeof value !== 'object' || value === null || !('kind' in value)) return false
-  if (value.kind === 'library') return true
+  if (value.kind === 'library' || value.kind === 'daily') return true
   return (
     value.kind === 'collection' && 'collectionId' in value && typeof value.collectionId === 'string'
   )
@@ -17,16 +22,20 @@ export function isPhotoSource(value: unknown): value is PhotoSource {
 
 // Radio and toggle values are strings: one string per source.
 export function sourceKey(source: PhotoSource): string {
-  return source.kind === 'library' ? 'library' : `${COLLECTION_KEY_PREFIX}${source.collectionId}`
+  return source.kind === 'collection'
+    ? `${COLLECTION_KEY_PREFIX}${source.collectionId}`
+    : source.kind
 }
 
 export function sourceFromKey(key: string): PhotoSource {
+  if (key === 'daily') return DAILY_SOURCE
   if (!key.startsWith(COLLECTION_KEY_PREFIX)) return LIBRARY_SOURCE
   return { kind: 'collection', collectionId: key.slice(COLLECTION_KEY_PREFIX.length) }
 }
 
 // The key of the source the frame plays: the library when the chosen collection is gone.
 export function playedSourceKey(source: PhotoSource, collections: Collection[]): string {
+  if (source.kind !== 'collection') return sourceKey(source)
   return sourceKey(sourceCollection(source, collections) ? source : LIBRARY_SOURCE)
 }
 
diff --git a/client/src/selections/selection.ts b/client/src/selections/selection.ts
new file mode 100644
index 0000000..0b49123
--- /dev/null
+++ b/client/src/selections/selection.ts
@@ -0,0 +1,20 @@
+// Copy of server/src/types.ts, see why there. Keep both in sync.
+
+// A selection names its photos by id: the frame finds them in the library it already holds.
+export type Selection = { photoIds: string[] }
+
+// unavailable: the selection could not load, the frame plays the library instead.
+export type SelectedIds =
+  | { status: 'loading' }
+  | { status: 'unavailable' }
+  | { status: 'ready'; photoIds: string[] }
+
+export function isSelection(value: unknown): value is Selection {
+  return (
+    typeof value === 'object' &&
+    value !== null &&
+    'photoIds' in value &&
+    Array.isArray(value.photoIds) &&
+    value.photoIds.every((photoId) => typeof photoId === 'string')
+  )
+}
diff --git a/client/src/selections/selectionsApi.ts b/client/src/selections/selectionsApi.ts
new file mode 100644
index 0000000..7d79b63
--- /dev/null
+++ b/client/src/selections/selectionsApi.ts
@@ -0,0 +1,23 @@
+import { UNAUTHORIZED_STATUS } from '@/api.ts'
+import { isSelection, type Selection } from '@/selections/selection.ts'
+
+// null when the selection could not load: the caller keeps what it shows, or plays the library.
+async function fetchSelection(
+  url: string,
+  onUnauthenticated: () => void,
+): Promise<Selection | null> {
+  try {
+    const res = await fetch(url)
+    if (res.status === UNAUTHORIZED_STATUS) onUnauthenticated()
+    // Not JSON when the dev proxy answers for a stopped API.
+    const data: unknown = await res.json().catch(() => null)
+    return res.ok && isSelection(data) ? data : null
+  } catch {
+    // fetch rejects only on network failure.
+    return null
+  }
+}
+
+export function fetchDailySelection(onUnauthenticated: () => void): Promise<Selection | null> {
+  return fetchSelection('/api/selections/daily', onUnauthenticated)
+}
diff --git a/docs/produit/README.md b/docs/produit/README.md
index 6c0279b..364494c 100644
--- a/docs/produit/README.md
+++ b/docs/produit/README.md
@@ -13,23 +13,24 @@ Cette documentation décrit ce que l'application permet de faire et selon quelle
 
 ## Glossaire
 
-| Terme                  | Sens dans FamilyFrame                                                                                                                                                  |
-| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| **Compte**             | L'accès personnel d'une personne : une adresse e-mail, un nom affiché et un mot de passe. Chaque compte a une seule bibliothèque, que tous ses cadres affichent.       |
-| **Administrateur**     | Le compte qui peut créer des invitations. Il est aussi un membre comme les autres.                                                                                     |
-| **Membre**             | Toute personne qui a un compte. Un compte créé par invitation est toujours un compte membre.                                                                           |
-| **Invitation**         | Un lien personnel, créé par l'administrateur pour une adresse e-mail, qui permet à une personne de créer son compte. Il sert une seule fois et pendant 7 jours.        |
-| **Proche / ami**       | Un autre membre avec qui l'on a une amitié acceptée des deux côtés. On ne peut envoyer des photos qu'à ses amis.                                                       |
-| **Demande d'ami**      | La proposition d'amitié envoyée à un autre membre. Elle reste « en attente » jusqu'à ce que l'autre l'accepte ou la refuse, ou que l'on l'annule.                      |
-| **Bibliothèque**       | L'ensemble des photos d'un compte : celles qu'il a ajoutées et celles que ses amis lui ont envoyées. Elle est privée : personne d'autre ne la voit.                    |
-| **Photo reçue**        | Une photo qu'un ami a envoyée. Elle fait partie de la bibliothèque du destinataire comme les autres et porte la mention « Envoyée par » suivie du nom de l'expéditeur. |
-| **Expéditeur**         | Le membre qui a envoyé une photo reçue.                                                                                                                                |
-| **Collection**         | Une liste de photos de sa bibliothèque, rangées sous un nom (« Noël », « Les vacances »). Elle est privée.                                                             |
-| **Cadre**              | L'affichage plein écran de sa bibliothèque, pensé pour un écran posé chez soi. Il montre toutes les photos du compte connecté, ou celles d'une de ses collections.     |
-| **Diaporama**          | Le mode du cadre qui affiche une photo à la fois, en grand, et passe seul à la suivante.                                                                               |
-| **Modèle d'affichage** | La façon dont le cadre présente chaque photo : ajustée sur un fond flouté, en plein format, dans un passe-partout ou en polaroïd. Chaque appareil garde le sien.       |
-| **Vignette**           | La petite image carrée qui représente une photo dans une grille, une liste ou un bandeau.                                                                              |
-| **Thème**              | L'apparence claire ou sombre de l'application, choisie par chaque personne sur chaque appareil.                                                                        |
+| Terme                  | Sens dans FamilyFrame                                                                                                                                                                    |
+| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| **Compte**             | L'accès personnel d'une personne : une adresse e-mail, un nom affiché et un mot de passe. Chaque compte a une seule bibliothèque, que tous ses cadres affichent.                         |
+| **Administrateur**     | Le compte qui peut créer des invitations. Il est aussi un membre comme les autres.                                                                                                       |
+| **Membre**             | Toute personne qui a un compte. Un compte créé par invitation est toujours un compte membre.                                                                                             |
+| **Invitation**         | Un lien personnel, créé par l'administrateur pour une adresse e-mail, qui permet à une personne de créer son compte. Il sert une seule fois et pendant 7 jours.                          |
+| **Proche / ami**       | Un autre membre avec qui l'on a une amitié acceptée des deux côtés. On ne peut envoyer des photos qu'à ses amis.                                                                         |
+| **Demande d'ami**      | La proposition d'amitié envoyée à un autre membre. Elle reste « en attente » jusqu'à ce que l'autre l'accepte ou la refuse, ou que l'on l'annule.                                        |
+| **Bibliothèque**       | L'ensemble des photos d'un compte : celles qu'il a ajoutées et celles que ses amis lui ont envoyées. Elle est privée : personne d'autre ne la voit.                                      |
+| **Photo reçue**        | Une photo qu'un ami a envoyée. Elle fait partie de la bibliothèque du destinataire comme les autres et porte la mention « Envoyée par » suivie du nom de l'expéditeur.                   |
+| **Expéditeur**         | Le membre qui a envoyé une photo reçue.                                                                                                                                                  |
+| **Collection**         | Une liste de photos de sa bibliothèque, rangées sous un nom (« Noël », « Les vacances »). Elle est privée.                                                                               |
+| **Cadre**              | L'affichage plein écran de sa bibliothèque, pensé pour un écran posé chez soi. Il montre toutes les photos du compte connecté, la sélection du jour, ou celles d'une de ses collections. |
+| **Sélection du jour**  | Un lot de 20 photos de sa bibliothèque tirées au hasard, le même toute la journée, renouvelé chaque jour. Le cadre peut le lire à la place de toute la bibliothèque.                     |
+| **Diaporama**          | Le mode du cadre qui affiche une photo à la fois, en grand, et passe seul à la suivante.                                                                                                 |
+| **Modèle d'affichage** | La façon dont le cadre présente chaque photo : ajustée sur un fond flouté, en plein format, dans un passe-partout ou en polaroïd. Chaque appareil garde le sien.                         |
+| **Vignette**           | La petite image carrée qui représente une photo dans une grille, une liste ou un bandeau.                                                                                                |
+| **Thème**              | L'apparence claire ou sombre de l'application, choisie par chaque personne sur chaque appareil.                                                                                          |
 
 ## Fichiers
 
diff --git a/docs/produit/a-venir.md b/docs/produit/a-venir.md
index d4103f9..27344d0 100644
--- a/docs/produit/a-venir.md
+++ b/docs/produit/a-venir.md
@@ -8,5 +8,4 @@ Les règles ci-dessous décrivent l'intention ; elles recevront leur identifiant
 
 **Prévu**
 
-- Une sélection du jour : N photos choisies automatiquement chaque jour.
 - Une « radio » lancée à partir d'une photo, qui enchaîne des photos liées par leur contexte : dates proches, même expéditeur, mêmes collections.
diff --git a/docs/produit/cadre.md b/docs/produit/cadre.md
index 9611b2c..d18793e 100644
--- a/docs/produit/cadre.md
+++ b/docs/produit/cadre.md
@@ -17,7 +17,7 @@ Le cadre est la page à laisser affichée en plein écran sur l'appareil posé c
 1. R-CAD-01 · Un cadre affiche les photos d'un seul compte : celui qui y est connecté.
 2. R-CAD-02 · Le cadre est toujours sombre, quel que soit le thème choisi, pour mettre les photos en valeur.
 3. R-CAD-03 · Le cadre occupe toute la page : la barre du haut et les menus de l'application n'y sont pas affichés.
-4. R-CAD-04 · Le cadre affiche toutes les photos de la bibliothèque, ou de la collection choisie (R-CAD-77), des plus récentes aux plus anciennes, sans limite de nombre : les anciennes photos ne disparaissent jamais du cadre.
+4. R-CAD-04 · Le cadre affiche toutes les photos de la bibliothèque, ou de la sélection du jour ou de la collection choisie (R-CAD-77), des plus récentes aux plus anciennes, sans limite de nombre : les anciennes photos ne disparaissent jamais du cadre.
 5. R-CAD-05 · Le cadre recharge toutes ses photos une fois par jour. Cela garde sa connexion active (voir [comptes-et-connexion.md](comptes-et-connexion.md#rester-connecté)) : un cadre allumé en continu ne se déconnecte jamais.
 6. R-CAD-06 · Un cadre rallumé alors que le réseau n'est pas encore prêt attend et réessaie seul toutes les 5 secondes, sans afficher la page de connexion (R-CNX-16).
 7. R-CAD-07 · Si sa connexion au compte a expiré ou a été fermée, le cadre revient à la page de connexion : il faut se reconnecter sur l'appareil.
@@ -75,7 +75,7 @@ Le cadre n'a plus de vue bibliothèque : voir R-CAD-53. Les règles ci-dessous g
 - Choisir la vitesse : 5 s, 10 s ou 20 s par photo (menu « … », « Vitesse ») ; l'appareil la retient.
 - Choisir l'ordre de lecture : « Dans l'ordre » (des plus récentes aux plus anciennes) ou « Aléatoire » (menu « … », « Lecture ») ; l'appareil le retient.
 - Faire ces mêmes réglages depuis la page « Préférences », encart « Cadre de cet appareil » (voir [preferences.md](preferences.md#cadre-de-cet-appareil)).
-- Choisir les photos lues : toute la bibliothèque ou une collection (menu « … », « Photos ») ; l'appareil le retient (voir [Choisir les photos du cadre](#choisir-les-photos-du-cadre)).
+- Choisir les photos lues : toute la bibliothèque, la sélection du jour ou une collection (menu « … », « Photos ») ; l'appareil le retient (voir [Choisir les photos du cadre](#choisir-les-photos-du-cadre)).
 - Afficher ou masquer un bandeau de vignettes (« Vignettes ») et toucher une vignette pour aller à cette photo.
 - Envoyer la photo affichée à un ami, la ranger dans ses collections ou la supprimer (menu « … »).
 - Quitter le mode cadre (bouton ✕, touche Échap ou sortie du plein écran) pour revenir à la bibliothèque, sur la photo affichée.
@@ -124,13 +124,13 @@ Le cadre n'a plus de vue bibliothèque : voir R-CAD-53. Les règles ci-dessous g
 
 **Ce que l'on peut faire**
 
-- Dans le menu « … » du diaporama, « Photos », choisir « Toute la bibliothèque » ou l'une de ses collections.
+- Dans le menu « … » du diaporama, « Photos », choisir « Toute la bibliothèque », « Sélection du jour » (voir [Sélection du jour](#sélection-du-jour)) ou l'une de ses collections.
 - Faire ce choix depuis la page « Préférences », encart « Cadre de cet appareil » (voir [preferences.md](preferences.md#cadre-de-cet-appareil)).
 - Depuis la carte « Mes collections » de la bibliothèque, choisir « Lire sur le cadre » dans le menu « … » d'une collection : le cadre s'ouvre en plein écran sur elle (voir [collections.md](collections.md)).
 
 **Règles**
 
-1. R-CAD-77 · Le cadre lit toute la bibliothèque (par défaut) ou une seule collection. Le choix est retenu sur l'appareil, comme la vitesse (R-CAD-62, R-CAD-63).
+1. R-CAD-77 · Le cadre lit toute la bibliothèque (par défaut), la sélection du jour (R-CAD-84) ou une seule collection. Le choix est retenu sur l'appareil, comme la vitesse (R-CAD-62, R-CAD-63).
 2. R-CAD-78 · Une collection se lit comme la bibliothèque : des plus récentes aux plus anciennes et en boucle, ou en ordre aléatoire, selon « Lecture » ; avec la même vitesse et le même modèle d'affichage.
 3. R-CAD-79 · Changer de photos fait repartir le diaporama de la photo la plus récente du nouveau choix ; en « Aléatoire », un nouveau mélange commence.
 4. R-CAD-80 · Une photo rangée dans la collection lue, ou retirée, depuis cet appareil ou un autre, entre dans le diaporama ou en sort en quelques instants, sans recharger. Une photo ajoutée à la bibliothèque n'arrive sur le cadre que si elle est rangée dans la collection lue.
@@ -149,6 +149,27 @@ Le cadre n'a plus de vue bibliothèque : voir R-CAD-53. Les règles ci-dessous g
 - Lire plusieurs collections à la fois.
 - Garder le choix d'une collection sur un autre appareil : chaque appareil garde le sien.
 
+## Sélection du jour
+
+**Ce que l'on peut faire**
+
+- Dans le menu « … » du diaporama, « Photos », choisir « Sélection du jour » : le cadre lit 20 photos de la bibliothèque tirées au hasard, un lot différent chaque jour.
+- Faire ce choix depuis la page « Préférences », encart « Cadre de cet appareil » (voir [preferences.md](preferences.md#cadre-de-cet-appareil)).
+
+**Règles**
+
+1. R-CAD-84 · La sélection du jour compte 20 photos de la bibliothèque, tirées au hasard. Une photo reçue n'y entre qu'une fois découverte. Avec 20 photos ou moins, la sélection les contient toutes. Le choix est retenu sur l'appareil, comme les autres choix de « Photos » (R-CAD-77).
+2. R-CAD-85 · Le lot reste le même toute la journée, à chaque ouverture et sur tous les appareils du compte. Un nouveau lot est tiré chaque jour à minuit, heure de Paris ; un cadre allumé y passe dans le quart d'heure qui suit, sans recharger.
+3. R-CAD-86 · Une photo ajoutée ou reçue dans la journée ne remplace pas une photo du lot : elle n'y entre que s'il reste de la place, sinon elle peut être tirée les jours suivants. Exception : une photo reçue avant aujourd'hui mais découverte aujourd'hui compte à sa date de réception, et peut prendre la place d'une photo du lot.
+4. R-CAD-87 · Une photo supprimée quitte la sélection en quelques instants ; une autre photo de la bibliothèque prend sa place s'il y en a.
+5. R-CAD-88 · La sélection se lit comme une collection : des plus récentes aux plus anciennes ou en ordre aléatoire, selon « Lecture », avec la même vitesse et le même modèle d'affichage (R-CAD-78, R-CAD-79).
+6. R-CAD-89 · Si la sélection ne peut pas être chargée, le cadre lit toute la bibliothèque en attendant, sans message ; il réessaie au plus tard un quart d'heure après, et passe à la sélection dès qu'elle arrive. Le menu garde « Sélection du jour » coché.
+
+**Ce qui n'est pas possible**
+
+- Choisir le nombre de photos de la sélection.
+- Tirer un nouveau lot avant le lendemain, ou garder une photo d'un jour sur l'autre.
+
 ## Arrivée d'une nouvelle photo
 
 **Ce que l'on peut faire**
diff --git a/docs/produit/preferences.md b/docs/produit/preferences.md
index 48b7125..60569e8 100644
--- a/docs/produit/preferences.md
+++ b/docs/produit/preferences.md
@@ -153,7 +153,7 @@ La page où chacun règle son compte : sa photo de profil, son nom affiché et s
 
 **Ce que l'on peut faire**
 
-- Choisir, pour le cadre de l'appareil utilisé, les photos lues (toute la bibliothèque ou une collection), le modèle d'affichage, l'ordre de lecture et la vitesse, dans l'encart « Cadre de cet appareil ».
+- Choisir, pour le cadre de l'appareil utilisé, les photos lues (toute la bibliothèque, la sélection du jour ou une collection), le modèle d'affichage, l'ordre de lecture et la vitesse, dans l'encart « Cadre de cet appareil ».
 
 **Règles**
 
@@ -163,13 +163,13 @@ La page où chacun règle son compte : sa photo de profil, son nom affiché et s
 
 **Messages affichés**
 
-| Situation         | Message                                                                       |
-| ----------------- | ----------------------------------------------------------------------------- |
-| Titre de l'encart | « Cadre de cet appareil » — « Ces réglages ne concernent que cet appareil. »  |
-| Choix des photos  | « Photos » : « Toute la bibliothèque », puis le nom de chaque collection      |
-| Choix du modèle   | « Affichage » : « Ajusté », « Plein format », « Passe-partout », « Polaroïd » |
-| Choix de l'ordre  | « Lecture » : « Dans l'ordre », « Aléatoire »                                 |
-| Choix de vitesse  | « Vitesse » : « 5 s », « 10 s », « 20 s »                                     |
+| Situation         | Message                                                                                         |
+| ----------------- | ----------------------------------------------------------------------------------------------- |
+| Titre de l'encart | « Cadre de cet appareil » — « Ces réglages ne concernent que cet appareil. »                    |
+| Choix des photos  | « Photos » : « Toute la bibliothèque », « Sélection du jour », puis le nom de chaque collection |
+| Choix du modèle   | « Affichage » : « Ajusté », « Plein format », « Passe-partout », « Polaroïd »                   |
+| Choix de l'ordre  | « Lecture » : « Dans l'ordre », « Aléatoire »                                                   |
+| Choix de vitesse  | « Vitesse » : « 5 s », « 10 s », « 20 s »                                                       |
 
 **Ce qui n'est pas possible**
 
~~~~

- [x] **Step 2: Gates and commit**

`pnpm check:fix && pnpm typecheck && pnpm build && pnpm test`. `pnpm test` unchanged (`Tests  294 passed (294)`), `pnpm build` green. Subject: `feat(client): play the photos of the day on the frame`.

---

## PR C — `feat/selections-radio`

### Task 4: Launch a radio from a photo (PR C, `feat/selections-radio`)

**Files:**
- Create: `client/src/hooks/{useRadioSelection,useStartRadio}.ts`
- Modify: `client/src/viewerHistory.ts`, `photoSource.ts`, `selections/selectionsApi.ts`, `hooks/{useSourcePhotos,useSlideshowSettings,useFrameMode}.ts`, `components/frame/{frameSettingOptions.ts,SlideshowMenu.tsx,PhotoActionsMenu.tsx}`, `docs/produit/{cadre,bibliotheque,README,a-venir}.md`, `ARCHITECTURE.md`

- [x] **Step 1: Apply the diff** (final, after the review)

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 709e1c9..1a1ba60 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -43,15 +43,15 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 
 ## Pages
 
-| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
-| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
-| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
-| `/`                  | bibliothèque : en tête, quand des photos reçues attendent, l'annonce « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la carte d'envoi (« Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui n'envoie le fichier qu'à l'ami), puis « Mes collections » (`components/collections/` : « Nouvelle collection », une ligne par collection avec son nombre de photos et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer »), puis les photos du compte en vignettes ou en liste (choix mémorisé par appareil), « Mode cadre » à côté du choix vignettes/liste lance le diaporama, 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/`) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
-| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour ou d'une de ses collections, avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                      |
-| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
-| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
-| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
+| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
+| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
+| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
+| `/`                  | bibliothèque : en tête, quand des photos reçues attendent, l'annonce « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la carte d'envoi (« Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui n'envoie le fichier qu'à l'ami), puis « Mes collections » (`components/collections/` : « Nouvelle collection », une ligne par collection avec son nombre de photos et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer »), puis les photos du compte en vignettes ou en liste (choix mémorisé par appareil), « Mode cadre » à côté du choix vignettes/liste lance le diaporama, 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/`) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Lancer la radio », « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
+| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour, d'une de ses collections ou d'une radio (`/frame?radio=<id>`), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; tant qu'une radio joue, « Photos » la montre en tête, cochée (« Radio ») ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                             |
+| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
+| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
+| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
 
 Visionneuse : l'adresse `/?photo=<id>` ouvre la photo, un lien la partage. Ouvrir depuis la bibliothèque ajoute une entrée d'historique, passer d'une photo à l'autre la remplace, et fermer revient en arrière : le bouton retour d'Android ferme la visionneuse. Près de la fin des photos chargées, la page suivante se charge. Une photo supprimée pendant qu'on la regarde laisse sa place à la suivante (la précédente si c'était la plus ancienne), et la visionneuse se ferme quand il n'en reste aucune ; un lien vers une photo inconnue charge les pages jusqu'à la trouver, puis ferme s'il n'y en a plus. « Mode cadre » remplace l'entrée de la visionneuse (ou s'ajoute au-dessus de la bibliothèque depuis son en-tête) : quitter le cadre ramène une seule visionneuse, et le retour arrière la bibliothèque. Le lien « Cadre » de la barre ajoute une entrée d'historique ordinaire : c'est aussi l'adresse qu'un cadre ouvre au démarrage.
 
@@ -63,6 +63,8 @@ Source des photos (`client/src/photoSource.ts`) : `PhotoSource` vaut `{ kind: 'l
 
 Sélection du jour sur le cadre (`hooks/useDailySelection.ts`, `selections/selectionsApi.ts`) : tant que la source est `daily`, le hook ouvre sa propre connexion Socket.IO, comme `CollectionsProvider`, et relit `GET /api/selections/daily` à chaque connexion, à `photo:new`, `photo:opened` et `photo:deleted` (le serveur tire le lot à nouveau : une photo du jour n'entre que s'il reste de la place, une photo supprimée laisse sa place à une autre), et tous les quarts d'heure, car minuit n'envoie aucun événement ; seul le dernier chargement lancé s'applique. Un premier échec rend `unavailable` : le cadre lit la bibliothèque, et le menu garde « Sélection du jour » coché ; un échec plus tard garde le lot affiché. Les photos restent celles du flux, dans son ordre : une photo pas encore découverte n'est jamais lue. Quitter la source ferme la connexion et oublie le lot : y revenir attend un lot neuf (« Chargement des photos… »). Une sélection vide veut dire une bibliothèque vide : l'écran est celui de la bibliothèque (« En attente de la première photo… » ou « Des photos vous attendent. »).
 
+Radio sur le cadre (`hooks/useRadioSelection.ts`, `hooks/useStartRadio.ts`) : la radio n'est pas une `PhotoSource` gardée par l'appareil mais un paramètre d'adresse, `/frame?radio=<id>` (`RADIO_PARAM`, `radioPath`). `useSlideshowSettings` en fait la source jouée (`PlayedSource`, `{ kind: 'radio', photoId }`) ; choisir une source dans « Photos » l'enregistre et retire le paramètre (`replace`, en gardant l'état de l'entrée), et rechoisir l'option déjà gardée (« Radio » pendant une radio) ne fait rien. « Lancer la radio », dans le menu « … » de chaque photo (`PhotoActionsMenu`, donc vignettes, liste, visionneuse et diaporama), passe en plein écran dans le clic puis navigue : depuis le cadre ou la visionneuse en remplaçant l'entrée et en gardant son état, comme ▶ « Mode cadre », depuis la bibliothèque en ajoutant une entrée marquée `LIBRARY_BELOW_STATE`. `useRadioSelection` demande `GET /api/selections/radio/:photoId` une fois par photo de départ, sans connexion Socket.IO : la suite est figée au lancement, une photo supprimée en sort avec le flux, une photo ajoutée n'y entre pas. Sa réponse est rangée avec l'id de sa photo : une réponse pour une autre radio compte comme un chargement. Un échec, ou un `404`, rend `unavailable` : le cadre lit la bibliothèque, et le menu garde « Radio » coché, comme pour la sélection du jour. Arrêter la radio oublie sa réponse : relancée sur la même photo, elle attend une suite neuve. Seule la radio garde l'ordre du serveur (sa photo de départ en tête) ; « Dans l'ordre » la lit dans cet ordre, « Aléatoire » la mélange. La clé de source contient l'id (`radio:<id>`) : une radio lancée depuis le diaporama est un changement de source, qui repart de sa photo de départ.
+
 Lecture aléatoire (`hooks/usePlaybackPhotos.ts`, fonctions pures dans `shuffleOrder.ts`) : un mélange de Fisher-Yates tiré une fois et gardé dans l'état, recalculé pendant le rendu comme la sélection du cadre. Une photo arrivée s'insère juste après la photo affichée, une photo supprimée sort de l'ordre ; quand la dernière photo du tour laisse la place à la première, un nouveau tour est tiré, qui commence par la photo affichée. La sélection (`useFrameSelection`) reste calculée sur le flux, du plus récent au plus ancien : seul l'ordre du carrousel et du bandeau change.
 
 Modèles d'affichage (`components/frame/templateClasses.ts`) : une table de classes Tailwind par modèle pour la diapositive et la photo, en `vmin` pour garder les mêmes proportions sur un téléphone et sur une télévision. « Passe-partout » entoure la photo d'un carton (`--frame-mat`), « Polaroïd » d'un tirage (`PolaroidPrint`, `--frame-print`) qui porte la date et l'expéditeur, et penche d'un côté tiré de l'identifiant de la photo, pour qu'une arrivée ne retourne pas les autres. Le fond flou ne sert qu'à « Ajusté », la légende du bas disparaît avec « Polaroïd », et le zoom lent ne s'applique qu'à « Ajusté » et « Plein format ».
diff --git a/client/src/components/frame/PhotoActionsMenu.tsx b/client/src/components/frame/PhotoActionsMenu.tsx
index f4f9547..115f19b 100644
--- a/client/src/components/frame/PhotoActionsMenu.tsx
+++ b/client/src/components/frame/PhotoActionsMenu.tsx
@@ -1,4 +1,4 @@
-import { EllipsisIcon, SendIcon, Trash2Icon } from 'lucide-react'
+import { EllipsisIcon, RadioIcon, SendIcon, Trash2Icon } from 'lucide-react'
 import { type JSX, type ReactNode, type RefObject, useRef, useState } from 'react'
 import { toast } from 'sonner'
 import { useCollections } from '@/collections/CollectionsContext.ts'
@@ -15,6 +15,7 @@ import {
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu.tsx'
+import { useStartRadio } from '@/hooks/useStartRadio.ts'
 import { cn } from '@/lib/utils.ts'
 import type { Photo } from '@/photo.ts'
 
@@ -113,10 +114,15 @@ type MenuItemsProps = {
 }
 
 function MenuItems({ photo, onOpen, children }: MenuItemsProps): JSX.Element {
+  const startRadio = useStartRadio()
   return (
     // `dark`: the menu portals to body, outside the frame's dark <main>.
     <DropdownMenuContent align="end" className="dark">
       {children}
+      <DropdownMenuItem onSelect={() => startRadio(photo.id)}>
+        <RadioIcon />
+        Lancer la radio
+      </DropdownMenuItem>
       <DropdownMenuItem onSelect={() => onOpen({ kind: 'share', photo })}>
         <SendIcon />
         Envoyer à un ami
diff --git a/client/src/components/frame/SlideshowMenu.tsx b/client/src/components/frame/SlideshowMenu.tsx
index 15b0aac..a42e5aa 100644
--- a/client/src/components/frame/SlideshowMenu.tsx
+++ b/client/src/components/frame/SlideshowMenu.tsx
@@ -5,31 +5,35 @@ import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
 import {
   INTERVAL_OPTIONS,
   ORDER_OPTIONS,
-  sourceOptions,
+  playedSourceOptions,
   TEMPLATE_OPTIONS,
 } from '@/components/frame/frameSettingOptions.ts'
 import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
 import { RadioSubmenu } from '@/components/frame/RadioSubmenu.tsx'
 import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu.tsx'
-import type { FrameSettingsControls } from '@/hooks/useFrameSettings.ts'
+import type { SlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
 import type { Photo } from '@/photo.ts'
-import { playedSourceKey, sourceFromKey } from '@/photoSource.ts'
+import { playedSourceKey, sourceFromKey, sourceKey } from '@/photoSource.ts'
 
 type SlideshowMenuProps = {
   photo: Photo
-  settings: FrameSettingsControls
+  settings: SlideshowSettings
 }
 
-// What the frame plays: the library or one collection.
-function SourceSubmenu({ settings }: { settings: FrameSettingsControls }): JSX.Element {
+// What the frame plays: the library, the day's selection, one collection, or the radio playing.
+// Choosing the radio again does nothing: it is not a stored choice. The library, checked while a
+// deleted collection is stored, is stored when chosen.
+function SourceSubmenu({ settings }: { settings: SlideshowSettings }): JSX.Element {
   const { collections } = useCollections()
   return (
     <RadioSubmenu
       icon={ImagesIcon}
       label="Photos"
-      options={sourceOptions(collections)}
+      options={playedSourceOptions(settings.source, collections)}
       value={playedSourceKey(settings.source, collections)}
-      onValueChange={(key) => settings.onSourceChange(sourceFromKey(key))}
+      onValueChange={(key) => {
+        if (key !== sourceKey(settings.source)) settings.onSourceChange(sourceFromKey(key))
+      }}
     />
   )
 }
diff --git a/client/src/components/frame/frameSettingOptions.ts b/client/src/components/frame/frameSettingOptions.ts
index a4f4f2a..63b9e68 100644
--- a/client/src/components/frame/frameSettingOptions.ts
+++ b/client/src/components/frame/frameSettingOptions.ts
@@ -1,6 +1,6 @@
 import type { Collection } from '@/collections/collection.ts'
 import { type FrameTemplate, type PlaybackOrder, SLIDESHOW_INTERVALS_MS } from '@/frameSettings.ts'
-import { DAILY_SOURCE, LIBRARY_SOURCE, sourceKey } from '@/photoSource.ts'
+import { DAILY_SOURCE, LIBRARY_SOURCE, type PlayedSource, sourceKey } from '@/photoSource.ts'
 
 export type SettingOption<Value> = { value: Value; label: string }
 
@@ -45,3 +45,13 @@ export function sourceOptions(collections: Collection[]): SettingOption<string>[
     })),
   ]
 }
+
+// The frame's menu adds the radio first while one plays: it is checked, and never stored.
+export function playedSourceOptions(
+  source: PlayedSource,
+  collections: Collection[],
+): SettingOption<string>[] {
+  const options = sourceOptions(collections)
+  if (source.kind !== 'radio') return options
+  return [{ value: sourceKey(source), label: 'Radio' }, ...options]
+}
diff --git a/client/src/hooks/useFrameMode.ts b/client/src/hooks/useFrameMode.ts
index 196e93a..a1683e2 100644
--- a/client/src/hooks/useFrameMode.ts
+++ b/client/src/hooks/useFrameMode.ts
@@ -9,7 +9,7 @@ import { usePlaybackPhotos } from '@/hooks/usePlaybackPhotos.ts'
 import { type SlideshowSettings, useSlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
 import { type SourcePhotos, useSourcePhotos } from '@/hooks/useSourcePhotos.ts'
 import type { Photo } from '@/photo.ts'
-import { type PhotoSource, sourceKey } from '@/photoSource.ts'
+import { type PlayedSource, sourceKey } from '@/photoSource.ts'
 import { PHOTO_PARAM } from '@/viewerHistory.ts'
 
 // The controls step aside quickly: the photo is what the wall is for.
@@ -20,7 +20,7 @@ export type FrameMode = {
   photos: Photo[]
   status: FeedStatus
   // The source played: the library when the chosen one is unavailable.
-  source: PhotoSource
+  source: PlayedSource
   // undefined while there is no photo to show.
   currentPhoto: Photo | undefined
   isActive: boolean
diff --git a/client/src/hooks/useRadioSelection.ts b/client/src/hooks/useRadioSelection.ts
new file mode 100644
index 0000000..69576eb
--- /dev/null
+++ b/client/src/hooks/useRadioSelection.ts
@@ -0,0 +1,32 @@
+import { useEffect, useState } from 'react'
+import { useAuth } from '@/auth/AuthContext.ts'
+import type { SelectedIds, Selection } from '@/selections/selection.ts'
+import { fetchRadioSelection } from '@/selections/selectionsApi.ts'
+
+// photoId: the radio this answer belongs to. selection: null when it could not load.
+type RadioAnswer = { photoId: string; selection: Selection | null }
+
+// Asked once per radio: the suite is built at launch and stays the same. A photo deleted since
+// leaves it with the feed; a photo added since does not join it. null: no radio plays.
+export function useRadioSelection(photoId: string | null): SelectedIds {
+  const { dropUser } = useAuth()
+  const [answer, setAnswer] = useState<RadioAnswer | null>(null)
+
+  useEffect(() => {
+    if (photoId === null) return
+    let isCurrent = true
+    fetchRadioSelection(photoId, dropUser).then((selection) => {
+      if (isCurrent) setAnswer({ photoId, selection })
+    })
+    // Stopped, the radio forgets its suite: launched again, it waits for a new one.
+    return () => {
+      isCurrent = false
+      setAnswer(null)
+    }
+  }, [photoId, dropUser])
+
+  // An answer for another photo is the previous radio's: the new one is still loading.
+  if (answer === null || answer.photoId !== photoId) return { status: 'loading' }
+  if (answer.selection === null) return { status: 'unavailable' }
+  return { status: 'ready', photoIds: answer.selection.photoIds }
+}
diff --git a/client/src/hooks/useSlideshowSettings.ts b/client/src/hooks/useSlideshowSettings.ts
index e4d21d0..ae4b99e 100644
--- a/client/src/hooks/useSlideshowSettings.ts
+++ b/client/src/hooks/useSlideshowSettings.ts
@@ -1,22 +1,52 @@
 import { useState } from 'react'
+import { useLocation, useSearchParams } from 'react-router'
 import { type FrameSettingsControls, useFrameSettings } from '@/hooks/useFrameSettings.ts'
+import type { PlayedSource } from '@/photoSource.ts'
+import { RADIO_PARAM } from '@/viewerHistory.ts'
 
 // Pause and the strip are for whoever stands in front of the frame: they are not remembered.
-export type SlideshowSettings = FrameSettingsControls & {
+// source: a radio while /frame?radio=<id> plays one, else the stored choice.
+export type SlideshowSettings = Omit<FrameSettingsControls, 'source'> & {
+  source: PlayedSource
   isPlaying: boolean
   isStripVisible: boolean
   onPlayingChange: (isPlaying: boolean) => void
   onStripVisibleChange: (isStripVisible: boolean) => void
 }
 
+type RadioParam = { radioPhotoId: string | null; stopRadio: () => void }
+
+// Replace, keeping the entry's state: leaving the frame still goes back to what was below it.
+function useRadioParam(): RadioParam {
+  const [searchParams, setSearchParams] = useSearchParams()
+  const location = useLocation()
+  const radioPhotoId = searchParams.get(RADIO_PARAM)
+
+  function stopRadio(): void {
+    if (radioPhotoId === null) return
+    const nextParams = new URLSearchParams(searchParams)
+    nextParams.delete(RADIO_PARAM)
+    setSearchParams(nextParams, { replace: true, state: location.state })
+  }
+
+  return { radioPhotoId, stopRadio }
+}
+
 // Called by the page, not the slideshow screen: the page's photo selection reads isPlaying too.
+// Choosing photos in the menu ends the radio: the choice is stored, and plays at once.
 export function useSlideshowSettings(): SlideshowSettings {
   const frameSettings = useFrameSettings()
+  const { radioPhotoId, stopRadio } = useRadioParam()
   const [isPlaying, setIsPlaying] = useState(true)
   const [isStripVisible, setIsStripVisible] = useState(false)
 
   return {
     ...frameSettings,
+    source: radioPhotoId === null ? frameSettings.source : { kind: 'radio', photoId: radioPhotoId },
+    onSourceChange: (source) => {
+      frameSettings.onSourceChange(source)
+      stopRadio()
+    },
     isPlaying,
     isStripVisible,
     onPlayingChange: setIsPlaying,
diff --git a/client/src/hooks/useSourcePhotos.ts b/client/src/hooks/useSourcePhotos.ts
index aa83dc8..5b3845e 100644
--- a/client/src/hooks/useSourcePhotos.ts
+++ b/client/src/hooks/useSourcePhotos.ts
@@ -4,30 +4,39 @@ import { useCollections } from '@/collections/CollectionsContext.ts'
 import type { Collection } from '@/collections/collection.ts'
 import { useDailySelection } from '@/hooks/useDailySelection.ts'
 import type { PhotoFeed } from '@/hooks/usePhotoFeed.ts'
+import { useRadioSelection } from '@/hooks/useRadioSelection.ts'
 import type { Photo } from '@/photo.ts'
-import { LIBRARY_SOURCE, type PhotoSource, sourceCollection } from '@/photoSource.ts'
+import { LIBRARY_SOURCE, type PlayedSource, sourceCollection } from '@/photoSource.ts'
 import type { SelectedIds } from '@/selections/selection.ts'
 
 // source: the one actually played, the library when the chosen one is unavailable.
-export type SourcePhotos = PhotoFeed & { source: PhotoSource }
+export type SourcePhotos = PhotoFeed & { source: PlayedSource }
 
 type CollectionsState = { collections: Collection[]; status: CollectionsStatus }
 
+// The selections the frame may play, asked only while it plays them.
+type Selections = { daily: SelectedIds; radio: SelectedIds }
+
 // Still newest first: the feed's order, whatever order the ids come in.
-function photosIn(photos: Photo[], photoIds: string[] | null): Photo[] {
-  if (photoIds === null) return photos
+function photosInFeedOrder(photos: Photo[], photoIds: string[]): Photo[] {
   const kept = new Set(photoIds)
   return photos.filter(({ id }) => kept.has(id))
 }
 
+// A radio keeps the server's order, its first photo first.
+function photosInIdOrder(photos: Photo[], photoIds: string[]): Photo[] {
+  const byId = new Map(photos.map((photo) => [photo.id, photo]))
+  return photoIds.flatMap((id) => byId.get(id) ?? [])
+}
+
 // null: the library was chosen, every photo plays.
 function selectedIds(
-  source: PhotoSource,
-  daily: SelectedIds,
+  source: PlayedSource,
+  selections: Selections,
   { collections, status }: CollectionsState,
 ): SelectedIds | null {
   if (source.kind === 'library') return null
-  if (source.kind === 'daily') return daily
+  if (source.kind === 'daily' || source.kind === 'radio') return selections[source.kind]
   // Until the list arrives, a deleted collection looks like one still loading.
   if (status === 'loading') return { status: 'loading' }
   const collection = sourceCollection(source, collections)
@@ -37,11 +46,16 @@ function selectedIds(
 
 // The source's photos come from the feed, not a request of their own: the frame keeps one live
 // list, and an unopened photo, absent from the feed, never plays.
-export function useSourcePhotos(feed: PhotoFeed, source: PhotoSource): SourcePhotos {
+export function useSourcePhotos(feed: PhotoFeed, source: PlayedSource): SourcePhotos {
   const daily = useDailySelection(source.kind === 'daily')
-  const ids = selectedIds(source, daily, useCollections())
+  const radio = useRadioSelection(source.kind === 'radio' ? source.photoId : null)
+  const ids = selectedIds(source, { daily, radio }, useCollections())
   const photoIds = ids?.status === 'ready' ? ids.photoIds : null
-  const photos = useMemo(() => photosIn(feed.photos, photoIds), [feed.photos, photoIds])
+  const pick = source.kind === 'radio' ? photosInIdOrder : photosInFeedOrder
+  const photos = useMemo(
+    () => (photoIds === null ? feed.photos : pick(feed.photos, photoIds)),
+    [feed.photos, photoIds, pick],
+  )
 
   if (ids?.status === 'loading') return { photos: [], status: 'loading', source }
   if (photoIds === null) return { ...feed, source: LIBRARY_SOURCE }
diff --git a/client/src/hooks/useStartRadio.ts b/client/src/hooks/useStartRadio.ts
new file mode 100644
index 0000000..bcc6a8d
--- /dev/null
+++ b/client/src/hooks/useStartRadio.ts
@@ -0,0 +1,22 @@
+import { useLocation, useNavigate, useSearchParams } from 'react-router'
+import { enterFullscreen } from '@/fullscreen.ts'
+import { LIBRARY_BELOW_STATE, PHOTO_PARAM, radioPath } from '@/viewerHistory.ts'
+
+// Opens the frame on the radio of a photo, in full screen: called in the click itself, the only
+// moment the browser grants it.
+export function useStartRadio(): (photoId: string) => void {
+  const navigate = useNavigate()
+  const location = useLocation()
+  const [searchParams] = useSearchParams()
+
+  return (photoId) => {
+    enterFullscreen()
+    // From the frame or the viewer, the radio takes their entry's place, keeping its state:
+    // leaving the frame brings back one viewer, not two. From the library, it goes on top.
+    if (location.pathname === '/frame' || searchParams.has(PHOTO_PARAM)) {
+      navigate(radioPath(photoId), { replace: true, state: location.state })
+      return
+    }
+    navigate(radioPath(photoId), { state: LIBRARY_BELOW_STATE })
+  }
+}
diff --git a/client/src/photoSource.ts b/client/src/photoSource.ts
index 316e515..674b8bc 100644
--- a/client/src/photoSource.ts
+++ b/client/src/photoSource.ts
@@ -1,17 +1,23 @@
 import type { Collection } from '@/collections/collection.ts'
 
-// What the frame plays. daily: the day's selection, drawn by the server.
+// What the frame is set to play, stored per device. daily: the day's selection, drawn by the
+// server.
 export type PhotoSource =
   | { kind: 'library' }
   | { kind: 'daily' }
   | { kind: 'collection'; collectionId: string }
 
+// What the frame plays right now: a radio is never stored, it lives in the address (RADIO_PARAM).
+export type PlayedSource = PhotoSource | { kind: 'radio'; photoId: string }
+
 export const LIBRARY_SOURCE: PhotoSource = { kind: 'library' }
 
 export const DAILY_SOURCE: PhotoSource = { kind: 'daily' }
 
 const COLLECTION_KEY_PREFIX = 'collection:'
 
+const RADIO_KEY_PREFIX = 'radio:'
+
 export function isPhotoSource(value: unknown): value is PhotoSource {
   if (typeof value !== 'object' || value === null || !('kind' in value)) return false
   if (value.kind === 'library' || value.kind === 'daily') return true
@@ -20,11 +26,12 @@ export function isPhotoSource(value: unknown): value is PhotoSource {
   )
 }
 
-// Radio and toggle values are strings: one string per source.
-export function sourceKey(source: PhotoSource): string {
-  return source.kind === 'collection'
-    ? `${COLLECTION_KEY_PREFIX}${source.collectionId}`
-    : source.kind
+// Radio and toggle values are strings: one string per source. Each radio has its own: a radio
+// from another photo is another source.
+export function sourceKey(source: PlayedSource): string {
+  if (source.kind === 'collection') return `${COLLECTION_KEY_PREFIX}${source.collectionId}`
+  if (source.kind === 'radio') return `${RADIO_KEY_PREFIX}${source.photoId}`
+  return source.kind
 }
 
 export function sourceFromKey(key: string): PhotoSource {
@@ -34,14 +41,14 @@ export function sourceFromKey(key: string): PhotoSource {
 }
 
 // The key of the source the frame plays: the library when the chosen collection is gone.
-export function playedSourceKey(source: PhotoSource, collections: Collection[]): string {
+export function playedSourceKey(source: PlayedSource, collections: Collection[]): string {
   if (source.kind !== 'collection') return sourceKey(source)
   return sourceKey(sourceCollection(source, collections) ? source : LIBRARY_SOURCE)
 }
 
 // undefined plays the library: the source is the library, or its collection was deleted.
 export function sourceCollection(
-  source: PhotoSource,
+  source: PlayedSource,
   collections: Collection[],
 ): Collection | undefined {
   if (source.kind !== 'collection') return undefined
diff --git a/client/src/selections/selectionsApi.ts b/client/src/selections/selectionsApi.ts
index 7d79b63..290dbd2 100644
--- a/client/src/selections/selectionsApi.ts
+++ b/client/src/selections/selectionsApi.ts
@@ -21,3 +21,11 @@ async function fetchSelection(
 export function fetchDailySelection(onUnauthenticated: () => void): Promise<Selection | null> {
   return fetchSelection('/api/selections/daily', onUnauthenticated)
 }
+
+// null too for a photo the server does not know (404): the frame plays the library instead.
+export function fetchRadioSelection(
+  photoId: string,
+  onUnauthenticated: () => void,
+): Promise<Selection | null> {
+  return fetchSelection(`/api/selections/radio/${encodeURIComponent(photoId)}`, onUnauthenticated)
+}
diff --git a/client/src/viewerHistory.ts b/client/src/viewerHistory.ts
index ba2dc9d..5049bc2 100644
--- a/client/src/viewerHistory.ts
+++ b/client/src/viewerHistory.ts
@@ -1,6 +1,9 @@
 // The search parameter that names the open photo: /?photo=<id> on the library, /frame?photo=<id>.
 export const PHOTO_PARAM = 'photo'
 
+// The search parameter that plays a radio on the frame: /frame?radio=<id of its first photo>.
+export const RADIO_PARAM = 'radio'
+
 // Set on an entry pushed over the library: closing goes back to that entry instead of adding one.
 export const LIBRARY_BELOW_STATE = { isLibraryBelow: true }
 
@@ -18,3 +21,7 @@ export function isLibraryBelow(state: unknown): boolean {
 export function photoPath(page: PhotoPage, photoId: string): string {
   return `${page}?${new URLSearchParams({ [PHOTO_PARAM]: photoId })}`
 }
+
+export function radioPath(photoId: string): string {
+  return `/frame?${new URLSearchParams({ [RADIO_PARAM]: photoId })}`
+}
diff --git a/docs/produit/README.md b/docs/produit/README.md
index 364494c..953c0eb 100644
--- a/docs/produit/README.md
+++ b/docs/produit/README.md
@@ -27,6 +27,7 @@ Cette documentation décrit ce que l'application permet de faire et selon quelle
 | **Collection**         | Une liste de photos de sa bibliothèque, rangées sous un nom (« Noël », « Les vacances »). Elle est privée.                                                                               |
 | **Cadre**              | L'affichage plein écran de sa bibliothèque, pensé pour un écran posé chez soi. Il montre toutes les photos du compte connecté, la sélection du jour, ou celles d'une de ses collections. |
 | **Sélection du jour**  | Un lot de 20 photos de sa bibliothèque tirées au hasard, le même toute la journée, renouvelé chaque jour. Le cadre peut le lire à la place de toute la bibliothèque.                     |
+| **Radio**              | Une suite d'une trentaine de photos lancée depuis une photo : celles qui lui sont liées (même ami, dates proches, mêmes collections) d'abord, puis d'autres tirées au hasard.            |
 | **Diaporama**          | Le mode du cadre qui affiche une photo à la fois, en grand, et passe seul à la suivante.                                                                                                 |
 | **Modèle d'affichage** | La façon dont le cadre présente chaque photo : ajustée sur un fond flouté, en plein format, dans un passe-partout ou en polaroïd. Chaque appareil garde le sien.                         |
 | **Vignette**           | La petite image carrée qui représente une photo dans une grille, une liste ou un bandeau.                                                                                                |
diff --git a/docs/produit/a-venir.md b/docs/produit/a-venir.md
index 27344d0..2775b7f 100644
--- a/docs/produit/a-venir.md
+++ b/docs/produit/a-venir.md
@@ -4,8 +4,4 @@ Fonctionnalités prévues mais pas encore livrées, regroupées par étape. Rien
 
 Les règles ci-dessous décrivent l'intention ; elles recevront leur identifiant définitif à la livraison.
 
-## Étape 11 · Sélections automatiques
-
-**Prévu**
-
-- Une « radio » lancée à partir d'une photo, qui enchaîne des photos liées par leur contexte : dates proches, même expéditeur, mêmes collections.
+Aucune fonctionnalité n'est prévue pour l'instant : les sélections automatiques de l'étape 11 sont livrées (voir [cadre.md](cadre.md#sélection-du-jour)).
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index 7c325e8..8733fa7 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -58,7 +58,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 - Passer de l'un à l'autre avec les boutons « Miniatures » et « Liste ».
 - Charger les photos plus anciennes avec « Charger plus ».
 - Ouvrir une photo en grand dans l'application, puis passer à la suivante ou à la précédente d'un geste du doigt, avec les flèches à l'écran ou celles du clavier.
-- Ouvrir le menu « … » d'une photo pour l'envoyer à un ami, la ranger dans ses collections (voir [collections.md](collections.md#ranger-ses-photos-dans-une-collection)) ou la supprimer.
+- Ouvrir le menu « … » d'une photo pour lancer sa radio sur le cadre (voir [cadre.md](cadre.md#radio)), l'envoyer à un ami, la ranger dans ses collections (voir [collections.md](collections.md#ranger-ses-photos-dans-une-collection)) ou la supprimer.
 - Lancer le mode cadre, en plein écran, depuis la bibliothèque, ou depuis une photo ouverte pour que le diaporama commence par elle (voir [cadre.md](cadre.md)).
 - Découvrir les photos envoyées par ses proches depuis l'annonce en haut de la page (voir [partage.md](partage.md#recevoir-une-photo)).
 - Gérer ses collections dans la carte « Mes collections » (voir [collections.md](collections.md)).
diff --git a/docs/produit/cadre.md b/docs/produit/cadre.md
index d18793e..c28121b 100644
--- a/docs/produit/cadre.md
+++ b/docs/produit/cadre.md
@@ -77,7 +77,7 @@ Le cadre n'a plus de vue bibliothèque : voir R-CAD-53. Les règles ci-dessous g
 - Faire ces mêmes réglages depuis la page « Préférences », encart « Cadre de cet appareil » (voir [preferences.md](preferences.md#cadre-de-cet-appareil)).
 - Choisir les photos lues : toute la bibliothèque, la sélection du jour ou une collection (menu « … », « Photos ») ; l'appareil le retient (voir [Choisir les photos du cadre](#choisir-les-photos-du-cadre)).
 - Afficher ou masquer un bandeau de vignettes (« Vignettes ») et toucher une vignette pour aller à cette photo.
-- Envoyer la photo affichée à un ami, la ranger dans ses collections ou la supprimer (menu « … »).
+- Lancer la radio de la photo affichée (voir [Radio](#radio)), l'envoyer à un ami, la ranger dans ses collections ou la supprimer (menu « … »).
 - Quitter le mode cadre (bouton ✕, touche Échap ou sortie du plein écran) pour revenir à la bibliothèque, sur la photo affichée.
 
 **Règles**
@@ -170,6 +170,29 @@ Le cadre n'a plus de vue bibliothèque : voir R-CAD-53. Les règles ci-dessous g
 - Choisir le nombre de photos de la sélection.
 - Tirer un nouveau lot avant le lendemain, ou garder une photo d'un jour sur l'autre.
 
+## Radio
+
+**Ce que l'on peut faire**
+
+- Dans le menu « … » d'une photo (bibliothèque, photo ouverte en grand ou diaporama), choisir « Lancer la radio » : le cadre s'ouvre en plein écran sur cette photo, puis enchaîne des photos qui lui sont liées.
+
+**Règles**
+
+1. R-CAD-90 · La radio commence par la photo choisie, puis passe les photos qui lui sont liées : envoyées par le même ami, arrivées à 7 jours d'écart au plus, ou rangées dans les mêmes collections. Plus une photo a de liens, plus elle passe tôt ; à égalité, la plus proche dans le temps passe d'abord.
+2. R-CAD-91 · Deux photos que l'on a ajoutées soi-même ne comptent pas comme venant du même expéditeur : ce lien ne vaut que pour les photos reçues d'un ami.
+3. R-CAD-92 · Quand les photos liées ne suffisent pas, d'autres photos de la bibliothèque, tirées au hasard, complètent la radio, jusqu'à 30 photos en tout. Une photo reçue n'y entre qu'une fois découverte.
+4. R-CAD-93 · « Dans l'ordre » lit la radio dans cet ordre, en boucle ; « Aléatoire » la mélange. La vitesse et le modèle d'affichage restent ceux choisis.
+5. R-CAD-94 · La radio est construite à son lancement et ne change plus : une photo ajoutée ou découverte ensuite n'y entre pas ; une photo supprimée en sort en quelques instants.
+6. R-CAD-95 · La radio n'est pas retenue sur l'appareil. Tant qu'elle joue, « Photos » la montre en tête, cochée, sous le nom « Radio » ; choisir une autre option l'arrête et retient ce choix. Quitter le cadre l'arrête aussi : rouvert, le cadre lit le choix retenu.
+7. R-CAD-96 · Lancée depuis le diaporama, la radio remplace aussitôt ce qu'il lisait et repart de la photo choisie. Quitter le cadre ramène, comme toujours, à la photo qui était affichée (R-CAD-59).
+8. R-CAD-97 · Si la radio ne peut pas être chargée (photo supprimée entre-temps, coupure de réseau), le cadre lit toute la bibliothèque, sans message. Le menu garde « Radio » coché.
+
+**Ce qui n'est pas possible**
+
+- Garder une radio pour plus tard, ou la retrouver sur un autre appareil.
+- Choisir les liens pris en compte, ou la longueur de la radio.
+- Lancer une radio depuis une photo reçue pas encore découverte.
+
 ## Arrivée d'une nouvelle photo
 
 **Ce que l'on peut faire**
~~~~

- [x] **Step 2: Gates and commit**

`pnpm check:fix && pnpm typecheck && pnpm build && pnpm test`. `pnpm test` unchanged (`Tests  294 passed (294)`), `pnpm build` green. Subject: `feat(client): launch a radio from a photo`.

---

## Final verification (controller)

- [x] `pnpm check && pnpm typecheck && pnpm build && pnpm test` on `feat/selections-radio`: green, `Test Files  25 passed (25)`, `Tests  294 passed (294)` (done in the clone).
- [ ] Bruno gate command against a test API on port 3002 started from `feat/selections-radio` (no `db:push` needed): 177 requests, all passed, twice. The `selections/` folder needs the invitee of `invitations/accept/05`: run the whole collection.
- [x] `git diff f212b85..feat/selections-radio -- client/package.json server/package.json pnpm-lock.yaml`: empty. No `console.` added in `server/src`; no new ` as ` cast.
- [ ] Manual, with Claude in Chrome (dev client on 5180 against the author's API, never restarted):
  - the slideshow « … » menu, « Photos »: « Sélection du jour » after « Toute la bibliothèque »; choosing it plays at most 20 photos; a second tab and the preferences show the same choice; reloading keeps the same lot;
  - a library of 20 photos or fewer: the selection holds them all; upload a photo: it joins the selection within a few seconds;
  - delete a photo of the lot: it leaves the frame, another takes its place;
  - « Lancer la radio » from a grid photo: full screen, the start photo first; « Photos » shows « Radio » checked first; « Toute la bibliothèque » ends the radio (the address loses `?radio=`); ✕ goes back to the viewer on the shown photo, one back press to the grid;
  - « Lancer la radio » from the viewer and from the slideshow menu: the frame restarts on that photo; leaving the frame brings back one viewer, not two;
  - `/frame?radio=<unknown id>`: the library plays, no message;
  - nothing scrolls sideways on a phone width.
- [ ] Left to the author (UX walkthrough): whether « Lancer la radio » belongs at the top of the photo menu, and how the selection feels on the wall over a few days (midnight switch).
- [x] Fresh-context review of the whole stack diff: done while planning, and again on the built stack (`f212b85..feat/selections-radio`, see Drift Log); the controller may run another on the pushed branches. Rien n'est mergé.

---

## Drift Log

Format: `date · task/step · what the plan said · what was done · why`.

| Date | Task / step | Plan said | Done | Why |
| ---- | ----------- | --------- | ---- | --- |
| 2026-11-25 | Planning (clone), Task 2 | the ranking test put `SAME_SENDER` in a shared collection too | removed from that collection fixture | it scored 2 links and broke the expected order; the test now isolates one link per photo |
| 2026-11-25 | Planning (clone), Task 3 | `useDailySelection(libraryPhotos, isEnabled)`, an effect re-run when the feed changes | its own socket (`photo:new`, `photo:opened`, `photo:deleted`, connect) plus the 15-minute timer | Biome: « This hook specifies more dependencies than necessary » (checked on a throwaway file); no `biome-ignore` precedent |
| 2026-11-25 | Planning (clone), Task 3 | `useSourcePhotos` showed an empty library at once | no shortcut: `loading` until the lot arrives | the shortcut flashed the empty screen before the lot |
| 2026-11-25 | Planning (clone), Task 3 | `cadre.md` slideshow list untouched | « toute la bibliothèque, la sélection du jour ou une collection » | the list named only the library and collections |
| 2026-11-25 | Planning (clone), Task 3 | R-CAD-89: the frame switches to the selection « dès qu'elle arrive » | « il réessaie au plus tard un quart d'heure après » | the retry runs on the timer, a reconnect or a photo event, not continuously |
| 2026-11-25 | Planning (clone), Tasks 4-5 | Task 4 (radio on the frame) and Task 5 (« Lancer la radio ») as two commits | one commit, `feat(client): launch a radio from a photo` | the frame half alone had no way in, and its product rules need the menu entry |
| 2026-11-25 | Planning (review), Task 1 | comment: a library of more than 20 photos keeps its lot until midnight | names the exceptions: a deleted photo is replaced, a photo received earlier and opened today counts at its reception | review: the comment overstated the rule |
| 2026-11-25 | Planning (review), Task 3 | R-CAD-86: a photo added or discovered during the day never replaces a lot photo | states the exception (received before today, opened today) | review: the product doc contradicted the code and ARCHITECTURE's known limit |
| 2026-11-25 | Planning (review), Task 4 | `useRadioSelection` kept its answer after the radio stopped | the effect cleanup forgets it | review: relaunching the same radio showed the old suite, then swapped in a new random tail mid-play (against R-CAD-94) |
| 2026-11-25 | Planning (review), Task 4 | `photosIn(photos, photoIds, isIdOrder)` | `photosInFeedOrder` and `photosInIdOrder`, picked by source kind | review: « no flag parameters » rule |
| 2026-11-25 | Planning (review), Task 4 | the menu guard compared the click with the played key | compares with the stored or radio key (`sourceKey(settings.source)`) | review: with a deleted stored collection, choosing « Toute la bibliothèque » did nothing and the stale choice stayed stored |
| 2026-11-25 | Planning (review), Task 4 | R-CAD-97 silent on the menu | « Le menu garde « Radio » coché », same in ARCHITECTURE | review: the daily rule said it, the radio rule did not |
| 2026-11-25 | Planning (review) | false « nouvelle photo » badge after a re-drawn lot; a selection whose photos all left shows « En attente de la première photo… » | not changed: spec Open questions 11 and 12 | rare; the first needs a change to the step 8 `useFrameSelection`, the second an extra fallback rule |
| 2026-11-25 | Build (clone), Task 1 | « keeps the lot when a photo arrives » and « 00:30 in Paris » used photo number 100 | `RANKED_IN_LOT_NUMBER = 103` | photo 100 ranks 21st of the library even as an older photo, so both tests passed with the day rule broken; 103 ranks 6th. Checked by mutation (`<` → `<=`): 3 tests fail |
| 2026-11-25 | Review (built stack), Tasks 2, 4 | ARCHITECTURE, R-CAD-90 and `radio/folder.bru` said « moins de 7 jours d'écart » | « 7 jours d'écart au plus » | the code links at `<=` 7 days, as the spec says (« at most ») |
| 2026-11-25 | Review (built stack), Task 2 | « tops up with the unlinked photos in random order » only checked that `random` was called | asserts the unlinked tail with a draw that swaps nothing (`0.99`), the library's order | the old test passed even if the draw was ignored |
| 2026-11-25 | Review (built stack), Tasks 1, 2 | unnamed numbers in the tests (`100`, `40`) | `LIBRARY.length + 1`, `RADIO_LENGTH + 10` | « no magic numbers » covers `src/**` tests too |
| 2026-11-25 | Review (built stack), Task 1 | Bruno `daily/folder.bru` silent on midnight | notes that a run across midnight (Paris) may fail and should be run again | `daily/04` and `radio/03` assume the upload and the read fall on the same day |
| 2026-11-25 | Review (built stack), Task 4 | a radio that fails at launch is never retried | not changed: spec Open question 7 (R-CAD-97) | a choice, not a bug: the library plays, « Radio » stays checked until another choice |

---

## Self-review (done while writing the plan)

**1. Spec coverage**

| Spec item | Task |
| --- | --- |
| `GET /api/selections/daily`, Paris day, hash rank, older photos first, 20, opened photos only | 1 |
| `GET /api/selections/radio/:photoId`, links, ties, own uploads, random top-up, 30, 404 cases, capitals | 2 |
| Bruno `selections/daily/` (7) and `selections/radio/` (11) | 1, 2 |
| `PhotoSource` `daily`, `useDailySelection` (socket, timer, latest load wins), `SelectedIds`, « Sélection du jour » in the menu and the preferences | 3 |
| `PlayedSource`, `?radio=`, `useRadioSelection`, « Radio » option, « Lancer la radio », `useStartRadio` history rules | 4 |
| Product docs (R-CAD-84..89, R-CAD-90..97, preferences, bibliothèque, glossary, `a-venir.md`) | 3, 4 |
| ARCHITECTURE | 1 to 4 |
| No schema change, no db:push | Stack section |

**2. Placeholder scan:** every task is its full final diff, docs included (exact French text).

**3. Type consistency:** `Selection` is the same `{ photoIds }` on both sides; `SelectedIds` is shared by the collection, daily and radio paths of `useSourcePhotos`; `PlayedSource` flows from `useSlideshowSettings` through `useFrameMode` to `SlideshowMenu`, while the preferences keep `PhotoSource` (a radio is never stored).

**4. Contradictions found while planning:**
- R-CAD-04 and R-CAD-77 named only the library and collections: qualified in Task 3 rather than replaced, their point holds.
- `a-venir.md` ends empty: the file stays, with a sentence pointing to the delivered rules.
- The « Lecture » rule says « Dans l'ordre » is newest first; for a radio it is the radio's order (R-CAD-93 says so).
