# Backend layers and centralized error handling

- Date: 2026-11-23
- Scope: backend items 1 (centralized error handling) and 2 (route, middleware, controller, service, repository layers) of the backend roadmap. Items 3 (Vitest unit tests) and 4 (logging strategy) get their own specs, in that order.
- AI usage: designed with the `superpowers:brainstorming` skill; each decision below was asked to the author one at a time, with a recommendation.

## Goal

`server/src/photos.ts` holds routes, validation, sharp, Cloudinary, Prisma, Socket.IO and error responses in one file. Errors are answered in two places: `sendError` inline in the routes, and the error handler in `app.ts`. Split the backend into layers with one job each, and answer every error from one place, without changing the API contract (except one added code).

## Decisions

| Topic                | Decision                                                                                      | Main reason                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Order                | errors + layers first, then Vitest, then logging                                              | services need typed errors to throw; tests and logs need stable boundaries      |
| Folder layout        | by feature: `features/photos/photos.<layer>.ts`                                               | same as the author's previous API; a feature stays in one place                 |
| Error model          | one `AppError` class carrying an `ApiErrorCode`; status from a `Record<ApiErrorCode, number>` | the code already is the contract with the client; the `Record` is exhaustive    |
| Validation           | in the service, not in a middleware                                                           | business rules in one place, unit-testable without Express                      |
| Service dependencies | injected through a factory function: `createPhotosService(deps)`                              | explicit, test fakes without `vi.mock`; same idea as `createPhotosRouter(io)`   |
| Socket.IO broadcast  | in the controller                                                                             | Socket.IO is an output channel like the HTTP response; the service ignores both |

Rejected: one error class per case (more files, a `Map` that silently turns a forgotten class into a 500); a validation middleware (needs `req`/`res`/`next` fakes, splits validation from the sharp check); module mocking with `vi.mock` (hoisted, implicit, path-fragile).

## Structure

```
server/src/
  app.ts                  wiring: repository → service → controller → routes; not-found and error handler last
  server.ts               unchanged
  config.ts, types.ts     unchanged (types.ts stays the contract shared with the client)
  errors/
    app-error.ts          class AppError extends Error { readonly code: ApiErrorCode }
    error-handler.ts      the only place that writes an error response
    not-found.ts          unknown route → AppError('ROUTE_NOT_FOUND')
  features/photos/
    photos.routes.ts      GET / and POST / (with the upload middleware) → controller
    photos.controller.ts  reads req, calls the service, maps to the DTO, io.emit, sends 201
    photos.service.ts     createPhotosService(deps): listLatest(), createPhoto({ uploaderName, file })
    photos.repository.ts  createPhotosRepository(prisma): findLatest(limit), create(data)
    photos.upload.ts      Multer config: memory storage, 10 MB, one file
  lib/
    db.ts, cloudinary.ts, image.ts   moved unchanged
```

Who knows what:

- Only the repository knows Prisma.
- Only the service knows the business rules: uploader name 1 to 30 characters, file present, JPEG/PNG/WebP, readable image. It knows neither Express nor Socket.IO.
- Only the controller knows `req`, `res` and `io`.
- Only `app.ts` assembles the pieces.

Service dependencies:

```ts
type PhotosServiceDeps = {
  repository: PhotosRepository
  toFrameJpeg: (input: Buffer) => Promise<Buffer>
  uploadImage: (jpeg: Buffer) => Promise<UploadedImage>
}
```

## Request flow: `POST /api/photos`

1. Route: `upload.single('photo')` fills `req.file` and `req.body`.
2. Controller: `service.createPhoto({ uploaderName: req.body?.uploaderName, file: req.file })`. The service takes `uploaderName: unknown` and `file` possibly undefined: checking them is its job.
3. Service, in order:
   1. uploader name trimmed, 1 to 30 characters, else `AppError('UPLOADER_NAME_INVALID')`;
   2. file present, else `AppError('PHOTO_MISSING')`;
   3. mimetype JPEG, PNG or WebP, else `AppError('FORMAT_UNSUPPORTED')`;
   4. `toFrameJpeg` (sharp); a throw becomes `AppError('IMAGE_UNREADABLE')`;
   5. `uploadImage` (Cloudinary); a throw propagates unchanged (500);
   6. `repository.create`; a throw logs the orphaned `cloudinaryId`, then is rethrown (500);
   7. returns the created row.
4. Controller: `toPhotoDto(row)`, `io.emit('photo:new', photo)`, `res.status(201).json(photo)`.

`GET /api/photos`: controller → `service.listLatest()` → `repository.findLatest(20)` → DTOs.

## Error flow

- The service throws, it never answers. The controller has no try/catch: Express 5 forwards async rejections to the error handler.
- A third-party error is translated in the service only when it is the user's fault: sharp failing on an unreadable upload. Cloudinary and Prisma failures are ours and stay 500s.
- `error-handler.ts`, mounted last:

| Received                        | Response                                                     |
| ------------------------------- | ------------------------------------------------------------ |
| `AppError`                      | `HTTP_STATUS_BY_CODE[code]`, `{ "error": code }`             |
| `MulterError` `LIMIT_FILE_SIZE` | 413 `PHOTO_TOO_LARGE`                                        |
| other `MulterError`             | 400 `UPLOAD_INVALID`                                         |
| anything else                   | 500 `SERVER_ERROR`; details logged, never sent to the client |

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

`sendError` is removed.

## API contract change

One added code: `ROUTE_NOT_FOUND` (404) for any unknown route, so every error response has the `{ "error": code }` shape. Today `GET /api/unknown` returns Express's default HTML 404. The code is added to `server/src/types.ts`, to the client copy and its French messages (`client/src/api.ts`), and to Bruno.

Everything else is unchanged: routes, statuses, existing codes, DTO.

## Logging

The current `console.error` calls (500 details, orphaned Cloudinary image) stay as they are. The logging strategy (item 4) replaces them.

## Delivery

Large change: atomic commits, three stacked and scoped PRs, each green on `pnpm check`, `pnpm typecheck`, `pnpm build` and `pnpm test:bruno`.

| PR  | Base      | Scope                                                                                                                                            |
| --- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| A   | `develop` | This spec. `AppError` and the central error handler; `photos.ts` throws instead of calling `sendError`. `ROUTE_NOT_FOUND` with client and Bruno. |
| B   | A         | Move `db`, `cloudinary`, `image` to `lib/`. Photos repository; Multer config to `photos.upload.ts`.                                              |
| C   | B         | Photos service with injected dependencies; routes and controller; `photos.ts` removed. ARCHITECTURE updated.                                     |

Stacked PR rule (CONTRIBUTING): retarget the next PR to `develop` before merging its base.

## Verification

- Bruno is the regression net: the API contract does not change, so the existing requests pass unmodified. One request added: `GET /api/unknown` → 404 `ROUTE_NOT_FOUND`.
- Manual browser check after PR C: upload, live frame update, French message on a GIF.
- No unit tests in these PRs (item 3). The design makes the service and the error handler testable without Express, a database or Cloudinary.

## Out of scope

- Vitest (item 3), logging strategy (item 4).
- Orphaned Cloudinary image cleanup.
- Frontend refactoring.
