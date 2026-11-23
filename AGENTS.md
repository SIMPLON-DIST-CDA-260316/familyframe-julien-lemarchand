# AGENTS.md

Instructions pour les agents IA (Claude Code, Codex…) qui travaillent sur ce dépôt.

## Projet

FamilyFrame — cadre photo connecté (brief Simplon CDA, 5 jours). Un proche envoie une photo depuis son smartphone, elle apparaît en temps réel sur le cadre. **L'objectif pédagogique principal est la conteneurisation (Docker, Docker Compose)**, pas la complexité applicative. Énoncé : [`docs/brief.md`](docs/brief.md).

Le code doit rester compréhensible et explicable par son auteur : privilégier la solution simple et lisible à la solution astucieuse.

## Stack

- Monorepo **pnpm** : `client/` (React + Vite, TS) et `server/` (Express 5 + Socket.IO + Prisma, TS).
- **Prisma 6** (MongoDB n'est pas supporté par Prisma 7+) — ne pas proposer de montée de version.
- **Biome** pour lint + format (pas d'ESLint ni de Prettier).
- Images : Multer, Sharp, Cloudinary.

## Commandes

| Commande                        | Rôle                                 |
| ------------------------------- | ------------------------------------ |
| `pnpm install`                  | installe le workspace, génère Prisma |
| `pnpm dev`                      | client (5180) + API (3000) en watch  |
| `pnpm check` / `pnpm check:fix` | Biome : lint, format, imports        |
| `pnpm typecheck`                | TypeScript, les deux packages        |
| `pnpm build`                    | build des deux packages              |
| `pnpm test:hooks`               | tests des hooks Claude Code          |

## Conventions

Voir [`CONTRIBUTING.md`](CONTRIBUTING.md) : git flow, Conventional Commits (en anglais), branches, PR.

- **Commits atomiques** : une préoccupation par commit, chaque commit passe `pnpm check` et `pnpm typecheck`. Commiter au fil de l'eau, pas en fin de tâche.
- Jamais de push direct sur `main` ou `develop` (protégées) : branche + PR vers `develop`.

## Règles de conduite

1. **Ambiguïté → demander.** Ne pas deviner une intention ; poser la question avant d'écrire du code.
2. **Planifier avant une tâche en plusieurs étapes**, et présenter le plan.
3. **Diff chirurgical** : ne toucher que ce que la tâche demande, pas de refactor opportuniste ni de code spéculatif.
4. **Pas de « c'est fait » sans preuve** : lancer la vérification (check, typecheck, build, test, requête HTTP…) et citer sa sortie.
5. **Pas de nouvelle dépendance sans accord** : vérifier d'abord ce qui est déjà installé, puis demander.
6. **Secrets** : ne jamais lire, afficher ni logger le contenu d'un `.env` (un hook bloque la lecture). Renvoyer vers `server/.env.example`.
7. **Debug** : reformuler le symptôme, lister les causes probables avec un niveau de confiance, vérifier avant de corriger.

## TypeScript

- Pas de `any` ni de cast `as` pour faire taire le compilateur : typer correctement ou valider à l'exécution.
- Types de retour explicites sur les fonctions exportées.
- Unions de littéraux plutôt qu'`enum`.
