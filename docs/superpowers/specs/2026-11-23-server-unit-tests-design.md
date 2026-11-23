# Server unit tests with Vitest

- Date: 2026-11-23
- Scope: backend item 3 (unit tests). Item 4 (logging strategy) gets its own spec next.
- AI usage: designed with the `superpowers:brainstorming` skill; each decision below was asked to the author one at a time, with a recommendation.
- Builds on: `2026-11-23-backend-layers-errors-design.md` (layers, injected service dependencies, central error handler).

## Goal

The backend now has a service with injected dependencies and a single error handler. Cover their logic with fast unit tests, without Express, a database or Cloudinary. Bruno stays the end-to-end HTTP net.

## Decisions

| Topic         | Decision                                                              | Main reason                                                                       |
| ------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Scope         | photos service and error handler only                                 | that is where the logic lives; the controller is thin plumbing; Bruno covers HTTP |
| Test location | next to the code: `photos.service.test.ts`, `error-handler.test.ts`   | a feature stays in one folder; the test is found at once                          |
| Fakes         | `vi.fn()` passed through the factory; `vi.spyOn(console, 'error')`    | assert calls (e.g. Cloudinary never called on a bad name) without module mocking  |
| Error handler | extract a pure `toErrorResponse(error)` and test it                   | testing `errorHandler` itself needs a fake `Response`, i.e. an `as` cast          |
| Readability   | after the tests, apply the final review's naming fixes to the service | refactor under a test net                                                         |

Rejected: controller tests with fake `req`/`res`/`io` (low value, plumbing); supertest integration tests (second dependency, `createApp` change, duplicates Bruno); a `server/tests/` tree (long imports, extra tsconfig); hand-written fakes (call assertions need hand-written counters); `vi.mock` (already rejected in the previous spec).

## Tooling

- New dev dependency, approved by the author: `vitest` (5.x) in `server` only. No config file: the defaults find `*.test.ts`, run in Node and resolve `.js` imports to `.ts`.
- `server/package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`.
- Root `package.json`: `"test": "pnpm --filter server test"`, same shape as `test:bruno`.
- `server/tsconfig.build.json` extends `tsconfig.json` and excludes `src/**/*.test.ts`; `"build": "tsc -p tsconfig.build.json"`. Tests never reach `dist` (nor the J2 Docker image). `typecheck` keeps the full `tsconfig.json`, so test files are type-checked.
- No lefthook job: the pre-commit hook stays fast. `pnpm test` joins `pnpm check` as a gate before each PR, and goes into CI when there is one.
- AGENTS.md working rule: "a business rule changed in a service → its unit test in the same commit". README: `pnpm test`.

## Error handler

```ts
export type ErrorResponse = { status: number; body: ApiError }

export function toErrorResponse(error: unknown): ErrorResponse {
  const code = toErrorCode(error)
  return { status: HTTP_STATUS_BY_CODE[code], body: { error: code } }
}
```

`errorHandler` keeps its 4 parameters, calls `toErrorResponse`, logs the error when the status is 500, and writes the response. Behavior is unchanged.

`error-handler.test.ts`, on `toErrorResponse`:

1. `AppError('FORMAT_UNSUPPORTED')` → 415 `{ error: 'FORMAT_UNSUPPORTED' }`.
2. `AppError('ROUTE_NOT_FOUND')` → 404.
3. `MulterError('LIMIT_FILE_SIZE')` → 413 `PHOTO_TOO_LARGE`.
4. Other `MulterError` (`LIMIT_UNEXPECTED_FILE`) → 400 `UPLOAD_INVALID`.
5. `new Error` with a secret-looking message → 500, body exactly `{ error: 'SERVER_ERROR' }` (no detail leaks).
6. A thrown non-`Error` value (`'boom'`) → 500.

Not one test per code: the exhaustive `Record` already guarantees at typecheck time that no code is missing.

## Photos service

`photos.service.test.ts`. A `makeDeps()` helper returns succeeding `vi.fn()` fakes; each test overrides only what it is about.

`createPhoto`:

1. Nominal: returns the repository's record; `create` receives `{ url, cloudinaryId, uploaderName }`; the name is trimmed (`'  Mamie  '` → `'Mamie'`).
2. Invalid name (empty, only spaces, 31 characters, not a string) → `UPLOADER_NAME_INVALID`, and `toFrameJpeg` is not called.
3. Upper bound: a 30-character name is accepted.
4. Missing file → `PHOTO_MISSING`.
5. Mimetype `image/gif` → `FORMAT_UNSUPPORTED`.
6. `toFrameJpeg` rejects → `IMAGE_UNREADABLE`; `uploadImage` is not called.
7. `uploadImage` rejects → the original error propagates unchanged (not an `AppError`); `create` is not called.
8. `create` rejects → the error propagates and `console.error` receives the orphaned `cloudinaryId`.

`listLatest`:

9. Calls `findLatest(20)` and returns its result.

Cases 2, 4 and 5 use `it.each` where several inputs share one expectation.

## Readability fixes (from the previous final review)

With the tests green, in `photos.service.ts`:

- rename the inner `toJpeg` (too close to the injected `toFrameJpeg`) to `convertToFrameJpeg`;
- `checkFile` → `parseFile`, matching `parseUploaderName` (same validate-and-return pattern);
- `const validFile = parseFile(file)` on its own line, mirroring `validUploaderName`, instead of nesting the check inside the conversion.

No behavior change: the tests from the previous PR pass unmodified.

## Delivery

A native GitHub stack created with `gh stack`, three scoped PRs, each green on `pnpm check`, `pnpm typecheck`, `pnpm build`, `pnpm test` and `pnpm test:bruno`. The stack is merged at once (squash per PR).

| PR  | Branch                          | Scope                                                                              |
| --- | ------------------------------- | ---------------------------------------------------------------------------------- |
| A   | `test/vitest-setup`             | This spec. Vitest, scripts, `tsconfig.build.json`, `toErrorResponse` + tests, docs |
| B   | `test/photos-service`           | Photos service tests                                                               |
| C   | `refactor/photos-service-names` | Readability fixes under the tests                                                  |

## Out of scope

- Controller, routes, repository and integration tests.
- Coverage thresholds and reports.
- CI.
- Logging strategy (item 4).
