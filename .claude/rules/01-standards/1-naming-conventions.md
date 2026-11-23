---
paths:
  - "**/src/**/*.ts"
  - "**/src/**/*.tsx"
---

## General
- Reveal intent in every name
- No single-letter names, except loop indexes
- No abbreviations except common ones
- One term per concept

## By kind
- Verbs for functions that act
- Nouns for functions that return values
- Prefix booleans with `is`, `has`, `should`
- Plural names for arrays
- `UPPER_SNAKE_CASE` for module constants

## Callbacks
- Name the param after the item: `photos.some((photo) => …)`
- Destructure when using one or two props: `.map(({ id }) => id)`
