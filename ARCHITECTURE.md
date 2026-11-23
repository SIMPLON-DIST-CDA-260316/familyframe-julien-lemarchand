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

> Seule la route `GET /api/health` existe aujourd'hui ; le reste du schéma décrit la cible du MVP (J1).

## Organisation du dépôt

Monorepo **pnpm workspaces** : un lockfile unique, des scripts racine qui orchestrent les deux packages (`pnpm -r`).

- `client/` : les deux interfaces React (envoi, cadre), servies par Vite.
- `server/` : l'API Express, le serveur Socket.IO et l'accès aux données (Prisma).
- `docs/` : énoncé du brief et docs de travail datés.

Le détail des fichiers n'est pas listé ici : il change trop vite pour rester juste.

## Parcours d'une photo

1. Le proche saisit son pseudo et prend ou choisit une photo (`<input type="file" accept="image/*" capture>`).
2. Le client envoie l'image en `multipart/form-data` à une route Express ; **Multer** la reçoit en mémoire.
3. Le serveur contrôle le fichier (type, taille), puis le **décode et le réencode avec Sharp** : seule une image valide et propre est conservée.
4. L'image réencodée est envoyée à **Cloudinary**.
5. **Prisma** enregistre dans MongoDB l'URL, l'identifiant Cloudinary, le pseudo et la date.
6. Le serveur émet un événement **Socket.IO** ; le cadre affiche la nouvelle photo sans rechargement.

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

- Variables d'environnement lues dans `server/src/config.ts`, qui **échoue au démarrage** si une variable obligatoire manque (`DATABASE_URL`).
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
