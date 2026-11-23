---
plan: server-unit-tests
status: in-review
spec: docs/superpowers/specs/2026-11-23-server-unit-tests-design.md
branch: test/vitest-setup (PR A), test/photos-service (PR B), refactor/photos-service-names (PR C)
worktree: false
tasks_total: 3
tasks_done: 3
current_task: —
last_commit: 8004ec0
last_updated: 2026-11-23
---

# Server Unit Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Working agreement (mandatory):** keep this plan in sync with reality. Check a step only when it is finished and its gate is green. Append every divergence to the Drift Log. Update the frontmatter (`tasks_done`, `current_task`, `last_commit`, `last_updated`) at each task boundary. When a drift produces a durable correction (path, command, signature, decision), amend the affected task block in place and log the amendment. Never check a partial step; never delete a finished step or a drift entry. Under subagent-driven development, `.superpowers/sdd/progress.md` is the runtime authority; the frontmatter mirrors it.

**Goal:** Unit test the photos service and the error responses with Vitest, then apply the readability fixes to the service under that test net.

**Architecture:** Vitest in `server` only, tests colocated as `*.test.ts`, kept out of `dist` by `tsconfig.build.json`. The error handler's decision moves into a pure `toErrorResponse(error)` so it can be tested without a fake Express `Response`. The service is tested through its factory with `vi.fn()` dependencies. Three PRs in a native GitHub stack.

**Tech Stack:** Vitest 5, TypeScript 7 (`nodenext`, `strict`, `verbatimModuleSyntax`), Express 5, Multer 2, Biome, Bruno CLI, `gh stack`.

## Global Constraints

- One new dev dependency, approved by the author: `vitest` (5.x), in `server` only. Nothing else.
- No `vi.mock`: fakes are `vi.fn()` passed through the factory; `console.error` is intercepted with `vi.spyOn`.
- Behavior unchanged: same statuses, error codes, DTO, logs. Bruno passes unmodified.
- TypeScript rules (AGENTS.md): no `as` casts, explicit return types on exported functions, literal unions rather than `enum`.
- Code rules (`.claude/rules/`): comment why, never what; no file-summary comments; name callback params after the item; no magic numbers in `src` code (test inputs may be literal).
- Imports use the `.js` extension (`nodenext`); Vitest imports are explicit (`import { describe, expect, it, vi } from 'vitest'`), no globals.
- Every commit passes `pnpm check` and `pnpm typecheck`. Every task ends green on `pnpm test`, `pnpm build` and `pnpm test:bruno` against the running API (`pnpm dev`).
- Commit messages: Conventional Commits in English, written to a file and passed with `git commit -F`. End each message with the session's attribution lines.
- Stack: branches created with `gh stack`; never `gh pr merge` (the author merges the whole stack).

## File Map

| File                                                | Task | Responsibility                                       |
| --------------------------------------------------- | ---- | ---------------------------------------------------- |
| `server/package.json`                               | 1    | `vitest` dev dependency, `test`, `test:watch`, build |
| `server/tsconfig.build.json`                        | 1    | build config without test files                      |
| `package.json` (root)                               | 1    | `test` script                                        |
| `pnpm-lock.yaml`                                    | 1    | lockfile                                             |
| `server/src/errors/error-handler.ts`                | 1    | extract `toErrorResponse`                            |
| `server/src/errors/error-handler.test.ts`           | 1    | error response tests                                 |
| `AGENTS.md`, `README.md`                            | 1    | test rule, `pnpm test`                               |
| `server/src/features/photos/photos.service.test.ts` | 2    | service tests                                        |
| `server/src/features/photos/photos.service.ts`      | 3    | readability fixes                                    |

---

## PR A: Vitest and error responses (branch `test/vitest-setup`, base `develop`)

The stack and branch exist (`gh stack init test/vitest-setup`) and already hold the spec commit (`11d2843`).

### Task 1: Vitest setup and error response tests

**Files:**

- Modify: `server/package.json`, `package.json`, `pnpm-lock.yaml`
- Create: `server/tsconfig.build.json`
- Modify: `server/src/errors/error-handler.ts`
- Create: `server/src/errors/error-handler.test.ts`
- Modify: `AGENTS.md`, `README.md`

**Interfaces:**

- Consumes: `AppError` (`server/src/errors/app-error.ts`, `new AppError(code: ApiErrorCode)`, `readonly code`), `ApiError = { error: ApiErrorCode }` (`server/src/types.ts`), the private `toErrorCode` and `HTTP_STATUS_BY_CODE` in `error-handler.ts`.
- Produces: `export type ErrorResponse = { status: number; body: ApiError }` and `export function toErrorResponse(error: unknown): ErrorResponse` in `error-handler.ts`; `errorHandler` keeps its signature. Root `pnpm test` runs the server unit tests.

- [x] **Step 1: Add Vitest**

Run from the repo root: `pnpm --filter server add -D vitest@^5.1.1`
Expected: `server/package.json` gets `"vitest": "^5.1.1"` in `devDependencies`; `pnpm-lock.yaml` updated.

- [x] **Step 2: Scripts and build config**

In `server/package.json` `scripts`, replace `"build": "tsc"` with `"build": "tsc -p tsconfig.build.json"`, and add after `typecheck`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

Create `server/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["src/**/*.test.ts"]
}
```

In the root `package.json` `scripts`, add after `"check:fix"`:

```json
    "test": "pnpm --filter server test",
```

Run: `pnpm build`
Expected: both packages `Done`.

- [x] **Step 3: Commit**

```bash
git add server/package.json server/tsconfig.build.json package.json pnpm-lock.yaml
git commit -F <file>   # build(server): add Vitest and keep tests out of the build
```

- [x] **Step 4: Write the failing test**

Create `server/src/errors/error-handler.test.ts`:

```ts
import multer from 'multer'
import { describe, expect, it } from 'vitest'
import { AppError } from './app-error.js'
import { toErrorResponse } from './error-handler.js'

describe('toErrorResponse', () => {
  it('uses the status mapped to an AppError code', () => {
    expect(toErrorResponse(new AppError('FORMAT_UNSUPPORTED'))).toEqual({
      status: 415,
      body: { error: 'FORMAT_UNSUPPORTED' },
    })
  })

  it('answers an unknown route with 404', () => {
    expect(toErrorResponse(new AppError('ROUTE_NOT_FOUND'))).toEqual({
      status: 404,
      body: { error: 'ROUTE_NOT_FOUND' },
    })
  })

  it('maps a file over the size limit to PHOTO_TOO_LARGE', () => {
    expect(toErrorResponse(new multer.MulterError('LIMIT_FILE_SIZE'))).toEqual({
      status: 413,
      body: { error: 'PHOTO_TOO_LARGE' },
    })
  })

  it('maps any other Multer error to UPLOAD_INVALID', () => {
    expect(toErrorResponse(new multer.MulterError('LIMIT_UNEXPECTED_FILE'))).toEqual({
      status: 400,
      body: { error: 'UPLOAD_INVALID' },
    })
  })

  it('hides the details of an unexpected error', () => {
    expect(toErrorResponse(new Error('mongodb://admin:secret@cluster'))).toEqual({
      status: 500,
      body: { error: 'SERVER_ERROR' },
    })
  })

  it('treats a thrown non-Error value as a server error', () => {
    expect(toErrorResponse('boom')).toEqual({ status: 500, body: { error: 'SERVER_ERROR' } })
  })
})
```

- [x] **Step 5: Run it to see it fail**

Run: `pnpm test`
Expected: FAIL, `toErrorResponse` is not exported (`is not a function` or a missing export error). `pnpm typecheck` also fails on the missing export.

- [x] **Step 6: Extract `toErrorResponse`**

In `server/src/errors/error-handler.ts`, replace everything from the `// Express spots an error handler by its 4 parameters.` comment to the end of the file with:

```ts
export type ErrorResponse = { status: number; body: ApiError }

export function toErrorResponse(error: unknown): ErrorResponse {
  const code = toErrorCode(error)
  return { status: HTTP_STATUS_BY_CODE[code], body: { error: code } }
}

// Express spots an error handler by its 4 parameters.
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const { status, body } = toErrorResponse(error)
  if (status === HTTP_STATUS_BY_CODE.SERVER_ERROR) {
    console.error(error)
  }
  res.status(status).json(body)
}
```

The imports at the top stay as they are (`ApiError` is still used).

- [x] **Step 7: Run all gates**

Run: `pnpm test && pnpm check && pnpm typecheck && pnpm build && pnpm test:bruno`
Expected: Vitest `6 passed`; Biome no fixes; both typechecks `Done`; both builds `Done`; Bruno `11 (11 Passed)`, `26/26`.
Run: `ls server/dist/errors`
Expected: no `error-handler.test.js`.

- [x] **Step 8: Commit**

```bash
git add server/src/errors/error-handler.ts server/src/errors/error-handler.test.ts
git commit -F <file>   # test(server): unit test the error responses
```

- [x] **Step 9: Document**

In `AGENTS.md`, under `## Working rules`, add after the `**API change → Bruno**` line:

```markdown
- **Business rule change → unit test**: a rule changed in a service (or in `toErrorResponse`) updates its colocated `*.test.ts` in the same commit; `pnpm test` runs them, no API needed.
```

In `README.md`, in the scripts table, add after the `pnpm check` row (keep the column alignment; `pnpm check:fix` realigns it):

```markdown
| `pnpm test`                     | tests unitaires du serveur (Vitest)       |
```

Run: `pnpm check:fix && pnpm check`
Expected: no remaining issues.

- [x] **Step 10: Commit**

```bash
git add AGENTS.md README.md
git commit -F <file>   # docs: document the unit tests
```

### PR A delivery

- [x] Tick Task 1 in this plan and update the frontmatter; commit `docs: track PR A progress in the unit tests plan`.

---

## PR B: photos service tests (branch `test/photos-service`, base `test/vitest-setup`)

- [x] `gh stack add test/photos-service` (creates the branch on top of `test/vitest-setup` and checks it out).

### Task 2: Photos service tests

**Files:**

- Create: `server/src/features/photos/photos.service.test.ts`

**Interfaces:**

- Consumes, from `server/src/features/photos/photos.service.ts`: `createPhotosService(deps: PhotosServiceDeps): PhotosService`, `PhotosServiceDeps = { repository: PhotosRepository; toFrameJpeg: (input: Buffer) => Promise<Buffer>; uploadImage: (jpeg: Buffer) => Promise<UploadedImage> }`, `UploadedFile = { buffer: Buffer; mimetype: string }`, `PhotosService = { listLatest(): Promise<PhotoRecord[]>; createPhoto(input: { uploaderName: unknown; file: UploadedFile | undefined }): Promise<PhotoRecord> }`. From `photos.repository.ts`: `PhotoRecord` (Prisma `Photo`: `id`, `url`, `cloudinaryId`, `uploaderName`, `createdAt: Date`), `PhotosRepository = { findLatest(limit: number): Promise<PhotoRecord[]>; create(data: NewPhoto): Promise<PhotoRecord> }`. `AppError` exposes `code`.
- Produces: nothing for later tasks except a green test file that Task 3 must keep green unmodified.

The service already exists: these are characterization tests, they pass on the first run. Step 3 proves they can fail.

- [x] **Step 1: Write the tests**

Create `server/src/features/photos/photos.service.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PhotoRecord, PhotosRepository } from './photos.repository.js'
import { createPhotosService, type PhotosServiceDeps, type UploadedFile } from './photos.service.js'

const JPEG_FILE: UploadedFile = { buffer: Buffer.from('raw upload'), mimetype: 'image/jpeg' }
const FRAME_JPEG = Buffer.from('frame jpeg')
const IMAGE = { url: 'https://res.cloudinary.com/demo/photo.jpg', cloudinaryId: 'familyframe/abc' }
const RECORD: PhotoRecord = {
  id: '6b044f9d56a44767c7079a01',
  ...IMAGE,
  uploaderName: 'Mamie',
  createdAt: new Date('2026-11-23T10:00:00Z'),
}
const LONGEST_NAME = 'a'.repeat(30)
const TOO_LONG_NAME = 'a'.repeat(31)
const LATEST_PHOTOS_LIMIT = 20

// Every dependency succeeds by default; each test breaks only the one it is about.
function makeDeps() {
  return {
    repository: {
      findLatest: vi.fn<PhotosRepository['findLatest']>().mockResolvedValue([RECORD]),
      create: vi.fn<PhotosRepository['create']>().mockResolvedValue(RECORD),
    },
    toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>().mockResolvedValue(FRAME_JPEG),
    uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>().mockResolvedValue(IMAGE),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createPhoto', () => {
  it('saves the uploaded image with the trimmed name and returns the record', async () => {
    const deps = makeDeps()

    const record = await createPhotosService(deps).createPhoto({
      uploaderName: '  Mamie  ',
      file: JPEG_FILE,
    })

    expect(record).toBe(RECORD)
    expect(deps.toFrameJpeg).toHaveBeenCalledWith(JPEG_FILE.buffer)
    expect(deps.uploadImage).toHaveBeenCalledWith(FRAME_JPEG)
    expect(deps.repository.create).toHaveBeenCalledWith({ ...IMAGE, uploaderName: 'Mamie' })
  })

  it('accepts a 30-character name', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).createPhoto({ uploaderName: LONGEST_NAME, file: JPEG_FILE })

    expect(deps.repository.create).toHaveBeenCalledWith({ ...IMAGE, uploaderName: LONGEST_NAME })
  })

  it.each([
    ['empty', ''],
    ['only spaces', '   '],
    ['31 characters long', TOO_LONG_NAME],
    ['not a string', 42],
    ['missing', undefined],
  ])('rejects a name that is %s before any image work', async (_label, uploaderName) => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).createPhoto({ uploaderName, file: JPEG_FILE }),
    ).rejects.toMatchObject({ code: 'UPLOADER_NAME_INVALID' })
    expect(deps.toFrameJpeg).not.toHaveBeenCalled()
  })

  it('rejects a missing file', async () => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file: undefined }),
    ).rejects.toMatchObject({ code: 'PHOTO_MISSING' })
  })

  it('rejects a format other than JPEG, PNG or WebP', async () => {
    const deps = makeDeps()
    const gif: UploadedFile = { buffer: Buffer.from('gif'), mimetype: 'image/gif' }

    await expect(
      createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file: gif }),
    ).rejects.toMatchObject({ code: 'FORMAT_UNSUPPORTED' })
    expect(deps.toFrameJpeg).not.toHaveBeenCalled()
  })

  it('turns an image sharp cannot read into IMAGE_UNREADABLE', async () => {
    const deps = makeDeps()
    deps.toFrameJpeg.mockRejectedValue(new Error('Input buffer contains unsupported image format'))

    await expect(
      createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file: JPEG_FILE }),
    ).rejects.toMatchObject({ code: 'IMAGE_UNREADABLE' })
    expect(deps.uploadImage).not.toHaveBeenCalled()
  })

  it('lets a Cloudinary failure through unchanged', async () => {
    const deps = makeDeps()
    const cloudinaryError = new Error('Cloudinary is down')
    deps.uploadImage.mockRejectedValue(cloudinaryError)

    await expect(
      createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file: JPEG_FILE }),
    ).rejects.toBe(cloudinaryError)
    expect(deps.repository.create).not.toHaveBeenCalled()
  })

  it('logs the orphaned Cloudinary image when the database fails', async () => {
    const deps = makeDeps()
    const databaseError = new Error('database is down')
    deps.repository.create.mockRejectedValue(databaseError)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(
      createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file: JPEG_FILE }),
    ).rejects.toBe(databaseError)
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining(IMAGE.cloudinaryId))
  })
})

describe('listLatest', () => {
  it('returns the latest photos from the repository', async () => {
    const deps = makeDeps()

    const records = await createPhotosService(deps).listLatest()

    expect(records).toEqual([RECORD])
    expect(deps.repository.findLatest).toHaveBeenCalledWith(LATEST_PHOTOS_LIMIT)
  })
})
```

- [x] **Step 2: Run them**

Run: `pnpm test`
Expected: PASS, `2 passed` files, `19 passed` tests (6 error-handler + 13 service: nominal, 30 characters, 5 invalid names, missing file, GIF, sharp, Cloudinary, database, listLatest).

- [x] **Step 3: Prove a test can fail**

Temporarily change `MAX_UPLOADER_NAME_LENGTH` in `photos.service.ts` from `30` to `31`. Run `pnpm test`.
Expected: FAIL on `rejects a name that is 31 characters long`. Revert the change (`git checkout -- server/src/features/photos/photos.service.ts`), run `pnpm test` again: PASS.

- [x] **Step 4: Run all gates**

Run: `pnpm check && pnpm typecheck && pnpm build && pnpm test:bruno`
Expected: green; Bruno `11 (11 Passed)`, `26/26`.

- [x] **Step 5: Commit**

```bash
git add server/src/features/photos/photos.service.test.ts
git commit -F <file>   # test(server): unit test the photos service
```

### PR B delivery

- [x] Tick Task 2 and update the frontmatter; commit `docs: track PR B progress in the unit tests plan`.

---

## PR C: readability fixes (branch `refactor/photos-service-names`, base `test/photos-service`)

- [x] `gh stack add refactor/photos-service-names`.

### Task 3: Clarify the photos service names

**Files:**

- Modify: `server/src/features/photos/photos.service.ts`

**Interfaces:**

- Consumes: the service as it is; `photos.service.test.ts` from Task 2, which must pass **unmodified**.
- Produces: same exports, same behavior. Private names change: `checkFile` → `parseFile`, inner `toJpeg` → `convertToFrameJpeg`.

- [x] **Step 1: Rename `checkFile` to `parseFile`**

In `server/src/features/photos/photos.service.ts`, rename the function `checkFile` to `parseFile` (declaration only for now; the call site changes in Step 3).

- [x] **Step 2: Rename the inner `toJpeg` to `convertToFrameJpeg`**

```ts
  async function convertToFrameJpeg(input: Buffer): Promise<Buffer> {
    try {
      return await toFrameJpeg(input)
    } catch {
      throw new AppError('IMAGE_UNREADABLE')
    }
  }
```

- [x] **Step 3: Give the file check its own line**

Replace the first lines of `createPhoto`:

```ts
    const validUploaderName = parseUploaderName(uploaderName)
    const jpeg = await toJpeg(checkFile(file).buffer)
```

with:

```ts
    const validUploaderName = parseUploaderName(uploaderName)
    const validFile = parseFile(file)
    const jpeg = await convertToFrameJpeg(validFile.buffer)
```

- [x] **Step 4: Run all gates**

Run: `git diff --stat -- server/src/features/photos/photos.service.test.ts` → expected: empty (tests untouched).
Run: `pnpm test && pnpm check && pnpm typecheck && pnpm build && pnpm test:bruno`
Expected: Vitest `19 passed`; green; Bruno `11 (11 Passed)`, `26/26`.

- [x] **Step 5: Commit**

```bash
git add server/src/features/photos/photos.service.ts
git commit -F <file>   # refactor(server): clarify the photos service names
```

### PR C delivery

- [ ] Tick Task 3 and update the frontmatter (`status: in-review`); commit `docs: track PR C progress in the unit tests plan`.
- [ ] `gh stack submit --auto` (pushes the three branches, opens draft PRs), then `gh pr edit` each one:
  - A: `test(server): set up Vitest and unit test the error responses`
  - B: `test(server): unit test the photos service`
  - C: `refactor(server): clarify the photos service names`

  French bodies: why, what, what was run (quote the Vitest and Bruno counts), position in the stack.
- [ ] The author merges the whole stack (`gh stack merge <stack> --yes --squash` or the GitHub button).

---

## Drift Log

Format: `date · task/step · what the plan said · what was done · why`.
