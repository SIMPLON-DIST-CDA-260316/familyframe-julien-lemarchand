# Step 1: accounts and sessions

- Date: 2026-11-23
- Scope: step 1 of `2026-11-23-accounts-sharing-overview.md`. Accounts, sessions, seed, every business route and Socket.IO behind a session, client login.
- AI usage: designed with the `superpowers:brainstorming` skill (decisions in the overview); the details below were written by the AI from those decisions and the author's goal text.
- Builds on: `2026-11-23-backend-layers-errors-design.md` (factories, `AppError`, `toErrorResponse`), `2026-11-23-server-logging-design.md` (logger, event names, no PII).

## Goal

Nobody uses the app without an account. A user logs in with email and password, gets a 90-day sliding session in an `httpOnly` cookie, and every photo route and the Socket.IO connection require it. Photos stay one shared feed in this step: ownership arrives in step 2.

## Decisions

| Topic            | Decision                                                                                                                                                                                     | Main reason                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Cookie parsing   | a small `readSessionToken(cookieHeader)` in `lib/session-token.ts`, used by Express and Socket.IO; no `cookie-parser`                                                                        | Socket.IO receives a raw `IncomingMessage`; one function serves both; one dependency fewer (`cookie-parser` was allowed, not required) |
| Token            | 32 bytes from `crypto.randomBytes`, hex in the cookie, SHA-256 hex in `Session.tokenHash`                                                                                                    | unguessable without signing; a database leak opens no session                                                                          |
| Cookie           | name `ff_session`, `httpOnly`, `SameSite=Lax`, `Secure` when `NODE_ENV=production`, `path=/`, `maxAge` 90 days                                                                               | not readable by JavaScript; sent by the Vite proxy (same origin in dev)                                                                |
| Sliding          | on each authenticated HTTP request, when less than 45 days remain, `expiresAt` = now + 90 days and the cookie is set again                                                                   | a frame in use never logs out; at most one write every 45 days                                                                         |
| Expired sessions | deleted when read; all expired sessions deleted at each successful login                                                                                                                     | Prisma 6 cannot declare a Mongo TTL index; no scheduled job                                                                            |
| JSON body        | `express.json()` mounted on the auth router only; a malformed body answers `400 BODY_INVALID`                                                                                                | the logging spec removed the global parser and asked a JSON route to bring its own code                                                |
| Login errors     | unknown email and wrong password both answer `401 INVALID_CREDENTIALS`; an unknown email still runs one `argon2.verify` against a fixed dummy hash                                           | no account enumeration by message or timing                                                                                            |
| Current user     | `requireAuth` sets `req.user` (declaration merging on Express `Request`), `currentUser(req)` returns it or throws `UNAUTHENTICATED`                                                          | typed without `as` casts                                                                                                               |
| Role type        | Prisma `enum Role { member admin }`                                                                                                                                                          | Prisma generates a string literal union; validated by the database                                                                     |
| Admin guard      | not in this step: `requireRole` and `FORBIDDEN` arrive with the first admin route (step 3)                                                                                                   | YAGNI                                                                                                                                  |
| Socket.IO        | `io.use` reads the cookie from `socket.request.headers.cookie`, validates the session (no sliding), rejects with `Error('UNAUTHENTICATED')`, sets `socket.data.userId` and joins `user:<id>` | same session rules; rooms ready for step 2; broadcasting stays global in this step                                                     |

## Server

### Data

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

`Photo` is unchanged in this step.

### Modules

- `lib/password.ts`: `hashPassword(plain)` and `verifyPassword(hash, plain)` around `argon2` (argon2id, library defaults). The only file importing `argon2`.
- `lib/session-token.ts`: `SESSION_COOKIE = 'ff_session'`, `generateToken()`, `hashToken(token)`, `readSessionToken(cookieHeader: string | undefined): string | null` (finds `ff_session=` among `;`-separated pairs, returns `null` when missing or empty).
- `features/auth/`:
  - `auth.repository.ts`: `findUserByEmail`, `findSessionByTokenHash` (with its user), `createSession`, `extendSession`, `deleteSession`, `deleteExpiredSessions(now)`.
  - `auth.service.ts`: `createAuthService(deps)` with deps `repository`, `hashToken`, `generateToken`, `verifyPassword`, `now: () => Date`, `logger`.
    - `login({ email, password })`: validates both are non-empty strings (`INVALID_CREDENTIALS` otherwise), lowercases and trims the email, verifies the password (dummy hash when the user is unknown), purges expired sessions, creates a session; returns `{ user, token, expiresAt }`. Logs `auth.login_succeeded` (`userId`) or `auth.login_failed` (warn, no data: never the email).
    - `logout(token | null)`: deletes the session when it exists; idempotent. Logs `auth.logged_out` (`userId`) when a session was deleted.
    - `authenticate(token | null, { slide })`: returns `{ user, expiresAt }` or throws `UNAUTHENTICATED`; deletes the session when expired; with `slide: true`, extends it when less than 45 days remain and returns the new `expiresAt` and `renewed: true`.
  - `auth.middleware.ts`: `createRequireAuth(service)` → Express middleware: reads the token from `req.headers.cookie`, calls `authenticate(token, { slide: true })`, sets the cookie again when renewed, sets `req.user`. `currentUser(req)`.
  - `auth.controller.ts` / `auth.routes.ts`: `POST /api/auth/login` (200 `{ user }` + `Set-Cookie`), `POST /api/auth/logout` (204, clears the cookie, works without a session), `GET /api/auth/me` (behind `requireAuth`, 200 `{ user }`).
- Public user DTO: `{ id, email, displayName, role }`, in `types.ts` (server and client copies). Never the hash.
- `app.ts`: auth router mounted at `/api/auth`; `requireAuth` in front of `/api/photos`. `/api/health` stays public.
- `server.ts`: `io.use(createSocketAuth(service))` (in `features/auth/auth.socket.ts`) before `connection`; `socket.connected` logs gain `userId`.
- New error codes: `UNAUTHENTICATED` 401, `INVALID_CREDENTIALS` 401, `BODY_INVALID` 400. `toErrorCode` maps the JSON parser error (`type === 'entity.parse.failed'`) to `BODY_INVALID`.

### Seed

`server/prisma/seed.ts`, run with `pnpm db:seed` (root script → `pnpm --filter server db:seed` → `tsx --env-file-if-exists=.env prisma/seed.ts`):

- refuses to run when `NODE_ENV=production` (exit 1 with a log line);
- deletes every `Session`, `Photo` and `User`;
- creates `admin@familyframe.test` (role `admin`, display name "Admin") and `membre@familyframe.test` (role `member`, display name "Membre"), with fixed dev passwords written in the seed file and the README;
- logs `seed.done` with the number of users, never the credentials.

The seed does not delete Cloudinary images: the old ones stay unreferenced.

## Client

- `client/src/auth/`: an `AuthProvider` that loads `GET /api/auth/me` once (`loading` → `user | null`), exposes `user`, `login(email, password)`, `logout()`; a `RequireAuth` route wrapper that redirects to `/login` (keeping the requested path) when there is no user.
- `LoginPage` at `/login`: email, password, submit, error message from `errorMessage`; redirects to the requested page after login.
- `/` and `/frame` are wrapped in `RequireAuth`. A logout button on `UploadPage`.
- The upload form drops its "pseudo" field: the server fills `uploaderName` with the user's `displayName` until step 2 removes the field.
- `usePhotoFeed`: on Socket.IO `connect_error` with message `UNAUTHENTICATED`, and on a 401 from `/api/photos`, the provider drops the user, which redirects to `/login`.
- New messages in `api.ts` for the three codes.

## Testing

- Unit (`auth.service.test.ts`, colocated, `vi.fn()` fakes): login nominal (email normalized, session created, purge called, token returned); unknown email → `INVALID_CREDENTIALS` and `verifyPassword` still called; wrong password; missing or non-string fields; log events carry no email; logout with and without a session; authenticate: missing token, unknown token, expired (session deleted), valid without renewal, valid with renewal (`extendSession` called, `renewed: true`), `slide: false` never extends.
- Unit `session-token.test.ts`: `readSessionToken` on missing header, other cookies only, our cookie among others, empty value; `hashToken` is stable and 64 hex characters.
- Unit `error-handler.test.ts`: the JSON parser error → 400 `BODY_INVALID`.
- Photos service test: `uploaderName` now comes from the controller; unchanged behavior.
- Bruno, new `auth/` folder (first in the run): `login/` nominal (stores the cookie in a `sessionCookie` runtime variable from `set-cookie`), wrong password, unknown email (same body), malformed JSON (400 `BODY_INVALID`); `me/` nominal and without cookie (401); `logout/` nominal then `me` with the old cookie (401), then a final login so the next folders have a session. Every photos request sends `Cookie: {{sessionCookie}}` (collection-level header); one `photos/list` request without cookie → 401. Test credentials of the seeded member live in `environments/Local.bru`.
- Manual: `pnpm db:seed`, log in on `/login`, upload, frame updates live, logout, `/frame` redirects to `/login`.

## Docs

- README: `pnpm db:seed` in setup and scripts table, the two test accounts.
- ARCHITECTURE: an "Authentification" section (session flow, cookie, sliding, Socket.IO), the new log events, the three error codes.
- `.env.example`: no new variable.

## Delivery

A `gh stack` of four draft PRs, each green on `pnpm check`, `typecheck`, `build`, `test`, `test:bruno`:

| PR  | Branch               | Scope                                                                                                                   |
| --- | -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| A   | `feat/auth-accounts` | Both specs, `argon2`, `User`/`Session`/`Role` schema, `lib/password.ts`, seed + root script, README                     |
| B   | `feat/auth-sessions` | `lib/session-token.ts`, auth repository/service/controller/routes, `BODY_INVALID`, unit tests, Bruno `auth/`            |
| C   | `feat/auth-guard`    | `requireAuth` on photos, Socket.IO auth and rooms, `uploaderName` from the user, Bruno photos with cookie, ARCHITECTURE |
| D   | `feat/client-login`  | `AuthProvider`, `RequireAuth`, `LoginPage`, logout, 401 handling, upload form without pseudo                            |

## Out of scope

Roles enforcement (`FORBIDDEN`, step 3), photo ownership (step 2), password change, login rate limiting.
