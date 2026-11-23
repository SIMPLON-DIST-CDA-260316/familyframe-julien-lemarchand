# FamilyFrame 🎄

Cadre photo connecté pour les familles éloignées : un proche renseigne son pseudo, prend une photo depuis son smartphone, et elle apparaît en temps réel sur le cadre installé chez ses grands-parents — sans rechargement.

Projet de formation **Concepteur Développeur d'Applications** (Simplon), axé sur la **conteneurisation avec Docker et Docker Compose**. Énoncé complet : [`docs/brief.md`](docs/brief.md).

## Stack

| Couche   | Technologies                             |
| -------- | ---------------------------------------- |
| Frontend | pnpm, React, Vite                        |
| Backend  | Node.js, Express, Socket.IO              |
| Données  | MongoDB Atlas, Prisma                    |
| Images   | Multer, Sharp, Cloudinary                |
| DevOps   | Docker, Docker Compose, CI (optionnelle) |

## Parcours d'une photo

1. Le proche saisit son pseudo et prend / choisit une photo (interface React).
2. L'image est envoyée à une route Express (Multer).
3. Le serveur contrôle le fichier, le décode et le réencode avec Sharp.
4. L'image est hébergée sur Cloudinary.
5. URL, identifiant Cloudinary, pseudo et date sont enregistrés dans MongoDB.
6. Socket.IO diffuse la nouvelle photo au cadre, qui l'affiche instantanément.

## Feuille de route

- [ ] **J1** — MVP fonctionnel en local, sans Docker
- [ ] **J2–J4** — Conteneurisation front/back, orchestration Docker Compose, variables d'environnement et secrets, documentation de démarrage
- [ ] **J5** — Polish UX du cadre (dernière photo en avant, historique consultable, pseudo affiché)

## Structure

```
.
├── client/   # React + Vite (TypeScript) — interfaces d'envoi et cadre
├── server/   # Express + Socket.IO + Prisma (TypeScript) — API
│   └── prisma/schema.prisma
├── docs/     # Énoncé du brief
└── biome.json, pnpm-workspace.yaml, …
```

Monorepo **pnpm workspaces**. Lint et formatage : **[Biome](https://biomejs.dev)** (remplace ESLint + Prettier).

## Démarrage (local, sans Docker)

**Prérequis :** Node.js ≥ 24 (voir `.nvmrc`), pnpm 10 (`corepack enable`), un cluster MongoDB Atlas.

```bash
pnpm install                         # installe tout le workspace + génère le client Prisma
cp server/.env.example server/.env   # puis renseigner DATABASE_URL, Cloudinary…
pnpm dev                             # lance client et serveur en parallèle
```

| Service       | URL                   |
| ------------- | --------------------- |
| Client (Vite) | http://localhost:5180 |
| API (Express) | http://localhost:3000 |

En dev, Vite proxifie `/api` et `/socket.io` vers l'API : le front n'appelle que sa propre origine. Le serveur Vite est exposé sur le réseau local (`host: true`) pour tester depuis un smartphone via l'IP du PC (`http://<ip-du-pc>:5180`).

> **Prisma 6 :** MongoDB n'est pas encore supporté par Prisma 7+, le projet est volontairement fixé sur `prisma@6`.

### Scripts racine

| Script                           | Rôle                                      |
| -------------------------------- | ----------------------------------------- |
| `pnpm dev`                       | client + serveur en mode watch            |
| `pnpm build`                     | build des deux packages                   |
| `pnpm typecheck`                 | vérification TypeScript                   |
| `pnpm check` / `pnpm check:fix`  | lint + format + tri des imports (Biome)   |
| `pnpm --filter server db:push`   | synchronise le schéma Prisma avec MongoDB |
| `pnpm --filter server db:studio` | explorateur de données Prisma Studio      |

## Contribuer

Git flow, conventions de commit et de PR : voir [`CONTRIBUTING.md`](CONTRIBUTING.md).
