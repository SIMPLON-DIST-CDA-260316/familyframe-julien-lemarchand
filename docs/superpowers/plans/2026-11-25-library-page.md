---
plan: library-page
status: done
spec: docs/superpowers/specs/2026-11-25-library-page-design.md
branch: feat/library-server (PR A), feat/library-header (PR B), feat/library-collections (PR C)
worktree: false
tasks_total: 6
tasks_done: 6
current_task: null
last_commit: null
last_updated: 2026-11-25
---

# Library page refocused (Step 12) Implementation Plan

> **For agentic workers:** this plan was built while executing it, in a throwaway clone; every task below is a final diff (`git show` output, after formatting and the fresh-context review). Replaying it means applying each diff and running its gates.

**Working agreement (mandatory):** keep this plan in sync with reality. Append every divergence to the Drift Log. When a drift changes a decision of the spec, add a new spec doc rather than rewriting this one.

**Goal:** the library page shows only the library: a compact header with the count and « Ajouter », an add panel (sheet on a phone, dialog on a desktop), the compact mail banner, a chip row to browse and create collections, the shown collection's ⋯ menu, then the photos. The « Vos proches » and « Mes collections » cards leave. The API filters photos by collection.

**Architecture:** `GET /api/photos` accepts `collectionId`: the photos repository reads the collection's `photoIds` (owner check) and pages within them. On the client, `usePhotoLibrary(collectionId)` passes the filter, resets during render on a switch and reloads a collection on `collections:changed`; `useSelectedCollection` reads `?collection=` against `useCollections()`; `useViewerParam` edits `?photo=` on a copy of the search params so the collection stays. `ResponsivePanel` is extracted from `ShareSheet` and reused by `AddPhotoPanel`.

**Tech Stack:** Node 24, TypeScript, Express 5, Socket.IO 4, Prisma 6.19 (MongoDB), Vitest, Biome 2, Bruno, React 19 + React Router + Radix (shadcn `dialog`, `sheet`, `dropdown-menu`, `toggle-group`) + lucide-react, sonner, Tailwind 4.

## Global Constraints

- **No new dependency**, server or client. **Prisma stays on v6.** **No schema change**: no `pnpm db:push` checkpoint.
- **Never Docker, never start the API or Vite, never `pnpm db:push` / `db:seed`, never read `.env` files** (controller's hard rules for this step). Bruno is therefore counted from the files, not run; the controller runs `pnpm test:bruno` against a running API.
- **No client test runner:** client tasks are verified by `pnpm check`, `pnpm typecheck`, `pnpm build` and the Chrome checklist.
- **Error codes (reused):** `COLLECTION_NOT_FOUND` → `404` « Cette collection n'existe plus. » (unknown, malformed or other account's `collectionId`); `QUERY_INVALID` → `400` (repeated parameter).
- **TypeScript (AGENTS.md):** no `as` casts, explicit return types on exported functions, literal unions rather than `enum`.
- **Code rules (`.claude/rules/`):** comment why, never what; every function at most 30 lines (signature to closing brace, measured by a script on every touched file); logs only through `server/src/lib/logger.ts`, ids only.
- **UI:** French strings; 44 px touch targets on coarse pointers (`pointer-coarse:h-11` / `size-11`); works at 360 px with no horizontal page scroll (only the chip row scrolls).
- **Same commit rules:** endpoint change → `server/bruno/`; service rule → colocated `*.test.ts`; user-visible change → `docs/produit/` (French, no technical terms; a changed rule keeps its id, a replaced one is marked « Remplacée »); flow change → `ARCHITECTURE.md`.
- **Biome formats Markdown:** `pnpm check:fix` after a docs edit; the diffs below are after formatting.
- **Commits:** atomic, Conventional Commits in English, message in a scratchpad file passed with `git commit -F`, ending with the two attribution lines. Never `--no-verify`. The clone's `.npmrc` (virtual store outside the clone) is never committed.
- **Docker files are the author's work:** never touch `Dockerfile`, `server/Dockerfile`, `server/.dockerignore`, `compose.yaml`, `NOTE.md`, `.vscode/settings.json`.

## Interfaces

**Server**

- `PageQuery = { ownerId: string; beforeId: string | undefined; take: number; photoIds: string[] | undefined }`; repository `findPage(query)` filters `id: { lt: beforeId, in: photoIds }` (undefined fields are ignored by Prisma).
- Repository `findCollectionPhotoIds(id: string, ownerId: string): Promise<string[] | null>` (`null`: no such collection for this owner).
- `parseCollectionFilter(collectionId: unknown): string | undefined` in `photos.input.ts`: `undefined` → no filter; non-string → `QUERY_INVALID`; not an ObjectId → `COLLECTION_NOT_FOUND`.
- Service `listPage({ ownerId, cursor, limit, collectionId })`.

**Client**

- `photosApi`: `PageRequest.collectionId?: string`; `fetchNewestPhotos(count, collectionId: string | undefined, onUnauthenticated)`.
- `usePhotoLibrary(collectionId: CollectionFilter): PhotoLibrary` with `CollectionFilter = string | null`.
- `viewerHistory`: `COLLECTION_PARAM = 'collection'`, `libraryPath(collectionId: string | null): string`, `withPhotoParam(params, photoId: string | null): URLSearchParams`.
- `useSelectedCollection(): SelectedCollection` (`all` | `loading` | `found` + `collection` | `missing` | `failed`), `selectedCollectionId(selected): string | null`.
- `useLibraryUpload(selected, library): (photo: Photo) => void`.
- Components: `ResponsivePanel({ onClose, onCloseAutoFocus?, className?, children })`, `AddPhotoPanel({ isOpen, onClose, onUploaded })`, `UploadForm({ onUploaded, onShare })`, `LibraryHeader`, `CollectionChips({ selectedId })`, `SelectedCollectionBar({ collection })`, `EmptyLibrary`, `EmptyCollection`, `UnavailableCollection`. Removed: `FriendsCallToAction`, `CollectionsCard`, `CollectionRow`.

## Stack and branches

- **PR A `feat/library-server`** on top of `feat/selections-radio` (487e932): the spec and this plan, then Task 1.
- **PR B `feat/library-header`**: Task 2.
- **PR C `feat/library-collections`**: Tasks 3 to 6.

## Baselines

- `pnpm test` at 487e932: `Test Files  25 passed (25)`, `Tests  294 passed (294)`. After Task 1: `Tests  298 passed (298)`; later tasks leave it unchanged.
- Bruno files at 487e932: 178 requests, 452 assertions (380 `assert` lines + 72 `test()` calls). After Task 1: 185 requests, 472 assertions (397 + 75).

---

## PR A — `feat/library-server`

### Task 1: List the photos of one collection

**Commit:** `feat(server): list the photos of one collection`

**Scope:** Server filter, unit tests (4 new), Bruno `photos/list/07` to `13`, ARCHITECTURE.

**Gate:** `pnpm check` and `pnpm typecheck` green; `pnpm test` → `Tests  298 passed (298)`; Bruno files 185 requests / 472 assertions.

- [x] **Final diff**

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 1a1ba60..550a0f1 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -126,7 +126,7 @@ Une `Friendship` vaut `{ id, user, createdAt }` (`createdAt` en ISO 8601) : `id`
 
 Une `Photo` vaut `{ id, url, thumbnailUrl, createdAt, senderName, message }` (`createdAt` en ISO 8601 ; `senderName` est le nom d'affichage de l'ami qui l'a envoyée, `null` pour une photo que le compte a ajoutée lui-même ; `message` est le mot que cet ami y a joint, `null` sans message). Un message est du texte, espaces autour retirés, de 200 caractères au plus (`MAX_MESSAGE_LENGTH`, comptés après le retrait) ; vide, il compte comme absent. Les logs disent seulement s'il y en avait un (`hasMessage`), jamais son texte. Chaque photo appartient à un compte (`ownerId`, côté serveur seulement) : celui qui l'a ajoutée, ou l'ami qui l'a reçue. La liste, la suppression et les événements ne concernent que les photos du compte connecté. Une photo envoyée à un ami est une nouvelle photo **de l'ami** (`senderId` = l'expéditeur) : la bibliothèque de l'expéditeur ne change pas, et chacun supprime ses photos de son côté (la photo reçue reste quand l'expéditeur supprime l'original ou retire l'amitié). L'identifiant Cloudinary reste côté serveur : le client reçoit des URL prêtes à l'emploi.
 
-Une `Collection` vaut `{ id, name, photoIds }`, jamais son propriétaire : `photoIds` liste les photos du compte, dans l'ordre où elles y ont été ajoutées. Un nom est du texte, espaces autour retirés, de 1 à 50 caractères (`MAX_COLLECTION_NAME_LENGTH`, comme un nom d'affichage) ; deux collections d'un même compte ne portent pas le même nom (index unique `(ownerId, name)`, comparaison exacte après le trim : « noël » et « Noël » sont deux noms). Une collection d'un autre compte répond comme une inconnue. Seule une photo ouverte de la bibliothèque du compte entre dans une collection : inconnue, d'un autre compte ou reçue pas encore ouverte, elle répond `404 PHOTO_NOT_FOUND`, comme `GET /api/photos` ne la montre pas. Ajouter une photo déjà là, ou retirer une photo absente, répond la collection telle quelle.
+Une `Collection` vaut `{ id, name, photoIds }`, jamais son propriétaire : `photoIds` liste les photos du compte, dans l'ordre où elles y ont été ajoutées. Un nom est du texte, espaces autour retirés, de 1 à 50 caractères (`MAX_COLLECTION_NAME_LENGTH`, comme un nom d'affichage) ; deux collections d'un même compte ne portent pas le même nom (index unique `(ownerId, name)`, comparaison exacte après le trim : « noël » et « Noël » sont deux noms). Une collection d'un autre compte répond comme une inconnue. Seule une photo ouverte de la bibliothèque du compte entre dans une collection : inconnue, d'un autre compte ou reçue pas encore ouverte, elle répond `404 PHOTO_NOT_FOUND`, comme `GET /api/photos` ne la montre pas. Ajouter une photo déjà là, ou retirer une photo absente, répond la collection telle quelle. La bibliothèque montre une collection par `GET /api/photos?collectionId=<id>` : mêmes photos ouvertes, même ordre et même pagination, limitées à celles de la collection (un id mort ne trouve aucune photo) ; une collection d'un autre compte, inconnue ou un id mal formé répond `404 COLLECTION_NOT_FOUND`, le paramètre répété `400 QUERY_INVALID`.
 
 Une `Selection` vaut `{ photoIds }` : des ids de photos ouvertes de la bibliothèque du compte, jamais les photos elles-mêmes, que le cadre a déjà chargées. La sélection du jour (`features/selections/selections.daily.ts`) range chaque photo selon le SHA-256 de `<ownerId>:<jour>:<photoId>`, le jour étant la date à Paris (`Intl.DateTimeFormat`, fuseau `Europe/Paris`) : le même jour donne le même ordre sur tous les appareils et à chaque rechargement, sans rien enregistrer, et le lendemain un autre. Les photos arrivées avant aujourd'hui passent d'abord, celles du jour ensuite, et le lot garde les 20 premières (`DAILY_SELECTION_SIZE`) : une photo ajoutée aujourd'hui n'entre que dans un lot qui a encore de la place. Limite connue : une photo reçue hier et ouverte aujourd'hui compte comme arrivée hier (sa date est celle de la réception) et peut remplacer une photo du lot en cours de journée.
 
@@ -307,7 +307,7 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 - **Biome** : lint, formatage et tri des imports (remplace ESLint + Prettier). Dans `server/src`, `noConsole` interdit `console` : on passe par le logger.
 - **lefthook** : `biome check` au pre-commit, **commitlint** au commit-msg.
 - **Vitest** : tests unitaires du serveur, colocalisés (`*.test.ts`), lancés par `pnpm test` sans API ; exclus du build par `server/tsconfig.build.json`.
-- **Bruno** (`server/bruno/`) : requêtes de l'API avec assertions, un dossier par endpoint, des fichiers `NN-nominal-…` / `NN-edge-…`. Lancées par `pnpm test:bruno` contre l'API démarrée et la base remplie par le seed (CLI via `pnpm dlx`, version figée, pas de dépendance). Le dossier `auth/` passe en premier (`seq: 1`) et range le cookie de session dans une variable, envoyée à toutes les requêtes par un en-tête de collection ; le CLI tourne avec `--disable-cookies` pour que sa boîte à cookies ne renvoie pas la session aux requêtes « sans cookie ». Un second compte (l'admin, `auth/login/05`) range son cookie dans `adminCookie` : les requêtes qui vérifient qu'un compte ne touche pas aux photos d'un autre l'envoient à la place de celui du membre. Le dossier `invitations/` passe juste après (`seq: 2`) : l'admin y crée une invitation pour une adresse neuve à chaque lancement (`invite-<horodatage>@familyframe.test`), donc rien à remettre à zéro entre deux lancements. Le dossier `friendships/` suit (`seq: 3`) : le membre y envoie une demande à l'admin, et `invitations/accept/05` range le cookie du compte créé dans `inviteeCookie`, un tiers qui ne doit toucher à aucune amitié. Le dossier finit sans amitié entre le membre et l'admin ; `create/01` efface d'abord celle d'un lancement interrompu. Dans `photos/`, le dossier `share/` (`seq: 3`, avant `delete/`) lit les ids des deux comptes (`memberId`, `adminId`), rend le membre et l'admin amis, le membre envoie à l'admin une photo de sa bibliothèque et un fichier, puis l'amitié est supprimée ; `delete/` supprime ensuite les photos reçues par l'admin. Le dossier `collections/` (`seq: 5`, avant `photos/`) passe tout entier par le compte jetable (`inviteeCookie`), jamais par le membre dont les collections sont celles de la base partagée ; le membre y sert d'« autre compte ». Il crée deux collections et les renomme ; `photos/` (`seq: 4`) ajoute au compte jetable une photo et en reçoit une du membre (amis le temps de l'envoi), range et retire la photo, puis la supprime de la bibliothèque ; `delete/` (`seq: 5`) supprime les collections : le compte finit sans collection ni photo.
+- **Bruno** (`server/bruno/`) : requêtes de l'API avec assertions, un dossier par endpoint, des fichiers `NN-nominal-…` / `NN-edge-…`. Lancées par `pnpm test:bruno` contre l'API démarrée et la base remplie par le seed (CLI via `pnpm dlx`, version figée, pas de dépendance). Le dossier `auth/` passe en premier (`seq: 1`) et range le cookie de session dans une variable, envoyée à toutes les requêtes par un en-tête de collection ; le CLI tourne avec `--disable-cookies` pour que sa boîte à cookies ne renvoie pas la session aux requêtes « sans cookie ». Un second compte (l'admin, `auth/login/05`) range son cookie dans `adminCookie` : les requêtes qui vérifient qu'un compte ne touche pas aux photos d'un autre l'envoient à la place de celui du membre. Le dossier `invitations/` passe juste après (`seq: 2`) : l'admin y crée une invitation pour une adresse neuve à chaque lancement (`invite-<horodatage>@familyframe.test`), donc rien à remettre à zéro entre deux lancements. Le dossier `friendships/` suit (`seq: 3`) : le membre y envoie une demande à l'admin, et `invitations/accept/05` range le cookie du compte créé dans `inviteeCookie`, un tiers qui ne doit toucher à aucune amitié. Le dossier finit sans amitié entre le membre et l'admin ; `create/01` efface d'abord celle d'un lancement interrompu. Dans `photos/`, `list/07` à `list/13` filtrent sur une collection neuve du membre (nom horodaté, la base est partagée), créée par `07` et supprimée par `13` ; le dossier `share/` (`seq: 3`, avant `delete/`) lit les ids des deux comptes (`memberId`, `adminId`), rend le membre et l'admin amis, le membre envoie à l'admin une photo de sa bibliothèque et un fichier, puis l'amitié est supprimée ; `delete/` supprime ensuite les photos reçues par l'admin. Le dossier `collections/` (`seq: 5`, avant `photos/`) passe tout entier par le compte jetable (`inviteeCookie`), jamais par le membre dont les collections sont celles de la base partagée ; le membre y sert d'« autre compte ». Il crée deux collections et les renomme ; `photos/` (`seq: 4`) ajoute au compte jetable une photo et en reçoit une du membre (amis le temps de l'envoi), range et retire la photo, puis la supprime de la bibliothèque ; `delete/` (`seq: 5`) supprime les collections : le compte finit sans collection ni photo.
 - **Hooks Claude Code** (`.claude/hooks/`) : garde-fous pour l'agent IA, testés avec `node:test`.
 
 ## Conteneurisation
diff --git a/server/bruno/photos/folder.bru b/server/bruno/photos/folder.bru
index ea1a83b..63a8f51 100644
--- a/server/bruno/photos/folder.bru
+++ b/server/bruno/photos/folder.bru
@@ -17,7 +17,7 @@ docs {
   (`PHOTO_MISSING`, `UPLOAD_INVALID`, `BODY_INVALID`, `QUERY_INVALID`,
   `UNAUTHENTICATED`, `NOT_FRIENDS`, `PHOTO_NOT_FOUND`, `PHOTO_DUPLICATE`,
   `PHOTO_TOO_LARGE`, `FORMAT_UNSUPPORTED`, `IMAGE_UNREADABLE`, `MESSAGE_INVALID`,
-  `SERVER_ERROR`)
+  `COLLECTION_NOT_FOUND`, `SERVER_ERROR`)
   que le client traduit en français.
   Une photo envoyée par un ami arrive non ouverte : elle attend dans
   `unopened` jusqu'à ce que son propriétaire l'ouvre (`open`), puis rejoint
diff --git a/server/bruno/photos/list/07-nominal-collection.bru b/server/bruno/photos/list/07-nominal-collection.bru
new file mode 100644
index 0000000..ff28f05
--- /dev/null
+++ b/server/bruno/photos/list/07-nominal-collection.bru
@@ -0,0 +1,52 @@
+meta {
+  name: Nominal - photos d'une collection
+  type: http
+  seq: 7
+}
+
+get {
+  url: {{baseUrl}}/api/photos?collectionId={{listCollectionId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  const axios = require('axios')
+  if (!bru.getVar('createdPhotoId')) {
+    throw new Error('createdPhotoId absent : lancer le dossier photos en entier, create/01 doit passer')
+  }
+  // A script request does not get the collection headers: send the member's cookie itself.
+  const headers = { Cookie: bru.getVar('sessionCookie') }
+  const baseUrl = bru.getEnvVar('baseUrl')
+  // A new name at each run: the member's collections are those of the shared dev database.
+  const created = await axios.post(
+    `${baseUrl}/api/collections`,
+    { name: `Bruno liste ${Date.now()}` },
+    { headers },
+  )
+  bru.setVar('listCollectionId', created.data.id)
+  await axios.put(
+    `${baseUrl}/api/collections/${created.data.id}/photos/${bru.getVar('createdPhotoId')}`,
+    null,
+    { headers },
+  )
+}
+
+assert {
+  res.status: eq 200
+  res.body.photos.length: eq 1
+  res.body.nextCursor: isNull
+}
+
+script:post-response {
+  test('la photo attendue', () => {
+    expect(res.body.photos[0].id).to.equal(bru.getVar('createdPhotoId'))
+  })
+}
+
+docs {
+  NOMINAL → 200 : seules les photos de la collection, ici celle de
+  `create/01`, alors que la bibliothèque du membre en compte bien d'autres.
+  Le script de départ crée une collection neuve au nom du membre (un nom
+  horodaté, sa base est partagée) et y range la photo ; `13` la supprime.
+}
diff --git a/server/bruno/photos/list/08-nominal-collection-premiere-page.bru b/server/bruno/photos/list/08-nominal-collection-premiere-page.bru
new file mode 100644
index 0000000..098ed6f
--- /dev/null
+++ b/server/bruno/photos/list/08-nominal-collection-premiere-page.bru
@@ -0,0 +1,44 @@
+meta {
+  name: Nominal - collection, première page d'une photo
+  type: http
+  seq: 8
+}
+
+get {
+  url: {{baseUrl}}/api/photos?collectionId={{listCollectionId}}&limit=1
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  const axios = require('axios')
+  if (!bru.getVar('listCollectionId') || !bru.getVar('createdPngId')) {
+    throw new Error('listCollectionId ou createdPngId absent : lancer le dossier photos en entier, create/02 et list/07 doivent passer')
+  }
+  // The PNG of create/02 joins the collection: two photos, so two pages of one.
+  await axios.put(
+    `${bru.getEnvVar('baseUrl')}/api/collections/${bru.getVar('listCollectionId')}/photos/${bru.getVar('createdPngId')}`,
+    null,
+    { headers: { Cookie: bru.getVar('sessionCookie') } },
+  )
+}
+
+assert {
+  res.status: eq 200
+  res.body.photos.length: eq 1
+  res.body.nextCursor: isString
+}
+
+script:post-response {
+  test('la photo attendue', () => {
+    expect(res.body.photos[0].id).to.equal(bru.getVar('createdPngId'))
+  })
+  // 09 asks for the page after this one.
+  bru.setVar('collectionNextCursor', res.body.nextCursor)
+}
+
+docs {
+  NOMINAL → 200, une photo et un `nextCursor` : la collection compte deux
+  photos, la plus récente (`create/02`) vient en premier, comme dans la
+  bibliothèque.
+}
diff --git a/server/bruno/photos/list/09-nominal-collection-page-suivante.bru b/server/bruno/photos/list/09-nominal-collection-page-suivante.bru
new file mode 100644
index 0000000..e9d5ea0
--- /dev/null
+++ b/server/bruno/photos/list/09-nominal-collection-page-suivante.bru
@@ -0,0 +1,36 @@
+meta {
+  name: Nominal - collection, page suivante
+  type: http
+  seq: 9
+}
+
+get {
+  url: {{baseUrl}}/api/photos?collectionId={{listCollectionId}}&cursor={{collectionNextCursor}}&limit=1
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  // Without it the request would test the first page again.
+  if (!bru.getVar('collectionNextCursor')) {
+    throw new Error('collectionNextCursor absent : lancer le dossier photos en entier, list/08 doit passer')
+  }
+}
+
+assert {
+  res.status: eq 200
+  res.body.photos.length: eq 1
+  res.body.nextCursor: isNull
+}
+
+script:post-response {
+  test('la photo attendue', () => {
+    expect(res.body.photos[0].id).to.equal(bru.getVar('createdPhotoId'))
+  })
+}
+
+docs {
+  NOMINAL → 200 : la page qui suit `08` reste dans la collection. Elle
+  donne la photo de `create/01`, et pas une photo plus ancienne de la
+  bibliothèque ; c'est la dernière page.
+}
diff --git a/server/bruno/photos/list/10-edge-collection-autre-compte.bru b/server/bruno/photos/list/10-edge-collection-autre-compte.bru
new file mode 100644
index 0000000..5b1e430
--- /dev/null
+++ b/server/bruno/photos/list/10-edge-collection-autre-compte.bru
@@ -0,0 +1,30 @@
+meta {
+  name: Edge - collection d'un autre compte
+  type: http
+  seq: 10
+}
+
+get {
+  url: {{baseUrl}}/api/photos?collectionId={{listCollectionId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  if (!bru.getVar('listCollectionId') || !bru.getVar('adminCookie')) {
+    throw new Error('listCollectionId ou adminCookie absent : lancer toute la collection, auth/login/05 et photos/list/07 doivent passer')
+  }
+  // The admin asks for the member's collection.
+  req.setHeader('Cookie', bru.getVar('adminCookie'))
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq COLLECTION_NOT_FOUND
+}
+
+docs {
+  EDGE → 404 COLLECTION_NOT_FOUND : l'admin demande les photos d'une
+  collection du membre. Elle répond comme une collection inconnue : son
+  existence ne fuit pas.
+}
diff --git a/server/bruno/photos/list/11-edge-collection-inconnue.bru b/server/bruno/photos/list/11-edge-collection-inconnue.bru
new file mode 100644
index 0000000..d887156
--- /dev/null
+++ b/server/bruno/photos/list/11-edge-collection-inconnue.bru
@@ -0,0 +1,21 @@
+meta {
+  name: Edge - collection inconnue
+  type: http
+  seq: 11
+}
+
+get {
+  url: {{baseUrl}}/api/photos?collectionId=000000000000000000000000
+  body: none
+  auth: none
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq COLLECTION_NOT_FOUND
+}
+
+docs {
+  EDGE → 404 COLLECTION_NOT_FOUND : un ObjectId bien formé qui ne désigne
+  aucune collection.
+}
diff --git a/server/bruno/photos/list/12-edge-collection-id-invalide.bru b/server/bruno/photos/list/12-edge-collection-id-invalide.bru
new file mode 100644
index 0000000..93badc9
--- /dev/null
+++ b/server/bruno/photos/list/12-edge-collection-id-invalide.bru
@@ -0,0 +1,23 @@
+meta {
+  name: Edge - id de collection invalide
+  type: http
+  seq: 12
+}
+
+get {
+  url: {{baseUrl}}/api/photos?collectionId=pas-un-id
+  body: none
+  auth: none
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq COLLECTION_NOT_FOUND
+}
+
+docs {
+  EDGE → 404 COLLECTION_NOT_FOUND : un id qui n'est pas un ObjectId est une
+  collection inconnue de plus, comme sur les routes `/api/collections`. Un
+  paramètre répété (`?collectionId=a&collectionId=b`) répond 400
+  `QUERY_INVALID` : ce cas est dans `photos.service.list.test.ts`.
+}
diff --git a/server/bruno/photos/list/13-edge-collection-supprimee.bru b/server/bruno/photos/list/13-edge-collection-supprimee.bru
new file mode 100644
index 0000000..99b17eb
--- /dev/null
+++ b/server/bruno/photos/list/13-edge-collection-supprimee.bru
@@ -0,0 +1,33 @@
+meta {
+  name: Edge - collection supprimée
+  type: http
+  seq: 13
+}
+
+get {
+  url: {{baseUrl}}/api/photos?collectionId={{listCollectionId}}
+  body: none
+  auth: none
+}
+
+script:pre-request {
+  const axios = require('axios')
+  if (!bru.getVar('listCollectionId')) {
+    throw new Error('listCollectionId absent : lancer le dossier photos en entier, list/07 doit passer')
+  }
+  // Also the cleanup: the member keeps no collection from this folder.
+  await axios.delete(`${bru.getEnvVar('baseUrl')}/api/collections/${bru.getVar('listCollectionId')}`, {
+    headers: { Cookie: bru.getVar('sessionCookie') },
+  })
+}
+
+assert {
+  res.status: eq 404
+  res.body.error: eq COLLECTION_NOT_FOUND
+}
+
+docs {
+  EDGE → 404 COLLECTION_NOT_FOUND : le script de départ supprime la
+  collection de `07` (ses photos restent dans la bibliothèque), puis la
+  requête la redemande, comme une page restée ouverte sur un autre appareil.
+}
diff --git a/server/bruno/photos/list/folder.bru b/server/bruno/photos/list/folder.bru
index b111ca1..3bb417f 100644
--- a/server/bruno/photos/list/folder.bru
+++ b/server/bruno/photos/list/folder.bru
@@ -9,6 +9,13 @@ docs {
   100 (30 par défaut) ; `nextCursor` est l'id à passer en `cursor` pour la
   page suivante, `null` à la dernière.
 
+  `collectionId=<id>` ne garde que les photos de cette collection du compte
+  connecté, dans le même ordre et avec la même pagination. Une collection
+  d'un autre compte, inconnue ou un id mal formé : 404
+  `COLLECTION_NOT_FOUND` ; le paramètre répété : 400 `QUERY_INVALID`. `07` à
+  `13` passent par une collection neuve du membre, créée par `07` et
+  supprimée par `13`.
+
   Lancé entre `create` et `delete` (`seq: 2`) : il voit les deux photos que
   `create` vient d'ajouter, donc au moins deux pages de une photo.
 }
diff --git a/server/src/features/photos/photos.controller.ts b/server/src/features/photos/photos.controller.ts
index acc27ba..c0d2bc3 100644
--- a/server/src/features/photos/photos.controller.ts
+++ b/server/src/features/photos/photos.controller.ts
@@ -50,6 +50,7 @@ async function list({ service }: ControllerDeps, req: Request, res: Response): P
     ownerId: currentUser(req).id,
     cursor: req.query.cursor,
     limit: req.query.limit,
+    collectionId: req.query.collectionId,
   })
   const page: PhotoPage = { photos: records.map(toPhotoDto), nextCursor }
   res.json(page)
diff --git a/server/src/features/photos/photos.input.ts b/server/src/features/photos/photos.input.ts
index eaa913b..48301f4 100644
--- a/server/src/features/photos/photos.input.ts
+++ b/server/src/features/photos/photos.input.ts
@@ -69,3 +69,18 @@ export function parseCursor(cursor: unknown): string | undefined {
   }
   return cursor
 }
+
+// undefined: the whole library. A repeated key is a malformed query; a malformed id is one more
+// unknown collection, as on the collections routes.
+export function parseCollectionFilter(collectionId: unknown): string | undefined {
+  if (collectionId === undefined) {
+    return undefined
+  }
+  if (typeof collectionId !== 'string') {
+    throw new AppError('QUERY_INVALID')
+  }
+  if (!OBJECT_ID_PATTERN.test(collectionId)) {
+    throw new AppError('COLLECTION_NOT_FOUND')
+  }
+  return collectionId
+}
diff --git a/server/src/features/photos/photos.repository.ts b/server/src/features/photos/photos.repository.ts
index 4f0714a..81e5a71 100644
--- a/server/src/features/photos/photos.repository.ts
+++ b/server/src/features/photos/photos.repository.ts
@@ -23,7 +23,13 @@ export type NewPhoto = {
   sha256: string
 }
 
-export type PageQuery = { ownerId: string; beforeId: string | undefined; take: number }
+// photoIds: only these photos, a collection's; undefined for the whole library.
+export type PageQuery = {
+  ownerId: string
+  beforeId: string | undefined
+  take: number
+  photoIds: string[] | undefined
+}
 
 export type PhotosRepository = {
   // Opened photos only: the library and the slideshow.
@@ -39,6 +45,8 @@ export type PhotosRepository = {
   // null unless this owner has a photo with this id, like findOwned.
   openOwned: (id: string, ownerId: string) => Promise<PhotoRecord | null>
   countByCloudinaryId: (cloudinaryId: string) => Promise<number>
+  // null unless id is one of ownerId's collections: someone else's answers like a missing one.
+  findCollectionPhotoIds: (id: string, ownerId: string) => Promise<string[] | null>
 }
 
 // isOpened is unset on photos saved before step 9: they count as opened. Prisma's
@@ -104,17 +112,35 @@ async function openOwned(
   }
 }
 
+// Keyset on the id: an ObjectId starts with its creation time, so by id is newest first, and
+// "older than the cursor" is a single indexed range. A collection's dead ids match no photo.
+function findPage(
+  prisma: PrismaClient,
+  { ownerId, beforeId, take, photoIds }: PageQuery,
+): Promise<PhotoRecord[]> {
+  return prisma.photo.findMany({
+    where: { ownerId, id: { lt: beforeId, in: photoIds }, ...IS_OPENED },
+    orderBy: { id: 'desc' },
+    take,
+    include: SENDER_NAME,
+  })
+}
+
+async function findCollectionPhotoIds(
+  prisma: PrismaClient,
+  id: string,
+  ownerId: string,
+): Promise<string[] | null> {
+  const collection = await prisma.collection.findFirst({
+    where: { id, ownerId },
+    select: { photoIds: true },
+  })
+  return collection?.photoIds ?? null
+}
+
 export function createPhotosRepository(prisma: PrismaClient): PhotosRepository {
   return {
-    // Keyset on the id: an ObjectId starts with its creation time, so by id is newest
-    // first, and "older than the cursor" is a single indexed range.
-    findPage: ({ ownerId, beforeId, take }) =>
-      prisma.photo.findMany({
-        where: { ownerId, id: beforeId ? { lt: beforeId } : undefined, ...IS_OPENED },
-        orderBy: { id: 'desc' },
-        take,
-        include: SENDER_NAME,
-      }),
+    findPage: (query) => findPage(prisma, query),
     findUnopened: (ownerId) =>
       prisma.photo.findMany({
         where: { ownerId, isOpened: false },
@@ -128,5 +154,6 @@ export function createPhotosRepository(prisma: PrismaClient): PhotosRepository {
     deleteOwned: (id, ownerId) => deleteOwned(prisma, id, ownerId),
     openOwned: (id, ownerId) => openOwned(prisma, id, ownerId),
     countByCloudinaryId: (cloudinaryId) => prisma.photo.count({ where: { cloudinaryId } }),
+    findCollectionPhotoIds: (id, ownerId) => findCollectionPhotoIds(prisma, id, ownerId),
   }
 }
diff --git a/server/src/features/photos/photos.service.delete.test.ts b/server/src/features/photos/photos.service.delete.test.ts
index 3c48ffe..6d4dd09 100644
--- a/server/src/features/photos/photos.service.delete.test.ts
+++ b/server/src/features/photos/photos.service.delete.test.ts
@@ -30,6 +30,7 @@ function makeDeps() {
       openOwned: vi.fn<PhotosRepository['openOwned']>(),
       findUnopened: vi.fn<PhotosRepository['findUnopened']>(),
       countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>().mockResolvedValue(0),
+      findCollectionPhotoIds: vi.fn<PhotosRepository['findCollectionPhotoIds']>(),
     },
     toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>(),
     uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>(),
diff --git a/server/src/features/photos/photos.service.list.test.ts b/server/src/features/photos/photos.service.list.test.ts
index 6639e97..b5d579b 100644
--- a/server/src/features/photos/photos.service.list.test.ts
+++ b/server/src/features/photos/photos.service.list.test.ts
@@ -6,6 +6,7 @@ import { createPhotosService, type PhotosServiceDeps } from './photos.service.js
 
 const OWNER_ID = '6b044f9d56a44767c7079b01'
 const CURSOR = '6b044f9d56a44767c7079a05'
+const COLLECTION_ID = '6b044f9d56a44767c7079c01'
 
 function recordWithId(id: string): PhotoRecord {
   return {
@@ -29,7 +30,7 @@ const RECORDS = [
   '6b044f9d56a44767c7079a01',
 ].map(recordWithId)
 
-// Listing only reads findPage: the other fakes stay unused.
+// Listing only reads findPage and findCollectionPhotoIds: the other fakes stay unused.
 function makeDeps() {
   return {
     repository: {
@@ -41,6 +42,9 @@ function makeDeps() {
       openOwned: vi.fn<PhotosRepository['openOwned']>(),
       findUnopened: vi.fn<PhotosRepository['findUnopened']>(),
       countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>(),
+      findCollectionPhotoIds: vi
+        .fn<PhotosRepository['findCollectionPhotoIds']>()
+        .mockResolvedValue([RECORDS[0].id]),
     },
     toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>(),
     uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>(),
@@ -62,12 +66,14 @@ describe('listPage', () => {
       ownerId: OWNER_ID,
       cursor: undefined,
       limit: undefined,
+      collectionId: undefined,
     })
 
     expect(deps.repository.findPage).toHaveBeenCalledWith({
       ownerId: OWNER_ID,
       beforeId: undefined,
       take: DEFAULT_PAGE_SIZE + 1,
+      photoIds: undefined,
     })
   })
 
@@ -78,12 +84,14 @@ describe('listPage', () => {
       ownerId: OWNER_ID,
       cursor: undefined,
       limit: String(MAX_PAGE_SIZE),
+      collectionId: undefined,
     })
 
     expect(deps.repository.findPage).toHaveBeenCalledWith({
       ownerId: OWNER_ID,
       beforeId: undefined,
       take: MAX_PAGE_SIZE + 1,
+      photoIds: undefined,
     })
   })
 
@@ -97,7 +105,12 @@ describe('listPage', () => {
     const deps = makeDeps()
 
     await expect(
-      createPhotosService(deps).listPage({ ownerId: OWNER_ID, cursor: undefined, limit }),
+      createPhotosService(deps).listPage({
+        ownerId: OWNER_ID,
+        cursor: undefined,
+        limit,
+        collectionId: undefined,
+      }),
     ).rejects.toMatchObject({ code: 'QUERY_INVALID' })
     expect(deps.repository.findPage).not.toHaveBeenCalled()
   })
@@ -109,7 +122,12 @@ describe('listPage', () => {
     const deps = makeDeps()
 
     await expect(
-      createPhotosService(deps).listPage({ ownerId: OWNER_ID, cursor, limit: undefined }),
+      createPhotosService(deps).listPage({
+        ownerId: OWNER_ID,
+        cursor,
+        limit: undefined,
+        collectionId: undefined,
+      }),
     ).rejects.toMatchObject({ code: 'QUERY_INVALID' })
     expect(deps.repository.findPage).not.toHaveBeenCalled()
   })
@@ -121,12 +139,14 @@ describe('listPage', () => {
       ownerId: OWNER_ID,
       cursor: CURSOR,
       limit: undefined,
+      collectionId: undefined,
     })
 
     expect(deps.repository.findPage).toHaveBeenCalledWith({
       ownerId: OWNER_ID,
       beforeId: CURSOR,
       take: DEFAULT_PAGE_SIZE + 1,
+      photoIds: undefined,
     })
   })
 
@@ -138,6 +158,7 @@ describe('listPage', () => {
       ownerId: OWNER_ID,
       cursor: undefined,
       limit: '2',
+      collectionId: undefined,
     })
 
     expect(page).toEqual({ records: RECORDS.slice(0, 2), nextCursor: RECORDS[1].id })
@@ -151,8 +172,71 @@ describe('listPage', () => {
       ownerId: OWNER_ID,
       cursor: undefined,
       limit: '2',
+      collectionId: undefined,
     })
 
     expect(page).toEqual({ records: RECORDS.slice(0, 2), nextCursor: null })
   })
+
+  it("lists only the photos of one of the owner's collections", async () => {
+    const deps = makeDeps()
+
+    await createPhotosService(deps).listPage({
+      ownerId: OWNER_ID,
+      cursor: CURSOR,
+      limit: undefined,
+      collectionId: COLLECTION_ID,
+    })
+
+    expect(deps.repository.findCollectionPhotoIds).toHaveBeenCalledWith(COLLECTION_ID, OWNER_ID)
+    expect(deps.repository.findPage).toHaveBeenCalledWith({
+      ownerId: OWNER_ID,
+      beforeId: CURSOR,
+      take: DEFAULT_PAGE_SIZE + 1,
+      photoIds: [RECORDS[0].id],
+    })
+  })
+
+  it("answers an unknown or someone else's collection like a missing one", async () => {
+    const deps = makeDeps()
+    deps.repository.findCollectionPhotoIds.mockResolvedValue(null)
+
+    await expect(
+      createPhotosService(deps).listPage({
+        ownerId: OWNER_ID,
+        cursor: undefined,
+        limit: undefined,
+        collectionId: COLLECTION_ID,
+      }),
+    ).rejects.toMatchObject({ code: 'COLLECTION_NOT_FOUND' })
+    expect(deps.repository.findPage).not.toHaveBeenCalled()
+  })
+
+  it('answers a collection id that is not an ObjectId like a missing one', async () => {
+    const deps = makeDeps()
+
+    await expect(
+      createPhotosService(deps).listPage({
+        ownerId: OWNER_ID,
+        cursor: undefined,
+        limit: undefined,
+        collectionId: 'pas-un-id',
+      }),
+    ).rejects.toMatchObject({ code: 'COLLECTION_NOT_FOUND' })
+    expect(deps.repository.findCollectionPhotoIds).not.toHaveBeenCalled()
+  })
+
+  it('rejects a collection id repeated in the query', async () => {
+    const deps = makeDeps()
+
+    await expect(
+      createPhotosService(deps).listPage({
+        ownerId: OWNER_ID,
+        cursor: undefined,
+        limit: undefined,
+        collectionId: [COLLECTION_ID, COLLECTION_ID],
+      }),
+    ).rejects.toMatchObject({ code: 'QUERY_INVALID' })
+    expect(deps.repository.findCollectionPhotoIds).not.toHaveBeenCalled()
+  })
 })
diff --git a/server/src/features/photos/photos.service.message.test.ts b/server/src/features/photos/photos.service.message.test.ts
index da1879b..c3342a8 100644
--- a/server/src/features/photos/photos.service.message.test.ts
+++ b/server/src/features/photos/photos.service.message.test.ts
@@ -44,6 +44,7 @@ function makeDeps() {
       openOwned: vi.fn<PhotosRepository['openOwned']>(),
       findUnopened: vi.fn<PhotosRepository['findUnopened']>(),
       countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>(),
+      findCollectionPhotoIds: vi.fn<PhotosRepository['findCollectionPhotoIds']>(),
     },
     toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>().mockResolvedValue(Buffer.from('jpeg')),
     uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>().mockResolvedValue(IMAGE),
diff --git a/server/src/features/photos/photos.service.open.test.ts b/server/src/features/photos/photos.service.open.test.ts
index 683b521..30dc7fa 100644
--- a/server/src/features/photos/photos.service.open.test.ts
+++ b/server/src/features/photos/photos.service.open.test.ts
@@ -30,6 +30,7 @@ function makeDeps() {
       openOwned: vi.fn<PhotosRepository['openOwned']>().mockResolvedValue(OPENED),
       findUnopened: vi.fn<PhotosRepository['findUnopened']>().mockResolvedValue([]),
       countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>(),
+      findCollectionPhotoIds: vi.fn<PhotosRepository['findCollectionPhotoIds']>(),
     },
     toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>(),
     uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>(),
diff --git a/server/src/features/photos/photos.service.share.test.ts b/server/src/features/photos/photos.service.share.test.ts
index 1ad7fd4..318a6cd 100644
--- a/server/src/features/photos/photos.service.share.test.ts
+++ b/server/src/features/photos/photos.service.share.test.ts
@@ -53,6 +53,7 @@ function makeDeps() {
       openOwned: vi.fn<PhotosRepository['openOwned']>(),
       findUnopened: vi.fn<PhotosRepository['findUnopened']>(),
       countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>(),
+      findCollectionPhotoIds: vi.fn<PhotosRepository['findCollectionPhotoIds']>(),
     },
     toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>().mockResolvedValue(FRAME_JPEG),
     uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>().mockResolvedValue(FRESH_IMAGE),
diff --git a/server/src/features/photos/photos.service.test.ts b/server/src/features/photos/photos.service.test.ts
index 06feac5..104760c 100644
--- a/server/src/features/photos/photos.service.test.ts
+++ b/server/src/features/photos/photos.service.test.ts
@@ -37,6 +37,7 @@ function makeDeps() {
       openOwned: vi.fn<PhotosRepository['openOwned']>(),
       findUnopened: vi.fn<PhotosRepository['findUnopened']>(),
       countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>().mockResolvedValue(0),
+      findCollectionPhotoIds: vi.fn<PhotosRepository['findCollectionPhotoIds']>(),
     },
     toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>().mockResolvedValue(FRAME_JPEG),
     uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>().mockResolvedValue(IMAGE),
diff --git a/server/src/features/photos/photos.service.ts b/server/src/features/photos/photos.service.ts
index 1c9b5b8..3da778e 100644
--- a/server/src/features/photos/photos.service.ts
+++ b/server/src/features/photos/photos.service.ts
@@ -2,6 +2,7 @@ import { AppError } from '../../errors/app-error.js'
 import type { UploadedImage } from '../../lib/cloudinary.js'
 import type { Logger } from '../../lib/logger.js'
 import {
+  parseCollectionFilter,
   parseCursor,
   parseFile,
   parseLimit,
@@ -25,8 +26,14 @@ export type PhotoDeletion = { ownerId: string; id: string }
 // id comes straight from the URL: validated here.
 export type PhotoOpening = { ownerId: string; id: string }
 
-// cursor and limit come straight from the query string: validated here, at the boundary.
-export type PageInput = { ownerId: string; cursor: unknown; limit: unknown }
+// cursor, limit and collectionId come straight from the query string: validated here, at the
+// boundary.
+export type PageInput = {
+  ownerId: string
+  cursor: unknown
+  limit: unknown
+  collectionId: unknown
+}
 
 export type RecordPage = { records: PhotoRecord[]; nextCursor: string | null }
 
@@ -119,14 +126,32 @@ async function openPhoto(
   return record
 }
 
+// undefined: the whole library. Someone else's collection answers like a missing one.
+async function findFilterPhotoIds(
+  repository: PhotosRepository,
+  ownerId: string,
+  collectionId: string | undefined,
+): Promise<string[] | undefined> {
+  if (collectionId === undefined) {
+    return undefined
+  }
+  const photoIds = await repository.findCollectionPhotoIds(collectionId, ownerId)
+  if (photoIds === null) {
+    throw new AppError('COLLECTION_NOT_FOUND')
+  }
+  return photoIds
+}
+
 // One record more than asked tells whether a next page exists, without a count query.
 async function listPage(
   { repository }: PhotosServiceDeps,
-  { ownerId, cursor, limit }: PageInput,
+  { ownerId, cursor, limit, collectionId }: PageInput,
 ): Promise<RecordPage> {
   const pageSize = parseLimit(limit)
   const beforeId = parseCursor(cursor)
-  const records = await repository.findPage({ ownerId, beforeId, take: pageSize + 1 })
+  const filterId = parseCollectionFilter(collectionId)
+  const photoIds = await findFilterPhotoIds(repository, ownerId, filterId)
+  const records = await repository.findPage({ ownerId, beforeId, take: pageSize + 1, photoIds })
   if (records.length <= pageSize) {
     return { records, nextCursor: null }
   }
~~~~

## PR B — `feat/library-header`

### Task 2: Compact header and add panel

**Commit:** `feat(client): give the library a compact header and an add panel`

**Scope:** `ResponsivePanel` extracted from `ShareSheet`; `AddPhotoPanel` with « Prendre une photo » / « Choisir une image »; `LibraryHeader` with the count; compact mail banner; empty library; « Vos proches » removed. Product docs: R-BIB-02, -12, -13, -28 amended, R-BIB-29 « Remplacée », R-BIB-44..47, R-PAR-22, -23, R-APP-34.

**Gate:** `pnpm check`, `pnpm typecheck`, `pnpm build` green.

- [x] **Final diff**

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 550a0f1..81026ca 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -43,15 +43,15 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 
 ## Pages
 
-| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
-| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
-| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
-| `/`                  | bibliothèque : en tête, quand des photos reçues attendent, l'annonce « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la carte d'envoi (« Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui n'envoie le fichier qu'à l'ami), puis « Mes collections » (`components/collections/` : « Nouvelle collection », une ligne par collection avec son nombre de photos et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer »), puis les photos du compte en vignettes ou en liste (choix mémorisé par appareil), « Mode cadre » à côté du choix vignettes/liste lance le diaporama, 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/`) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Lancer la radio », « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
-| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour, d'une de ses collections ou d'une radio (`/frame?radio=<id>`), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; tant qu'une radio joue, « Photos » la montre en tête, cochée (« Radio ») ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                             |
-| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
-| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
-| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
+| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
+| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
+| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
+| `/`                  | bibliothèque, consacrée aux photos (les amis sont sur `/friends`) : en tête « Bibliothèque », le nombre de photos (« Plus de N photos » tant que des pages restent), « Ajouter », « Mode cadre » et le choix vignettes/liste (`LibraryHeader`) ; « Ajouter » ouvre le panneau « Ajouter une photo » (`AddPhotoPanel`, feuille par le bas sur mobile, fenêtre au centre sur ordinateur, comme le panneau d'envoi : `ResponsivePanel`) : « Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui ferme le panneau et ouvre celui de l'envoi, pour l'ami seulement ; puis, quand des photos reçues attendent, l'annonce compacte « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis « Mes collections » (`components/collections/` : « Nouvelle collection », une ligne par collection avec son nombre de photos et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer »), puis les photos du compte en vignettes ou en liste (choix mémorisé par appareil ; vide : « Ajouter une photo »), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/`) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Lancer la radio », « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
+| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour, d'une de ses collections ou d'une radio (`/frame?radio=<id>`), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; tant qu'une radio joue, « Photos » la montre en tête, cochée (« Radio ») ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
+| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
+| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
+| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
 
 Visionneuse : l'adresse `/?photo=<id>` ouvre la photo, un lien la partage. Ouvrir depuis la bibliothèque ajoute une entrée d'historique, passer d'une photo à l'autre la remplace, et fermer revient en arrière : le bouton retour d'Android ferme la visionneuse. Près de la fin des photos chargées, la page suivante se charge. Une photo supprimée pendant qu'on la regarde laisse sa place à la suivante (la précédente si c'était la plus ancienne), et la visionneuse se ferme quand il n'en reste aucune ; un lien vers une photo inconnue charge les pages jusqu'à la trouver, puis ferme s'il n'y en a plus. « Mode cadre » remplace l'entrée de la visionneuse (ou s'ajoute au-dessus de la bibliothèque depuis son en-tête) : quitter le cadre ramène une seule visionneuse, et le retour arrière la bibliothèque. Le lien « Cadre » de la barre ajoute une entrée d'historique ordinaire : c'est aussi l'adresse qu'un cadre ouvre au démarrage.
 
diff --git a/README.md b/README.md
index e9e63bf..18cb496 100644
--- a/README.md
+++ b/README.md
@@ -67,7 +67,7 @@ Inviter un proche : connecté en admin, ouvrir « Invitations » depuis la bibli
 
 Ajouter un ami : ouvrir « Amis » depuis la bibliothèque et saisir l'adresse e-mail exacte de son compte FamilyFrame (la personne doit déjà avoir un compte : sinon, demander une invitation à l'admin). Elle voit la demande sous « Demandes reçues » et l'accepte ou la refuse ; une fois acceptée, chacun peut retirer l'autre. Les listes ne se mettent pas à jour toutes seules : recharger la page pour voir la réponse de l'autre.
 
-Envoyer une photo à un ami : dans la bibliothèque ou sur le cadre, le menu « … » d'une photo propose « Envoyer à un ami » ; dans la carte d'envoi, choisir un fichier puis « Envoyer à un ami » plutôt que « Ajouter à ma bibliothèque ». Le panneau « Envoyer à des proches » montre les amis acceptés : toucher ceux qui doivent la recevoir, puis « Envoyer à N personnes » ; une notification confirme à qui elle est partie. Un message facultatif (200 caractères au plus) peut l'accompagner. La photo n'entre que chez l'ami, comme une lettre non ouverte : sa bibliothèque annonce « Vous avez 1 nouvelle photo », et « Découvrir » la montre en grand avec « Envoyée par », votre nom et votre message, avant qu'elle rejoigne sa bibliothèque et son cadre. Le cadre affiche la même annonce en haut de l'écran et lance la découverte d'un toucher. Chacun supprime ses photos de son côté : retirer l'ami ou supprimer l'original ne retire pas la photo reçue.
+Envoyer une photo à un ami : dans la bibliothèque ou sur le cadre, le menu « … » d'une photo propose « Envoyer à un ami » ; dans le panneau « Ajouter » de la bibliothèque, choisir un fichier puis « Envoyer à un ami » plutôt que « Ajouter à ma bibliothèque ». Le panneau « Envoyer à des proches » montre les amis acceptés : toucher ceux qui doivent la recevoir, puis « Envoyer à N personnes » ; une notification confirme à qui elle est partie. Un message facultatif (200 caractères au plus) peut l'accompagner. La photo n'entre que chez l'ami, comme une lettre non ouverte : sa bibliothèque annonce « Vous avez 1 nouvelle photo », et « Découvrir » la montre en grand avec « Envoyée par », votre nom et votre message, avant qu'elle rejoigne sa bibliothèque et son cadre. Le cadre affiche la même annonce en haut de l'écran et lance la découverte d'un toucher. Chacun supprime ses photos de son côté : retirer l'ami ou supprimer l'original ne retire pas la photo reçue.
 
 Modifier son compte : « Préférences », dans le menu du compte (l'avatar en haut à droite, ou ☰ sur mobile). Chaque carte de compte a son « Enregistrer » : photo de profil (JPEG, PNG ou WebP, recadrée en carré), nom affiché et mot de passe ; la carte « Cadre de cet appareil » s'applique dès qu'on choisit. L'adresse e-mail ne se modifie pas encore. Changer de mot de passe déconnecte les autres appareils du compte : le cadre revient à la page de connexion à son prochain rechargement des photos (au plus tard le lendemain) ou à sa prochaine reconnexion ; s'y reconnecter avec le nouveau mot de passe.
 
diff --git a/client/src/components/frame/LayoutToggle.tsx b/client/src/components/frame/LayoutToggle.tsx
index 398ca59..c70c4d2 100644
--- a/client/src/components/frame/LayoutToggle.tsx
+++ b/client/src/components/frame/LayoutToggle.tsx
@@ -15,6 +15,8 @@ export function LayoutToggle({ layout, onLayoutChange }: LayoutToggleProps): JSX
       variant="outline"
       size="lg"
       spacing={0}
+      // Each item 44 px under a finger, the size touch guidelines ask for.
+      className="*:pointer-coarse:size-11"
       value={layout}
       // Radix sends '' when the pressed item is clicked again: keep the current layout.
       onValueChange={(value) => {
diff --git a/client/src/components/library/AddPhotoPanel.tsx b/client/src/components/library/AddPhotoPanel.tsx
new file mode 100644
index 0000000..39119a4
--- /dev/null
+++ b/client/src/components/library/AddPhotoPanel.tsx
@@ -0,0 +1,54 @@
+import { type JSX, useState } from 'react'
+import { UploadForm } from '@/components/library/UploadForm.tsx'
+import { ResponsivePanel } from '@/components/panel/ResponsivePanel.tsx'
+import { ShareSheet } from '@/components/sharing/ShareSheet.tsx'
+import { DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx'
+import type { Photo } from '@/photo.ts'
+
+type AddPhotoPanelProps = {
+  isOpen: boolean
+  onClose: () => void
+  onUploaded: (photo: Photo) => void
+}
+
+function AddPhotoHeading(): JSX.Element {
+  return (
+    // pr-10 keeps the text clear of the ✕ in the corner.
+    <div className="flex flex-col gap-1 pr-10">
+      <DialogTitle>Ajouter une photo</DialogTitle>
+      <DialogDescription>
+        Ajoutez-la à votre bibliothèque ou envoyez-la directement à un ami.
+      </DialogDescription>
+    </div>
+  )
+}
+
+// « Envoyer à un ami » swaps this panel for the send panel, which keeps its own copy of the file.
+export function AddPhotoPanel({ isOpen, onClose, onUploaded }: AddPhotoPanelProps): JSX.Element {
+  const [fileToShare, setFileToShare] = useState<File | null>(null)
+
+  function handleUploaded(photo: Photo): void {
+    onUploaded(photo)
+    onClose()
+  }
+
+  function handleShare(file: File): void {
+    onClose()
+    setFileToShare(file)
+  }
+
+  return (
+    <>
+      {isOpen && (
+        <ResponsivePanel onClose={onClose}>
+          <AddPhotoHeading />
+          <UploadForm onUploaded={handleUploaded} onShare={handleShare} />
+        </ResponsivePanel>
+      )}
+      <ShareSheet
+        target={fileToShare ? { kind: 'device', file: fileToShare } : null}
+        onClose={() => setFileToShare(null)}
+      />
+    </>
+  )
+}
diff --git a/client/src/components/library/FriendsCallToAction.tsx b/client/src/components/library/FriendsCallToAction.tsx
deleted file mode 100644
index 7ead388..0000000
--- a/client/src/components/library/FriendsCallToAction.tsx
+++ /dev/null
@@ -1,35 +0,0 @@
-import { UserPlusIcon, UsersIcon } from 'lucide-react'
-import type { JSX } from 'react'
-import { Link } from 'react-router'
-import { useAuth } from '@/auth/AuthContext.ts'
-import { Button } from '@/components/ui/button.tsx'
-import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
-
-export function FriendsCallToAction(): JSX.Element {
-  const { user } = useAuth()
-
-  return (
-    <Card className="w-full">
-      <CardHeader>
-        <CardTitle className="text-xl">Vos proches</CardTitle>
-        <CardDescription>Ajoutez vos proches en amis pour leur envoyer des photos.</CardDescription>
-      </CardHeader>
-      <CardContent className="flex flex-wrap gap-2">
-        <Button asChild>
-          <Link to="/friends">
-            <UsersIcon aria-hidden data-icon="inline-start" />
-            Gérer mes amis
-          </Link>
-        </Button>
-        {user?.role === 'admin' && (
-          <Button asChild variant="outline">
-            <Link to="/admin/invitations">
-              <UserPlusIcon aria-hidden data-icon="inline-start" />
-              Inviter un proche sur FamilyFrame
-            </Link>
-          </Button>
-        )}
-      </CardContent>
-    </Card>
-  )
-}
diff --git a/client/src/components/library/LibraryHeader.tsx b/client/src/components/library/LibraryHeader.tsx
new file mode 100644
index 0000000..3f5e365
--- /dev/null
+++ b/client/src/components/library/LibraryHeader.tsx
@@ -0,0 +1,61 @@
+import { PlayIcon, PlusIcon } from 'lucide-react'
+import type { JSX } from 'react'
+import { Link } from 'react-router'
+import { LayoutToggle } from '@/components/frame/LayoutToggle.tsx'
+import { libraryCountLabel } from '@/components/library/libraryTexts.ts'
+import { Button } from '@/components/ui/button.tsx'
+import { enterFullscreen } from '@/fullscreen.ts'
+import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'
+import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
+import { LIBRARY_BELOW_STATE } from '@/viewerHistory.ts'
+
+type LibraryHeaderProps = {
+  library: PhotoLibrary
+  layout: LibraryLayout
+  onLayoutChange: (layout: LibraryLayout) => void
+  onAdd: () => void
+}
+
+function FrameModeButton(): JSX.Element {
+  return (
+    <Button
+      asChild
+      size="lg"
+      className="rounded-full bg-frame-accent px-4 text-black hover:bg-frame-accent/85 pointer-coarse:h-11"
+    >
+      {/* The state: leaving the frame comes back to this library entry. Full screen is asked on
+          the click itself: browsers grant it only during a user gesture. */}
+      <Link to="/frame" state={LIBRARY_BELOW_STATE} onClick={enterFullscreen}>
+        <PlayIcon data-icon="inline-start" />
+        Mode cadre
+      </Link>
+    </Button>
+  )
+}
+
+export function LibraryHeader({
+  library,
+  layout,
+  onLayoutChange,
+  onAdd,
+}: LibraryHeaderProps): JSX.Element {
+  return (
+    // Wraps on a phone: the actions go under the title there.
+    <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
+      <div className="flex min-w-0 flex-col">
+        <h1 className="text-2xl font-semibold tracking-tight">Bibliothèque</h1>
+        <p className="min-h-5 text-sm text-muted-foreground">
+          {library.isFirstPageLoaded && libraryCountLabel(library.photos.length, library.hasMore)}
+        </p>
+      </div>
+      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
+        <Button size="lg" className="pointer-coarse:h-11" onClick={onAdd}>
+          <PlusIcon aria-hidden data-icon="inline-start" />
+          Ajouter
+        </Button>
+        <FrameModeButton />
+        <LayoutToggle layout={layout} onLayoutChange={onLayoutChange} />
+      </div>
+    </header>
+  )
+}
diff --git a/client/src/components/library/LibrarySection.tsx b/client/src/components/library/LibrarySection.tsx
index 27bc7f5..168b8e3 100644
--- a/client/src/components/library/LibrarySection.tsx
+++ b/client/src/components/library/LibrarySection.tsx
@@ -1,95 +1,67 @@
-import { PlayIcon } from 'lucide-react'
+import { ImagePlusIcon } from 'lucide-react'
 import type { JSX } from 'react'
-import { Link } from 'react-router'
-import { LayoutToggle } from '@/components/frame/LayoutToggle.tsx'
 import { PhotoGrid } from '@/components/frame/PhotoGrid.tsx'
 import { PhotoList } from '@/components/frame/PhotoList.tsx'
 import { Button } from '@/components/ui/button.tsx'
-import { enterFullscreen } from '@/fullscreen.ts'
 import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'
-import { useLibraryLayout } from '@/hooks/useLibraryLayout.ts'
 import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
-import type { Photo } from '@/photo.ts'
-import { LIBRARY_BELOW_STATE } from '@/viewerHistory.ts'
 
 type LibrarySectionProps = {
   library: PhotoLibrary
-  onOpenPhoto: (id: string) => void
-}
-
-type LibraryPhotosProps = {
-  photos: Photo[]
-  layout: LibraryLayout
-  onSelect: (id: string) => void
-}
-
-type LibraryHeaderProps = {
   layout: LibraryLayout
-  onLayoutChange: (layout: LibraryLayout) => void
+  onOpenPhoto: (id: string) => void
+  onAdd: () => void
 }
 
 type LoadMoreButtonProps = Pick<PhotoLibrary, 'isLoadingMore' | 'loadMore'>
 
-function LibraryPhotos({ photos, layout, onSelect }: LibraryPhotosProps): JSX.Element {
-  if (photos.length === 0) {
-    return <p className="px-8 py-10 text-muted-foreground">Aucune photo pour l'instant.</p>
-  }
-  // currentId null: no photo is on screen here, so no tile gets the frame's ring.
-  return layout === 'grid' ? (
-    <PhotoGrid photos={photos} currentId={null} onSelect={onSelect} />
-  ) : (
-    <PhotoList photos={photos} currentId={null} onSelect={onSelect} />
-  )
-}
-
-function LibrarySectionHeader({ layout, onLayoutChange }: LibraryHeaderProps): JSX.Element {
+function EmptyLibrary({ onAdd }: { onAdd: () => void }): JSX.Element {
   return (
-    // Wraps on a phone: the title, the pill and the toggle do not fit on one line there.
-    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 px-8 pt-6">
-      <h2 id="library-title" className="text-xl font-medium tracking-tight">
-        Ma bibliothèque
-      </h2>
-      <div className="ml-auto flex items-center gap-2">
-        <Button
-          asChild
-          size="lg"
-          className="rounded-full bg-frame-accent px-4 text-black hover:bg-frame-accent/85"
-        >
-          {/* The state: leaving the frame comes back to this library entry. Full screen is asked
-              on the click itself: browsers grant it only during a user gesture. */}
-          <Link to="/frame" state={LIBRARY_BELOW_STATE} onClick={enterFullscreen}>
-            <PlayIcon data-icon="inline-start" />
-            Mode cadre
-          </Link>
-        </Button>
-        <LayoutToggle layout={layout} onLayoutChange={onLayoutChange} />
-      </div>
-    </header>
+    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
+      <p className="text-muted-foreground">Aucune photo pour l'instant.</p>
+      <Button size="lg" className="pointer-coarse:h-11" onClick={onAdd}>
+        <ImagePlusIcon aria-hidden data-icon="inline-start" />
+        Ajouter une photo
+      </Button>
+    </div>
   )
 }
 
 function LoadMoreButton({ isLoadingMore, loadMore }: LoadMoreButtonProps): JSX.Element {
   return (
-    <div className="flex justify-center px-8 pb-8">
-      <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
+    <div className="flex justify-center px-4 pb-6 sm:px-8 sm:pb-8">
+      <Button
+        variant="outline"
+        className="pointer-coarse:h-11"
+        onClick={loadMore}
+        disabled={isLoadingMore}
+      >
         {isLoadingMore ? 'Chargement…' : 'Charger plus'}
       </Button>
     </div>
   )
 }
 
-export function LibrarySection({ library, onOpenPhoto }: LibrarySectionProps): JSX.Element {
-  const [layout, setLayout] = useLibraryLayout()
-  const { photos, hasMore, isLoadingMore, loadMore } = library
+function LibraryPhotos({ library, layout, onOpenPhoto, onAdd }: LibrarySectionProps): JSX.Element {
+  if (!library.isFirstPageLoaded) {
+    return <p className="px-6 py-16 text-center text-muted-foreground">Chargement…</p>
+  }
+  if (library.photos.length === 0) return <EmptyLibrary onAdd={onAdd} />
+  // currentId null: no photo is on screen here, so no tile gets the frame's ring.
+  return layout === 'grid' ? (
+    <PhotoGrid photos={library.photos} currentId={null} onSelect={onOpenPhoto} />
+  ) : (
+    <PhotoList photos={library.photos} currentId={null} onSelect={onOpenPhoto} />
+  )
+}
+
+export function LibrarySection(props: LibrarySectionProps): JSX.Element {
+  const { hasMore, isLoadingMore, loadMore } = props.library
 
   return (
     // `dark` and the frame background: the frame's components look as designed.
-    <section
-      aria-labelledby="library-title"
-      className="dark rounded-2xl bg-frame-background text-foreground"
-    >
-      <LibrarySectionHeader layout={layout} onLayoutChange={setLayout} />
-      <LibraryPhotos photos={photos} layout={layout} onSelect={onOpenPhoto} />
+    <section aria-label="Photos" className="dark rounded-2xl bg-frame-background text-foreground">
+      <LibraryPhotos {...props} />
       {hasMore && <LoadMoreButton isLoadingMore={isLoadingMore} loadMore={loadMore} />}
     </section>
   )
diff --git a/client/src/components/library/UploadForm.tsx b/client/src/components/library/UploadForm.tsx
index 5d32a90..d53e110 100644
--- a/client/src/components/library/UploadForm.tsx
+++ b/client/src/components/library/UploadForm.tsx
@@ -1,12 +1,9 @@
-import { SendIcon } from 'lucide-react'
-import { type ChangeEvent, type JSX, type SubmitEvent, useState } from 'react'
+import { CameraIcon, ImageIcon, SendIcon } from 'lucide-react'
+import { type ChangeEvent, type JSX, type SubmitEvent, useRef, useState } from 'react'
 import { toast } from 'sonner'
 import { useAuth } from '@/auth/AuthContext.ts'
-import { ShareSheet } from '@/components/sharing/ShareSheet.tsx'
 import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
 import { Button } from '@/components/ui/button.tsx'
-import { Input } from '@/components/ui/input.tsx'
-import { Label } from '@/components/ui/label.tsx'
 import { usePreviewUrl } from '@/hooks/usePreviewUrl.ts'
 import type { Photo } from '@/photo.ts'
 import { postPhoto } from '@/photosApi.ts'
@@ -19,36 +16,23 @@ type UploadStatus = 'idle' | 'sending' | 'error'
 type PhotoUpload = {
   status: UploadStatus
   error: string
-  // true when the photo was saved: the form then empties its inputs.
-  send: (file: File) => Promise<boolean>
+  send: (file: File) => Promise<void>
   clearStatus: () => void
 }
 
 type UploadFormProps = {
   onUploaded: (photo: Photo) => void
+  // The file goes to a friend only: the own library does not change.
+  onShare: (file: File) => void
 }
 
-type FileFieldProps = {
-  id: string
+type PickButtonProps = {
   label: string
+  icon: JSX.Element
   capture?: 'environment'
   onChange: (event: ChangeEvent<HTMLInputElement>) => void
 }
 
-type FileFieldsProps = {
-  inputsKey: number
-  onChange: (event: ChangeEvent<HTMLInputElement>) => void
-}
-
-type UploadFormState = {
-  upload: PhotoUpload
-  file: File | null
-  inputsKey: number
-  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void
-  handleSubmit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>
-  clearFile: () => void
-}
-
 type UploadButtonsProps = {
   hasFile: boolean
   isSending: boolean
@@ -60,99 +44,88 @@ function usePhotoUpload(onUploaded: (photo: Photo) => void): PhotoUpload {
   const [status, setStatus] = useState<UploadStatus>('idle')
   const [error, setError] = useState('')
 
-  async function send(file: File): Promise<boolean> {
+  async function send(file: File): Promise<void> {
     setStatus('sending')
     const result = await postPhoto(file)
     // The session ended on the server: RequireAuth sends the user to /login.
     if (result.status === 'unauthenticated') {
       dropUser()
-      return false
+      return
     }
     if (result.status === 'failed') {
       setError(result.message)
       setStatus('error')
-      return false
+      return
     }
-    onUploaded(result.photo)
-    // A toast, not an alert: the form empties, and the message must not outstay the photo.
+    // A toast, not an alert: the panel closes, and the message must outlast it.
     toast.success('Photo ajoutée à votre bibliothèque.')
-    setStatus('idle')
-    return true
+    onUploaded(result.photo)
   }
 
   return { status, error, send, clearStatus: () => setStatus('idle') }
 }
 
-function useUploadForm(onUploaded: (photo: Photo) => void): UploadFormState {
-  const upload = usePhotoUpload(onUploaded)
-  const [file, setFile] = useState<File | null>(null)
-  // A new key remounts the file inputs, which empties them.
-  const [inputsKey, setInputsKey] = useState(0)
-
-  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
-    setFile(event.target.files?.[0] ?? null)
-    upload.clearStatus()
-  }
-
-  function clearFile(): void {
-    setFile(null)
-    setInputsKey((key) => key + 1)
-  }
-
-  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
-    event.preventDefault()
-    if (!file) return
-    if (await upload.send(file)) clearFile()
-  }
-
-  return { upload, file, inputsKey, handleFileChange, handleSubmit, clearFile }
-}
-
-function FileField({ id, label, capture, onChange }: FileFieldProps): JSX.Element {
+// A button rather than the raw file input: the browser's « Choose file » cannot be styled or
+// translated. The hidden input does the picking.
+function PickButton({ label, icon, capture, onChange }: PickButtonProps): JSX.Element {
+  const inputRef = useRef<HTMLInputElement>(null)
   return (
-    <div className="flex flex-col gap-2">
-      <Label htmlFor={id}>{label}</Label>
-      <Input
-        id={id}
+    <>
+      <Button
+        type="button"
+        variant="outline"
+        className="h-20 flex-col gap-2 whitespace-normal"
+        onClick={() => inputRef.current?.click()}
+      >
+        {icon}
+        {label}
+      </Button>
+      <input
+        ref={inputRef}
         type="file"
         accept={ACCEPTED_IMAGE_TYPES}
         capture={capture}
+        className="hidden"
         onChange={onChange}
       />
-    </div>
+    </>
   )
 }
 
-function FileFields({ inputsKey, onChange }: FileFieldsProps): JSX.Element {
+function PickButtons({ onChange }: Pick<PickButtonProps, 'onChange'>): JSX.Element {
   return (
-    <>
-      <FileField
-        key={`camera-${inputsKey}`}
-        id="camera-photo"
+    <div className="grid grid-cols-2 gap-2">
+      <PickButton
         label="Prendre une photo"
+        icon={<CameraIcon aria-hidden className="size-6" />}
         capture="environment"
         onChange={onChange}
       />
-      <FileField
-        key={`gallery-${inputsKey}`}
-        id="gallery-photo"
+      <PickButton
         label="Choisir une image"
+        icon={<ImageIcon aria-hidden className="size-6" />}
         onChange={onChange}
       />
-    </>
+    </div>
   )
 }
 
 function UploadButtons({ hasFile, isSending, onShare }: UploadButtonsProps): JSX.Element {
   return (
     <div className="flex flex-col gap-2">
-      <Button type="submit" size="lg" disabled={!hasFile || isSending}>
+      <Button
+        type="submit"
+        size="lg"
+        className="pointer-coarse:h-11"
+        disabled={!hasFile || isSending}
+      >
         {isSending ? 'Envoi…' : 'Ajouter à ma bibliothèque'}
       </Button>
       <Button
         type="button"
         variant="outline"
         size="lg"
+        className="pointer-coarse:h-11"
         disabled={!hasFile || isSending}
         onClick={onShare}
       >
@@ -177,37 +150,37 @@ function FilePreview({ file }: { file: File | null }): JSX.Element | null {
   if (!previewUrl) return null
   return (
     <img
-      className="max-h-[40vh] w-full rounded-lg object-contain"
+      className="max-h-[35svh] w-full rounded-lg object-contain"
       src={previewUrl}
       alt="Aperçu avant envoi"
     />
   )
 }
 
-export function UploadForm({ onUploaded }: UploadFormProps): JSX.Element {
-  const { upload, file, inputsKey, handleFileChange, handleSubmit, clearFile } =
-    useUploadForm(onUploaded)
-  // The sheet keeps its own file: emptying the form's inputs must not pull the photo from under it.
-  const [fileToShare, setFileToShare] = useState<File | null>(null)
+export function UploadForm({ onUploaded, onShare }: UploadFormProps): JSX.Element {
+  const upload = usePhotoUpload(onUploaded)
+  const [file, setFile] = useState<File | null>(null)
+
+  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
+    setFile(event.target.files?.[0] ?? null)
+    upload.clearStatus()
+  }
+
+  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
+    event.preventDefault()
+    if (file) await upload.send(file)
+  }
 
   return (
-    <>
-      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
-        <FileFields inputsKey={inputsKey} onChange={handleFileChange} />
-        <FilePreview file={file} />
-        <UploadButtons
-          hasFile={file !== null}
-          isSending={upload.status === 'sending'}
-          onShare={() => setFileToShare(file)}
-        />
-        <UploadAlert status={upload.status} error={upload.error} />
-      </form>
-      {/* The file goes to the friend only: the own library does not change. */}
-      <ShareSheet
-        target={fileToShare ? { kind: 'device', file: fileToShare } : null}
-        onClose={() => setFileToShare(null)}
-        onShared={clearFile}
+    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
+      <PickButtons onChange={handleFileChange} />
+      <FilePreview file={file} />
+      <UploadButtons
+        hasFile={file !== null}
+        isSending={upload.status === 'sending'}
+        onShare={() => file && onShare(file)}
       />
-    </>
+      <UploadAlert status={upload.status} error={upload.error} />
+    </form>
   )
 }
diff --git a/client/src/components/library/libraryTexts.ts b/client/src/components/library/libraryTexts.ts
new file mode 100644
index 0000000..960d04c
--- /dev/null
+++ b/client/src/components/library/libraryTexts.ts
@@ -0,0 +1,6 @@
+// The API sends no total: « Plus de 30 photos » while older pages are not loaded yet.
+export function libraryCountLabel(loadedCount: number, hasMore: boolean): string {
+  if (hasMore) return `Plus de ${loadedCount} photos`
+  if (loadedCount === 0) return 'Aucune photo'
+  return loadedCount === 1 ? '1 photo' : `${loadedCount} photos`
+}
diff --git a/client/src/components/mail/MailAnnouncementCard.tsx b/client/src/components/mail/MailAnnouncementCard.tsx
index 6141feb..63bd7fb 100644
--- a/client/src/components/mail/MailAnnouncementCard.tsx
+++ b/client/src/components/mail/MailAnnouncementCard.tsx
@@ -2,7 +2,6 @@ import { MailIcon } from 'lucide-react'
 import type { JSX } from 'react'
 import { sendersLabel, waitingPhotosLabel } from '@/components/mail/mailTexts.ts'
 import { Button } from '@/components/ui/button.tsx'
-import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
 import type { Photo } from '@/photo.ts'
 
 type MailAnnouncementCardProps = {
@@ -11,24 +10,26 @@ type MailAnnouncementCardProps = {
   onDiscover: () => void
 }
 
+// One line above the photos: the news shows without pushing the library down.
 export function MailAnnouncementCard({
   photos,
   onDiscover,
 }: MailAnnouncementCardProps): JSX.Element {
   return (
-    <Card className="w-full border-frame-accent/60">
-      <CardHeader>
-        <CardTitle className="flex items-center gap-2 text-xl">
-          <MailIcon aria-hidden className="size-5 text-frame-accent" />
-          {waitingPhotosLabel(photos.length)}
-        </CardTitle>
-        <CardDescription>{sendersLabel([...photos].reverse())}</CardDescription>
-      </CardHeader>
-      <CardContent>
-        <Button size="lg" onClick={onDiscover}>
-          Découvrir
-        </Button>
-      </CardContent>
-    </Card>
+    <section
+      aria-label="Photos reçues"
+      className="flex items-center gap-3 rounded-xl border border-frame-accent/60 bg-card px-4 py-3 text-card-foreground"
+    >
+      <MailIcon aria-hidden className="size-5 shrink-0 text-frame-accent" />
+      <div className="flex min-w-0 flex-1 flex-col">
+        <p className="font-medium">{waitingPhotosLabel(photos.length)}</p>
+        <p className="truncate text-sm text-muted-foreground">
+          {sendersLabel([...photos].reverse())}
+        </p>
+      </div>
+      <Button className="pointer-coarse:h-11" onClick={onDiscover}>
+        Découvrir
+      </Button>
+    </section>
   )
 }
diff --git a/client/src/components/panel/ResponsivePanel.tsx b/client/src/components/panel/ResponsivePanel.tsx
new file mode 100644
index 0000000..c325c20
--- /dev/null
+++ b/client/src/components/panel/ResponsivePanel.tsx
@@ -0,0 +1,63 @@
+import type { JSX, ReactNode } from 'react'
+import { Dialog, DialogContent } from '@/components/ui/dialog.tsx'
+import { Sheet, SheetContent } from '@/components/ui/sheet.tsx'
+import { useMediaQuery } from '@/hooks/useMediaQuery.ts'
+import { cn } from '@/lib/utils.ts'
+
+// Tailwind's md breakpoint, where the page layout switches too.
+const DESKTOP_QUERY = '(min-width: 48rem)'
+
+type ResponsivePanelProps = {
+  onClose: () => void
+  onCloseAutoFocus?: (event: Event) => void
+  className?: string
+  // Sheet and Dialog are the same Radix dialog underneath: a DialogTitle serves both.
+  children: ReactNode
+}
+
+function DesktopDialog({
+  onClose,
+  onCloseAutoFocus,
+  className,
+  children,
+}: ResponsivePanelProps): JSX.Element {
+  return (
+    <Dialog open onOpenChange={onClose}>
+      <DialogContent className={cn('sm:max-w-md', className)} onCloseAutoFocus={onCloseAutoFocus}>
+        {children}
+      </DialogContent>
+    </Dialog>
+  )
+}
+
+// A phone gets the sheet from the bottom, under the thumb.
+function PhoneSheet({
+  onClose,
+  onCloseAutoFocus,
+  className,
+  children,
+}: ResponsivePanelProps): JSX.Element {
+  return (
+    <Sheet open onOpenChange={onClose}>
+      <SheetContent
+        side="bottom"
+        // bg-popover matches the ring offset of the friend avatars, as in the dialog.
+        className={cn(
+          'max-h-[90svh] rounded-t-2xl bg-popover px-4 pt-4 pb-6 text-popover-foreground',
+          className,
+        )}
+        onCloseAutoFocus={onCloseAutoFocus}
+        // Focusing a text field would raise the keyboard over the panel.
+        onOpenAutoFocus={(event) => event.preventDefault()}
+      >
+        {children}
+      </SheetContent>
+    </Sheet>
+  )
+}
+
+// Open while mounted: the caller renders it only when it should show.
+export function ResponsivePanel(props: ResponsivePanelProps): JSX.Element {
+  const isDesktop = useMediaQuery(DESKTOP_QUERY)
+  return isDesktop ? <DesktopDialog {...props} /> : <PhoneSheet {...props} />
+}
diff --git a/client/src/components/sharing/ShareSheet.tsx b/client/src/components/sharing/ShareSheet.tsx
index ba51f02..2952641 100644
--- a/client/src/components/sharing/ShareSheet.tsx
+++ b/client/src/components/sharing/ShareSheet.tsx
@@ -1,34 +1,23 @@
-import type { JSX, ReactNode } from 'react'
+import type { JSX } from 'react'
+import { ResponsivePanel } from '@/components/panel/ResponsivePanel.tsx'
 import { ShareFriendsForm } from '@/components/sharing/ShareFriendsForm.tsx'
-import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx'
-import { Sheet, SheetContent } from '@/components/ui/sheet.tsx'
-import { useMediaQuery } from '@/hooks/useMediaQuery.ts'
+import { DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx'
 import { usePreviewUrl } from '@/hooks/usePreviewUrl.ts'
 import type { ShareTarget } from '@/hooks/useShareSending.ts'
-import { cn } from '@/lib/utils.ts'
 import { photoLabel } from '@/photoLabel.ts'
 
-// Tailwind's md breakpoint, where the page layout switches too.
-const DESKTOP_QUERY = '(min-width: 48rem)'
-
 type ShareSheetProps = {
   // Picked when the sheet opened: the slideshow may move on while it stays open.
   target: ShareTarget | null
   onClose: () => void
-  // The upload form empties its inputs once the photo is sent.
-  onShared?: () => void
   onCloseAutoFocus?: (event: Event) => void
   className?: string
 }
 
-type ShareBodyProps = Pick<ShareSheetProps, 'onShared' | 'onClose'> & {
+type ShareBodyProps = Pick<ShareSheetProps, 'onClose'> & {
   target: ShareTarget
 }
 
-type ShellProps = Pick<ShareSheetProps, 'onClose' | 'onCloseAutoFocus' | 'className'> & {
-  children: ReactNode
-}
-
 function ShareThumbnail({ target }: { target: ShareTarget }): JSX.Element | null {
   const fileUrl = usePreviewUrl(target.kind === 'device' ? target.file : null)
   const src = target.kind === 'library' ? target.photo.thumbnailUrl : fileUrl
@@ -37,12 +26,7 @@ function ShareThumbnail({ target }: { target: ShareTarget }): JSX.Element | null
   return <img className="size-14 shrink-0 rounded-lg object-cover" src={src} alt={alt} />
 }
 
-// Sheet and Dialog are the same Radix dialog underneath: one title and description serve both.
-function ShareBody({ target, onShared, onClose }: ShareBodyProps): JSX.Element {
-  function closeAfterSending(): void {
-    onShared?.()
-    onClose()
-  }
+function ShareBody({ target, onClose }: ShareBodyProps): JSX.Element {
   return (
     <>
       {/* pr-10 keeps the text clear of the ✕ in the corner. */}
@@ -55,60 +39,21 @@ function ShareBody({ target, onShared, onClose }: ShareBodyProps): JSX.Element {
           </DialogDescription>
         </div>
       </div>
-      <ShareFriendsForm target={target} onSent={closeAfterSending} />
+      <ShareFriendsForm target={target} onSent={onClose} />
     </>
   )
 }
 
-function DesktopDialog({
-  onClose,
-  onCloseAutoFocus,
-  className,
-  children,
-}: ShellProps): JSX.Element {
-  return (
-    <Dialog open onOpenChange={onClose}>
-      <DialogContent className={cn('sm:max-w-md', className)} onCloseAutoFocus={onCloseAutoFocus}>
-        {children}
-      </DialogContent>
-    </Dialog>
-  )
-}
-
-// A phone gets the sheet from the bottom, under the thumb.
-function PhoneSheet({ onClose, onCloseAutoFocus, className, children }: ShellProps): JSX.Element {
-  return (
-    <Sheet open onOpenChange={onClose}>
-      <SheetContent
-        side="bottom"
-        // bg-popover matches the ring offset of the friend avatars, as in the dialog.
-        className={cn(
-          'max-h-[90svh] rounded-t-2xl bg-popover px-4 pt-4 pb-6 text-popover-foreground',
-          className,
-        )}
-        onCloseAutoFocus={onCloseAutoFocus}
-        // Focusing the search field would raise the keyboard over the friend grid.
-        onOpenAutoFocus={(event) => event.preventDefault()}
-      >
-        {children}
-      </SheetContent>
-    </Sheet>
-  )
-}
-
 export function ShareSheet({
   target,
   onClose,
-  onShared,
   onCloseAutoFocus,
   className,
 }: ShareSheetProps): JSX.Element | null {
-  const isDesktop = useMediaQuery(DESKTOP_QUERY)
   if (!target) return null
-  const Shell = isDesktop ? DesktopDialog : PhoneSheet
   return (
-    <Shell onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} className={className}>
-      <ShareBody target={target} onShared={onShared} onClose={onClose} />
-    </Shell>
+    <ResponsivePanel onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} className={className}>
+      <ShareBody target={target} onClose={onClose} />
+    </ResponsivePanel>
   )
 }
diff --git a/client/src/pages/LibraryPage.tsx b/client/src/pages/LibraryPage.tsx
index dd4f8c2..986e4db 100644
--- a/client/src/pages/LibraryPage.tsx
+++ b/client/src/pages/LibraryPage.tsx
@@ -1,41 +1,70 @@
-import type { JSX } from 'react'
+import { type JSX, useState } from 'react'
 import { CollectionsCard } from '@/components/collections/CollectionsCard.tsx'
-import { FriendsCallToAction } from '@/components/library/FriendsCallToAction.tsx'
+import { AddPhotoPanel } from '@/components/library/AddPhotoPanel.tsx'
+import { LibraryHeader } from '@/components/library/LibraryHeader.tsx'
 import { LibrarySection } from '@/components/library/LibrarySection.tsx'
-import { UploadForm } from '@/components/library/UploadForm.tsx'
 import { LibraryMail } from '@/components/mail/LibraryMail.tsx'
-import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
 import { PhotoViewer } from '@/components/viewer/PhotoViewer.tsx'
-import { usePhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
-import { useViewerParam } from '@/hooks/useViewerParam.ts'
+import { useLibraryLayout } from '@/hooks/useLibraryLayout.ts'
+import { type PhotoLibrary, usePhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
+import { useViewerParam, type ViewerParam } from '@/hooks/useViewerParam.ts'
 
-export default function LibraryPage(): JSX.Element {
-  const library = usePhotoLibrary()
-  const viewer = useViewerParam()
+type LibraryOverlaysProps = {
+  library: PhotoLibrary
+  viewer: ViewerParam
+  isAdding: boolean
+  onAddClose: () => void
+}
 
+function LibraryOverlays({
+  library,
+  viewer,
+  isAdding,
+  onAddClose,
+}: LibraryOverlaysProps): JSX.Element {
   return (
-    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
-      {/* First on the page: news from the family comes before adding one's own photos. */}
-      <LibraryMail />
-      <div className="grid gap-6 md:grid-cols-2">
-        <Card className="w-full">
-          <CardHeader>
-            <CardTitle className="text-xl">Ajouter une photo</CardTitle>
-            <CardDescription>
-              Ajoutez-la à votre bibliothèque ou envoyez-la directement à un ami.
-            </CardDescription>
-          </CardHeader>
-          <CardContent>
-            <UploadForm onUploaded={library.addPhoto} />
-          </CardContent>
-        </Card>
-        <FriendsCallToAction />
-      </div>
-      <CollectionsCard />
-      <LibrarySection library={library} onOpenPhoto={viewer.open} />
+    <>
+      <AddPhotoPanel isOpen={isAdding} onClose={onAddClose} onUploaded={library.addPhoto} />
       {viewer.openId !== null && (
         <PhotoViewer library={library} openId={viewer.openId} viewer={viewer} />
       )}
+    </>
+  )
+}
+
+type LibraryContentProps = {
+  library: PhotoLibrary
+  viewer: ViewerParam
+  onAdd: () => void
+}
+
+function LibraryContent({ library, viewer, onAdd }: LibraryContentProps): JSX.Element {
+  const [layout, setLayout] = useLibraryLayout()
+  return (
+    <>
+      <LibraryHeader library={library} layout={layout} onLayoutChange={setLayout} onAdd={onAdd} />
+      {/* Above the photos: news from the family comes first. */}
+      <LibraryMail />
+      <CollectionsCard />
+      <LibrarySection library={library} layout={layout} onOpenPhoto={viewer.open} onAdd={onAdd} />
+    </>
+  )
+}
+
+export default function LibraryPage(): JSX.Element {
+  const library = usePhotoLibrary()
+  const viewer = useViewerParam()
+  const [isAdding, setIsAdding] = useState(false)
+
+  return (
+    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:py-10">
+      <LibraryContent library={library} viewer={viewer} onAdd={() => setIsAdding(true)} />
+      <LibraryOverlays
+        library={library}
+        viewer={viewer}
+        isAdding={isAdding}
+        onAddClose={() => setIsAdding(false)}
+      />
     </main>
   )
 }
diff --git a/docs/produit/amis.md b/docs/produit/amis.md
index 9a83bc3..65044d6 100644
--- a/docs/produit/amis.md
+++ b/docs/produit/amis.md
@@ -6,7 +6,7 @@ Deux membres deviennent amis quand l'un envoie une demande et que l'autre l'acce
 
 **Ce que l'on peut faire**
 
-- Ouvrir la page « Amis » depuis la barre du haut ou depuis la bibliothèque (bouton « Gérer mes amis »).
+- Ouvrir la page « Amis » depuis la barre du haut, ou le menu ☰ sur un téléphone ; c'est le seul endroit où gérer ses amis. Le panneau d'envoi d'une photo, sans ami, propose « Ajouter un ami », qui mène ici.
 - Basculer entre deux vues : « Mes amis » et « En attente », chacune avec son nombre.
 - Dans « En attente », voir séparément les « Demandes reçues » et les « Demandes envoyées », chacune avec son nombre.
 
diff --git a/docs/produit/apparence-et-navigation.md b/docs/produit/apparence-et-navigation.md
index d872b00..f24b152 100644
--- a/docs/produit/apparence-et-navigation.md
+++ b/docs/produit/apparence-et-navigation.md
@@ -88,7 +88,7 @@ Comment on se déplace dans l'application, comment on choisit son thème, et les
 2. R-APP-31 · En « Système », un changement de réglage de l'appareil (passage automatique en sombre le soir, par exemple) s'applique aussitôt, sans recharger.
 3. R-APP-32 · Le choix s'applique immédiatement à toute l'application.
 4. R-APP-33 · Le choix est retenu sur cet appareil et dans ce navigateur seulement : il ne suit pas le compte sur ses autres appareils. Si l'appareil ne permet pas de le retenir (navigation privée, par exemple), le choix vaut jusqu'à la fermeture de la page, puis l'application revient à « Système ».
-5. R-APP-34 · Le cadre et la section « Ma bibliothèque » restent toujours sombres, quel que soit le thème (R-CAD-02, R-BIB-28).
+5. R-APP-34 · Le cadre et les photos de la bibliothèque restent toujours sur fond sombre, quel que soit le thème (R-CAD-02, R-BIB-28).
 
 **Messages affichés**
 
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index 8733fa7..523c717 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -1,19 +1,20 @@
 # Bibliothèque
 
-La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajoutées et celles que ses amis lui ont envoyées. Elle est privée. C'est la page d'accueil de l'application une fois connecté (« Ma bibliothèque »). Le cadre affiche ces mêmes photos (voir [cadre.md](cadre.md)) ; l'envoi à un ami est décrit dans [partage.md](partage.md).
+La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajoutées et celles que ses amis lui ont envoyées. Elle est privée. C'est la page d'accueil de l'application une fois connecté (« Ma bibliothèque » dans le menu, « Bibliothèque » en titre de la page). La page est consacrée aux photos : les amis se gèrent sur la page « Amis » (voir [amis.md](amis.md)). Le cadre affiche ces mêmes photos (voir [cadre.md](cadre.md)) ; l'envoi à un ami est décrit dans [partage.md](partage.md).
 
 ## Ajouter une photo
 
 **Ce que l'on peut faire**
 
-- Dans la carte « Ajouter une photo », prendre une photo avec l'appareil photo du téléphone (« Prendre une photo ») ou choisir une image déjà enregistrée (« Choisir une image »).
+- Toucher « Ajouter », en haut de la bibliothèque : le panneau « Ajouter une photo » s'ouvre, par le bas de l'écran sur un téléphone, au centre sur un ordinateur.
+- Dans ce panneau, prendre une photo avec l'appareil photo du téléphone (« Prendre une photo ») ou choisir une image déjà enregistrée (« Choisir une image »).
 - Voir un aperçu de la photo choisie avant de l'envoyer.
 - L'ajouter à sa bibliothèque avec « Ajouter à ma bibliothèque », ou l'envoyer directement à un ami avec « Envoyer à un ami » (voir [partage.md](partage.md#envoyer-une-photo-depuis-son-appareil)).
 
 **Règles**
 
 1. R-BIB-01 · Les deux boutons restent désactivés tant qu'aucune photo n'est choisie.
-2. R-BIB-02 · Une seule photo est ajoutée à la fois. Choisir une nouvelle photo remplace la précédente dans le formulaire et efface le dernier message.
+2. R-BIB-02 · Une seule photo est ajoutée à la fois. Choisir une nouvelle photo remplace la précédente dans le panneau et efface le dernier message.
 3. R-BIB-03 · Formats acceptés : JPEG, PNG et WebP. Seuls ces formats peuvent être choisis ; le téléphone convertit lui-même une photo prise avec l'appareil photo. Tout autre format (GIF, HEIC, vidéo…) est refusé.
 4. R-BIB-04 · Une photo pèse au plus 10 Mo.
 5. R-BIB-05 · Le fichier doit être une image lisible ; un fichier abîmé ou déguisé en image est refusé.
@@ -24,14 +25,15 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 10. R-BIB-09 · Les informations cachées de la photo, dont le lieu de prise de vue, sont retirées à l'ajout : elles ne sont jamais conservées ni montrées.
 11. R-BIB-10 · Une photo ajoutée porte la date et l'heure de son ajout. La date de prise de vue n'est pas utilisée.
 12. R-BIB-11 · Pendant l'envoi, les deux boutons sont désactivés et le premier affiche « Envoi… ».
-13. R-BIB-12 · Après un ajout réussi, le formulaire se vide, un message de réussite s'affiche, et la photo apparaît en tête de la bibliothèque et sur le cadre qui lit toute la bibliothèque, sur tous les appareils connectés au compte, sans recharger la page.
-14. R-BIB-13 · Après un échec, la photo reste choisie dans le formulaire et un message explique la raison.
+13. R-BIB-12 · Après un ajout réussi, le panneau se ferme, un message de réussite s'affiche, et la photo apparaît en tête de la bibliothèque et sur le cadre qui lit toute la bibliothèque, sur tous les appareils connectés au compte, sans recharger la page.
+14. R-BIB-13 · Après un échec, la photo reste choisie dans le panneau et un message explique la raison.
+15. R-BIB-44 · Fermer le panneau sans rien envoyer abandonne la photo choisie : il s'ouvre vide la fois suivante.
 
 **Messages affichés**
 
 | Situation                       | Message                                                                                                           |
 | ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
-| En-tête de la carte             | « Ajouter une photo » — « Ajoutez-la à votre bibliothèque ou envoyez-la directement à un ami. »                   |
+| En-tête du panneau              | « Ajouter une photo » — « Ajoutez-la à votre bibliothèque ou envoyez-la directement à un ami. »                   |
 | Aperçu                          | Image décrite comme « Aperçu avant envoi »                                                                        |
 | Envoi en cours                  | « Envoi… »                                                                                                        |
 | Photo ajoutée                   | « Photo ajoutée à votre bibliothèque. », dans une courte notification en bas de l'écran qui disparaît d'elle-même |
@@ -54,13 +56,13 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 
 **Ce que l'on peut faire**
 
-- Voir ses photos dans la section « Ma bibliothèque », en miniatures (grille de vignettes carrées) ou en liste.
+- Voir ses photos sous l'en-tête « Bibliothèque », qui indique leur nombre, en miniatures (grille de vignettes carrées) ou en liste.
 - Passer de l'un à l'autre avec les boutons « Miniatures » et « Liste ».
 - Charger les photos plus anciennes avec « Charger plus ».
 - Ouvrir une photo en grand dans l'application, puis passer à la suivante ou à la précédente d'un geste du doigt, avec les flèches à l'écran ou celles du clavier.
 - Ouvrir le menu « … » d'une photo pour lancer sa radio sur le cadre (voir [cadre.md](cadre.md#radio)), l'envoyer à un ami, la ranger dans ses collections (voir [collections.md](collections.md#ranger-ses-photos-dans-une-collection)) ou la supprimer.
 - Lancer le mode cadre, en plein écran, depuis la bibliothèque, ou depuis une photo ouverte pour que le diaporama commence par elle (voir [cadre.md](cadre.md)).
-- Découvrir les photos envoyées par ses proches depuis l'annonce en haut de la page (voir [partage.md](partage.md#recevoir-une-photo)).
+- Découvrir les photos envoyées par ses proches depuis l'annonce placée sous l'en-tête (voir [partage.md](partage.md#recevoir-une-photo)).
 - Gérer ses collections dans la carte « Mes collections » (voir [collections.md](collections.md)).
 
 **Règles**
@@ -73,26 +75,30 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 6. R-BIB-25 · Cliquer sur une photo l'ouvre en grand dans l'application.
 7. R-BIB-26 · Remplacée : une photo reçue n'apparaît plus dès son arrivée, mais une fois découverte (R-BIB-42).
 8. R-BIB-27 · Après une coupure de réseau, la bibliothèque se recharge seule depuis le début dès que la connexion revient, pour rattraper ce qui a changé entre-temps, sans revenir aux 30 premières photos.
-9. R-BIB-28 · La section « Ma bibliothèque » est toujours sombre, quel que soit le thème choisi, pour présenter les photos comme sur le cadre.
-10. R-BIB-29 · Pour l'administrateur, la carte « Vos proches » propose en plus « Inviter un proche sur FamilyFrame ».
+9. R-BIB-28 · Les photos de la bibliothèque sont toujours sur fond sombre, quel que soit le thème choisi, pour présenter les photos comme sur le cadre.
+10. R-BIB-29 · Remplacée : la carte « Vos proches » a quitté la bibliothèque (R-BIB-45).
 11. R-BIB-36 · La photo affiche sa date, et « Envoyée par » suivi du nom quand elle a été reçue.
 12. R-BIB-37 · Un compteur indique la position de la photo (« 3 / 42 ») ; « 30+ » signifie que d'autres photos plus anciennes ne sont pas encore chargées.
 13. R-BIB-38 · Fermer la photo ramène à l'endroit de la bibliothèque où se trouve la dernière photo regardée.
 14. R-BIB-39 · Supprimer la photo affichée montre la suivante ; s'il n'en reste aucune, la photo se ferme.
 15. R-BIB-40 · Le bouton retour du téléphone ferme la photo.
 16. R-BIB-41 · Un lien vers une photo qui n'existe plus ramène simplement à la bibliothèque.
-17. R-BIB-42 · La bibliothèque se met à jour seule, sans recharger la page : une photo ajoutée depuis un autre appareil apparaît en tête, une photo reçue y entre à sa date de réception dès qu'elle est découverte (sur cet appareil ou un autre), une photo supprimée disparaît.
+17. R-BIB-45 · La bibliothèque ne propose ni la gestion des amis ni les invitations : « Amis » et, pour l'administrateur, « Invitations » sont dans le menu (barre du haut, ou ☰ sur un téléphone).
+18. R-BIB-46 · Le nombre de photos s'affiche sous le titre (« 12 photos ») ; « Plus de 30 photos » tant que des photos plus anciennes ne sont pas encore chargées.
+19. R-BIB-47 · Une bibliothèque vide propose « Ajouter une photo », qui ouvre le même panneau que « Ajouter ».
+20. R-BIB-42 · La bibliothèque se met à jour seule, sans recharger la page : une photo ajoutée depuis un autre appareil apparaît en tête, une photo reçue y entre à sa date de réception dès qu'elle est découverte (sur cet appareil ou un autre), une photo supprimée disparaît.
 
 **Messages affichés**
 
-| Situation                                 | Message                                                                                                         |
-| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
-| Bibliothèque vide                         | « Aucune photo pour l'instant. »                                                                                |
-| Photo en cours d'arrivée                  | « Chargement… »                                                                                                 |
-| Chargement des photos suivantes           | « Chargement… » (sur le bouton « Charger plus »)                                                                |
-| Carte d'accès aux amis                    | « Vos proches » — « Ajoutez vos proches en amis pour leur envoyer des photos. » et le bouton « Gérer mes amis » |
-| Photos reçues en attente                  | « Vous avez N nouvelles photos » et le bouton « Découvrir » (voir [partage.md](partage.md#recevoir-une-photo))  |
-| Description d'une photo (lecture d'écran) | « Photo du 24 novembre 2026 » ou « Photo envoyée par [nom], du 24 novembre 2026 »                               |
+| Situation                                 | Message                                                                                                        |
+| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
+| En-tête                                   | « Bibliothèque », le nombre de photos, et les boutons « Ajouter » et « Mode cadre »                            |
+| Chargement de la bibliothèque             | « Chargement… »                                                                                                |
+| Bibliothèque vide                         | « Aucune photo pour l'instant. » et le bouton « Ajouter une photo »                                            |
+| Photo en cours d'arrivée                  | « Chargement… »                                                                                                |
+| Chargement des photos suivantes           | « Chargement… » (sur le bouton « Charger plus »)                                                               |
+| Photos reçues en attente                  | « Vous avez N nouvelles photos » et le bouton « Découvrir » (voir [partage.md](partage.md#recevoir-une-photo)) |
+| Description d'une photo (lecture d'écran) | « Photo du 24 novembre 2026 » ou « Photo envoyée par [nom], du 24 novembre 2026 »                              |
 
 **Ce qui n'est pas possible**
 
diff --git a/docs/produit/partage.md b/docs/produit/partage.md
index 299073a..087c557 100644
--- a/docs/produit/partage.md
+++ b/docs/produit/partage.md
@@ -6,7 +6,7 @@ Envoyer une photo à un ou plusieurs amis la leur fait parvenir comme du courrie
 
 **Ce que l'on peut faire**
 
-- Ouvrir « Envoyer à des proches » depuis une photo de sa bibliothèque ou depuis le formulaire d'ajout (voir les deux sections suivantes).
+- Ouvrir « Envoyer à des proches » depuis une photo de sa bibliothèque ou depuis le panneau « Ajouter une photo » (voir les deux sections suivantes).
 - Voir un aperçu de la photo, puis ses amis sous forme de ronds portant leur photo de profil ou, sans photo, leur initiale.
 - Envoyer une photo à plusieurs proches en une fois, en touchant leur visage puis un seul bouton.
 - Rechercher un ami par son nom ou son adresse e-mail quand on en a beaucoup.
@@ -78,14 +78,14 @@ Ceux du panneau d'envoi (voir [Choisir à qui envoyer](#choisir-à-qui-envoyer))
 
 **Ce que l'on peut faire**
 
-- Dans la carte « Ajouter une photo » de la bibliothèque, prendre ou choisir une photo, puis cliquer sur « Envoyer à un ami » au lieu de « Ajouter à ma bibliothèque ».
+- Dans le panneau « Ajouter une photo » (bouton « Ajouter » de la bibliothèque), prendre ou choisir une photo, puis cliquer sur « Envoyer à un ami » au lieu de « Ajouter à ma bibliothèque ».
 
 **Règles**
 
 1. R-PAR-20 · La photo entre uniquement dans la bibliothèque de l'ami : elle n'est pas ajoutée à celle de l'expéditeur.
 2. R-PAR-21 · Les règles d'ajout s'appliquent comme pour sa propre bibliothèque : formats JPEG, PNG ou WebP, 10 Mo au plus, image lisible, photo préparée pour l'affichage et informations cachées retirées (voir [bibliotheque.md](bibliotheque.md#ajouter-une-photo), R-BIB-03 à R-BIB-09). Les messages d'erreur sont les mêmes.
-3. R-PAR-22 · Après un envoi réussi, le formulaire d'ajout se vide et le panneau se ferme.
-4. R-PAR-23 · La notification « Photo ajoutée à votre bibliothèque. » du formulaire ne concerne que l'ajout à sa bibliothèque ; l'envoi à des amis se confirme par sa propre notification (« Envoyée à … »).
+3. R-PAR-22 · « Envoyer à un ami » ferme le panneau « Ajouter une photo » et ouvre le panneau d'envoi avec la photo choisie. Après un envoi réussi, il se ferme ; le fermer sans envoyer abandonne la photo.
+4. R-PAR-23 · La notification « Photo ajoutée à votre bibliothèque. » du panneau d'ajout ne concerne que l'ajout à sa bibliothèque ; l'envoi à des amis se confirme par sa propre notification (« Envoyée à … »).
 
 **Messages affichés**
~~~~

## PR C — `feat/library-collections`

### Task 3: Browse one collection

**Commit:** `feat(client): browse one collection in the library`

**Scope:** Chip row, `?collection=`, filtered library hook, viewer keeps the param, empty and unavailable notices. Product docs: « Parcourir une collection », R-COL-15..21.

**Gate:** `pnpm check`, `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 81026ca..7e9d5e8 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -43,15 +43,15 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 
 ## Pages
 
-| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
-| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
-| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
-| `/`                  | bibliothèque, consacrée aux photos (les amis sont sur `/friends`) : en tête « Bibliothèque », le nombre de photos (« Plus de N photos » tant que des pages restent), « Ajouter », « Mode cadre » et le choix vignettes/liste (`LibraryHeader`) ; « Ajouter » ouvre le panneau « Ajouter une photo » (`AddPhotoPanel`, feuille par le bas sur mobile, fenêtre au centre sur ordinateur, comme le panneau d'envoi : `ResponsivePanel`) : « Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui ferme le panneau et ouvre celui de l'envoi, pour l'ami seulement ; puis, quand des photos reçues attendent, l'annonce compacte « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis « Mes collections » (`components/collections/` : « Nouvelle collection », une ligne par collection avec son nombre de photos et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer »), puis les photos du compte en vignettes ou en liste (choix mémorisé par appareil ; vide : « Ajouter une photo »), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/`) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Lancer la radio », « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
-| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour, d'une de ses collections ou d'une radio (`/frame?radio=<id>`), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; tant qu'une radio joue, « Photos » la montre en tête, cochée (« Radio ») ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
-| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
-| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
-| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
+| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
+| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
+| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
+| `/`                  | bibliothèque, consacrée aux photos (les amis sont sur `/friends`) : en tête « Bibliothèque », le nombre de photos (« Plus de N photos » tant que des pages restent), « Ajouter », « Mode cadre » et le choix vignettes/liste (`LibraryHeader`) ; « Ajouter » ouvre le panneau « Ajouter une photo » (`AddPhotoPanel`, feuille par le bas sur mobile, fenêtre au centre sur ordinateur, comme le panneau d'envoi : `ResponsivePanel`) : « Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui ferme le panneau et ouvre celui de l'envoi, pour l'ami seulement ; puis, quand des photos reçues attendent, l'annonce compacte « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis « Mes collections » (`components/collections/` : « Nouvelle collection », une ligne par collection avec son nombre de photos et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer »), puis la rangée de collections « Toutes », « Noël »… (`CollectionChips`, des liens `/?collection=<id>` qui défilent de côté : retour et rechargement gardent la collection ; `useSelectedCollection` la retrouve dans la liste, « Cette collection n'existe plus. » sinon), puis les photos du compte ou de la collection choisie (`usePhotoLibrary` passe `collectionId` à `GET /api/photos` et recharge la collection sur `collections:changed`) en vignettes ou en liste (choix mémorisé par appareil ; vide : « Ajouter une photo »), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/` ; `collection` reste dans l'adresse et la visionneuse ne parcourt que les photos affichées) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Lancer la radio », « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
+| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour, d'une de ses collections ou d'une radio (`/frame?radio=<id>`), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; tant qu'une radio joue, « Photos » la montre en tête, cochée (« Radio ») ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
+| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
+| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
+| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
 
 Visionneuse : l'adresse `/?photo=<id>` ouvre la photo, un lien la partage. Ouvrir depuis la bibliothèque ajoute une entrée d'historique, passer d'une photo à l'autre la remplace, et fermer revient en arrière : le bouton retour d'Android ferme la visionneuse. Près de la fin des photos chargées, la page suivante se charge. Une photo supprimée pendant qu'on la regarde laisse sa place à la suivante (la précédente si c'était la plus ancienne), et la visionneuse se ferme quand il n'en reste aucune ; un lien vers une photo inconnue charge les pages jusqu'à la trouver, puis ferme s'il n'y en a plus. « Mode cadre » remplace l'entrée de la visionneuse (ou s'ajoute au-dessus de la bibliothèque depuis son en-tête) : quitter le cadre ramène une seule visionneuse, et le retour arrière la bibliothèque. Le lien « Cadre » de la barre ajoute une entrée d'historique ordinaire : c'est aussi l'adresse qu'un cadre ouvre au démarrage.
 
diff --git a/client/src/components/collections/CollectionChips.tsx b/client/src/components/collections/CollectionChips.tsx
new file mode 100644
index 0000000..93e29e8
--- /dev/null
+++ b/client/src/components/collections/CollectionChips.tsx
@@ -0,0 +1,60 @@
+import { type JSX, useEffect, useRef } from 'react'
+import { Link } from 'react-router'
+import { useCollections } from '@/collections/CollectionsContext.ts'
+import { cn } from '@/lib/utils.ts'
+import { libraryPath } from '@/viewerHistory.ts'
+
+// 44 px under a finger, the size touch guidelines ask for; a mouse keeps the compact chip.
+const CHIP_CLASSES =
+  'inline-flex h-9 max-w-64 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:h-11'
+
+type CollectionChipsProps = { selectedId: string | null }
+
+type ChipLinkProps = { collectionId: string | null; isSelected: boolean; label: string }
+
+// A link, not a button: each collection has its own address, so back and reload keep it.
+function ChipLink({ collectionId, isSelected, label }: ChipLinkProps): JSX.Element {
+  const linkRef = useRef<HTMLAnchorElement>(null)
+  // After a reload on a collection far along the row, its chip scrolls into sight.
+  useEffect(() => {
+    if (isSelected) linkRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
+  }, [isSelected])
+  return (
+    <Link
+      ref={linkRef}
+      to={libraryPath(collectionId)}
+      aria-current={isSelected ? 'page' : undefined}
+      title={label}
+      className={cn(
+        CHIP_CLASSES,
+        isSelected && 'border-primary bg-primary text-primary-foreground hover:bg-primary/85',
+      )}
+    >
+      <span className="truncate">{label}</span>
+    </Link>
+  )
+}
+
+// Only this row scrolls sideways; it reaches the screen edges so a cut chip says « more ».
+export function CollectionChips({ selectedId }: CollectionChipsProps): JSX.Element {
+  const { collections, status } = useCollections()
+  return (
+    <nav aria-label="Collections" className="-mx-4 overflow-x-auto px-4 py-1">
+      <ul className="flex w-max items-center gap-2">
+        <li>
+          <ChipLink collectionId={null} isSelected={selectedId === null} label="Toutes" />
+        </li>
+        {collections.map(({ id, name }) => (
+          <li key={id}>
+            <ChipLink collectionId={id} isSelected={id === selectedId} label={name} />
+          </li>
+        ))}
+        {status === 'failed' && (
+          <li className="text-sm text-muted-foreground">
+            Vos collections n'ont pas pu être chargées.
+          </li>
+        )}
+      </ul>
+    </nav>
+  )
+}
diff --git a/client/src/components/collections/SelectedCollectionBar.tsx b/client/src/components/collections/SelectedCollectionBar.tsx
new file mode 100644
index 0000000..66f4a32
--- /dev/null
+++ b/client/src/components/collections/SelectedCollectionBar.tsx
@@ -0,0 +1,10 @@
+import type { JSX } from 'react'
+import type { Collection } from '@/collections/collection.ts'
+
+export function SelectedCollectionBar({ collection }: { collection: Collection }): JSX.Element {
+  return (
+    <div className="flex min-w-0 items-center gap-2">
+      <h2 className="text-lg font-medium wrap-anywhere">{collection.name}</h2>
+    </div>
+  )
+}
diff --git a/client/src/components/library/LibraryNotices.tsx b/client/src/components/library/LibraryNotices.tsx
new file mode 100644
index 0000000..3f85c55
--- /dev/null
+++ b/client/src/components/library/LibraryNotices.tsx
@@ -0,0 +1,41 @@
+import { ImagePlusIcon } from 'lucide-react'
+import type { JSX } from 'react'
+import { Link } from 'react-router'
+import { Button } from '@/components/ui/button.tsx'
+
+const NOTICE_CLASSES = 'flex flex-col items-center gap-4 px-6 py-16 text-center'
+
+export function EmptyLibrary({ onAdd }: { onAdd: () => void }): JSX.Element {
+  return (
+    <div className={NOTICE_CLASSES}>
+      <p className="text-muted-foreground">Aucune photo pour l'instant.</p>
+      <Button size="lg" className="pointer-coarse:h-11" onClick={onAdd}>
+        <ImagePlusIcon aria-hidden data-icon="inline-start" />
+        Ajouter une photo
+      </Button>
+    </div>
+  )
+}
+
+export function EmptyCollection(): JSX.Element {
+  return (
+    <div className={NOTICE_CLASSES}>
+      <p className="font-medium">Cette collection est vide.</p>
+      <p className="max-w-xs text-sm text-muted-foreground">
+        Rangez-y des photos depuis leur menu « … », dans « Toutes ».
+      </p>
+    </div>
+  )
+}
+
+// A collection deleted on another device, or a link to someone else's: the way back is offered.
+export function UnavailableCollection({ message }: { message: string }): JSX.Element {
+  return (
+    <div className={NOTICE_CLASSES}>
+      <p className="text-muted-foreground">{message}</p>
+      <Button asChild variant="outline" className="pointer-coarse:h-11">
+        <Link to="/">Voir toutes les photos</Link>
+      </Button>
+    </div>
+  )
+}
diff --git a/client/src/components/library/LibrarySection.tsx b/client/src/components/library/LibrarySection.tsx
index 168b8e3..e80bec1 100644
--- a/client/src/components/library/LibrarySection.tsx
+++ b/client/src/components/library/LibrarySection.tsx
@@ -1,4 +1,3 @@
-import { ImagePlusIcon } from 'lucide-react'
 import type { JSX } from 'react'
 import { PhotoGrid } from '@/components/frame/PhotoGrid.tsx'
 import { PhotoList } from '@/components/frame/PhotoList.tsx'
@@ -10,23 +9,12 @@ type LibrarySectionProps = {
   library: PhotoLibrary
   layout: LibraryLayout
   onOpenPhoto: (id: string) => void
-  onAdd: () => void
+  // The library and a collection say different things when they have no photo.
+  emptyState: JSX.Element
 }
 
 type LoadMoreButtonProps = Pick<PhotoLibrary, 'isLoadingMore' | 'loadMore'>
 
-function EmptyLibrary({ onAdd }: { onAdd: () => void }): JSX.Element {
-  return (
-    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
-      <p className="text-muted-foreground">Aucune photo pour l'instant.</p>
-      <Button size="lg" className="pointer-coarse:h-11" onClick={onAdd}>
-        <ImagePlusIcon aria-hidden data-icon="inline-start" />
-        Ajouter une photo
-      </Button>
-    </div>
-  )
-}
-
 function LoadMoreButton({ isLoadingMore, loadMore }: LoadMoreButtonProps): JSX.Element {
   return (
     <div className="flex justify-center px-4 pb-6 sm:px-8 sm:pb-8">
@@ -42,11 +30,16 @@ function LoadMoreButton({ isLoadingMore, loadMore }: LoadMoreButtonProps): JSX.E
   )
 }
 
-function LibraryPhotos({ library, layout, onOpenPhoto, onAdd }: LibrarySectionProps): JSX.Element {
+function LibraryPhotos({
+  library,
+  layout,
+  onOpenPhoto,
+  emptyState,
+}: LibrarySectionProps): JSX.Element {
   if (!library.isFirstPageLoaded) {
     return <p className="px-6 py-16 text-center text-muted-foreground">Chargement…</p>
   }
-  if (library.photos.length === 0) return <EmptyLibrary onAdd={onAdd} />
+  if (library.photos.length === 0) return emptyState
   // currentId null: no photo is on screen here, so no tile gets the frame's ring.
   return layout === 'grid' ? (
     <PhotoGrid photos={library.photos} currentId={null} onSelect={onOpenPhoto} />
diff --git a/client/src/hooks/usePhotoLibrary.ts b/client/src/hooks/usePhotoLibrary.ts
index bc9fe2a..c6ab32c 100644
--- a/client/src/hooks/usePhotoLibrary.ts
+++ b/client/src/hooks/usePhotoLibrary.ts
@@ -11,7 +11,7 @@ import { useAuth } from '@/auth/AuthContext.ts'
 import { createLiveLoads, type LiveLoads } from '@/liveLoads.ts'
 import type { Photo } from '@/photo.ts'
 import { withNewPhoto, withOlderPhotos, withoutPhoto } from '@/photoList.ts'
-import { connectPhotoSocket } from '@/photoSocket.ts'
+import { connectPhotoSocket, type PhotoSocketHandlers } from '@/photoSocket.ts'
 import { fetchNewestPhotos, fetchPhotoPage } from '@/photosApi.ts'
 
 // The server's DEFAULT_PAGE_SIZE: the first load asks for one page.
@@ -27,8 +27,12 @@ export type PhotoLibrary = {
   addPhoto: (photo: Photo) => void
 }
 
+// null: the whole library; otherwise only the photos of that collection.
+export type CollectionFilter = string | null
+
 // The load that gave the cursor: a page fetched with it is only valid while that load is current.
-type NextPage = { cursor: string; loadId: number }
+// It also keeps the collection the cursor walks through.
+type NextPage = { cursor: string; loadId: number; collectionId: CollectionFilter }
 
 type LibrarySetters = {
   setPhotos: Dispatch<SetStateAction<Photo[]>>
@@ -43,8 +47,20 @@ type MoreSetters = LibrarySetters & {
   setIsLoadingMore: Dispatch<SetStateAction<boolean>>
 }
 
-function toNextPage(cursor: string | null, loadId: number): NextPage | null {
-  return cursor === null ? null : { cursor, loadId }
+type LibraryStore = FirstPageSetters &
+  MoreSetters & {
+    photos: Photo[]
+    nextPage: NextPage | null
+    isLoadingMore: boolean
+    isFirstPageLoaded: boolean
+  }
+
+function toNextPage(
+  cursor: string | null,
+  loadId: number,
+  collectionId: CollectionFilter,
+): NextPage | null {
+  return cursor === null ? null : { cursor, loadId, collectionId }
 }
 
 // Each (re)connection reloads from the newest photo, which catches what changed offline. It asks
@@ -53,16 +69,17 @@ function createFirstPageLoader(
   liveLoads: LiveLoads,
   { setPhotos, setNextPage, setIsFirstPageLoaded }: FirstPageSetters,
   readLoadCount: () => number,
+  collectionId: CollectionFilter,
   dropUser: () => void,
 ): () => Promise<void> {
   return async () => {
     const loadId = liveLoads.begin()
-    const page = await fetchNewestPhotos(readLoadCount(), () => {
+    const page = await fetchNewestPhotos(readLoadCount(), collectionId ?? undefined, () => {
       if (liveLoads.isCurrent(loadId)) dropUser()
     })
     if (page === null || !liveLoads.isCurrent(loadId)) return
     setPhotos(liveLoads.withLiveChanges(page.photos))
-    setNextPage(toNextPage(page.nextCursor, loadId))
+    setNextPage(toNextPage(page.nextCursor, loadId, collectionId))
     setIsFirstPageLoaded(true)
   }
 }
@@ -76,59 +93,85 @@ function createMoreLoader(
 ): () => Promise<void> {
   return async () => {
     if (nextPage === null) return
-    const { cursor, loadId } = nextPage
+    const { cursor, loadId, collectionId } = nextPage
     setIsLoadingMore(true)
-    const page = await fetchPhotoPage({ cursor }, () => {
+    const request = { cursor, collectionId: collectionId ?? undefined }
+    const page = await fetchPhotoPage(request, () => {
       if (liveLoads.isCurrent(loadId)) dropUser()
     })
     setIsLoadingMore(false)
     if (page === null || !liveLoads.isCurrent(loadId)) return
     setPhotos((current) => withOlderPhotos(current, liveLoads.withoutDeleted(page.photos)))
-    setNextPage(toNextPage(page.nextCursor, loadId))
+    setNextPage(toNextPage(page.nextCursor, loadId, collectionId))
   }
 }
 
-// Returns the cleanup that stops the socket and any load still running.
-function connectLibrary(
+// The upload response and the photo:new event bring the same photo: withNewPhoto keeps one.
+function createPhotoAdder(
   liveLoads: LiveLoads,
-  setters: FirstPageSetters,
-  readLoadCount: () => number,
-  dropUser: () => void,
-): () => void {
-  const { setPhotos } = setters
-  function addPhoto(photo: Photo): void {
+  setPhotos: Dispatch<SetStateAction<Photo[]>>,
+): (photo: Photo) => void {
+  return (photo) => {
     liveLoads.rememberAdded(photo)
     setPhotos((current) => withNewPhoto(current, photo))
   }
-  // A received photo joins the library once opened, here or on another device.
-  const socket = connectPhotoSocket({
-    onConnect: createFirstPageLoader(liveLoads, setters, readLoadCount, dropUser),
+}
+
+// A collection listens to collections:changed rather than to new photos: a photo enters it only
+// by being filed there.
+function libraryHandlers(
+  liveLoads: LiveLoads,
+  setPhotos: Dispatch<SetStateAction<Photo[]>>,
+  loadFirstPage: () => Promise<void>,
+  collectionId: CollectionFilter,
+): Omit<PhotoSocketHandlers, 'onRefused'> {
+  const addPhoto = collectionId === null ? createPhotoAdder(liveLoads, setPhotos) : undefined
+  return {
+    onConnect: loadFirstPage,
+    // A received photo joins the library once opened, here or on another device.
     onNewPhoto: addPhoto,
     onOpenedPhoto: addPhoto,
+    onCollectionsChanged: collectionId === null ? undefined : loadFirstPage,
     // The delete dialog relies on this event, as on the frame.
     onDeletedPhoto: (id) => {
       liveLoads.rememberDeleted(id)
       setPhotos((current) => withoutPhoto(current, id))
     },
-    onRefused: dropUser,
-  })
+  }
+}
+
+// Returns the cleanup that stops the socket and any load still running.
+function connectLibrary(
+  liveLoads: LiveLoads,
+  setters: FirstPageSetters,
+  readLoadCount: () => number,
+  collectionId: CollectionFilter,
+  dropUser: () => void,
+): () => void {
+  const loadFirstPage = createFirstPageLoader(
+    liveLoads,
+    setters,
+    readLoadCount,
+    collectionId,
+    dropUser,
+  )
+  const handlers = libraryHandlers(liveLoads, setters.setPhotos, loadFirstPage, collectionId)
+  const socket = connectPhotoSocket({ ...handlers, onRefused: dropUser })
   return () => {
     socket.disconnect()
     liveLoads.stop()
   }
 }
 
-// The upload response and the photo:new event bring the same photo: withNewPhoto keeps one.
+// A new upload is in no collection yet: a collection's list leaves it out.
 function usePhotoAdder(
   liveLoads: LiveLoads,
   setPhotos: Dispatch<SetStateAction<Photo[]>>,
+  collectionId: CollectionFilter,
 ): (photo: Photo) => void {
-  return useCallback(
-    (photo: Photo): void => {
-      liveLoads.rememberAdded(photo)
-      setPhotos((current) => withNewPhoto(current, photo))
-    },
-    [liveLoads, setPhotos],
+  return useMemo(
+    () => (collectionId === null ? createPhotoAdder(liveLoads, setPhotos) : () => {}),
+    [liveLoads, setPhotos, collectionId],
   )
 }
 
@@ -155,46 +198,59 @@ function useLoadCountReader(photos: Photo[]): () => number {
   return useCallback(() => Math.max(loadedCount.current, FIRST_LOAD_COUNT), [])
 }
 
+// Another collection reconnects: its first load asks for its own photos.
 function useLibraryConnection(
   liveLoads: LiveLoads,
-  photos: Photo[],
-  setters: FirstPageSetters,
+  { photos, setPhotos, setNextPage, setIsFirstPageLoaded }: LibraryStore,
+  collectionId: CollectionFilter,
   dropUser: () => void,
 ): void {
   const readLoadCount = useLoadCountReader(photos)
-  const { setPhotos, setNextPage, setIsFirstPageLoaded } = setters
   useEffect(() => {
-    const stableSetters = { setPhotos, setNextPage, setIsFirstPageLoaded }
-    return connectLibrary(liveLoads, stableSetters, readLoadCount, dropUser)
-  }, [liveLoads, readLoadCount, setPhotos, setNextPage, setIsFirstPageLoaded, dropUser])
+    const setters = { setPhotos, setNextPage, setIsFirstPageLoaded }
+    return connectLibrary(liveLoads, setters, readLoadCount, collectionId, dropUser)
+  }, [
+    liveLoads,
+    readLoadCount,
+    setPhotos,
+    setNextPage,
+    setIsFirstPageLoaded,
+    collectionId,
+    dropUser,
+  ])
 }
 
-export function usePhotoLibrary(): PhotoLibrary {
-  const { dropUser } = useAuth()
-  // useState keeps one instance across renders: its load bookkeeping must survive them.
-  const [liveLoads] = useState(createLiveLoads)
+// Another collection starts empty, adjusted during render: its first frame never shows the
+// previous photos, and its first load asks for one page, not for as many as were shown.
+function useLibraryStore(collectionId: CollectionFilter): LibraryStore {
   const [photos, setPhotos] = useState<Photo[]>([])
   const [nextPage, setNextPage] = useState<NextPage | null>(null)
   const [isLoadingMore, setIsLoadingMore] = useState(false)
   const [isFirstPageLoaded, setIsFirstPageLoaded] = useState(false)
-  useLibraryConnection(
-    liveLoads,
-    photos,
-    { setPhotos, setNextPage, setIsFirstPageLoaded },
-    dropUser,
-  )
-  const loadMore = useMoreLoader(
-    liveLoads,
-    nextPage,
-    { setPhotos, setNextPage, setIsLoadingMore },
-    dropUser,
-  )
-  const addPhoto = usePhotoAdder(liveLoads, setPhotos)
+  const [shownCollectionId, setShownCollectionId] = useState(collectionId)
+  if (shownCollectionId !== collectionId) {
+    setShownCollectionId(collectionId)
+    setPhotos([])
+    setNextPage(null)
+    setIsFirstPageLoaded(false)
+  }
+  const state = { photos, nextPage, isLoadingMore, isFirstPageLoaded }
+  return { ...state, setPhotos, setNextPage, setIsLoadingMore, setIsFirstPageLoaded }
+}
+
+export function usePhotoLibrary(collectionId: CollectionFilter): PhotoLibrary {
+  const { dropUser } = useAuth()
+  // useState keeps one instance across renders: its load bookkeeping must survive them.
+  const [liveLoads] = useState(createLiveLoads)
+  const store = useLibraryStore(collectionId)
+  useLibraryConnection(liveLoads, store, collectionId, dropUser)
+  const loadMore = useMoreLoader(liveLoads, store.nextPage, store, dropUser)
+  const addPhoto = usePhotoAdder(liveLoads, store.setPhotos, collectionId)
   return {
-    photos,
-    hasMore: nextPage !== null,
-    isLoadingMore,
-    isFirstPageLoaded,
+    photos: store.photos,
+    hasMore: store.nextPage !== null,
+    isLoadingMore: store.isLoadingMore,
+    isFirstPageLoaded: store.isFirstPageLoaded,
     loadMore,
     addPhoto,
   }
diff --git a/client/src/hooks/useSelectedCollection.ts b/client/src/hooks/useSelectedCollection.ts
new file mode 100644
index 0000000..4bc2316
--- /dev/null
+++ b/client/src/hooks/useSelectedCollection.ts
@@ -0,0 +1,29 @@
+import { useSearchParams } from 'react-router'
+import { useCollections } from '@/collections/CollectionsContext.ts'
+import type { Collection } from '@/collections/collection.ts'
+import { COLLECTION_PARAM } from '@/viewerHistory.ts'
+
+// all: no collection in the URL. loading: the list has not arrived yet, the photos load anyway.
+// missing: deleted, someone else's or mistyped. failed: the list could not be loaded.
+export type SelectedCollection =
+  | { status: 'all' }
+  | { status: 'loading'; collectionId: string }
+  | { status: 'found'; collectionId: string; collection: Collection }
+  | { status: 'missing' | 'failed'; collectionId: string }
+
+// The URL holds the choice: back, reload and a shared link show the same collection.
+export function useSelectedCollection(): SelectedCollection {
+  const [searchParams] = useSearchParams()
+  const { collections, status } = useCollections()
+  const collectionId = searchParams.get(COLLECTION_PARAM)
+  if (collectionId === null) return { status: 'all' }
+  if (status === 'loading') return { status: 'loading', collectionId }
+  if (status === 'failed') return { status: 'failed', collectionId }
+  const collection = collections.find(({ id }) => id === collectionId)
+  if (collection === undefined) return { status: 'missing', collectionId }
+  return { status: 'found', collectionId, collection }
+}
+
+export function selectedCollectionId(selected: SelectedCollection): string | null {
+  return selected.status === 'all' ? null : selected.collectionId
+}
diff --git a/client/src/hooks/useViewerParam.ts b/client/src/hooks/useViewerParam.ts
index d0ff0eb..599c8dc 100644
--- a/client/src/hooks/useViewerParam.ts
+++ b/client/src/hooks/useViewerParam.ts
@@ -1,6 +1,12 @@
-import { useLocation, useNavigate, useSearchParams } from 'react-router'
+import { type NavigateOptions, useLocation, useNavigate, useSearchParams } from 'react-router'
 import { enterFullscreen } from '@/fullscreen.ts'
-import { isLibraryBelow, LIBRARY_BELOW_STATE, PHOTO_PARAM, photoPath } from '@/viewerHistory.ts'
+import {
+  isLibraryBelow,
+  LIBRARY_BELOW_STATE,
+  PHOTO_PARAM,
+  photoPath,
+  withPhotoParam,
+} from '@/viewerHistory.ts'
 
 export type ViewerParam = {
   openId: string | null
@@ -11,25 +17,38 @@ export type ViewerParam = {
   startFrame: (photoId: string) => void
 }
 
+// Replace, keeping the viewer's state: the frame takes the viewer's place above the library,
+// so leaving the frame brings back one viewer, not two.
+function useStartFrame(): (photoId: string) => void {
+  const location = useLocation()
+  const navigate = useNavigate()
+  return (photoId) => {
+    enterFullscreen()
+    navigate(photoPath('/frame', photoId), { replace: true, state: location.state })
+  }
+}
+
+// Only the photo param changes: the collection shown stays in the URL.
 export function useViewerParam(): ViewerParam {
   const [searchParams, setSearchParams] = useSearchParams()
   const location = useLocation()
   const navigate = useNavigate()
+  const startFrame = useStartFrame()
   const openId = searchParams.get(PHOTO_PARAM)
 
-  function open(photoId: string): void {
-    setSearchParams({ [PHOTO_PARAM]: photoId }, { state: LIBRARY_BELOW_STATE })
+  function setPhotoParam(photoId: string | null, options: NavigateOptions): void {
+    setSearchParams(withPhotoParam(searchParams, photoId), options)
   }
 
   function show(photoId: string): void {
     if (photoId === openId) return
     // Replace: swiping through twenty photos must not take twenty back presses to leave.
-    setSearchParams({ [PHOTO_PARAM]: photoId }, { replace: true, state: location.state })
+    setPhotoParam(photoId, { replace: true, state: location.state })
   }
 
   // Replace, never back: the viewer calls it from an effect that may run twice.
   function dismiss(): void {
-    setSearchParams({}, { replace: true })
+    setPhotoParam(null, { replace: true })
   }
 
   function close(): void {
@@ -37,12 +56,6 @@ export function useViewerParam(): ViewerParam {
     else dismiss()
   }
 
-  // Replace, keeping the viewer's state: the frame takes the viewer's place above the library,
-  // so leaving the frame brings back one viewer, not two.
-  function startFrame(photoId: string): void {
-    enterFullscreen()
-    navigate(photoPath('/frame', photoId), { replace: true, state: location.state })
-  }
-
+  const open = (photoId: string): void => setPhotoParam(photoId, { state: LIBRARY_BELOW_STATE })
   return { openId, open, show, close, dismiss, startFrame }
 }
diff --git a/client/src/pages/LibraryPage.tsx b/client/src/pages/LibraryPage.tsx
index 986e4db..454386a 100644
--- a/client/src/pages/LibraryPage.tsx
+++ b/client/src/pages/LibraryPage.tsx
@@ -1,14 +1,35 @@
 import { type JSX, useState } from 'react'
+import { CollectionChips } from '@/components/collections/CollectionChips.tsx'
 import { CollectionsCard } from '@/components/collections/CollectionsCard.tsx'
+import { SelectedCollectionBar } from '@/components/collections/SelectedCollectionBar.tsx'
 import { AddPhotoPanel } from '@/components/library/AddPhotoPanel.tsx'
 import { LibraryHeader } from '@/components/library/LibraryHeader.tsx'
+import {
+  EmptyCollection,
+  EmptyLibrary,
+  UnavailableCollection,
+} from '@/components/library/LibraryNotices.tsx'
 import { LibrarySection } from '@/components/library/LibrarySection.tsx'
 import { LibraryMail } from '@/components/mail/LibraryMail.tsx'
 import { PhotoViewer } from '@/components/viewer/PhotoViewer.tsx'
-import { useLibraryLayout } from '@/hooks/useLibraryLayout.ts'
+import { type LibraryLayout, useLibraryLayout } from '@/hooks/useLibraryLayout.ts'
 import { type PhotoLibrary, usePhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
+import {
+  type SelectedCollection,
+  selectedCollectionId,
+  useSelectedCollection,
+} from '@/hooks/useSelectedCollection.ts'
 import { useViewerParam, type ViewerParam } from '@/hooks/useViewerParam.ts'
 
+type LibraryContentProps = {
+  selected: SelectedCollection
+  library: PhotoLibrary
+  viewer: ViewerParam
+  onAdd: () => void
+}
+
+type LibraryBodyProps = LibraryContentProps & { layout: LibraryLayout }
+
 type LibraryOverlaysProps = {
   library: PhotoLibrary
   viewer: ViewerParam
@@ -16,6 +37,42 @@ type LibraryOverlaysProps = {
   onAddClose: () => void
 }
 
+function LibraryBody({ selected, library, layout, viewer, onAdd }: LibraryBodyProps): JSX.Element {
+  if (selected.status === 'missing') {
+    return <UnavailableCollection message="Cette collection n'existe plus." />
+  }
+  if (selected.status === 'failed') {
+    return <UnavailableCollection message="Cette collection n'a pas pu être chargée." />
+  }
+  const emptyState =
+    selected.status === 'all' ? <EmptyLibrary onAdd={onAdd} /> : <EmptyCollection />
+  return (
+    <LibrarySection
+      library={library}
+      layout={layout}
+      onOpenPhoto={viewer.open}
+      emptyState={emptyState}
+    />
+  )
+}
+
+function LibraryContent(props: LibraryContentProps): JSX.Element {
+  const [layout, setLayout] = useLibraryLayout()
+  const { selected, library, onAdd } = props
+  return (
+    <>
+      <LibraryHeader library={library} layout={layout} onLayoutChange={setLayout} onAdd={onAdd} />
+      {/* Above the photos: news from the family comes first. */}
+      <LibraryMail />
+      <CollectionsCard />
+      <CollectionChips selectedId={selectedCollectionId(selected)} />
+      {selected.status === 'found' && <SelectedCollectionBar collection={selected.collection} />}
+      <LibraryBody {...props} layout={layout} />
+    </>
+  )
+}
+
+// The viewer browses the photos shown, so a collection's photo never leads out of it.
 function LibraryOverlays({
   library,
   viewer,
@@ -32,33 +89,20 @@ function LibraryOverlays({
   )
 }
 
-type LibraryContentProps = {
-  library: PhotoLibrary
-  viewer: ViewerParam
-  onAdd: () => void
-}
-
-function LibraryContent({ library, viewer, onAdd }: LibraryContentProps): JSX.Element {
-  const [layout, setLayout] = useLibraryLayout()
-  return (
-    <>
-      <LibraryHeader library={library} layout={layout} onLayoutChange={setLayout} onAdd={onAdd} />
-      {/* Above the photos: news from the family comes first. */}
-      <LibraryMail />
-      <CollectionsCard />
-      <LibrarySection library={library} layout={layout} onOpenPhoto={viewer.open} onAdd={onAdd} />
-    </>
-  )
-}
-
 export default function LibraryPage(): JSX.Element {
-  const library = usePhotoLibrary()
+  const selected = useSelectedCollection()
+  const library = usePhotoLibrary(selectedCollectionId(selected))
   const viewer = useViewerParam()
   const [isAdding, setIsAdding] = useState(false)
 
   return (
     <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:py-10">
-      <LibraryContent library={library} viewer={viewer} onAdd={() => setIsAdding(true)} />
+      <LibraryContent
+        selected={selected}
+        library={library}
+        viewer={viewer}
+        onAdd={() => setIsAdding(true)}
+      />
       <LibraryOverlays
         library={library}
         viewer={viewer}
diff --git a/client/src/photosApi.ts b/client/src/photosApi.ts
index ef65849..f54742c 100644
--- a/client/src/photosApi.ts
+++ b/client/src/photosApi.ts
@@ -4,7 +4,8 @@ import { isPhoto, isPhotoPage, type Photo, type PhotoPage } from '@/photo.ts'
 // The server's MAX_PAGE_SIZE: the fewest requests for many photos.
 const MAX_PAGE_SIZE = 100
 
-export type PageRequest = { cursor?: string; limit?: number }
+// collectionId: only that collection's photos; left out for the whole library.
+export type PageRequest = { cursor?: string; limit?: number; collectionId?: string }
 
 export type UploadResult =
   | { status: 'uploaded'; photo: Photo }
@@ -18,10 +19,11 @@ export type ShareResult =
   | { status: 'failed'; message: string }
   | { status: 'unauthenticated' }
 
-function photosUrl({ cursor, limit }: PageRequest): string {
+function photosUrl({ cursor, limit, collectionId }: PageRequest): string {
   const params = new URLSearchParams()
   if (cursor !== undefined) params.set('cursor', cursor)
   if (limit !== undefined) params.set('limit', String(limit))
+  if (collectionId !== undefined) params.set('collectionId', collectionId)
   const query = params.toString()
   return query === '' ? '/api/photos' : `/api/photos?${query}`
 }
@@ -70,13 +72,14 @@ export async function fetchAllPhotos(onUnauthenticated: () => void): Promise<Pho
 // soon as one page fails.
 export async function fetchNewestPhotos(
   count: number,
+  collectionId: string | undefined,
   onUnauthenticated: () => void,
 ): Promise<PhotoPage | null> {
   const photos: Photo[] = []
   let cursor: string | undefined
   while (photos.length < count) {
     const limit = Math.min(count - photos.length, MAX_PAGE_SIZE)
-    const page = await fetchPhotoPage({ cursor, limit }, onUnauthenticated)
+    const page = await fetchPhotoPage({ cursor, limit, collectionId }, onUnauthenticated)
     if (page === null) return null
     photos.push(...page.photos)
     // An empty page with a cursor would ask for the same page forever.
diff --git a/client/src/viewerHistory.ts b/client/src/viewerHistory.ts
index 5049bc2..6dd8ebd 100644
--- a/client/src/viewerHistory.ts
+++ b/client/src/viewerHistory.ts
@@ -1,6 +1,9 @@
 // The search parameter that names the open photo: /?photo=<id> on the library, /frame?photo=<id>.
 export const PHOTO_PARAM = 'photo'
 
+// The search parameter that narrows the library to one collection: /?collection=<id>.
+export const COLLECTION_PARAM = 'collection'
+
 // The search parameter that plays a radio on the frame: /frame?radio=<id of its first photo>.
 export const RADIO_PARAM = 'radio'
 
@@ -22,6 +25,20 @@ export function photoPath(page: PhotoPage, photoId: string): string {
   return `${page}?${new URLSearchParams({ [PHOTO_PARAM]: photoId })}`
 }
 
+// The library, whole or narrowed to one collection.
+export function libraryPath(collectionId: string | null): string {
+  if (collectionId === null) return '/'
+  return `/?${new URLSearchParams({ [COLLECTION_PARAM]: collectionId })}`
+}
+
+// A copy with the open photo changed: the other parameters, such as the collection, stay.
+export function withPhotoParam(params: URLSearchParams, photoId: string | null): URLSearchParams {
+  const nextParams = new URLSearchParams(params)
+  if (photoId === null) nextParams.delete(PHOTO_PARAM)
+  else nextParams.set(PHOTO_PARAM, photoId)
+  return nextParams
+}
+
 export function radioPath(photoId: string): string {
   return `/frame?${new URLSearchParams({ [RADIO_PARAM]: photoId })}`
 }
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index 523c717..b6f00a7 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -63,6 +63,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 - Ouvrir le menu « … » d'une photo pour lancer sa radio sur le cadre (voir [cadre.md](cadre.md#radio)), l'envoyer à un ami, la ranger dans ses collections (voir [collections.md](collections.md#ranger-ses-photos-dans-une-collection)) ou la supprimer.
 - Lancer le mode cadre, en plein écran, depuis la bibliothèque, ou depuis une photo ouverte pour que le diaporama commence par elle (voir [cadre.md](cadre.md)).
 - Découvrir les photos envoyées par ses proches depuis l'annonce placée sous l'en-tête (voir [partage.md](partage.md#recevoir-une-photo)).
+- N'afficher que les photos d'une collection, depuis la rangée « Toutes », « Noël », « Les vacances »… placée sous l'annonce (voir [collections.md](collections.md#parcourir-une-collection)).
 - Gérer ses collections dans la carte « Mes collections » (voir [collections.md](collections.md)).
 
 **Règles**
@@ -84,7 +85,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 15. R-BIB-40 · Le bouton retour du téléphone ferme la photo.
 16. R-BIB-41 · Un lien vers une photo qui n'existe plus ramène simplement à la bibliothèque.
 17. R-BIB-45 · La bibliothèque ne propose ni la gestion des amis ni les invitations : « Amis » et, pour l'administrateur, « Invitations » sont dans le menu (barre du haut, ou ☰ sur un téléphone).
-18. R-BIB-46 · Le nombre de photos s'affiche sous le titre (« 12 photos ») ; « Plus de 30 photos » tant que des photos plus anciennes ne sont pas encore chargées.
+18. R-BIB-46 · Le nombre de photos s'affiche sous le titre (« 12 photos ») ; « Plus de 30 photos » tant que des photos plus anciennes ne sont pas encore chargées. Dans une collection, il compte les photos de cette collection.
 19. R-BIB-47 · Une bibliothèque vide propose « Ajouter une photo », qui ouvre le même panneau que « Ajouter ».
 20. R-BIB-42 · La bibliothèque se met à jour seule, sans recharger la page : une photo ajoutée depuis un autre appareil apparaît en tête, une photo reçue y entre à sa date de réception dès qu'elle est découverte (sur cet appareil ou un autre), une photo supprimée disparaît.
 
@@ -102,7 +103,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 
 **Ce qui n'est pas possible**
 
-- Trier ou filtrer les photos (par date, par expéditeur…), ou les rechercher.
+- Trier les photos, les filtrer autrement que par collection (par date, par expéditeur…), ou les rechercher.
 - Ranger les photos dans des albums : les collections en tiennent lieu (voir [collections.md](collections.md)).
 - Voir la bibliothèque d'un autre membre.
 
diff --git a/docs/produit/collections.md b/docs/produit/collections.md
index 56a962f..3c632c4 100644
--- a/docs/produit/collections.md
+++ b/docs/produit/collections.md
@@ -76,4 +76,33 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 
 - Ranger plusieurs photos d'un coup.
 - Changer l'ordre des photos dans une collection.
-- Voir les photos d'une collection ailleurs que sur le cadre.
+
+## Parcourir une collection
+
+**Ce que l'on peut faire**
+
+- Dans la bibliothèque, choisir une collection dans la rangée placée sous l'annonce des photos reçues : seules ses photos s'affichent, sous son nom.
+- Revenir à toutes les photos avec « Toutes », au début de la rangée.
+- Ouvrir une photo de la collection en grand et passer d'une photo à l'autre sans sortir de la collection.
+
+**Règles**
+
+1. R-COL-15 · La rangée propose « Toutes » puis chaque collection, par ordre alphabétique (R-COL-03). Le choix en cours est mis en avant. Quand elle dépasse la largeur de l'écran, elle défile de côté ; le reste de la page ne bouge pas.
+2. R-COL-16 · Une collection affiche ses photos dans le même ordre que la bibliothèque (R-BIB-20), 30 à la fois avec « Charger plus ».
+3. R-COL-17 · La collection choisie fait partie de l'adresse de la page : recharger la page, revenir en arrière ou ouvrir un lien enregistré montre la même collection.
+4. R-COL-18 · Une photo ouverte en grand depuis une collection fait défiler les seules photos de cette collection ; la fermer ramène dans la collection.
+5. R-COL-19 · Une collection vide le dit et explique comment y ranger des photos.
+6. R-COL-20 · Une collection supprimée, sur cet appareil ou un autre, ou un lien vers une collection qui n'existe pas affiche « Cette collection n'existe plus. » et propose « Voir toutes les photos ».
+7. R-COL-21 · La collection affichée suit les changements sans recharger la page : une photo rangée ou retirée, sur cet appareil ou un autre, y apparaît ou en disparaît. Une photo ajoutée pendant qu'une collection est affichée n'y entre pas : elle rejoint « Toutes ».
+
+**Messages affichés**
+
+| Situation                | Message                                                                                           |
+| ------------------------ | ------------------------------------------------------------------------------------------------- |
+| Collection vide          | « Cette collection est vide. » — « Rangez-y des photos depuis leur menu « … », dans « Toutes ». » |
+| Collection introuvable   | « Cette collection n'existe plus. » et le bouton « Voir toutes les photos »                       |
+| Collections non chargées | « Cette collection n'a pas pu être chargée. » et le bouton « Voir toutes les photos »             |
+
+**Ce qui n'est pas possible**
+
+- Afficher plusieurs collections à la fois, ou les photos qui ne sont dans aucune collection.
~~~~

### Task 4: Manage collections from the chip row

**Commit:** `feat(client): manage collections from the chip row`

**Scope:** ⋯ menu on the shown collection, « Nouvelle collection » chip, `CollectionsCard` and `CollectionRow` removed. Product docs: R-COL-04, -05, -13 amended, R-COL-20 edited in place.

**Gate:** `pnpm check`, `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 7e9d5e8..89450a6 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -43,15 +43,15 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 
 ## Pages
 
-| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
-| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
-| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
-| `/`                  | bibliothèque, consacrée aux photos (les amis sont sur `/friends`) : en tête « Bibliothèque », le nombre de photos (« Plus de N photos » tant que des pages restent), « Ajouter », « Mode cadre » et le choix vignettes/liste (`LibraryHeader`) ; « Ajouter » ouvre le panneau « Ajouter une photo » (`AddPhotoPanel`, feuille par le bas sur mobile, fenêtre au centre sur ordinateur, comme le panneau d'envoi : `ResponsivePanel`) : « Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui ferme le panneau et ouvre celui de l'envoi, pour l'ami seulement ; puis, quand des photos reçues attendent, l'annonce compacte « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis « Mes collections » (`components/collections/` : « Nouvelle collection », une ligne par collection avec son nombre de photos et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer »), puis la rangée de collections « Toutes », « Noël »… (`CollectionChips`, des liens `/?collection=<id>` qui défilent de côté : retour et rechargement gardent la collection ; `useSelectedCollection` la retrouve dans la liste, « Cette collection n'existe plus. » sinon), puis les photos du compte ou de la collection choisie (`usePhotoLibrary` passe `collectionId` à `GET /api/photos` et recharge la collection sur `collections:changed`) en vignettes ou en liste (choix mémorisé par appareil ; vide : « Ajouter une photo »), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/` ; `collection` reste dans l'adresse et la visionneuse ne parcourt que les photos affichées) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Lancer la radio », « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
-| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour, d'une de ses collections ou d'une radio (`/frame?radio=<id>`), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; tant qu'une radio joue, « Photos » la montre en tête, cochée (« Radio ») ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
-| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
-| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
-| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
+| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
+| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
+| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
+| `/`                  | bibliothèque, consacrée aux photos (les amis sont sur `/friends`) : en tête « Bibliothèque », le nombre de photos (« Plus de N photos » tant que des pages restent), « Ajouter », « Mode cadre » et le choix vignettes/liste (`LibraryHeader`) ; « Ajouter » ouvre le panneau « Ajouter une photo » (`AddPhotoPanel`, feuille par le bas sur mobile, fenêtre au centre sur ordinateur, comme le panneau d'envoi : `ResponsivePanel`) : « Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui ferme le panneau et ouvre celui de l'envoi, pour l'ami seulement ; puis, quand des photos reçues attendent, l'annonce compacte « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la rangée de collections « Toutes », « Noël »…, « Nouvelle collection » (`components/collections/CollectionChips`, des liens `/?collection=<id>` qui défilent de côté : retour et rechargement gardent la collection ; `useSelectedCollection` la retrouve dans la liste, « Cette collection n'existe plus. » sinon ; la collection affichée a son nom et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer » (`SelectedCollectionBar`, retour à `/` après suppression)), puis les photos du compte ou de la collection choisie (`usePhotoLibrary` passe `collectionId` à `GET /api/photos` et recharge la collection sur `collections:changed`) en vignettes ou en liste (choix mémorisé par appareil ; vide : « Ajouter une photo »), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/` ; `collection` reste dans l'adresse et la visionneuse ne parcourt que les photos affichées) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Lancer la radio », « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
+| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour, d'une de ses collections ou d'une radio (`/frame?radio=<id>`), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; tant qu'une radio joue, « Photos » la montre en tête, cochée (« Radio ») ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
+| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
+| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
+| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
 
 Visionneuse : l'adresse `/?photo=<id>` ouvre la photo, un lien la partage. Ouvrir depuis la bibliothèque ajoute une entrée d'historique, passer d'une photo à l'autre la remplace, et fermer revient en arrière : le bouton retour d'Android ferme la visionneuse. Près de la fin des photos chargées, la page suivante se charge. Une photo supprimée pendant qu'on la regarde laisse sa place à la suivante (la précédente si c'était la plus ancienne), et la visionneuse se ferme quand il n'en reste aucune ; un lien vers une photo inconnue charge les pages jusqu'à la trouver, puis ferme s'il n'y en a plus. « Mode cadre » remplace l'entrée de la visionneuse (ou s'ajoute au-dessus de la bibliothèque depuis son en-tête) : quitter le cadre ramène une seule visionneuse, et le retour arrière la bibliothèque. Le lien « Cadre » de la barre ajoute une entrée d'historique ordinaire : c'est aussi l'adresse qu'un cadre ouvre au démarrage.
 
diff --git a/client/src/components/collections/CollectionChips.tsx b/client/src/components/collections/CollectionChips.tsx
index 93e29e8..ba804d0 100644
--- a/client/src/components/collections/CollectionChips.tsx
+++ b/client/src/components/collections/CollectionChips.tsx
@@ -1,6 +1,8 @@
-import { type JSX, useEffect, useRef } from 'react'
-import { Link } from 'react-router'
+import { PlusIcon } from 'lucide-react'
+import { type JSX, useEffect, useRef, useState } from 'react'
+import { Link, useNavigate } from 'react-router'
 import { useCollections } from '@/collections/CollectionsContext.ts'
+import { CollectionNameDialog } from '@/components/collections/CollectionNameDialog.tsx'
 import { cn } from '@/lib/utils.ts'
 import { libraryPath } from '@/viewerHistory.ts'
 
@@ -35,6 +37,25 @@ function ChipLink({ collectionId, isSelected, label }: ChipLinkProps): JSX.Eleme
   )
 }
 
+// The new collection opens at once: it is empty, its notice tells how to fill it.
+function NewCollectionChip(): JSX.Element {
+  const [isCreating, setIsCreating] = useState(false)
+  const navigate = useNavigate()
+  return (
+    <>
+      <button type="button" className={CHIP_CLASSES} onClick={() => setIsCreating(true)}>
+        <PlusIcon aria-hidden className="size-4" />
+        Nouvelle collection
+      </button>
+      <CollectionNameDialog
+        target={isCreating ? { kind: 'create' } : null}
+        onClose={() => setIsCreating(false)}
+        onSaved={(collection) => navigate(libraryPath(collection.id))}
+      />
+    </>
+  )
+}
+
 // Only this row scrolls sideways; it reaches the screen edges so a cut chip says « more ».
 export function CollectionChips({ selectedId }: CollectionChipsProps): JSX.Element {
   const { collections, status } = useCollections()
@@ -54,6 +75,9 @@ export function CollectionChips({ selectedId }: CollectionChipsProps): JSX.Eleme
             Vos collections n'ont pas pu être chargées.
           </li>
         )}
+        <li>
+          <NewCollectionChip />
+        </li>
       </ul>
     </nav>
   )
diff --git a/client/src/components/collections/CollectionRow.tsx b/client/src/components/collections/CollectionRow.tsx
deleted file mode 100644
index 6bdaf6f..0000000
--- a/client/src/components/collections/CollectionRow.tsx
+++ /dev/null
@@ -1,143 +0,0 @@
-import { EllipsisIcon, MonitorIcon, PencilIcon, Trash2Icon } from 'lucide-react'
-import { type JSX, type RefObject, useRef, useState } from 'react'
-import { useNavigate } from 'react-router'
-import { toast } from 'sonner'
-import type { Collection } from '@/collections/collection.ts'
-import { CollectionNameDialog } from '@/components/collections/CollectionNameDialog.tsx'
-import { DeleteCollectionDialog } from '@/components/collections/DeleteCollectionDialog.tsx'
-import { Button } from '@/components/ui/button.tsx'
-import {
-  DropdownMenu,
-  DropdownMenuContent,
-  DropdownMenuItem,
-  DropdownMenuTrigger,
-} from '@/components/ui/dropdown-menu.tsx'
-import { type FrameSettings, readFrameSettings, writeFrameSettings } from '@/frameSettings.ts'
-import { enterFullscreen } from '@/fullscreen.ts'
-import { LIBRARY_BELOW_STATE } from '@/viewerHistory.ts'
-
-type RowDialog = 'rename' | 'delete' | null
-
-const UNSAVED_SOURCE_MESSAGE =
-  'Cet appareil ne peut pas retenir ce choix. Choisissez la collection depuis le menu « … » du cadre.'
-
-type CollectionRowProps = { collection: Collection; onDeleted: () => void }
-
-type CollectionMenuProps = {
-  name: string
-  onSelect: (dialog: RowDialog) => void
-  onPlay: () => void
-  triggerRef: RefObject<HTMLButtonElement | null>
-}
-
-type RowDialogsProps = {
-  collection: Collection
-  onDeleted: () => void
-  dialog: RowDialog
-  onClose: () => void
-  triggerRef: RefObject<HTMLButtonElement | null>
-}
-
-function photoCountLabel(count: number): string {
-  if (count === 0) return 'Aucune photo'
-  return count === 1 ? '1 photo' : `${count} photos`
-}
-
-// The frame reads its settings as it opens: the choice is stored first. A device that cannot store
-// it would open the frame on its old photos, so the frame stays closed. Full screen comes from the
-// click itself, browsers grant it only during a gesture.
-function usePlayOnFrame(collectionId: string): () => void {
-  const navigate = useNavigate()
-  return () => {
-    const settings: FrameSettings = {
-      ...readFrameSettings(),
-      source: { kind: 'collection', collectionId },
-    }
-    if (!writeFrameSettings(settings)) {
-      toast.error(UNSAVED_SOURCE_MESSAGE)
-      return
-    }
-    enterFullscreen()
-    navigate('/frame', { state: LIBRARY_BELOW_STATE })
-  }
-}
-
-function CollectionMenu({ name, onSelect, onPlay, triggerRef }: CollectionMenuProps): JSX.Element {
-  return (
-    <DropdownMenu>
-      <DropdownMenuTrigger asChild>
-        <Button ref={triggerRef} variant="ghost" size="icon" aria-label={`Actions pour ${name}`}>
-          <EllipsisIcon />
-        </Button>
-      </DropdownMenuTrigger>
-      <DropdownMenuContent align="end">
-        <DropdownMenuItem onSelect={onPlay}>
-          <MonitorIcon />
-          Lire sur le cadre
-        </DropdownMenuItem>
-        <DropdownMenuItem onSelect={() => onSelect('rename')}>
-          <PencilIcon />
-          Renommer
-        </DropdownMenuItem>
-        <DropdownMenuItem variant="destructive" onSelect={() => onSelect('delete')}>
-          <Trash2Icon />
-          Supprimer
-        </DropdownMenuItem>
-      </DropdownMenuContent>
-    </DropdownMenu>
-  )
-}
-
-// Outside the menu: closing the menu must not unmount the dialogs.
-function RowDialogs({ collection, dialog, onClose, ...props }: RowDialogsProps): JSX.Element {
-  // Radix would focus the menu item that opened the dialog, gone by now: focus would fall to body.
-  function focusTrigger(event: Event): void {
-    event.preventDefault()
-    props.triggerRef.current?.focus()
-  }
-  return (
-    <>
-      <CollectionNameDialog
-        target={dialog === 'rename' ? { kind: 'rename', collection } : null}
-        onClose={onClose}
-        onCloseAutoFocus={focusTrigger}
-      />
-      <DeleteCollectionDialog
-        collection={dialog === 'delete' ? collection : null}
-        onClose={onClose}
-        onCloseAutoFocus={focusTrigger}
-        onDeleted={props.onDeleted}
-      />
-    </>
-  )
-}
-
-export function CollectionRow({ collection, onDeleted }: CollectionRowProps): JSX.Element {
-  const [dialog, setDialog] = useState<RowDialog>(null)
-  const triggerRef = useRef<HTMLButtonElement>(null)
-  const playOnFrame = usePlayOnFrame(collection.id)
-
-  return (
-    <li className="flex items-center justify-between gap-3 px-4 py-3">
-      <div className="flex min-w-0 flex-col">
-        <span className="font-medium wrap-anywhere">{collection.name}</span>
-        <span className="text-sm text-muted-foreground">
-          {photoCountLabel(collection.photoIds.length)}
-        </span>
-      </div>
-      <CollectionMenu
-        name={collection.name}
-        onSelect={setDialog}
-        onPlay={playOnFrame}
-        triggerRef={triggerRef}
-      />
-      <RowDialogs
-        collection={collection}
-        onDeleted={onDeleted}
-        dialog={dialog}
-        onClose={() => setDialog(null)}
-        triggerRef={triggerRef}
-      />
-    </li>
-  )
-}
diff --git a/client/src/components/collections/CollectionsCard.tsx b/client/src/components/collections/CollectionsCard.tsx
deleted file mode 100644
index b913af1..0000000
--- a/client/src/components/collections/CollectionsCard.tsx
+++ /dev/null
@@ -1,66 +0,0 @@
-import { PlusIcon } from 'lucide-react'
-import { type JSX, useRef, useState } from 'react'
-import { useCollections } from '@/collections/CollectionsContext.ts'
-import {
-  CollectionNameDialog,
-  type NameDialogTarget,
-} from '@/components/collections/CollectionNameDialog.tsx'
-import { CollectionRow } from '@/components/collections/CollectionRow.tsx'
-import { Button } from '@/components/ui/button.tsx'
-import {
-  Card,
-  CardAction,
-  CardContent,
-  CardDescription,
-  CardHeader,
-  CardTitle,
-} from '@/components/ui/card.tsx'
-
-function CollectionsList({ onDeleted }: { onDeleted: () => void }): JSX.Element {
-  const { collections, status } = useCollections()
-  if (status === 'loading') return <p className="text-muted-foreground">Chargement…</p>
-  if (status === 'failed') {
-    return <p className="text-muted-foreground">Vos collections n'ont pas pu être chargées.</p>
-  }
-  if (collections.length === 0) {
-    return <p className="text-muted-foreground">Aucune collection pour l'instant.</p>
-  }
-  return (
-    <ul className="-mx-4 divide-y">
-      {collections.map((collection) => (
-        <CollectionRow key={collection.id} collection={collection} onDeleted={onDeleted} />
-      ))}
-    </ul>
-  )
-}
-
-export function CollectionsCard(): JSX.Element {
-  const [createTarget, setCreateTarget] = useState<NameDialogTarget | null>(null)
-  // A deleted row takes its menu button along: focus goes to the card's own button.
-  const newButtonRef = useRef<HTMLButtonElement>(null)
-
-  return (
-    <Card className="w-full">
-      <CardHeader>
-        <CardTitle className="text-xl">Mes collections</CardTitle>
-        <CardDescription>
-          Rangez vos photos par thème : Noël, les vacances, le jardin…
-        </CardDescription>
-        <CardAction>
-          <Button
-            ref={newButtonRef}
-            variant="outline"
-            onClick={() => setCreateTarget({ kind: 'create' })}
-          >
-            <PlusIcon aria-hidden data-icon="inline-start" />
-            Nouvelle collection
-          </Button>
-        </CardAction>
-      </CardHeader>
-      <CardContent>
-        <CollectionsList onDeleted={() => newButtonRef.current?.focus()} />
-      </CardContent>
-      <CollectionNameDialog target={createTarget} onClose={() => setCreateTarget(null)} />
-    </Card>
-  )
-}
diff --git a/client/src/components/collections/SelectedCollectionBar.tsx b/client/src/components/collections/SelectedCollectionBar.tsx
index 66f4a32..328968b 100644
--- a/client/src/components/collections/SelectedCollectionBar.tsx
+++ b/client/src/components/collections/SelectedCollectionBar.tsx
@@ -1,10 +1,151 @@
-import type { JSX } from 'react'
+import { EllipsisIcon, MonitorIcon, PencilIcon, Trash2Icon } from 'lucide-react'
+import { type JSX, type RefObject, useRef, useState } from 'react'
+import { useNavigate } from 'react-router'
+import { toast } from 'sonner'
 import type { Collection } from '@/collections/collection.ts'
+import { CollectionNameDialog } from '@/components/collections/CollectionNameDialog.tsx'
+import { DeleteCollectionDialog } from '@/components/collections/DeleteCollectionDialog.tsx'
+import { Button } from '@/components/ui/button.tsx'
+import {
+  DropdownMenu,
+  DropdownMenuContent,
+  DropdownMenuItem,
+  DropdownMenuTrigger,
+} from '@/components/ui/dropdown-menu.tsx'
+import { type FrameSettings, readFrameSettings, writeFrameSettings } from '@/frameSettings.ts'
+import { enterFullscreen } from '@/fullscreen.ts'
+import { LIBRARY_BELOW_STATE } from '@/viewerHistory.ts'
 
+type BarDialog = 'rename' | 'delete' | null
+
+const UNSAVED_SOURCE_MESSAGE =
+  'Cet appareil ne peut pas retenir ce choix. Choisissez la collection depuis le menu « … » du cadre.'
+
+type CollectionMenuItemsProps = {
+  onSelect: (dialog: BarDialog) => void
+  onPlay: () => void
+}
+
+type CollectionMenuProps = CollectionMenuItemsProps & {
+  name: string
+  triggerRef: RefObject<HTMLButtonElement | null>
+}
+
+type BarDialogsProps = {
+  collection: Collection
+  onDeleted: () => void
+  dialog: BarDialog
+  onClose: () => void
+  triggerRef: RefObject<HTMLButtonElement | null>
+}
+
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
+function CollectionMenuItems({ onSelect, onPlay }: CollectionMenuItemsProps): JSX.Element {
+  return (
+    <>
+      <DropdownMenuItem onSelect={onPlay}>
+        <MonitorIcon />
+        Lire sur le cadre
+      </DropdownMenuItem>
+      <DropdownMenuItem onSelect={() => onSelect('rename')}>
+        <PencilIcon />
+        Renommer
+      </DropdownMenuItem>
+      <DropdownMenuItem variant="destructive" onSelect={() => onSelect('delete')}>
+        <Trash2Icon />
+        Supprimer
+      </DropdownMenuItem>
+    </>
+  )
+}
+
+function CollectionMenu({ name, onSelect, onPlay, triggerRef }: CollectionMenuProps): JSX.Element {
+  return (
+    <DropdownMenu>
+      <DropdownMenuTrigger asChild>
+        <Button
+          ref={triggerRef}
+          variant="ghost"
+          size="icon"
+          className="pointer-coarse:size-11"
+          aria-label={`Actions pour ${name}`}
+        >
+          <EllipsisIcon />
+        </Button>
+      </DropdownMenuTrigger>
+      {/* Start: the button follows the name, at the left of the page. */}
+      <DropdownMenuContent align="start">
+        <CollectionMenuItems onSelect={onSelect} onPlay={onPlay} />
+      </DropdownMenuContent>
+    </DropdownMenu>
+  )
+}
+
+// Outside the menu: closing the menu must not unmount the dialogs.
+function BarDialogs({ collection, dialog, onClose, ...props }: BarDialogsProps): JSX.Element {
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
+// Replace on deletion: back must not return to a collection that no longer exists.
 export function SelectedCollectionBar({ collection }: { collection: Collection }): JSX.Element {
+  const [dialog, setDialog] = useState<BarDialog>(null)
+  const triggerRef = useRef<HTMLButtonElement>(null)
+  const playOnFrame = usePlayOnFrame(collection.id)
+  const navigate = useNavigate()
+
   return (
     <div className="flex min-w-0 items-center gap-2">
       <h2 className="text-lg font-medium wrap-anywhere">{collection.name}</h2>
+      <CollectionMenu
+        name={collection.name}
+        onSelect={setDialog}
+        onPlay={playOnFrame}
+        triggerRef={triggerRef}
+      />
+      <BarDialogs
+        collection={collection}
+        onDeleted={() => navigate('/', { replace: true })}
+        dialog={dialog}
+        onClose={() => setDialog(null)}
+        triggerRef={triggerRef}
+      />
     </div>
   )
 }
diff --git a/client/src/pages/LibraryPage.tsx b/client/src/pages/LibraryPage.tsx
index 454386a..e484d0a 100644
--- a/client/src/pages/LibraryPage.tsx
+++ b/client/src/pages/LibraryPage.tsx
@@ -1,6 +1,5 @@
 import { type JSX, useState } from 'react'
 import { CollectionChips } from '@/components/collections/CollectionChips.tsx'
-import { CollectionsCard } from '@/components/collections/CollectionsCard.tsx'
 import { SelectedCollectionBar } from '@/components/collections/SelectedCollectionBar.tsx'
 import { AddPhotoPanel } from '@/components/library/AddPhotoPanel.tsx'
 import { LibraryHeader } from '@/components/library/LibraryHeader.tsx'
@@ -64,7 +63,6 @@ function LibraryContent(props: LibraryContentProps): JSX.Element {
       <LibraryHeader library={library} layout={layout} onLayoutChange={setLayout} onAdd={onAdd} />
       {/* Above the photos: news from the family comes first. */}
       <LibraryMail />
-      <CollectionsCard />
       <CollectionChips selectedId={selectedCollectionId(selected)} />
       {selected.status === 'found' && <SelectedCollectionBar collection={selected.collection} />}
       <LibraryBody {...props} layout={layout} />
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index b6f00a7..e645786 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -64,7 +64,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 - Lancer le mode cadre, en plein écran, depuis la bibliothèque, ou depuis une photo ouverte pour que le diaporama commence par elle (voir [cadre.md](cadre.md)).
 - Découvrir les photos envoyées par ses proches depuis l'annonce placée sous l'en-tête (voir [partage.md](partage.md#recevoir-une-photo)).
 - N'afficher que les photos d'une collection, depuis la rangée « Toutes », « Noël », « Les vacances »… placée sous l'annonce (voir [collections.md](collections.md#parcourir-une-collection)).
-- Gérer ses collections dans la carte « Mes collections » (voir [collections.md](collections.md)).
+- Créer une collection au bout de cette rangée, et renommer, supprimer ou lire sur le cadre la collection affichée (voir [collections.md](collections.md)).
 
 **Règles**
 
diff --git a/docs/produit/cadre.md b/docs/produit/cadre.md
index c28121b..d3e0bb1 100644
--- a/docs/produit/cadre.md
+++ b/docs/produit/cadre.md
@@ -126,7 +126,7 @@ Le cadre n'a plus de vue bibliothèque : voir R-CAD-53. Les règles ci-dessous g
 
 - Dans le menu « … » du diaporama, « Photos », choisir « Toute la bibliothèque », « Sélection du jour » (voir [Sélection du jour](#sélection-du-jour)) ou l'une de ses collections.
 - Faire ce choix depuis la page « Préférences », encart « Cadre de cet appareil » (voir [preferences.md](preferences.md#cadre-de-cet-appareil)).
-- Depuis la carte « Mes collections » de la bibliothèque, choisir « Lire sur le cadre » dans le menu « … » d'une collection : le cadre s'ouvre en plein écran sur elle (voir [collections.md](collections.md)).
+- Depuis la bibliothèque, afficher une collection et choisir « Lire sur le cadre » dans le menu « … » placé à côté de son nom : le cadre s'ouvre en plein écran sur elle (voir [collections.md](collections.md)).
 
 **Règles**
 
diff --git a/docs/produit/collections.md b/docs/produit/collections.md
index 3c632c4..7bea91f 100644
--- a/docs/produit/collections.md
+++ b/docs/produit/collections.md
@@ -6,17 +6,17 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 
 **Ce que l'on peut faire**
 
-- Dans la carte « Mes collections » de la bibliothèque, créer une collection avec « Nouvelle collection ».
-- Voir ses collections, chacune avec son nom et son nombre de photos.
-- Depuis le menu « … » d'une collection, la lire sur le cadre de cet appareil, la renommer ou la supprimer.
+- Voir ses collections dans la rangée placée en haut de la bibliothèque, sous l'annonce des photos reçues (voir [Parcourir une collection](#parcourir-une-collection)).
+- Créer une collection avec « Nouvelle collection », au bout de cette rangée.
+- Depuis le menu « … » placé à côté du nom de la collection affichée, la lire sur le cadre de cet appareil, la renommer ou la supprimer.
 
 **Règles**
 
 1. R-COL-01 · Un nom fait de 1 à 50 caractères ; les espaces au début et à la fin ne comptent pas.
 2. R-COL-02 · Deux collections d'un même compte ne portent pas le même nom. Les majuscules et les accents comptent : « noël » et « Noël » sont deux noms différents. Renommer une collection sous le nom qu'elle porte déjà est permis.
 3. R-COL-03 · Les collections sont classées par ordre alphabétique (« Été » avant « Noël »).
-4. R-COL-04 · Une collection créée depuis la carte « Mes collections » est vide ; créée depuis le menu « … » d'une photo, elle contient cette photo.
-5. R-COL-05 · Supprimer une collection demande une confirmation ; « Annuler » ferme la fenêtre sans rien changer. Ses photos restent dans la bibliothèque ; un cadre qui la lisait repasse à toute la bibliothèque (R-CAD-81).
+4. R-COL-04 · Une collection créée depuis « Nouvelle collection », au bout de la rangée des collections, est vide et s'affiche aussitôt ; créée depuis le menu « … » d'une photo, elle contient cette photo.
+5. R-COL-05 · Supprimer une collection demande une confirmation ; « Annuler » ferme la fenêtre sans rien changer. Ses photos restent dans la bibliothèque ; un cadre qui la lisait repasse à toute la bibliothèque (R-CAD-81). Supprimer la collection affichée ramène à « Toutes ».
 6. R-COL-06 · Une collection créée, renommée ou supprimée l'est aussitôt sur tous les appareils connectés au compte, sans recharger la page.
 7. R-COL-07 · Les collections sont privées : personne d'autre ne les voit, pas même les amis.
 8. R-COL-14 · « Lire sur le cadre » ouvre le cadre en plein écran sur cette collection ; l'appareil retient ce choix (voir [cadre.md](cadre.md#choisir-les-photos-du-cadre), R-CAD-77). Si l'appareil ne peut rien retenir (navigateur qui bloque les données des sites), le cadre ne s'ouvre pas : un message invite à choisir la collection depuis le menu « … » du cadre.
@@ -25,11 +25,8 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 
 | Situation                       | Message                                                                                                                                                                               |
 | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| En-tête de la carte             | « Mes collections » — « Rangez vos photos par thème : Noël, les vacances, le jardin… » et le bouton « Nouvelle collection »                                                           |
-| Aucune collection               | « Aucune collection pour l'instant. »                                                                                                                                                 |
-| Chargement                      | « Chargement… »                                                                                                                                                                       |
+| Rangée des collections          | « Toutes », le nom de chaque collection, puis « Nouvelle collection »                                                                                                                 |
 | Chargement impossible           | « Vos collections n'ont pas pu être chargées. »                                                                                                                                       |
-| Nombre de photos                | « Aucune photo », « 1 photo », « 12 photos »                                                                                                                                          |
 | Création                        | « Nouvelle collection » — « Donnez-lui un nom, puis rangez-y vos photos depuis leur menu « … ». » Champ « Nom de la collection », bouton « Créer »                                    |
 | Renommage                       | « Renommer la collection » — « Le nouveau nom s'affiche partout, sur tous vos appareils. » Champ « Nom de la collection », bouton « Renommer »                                        |
 | Enregistrement en cours         | « Enregistrement… »                                                                                                                                                                   |
@@ -53,7 +50,7 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 - Dans le menu « … » d'une photo (bibliothèque, photo ouverte en grand ou diaporama), ouvrir « Collections » : une case par collection, cochée quand la photo y est.
 - Cocher une case pour ranger la photo dans cette collection, la décocher pour l'en retirer. Le menu reste ouvert : on peut cocher plusieurs cases à la suite.
 - Choisir « Nouvelle collection… » pour créer une collection et y ranger aussitôt la photo.
-- Faire passer une collection sur le cadre, en boucle ou en ordre aléatoire : « Lire sur le cadre » dans la carte « Mes collections », « Photos » dans le menu « … » du cadre ou dans les préférences (voir [cadre.md](cadre.md#choisir-les-photos-du-cadre)).
+- Faire passer une collection sur le cadre, en boucle ou en ordre aléatoire : « Lire sur le cadre » dans le menu « … » de la collection affichée, « Photos » dans le menu « … » du cadre ou dans les préférences (voir [cadre.md](cadre.md#choisir-les-photos-du-cadre)).
 
 **Règles**
 
@@ -62,7 +59,7 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 3. R-COL-10 · Une photo supprimée de la bibliothèque quitte toutes ses collections.
 4. R-COL-11 · Une photo reçue d'un proche ne peut être rangée qu'une fois découverte (voir [partage.md](partage.md#recevoir-une-photo)) ; avant, elle n'apparaît dans aucune collection.
 5. R-COL-12 · Seules les photos de sa propre bibliothèque peuvent être rangées dans ses collections.
-6. R-COL-13 · Une photo rangée ou retirée l'est aussitôt sur tous les appareils connectés au compte : les cases et le nombre de photos de chaque collection suivent.
+6. R-COL-13 · Une photo rangée ou retirée l'est aussitôt sur tous les appareils connectés au compte : les cases du menu « Collections » et la collection affichée suivent.
 
 **Messages affichés**
 
@@ -92,7 +89,7 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 3. R-COL-17 · La collection choisie fait partie de l'adresse de la page : recharger la page, revenir en arrière ou ouvrir un lien enregistré montre la même collection.
 4. R-COL-18 · Une photo ouverte en grand depuis une collection fait défiler les seules photos de cette collection ; la fermer ramène dans la collection.
 5. R-COL-19 · Une collection vide le dit et explique comment y ranger des photos.
-6. R-COL-20 · Une collection supprimée, sur cet appareil ou un autre, ou un lien vers une collection qui n'existe pas affiche « Cette collection n'existe plus. » et propose « Voir toutes les photos ».
+6. R-COL-20 · Une collection supprimée sur un autre appareil, ou un lien vers une collection qui n'existe pas affiche « Cette collection n'existe plus. » et propose « Voir toutes les photos ».
 7. R-COL-21 · La collection affichée suit les changements sans recharger la page : une photo rangée ou retirée, sur cet appareil ou un autre, y apparaît ou en disparaît. Une photo ajoutée pendant qu'une collection est affichée n'y entre pas : elle rejoint « Toutes ».
 
 **Messages affichés**
~~~~

### Task 5: File a photo added from a collection into it

**Commit:** `feat(client): file a photo added from a collection into it`

**Scope:** `useLibraryUpload`; empty collection offers « Ajouter une photo ». R-COL-19, -21 edited in place, R-BIB-12 amended.

**Gate:** `pnpm check`, `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 89450a6..3a2a620 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -43,15 +43,15 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 
 ## Pages
 
-| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
-| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
-| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
-| `/`                  | bibliothèque, consacrée aux photos (les amis sont sur `/friends`) : en tête « Bibliothèque », le nombre de photos (« Plus de N photos » tant que des pages restent), « Ajouter », « Mode cadre » et le choix vignettes/liste (`LibraryHeader`) ; « Ajouter » ouvre le panneau « Ajouter une photo » (`AddPhotoPanel`, feuille par le bas sur mobile, fenêtre au centre sur ordinateur, comme le panneau d'envoi : `ResponsivePanel`) : « Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui ferme le panneau et ouvre celui de l'envoi, pour l'ami seulement ; puis, quand des photos reçues attendent, l'annonce compacte « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la rangée de collections « Toutes », « Noël »…, « Nouvelle collection » (`components/collections/CollectionChips`, des liens `/?collection=<id>` qui défilent de côté : retour et rechargement gardent la collection ; `useSelectedCollection` la retrouve dans la liste, « Cette collection n'existe plus. » sinon ; la collection affichée a son nom et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer » (`SelectedCollectionBar`, retour à `/` après suppression)), puis les photos du compte ou de la collection choisie (`usePhotoLibrary` passe `collectionId` à `GET /api/photos` et recharge la collection sur `collections:changed`) en vignettes ou en liste (choix mémorisé par appareil ; vide : « Ajouter une photo »), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/` ; `collection` reste dans l'adresse et la visionneuse ne parcourt que les photos affichées) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Lancer la radio », « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
-| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour, d'une de ses collections ou d'une radio (`/frame?radio=<id>`), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; tant qu'une radio joue, « Photos » la montre en tête, cochée (« Radio ») ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
-| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
-| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
-| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
+| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
+| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
+| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
+| `/`                  | bibliothèque, consacrée aux photos (les amis sont sur `/friends`) : en tête « Bibliothèque », le nombre de photos (« Plus de N photos » tant que des pages restent), « Ajouter », « Mode cadre » et le choix vignettes/liste (`LibraryHeader`) ; « Ajouter » ouvre le panneau « Ajouter une photo » (`AddPhotoPanel`, feuille par le bas sur mobile, fenêtre au centre sur ordinateur, comme le panneau d'envoi : `ResponsivePanel`) : « Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui ferme le panneau et ouvre celui de l'envoi, pour l'ami seulement ; puis, quand des photos reçues attendent, l'annonce compacte « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la rangée de collections « Toutes », « Noël »…, « Nouvelle collection » (`components/collections/CollectionChips`, des liens `/?collection=<id>` qui défilent de côté : retour et rechargement gardent la collection ; `useSelectedCollection` la retrouve dans la liste, « Cette collection n'existe plus. » sinon ; la collection affichée a son nom et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer » (`SelectedCollectionBar`, retour à `/` après suppression)), puis les photos du compte ou de la collection choisie (`usePhotoLibrary` passe `collectionId` à `GET /api/photos` et recharge la collection sur `collections:changed` ; une photo ajoutée depuis une collection y est rangée, `useLibraryUpload`) en vignettes ou en liste (choix mémorisé par appareil ; vide : « Ajouter une photo »), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/` ; `collection` reste dans l'adresse et la visionneuse ne parcourt que les photos affichées) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Lancer la radio », « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
+| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour, d'une de ses collections ou d'une radio (`/frame?radio=<id>`), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; tant qu'une radio joue, « Photos » la montre en tête, cochée (« Radio ») ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
+| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
+| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
+| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
 
 Visionneuse : l'adresse `/?photo=<id>` ouvre la photo, un lien la partage. Ouvrir depuis la bibliothèque ajoute une entrée d'historique, passer d'une photo à l'autre la remplace, et fermer revient en arrière : le bouton retour d'Android ferme la visionneuse. Près de la fin des photos chargées, la page suivante se charge. Une photo supprimée pendant qu'on la regarde laisse sa place à la suivante (la précédente si c'était la plus ancienne), et la visionneuse se ferme quand il n'en reste aucune ; un lien vers une photo inconnue charge les pages jusqu'à la trouver, puis ferme s'il n'y en a plus. « Mode cadre » remplace l'entrée de la visionneuse (ou s'ajoute au-dessus de la bibliothèque depuis son en-tête) : quitter le cadre ramène une seule visionneuse, et le retour arrière la bibliothèque. Le lien « Cadre » de la barre ajoute une entrée d'historique ordinaire : c'est aussi l'adresse qu'un cadre ouvre au démarrage.
 
diff --git a/client/src/components/library/LibraryNotices.tsx b/client/src/components/library/LibraryNotices.tsx
index 3f85c55..e50974d 100644
--- a/client/src/components/library/LibraryNotices.tsx
+++ b/client/src/components/library/LibraryNotices.tsx
@@ -5,25 +5,34 @@ import { Button } from '@/components/ui/button.tsx'
 
 const NOTICE_CLASSES = 'flex flex-col items-center gap-4 px-6 py-16 text-center'
 
-export function EmptyLibrary({ onAdd }: { onAdd: () => void }): JSX.Element {
+type AddProps = { onAdd: () => void }
+
+function AddPhotoButton({ onAdd }: AddProps): JSX.Element {
+  return (
+    <Button size="lg" className="pointer-coarse:h-11" onClick={onAdd}>
+      <ImagePlusIcon aria-hidden data-icon="inline-start" />
+      Ajouter une photo
+    </Button>
+  )
+}
+
+export function EmptyLibrary({ onAdd }: AddProps): JSX.Element {
   return (
     <div className={NOTICE_CLASSES}>
       <p className="text-muted-foreground">Aucune photo pour l'instant.</p>
-      <Button size="lg" className="pointer-coarse:h-11" onClick={onAdd}>
-        <ImagePlusIcon aria-hidden data-icon="inline-start" />
-        Ajouter une photo
-      </Button>
+      <AddPhotoButton onAdd={onAdd} />
     </div>
   )
 }
 
-export function EmptyCollection(): JSX.Element {
+export function EmptyCollection({ onAdd }: AddProps): JSX.Element {
   return (
     <div className={NOTICE_CLASSES}>
       <p className="font-medium">Cette collection est vide.</p>
       <p className="max-w-xs text-sm text-muted-foreground">
-        Rangez-y des photos depuis leur menu « … », dans « Toutes ».
+        Ajoutez-y une photo, ou rangez-y celles de « Toutes » depuis leur menu « … ».
       </p>
+      <AddPhotoButton onAdd={onAdd} />
     </div>
   )
 }
diff --git a/client/src/hooks/useLibraryUpload.ts b/client/src/hooks/useLibraryUpload.ts
new file mode 100644
index 0000000..da166a7
--- /dev/null
+++ b/client/src/hooks/useLibraryUpload.ts
@@ -0,0 +1,22 @@
+import { toast } from 'sonner'
+import { useCollections } from '@/collections/CollectionsContext.ts'
+import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
+import type { SelectedCollection } from '@/hooks/useSelectedCollection.ts'
+import type { Photo } from '@/photo.ts'
+
+// Added while a collection is shown, the photo is filed there too: that is where it was wanted.
+// The collection's list then reloads on collections:changed, like any filing.
+export function useLibraryUpload(
+  selected: SelectedCollection,
+  library: PhotoLibrary,
+): (photo: Photo) => void {
+  const { addPhoto } = useCollections()
+  return async (photo) => {
+    library.addPhoto(photo)
+    if (selected.status !== 'found') return
+    const { id, name } = selected.collection
+    const result = await addPhoto(id, photo.id)
+    if (result.isSuccess) toast.success(`Photo ajoutée à « ${name} ».`)
+    else toast.error(result.message)
+  }
+}
diff --git a/client/src/hooks/usePhotoLibrary.ts b/client/src/hooks/usePhotoLibrary.ts
index c6ab32c..5a25cb7 100644
--- a/client/src/hooks/usePhotoLibrary.ts
+++ b/client/src/hooks/usePhotoLibrary.ts
@@ -163,7 +163,7 @@ function connectLibrary(
   }
 }
 
-// A new upload is in no collection yet: a collection's list leaves it out.
+// A collection's list waits for collections:changed: an upload enters it once filed there.
 function usePhotoAdder(
   liveLoads: LiveLoads,
   setPhotos: Dispatch<SetStateAction<Photo[]>>,
diff --git a/client/src/pages/LibraryPage.tsx b/client/src/pages/LibraryPage.tsx
index e484d0a..a78a06c 100644
--- a/client/src/pages/LibraryPage.tsx
+++ b/client/src/pages/LibraryPage.tsx
@@ -12,6 +12,7 @@ import { LibrarySection } from '@/components/library/LibrarySection.tsx'
 import { LibraryMail } from '@/components/mail/LibraryMail.tsx'
 import { PhotoViewer } from '@/components/viewer/PhotoViewer.tsx'
 import { type LibraryLayout, useLibraryLayout } from '@/hooks/useLibraryLayout.ts'
+import { useLibraryUpload } from '@/hooks/useLibraryUpload.ts'
 import { type PhotoLibrary, usePhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
 import {
   type SelectedCollection,
@@ -19,6 +20,7 @@ import {
   useSelectedCollection,
 } from '@/hooks/useSelectedCollection.ts'
 import { useViewerParam, type ViewerParam } from '@/hooks/useViewerParam.ts'
+import type { Photo } from '@/photo.ts'
 
 type LibraryContentProps = {
   selected: SelectedCollection
@@ -34,6 +36,7 @@ type LibraryOverlaysProps = {
   viewer: ViewerParam
   isAdding: boolean
   onAddClose: () => void
+  onUploaded: (photo: Photo) => void
 }
 
 function LibraryBody({ selected, library, layout, viewer, onAdd }: LibraryBodyProps): JSX.Element {
@@ -44,7 +47,7 @@ function LibraryBody({ selected, library, layout, viewer, onAdd }: LibraryBodyPr
     return <UnavailableCollection message="Cette collection n'a pas pu être chargée." />
   }
   const emptyState =
-    selected.status === 'all' ? <EmptyLibrary onAdd={onAdd} /> : <EmptyCollection />
+    selected.status === 'all' ? <EmptyLibrary onAdd={onAdd} /> : <EmptyCollection onAdd={onAdd} />
   return (
     <LibrarySection
       library={library}
@@ -76,10 +79,11 @@ function LibraryOverlays({
   viewer,
   isAdding,
   onAddClose,
+  onUploaded,
 }: LibraryOverlaysProps): JSX.Element {
   return (
     <>
-      <AddPhotoPanel isOpen={isAdding} onClose={onAddClose} onUploaded={library.addPhoto} />
+      <AddPhotoPanel isOpen={isAdding} onClose={onAddClose} onUploaded={onUploaded} />
       {viewer.openId !== null && (
         <PhotoViewer library={library} openId={viewer.openId} viewer={viewer} />
       )}
@@ -91,6 +95,7 @@ export default function LibraryPage(): JSX.Element {
   const selected = useSelectedCollection()
   const library = usePhotoLibrary(selectedCollectionId(selected))
   const viewer = useViewerParam()
+  const handleUploaded = useLibraryUpload(selected, library)
   const [isAdding, setIsAdding] = useState(false)
 
   return (
@@ -106,6 +111,7 @@ export default function LibraryPage(): JSX.Element {
         viewer={viewer}
         isAdding={isAdding}
         onAddClose={() => setIsAdding(false)}
+        onUploaded={handleUploaded}
       />
     </main>
   )
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index e645786..7cbf208 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -25,7 +25,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 10. R-BIB-09 · Les informations cachées de la photo, dont le lieu de prise de vue, sont retirées à l'ajout : elles ne sont jamais conservées ni montrées.
 11. R-BIB-10 · Une photo ajoutée porte la date et l'heure de son ajout. La date de prise de vue n'est pas utilisée.
 12. R-BIB-11 · Pendant l'envoi, les deux boutons sont désactivés et le premier affiche « Envoi… ».
-13. R-BIB-12 · Après un ajout réussi, le panneau se ferme, un message de réussite s'affiche, et la photo apparaît en tête de la bibliothèque et sur le cadre qui lit toute la bibliothèque, sur tous les appareils connectés au compte, sans recharger la page.
+13. R-BIB-12 · Après un ajout réussi, le panneau se ferme, un message de réussite s'affiche, et la photo apparaît en tête de la bibliothèque et sur le cadre qui lit toute la bibliothèque, sur tous les appareils connectés au compte, sans recharger la page. Ajoutée pendant qu'une collection est affichée, elle est aussi rangée dans cette collection (R-COL-21).
 14. R-BIB-13 · Après un échec, la photo reste choisie dans le panneau et un message explique la raison.
 15. R-BIB-44 · Fermer le panneau sans rien envoyer abandonne la photo choisie : il s'ouvre vide la fois suivante.
 
diff --git a/docs/produit/collections.md b/docs/produit/collections.md
index 7bea91f..1bd4aaa 100644
--- a/docs/produit/collections.md
+++ b/docs/produit/collections.md
@@ -81,6 +81,7 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 - Dans la bibliothèque, choisir une collection dans la rangée placée sous l'annonce des photos reçues : seules ses photos s'affichent, sous son nom.
 - Revenir à toutes les photos avec « Toutes », au début de la rangée.
 - Ouvrir une photo de la collection en grand et passer d'une photo à l'autre sans sortir de la collection.
+- Ajouter une photo avec « Ajouter » pendant qu'une collection est affichée : elle y est rangée aussitôt.
 
 **Règles**
 
@@ -88,17 +89,18 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 2. R-COL-16 · Une collection affiche ses photos dans le même ordre que la bibliothèque (R-BIB-20), 30 à la fois avec « Charger plus ».
 3. R-COL-17 · La collection choisie fait partie de l'adresse de la page : recharger la page, revenir en arrière ou ouvrir un lien enregistré montre la même collection.
 4. R-COL-18 · Une photo ouverte en grand depuis une collection fait défiler les seules photos de cette collection ; la fermer ramène dans la collection.
-5. R-COL-19 · Une collection vide le dit et explique comment y ranger des photos.
+5. R-COL-19 · Une collection vide le dit, explique comment y ranger des photos et propose « Ajouter une photo », qui ouvre le même panneau que « Ajouter ».
 6. R-COL-20 · Une collection supprimée sur un autre appareil, ou un lien vers une collection qui n'existe pas affiche « Cette collection n'existe plus. » et propose « Voir toutes les photos ».
-7. R-COL-21 · La collection affichée suit les changements sans recharger la page : une photo rangée ou retirée, sur cet appareil ou un autre, y apparaît ou en disparaît. Une photo ajoutée pendant qu'une collection est affichée n'y entre pas : elle rejoint « Toutes ».
+7. R-COL-21 · La collection affichée suit les changements sans recharger la page : une photo rangée ou retirée, sur cet appareil ou un autre, y apparaît ou en disparaît. Une photo ajoutée pendant qu'une collection est affichée entre dans la bibliothèque et est rangée dans cette collection ; si le rangement échoue, un message le dit et la photo reste dans la bibliothèque.
 
 **Messages affichés**
 
-| Situation                | Message                                                                                           |
-| ------------------------ | ------------------------------------------------------------------------------------------------- |
-| Collection vide          | « Cette collection est vide. » — « Rangez-y des photos depuis leur menu « … », dans « Toutes ». » |
-| Collection introuvable   | « Cette collection n'existe plus. » et le bouton « Voir toutes les photos »                       |
-| Collections non chargées | « Cette collection n'a pas pu être chargée. » et le bouton « Voir toutes les photos »             |
+| Situation                                  | Message                                                                                                                                               |
+| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
+| Collection vide                            | « Cette collection est vide. » — « Ajoutez-y une photo, ou rangez-y celles de « Toutes » depuis leur menu « … ». » et le bouton « Ajouter une photo » |
+| Collection introuvable                     | « Cette collection n'existe plus. » et le bouton « Voir toutes les photos »                                                                           |
+| Photo ajoutée dans une collection affichée | « Photo ajoutée à votre bibliothèque. » puis « Photo ajoutée à « Noël ». »                                                                            |
+| Collections non chargées                   | « Cette collection n'a pas pu être chargée. » et le bouton « Voir toutes les photos »                                                                 |
 
 **Ce qui n'est pas possible**
~~~~

### Task 6a: Review fix, late uploads

**Commit:** `fix(client): keep late uploads in the list they belong to`

**Scope:** From the fresh-context review (Drift Log).

**Gate:** `pnpm check`, `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/hooks/useLibraryUpload.ts b/client/src/hooks/useLibraryUpload.ts
index da166a7..c4a65bc 100644
--- a/client/src/hooks/useLibraryUpload.ts
+++ b/client/src/hooks/useLibraryUpload.ts
@@ -1,11 +1,12 @@
 import { toast } from 'sonner'
 import { useCollections } from '@/collections/CollectionsContext.ts'
 import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
-import type { SelectedCollection } from '@/hooks/useSelectedCollection.ts'
+import { type SelectedCollection, selectedCollectionId } from '@/hooks/useSelectedCollection.ts'
 import type { Photo } from '@/photo.ts'
 
 // Added while a collection is shown, the photo is filed there too: that is where it was wanted.
-// The collection's list then reloads on collections:changed, like any filing.
+// The collection's list then reloads on collections:changed, like any filing. Filed by id: the
+// collections list may still be loading, and the answer names the collection.
 export function useLibraryUpload(
   selected: SelectedCollection,
   library: PhotoLibrary,
@@ -13,10 +14,10 @@ export function useLibraryUpload(
   const { addPhoto } = useCollections()
   return async (photo) => {
     library.addPhoto(photo)
-    if (selected.status !== 'found') return
-    const { id, name } = selected.collection
-    const result = await addPhoto(id, photo.id)
-    if (result.isSuccess) toast.success(`Photo ajoutée à « ${name} ».`)
+    const collectionId = selectedCollectionId(selected)
+    if (collectionId === null) return
+    const result = await addPhoto(collectionId, photo.id)
+    if (result.isSuccess) toast.success(`Photo ajoutée à « ${result.collection.name} ».`)
     else toast.error(result.message)
   }
 }
diff --git a/client/src/hooks/usePhotoLibrary.ts b/client/src/hooks/usePhotoLibrary.ts
index 5a25cb7..3eb6e55 100644
--- a/client/src/hooks/usePhotoLibrary.ts
+++ b/client/src/hooks/usePhotoLibrary.ts
@@ -163,16 +163,23 @@ function connectLibrary(
   }
 }
 
-// A collection's list waits for collections:changed: an upload enters it once filed there.
+// A collection's list waits for collections:changed: an upload enters it once filed there. A ref:
+// an upload that ends after a switch to a collection must not land in it.
 function usePhotoAdder(
   liveLoads: LiveLoads,
   setPhotos: Dispatch<SetStateAction<Photo[]>>,
   collectionId: CollectionFilter,
 ): (photo: Photo) => void {
-  return useMemo(
-    () => (collectionId === null ? createPhotoAdder(liveLoads, setPhotos) : () => {}),
-    [liveLoads, setPhotos, collectionId],
-  )
+  const shownCollectionId = useRef(collectionId)
+  useEffect(() => {
+    shownCollectionId.current = collectionId
+  }, [collectionId])
+  return useMemo(() => {
+    const addPhoto = createPhotoAdder(liveLoads, setPhotos)
+    return (photo) => {
+      if (shownCollectionId.current === null) addPhoto(photo)
+    }
+  }, [liveLoads, setPhotos])
 }
 
 // Rebuilt when the next page changes, so loadMore always fetches the page after the current one.
@@ -232,6 +239,7 @@ function useLibraryStore(collectionId: CollectionFilter): LibraryStore {
     setShownCollectionId(collectionId)
     setPhotos([])
     setNextPage(null)
+    setIsLoadingMore(false)
     setIsFirstPageLoaded(false)
   }
   const state = { photos, nextPage, isLoadingMore, isFirstPageLoaded }
~~~~

### Task 6b: Review fix, viewer over a missing collection

**Commit:** `fix(client): keep the viewer closed over a missing collection`

**Scope:** From the fresh-context review (Drift Log).

**Gate:** `pnpm check`, `pnpm typecheck`, `pnpm build`, `pnpm test` green at the tip.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/pages/LibraryPage.tsx b/client/src/pages/LibraryPage.tsx
index a78a06c..ae5ebac 100644
--- a/client/src/pages/LibraryPage.tsx
+++ b/client/src/pages/LibraryPage.tsx
@@ -37,6 +37,7 @@ type LibraryOverlaysProps = {
   isAdding: boolean
   onAddClose: () => void
   onUploaded: (photo: Photo) => void
+  isShowingPhotos: boolean
 }
 
 function LibraryBody({ selected, library, layout, viewer, onAdd }: LibraryBodyProps): JSX.Element {
@@ -73,6 +74,11 @@ function LibraryContent(props: LibraryContentProps): JSX.Element {
   )
 }
 
+// A collection that cannot be shown never loads a page: its viewer would wait forever.
+function isShowingPhotos(selected: SelectedCollection): boolean {
+  return selected.status !== 'missing' && selected.status !== 'failed'
+}
+
 // The viewer browses the photos shown, so a collection's photo never leads out of it.
 function LibraryOverlays({
   library,
@@ -80,11 +86,12 @@ function LibraryOverlays({
   isAdding,
   onAddClose,
   onUploaded,
+  isShowingPhotos,
 }: LibraryOverlaysProps): JSX.Element {
   return (
     <>
       <AddPhotoPanel isOpen={isAdding} onClose={onAddClose} onUploaded={onUploaded} />
-      {viewer.openId !== null && (
+      {viewer.openId !== null && isShowingPhotos && (
         <PhotoViewer library={library} openId={viewer.openId} viewer={viewer} />
       )}
     </>
@@ -112,6 +119,7 @@ export default function LibraryPage(): JSX.Element {
         isAdding={isAdding}
         onAddClose={() => setIsAdding(false)}
         onUploaded={handleUploaded}
+        isShowingPhotos={isShowingPhotos(selected)}
       />
     </main>
   )
~~~~

## Final verification (controller)

- `pnpm test:bruno` against a running API: expect 185 requests, 472 assertions, all green, twice in a row (`list/13` deletes the collection `list/07` creates).
- Chrome checklist: see the report to the controller (desktop and 360 px phone viewport).

## Drift Log

- **Order of work:** the spec and this plan were written after the code (the decisions were fixed by the controller up front) and committed first by reordering the branch with `git cherry-pick`.
- **Task 3 split:** `connectLibrary` reached 34 lines; the socket handlers moved to `libraryHandlers`. `useViewerParam` reached 38 lines; `useStartFrame` and `setPhotoParam` came out of it.
- **Task 4:** `CollectionMenu` reached 31 lines once its trigger got `pointer-coarse:size-11`; the items moved to `CollectionMenuItems`. The menu now opens `align="start"` since the button follows the name on the left.
- **Task 4, doc:** R-COL-13 still promised « le nombre de photos de chaque collection », a count no screen shows any more; amended (folded into Task 4 by `fixup`).
- **Task 5 was not in the controller's list:** without it, a photo added from a collection vanished from the view it was added from (spec D18).
- **ARCHITECTURE table realignment:** each task widens the `/` row of the routes table, so Biome realigns its 9 rows (18-line diffs).
- **Fresh-context review** (after Task 5), findings and outcome:
  - Fixed (Task 6a): an upload finishing after a switch to a collection landed in that collection's list (the adder now reads the shown collection from a ref); an upload while the collections list was loading was neither shown nor filed (now filed by id, the toast takes the name from the answer); `isLoadingMore` was not reset on a switch.
  - Fixed (Task 6b): `/?collection=<missing>&photo=<id>` left the viewer waiting forever above the notice.
  - Fixed (Task 4 fixup): R-COL-13 wording.
  - Accepted, low: a page answered for the previous collection between the render-phase reset and the effect cleanup could still apply (the window is one passive-effect delay). Stopping loads during render is impure and unsafe with interrupted renders; a keyed remount was rejected (spec, Rejected).
  - Accepted, open questions: leaving the frame drops the collection (spec Q2); focus after deleting the shown collection (Q6); after « Envoyer à un ami », closing the send panel leaves focus on the page.
  - Accepted, nits: a 404 on a dead collection logs « Unexpected photos payload » in the browser console; any `collections:changed` reloads a shown collection, a rename of another one included; the header keeps the previous count above « Cette collection n'existe plus. »; `scrollIntoView` of the selected chip can scroll the page on back.
- **Final review** (controller's reviewer, after the stack was pushed and rebased on aa57e5a), fixed in new commits on `feat/library-collections`:
  - **I1, focus after deleting the shown collection** (`fix(client): focus « Toutes » after deleting the shown collection`): reverses spec open question 6, recorded in the new spec doc `2026-11-25-library-page-focus.md`. `LibraryPage` owns `allChipRef` for the « Toutes » chip; the bar's dialogs focus `triggerRef.current ?? fallbackRef.current` in `onCloseAutoFocus`. `ChipLink` takes an optional `linkRef`, and its scroll effect lists it in its dependencies (Biome). No product rule mentions focus.
  - **M1, header count over an unavailable collection** (`fix(client): hide the header count over an unavailable collection`): `LibraryHeader` gets `showsCount`, false when the collection is missing or failed; R-BIB-46 amended in place.
  - **M2, refused photos load** (`fix(client): treat a refused photos load as a plain failure`): `fetchPhotoPage` returns `null` on a non-ok answer before the shape check, so a 404 is no longer logged as an unexpected payload. It applies to every caller (the frame's `fetchAllPhotos` too); the server logs its own errors. A missing collection is still requested again on each reconnect and `collections:changed`, now silently.
  - Left for the backlog per the review: M3 to M8.
