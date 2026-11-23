# FamilyFrame 🎄

Cadre photo connecté pour les familles éloignées : un proche renseigne son pseudo, prend une photo depuis son smartphone, et elle apparaît en temps réel sur le cadre installé chez ses grands-parents — sans rechargement.

Projet de formation **Concepteur Développeur d'Applications** (Simplon), axé sur la **conteneurisation avec Docker et Docker Compose**. Énoncé complet : [`docs/brief.md`](docs/brief.md).

## Stack

| Couche | Technologies |
| --- | --- |
| Frontend | pnpm, React, Vite |
| Backend | Node.js, Express, Socket.IO |
| Données | MongoDB Atlas, Prisma |
| Images | Multer, Sharp, Cloudinary |
| DevOps | Docker, Docker Compose, CI (optionnelle) |

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

## Démarrage

_À venir._
