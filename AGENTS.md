# AGENTS.md

Instructions pour les agents IA (Claude Code, Codex…) qui travaillent sur ce dépôt.

Contexte, stack, commandes et conventions : lire d'abord ces fichiers, ils ne sont pas répétés ici.

- @README.md
- @ARCHITECTURE.md
- @CONTRIBUTING.md

## Points d'attention

- **Objectif pédagogique** : la conteneurisation (Docker, Compose), pas la complexité applicative. Le code doit rester compréhensible et explicable par son auteur : préférer la solution simple et lisible à la solution astucieuse.
- **Prisma reste en v6** : ne pas proposer de montée de version (MongoDB non supporté en 7+).
- **Commits atomiques**, au fil de l'eau, chacun passant `pnpm check` et `pnpm typecheck`.

## Docs de travail

Specs, plans et notes produits avec l'IA sont versionnés, nommés `YYYY-MM-DD-<sujet>.md` :

- `docs/superpowers/specs/` : conception validée avant d'implémenter ;
- `docs/superpowers/plans/` : plan d'implémentation découpé en étapes.

Ils servent de trace des décisions et de l'usage de l'IA pour l'analyse réflexive du brief. Un doc est daté du jour de sa création et n'est pas réécrit après coup : une décision qui change donne un nouveau doc.

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
