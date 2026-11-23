---
plan: backend-layers-errors
status: in-progress
spec: docs/superpowers/specs/2026-11-23-backend-layers-errors-design.md
branch: refactor/error-handling (PR A), refactor/photos-repository (PR B), refactor/photos-layers (PR C)
worktree: false
tasks_total: 8
tasks_done: 2
current_task: 3
last_commit: 6887e6d
last_updated: 2026-11-23
---

# Backend Layers and Error Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Working agreement (mandatory):** keep this plan in sync with reality. Check a step only when it is finished and its gate is green. Append every divergence to the Drift Log. Update the frontmatter (`tasks_done`, `current_task`, `last_commit`, `last_updated`) at each task boundary. When a drift produces a durable correction (path, command, signature, decision), amend the affected task block in place and log the amendment. Never check a partial step; never delete a finished step or a drift entry.

**Goal:** Split the photos backend into route, middleware, controller, service and repository layers, and answer every error from one central handler, without changing the API contract except one added code (`ROUTE_NOT_FOUND`).

**Architecture:** Feature folder `server/src/features/photos/` with one file per layer, wired by factory functions in `app.ts`. Errors are a single `AppError` class carrying an `ApiErrorCode`; `errors/error-handler.ts` maps codes to HTTP statuses through an exhaustive `Record`. Three stacked PRs: A (errors), B (lib move, repository, upload config), C (service, controller, routes).

**Tech Stack:** Express 5, Socket.IO 4, Prisma 6 (MongoDB), Multer 2, sharp, Cloudinary SDK, TypeScript 7 (`nodenext`, `strict`), Biome, Bruno CLI.

## Global Constraints

- No new dependency. Vitest and the logging strategy are out of scope (later specs).
- API contract unchanged: routes, statuses, existing error codes, DTO `{ id, url, uploaderName, createdAt }`. Only addition: `ROUTE_NOT_FOUND` (404).
- Error body is always `{ "error": ApiErrorCode }`; a 500 never carries error details.
- Keep the existing `console.error` calls (500 details, orphaned Cloudinary image) as they are.
- TypeScript rules (AGENTS.md): no `as` casts, explicit return types on exported functions, literal unions rather than `enum`.
- Code rules (`.claude/rules/`): comment why, never what; no file-summary comments; name callback params after the item; no magic numbers.
- Imports use the `.js` extension (`nodenext`).
- Every commit passes `pnpm check` and `pnpm typecheck`. Every task ends green on `pnpm test:bruno` against the running API (`pnpm dev`; `tsx watch` reloads on save).
- Commit messages: Conventional Commits in English, written to a file and passed with `git commit -F` (the `.env` guard blocks some inline messages). End each message with the session's attribution lines.
- Stacked PRs: retarget the next PR to `develop` before merging its base (CONTRIBUTING). Force pushes are run by the author.

## File Map

| File                                              | Task       | Responsibility                                |
| ------------------------------------------------- | ---------- | --------------------------------------------- |
| `server/src/errors/app-error.ts`                  | 1          | `AppError` class                              |
| `server/src/errors/error-handler.ts`              | 1, 2       | the only place that writes an error response  |
| `server/src/errors/not-found.ts`                  | 2          | unknown route → `AppError('ROUTE_NOT_FOUND')` |
| `server/src/types.ts`                             | 2          | add `ROUTE_NOT_FOUND` to `ApiErrorCode`       |
| `client/src/api.ts`                               | 2          | client copy of the code + French message      |
| `server/bruno/not-found/*`                        | 2          | Bruno request for the 404                     |
| `server/src/lib/{db,cloudinary,image}.ts`         | 3          | moved unchanged                               |
| `server/src/features/photos/photos.repository.ts` | 4          | Prisma access                                 |
| `server/src/features/photos/photos.upload.ts`     | 5          | Multer config                                 |
| `server/src/features/photos/photos.service.ts`    | 6          | business rules                                |
| `server/src/features/photos/photos.controller.ts` | 7          | HTTP + Socket.IO output                       |
| `server/src/features/photos/photos.routes.ts`     | 7          | paths + upload middleware                     |
| `server/src/photos.ts`                            | 1–7        | shrinks task by task, deleted in Task 7       |
| `server/src/app.ts`                               | 1, 2, 4, 7 | wiring                                        |
| `ARCHITECTURE.md`                                 | 2, 8       | error table, layers                           |

---

## PR A: centralized errors (branch `refactor/error-handling`, base `develop`)

The branch exists and already holds the spec commit (`f646463`).

### Task 1: AppError and the central error handler

**Files:**

- Create: `server/src/errors/app-error.ts`
- Create: `server/src/errors/error-handler.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/photos.ts`

**Interfaces:**

- Consumes: `ApiErrorCode`, `ApiError` from `server/src/types.ts`.
- Produces: `class AppError extends Error { readonly code: ApiErrorCode }` (constructor `new AppError(code: ApiErrorCode)`); `errorHandler(error: unknown, req: Request, res: Response, next: NextFunction): void`.

- [x] **Step 1: Create `server/src/errors/app-error.ts`**

```ts
import type { ApiErrorCode } from '../types.js'

export class AppError extends Error {
  readonly code: ApiErrorCode

  constructor(code: ApiErrorCode) {
    super(code)
    this.name = 'AppError'
    this.code = code
  }
}
```

- [x] **Step 2: Create `server/src/errors/error-handler.ts`**

```ts
import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import type { ApiError, ApiErrorCode } from '../types.js'
import { AppError } from './app-error.js'

const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UPLOADER_NAME_INVALID: 400,
  PHOTO_MISSING: 400,
  UPLOAD_INVALID: 400,
  PHOTO_TOO_LARGE: 413,
  FORMAT_UNSUPPORTED: 415,
  IMAGE_UNREADABLE: 422,
  SERVER_ERROR: 500,
}

function toErrorCode(error: unknown): ApiErrorCode {
  if (error instanceof AppError) {
    return error.code
  }
  if (error instanceof multer.MulterError) {
    return error.code === 'LIMIT_FILE_SIZE' ? 'PHOTO_TOO_LARGE' : 'UPLOAD_INVALID'
  }
  return 'SERVER_ERROR'
}

// Express spots an error handler by its 4 parameters.
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const code = toErrorCode(error)
  if (code === 'SERVER_ERROR') {
    console.error(error)
  }
  const body: ApiError = { error: code }
  res.status(HTTP_STATUS_BY_CODE[code]).json(body)
}
```

- [x] **Step 3: Use it in `server/src/app.ts`**

Replace the whole file with:

```ts
import cors from 'cors'
import express, { type Express } from 'express'
import type { Server } from 'socket.io'
import { config } from './config.js'
import { errorHandler } from './errors/error-handler.js'
import { createPhotosRouter } from './photos.js'
import type { ClientToServerEvents, ServerToClientEvents } from './types.js'

export function createApp(io: Server<ClientToServerEvents, ServerToClientEvents>): Express {
  const app = express()

  app.use(cors({ origin: config.clientOrigin }))
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/photos', createPhotosRouter(io))

  app.use(errorHandler)

  return app
}
```

- [x] **Step 4: Make `server/src/photos.ts` throw instead of answering**

Replace the whole file with:

```ts
import type { Photo as PhotoRow } from '@prisma/client'
import { Router } from 'express'
import multer from 'multer'
import type { Server } from 'socket.io'
import { uploadImage } from './cloudinary.js'
import { prisma } from './db.js'
import { AppError } from './errors/app-error.js'
import { toFrameJpeg } from './image.js'
import type { ClientToServerEvents, Photo, ServerToClientEvents } from './types.js'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_UPLOADER_NAME_LENGTH = 30
const MAX_PHOTOS = 20
const ALLOWED_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp']

// In memory: the file goes to sharp, never to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
})

// cloudinaryId stays on the server.
function toPhotoDto(row: PhotoRow): Photo {
  return {
    id: row.id,
    url: row.url,
    uploaderName: row.uploaderName,
    createdAt: row.createdAt.toISOString(),
  }
}

export function createPhotosRouter(io: Server<ClientToServerEvents, ServerToClientEvents>): Router {
  const router = Router()

  router.get('/', async (_req, res) => {
    const rows = await prisma.photo.findMany({ orderBy: { createdAt: 'desc' }, take: MAX_PHOTOS })
    res.json(rows.map(toPhotoDto))
  })

  router.post('/', upload.single('photo'), async (req, res) => {
    const rawUploaderName: unknown = req.body?.uploaderName
    const uploaderName = typeof rawUploaderName === 'string' ? rawUploaderName.trim() : ''
    if (uploaderName.length === 0 || uploaderName.length > MAX_UPLOADER_NAME_LENGTH) {
      throw new AppError('UPLOADER_NAME_INVALID')
    }

    if (!req.file) {
      throw new AppError('PHOTO_MISSING')
    }

    // Cheap first filter: the browser's mimetype can lie, sharp checks for real.
    if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
      throw new AppError('FORMAT_UNSUPPORTED')
    }

    let jpeg: Buffer
    try {
      jpeg = await toFrameJpeg(req.file.buffer)
    } catch {
      throw new AppError('IMAGE_UNREADABLE')
    }

    // Cloudinary or database errors reach the error handler as 500s.
    const image = await uploadImage(jpeg)
    let row: PhotoRow
    try {
      row = await prisma.photo.create({ data: { ...image, uploaderName } })
    } catch (error) {
      console.error(`Photo saved on Cloudinary but not in the database: ${image.cloudinaryId}`)
      throw error
    }

    const photo = toPhotoDto(row)
    io.emit('photo:new', photo)
    res.status(201).json(photo)
  })

  return router
}
```

- [x] **Step 5: Run the checks**

Run: `pnpm check && pnpm typecheck`
Expected: `No fixes applied.` / both typechecks `Done`. If Biome reformats, run `pnpm check:fix` and re-run.

- [x] **Step 6: Run Bruno against the running API**

Run: `pnpm test:bruno`
Expected: `Status ✓ PASS`, `Requests 10 (10 Passed)`, `Assertions 24/24`. The 400/415/422 cases now go through `errorHandler`.

- [x] **Step 7: Commit**

```bash
git add server/src/errors server/src/app.ts server/src/photos.ts
git commit -F <message-file>
```

Message: `refactor(server): centralize error handling with AppError` — body: routes throw an `AppError` carrying an `ApiErrorCode`; `errors/error-handler.ts` is the only place that writes an error response, with statuses from an exhaustive `Record`; `sendError` is removed.

### Task 2: ROUTE_NOT_FOUND for unknown routes

**Files:**

- Create: `server/src/errors/not-found.ts`
- Create: `server/bruno/not-found/folder.bru`
- Create: `server/bruno/not-found/01-edge-route-inconnue.bru`
- Modify: `server/src/types.ts` (union `ApiErrorCode`)
- Modify: `server/src/errors/error-handler.ts` (`HTTP_STATUS_BY_CODE`)
- Modify: `server/src/app.ts`
- Modify: `client/src/api.ts`
- Modify: `ARCHITECTURE.md` (error table)

**Interfaces:**

- Consumes: `AppError` (Task 1), `errorHandler` (Task 1).
- Produces: `notFound(): never`; `ApiErrorCode` gains `'ROUTE_NOT_FOUND'`.

- [x] **Step 1: Write the Bruno request first (it must fail)**

`server/bruno/not-found/folder.bru`:

```
meta {
  name: not-found
}

docs {
  Toute route inconnue répond 404 `{ "error": "ROUTE_NOT_FOUND" }`, au même format que les autres erreurs.
}
```

`server/bruno/not-found/01-edge-route-inconnue.bru`:

```
meta {
  name: Edge - route inconnue
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/api/inconnue
  body: none
  auth: none
}

assert {
  res.status: eq 404
  res.body.error: eq ROUTE_NOT_FOUND
}

docs {
  EDGE → 404 ROUTE_NOT_FOUND, au format JSON des erreurs (et non la page HTML par défaut d'Express).
}
```

- [x] **Step 2: Run Bruno to see it fail**

Run: `pnpm test:bruno`
Expected: FAIL on `Edge - route inconnue` (`res.body.error` undefined: Express answers its HTML 404). The 10 other requests pass.

- [x] **Step 3: Add the code to the server union**

In `server/src/types.ts`, the union becomes:

```ts
export type ApiErrorCode =
  | 'UPLOADER_NAME_INVALID'
  | 'PHOTO_MISSING'
  | 'UPLOAD_INVALID'
  | 'ROUTE_NOT_FOUND'
  | 'PHOTO_TOO_LARGE'
  | 'FORMAT_UNSUPPORTED'
  | 'IMAGE_UNREADABLE'
  | 'SERVER_ERROR'
```

- [x] **Step 4: Run typecheck to see the exhaustive Record catch it**

Run: `pnpm typecheck`
Expected: FAIL in `server/src/errors/error-handler.ts`: property `ROUTE_NOT_FOUND` is missing in `HTTP_STATUS_BY_CODE`.

- [x] **Step 5: Map it to 404**

In `server/src/errors/error-handler.ts`, `HTTP_STATUS_BY_CODE` becomes:

```ts
const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UPLOADER_NAME_INVALID: 400,
  PHOTO_MISSING: 400,
  UPLOAD_INVALID: 400,
  ROUTE_NOT_FOUND: 404,
  PHOTO_TOO_LARGE: 413,
  FORMAT_UNSUPPORTED: 415,
  IMAGE_UNREADABLE: 422,
  SERVER_ERROR: 500,
}
```

- [x] **Step 6: Create `server/src/errors/not-found.ts`**

```ts
import { AppError } from './app-error.js'

export function notFound(): never {
  throw new AppError('ROUTE_NOT_FOUND')
}
```

- [x] **Step 7: Mount it in `server/src/app.ts`, after the routes and before the error handler**

```ts
import { notFound } from './errors/not-found.js'
```

```ts
app.use('/api/photos', createPhotosRouter(io))

app.use(notFound)
app.use(errorHandler)
```

- [x] **Step 8: Add the client copy and its French message**

In `client/src/api.ts`, add `| 'ROUTE_NOT_FOUND'` after `'UPLOAD_INVALID'` in the union, and in `ERROR_MESSAGES`, after `UPLOAD_INVALID`:

```ts
  ROUTE_NOT_FOUND: "Cette adresse n'existe pas sur le serveur.",
```

- [x] **Step 9: Document the code in `ARCHITECTURE.md`**

In the error table, after the `UPLOAD_INVALID` row:

```
| route inconnue                                          | 404    | `ROUTE_NOT_FOUND`       |
```

Then run `pnpm check:fix` (Biome realigns the Markdown table).

- [x] **Step 10: Run all gates**

Run: `pnpm check && pnpm typecheck && pnpm test:bruno`
Expected: checks green; Bruno `Requests 11 (11 Passed)`, `Assertions 26/26`.

- [x] **Step 11: Commit**

```bash
git add server/src/errors server/src/types.ts server/src/app.ts client/src/api.ts server/bruno/not-found ARCHITECTURE.md
git commit -F <message-file>
```

Message: `feat(server): answer unknown routes with ROUTE_NOT_FOUND` — body: unknown routes returned Express's HTML 404; every error response now has the `{ error }` shape. Client copy, Bruno and ARCHITECTURE follow.

### PR A delivery

- [x] Commit this plan on the branch: `docs: add backend layers and error handling plan`.
- [x] `pnpm build` green.
- [ ] `git push -u origin refactor/error-handling`, then `gh pr create --draft --base develop --title "refactor(server): centralize error handling" --body-file <file>` (French body: why, what, what was run, stacked PRs B and C to follow).

---

## PR B: lib and repository (branch `refactor/photos-repository`, base `refactor/error-handling`)

- [ ] `git switch -c refactor/photos-repository` from the tip of `refactor/error-handling`.

### Task 3: Move db, cloudinary and image to lib/

**Files:**

- Move: `server/src/db.ts` → `server/src/lib/db.ts`
- Move: `server/src/cloudinary.ts` → `server/src/lib/cloudinary.ts`
- Move: `server/src/image.ts` → `server/src/lib/image.ts`
- Modify: `server/src/lib/cloudinary.ts` (config import path)
- Modify: `server/src/server.ts`, `server/src/photos.ts` (import paths)

**Interfaces:**

- Produces: `prisma` from `server/src/lib/db.ts`; `uploadImage(jpeg: Buffer): Promise<UploadedImage>` and `type UploadedImage = { url: string; cloudinaryId: string }` from `server/src/lib/cloudinary.ts`; `toFrameJpeg(input: Buffer): Promise<Buffer>` from `server/src/lib/image.ts`. Contents unchanged.

- [ ] **Step 1: Move the files**

```bash
mkdir -p server/src/lib
git mv server/src/db.ts server/src/lib/db.ts
git mv server/src/cloudinary.ts server/src/lib/cloudinary.ts
git mv server/src/image.ts server/src/lib/image.ts
```

- [ ] **Step 2: Fix the import paths**

- `server/src/lib/cloudinary.ts`: `import { config } from './config.js'` → `import { config } from '../config.js'`
- `server/src/server.ts`: `import { prisma } from './db.js'` → `import { prisma } from './lib/db.js'`
- `server/src/photos.ts`: `'./cloudinary.js'` → `'./lib/cloudinary.js'`, `'./db.js'` → `'./lib/db.js'`, `'./image.js'` → `'./lib/image.js'`

- [ ] **Step 3: Run all gates**

Run: `pnpm check && pnpm typecheck && pnpm test:bruno`
Expected: green; Bruno `11 (11 Passed)`, `26/26`.

- [ ] **Step 4: Commit**

Message: `refactor(server): move db, cloudinary and image to lib/`.

### Task 4: Photos repository

**Files:**

- Create: `server/src/features/photos/photos.repository.ts`
- Modify: `server/src/photos.ts`
- Modify: `server/src/app.ts`

**Interfaces:**

- Consumes: `PrismaClient`, `Photo` from `@prisma/client`; `prisma` from `server/src/lib/db.ts`.
- Produces:
  - `type PhotoRecord` (the Prisma `Photo` row: `{ id: string; url: string; cloudinaryId: string; uploaderName: string; createdAt: Date }`)
  - `type NewPhoto = { url: string; cloudinaryId: string; uploaderName: string }`
  - `type PhotosRepository = { findLatest: (limit: number) => Promise<PhotoRecord[]>; create: (photo: NewPhoto) => Promise<PhotoRecord> }`
  - `createPhotosRepository(prisma: PrismaClient): PhotosRepository`
  - `createPhotosRouter(io, repository: PhotosRepository): Router` (temporary signature, replaced in Task 7)

- [ ] **Step 1: Create `server/src/features/photos/photos.repository.ts`**

```ts
import type { Photo, PrismaClient } from '@prisma/client'

export type PhotoRecord = Photo

export type NewPhoto = { url: string; cloudinaryId: string; uploaderName: string }

export type PhotosRepository = {
  findLatest: (limit: number) => Promise<PhotoRecord[]>
  create: (photo: NewPhoto) => Promise<PhotoRecord>
}

export function createPhotosRepository(prisma: PrismaClient): PhotosRepository {
  return {
    findLatest: (limit) => prisma.photo.findMany({ orderBy: { createdAt: 'desc' }, take: limit }),
    create: (photo) => prisma.photo.create({ data: photo }),
  }
}
```

- [ ] **Step 2: Make `server/src/photos.ts` use the repository**

- Remove `import type { Photo as PhotoRow } from '@prisma/client'` and `import { prisma } from './lib/db.js'`.
- Add `import type { PhotoRecord, PhotosRepository } from './features/photos/photos.repository.js'`.
- `toPhotoDto(row: PhotoRow)` → `toPhotoDto(record: PhotoRecord)`, body uses `record.*`.
- Signature: `export function createPhotosRouter(io: Server<ClientToServerEvents, ServerToClientEvents>, repository: PhotosRepository): Router`.
- GET body:

```ts
const records = await repository.findLatest(MAX_PHOTOS)
res.json(records.map(toPhotoDto))
```

- POST database part:

```ts
let record: PhotoRecord
try {
  record = await repository.create({ ...image, uploaderName })
} catch (error) {
  console.error(`Photo saved on Cloudinary but not in the database: ${image.cloudinaryId}`)
  throw error
}

const photo = toPhotoDto(record)
```

- [ ] **Step 3: Wire it in `server/src/app.ts`**

```ts
import { createPhotosRepository } from './features/photos/photos.repository.js'
import { prisma } from './lib/db.js'
```

```ts
app.use('/api/photos', createPhotosRouter(io, createPhotosRepository(prisma)))
```

- [ ] **Step 4: Run all gates**

Run: `pnpm check && pnpm typecheck && pnpm test:bruno`
Expected: green; Bruno `11 (11 Passed)`, `26/26`.

- [ ] **Step 5: Commit**

Message: `refactor(server): add photos repository` — body: only the repository talks to Prisma; it is created in `app.ts` and passed to the router.

### Task 5: Multer config in photos.upload.ts

**Files:**

- Create: `server/src/features/photos/photos.upload.ts`
- Modify: `server/src/photos.ts`

**Interfaces:**

- Produces: `upload` (a `multer.Multer` instance) from `photos.upload.ts`.

- [ ] **Step 1: Create `server/src/features/photos/photos.upload.ts`**

```ts
import multer from 'multer'

const MAX_FILE_SIZE = 10 * 1024 * 1024

// In memory: the file goes to sharp, never to disk.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
})
```

- [ ] **Step 2: Use it in `server/src/photos.ts`**

Remove `import multer from 'multer'`, `MAX_FILE_SIZE` and the `upload` constant with its comment. Add `import { upload } from './features/photos/photos.upload.js'`.

- [ ] **Step 3: Run all gates**

Run: `pnpm check && pnpm typecheck && pnpm test:bruno`
Expected: green; Bruno `11 (11 Passed)`, `26/26` (`07-edge-format-gif`, `06-edge-mauvais-champ` exercise Multer).

- [ ] **Step 4: Commit**

Message: `refactor(server): move the photo upload config to its own file`.

### PR B delivery

- [ ] `pnpm build` green.
- [ ] `git push -u origin refactor/photos-repository`, then `gh pr create --draft --base refactor/error-handling --title "refactor(server): add photos repository and lib folder" --body-file <file>` (French body; state that it is stacked on PR A and must be retargeted to `develop` before PR A is merged).

---

## PR C: service, controller, routes (branch `refactor/photos-layers`, base `refactor/photos-repository`)

- [ ] `git switch -c refactor/photos-layers` from the tip of `refactor/photos-repository`.

### Task 6: Photos service

**Files:**

- Create: `server/src/features/photos/photos.service.ts`
- Modify: `server/src/photos.ts`
- Modify: `server/src/app.ts`

**Interfaces:**

- Consumes: `AppError` (Task 1); `PhotoRecord`, `PhotosRepository` (Task 4); `UploadedImage` from `server/src/lib/cloudinary.ts`; `toFrameJpeg`, `uploadImage` (Task 3).
- Produces:
  - `type UploadedFile = { buffer: Buffer; mimetype: string }` (Multer's `Express.Multer.File` satisfies it)
  - `type NewPhotoInput = { uploaderName: unknown; file: UploadedFile | undefined }`
  - `type PhotosServiceDeps = { repository: PhotosRepository; toFrameJpeg: (input: Buffer) => Promise<Buffer>; uploadImage: (jpeg: Buffer) => Promise<UploadedImage> }`
  - `type PhotosService = { listLatest: () => Promise<PhotoRecord[]>; createPhoto: (input: NewPhotoInput) => Promise<PhotoRecord> }`
  - `createPhotosService(deps: PhotosServiceDeps): PhotosService`
  - `createPhotosRouter(io, service: PhotosService): Router` (temporary signature, replaced in Task 7)

- [ ] **Step 1: Create `server/src/features/photos/photos.service.ts`**

```ts
import { AppError } from '../../errors/app-error.js'
import type { UploadedImage } from '../../lib/cloudinary.js'
import type { PhotoRecord, PhotosRepository } from './photos.repository.js'

const MAX_UPLOADER_NAME_LENGTH = 30
const LATEST_PHOTOS_LIMIT = 20
const ALLOWED_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp']

export type UploadedFile = { buffer: Buffer; mimetype: string }

export type NewPhotoInput = { uploaderName: unknown; file: UploadedFile | undefined }

export type PhotosServiceDeps = {
  repository: PhotosRepository
  toFrameJpeg: (input: Buffer) => Promise<Buffer>
  uploadImage: (jpeg: Buffer) => Promise<UploadedImage>
}

export type PhotosService = {
  listLatest: () => Promise<PhotoRecord[]>
  createPhoto: (input: NewPhotoInput) => Promise<PhotoRecord>
}

function parseUploaderName(rawUploaderName: unknown): string {
  const uploaderName = typeof rawUploaderName === 'string' ? rawUploaderName.trim() : ''
  if (uploaderName.length === 0 || uploaderName.length > MAX_UPLOADER_NAME_LENGTH) {
    throw new AppError('UPLOADER_NAME_INVALID')
  }
  return uploaderName
}

function checkFile(file: UploadedFile | undefined): UploadedFile {
  if (!file) {
    throw new AppError('PHOTO_MISSING')
  }
  // Cheap first filter: the browser's mimetype can lie, sharp checks for real.
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new AppError('FORMAT_UNSUPPORTED')
  }
  return file
}

export function createPhotosService({
  repository,
  toFrameJpeg,
  uploadImage,
}: PhotosServiceDeps): PhotosService {
  async function toJpeg(input: Buffer): Promise<Buffer> {
    try {
      return await toFrameJpeg(input)
    } catch {
      throw new AppError('IMAGE_UNREADABLE')
    }
  }

  async function createPhoto({ uploaderName, file }: NewPhotoInput): Promise<PhotoRecord> {
    const validUploaderName = parseUploaderName(uploaderName)
    const jpeg = await toJpeg(checkFile(file).buffer)
    // Cloudinary and database failures are ours: they stay 500s.
    const image = await uploadImage(jpeg)
    try {
      return await repository.create({ ...image, uploaderName: validUploaderName })
    } catch (error) {
      console.error(`Photo saved on Cloudinary but not in the database: ${image.cloudinaryId}`)
      throw error
    }
  }

  return {
    listLatest: () => repository.findLatest(LATEST_PHOTOS_LIMIT),
    createPhoto,
  }
}
```

- [ ] **Step 2: Reduce `server/src/photos.ts` to HTTP + Socket.IO**

Replace the whole file with:

```ts
import { Router } from 'express'
import type { Server } from 'socket.io'
import type { PhotoRecord } from './features/photos/photos.repository.js'
import type { PhotosService } from './features/photos/photos.service.js'
import { upload } from './features/photos/photos.upload.js'
import type { ClientToServerEvents, Photo, ServerToClientEvents } from './types.js'

// cloudinaryId stays on the server.
function toPhotoDto(record: PhotoRecord): Photo {
  return {
    id: record.id,
    url: record.url,
    uploaderName: record.uploaderName,
    createdAt: record.createdAt.toISOString(),
  }
}

export function createPhotosRouter(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  service: PhotosService,
): Router {
  const router = Router()

  router.get('/', async (_req, res) => {
    const records = await service.listLatest()
    res.json(records.map(toPhotoDto))
  })

  router.post('/', upload.single('photo'), async (req, res) => {
    const record = await service.createPhoto({
      uploaderName: req.body?.uploaderName,
      file: req.file,
    })
    const photo = toPhotoDto(record)
    io.emit('photo:new', photo)
    res.status(201).json(photo)
  })

  return router
}
```

- [ ] **Step 3: Wire the service in `server/src/app.ts`**

```ts
import { createPhotosRepository } from './features/photos/photos.repository.js'
import { createPhotosService } from './features/photos/photos.service.js'
import { uploadImage } from './lib/cloudinary.js'
import { prisma } from './lib/db.js'
import { toFrameJpeg } from './lib/image.js'
```

At the top of `createApp`:

```ts
const repository = createPhotosRepository(prisma)
const service = createPhotosService({ repository, toFrameJpeg, uploadImage })
```

Route line: `app.use('/api/photos', createPhotosRouter(io, service))`.

- [ ] **Step 4: Run all gates**

Run: `pnpm check && pnpm typecheck && pnpm test:bruno`
Expected: green; Bruno `11 (11 Passed)`, `26/26`.

- [ ] **Step 5: Commit**

Message: `refactor(server): extract photos service` — body: business rules (uploader name, file, mimetype, readable image) live in the service, which knows neither Express nor Socket.IO; its dependencies are injected by `app.ts`.

### Task 7: Photos controller and routes

**Files:**

- Create: `server/src/features/photos/photos.controller.ts`
- Create: `server/src/features/photos/photos.routes.ts`
- Delete: `server/src/photos.ts`
- Modify: `server/src/app.ts`

**Interfaces:**

- Consumes: `PhotosService` (Task 6), `PhotoRecord` (Task 4), `upload` (Task 5).
- Produces:
  - `type PhotosController = { list: (req: Request, res: Response) => Promise<void>; create: (req: Request, res: Response) => Promise<void> }`
  - `createPhotosController(service: PhotosService, io: Server<ClientToServerEvents, ServerToClientEvents>): PhotosController`
  - `createPhotosRouter(controller: PhotosController): Router` (final signature)

- [ ] **Step 1: Create `server/src/features/photos/photos.controller.ts`**

```ts
import type { Request, Response } from 'express'
import type { Server } from 'socket.io'
import type { ClientToServerEvents, Photo, ServerToClientEvents } from '../../types.js'
import type { PhotoRecord } from './photos.repository.js'
import type { PhotosService } from './photos.service.js'

export type PhotosController = {
  list: (req: Request, res: Response) => Promise<void>
  create: (req: Request, res: Response) => Promise<void>
}

// cloudinaryId stays on the server.
function toPhotoDto(record: PhotoRecord): Photo {
  return {
    id: record.id,
    url: record.url,
    uploaderName: record.uploaderName,
    createdAt: record.createdAt.toISOString(),
  }
}

export function createPhotosController(
  service: PhotosService,
  io: Server<ClientToServerEvents, ServerToClientEvents>,
): PhotosController {
  return {
    async list(_req, res) {
      const records = await service.listLatest()
      res.json(records.map(toPhotoDto))
    },

    async create(req, res) {
      const record = await service.createPhoto({
        uploaderName: req.body?.uploaderName,
        file: req.file,
      })
      const photo = toPhotoDto(record)
      io.emit('photo:new', photo)
      res.status(201).json(photo)
    },
  }
}
```

- [ ] **Step 2: Create `server/src/features/photos/photos.routes.ts`**

```ts
import { Router } from 'express'
import type { PhotosController } from './photos.controller.js'
import { upload } from './photos.upload.js'

export function createPhotosRouter(controller: PhotosController): Router {
  const router = Router()
  router.get('/', controller.list)
  router.post('/', upload.single('photo'), controller.create)
  return router
}
```

- [ ] **Step 3: Delete `server/src/photos.ts`**

```bash
git rm server/src/photos.ts
```

- [ ] **Step 4: Final wiring in `server/src/app.ts`**

Replace the whole file with:

```ts
import cors from 'cors'
import express, { type Express } from 'express'
import type { Server } from 'socket.io'
import { config } from './config.js'
import { errorHandler } from './errors/error-handler.js'
import { notFound } from './errors/not-found.js'
import { createPhotosController } from './features/photos/photos.controller.js'
import { createPhotosRepository } from './features/photos/photos.repository.js'
import { createPhotosRouter } from './features/photos/photos.routes.js'
import { createPhotosService } from './features/photos/photos.service.js'
import { uploadImage } from './lib/cloudinary.js'
import { prisma } from './lib/db.js'
import { toFrameJpeg } from './lib/image.js'
import type { ClientToServerEvents, ServerToClientEvents } from './types.js'

export function createApp(io: Server<ClientToServerEvents, ServerToClientEvents>): Express {
  const repository = createPhotosRepository(prisma)
  const service = createPhotosService({ repository, toFrameJpeg, uploadImage })
  const controller = createPhotosController(service, io)

  const app = express()

  app.use(cors({ origin: config.clientOrigin }))
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/photos', createPhotosRouter(controller))

  app.use(notFound)
  app.use(errorHandler)

  return app
}
```

- [ ] **Step 5: Run all gates**

Run: `pnpm check && pnpm typecheck && pnpm build && pnpm test:bruno`
Expected: green; Bruno `11 (11 Passed)`, `26/26`.

- [ ] **Step 6: Commit**

Message: `refactor(server): split photos routes and controller` — body: routes only declare paths and the upload middleware; the controller reads the request, maps to the DTO, broadcasts and answers; `photos.ts` is gone.

### Task 8: Document the layers, manual check

**Files:**

- Modify: `ARCHITECTURE.md` (section "Serveur : app et processus")

- [ ] **Step 1: Add a "Couches du backend" subsection after "Serveur : app et processus"**

```markdown
## Couches du backend

Une feature par dossier (`server/src/features/photos/`), un fichier par couche :

| Fichier                | Rôle                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `photos.routes.ts`     | chemins et middleware d'upload, rien d'autre                                         |
| `photos.upload.ts`     | configuration Multer : en mémoire, 10 Mo, un fichier                                 |
| `photos.controller.ts` | lit la requête, appelle le service, convertit en DTO, diffuse `photo:new`, répond    |
| `photos.service.ts`    | règles métier (pseudo, fichier, format, image lisible) ; ignore Express et Socket.IO |
| `photos.repository.ts` | seul accès à Prisma                                                                  |

- Les dépendances sont passées par des fonctions-fabriques (`createPhotosService({ repository, toFrameJpeg, uploadImage })`), assemblées dans `app.ts` : un test peut fournir de fausses implémentations.
- `server/src/lib/` regroupe les clients techniques : Prisma (`db.ts`), Cloudinary, sharp (`image.ts`).
- **Erreurs** : le service lève une `AppError` portant un code ; le contrôleur n'a pas de try/catch (Express 5 transmet les rejets). `errors/error-handler.ts` est le seul endroit qui écrit une réponse d'erreur, avec un statut tiré d'un `Record` exhaustif sur les codes. Une erreur de sharp devient `IMAGE_UNREADABLE` (faute de l'utilisateur) ; une erreur de Cloudinary ou de Prisma reste une 500.
```

Run `pnpm check:fix`.

- [ ] **Step 2: Manual browser check** (dev server running)

On `http://localhost:5180`: upload a JPEG → "Photo envoyée !" and the `/frame` tab updates live; upload a GIF → "Format non pris en charge : JPEG, PNG ou WebP uniquement."

- [ ] **Step 3: Commit**

Message: `docs(architecture): describe the backend layers and error flow`.

### PR C delivery

- [ ] `git push -u origin refactor/photos-layers`, then `gh pr create --draft --base refactor/photos-repository --title "refactor(server): split photos into service, controller and routes" --body-file <file>` (French body; stacked on PR B; what was run, including the manual check).
- [ ] Merge order when the author asks: retarget B to `develop`, merge A; rebase B with `--onto`, author force-pushes; retarget C, merge B; same for C.

---

## Drift Log

Format: `date · task/step · what the plan said · what was done · why`.
