import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { decide, isProtected } from './dotenv-read-guard.mjs'

const HOOK = fileURLToPath(new URL('./dotenv-read-guard.mjs', import.meta.url))
const bash = (command) => decide({ tool_name: 'Bash', tool_input: { command } })

describe('isProtected', () => {
  it('protects .env and its variants', () => {
    for (const p of ['.env', 'server/.env', 'C:\\app\\.env.local', '.env.production']) {
      assert.ok(isProtected(p), p)
    }
  })

  it('leaves templates and unrelated files readable', () => {
    for (const p of ['.env.example', 'server/.env.sample', 'env.ts', '.environment', 'README.md']) {
      assert.ok(!isProtected(p), p)
    }
  })
})

describe('decide', () => {
  it('blocks Read on .env', () => {
    assert.ok(decide({ tool_name: 'Read', tool_input: { file_path: 'server/.env' } }))
  })

  it('allows Read on .env.example', () => {
    assert.equal(
      decide({ tool_name: 'Read', tool_input: { file_path: 'server/.env.example' } }),
      null,
    )
  })

  it('blocks Grep targeting .env', () => {
    assert.ok(decide({ tool_name: 'Grep', tool_input: { pattern: 'KEY', path: 'server/.env' } }))
  })

  it('blocks shell readers and inline interpreters', () => {
    for (const cmd of [
      'cat server/.env',
      'grep SECRET .env',
      'source .env',
      '. ./.env',
      "node -e \"console.log(require('fs').readFileSync('.env','utf8'))\"",
      'sort < .env',
    ]) {
      assert.ok(bash(cmd), cmd)
    }
    assert.ok(
      decide({ tool_name: 'PowerShell', tool_input: { command: 'Get-Content server\\.env' } }),
    )
  })

  it('allows commands that only name the file or read templates', () => {
    for (const cmd of [
      'test -f server/.env && echo ok',
      'docker compose --env-file .env up',
      'cp server/.env.example server/.env',
      'cat server/.env.example',
      'git status',
    ]) {
      assert.equal(bash(cmd), null, cmd)
    }
  })

  it('ignores other tools', () => {
    assert.equal(decide({ tool_name: 'Write', tool_input: { file_path: '.env' } }), null)
  })
})

describe('hook process', () => {
  const run = (input) => spawnSync(process.execPath, [HOOK], { input, encoding: 'utf8' })

  it('prints a deny decision when blocking', () => {
    const res = run(JSON.stringify({ tool_name: 'Read', tool_input: { file_path: '.env' } }))
    assert.equal(res.status, 0)
    assert.equal(JSON.parse(res.stdout).hookSpecificOutput.permissionDecision, 'deny')
  })

  it('prints nothing when allowing', () => {
    const res = run(JSON.stringify({ tool_name: 'Read', tool_input: { file_path: 'README.md' } }))
    assert.equal(res.status, 0)
    assert.equal(res.stdout, '')
  })

  it('fails closed on invalid input', () => {
    const res = run('not json')
    assert.equal(JSON.parse(res.stdout).hookSpecificOutput.permissionDecision, 'deny')
  })
})
