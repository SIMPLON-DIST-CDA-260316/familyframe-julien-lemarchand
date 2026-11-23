# Server logging strategy

- Date: 2026-11-23
- Scope: backend item 4 (logging strategy), last of the backend roadmap.
- AI usage: designed with the `superpowers:brainstorming` skill; each decision below was asked to the author one at a time, with a recommendation.
- Builds on: `2026-11-23-backend-layers-errors-design.md` (layers, injected service dependencies) and `2026-11-23-server-unit-tests-design.md` (Vitest, `toErrorResponse`). Settles two follow-ups from their reviews: malformed JSON answered 500, sharp error dropped without a log.

## Goal

Today the server has seven `console.*` calls in three files: no levels, no timestamps, no request log, free text. At J2, `docker logs` (stdout) is how the container tells its story. Make the process document its events in one consistent, filterable format, without a new dependency.

## Decisions

| Topic           | Decision                                                                       | Main reason                                                                    |
| --------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Tool            | a small home-made logger, `lib/logger.ts`, no dependency                       | the author explains every line; same principles as real libraries              |
| Format          | one line per event on stdout; JSON by default, readable `pretty` format in dev | stdout is what Docker collects; JSON is filterable, `pretty` is for humans     |
| Event names     | stable `domain.action` names (`photo.created`)                                 | filter on a name, not on free text that changes with every rewording           |
| HTTP requests   | one line per finished request, level by status, `/api/health` excluded         | see normal traffic; the J2 healthcheck would flood the logs                    |
| Service         | the logger is injected like the other dependencies                             | "the service receives everything that leaves it"; tests use a `vi.fn()` logger |
| Settings source | `LOG_LEVEL` and `LOG_FORMAT` read in `logger.ts`, not `config.ts`              | importing `config.ts` requires the database and Cloudinary secrets             |
| Malformed JSON  | remove `app.use(express.json())`                                               | no route reads a JSON body; it is dead code that turns bad JSON into a 500     |

Rejected: pino with pino-http and pino-pretty (2 to 3 dependencies, child loggers, transports and serializers to learn); keeping `console` with harmonized messages (no levels, no structure); logging only failed requests (normal traffic invisible); logging every request including health (flooded by the healthcheck); importing the logger directly in the service (module spying in tests, the only exception to injection); keeping `express.json()` with a new `BODY_INVALID` code (API contract change for a route that does not exist).

## Logger

`server/src/lib/logger.ts`:

```ts
export type LogLevel = 'info' | 'warn' | 'error'
export type LogFormat = 'json' | 'pretty'
export type LogData = Record<string, unknown>
export type Logger = {
  info: (event: string, data?: LogData) => void
  warn: (event: string, data?: LogData) => void
  error: (event: string, data?: LogData) => void
}
export type LoggerOptions = { level: LogLevel; format: LogFormat; write: (line: string) => void }

export function createLogger(options: LoggerOptions): Logger
export function readLogSettings(env: NodeJS.ProcessEnv): { level: LogLevel; format: LogFormat }
export const logger: Logger // createLogger({ ...readLogSettings(process.env), write: stdout })
```

- One line per event, ending with a newline.
  - JSON: `{"time":"2026-11-23T14:37:17.055Z","level":"info","event":"photo.created","photoId":"6b04…"}`.
  - Pretty: `14:37:17 INFO  photo.created photoId=6b04…`.
- Events below the minimal level are not written (`info` < `warn` < `error`).
- An `Error` anywhere at the top level of `data` is written as `{ name, message, stack }`; `JSON.stringify` would otherwise turn it into `{}`.
- `readLogSettings`: `LOG_LEVEL` defaults to `info`, `LOG_FORMAT` to `json` (the container has no `.env`). An unknown value throws, so the server refuses to start, like a missing variable in `config.ts`.
- `server/.env.example` gets `LOG_LEVEL=info` and `LOG_FORMAT=pretty`.
- No PII (`.claude/rules/08-domain-specific-rules/8-security-logging.md`): never `uploaderName`; identifiers only (`photoId`, `cloudinaryId`, `socketId`). Request paths are logged without their query string.

## Event catalog

| Event                                                       | Level                               | Data                                     | Where                                                                                                  |
| ----------------------------------------------------------- | ----------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `db.connected` / `db.unreachable`                           | info / error                        | `error`                                  | `server.ts`, startup ping (exit 1 on failure)                                                          |
| `server.started`                                            | info                                | `port`                                   | `server.ts`                                                                                            |
| `socket.connected` / `socket.disconnected`                  | info                                | `socketId`, `reason`                     | `server.ts`                                                                                            |
| `http.request`                                              | info below 400, warn 4xx, error 5xx | `method`, `path`, `status`, `durationMs` | `lib/request-logger.ts`, mounted first, skips `/api/health`                                            |
| `photo.created`                                             | info                                | `photoId`, `cloudinaryId`                | photos service                                                                                         |
| `photo.unreadable`                                          | warn                                | `error`                                  | photos service (the sharp error, dropped today)                                                        |
| `photo.orphaned`                                            | error                               | `cloudinaryId`, `error`                  | photos service (replaces the current `console.error`)                                                  |
| `server.error`                                              | error                               | `error`, `method`, `path`                | error handler, for every 500                                                                           |
| `server.stopping` / `server.stopped` / `server.stop_failed` | info / info / error                 | `signal`, `error`                        | `shutdown()` in `server.ts`                                                                            |
| `process.crashed`                                           | error                               | `error`                                  | `server.ts`: `uncaughtException` and `unhandledRejection`, then exit 1 (Docker restarts the container) |

The seven `console.*` calls disappear.

## Service

`PhotosServiceDeps` gets `logger: Logger`; `app.ts` passes the real `logger`. The service logs `photo.created` after the record is saved, `photo.unreadable` (warn, with the sharp error) before throwing `IMAGE_UNREADABLE`, and `photo.orphaned` before rethrowing a database failure. Behavior and responses are unchanged.

## Guards

- Biome `suspicious/noConsole` as an error on `server/src/**`, except `server/src/lib/logger.ts` (the only place that writes to stdout). A forgotten `console.log` fails `pnpm check`.
- `8-security-logging.md` gets: "Log through `server/src/lib/logger.ts`, never `console`".

## Malformed JSON

`app.use(express.json())` is removed. A request with a JSON body is no longer parsed: `POST /api/photos` with a malformed JSON body reaches the photos route without a multipart body and answers 400 `UPLOADER_NAME_INVALID` instead of 500. A Bruno request (`server/bruno/photos/create/09-edge-json-malforme.bru`) asserts it is not a 500 anymore. A future JSON route adds the parser back with its own error code.

## Testing

- `logger.test.ts` (on `createLogger` with a fake `write`, and `readLogSettings`): level filtering; JSON line with `time`, `level`, `event` and data; `Error` serialized; pretty format; settings defaults; unknown value throws.
- `photos.service.test.ts`: `makeDeps()` adds a `vi.fn()` logger; assert `photo.created`, `photo.unreadable` with the sharp error, `photo.orphaned` with the `cloudinaryId` (replacing the `vi.spyOn(console, 'error')`).
- Request logger and `server.ts`: no unit test (Express plumbing, process lifecycle). Manual check: `pnpm dev`, one upload, one unknown route, `Ctrl+C`; read the pretty lines; repeat once with `LOG_FORMAT=json`.
- Bruno: the existing 11 requests unmodified, plus the malformed JSON request.

## Docs

- ARCHITECTURE.md: a "Logs" section (format, levels, event catalog, `docker logs <container> | grep photo.`).
- ARCHITECTURE.md "Configuration": a bullet saying `LOG_LEVEL` and `LOG_FORMAT` are optional, read by `lib/logger.ts`, and refuse to start on an unknown value. The README does not list variables, so it is unchanged.

## Delivery

A native GitHub stack created with `gh stack`, three scoped PRs, each green on `pnpm check`, `pnpm typecheck`, `pnpm build`, `pnpm test` and `pnpm test:bruno`. The stack is merged at once (squash per PR).

| PR  | Branch                      | Scope                                                                                                                                     |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| A   | `feat/server-logger`        | This spec. `lib/logger.ts` and its tests, the two variables, configuration docs                                                           |
| B   | `feat/server-event-logs`    | Every event: `server.ts` (lifecycle, `process.crashed`), request logger, error handler, service logger and its tests, ARCHITECTURE "Logs" |
| C   | `fix/server-logging-guards` | `noConsole`, the security rule, `express.json()` removed with its Bruno request                                                           |

## Out of scope

- Log shipping, rotation or aggregation (Docker and its host handle stdout).
- Request IDs and correlation.
- A `debug` level.
- Client-side logging.
