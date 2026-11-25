---
plan: library-timeline
status: done
spec: docs/superpowers/specs/2026-11-25-library-timeline-design.md
branch: feat/library-timeline
worktree: false
tasks_total: 6
tasks_done: 6
current_task: null
last_commit: null
last_updated: 2026-11-25
---

# Library timeline Implementation Plan

> **For agentic workers:** this plan was built while executing it, in a throwaway clone; every task below is a final diff (`git show` output, after formatting). Replaying it means applying each diff and running its gates.

**Working agreement (mandatory):** keep this plan in sync with reality. Append every divergence to the Drift Log. When a drift changes a decision of the spec, add a new spec doc rather than rewriting this one.

**Goal:** the library reads like a photo app's timeline: photos grouped by day, collections as cards with a cover, and a shown collection titling the page.

**Architecture:** a pure `groupByDay` (`photoDays.ts`) feeds `PhotoGrid` / `PhotoList`, which render one `DateGroup` per day. The collections API adds `coverUrl`, `oldestPhotoAt` and `newestPhotoAt`, computed by `photoSpan` from the live-photos query it already ran. `CollectionsRow` and `CollectionCard` replace `CollectionChips`; `CollectionTitle` (was `SelectedCollectionBar`) becomes the header's title when a collection is shown.

**Tech Stack:** React 19, React Router 7, Radix (shadcn), lucide-react, Tailwind 4; Express 5, Prisma 6 (MongoDB), Cloudinary signed URLs; Vitest, Bruno; Biome 2.

## Global Constraints

- **No new dependency.** Prisma stays on v6.
- **Never Docker, never Vite, never `pnpm db:push` / `db:seed`, never read `.env` files.** The API may run only for Bruno, on another port than 3000 (controller).
- **API change → Bruno and the unit test in the same commit; behaviour change → `docs/produit/` in the same commit; flow change → `ARCHITECTURE.md`.**
- **TypeScript (AGENTS.md):** no `as` casts, explicit return types on exported functions, literal unions rather than `enum`.
- **Code rules (`.claude/rules/`):** comment why, never what; every function at most 30 lines, every file at most 300 lines; constants in UPPER_SNAKE_CASE; logs by identifiers only.
- **UI:** French strings; 44 px touch targets on coarse pointers; 360 px with no horizontal page scroll.
- **Commits:** atomic, Conventional Commits in English, `git commit -F`, the two attribution lines, never `--no-verify`. Docker files are the author's work and stay untouched.

## Interfaces

- `server/src/types.ts` and `client/src/collections/collection.ts`: `Collection = { id, name, photoIds, coverUrl: string | null, oldestPhotoAt: string | null, newestPhotoAt: string | null }`.
- `collections.repository.ts`: `LivePhoto = { id, cloudinaryId, createdAt }`, `findLivePhotos(ownerId, ids)`.
- `collections.service.ts`: `photoSpan(photos, thumbnailUrl)`; deps gain `thumbnailUrl`.
- `lib/cloudinary.ts`: `thumbnailUrl(cloudinaryId)`.
- `client/src/photoDays.ts`: `PhotoDay = { key, label, photos }`, `dayKey(date)`, `groupByDay(photos, now)`, `withToday(days, now)`.
- Components: `DateGroup({ day, children })`, `PhotoGrid({ days, currentId, onSelect, children, childrenDayKey })`, `PhotoList({ days, currentId, onSelect, children, childrenDayKey })`, `CollectionsRow({ selectedId, allCardRef })`, `CollectionCard`, `CardText`, `CollectionTitle({ collection, fallbackRef })`, `LibraryTitle({ library, showsCount })`, `LibraryHeader({ title, layout, onLayoutChange, onAdd })`; `collectionSummary(collection)`, `photoCountLabel(count)`.

---

## `feat/library-timeline`

### Task 1: Collections carry a cover and their date range

**Commit:** `feat(server): collections carry a cover and their date range`

**Scope:** `findLivePhotos`, `photoSpan`, `thumbnailUrl` dependency, DTO fields; unit tests (`collections.service.cover.test.ts`, mocks updated); Bruno `create/01`, `photos/02`, `photos/12`, folder docs; client type and guard; ARCHITECTURE.md. Spec T6, T7.

**Gate:** `pnpm check` and `pnpm typecheck` green. `pnpm test` → `Test Files  27 passed (27)`, `Tests  312 passed (312)` (on step 14). Bruno written, not run (spec open question 1).

- [x] **Final diff**

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 45bd933..988f6b1 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -126,7 +126,7 @@ Une `Friendship` vaut `{ id, user, createdAt }` (`createdAt` en ISO 8601) : `id`
 
 Une `Photo` vaut `{ id, url, thumbnailUrl, createdAt, senderName, message }` (`createdAt` en ISO 8601 ; `senderName` est le nom d'affichage de l'ami qui l'a envoyée, `null` pour une photo que le compte a ajoutée lui-même ; `message` est le mot que cet ami y a joint, `null` sans message). Un message est du texte, espaces autour retirés, de 200 caractères au plus (`MAX_MESSAGE_LENGTH`, comptés après le retrait) ; vide, il compte comme absent. Les logs disent seulement s'il y en avait un (`hasMessage`), jamais son texte. Chaque photo appartient à un compte (`ownerId`, côté serveur seulement) : celui qui l'a ajoutée, ou l'ami qui l'a reçue. La liste, la suppression et les événements ne concernent que les photos du compte connecté. Une photo envoyée à un ami est une nouvelle photo **de l'ami** (`senderId` = l'expéditeur) : la bibliothèque de l'expéditeur ne change pas, et chacun supprime ses photos de son côté (la photo reçue reste quand l'expéditeur supprime l'original ou retire l'amitié). L'identifiant Cloudinary reste côté serveur : le client reçoit des URL prêtes à l'emploi.
 
-Une `Collection` vaut `{ id, name, photoIds }`, jamais son propriétaire : `photoIds` liste les photos du compte, dans l'ordre où elles y ont été ajoutées. Un nom est du texte, espaces autour retirés, de 1 à 50 caractères (`MAX_COLLECTION_NAME_LENGTH`, comme un nom d'affichage) ; deux collections d'un même compte ne portent pas le même nom (index unique `(ownerId, name)`, comparaison exacte après le trim : « noël » et « Noël » sont deux noms). Une collection d'un autre compte répond comme une inconnue. Seule une photo ouverte de la bibliothèque du compte entre dans une collection : inconnue, d'un autre compte ou reçue pas encore ouverte, elle répond `404 PHOTO_NOT_FOUND`, comme `GET /api/photos` ne la montre pas. Ajouter une photo déjà là, ou retirer une photo absente, répond la collection telle quelle. La bibliothèque montre une collection par `GET /api/photos?collectionId=<id>` : mêmes photos ouvertes, même ordre et même pagination, limitées à celles de la collection (un id mort ne trouve aucune photo) ; une collection d'un autre compte, inconnue ou un id mal formé répond `404 COLLECTION_NOT_FOUND`, le paramètre répété `400 QUERY_INVALID`.
+Une `Collection` vaut `{ id, name, photoIds, coverUrl, oldestPhotoAt, newestPhotoAt }`, jamais son propriétaire : `photoIds` liste les photos du compte, dans l'ordre où elles y ont été ajoutées. `coverUrl` est la vignette signée (la transformation carrée déjà autorisée, `thumbnailUrl` de `lib/cloudinary.ts`) de sa photo la plus récente par `createdAt`, quel que soit l'ordre d'ajout ; `oldestPhotoAt` et `newestPhotoAt` (ISO) bornent ses photos. Les trois valent `null` tant qu'elle est vide, et sortent de la même requête que les photos encore là : aucune requête en plus. Un nom est du texte, espaces autour retirés, de 1 à 50 caractères (`MAX_COLLECTION_NAME_LENGTH`, comme un nom d'affichage) ; deux collections d'un même compte ne portent pas le même nom (index unique `(ownerId, name)`, comparaison exacte après le trim : « noël » et « Noël » sont deux noms). Une collection d'un autre compte répond comme une inconnue. Seule une photo ouverte de la bibliothèque du compte entre dans une collection : inconnue, d'un autre compte ou reçue pas encore ouverte, elle répond `404 PHOTO_NOT_FOUND`, comme `GET /api/photos` ne la montre pas. Ajouter une photo déjà là, ou retirer une photo absente, répond la collection telle quelle. La bibliothèque montre une collection par `GET /api/photos?collectionId=<id>` : mêmes photos ouvertes, même ordre et même pagination, limitées à celles de la collection (un id mort ne trouve aucune photo) ; une collection d'un autre compte, inconnue ou un id mal formé répond `404 COLLECTION_NOT_FOUND`, le paramètre répété `400 QUERY_INVALID`.
 
 Une `Selection` vaut `{ photoIds }` : des ids de photos ouvertes de la bibliothèque du compte, jamais les photos elles-mêmes, que le cadre a déjà chargées. La sélection du jour (`features/selections/selections.daily.ts`) range chaque photo selon le SHA-256 de `<ownerId>:<jour>:<photoId>`, le jour étant la date à Paris (`Intl.DateTimeFormat`, fuseau `Europe/Paris`) : le même jour donne le même ordre sur tous les appareils et à chaque rechargement, sans rien enregistrer, et le lendemain un autre. Les photos entrées dans la bibliothèque avant aujourd'hui passent d'abord, celles du jour ensuite, et le lot garde les 20 premières (`DAILY_SELECTION_SIZE`) : une photo ajoutée ou ouverte aujourd'hui n'entre que dans un lot qui a encore de la place. Une photo reçue entre dans la bibliothèque à son ouverture (`openedAt`), les autres à leur arrivée (`createdAt`) : ouvrir le matin les photos reçues la veille ne change pas le lot.
 
@@ -295,7 +295,7 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 - **MongoDB Atlas** via **Prisma 6**. Prisma 7+ ne supporte pas encore MongoDB : la version est volontairement figée.
 - Le client Prisma est généré à l'installation (`postinstall`) ; le schéma est poussé avec `pnpm --filter server db:push` (pas de migrations avec MongoDB).
 - Collections `User`, `Session`, `Photo`, `Invitation`, `Friendship` et `Collection`. `User.avatarCloudinaryId`, facultatif, est l'identifiant Cloudinary de la photo de profil (absent des anciens comptes, que Prisma lit comme `null`). Index uniques sur `User.email`, `Session.tokenHash`, `Invitation.tokenHash`, `Friendship.pairKey` et `Collection (ownerId, name)` ; le rôle est un `enum Role` Prisma et l'état d'une amitié un `enum FriendshipStatus` (`pending`, `accepted`), que Prisma génère en unions de chaînes. `Photo.ownerId` relie chaque photo à son compte ; index unique `(ownerId, sha256)` (un même fichier n'entre qu'une fois dans une bibliothèque), index `(ownerId, id)` pour la liste d'un compte, et index simple sur `cloudinaryId` (pas unique : une photo envoyée depuis la bibliothèque pointe vers la même image, détruite avec la dernière photo qui y renvoie). `Photo.senderId`, facultatif, relie une photo reçue au compte qui l'a envoyée (`null` pour une photo ajoutée par son propriétaire) : `User` a donc deux relations vers `Photo`, que Prisma exige de nommer (`PhotoOwner` pour `ownerId`, `PhotoSender` pour `senderId`). Le nom de l'expéditeur est lu par une jointure (`include` de `sender`, `displayName` seul), jamais recopié dans `Photo`. `Photo.message`, facultatif, est le mot de l'expéditeur (absent sans message, et sur les photos d'avant l'étape 9, que Prisma lit comme `null`). `Invitation.invitedById` relie une invitation à l'admin qui l'a créée ; index simple sur `Invitation.email` (pas unique : une invitation utilisée reste à côté d'une plus récente pour la même adresse). `pnpm db:seed` (`server/prisma/seed.ts`) vide la base (sessions, photos, invitations, amitiés et collections avant les comptes, car Prisma émule les relations sur MongoDB) et crée les deux comptes de test du README.
-- **Collections** : une `Collection` porte `ownerId`, `name` et `photoIds`, la liste des photos (`String[] @db.ObjectId`) ; la photo, elle, ne sait pas dans quelles collections elle est, donc ni le DTO `Photo` ni ses événements ne changent. `photoIds` est écrit `[]` dès la création : MongoDB ne trouve « ne contient pas » que sur un champ qui existe. Prisma ne sait pas retirer un élément d'une liste (pas de `$pull`) : l'id d'une photo supprimée reste dans `photoIds`, et chaque lecture ne garde que les ids encore dans la bibliothèque (`findLivePhotoIds`, une requête pour toutes les collections). Ajouter est une seule écriture filtrée sur `{ id, ownerId, NOT: { photoIds: { has: photoId } } }` avec `push` : deux ajouts simultanés de la même photo n'en gardent qu'un. Retirer relit la liste et la réécrit sans la photo (`set`), seulement si elle est encore celle lue (`photoIds: { equals }` dans le filtre) : un ajout fait entre-temps depuis un autre appareil n'est pas écrasé. Si la liste a changé, le service relit et réessaie une fois ; un second échec répond 500 plutôt que de perdre une écriture. L'index unique `(ownerId, name)` est né avec la collection : aucune donnée existante à remettre en ordre avant `pnpm db:push`.
+- **Collections** : une `Collection` porte `ownerId`, `name` et `photoIds`, la liste des photos (`String[] @db.ObjectId`) ; la photo, elle, ne sait pas dans quelles collections elle est, donc ni le DTO `Photo` ni ses événements ne changent. `photoIds` est écrit `[]` dès la création : MongoDB ne trouve « ne contient pas » que sur un champ qui existe. Prisma ne sait pas retirer un élément d'une liste (pas de `$pull`) : l'id d'une photo supprimée reste dans `photoIds`, et chaque lecture ne garde que les ids encore dans la bibliothèque (`findLivePhotos`, une requête pour toutes les collections, qui rapporte aussi `cloudinaryId` et `createdAt` pour la couverture et les dates). Ajouter est une seule écriture filtrée sur `{ id, ownerId, NOT: { photoIds: { has: photoId } } }` avec `push` : deux ajouts simultanés de la même photo n'en gardent qu'un. Retirer relit la liste et la réécrit sans la photo (`set`), seulement si elle est encore celle lue (`photoIds: { equals }` dans le filtre) : un ajout fait entre-temps depuis un autre appareil n'est pas écrasé. Si la liste a changé, le service relit et réessaie une fois ; un second échec répond 500 plutôt que de perdre une écriture. L'index unique `(ownerId, name)` est né avec la collection : aucune donnée existante à remettre en ordre avant `pnpm db:push`.
 - **Amitiés** : un seul document `Friendship` par paire de comptes porte la demande, puis l'amitié (`requesterId`, `addresseeId`, `status`). `pairKey` vaut les deux ids triés et joints par `:`, sous un index unique : MongoDB ne sait pas indexer « cette paire, dans un sens ou dans l'autre », et la clé triée fait refuser par l'index lui-même A→B à côté de B→A, demandes simultanées comprises. Seul le repository calcule `pairKey`. Index simples sur `requesterId` et `addresseeId` pour la liste d'un compte. Une demande refusée ou annulée, comme une amitié retirée, est supprimée : pas de troisième état.
 - Quand `Photo` gagne un champ obligatoire ou un index unique, `pnpm db:seed` passe **avant** `pnpm db:push` : MongoDB compte un champ absent comme `null`, et d'anciennes photos sans ce champ empêcheraient l'index unique de se créer.
 - `Photo.isOpened`, facultatif : `true` pour une photo ajoutée par son propriétaire, `false` pour une photo reçue jusqu'à son ouverture. Les photos d'avant l'étape 9 n'ont pas le champ et comptent comme ouvertes : aucune migration, `pnpm db:push` sans seed (pas de nouvel index). La bibliothèque filtre donc avec `OR: [{ isOpened: true }, { isOpened: { isSet: false } }]` : `{ isOpened: { not: false } }` ne renverrait pas les photos sans le champ (vérifié sur MongoDB 7 avec Prisma 6.19). Les photos en attente se lisent avec un simple `isOpened: false`, servi par l'index `(ownerId, id)`.
diff --git a/client/src/collections/collection.ts b/client/src/collections/collection.ts
index a370738..0b1781c 100644
--- a/client/src/collections/collection.ts
+++ b/client/src/collections/collection.ts
@@ -1,10 +1,19 @@
 // Copy of server/src/types.ts, see why there. Keep both in sync.
 
 // photoIds: the owner's photos, in the order they were added; a deleted photo is not listed.
+// coverUrl: the signed thumbnail of its newest photo. oldestPhotoAt and newestPhotoAt: ISO dates
+// of its oldest and newest photos. All three null while it is empty.
 export type Collection = {
   id: string
   name: string
   photoIds: string[]
+  coverUrl: string | null
+  oldestPhotoAt: string | null
+  newestPhotoAt: string | null
+}
+
+function isStringOrNull(value: unknown): value is string | null {
+  return value === null || typeof value === 'string'
 }
 
 // Same bound as the server: the field stops there instead of answering an error.
@@ -20,7 +29,13 @@ export function isCollection(value: unknown): value is Collection {
     typeof value.name === 'string' &&
     'photoIds' in value &&
     Array.isArray(value.photoIds) &&
-    value.photoIds.every((photoId) => typeof photoId === 'string')
+    value.photoIds.every((photoId) => typeof photoId === 'string') &&
+    'coverUrl' in value &&
+    isStringOrNull(value.coverUrl) &&
+    'oldestPhotoAt' in value &&
+    isStringOrNull(value.oldestPhotoAt) &&
+    'newestPhotoAt' in value &&
+    isStringOrNull(value.newestPhotoAt)
   )
 }
 
diff --git a/server/bruno/collections/create/01-nominal.bru b/server/bruno/collections/create/01-nominal.bru
index d5256c6..5e3e6e7 100644
--- a/server/bruno/collections/create/01-nominal.bru
+++ b/server/bruno/collections/create/01-nominal.bru
@@ -30,6 +30,9 @@ assert {
   res.body.name: eq Noël
   res.body.photoIds: isArray
   res.body.photoIds.length: eq 0
+  res.body.coverUrl: isNull
+  res.body.oldestPhotoAt: isNull
+  res.body.newestPhotoAt: isNull
   res.body.ownerId: isUndefined
 }
 
@@ -49,6 +52,7 @@ script:post-response {
 }
 
 docs {
-  NOMINAL → 201 `{ id, name, photoIds }`, sans photo. Le nom part entouré d'espaces : le serveur
+  NOMINAL → 201 `{ id, name, photoIds, coverUrl, oldestPhotoAt, newestPhotoAt }`, sans photo,
+  donc sans couverture ni dates (null). Le nom part entouré d'espaces : le serveur
   le rogne. Le script relit la liste : la collection est bien enregistrée.
 }
diff --git a/server/bruno/collections/folder.bru b/server/bruno/collections/folder.bru
index 94167c2..b8a26be 100644
--- a/server/bruno/collections/folder.bru
+++ b/server/bruno/collections/folder.bru
@@ -8,7 +8,10 @@ docs {
   `{ collections }`, `POST /api/collections` (JSON `{ name }`) → 201,
   `PATCH /api/collections/:id` (JSON `{ name }`) → 200, `DELETE
   /api/collections/:id` → 204. Une collection renvoyée par l'API vaut
-  `{ id, name, photoIds }`, jamais son propriétaire. Chaque écriture envoie
+  `{ id, name, photoIds, coverUrl, oldestPhotoAt, newestPhotoAt }`, jamais
+  son propriétaire : `coverUrl` est la vignette signée de sa photo la plus
+  récente, les deux dates (ISO) celles de sa photo la plus ancienne et de la
+  plus récente ; les trois valent null tant qu'elle est vide. Chaque écriture envoie
   l'événement Socket.IO `collections:changed`, sans contenu, aux connexions
   du propriétaire : elles relisent la liste.
 
diff --git a/server/bruno/collections/photos/02-nominal-ajout.bru b/server/bruno/collections/photos/02-nominal-ajout.bru
index 86b40a9..76a36f7 100644
--- a/server/bruno/collections/photos/02-nominal-ajout.bru
+++ b/server/bruno/collections/photos/02-nominal-ajout.bru
@@ -22,6 +22,8 @@ assert {
   res.status: eq 200
   res.body.id: eq {{collectionId}}
   res.body.photoIds.length: eq 1
+  res.body.coverUrl: isString
+  res.body.newestPhotoAt: isString
 }
 
 script:post-response {
@@ -36,9 +38,21 @@ script:post-response {
   test('la liste des collections porte la photo', async () => {
     expect(await photoIdsOf(bru.getVar('collectionId'))).to.eql([bru.getVar('collectionPhotoId')])
   })
+  test('la couverture est la vignette signée de la photo, ses dates celles de la photo', async () => {
+    const { data } = await axios.get(`${bru.getEnvVar('baseUrl')}/api/photos`, {
+      headers: { Cookie: bru.getVar('inviteeCookie') },
+    })
+    const photo = data.photos.find(({ id }) => id === bru.getVar('collectionPhotoId'))
+    expect(res.body.coverUrl).to.equal(photo.thumbnailUrl)
+    expect(res.body.coverUrl).to.match(/\/s--[\w-]+--\//)
+    expect(res.body.oldestPhotoAt).to.equal(photo.createdAt)
+    expect(res.body.newestPhotoAt).to.equal(photo.createdAt)
+  })
 }
 
 docs {
   NOMINAL → 200 avec la collection, qui contient la photo. Le script relit
-  la liste : l'ajout est enregistré.
+  la liste : l'ajout est enregistré. Sa seule photo en est la couverture :
+  la même vignette signée que dans la bibliothèque (une transformation déjà
+  autorisée), et ses deux dates sont celles de la photo.
 }
diff --git a/server/bruno/collections/photos/12-nominal-retrait.bru b/server/bruno/collections/photos/12-nominal-retrait.bru
index 1efd44e..1bee113 100644
--- a/server/bruno/collections/photos/12-nominal-retrait.bru
+++ b/server/bruno/collections/photos/12-nominal-retrait.bru
@@ -21,6 +21,8 @@ script:pre-request {
 assert {
   res.status: eq 200
   res.body.photoIds.length: eq 0
+  res.body.coverUrl: isNull
+  res.body.newestPhotoAt: isNull
 }
 
 script:post-response {
@@ -42,7 +44,7 @@ script:post-response {
 }
 
 docs {
-  NOMINAL → 200 avec la collection vide. Retirer une photo d'une
+  NOMINAL → 200 avec la collection vide, sans couverture ni dates. Retirer une photo d'une
   collection ne la supprime pas : le script la retrouve dans la
   bibliothèque.
 }
diff --git a/server/src/app.ts b/server/src/app.ts
index fe5e0ee..52a5a59 100644
--- a/server/src/app.ts
+++ b/server/src/app.ts
@@ -36,7 +36,13 @@ import { createSelectionsController } from './features/selections/selections.con
 import { createSelectionsRepository } from './features/selections/selections.repository.js'
 import { createSelectionsRouter } from './features/selections/selections.routes.js'
 import { createSelectionsService } from './features/selections/selections.service.js'
-import { avatarUrl, deleteImage, uploadAvatar, uploadImage } from './lib/cloudinary.js'
+import {
+  avatarUrl,
+  deleteImage,
+  thumbnailUrl,
+  uploadAvatar,
+  uploadImage,
+} from './lib/cloudinary.js'
 import { prisma } from './lib/db.js'
 import { toAvatarJpeg, toFrameJpeg } from './lib/image.js'
 import { logger } from './lib/logger.js'
@@ -77,6 +83,7 @@ function assembleCollectionsRouter(io: SocketServer): Router {
   const service = createCollectionsService({
     repository: createCollectionsRepository(prisma),
     logger,
+    thumbnailUrl,
   })
   return createCollectionsRouter(createCollectionsController(service, io))
 }
diff --git a/server/src/features/collections/collections.repository.ts b/server/src/features/collections/collections.repository.ts
index c63053f..4ccc3c9 100644
--- a/server/src/features/collections/collections.repository.ts
+++ b/server/src/features/collections/collections.repository.ts
@@ -3,13 +3,16 @@ import { IS_OPENED } from '../photos/photos.repository.js'
 
 export type CollectionRecord = Collection
 
+// What a collection shows of its photos: the cover and the dates.
+export type LivePhoto = { id: string; cloudinaryId: string; createdAt: Date }
+
 // Why a write found nothing to change: the service turns it into the error code.
 export type WriteRefusal = 'not_found' | 'name_taken'
 
 export type CollectionsRepository = {
   findAllOf: (ownerId: string) => Promise<CollectionRecord[]>
-  // Among ids, the ones still in the owner's library: a deleted photo stays in photoIds.
-  findLivePhotoIds: (ownerId: string, ids: string[]) => Promise<string[]>
+  // Among ids, the photos still in the owner's library: a deleted photo stays in photoIds.
+  findLivePhotos: (ownerId: string, ids: string[]) => Promise<LivePhoto[]>
   create: (ownerId: string, name: string) => Promise<CollectionRecord | WriteRefusal>
   rename: (id: string, ownerId: string, name: string) => Promise<CollectionRecord | WriteRefusal>
   // null unless id is one of ownerId's collections.
@@ -51,16 +54,15 @@ async function refusalOnPrismaError(
   }
 }
 
-async function findLivePhotoIds(
+function findLivePhotos(
   prisma: PrismaClient,
   ownerId: string,
   ids: string[],
-): Promise<string[]> {
-  const photos = await prisma.photo.findMany({
+): Promise<LivePhoto[]> {
+  return prisma.photo.findMany({
     where: { ownerId, id: { in: ids } },
-    select: { id: true },
+    select: { id: true, cloudinaryId: true, createdAt: true },
   })
-  return photos.map((photo) => photo.id)
 }
 
 async function nullWhenNotFound(
@@ -109,7 +111,7 @@ function setPhotoIds(
 export function createCollectionsRepository(prisma: PrismaClient): CollectionsRepository {
   return {
     findAllOf: (ownerId) => prisma.collection.findMany({ where: { ownerId } }),
-    findLivePhotoIds: (ownerId, ids) => findLivePhotoIds(prisma, ownerId, ids),
+    findLivePhotos: (ownerId, ids) => findLivePhotos(prisma, ownerId, ids),
     // photoIds: [] written for real: a missing field would never match « does not have ».
     create: (ownerId, name) =>
       refusalOnPrismaError(prisma.collection.create({ data: { ownerId, name, photoIds: [] } })),
diff --git a/server/src/features/collections/collections.service.cover.test.ts b/server/src/features/collections/collections.service.cover.test.ts
new file mode 100644
index 0000000..1059268
--- /dev/null
+++ b/server/src/features/collections/collections.service.cover.test.ts
@@ -0,0 +1,87 @@
+import { describe, expect, it, vi } from 'vitest'
+import type { Logger } from '../../lib/logger.js'
+import type {
+  CollectionRecord,
+  CollectionsRepository,
+  LivePhoto,
+} from './collections.repository.js'
+import { createCollectionsService, photoSpan } from './collections.service.js'
+
+const OWNER_ID = '6b044f9d56a44767c7079b02'
+const thumbnailUrl = (cloudinaryId: string): string => `thumb:${cloudinaryId}`
+
+function photo(id: string, createdAt: string): LivePhoto {
+  return { id, cloudinaryId: `familyframe/${id}`, createdAt: new Date(createdAt) }
+}
+
+const OLDEST = photo('6b044f9d56a44767c7079a01', '2022-11-01T09:00:00Z')
+const NEWEST = photo('6b044f9d56a44767c7079a02', '2026-11-22T18:30:00Z')
+const MIDDLE = photo('6b044f9d56a44767c7079a03', '2025-07-14T12:00:00Z')
+const DELETED_ID = '6b044f9d56a44767c7079a09'
+
+describe('photoSpan', () => {
+  it('takes the newest photo as cover, whatever the order they were added in', () => {
+    const span = photoSpan([MIDDLE, NEWEST, OLDEST], thumbnailUrl)
+
+    expect(span).toEqual({
+      coverUrl: 'thumb:familyframe/6b044f9d56a44767c7079a02',
+      oldestPhotoAt: '2022-11-01T09:00:00.000Z',
+      newestPhotoAt: '2026-11-22T18:30:00.000Z',
+    })
+  })
+
+  it('gives one date twice for a single photo', () => {
+    const span = photoSpan([MIDDLE], thumbnailUrl)
+
+    expect(span.oldestPhotoAt).toBe(span.newestPhotoAt)
+  })
+
+  it('has no cover and no dates while empty', () => {
+    expect(photoSpan([], thumbnailUrl)).toEqual({
+      coverUrl: null,
+      oldestPhotoAt: null,
+      newestPhotoAt: null,
+    })
+  })
+})
+
+describe('listCollections', () => {
+  it('builds the cover and the dates from the photos still in the library only', async () => {
+    const record: CollectionRecord = {
+      id: '6b044f9d56a44767c7079c01',
+      ownerId: OWNER_ID,
+      name: 'Noël',
+      photoIds: [OLDEST.id, DELETED_ID, MIDDLE.id],
+      createdAt: new Date('2026-11-25T10:00:00Z'),
+    }
+    const service = createCollectionsService({
+      repository: {
+        findAllOf: vi.fn<CollectionsRepository['findAllOf']>().mockResolvedValue([record]),
+        // NEWEST is in another collection: it must not become this one's cover.
+        findLivePhotos: vi
+          .fn<CollectionsRepository['findLivePhotos']>()
+          .mockResolvedValue([OLDEST, MIDDLE, NEWEST]),
+        create: vi.fn(),
+        rename: vi.fn(),
+        deleteOwned: vi.fn(),
+        findOwned: vi.fn(),
+        hasOpenedPhoto: vi.fn(),
+        addPhoto: vi.fn(),
+        setPhotoIds: vi.fn(),
+      },
+      logger: { info: vi.fn<Logger['info']>(), warn: vi.fn(), error: vi.fn() },
+      thumbnailUrl,
+    })
+
+    const [collection] = await service.listCollections(OWNER_ID)
+
+    expect(collection).toEqual({
+      id: record.id,
+      name: 'Noël',
+      photoIds: [OLDEST.id, MIDDLE.id],
+      coverUrl: 'thumb:familyframe/6b044f9d56a44767c7079a03',
+      oldestPhotoAt: '2022-11-01T09:00:00.000Z',
+      newestPhotoAt: '2025-07-14T12:00:00.000Z',
+    })
+  })
+})
diff --git a/server/src/features/collections/collections.service.photos.test.ts b/server/src/features/collections/collections.service.photos.test.ts
index 073413b..a57aa93 100644
--- a/server/src/features/collections/collections.service.photos.test.ts
+++ b/server/src/features/collections/collections.service.photos.test.ts
@@ -1,7 +1,11 @@
 import { describe, expect, it, vi } from 'vitest'
 import { AppError } from '../../errors/app-error.js'
 import type { Logger } from '../../lib/logger.js'
-import type { CollectionRecord, CollectionsRepository } from './collections.repository.js'
+import type {
+  CollectionRecord,
+  CollectionsRepository,
+  LivePhoto,
+} from './collections.repository.js'
 import { createCollectionsService } from './collections.service.js'
 
 const OWNER_ID = '6b044f9d56a44767c7079b02'
@@ -19,14 +23,19 @@ const NOEL: CollectionRecord = {
 const WITH_PHOTO: CollectionRecord = { ...NOEL, photoIds: [OTHER_PHOTO_ID, PHOTO_ID] }
 const MEMBERSHIP = { id: NOEL.id, ownerId: OWNER_ID, photoId: PHOTO_ID }
 
+// A photo still in the library; its date and Cloudinary id only matter to the cover tests.
+function livePhoto(id: string): LivePhoto {
+  return { id, cloudinaryId: `familyframe/${id}`, createdAt: new Date('2026-11-20T10:00:00Z') }
+}
+
 // Every dependency succeeds by default; each test breaks only the one it is about.
 function makeDeps() {
   return {
     repository: {
       findAllOf: vi.fn<CollectionsRepository['findAllOf']>(),
-      findLivePhotoIds: vi
-        .fn<CollectionsRepository['findLivePhotoIds']>()
-        .mockResolvedValue([PHOTO_ID, OTHER_PHOTO_ID]),
+      findLivePhotos: vi
+        .fn<CollectionsRepository['findLivePhotos']>()
+        .mockResolvedValue([livePhoto(PHOTO_ID), livePhoto(OTHER_PHOTO_ID)]),
       create: vi.fn<CollectionsRepository['create']>(),
       rename: vi.fn<CollectionsRepository['rename']>(),
       deleteOwned: vi.fn<CollectionsRepository['deleteOwned']>(),
@@ -40,6 +49,7 @@ function makeDeps() {
       warn: vi.fn<Logger['warn']>(),
       error: vi.fn<Logger['error']>(),
     },
+    thumbnailUrl: (cloudinaryId: string) => `thumb:${cloudinaryId}`,
   }
 }
 
@@ -211,7 +221,7 @@ describe('a photo deleted from the library', () => {
   it('is left out of the collection the server answers', async () => {
     const deps = makeDeps()
     deps.repository.addPhoto.mockResolvedValue({ ...NOEL, photoIds: [DELETED_PHOTO_ID, PHOTO_ID] })
-    deps.repository.findLivePhotoIds.mockResolvedValue([PHOTO_ID])
+    deps.repository.findLivePhotos.mockResolvedValue([livePhoto(PHOTO_ID)])
 
     const collection = await createCollectionsService(deps).addPhoto(MEMBERSHIP)
 
diff --git a/server/src/features/collections/collections.service.test.ts b/server/src/features/collections/collections.service.test.ts
index 39e7fda..71cc76e 100644
--- a/server/src/features/collections/collections.service.test.ts
+++ b/server/src/features/collections/collections.service.test.ts
@@ -5,6 +5,7 @@ import type { ApiErrorCode } from '../../types.js'
 import type {
   CollectionRecord,
   CollectionsRepository,
+  LivePhoto,
   WriteRefusal,
 } from './collections.repository.js'
 import { createCollectionsService, parseCollectionName } from './collections.service.js'
@@ -25,15 +26,20 @@ const REFUSALS: [WriteRefusal, ApiErrorCode][] = [
   ['name_taken', 'COLLECTION_EXISTS'],
 ]
 
+// A photo still in the library; its date and Cloudinary id only matter to the cover tests.
+function livePhoto(id: string): LivePhoto {
+  return { id, cloudinaryId: `familyframe/${id}`, createdAt: new Date('2026-11-20T10:00:00Z') }
+}
+
 // Every dependency succeeds by default; each test breaks only the one it is about.
 function makeDeps() {
   return {
     repository: {
       findAllOf: vi.fn<CollectionsRepository['findAllOf']>().mockResolvedValue([NOEL, ETE]),
       // The deleted photo is no longer in the library.
-      findLivePhotoIds: vi
-        .fn<CollectionsRepository['findLivePhotoIds']>()
-        .mockResolvedValue([PHOTO_ID]),
+      findLivePhotos: vi
+        .fn<CollectionsRepository['findLivePhotos']>()
+        .mockResolvedValue([livePhoto(PHOTO_ID)]),
       create: vi.fn<CollectionsRepository['create']>().mockResolvedValue(ETE),
       rename: vi.fn<CollectionsRepository['rename']>().mockResolvedValue(NOEL),
       deleteOwned: vi.fn<CollectionsRepository['deleteOwned']>().mockResolvedValue(NOEL),
@@ -47,6 +53,7 @@ function makeDeps() {
       warn: vi.fn<Logger['warn']>(),
       error: vi.fn<Logger['error']>(),
     },
+    thumbnailUrl: (cloudinaryId: string) => `thumb:${cloudinaryId}`,
   }
 }
 
@@ -81,9 +88,9 @@ describe('listCollections', () => {
 
     const collections = await createCollectionsService(deps).listCollections(OWNER_ID)
 
-    expect(collections[1]).toEqual({ id: NOEL.id, name: 'Noël', photoIds: [PHOTO_ID] })
-    expect(deps.repository.findLivePhotoIds).toHaveBeenCalledOnce()
-    expect(deps.repository.findLivePhotoIds).toHaveBeenCalledWith(OWNER_ID, NOEL.photoIds)
+    expect(collections[1]?.photoIds).toEqual([PHOTO_ID])
+    expect(deps.repository.findLivePhotos).toHaveBeenCalledOnce()
+    expect(deps.repository.findLivePhotos).toHaveBeenCalledWith(OWNER_ID, NOEL.photoIds)
   })
 })
 
@@ -97,7 +104,14 @@ describe('createCollection', () => {
     })
 
     expect(deps.repository.create).toHaveBeenCalledWith(OWNER_ID, 'Été')
-    expect(collection).toEqual({ id: ETE.id, name: 'Été', photoIds: [] })
+    expect(collection).toEqual({
+      id: ETE.id,
+      name: 'Été',
+      photoIds: [],
+      coverUrl: null,
+      oldestPhotoAt: null,
+      newestPhotoAt: null,
+    })
   })
 
   it('refuses a name the account already uses', async () => {
diff --git a/server/src/features/collections/collections.service.ts b/server/src/features/collections/collections.service.ts
index 9749c94..96ec0d0 100644
--- a/server/src/features/collections/collections.service.ts
+++ b/server/src/features/collections/collections.service.ts
@@ -5,6 +5,7 @@ import { OBJECT_ID_PATTERN, parsePhotoId } from '../photos/photos.input.js'
 import type {
   CollectionRecord,
   CollectionsRepository,
+  LivePhoto,
   WriteRefusal,
 } from './collections.repository.js'
 
@@ -30,8 +31,13 @@ export type PhotoMembership = CollectionAction & { photoId: string }
 export type CollectionsServiceDeps = {
   repository: CollectionsRepository
   logger: Logger
+  // The signed square thumbnail of the library (lib/cloudinary.ts): stubbed in the tests.
+  thumbnailUrl: (cloudinaryId: string) => string
 }
 
+// The photos still in the library, by id: a deleted photo's id stays in photoIds.
+type LivePhotos = Map<string, LivePhoto>
+
 export type CollectionsService = {
   listCollections: (ownerId: string) => Promise<Collection[]>
   createCollection: (collection: NewCollection) => Promise<Collection>
@@ -68,29 +74,50 @@ function orThrow(result: CollectionRecord | WriteRefusal): CollectionRecord {
   return result
 }
 
-// A deleted photo's id stays in photoIds: the DTO keeps the photos still in the library.
+type PhotoSpan = Pick<Collection, 'coverUrl' | 'oldestPhotoAt' | 'newestPhotoAt'>
+
+// The newest photo is the cover, as it comes first in the library (R-BIB-20), whatever the order
+// the photos were added in. The dates run from the oldest photo to the newest.
+export function photoSpan(
+  photos: LivePhoto[],
+  thumbnailUrl: (cloudinaryId: string) => string,
+): PhotoSpan {
+  const newestFirst = photos.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
+  const newest = newestFirst.at(0)
+  const oldest = newestFirst.at(-1)
+  return {
+    coverUrl: newest ? thumbnailUrl(newest.cloudinaryId) : null,
+    oldestPhotoAt: oldest?.createdAt.toISOString() ?? null,
+    newestPhotoAt: newest?.createdAt.toISOString() ?? null,
+  }
+}
+
+// The DTO keeps the photos still in the library, in the order they were added.
 function toCollectionDto(
+  { thumbnailUrl }: CollectionsServiceDeps,
   { id, name, photoIds }: CollectionRecord,
-  liveIds: Set<string>,
+  live: LivePhotos,
 ): Collection {
-  return { id, name, photoIds: photoIds.filter((photoId) => liveIds.has(photoId)) }
+  const photos = photoIds.flatMap((photoId) => live.get(photoId) ?? [])
+  return { id, name, photoIds: photos.map((photo) => photo.id), ...photoSpan(photos, thumbnailUrl) }
 }
 
 // One query for every collection, however many there are.
-async function findLiveIds(
+async function findLivePhotos(
   { repository }: CollectionsServiceDeps,
   ownerId: string,
   records: CollectionRecord[],
-): Promise<Set<string>> {
+): Promise<LivePhotos> {
   const allIds = records.flatMap((record) => record.photoIds)
-  return new Set(await repository.findLivePhotoIds(ownerId, allIds))
+  const photos = await repository.findLivePhotos(ownerId, allIds)
+  return new Map(photos.map((photo) => [photo.id, photo]))
 }
 
 async function toCollection(
   deps: CollectionsServiceDeps,
   record: CollectionRecord,
 ): Promise<Collection> {
-  return toCollectionDto(record, await findLiveIds(deps, record.ownerId, [record]))
+  return toCollectionDto(deps, record, await findLivePhotos(deps, record.ownerId, [record]))
 }
 
 // « Été » before « Noël »: French order, not the order of the character codes.
@@ -99,8 +126,8 @@ async function listCollections(
   ownerId: string,
 ): Promise<Collection[]> {
   const records = await deps.repository.findAllOf(ownerId)
-  const liveIds = await findLiveIds(deps, ownerId, records)
-  const collections = records.map((record) => toCollectionDto(record, liveIds))
+  const live = await findLivePhotos(deps, ownerId, records)
+  const collections = records.map((record) => toCollectionDto(deps, record, live))
   return collections.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
 }
 
diff --git a/server/src/lib/cloudinary.ts b/server/src/lib/cloudinary.ts
index 451c878..c4f2c4e 100644
--- a/server/src/lib/cloudinary.ts
+++ b/server/src/lib/cloudinary.ts
@@ -60,6 +60,18 @@ function deliveryUrl(cloudinaryId: string, transformation: ImageTransformationOp
   })
 }
 
+const THUMBNAIL: ImageTransformationOptions = {
+  crop: 'fill',
+  gravity: 'auto',
+  width: THUMBNAIL_SIZE,
+  height: THUMBNAIL_SIZE,
+}
+
+// The library's square thumbnail; a collection's cover reuses it, an already allowed transformation.
+export function thumbnailUrl(cloudinaryId: string): string {
+  return deliveryUrl(cloudinaryId, [THUMBNAIL, OPTIMIZED_DELIVERY])
+}
+
 // limit: shrinks a larger photo, never enlarges one; photos stored before the 4096 px cap stay
 // at 1920 px and go through unchanged.
 export function deliveryUrls(cloudinaryId: string): DeliveryUrls {
@@ -68,15 +80,9 @@ export function deliveryUrls(cloudinaryId: string): DeliveryUrls {
     width: DISPLAY_SIZE,
     height: DISPLAY_SIZE,
   }
-  const thumbnail: ImageTransformationOptions = {
-    crop: 'fill',
-    gravity: 'auto',
-    width: THUMBNAIL_SIZE,
-    height: THUMBNAIL_SIZE,
-  }
   return {
     url: deliveryUrl(cloudinaryId, [display, OPTIMIZED_DELIVERY]),
-    thumbnailUrl: deliveryUrl(cloudinaryId, [thumbnail, OPTIMIZED_DELIVERY]),
+    thumbnailUrl: thumbnailUrl(cloudinaryId),
   }
 }
 
diff --git a/server/src/types.ts b/server/src/types.ts
index d1c8a4a..a286198 100644
--- a/server/src/types.ts
+++ b/server/src/types.ts
@@ -109,10 +109,15 @@ export type PhotoPage = {
 export type UnopenedPhotos = { photos: Photo[] }
 
 // photoIds: the owner's photos, in the order they were added; a deleted photo is not listed.
+// coverUrl: the signed thumbnail of its newest photo. oldestPhotoAt and newestPhotoAt: ISO dates
+// of its oldest and newest photos. All three null while it is empty.
 export type Collection = {
   id: string
   name: string
   photoIds: string[]
+  coverUrl: string | null
+  oldestPhotoAt: string | null
+  newestPhotoAt: string | null
 }
 
 // Sorted by name: the order of every menu that lists them.
~~~~

### Task 2: Library photos grouped by day

**Commit:** `feat(client): library photos grouped by day`

**Scope:** `photoDays.ts`, `DateGroup`, `PhotoGrid` / `PhotoList` take days, rows show the time; step 14's pending tiles first under « Aujourd'hui » (`withToday`); R-BIB-23 amended, R-BIB-66 new. Spec T1 to T5, T12.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/components/frame/PhotoGrid.tsx b/client/src/components/frame/PhotoGrid.tsx
index 102af49..18520cf 100644
--- a/client/src/components/frame/PhotoGrid.tsx
+++ b/client/src/components/frame/PhotoGrid.tsx
@@ -1,9 +1,10 @@
 import type { JSX, ReactNode } from 'react'
 import { PhotoGridTile } from '@/components/frame/PhotoGridTile.tsx'
-import type { Photo } from '@/photo.ts'
+import { DateGroup } from '@/components/library/DateGroup.tsx'
+import type { PhotoDay } from '@/photoDays.ts'
 
 type PhotoGridProps = {
-  photos: Photo[]
+  days: PhotoDay[]
   // null on the library page: no photo is on screen there.
   currentId: string | null
   onSelect: (id: string) => void
@@ -16,18 +17,26 @@ type PhotoGridProps = {
 const GRID_CLASSES =
   'grid grid-cols-3 gap-1 sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] sm:gap-4'
 
-export function PhotoGrid({ photos, currentId, onSelect, children }: PhotoGridProps): JSX.Element {
+// One grid per day, under its date: a day with two photos leaves the rest of its row empty.
+// children go first in the first day, « Aujourd'hui », where their photos appear once sent.
+export function PhotoGrid({ days, currentId, onSelect, children }: PhotoGridProps): JSX.Element {
   return (
-    <ul className={GRID_CLASSES}>
-      {children}
-      {photos.map((photo) => (
-        <PhotoGridTile
-          key={photo.id}
-          photo={photo}
-          isCurrent={photo.id === currentId}
-          onSelect={onSelect}
-        />
+    <div className="flex flex-col gap-6">
+      {days.map((day, index) => (
+        <DateGroup key={day.key} day={day}>
+          <ul className={GRID_CLASSES}>
+            {index === 0 && children}
+            {day.photos.map((photo) => (
+              <PhotoGridTile
+                key={photo.id}
+                photo={photo}
+                isCurrent={photo.id === currentId}
+                onSelect={onSelect}
+              />
+            ))}
+          </ul>
+        </DateGroup>
       ))}
-    </ul>
+    </div>
   )
 }
diff --git a/client/src/components/frame/PhotoList.tsx b/client/src/components/frame/PhotoList.tsx
index 90e5095..69e794f 100644
--- a/client/src/components/frame/PhotoList.tsx
+++ b/client/src/components/frame/PhotoList.tsx
@@ -1,9 +1,10 @@
 import type { JSX, ReactNode } from 'react'
 import { PhotoListRow } from '@/components/frame/PhotoListRow.tsx'
-import type { Photo } from '@/photo.ts'
+import { DateGroup } from '@/components/library/DateGroup.tsx'
+import type { PhotoDay } from '@/photoDays.ts'
 
 type PhotoListProps = {
-  photos: Photo[]
+  days: PhotoDay[]
   // null on the library page: no photo is on screen there.
   currentId: string | null
   onSelect: (id: string) => void
@@ -11,19 +12,26 @@ type PhotoListProps = {
   children?: ReactNode
 }
 
-export function PhotoList({ photos, currentId, onSelect, children }: PhotoListProps): JSX.Element {
+// The same days as the grid, children first in the first day. The page's full width:
+// thumbnails and « … » line up with the header's edges.
+export function PhotoList({ days, currentId, onSelect, children }: PhotoListProps): JSX.Element {
   return (
-    // The page's full width: thumbnails and « … » line up with the header's edges.
-    <ul className="flex flex-col gap-1">
-      {children}
-      {photos.map((photo) => (
-        <PhotoListRow
-          key={photo.id}
-          photo={photo}
-          isCurrent={photo.id === currentId}
-          onSelect={onSelect}
-        />
+    <div className="flex flex-col gap-6">
+      {days.map((day, index) => (
+        <DateGroup key={day.key} day={day}>
+          <ul className="flex flex-col gap-1">
+            {index === 0 && children}
+            {day.photos.map((photo) => (
+              <PhotoListRow
+                key={photo.id}
+                photo={photo}
+                isCurrent={photo.id === currentId}
+                onSelect={onSelect}
+              />
+            ))}
+          </ul>
+        </DateGroup>
       ))}
-    </ul>
+    </div>
   )
 }
diff --git a/client/src/components/frame/PhotoListRow.tsx b/client/src/components/frame/PhotoListRow.tsx
index 41f0a1d..62801d5 100644
--- a/client/src/components/frame/PhotoListRow.tsx
+++ b/client/src/components/frame/PhotoListRow.tsx
@@ -3,11 +3,8 @@ import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
 import type { Photo } from '@/photo.ts'
 import { photoLabel } from '@/photoLabel.ts'
 
-// In a list, photos of the same day are told apart by their time.
-const ROW_DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
-  dateStyle: 'medium',
-  timeStyle: 'short',
-})
+// The day is in the group's header: a row tells the photos of that day apart by their time.
+const ROW_TIME_FORMAT = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' })
 
 type PhotoListRowProps = {
   photo: Photo
@@ -40,7 +37,7 @@ export function PhotoListRow({ photo, isCurrent, onSelect }: PhotoListRowProps):
             dateTime={photo.createdAt}
             className="truncate text-sm font-medium tabular-nums sm:text-base"
           >
-            {ROW_DATE_FORMAT.format(new Date(photo.createdAt))}
+            {ROW_TIME_FORMAT.format(new Date(photo.createdAt))}
           </time>
           {photo.senderName !== null && (
             <span className="truncate text-sm text-muted-foreground">
diff --git a/client/src/components/library/DateGroup.tsx b/client/src/components/library/DateGroup.tsx
new file mode 100644
index 0000000..f8059d2
--- /dev/null
+++ b/client/src/components/library/DateGroup.tsx
@@ -0,0 +1,21 @@
+import type { JSX, ReactNode } from 'react'
+import type { PhotoDay } from '@/photoDays.ts'
+
+type DateGroupProps = {
+  day: PhotoDay
+  // The day's photos, as tiles or rows.
+  children: ReactNode
+}
+
+// A heading per day: screen readers can jump from one day to the next.
+export function DateGroup({ day, children }: DateGroupProps): JSX.Element {
+  const headingId = `day-${day.key}`
+  return (
+    <section aria-labelledby={headingId} className="flex flex-col gap-2">
+      <h2 id={headingId} className="text-sm font-semibold">
+        {day.label}
+      </h2>
+      {children}
+    </section>
+  )
+}
diff --git a/client/src/components/library/LibrarySection.tsx b/client/src/components/library/LibrarySection.tsx
index 3f5c22c..718f598 100644
--- a/client/src/components/library/LibrarySection.tsx
+++ b/client/src/components/library/LibrarySection.tsx
@@ -9,6 +9,7 @@ import {
 import { Button } from '@/components/ui/button.tsx'
 import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'
 import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
+import { groupByDay, type PhotoDay, withToday } from '@/photoDays.ts'
 import type { PendingUpload } from '@/upload/uploadQueue.ts'
 
 type LibrarySectionProps = {
@@ -33,6 +34,14 @@ function LoadMoreButton({ isLoadingMore, loadMore }: LoadMoreButtonProps): JSX.E
   )
 }
 
+// Every loaded page at once: « Charger plus » extends the last day instead of repeating it.
+// An upload on its way belongs to today, even before today has a photo.
+function libraryDays(library: PhotoLibrary, pending: PendingUpload[]): PhotoDay[] {
+  const now = new Date()
+  const days = groupByDay(library.photos, now)
+  return pending.length > 0 ? withToday(days, now) : days
+}
+
 function LibraryPhotos({
   library,
   layout,
@@ -44,18 +53,19 @@ function LibraryPhotos({
     return <p className="px-6 py-16 text-center text-muted-foreground">Chargement…</p>
   }
   if (library.photos.length === 0 && pending.length === 0) return emptyState
+  const days = libraryDays(library, pending)
   // Newest first, like the photos: the upload in progress sits right above the photos, where
   // its photo appears once sent.
   const newestFirst = pending.toReversed()
   // currentId null: no photo is on screen here, so no tile gets the frame's ring.
   return layout === 'grid' ? (
-    <PhotoGrid photos={library.photos} currentId={null} onSelect={onOpenPhoto}>
+    <PhotoGrid days={days} currentId={null} onSelect={onOpenPhoto}>
       {newestFirst.map((upload) => (
         <PendingGridTile key={upload.id} upload={upload} />
       ))}
     </PhotoGrid>
   ) : (
-    <PhotoList photos={library.photos} currentId={null} onSelect={onOpenPhoto}>
+    <PhotoList days={days} currentId={null} onSelect={onOpenPhoto}>
       {newestFirst.map((upload) => (
         <PendingListRow key={upload.id} upload={upload} />
       ))}
diff --git a/client/src/photoDays.ts b/client/src/photoDays.ts
new file mode 100644
index 0000000..6686824
--- /dev/null
+++ b/client/src/photoDays.ts
@@ -0,0 +1,54 @@
+import type { Photo } from '@/photo.ts'
+
+// key: the local calendar day, unique in a list; label: what the header says.
+export type PhotoDay = { key: string; label: string; photos: Photo[] }
+
+const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', {
+  weekday: 'short',
+  day: 'numeric',
+  month: 'short',
+})
+
+const DAY_WITH_YEAR_FORMAT = new Intl.DateTimeFormat('fr-FR', {
+  weekday: 'short',
+  day: 'numeric',
+  month: 'short',
+  year: 'numeric',
+})
+
+// The device's own calendar day: a photo added at 23:30 belongs to that evening, not to the
+// next day in UTC.
+function dayKey(date: Date): string {
+  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
+}
+
+// « Aujourd'hui », « Hier », then « dim. 22 nov. »; the year only when it is not this one.
+function dayLabel(date: Date, now: Date): string {
+  if (dayKey(date) === dayKey(now)) return "Aujourd'hui"
+  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
+  if (dayKey(date) === dayKey(yesterday)) return 'Hier'
+  const format = date.getFullYear() === now.getFullYear() ? DAY_FORMAT : DAY_WITH_YEAR_FORMAT
+  return format.format(date)
+}
+
+// One group per day, in the photos' own order (newest first). Keyed by day rather than by
+// neighbours: a day continued on the next « Charger plus » page still has one header.
+export function groupByDay(photos: Photo[], now: Date): PhotoDay[] {
+  const days = new Map<string, PhotoDay>()
+  for (const photo of photos) {
+    const date = new Date(photo.createdAt)
+    const key = dayKey(date)
+    const day = days.get(key) ?? { key, label: dayLabel(date, now), photos: [] }
+    day.photos.push(photo)
+    days.set(key, day)
+  }
+  return [...days.values()]
+}
+
+// Puts an empty « Aujourd'hui » first when today has no photo yet: the uploads on their way
+// need a day to sit in.
+export function withToday(days: PhotoDay[], now: Date): PhotoDay[] {
+  const key = dayKey(now)
+  if (days[0]?.key === key) return days
+  return [{ key, label: dayLabel(now, now), photos: [] }, ...days]
+}
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index 927ef86..e9a50d3 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -81,7 +81,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 
 **Ce que l'on peut faire**
 
-- Voir ses photos sous l'en-tête « Bibliothèque », qui indique leur nombre, en miniatures (grille de vignettes carrées) ou en liste.
+- Voir ses photos sous l'en-tête « Bibliothèque », qui indique leur nombre, en miniatures (grille de vignettes carrées) ou en liste, regroupées par jour sous la date (« Aujourd'hui », « Hier », « dim. 22 nov. »…).
 - Passer de l'un à l'autre avec les boutons « Miniatures » et « Liste ».
 - Charger les photos plus anciennes avec « Charger plus ».
 - Ouvrir une photo en grand dans l'application, puis passer à la suivante ou à la précédente d'un geste du doigt, avec les flèches à l'écran ou celles du clavier.
@@ -97,7 +97,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 1. R-BIB-20 · Les photos sont classées de la plus récente à la plus ancienne, selon leur date d'ajout ou de réception.
 2. R-BIB-21 · La bibliothèque affiche d'abord les 30 photos les plus récentes. « Charger plus » ajoute les 30 suivantes, et ainsi de suite ; le bouton disparaît quand toutes les photos sont affichées.
 3. R-BIB-22 · Les vignettes sont carrées : la photo est recadrée autour de son sujet principal. La photo entière reste visible en l'ouvrant.
-4. R-BIB-23 · En miniatures, chaque vignette est seule. En liste, chaque ligne montre la vignette, la date et l'heure d'ajout (par exemple « 24 nov. 2026, 14:05 ») et, pour une photo reçue, « Envoyée par » suivi du nom de l'expéditeur.
+4. R-BIB-23 · En miniatures, chaque vignette est seule. En liste, chaque ligne montre la vignette, l'heure d'ajout (par exemple « 14:05 » ; le jour est dans le titre du groupe, R-BIB-66) et, pour une photo reçue, « Envoyée par » suivi du nom de l'expéditeur.
 5. R-BIB-24 · L'affichage choisi (miniatures ou liste) est retenu sur l'appareil Par défaut : miniatures.
 6. R-BIB-25 · Cliquer sur une photo l'ouvre en grand dans l'application.
 7. R-BIB-26 · Remplacée : une photo reçue n'apparaît plus dès son arrivée, mais une fois découverte (R-BIB-42).
@@ -119,6 +119,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 23. R-BIB-52 · Les boutons apparaissent et s'effacent en fondu ; si l'appareil demande de réduire les animations, ils apparaissent et disparaissent d'un coup.
 24. R-BIB-53 · Les photos de la bibliothèque, en miniatures comme en liste, s'affichent sur le fond de la page et suivent le thème choisi, clair ou sombre, comme le reste de l'application ; leur menu « … » et les fenêtres qu'il ouvre aussi. Seul le cadre, et une photo ouverte en grand, restent toujours sombres. Sur une miniature, le bouton « … » reste un rond sombre, posé sur la photo. Sur un téléphone, les miniatures tiennent sur trois colonnes serrées ; leur bouton « … », plus petit et collé au coin, cache peu de la photo mais reste aussi facile à toucher. Sur Android, un appui long sur une miniature ouvre le même menu, sans ouvrir la photo en lâchant ; sur iPhone, le bouton « … » reste le chemin. Au clavier, sur une miniature, la touche Menu ou Maj+F10 ouvre aussi ce menu.
 25. R-BIB-42 · La bibliothèque se met à jour seule, sans recharger la page : une photo ajoutée depuis un autre appareil apparaît en tête, une photo reçue y entre à sa date de réception dès qu'elle est découverte (sur cet appareil ou un autre), une photo supprimée disparaît.
+26. R-BIB-66 · En miniatures comme en liste, les photos sont regroupées par jour d'ajout ou de réception, du plus récent au plus ancien, chaque jour sous un petit titre : « Aujourd'hui », « Hier », puis le jour abrégé (« dim. 22 nov. »), suivi de l'année quand ce n'est pas l'année en cours (« sam. 14 juin 2025 »). Le jour est celui de l'appareil : une photo ajoutée à 23 h 30 compte pour ce soir-là. Un jour commence une nouvelle rangée de vignettes. « Charger plus » continue le dernier jour affiché sans répéter son titre. Les titres changent au rechargement de la page, ou dès que la bibliothèque bouge : une page laissée ouverte après minuit peut encore dire « Aujourd'hui » pour la veille. Les photos en cours d'envoi (R-BIB-54) se placent en tête du jour « Aujourd'hui », qui s'affiche pour elles même quand aucune photo n'a encore été ajoutée ce jour-là.
 
 **Messages affichés**
 
@@ -129,6 +130,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 | Chargement de la bibliothèque                             | « Chargement… »                                                                                                |
 | Bibliothèque vide                                         | « Aucune photo pour l'instant. » et le bouton « Ajouter une photo »                                            |
 | Photo en cours d'arrivée                                  | « Chargement… »                                                                                                |
+| Titre d'un jour de photos                                 | « Aujourd'hui », « Hier », « dim. 22 nov. », ou « sam. 14 juin 2025 » une autre année                          |
 | Chargement des photos suivantes                           | « Chargement… » (sur le bouton « Charger plus »)                                                               |
 | Photos reçues en attente                                  | « Vous avez N nouvelles photos » et le bouton « Découvrir » (voir [partage.md](partage.md#recevoir-une-photo)) |
 | Description d'une photo (lecture d'écran)                 | « Photo du 24 novembre 2026 » ou « Photo envoyée par [nom], du 24 novembre 2026 »                              |
~~~~

### Task 3: Collection cards replace the chips

**Commit:** `feat(client): collection cards replace the chips`

**Scope:** `CollectionsRow`, `CollectionCard`, `CardText`; `photoCountLabel`; R-COL-15 amended, R-COL-22 new. Spec T8, T9.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/components/collections/CollectionCard.tsx b/client/src/components/collections/CollectionCard.tsx
new file mode 100644
index 0000000..2dad2e9
--- /dev/null
+++ b/client/src/components/collections/CollectionCard.tsx
@@ -0,0 +1,58 @@
+import { type JSX, type ReactNode, type RefObject, useEffect, useRef } from 'react'
+import { Link } from 'react-router'
+import { cn } from '@/lib/utils.ts'
+import { libraryPath } from '@/viewerHistory.ts'
+
+// 150 px on a phone, 180 from sm: on a 360 px screen the third card is cut, which says « more ».
+export const CARD_CLASSES =
+  'group flex w-[150px] flex-col gap-1.5 text-left outline-none sm:w-[180px]'
+
+// The cover carries the focus and selection rings; the text under it stays plain.
+export const COVER_CLASSES =
+  'grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground ring-offset-2 ring-offset-background transition-opacity group-hover:opacity-90 group-focus-visible:ring-3 group-focus-visible:ring-ring'
+
+type CardTextProps = { label: string; detail: string | null }
+
+type CollectionCardProps = CardTextProps & {
+  collectionId: string | null
+  isSelected: boolean
+  cover: ReactNode
+  linkRef?: RefObject<HTMLAnchorElement | null>
+}
+
+// Under the cover rather than over it: readable on any photo, in either theme, with no gradient.
+export function CardText({ label, detail }: CardTextProps): JSX.Element {
+  return (
+    <span className="flex min-w-0 flex-col">
+      <span className="truncate text-sm font-medium">{label}</span>
+      <span className="min-h-4 text-xs text-muted-foreground">{detail}</span>
+    </span>
+  )
+}
+
+// A link, not a button: each collection has its own address, so back and reload keep it.
+export function CollectionCard({
+  collectionId,
+  isSelected,
+  cover,
+  ...props
+}: CollectionCardProps): JSX.Element {
+  const ownRef = useRef<HTMLAnchorElement>(null)
+  const linkRef = props.linkRef ?? ownRef
+  // After a reload on a collection far along the row, its card scrolls into sight.
+  useEffect(() => {
+    if (isSelected) linkRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
+  }, [isSelected, linkRef])
+  return (
+    <Link
+      ref={linkRef}
+      to={libraryPath(collectionId)}
+      aria-current={isSelected ? 'page' : undefined}
+      title={props.label}
+      className={CARD_CLASSES}
+    >
+      <span className={cn(COVER_CLASSES, isSelected && 'ring-3 ring-primary')}>{cover}</span>
+      <CardText label={props.label} detail={props.detail} />
+    </Link>
+  )
+}
diff --git a/client/src/components/collections/CollectionChips.tsx b/client/src/components/collections/CollectionChips.tsx
deleted file mode 100644
index 81abf65..0000000
--- a/client/src/components/collections/CollectionChips.tsx
+++ /dev/null
@@ -1,99 +0,0 @@
-import { PlusIcon } from 'lucide-react'
-import { type JSX, type RefObject, useEffect, useRef, useState } from 'react'
-import { Link, useNavigate } from 'react-router'
-import { useCollections } from '@/collections/CollectionsContext.ts'
-import { CollectionNameDialog } from '@/components/collections/CollectionNameDialog.tsx'
-import { cn } from '@/lib/utils.ts'
-import { libraryPath } from '@/viewerHistory.ts'
-
-// 44 px under a finger, the size touch guidelines ask for; a mouse keeps the compact chip.
-const CHIP_CLASSES =
-  'inline-flex h-9 max-w-64 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:h-11'
-
-type CollectionChipsProps = {
-  selectedId: string | null
-  allChipRef: RefObject<HTMLAnchorElement | null>
-}
-
-type ChipLinkProps = {
-  collectionId: string | null
-  isSelected: boolean
-  label: string
-  linkRef?: RefObject<HTMLAnchorElement | null>
-}
-
-// A link, not a button: each collection has its own address, so back and reload keep it.
-function ChipLink({ collectionId, isSelected, label, ...props }: ChipLinkProps): JSX.Element {
-  const ownRef = useRef<HTMLAnchorElement>(null)
-  const linkRef = props.linkRef ?? ownRef
-  // After a reload on a collection far along the row, its chip scrolls into sight.
-  useEffect(() => {
-    if (isSelected) linkRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
-  }, [isSelected, linkRef])
-  return (
-    <Link
-      ref={linkRef}
-      to={libraryPath(collectionId)}
-      aria-current={isSelected ? 'page' : undefined}
-      title={label}
-      className={cn(
-        CHIP_CLASSES,
-        isSelected && 'border-primary bg-primary text-primary-foreground hover:bg-primary/85',
-      )}
-    >
-      <span className="truncate">{label}</span>
-    </Link>
-  )
-}
-
-// The new collection opens at once: it is empty, its notice tells how to fill it.
-function NewCollectionChip(): JSX.Element {
-  const [isCreating, setIsCreating] = useState(false)
-  const navigate = useNavigate()
-  return (
-    <>
-      <button type="button" className={CHIP_CLASSES} onClick={() => setIsCreating(true)}>
-        <PlusIcon aria-hidden className="size-4" />
-        Nouvelle collection
-      </button>
-      <CollectionNameDialog
-        target={isCreating ? { kind: 'create' } : null}
-        onClose={() => setIsCreating(false)}
-        onSaved={(collection) => navigate(libraryPath(collection.id))}
-      />
-    </>
-  )
-}
-
-// Only this row scrolls sideways; it reaches the screen edges so a cut chip says « more ».
-// allChipRef: the page focuses « Toutes » once the shown collection is deleted.
-export function CollectionChips({ selectedId, allChipRef }: CollectionChipsProps): JSX.Element {
-  const { collections, status } = useCollections()
-  return (
-    <nav aria-label="Collections" className="-mx-4 overflow-x-auto px-4 py-1">
-      <ul className="flex w-max items-center gap-2">
-        <li>
-          <ChipLink
-            collectionId={null}
-            isSelected={selectedId === null}
-            label="Toutes"
-            linkRef={allChipRef}
-          />
-        </li>
-        {collections.map(({ id, name }) => (
-          <li key={id}>
-            <ChipLink collectionId={id} isSelected={id === selectedId} label={name} />
-          </li>
-        ))}
-        {status === 'failed' && (
-          <li className="text-sm text-muted-foreground">
-            Vos collections n'ont pas pu être chargées.
-          </li>
-        )}
-        <li>
-          <NewCollectionChip />
-        </li>
-      </ul>
-    </nav>
-  )
-}
diff --git a/client/src/components/collections/CollectionsRow.tsx b/client/src/components/collections/CollectionsRow.tsx
new file mode 100644
index 0000000..107f9b4
--- /dev/null
+++ b/client/src/components/collections/CollectionsRow.tsx
@@ -0,0 +1,113 @@
+import { FolderIcon, ImagesIcon, PlusIcon } from 'lucide-react'
+import { type JSX, type RefObject, useState } from 'react'
+import { useNavigate } from 'react-router'
+import { useCollections } from '@/collections/CollectionsContext.ts'
+import type { Collection } from '@/collections/collection.ts'
+import {
+  CARD_CLASSES,
+  CardText,
+  COVER_CLASSES,
+  CollectionCard,
+} from '@/components/collections/CollectionCard.tsx'
+import { CollectionNameDialog } from '@/components/collections/CollectionNameDialog.tsx'
+import { photoCountLabel } from '@/components/library/libraryTexts.ts'
+import { libraryPath } from '@/viewerHistory.ts'
+
+const ICON_CLASSES = 'size-8'
+
+type CollectionsRowProps = {
+  selectedId: string | null
+  allCardRef: RefObject<HTMLAnchorElement | null>
+}
+
+// Its newest photo, or a neutral folder while it is empty. alt="": the name under it says it.
+function CollectionCover({ coverUrl }: Pick<Collection, 'coverUrl'>): JSX.Element {
+  if (coverUrl === null) return <FolderIcon aria-hidden className={ICON_CLASSES} />
+  return (
+    <img src={coverUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
+  )
+}
+
+// The new collection opens at once: it is empty, its notice tells how to fill it.
+function NewCollectionCard(): JSX.Element {
+  const [isCreating, setIsCreating] = useState(false)
+  const navigate = useNavigate()
+  return (
+    <>
+      <button type="button" className={CARD_CLASSES} onClick={() => setIsCreating(true)}>
+        <span className={COVER_CLASSES}>
+          <PlusIcon aria-hidden className={ICON_CLASSES} />
+        </span>
+        <CardText label="Nouvelle collection" detail={null} />
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
+type AllPhotosCardProps = { isSelected: boolean; linkRef: RefObject<HTMLAnchorElement | null> }
+
+// The whole library: no single photo stands for it, an icon does.
+function AllPhotosCard({ isSelected, linkRef }: AllPhotosCardProps): JSX.Element {
+  return (
+    <CollectionCard
+      collectionId={null}
+      isSelected={isSelected}
+      label="Toutes"
+      detail={null}
+      cover={<ImagesIcon aria-hidden className={ICON_CLASSES} />}
+      linkRef={linkRef}
+    />
+  )
+}
+
+function CollectionCards({ selectedId }: Pick<CollectionsRowProps, 'selectedId'>): JSX.Element {
+  const { collections } = useCollections()
+  return (
+    <>
+      {collections.map(({ id, name, photoIds, coverUrl }) => (
+        <li key={id} className="snap-start">
+          <CollectionCard
+            collectionId={id}
+            isSelected={id === selectedId}
+            label={name}
+            detail={photoCountLabel(photoIds.length)}
+            cover={<CollectionCover coverUrl={coverUrl} />}
+          />
+        </li>
+      ))}
+    </>
+  )
+}
+
+// Only this row scrolls sideways, snapping card by card; it reaches the screen edges so a cut
+// card says « more », and scroll-px-4 stops the first card on the header's edge.
+// allCardRef: the page focuses « Toutes » once the shown collection is deleted.
+export function CollectionsRow({ selectedId, allCardRef }: CollectionsRowProps): JSX.Element {
+  const { status } = useCollections()
+  return (
+    <nav
+      aria-label="Collections"
+      className="-mx-4 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 py-1.5"
+    >
+      <ul className="flex w-max items-start gap-3">
+        <li className="snap-start">
+          <AllPhotosCard isSelected={selectedId === null} linkRef={allCardRef} />
+        </li>
+        <CollectionCards selectedId={selectedId} />
+        {status === 'failed' && (
+          <li className="w-[150px] text-sm text-muted-foreground">
+            Vos collections n'ont pas pu être chargées.
+          </li>
+        )}
+        <li className="snap-start">
+          <NewCollectionCard />
+        </li>
+      </ul>
+    </nav>
+  )
+}
diff --git a/client/src/components/library/libraryTexts.ts b/client/src/components/library/libraryTexts.ts
index 960d04c..7ba8e5e 100644
--- a/client/src/components/library/libraryTexts.ts
+++ b/client/src/components/library/libraryTexts.ts
@@ -1,6 +1,11 @@
+// « Aucune photo », « 1 photo », « 12 photos »: the library's header and the collection cards.
+export function photoCountLabel(count: number): string {
+  if (count === 0) return 'Aucune photo'
+  return count === 1 ? '1 photo' : `${count} photos`
+}
+
 // The API sends no total: « Plus de 30 photos » while older pages are not loaded yet.
 export function libraryCountLabel(loadedCount: number, hasMore: boolean): string {
   if (hasMore) return `Plus de ${loadedCount} photos`
-  if (loadedCount === 0) return 'Aucune photo'
-  return loadedCount === 1 ? '1 photo' : `${loadedCount} photos`
+  return photoCountLabel(loadedCount)
 }
diff --git a/client/src/pages/LibraryPage.tsx b/client/src/pages/LibraryPage.tsx
index 67a4464..b2d8661 100644
--- a/client/src/pages/LibraryPage.tsx
+++ b/client/src/pages/LibraryPage.tsx
@@ -1,5 +1,5 @@
 import { type JSX, type RefObject, useRef, useState } from 'react'
-import { CollectionChips } from '@/components/collections/CollectionChips.tsx'
+import { CollectionsRow } from '@/components/collections/CollectionsRow.tsx'
 import { SelectedCollectionBar } from '@/components/collections/SelectedCollectionBar.tsx'
 import { AddPhotoFab } from '@/components/library/AddPhotoFab.tsx'
 import { AddPhotoPanel } from '@/components/library/AddPhotoPanel.tsx'
@@ -90,7 +90,7 @@ function LibraryContent(props: LibraryContentProps): JSX.Element {
   const [layout, setLayout] = useLibraryLayout()
   const { selected, library, onAdd, addButtonRef } = props
   // « Toutes »: where focus lands once the shown collection is deleted.
-  const allChipRef = useRef<HTMLAnchorElement>(null)
+  const allCardRef = useRef<HTMLAnchorElement>(null)
   return (
     <>
       <LibraryHeader
@@ -103,9 +103,9 @@ function LibraryContent(props: LibraryContentProps): JSX.Element {
       />
       {/* Above the photos: news from the family comes first. */}
       <LibraryMail />
-      <CollectionChips selectedId={selectedCollectionId(selected)} allChipRef={allChipRef} />
+      <CollectionsRow selectedId={selectedCollectionId(selected)} allCardRef={allCardRef} />
       {selected.status === 'found' && (
-        <SelectedCollectionBar collection={selected.collection} fallbackRef={allChipRef} />
+        <SelectedCollectionBar collection={selected.collection} fallbackRef={allCardRef} />
       )}
       <LibraryBody {...props} layout={layout} />
     </>
diff --git a/docs/produit/collections.md b/docs/produit/collections.md
index 1a72cdf..2be51ce 100644
--- a/docs/produit/collections.md
+++ b/docs/produit/collections.md
@@ -25,7 +25,7 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 
 | Situation                       | Message                                                                                                                                                                               |
 | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| Rangée des collections          | « Toutes », le nom de chaque collection, puis « Nouvelle collection »                                                                                                                 |
+| Rangée des collections          | « Toutes », chaque collection (son image, son nom, « N photos »), puis « Nouvelle collection »                                                                                        |
 | Chargement impossible           | « Vos collections n'ont pas pu être chargées. »                                                                                                                                       |
 | Création                        | « Nouvelle collection » — « Donnez-lui un nom, puis rangez-y vos photos depuis leur menu « … ». » Champ « Nom de la collection », bouton « Créer »                                    |
 | Renommage                       | « Renommer la collection » — « Le nouveau nom s'affiche partout, sur tous vos appareils. » Champ « Nom de la collection », bouton « Renommer »                                        |
@@ -85,13 +85,14 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 
 **Règles**
 
-1. R-COL-15 · La rangée propose « Toutes » puis chaque collection, par ordre alphabétique (R-COL-03). Le choix en cours est mis en avant. Quand elle dépasse la largeur de l'écran, elle défile de côté ; le reste de la page ne bouge pas.
+1. R-COL-15 · La rangée propose « Toutes » puis chaque collection, par ordre alphabétique (R-COL-03), sous forme de cartes (R-COL-22). Le choix en cours est mis en avant par un contour autour de son image. Quand elle dépasse la largeur de l'écran, elle défile de côté et s'arrête toujours au début d'une carte ; le reste de la page ne bouge pas.
 2. R-COL-16 · Une collection affiche ses photos dans le même ordre que la bibliothèque (R-BIB-20), 30 à la fois avec « Charger plus ».
 3. R-COL-17 · La collection choisie fait partie de l'adresse de la page : recharger la page, revenir en arrière ou ouvrir un lien enregistré montre la même collection.
 4. R-COL-18 · Une photo ouverte en grand depuis une collection fait défiler les seules photos de cette collection ; la fermer ramène dans la collection.
 5. R-COL-19 · Une collection vide le dit, explique comment y ranger des photos et propose « Ajouter une photo », qui ouvre le même panneau que « Ajouter ».
 6. R-COL-20 · Une collection supprimée sur un autre appareil, ou un lien vers une collection qui n'existe pas affiche « Cette collection n'existe plus. » et propose « Voir toutes les photos ».
 7. R-COL-21 · La collection affichée suit les changements sans recharger la page : une photo rangée ou retirée, sur cet appareil ou un autre, y apparaît ou en disparaît. Une photo ajoutée pendant qu'une collection est affichée entre dans la bibliothèque et est rangée dans cette collection ; si le rangement échoue, un message le dit et la photo reste dans la bibliothèque.
+8. R-COL-22 · Chaque carte montre une image carrée, puis sous elle le nom et le nombre de photos (« Aucune photo », « 1 photo », « 12 photos »). L'image d'une collection est sa photo la plus récente, quel que soit l'ordre dans lequel les photos y ont été rangées, et change d'elle-même quand une photo plus récente y entre ou que celle-ci en sort ; une collection vide montre un dossier gris. « Toutes » montre une pile de photos, sans nombre, et « Nouvelle collection », au bout, un « + ». Un nom trop long est coupé, mais s'affiche en entier au survol. Sur un téléphone, une carte fait environ 150 px de large, et la troisième est coupée au bord de l'écran ; sur un ordinateur, environ 180 px.
 
 **Messages affichés**
 
~~~~

### Task 4: A shown collection titles the page

**Commit:** `feat(client): a shown collection titles the page`

**Scope:** `CollectionTitle`, `collectionSummary`, `LibraryTitle`, `LibraryHeader({ title })`, `PageTitle`; collection menu `w-max`; ARCHITECTURE.md page row; R-COL-23 new. Spec T10, T11.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 988f6b1..39e84d9 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -43,15 +43,15 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 
 ## Pages
 
-| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
-| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
-| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
-| `/`                  | bibliothèque, consacrée aux photos (les amis sont sur `/friends`) : en tête « Bibliothèque », le nombre de photos (« Plus de N photos » tant que des pages restent), « Ajouter », « Mode cadre » et le choix vignettes/liste (`LibraryHeader`) ; sous `md`, « Ajouter » devient un bouton flottant en bas à droite (`AddPhotoFab`) et « Mode cadre » laisse la place à l'onglet « Cadre » ; « Ajouter » ouvre le panneau « Ajouter une photo » (`AddPhotoPanel`, feuille par le bas sur mobile, fenêtre au centre sur ordinateur, comme le panneau d'envoi : `ResponsivePanel`) : « Prendre une photo » ou « Choisir des images » (jusqu'à 20 ; JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui ferme le panneau et ouvre celui de l'envoi, pour l'ami seulement ; puis, quand des photos reçues attendent, l'annonce compacte « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la rangée de collections « Toutes », « Noël »…, « Nouvelle collection » (`components/collections/CollectionChips`, des liens `/?collection=<id>` qui défilent de côté : retour et rechargement gardent la collection ; `useSelectedCollection` la retrouve dans la liste, « Cette collection n'existe plus. » sinon ; la collection affichée a son nom et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer » (`SelectedCollectionBar`, retour à `/` après suppression)), puis les photos du compte ou de la collection choisie (`usePhotoLibrary` passe `collectionId` à `GET /api/photos` et recharge la collection sur `collections:changed` ; une photo ajoutée depuis une collection y est rangée, `useLibraryUpload`) en vignettes ou en liste (choix mémorisé par appareil ; vide : « Ajouter une photo »), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/` ; `collection` reste dans l'adresse et la visionneuse ne parcourt que les photos affichées) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Lancer la radio », « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
-| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour, d'une de ses collections ou d'une radio (`/frame?radio=<id>`), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; tant qu'une radio joue, « Photos » la montre en tête, cochée (« Radio ») ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
-| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
-| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et l'onglet « Compte » du téléphone : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
-| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
+| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
+| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
+| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
+| `/`                  | bibliothèque, consacrée aux photos (les amis sont sur `/friends`) : en tête « Bibliothèque », le nombre de photos (« Plus de N photos » tant que des pages restent), « Ajouter », « Mode cadre » et le choix vignettes/liste (`LibraryHeader`) ; sous `md`, « Ajouter » devient un bouton flottant en bas à droite (`AddPhotoFab`) et « Mode cadre » laisse la place à l'onglet « Cadre » ; « Ajouter » ouvre le panneau « Ajouter une photo » (`AddPhotoPanel`, feuille par le bas sur mobile, fenêtre au centre sur ordinateur, comme le panneau d'envoi : `ResponsivePanel`) : « Prendre une photo » ou « Choisir des images » (jusqu'à 20 ; JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui ferme le panneau et ouvre celui de l'envoi, pour l'ami seulement ; puis, quand des photos reçues attendent, l'annonce compacte « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la rangée de cartes de collections « Toutes », « Noël »…, « Nouvelle collection » (`components/collections/CollectionsRow` et `CollectionCard` : la couverture `coverUrl`, le nom et « N photos » dessous ; des liens `/?collection=<id>` qui défilent de côté, carte par carte (`snap-x`) : retour et rechargement gardent la collection ; `useSelectedCollection` la retrouve dans la liste, « Cette collection n'existe plus. » sinon ; la collection affichée remplace le titre « Bibliothèque » par son nom, « N photos · 1 nov. 2022 – 22 nov. 2026 » (`oldestPhotoAt`, `newestPhotoAt`) et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer » (`CollectionTitle`, retour à `/` après suppression)), puis les photos du compte ou de la collection choisie (`usePhotoLibrary` passe `collectionId` à `GET /api/photos` et recharge la collection sur `collections:changed` ; une photo ajoutée depuis une collection y est rangée, `useLibraryUpload`) en vignettes ou en liste, regroupées par jour sous « Aujourd'hui », « Hier », « dim. 22 nov. » (`photoDays.ts`, `DateGroup`) (choix mémorisé par appareil ; vide : « Ajouter une photo »), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/` ; `collection` reste dans l'adresse et la visionneuse ne parcourt que les photos affichées) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Lancer la radio », « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
+| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour, d'une de ses collections ou d'une radio (`/frame?radio=<id>`), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; tant qu'une radio joue, « Photos » la montre en tête, cochée (« Radio ») ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
+| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
+| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et l'onglet « Compte » du téléphone : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
+| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
 
 Visionneuse : l'adresse `/?photo=<id>` ouvre la photo, un lien la partage. Ouvrir depuis la bibliothèque ajoute une entrée d'historique, passer d'une photo à l'autre la remplace, et fermer revient en arrière : le bouton retour d'Android ferme la visionneuse. Près de la fin des photos chargées, la page suivante se charge. Une photo supprimée pendant qu'on la regarde laisse sa place à la suivante (la précédente si c'était la plus ancienne), et la visionneuse se ferme quand il n'en reste aucune ; un lien vers une photo inconnue charge les pages jusqu'à la trouver, puis ferme s'il n'y en a plus. « Mode cadre » remplace l'entrée de la visionneuse (ou s'ajoute au-dessus de la bibliothèque depuis son en-tête) : quitter le cadre ramène une seule visionneuse, et le retour arrière la bibliothèque. Le lien « Cadre » de la barre ajoute une entrée d'historique ordinaire : c'est aussi l'adresse qu'un cadre ouvre au démarrage.
 
diff --git a/client/src/components/collections/SelectedCollectionBar.tsx b/client/src/components/collections/CollectionTitle.tsx
similarity index 82%
rename from client/src/components/collections/SelectedCollectionBar.tsx
rename to client/src/components/collections/CollectionTitle.tsx
index c487742..5517074 100644
--- a/client/src/components/collections/SelectedCollectionBar.tsx
+++ b/client/src/components/collections/CollectionTitle.tsx
@@ -4,6 +4,7 @@ import { useNavigate } from 'react-router'
 import { toast } from 'sonner'
 import type { Collection } from '@/collections/collection.ts'
 import { CollectionNameDialog } from '@/components/collections/CollectionNameDialog.tsx'
+import { collectionSummary } from '@/components/collections/collectionSummary.ts'
 import { DeleteCollectionDialog } from '@/components/collections/DeleteCollectionDialog.tsx'
 import { Button } from '@/components/ui/button.tsx'
 import {
@@ -39,7 +40,7 @@ type BarDialogsProps = {
   triggerRef: RefObject<HTMLButtonElement | null>
 }
 
-type SelectedCollectionBarProps = {
+type CollectionTitleProps = {
   collection: Collection
   fallbackRef: RefObject<HTMLElement | null>
 }
@@ -90,8 +91,9 @@ function CollectionMenu({ name, onSelect, onPlay, triggerRef }: CollectionMenuPr
           <EllipsisIcon />
         </Button>
       </DropdownMenuTrigger>
-      {/* Start: the button follows the name, at the left of the page. */}
-      <DropdownMenuContent align="start">
+      {/* Start: the button follows the name, at the left of the page. w-max: the content would
+          take the button's width and wrap its items. */}
+      <DropdownMenuContent align="start" className="w-max">
         <CollectionMenuItems onSelect={onSelect} onPlay={onPlay} />
       </DropdownMenuContent>
     </DropdownMenu>
@@ -123,7 +125,7 @@ function BarDialogs({ collection, dialog, onClose, ...props }: BarDialogsProps):
 }
 
 // Replace: back must not return to a collection that no longer exists. The dialog closed at the
-// click, before the server agreed, and gave focus back to the menu button that leaves with the bar
+// click, before the server agreed, and gave focus back to the menu button that leaves with the title
 // now: « Toutes » stays on the page.
 function useLeaveDeletedCollection(fallbackRef: RefObject<HTMLElement | null>): () => void {
   const navigate = useNavigate()
@@ -133,18 +135,15 @@ function useLeaveDeletedCollection(fallbackRef: RefObject<HTMLElement | null>):
   }
 }
 
-export function SelectedCollectionBar({
-  collection,
-  fallbackRef,
-}: SelectedCollectionBarProps): JSX.Element {
+// The « … » beside the name: the menu and the dialogs it opens.
+function CollectionActions({ collection, fallbackRef }: CollectionTitleProps): JSX.Element {
   const [dialog, setDialog] = useState<BarDialog>(null)
   const triggerRef = useRef<HTMLButtonElement>(null)
   const playOnFrame = usePlayOnFrame(collection.id)
   const leaveDeletedCollection = useLeaveDeletedCollection(fallbackRef)
 
   return (
-    <div className="flex min-w-0 items-center gap-2">
-      <h2 className="text-lg font-medium wrap-anywhere">{collection.name}</h2>
+    <>
       <CollectionMenu
         name={collection.name}
         onSelect={setDialog}
@@ -158,6 +157,21 @@ export function SelectedCollectionBar({
         onClose={() => setDialog(null)}
         triggerRef={triggerRef}
       />
+    </>
+  )
+}
+
+// The page's title while a collection is shown: its name, what it holds and its own menu.
+export function CollectionTitle({ collection, fallbackRef }: CollectionTitleProps): JSX.Element {
+  return (
+    <div className="flex min-w-0 flex-col">
+      <div className="flex min-w-0 items-center gap-1">
+        <h1 className="text-2xl font-semibold tracking-tight wrap-anywhere sm:text-3xl">
+          {collection.name}
+        </h1>
+        <CollectionActions collection={collection} fallbackRef={fallbackRef} />
+      </div>
+      <p className="min-h-5 text-sm text-muted-foreground">{collectionSummary(collection)}</p>
     </div>
   )
 }
diff --git a/client/src/components/collections/collectionSummary.ts b/client/src/components/collections/collectionSummary.ts
new file mode 100644
index 0000000..8a4fa72
--- /dev/null
+++ b/client/src/components/collections/collectionSummary.ts
@@ -0,0 +1,14 @@
+import type { Collection } from '@/collections/collection.ts'
+import { photoCountLabel } from '@/components/library/libraryTexts.ts'
+
+const SUMMARY_DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })
+
+// « 12 photos · 1 nov. 2022 – 22 nov. 2026 », from its oldest photo to its newest; one date when
+// they share a day, none while it is empty.
+export function collectionSummary({ photoIds, oldestPhotoAt, newestPhotoAt }: Collection): string {
+  const count = photoCountLabel(photoIds.length)
+  if (oldestPhotoAt === null || newestPhotoAt === null) return count
+  const oldest = SUMMARY_DATE_FORMAT.format(new Date(oldestPhotoAt))
+  const newest = SUMMARY_DATE_FORMAT.format(new Date(newestPhotoAt))
+  return oldest === newest ? `${count} · ${newest}` : `${count} · ${oldest} – ${newest}`
+}
diff --git a/client/src/components/library/LibraryHeader.tsx b/client/src/components/library/LibraryHeader.tsx
index 87c5bf7..1a98d5c 100644
--- a/client/src/components/library/LibraryHeader.tsx
+++ b/client/src/components/library/LibraryHeader.tsx
@@ -10,16 +10,34 @@ import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
 import { LIBRARY_BELOW_STATE } from '@/viewerHistory.ts'
 
 type LibraryHeaderProps = {
-  library: PhotoLibrary
+  // LibraryTitle, or a shown collection's own title.
+  title: JSX.Element
   layout: LibraryLayout
   onLayoutChange: (layout: LibraryLayout) => void
   onAdd: () => void
-  // false over a collection that cannot be shown: its photos, if any were loaded, are stale.
-  showsCount: boolean
   // The add and send panels give focus back to « Ajouter » when they close.
   addButtonRef: RefObject<HTMLButtonElement | null>
 }
 
+type LibraryTitleProps = {
+  library: PhotoLibrary
+  // false over a collection that cannot be shown: its photos, if any were loaded, are stale.
+  showsCount: boolean
+}
+
+export function LibraryTitle({ library, showsCount }: LibraryTitleProps): JSX.Element {
+  return (
+    <div className="flex min-w-0 flex-col">
+      <h1 className="text-2xl font-semibold tracking-tight">Bibliothèque</h1>
+      <p className="min-h-5 text-sm text-muted-foreground">
+        {showsCount &&
+          library.isFirstPageLoaded &&
+          libraryCountLabel(library.photos.length, library.hasMore)}
+      </p>
+    </div>
+  )
+}
+
 function FrameModeButton(): JSX.Element {
   return (
     <Button
@@ -39,24 +57,16 @@ function FrameModeButton(): JSX.Element {
 }
 
 export function LibraryHeader({
-  library,
+  title,
   layout,
   onLayoutChange,
   onAdd,
-  showsCount,
   addButtonRef,
 }: LibraryHeaderProps): JSX.Element {
   return (
     // A phone has the floating « Ajouter » and the Cadre tab: only the layout toggle stays here.
     <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
-      <div className="flex min-w-0 flex-col">
-        <h1 className="text-2xl font-semibold tracking-tight">Bibliothèque</h1>
-        <p className="min-h-5 text-sm text-muted-foreground">
-          {showsCount &&
-            library.isFirstPageLoaded &&
-            libraryCountLabel(library.photos.length, library.hasMore)}
-        </p>
-      </div>
+      {title}
       <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
         <Button ref={addButtonRef} size="lg" className="hidden md:inline-flex" onClick={onAdd}>
           <PlusIcon aria-hidden data-icon="inline-start" />
diff --git a/client/src/pages/LibraryPage.tsx b/client/src/pages/LibraryPage.tsx
index b2d8661..82721be 100644
--- a/client/src/pages/LibraryPage.tsx
+++ b/client/src/pages/LibraryPage.tsx
@@ -1,9 +1,9 @@
 import { type JSX, type RefObject, useRef, useState } from 'react'
 import { CollectionsRow } from '@/components/collections/CollectionsRow.tsx'
-import { SelectedCollectionBar } from '@/components/collections/SelectedCollectionBar.tsx'
+import { CollectionTitle } from '@/components/collections/CollectionTitle.tsx'
 import { AddPhotoFab } from '@/components/library/AddPhotoFab.tsx'
 import { AddPhotoPanel } from '@/components/library/AddPhotoPanel.tsx'
-import { LibraryHeader } from '@/components/library/LibraryHeader.tsx'
+import { LibraryHeader, LibraryTitle } from '@/components/library/LibraryHeader.tsx'
 import {
   EmptyCollection,
   EmptyLibrary,
@@ -86,6 +86,18 @@ function LibraryBody(props: LibraryBodyProps): JSX.Element {
   )
 }
 
+type PageTitleProps = Pick<LibraryContentProps, 'selected' | 'library'> & {
+  allCardRef: RefObject<HTMLAnchorElement | null>
+}
+
+// A shown collection titles the page with its own name; « Toutes » keeps « Bibliothèque ».
+function PageTitle({ selected, library, allCardRef }: PageTitleProps): JSX.Element {
+  if (selected.status === 'found') {
+    return <CollectionTitle collection={selected.collection} fallbackRef={allCardRef} />
+  }
+  return <LibraryTitle library={library} showsCount={isShowingPhotos(selected)} />
+}
+
 function LibraryContent(props: LibraryContentProps): JSX.Element {
   const [layout, setLayout] = useLibraryLayout()
   const { selected, library, onAdd, addButtonRef } = props
@@ -94,19 +106,15 @@ function LibraryContent(props: LibraryContentProps): JSX.Element {
   return (
     <>
       <LibraryHeader
-        library={library}
+        title={<PageTitle selected={selected} library={library} allCardRef={allCardRef} />}
         layout={layout}
         onLayoutChange={setLayout}
         onAdd={onAdd}
-        showsCount={isShowingPhotos(selected)}
         addButtonRef={addButtonRef}
       />
       {/* Above the photos: news from the family comes first. */}
       <LibraryMail />
       <CollectionsRow selectedId={selectedCollectionId(selected)} allCardRef={allCardRef} />
-      {selected.status === 'found' && (
-        <SelectedCollectionBar collection={selected.collection} fallbackRef={allCardRef} />
-      )}
       <LibraryBody {...props} layout={layout} />
     </>
   )
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index e9a50d3..d3d8072 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -123,17 +123,17 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 
 **Messages affichés**
 
-| Situation                                                 | Message                                                                                                        |
-| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
-| En-tête                                                   | « Bibliothèque », le nombre de photos, et les boutons « Ajouter » et « Mode cadre » (ordinateur)               |
-| Bouton d'ajout sur un téléphone (survol, lecture d'écran) | « Ajouter une photo »                                                                                          |
-| Chargement de la bibliothèque                             | « Chargement… »                                                                                                |
-| Bibliothèque vide                                         | « Aucune photo pour l'instant. » et le bouton « Ajouter une photo »                                            |
-| Photo en cours d'arrivée                                  | « Chargement… »                                                                                                |
-| Titre d'un jour de photos                                 | « Aujourd'hui », « Hier », « dim. 22 nov. », ou « sam. 14 juin 2025 » une autre année                          |
-| Chargement des photos suivantes                           | « Chargement… » (sur le bouton « Charger plus »)                                                               |
-| Photos reçues en attente                                  | « Vous avez N nouvelles photos » et le bouton « Découvrir » (voir [partage.md](partage.md#recevoir-une-photo)) |
-| Description d'une photo (lecture d'écran)                 | « Photo du 24 novembre 2026 » ou « Photo envoyée par [nom], du 24 novembre 2026 »                              |
+| Situation                                                 | Message                                                                                                                                                   |
+| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| En-tête                                                   | « Bibliothèque », le nombre de photos, et les boutons « Ajouter » et « Mode cadre » (ordinateur) ; le nom d'une collection affichée à la place (R-COL-23) |
+| Bouton d'ajout sur un téléphone (survol, lecture d'écran) | « Ajouter une photo »                                                                                                                                     |
+| Chargement de la bibliothèque                             | « Chargement… »                                                                                                                                           |
+| Bibliothèque vide                                         | « Aucune photo pour l'instant. » et le bouton « Ajouter une photo »                                                                                       |
+| Photo en cours d'arrivée                                  | « Chargement… »                                                                                                                                           |
+| Titre d'un jour de photos                                 | « Aujourd'hui », « Hier », « dim. 22 nov. », ou « sam. 14 juin 2025 » une autre année                                                                     |
+| Chargement des photos suivantes                           | « Chargement… » (sur le bouton « Charger plus »)                                                                                                          |
+| Photos reçues en attente                                  | « Vous avez N nouvelles photos » et le bouton « Découvrir » (voir [partage.md](partage.md#recevoir-une-photo))                                            |
+| Description d'une photo (lecture d'écran)                 | « Photo du 24 novembre 2026 » ou « Photo envoyée par [nom], du 24 novembre 2026 »                                                                         |
 
 **Ce qui n'est pas possible**
 
diff --git a/docs/produit/collections.md b/docs/produit/collections.md
index 2be51ce..e6786e5 100644
--- a/docs/produit/collections.md
+++ b/docs/produit/collections.md
@@ -78,7 +78,7 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 
 **Ce que l'on peut faire**
 
-- Dans la bibliothèque, choisir une collection dans la rangée placée sous l'annonce des photos reçues : seules ses photos s'affichent, sous son nom.
+- Dans la bibliothèque, choisir une collection dans la rangée placée sous l'annonce des photos reçues : seules ses photos s'affichent, et son nom devient le titre de la page.
 - Revenir à toutes les photos avec « Toutes », au début de la rangée.
 - Ouvrir une photo de la collection en grand et passer d'une photo à l'autre sans sortir de la collection.
 - Ajouter une photo avec « Ajouter » pendant qu'une collection est affichée : elle y est rangée aussitôt.
@@ -93,6 +93,7 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 6. R-COL-20 · Une collection supprimée sur un autre appareil, ou un lien vers une collection qui n'existe pas affiche « Cette collection n'existe plus. » et propose « Voir toutes les photos ».
 7. R-COL-21 · La collection affichée suit les changements sans recharger la page : une photo rangée ou retirée, sur cet appareil ou un autre, y apparaît ou en disparaît. Une photo ajoutée pendant qu'une collection est affichée entre dans la bibliothèque et est rangée dans cette collection ; si le rangement échoue, un message le dit et la photo reste dans la bibliothèque.
 8. R-COL-22 · Chaque carte montre une image carrée, puis sous elle le nom et le nombre de photos (« Aucune photo », « 1 photo », « 12 photos »). L'image d'une collection est sa photo la plus récente, quel que soit l'ordre dans lequel les photos y ont été rangées, et change d'elle-même quand une photo plus récente y entre ou que celle-ci en sort ; une collection vide montre un dossier gris. « Toutes » montre une pile de photos, sans nombre, et « Nouvelle collection », au bout, un « + ». Un nom trop long est coupé, mais s'affiche en entier au survol. Sur un téléphone, une carte fait environ 150 px de large, et la troisième est coupée au bord de l'écran ; sur un ordinateur, environ 180 px.
+9. R-COL-23 · Une collection affichée prend la place de « Bibliothèque » en tête de page : son nom en grand titre, suivi de son menu « … » (« Lire sur le cadre », « Renommer », « Supprimer »), et dessous le nombre de ses photos et les dates de la plus ancienne à la plus récente (« 12 photos · 1 nov. 2022 – 22 nov. 2026 »). Une seule date quand toutes ses photos sont du même jour, aucune quand elle est vide (« Aucune photo »). Avec « Toutes », l'en-tête redevient « Bibliothèque » et le nombre de photos de la bibliothèque.
 
 **Messages affichés**
 
~~~~

### Task 5: Split the list row under the function size limit

**Commit:** `refactor(client): split the list row under the function size limit`

**Scope:** `PhotoListRow` (43 lines since before this stack) splits into `RowText` and `ROW_CLASSES`; nothing changes on screen.

**Gate:** `pnpm check` and `pnpm typecheck` green; `pnpm build` and `pnpm test` green at the tip.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/components/frame/PhotoListRow.tsx b/client/src/components/frame/PhotoListRow.tsx
index 62801d5..4c8b409 100644
--- a/client/src/components/frame/PhotoListRow.tsx
+++ b/client/src/components/frame/PhotoListRow.tsx
@@ -6,6 +6,30 @@ import { photoLabel } from '@/photoLabel.ts'
 // The day is in the group's header: a row tells the photos of that day apart by their time.
 const ROW_TIME_FORMAT = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' })
 
+// No side padding: the thumbnail and the ellipsis sit on the header's edges; pr-12 keeps the text
+// off the ellipsis.
+const ROW_CLASSES =
+  'flex w-full items-center gap-3 rounded-xl py-2 pr-12 text-left outline-none hover:bg-muted sm:gap-4 focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent'
+
+// The time, and who sent a received photo.
+function RowText({ photo }: { photo: Photo }): JSX.Element {
+  return (
+    <span className="flex min-w-0 flex-1 flex-col">
+      <time
+        dateTime={photo.createdAt}
+        className="truncate text-sm font-medium tabular-nums sm:text-base"
+      >
+        {ROW_TIME_FORMAT.format(new Date(photo.createdAt))}
+      </time>
+      {photo.senderName !== null && (
+        <span className="truncate text-sm text-muted-foreground">
+          Envoyée par {photo.senderName}
+        </span>
+      )}
+    </span>
+  )
+}
+
 type PhotoListRowProps = {
   photo: Photo
   isCurrent: boolean
@@ -14,8 +38,7 @@ type PhotoListRowProps = {
 
 export function PhotoListRow({ photo, isCurrent, onSelect }: PhotoListRowProps): JSX.Element {
   return (
-    // The ellipsis is a sibling of the row button: a button cannot hold a button. No side padding:
-    // the thumbnail and the ellipsis sit on the header's edges; pr-12 keeps the text off the ellipsis.
+    // The ellipsis is a sibling of the row button: a button cannot hold a button.
     <li className="relative">
       <button
         type="button"
@@ -23,7 +46,7 @@ export function PhotoListRow({ photo, isCurrent, onSelect }: PhotoListRowProps):
         aria-current={isCurrent}
         // The viewer focuses this row when it closes on this photo.
         data-photo-id={photo.id}
-        className="flex w-full items-center gap-3 rounded-xl py-2 pr-12 text-left outline-none hover:bg-muted sm:gap-4 focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
+        className={ROW_CLASSES}
       >
         <img
           className="size-14 shrink-0 rounded-lg object-cover"
@@ -32,19 +55,7 @@ export function PhotoListRow({ photo, isCurrent, onSelect }: PhotoListRowProps):
           loading="lazy"
           decoding="async"
         />
-        <span className="flex min-w-0 flex-1 flex-col">
-          <time
-            dateTime={photo.createdAt}
-            className="truncate text-sm font-medium tabular-nums sm:text-base"
-          >
-            {ROW_TIME_FORMAT.format(new Date(photo.createdAt))}
-          </time>
-          {photo.senderName !== null && (
-            <span className="truncate text-sm text-muted-foreground">
-              Envoyée par {photo.senderName}
-            </span>
-          )}
-        </span>
+        <RowText photo={photo} />
       </button>
       <PhotoActionsMenu
         photo={photo}
~~~~

### Task 6: Final review fixes

**Commit:** `seven commits, one per Minor finding (M1 to M7)`

**Scope:** M2 days sorted by key; M1 pending tiles in today's day (`childrenDayKey`, `withToday` searching every day); M3 no library count while a collection loads (R-COL-23); M4 focus outline beside the selection ring; M5 ARCHITECTURE.md's collections paragraph; M6 Bruno `list/01` and `photos/14` assert the cover fields; M7 the mobile-first plan's Task 18 branch and Task 17 gate. Spec T13 to T16.

**Gate:** `pnpm check` and `pnpm typecheck` green on each commit; at the tip `pnpm build` green and `pnpm test` → `Test Files  27 passed (27)`, `Tests  312 passed (312)`. Bruno written, not run in the clone.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/photoDays.ts b/client/src/photoDays.ts
index 6686824..40a8dcd 100644
--- a/client/src/photoDays.ts
+++ b/client/src/photoDays.ts
@@ -17,9 +17,17 @@ const DAY_WITH_YEAR_FORMAT = new Intl.DateTimeFormat('fr-FR', {
 })
 
 // The device's own calendar day: a photo added at 23:30 belongs to that evening, not to the
-// next day in UTC.
+// next day in UTC. Zero-padded (2026-01-05), so comparing two keys compares their days.
 function dayKey(date: Date): string {
-  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
+  const month = String(date.getMonth() + 1).padStart(2, '0')
+  const day = String(date.getDate()).padStart(2, '0')
+  return `${date.getFullYear()}-${month}-${day}`
+}
+
+// Newest day first, whatever the photos' order: an old photo opened while older pages are not
+// loaded yet arrives at the end of the list, and its day must still sit in its place.
+function newestDayFirst(days: PhotoDay[]): PhotoDay[] {
+  return days.toSorted((a, b) => (a.key < b.key ? 1 : -1))
 }
 
 // « Aujourd'hui », « Hier », then « dim. 22 nov. »; the year only when it is not this one.
@@ -31,8 +39,8 @@ function dayLabel(date: Date, now: Date): string {
   return format.format(date)
 }
 
-// One group per day, in the photos' own order (newest first). Keyed by day rather than by
-// neighbours: a day continued on the next « Charger plus » page still has one header.
+// One group per day, newest day first. Keyed by day rather than by neighbours: a day continued
+// on the next « Charger plus » page still has one header.
 export function groupByDay(photos: Photo[], now: Date): PhotoDay[] {
   const days = new Map<string, PhotoDay>()
   for (const photo of photos) {
@@ -42,7 +50,7 @@ export function groupByDay(photos: Photo[], now: Date): PhotoDay[] {
     day.photos.push(photo)
     days.set(key, day)
   }
-  return [...days.values()]
+  return newestDayFirst([...days.values()])
 }
 
 // Puts an empty « Aujourd'hui » first when today has no photo yet: the uploads on their way
~~~~

~~~~diff
diff --git a/client/src/components/frame/PhotoGrid.tsx b/client/src/components/frame/PhotoGrid.tsx
index 18520cf..eba1aa6 100644
--- a/client/src/components/frame/PhotoGrid.tsx
+++ b/client/src/components/frame/PhotoGrid.tsx
@@ -8,8 +8,10 @@ type PhotoGridProps = {
   // null on the library page: no photo is on screen there.
   currentId: string | null
   onSelect: (id: string) => void
-  // Items placed before the photos: the library's uploads still on their way.
+  // Items placed before the photos of the day keyed childrenDayKey: the library's uploads still
+  // on their way, under today.
   children?: ReactNode
+  childrenDayKey?: string
 }
 
 // Edge to edge with the page's header. Three tight columns on a phone, as photo apps do, so a
@@ -18,14 +20,20 @@ const GRID_CLASSES =
   'grid grid-cols-3 gap-1 sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] sm:gap-4'
 
 // One grid per day, under its date: a day with two photos leaves the rest of its row empty.
-// children go first in the first day, « Aujourd'hui », where their photos appear once sent.
-export function PhotoGrid({ days, currentId, onSelect, children }: PhotoGridProps): JSX.Element {
+// children go first in their day, « Aujourd'hui », where their photos appear once sent.
+export function PhotoGrid({
+  days,
+  currentId,
+  onSelect,
+  children,
+  childrenDayKey,
+}: PhotoGridProps): JSX.Element {
   return (
     <div className="flex flex-col gap-6">
-      {days.map((day, index) => (
+      {days.map((day) => (
         <DateGroup key={day.key} day={day}>
           <ul className={GRID_CLASSES}>
-            {index === 0 && children}
+            {day.key === childrenDayKey && children}
             {day.photos.map((photo) => (
               <PhotoGridTile
                 key={photo.id}
diff --git a/client/src/components/frame/PhotoList.tsx b/client/src/components/frame/PhotoList.tsx
index 69e794f..f0333d9 100644
--- a/client/src/components/frame/PhotoList.tsx
+++ b/client/src/components/frame/PhotoList.tsx
@@ -8,19 +8,27 @@ type PhotoListProps = {
   // null on the library page: no photo is on screen there.
   currentId: string | null
   onSelect: (id: string) => void
-  // Items placed before the photos: the library's uploads still on their way.
+  // Items placed before the photos of the day keyed childrenDayKey: the library's uploads still
+  // on their way, under today.
   children?: ReactNode
+  childrenDayKey?: string
 }
 
-// The same days as the grid, children first in the first day. The page's full width:
+// The same days as the grid, children first in their day. The page's full width:
 // thumbnails and « … » line up with the header's edges.
-export function PhotoList({ days, currentId, onSelect, children }: PhotoListProps): JSX.Element {
+export function PhotoList({
+  days,
+  currentId,
+  onSelect,
+  children,
+  childrenDayKey,
+}: PhotoListProps): JSX.Element {
   return (
     <div className="flex flex-col gap-6">
-      {days.map((day, index) => (
+      {days.map((day) => (
         <DateGroup key={day.key} day={day}>
           <ul className="flex flex-col gap-1">
-            {index === 0 && children}
+            {day.key === childrenDayKey && children}
             {day.photos.map((photo) => (
               <PhotoListRow
                 key={photo.id}
diff --git a/client/src/components/library/LibrarySection.tsx b/client/src/components/library/LibrarySection.tsx
index 718f598..169c720 100644
--- a/client/src/components/library/LibrarySection.tsx
+++ b/client/src/components/library/LibrarySection.tsx
@@ -9,7 +9,7 @@ import {
 import { Button } from '@/components/ui/button.tsx'
 import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'
 import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
-import { groupByDay, type PhotoDay, withToday } from '@/photoDays.ts'
+import { dayKey, groupByDay, type PhotoDay, withToday } from '@/photoDays.ts'
 import type { PendingUpload } from '@/upload/uploadQueue.ts'
 
 type LibrarySectionProps = {
@@ -34,12 +34,15 @@ function LoadMoreButton({ isLoadingMore, loadMore }: LoadMoreButtonProps): JSX.E
   )
 }
 
+// today: the day the uploads on their way sit in.
+type LibraryDays = { days: PhotoDay[]; today: string }
+
 // Every loaded page at once: « Charger plus » extends the last day instead of repeating it.
 // An upload on its way belongs to today, even before today has a photo.
-function libraryDays(library: PhotoLibrary, pending: PendingUpload[]): PhotoDay[] {
+function libraryDays(library: PhotoLibrary, pending: PendingUpload[]): LibraryDays {
   const now = new Date()
   const days = groupByDay(library.photos, now)
-  return pending.length > 0 ? withToday(days, now) : days
+  return { days: pending.length > 0 ? withToday(days, now) : days, today: dayKey(now) }
 }
 
 function LibraryPhotos({
@@ -53,19 +56,19 @@ function LibraryPhotos({
     return <p className="px-6 py-16 text-center text-muted-foreground">Chargement…</p>
   }
   if (library.photos.length === 0 && pending.length === 0) return emptyState
-  const days = libraryDays(library, pending)
+  const { days, today } = libraryDays(library, pending)
   // Newest first, like the photos: the upload in progress sits right above the photos, where
   // its photo appears once sent.
   const newestFirst = pending.toReversed()
   // currentId null: no photo is on screen here, so no tile gets the frame's ring.
   return layout === 'grid' ? (
-    <PhotoGrid days={days} currentId={null} onSelect={onOpenPhoto}>
+    <PhotoGrid days={days} currentId={null} onSelect={onOpenPhoto} childrenDayKey={today}>
       {newestFirst.map((upload) => (
         <PendingGridTile key={upload.id} upload={upload} />
       ))}
     </PhotoGrid>
   ) : (
-    <PhotoList days={days} currentId={null} onSelect={onOpenPhoto}>
+    <PhotoList days={days} currentId={null} onSelect={onOpenPhoto} childrenDayKey={today}>
       {newestFirst.map((upload) => (
         <PendingListRow key={upload.id} upload={upload} />
       ))}
diff --git a/client/src/photoDays.ts b/client/src/photoDays.ts
index 40a8dcd..74bffa2 100644
--- a/client/src/photoDays.ts
+++ b/client/src/photoDays.ts
@@ -18,7 +18,7 @@ const DAY_WITH_YEAR_FORMAT = new Intl.DateTimeFormat('fr-FR', {
 
 // The device's own calendar day: a photo added at 23:30 belongs to that evening, not to the
 // next day in UTC. Zero-padded (2026-01-05), so comparing two keys compares their days.
-function dayKey(date: Date): string {
+export function dayKey(date: Date): string {
   const month = String(date.getMonth() + 1).padStart(2, '0')
   const day = String(date.getDate()).padStart(2, '0')
   return `${date.getFullYear()}-${month}-${day}`
@@ -53,10 +53,11 @@ export function groupByDay(photos: Photo[], now: Date): PhotoDay[] {
   return newestDayFirst([...days.values()])
 }
 
-// Puts an empty « Aujourd'hui » first when today has no photo yet: the uploads on their way
-// need a day to sit in.
+// Adds an empty « Aujourd'hui » when today has no photo yet: the uploads on their way need a
+// day to sit in. Searched, not just the first day: with the device's clock behind the server,
+// a photo can be dated tomorrow and come first.
 export function withToday(days: PhotoDay[], now: Date): PhotoDay[] {
   const key = dayKey(now)
-  if (days[0]?.key === key) return days
-  return [{ key, label: dayLabel(now, now), photos: [] }, ...days]
+  if (days.some((day) => day.key === key)) return days
+  return newestDayFirst([...days, { key, label: dayLabel(now, now), photos: [] }])
 }
~~~~

~~~~diff
diff --git a/client/src/components/library/LibraryHeader.tsx b/client/src/components/library/LibraryHeader.tsx
index 1a98d5c..505d668 100644
--- a/client/src/components/library/LibraryHeader.tsx
+++ b/client/src/components/library/LibraryHeader.tsx
@@ -21,7 +21,7 @@ type LibraryHeaderProps = {
 
 type LibraryTitleProps = {
   library: PhotoLibrary
-  // false over a collection that cannot be shown: its photos, if any were loaded, are stale.
+  // Only under « Toutes »: over a collection, the loaded photos are not the library's.
   showsCount: boolean
 }
 
diff --git a/client/src/pages/LibraryPage.tsx b/client/src/pages/LibraryPage.tsx
index 82721be..08c0842 100644
--- a/client/src/pages/LibraryPage.tsx
+++ b/client/src/pages/LibraryPage.tsx
@@ -91,11 +91,13 @@ type PageTitleProps = Pick<LibraryContentProps, 'selected' | 'library'> & {
 }
 
 // A shown collection titles the page with its own name; « Toutes » keeps « Bibliothèque ».
+// The library's count only under « Toutes »: while a collection loads, the photos are its own
+// and « Bibliothèque · 3 photos » would count them as the library's.
 function PageTitle({ selected, library, allCardRef }: PageTitleProps): JSX.Element {
   if (selected.status === 'found') {
     return <CollectionTitle collection={selected.collection} fallbackRef={allCardRef} />
   }
-  return <LibraryTitle library={library} showsCount={isShowingPhotos(selected)} />
+  return <LibraryTitle library={library} showsCount={selected.status === 'all'} />
 }
 
 function LibraryContent(props: LibraryContentProps): JSX.Element {
diff --git a/docs/produit/collections.md b/docs/produit/collections.md
index e6786e5..e391973 100644
--- a/docs/produit/collections.md
+++ b/docs/produit/collections.md
@@ -93,7 +93,7 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 6. R-COL-20 · Une collection supprimée sur un autre appareil, ou un lien vers une collection qui n'existe pas affiche « Cette collection n'existe plus. » et propose « Voir toutes les photos ».
 7. R-COL-21 · La collection affichée suit les changements sans recharger la page : une photo rangée ou retirée, sur cet appareil ou un autre, y apparaît ou en disparaît. Une photo ajoutée pendant qu'une collection est affichée entre dans la bibliothèque et est rangée dans cette collection ; si le rangement échoue, un message le dit et la photo reste dans la bibliothèque.
 8. R-COL-22 · Chaque carte montre une image carrée, puis sous elle le nom et le nombre de photos (« Aucune photo », « 1 photo », « 12 photos »). L'image d'une collection est sa photo la plus récente, quel que soit l'ordre dans lequel les photos y ont été rangées, et change d'elle-même quand une photo plus récente y entre ou que celle-ci en sort ; une collection vide montre un dossier gris. « Toutes » montre une pile de photos, sans nombre, et « Nouvelle collection », au bout, un « + ». Un nom trop long est coupé, mais s'affiche en entier au survol. Sur un téléphone, une carte fait environ 150 px de large, et la troisième est coupée au bord de l'écran ; sur un ordinateur, environ 180 px.
-9. R-COL-23 · Une collection affichée prend la place de « Bibliothèque » en tête de page : son nom en grand titre, suivi de son menu « … » (« Lire sur le cadre », « Renommer », « Supprimer »), et dessous le nombre de ses photos et les dates de la plus ancienne à la plus récente (« 12 photos · 1 nov. 2022 – 22 nov. 2026 »). Une seule date quand toutes ses photos sont du même jour, aucune quand elle est vide (« Aucune photo »). Avec « Toutes », l'en-tête redevient « Bibliothèque » et le nombre de photos de la bibliothèque.
+9. R-COL-23 · Une collection affichée prend la place de « Bibliothèque » en tête de page : son nom en grand titre, suivi de son menu « … » (« Lire sur le cadre », « Renommer », « Supprimer »), et dessous le nombre de ses photos et les dates de la plus ancienne à la plus récente (« 12 photos · 1 nov. 2022 – 22 nov. 2026 »). Une seule date quand toutes ses photos sont du même jour, aucune quand elle est vide (« Aucune photo »). Avec « Toutes », l'en-tête redevient « Bibliothèque » et le nombre de photos de la bibliothèque. Pendant le court chargement d'une collection, l'en-tête dit « Bibliothèque » sans nombre de photos.
 
 **Messages affichés**
 
~~~~

~~~~diff
diff --git a/client/src/components/collections/CollectionCard.tsx b/client/src/components/collections/CollectionCard.tsx
index 2dad2e9..90192df 100644
--- a/client/src/components/collections/CollectionCard.tsx
+++ b/client/src/components/collections/CollectionCard.tsx
@@ -7,9 +7,11 @@ import { libraryPath } from '@/viewerHistory.ts'
 export const CARD_CLASSES =
   'group flex w-[150px] flex-col gap-1.5 text-left outline-none sm:w-[180px]'
 
-// The cover carries the focus and selection rings; the text under it stays plain.
+// The cover carries the selection ring and, outside it, the focus outline: a focused selected
+// card shows both. The outline uses the text colour, well above 3:1 on the page in either
+// theme (--ring is about 2:1); the row's py-2.5 leaves it room.
 export const COVER_CLASSES =
-  'grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground ring-offset-2 ring-offset-background transition-opacity group-hover:opacity-90 group-focus-visible:ring-3 group-focus-visible:ring-ring'
+  'grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground ring-offset-2 ring-offset-background transition-opacity group-hover:opacity-90 group-focus-visible:outline-2 group-focus-visible:outline-offset-[7px] group-focus-visible:outline-foreground'
 
 type CardTextProps = { label: string; detail: string | null }
 
diff --git a/client/src/components/collections/CollectionsRow.tsx b/client/src/components/collections/CollectionsRow.tsx
index 107f9b4..d8a6792 100644
--- a/client/src/components/collections/CollectionsRow.tsx
+++ b/client/src/components/collections/CollectionsRow.tsx
@@ -92,7 +92,7 @@ export function CollectionsRow({ selectedId, allCardRef }: CollectionsRowProps):
   return (
     <nav
       aria-label="Collections"
-      className="-mx-4 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 py-1.5"
+      className="-mx-4 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 py-2.5"
     >
       <ul className="flex w-max items-start gap-3">
         <li className="snap-start">
~~~~

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 39e84d9..c06b4b5 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -220,7 +220,7 @@ Une feature par dossier (`server/src/features/photos/`, `server/src/features/aut
 - `features/invitations/` suit le même découpage (`invitations.repository.ts`, `invitations.service.ts`, `invitations.controller.ts`, `invitations.routes.ts`). Le service reçoit `repository` (seul endroit qui crée un compte), `generateToken`, `hashToken`, `hashPassword`, `avatarUrl`, `now` et `logger` ; le contrôleur reçoit aussi le service d'auth pour `openSession` ; `app.ts` construit `requireAdmin = requireRole('admin')` une fois et le passe au routeur, derrière `requireAuth`.
 - `features/friendships/` suit le même découpage (`friendships.repository.ts`, `friendships.service.ts`, `friendships.controller.ts`, `friendships.routes.ts`). Le service reçoit `repository`, `avatarUrl` et `logger` ; le repository calcule `pairKey` et ne lit des comptes que `id`, `email`, `displayName` et `avatarCloudinaryId`. `app.ts` monte le routeur derrière `requireAuth`, comme les photos. Le service expose aussi `areFriends(userId, otherUserId)`, que le service photos reçoit en dépendance : la règle « amis = ligne acceptée » reste ici. `app.ts` construit le service amis une fois (`assembleFriendshipsService`) et le passe aux deux routeurs.
 - `features/account/` suit le même découpage (`account.repository.ts`, `account.service.ts`, `account.controller.ts`, `account.routes.ts`) : le compte de la personne connectée, jamais un autre (l'id vient de la session, pas de l'URL). Le service reçoit `repository`, `hashPassword`, `verifyPassword`, `toAvatarJpeg`, `uploadAvatar`, `deleteImage`, `avatarUrl` et `logger`. La photo de profil reprend la configuration Multer (`photos.upload.ts`) et `parseFile` (`photos.input.ts`) des photos : mêmes formats, même taille maximale, mêmes codes d'erreur. `app.ts` monte le routeur derrière `requireAuth`.
-- `features/collections/` suit le même découpage (`collections.repository.ts`, `collections.service.ts`, `collections.controller.ts`, `collections.routes.ts`). Le service reçoit `repository` et `logger`, valide le nom (`parseCollectionName`) et l'id, et trie la liste. Le repository traduit les refus de Prisma en `'not_found'` ou `'name_taken'`, que le service change en code d'erreur ; il lit aussi les photos (`findLivePhotoIds`, les ids encore dans la bibliothèque). Le contrôleur reçoit `io` pour `collections:changed`.
+- `features/collections/` suit le même découpage (`collections.repository.ts`, `collections.service.ts`, `collections.controller.ts`, `collections.routes.ts`). Le service reçoit `repository`, `thumbnailUrl` (`lib/cloudinary.ts`, la vignette carrée qui sert de couverture, reçue en dépendance pour qu'un test unitaire n'ait pas besoin de la configuration Cloudinary) et `logger`, valide le nom (`parseCollectionName`) et l'id, et trie la liste. Le repository traduit les refus de Prisma en `'not_found'` ou `'name_taken'`, que le service change en code d'erreur ; il lit aussi les photos (`findLivePhotos` : celles encore dans la bibliothèque, avec `cloudinaryId` et `createdAt`, d'où `photoSpan` tire la couverture et les dates). Le contrôleur reçoit `io` pour `collections:changed`.
 - `features/selections/` suit le même découpage (`selections.repository.ts`, `selections.service.ts`, `selections.controller.ts`, `selections.routes.ts`), en lecture seule : ni écriture, ni événement, ni log en plus de `http.request`. Le tirage vit à part, en fonctions pures (`selections.daily.ts`, `selections.radio.ts`). Le service reçoit `repository` et `now`, pour qu'un test choisisse le jour, qui sème les deux tirages. Le repository ne lit des photos que `id`, `createdAt`, `openedAt` et `senderId`, et des collections que `photoIds`.
 - `features/auth/public-user.ts` construit le `user` renvoyé par l'API (`toPublicUser`, utilisé par les services auth, invitations et compte) : l'URL de la photo de profil vient de `avatarUrl` (`lib/cloudinary.ts`), reçu en dépendance pour qu'un test unitaire n'ait pas besoin de la configuration Cloudinary. Le service amis s'en sert aussi (`toAvatarUrl`) pour l'autre compte d'une amitié.
 - Les dépendances sont passées par des fonctions-fabriques (`createPhotosService({ repository, toFrameJpeg, uploadImage, deleteImage, areFriends, logger })`), assemblées dans `app.ts` : un test peut fournir de fausses implémentations.
~~~~

~~~~diff
diff --git a/server/bruno/collections/list/01-nominal.bru b/server/bruno/collections/list/01-nominal.bru
index 3f5201a..03b13d3 100644
--- a/server/bruno/collections/list/01-nominal.bru
+++ b/server/bruno/collections/list/01-nominal.bru
@@ -36,6 +36,14 @@ script:post-response {
   test('triées à la française : « Été 2026 » avant « Noël »', () => {
     expect(res.body.collections.map(({ name }) => name)).to.eql(['Été 2026', 'Noël'])
   })
+  test('chaque collection a sa couverture et ses dates, texte ou null', () => {
+    for (const collection of res.body.collections) {
+      for (const field of ['coverUrl', 'oldestPhotoAt', 'newestPhotoAt']) {
+        expect(collection).to.have.property(field)
+        expect(collection[field] === null || typeof collection[field] === 'string').to.equal(true)
+      }
+    }
+  })
   test('le membre ne voit pas les collections du compte jetable', async () => {
     expect(await namesOf(bru.getVar('sessionCookie'))).to.not.include('Été 2026')
   })
@@ -44,5 +52,7 @@ script:post-response {
 docs {
   NOMINAL → 200 avec les deux collections de `create/`. Un tri par octets
   placerait « Été » après « Noël » : le serveur trie comme en français. Le
-  script vérifie aussi que le membre ne les voit pas.
+  script vérifie aussi que le membre ne les voit pas, et que chaque
+  collection porte `coverUrl`, `oldestPhotoAt` et `newestPhotoAt` (texte,
+  ou null pour une collection vide).
 }
diff --git a/server/bruno/collections/photos/14-nominal-photo-supprimee.bru b/server/bruno/collections/photos/14-nominal-photo-supprimee.bru
index c01452b..1ea0a53 100644
--- a/server/bruno/collections/photos/14-nominal-photo-supprimee.bru
+++ b/server/bruno/collections/photos/14-nominal-photo-supprimee.bru
@@ -32,20 +32,27 @@ assert {
 script:post-response {
   const axios = require('axios')
   // A script request does not get the collection headers: send the cookie itself.
-  const photoIdsOf = async (collectionId) => {
+  const collectionOf = async (collectionId) => {
     const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/collections`, {
       headers: { Cookie: bru.getVar('inviteeCookie') },
     })
-    return list.data.collections.find(({ id }) => id === collectionId).photoIds
+    return list.data.collections.find(({ id }) => id === collectionId)
   }
   test('la collection ne liste plus la photo supprimée', async () => {
-    expect(await photoIdsOf(bru.getVar('collectionId'))).to.eql([])
+    expect((await collectionOf(bru.getVar('collectionId'))).photoIds).to.eql([])
+  })
+  test('vide, elle perd sa couverture et ses dates', async () => {
+    const collection = await collectionOf(bru.getVar('collectionId'))
+    expect(collection.coverUrl).to.equal(null)
+    expect(collection.oldestPhotoAt).to.equal(null)
+    expect(collection.newestPhotoAt).to.equal(null)
   })
 }
 
 docs {
   NOMINAL → 204 : le compte jetable supprime de sa bibliothèque une photo
   rangée dans la collection (le script de départ l'y remet). Le script
-  relit la liste : la collection ne la montre plus. Supprime aussi la
-  photo de `01`.
+  relit la liste : la collection ne la montre plus et, vide, n'a plus ni
+  couverture ni dates (`coverUrl`, `oldestPhotoAt`, `newestPhotoAt` à
+  null). Supprime aussi la photo de `01`.
 }
~~~~

~~~~diff
diff --git a/docs/superpowers/plans/2026-11-25-mobile-first.md b/docs/superpowers/plans/2026-11-25-mobile-first.md
index 91024e1..73577c1 100644
--- a/docs/superpowers/plans/2026-11-25-mobile-first.md
+++ b/docs/superpowers/plans/2026-11-25-mobile-first.md
@@ -3485,7 +3485,7 @@ index 0ff278f..b8434ac 100644
 
 **Scope:** Tile « … » back on every pointer, 28 px look with a 44 px invisible target; `useTileContextMenu` (native `contextmenu`); `PhotoActionsMenu` `open` / `onOpenChange`; R-BIB-53. Spec D23 amended.
 
-**Gate:** `pnpm check` and `pnpm typecheck` green; `pnpm build` and `pnpm test` green.
+**Gate:** `pnpm check` and `pnpm typecheck` green; `pnpm build` and `pnpm test` green at the tip.
 
 - [x] **Final diff**
 
@@ -3666,7 +3666,7 @@ index b8434ac..f7602a3 100644
 
 **Scope:** `PhotoActionsMenu` content `w-max`: under the 28 px « … » its items wrapped, with a mouse too.
 
-**Gate:** `pnpm check` and `pnpm typecheck` green; `pnpm build` and `pnpm test` green on `feat/library-timeline`, which holds it.
+**Gate:** `pnpm check` and `pnpm typecheck` green; `pnpm build` and `pnpm test` green on `feat/library-surface`, which holds it.
 
 - [x] **Final diff**
 
~~~~

---

## Final verification (controller)

- Chrome, 360 px and desktop, light and dark: uploads on their way first under « Aujourd'hui », in the grid and the list, an « Aujourd'hui » holding only them when no photo was added today; day headers in the grid and the list (« Aujourd'hui », « Hier », « dim. 22 nov. », the year on older days), no repeated header after « Charger plus »; list rows with the time only.
- Collection cards: covers, « N photos », the folder of an empty collection, « Toutes » selected by default, snapping on the header's edge, the third card cut at 360 px, Tab through the cards, the selected card in view after a reload.
- A collection selected: its name as the title, « N photos · date – date », its « … » menu on one line per item; « Toutes » brings « Bibliothèque » back.
- `pnpm test:bruno` against an API on `PORT=3001`, where the server's env file exists.

## Drift Log

- **Order of work:** the server first, so the client commits could rely on `coverUrl` and the dates; the spec and this plan last, with the final diffs.
- **Task 1:** the controller's brief named a cover URL only; the date range came with the header (C3, sent later). Both sit on the query that already ran, so the header needed no API change of its own. `findLivePhotoIds` became `findLivePhotos`; both service test files had their mocks updated in the same commit. `thumbnailUrl` is a dependency rather than an import in the service, so the rule is tested without Cloudinary.
- **Task 1, Bruno not run:** the clone has no server env file (gitignored), so the API cannot start; borrowing the real repository's would break the hard rules. The requests are written, to run where the secrets are.
- **Task 3:** `CollectionsRow` ran 31 lines; « Toutes » moved to `AllPhotosCard`.
- **Task 4:** the collection rules went to `collections.md` as R-COL-22 and R-COL-23 rather than R-BIB-67+, next to the rules they extend (spec, Product docs). ARCHITECTURE.md's page row was updated here for the cards and the day groups too, since that row names the components Task 4 renamed.
- **Before this branch, on `feat/library-surface`:** the photo menu's `w-max` (c74b15b, found by the controller in Chrome) is recorded in the mobile-first plan, Task 18.
- **Task 5:** a size check over the files this branch touched found `PhotoListRow` at 43 lines, over the 30-line rule since before this stack; split in a refactor commit after the docs.
- **Gates:** `pnpm check` and `pnpm typecheck` green on each commit; at the tip `pnpm build` green and `pnpm test` → `Test Files  26 passed (26)`, `Tests  305 passed (305)` (before the rebase below).
- **Rebased on step 14 (controller):** in the stack this branch comes after step 14, the photo upload (`feat/upload-print-size`), so it was rebased onto step 14's tip, without c74b15b, which already sits below step 14. First onto 7f534e0, then onto b6af2a5 (step 14's review fixes), which applied cleanly. Every SHA above changed: the plan's diffs are regenerated from the rebased commits.
  - **Day groups renumbered:** step 14 already uses R-BIB-54 to R-BIB-65, so the day groups became R-BIB-66, in `bibliotheque.md` (R-BIB-23 amended to refer to it), the spec, this plan and the « library photos grouped by day » commit message. R-BIB-23 checked against step 14's wording: step 14 did not change it. R-COL-22 and R-COL-23 kept.
  - **Pending tiles:** step 14 had given `PhotoGrid` and `PhotoList` a `children` prop for its pending tiles, placed before the photos. Kept, and rendered at the front of the first day; `withToday` adds an empty « Aujourd'hui » when today has no photo yet, only while uploads are pending (spec T12, R-BIB-66). `LibrarySection` builds the days in `libraryDays`, to stay under 30 lines. Resolved in Task 2's commit, since the days arrive there.
  - **Other conflicts:** `lib/cloudinary.ts` keeps step 14's screen-size `url` and takes the thumbnail out into `thumbnailUrl()`; `LibraryPage` keeps step 14's local « Toutes » ref, renamed `allCardRef`, and `LibraryHeader` keeps its `addButtonRef` beside the new `title`; ARCHITECTURE.md's page row merges both texts.
  - **The spec and this plan are fixed in a docs commit at the tip** rather than in the spec commit, which keeps R-BIB-54 for the day groups until then.
  - **Gates after the rebase:** `pnpm check` and `pnpm typecheck` green on each commit; at the tip `pnpm build` green and `pnpm test` → `Test Files  27 passed (27)`, `Tests  312 passed (312)`.
- **Task 6, final review (controller, after picking: Bruno 184/184, Chrome fine):** 0 Critical, 0 Important, 7 Minor, each fixed in its own commit.
  - **M2, out-of-order days:** of the two fixes offered, sorting the days by key rather than dropping an old photo while older pages remain: a dropped photo would vanish from the library for a while after being opened. The keys became zero-padded for that (spec T13).
  - **M1, clock skew:** `withToday` searches every day and `childrenDayKey` names today's day, so a photo dated tomorrow no longer doubles « Aujourd'hui » (spec T14).
  - **M3:** no library count in the header while a collection loads; R-COL-23 says so, edited in place since it is new in this stack (spec T15).
  - **M4:** focus is an outline in the text colour outside the selection ring, the row's padding grows to leave it room (spec T16).
  - **M5, M6:** ARCHITECTURE.md's collections paragraph names `findLivePhotos` and `thumbnailUrl`; Bruno `list/01` checks the three fields' shape and `photos/14` their null after the collection's last photo is deleted, written and not run in the clone.
  - **M7:** this branch's spec commit had edited the finished mobile-first plan: Task 18 named this branch for c74b15b, which is on `feat/library-surface`, and its regeneration dropped « at the tip » from Task 17's Gate line. Both corrected in a docs commit.
  - **No client test runner:** `groupByDay`, `withToday` and their sorting stay without unit tests; the client has no Vitest set up, and adding one is a dependency decision for the author.
