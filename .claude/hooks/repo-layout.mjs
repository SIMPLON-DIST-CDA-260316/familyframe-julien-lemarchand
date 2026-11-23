#!/usr/bin/env node
// Claude Code SessionStart hook: inject the tracked directory layout
// (git ls-files, directories only, depth <= 2) so the agent gets a map that is
// always current, instead of a hand-written tree that goes stale.
//
// SessionStart stdout is added to the agent context. Fails open: on any error
// it prints nothing, the session starts without the map.

import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const MAX_DEPTH = 2

/**
 * @param {string[]} files tracked file paths, `/`-separated
 * @returns {string[]} sorted unique directories, depth <= MAX_DEPTH, with trailing `/`
 */
export function trackedDirectories(files) {
  const dirs = new Set()
  for (const file of files) {
    const parts = file.split('/').slice(0, -1)
    for (let depth = 1; depth <= Math.min(parts.length, MAX_DEPTH); depth++) {
      dirs.add(`${parts.slice(0, depth).join('/')}/`)
    }
  }
  return [...dirs].sort()
}

function main() {
  const cwd = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
  const output = execFileSync('git', ['ls-files', '-z'], { cwd, encoding: 'utf8' })
  const dirs = trackedDirectories(output.split('\0').filter(Boolean))
  if (dirs.length === 0) return
  process.stdout.write(
    `Tracked directories (git ls-files, depth <= ${MAX_DEPTH}):\n${dirs.join('\n')}\n`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch {
    // Fail open: the map is a convenience, never block a session for it.
  }
}
