# Architecture

Comment FamilyFrame est construit. Pour lancer le projet : [`README.md`](README.md). Pour y contribuer : [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Vue d'ensemble

```mermaid
flowchart LR
  phone["Smartphone<br/>(page d'envoi)"] -- "envoi (multipart)" --> api["API Express"]
  api -- "image réencodée" --> cloudinary[("Cloudinary")]
  api -- "métadonnées" --> mongo[("MongoDB Atlas")]
  api -- "Socket.IO : nouvelle photo" --> frame["Cadre<br/>(page d'affichage)"]
  frame -- "chargement des photos" --> api
```

Deux interfaces React (envoi, cadre) servies par le même client Vite, une API Express qui porte aussi le serveur Socket.IO. Les images sont stockées sur Cloudinary ; MongoDB ne garde que les métadonnées.

## Organisation du dépôt

Monorepo **pnpm workspaces** : un lockfile unique, des scripts racine qui orchestrent les deux packages (`pnpm -r`).

- `client/` : les deux interfaces React (envoi, cadre), servies par Vite.
- `server/` : l'API Express, le serveur Socket.IO et l'accès aux données (Prisma).
- `docs/` : énoncé du brief et docs de travail datés.

Le détail des fichiers n'est pas listé ici : il change trop vite pour rester juste.

## Parcours d'une photo

1. Le proche saisit son pseudo et prend ou choisit une photo (`<input type="file" accept="image/*" capture>`).
2. Le client envoie l'image en `multipart/form-data` à une route Express ; **Multer** la reçoit en mémoire.
3. Le serveur contrôle le pseudo (30 caractères max) et le fichier (10 Mo max, JPEG/PNG/WebP), puis le **décode et le réencode avec Sharp** : JPEG de 1920 px max, orientation EXIF appliquée, métadonnées (GPS compris) supprimées. Le type déclaré par le navigateur n'est pas fiable : c'est le décodage par Sharp qui valide vraiment l'image.
4. L'image réencodée est envoyée à **Cloudinary**, dans le dossier `familyframe`.
5. **Prisma** enregistre dans MongoDB l'URL, l'identifiant Cloudinary, le pseudo et la date.
6. Le serveur émet un événement **Socket.IO** ; le cadre affiche la nouvelle photo sans rechargement.
7. À l'affichage, le serveur construit deux URL Cloudinary depuis l'identifiant : la photo entière et une miniature carrée de 640 px recadrée sur le sujet (`c_fill,g_auto`). Les deux portent `f_auto,q_auto` : Cloudinary livre du WebP si le navigateur l'accepte et que c'est plus léger, sinon du JPEG. Une seule image est stockée. Les URL sont **signées** et le compte Cloudinary a « Strict transformations » activé : une URL dont on modifie la transformation est refusée, personne ne peut consommer le quota à notre place.

## Pages

| Chemin   | Page                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`      | envoi : pseudo (mémorisé dans `localStorage`), « Prendre une photo » ou « Choisir une image »                                                                                               |
| `/frame` | cadre : bibliothèque des photos en vignettes ou en liste (choix mémorisé par appareil), chacune avec « Supprimer » ; « Lancer le diaporama » ou une minute sans activité lance le diaporama |

Le routage est fait côté navigateur (`react-router`). En production (J2), le serveur qui sert le client devra donc renvoyer `index.html` pour `/frame` (« SPA fallback »), sinon un rechargement de la page donne une 404.

## API

| Route                    | Réponse                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `GET /api/health`        | `200 { "status": "ok" }` (servira de healthcheck Docker en J2)                           |
| `GET /api/photos`        | `200 Photo[]`, les 20 plus récentes en premier                                           |
| `POST /api/photos`       | `multipart/form-data` avec `uploaderName` (texte) et `photo` (fichier) → `201 Photo`     |
| `DELETE /api/photos/:id` | `204` sans corps ; supprime l'enregistrement puis l'image Cloudinary (cache CDN compris) |

Une `Photo` vaut `{ id, url, thumbnailUrl, uploaderName, createdAt }` (`createdAt` en ISO 8601). L'identifiant Cloudinary reste côté serveur : le client reçoit des URL prêtes à l'emploi.

En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code en message français :

| Cas                                                     | Statut | `error`                 |
| ------------------------------------------------------- | ------ | ----------------------- |
| pseudo absent, vide ou de plus de 30 caractères         | 400    | `UPLOADER_NAME_INVALID` |
| aucun fichier                                           | 400    | `PHOTO_MISSING`         |
| autre erreur Multer (mauvais champ, plusieurs fichiers) | 400    | `UPLOAD_INVALID`        |
| route inconnue                                          | 404    | `ROUTE_NOT_FOUND`       |
| photo inconnue, ou id qui n'est pas un ObjectId         | 404    | `PHOTO_NOT_FOUND`       |
| fichier de plus de 10 Mo                                | 413    | `PHOTO_TOO_LARGE`       |
| type autre que JPEG, PNG ou WebP                        | 415    | `FORMAT_UNSUPPORTED`    |
| image illisible par Sharp                               | 422    | `IMAGE_UNREADABLE`      |
| toute autre erreur (Cloudinary, base)                   | 500    | `SERVER_ERROR`          |

## Temps réel

- Deux événements, du serveur vers les clients, diffusés à tous (`io.emit`) : `photo:new` avec la `Photo` créée, `photo:deleted` avec l'id de la photo supprimée.
- Le cadre recharge la liste à chaque connexion Socket.IO, reconnexions comprises : une photo envoyée pendant une coupure n'est pas perdue.
- Les types partagés (`Photo`, codes d'erreur, événements) sont dupliqués entre `server/src/types.ts` et `client/src` : un package commun compliquerait les builds Docker.

## Serveur : app et processus

- `server/src/app.ts` construit l'application Express (middlewares, routes, gestion d'erreurs) sans écouter de port.
- `server/src/server.ts` la fait tourner : serveur HTTP, Socket.IO, port. Socket.IO est créé d'abord puis rattaché au serveur HTTP, car le contrôleur en a besoin pour diffuser.
- **Au démarrage**, un `ping` MongoDB : une base injoignable arrête le serveur tout de suite, au lieu d'échouer à la première requête.
- **À l'arrêt** (`SIGINT` au Ctrl+C, `SIGTERM` au `docker stop`) : fermeture de Socket.IO et du serveur HTTP, puis déconnexion de Prisma.

## Couches du backend

Une feature par dossier (`server/src/features/photos/`), un fichier par couche :

| Fichier                | Rôle                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `photos.routes.ts`     | chemins et middleware d'upload, rien d'autre                                         |
| `photos.upload.ts`     | configuration Multer : en mémoire, 10 Mo, un fichier                                 |
| `photos.controller.ts` | lit la requête, appelle le service, convertit en DTO, diffuse `photo:new`, répond    |
| `photos.service.ts`    | règles métier (pseudo, fichier, format, image lisible) ; ignore Express et Socket.IO |
| `photos.repository.ts` | seul accès à Prisma                                                                  |

- Les dépendances sont passées par des fonctions-fabriques (`createPhotosService({ repository, toFrameJpeg, uploadImage, deleteImage, logger })`), assemblées dans `app.ts` : un test peut fournir de fausses implémentations.
- `server/src/lib/` regroupe les clients techniques : Prisma (`db.ts`), Cloudinary, sharp (`image.ts`).
- **Erreurs** : le service lève une `AppError` portant un code ; le contrôleur n'a pas de try/catch (Express 5 transmet les rejets). Une route inconnue tombe sur `errors/not-found.ts` (monté après les routes), qui lève `ROUTE_NOT_FOUND`. `errors/error-handler.ts` est le seul endroit qui écrit une réponse d'erreur, avec un statut tiré d'un `Record` exhaustif sur les codes. Une erreur de sharp devient `IMAGE_UNREADABLE` (faute de l'utilisateur) ; une erreur de Cloudinary ou de Prisma reste une 500.

## Logs

- Le serveur écrit **une ligne par événement sur la sortie standard**, via `server/src/lib/logger.ts` (fait maison, sans dépendance). C'est ce que `docker logs` affiche.
- **Format** : JSON par défaut, filtrable (`{"time":"…","level":"info","event":"photo.created","photoId":"…"}`) ; `LOG_FORMAT=pretty` en dev donne `14:37:17 INFO  photo.created photoId=…`. Une `Error` est écrite avec son nom, son message et sa pile.
- **Niveaux** : `info` < `warn` < `error` ; `LOG_LEVEL` fixe le niveau minimum écrit.
- **Noms d'événements stables** `domaine.action` : on filtre sur le nom (`docker logs <conteneur> | grep photo.`), pas sur un texte qui change à chaque reformulation.
- **Pas de données personnelles** : jamais le pseudo, seulement des identifiants (`photoId`, `cloudinaryId`, `socketId`) ; les chemins sans leur query string.
- Le service photos reçoit le logger par injection ; le reste du serveur importe `logger`.

| Événement                                                   | Niveau                        | Écrit par                                                                                                    |
| ----------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `db.connected` / `db.unreachable`                           | info / error                  | `server.ts`, ping au démarrage                                                                               |
| `server.started`                                            | info                          | `server.ts`                                                                                                  |
| `socket.connected` / `socket.disconnected`                  | info                          | `server.ts`                                                                                                  |
| `http.request`                                              | info, warn (4xx), error (5xx) | `lib/request-logger.ts`, sauf `/api/health`                                                                  |
| `photo.created` / `photo.deleted`                           | info                          | service photos                                                                                               |
| `photo.unreadable`                                          | warn                          | service photos, erreur de sharp                                                                              |
| `photo.orphaned`                                            | error                         | service photos : image sur Cloudinary sans enregistrement en base (échec d'enregistrement ou de suppression) |
| `server.error`                                              | error                         | `errors/error-handler.ts`, pour chaque 500                                                                   |
| `server.stopping` / `server.stopped` / `server.stop_failed` | info / info / error           | `server.ts`, à l'arrêt                                                                                       |
| `process.crashed`                                           | error                         | `server.ts`, exception ou rejet non géré, puis arrêt                                                         |

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
- Côté client, aucun secret : le client n'appelle que des chemins relatifs.

## Données

- **MongoDB Atlas** via **Prisma 6**. Prisma 7+ ne supporte pas encore MongoDB : la version est volontairement figée.
- Le client Prisma est généré à l'installation (`postinstall`) ; le schéma est poussé avec `pnpm --filter server db:push` (pas de migrations avec MongoDB).

## Outillage

- **TypeScript** partout : `tsx watch` en dev côté serveur, `tsc -p tsconfig.build.json` pour le build (sans les tests) ; `tsc -b` + Vite côté client.
- **Biome** : lint, formatage et tri des imports (remplace ESLint + Prettier). Dans `server/src`, `noConsole` interdit `console` : on passe par le logger.
- **lefthook** : `biome check` au pre-commit, **commitlint** au commit-msg.
- **Vitest** : tests unitaires du serveur, colocalisés (`*.test.ts`), lancés par `pnpm test` sans API ; exclus du build par `server/tsconfig.build.json`.
- **Bruno** (`server/bruno/`) : requêtes de l'API avec assertions, un dossier par endpoint, des fichiers `NN-nominal-…` / `NN-edge-…`. Lancées par `pnpm test:bruno` contre l'API démarrée (CLI via `pnpm dlx`, version figée, pas de dépendance).
- **Hooks Claude Code** (`.claude/hooks/`) : garde-fous pour l'agent IA, testés avec `node:test`.

## Conteneurisation

À venir (J2–J4) : images Docker du client et de l'API, orchestration Docker Compose, gestion des secrets.

Points déjà connus :

- **Sharp** embarque des binaires propres à chaque plateforme : il doit être installé dans l'image, jamais copié depuis le `node_modules` Windows.
- Le serveur qui sert le client doit faire le **SPA fallback** pour `/frame` (voir [Pages](#pages)).
