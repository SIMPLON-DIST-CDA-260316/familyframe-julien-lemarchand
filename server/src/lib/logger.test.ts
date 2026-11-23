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
