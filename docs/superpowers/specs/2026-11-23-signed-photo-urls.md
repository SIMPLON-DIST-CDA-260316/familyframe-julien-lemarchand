# Signed photo URLs

- Date: 2026-11-23
- Changes: "Unsigned URLs" in [the photo delivery URLs](2026-11-23-photo-delivery-urls.md), noted after its adversarial review
- AI usage: the author asked to enable Cloudinary's strict transformations together in Chrome. Claude Code found in the console that it clashes with `f_auto`, proposed signed URLs instead, and wrote the change after the author picked that option.

## Context

The delivery URLs are unsigned. Anyone who knows the cloud name can request other transformations of our images and spend the plan's quota. Cloudinary's answer is **strict transformations** (Settings → Security): new derived images are refused unless the transformation is explicitly allowed, or the URL is signed.

## Why not allow the two transformations

That was the first plan. The console's transformation log showed why it does not hold: the CDN resolves `f_auto` to a concrete format per browser before checking, so each URL turns into several transformations (`f_webp,q_auto/jpg`, `f_avif,q_auto/jpg`, `f_webp,fl_awebp,q_auto/jpg`, `f_jxl,q_auto/jpg`…). Every variant of both URLs would have to be allowed by hand, and a browser asking for a format not yet seen would get a broken image, silently.

## Decision

- The server signs its URLs: `sign_url: true` in `deliveryUrl()`. The SDK adds a `s--…--` segment computed with the API secret, which stays on the server.
- Strict transformations is enabled on the Cloudinary account. A signed URL is accepted whatever format `f_auto` picks; a URL whose transformation was edited no longer matches its signature and is refused.
- No list of allowed transformations to maintain, no change to the client.

## Order of operations

Enabling strict mode before the server signs its URLs breaks every new photo: its derived images are refused. So: merge this change and reload the API, then enable the setting. Derived images generated before (unsigned) keep being served.

## Consequences

- The setting lives outside the repo: a fresh Cloudinary account must enable it too (README prerequisite). The Bruno create test checks it, by requesting an edited URL and expecting a refusal.
- Changing a transformation in the code changes the signature: old URLs keep working (they are signed for their own transformation), new ones are generated on the next request.

## Verification

- `pnpm check`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Bruno with strict mode on: both URLs contain `s--…--` and load; the thumbnail URL with `w_641` instead of `w_640` is refused with a 401. Run on 2026-11-23 after enabling the setting: 11/11 requests pass.
- Measured before the change (strict mode off): signed URLs serve WebP or JPEG depending on `Accept`, same sizes as unsigned ones.
