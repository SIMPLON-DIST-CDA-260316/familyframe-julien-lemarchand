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

Architecture, parcours d'une photo et choix techniques : [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Feuille de route

- [x] **J1** — MVP fonctionnel en local, sans Docker
- [ ] **J2–J4** — Conteneurisation front/back, orchestration Docker Compose, variables d'environnement et secrets, documentation de démarrage
- [ ] **J5** — Polish UX du cadre (dernière photo en avant, historique consultable, pseudo affiché)

## Démarrage (local, sans Docker)

**Prérequis :** Node.js ≥ 24 (voir `.nvmrc`), pnpm 10 (`corepack enable`), un cluster MongoDB Atlas, un compte Cloudinary (le serveur refuse de démarrer sans ses trois variables).

```bash
pnpm install                         # installe tout le workspace + génère le client Prisma
cp server/.env.example server/.env   # puis renseigner DATABASE_URL et les 3 variables Cloudinary
pnpm db:push                         # crée la collection et les index dans MongoDB
pnpm dev                             # lance client et serveur en parallèle
```

| Service       | URL                         |
| ------------- | --------------------------- |
| Envoi         | http://localhost:5180       |
| Cadre         | http://localhost:5180/frame |
| API (Express) | http://localhost:3000       |

Depuis un smartphone sur le même réseau : `http://<ip-du-pc>:5180` (le pare-feu Windows doit autoriser Node sur les réseaux privés, et le Wi-Fi ne doit pas isoler les appareils entre eux).

### Scripts racine

| Script                          | Rôle                                      |
| ------------------------------- | ----------------------------------------- |
| `pnpm dev`                      | client + serveur en mode watch            |
| `pnpm build`                    | build des deux packages                   |
| `pnpm typecheck`                | vérification TypeScript                   |
| `pnpm check` / `pnpm check:fix` | lint + format + tri des imports (Biome)   |
| `pnpm test`                     | tests unitaires du serveur (Vitest)       |
| `pnpm test:hooks`               | tests des hooks Claude Code               |
| `pnpm test:bruno`               | requêtes Bruno contre l'API lancée        |
| `pnpm db:push`                  | synchronise le schéma Prisma avec MongoDB |
| `pnpm db:studio`                | explorateur de données Prisma Studio      |

## Contribuer

Git flow, conventions de commit et de PR : voir [`CONTRIBUTING.md`](CONTRIBUTING.md).
