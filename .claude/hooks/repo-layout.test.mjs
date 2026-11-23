import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { trackedDirectories } from './repo-layout.mjs'

const HOOK = fileURLToPath(new URL('./repo-layout.mjs', import.meta.url))

describe('trackedDirectories', () => {
  it('lists directories up to depth 2, sorted and unique', () => {
    const files = [
      'README.md',
      'client/src/App.tsx',
      'client/src/deep/nested/file.ts',
      'client/vite.config.ts',
      'server/src/index.ts',
      '.claude/hooks/x.mjs',
    ]
    assert.deepEqual(trackedDirectories(files), [
      '.claude/',
      '.claude/hooks/',
      'client/',
      'client/src/',
      'server/',
      'server/src/',
    ])
  })

  it('returns nothing for root-only files', () => {
    assert.deepEqual(trackedDirectories(['README.md', 'package.json']), [])
  })
})

describe('hook process', () => {
  it('prints the layout of this repository', () => {
    const res = spawnSync(process.execPath, [HOOK], { encoding: 'utf8' })
    assert.equal(res.status, 0)
    assert.match(res.stdout, /^Tracked directories/)
    assert.match(res.stdout, /^server\/src\/$/m)
  })

  it('fails open outside a git repository', () => {
    const res = spawnSync(process.execPath, [HOOK], {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: '/' },
    })
    assert.equal(res.status, 0)
    assert.equal(res.stdout, '')
  })
})
