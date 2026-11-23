#!/usr/bin/env node
// Claude Code PreToolUse hook: stop the agent from reading .env files.
// Templates (.env.example, .sample, .template, .dist) stay readable.
//
// Contract: JSON on stdin. Print nothing to allow, print a "deny" decision to
// block. Fails closed: any unexpected error denies the call.

import { posix } from 'node:path'
import { pathToFileURL } from 'node:url'

const PROTECTED = /^\.env(\..+)?$/i
const TEMPLATE = /\.(example|sample|template|dist)$/i
// Any token in a shell command that looks like a path to a .env file.
const MENTION = /[^\s"'`;|&<>(),=]*\.env(?:\.[\w-]+)*/gi
// Commands that read file contents (bash + PowerShell). Not cp/mv: copying the
// template to .env is a normal setup step; this guards accidents, not attackers.
const READERS =
  /\b(cat|head|tail|less|more|bat|grep|rg|sed|awk|cut|sort|strings|xxd|od|base64|jq|source|curl|Get-Content|gc|type|Select-String|ReadAllText|ReadAllLines)\b|<\s*\S*\.env|(^|[\s;|&])\.\s+\S*\.env/i
// Inline interpreters can read anything.
const INLINE =
  /\b(node|python3?|perl|ruby|deno|bun)\b\s+(-[ce]|--eval)\b|-Command\b|\b(iex|Invoke-Expression|eval)\b/i

/** @param {string | undefined} path */
export function isProtected(path) {
  if (!path) return false
  const name = posix.basename(path.replaceAll('\\', '/').replace(/["']/g, ''))
  return PROTECTED.test(name) && !TEMPLATE.test(name)
}

/** @param {string} command */
function commandReadsEnv(command) {
  const mentions = command.match(MENTION) ?? []
  if (!mentions.some(isProtected)) return false
  // Merely naming the file is fine (`test -f .env`, `docker compose --env-file .env`).
  return READERS.test(command) || INLINE.test(command)
}

/**
 * @param {{ tool_name?: string, tool_input?: Record<string, unknown> }} input
 * @returns {string | null} denial reason, or null to allow
 */
export function decide(input) {
  const tool = input.tool_name ?? ''
  const args = input.tool_input ?? {}
  const str = (/** @type {string} */ key) => (typeof args[key] === 'string' ? args[key] : '')

  switch (tool) {
    case 'Read':
      return isProtected(str('file_path')) ? `Reading ${str('file_path')} is blocked.` : null
    case 'Grep':
      return isProtected(str('path')) || isProtected(str('glob'))
        ? 'Searching inside .env files is blocked.'
        : null
    case 'Bash':
    case 'PowerShell':
      return commandReadsEnv(str('command')) ? 'Shell access to .env contents is blocked.' : null
    default:
      return null
  }
}

/** @param {string} reason */
function deny(reason) {
  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `${reason} .env files hold secrets: use server/.env.example to see the expected variables, or ask the user.`,
    },
  }
  process.stdout.write(JSON.stringify(output))
}

async function main() {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk
  const reason = decide(JSON.parse(raw))
  if (reason) deny(reason)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(() => deny('dotenv-read-guard failed, blocking by default.'))
}
