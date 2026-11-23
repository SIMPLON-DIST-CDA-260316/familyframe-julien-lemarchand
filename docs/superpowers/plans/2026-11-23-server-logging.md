---
plan: server-logging
status: draft
spec: docs/superpowers/specs/2026-11-23-server-logging-design.md
branch: feat/server-logger (PR A), feat/server-event-logs (PR B), fix/server-logging-guards (PR C)
worktree: false
tasks_total: 4
tasks_done: 0
current_task: —
last_commit: —
last_updated: 2026-11-23
---

# Server Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Working agreement (mandatory):** keep this plan in sync with reality. Check a step only when it is finished and its gate is green. Append every divergence to the Drift Log. Update the frontmatter (`tasks_done`, `current_task`, `last_commit`, `last_updated`) at each task boundary. When a drift produces a durable correction (path, command, signature, decision), amend the affected task block in place and log the amendment. Never check a partial step; never delete a finished step or a drift entry. Under subagent-driven development, `.superpowers/sdd/progress.md` is the runtime authority; the frontmatter mirrors it.

**Goal:** Make the server document its events (startup, database, requests, uploads, errors, sockets, shutdown, crashes) as one structured line each on stdout, then guard against `console` and remove the dead JSON parser.

**Architecture:** A home-made `server/src/lib/logger.ts` formats one line per event (JSON by default, `pretty` in dev) and writes it with `process.stdout.write`. Its settings (`LOG_LEVEL`, `LOG_FORMAT`) are read there, not in `config.ts`, so tests can import it without secrets. The photos service receives the logger by injection; the request logger, error handler and `server.ts` import the shared `logger`. Three PRs in a native GitHub stack.

**Tech Stack:** Node 24, TypeScript 7 (`nodenext`, `strict`, `verbatimModuleSyntax`), Express 5, Socket.IO 4, Vitest 5, Biome 2, Bruno CLI, `gh stack`.

## Global Constraints

- No new dependency. The logger is home-made.
- Event names are exactly those of the catalog below (`domain.action`, lowercase, `snake_case` after the dot only for `server.stop_failed`).
- No PII and no environment values in logs or error messages (`.claude/rules/08-domain-specific-rules/8-security-logging.md`): never `uploaderName`; identifiers only (`photoId`, `cloudinaryId`, `socketId`); paths without their query string.
- Behavior unchanged (statuses, error codes, DTO) except the malformed JSON request, which becomes 400 `UPLOADER_NAME_INVALID` in Task 4.
- No `vi.mock`: fakes are `vi.fn()` passed through the factory.
- TypeScript rules (AGENTS.md): no `as` casts, explicit return types on exported functions, literal unions rather than `enum`.
- Code rules (`.claude/rules/`): comment why, never what; no file-summary comments; name callback params after the item; no magic numbers in `src` code (test inputs may be literal); max 30 lines per function.
- Imports use the `.js` extension (`nodenext`); Vitest imports are explicit (`import { describe, expect, it, vi } from 'vitest'`), no globals.
- Every commit passes `pnpm check` and `pnpm typecheck`. Every task ends green on `pnpm test`, `pnpm build` and `pnpm test:bruno` against the running API.
- Commit messages: Conventional Commits in English, written to a file and passed with `git commit -F`. End each message with the session's attribution lines.
- Stack: the controller creates branches with `gh stack`; implementers never switch branches, push or run `gh stack`. Never `gh pr merge` (the author merges the whole stack).

## Event catalog

| Event                                                       | Level                               | Data                                     |
| ----------------------------------------------------------- | ----------------------------------- | ---------------------------------------- |
| `db.connected` / `db.unreachable`                           | info / error                        | — / `error`                              |
| `server.started`                                            | info                                | `port`                                   |
| `socket.connected` / `socket.disconnected`                  | info                                | `socketId` / `socketId`, `reason`        |
| `http.request`                                              | info below 400, warn 4xx, error 5xx | `method`, `path`, `status`, `durationMs` |
| `photo.created`                                             | info                                | `photoId`, `cloudinaryId`                |
| `photo.unreadable`                                          | warn                                | `error`                                  |
| `photo.orphaned`                                            | error                               | `cloudinaryId`, `error`                  |
| `server.error`                                              | error                               | `error`, `method`, `path`                |
| `server.stopping` / `server.stopped` / `server.stop_failed` | info / info / error                 | `signal` / — / `error`                   |
| `process.crashed`                                           | error                               | `error`                                  |

## Choices made while planning (not in the spec)

- **No Biome exception for `logger.ts`.** The logger writes with `process.stdout.write`, not `console`, so `noConsole` needs no override for it.
- **Pretty format and objects.** A string value is written as is; any other value (number, `Error`, object) as JSON. An `Error` keeps its stack on the same line (escaped newlines), so the "one line per event" rule holds in both formats.
- **Empty variable = unset.** `LOG_LEVEL=` (as Compose may pass it) falls back to the default instead of throwing.
- **Only the service is injected.** The request logger, the error handler and `server.ts` import `logger` directly, like `prisma` today.
- **A database failure after upload logs twice:** `photo.orphaned` (the service's view, with the `cloudinaryId` to clean up) and `server.error` (the error handler's view, with the route).
- **Bruno malformed JSON request** uses a `text` body with an explicit `Content-Type: application/json` header, so Bruno sends the broken JSON as is.

## File Map

| File                                                    | Task | Responsibility                                     |
| ------------------------------------------------------- | ---- | -------------------------------------------------- |
| `server/src/lib/logger.ts`                              | 1    | format and write log lines; read the log settings  |
| `server/src/lib/logger.test.ts`                         | 1    | logger unit tests                                  |
| `server/.env.example`                                   | 1    | the two log variables                              |
| `server/src/features/photos/photos.service.ts`          | 2    | `photo.*` events, logger dependency                |
| `server/src/features/photos/photos.service.test.ts`     | 2    | logger fake, event assertions                      |
| `server/src/app.ts`                                     | 2-4  | wiring: logger to the service, request logger, no JSON parser |
| `server/src/lib/request-logger.ts`                      | 3    | `http.request` per finished request                |
| `server/src/errors/error-handler.ts`                    | 3    | `server.error` for every 500                       |
| `server/src/server.ts`                                  | 3    | lifecycle, socket and crash events                 |
| `biome.json`                                            | 4    | `noConsole` on `server/src/**`                     |
| `.claude/rules/08-domain-specific-rules/8-security-logging.md` | 4 | rule line                                      |
| `server/bruno/photos/create/09-edge-json-malforme.bru`  | 4    | malformed JSON → 400                               |
| `ARCHITECTURE.md`                                       | 1-4  | Configuration bullet, Logs section, layers, tooling |

## Stack and branches (controller only)

- PR A `feat/server-logger`: already created with `gh stack init`; holds the spec and this plan. Task 1.
- Before Task 2: `gh stack add feat/server-event-logs`. Tasks 2 and 3.
- Before Task 4: `gh stack add fix/server-logging-guards`. Task 4.
- After the final review: `gh stack submit --auto` (draft PRs), then `gh stack view --json`.

---

### Task 1: Logger (PR A, `feat/server-logger`)

**Files:**
- Create: `server/src/lib/logger.ts`
- Test: `server/src/lib/logger.test.ts`
- Modify: `server/.env.example` (append only)
- Modify: `ARCHITECTURE.md` (section `## Configuration`)

**Interfaces:**
- Consumes: nothing.
- Produces (used by Tasks 2 and 3):
  ```ts
  export type LogLevel = 'info' | 'warn' | 'error'
  export type LogFormat = 'json' | 'pretty'
  export type LogData = Record<string, unknown>
  export type LogSettings = { level: LogLevel; format: LogFormat }
  export type Logger = {
    info: (event: string, data?: LogData) => void
    warn: (event: string, data?: LogData) => void
    error: (event: string, data?: LogData) => void
  }
  export type LoggerOptions = { level: LogLevel; format: LogFormat; write: (line: string) => void }
  export function createLogger(options: LoggerOptions): Logger
  export function readLogSettings(env: NodeJS.ProcessEnv): LogSettings
  export const logger: Logger
  ```

- [ ] **Step 1: Write the failing tests**

Create `server/src/lib/logger.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { createLogger, type LoggerOptions, readLogSettings } from './logger.js'

function makeLogger(settings: Partial<Pick<LoggerOptions, 'level' | 'format'>> = {}) {
  const write = vi.fn<LoggerOptions['write']>()
  const logger = createLogger({ level: 'info', format: 'json', write, ...settings })
  return { logger, write }
}

describe('createLogger', () => {
  it('writes one JSON line with time, level, event and data', () => {
    const { logger, write } = makeLogger()

    logger.info('photo.created', { photoId: 'abc' })

    expect(write).toHaveBeenCalledTimes(1)
    const line = write.mock.calls[0][0]
    expect(line.endsWith('\n')).toBe(true)
    const entry = JSON.parse(line)
    expect(entry).toEqual({
      time: expect.any(String),
      level: 'info',
      event: 'photo.created',
      photoId: 'abc',
    })
    expect(new Date(entry.time).toISOString()).toBe(entry.time)
  })

  it('skips events below the minimal level', () => {
    const { logger, write } = makeLogger({ level: 'warn' })

    logger.info('photo.created')
    logger.warn('photo.unreadable')
    logger.error('server.error')

    expect(write).toHaveBeenCalledTimes(2)
  })

  it('writes an Error as its name, message and stack', () => {
    const { logger, write } = makeLogger()
    const error = new Error('boom')

    logger.error('server.error', { error })

    expect(JSON.parse(write.mock.calls[0][0]).error).toEqual({
      name: 'Error',
      message: 'boom',
      stack: error.stack,
    })
  })

  it('writes a readable line in pretty format', () => {
    const { logger, write } = makeLogger({ format: 'pretty' })

    logger.warn('photo.unreadable', { photoId: 'abc', status: 422 })
    logger.error('server.stopped')

    expect(write.mock.calls[0][0]).toMatch(
      /^\d{2}:\d{2}:\d{2} WARN {2}photo\.unreadable photoId=abc status=422\n$/,
    )
    expect(write.mock.calls[1][0]).toMatch(/^\d{2}:\d{2}:\d{2} ERROR server\.stopped\n$/)
  })

  it('keeps an Error on one line in pretty format', () => {
    const { logger, write } = makeLogger({ format: 'pretty' })

    logger.error('server.error', { error: new Error('boom') })

    const line = write.mock.calls[0][0]
    expect(line).toContain('boom')
    expect(line.split('\n')).toEqual([expect.any(String), ''])
  })
})

describe('readLogSettings', () => {
  it('defaults to info and json', () => {
    expect(readLogSettings({})).toEqual({ level: 'info', format: 'json' })
  })

  it('treats an empty value as unset', () => {
    expect(readLogSettings({ LOG_LEVEL: '', LOG_FORMAT: '' })).toEqual({
      level: 'info',
      format: 'json',
    })
  })

  it('reads valid values', () => {
    expect(readLogSettings({ LOG_LEVEL: 'warn', LOG_FORMAT: 'pretty' })).toEqual({
      level: 'warn',
      format: 'pretty',
    })
  })

  it('throws on an unknown value without echoing it', () => {
    expect(() => readLogSettings({ LOG_LEVEL: 'debug' })).toThrow(
      /^LOG_LEVEL must be one of: info, warn, error$/,
    )
    expect(() => readLogSettings({ LOG_FORMAT: 'yaml' })).toThrow(
      /^LOG_FORMAT must be one of: json, pretty$/,
    )
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test`
Expected: FAIL, `logger.test.ts` cannot resolve `./logger.js`.

- [ ] **Step 3: Write the logger**

Create `server/src/lib/logger.ts`:

```ts
export type LogLevel = 'info' | 'warn' | 'error'
export type LogFormat = 'json' | 'pretty'
export type LogData = Record<string, unknown>
export type LogSettings = { level: LogLevel; format: LogFormat }

export type Logger = {
  info: (event: string, data?: LogData) => void
  warn: (event: string, data?: LogData) => void
  error: (event: string, data?: LogData) => void
}

export type LoggerOptions = { level: LogLevel; format: LogFormat; write: (line: string) => void }

// Ordered from least to most severe.
const LOG_LEVELS: readonly LogLevel[] = ['info', 'warn', 'error']
const LOG_FORMATS: readonly LogFormat[] = ['json', 'pretty']
const DEFAULT_LEVEL: LogLevel = 'info'
// The container has no dotenv file: JSON is what a log collector reads.
const DEFAULT_FORMAT: LogFormat = 'json'
// Pads the labels so events line up in pretty format.
const LEVEL_LABEL_WIDTH = 'error'.length

// JSON.stringify writes an Error as {}: its fields are not enumerable.
function serializeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack }
  }
  return value
}

function serializeData(data: LogData): LogData {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, serializeValue(value)]),
  )
}

function formatJson(level: LogLevel, event: string, data: LogData): string {
  return JSON.stringify({ time: new Date().toISOString(), level, event, ...serializeData(data) })
}

function formatPrettyValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(serializeValue(value))
}

function formatPretty(level: LogLevel, event: string, data: LogData): string {
  const time = new Date().toLocaleTimeString('fr-FR')
  const label = level.toUpperCase().padEnd(LEVEL_LABEL_WIDTH)
  const pairs = Object.entries(data).map(([key, value]) => `${key}=${formatPrettyValue(value)}`)
  return [time, label, event, ...pairs].join(' ')
}

export function createLogger({ level: minimalLevel, format, write }: LoggerOptions): Logger {
  const formatLine = format === 'json' ? formatJson : formatPretty

  function log(level: LogLevel, event: string, data: LogData = {}): void {
    if (LOG_LEVELS.indexOf(level) < LOG_LEVELS.indexOf(minimalLevel)) {
      return
    }
    write(`${formatLine(level, event, data)}\n`)
  }

  return {
    info: (event, data) => log('info', event, data),
    warn: (event, data) => log('warn', event, data),
    error: (event, data) => log('error', event, data),
  }
}

function readChoice<Choice extends string>(
  value: string | undefined,
  name: string,
  choices: readonly Choice[],
  fallback: Choice,
): Choice {
  if (value === undefined || value === '') {
    return fallback
  }
  const match = choices.find((choice) => choice === value)
  // The value stays out of the message: environment values are never logged.
  if (match === undefined) {
    throw new Error(`${name} must be one of: ${choices.join(', ')}`)
  }
  return match
}

export function readLogSettings(env: NodeJS.ProcessEnv): LogSettings {
  return {
    level: readChoice(env.LOG_LEVEL, 'LOG_LEVEL', LOG_LEVELS, DEFAULT_LEVEL),
    format: readChoice(env.LOG_FORMAT, 'LOG_FORMAT', LOG_FORMATS, DEFAULT_FORMAT),
  }
}

// Read here, not in config.ts: tests import the logger without the database secrets.
export const logger: Logger = createLogger({
  ...readLogSettings(process.env),
  write: (line) => {
    process.stdout.write(line)
  },
})
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS, 30 tests (21 existing + 9 new).

- [ ] **Step 5: Check and commit the logger**

Run: `pnpm check && pnpm typecheck` (if Biome reformats, `pnpm check:fix` then `pnpm check`).

```bash
git add server/src/lib/logger.ts server/src/lib/logger.test.ts
git commit -F <message-file>
```

Message: `feat(server): add a structured logger` + attribution lines.

- [ ] **Step 6: Document the two variables**

Append to the example file without reading it (the dotenv guard blocks reader commands on it):

```bash
printf '\n# Logs (optional): LOG_LEVEL info | warn | error, LOG_FORMAT json | pretty\nLOG_LEVEL=info\nLOG_FORMAT=pretty\n' >> server/.env.example
git diff server/.env.example
```

Expected diff: the comment line and the two variables added at the end, nothing else.

In `ARCHITECTURE.md`, section `## Configuration`, insert after the first bullet (the one about `server/src/config.ts`):

```md
- `LOG_LEVEL` (`info`, `warn`, `error` ; défaut `info`) et `LOG_FORMAT` (`json`, `pretty` ; défaut `json`) sont facultatives et lues dans `server/src/lib/logger.ts`, pas dans `config.ts` : les tests importent le logger sans fournir les secrets. Une valeur inconnue empêche le démarrage.
```

- [ ] **Step 7: Run the task gates and commit the docs**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build && pnpm test:bruno`
Expected: all green; Bruno unchanged (nothing uses the logger yet).

```bash
git add server/.env.example ARCHITECTURE.md
git commit -F <message-file>
```

Message: `docs: document the log settings` + attribution lines.

---

### Task 2: Photo events from the service (PR B, `feat/server-event-logs`)

**Files:**
- Modify: `server/src/features/photos/photos.service.ts`
- Test: `server/src/features/photos/photos.service.test.ts`
- Modify: `server/src/app.ts:16-19` (pass the logger)
- Modify: `ARCHITECTURE.md` (section `## Couches du backend`, factory example)

**Interfaces:**
- Consumes: `import { type Logger, logger } from '../../lib/logger.js'` (Task 1).
- Produces: `PhotosServiceDeps` gains `logger: Logger`. `createPhotosService({ repository, toFrameJpeg, uploadImage, logger })`.

- [ ] **Step 1: Write the failing tests**

Replace `server/src/features/photos/photos.service.test.ts` with:

```ts
import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
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
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

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

  it('logs the created photo by its identifiers, never by its uploader name', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file: JPEG_FILE })

    expect(deps.logger.info).toHaveBeenCalledWith('photo.created', {
      photoId: RECORD.id,
      cloudinaryId: RECORD.cloudinaryId,
    })
    expect(JSON.stringify(deps.logger.info.mock.calls)).not.toContain('Mamie')
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

  it.each(['image/png', 'image/webp'])('accepts %s', async (mimetype) => {
    const deps = makeDeps()
    const file: UploadedFile = { buffer: Buffer.from('image'), mimetype }

    await createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file })

    expect(deps.toFrameJpeg).toHaveBeenCalledWith(file.buffer)
  })

  it('turns an image sharp cannot read into IMAGE_UNREADABLE and logs the sharp error', async () => {
    const deps = makeDeps()
    const sharpError = new Error('Input buffer contains unsupported image format')
    deps.toFrameJpeg.mockRejectedValue(sharpError)

    await expect(
      createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file: JPEG_FILE }),
    ).rejects.toMatchObject({ code: 'IMAGE_UNREADABLE' })
    expect(deps.uploadImage).not.toHaveBeenCalled()
    expect(deps.logger.warn).toHaveBeenCalledWith('photo.unreadable', { error: sharpError })
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

    await expect(
      createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file: JPEG_FILE }),
    ).rejects.toBe(databaseError)
    expect(deps.logger.error).toHaveBeenCalledWith('photo.orphaned', {
      cloudinaryId: IMAGE.cloudinaryId,
      error: databaseError,
    })
    expect(deps.logger.info).not.toHaveBeenCalled()
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

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test`
Expected: FAIL on `logs the created photo…`, `…logs the sharp error`, `logs the orphaned Cloudinary image…` (logger never called). `pnpm typecheck` may also complain that `logger` is not in `PhotosServiceDeps` until Step 3.

- [ ] **Step 3: Log from the service**

Replace `server/src/features/photos/photos.service.ts` with (the inner helpers move to module level to keep the factory under 30 lines):

```ts
import { AppError } from '../../errors/app-error.js'
import type { UploadedImage } from '../../lib/cloudinary.js'
import type { Logger } from '../../lib/logger.js'
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
  logger: Logger
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

function parseFile(file: UploadedFile | undefined): UploadedFile {
  if (!file) {
    throw new AppError('PHOTO_MISSING')
  }
  // Cheap first filter: the browser's mimetype can lie, sharp checks for real.
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new AppError('FORMAT_UNSUPPORTED')
  }
  return file
}

async function convertToFrameJpeg(
  { toFrameJpeg, logger }: PhotosServiceDeps,
  input: Buffer,
): Promise<Buffer> {
  try {
    return await toFrameJpeg(input)
  } catch (error) {
    logger.warn('photo.unreadable', { error })
    throw new AppError('IMAGE_UNREADABLE')
  }
}

async function saveRecord(
  { repository, logger }: PhotosServiceDeps,
  image: UploadedImage,
  uploaderName: string,
): Promise<PhotoRecord> {
  try {
    return await repository.create({ ...image, uploaderName })
  } catch (error) {
    // The image is on Cloudinary with no record pointing to it: its id is needed to clean up.
    logger.error('photo.orphaned', { cloudinaryId: image.cloudinaryId, error })
    throw error
  }
}

export function createPhotosService(deps: PhotosServiceDeps): PhotosService {
  const { repository, uploadImage, logger } = deps

  async function createPhoto({ uploaderName, file }: NewPhotoInput): Promise<PhotoRecord> {
    const validUploaderName = parseUploaderName(uploaderName)
    const validFile = parseFile(file)
    const jpeg = await convertToFrameJpeg(deps, validFile.buffer)
    // Cloudinary and database failures are ours: they stay 500s.
    const image = await uploadImage(jpeg)
    const record = await saveRecord(deps, image, validUploaderName)
    logger.info('photo.created', { photoId: record.id, cloudinaryId: record.cloudinaryId })
    return record
  }

  return {
    listLatest: () => repository.findLatest(LATEST_PHOTOS_LIMIT),
    createPhoto,
  }
}
```

In `server/src/app.ts`, add the import (Biome sorts imports; keep `.js`):

```ts
import { logger } from './lib/logger.js'
```

and pass it to the service:

```ts
  const service = createPhotosService({ repository, toFrameJpeg, uploadImage, logger })
```

In `ARCHITECTURE.md`, section `## Couches du backend`, update the factory example in the bullet `Les dépendances sont passées par des fonctions-fabriques (…)`:

```md
- Les dépendances sont passées par des fonctions-fabriques (`createPhotosService({ repository, toFrameJpeg, uploadImage, logger })`), assemblées dans `app.ts` : un test peut fournir de fausses implémentations.
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS, 31 tests (30 + the new `logs the created photo…`).

- [ ] **Step 5: Run the task gates and commit**

Run: `pnpm check && pnpm typecheck && pnpm build`, wait ~3 s for the API to reload, then `pnpm test:bruno`.
Expected: all green, Bruno unchanged.

```bash
git add server/src/features/photos/photos.service.ts server/src/features/photos/photos.service.test.ts server/src/app.ts ARCHITECTURE.md
git commit -F <message-file>
```

Message: `feat(server): log photo events from the service` + attribution lines.

---

### Task 3: Request, error and process events (PR B, `feat/server-event-logs`)

**Files:**
- Create: `server/src/lib/request-logger.ts`
- Modify: `server/src/app.ts` (mount the request logger first)
- Modify: `server/src/errors/error-handler.ts:34-46`
- Modify: `server/src/server.ts` (whole file)
- Modify: `ARCHITECTURE.md` (new section `## Logs`)

**Interfaces:**
- Consumes: `import { type LogLevel, logger } from './logger.js'` (Task 1).
- Produces: `export function requestLogger(req: Request, res: Response, next: NextFunction): void`.

No unit test (spec: Express plumbing and process lifecycle). The gates and the manual check below cover them.

- [ ] **Step 1: Write the request logger**

Create `server/src/lib/request-logger.ts`:

```ts
import type { NextFunction, Request, Response } from 'express'
import { type LogLevel, logger } from './logger.js'

// The J2 healthcheck calls it every few seconds: it would flood the logs.
const SKIPPED_PATHS = ['/api/health']
const CLIENT_ERROR_STATUS = 400
const SERVER_ERROR_STATUS = 500

function levelForStatus(status: number): LogLevel {
  if (status >= SERVER_ERROR_STATUS) {
    return 'error'
  }
  if (status >= CLIENT_ERROR_STATUS) {
    return 'warn'
  }
  return 'info'
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Read now: routers rewrite req.url while the request goes through them.
  const { method, path } = req
  if (SKIPPED_PATHS.includes(path)) {
    next()
    return
  }
  const startedAt = performance.now()
  res.on('finish', () => {
    const status = res.statusCode
    const durationMs = Math.round(performance.now() - startedAt)
    logger[levelForStatus(status)]('http.request', { method, path, status, durationMs })
  })
  next()
}
```

(`req.path` has no query string, as the PII rule requires.)

In `server/src/app.ts`, import it and mount it before every other middleware:

```ts
import { requestLogger } from './lib/request-logger.js'
```

```ts
  const app = express()

  // First, so every request is timed and logged, 404s included.
  app.use(requestLogger)
  app.use(cors({ origin: config.clientOrigin }))
```

Run: `pnpm check && pnpm typecheck`. Commit:

```bash
git add server/src/lib/request-logger.ts server/src/app.ts
git commit -F <message-file>
```

Message: `feat(server): log each finished HTTP request` + attribution lines.

- [ ] **Step 2: Log server errors and the process lifecycle**

In `server/src/errors/error-handler.ts`, add `import { logger } from '../lib/logger.js'` and replace `errorHandler` with:

```ts
// Express spots an error handler by its 4 parameters.
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const { status, body } = toErrorResponse(error)
  if (status === HTTP_STATUS_BY_CODE.SERVER_ERROR) {
    logger.error('server.error', { error, method: req.method, path: req.path })
  }
  res.status(status).json(body)
}
```

Replace `server/src/server.ts` with:

```ts
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { createApp } from './app.js'
import { config } from './config.js'
import { prisma } from './lib/db.js'
import { logger } from './lib/logger.js'
import type { ClientToServerEvents, ServerToClientEvents } from './types.js'

// Exit after logging: Docker restarts the container from a clean state.
function crash(error: unknown): void {
  logger.error('process.crashed', { error })
  process.exit(1)
}

process.on('uncaughtException', crash)
process.on('unhandledRejection', crash)

// Not $connect(): with MongoDB it succeeds without reaching the server.
try {
  await prisma.$runCommandRaw({ ping: 1 })
  logger.info('db.connected')
} catch (error) {
  logger.error('db.unreachable', { error })
  process.exit(1)
}

// Created before the HTTP server: the routes need it to broadcast.
const io = new Server<ClientToServerEvents, ServerToClientEvents>({
  cors: { origin: config.clientOrigin },
})
const httpServer = createServer(createApp(io))
io.attach(httpServer)

io.on('connection', (socket) => {
  logger.info('socket.connected', { socketId: socket.id })
  socket.on('disconnect', (reason) => {
    logger.info('socket.disconnected', { socketId: socket.id, reason })
  })
})

httpServer.listen(config.port, () => {
  logger.info('server.started', { port: config.port })
})

// `docker stop` sends SIGTERM.
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info('server.stopping', { signal })
  try {
    await io.close() // also closes the HTTP server
    await prisma.$disconnect()
    logger.info('server.stopped')
    process.exit(0)
  } catch (error) {
    logger.error('server.stop_failed', { error })
    process.exit(1)
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
```

Check: `grep -rn "console\." server/src` prints nothing.

Run: `pnpm check && pnpm typecheck && pnpm test`. Commit:

```bash
git add server/src/errors/error-handler.ts server/src/server.ts
git commit -F <message-file>
```

Message: `feat(server): log server errors and the process lifecycle` + attribution lines.

- [ ] **Step 3: Describe the logs**

In `ARCHITECTURE.md`, insert a new section right before `## Réseau en développement`:

```md
## Logs

- Le serveur écrit **une ligne par événement sur la sortie standard**, via `server/src/lib/logger.ts` (fait maison, sans dépendance). C'est ce que `docker logs` affiche.
- **Format** : JSON par défaut, filtrable (`{"time":"…","level":"info","event":"photo.created","photoId":"…"}`) ; `LOG_FORMAT=pretty` en dev donne `14:37:17 INFO  photo.created photoId=…`. Une `Error` est écrite avec son nom, son message et sa pile.
- **Niveaux** : `info` < `warn` < `error` ; `LOG_LEVEL` fixe le niveau minimum écrit.
- **Noms d'événements stables** `domaine.action` : on filtre sur le nom (`docker logs <conteneur> | grep photo.`), pas sur un texte qui change à chaque reformulation.
- **Pas de données personnelles** : jamais le pseudo, seulement des identifiants (`photoId`, `cloudinaryId`, `socketId`) ; les chemins sans leur query string.
- Le service photos reçoit le logger par injection ; le reste du serveur importe `logger`.

| Événement                                                   | Niveau                         | Écrit par                                                   |
| ----------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------- |
| `db.connected` / `db.unreachable`                           | info / error                   | `server.ts`, ping au démarrage                              |
| `server.started`                                            | info                           | `server.ts`                                                 |
| `socket.connected` / `socket.disconnected`                  | info                           | `server.ts`                                                 |
| `http.request`                                              | info, warn (4xx), error (5xx)  | `lib/request-logger.ts`, sauf `/api/health`                 |
| `photo.created`                                             | info                           | service photos                                              |
| `photo.unreadable`                                          | warn                           | service photos, erreur de sharp                             |
| `photo.orphaned`                                            | error                          | service photos : image sur Cloudinary, absente de la base   |
| `server.error`                                              | error                          | `errors/error-handler.ts`, pour chaque 500                  |
| `server.stopping` / `server.stopped` / `server.stop_failed` | info / info / error            | `server.ts`, à l'arrêt                                      |
| `process.crashed`                                           | error                          | `server.ts`, exception ou rejet non géré, puis arrêt        |
```

Run the task gates: `pnpm check && pnpm typecheck && pnpm test && pnpm build`, wait ~3 s, `pnpm test:bruno`.
Expected: all green, Bruno unchanged.

```bash
git add ARCHITECTURE.md
git commit -F <message-file>
```

Message: `docs: describe the server logs` + attribution lines.

- [ ] **Step 4: Manual check (controller or author, not the implementer)**

The implementer cannot see the running API's output. After the task review, in a terminal running `pnpm dev` with `LOG_FORMAT=pretty`: one upload from the client, one unknown route (`/api/nope`), `Ctrl+C`. Expected lines: `db.connected`, `server.started`, `socket.connected`, `http.request` (201 info, 404 warn), `photo.created`, `server.stopping`, `server.stopped`. Repeat once with `LOG_FORMAT=json`. Note in the Drift Log any line lost at exit (Windows pipes may drop the last write before `process.exit`).

---

### Task 4: Guards and the JSON parser (PR C, `fix/server-logging-guards`)

**Files:**
- Modify: `biome.json` (add `overrides`)
- Modify: `.claude/rules/08-domain-specific-rules/8-security-logging.md`
- Modify: `ARCHITECTURE.md` (section `## Outillage`, Biome bullet)
- Create: `server/bruno/photos/create/09-edge-json-malforme.bru`
- Modify: `server/src/app.ts` (remove `app.use(express.json())`)

**Interfaces:**
- Consumes: Tasks 1-3 (no `console` left in `server/src`).
- Produces: nothing new.

- [ ] **Step 1: Forbid console in the server**

In `biome.json`, add a top-level `overrides` key after `"linter"`:

```json
  "overrides": [
    {
      "includes": ["server/src/**"],
      "linter": {
        "rules": {
          "suspicious": {
            "noConsole": "error"
          }
        }
      }
    }
  ],
```

Prove the rule bites: add a temporary `console.log('probe')` at the end of `server/src/app.ts`, run `pnpm check`, expect an error `lint/suspicious/noConsole`, then remove the line and run `pnpm check` again (green). Do not commit the probe.

Append to `.claude/rules/08-domain-specific-rules/8-security-logging.md`:

```md
- Log through `server/src/lib/logger.ts`, never `console`
```

In `ARCHITECTURE.md`, section `## Outillage`, replace the Biome bullet with:

```md
- **Biome** : lint, formatage et tri des imports (remplace ESLint + Prettier). Dans `server/src`, `noConsole` interdit `console` : on passe par le logger.
```

Run: `pnpm check && pnpm typecheck`. Commit:

```bash
git add biome.json .claude/rules/08-domain-specific-rules/8-security-logging.md ARCHITECTURE.md
git commit -F <message-file>
```

Message: `chore: forbid console in the server code` + attribution lines.

- [ ] **Step 2: Write the failing Bruno request**

Create `server/bruno/photos/create/09-edge-json-malforme.bru`:

```
meta {
  name: Edge - JSON malformé
  type: http
  seq: 9
}

post {
  url: {{baseUrl}}/api/photos
  body: text
  auth: none
}

headers {
  Content-Type: application/json
}

body:text {
  {"uploaderName": "Mamie"
}

assert {
  res.status: eq 400
  res.body.error: eq UPLOADER_NAME_INVALID
}

docs {
  EDGE → 400 UPLOADER_NAME_INVALID, un corps JSON n'est pas lu : la route attend du multipart.
}
```

Run: `pnpm test:bruno`
Expected: FAIL on `Edge - JSON malformé` only, status 500 (the JSON parser throws a `SyntaxError` the error handler does not know).

- [ ] **Step 3: Remove the JSON parser**

In `server/src/app.ts`, delete the line `app.use(express.json())`. The `express` default import stays (it builds the app).

Wait ~3 s for the API to reload, then run: `pnpm test:bruno`
Expected: PASS, every request including `Edge - JSON malformé` (400 `UPLOADER_NAME_INVALID`: the controller reads `req.body?.uploaderName`, undefined without a parser).

- [ ] **Step 4: Run the task gates and commit**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: all green.

```bash
git add server/bruno/photos/create/09-edge-json-malforme.bru server/src/app.ts
git commit -F <message-file>
```

Message: `fix(server): stop parsing JSON bodies no route reads` + attribution lines. Body: one line saying malformed JSON answered 500 and now answers 400.

---

## Drift Log

Format: `date · task/step · what the plan said · what was done · why`.
