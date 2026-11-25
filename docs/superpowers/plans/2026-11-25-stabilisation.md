---
plan: stabilisation
status: done
spec: docs/superpowers/specs/2026-11-25-stabilisation-design.md
branch: fix/stabilisation
worktree: false
tasks_total: 6
tasks_done: 6
current_task: null
last_commit: null
last_updated: 2026-11-25
---

# Stabilisation (Step 16) Implementation Plan

> **For agentic workers:** this plan was built while executing it, in a throwaway clone; every task below is a final diff (`git show` output, after formatting). Replaying it means applying each diff and running its gates.

**Working agreement (mandatory):** keep this plan in sync with reality. Append every divergence to the Drift Log. When a drift changes a decision of the spec, add a new spec doc rather than rewriting this one.

**Goal:** close the open Minors of steps 7 to 12 and the two step 12 deviations: fix the ones that change behaviour or waste work, record a decision for every item (spec, « Triage »), and hand the controller the Chrome checklists left unverified (spec, « Chrome checklists »). No new feature.

**Architecture:** no new module. Each fix stays in the file that owns the rule: `collections.service.ts` (empty collections), `selections.daily.ts` (photos of the day), `photosApi.ts` (refused loads), `usePlaybackPhotos.ts` (shuffle round), plus one Bruno request and product doc wording.

**Tech Stack:** Node 24, TypeScript, Express 5, Socket.IO 4, Prisma 6.19 (MongoDB), Vitest, Biome 2, Bruno, React 19 + React Router + Radix + sonner, Tailwind 4.

## Global Constraints

- **No new dependency**, server or client. **Prisma stays on v6.** **No schema change**: no `pnpm db:push` checkpoint.
- **Never Docker, never start the API or Vite, never `pnpm db:push` / `db:seed`, never read `.env` files** (controller's hard rules). Bruno is counted from the files, not run; the controller runs `pnpm test:bruno` against a running API.
- **No client test runner:** client fixes are verified by `pnpm check`, `pnpm typecheck`, `pnpm build` and the Chrome checklist.
- **Steps 13 and 14 are built in parallel from the same base**, and this branch is rebased on top of them: never touch navigation, viewer, upload (`AddPhotoPanel`, `UploadForm`, `useLibraryUpload`, `LibraryNotices`) or `ui/*.tsx`.
- **TypeScript (AGENTS.md):** no `as` casts, explicit return types on exported functions, literal unions rather than `enum`.
- **Code rules (`.claude/rules/`):** comment why, never what; every function at most 30 lines; logs only through `server/src/lib/logger.ts`, ids only.
- **Same commit rules:** endpoint change → `server/bruno/`; service rule → colocated `*.test.ts`; user-visible change → `docs/produit/` (French, no technical terms; a changed rule keeps its id); flow change → `ARCHITECTURE.md`.
- **Biome formats Markdown:** `pnpm check:fix` after a docs edit; the diffs below are after formatting.
- **Commits:** atomic, Conventional Commits in English, message in a scratchpad file passed with `git commit -F`, ending with the two attribution lines. Never `--no-verify`. The clone's `.npmrc` (virtual store outside the clone) is never committed.
- **Docker files are the author's work:** never touch `Dockerfile`, `server/Dockerfile`, `server/.dockerignore`, `compose.yaml`, `NOTE.md`, `.vscode/settings.json`.

## Interfaces

No signature changes. Internal only: `selections.daily.ts` gains `joinedLibraryAt(photo): Date` and `idsInJoiningOrder(photos): string[]` (not exported); `photosApi.ts` gains the module constant `NOT_FOUND_STATUS`.

## Stack and branches

- **`fix/stabilisation`** on top of `feat/library-collections` (d58d3b8): the spec and this plan, then Tasks 1 to 6. One branch (spec D1).

## Baselines

- `pnpm test` at d58d3b8: `Test Files  25 passed (25)`, `Tests  301 passed (301)`. After Task 1: 302; after Task 6: 303.
- Bruno files at d58d3b8, counted by script (request files outside `environments/`, without `folder.bru` and the root `collection.bru`; `assert` block lines plus `test(` calls): 184 requests, 472 assertions (397 + 75). After Task 2: 185 requests, 474 assertions (399 + 75). The step 12 plan wrote 185 requests and the same 472 assertions for this tree: a counting difference of one file, not a lost request.

---

### Task 1: Skip the live photos query for empty collections

**Commit:** `fix(server): skip the live photos query when no collection holds a photo`

**Scope:** Step 10 final review M3. `findLiveIds` answers an empty set without a query; one unit test.

**Gate:** `pnpm check`, `pnpm typecheck` green; `pnpm test` → `Tests  302 passed (302)`.

- [x] **Final diff**

~~~~diff
diff --git a/server/src/features/collections/collections.service.test.ts b/server/src/features/collections/collections.service.test.ts
index 39e7fda..51b8618 100644
--- a/server/src/features/collections/collections.service.test.ts
+++ b/server/src/features/collections/collections.service.test.ts
@@ -100,6 +100,14 @@ describe('createCollection', () => {
     expect(collection).toEqual({ id: ETE.id, name: 'Été', photoIds: [] })
   })
 
+  it('reads no photos for a collection that is empty by construction', async () => {
+    const deps = makeDeps()
+
+    await createCollectionsService(deps).createCollection({ ownerId: OWNER_ID, name: 'Été' })
+
+    expect(deps.repository.findLivePhotoIds).not.toHaveBeenCalled()
+  })
+
   it('refuses a name the account already uses', async () => {
     const deps = makeDeps()
     deps.repository.create.mockResolvedValue('name_taken')
diff --git a/server/src/features/collections/collections.service.ts b/server/src/features/collections/collections.service.ts
index 9749c94..415ee4e 100644
--- a/server/src/features/collections/collections.service.ts
+++ b/server/src/features/collections/collections.service.ts
@@ -76,13 +76,15 @@ function toCollectionDto(
   return { id, name, photoIds: photoIds.filter((photoId) => liveIds.has(photoId)) }
 }
 
-// One query for every collection, however many there are.
+// One query for every collection, however many there are, and none when they hold no photo,
+// such as a collection just created.
 async function findLiveIds(
   { repository }: CollectionsServiceDeps,
   ownerId: string,
   records: CollectionRecord[],
 ): Promise<Set<string>> {
   const allIds = records.flatMap((record) => record.photoIds)
+  if (allIds.length === 0) return new Set()
   return new Set(await repository.findLivePhotoIds(ownerId, allIds))
 }
 
~~~~

### Task 2: Run a repeated collectionId in Bruno

**Commit:** `test(server): run a repeated collectionId against the API in Bruno`

**Scope:** Step 12 final review M7. New `photos/list/14`; `12` and the folder docs point to it.

**Gate:** `pnpm check`, `pnpm typecheck` green; Bruno files 185 requests / 474 assertions (399 `assert` lines + 75 `test()` calls).

- [x] **Final diff**

~~~~diff
diff --git a/server/bruno/photos/list/12-edge-collection-id-invalide.bru b/server/bruno/photos/list/12-edge-collection-id-invalide.bru
index 93badc9..fa7ea42 100644
--- a/server/bruno/photos/list/12-edge-collection-id-invalide.bru
+++ b/server/bruno/photos/list/12-edge-collection-id-invalide.bru
@@ -17,7 +17,6 @@ assert {
 
 docs {
   EDGE → 404 COLLECTION_NOT_FOUND : un id qui n'est pas un ObjectId est une
-  collection inconnue de plus, comme sur les routes `/api/collections`. Un
-  paramètre répété (`?collectionId=a&collectionId=b`) répond 400
-  `QUERY_INVALID` : ce cas est dans `photos.service.list.test.ts`.
+  collection inconnue de plus, comme sur les routes `/api/collections`. Le
+  paramètre répété est dans `14`.
 }
diff --git a/server/bruno/photos/list/14-edge-collection-repetee.bru b/server/bruno/photos/list/14-edge-collection-repetee.bru
new file mode 100644
index 0000000..2c2409b
--- /dev/null
+++ b/server/bruno/photos/list/14-edge-collection-repetee.bru
@@ -0,0 +1,22 @@
+meta {
+  name: Edge - collection répétée
+  type: http
+  seq: 14
+}
+
+get {
+  url: {{baseUrl}}/api/photos?collectionId=6b044f9d56a44767c7079c01&collectionId=6b044f9d56a44767c7079c02
+  body: none
+  auth: none
+}
+
+assert {
+  res.status: eq 400
+  res.body.error: eq QUERY_INVALID
+}
+
+docs {
+  EDGE → 400 QUERY_INVALID : `collectionId` donné deux fois. Express en fait
+  une liste, refusée avant toute lecture de collection, comme `limit` et
+  `cursor` répétés.
+}
diff --git a/server/bruno/photos/list/folder.bru b/server/bruno/photos/list/folder.bru
index 3bb417f..7fdb3a6 100644
--- a/server/bruno/photos/list/folder.bru
+++ b/server/bruno/photos/list/folder.bru
@@ -12,8 +12,8 @@ docs {
   `collectionId=<id>` ne garde que les photos de cette collection du compte
   connecté, dans le même ordre et avec la même pagination. Une collection
   d'un autre compte, inconnue ou un id mal formé : 404
-  `COLLECTION_NOT_FOUND` ; le paramètre répété : 400 `QUERY_INVALID`. `07` à
-  `13` passent par une collection neuve du membre, créée par `07` et
+  `COLLECTION_NOT_FOUND` ; le paramètre répété : 400 `QUERY_INVALID` (`14`).
+  `07` à `13` passent par une collection neuve du membre, créée par `07` et
   supprimée par `13`.
 
   Lancé entre `create` et `delete` (`seq: 2`) : il voit les deux photos que
~~~~

### Task 3: Log a refused photos load other than 404

**Commit:** `fix(client): log a photos load the API refused for a reason other than 404`

**Scope:** Step 12 deviation (b). `fetchPhotoPage` stays silent on a 404 only.

**Gate:** `pnpm check`, `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/photosApi.ts b/client/src/photosApi.ts
index bd15c90..9f968bf 100644
--- a/client/src/photosApi.ts
+++ b/client/src/photosApi.ts
@@ -3,6 +3,7 @@ import { isPhoto, isPhotoPage, type Photo, type PhotoPage } from '@/photo.ts'
 
 // The server's MAX_PAGE_SIZE: the fewest requests for many photos.
 const MAX_PAGE_SIZE = 100
+const NOT_FOUND_STATUS = 404
 
 // collectionId: only that collection's photos; left out for the whole library.
 export type PageRequest = { cursor?: string; limit?: number; collectionId?: string }
@@ -39,8 +40,13 @@ export async function fetchPhotoPage(
       onUnauthenticated()
       return null
     }
-    // A refused load, such as a collection deleted elsewhere (404): the page says so already.
-    if (!res.ok) return null
+    // A collection deleted elsewhere: the page says so already.
+    if (res.status === NOT_FOUND_STATUS) return null
+    // Any other refusal, such as a 500, is a fault the page cannot explain: keep a trace of it.
+    if (!res.ok) {
+      console.error('Photos load refused by the API', res.status)
+      return null
+    }
     const data: unknown = await res.json()
     if (isPhotoPage(data)) return data
     // Client and API images out of sync: say so instead of waiting forever.
~~~~

### Task 4: Mix anew when going back to shuffled playback

**Commit:** `fix(client): mix anew when the frame goes back to shuffled playback`

**Scope:** Step 8 final review M1. `usePlaybackPhotos` drops the drawn round while the frame plays in order; R-CAD-64 and ARCHITECTURE amended.

**Gate:** `pnpm check`, `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 1388c25..b1b961e 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -65,7 +65,7 @@ Sélection du jour sur le cadre (`hooks/useDailySelection.ts`, `selections/selec
 
 Radio sur le cadre (`hooks/useRadioSelection.ts`, `hooks/useStartRadio.ts`) : la radio n'est pas une `PhotoSource` gardée par l'appareil mais un paramètre d'adresse, `/frame?radio=<id>` (`RADIO_PARAM`, `radioPath`). `useSlideshowSettings` en fait la source jouée (`PlayedSource`, `{ kind: 'radio', photoId }`) ; choisir une source dans « Photos » l'enregistre et retire le paramètre (`replace`, en gardant l'état de l'entrée), et rechoisir l'option déjà gardée (« Radio » pendant une radio) ne fait rien. « Lancer la radio », dans le menu « … » de chaque photo (`PhotoActionsMenu`, donc vignettes, liste, visionneuse et diaporama), passe en plein écran dans le clic puis navigue : depuis le cadre ou la visionneuse en remplaçant l'entrée et en gardant son état, comme ▶ « Mode cadre », depuis la bibliothèque en ajoutant une entrée marquée `LIBRARY_BELOW_STATE`. `useRadioSelection` demande `GET /api/selections/radio/:photoId` une fois par photo de départ, sans connexion Socket.IO : la suite est figée au lancement, une photo supprimée en sort avec le flux, une photo ajoutée n'y entre pas. Sa réponse est rangée avec l'id de sa photo : une réponse pour une autre radio compte comme un chargement. Un échec, ou un `404`, rend `unavailable` : le cadre lit la bibliothèque, et le menu garde « Radio » coché, comme pour la sélection du jour. Arrêter la radio oublie sa réponse : relancée sur la même photo, elle attend une suite neuve. Seule la radio garde l'ordre du serveur (sa photo de départ en tête) ; « Dans l'ordre » la lit dans cet ordre, « Aléatoire » la mélange. La clé de source contient l'id (`radio:<id>`) : une radio lancée depuis le diaporama est un changement de source, qui repart de sa photo de départ.
 
-Lecture aléatoire (`hooks/usePlaybackPhotos.ts`, fonctions pures dans `shuffleOrder.ts`) : un mélange de Fisher-Yates tiré une fois et gardé dans l'état, recalculé pendant le rendu comme la sélection du cadre. Une photo arrivée s'insère juste après la photo affichée, une photo supprimée sort de l'ordre ; quand la dernière photo du tour laisse la place à la première, un nouveau tour est tiré, qui commence par la photo affichée. La sélection (`useFrameSelection`) reste calculée sur le flux, du plus récent au plus ancien : seul l'ordre du carrousel et du bandeau change.
+Lecture aléatoire (`hooks/usePlaybackPhotos.ts`, fonctions pures dans `shuffleOrder.ts`) : un mélange de Fisher-Yates tiré une fois et gardé dans l'état, recalculé pendant le rendu comme la sélection du cadre. Une photo arrivée s'insère juste après la photo affichée, une photo supprimée sort de l'ordre ; quand la dernière photo du tour laisse la place à la première, un nouveau tour est tiré, qui commence par la photo affichée. En « Dans l'ordre », le tour est oublié : revenir à « Aléatoire » en tire un neuf. La sélection (`useFrameSelection`) reste calculée sur le flux, du plus récent au plus ancien : seul l'ordre du carrousel et du bandeau change.
 
 Modèles d'affichage (`components/frame/templateClasses.ts`) : une table de classes Tailwind par modèle pour la diapositive et la photo, en `vmin` pour garder les mêmes proportions sur un téléphone et sur une télévision. « Passe-partout » entoure la photo d'un carton (`--frame-mat`), « Polaroïd » d'un tirage (`PolaroidPrint`, `--frame-print`) qui porte la date et l'expéditeur, et penche d'un côté tiré de l'identifiant de la photo, pour qu'une arrivée ne retourne pas les autres. Le fond flou ne sert qu'à « Ajusté », la légende du bas disparaît avec « Polaroïd », et le zoom lent ne s'applique qu'à « Ajusté » et « Plein format ».
 
diff --git a/client/src/hooks/usePlaybackPhotos.ts b/client/src/hooks/usePlaybackPhotos.ts
index 751a678..2088866 100644
--- a/client/src/hooks/usePlaybackPhotos.ts
+++ b/client/src/hooks/usePlaybackPhotos.ts
@@ -30,6 +30,9 @@ export function usePlaybackPhotos(
     const photoIds = photos.map(({ id }) => id)
     const nextIds = nextShuffledIds({ drawnIds, photoIds, shownId, currentId }, Math.random)
     if (!isSameOrder(nextIds, drawnIds)) setDrawn({ sourceKey, ids: nextIds })
+  } else if (drawnIds.length > 0) {
+    // Forgotten in order: picking « Aléatoire » again mixes anew rather than resuming the old round.
+    setDrawn({ sourceKey, ids: [] })
   }
 
   const shuffledPhotos = useMemo(() => inPlaybackOrder(photos, drawnIds), [photos, drawnIds])
diff --git a/docs/produit/cadre.md b/docs/produit/cadre.md
index a9569fb..36b2f1b 100644
--- a/docs/produit/cadre.md
+++ b/docs/produit/cadre.md
@@ -94,7 +94,7 @@ Le cadre n'a plus de vue bibliothèque : voir R-CAD-53. Les règles ci-dessous g
 10. R-CAD-29 · Si la photo affichée est supprimée (ici ou depuis un autre appareil), le diaporama passe à la photo la plus récente.
 11. R-CAD-62 · La vitesse choisie est retenue sur l'appareil, dans ce navigateur : elle reste la même quand la page du cadre est rechargée ou rouverte, le lendemain comme après un redémarrage. La lecture ou la pause et l'affichage du bandeau reviennent aux réglages par défaut (lecture automatique, bandeau masqué). Le rechargement quotidien des photos (R-CAD-05) ne change rien.
 12. R-CAD-63 · En navigation privée, ou si le navigateur bloque l'enregistrement, le réglage vaut jusqu'à la fermeture de la page. Un réglage devenu illisible revient à sa valeur par défaut sans effacer les autres.
-13. R-CAD-64 · Deux ordres de lecture. « Dans l'ordre » (par défaut) : la lecture passe à la photo suivante, plus ancienne, à chaque intervalle ; après la plus ancienne, elle repart de la plus récente, en boucle et sans retour en arrière visible. « Aléatoire » : les photos sont mélangées une fois, et chacune passe une fois avant qu'un nouveau mélange commence ; le nouveau tour ne remontre pas tout de suite la photo qui vient de passer.
+13. R-CAD-64 · Deux ordres de lecture. « Dans l'ordre » (par défaut) : la lecture passe à la photo suivante, plus ancienne, à chaque intervalle ; après la plus ancienne, elle repart de la plus récente, en boucle et sans retour en arrière visible. « Aléatoire » : les photos sont mélangées une fois, et chacune passe une fois avant qu'un nouveau mélange commence ; le nouveau tour ne remontre pas tout de suite la photo qui vient de passer. Revenir à « Aléatoire » après « Dans l'ordre » commence un nouveau mélange, à partir de la photo affichée.
 14. R-CAD-65 · En « Aléatoire », une nouvelle photo se place juste après celle qui est affichée : les règles d'arrivée (R-CAD-40 à R-CAD-42) s'appliquent comme dans l'ordre. Une photo supprimée sort du mélange ; si c'était la photo affichée, le diaporama passe à la plus récente (R-CAD-29).
 15. R-CAD-66 · L'ordre choisi est retenu sur l'appareil, comme la vitesse (R-CAD-62, R-CAD-63). Le bandeau de vignettes suit l'ordre de lecture.
 16. R-CAD-67 · Quatre modèles d'affichage. « Ajusté » (par défaut) : la photo entière, sans être coupée, l'espace autour rempli par une version floutée d'elle-même. « Plein format » : la photo remplit tout l'écran, quitte à couper ses bords. « Passe-partout » : la photo entière dans un large carton clair, sur un mur sombre. « Polaroïd » : la photo entière sur un tirage blanc légèrement penché, avec une bande en bas.
~~~~

### Task 5: R-COL-04 wording

**Commit:** `docs(produit): say a collection made from a deleted photo stays empty`

**Scope:** Step 10 final review M4. Product doc only.

**Gate:** `pnpm check`, `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/docs/produit/collections.md b/docs/produit/collections.md
index 1bd4aaa..8751b12 100644
--- a/docs/produit/collections.md
+++ b/docs/produit/collections.md
@@ -15,7 +15,7 @@ Une collection est une liste de photos de sa bibliothèque, rangées sous un nom
 1. R-COL-01 · Un nom fait de 1 à 50 caractères ; les espaces au début et à la fin ne comptent pas.
 2. R-COL-02 · Deux collections d'un même compte ne portent pas le même nom. Les majuscules et les accents comptent : « noël » et « Noël » sont deux noms différents. Renommer une collection sous le nom qu'elle porte déjà est permis.
 3. R-COL-03 · Les collections sont classées par ordre alphabétique (« Été » avant « Noël »).
-4. R-COL-04 · Une collection créée depuis « Nouvelle collection », au bout de la rangée des collections, est vide et s'affiche aussitôt ; créée depuis le menu « … » d'une photo, elle contient cette photo.
+4. R-COL-04 · Une collection créée depuis « Nouvelle collection », au bout de la rangée des collections, est vide et s'affiche aussitôt ; créée depuis le menu « … » d'une photo, elle contient aussitôt cette photo, sauf si la photo a été supprimée entre-temps : la collection reste alors vide, et un message dit pourquoi.
 5. R-COL-05 · Supprimer une collection demande une confirmation ; « Annuler » ferme la fenêtre sans rien changer. Ses photos restent dans la bibliothèque ; un cadre qui la lisait repasse à toute la bibliothèque (R-CAD-81). Supprimer la collection affichée ramène à « Toutes ».
 6. R-COL-06 · Une collection créée, renommée ou supprimée l'est aussitôt sur tous les appareils connectés au compte, sans recharger la page.
 7. R-COL-07 · Les collections sont privées : personne d'autre ne les voit, pas même les amis.
~~~~

### Task 6: Keep the day's lot when a photo arrives later that day

**Commit:** `fix(server): keep the day's lot when a photo arrives after others that day`

**Scope:** New bug N1 (spec D5), found while writing the step 11 checklist. Photos of the day fill the lot in joining order; one unit test, red before the fix; R-CAD-86 and ARCHITECTURE amended.

**Gate:** `pnpm check`, `pnpm typecheck` green; `pnpm test` → `Tests  303 passed (303)`.

- [x] **Final diff**

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index b1b961e..64a2ca3 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -128,7 +128,7 @@ Une `Photo` vaut `{ id, url, thumbnailUrl, createdAt, senderName, message }` (`c
 
 Une `Collection` vaut `{ id, name, photoIds }`, jamais son propriétaire : `photoIds` liste les photos du compte, dans l'ordre où elles y ont été ajoutées. Un nom est du texte, espaces autour retirés, de 1 à 50 caractères (`MAX_COLLECTION_NAME_LENGTH`, comme un nom d'affichage) ; deux collections d'un même compte ne portent pas le même nom (index unique `(ownerId, name)`, comparaison exacte après le trim : « noël » et « Noël » sont deux noms). Une collection d'un autre compte répond comme une inconnue. Seule une photo ouverte de la bibliothèque du compte entre dans une collection : inconnue, d'un autre compte ou reçue pas encore ouverte, elle répond `404 PHOTO_NOT_FOUND`, comme `GET /api/photos` ne la montre pas. Ajouter une photo déjà là, ou retirer une photo absente, répond la collection telle quelle. La bibliothèque montre une collection par `GET /api/photos?collectionId=<id>` : mêmes photos ouvertes, même ordre et même pagination, limitées à celles de la collection (un id mort ne trouve aucune photo) ; une collection d'un autre compte, inconnue ou un id mal formé répond `404 COLLECTION_NOT_FOUND`, le paramètre répété `400 QUERY_INVALID`.
 
-Une `Selection` vaut `{ photoIds }` : des ids de photos ouvertes de la bibliothèque du compte, jamais les photos elles-mêmes, que le cadre a déjà chargées. La sélection du jour (`features/selections/selections.daily.ts`) range chaque photo selon le SHA-256 de `<ownerId>:<jour>:<photoId>`, le jour étant la date à Paris (`Intl.DateTimeFormat`, fuseau `Europe/Paris`) : le même jour donne le même ordre sur tous les appareils et à chaque rechargement, sans rien enregistrer, et le lendemain un autre. Les photos entrées dans la bibliothèque avant aujourd'hui passent d'abord, celles du jour ensuite, et le lot garde les 20 premières (`DAILY_SELECTION_SIZE`) : une photo ajoutée ou ouverte aujourd'hui n'entre que dans un lot qui a encore de la place. Une photo reçue entre dans la bibliothèque à son ouverture (`openedAt`), les autres à leur arrivée (`createdAt`) : ouvrir le matin les photos reçues la veille ne change pas le lot.
+Une `Selection` vaut `{ photoIds }` : des ids de photos ouvertes de la bibliothèque du compte, jamais les photos elles-mêmes, que le cadre a déjà chargées. La sélection du jour (`features/selections/selections.daily.ts`) range chaque photo selon le SHA-256 de `<ownerId>:<jour>:<photoId>`, le jour étant la date à Paris (`Intl.DateTimeFormat`, fuseau `Europe/Paris`) : le même jour donne le même ordre sur tous les appareils et à chaque rechargement, sans rien enregistrer, et le lendemain un autre. Les photos entrées dans la bibliothèque avant aujourd'hui passent d'abord, dans cet ordre tiré, celles du jour ensuite, dans l'ordre de leur entrée (tirées elles aussi, une photo arrivée le soir pourrait passer devant une photo du matin déjà dans le lot et l'en chasser), et le lot garde les 20 premières (`DAILY_SELECTION_SIZE`) : une photo ajoutée ou ouverte aujourd'hui n'entre que dans un lot qui a encore de la place. Une photo reçue entre dans la bibliothèque à son ouverture (`openedAt`), les autres à leur arrivée (`createdAt`) : ouvrir le matin les photos reçues la veille ne change pas le lot.
 
 La radio (`features/selections/selections.radio.ts`) part d'une photo ouverte du compte (sinon `404 PHOTO_NOT_FOUND`, comme l'ouverture, id comparé en minuscules comme pour les collections) et compte, pour chaque autre photo, un point par lien : le même ami expéditeur (deux photos ajoutées par le compte lui-même ne comptent pas, ce serait presque toute la bibliothèque), 7 jours d'écart au plus entre leurs dates d'arrivée, et chaque collection qui contient les deux. Les photos liées passent de la plus liée à la moins liée, la plus proche dans le temps d'abord à égalité ; les photos sans lien complètent ensuite dans un ordre tiré au hasard, jusqu'à 30 photos (`RADIO_LENGTH`) départ compris. Ce tirage est celui de la sélection du jour (`idsInDrawOrder`), semé par `<id de départ>:<jour>` : recharger `/frame?radio=<id>` le même jour redonne la même suite. La date est celle de l'ajout ou de la réception : Sharp retire les métadonnées, la date de prise de vue n'existe plus. Les collections sont lues en une requête (leurs `photoIds` seulement) ; un id de photo supprimée qui y traîne ne compte pas, la photo n'étant plus dans la bibliothèque lue.
 
diff --git a/docs/produit/cadre.md b/docs/produit/cadre.md
index 36b2f1b..54ac9a4 100644
--- a/docs/produit/cadre.md
+++ b/docs/produit/cadre.md
@@ -160,7 +160,7 @@ Le cadre n'a plus de vue bibliothèque : voir R-CAD-53. Les règles ci-dessous g
 
 1. R-CAD-84 · La sélection du jour compte 20 photos de la bibliothèque, tirées au hasard. Une photo reçue n'y entre qu'une fois découverte. Avec 20 photos ou moins, la sélection les contient toutes. Le choix est retenu sur l'appareil, comme les autres choix de « Photos » (R-CAD-77).
 2. R-CAD-85 · Le lot reste le même toute la journée, à chaque ouverture et sur tous les appareils du compte. Un nouveau lot est tiré chaque jour à minuit, heure de Paris ; un cadre allumé y passe dans le quart d'heure qui suit, sans recharger.
-3. R-CAD-86 · Une photo ajoutée ou découverte dans la journée ne remplace pas une photo du lot : elle n'y entre que s'il reste de la place, sinon elle peut être tirée les jours suivants. Une photo reçue la veille et découverte ce matin compte donc comme une photo du jour.
+3. R-CAD-86 · Une photo ajoutée ou découverte dans la journée ne remplace pas une photo du lot : elle n'y entre que s'il reste de la place, après celles ajoutées ou découvertes plus tôt dans la journée, sinon elle peut être tirée les jours suivants. Une photo reçue la veille et découverte ce matin compte donc comme une photo du jour.
 4. R-CAD-87 · Une photo supprimée quitte la sélection en quelques instants ; une autre photo de la bibliothèque prend sa place s'il y en a.
 5. R-CAD-88 · La sélection se lit comme une collection : des plus récentes aux plus anciennes ou en ordre aléatoire, selon « Lecture », avec la même vitesse et le même modèle d'affichage (R-CAD-78, R-CAD-79).
 6. R-CAD-89 · Si la sélection ne peut pas être chargée, le cadre lit toute la bibliothèque en attendant, sans message ; il réessaie au plus tard un quart d'heure après, et passe à la sélection dès qu'elle arrive. Le menu garde « Sélection du jour » coché.
diff --git a/server/src/features/selections/selections.daily.ts b/server/src/features/selections/selections.daily.ts
index 7d2841f..d706dc9 100644
--- a/server/src/features/selections/selections.daily.ts
+++ b/server/src/features/selections/selections.daily.ts
@@ -46,8 +46,17 @@ export function idsInDrawOrder(photos: SelectionPhoto[], seed: string): string[]
 }
 
 // A received photo joins the library when it is opened, not when it arrives.
-function libraryDayOf({ createdAt, openedAt }: SelectionPhoto): string {
-  return dayOf(openedAt ?? createdAt)
+function joinedLibraryAt({ createdAt, openedAt }: SelectionPhoto): Date {
+  return openedAt ?? createdAt
+}
+
+// Not drawn: a photo added later in the day would then outrank one already in the lot and push it
+// out. In the order they joined, a newcomer only ever takes the room left.
+function idsInJoiningOrder(photos: SelectionPhoto[]): string[] {
+  return photos
+    .map((photo) => ({ id: photo.id, joinedAt: joinedLibraryAt(photo).getTime() }))
+    .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id))
+    .map(({ id }) => id)
 }
 
 // Photos from before today come first: one added or opened today only fills a lot with room left.
@@ -56,8 +65,8 @@ function libraryDayOf({ createdAt, openedAt }: SelectionPhoto): string {
 export function drawDailySelection(photos: SelectionPhoto[], ownerId: string, now: Date): string[] {
   const today = dayOf(now)
   const seed = `${ownerId}:${today}`
-  const olderPhotos = photos.filter((photo) => libraryDayOf(photo) < today)
-  const todaysPhotos = photos.filter((photo) => libraryDayOf(photo) >= today)
-  const drawnIds = [...idsInDrawOrder(olderPhotos, seed), ...idsInDrawOrder(todaysPhotos, seed)]
+  const olderPhotos = photos.filter((photo) => dayOf(joinedLibraryAt(photo)) < today)
+  const todaysPhotos = photos.filter((photo) => dayOf(joinedLibraryAt(photo)) >= today)
+  const drawnIds = [...idsInDrawOrder(olderPhotos, seed), ...idsInJoiningOrder(todaysPhotos)]
   return drawnIds.slice(0, DAILY_SELECTION_SIZE)
 }
diff --git a/server/src/features/selections/selections.service.daily.test.ts b/server/src/features/selections/selections.service.daily.test.ts
index d6236d6..31a8cf6 100644
--- a/server/src/features/selections/selections.service.daily.test.ts
+++ b/server/src/features/selections/selections.service.daily.test.ts
@@ -24,6 +24,9 @@ const LIBRARY = photosOn(YESTERDAY, 30)
 // Ranked 6th of the library on MORNING's day if it counted as an older photo: a test that keeps it
 // out of the lot fails when the rule on photos of the day breaks.
 const RANKED_IN_LOT_NUMBER = 103
+// Ranked first of the photos of the day if they were drawn: a test that keeps it out of a lot with
+// room left fails when photos of the day are drawn by rank again.
+const LATE_ARRIVAL_NUMBER = 203
 
 function makeDeps(photos: SelectionPhoto[] = LIBRARY, now: Date = MORNING) {
   return {
@@ -115,6 +118,17 @@ describe('dailySelection', () => {
     expect(photoIds.slice(3).sort()).toEqual(todaysPhotos.map(({ id }) => id))
   })
 
+  it('keeps a lot holding photos of the day when one more arrives later that day', async () => {
+    const olderPhotos = photosOn(YESTERDAY, 15)
+    const morningPhotos = photosOn(MORNING, 10, LIBRARY.length + 1)
+    const [eveningPhoto] = photosOn(EVENING, 1, LATE_ARRIVAL_NUMBER)
+    const morningLot = await drawOn(MORNING, [...olderPhotos, ...morningPhotos])
+
+    expect(await drawOn(EVENING, [...olderPhotos, ...morningPhotos, eveningPhoto])).toEqual(
+      morningLot,
+    )
+  })
+
   it('answers an empty lot for an empty library', async () => {
     expect(await drawOn(MORNING, [])).toEqual({ photoIds: [] })
   })
~~~~

## Final verification (controller)

- `pnpm test:bruno` against a running API: expect 185 requests, 474 assertions by the count above, all green (`list/14` needs no data).
- Chrome: the three checklists of the spec (« Chrome checklists »): getting 25 or more photos without the seed, the step 11 checklist, the blocked-storage toast.
- No `pnpm db:push`: no schema change.

## Drift Log

- **Order of work:** the code came first, then the spec and this plan, committed first by rebuilding the branch with `git cherry-pick` (as in step 12).
- **Task 6 was not in the triage list:** found while writing the step 11 checklist. Its setup uploads 25 photos on one day, and expected result 5 (« add a photo: the lot does not change ») could fail: photos of the day were ranked by hash, so a newcomer could outrank a photo already in the lot whenever the account had fewer than 20 older photos. The new unit test failed on the old code (`LATE_ARRIVAL_NUMBER` was picked so its hash ranks first among the photos of the day), then passed.
- **Task 6, no Bruno case:** reproducing it needs more than 20 photos uploaded in one Bruno run against the shared database; the unit test pins the rule (spec, Rejected).
- **Task 2 type:** `test(server)` rather than `fix(...)`: it adds coverage, no behaviour changes.
