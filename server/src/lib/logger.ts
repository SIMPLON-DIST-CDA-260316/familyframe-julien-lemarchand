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
