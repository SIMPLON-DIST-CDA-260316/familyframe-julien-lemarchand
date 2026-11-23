export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Bodies and trailers (e.g. long URLs) are not hard-wrapped.
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
}
