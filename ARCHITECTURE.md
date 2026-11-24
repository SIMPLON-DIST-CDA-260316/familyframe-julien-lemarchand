# Architecture

Comment FamilyFrame est construit. Pour lancer le projet : [`README.md`](README.md). Pour y contribuer : [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Vue d'ensemble

```mermaid
flowchart LR
  phone["Smartphone<br/>(bibliothèque)"] -- "envoi (multipart)" --> api["API Express"]
  api -- "image réencodée" --> cloudinary[("Cloudinary")]
  api -- "métadonnées" --> mongo[("MongoDB Atlas")]
  api -- "Socket.IO : nouvelle photo" --> frame["Cadre<br/>(page d'affichage)"]
  frame -- "chargement des photos" --> api
```

Trois pages React (connexion, bibliothèque, cadre) servies par le même client Vite, une API Express qui porte aussi le serveur Socket.IO. Les images sont stockées sur Cloudinary ; MongoDB ne garde que les métadonnées.

## Organisation du dépôt

Monorepo **pnpm workspaces** : un lockfile unique, des scripts racine qui orchestrent les deux packages (`pnpm -r`).

- `client/` : les pages React (connexion, bibliothèque, cadre), servies par Vite.
- `server/` : l'API Express, le serveur Socket.IO et l'accès aux données (Prisma).
- `docs/` : énoncé du brief et docs de travail datés.

Le détail des fichiers n'est pas listé ici : il change trop vite pour rester juste.

## Parcours d'une photo

1. Le proche, connecté à son compte, prend ou choisit une photo (`<input type="file" accept="image/*" capture>`).
2. Le client envoie l'image en `multipart/form-data` à une route Express ; **Multer** la reçoit en mémoire.
3. Le serveur vérifie la session (cookie `ff_session`, voir [Authentification](#authentification)) et le fichier (10 Mo max, JPEG/PNG/WebP), calcule le **SHA-256** des octets reçus et refuse un fichier déjà présent dans la bibliothèque du compte (`409 PHOTO_DUPLICATE`, sans appeler Sharp ni Cloudinary), puis le **décode et le réencode avec Sharp** : JPEG de 1920 px max, orientation EXIF appliquée, métadonnées (GPS compris) supprimées. Le type déclaré par le navigateur n'est pas fiable : c'est le décodage par Sharp qui valide vraiment l'image.
4. L'image réencodée est envoyée à **Cloudinary**, dans le dossier `familyframe`.
5. **Prisma** enregistre dans MongoDB l'URL, l'identifiant Cloudinary, le propriétaire (`ownerId`, le compte connecté), le SHA-256 du fichier reçu et la date. L'index unique `(ownerId, sha256)` est la vraie garantie : deux envois simultanés du même fichier passent la vérification, le second est refusé à l'enregistrement (`409` aussi) et son image Cloudinary est détruite.
6. Le serveur émet un événement **Socket.IO** vers les connexions de ce compte ; son cadre affiche la nouvelle photo sans rechargement.
7. À l'affichage, le serveur construit deux URL Cloudinary depuis l'identifiant : la photo entière et une miniature carrée de 640 px recadrée sur le sujet (`c_fill,g_auto`). Les deux portent `f_auto,q_auto` : Cloudinary livre du WebP si le navigateur l'accepte et que c'est plus léger, sinon du JPEG. Une seule image est stockée. Les URL sont **signées** et le compte Cloudinary a « Strict transformations » activé : une URL dont on modifie la transformation est refusée, personne ne peut consommer le quota à notre place.

## Pages

| Chemin   | Page                                                                                                                                                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login` | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                      |
| `/`      | bibliothèque : carte d'envoi (« Prendre une photo » ou « Choisir une image »), puis les photos du compte en vignettes ou en liste (même choix mémorisé que le cadre), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans un nouvel onglet ; « Se déconnecter » |
| `/frame` | cadre : toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), en vignettes ou en liste (choix mémorisé par appareil), chacune avec « Supprimer » ; « Lancer le diaporama » ou une minute sans activité lance le diaporama                        |

`/` et `/frame` sont enveloppées dans `RequireAuth` (`client/src/auth/`) : sans utilisateur, redirection vers `/login` en gardant la page demandée. `AuthProvider` appelle `GET /api/auth/me` au chargement (le cookie est `httpOnly`, seul le serveur sait qui est connecté) et oublie l'utilisateur quand l'API répond 401 ou que Socket.IO refuse la connexion (`UNAUTHENTICATED`). Seul un 401 renvoie vers `/login` : si l'API est injoignable au démarrage (erreur réseau ou 5xx, par exemple un cadre rallumé avant le Wi-Fi), `AuthProvider` reste en chargement et réessaie toutes les 5 secondes. Le cadre recharge ses photos une fois par jour : cet appel HTTP prolonge la session (voir [Authentification](#authentification)).

Le routage est fait côté navigateur (`react-router`). En production (J2), le serveur qui sert le client devra donc renvoyer `index.html` pour `/login` et `/frame` (« SPA fallback »), sinon un rechargement de la page donne une 404.

## API

| Route                                   | Réponse                                                                                                                                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/health`                       | `200 { "status": "ok" }` (servira de healthcheck Docker en J2)                                                                                                                                                     |
| `POST /api/auth/login`                  | JSON `{ email, password }` → `200 { user }` + cookie `ff_session`                                                                                                                                                  |
| `POST /api/auth/logout`                 | `204` ; supprime la session et efface le cookie (répond `204` aussi sans session)                                                                                                                                  |
| `GET /api/auth/me`                      | `200 { user }`, l'utilisateur de la session                                                                                                                                                                        |
| `GET /api/photos?cursor=<id>&limit=<n>` | `200 { photos, nextCursor }` : photos du compte connecté, la plus récente en premier ; `limit` de 1 à 100 (30 par défaut) ; `nextCursor` est l'id à passer en `cursor` pour la page suivante, `null` à la dernière |
| `POST /api/photos`                      | `multipart/form-data` avec `photo` (fichier) → `201 Photo`                                                                                                                                                         |
| `DELETE /api/photos/:id`                | `204` sans corps, pour une photo du compte connecté ; supprime l'enregistrement, puis l'image Cloudinary (cache CDN compris) si plus aucune photo n'y renvoie                                                      |

Toutes les routes `/api/photos` et `GET /api/auth/me` demandent une session ; sans elle : `401 UNAUTHENTICATED`. Un `user` vaut `{ id, email, displayName, role }` (`role` : `member` ou `admin`), jamais le hash du mot de passe.

Une `Photo` vaut `{ id, url, thumbnailUrl, createdAt }` (`createdAt` en ISO 8601). Chaque photo appartient au compte qui l'a envoyée (`ownerId`, côté serveur seulement) : la liste, la suppression et les événements ne concernent que les photos du compte connecté. L'identifiant Cloudinary reste côté serveur : le client reçoit des URL prêtes à l'emploi.

La liste est paginée par curseur (_keyset_) sur l'id : un ObjectId commence par sa date de création, trier par id revient donc à trier par date, et `id < cursor` est une seule requête sur l'index `(ownerId, id)`. Une photo ajoutée ou supprimée entre deux pages ne décale rien, contrairement à une pagination par numéro de page.

En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code en message français :

| Cas                                                                      | Statut | `error`               |
| ------------------------------------------------------------------------ | ------ | --------------------- |
| aucun fichier                                                            | 400    | `PHOTO_MISSING`       |
| autre erreur Multer (mauvais champ, plusieurs fichiers)                  | 400    | `UPLOAD_INVALID`      |
| corps JSON illisible (routes `/api/auth`)                                | 400    | `BODY_INVALID`        |
| `limit` ou `cursor` invalide (`GET /api/photos`)                         | 400    | `QUERY_INVALID`       |
| pas de session, session inconnue ou expirée                              | 401    | `UNAUTHENTICATED`     |
| e-mail inconnu ou mauvais mot de passe                                   | 401    | `INVALID_CREDENTIALS` |
| route inconnue                                                           | 404    | `ROUTE_NOT_FOUND`     |
| photo inconnue, photo d'un autre compte, ou id qui n'est pas un ObjectId | 404    | `PHOTO_NOT_FOUND`     |
| fichier déjà dans la bibliothèque du compte (même SHA-256)               | 409    | `PHOTO_DUPLICATE`     |
| fichier de plus de 10 Mo                                                 | 413    | `PHOTO_TOO_LARGE`     |
| type autre que JPEG, PNG ou WebP                                         | 415    | `FORMAT_UNSUPPORTED`  |
| image illisible par Sharp                                                | 422    | `IMAGE_UNREADABLE`    |
| toute autre erreur (Cloudinary, base)                                    | 500    | `SERVER_ERROR`        |

## Authentification

- **Comptes** : `User` (e-mail unique, nom d'affichage, hash du mot de passe, rôle `member` ou `admin`). Mots de passe hachés en **argon2id** (`server/src/lib/password.ts`, seul fichier qui importe `argon2`). Pas d'inscription : les comptes viennent du seed (`pnpm db:seed`) ; les invitations arrivent à l'étape 3.
- **Session** : à la connexion, le serveur tire 32 octets aléatoires (le jeton), les envoie dans le cookie `ff_session` et ne garde en base que leur SHA-256 (`Session.tokenHash`) : une fuite de la base n'ouvre aucune session. La déconnexion supprime la session : révocation immédiate, sans liste noire.
- **Cookie** : `httpOnly` (illisible en JavaScript), `SameSite=Lax`, `Secure` quand `NODE_ENV=production`, `path=/`, expire avec la session. En dev, le proxy Vite rend l'API same-origin : le navigateur envoie le cookie sans réglage CORS.
- **Glissement** : une session dure 90 jours ; une requête HTTP authentifiée qui arrive à moins de 45 jours de la fin la prolonge à 90 jours et renvoie le cookie. Le cadre recharge ses photos une fois par jour (`usePhotoFeed`) : cet appel HTTP prolonge la session, ce que la connexion Socket.IO ne ferait pas. Un cadre allumé ne se déconnecte donc jamais, pour au plus une écriture en base tous les 45 jours. Une socket déjà ouverte n'est pas revérifiée par le serveur quand sa session expire ou est supprimée par une déconnexion : elle est refusée à la reconnexion suivante.
- **Expiration** : Prisma 6 ne sait pas déclarer d'index TTL MongoDB. Une session expirée est supprimée quand on la lit, et toutes les sessions expirées à chaque connexion réussie.
- **Connexion refusée** : e-mail inconnu et mauvais mot de passe répondent tous deux `401 INVALID_CREDENTIALS`, et un e-mail inconnu coûte quand même une vérification argon2 (contre un hash factice) : ni le message ni le temps de réponse ne disent qui a un compte.
- **Garde HTTP** : `requireAuth` (`features/auth/auth.middleware.ts`) lit le cookie avec `lib/session-token.ts` (sans `cookie-parser`), valide la session et pose `req.user`, typé par _declaration merging_ sur `Request` ; `currentUser(req)` le relit sans cast. `/api/photos` et `/api/auth/me` sont derrière ; `/api/health`, `/api/auth/login` et `/api/auth/logout` restent publics.
- **JSON** : `express.json()` n'est monté que sur `/api/auth`, les seules routes qui lisent du JSON ; un corps illisible répond `400 BODY_INVALID`.

## Temps réel

- **Connexion protégée** : un middleware `io.use` (`features/auth/auth.socket.ts`) lit le même cookie dans la requête de handshake et valide la session, sans glissement (pas de réponse HTTP pour porter un nouveau cookie). Sans session valide, la connexion est refusée avec l'erreur `UNAUTHENTICATED`, que le client traite comme une déconnexion ; une panne de la base donne `SERVER_ERROR` (journalisée en `server.error`). Chaque socket rejoint la room `user:<id>` (`userRoom`, même fichier).
- Deux événements, du serveur vers les connexions du propriétaire de la photo (`io.to(userRoom(ownerId))`) : `photo:new` avec la `Photo` créée, `photo:deleted` avec l'id de la photo supprimée. Les autres comptes ne les reçoivent pas.
- Le cadre recharge toute la bibliothèque (toutes les pages) à chaque connexion Socket.IO, reconnexions comprises : une photo envoyée pendant une coupure n'est pas perdue. Ensuite il ajoute `photo:new` en tête et retire `photo:deleted` de la liste, sans recharger. Les événements reçus pendant un chargement sont rejoués sur la liste chargée, et seul le dernier chargement lancé s'applique. Limite connue : chaque connexion relit toutes les pages et le diaporama crée une diapositive par photo, ce qui convient à quelques centaines de photos. La page bibliothèque (`/`) recharge sa première page à chaque connexion et suit les mêmes événements (`usePhotoLibrary`, socket partagée dans `client/src/photoSocket.ts`).
- Les types partagés (`Photo`, codes d'erreur, événements) sont dupliqués entre `server/src/types.ts` et `client/src` : un package commun compliquerait les builds Docker.

## Serveur : app et processus

- `server/src/app.ts` construit l'application Express (middlewares, routes, gestion d'erreurs) sans écouter de port.
- `server/src/server.ts` la fait tourner : serveur HTTP, Socket.IO, port. Socket.IO est créé d'abord puis rattaché au serveur HTTP, car le contrôleur en a besoin pour diffuser.
- **Au démarrage**, un `ping` MongoDB : une base injoignable arrête le serveur tout de suite, au lieu d'échouer à la première requête.
- **À l'arrêt** (`SIGINT` au Ctrl+C, `SIGTERM` au `docker stop`) : fermeture de Socket.IO et du serveur HTTP, puis déconnexion de Prisma.

## Couches du backend

Une feature par dossier (`server/src/features/photos/`, `server/src/features/auth/`), un fichier par couche. Pour les photos :

| Fichier                | Rôle                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `photos.routes.ts`     | chemins et middleware d'upload, rien d'autre                                                                               |
| `photos.upload.ts`     | configuration Multer : en mémoire, 10 Mo, un fichier                                                                       |
| `photos.controller.ts` | lit la requête et le compte connecté, appelle le service, convertit en DTO, diffuse à la room du propriétaire, répond      |
| `photos.service.ts`    | règles métier (fichier, format, doublon, image lisible, propriétaire, image encore utilisée) ; ignore Express et Socket.IO |
| `photos.repository.ts` | seul accès à Prisma                                                                                                        |

- `features/auth/` suit le même découpage (`auth.repository.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`), plus `auth.middleware.ts` (garde HTTP), `auth.socket.ts` (garde Socket.IO) et `auth.cookie.ts` (pose et efface le cookie). Le service d'auth reçoit ses dépendances (`repository`, `hashToken`, `generateToken`, `verifyPassword`, `now`, `logger`) ; `app.ts` l'assemble une fois (`assembleAuthService`) et `server.ts` le partage avec Socket.IO.
- Les dépendances sont passées par des fonctions-fabriques (`createPhotosService({ repository, toFrameJpeg, uploadImage, deleteImage, logger })`), assemblées dans `app.ts` : un test peut fournir de fausses implémentations.
- `server/src/lib/` regroupe les clients techniques : Prisma (`db.ts`), Cloudinary, sharp (`image.ts`).
- **Erreurs** : le service lève une `AppError` portant un code ; le contrôleur n'a pas de try/catch (Express 5 transmet les rejets). Une route inconnue tombe sur `errors/not-found.ts` (monté après les routes), qui lève `ROUTE_NOT_FOUND`. `errors/error-handler.ts` est le seul endroit qui écrit une réponse d'erreur, avec un statut tiré d'un `Record` exhaustif sur les codes. Une erreur de sharp devient `IMAGE_UNREADABLE` (faute de l'utilisateur) ; une erreur de Cloudinary ou de Prisma reste une 500.

## Logs

- Le serveur écrit **une ligne par événement sur la sortie standard**, via `server/src/lib/logger.ts` (fait maison, sans dépendance). C'est ce que `docker logs` affiche.
- **Format** : JSON par défaut, filtrable (`{"time":"…","level":"info","event":"photo.created","photoId":"…"}`) ; `LOG_FORMAT=pretty` en dev donne `14:37:17 INFO  photo.created photoId=…`. Une `Error` est écrite avec son nom, son message et sa pile.
- **Niveaux** : `info` < `warn` < `error` ; `LOG_LEVEL` fixe le niveau minimum écrit.
- **Noms d'événements stables** `domaine.action` : on filtre sur le nom (`docker logs <conteneur> | grep photo.`), pas sur un texte qui change à chaque reformulation.
- **Pas de données personnelles** : jamais un nom, l'e-mail, le mot de passe ni le jeton de session ; seulement des identifiants (`photoId`, `cloudinaryId`, `socketId`, `userId`) ; les chemins sans leur query string.
- Le service photos reçoit le logger par injection ; le reste du serveur importe `logger`.

| Événement                                                   | Niveau                        | Écrit par                                                                                                                                                                   |
| ----------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `db.connected` / `db.unreachable`                           | info / error                  | `server.ts`, ping au démarrage                                                                                                                                              |
| `server.started`                                            | info                          | `server.ts`                                                                                                                                                                 |
| `socket.connected` / `socket.disconnected`                  | info                          | `server.ts`, avec `userId`                                                                                                                                                  |
| `auth.login_succeeded` / `auth.logged_out`                  | info                          | service auth, avec `userId`                                                                                                                                                 |
| `auth.login_failed`                                         | warn                          | service auth, sans aucune donnée (jamais l'e-mail)                                                                                                                          |
| `seed.done` / `seed.refused`                                | info / error                  | `prisma/seed.ts` : nombre de comptes créés / refus avec `NODE_ENV=production`                                                                                               |
| `http.request`                                              | info, warn (4xx), error (5xx) | `lib/request-logger.ts`, sauf `/api/health`                                                                                                                                 |
| `photo.created` / `photo.deleted`                           | info                          | service photos, avec `userId` (le propriétaire) ; `photo.deleted` dit aussi si l'image Cloudinary a été détruite (`isImageDestroyed`)                                       |
| `photo.duplicate`                                           | info                          | service photos : fichier déjà dans la bibliothèque, avec `userId` et le `photoId` de la photo existante (ou le `cloudinaryId` de l'image détruite après un envoi simultané) |
| `photo.unreadable`                                          | warn                          | service photos, erreur de sharp                                                                                                                                             |
| `photo.orphaned`                                            | error                         | service photos : image sur Cloudinary sans enregistrement en base (échec d'enregistrement ou de suppression)                                                                |
| `server.error`                                              | error                         | `errors/error-handler.ts` (chaque 500), `auth.socket.ts` (handshake)                                                                                                        |
| `server.stopping` / `server.stopped` / `server.stop_failed` | info / info / error           | `server.ts`, à l'arrêt                                                                                                                                                      |
| `process.crashed`                                           | error                         | `server.ts`, exception ou rejet non géré, puis arrêt                                                                                                                        |

## Réseau en développement

| Service       | Port | Rôle                                                 |
| ------------- | ---- | ---------------------------------------------------- |
| Client (Vite) | 5180 | pages React, proxy `/api` et `/socket.io` vers l'API |
| API (Express) | 3000 | routes REST + serveur Socket.IO                      |

- **Proxy Vite** : le navigateur ne parle qu'à l'origine du client, ce qui évite les problèmes de CORS et d'URL d'API en dur. Le WebSocket passe aussi par le proxy (`ws: true`).
- **Accès LAN** : Vite écoute sur toutes les interfaces (`host: true`) pour tester depuis un smartphone sur le même réseau.
- **Port 5180 en `strictPort`** : échoue franchement si le port est pris, au lieu de basculer en silence sur un autre.
- **CORS** côté API restreint à `CLIENT_ORIGIN`, pour les appels qui ne passeraient pas par le proxy.

## Configuration

- Variables d'environnement lues dans `server/src/config.ts`, qui **échoue au démarrage** si une variable obligatoire manque : `DATABASE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- `LOG_LEVEL` (`info`, `warn`, `error` ; défaut `info`) et `LOG_FORMAT` (`json`, `pretty` ; défaut `json`) sont facultatives et lues dans `server/src/lib/logger.ts`, pas dans `config.ts` : les tests importent le logger sans fournir les secrets. Une valeur inconnue empêche le démarrage.
- En local, `server/.env` (non versionné) est chargé par Node (`--env-file-if-exists`) ; la liste des variables attendues est dans `server/.env.example`.
- `NODE_ENV=production` ajoute `Secure` au cookie de session (`config.isProduction`) et interdit le seed.
- Côté client, aucun secret : le client n'appelle que des chemins relatifs.

## Données

- **MongoDB Atlas** via **Prisma 6**. Prisma 7+ ne supporte pas encore MongoDB : la version est volontairement figée.
- Le client Prisma est généré à l'installation (`postinstall`) ; le schéma est poussé avec `pnpm --filter server db:push` (pas de migrations avec MongoDB).
- Collections `User`, `Session`, `Photo` et `Invitation`. Index uniques sur `User.email`, `Session.tokenHash` et `Invitation.tokenHash` ; le rôle est un `enum Role` Prisma, que Prisma génère en union de chaînes. `Photo.ownerId` relie chaque photo à son compte ; index unique `(ownerId, sha256)` (un même fichier n'entre qu'une fois dans une bibliothèque), index `(ownerId, id)` pour la liste d'un compte, et index simple sur `cloudinaryId` (plus unique : à l'étape 5, un partage pointera vers la même image). `Invitation.invitedById` relie une invitation à l'admin qui l'a créée ; index simple sur `Invitation.email` (pas unique : une invitation utilisée reste à côté d'une plus récente pour la même adresse). `pnpm db:seed` (`server/prisma/seed.ts`) vide la base (sessions, photos et invitations avant les comptes, car Prisma émule les relations sur MongoDB) et crée les deux comptes de test du README.
- Quand `Photo` gagne un champ obligatoire ou un index unique, `pnpm db:seed` passe **avant** `pnpm db:push` : MongoDB compte un champ absent comme `null`, et d'anciennes photos sans ce champ empêcheraient l'index unique de se créer.
- Piège MongoDB : Prisma n'écrit pas un champ facultatif absent du `create`, et `where: { usedAt: null }` ne trouve qu'un `null` enregistré, pas un champ absent. Le repository des invitations écrit donc `usedAt: null` explicitement à la création : le filtre « pas encore utilisée » reste un simple `usedAt: null`.

## Outillage

- **TypeScript** partout : `tsx watch` en dev côté serveur, `tsc -p tsconfig.build.json` pour le build (sans les tests) ; `tsc -b` + Vite côté client.
- **Biome** : lint, formatage et tri des imports (remplace ESLint + Prettier). Dans `server/src`, `noConsole` interdit `console` : on passe par le logger.
- **lefthook** : `biome check` au pre-commit, **commitlint** au commit-msg.
- **Vitest** : tests unitaires du serveur, colocalisés (`*.test.ts`), lancés par `pnpm test` sans API ; exclus du build par `server/tsconfig.build.json`.
- **Bruno** (`server/bruno/`) : requêtes de l'API avec assertions, un dossier par endpoint, des fichiers `NN-nominal-…` / `NN-edge-…`. Lancées par `pnpm test:bruno` contre l'API démarrée et la base remplie par le seed (CLI via `pnpm dlx`, version figée, pas de dépendance). Le dossier `auth/` passe en premier (`seq: 1`) et range le cookie de session dans une variable, envoyée à toutes les requêtes par un en-tête de collection ; le CLI tourne avec `--disable-cookies` pour que sa boîte à cookies ne renvoie pas la session aux requêtes « sans cookie ». Un second compte (l'admin, `auth/login/05`) range son cookie dans `adminCookie` : les requêtes qui vérifient qu'un compte ne touche pas aux photos d'un autre l'envoient à la place de celui du membre.
- **Hooks Claude Code** (`.claude/hooks/`) : garde-fous pour l'agent IA, testés avec `node:test`.

## Conteneurisation

À venir (J2–J4) : images Docker du client et de l'API, orchestration Docker Compose, gestion des secrets.

Points déjà connus :

- **Sharp** embarque des binaires propres à chaque plateforme : il doit être installé dans l'image, jamais copié depuis le `node_modules` Windows.
- **argon2** charge un binaire précompilé livré dans le paquet (Linux x64/arm64, glibc et musl, Windows x64) : son script de build reste bloqué par pnpm (`ignoredBuiltDependencies`). Comme Sharp, il doit être installé dans l'image, jamais copié depuis le `node_modules` Windows.
- Le serveur qui sert le client doit faire le **SPA fallback** pour `/login` et `/frame` (voir [Pages](#pages)).
- Avec `NODE_ENV=production`, le cookie de session est `Secure` : servi en http simple (cadre sur le réseau local, Compose en local), le navigateur l'ignore et la connexion échoue sans message. Servir en HTTPS, ou ne pas définir `NODE_ENV=production` en http.
