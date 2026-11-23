---
paths:
  - "**/src/**/*.ts"
  - "**/src/**/*.tsx"
---

## Comments
- Comment WHY, never WHAT
- Self-documenting code first
- Never restate a name or a call
- No banner or file-summary comments
- No commented-out code

## Code quality
- Explicit constants, never magic numbers
- Name constants by purpose, not by value
- Avoid double negatives
- Write the simplest code possible
- Prefer duplication over the wrong abstraction

## Structure
- One responsibility per file
- Max 30 lines per function
- Max 300 lines per file
- Max 5 params per function
- No flag parameters

## Errors
- Fail fast, validate at boundaries
- Catch errors as `unknown`
