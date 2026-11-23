# Contribuer

## Git flow

- `main` : version livrée. `develop` : branche d'intégration et branche par défaut.
- Les deux sont protégées : **pas de push direct**, tout passe par une Pull Request.
- Parcours d'une modification :
  1. (optionnel) une issue décrit le besoin ;
  2. une branche `<type>/<sujet-court>` part de `develop` (ex. `feat/upload-photo`, `build/compose`) ;
  3. commits atomiques ;
  4. PR vers `develop`, ouverte en **draft** tant qu'elle n'est pas prête ; le corps se termine par `Closes #N` si une issue existe ;
  5. merge, puis suppression de la branche.
- Livraison : PR `develop` → `main`.

## Commits

Format [Conventional Commits](https://www.conventionalcommits.org/fr/), **en anglais** :

```
<type>(<scope>): <description à l'impératif, minuscule, sans point final>

<corps optionnel : pourquoi, pas comment>
```

| Type       | Usage                                                          |
| ---------- | -------------------------------------------------------------- |
| `feat`     | nouvelle fonctionnalité                                        |
| `fix`      | correction de bug                                              |
| `refactor` | restructuration sans changement de comportement                |
| `build`    | Dockerfile, Compose, dépendances, scripts npm, config de build |
| `ci`       | workflows GitHub Actions                                       |
| `test`     | ajout ou correction de tests                                   |
| `docs`     | documentation uniquement                                       |
| `style`    | formatage uniquement (aucun changement de sens)                |
| `chore`    | autre maintenance (config d'outils, gitignore…)                |
| `revert`   | annulation d'un commit                                         |

**Scope** : le package (`client`, `server`) ou le sujet (`compose`, `db`, `claude`…). L'omettre pour un changement transverse.

**Atomicité** : un commit = une préoccupation, et chaque commit passe `pnpm check` et `pnpm typecheck`. Deux changements indépendants demandés en même temps font deux commits.

## Pull Requests

- Titre au format d'un commit.
- Le corps explique **pourquoi** et **comment vérifier**. Les détails déjà dans une issue ou un doc sont liés, pas recopiés.
- Indiquer ce qui a **réellement** été lancé (commandes, tests manuels) : un badge CI vert ne dit pas ce qui a été testé.

## Hooks Git

Installés automatiquement par `pnpm install` ([lefthook](https://lefthook.dev), voir `lefthook.yml`) :

- **pre-commit** : `biome check` sur les fichiers indexés (vérifie sans corriger : lancer `pnpm check:fix`).
- **commit-msg** : [commitlint](https://commitlint.js.org) refuse un message hors Conventional Commits.

## Avant de pousser

```bash
pnpm check
pnpm typecheck
pnpm build
```
