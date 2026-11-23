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

## Pages

| Chemin   | Page                                                                                          |
| -------- | --------------------------------------------------------------------------------------------- |
| `/`      | envoi : pseudo (mémorisé dans `localStorage`), « Prendre une photo » ou « Choisir une image » |
| `/frame` | cadre : dernière photo en grand, les précédentes en vignettes                                 |

Le routage est fait côté navigateur (`react-router`). En production (J2), le serveur qui sert le client devra donc renvoyer `index.html` pour `/frame` (« SPA fallback »), sinon un rechargement de la page donne une 404.

## API

| Route              | Réponse                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| `GET /api/health`  | `200 { "status": "ok" }` (servira de healthcheck Docker en J2)                   |
| `GET /api/photos`  | `200 Photo[]`, les 20 plus récentes en premier                                   |
| `POST /api/photos` | `multipart/form-data` avec `nickname` (texte) et `photo` (fichier) → `201 Photo` |

Une `Photo` vaut `{ id, url, nickname, createdAt }` (`createdAt` en ISO 8601). L'identifiant Cloudinary reste côté serveur.

En cas d'erreur, l'API renvoie `{ "error": code }` ; le client traduit le code en message français :

| Cas                                                     | Statut | `error`              |
| ------------------------------------------------------- | ------ | -------------------- |
| pseudo absent, vide ou de plus de 30 caractères         | 400    | `NICKNAME_INVALID`   |
| aucun fichier                                           | 400    | `PHOTO_MISSING`      |
| autre erreur Multer (mauvais champ, plusieurs fichiers) | 400    | `UPLOAD_INVALID`     |
| fichier de plus de 10 Mo                                | 413    | `PHOTO_TOO_LARGE`    |
| type autre que JPEG, PNG ou WebP                        | 415    | `FORMAT_UNSUPPORTED` |
| image illisible par Sharp                               | 422    | `IMAGE_UNREADABLE`   |
| toute autre erreur (Cloudinary, base)                   | 500    | `SERVER_ERROR`       |

## Temps réel

- Un seul événement, du serveur vers les clients : `photo:new`, avec la `Photo` créée, diffusé à tous (`io.emit`).
- Le cadre recharge la liste à chaque connexion Socket.IO, reconnexions comprises : une photo envoyée pendant une coupure n'est pas perdue.
- Les types partagés (`Photo`, codes d'erreur, événements) sont dupliqués entre `server/src/types.ts` et `client/src` : un package commun compliquerait les builds Docker.

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
- En local, `server/.env` (non versionné) est chargé par Node (`--env-file-if-exists`) ; la liste des variables attendues est dans `server/.env.example`.
- Côté client, aucun secret : le client n'appelle que des chemins relatifs.

## Données

- **MongoDB Atlas** via **Prisma 6**. Prisma 7+ ne supporte pas encore MongoDB : la version est volontairement figée.
- Le client Prisma est généré à l'installation (`postinstall`) ; le schéma est poussé avec `pnpm --filter server db:push` (pas de migrations avec MongoDB).

## Outillage

- **TypeScript** partout : `tsx watch` en dev côté serveur, `tsc` pour le build ; `tsc -b` + Vite côté client.
- **Biome** : lint, formatage et tri des imports (remplace ESLint + Prettier).
- **lefthook** : `biome check` au pre-commit, **commitlint** au commit-msg.
- **Hooks Claude Code** (`.claude/hooks/`) : garde-fous pour l'agent IA, testés avec `node:test`.

## Conteneurisation

À venir (J2–J4) : images Docker du client et de l'API, orchestration Docker Compose, gestion des secrets.

Points déjà connus :

- **Sharp** embarque des binaires propres à chaque plateforme : il doit être installé dans l'image, jamais copié depuis le `node_modules` Windows.
- Le serveur qui sert le client doit faire le **SPA fallback** pour `/frame` (voir [Pages](#pages)).
