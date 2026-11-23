---
plan: auth-sessions
status: done
spec: docs/superpowers/specs/2026-11-23-auth-sessions-design.md
branch: feat/auth-accounts (PR A), feat/auth-sessions (PR B), feat/auth-guard (PR C), feat/client-login (PR D)
worktree: false
tasks_total: 13
tasks_done: 13
current_task: —
last_commit: 4a39ac0
last_updated: 2026-11-24
---

# Accounts and Sessions (Step 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Working agreement (mandatory):** keep this plan in sync with reality. Check a step only when it is finished and its gate is green. Append every divergence to the Drift Log. Update the frontmatter (`tasks_done`, `current_task`, `last_commit`, `last_updated`) at each task boundary. When a drift produces a durable correction (path, command, signature, decision), amend the affected task block in place and log the amendment: implementers only receive their own task block. Never check a partial step; never delete a finished step or a drift entry. Under subagent-driven development, `.superpowers/sdd/progress.md` is the runtime authority; the frontmatter mirrors it.

**Goal:** Nobody uses FamilyFrame without an account: email + password login, a 90-day sliding session in an `httpOnly` cookie, every photo route and the Socket.IO connection behind it, and a client login page.

**Architecture:** Home-made server sessions stored with Prisma (MongoDB): a random 32-byte token goes to the client in the `ff_session` cookie, the database keeps only its SHA-256. A new `server/src/features/auth/` feature follows the photos pattern (repository → service built by a factory with injected deps → controller → routes), plus an Express middleware (`requireAuth`) and a Socket.IO middleware sharing one `readSessionToken` helper. The client gets an `AuthProvider` (React context), a `RequireAuth` route wrapper and a `/login` page. Four PRs in a `gh stack`.

**Tech Stack:** Node 24, TypeScript 7 (`nodenext`, `strict`, `verbatimModuleSyntax`), Express 5, Socket.IO 4, Prisma 6 (MongoDB), argon2 0.45, Vitest 5, Biome 2, Bruno CLI 4.2.0, React 19 + react-router 7 + shadcn/ui, `gh stack`.

## Global Constraints

- **One new dependency only:** `argon2` in `server` `dependencies`. No `cookie-parser`, nothing else on the server or the client. Prisma stays on v6.
- **Cookie:** name `ff_session`, `httpOnly`, `SameSite=Lax`, `Secure` when `NODE_ENV=production`, `path=/`; session duration 90 days; an authenticated HTTP request renews it when less than 45 days remain.
- **Token:** 32 bytes from `crypto.randomBytes`, hex in the cookie, SHA-256 hex in `Session.tokenHash`.
- **Error codes (exact):** `UNAUTHENTICATED` 401, `INVALID_CREDENTIALS` 401, `BODY_INVALID` 400. Unknown email and wrong password give the same `401 INVALID_CREDENTIALS` body.
- **Public user DTO (exact):** `{ id, email, displayName, role }`, `role` in `'member' | 'admin'`. Never the password hash.
- **Socket.IO:** a rejected handshake uses `Error('UNAUTHENTICATED')`; each socket joins room `user:<id>`; broadcasting stays global (`io.emit`).
- **Log events (exact):** `auth.login_succeeded` (info, `userId`), `auth.login_failed` (warn, no data), `auth.logged_out` (info, `userId`), `seed.done` (info, `users` count), `seed.refused` (error, no data). `socket.connected` / `socket.disconnected` gain `userId`. Never log an email, a password, a token, a hash or an environment value (`.claude/rules/08-domain-specific-rules/8-security-logging.md`).
- **Seed accounts (dev only, exact):** `admin@familyframe.test` / `admin-familyframe-dev` (role `admin`, display name `Admin`); `membre@familyframe.test` / `membre-familyframe-dev` (role `member`, display name `Membre`). Written only in `server/prisma/seed.ts`, `README.md` and (member only) `server/bruno/environments/Local.bru`.
- **No `vi.mock`:** fakes are `vi.fn()` passed through the factory. Vitest imports are explicit (`import { describe, expect, it, vi } from 'vitest'`).
- **TypeScript (AGENTS.md):** no `as` casts, explicit return types on exported functions, literal unions rather than TS `enum` (the Prisma `enum Role` is a schema enum; Prisma generates a string union).
- **Code rules (`.claude/rules/`):** comment why, never what; no file-summary comments; name callback params after the item; no magic numbers in `src` code (test inputs may be literal); max 30 lines per function, 300 per file; no flag parameters; booleans prefixed `is`/`has`/`should`.
- Server imports use the `.js` extension (`nodenext`); client imports use the `@/` alias and the `.ts`/`.tsx` extension, like the existing files.
- **Language:** code, comments, logs and commits in English; UI text, Bruno `docs` blocks, README and ARCHITECTURE in French (CONTRIBUTING.md).
- **Gates:** every commit passes `pnpm check` and `pnpm typecheck`. Every task ends green on `pnpm test`, `pnpm build` and (server tasks) `pnpm test:bruno` against the running API (`pnpm dev` in another terminal; `tsx watch` reloads on save, wait ~3 s).
- **API change → Bruno in the same commit; business rule change → its colocated `*.test.ts` in the same commit.**
- **Commits:** Conventional Commits in English, written to a file and passed with `git commit -F <file>` (never inline: a hook blocks commands that contain a reader word and `.env`). End each message with the session's attribution lines. A failing hook means no commit: fix (`pnpm check:fix`) and commit again.
- **Never read or print a `.env` file.**
- **Stack:** the controller creates branches with `gh stack`; implementers never switch branches, push or run `gh stack`. Never `gh pr merge` (the author merges the whole stack).

## Choices made while planning (not in the spec, or resolving a conflict with the code rules)

- **Two service methods instead of `authenticate(token, { slide })`.** The code rules forbid flag parameters: `authenticate(token)` (no sliding, used by Socket.IO) and `authenticateAndSlide(token)` (used by `requireAuth`). Same behavior as the spec.
- **`isRenewed` instead of `renewed`:** booleans are prefixed `is` (naming rule).
- **Cookie `expires: expiresAt` instead of `maxAge`.** Same 90 days, but the cookie and the session end at the same instant, also after a renewal.
- **`DUMMY_PASSWORD_HASH` lives in `lib/password.ts`**, next to the only `argon2` import, and is tested there against the real library: a malformed dummy hash would make `argon2.verify` throw, turning an unknown email into a 500 (an enumeration leak). The value is a real argon2id hash (library defaults `m=65536,t=3,p=4`, same cost as a stored hash) of a throwaway password, generated while planning.
- **`login_failed` is logged only for a credential mismatch** (unknown email or wrong password), not for a malformed request (missing or non-string fields): `http.request` already logs that 401.
- **Wiring:** `app.ts` exports `assembleAuthService()`; `createApp(io, authService)` receives it, because `server.ts` hands the same instance to the Socket.IO middleware (PR C).
- **`uploaderName` transition (PR C):** the controller passes `currentUser(req).displayName`; `NewPhotoInput.uploaderName` becomes `string`; `parseUploaderName` and `MAX_UPLOADER_NAME_LENGTH` are removed with their tests (the value comes from the database, not from the request), and so is the now unreachable `UPLOADER_NAME_INVALID` code (server types, status map, client copy and message, ARCHITECTURE). Bruno `create/03` and `create/04` are deleted (gaps in the numbering are kept: renaming files is churn). `create/09` (malformed JSON on the photos route) still reaches the route with the cookie, but now answers `400 PHOTO_MISSING` instead of `UPLOADER_NAME_INVALID`. `create/05` keeps one text field (`legende`) so its multipart body is not empty.
- **Client error codes are synced in the same commit as the server types** (PR B adds the 3 codes and their French messages to `client/src/api.ts`; PR C removes `UPLOADER_NAME_INVALID`): both files say "keep both in sync". The spec listed the messages under PR D.
- **The seed is typechecked:** `server/tsconfig.json` includes `prisma/` and loses `rootDir`/`outDir`, which move to `server/tsconfig.build.json` (the build output stays `dist/server.js`). Otherwise `pnpm typecheck` would silently skip `seed.ts`.
- **Socket.IO types:** `server/src/lib/socket-types.ts` declares `SocketData = { userId: string }` and the `SocketServer` / `SocketMiddleware` aliases, so `socket.data.userId` is typed (it is `any` by default).
- **Socket.IO auth failures that are not an `AppError`** (database down) are logged as `server.error` and rejected with `SERVER_ERROR`. The client reacts only to `UNAUTHENTICATED`. Known limitation, accepted: Socket.IO does not retry a handshake refused by a middleware, so during a database outage the frame loses live updates until it reloads.
- **`config.isProduction`** (`NODE_ENV === 'production'`) is added to `config.ts` for the cookie's `Secure` flag. The seed reads `process.env.NODE_ENV` itself: it must not require the Cloudinary variables.
- **Out of scope, noted:** other body-parser errors on `/api/auth` (body too large, bad charset) stay 500; CORS is unchanged (no `credentials`: the browser goes through the same-origin Vite proxy).

### Verified tool behavior (Bruno CLI 4.2.0, argon2 0.45.2)

Checked in the sources of `@usebruno/cli@4.2.0` (pnpm dlx cache) and by running argon2 while planning:

- **Cookie jar:** the CLI keeps a cookie jar **on by default**: it saves every `Set-Cookie` and, after the pre-request script, merges the jar into the `Cookie` header (jar values win; `runner/run-single-request.js`). A "without cookie" request would still send the session. So `test:bruno` gains `--disable-cookies` (an existing CLI option), and the session travels only through the `sessionCookie` runtime variable.
- **Collection header:** `collection.bru` accepts a `headers { }` block; collection, folder and request headers are merged in that order (`mergeHeaders` in `utils/collection.js`). Before the first login, `{{sessionCookie}}` stays unresolved and is sent as literal text: the server finds no `ff_session=` in it and treats the request as anonymous.
- **Removing the header for one request:** `req.deleteHeader('Cookie')` in `script:pre-request` (`@usebruno/js` `bruno-request.js`); the merged headers are already on `req` when the script runs.
- **Reading `Set-Cookie`:** `res.getHeader('set-cookie')` (lowercases the name) returns axios' value, an array of strings on Node. The scripts wrap it in `[].concat(...)` so a single string would work too.
- **Run order with `run . -r`:** in each directory, sub-folders run before requests; folders are sorted by `sortByNameThenSequence` (`@usebruno/common` 0.26.0): folders without `seq` alphabetically, then each folder with `meta { seq: N }` (from its `folder.bru`) inserted at position N. `auth/folder.bru` gets `seq: 1`, so `auth/` runs before `health/`, `not-found/` and `photos/`. Inside `auth/`: `login` seq 1, `me` seq 2, `logout` seq 3.
- **argon2 install script:** argon2 0.45.2 declares `install: node-gyp-build`, but the package ships prebuilt binaries (`prebuilds/`: win32-x64, linux-x64 glibc and musl, linux-arm64 glibc and musl, linux-arm, darwin-arm64) that `node-gyp-build` loads at runtime. Verified on this Windows machine: `npm install argon2@0.45.2 --ignore-scripts`, then `hash`/`verify` and an ESM named import (`import { hash, verify } from 'argon2'`) work. The build script is **not** needed: it goes to `ignoredBuiltDependencies` (records the decision, silences pnpm's "ignored build scripts" warning), not to `onlyBuiltDependencies`. The future Docker image (`node:24-alpine`, x64 or arm64) uses the musl prebuilds; like sharp, argon2 must be installed inside the image, never copied from the Windows `node_modules`.

## File Map

| File | Task | Responsibility |
| --- | --- | --- |
| `server/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` | 1, 2, 6 | `argon2`, `db:seed` script, `--disable-cookies` |
| `server/src/lib/password.ts` (+ `.test.ts`) | 1 | argon2 hash/verify, dummy hash |
| `server/prisma/schema.prisma` | 2 | `Role`, `User`, `Session` |
| `server/prisma/seed.ts` | 2 | dev seed |
| `server/tsconfig.json`, `server/tsconfig.build.json` | 2 | typecheck `prisma/`, build only `src/` |
| `package.json` (root) | 2 | `db:seed` |
| `README.md` | 2, 13 | seed, test accounts; login page |
| `server/src/lib/session-token.ts` (+ `.test.ts`) | 3 | token, hash, cookie reading |
| `server/src/types.ts`, `client/src/api.ts` | 4, 8 | error codes, `PublicUser` |
| `server/src/errors/error-handler.ts` (+ `.test.ts`) | 4, 8 | statuses, `BODY_INVALID` |
| `server/src/features/auth/auth.repository.ts` | 5 | Prisma access for users and sessions |
| `server/src/features/auth/auth.service.ts` (+ `.test.ts`) | 5 | login, logout, authenticate rules |
| `server/src/features/auth/auth.cookie.ts` | 6 | set and clear `ff_session` |
| `server/src/features/auth/auth.middleware.ts` | 6 | `requireAuth`, `req.user` typing, `currentUser` |
| `server/src/features/auth/auth.controller.ts`, `auth.routes.ts` | 6 | `/api/auth/login`, `/logout`, `/me` |
| `server/src/config.ts`, `server/src/app.ts`, `server/src/server.ts` | 6, 7, 9 | wiring |
| `server/bruno/collection.bru`, `environments/Local.bru`, `auth/**` | 6 | auth requests, session cookie |
| `server/bruno/photos/**` | 7, 8 | cookie, 401, no pseudo |
| `server/src/features/photos/*` | 8, 9 | `uploaderName` from the user; socket types |
| `server/src/lib/socket-types.ts`, `server/src/features/auth/auth.socket.ts` | 9 | Socket.IO auth and rooms |
| `ARCHITECTURE.md` | 10, 13 | Authentification section, API, errors, logs; pages |
| `client/src/auth/*` | 11 | user type, API calls, context, provider, route guard |
| `client/src/pages/LoginPage.tsx`, `client/src/components/auth/LoginForm.tsx` | 11 | login page |
| `client/src/App.tsx` | 11 | routes |
| `client/src/components/auth/LogoutButton.tsx`, `client/src/pages/UploadPage.tsx`, `client/src/hooks/usePhotoFeed.ts` | 12 | logout, no pseudo, 401 handling |

## Stack and branches (controller only)

- **PR A `feat/auth-accounts`**: already created with `gh stack init`; holds both specs (commit `b61e9ad`) and this plan. Tasks 1-2.
- **Before Task 3:** `gh stack add feat/auth-sessions` (PR B). Tasks 3-6.
- **Before Task 7:** `gh stack add feat/auth-guard` (PR C). Tasks 7-10.
- **Before Task 11:** `gh stack add feat/client-login` (PR D). Tasks 11-13.
- After the final review: `gh stack submit --auto` (draft PRs), then `gh stack view --json`.
- **Database:** Task 2 runs `pnpm db:push` and `pnpm db:seed` against the author's dev MongoDB. The seed **deletes every photo, session and user** (spec decision: only dev data exists; Cloudinary images stay, unreferenced). Every later task assumes the seeded accounts exist.

---

## PR A — `feat/auth-accounts`

### Task 1: Password hashing with argon2 (PR A, `feat/auth-accounts`)

**Files:**
- Modify: `server/package.json` (via `pnpm add`), `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- Create: `server/src/lib/password.ts`
- Test: `server/src/lib/password.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (used by Tasks 2, 5, 6):
  ```ts
  // server/src/lib/password.ts
  export const DUMMY_PASSWORD_HASH: string
  export function hashPassword(plain: string): Promise<string>
  export function verifyPassword(hash: string, plain: string): Promise<boolean>
  ```

- [x] **Step 1: Add the dependency**

Run from the repo root: `pnpm --filter server add argon2@^0.45.2`
Expected: `server/package.json` `dependencies` gains `"argon2": "^0.45.2"`; pnpm prints a warning that the build script of `argon2` was ignored.

- [x] **Step 2: Record that the build script is not needed**

In `pnpm-workspace.yaml`, append after the `onlyBuiltDependencies` list:

```yaml

# Ships prebuilt binaries (Windows, Linux glibc/musl, x64/arm64) loaded at runtime:
# its node-gyp build script would only matter on a platform without one.
ignoredBuiltDependencies:
  - argon2
```

Run: `pnpm install`
Expected: no "ignored build scripts" warning for argon2.

Run: `pnpm --filter server exec node --input-type=module -e "import { hash, verify } from 'argon2'; console.log(await verify(await hash('x'), 'x'))"`
Expected: `true`. If it fails with "No native build was found", move `argon2` from `ignoredBuiltDependencies` to `onlyBuiltDependencies`, run `pnpm install` again, and log it in the Drift Log.

- [x] **Step 3: Write the failing tests**

Create `server/src/lib/password.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from './password.js'

describe('hashPassword', () => {
  it('returns an argon2id hash that does not contain the password', async () => {
    const hash = await hashPassword('correct horse')

    expect(hash).toMatch(/^\$argon2id\$/)
    expect(hash).not.toContain('correct horse')
  })
})

describe('verifyPassword', () => {
  it('accepts the password the hash was made from', async () => {
    const hash = await hashPassword('correct horse')

    await expect(verifyPassword(hash, 'correct horse')).resolves.toBe(true)
  })

  it('rejects any other password', async () => {
    const hash = await hashPassword('correct horse')

    await expect(verifyPassword(hash, 'wrong horse')).resolves.toBe(false)
  })

  it('verifies against the dummy hash without throwing, and never matches', async () => {
    await expect(verifyPassword(DUMMY_PASSWORD_HASH, 'membre-familyframe-dev')).resolves.toBe(false)
  })
})
```

- [x] **Step 4: Run them to verify they fail**

Run: `pnpm test`
Expected: FAIL, `password.test.ts` cannot resolve `./password.js`.

- [x] **Step 5: Implement**

Create `server/src/lib/password.ts`:

```ts
import { hash, verify } from 'argon2'

// A real argon2id hash of a throwaway password, with the library's default cost.
// Verifying an unknown email against it takes as long as a wrong password,
// so the response time does not reveal which emails have an account.
export const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$wYRFTMP7p6eRiPbuxiTclg$SxPvQxVB40xXdRjyDhUQuMQEIO5FzMQM6pkWRuvWjl4'

// argon2id with the library defaults: the current OWASP recommendation.
export function hashPassword(plain: string): Promise<string> {
  return hash(plain)
}

export function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  return verify(passwordHash, plain)
}
```

- [x] **Step 6: Run the tests and the gates**

Run: `pnpm test`
Expected: PASS, `Tests  43 passed (43)` (39 before + 4).

Run: `pnpm check && pnpm typecheck && pnpm build`
Expected: all green.

- [x] **Step 7: Commit**

```bash
git add server/package.json pnpm-lock.yaml pnpm-workspace.yaml server/src/lib/password.ts server/src/lib/password.test.ts
git commit -F <message-file>
```

Message: `feat(server): hash passwords with argon2` + attribution lines. Body: one line saying argon2 loads its prebuilt binary, so its build script stays blocked.

---

### Task 2: Accounts schema, seed and README (PR A, `feat/auth-accounts`)

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/seed.ts`
- Modify: `server/package.json` (script `db:seed`), `package.json` (root script `db:seed`)
- Modify: `server/tsconfig.json`, `server/tsconfig.build.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: `hashPassword` (Task 1), `prisma` (`server/src/lib/db.ts`), `logger` (`server/src/lib/logger.ts`).
- Produces: Prisma models `User` (`id`, `email`, `displayName`, `passwordHash`, `role: Role`, `createdAt`, `sessions`) and `Session` (`id`, `tokenHash`, `userId`, `user`, `expiresAt`, `createdAt`); Prisma type `Role = 'member' | 'admin'`; `pnpm db:seed`; the two seeded accounts of the Global Constraints.

- [x] **Step 1: Add the models**

In `server/prisma/schema.prisma`, after the `datasource` block and before `model Photo`, add:

```prisma
enum Role {
  member
  admin
}

model User {
  id           String    @id @default(auto()) @map("_id") @db.ObjectId
  email        String    @unique
  displayName  String
  passwordHash String
  role         Role      @default(member)
  createdAt    DateTime  @default(now())
  sessions     Session[]
}

model Session {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  tokenHash String   @unique
  userId    String   @db.ObjectId
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}
```

`model Photo` is unchanged.

Run: `pnpm --filter server db:generate`
Expected: `Generated Prisma Client`.

- [x] **Step 2: Typecheck `prisma/` too**

Replace `server/tsconfig.json` with (only `rootDir`/`outDir` removed and `prisma` added to `include`):

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023"],
    "types": ["node"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "strict": true,
    "skipLibCheck": true,
    "sourceMap": true,

    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "prisma"]
}
```

Replace `server/tsconfig.build.json` with:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.ts"]
}
```

Run: `pnpm typecheck && pnpm build && ls server/dist/server.js`
Expected: green, and `server/dist/server.js` exists (the build layout did not change).

- [x] **Step 3: Write the seed**

Create `server/prisma/seed.ts`:

```ts
import type { Role } from '@prisma/client'
import { prisma } from '../src/lib/db.js'
import { logger } from '../src/lib/logger.js'
import { hashPassword } from '../src/lib/password.js'

type SeedUser = { email: string; displayName: string; role: Role; password: string }

// Development only: these passwords are public (README, Bruno environment).
const SEED_USERS: SeedUser[] = [
  {
    email: 'admin@familyframe.test',
    displayName: 'Admin',
    role: 'admin',
    password: 'admin-familyframe-dev',
  },
  {
    email: 'membre@familyframe.test',
    displayName: 'Membre',
    role: 'member',
    password: 'membre-familyframe-dev',
  },
]

async function seed(): Promise<void> {
  // Sessions first: Prisma emulates the relation on MongoDB and refuses to delete
  // a user that still has sessions.
  await prisma.session.deleteMany()
  await prisma.photo.deleteMany()
  await prisma.user.deleteMany()
  for (const { password, ...user } of SEED_USERS) {
    await prisma.user.create({ data: { ...user, passwordHash: await hashPassword(password) } })
  }
  // The count only: the credentials never reach the logs.
  logger.info('seed.done', { users: SEED_USERS.length })
}

// The seed wipes the database: a production database must never meet it.
if (process.env.NODE_ENV === 'production') {
  logger.error('seed.refused')
  process.exit(1)
}

try {
  await seed()
} finally {
  await prisma.$disconnect()
}
```

- [x] **Step 4: Add the scripts**

In `server/package.json` `scripts`, after `"db:studio"`, add:

```json
    "db:seed": "tsx --env-file-if-exists=.env prisma/seed.ts",
```

In the root `package.json` `scripts`, after `"db:push"`, add:

```json
    "db:seed": "pnpm --filter server db:seed",
```

- [x] **Step 5: Push the schema and run the seed**

Run: `pnpm db:push`
Expected: `Your database indexes are now in sync with your Prisma schema` (new collections `User`, `Session`, unique indexes on `email` and `tokenHash`).

Run: `pnpm db:seed`
Expected: one `seed.done` line with `users=2` (pretty format) and no email or password anywhere in the output. Exit code 0.

Run (Git Bash): `NODE_ENV=production pnpm db:seed; echo "exit=$?"`
Expected: one `seed.refused` line (level error), then `exit=1` (pnpm may print its own failure line too).

Optional check with `pnpm db:studio`: two users, `passwordHash` starting with `$argon2id$`, no photos, no sessions.

- [x] **Step 6: Document in the README**

In `README.md`, section `## Démarrage (local, sans Docker)`, replace the code block with:

```bash
pnpm install                         # installe tout le workspace + génère le client Prisma
cp server/.env.example server/.env   # puis renseigner DATABASE_URL et les 3 variables Cloudinary
pnpm db:push                         # crée les collections et les index dans MongoDB
pnpm db:seed                         # vide la base et crée les deux comptes de test
pnpm dev                             # lance client et serveur en parallèle
```

Right after the code block, add:

```markdown
Comptes de test créés par `pnpm db:seed` (**développement uniquement**, mots de passe publics) :

| Rôle   | E-mail                    | Mot de passe             |
| ------ | ------------------------- | ------------------------ |
| admin  | `admin@familyframe.test`  | `admin-familyframe-dev`  |
| membre | `membre@familyframe.test` | `membre-familyframe-dev` |

Le seed efface toutes les photos, sessions et comptes avant de recréer ces deux comptes (les images restent sur Cloudinary, sans référence). Il refuse de tourner avec `NODE_ENV=production`.
```

In the `### Scripts racine` table, after the `pnpm db:push` row, add:

```markdown
| `pnpm db:seed`                  | vide la base et crée les comptes de test (refusé en production) |
```

Run: `pnpm check`
Expected: green (Biome formats Markdown tables? It does not check `.md` content beyond the staged-file hook: if the pre-commit hook rejects `README.md`, run `pnpm exec biome format --write README.md`).

- [x] **Step 7: Run the gates and commit (two commits)**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  43 passed (43)`.

Run: `pnpm test:bruno` (API running)
Expected: 15 requests, all pass (the photos routes are not guarded yet; the seed emptied the photo list, `create/01` adds one).

```bash
git add server/prisma/schema.prisma server/prisma/seed.ts server/package.json package.json server/tsconfig.json server/tsconfig.build.json
git commit -F <message-file>
```

Message: `feat(db): add accounts and seed two dev users` + attribution lines. Body: one line saying the seed wipes the dev database and refuses to run in production.

```bash
git add README.md
git commit -F <message-file>
```

Message: `docs: document the seed and the test accounts` + attribution lines.

---

## PR B — `feat/auth-sessions`

> **Controller:** before Task 3, run `gh stack add feat/auth-sessions`.

### Task 3: Session token helpers (PR B, `feat/auth-sessions`)

**Files:**
- Create: `server/src/lib/session-token.ts`
- Test: `server/src/lib/session-token.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (used by Tasks 5, 6, 9):
  ```ts
  // server/src/lib/session-token.ts
  export const SESSION_COOKIE = 'ff_session'
  export function generateToken(): string            // 64 hex characters
  export function hashToken(token: string): string    // SHA-256, 64 hex characters
  export function readSessionToken(cookieHeader: string | undefined): string | null
  ```

- [x] **Step 1: Write the failing tests**

Create `server/src/lib/session-token.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { generateToken, hashToken, readSessionToken } from './session-token.js'

const HEX_64 = /^[0-9a-f]{64}$/

describe('readSessionToken', () => {
  it('returns null without a Cookie header', () => {
    expect(readSessionToken(undefined)).toBeNull()
  })

  it('returns null when only other cookies are sent', () => {
    expect(readSessionToken('theme=dark; lang=fr')).toBeNull()
  })

  it('finds the session cookie among others', () => {
    expect(readSessionToken('theme=dark; ff_session=abc123; lang=fr')).toBe('abc123')
  })

  it('returns null for an empty session cookie', () => {
    expect(readSessionToken('theme=dark; ff_session=')).toBeNull()
  })

  it('ignores a cookie whose name only ends like ours', () => {
    expect(readSessionToken('old_ff_session=abc123')).toBeNull()
  })
})

describe('hashToken', () => {
  it('is stable and 64 hex characters long', () => {
    expect(hashToken('abc123')).toMatch(HEX_64)
    expect(hashToken('abc123')).toBe(hashToken('abc123'))
  })

  it('differs from one token to another', () => {
    expect(hashToken('abc123')).not.toBe(hashToken('abc124'))
  })
})

describe('generateToken', () => {
  it('returns 64 hex characters, different each time', () => {
    const token = generateToken()

    expect(token).toMatch(HEX_64)
    expect(generateToken()).not.toBe(token)
  })
})
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm test`
Expected: FAIL, `session-token.test.ts` cannot resolve `./session-token.js`.

- [x] **Step 3: Implement**

Create `server/src/lib/session-token.ts`:

```ts
import { createHash, randomBytes } from 'node:crypto'

export const SESSION_COOKIE = 'ff_session'
// 256 bits: unguessable, so the cookie needs no signature.
const TOKEN_BYTES = 32

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex')
}

// The database stores only this: a leaked database opens no session.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// Express and Socket.IO both get the raw Cookie header: one parser serves both,
// without cookie-parser.
export function readSessionToken(cookieHeader: string | undefined): string | null {
  if (cookieHeader === undefined) {
    return null
  }
  const prefix = `${SESSION_COOKIE}=`
  const sessionPair = cookieHeader
    .split(';')
    .map((pair) => pair.trim())
    .find((pair) => pair.startsWith(prefix))
  const token = sessionPair?.slice(prefix.length)
  return token ? token : null
}
```

- [x] **Step 4: Run the tests and the gates**

Run: `pnpm test`
Expected: PASS, `Tests  51 passed (51)`.

Run: `pnpm check && pnpm typecheck && pnpm build`
Expected: all green.

- [x] **Step 5: Commit**

```bash
git add server/src/lib/session-token.ts server/src/lib/session-token.test.ts
git commit -F <message-file>
```

Message: `feat(server): add the session token helpers` + attribution lines.

---

### Task 4: Auth error codes and the public user type (PR B, `feat/auth-sessions`)

**Files:**
- Modify: `server/src/types.ts`
- Modify: `server/src/errors/error-handler.ts`
- Test: `server/src/errors/error-handler.test.ts`
- Modify: `client/src/api.ts` (the copy of the codes and the messages)

**Interfaces:**
- Consumes: nothing.
- Produces (used by Tasks 5, 6, 9, 11):
  ```ts
  // server/src/types.ts
  export type ApiErrorCode = ... | 'BODY_INVALID' | 'UNAUTHENTICATED' | 'INVALID_CREDENTIALS' | ...
  export type UserRole = 'member' | 'admin'
  export type PublicUser = { id: string; email: string; displayName: string; role: UserRole }
  ```
  `toErrorResponse` maps `BODY_INVALID` → 400, `UNAUTHENTICATED` → 401, `INVALID_CREDENTIALS` → 401, and any error with `type === 'entity.parse.failed'` (body-parser's JSON syntax error) → `BODY_INVALID`.

- [x] **Step 1: Write the failing tests**

In `server/src/errors/error-handler.test.ts`, add inside `describe('toErrorResponse', ...)`, after the `maps any other Multer error to UPLOAD_INVALID` test:

```ts
  it('maps a malformed JSON body to BODY_INVALID', () => {
    const parseError = Object.assign(new SyntaxError('Unexpected end of JSON input'), {
      type: 'entity.parse.failed',
    })

    expect(toErrorResponse(parseError)).toEqual({ status: 400, body: { error: 'BODY_INVALID' } })
  })

  it('answers a request without a valid session with 401', () => {
    expect(toErrorResponse(new AppError('UNAUTHENTICATED'))).toEqual({
      status: 401,
      body: { error: 'UNAUTHENTICATED' },
    })
  })

  it('answers wrong credentials with 401', () => {
    expect(toErrorResponse(new AppError('INVALID_CREDENTIALS'))).toEqual({
      status: 401,
      body: { error: 'INVALID_CREDENTIALS' },
    })
  })
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm typecheck`
Expected: FAIL, `'UNAUTHENTICATED'` and `'INVALID_CREDENTIALS'` are not assignable to `ApiErrorCode`.

- [x] **Step 3: Add the codes and the user type**

In `server/src/types.ts`, replace the `ApiErrorCode` union with:

```ts
export type ApiErrorCode =
  | 'UPLOADER_NAME_INVALID'
  | 'PHOTO_MISSING'
  | 'UPLOAD_INVALID'
  | 'BODY_INVALID'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'ROUTE_NOT_FOUND'
  | 'PHOTO_NOT_FOUND'
  | 'PHOTO_TOO_LARGE'
  | 'FORMAT_UNSUPPORTED'
  | 'IMAGE_UNREADABLE'
  | 'SERVER_ERROR'
```

After `export type ApiError = { error: ApiErrorCode }`, add:

```ts
export type UserRole = 'member' | 'admin'

// What the API says about a user: never the password hash.
export type PublicUser = {
  id: string
  email: string
  displayName: string
  role: UserRole
}
```

- [x] **Step 4: Map them in the error handler**

In `server/src/errors/error-handler.ts`, replace `HTTP_STATUS_BY_CODE` with:

```ts
const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UPLOADER_NAME_INVALID: 400,
  PHOTO_MISSING: 400,
  UPLOAD_INVALID: 400,
  BODY_INVALID: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  ROUTE_NOT_FOUND: 404,
  PHOTO_NOT_FOUND: 404,
  PHOTO_TOO_LARGE: 413,
  FORMAT_UNSUPPORTED: 415,
  IMAGE_UNREADABLE: 422,
  SERVER_ERROR: 500,
}
```

Add above `toErrorCode`:

```ts
// body-parser tags its JSON syntax errors with this type; express.json() runs on the auth routes.
function isMalformedJson(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  )
}
```

In `toErrorCode`, before the final `return 'SERVER_ERROR'`, add:

```ts
  if (isMalformedJson(error)) {
    return 'BODY_INVALID'
  }
```

- [x] **Step 5: Keep the client copy in sync**

In `client/src/api.ts`, replace the `ApiErrorCode` union with the exact same union as in Step 3, and replace `ERROR_MESSAGES` with:

```ts
const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  UPLOADER_NAME_INVALID: 'Indiquez un pseudo (30 caractères maximum).',
  PHOTO_MISSING: 'Prenez ou choisissez une photo.',
  UPLOAD_INVALID: 'Envoi invalide : une seule photo à la fois.',
  BODY_INVALID: 'Requête invalide. Rechargez la page et réessayez.',
  UNAUTHENTICATED: 'Votre session a expiré. Reconnectez-vous.',
  INVALID_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
  ROUTE_NOT_FOUND: "Cette adresse n'existe pas sur le serveur.",
  PHOTO_NOT_FOUND: 'Cette photo a déjà été supprimée.',
  PHOTO_TOO_LARGE: 'La photo est trop lourde (10 Mo maximum).',
  FORMAT_UNSUPPORTED: 'Format non pris en charge : JPEG, PNG ou WebP uniquement.',
  IMAGE_UNREADABLE: "Ce fichier n'est pas une image lisible.",
  SERVER_ERROR: 'Le serveur a rencontré un problème. Réessayez plus tard.',
}
```

- [x] **Step 6: Run the tests and the gates**

Run: `pnpm test`
Expected: PASS, `Tests  54 passed (54)`.

Run: `pnpm check && pnpm typecheck && pnpm build`
Expected: all green.

- [x] **Step 7: Commit**

```bash
git add server/src/types.ts server/src/errors/error-handler.ts server/src/errors/error-handler.test.ts client/src/api.ts
git commit -F <message-file>
```

Message: `feat(server): add the auth error codes and the public user type` + attribution lines.

---

### Task 5: Auth repository and service (PR B, `feat/auth-sessions`)

**Files:**
- Create: `server/src/features/auth/auth.repository.ts`
- Create: `server/src/features/auth/auth.service.ts`
- Test: `server/src/features/auth/auth.service.test.ts`

**Interfaces:**
- Consumes: `AppError` (`server/src/errors/app-error.ts`), `Logger` (`server/src/lib/logger.ts`), `PublicUser` (Task 4), `DUMMY_PASSWORD_HASH` (Task 1), Prisma `User`/`Session` (Task 2).
- Produces (used by Tasks 6, 9):
  ```ts
  // auth.repository.ts
  export type UserRecord = User
  export type SessionWithUser = Session & { user: User }
  export type NewSession = { tokenHash: string; userId: string; expiresAt: Date }
  export type AuthRepository = {
    findUserByEmail: (email: string) => Promise<UserRecord | null>
    findSessionByTokenHash: (tokenHash: string) => Promise<SessionWithUser | null>
    createSession: (session: NewSession) => Promise<void>
    extendSession: (id: string, expiresAt: Date) => Promise<void>
    deleteSession: (id: string) => Promise<void>
    deleteExpiredSessions: (now: Date) => Promise<void>
  }
  export function createAuthRepository(prisma: PrismaClient): AuthRepository

  // auth.service.ts
  export type Credentials = { email: unknown; password: unknown }
  export type LoginResult = { user: PublicUser; token: string; expiresAt: Date }
  export type AuthenticatedSession = { user: PublicUser; expiresAt: Date; isRenewed: boolean }
  export type AuthServiceDeps = {
    repository: AuthRepository
    hashToken: (token: string) => string
    generateToken: () => string
    verifyPassword: (passwordHash: string, plain: string) => Promise<boolean>
    now: () => Date
    logger: Logger
  }
  export type AuthService = {
    login: (credentials: Credentials) => Promise<LoginResult>
    logout: (token: string | null) => Promise<void>
    authenticate: (token: string | null) => Promise<AuthenticatedSession>
    authenticateAndSlide: (token: string | null) => Promise<AuthenticatedSession>
  }
  export function createAuthService(deps: AuthServiceDeps): AuthService
  ```

- [x] **Step 1: Write the repository**

Create `server/src/features/auth/auth.repository.ts`:

```ts
import type { PrismaClient, Session, User } from '@prisma/client'

export type UserRecord = User

export type SessionWithUser = Session & { user: User }

export type NewSession = { tokenHash: string; userId: string; expiresAt: Date }

export type AuthRepository = {
  findUserByEmail: (email: string) => Promise<UserRecord | null>
  findSessionByTokenHash: (tokenHash: string) => Promise<SessionWithUser | null>
  createSession: (session: NewSession) => Promise<void>
  extendSession: (id: string, expiresAt: Date) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  deleteExpiredSessions: (now: Date) => Promise<void>
}

export function createAuthRepository(prisma: PrismaClient): AuthRepository {
  return {
    findUserByEmail: (email) => prisma.user.findUnique({ where: { email } }),
    findSessionByTokenHash: (tokenHash) =>
      prisma.session.findUnique({ where: { tokenHash }, include: { user: true } }),
    createSession: async (session) => {
      await prisma.session.create({ data: session })
    },
    extendSession: async (id, expiresAt) => {
      await prisma.session.update({ where: { id }, data: { expiresAt } })
    },
    // deleteMany, not delete: a session already deleted by a concurrent logout is not an error.
    deleteSession: async (id) => {
      await prisma.session.deleteMany({ where: { id } })
    },
    deleteExpiredSessions: async (now) => {
      await prisma.session.deleteMany({ where: { expiresAt: { lte: now } } })
    },
  }
}
```

Run: `pnpm typecheck`
Expected: green (the repository has no test: it is the only Prisma access, like `photos.repository.ts`).

- [x] **Step 2: Write the failing service tests**

Create `server/src/features/auth/auth.service.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { AuthRepository, SessionWithUser, UserRecord } from './auth.repository.js'
import { type AuthServiceDeps, createAuthService } from './auth.service.js'

const NOW = new Date('2026-11-23T10:00:00Z')
const DAY_MS = 24 * 60 * 60 * 1000
const SESSION_END = new Date(NOW.getTime() + 90 * DAY_MS)
const TOKEN = 'a'.repeat(64)
const TOKEN_HASH = 'b'.repeat(64)
const USER: UserRecord = {
  id: '6b044f9d56a44767c7079b01',
  email: 'membre@familyframe.test',
  displayName: 'Membre',
  passwordHash: '$argon2id$stored-hash',
  role: 'member',
  createdAt: new Date('2026-11-01T10:00:00Z'),
}
const PUBLIC_USER = {
  id: USER.id,
  email: 'membre@familyframe.test',
  displayName: 'Membre',
  role: 'member',
}
const CREDENTIALS = { email: 'membre@familyframe.test', password: 'secret' }

function sessionExpiringIn(remainingMs: number): SessionWithUser {
  return {
    id: '6b044f9d56a44767c7079c01',
    tokenHash: TOKEN_HASH,
    userId: USER.id,
    expiresAt: new Date(NOW.getTime() + remainingMs),
    createdAt: new Date('2026-11-01T10:00:00Z'),
    user: USER,
  }
}

// Every dependency succeeds by default: a known user, the right password, a session
// with 60 days left. Each test breaks only the one it is about.
function makeDeps() {
  return {
    repository: {
      findUserByEmail: vi.fn<AuthRepository['findUserByEmail']>().mockResolvedValue(USER),
      findSessionByTokenHash: vi
        .fn<AuthRepository['findSessionByTokenHash']>()
        .mockResolvedValue(sessionExpiringIn(60 * DAY_MS)),
      createSession: vi.fn<AuthRepository['createSession']>().mockResolvedValue(undefined),
      extendSession: vi.fn<AuthRepository['extendSession']>().mockResolvedValue(undefined),
      deleteSession: vi.fn<AuthRepository['deleteSession']>().mockResolvedValue(undefined),
      deleteExpiredSessions: vi
        .fn<AuthRepository['deleteExpiredSessions']>()
        .mockResolvedValue(undefined),
    },
    hashToken: vi.fn<AuthServiceDeps['hashToken']>().mockReturnValue(TOKEN_HASH),
    generateToken: vi.fn<AuthServiceDeps['generateToken']>().mockReturnValue(TOKEN),
    verifyPassword: vi.fn<AuthServiceDeps['verifyPassword']>().mockResolvedValue(true),
    now: vi.fn<AuthServiceDeps['now']>().mockReturnValue(NOW),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

describe('login', () => {
  it('opens a 90-day session for the normalized email and returns the public user', async () => {
    const deps = makeDeps()

    const result = await createAuthService(deps).login({
      email: '  Membre@FamilyFrame.TEST ',
      password: 'secret',
    })

    expect(result).toEqual({ user: PUBLIC_USER, token: TOKEN, expiresAt: SESSION_END })
    expect(deps.repository.findUserByEmail).toHaveBeenCalledWith('membre@familyframe.test')
    expect(deps.verifyPassword).toHaveBeenCalledWith(USER.passwordHash, 'secret')
    expect(deps.hashToken).toHaveBeenCalledWith(TOKEN)
    expect(deps.repository.createSession).toHaveBeenCalledWith({
      tokenHash: TOKEN_HASH,
      userId: USER.id,
      expiresAt: SESSION_END,
    })
  })

  it('purges the expired sessions at each successful login', async () => {
    const deps = makeDeps()

    await createAuthService(deps).login(CREDENTIALS)

    expect(deps.repository.deleteExpiredSessions).toHaveBeenCalledWith(NOW)
  })

  it('logs the login by user id, never by email', async () => {
    const deps = makeDeps()

    await createAuthService(deps).login(CREDENTIALS)

    expect(deps.logger.info).toHaveBeenCalledWith('auth.login_succeeded', { userId: USER.id })
    expect(JSON.stringify(deps.logger.info.mock.calls)).not.toContain('familyframe.test')
  })

  it('rejects an unknown email after verifying a password all the same', async () => {
    const deps = makeDeps()
    deps.repository.findUserByEmail.mockResolvedValue(null)
    deps.verifyPassword.mockResolvedValue(false)

    await expect(createAuthService(deps).login(CREDENTIALS)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })
    expect(deps.verifyPassword).toHaveBeenCalledTimes(1)
    expect(deps.verifyPassword).toHaveBeenCalledWith(expect.stringMatching(/^\$argon2id\$/), 'secret')
    expect(deps.repository.createSession).not.toHaveBeenCalled()
  })

  it('rejects a wrong password without opening a session', async () => {
    const deps = makeDeps()
    deps.verifyPassword.mockResolvedValue(false)

    await expect(createAuthService(deps).login(CREDENTIALS)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })
    expect(deps.repository.createSession).not.toHaveBeenCalled()
    expect(deps.repository.deleteExpiredSessions).not.toHaveBeenCalled()
  })

  it('logs a failed login without any data', async () => {
    const deps = makeDeps()
    deps.verifyPassword.mockResolvedValue(false)

    await expect(createAuthService(deps).login(CREDENTIALS)).rejects.toThrow()
    expect(deps.logger.warn).toHaveBeenCalledWith('auth.login_failed')
    expect(deps.logger.warn.mock.calls[0]).toHaveLength(1)
  })

  it.each([
    ['a missing email', { password: 'secret' }],
    ['an empty email', { email: '', password: 'secret' }],
    ['an email that is not a string', { email: 42, password: 'secret' }],
    ['a missing password', { email: 'membre@familyframe.test' }],
    ['an empty password', { email: 'membre@familyframe.test', password: '' }],
  ])('rejects %s before looking up the user', async (_label, credentials) => {
    const deps = makeDeps()

    await expect(
      createAuthService(deps).login({ email: undefined, password: undefined, ...credentials }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    expect(deps.repository.findUserByEmail).not.toHaveBeenCalled()
  })
})

describe('logout', () => {
  it('deletes the session of the token and logs the user id', async () => {
    const deps = makeDeps()

    await createAuthService(deps).logout(TOKEN)

    expect(deps.hashToken).toHaveBeenCalledWith(TOKEN)
    expect(deps.repository.deleteSession).toHaveBeenCalledWith('6b044f9d56a44767c7079c01')
    expect(deps.logger.info).toHaveBeenCalledWith('auth.logged_out', { userId: USER.id })
  })

  it('does nothing without a token', async () => {
    const deps = makeDeps()

    await createAuthService(deps).logout(null)

    expect(deps.repository.findSessionByTokenHash).not.toHaveBeenCalled()
  })

  it('does nothing for an unknown token', async () => {
    const deps = makeDeps()
    deps.repository.findSessionByTokenHash.mockResolvedValue(null)

    await createAuthService(deps).logout(TOKEN)

    expect(deps.repository.deleteSession).not.toHaveBeenCalled()
    expect(deps.logger.info).not.toHaveBeenCalled()
  })
})

describe('authenticate', () => {
  it('rejects a missing token without querying the database', async () => {
    const deps = makeDeps()

    await expect(createAuthService(deps).authenticate(null)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
    expect(deps.repository.findSessionByTokenHash).not.toHaveBeenCalled()
  })

  it('rejects an unknown token', async () => {
    const deps = makeDeps()
    deps.repository.findSessionByTokenHash.mockResolvedValue(null)

    await expect(createAuthService(deps).authenticate(TOKEN)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
    expect(deps.repository.findSessionByTokenHash).toHaveBeenCalledWith(TOKEN_HASH)
  })

  it('rejects an expired session and deletes it', async () => {
    const deps = makeDeps()
    deps.repository.findSessionByTokenHash.mockResolvedValue(sessionExpiringIn(-1))

    await expect(createAuthService(deps).authenticate(TOKEN)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
    expect(deps.repository.deleteSession).toHaveBeenCalledWith('6b044f9d56a44767c7079c01')
  })

  it('returns the public user and the session end', async () => {
    const deps = makeDeps()
    const session = sessionExpiringIn(60 * DAY_MS)
    deps.repository.findSessionByTokenHash.mockResolvedValue(session)

    await expect(createAuthService(deps).authenticate(TOKEN)).resolves.toEqual({
      user: PUBLIC_USER,
      expiresAt: session.expiresAt,
      isRenewed: false,
    })
  })

  it('never extends a session, even close to its end', async () => {
    const deps = makeDeps()
    deps.repository.findSessionByTokenHash.mockResolvedValue(sessionExpiringIn(10 * DAY_MS))

    await createAuthService(deps).authenticate(TOKEN)

    expect(deps.repository.extendSession).not.toHaveBeenCalled()
  })
})

describe('authenticateAndSlide', () => {
  it('keeps a session with 45 days or more left as it is', async () => {
    const deps = makeDeps()
    deps.repository.findSessionByTokenHash.mockResolvedValue(sessionExpiringIn(45 * DAY_MS))

    const result = await createAuthService(deps).authenticateAndSlide(TOKEN)

    expect(result.isRenewed).toBe(false)
    expect(deps.repository.extendSession).not.toHaveBeenCalled()
  })

  it('extends a session with less than 45 days left to 90 days from now', async () => {
    const deps = makeDeps()
    deps.repository.findSessionByTokenHash.mockResolvedValue(sessionExpiringIn(44 * DAY_MS))

    const result = await createAuthService(deps).authenticateAndSlide(TOKEN)

    expect(result).toEqual({ user: PUBLIC_USER, expiresAt: SESSION_END, isRenewed: true })
    expect(deps.repository.extendSession).toHaveBeenCalledWith(
      '6b044f9d56a44767c7079c01',
      SESSION_END,
    )
  })

  it('rejects an expired session like authenticate', async () => {
    const deps = makeDeps()
    deps.repository.findSessionByTokenHash.mockResolvedValue(sessionExpiringIn(-1))

    await expect(createAuthService(deps).authenticateAndSlide(TOKEN)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
    expect(deps.repository.extendSession).not.toHaveBeenCalled()
  })
})
```

- [x] **Step 3: Run them to verify they fail**

Run: `pnpm test`
Expected: FAIL, `auth.service.test.ts` cannot resolve `./auth.service.js`.

- [x] **Step 4: Implement the service**

Create `server/src/features/auth/auth.service.ts`:

```ts
import { AppError } from '../../errors/app-error.js'
import type { Logger } from '../../lib/logger.js'
import { DUMMY_PASSWORD_HASH } from '../../lib/password.js'
import type { PublicUser } from '../../types.js'
import type { AuthRepository, SessionWithUser, UserRecord } from './auth.repository.js'

const DAY_MS = 24 * 60 * 60 * 1000
const SESSION_DURATION_MS = 90 * DAY_MS
// Below this, an authenticated request extends the session: a frame in use never logs out,
// with at most one database write every 45 days.
const RENEWAL_THRESHOLD_MS = 45 * DAY_MS

export type Credentials = { email: unknown; password: unknown }

export type LoginResult = { user: PublicUser; token: string; expiresAt: Date }

export type AuthenticatedSession = { user: PublicUser; expiresAt: Date; isRenewed: boolean }

export type AuthServiceDeps = {
  repository: AuthRepository
  hashToken: (token: string) => string
  generateToken: () => string
  verifyPassword: (passwordHash: string, plain: string) => Promise<boolean>
  now: () => Date
  logger: Logger
}

export type AuthService = {
  login: (credentials: Credentials) => Promise<LoginResult>
  logout: (token: string | null) => Promise<void>
  authenticate: (token: string | null) => Promise<AuthenticatedSession>
  authenticateAndSlide: (token: string | null) => Promise<AuthenticatedSession>
}

// The password hash never leaves the service.
function toPublicUser({ id, email, displayName, role }: UserRecord): PublicUser {
  return { id, email, displayName, role }
}

function isFilledString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function sessionEnd({ now }: AuthServiceDeps): Date {
  return new Date(now().getTime() + SESSION_DURATION_MS)
}

async function findUserByCredentials(
  { repository, verifyPassword, logger }: AuthServiceDeps,
  { email, password }: Credentials,
): Promise<UserRecord> {
  if (!isFilledString(email) || !isFilledString(password)) {
    throw new AppError('INVALID_CREDENTIALS')
  }
  const user = await repository.findUserByEmail(email.trim().toLowerCase())
  // Always one verification: an unknown email takes as long as a wrong password.
  const isPasswordValid = await verifyPassword(user?.passwordHash ?? DUMMY_PASSWORD_HASH, password)
  if (!user || !isPasswordValid) {
    // No data: the email is personal, and the same body for both cases avoids account enumeration.
    logger.warn('auth.login_failed')
    throw new AppError('INVALID_CREDENTIALS')
  }
  return user
}

async function findValidSession(
  { repository, hashToken, now }: AuthServiceDeps,
  token: string | null,
): Promise<SessionWithUser> {
  if (token === null) {
    throw new AppError('UNAUTHENTICATED')
  }
  const session = await repository.findSessionByTokenHash(hashToken(token))
  if (!session) {
    throw new AppError('UNAUTHENTICATED')
  }
  // Prisma 6 cannot declare a MongoDB TTL index: an expired session is deleted when read.
  if (session.expiresAt <= now()) {
    await repository.deleteSession(session.id)
    throw new AppError('UNAUTHENTICATED')
  }
  return session
}

async function login(deps: AuthServiceDeps, credentials: Credentials): Promise<LoginResult> {
  const { repository, hashToken, generateToken, now, logger } = deps
  const user = await findUserByCredentials(deps, credentials)
  await repository.deleteExpiredSessions(now())
  const token = generateToken()
  const expiresAt = sessionEnd(deps)
  await repository.createSession({ tokenHash: hashToken(token), userId: user.id, expiresAt })
  logger.info('auth.login_succeeded', { userId: user.id })
  return { user: toPublicUser(user), token, expiresAt }
}

// Idempotent: logging out without a session, or twice, is not an error.
async function logout(
  { repository, hashToken, logger }: AuthServiceDeps,
  token: string | null,
): Promise<void> {
  if (token === null) {
    return
  }
  const session = await repository.findSessionByTokenHash(hashToken(token))
  if (!session) {
    return
  }
  await repository.deleteSession(session.id)
  logger.info('auth.logged_out', { userId: session.userId })
}

async function authenticate(
  deps: AuthServiceDeps,
  token: string | null,
): Promise<AuthenticatedSession> {
  const session = await findValidSession(deps, token)
  return { user: toPublicUser(session.user), expiresAt: session.expiresAt, isRenewed: false }
}

async function authenticateAndSlide(
  deps: AuthServiceDeps,
  token: string | null,
): Promise<AuthenticatedSession> {
  const session = await findValidSession(deps, token)
  const remainingMs = session.expiresAt.getTime() - deps.now().getTime()
  if (remainingMs >= RENEWAL_THRESHOLD_MS) {
    return { user: toPublicUser(session.user), expiresAt: session.expiresAt, isRenewed: false }
  }
  const expiresAt = sessionEnd(deps)
  await deps.repository.extendSession(session.id, expiresAt)
  return { user: toPublicUser(session.user), expiresAt, isRenewed: true }
}

export function createAuthService(deps: AuthServiceDeps): AuthService {
  return {
    login: (credentials) => login(deps, credentials),
    logout: (token) => logout(deps, token),
    authenticate: (token) => authenticate(deps, token),
    authenticateAndSlide: (token) => authenticateAndSlide(deps, token),
  }
}
```

- [x] **Step 5: Run the tests and the gates**

Run: `pnpm test`
Expected: PASS, `Test Files  6 passed (6)`, `Tests  76 passed (76)` (54 + 22).

Run: `pnpm check && pnpm typecheck && pnpm build`
Expected: all green. If `pnpm check` reorders imports, run `pnpm check:fix` and re-run.

- [x] **Step 6: Commit**

```bash
git add server/src/features/auth/auth.repository.ts server/src/features/auth/auth.service.ts server/src/features/auth/auth.service.test.ts
git commit -F <message-file>
```

Message: `feat(server): add the auth service` + attribution lines. Body: one line: login, logout and session checks with a 90-day sliding session; the routes come next.

---

### Task 6: Login, logout and me routes, with their Bruno requests (PR B, `feat/auth-sessions`)

**Files:**
- Create: `server/src/features/auth/auth.cookie.ts`, `auth.middleware.ts`, `auth.controller.ts`, `auth.routes.ts`
- Modify: `server/src/config.ts`, `server/src/app.ts`, `server/src/server.ts`
- Modify: `server/package.json` (`test:bruno` gains `--disable-cookies`)
- Modify: `server/bruno/collection.bru`, `server/bruno/environments/Local.bru`
- Create: `server/bruno/auth/folder.bru`, `auth/login/{folder.bru,01..04}`, `auth/me/{folder.bru,01..02}`, `auth/logout/{folder.bru,01..04}`

**Interfaces:**
- Consumes: `AuthService`, `createAuthService`, `createAuthRepository` (Task 5); `SESSION_COOKIE`, `readSessionToken`, `generateToken`, `hashToken` (Task 3); `verifyPassword` (Task 1); `PublicUser` (Task 4).
- Produces (used by Tasks 7, 8, 9, 11):
  ```ts
  // auth.middleware.ts — also augments Express: req.user?: PublicUser
  export function createRequireAuth(service: AuthService): RequestHandler
  export function currentUser(req: Request): PublicUser   // throws UNAUTHENTICATED
  // auth.cookie.ts
  export function setSessionCookie(res: Response, token: string, expiresAt: Date): void
  export function clearSessionCookie(res: Response): void
  // auth.controller.ts / auth.routes.ts
  export function createAuthController(service: AuthService): AuthController
  export function createAuthRouter(controller: AuthController, requireAuth: RequestHandler): Router
  // app.ts
  export function assembleAuthService(): AuthService
  export function createApp(io: Server<ClientToServerEvents, ServerToClientEvents>, authService: AuthService): Express
  // config.ts
  config.isProduction: boolean
  ```
  HTTP: `POST /api/auth/login` (JSON `{ email, password }`) → `200 { user }` + `Set-Cookie: ff_session=…`; `POST /api/auth/logout` → `204`, clears the cookie, also without a session; `GET /api/auth/me` → `200 { user }` or `401 UNAUTHENTICATED`. Malformed JSON → `400 BODY_INVALID`.
  Bruno: runtime variable `sessionCookie` (`ff_session=<hex>`), sent by `collection.bru` as `Cookie` to every request; environment variables `memberEmail`, `memberPassword`, `memberDisplayName`.

- [x] **Step 1: Write the Bruno requests (the failing tests)**

In `server/package.json`, replace the `test:bruno` script with:

```json
    "test:bruno": "cd bruno && pnpm dlx @usebruno/cli@4.2.0 run . -r --env Local --disable-cookies",
```

Replace `server/bruno/environments/Local.bru` with (keep `uploaderName` until Task 8):

```
vars {
  baseUrl: http://localhost:3000
  uploaderName: bruno
  memberEmail: membre@familyframe.test
  memberPassword: membre-familyframe-dev
  memberDisplayName: Membre
}
```

Replace `server/bruno/collection.bru` with:

```
meta {
  name: familyframe
}

headers {
  Cookie: {{sessionCookie}}
}

auth {
  mode: none
}

docs {
  Requêtes de l'API, avec leurs assertions. Prérequis : `server/.env` rempli,
  la base remplie par `pnpm db:seed` et l'API lancée (`pnpm dev`, port 3000).

  Lancer toute la collection depuis la racine du dépôt : `pnpm test:bruno`.
  Ou ouvrir le dossier `server/bruno/` dans l'application Bruno.

  Session : le dossier `auth/` passe en premier et range le cookie de session
  dans la variable `sessionCookie`, envoyée à toutes les requêtes par l'en-tête
  `Cookie` ci-dessus. Le CLI tourne avec `--disable-cookies` : sa propre boîte
  à cookies renverrait sinon la session même aux requêtes « sans cookie ».

  Les envois nominaux publient de vraies photos (Cloudinary + MongoDB) avec
  le pseudo `bruno` : elles apparaissent sur le cadre.

  Chemins `@file()` relatifs à la racine de la collection (`server/bruno/`).
}
```

Create `server/bruno/auth/folder.bru`:

```
meta {
  name: auth
  seq: 1
}

docs {
  Lancé avant les autres dossiers (`seq: 1`). `login/01` range le cookie de
  session dans la variable `sessionCookie` ; `logout/` ferme cette session,
  vérifie qu'elle ne sert plus, puis se reconnecte : les dossiers suivants
  gardent une session valide.

  Identifiants : ceux du membre créé par `pnpm db:seed`, dans
  `environments/Local.bru`. Un utilisateur renvoyé par l'API vaut
  `{ id, email, displayName, role }`, jamais le hash du mot de passe.
}
```

Create `server/bruno/auth/login/folder.bru`:

```
meta {
  name: login
  seq: 1
}

docs {
  `POST /api/auth/login`, JSON `{ email, password }` → 200 `{ user }` et le
  cookie `ff_session` (httpOnly, SameSite=Lax, 90 jours). E-mail inconnu et
  mauvais mot de passe donnent la même réponse : 401 `INVALID_CREDENTIALS`.
}
```

Create `server/bruno/auth/login/01-nominal.bru`:

```
meta {
  name: Nominal - connexion du membre
  type: http
  seq: 1
}

post {
  url: {{baseUrl}}/api/auth/login
  body: json
  auth: none
}

body:json {
  {
    "email": "{{memberEmail}}",
    "password": "{{memberPassword}}"
  }
}

assert {
  res.status: eq 200
  res.body.user.id: isString
  res.body.user.email: eq {{memberEmail}}
  res.body.user.displayName: eq {{memberDisplayName}}
  res.body.user.role: eq member
  res.body.user.passwordHash: isUndefined
}

script:post-response {
  const setCookies = [].concat(res.getHeader('set-cookie') ?? [])
  const sessionCookie = setCookies.find((cookie) => cookie.startsWith('ff_session='))
  test('cookie de session : jeton hexadécimal de 64 caractères, httpOnly, SameSite=Lax', () => {
    expect(sessionCookie).to.match(/^ff_session=[0-9a-f]{64};/)
    expect(sessionCookie).to.contain('HttpOnly')
    expect(sessionCookie).to.contain('SameSite=Lax')
  })
  // Only the name=value pair goes back, in the Cookie header of collection.bru.
  if (sessionCookie) {
    bru.setVar('sessionCookie', sessionCookie.split(';')[0])
  }
}

docs {
  NOMINAL → 200 `{ user }` et le cookie `ff_session`. Le script range
  `ff_session=<jeton>` dans `sessionCookie` pour les requêtes suivantes.
}
```

Create `server/bruno/auth/login/02-edge-mauvais-mot-de-passe.bru`:

```
meta {
  name: Edge - mauvais mot de passe
  type: http
  seq: 2
}

post {
  url: {{baseUrl}}/api/auth/login
  body: json
  auth: none
}

body:json {
  {
    "email": "{{memberEmail}}",
    "password": "pas-le-bon-mot-de-passe"
  }
}

assert {
  res.status: eq 401
  res.body.error: eq INVALID_CREDENTIALS
}

script:post-response {
  test('aucun cookie de session', () => {
    expect(res.getHeader('set-cookie')).to.equal(undefined)
  })
}

docs {
  EDGE → 401 INVALID_CREDENTIALS, sans cookie.
}
```

Create `server/bruno/auth/login/03-edge-email-inconnu.bru`:

```
meta {
  name: Edge - e-mail inconnu
  type: http
  seq: 3
}

post {
  url: {{baseUrl}}/api/auth/login
  body: json
  auth: none
}

body:json {
  {
    "email": "inconnu@familyframe.test",
    "password": "{{memberPassword}}"
  }
}

assert {
  res.status: eq 401
  res.body.error: eq INVALID_CREDENTIALS
}

script:post-response {
  test('même corps qu\'un mauvais mot de passe : pas d\'énumération des comptes', () => {
    expect(res.body).to.eql({ error: 'INVALID_CREDENTIALS' })
  })
}

docs {
  EDGE → 401 INVALID_CREDENTIALS, exactement comme un mauvais mot de passe.
  Le serveur vérifie quand même un hash factice : le temps de réponse ne
  trahit pas non plus l'existence du compte.
}
```

Create `server/bruno/auth/login/04-edge-json-malforme.bru`:

```
meta {
  name: Edge - JSON malformé
  type: http
  seq: 4
}

post {
  url: {{baseUrl}}/api/auth/login
  body: text
  auth: none
}

headers {
  Content-Type: application/json
}

body:text {
  {"email": "membre@familyframe.test"
}

assert {
  res.status: eq 400
  res.body.error: eq BODY_INVALID
}

docs {
  EDGE → 400 BODY_INVALID : `express.json()` (monté sur les routes auth
  seulement) refuse un corps JSON illisible.
}
```

Create `server/bruno/auth/me/folder.bru`:

```
meta {
  name: me
  seq: 2
}

docs {
  `GET /api/auth/me` → 200 `{ user }` avec une session valide, sinon 401
  `UNAUTHENTICATED`. Le client l'appelle au chargement pour savoir qui est
  connecté (le cookie est illisible en JavaScript).
}
```

Create `server/bruno/auth/me/01-nominal.bru`:

```
meta {
  name: Nominal - utilisateur connecté
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/api/auth/me
  body: none
  auth: none
}

assert {
  res.status: eq 200
  res.body.user.email: eq {{memberEmail}}
  res.body.user.role: eq member
  res.body.user.passwordHash: isUndefined
}

docs {
  NOMINAL → 200 `{ user }`, avec le cookie rangé par `login/01`.
}
```

Create `server/bruno/auth/me/02-edge-sans-cookie.bru`:

```
meta {
  name: Edge - sans cookie de session
  type: http
  seq: 2
}

get {
  url: {{baseUrl}}/api/auth/me
  body: none
  auth: none
}

script:pre-request {
  // collection.bru sends the session cookie to every request: remove it here.
  req.deleteHeader('Cookie')
}

assert {
  res.status: eq 401
  res.body.error: eq UNAUTHENTICATED
}

docs {
  EDGE → 401 UNAUTHENTICATED sans cookie (le script retire l'en-tête `Cookie`
  de la collection).
}
```

Create `server/bruno/auth/logout/folder.bru`:

```
meta {
  name: logout
  seq: 3
}

docs {
  `POST /api/auth/logout` → 204 : supprime la session et efface le cookie.
  Répond 204 aussi sans session. Ordre : déconnexion, `me` avec l'ancien
  cookie (401), déconnexion sans session, puis reconnexion pour que les
  dossiers suivants aient une session.
}
```

Create `server/bruno/auth/logout/01-nominal.bru`:

```
meta {
  name: Nominal - déconnexion
  type: http
  seq: 1
}

post {
  url: {{baseUrl}}/api/auth/logout
  body: none
  auth: none
}

assert {
  res.status: eq 204
}

script:post-response {
  const setCookies = [].concat(res.getHeader('set-cookie') ?? [])
  const cleared = setCookies.find((cookie) => cookie.startsWith('ff_session='))
  test('le cookie est effacé (valeur vide, date passée)', () => {
    expect(cleared).to.match(/^ff_session=;/)
    expect(cleared).to.contain('Expires=Thu, 01 Jan 1970')
  })
}

docs {
  NOMINAL → 204, la session est supprimée et le cookie effacé. La variable
  `sessionCookie` garde l'ancien jeton pour la requête suivante.
}
```

Create `server/bruno/auth/logout/02-edge-session-fermee.bru`:

```
meta {
  name: Edge - me avec le cookie d'une session fermée
  type: http
  seq: 2
}

get {
  url: {{baseUrl}}/api/auth/me
  body: none
  auth: none
}

assert {
  res.status: eq 401
  res.body.error: eq UNAUTHENTICATED
}

docs {
  EDGE → 401 UNAUTHENTICATED : le jeton envoyé est celui de la session
  supprimée par `01-nominal`, il n'ouvre plus rien.
}
```

Create `server/bruno/auth/logout/03-edge-sans-session.bru`:

```
meta {
  name: Edge - déconnexion sans session
  type: http
  seq: 3
}

post {
  url: {{baseUrl}}/api/auth/logout
  body: none
  auth: none
}

script:pre-request {
  // collection.bru sends the session cookie to every request: remove it here.
  req.deleteHeader('Cookie')
}

assert {
  res.status: eq 204
}

docs {
  EDGE → 204 : se déconnecter sans session n'est pas une erreur.
}
```

Create `server/bruno/auth/logout/04-nominal-reconnexion.bru`:

```
meta {
  name: Nominal - reconnexion pour la suite
  type: http
  seq: 4
}

post {
  url: {{baseUrl}}/api/auth/login
  body: json
  auth: none
}

body:json {
  {
    "email": "{{memberEmail}}",
    "password": "{{memberPassword}}"
  }
}

assert {
  res.status: eq 200
}

script:post-response {
  const setCookies = [].concat(res.getHeader('set-cookie') ?? [])
  const sessionCookie = setCookies.find((cookie) => cookie.startsWith('ff_session='))
  test('un nouveau cookie de session', () => {
    expect(sessionCookie).to.match(/^ff_session=[0-9a-f]{64};/)
  })
  if (sessionCookie) {
    bru.setVar('sessionCookie', sessionCookie.split(';')[0])
  }
}

docs {
  NOMINAL → 200 : nouvelle session, rangée dans `sessionCookie` pour les
  dossiers `health`, `not-found` et `photos`.
}
```

- [x] **Step 2: Run Bruno to verify the auth requests fail**

Run: `pnpm test:bruno` (API running)
Expected: the `auth/` requests run **first** (check the order in the output) and fail with 404 `ROUTE_NOT_FOUND` (except the two "logout" requests asserting only 204 also fail with 404); the 15 existing requests still pass. If `auth/` does not run first, stop and log it in the Drift Log (the folder order assumption is wrong).

- [x] **Step 3: Add `isProduction` to the config**

In `server/src/config.ts`, add inside `config`, after `clientOrigin`:

```ts
  isProduction: process.env.NODE_ENV === 'production',
```

- [x] **Step 4: Write the cookie helpers**

Create `server/src/features/auth/auth.cookie.ts`:

```ts
import type { CookieOptions, Response } from 'express'
import { config } from '../../config.js'
import { SESSION_COOKIE } from '../../lib/session-token.js'

const SESSION_COOKIE_OPTIONS: CookieOptions = {
  // Out of reach of JavaScript: an XSS cannot steal the session.
  httpOnly: true,
  sameSite: 'lax',
  // Development runs on plain HTTP: a Secure cookie would never come back.
  secure: config.isProduction,
  path: '/',
}

// Expires with the session itself, also after a renewal.
export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, token, { ...SESSION_COOKIE_OPTIONS, expires: expiresAt })
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, SESSION_COOKIE_OPTIONS)
}
```

- [x] **Step 5: Write the middleware**

Create `server/src/features/auth/auth.middleware.ts`:

```ts
import type { Request, RequestHandler } from 'express'
import { AppError } from '../../errors/app-error.js'
import { readSessionToken } from '../../lib/session-token.js'
import type { PublicUser } from '../../types.js'
import { setSessionCookie } from './auth.cookie.js'
import type { AuthService } from './auth.service.js'

// Declaration merging: every Express handler sees req.user typed, without casts.
declare global {
  namespace Express {
    interface Request {
      user?: PublicUser
    }
  }
}

export function createRequireAuth(service: AuthService): RequestHandler {
  return async (req, res, next) => {
    const token = readSessionToken(req.headers.cookie)
    if (token === null) {
      throw new AppError('UNAUTHENTICATED')
    }
    const { user, expiresAt, isRenewed } = await service.authenticateAndSlide(token)
    if (isRenewed) {
      setSessionCookie(res, token, expiresAt)
    }
    req.user = user
    next()
  }
}

// For handlers behind requireAuth: fails loudly if one is mounted without it.
export function currentUser(req: Request): PublicUser {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED')
  }
  return req.user
}
```

Express 5 forwards a rejected promise from a middleware to the error handler, like it does for the photos controller: no try/catch.

- [x] **Step 6: Write the controller and the routes**

Create `server/src/features/auth/auth.controller.ts`:

```ts
import type { Request, Response } from 'express'
import { readSessionToken } from '../../lib/session-token.js'
import { clearSessionCookie, setSessionCookie } from './auth.cookie.js'
import { currentUser } from './auth.middleware.js'
import type { AuthService } from './auth.service.js'

export type AuthController = {
  login: (req: Request, res: Response) => Promise<void>
  logout: (req: Request, res: Response) => Promise<void>
  me: (req: Request, res: Response) => void
}

export function createAuthController(service: AuthService): AuthController {
  return {
    async login(req, res) {
      const { user, token, expiresAt } = await service.login({
        email: req.body?.email,
        password: req.body?.password,
      })
      setSessionCookie(res, token, expiresAt)
      res.json({ user })
    },

    async logout(req, res) {
      await service.logout(readSessionToken(req.headers.cookie))
      clearSessionCookie(res)
      res.status(204).end()
    },

    me(req, res) {
      res.json({ user: currentUser(req) })
    },
  }
}
```

Create `server/src/features/auth/auth.routes.ts`:

```ts
import express, { type RequestHandler, Router } from 'express'
import type { AuthController } from './auth.controller.js'

export function createAuthRouter(controller: AuthController, requireAuth: RequestHandler): Router {
  const router = Router()
  // The only routes that read JSON: the parser stays here (see the logging spec).
  router.use(express.json())
  router.post('/login', controller.login)
  router.post('/logout', controller.logout)
  router.get('/me', requireAuth, controller.me)
  return router
}
```

- [x] **Step 7: Wire the app and the server**

Replace `server/src/app.ts` with:

```ts
import cors from 'cors'
import express, { type Express, type Router } from 'express'
import type { Server } from 'socket.io'
import { config } from './config.js'
import { errorHandler } from './errors/error-handler.js'
import { notFound } from './errors/not-found.js'
import { createAuthController } from './features/auth/auth.controller.js'
import { createRequireAuth } from './features/auth/auth.middleware.js'
import { createAuthRepository } from './features/auth/auth.repository.js'
import { createAuthRouter } from './features/auth/auth.routes.js'
import { type AuthService, createAuthService } from './features/auth/auth.service.js'
import { createPhotosController } from './features/photos/photos.controller.js'
import { createPhotosRepository } from './features/photos/photos.repository.js'
import { createPhotosRouter } from './features/photos/photos.routes.js'
import { createPhotosService } from './features/photos/photos.service.js'
import { deleteImage, uploadImage } from './lib/cloudinary.js'
import { prisma } from './lib/db.js'
import { toFrameJpeg } from './lib/image.js'
import { logger } from './lib/logger.js'
import { verifyPassword } from './lib/password.js'
import { requestLogger } from './lib/request-logger.js'
import { generateToken, hashToken } from './lib/session-token.js'
import type { ClientToServerEvents, ServerToClientEvents } from './types.js'

// Built outside createApp: server.ts also hands it to the Socket.IO middleware.
export function assembleAuthService(): AuthService {
  return createAuthService({
    repository: createAuthRepository(prisma),
    hashToken,
    generateToken,
    verifyPassword,
    now: () => new Date(),
    logger,
  })
}

function assemblePhotosRouter(io: Server<ClientToServerEvents, ServerToClientEvents>): Router {
  const service = createPhotosService({
    repository: createPhotosRepository(prisma),
    toFrameJpeg,
    uploadImage,
    deleteImage,
    logger,
  })
  return createPhotosRouter(createPhotosController(service, io))
}

export function createApp(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  authService: AuthService,
): Express {
  const requireAuth = createRequireAuth(authService)
  const app = express()

  // First, so every request is timed and logged, 404s included.
  app.use(requestLogger)
  app.use(cors({ origin: config.clientOrigin }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/auth', createAuthRouter(createAuthController(authService), requireAuth))
  app.use('/api/photos', assemblePhotosRouter(io))

  app.use(notFound)
  app.use(errorHandler)

  return app
}
```

In `server/src/server.ts`, replace the import `import { createApp } from './app.js'` with:

```ts
import { assembleAuthService, createApp } from './app.js'
```

and replace the line `const httpServer = createServer(createApp(io))` with:

```ts
const authService = assembleAuthService()
const httpServer = createServer(createApp(io, authService))
```

- [x] **Step 8: Run Bruno and the gates**

Wait ~3 s for `tsx watch` to reload. Run: `pnpm test:bruno`
Expected: 25 requests, all pass (10 in `auth/` first, then the 15 existing ones).

If `login/01` fails only on the cookie test with `sessionCookie` undefined, `res.getHeader` did not return the header: replace `res.getHeader('set-cookie')` with `res.headers['set-cookie']` in `login/01`, `logout/01` and `logout/04`, re-run, and log it in the Drift Log. If `me/02` or `logout/03` gets 200/204 with a session, `req.deleteHeader` did not remove the header: replace the pre-request script with a request-level `headers { Cookie: ff_session= }` block (an empty token is also anonymous), re-run, and log it.

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  76 passed (76)`. If Biome flags the `namespace` in `declare global`, log the rule name in the Drift Log and move the `declare global` block to `server/src/features/auth/express-request.d.ts` with `import type { PublicUser } from '../../types.js'` at the top (the import makes it a module).

Manual check of the logs (API terminal, pretty format): after a Bruno run, `auth.login_succeeded userId=…` (twice), `auth.login_failed` (twice, no data), `auth.logged_out userId=…` (once). No email, password or token anywhere.

- [x] **Step 9: Commit**

```bash
git add server/src/config.ts server/src/app.ts server/src/server.ts server/src/features/auth/auth.cookie.ts server/src/features/auth/auth.middleware.ts server/src/features/auth/auth.controller.ts server/src/features/auth/auth.routes.ts server/package.json server/bruno/collection.bru server/bruno/environments/Local.bru server/bruno/auth
git commit -F <message-file>
```

Message: `feat(server): add the login, logout and me routes` + attribution lines. Body: one line: the session travels in an httpOnly cookie; Bruno disables its own cookie jar and sends the cookie from a collection header.

---

## PR C — `feat/auth-guard`

> **Controller:** before Task 7, run `gh stack add feat/auth-guard`.

### Task 7: Require a session on the photo routes (PR C, `feat/auth-guard`)

**Files:**
- Modify: `server/src/app.ts`
- Create: `server/bruno/photos/list/02-edge-sans-cookie.bru`
- Modify: `server/bruno/photos/delete/01-nominal.bru` (its script calls the API without the collection header)
- Modify: `server/bruno/photos/folder.bru` (docs)

**Interfaces:**
- Consumes: `createRequireAuth` (Task 6), the Bruno `sessionCookie` variable (Task 6).
- Produces: every `/api/photos` route answers `401 UNAUTHENTICATED` without a valid session; `req.user` is set for the photos controller (used by Task 8).

- [x] **Step 1: Write the failing Bruno request**

Create `server/bruno/photos/list/02-edge-sans-cookie.bru`:

```
meta {
  name: Edge - sans cookie de session
  type: http
  seq: 2
}

get {
  url: {{baseUrl}}/api/photos
  body: none
  auth: none
}

script:pre-request {
  // collection.bru sends the session cookie to every request: remove it here.
  req.deleteHeader('Cookie')
}

assert {
  res.status: eq 401
  res.body.error: eq UNAUTHENTICATED
}

docs {
  EDGE → 401 UNAUTHENTICATED : toutes les routes `/api/photos` demandent une
  session.
}
```

In `server/bruno/photos/delete/01-nominal.bru`, replace the `script:post-response` block with:

```
script:post-response {
  const axios = require('axios')
  test('la photo ne figure plus dans la liste', async () => {
    // A script request does not get the collection headers: send the session cookie itself.
    const list = await axios.get(`${bru.getEnvVar('baseUrl')}/api/photos`, {
      headers: { Cookie: bru.getVar('sessionCookie') },
    })
    const ids = list.data.map(({ id }) => id)
    expect(ids).to.not.include(bru.getVar('createdPhotoId'))
  })
}
```

In `server/bruno/photos/folder.bru`, replace the `docs` block with:

```
docs {
  Toutes les routes demandent une session (cookie `ff_session`, envoyé par
  `collection.bru`) : sans elle, 401 `UNAUTHENTICATED`.

  Une photo renvoyée par l'API : `{ id, url, thumbnailUrl, uploaderName, createdAt }`
  (`createdAt` en ISO 8601). Une erreur : `{ error }`, un code
  (`UPLOADER_NAME_INVALID`, `PHOTO_MISSING`, `UPLOAD_INVALID`, `UNAUTHENTICATED`,
  `PHOTO_NOT_FOUND`, `PHOTO_TOO_LARGE`, `FORMAT_UNSUPPORTED`, `IMAGE_UNREADABLE`,
  `SERVER_ERROR`) que le client traduit en français.
}
```

- [x] **Step 2: Run Bruno to verify it fails**

Run: `pnpm test:bruno`
Expected: FAIL on `photos/list/02-edge-sans-cookie` only (200 instead of 401); 25 others pass.

- [x] **Step 3: Guard the photos router**

In `server/src/app.ts`, in `createApp`, replace `app.use('/api/photos', assemblePhotosRouter(io))` with:

```ts
  app.use('/api/photos', requireAuth, assemblePhotosRouter(io))
```

- [x] **Step 4: Run Bruno and the gates**

Wait ~3 s. Run: `pnpm test:bruno`
Expected: 26 requests, all pass (the photos requests carry the cookie; `create/09` still answers `UPLOADER_NAME_INVALID`: it reaches the route, which still validates the pseudo first).

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green.

Manual check: `curl -s http://localhost:3000/api/photos` → `{"error":"UNAUTHENTICATED"}`; `curl -s http://localhost:3000/api/health` → `{"status":"ok"}` (still public).

- [x] **Step 5: Commit**

```bash
git add server/src/app.ts server/bruno/photos/list/02-edge-sans-cookie.bru server/bruno/photos/delete/01-nominal.bru server/bruno/photos/folder.bru
git commit -F <message-file>
```

Message: `feat(server): require a session on the photo routes` + attribution lines.

---

### Task 8: Name the uploader after the logged-in user (PR C, `feat/auth-guard`)

**Files:**
- Modify: `server/src/features/photos/photos.controller.ts`
- Modify: `server/src/features/photos/photos.service.ts`
- Test: `server/src/features/photos/photos.service.test.ts`
- Modify: `server/src/types.ts`, `server/src/errors/error-handler.ts`, `client/src/api.ts` (remove `UPLOADER_NAME_INVALID`)
- Delete: `server/bruno/photos/create/03-edge-sans-pseudo.bru`, `server/bruno/photos/create/04-edge-pseudo-trop-long.bru`
- Modify: `server/bruno/photos/create/{01,02,05,06,07,08,09}-*.bru`, `server/bruno/photos/create/folder.bru`, `server/bruno/photos/folder.bru`, `server/bruno/environments/Local.bru`, `server/bruno/collection.bru`

**Interfaces:**
- Consumes: `currentUser(req)` (Task 6), `req.user` set by `requireAuth` (Task 7).
- Produces:
  ```ts
  // photos.service.ts
  export type NewPhotoInput = { uploaderName: string; file: UploadedFile | undefined }
  ```
  `POST /api/photos` takes only the `photo` file; the `uploaderName` of the created photo is the user's `displayName`. `UPLOADER_NAME_INVALID` no longer exists.

- [x] **Step 1: Update the Bruno requests (the failing tests)**

Delete the two pseudo requests:

```bash
git rm server/bruno/photos/create/03-edge-sans-pseudo.bru server/bruno/photos/create/04-edge-pseudo-trop-long.bru
```

In `server/bruno/photos/create/01-nominal-jpeg.bru`, replace the `body:multipart-form` and `assert` blocks with:

```
body:multipart-form {
  photo: @file(fixtures/photo.jpg) @contentType(image/jpeg)
}

assert {
  res.status: eq 201
  res.body.uploaderName: eq {{memberDisplayName}}
  res.body.url: contains res.cloudinary.com
  res.body.id: isString
  res.body.cloudinaryId: isUndefined
}
```

and add this paragraph at the top of its `docs` block:

```
  NOMINAL → 201 avec la photo créée, au nom d'affichage du compte connecté
  (`uploaderName`) : le client n'envoie plus de pseudo.
```

(remove the old first sentence `NOMINAL → 201 avec la photo créée.` so it is not said twice).

In `02-nominal-png.bru`, `06-edge-mauvais-champ.bru`, `07-edge-format-gif.bru` and `08-edge-faux-jpeg.bru`, delete the line `  uploaderName: {{uploaderName}}` from `body:multipart-form` (keep the file line).

In `05-edge-sans-fichier.bru`, replace the `body:multipart-form` block with:

```
body:multipart-form {
  legende: une photo sans fichier
}
```

and replace its `docs` block with:

```
docs {
  EDGE → 400 PHOTO_MISSING, un champ texte mais aucun fichier dans le champ
  photo (le champ texte garde un corps multipart non vide ; le serveur l'ignore).
}
```

In `09-edge-json-malforme.bru`, replace the `assert` and `docs` blocks with:

```
assert {
  res.status: eq 400
  res.body.error: eq PHOTO_MISSING
}

docs {
  EDGE → 400 PHOTO_MISSING : la route photos ne lit pas le JSON (pas de
  parser, elle attend du multipart), donc aucun fichier n'est reçu. Le cookie
  de session est envoyé : sans lui, la réponse serait 401.
}
```

Replace `server/bruno/photos/create/folder.bru` `docs` block with:

```
docs {
  `POST /api/photos`, multipart : `photo` (un fichier JPEG, PNG ou WebP,
  10 Mo max). Le serveur remplit `uploaderName` avec le nom d'affichage du
  compte connecté.

  Non couvert ici : le 413 `PHOTO_TOO_LARGE` demande un fichier de plus de
  10 Mo, trop lourd pour le dépôt. À tester à la main.
}
```

In `server/bruno/photos/folder.bru` `docs`, remove `` `UPLOADER_NAME_INVALID`, `` from the list of codes.

Replace `server/bruno/environments/Local.bru` with:

```
vars {
  baseUrl: http://localhost:3000
  memberEmail: membre@familyframe.test
  memberPassword: membre-familyframe-dev
  memberDisplayName: Membre
}
```

In `server/bruno/collection.bru` `docs`, replace the paragraph about nominal uploads with:

```
  Les envois nominaux publient de vraies photos (Cloudinary + MongoDB) au nom
  du membre de test (`Membre`) : elles apparaissent sur le cadre.
```

- [x] **Step 2: Run Bruno to verify it fails**

Run: `pnpm test:bruno`
Expected: FAIL on `create/01`, `create/02`, `create/07`, `create/08` and `create/09` with 400 `UPLOADER_NAME_INVALID` (the pseudo is still required); the others pass. 24 requests in total.

- [x] **Step 3: Update the service tests**

In `server/src/features/photos/photos.service.test.ts`:

1. Delete the constants `LONGEST_NAME` and `TOO_LONG_NAME`.
2. Replace the first test of `describe('createPhoto', ...)` with:

```ts
  it('saves the uploaded image with the uploader name and returns the record', async () => {
    const deps = makeDeps()

    const record = await createPhotosService(deps).createPhoto({
      uploaderName: 'Mamie',
      file: JPEG_FILE,
    })

    expect(record).toBe(RECORD)
    expect(deps.toFrameJpeg).toHaveBeenCalledWith(JPEG_FILE.buffer)
    expect(deps.uploadImage).toHaveBeenCalledWith(FRAME_JPEG)
    expect(deps.repository.create).toHaveBeenCalledWith({ ...IMAGE, uploaderName: 'Mamie' })
  })
```

3. Delete the test `accepts a 30-character name` and the whole `it.each([...])('rejects a name that is %s before any image work', ...)` block.

Every other test already passes `uploaderName: 'Mamie'` and stays.

Run: `pnpm typecheck`
Expected: green (tests passing a string still match `uploaderName: unknown`); `pnpm test` → PASS with `Tests  70 passed (70)` (76 − 6): the removed tests described the old rule.

- [x] **Step 4: Take the name from the user**

In `server/src/features/photos/photos.service.ts`:

1. Delete the constant `MAX_UPLOADER_NAME_LENGTH` and the function `parseUploaderName`.
2. Replace `NewPhotoInput` with:

```ts
// The name comes from the logged-in account (its displayName), not from the request.
export type NewPhotoInput = { uploaderName: string; file: UploadedFile | undefined }
```

3. In `createPhoto`, delete the line `const validUploaderName = parseUploaderName(uploaderName)` and replace `saveRecord(deps, image, validUploaderName)` with `saveRecord(deps, image, uploaderName)`.

In `server/src/features/photos/photos.controller.ts`, add the import:

```ts
import { currentUser } from '../auth/auth.middleware.js'
```

and replace the body of `create` with:

```ts
    async create(req, res) {
      const record = await service.createPhoto({
        uploaderName: currentUser(req).displayName,
        file: req.file,
      })
      const photo = toPhotoDto(record)
      io.emit('photo:new', photo)
      res.status(201).json(photo)
    },
```

- [x] **Step 5: Remove the unreachable code**

In `server/src/types.ts`, remove the line `  | 'UPLOADER_NAME_INVALID'` from `ApiErrorCode`. In `server/src/errors/error-handler.ts`, remove `  UPLOADER_NAME_INVALID: 400,` from `HTTP_STATUS_BY_CODE`. In `client/src/api.ts`, remove the same union member and the `UPLOADER_NAME_INVALID` message.

Run: `pnpm typecheck`
Expected: green (the exhaustive `Record<ApiErrorCode, …>` maps would fail if a copy were left behind).

- [x] **Step 6: Run Bruno and the gates**

Wait ~3 s. Run: `pnpm test:bruno`
Expected: 24 requests, all pass.

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, `Tests  70 passed (70)`.

- [x] **Step 7: Commit**

```bash
git add -A server/bruno server/src/features/photos server/src/types.ts server/src/errors/error-handler.ts client/src/api.ts
git commit -F <message-file>
```

Message: `feat(server): name the uploader after the logged-in user` + attribution lines. Body: one line: the pseudo field and UPLOADER_NAME_INVALID go away; step 2 replaces uploaderName with the photo owner.

---

### Task 9: Socket.IO behind the session (PR C, `feat/auth-guard`)

**Files:**
- Create: `server/src/lib/socket-types.ts`
- Create: `server/src/features/auth/auth.socket.ts`
- Modify: `server/src/server.ts`, `server/src/app.ts`, `server/src/features/photos/photos.controller.ts` (use `SocketServer`)

**Interfaces:**
- Consumes: `AuthService.authenticate` (Task 5), `readSessionToken` (Task 3), `AppError`, `logger`.
- Produces:
  ```ts
  // lib/socket-types.ts
  export type InterServerEvents = Record<string, never>
  export type SocketData = { userId: string }
  export type SocketServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
  export type SocketMiddleware = Parameters<SocketServer['use']>[0]
  // features/auth/auth.socket.ts
  export function createSocketAuth(service: AuthService): SocketMiddleware
  ```
  A handshake without a valid session gets `connect_error` with message `UNAUTHENTICATED` (used by Task 12). An accepted socket has `socket.data.userId` and is in room `user:<id>`.

- [x] **Step 1: Write the failing manual check**

The repo has no Socket.IO test harness; this script is the check. With the API running, from the `client/` directory (it has `socket.io-client`):

```bash
cd client && node --input-type=module -e "import { io } from 'socket.io-client'; const socket = io('http://localhost:3000', { transports: ['websocket'] }); socket.on('connect', () => { console.log('connected'); socket.close() }); socket.on('connect_error', ({ message }) => { console.log('refused:', message); socket.close() })"
```

Expected now: `connected` (no auth yet): the check fails.

- [x] **Step 2: Declare the socket types**

Create `server/src/lib/socket-types.ts`:

```ts
import type { Server } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '../types.js'

export type InterServerEvents = Record<string, never>

// Set by the Socket.IO auth middleware before the connection event.
export type SocketData = { userId: string }

export type SocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

export type SocketMiddleware = Parameters<SocketServer['use']>[0]
```

In `server/src/app.ts` and `server/src/features/photos/photos.controller.ts`, replace every `Server<ClientToServerEvents, ServerToClientEvents>` type with `SocketServer` (import `type { SocketServer } from './lib/socket-types.js'`, resp. `'../../lib/socket-types.js'`), and remove the imports that become unused (`Server` from `socket.io`, `ClientToServerEvents`, `ServerToClientEvents`; the controller still imports `Photo` from `types.js`).

- [x] **Step 3: Write the middleware**

Create `server/src/features/auth/auth.socket.ts`:

```ts
import { AppError } from '../../errors/app-error.js'
import { logger } from '../../lib/logger.js'
import { readSessionToken } from '../../lib/session-token.js'
import type { SocketMiddleware } from '../../lib/socket-types.js'
import type { AuthService } from './auth.service.js'

// The message is the only thing the client receives: it matches the HTTP error code.
function toHandshakeError(error: unknown): Error {
  if (error instanceof AppError) {
    return new Error('UNAUTHENTICATED')
  }
  logger.error('server.error', { error, path: '/socket.io' })
  return new Error('SERVER_ERROR')
}

// No sliding here: a handshake has no HTTP response to carry a renewed cookie.
export function createSocketAuth(service: AuthService): SocketMiddleware {
  return (socket, next) => {
    const token = readSessionToken(socket.request.headers.cookie)
    service.authenticate(token).then(
      ({ user }) => {
        socket.data.userId = user.id
        // Step 2 sends each user's photos to this room; broadcasting stays global for now.
        socket.join(`user:${user.id}`)
        next()
      },
      (error: unknown) => next(toHandshakeError(error)),
    )
  }
}
```

- [x] **Step 4: Plug it into the server**

In `server/src/server.ts`:

1. Add the imports:

```ts
import { createSocketAuth } from './features/auth/auth.socket.js'
import type { InterServerEvents, SocketData } from './lib/socket-types.js'
```

2. Replace the `io` creation with:

```ts
// Created before the HTTP server: the routes need it to broadcast.
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>({
  cors: { origin: config.clientOrigin },
})
```

3. Replace the `io.on('connection', …)` block with:

```ts
// Before 'connection': a socket without a valid session never connects.
io.use(createSocketAuth(authService))

io.on('connection', (socket) => {
  const { userId } = socket.data
  logger.info('socket.connected', { socketId: socket.id, userId })
  socket.on('disconnect', (reason) => {
    logger.info('socket.disconnected', { socketId: socket.id, userId, reason })
  })
})
```

`authService` is already declared above (Task 6), before `httpServer`.

- [x] **Step 5: Run the manual check again**

Wait ~3 s. Run the Step 1 command again.
Expected: `refused: UNAUTHENTICATED`.

With a session, get a token and connect with it (Git Bash, from the repo root):

```bash
COOKIE=$(curl -s -i -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"membre@familyframe.test","password":"membre-familyframe-dev"}' | sed -n 's/^[Ss]et-[Cc]ookie: \(ff_session=[0-9a-f]*\).*/\1/p')
cd client && node --input-type=module -e "import { io } from 'socket.io-client'; const socket = io('http://localhost:3000', { transports: ['websocket'], extraHeaders: { Cookie: process.argv[1] } }); socket.on('connect', () => { console.log('connected'); socket.close() }); socket.on('connect_error', ({ message }) => { console.log('refused:', message); socket.close() })" "$COOKIE"
```

Expected: `connected`, and in the API terminal `socket.connected socketId=… userId=…` then `socket.disconnected … userId=… reason=…`.

- [x] **Step 6: Run the gates**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build && pnpm test:bruno`
Expected: all green, Bruno 24/24.

- [x] **Step 7: Commit**

```bash
git add server/src/lib/socket-types.ts server/src/features/auth/auth.socket.ts server/src/server.ts server/src/app.ts server/src/features/photos/photos.controller.ts
git commit -F <message-file>
```

Message: `feat(server): require a session on Socket.IO` + attribution lines. Body: one line: same cookie and rules as HTTP, without sliding; each socket joins its user room for step 2.

---

### Task 10: Document the authentication (PR C, `feat/auth-guard`)

**Files:**
- Modify: `ARCHITECTURE.md`

**Interfaces:**
- Consumes: the behavior of Tasks 1-9.
- Produces: an "Authentification" section and up-to-date API, errors, real-time, layers, logs, configuration, data, tooling and containerization sections.

- [x] **Step 1: Parcours d'une photo**

In `## Parcours d'une photo`, replace steps 1, 3 and 5 with:

```markdown
1. Le proche, connecté à son compte, prend ou choisit une photo (`<input type="file" accept="image/*" capture>`).
```

```markdown
3. Le serveur vérifie la session (cookie `ff_session`, voir [Authentification](#authentification)) et le fichier (10 Mo max, JPEG/PNG/WebP), puis le **décode et le réencode avec Sharp** : JPEG de 1920 px max, orientation EXIF appliquée, métadonnées (GPS compris) supprimées. Le type déclaré par le navigateur n'est pas fiable : c'est le décodage par Sharp qui valide vraiment l'image.
```

```markdown
5. **Prisma** enregistre dans MongoDB l'URL, l'identifiant Cloudinary, le nom d'affichage du compte (`uploaderName`) et la date.
```

- [x] **Step 2: API and errors**

Replace the `## API` route table with:

```markdown
| Route                    | Réponse                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `GET /api/health`        | `200 { "status": "ok" }` (servira de healthcheck Docker en J2)                           |
| `POST /api/auth/login`   | JSON `{ email, password }` → `200 { user }` + cookie `ff_session`                        |
| `POST /api/auth/logout`  | `204` ; supprime la session et efface le cookie (répond `204` aussi sans session)        |
| `GET /api/auth/me`       | `200 { user }`, l'utilisateur de la session                                              |
| `GET /api/photos`        | `200 Photo[]`, les 20 plus récentes en premier                                           |
| `POST /api/photos`       | `multipart/form-data` avec `photo` (fichier) → `201 Photo`                               |
| `DELETE /api/photos/:id` | `204` sans corps ; supprime l'enregistrement puis l'image Cloudinary (cache CDN compris) |

Toutes les routes `/api/photos` et `GET /api/auth/me` demandent une session ; sans elle : `401 UNAUTHENTICATED`. Un `user` vaut `{ id, email, displayName, role }` (`role` : `member` ou `admin`), jamais le hash du mot de passe.
```

After the table, in the `Photo` sentence, add: `` `uploaderName` est le nom d'affichage du compte qui a envoyé la photo. ``

Replace the error table with:

```markdown
| Cas                                                     | Statut | `error`               |
| ------------------------------------------------------- | ------ | --------------------- |
| aucun fichier                                           | 400    | `PHOTO_MISSING`       |
| autre erreur Multer (mauvais champ, plusieurs fichiers) | 400    | `UPLOAD_INVALID`      |
| corps JSON illisible (routes `/api/auth`)               | 400    | `BODY_INVALID`        |
| pas de session, session inconnue ou expirée             | 401    | `UNAUTHENTICATED`     |
| e-mail inconnu ou mauvais mot de passe                  | 401    | `INVALID_CREDENTIALS` |
| route inconnue                                          | 404    | `ROUTE_NOT_FOUND`     |
| photo inconnue, ou id qui n'est pas un ObjectId         | 404    | `PHOTO_NOT_FOUND`     |
| fichier de plus de 10 Mo                                | 413    | `PHOTO_TOO_LARGE`     |
| type autre que JPEG, PNG ou WebP                        | 415    | `FORMAT_UNSUPPORTED`  |
| image illisible par Sharp                               | 422    | `IMAGE_UNREADABLE`    |
| toute autre erreur (Cloudinary, base)                   | 500    | `SERVER_ERROR`        |
```

- [x] **Step 3: The Authentification section**

Insert a new section right after `## API` (before `## Temps réel`):

```markdown
## Authentification

- **Comptes** : `User` (e-mail unique, nom d'affichage, hash du mot de passe, rôle `member` ou `admin`). Mots de passe hachés en **argon2id** (`server/src/lib/password.ts`, seul fichier qui importe `argon2`). Pas d'inscription : les comptes viennent du seed (`pnpm db:seed`) ; les invitations arrivent à l'étape 3.
- **Session** : à la connexion, le serveur tire 32 octets aléatoires (le jeton), les envoie dans le cookie `ff_session` et ne garde en base que leur SHA-256 (`Session.tokenHash`) : une fuite de la base n'ouvre aucune session. La déconnexion supprime la session : révocation immédiate, sans liste noire.
- **Cookie** : `httpOnly` (illisible en JavaScript), `SameSite=Lax`, `Secure` quand `NODE_ENV=production`, `path=/`, expire avec la session. En dev, le proxy Vite rend l'API same-origin : le navigateur envoie le cookie sans réglage CORS.
- **Glissement** : une session dure 90 jours ; une requête HTTP authentifiée qui arrive à moins de 45 jours de la fin la prolonge à 90 jours et renvoie le cookie. Un cadre allumé ne se déconnecte jamais, pour au plus une écriture en base tous les 45 jours.
- **Expiration** : Prisma 6 ne sait pas déclarer d'index TTL MongoDB. Une session expirée est supprimée quand on la lit, et toutes les sessions expirées à chaque connexion réussie.
- **Connexion refusée** : e-mail inconnu et mauvais mot de passe répondent tous deux `401 INVALID_CREDENTIALS`, et un e-mail inconnu coûte quand même une vérification argon2 (contre un hash factice) : ni le message ni le temps de réponse ne disent qui a un compte.
- **Garde HTTP** : `requireAuth` (`features/auth/auth.middleware.ts`) lit le cookie avec `lib/session-token.ts` (sans `cookie-parser`), valide la session et pose `req.user`, typé par *declaration merging* sur `Request` ; `currentUser(req)` le relit sans cast. `/api/photos` et `/api/auth/me` sont derrière ; `/api/health`, `/login` et `/logout` restent publics.
- **JSON** : `express.json()` n'est monté que sur `/api/auth`, les seules routes qui lisent du JSON ; un corps illisible répond `400 BODY_INVALID`.
```

- [x] **Step 4: Temps réel, couches, logs, configuration, données, outillage, conteneurisation**

In `## Temps réel`, add as the first bullet:

```markdown
- **Connexion protégée** : un middleware `io.use` (`features/auth/auth.socket.ts`) lit le même cookie dans la requête de handshake et valide la session, sans glissement (pas de réponse HTTP pour porter un nouveau cookie). Sans session valide, la connexion est refusée avec l'erreur `UNAUTHENTICATED`, que le client traite comme une déconnexion. Chaque socket rejoint la room `user:<id>`, prête pour l'étape 2 ; les diffusions restent globales.
```

In `## Couches du backend`, replace the first sentence `Une feature par dossier (`server/src/features/photos/`), un fichier par couche :` with:

```markdown
Une feature par dossier (`server/src/features/photos/`, `server/src/features/auth/`), un fichier par couche. Pour les photos :
```

and after the table, add the bullet:

```markdown
- `features/auth/` suit le même découpage (`auth.repository.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`), plus `auth.middleware.ts` (garde HTTP), `auth.socket.ts` (garde Socket.IO) et `auth.cookie.ts` (pose et efface le cookie). Le service d'auth reçoit ses dépendances (`repository`, `hashToken`, `generateToken`, `verifyPassword`, `now`, `logger`) ; `app.ts` l'assemble une fois (`assembleAuthService`) et `server.ts` le partage avec Socket.IO.
```

In `## Logs`, replace the bullet `- **Pas de données personnelles** : …` with:

```markdown
- **Pas de données personnelles** : jamais le pseudo, l'e-mail, le mot de passe ni le jeton de session ; seulement des identifiants (`photoId`, `cloudinaryId`, `socketId`, `userId`) ; les chemins sans leur query string.
```

and add these rows to the event table, after `socket.connected / socket.disconnected` (whose row becomes `` `server.ts`, avec `userId` ``):

```markdown
| `auth.login_succeeded` / `auth.logged_out`                  | info                          | service auth, avec `userId`                                                                                  |
| `auth.login_failed`                                         | warn                          | service auth, sans aucune donnée (jamais l'e-mail)                                                           |
| `seed.done` / `seed.refused`                                | info / error                  | `prisma/seed.ts` : nombre de comptes créés / refus avec `NODE_ENV=production`                                |
```

In `## Configuration`, add the bullet:

```markdown
- `NODE_ENV=production` ajoute `Secure` au cookie de session (`config.isProduction`) et interdit le seed.
```

In `## Données`, add the bullet:

```markdown
- Collections `User` et `Session` (index uniques sur `email` et `tokenHash`) ; le rôle est un `enum Role` Prisma, que Prisma génère en union de chaînes. `pnpm db:seed` (`server/prisma/seed.ts`) vide la base et crée les deux comptes de test du README.
```

In `## Outillage`, replace the Bruno bullet with:

```markdown
- **Bruno** (`server/bruno/`) : requêtes de l'API avec assertions, un dossier par endpoint, des fichiers `NN-nominal-…` / `NN-edge-…`. Lancées par `pnpm test:bruno` contre l'API démarrée et la base remplie par le seed (CLI via `pnpm dlx`, version figée, pas de dépendance). Le dossier `auth/` passe en premier (`seq: 1`) et range le cookie de session dans une variable, envoyée à toutes les requêtes par un en-tête de collection ; le CLI tourne avec `--disable-cookies` pour que sa boîte à cookies ne renvoie pas la session aux requêtes « sans cookie ».
```

In `## Conteneurisation`, add to `Points déjà connus` :

```markdown
- **argon2** charge un binaire précompilé livré dans le paquet (Linux x64/arm64, glibc et musl, Windows x64) : son script de build reste bloqué par pnpm (`ignoredBuiltDependencies`). Comme Sharp, il doit être installé dans l'image, jamais copié depuis le `node_modules` Windows.
```

- [x] **Step 5: Check and commit**

Run: `pnpm check`
Expected: green (if the hook later rejects `ARCHITECTURE.md`, run `pnpm exec biome format --write ARCHITECTURE.md`).

Re-read the whole file once: no remaining mention of `UPLOADER_NAME_INVALID` or of a pseudo typed by the user on the server side (the `## Pages` table is Task 13).

```bash
git add ARCHITECTURE.md
git commit -F <message-file>
```

Message: `docs: describe the authentication` + attribution lines.

---

## PR D — `feat/client-login`

> **Controller:** before Task 11, run `gh stack add feat/client-login`.
>
> The client has no test runner: each task's proof is `pnpm typecheck`, `pnpm build`, `pnpm check` and the manual browser checks listed (the controller may run them with the Chrome tools). API and client running: `pnpm dev`, seeded database.

### Task 11: Login page and protected routes (PR D, `feat/client-login`)

**Files:**
- Create: `client/src/auth/user.ts`, `client/src/auth/authApi.ts`, `client/src/auth/AuthContext.ts`, `client/src/auth/AuthProvider.tsx`, `client/src/auth/RequireAuth.tsx`
- Create: `client/src/components/auth/LoginForm.tsx`, `client/src/pages/LoginPage.tsx`
- Modify: `client/src/App.tsx`

**Interfaces:**
- Consumes: `errorMessage` (`client/src/api.ts`, with the auth messages from Task 4); `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` (Task 6). Existing shadcn components: `alert`, `button`, `card` (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`), `input`, `label`.
- Produces (used by Task 12):
  ```ts
  // auth/user.ts
  export type UserRole = 'member' | 'admin'
  export type PublicUser = { id: string; email: string; displayName: string; role: UserRole }
  export function isPublicUser(value: unknown): value is PublicUser
  // auth/authApi.ts
  export type LoginResult = { isSuccess: true; user: PublicUser } | { isSuccess: false; message: string }
  export function fetchCurrentUser(): Promise<PublicUser | null>
  export function postLogin(email: string, password: string): Promise<LoginResult>
  export function postLogout(): Promise<void>
  // auth/AuthContext.ts
  export type AuthContextValue = {
    user: PublicUser | null
    isLoading: boolean
    login: (email: string, password: string) => Promise<LoginResult>
    logout: () => Promise<void>
    dropUser: () => void
  }
  export const AuthContext: React.Context<AuthContextValue | null>
  export function useAuth(): AuthContextValue
  // auth/AuthProvider.tsx, auth/RequireAuth.tsx
  export function AuthProvider({ children }: { children: ReactNode }): JSX.Element
  export function RequireAuth({ children }: { children: ReactNode }): ReactNode
  ```

- [x] **Step 1: The user type and the API calls**

Create `client/src/auth/user.ts`:

```ts
// Copy of server/src/types.ts, see why there. Keep both in sync.
export type UserRole = 'member' | 'admin'

export type PublicUser = {
  id: string
  email: string
  displayName: string
  role: UserRole
}

const USER_ROLES: readonly UserRole[] = ['member', 'admin']

export function isPublicUser(value: unknown): value is PublicUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'email' in value &&
    typeof value.email === 'string' &&
    'displayName' in value &&
    typeof value.displayName === 'string' &&
    'role' in value &&
    USER_ROLES.some((role) => role === value.role)
  )
}
```

Create `client/src/auth/authApi.ts`:

```ts
import { errorMessage } from '@/api.ts'
import { isPublicUser, type PublicUser } from '@/auth/user.ts'

export type LoginResult =
  | { isSuccess: true; user: PublicUser }
  | { isSuccess: false; message: string }

// Both /login and /me answer { user }.
function readUser(body: unknown): PublicUser | null {
  if (typeof body === 'object' && body !== null && 'user' in body && isPublicUser(body.user)) {
    return body.user
  }
  return null
}

// null also on a network failure: the login page is where the user can retry.
export async function fetchCurrentUser(): Promise<PublicUser | null> {
  try {
    const res = await fetch('/api/auth/me')
    if (!res.ok) return null
    return readUser(await res.json())
  } catch {
    return null
  }
}

export async function postLogin(email: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    // Not JSON when the dev proxy answers for a stopped API.
    const data: unknown = await res.json().catch(() => null)
    const user = res.ok ? readUser(data) : null
    return user ? { isSuccess: true, user } : { isSuccess: false, message: errorMessage(data) }
  } catch {
    return { isSuccess: false, message: errorMessage(null) }
  }
}

// The client forgets the user even if the call fails: the next page load asks /me again.
export async function postLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // Ignored, see above.
  }
}
```

- [x] **Step 2: The context, the provider and the route guard**

Create `client/src/auth/AuthContext.ts`:

```ts
import { createContext, useContext } from 'react'
import type { LoginResult } from '@/auth/authApi.ts'
import type { PublicUser } from '@/auth/user.ts'

export type AuthContextValue = {
  user: PublicUser | null
  // True until /api/auth/me answers: the cookie is httpOnly, only the API knows the user.
  isLoading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
  // For a 401 from the API: the session ended on the server.
  dropUser: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (value === null) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
```

Create `client/src/auth/AuthProvider.tsx`:

```tsx
import { type JSX, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '@/auth/AuthContext.ts'
import { fetchCurrentUser, type LoginResult, postLogin, postLogout } from '@/auth/authApi.ts'
import type { PublicUser } from '@/auth/user.ts'

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCurrentUser().then((currentUser) => {
      setUser(currentUser)
      setIsLoading(false)
    })
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const result = await postLogin(email, password)
    if (result.isSuccess) setUser(result.user)
    return result
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    await postLogout()
    setUser(null)
  }, [])

  const dropUser = useCallback((): void => setUser(null), [])

  const value = useMemo(
    () => ({ user, isLoading, login, logout, dropUser }),
    [user, isLoading, login, logout, dropUser],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
```

Create `client/src/auth/RequireAuth.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@/auth/AuthContext.ts'

export function RequireAuth({ children }: { children: ReactNode }): ReactNode {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  // Redirecting before /api/auth/me answers would send a logged-in user to /login on reload.
  if (isLoading) return null
  if (user === null) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}
```

- [x] **Step 3: The login form and page**

Create `client/src/components/auth/LoginForm.tsx`:

```tsx
import { type JSX, type SubmitEvent, useState } from 'react'
import type { LoginResult } from '@/auth/authApi.ts'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'

type LoginFormProps = {
  onLogin: (email: string, password: string) => Promise<LoginResult>
}

export function LoginForm({ onLogin }: LoginFormProps): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  // On success the provider sets the user and LoginPage redirects: nothing to do here.
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setIsSending(true)
    const result = await onLogin(email, password)
    if (!result.isSuccess) {
      setError(result.message)
      setIsSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" size="lg" disabled={isSending}>
        {isSending ? 'Connexion…' : 'Se connecter'}
      </Button>
    </form>
  )
}
```

Create `client/src/pages/LoginPage.tsx`:

```tsx
import type { JSX } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@/auth/AuthContext.ts'
import { LoginForm } from '@/components/auth/LoginForm.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'

const HOME_PATH = '/'

// RequireAuth stores the page the user asked for; otherwise the upload page.
function requestedPath(state: unknown): string {
  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof state.from === 'string'
  ) {
    return state.from
  }
  return HOME_PATH
}

export default function LoginPage(): JSX.Element | null {
  const { user, isLoading, login } = useAuth()
  const location = useLocation()

  // A logged-in user must not see the form flash while /api/auth/me answers.
  if (isLoading) return null
  // Also right after a successful login: setting the user re-renders this page.
  if (user !== null) return <Navigate to={requestedPath(location.state)} replace />

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">FamilyFrame</CardTitle>
          <CardDescription>Connectez-vous pour envoyer des photos et voir le cadre.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm onLogin={login} />
        </CardContent>
      </Card>
    </main>
  )
}
```

- [x] **Step 4: The routes**

Replace `client/src/App.tsx` with:

```tsx
import type { JSX } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { RequireAuth } from './auth/RequireAuth.tsx'
import FramePage from './pages/FramePage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import UploadPage from './pages/UploadPage.tsx'

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <UploadPage />
              </RequireAuth>
            }
          />
          <Route
            path="/frame"
            element={
              <RequireAuth>
                <FramePage />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
```

- [ ] **Step 5: Gates and manual checks**

Run: `pnpm check && pnpm typecheck && pnpm build`
Expected: all green (run `pnpm check:fix` first if only import order or formatting differs).

Manual, in a private window (no cookie), `pnpm dev` running:
1. `http://localhost:5180/frame` → redirected to `/login`.
2. Wrong password → red alert "E-mail ou mot de passe incorrect."; the button comes back.
3. `membre@familyframe.test` / `membre-familyframe-dev` → back on `/frame` (the requested page), photos shown, live updates work (upload from a second tab logged in too).
4. Reload `/frame` → stays on `/frame` (no flash of `/login`).
5. Visit `/login` while logged in → redirected to `/`.
6. DevTools → Application → Cookies: `ff_session` is `HttpOnly`, `SameSite=Lax`, expires in ~90 days; `document.cookie` in the console does not show it.

- [x] **Step 6: Commit**

```bash
git add client/src/auth client/src/components/auth/LoginForm.tsx client/src/pages/LoginPage.tsx client/src/App.tsx
git commit -F <message-file>
```

Message: `feat(client): add the login page and protect the pages` + attribution lines.

---

### Task 12: Logout, upload without pseudo, expired sessions (PR D, `feat/client-login`)

**Files:**
- Modify: `client/src/api.ts` (export `UNAUTHORIZED_STATUS`)
- Create: `client/src/components/auth/LogoutButton.tsx`
- Modify: `client/src/pages/UploadPage.tsx`
- Modify: `client/src/hooks/usePhotoFeed.ts`

**Interfaces:**
- Consumes: `useAuth` (`user`, `logout`, `dropUser`) from Task 11; Socket.IO `connect_error` message `UNAUTHENTICATED` (Task 9); `POST /api/photos` without `uploaderName` (Task 8).
- Produces: `export const UNAUTHORIZED_STATUS = 401` in `client/src/api.ts`; `LogoutButton`; an upload page without pseudo; a frame that returns to `/login` when the session ends.

- [x] **Step 1: The shared status and the logout button**

In `client/src/api.ts`, after the `ERROR_MESSAGES` constant, add:

```ts
// UNAUTHENTICATED: the session ended on the server, the client drops its user.
export const UNAUTHORIZED_STATUS = 401
```

Create `client/src/components/auth/LogoutButton.tsx`:

```tsx
import { LogOutIcon } from 'lucide-react'
import type { JSX } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { Button } from '@/components/ui/button.tsx'

export function LogoutButton(): JSX.Element {
  const { logout } = useAuth()
  return (
    <Button type="button" variant="ghost" size="sm" onClick={logout}>
      <LogOutIcon aria-hidden data-icon="inline-start" />
      Se déconnecter
    </Button>
  )
}
```

- [x] **Step 2: The upload page**

Replace `client/src/pages/UploadPage.tsx` with:

```tsx
import { type ChangeEvent, type JSX, type SubmitEvent, useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { LogoutButton } from '@/components/auth/LogoutButton.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { errorMessage, UNAUTHORIZED_STATUS } from '../api.ts'

type Status = 'idle' | 'sending' | 'success' | 'error'

export default function UploadPage(): JSX.Element {
  const { user, dropUser } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  // A new key remounts the file inputs, which empties them.
  const [inputsKey, setInputsKey] = useState(0)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    setFile(event.target.files?.[0] ?? null)
    setStatus('idle')
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!file) return

    const body = new FormData()
    body.append('photo', file)

    setStatus('sending')
    try {
      const res = await fetch('/api/photos', { method: 'POST', body })
      // The session ended on the server: RequireAuth sends the user to /login.
      if (res.status === UNAUTHORIZED_STATUS) {
        dropUser()
        return
      }
      if (!res.ok) {
        // Not JSON when the dev proxy answers for a stopped API.
        const data: unknown = await res.json().catch(() => null)
        setError(errorMessage(data))
        setStatus('error')
        return
      }
      setStatus('success')
      setFile(null)
      setInputsKey((key) => key + 1)
    } catch {
      // fetch rejects only on network failure.
      setError(errorMessage(null))
      setStatus('error')
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">FamilyFrame</CardTitle>
          <CardDescription>
            Envoyez une photo au cadre de la famille, en tant que {user?.displayName}.
          </CardDescription>
          <CardAction>
            <LogoutButton />
          </CardAction>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="camera-photo">Prendre une photo</Label>
              <Input
                id="camera-photo"
                key={`camera-${inputsKey}`}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="gallery-photo">Choisir une image</Label>
              <Input
                id="gallery-photo"
                key={`gallery-${inputsKey}`}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            {previewUrl && (
              <img
                className="max-h-[40vh] w-full rounded-lg object-contain"
                src={previewUrl}
                alt="Aperçu avant envoi"
              />
            )}

            <Button type="submit" size="lg" disabled={!file || status === 'sending'}>
              {status === 'sending' ? 'Envoi…' : 'Envoyer'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {status === 'success' && (
        <Alert className="mt-4">
          <AlertDescription>Photo envoyée !</AlertDescription>
        </Alert>
      )}
      {status === 'error' && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </main>
  )
}
```

(Compared with the old file: the pseudo state, its `localStorage` helpers, its constant and its field are gone; `uploaderName` is no longer sent; the header shows the account name and the logout button; a 401 drops the user.)

- [x] **Step 3: The photo feed**

Replace `client/src/hooks/usePhotoFeed.ts` with:

```ts
import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { UNAUTHORIZED_STATUS } from '@/api.ts'
import { useAuth } from '@/auth/AuthContext.ts'
import { isPhoto, type Photo, type ServerToClientEvents } from '@/photo.ts'

// The message the server's Socket.IO middleware rejects a handshake with, like the HTTP code.
const UNAUTHENTICATED_SOCKET_ERROR = 'UNAUTHENTICATED'

// null keeps the photos already shown when a reload fails.
async function fetchPhotos(onUnauthenticated: () => void): Promise<Photo[] | null> {
  try {
    const res = await fetch('/api/photos')
    if (res.status === UNAUTHORIZED_STATUS) {
      onUnauthenticated()
      return null
    }
    const data: unknown = await res.json()
    if (Array.isArray(data) && data.every(isPhoto)) return data
    // Client and API images out of sync: say so instead of waiting forever.
    console.error('Unexpected photos payload from the API')
    return null
  } catch (error) {
    console.error('Could not load photos', error)
    return null
  }
}

// The fetch and the event can bring the same photo.
function withNewPhoto(photos: Photo[], photo: Photo): Photo[] {
  return photos.some(({ id }) => id === photo.id) ? photos : [photo, ...photos]
}

// Newest first, like GET /api/photos.
export function usePhotoFeed(): Photo[] {
  const { dropUser } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => {
    // Same origin: Vite proxies /socket.io to the API, the session cookie goes with it.
    const socket: Socket<ServerToClientEvents> = io()

    async function loadPhotos(): Promise<void> {
      const loadedPhotos = await fetchPhotos(dropUser)
      if (loadedPhotos) setPhotos(loadedPhotos)
    }

    // Reconnections too: catches photos sent while offline.
    socket.on('connect', loadPhotos)

    // Socket.IO does not retry a handshake its server refused: back to /login.
    socket.on('connect_error', ({ message }) => {
      if (message === UNAUTHENTICATED_SOCKET_ERROR) dropUser()
    })

    socket.on('photo:new', (photo) => {
      // Socket.IO types are a promise, not a check.
      if (!isPhoto(photo)) {
        console.error('Unexpected photo:new payload from the API')
        return
      }
      setPhotos((current) => withNewPhoto(current, photo))
    })

    // Reload rather than drop one photo: the next photo beyond the 20 latest fills the gap.
    socket.on('photo:deleted', loadPhotos)

    return () => {
      socket.disconnect()
    }
  }, [dropUser])

  return photos
}
```

- [ ] **Step 4: Gates and manual checks**

Run: `pnpm check && pnpm typecheck && pnpm build`
Expected: all green.

Manual (`pnpm dev`, logged in as the member):
1. `/` shows "Envoyez une photo au cadre de la famille, en tant que Membre." and "Se déconnecter"; no pseudo field.
2. Upload a photo → "Photo envoyée !"; on `/frame` (another tab) it appears live with caption "Membre".
3. "Se déconnecter" → `/login`; DevTools shows the `ff_session` cookie gone; `/frame` redirects to `/login`.
4. Expired session on an open frame: log in, open `/frame`, then in another terminal `pnpm db:seed` (wipes the sessions) and stop/start the API (`pnpm dev`) so the socket reconnects → the frame lands on `/login` (handshake refused with `UNAUTHENTICATED`, or the reload gets a 401).
5. Same on `/`: after `pnpm db:seed`, an upload attempt lands on `/login`. Log in again afterwards (the seed recreated the accounts).

- [x] **Step 5: Commit (two commits)**

```bash
git add client/src/api.ts client/src/components/auth/LogoutButton.tsx client/src/pages/UploadPage.tsx
git commit -F <message-file>
```

Message: `feat(client): log out and drop the pseudo field` + attribution lines. Body: one line: the server now names the uploader after the account.

```bash
git add client/src/hooks/usePhotoFeed.ts
git commit -F <message-file>
```

Message: `feat(client): send the frame back to login when the session ends` + attribution lines.

---

### Task 13: Document the login page (PR D, `feat/client-login`)

**Files:**
- Modify: `README.md`, `ARCHITECTURE.md`

**Interfaces:**
- Consumes: the behavior of Tasks 11-12.
- Produces: docs matching the client.

- [x] **Step 1: README**

In `README.md`, replace the intro sentence (first paragraph under the title) with:

```markdown
Cadre photo connecté pour les familles éloignées : un proche se connecte à son compte, prend une photo depuis son smartphone, et elle apparaît en temps réel sur le cadre installé chez ses grands-parents — sans rechargement.
```

In the services table, add after the `Cadre` row:

```markdown
| Connexion     | http://localhost:5180/login |
```

and add below the table: `` Sans session, l'envoi et le cadre redirigent vers `/login` ; le cadre se connecte une fois avec un compte et reste connecté (session glissante de 90 jours). ``

- [x] **Step 2: ARCHITECTURE pages**

In `ARCHITECTURE.md` `## Pages`, replace the table with:

```markdown
| Chemin   | Page                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------- |
| `/login` | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                           |
| `/`      | envoi : « Prendre une photo » ou « Choisir une image », au nom du compte connecté ; « Se déconnecter » |
| `/frame` | cadre : dernière photo en grand, les précédentes en vignettes, chacune avec « Supprimer »            |
```

Add after the table:

```markdown
`/` et `/frame` sont enveloppées dans `RequireAuth` (`client/src/auth/`) : sans utilisateur, redirection vers `/login` en gardant la page demandée. `AuthProvider` appelle `GET /api/auth/me` une fois au chargement (le cookie est `httpOnly`, seul le serveur sait qui est connecté) et oublie l'utilisateur quand l'API répond 401 ou que Socket.IO refuse la connexion (`UNAUTHENTICATED`).
```

In the `## Vue d'ensemble` paragraph, replace `Deux interfaces React (envoi, cadre)` with `Trois pages React (connexion, envoi, cadre)`, and in `## Organisation du dépôt` replace `` `client/` : les deux interfaces React (envoi, cadre), servies par Vite. `` with `` `client/` : les pages React (connexion, envoi, cadre), servies par Vite. ``

- [x] **Step 3: Check and commit**

Run: `pnpm check`
Expected: green (if the hook rejects a `.md` file, run `pnpm exec biome format --write README.md ARCHITECTURE.md`).

```bash
git add README.md ARCHITECTURE.md
git commit -F <message-file>
```

Message: `docs: describe the login page` + attribution lines.

---

## Final verification (controller)

- [x] `pnpm check && pnpm typecheck && pnpm build && pnpm test` on `feat/client-login`: green, `Tests  70 passed (70)`.
- [x] `pnpm test:bruno` against the running API: 24/24.
- [ ] The spec's manual scenario: `pnpm db:seed`, log in on `/login`, upload, the frame updates live, log out, `/frame` redirects to `/login`.
- [x] `git log --oneline develop..feat/client-login`: one concern per commit; no `.env` file in any diff (`git diff --stat develop..feat/client-login`).
- [ ] Fresh-context review of the whole stack diff (`superpowers:requesting-code-review`), then `gh stack submit --auto` (draft PRs) and `gh stack view --json`.

---

## Drift Log

Format: `date · task/step · what the plan said · what was done · why`.

| Date | Task / step | Plan said | Done | Why |
| ---- | ----------- | --------- | ---- | --- |
| 2026-11-23 | Task 1 | `argon2` may need `onlyBuiltDependencies` | kept in `ignoredBuiltDependencies`: the prebuilt binary loads | argon2 0.45 ships prebuilds; no native build needed |
| 2026-11-23 | Task 2 | `pnpm db:seed` on the dev database | run on the shared Atlas dev database; it wiped the photos of the other session working on the frame, which re-uploaded them | one dev database for both sessions |
| 2026-11-23 | Task 6 | `extendSession` with `update` | `updateMany` (controller fix d4b1d27); Bruno `login/04` uses `{{memberEmail}}` (ebe89c9) | a session deleted by a concurrent logout made `update` throw P2025 |
| 2026-11-23 | after Task 6 | stack based on develop at plan time | `gh stack rebase` onto develop f982944 (frame library, #40–#45); no conflicts | another session merged its frame stack |
| 2026-11-23 | Tasks 6–9 | Bruno and manual checks against the API on port 3000 | the controller ran its test API on port 3001 (implementers 3002) with `--env-var baseUrl=...` | port 3000 belonged to the other session's API |
| 2026-11-23 | Task 9 | socket middleware with `.then` | `await` in `try/catch`, `join`/`next` outside it (controller fix b9c91a2); docs list the handshake `SERVER_ERROR` (65e34de) | a throw after `next` hung the handshake |
| 2026-11-24 | Task 13 | `/frame` row text from the plan | kept the current frame library description (controller amend, 2d506fd) | the plan text predates the frame library feature |
| 2026-11-24 | Tasks 11–13 | — | implementer commits may carry the implementer model in `Co-Authored-By` | the PRs are squash-merged; the squash message carries the final attribution |
| 2026-11-24 | final review | — | fix wave: frame reloads photos daily so its session slides (f28a0cb); `/api/auth/me` unreachable (network, 5xx, bad body) is retried every 5 s instead of sending the frame to `/login` (3da91bb); session check extracted so every function is ≤ 30 lines (f28a0cb, 4a39ac0); login error cleared on resubmit, `@/` import (4b85f63); docs paths, SPA fallback `/login`, `Secure` cookie note for J2 (2fd84e0) | two Important findings about an unattended frame, plus the 30-line rule |
| 2026-11-24 | final review | — | deferred: logging in again leaves the previous session of that browser valid; an already-open socket is not re-checked when its session expires or is logged out (documented); blank page while the session check waits | out of this step's scope; left for the author to triage |
| 2026-11-24 | Tasks 11–12, final verification | manual browser checks | not run by the agents: left unchecked for the author (login, logout, upload, live frame, `/frame` redirect, API down at boot then up) | the author tests the UI locally before merge |

---

## Self-review (done while writing the plan)

**1. Spec coverage**

| Spec item | Task |
| --- | --- |
| `argon2`, `lib/password.ts` (only importer, argon2id defaults) | 1 |
| `Role` / `User` / `Session` schema, `Photo` unchanged | 2 |
| Seed: refuses in production, wipes sessions/photos/users, 2 accounts, `seed.done` without credentials, root + server scripts | 2 |
| README: `pnpm db:seed` in setup and scripts, the two accounts | 2 (and 13 for the login page) |
| `lib/session-token.ts` (`SESSION_COOKIE`, `generateToken`, `hashToken`, `readSessionToken`) + its unit tests | 3 |
| `UNAUTHENTICATED` 401, `INVALID_CREDENTIALS` 401, `BODY_INVALID` 400, `entity.parse.failed` → `BODY_INVALID` + test | 4 |
| Public user DTO in `types.ts` (server and client copies) | 4, 11 |
| Repository functions; service `login` / `logout` / `authenticate` with deps `repository, hashToken, generateToken, verifyPassword, now, logger`; dummy hash; purge at login; delete when expired; sliding below 45 days; log events | 5 (signature split: see Choices) |
| All unit cases listed in the spec's Testing section | 5 (+ 3, 4, 8) |
| Cookie flags, `requireAuth`, `req.user` declaration merging, `currentUser`, routes `login` / `logout` / `me`, `express.json()` on the auth router only | 6 |
| Bruno `auth/` first, `sessionCookie` from `set-cookie`, wrong password, unknown email (same body), malformed JSON, `me` with/without cookie, logout then old cookie 401, final login, collection-level `Cookie` header, member credentials in `Local.bru` | 6 |
| `requireAuth` in front of `/api/photos`, `/api/health` public, one `photos/list` request without cookie → 401 | 7 |
| `uploaderName` from the user's `displayName`; photos service test updated | 8 |
| Socket.IO `io.use`, cookie from the handshake, no sliding, `Error('UNAUTHENTICATED')`, `socket.data.userId`, room `user:<id>`, `socket.connected` with `userId` | 9 |
| ARCHITECTURE: Authentification section, log events, three error codes | 10 |
| `.env.example`: no new variable | nothing to do (`NODE_ENV` is not added there) |
| Client: `AuthProvider` (`/me` once, `user`, `login`, `logout`), `RequireAuth` keeping the requested path, `LoginPage` with `errorMessage`, `/` and `/frame` wrapped | 11 |
| Logout button on `UploadPage`, no pseudo field, `usePhotoFeed` drops the user on `connect_error UNAUTHENTICATED` and on a 401 | 12 |
| New messages in `api.ts` for the three codes | 4 (moved: see Choices) |
| Delivery: 4 PRs, `gh stack add` at task boundaries | Stack section, banners before Tasks 3, 7, 11 |
| Out of scope (roles enforcement, ownership, password change, rate limiting) | not planned |

No gap found.

**2. Placeholder scan:** no "TBD", "TODO", "similar to Task N" or step without its content. `<message-file>` is the path of the commit message file the implementer writes (same convention as the previous plans). Docs steps give the exact text to insert.

**3. Type consistency:** `AuthService` methods (`login`, `logout`, `authenticate`, `authenticateAndSlide`) and `AuthenticatedSession.isRenewed` are used with these names in Tasks 6 and 9; `SessionWithUser`, `UserRecord`, `NewSession` match between the repository, the service and its test; `createApp(io, authService)` and `assembleAuthService()` match between Tasks 6, 7 and 9; `SocketServer` / `SocketMiddleware` / `SocketData` / `InterServerEvents` are defined in Task 9 before use; client `LoginResult.isSuccess`, `AuthContextValue.dropUser` and `UNAUTHORIZED_STATUS` match between Tasks 11 and 12. Test counts: 39 → 43 (T1) → 51 (T3) → 54 (T4) → 76 (T5) → 70 (T8). Bruno counts: 15 → 25 (T6) → 26 (T7) → 24 (T8).
