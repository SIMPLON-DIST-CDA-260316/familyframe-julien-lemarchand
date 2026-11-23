# Security logging

- Never log tokens, secrets, or PII
- Never log environment variable values
- Log through `server/src/lib/logger.ts`, never `console`
