# Photo delivery URLs

- Date: 2026-11-23
- Changes: the photo DTO `{ id, url, uploaderName, createdAt }` from [the photo field names](2026-11-23-photo-field-names.md)
- AI usage: the author asked for an audit of the image pipeline, then a web search of media optimizations. Claude Code ranked them; the author picked the first tier and Claude Code wrote this spec and the change.

## Context

One upload gives one stored image: sharp turns it into a JPEG of at most 1920×1920 px, quality 85, then it goes to Cloudinary. The API sends that one URL everywhere. The frame shows up to 20 photos, and every 128 px thumbnail downloads the full 1920 px JPEG.

## Decisions

| Question                  | Choice                                                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How to get several sizes? | Cloudinary delivery transformations in the URL. Still one stored image, no new field in the database, no new dependency (the `cloudinary` SDK builds the URLs). |
| Format and compression    | `f_auto` + `q_auto` on every URL: Cloudinary serves WebP when the browser takes it and it is lighter, else JPEG, and picks the compression from the content.    |
| Thumbnail                 | `c_fill,g_auto`, 400×400 px: a square that crops on the subject (a face, say) rather than the center. 400 px covers a 200 CSS px cell on a 2× screen.           |
| Full photo                | No resize: sharp already caps it at 1920 px. Only `f_auto` + `q_auto`.                                                                                          |
| DTO shape                 | `url` keeps its name but becomes the optimized full photo, and `thumbnailUrl` is added. Renaming `url` would break the open frame views stack (#19–#22).        |
| Who builds the URLs?      | The server, from `cloudinaryId`, which stays private. The client only gets ready-made URLs.                                                                     |
| Loading in the browser    | The large photo gets `fetchPriority="high"`. Thumbnails get `loading="lazy"` and `decoding="async"`.                                                            |

The URLs keep the `.jpg` extension: it is the fallback format, and `f_auto` overrides it when WebP wins.

No AVIF: on our plan, `f_auto` does not serve it (Cloudinary reserves AVIF in `f_auto` for Enterprise accounts). Forcing `f_avif` would work but breaks browsers without AVIF; not worth a `<picture>` element for now.

The `url` field stored in the database (Cloudinary's `secure_url`) does not change: it is the untransformed image, kept as is.

### Rejected

- **Storing several files (thumbnail + full)**: twice the uploads, two IDs to clean up, for what a URL gives for free.
- **Eager transformations at upload**: useful for slow video transformations. An image transformation is generated on the first request and cached by the CDN.
- **`f_auto` in an upload preset or named transformation**: Cloudinary's docs say no, the format is decided per request from the browser.

## Not done (next steps)

- `mozjpeg` and `progressive` in sharp, or storing a larger master (2560 px) for future screens.
- `width` and `height` in the database (Cloudinary returns them) to reserve the space before the image loads.
- Preloading the next photo on the frame.
- Resizing in the browser before upload, HEIC from non-Safari browsers, blurred placeholders (BlurHash, ThumbHash).

## Cost

Each new transformation of an image counts against the Cloudinary plan's transformation quota, once: the result is cached. Two variants per photo for a family frame stays small; to check in the Cloudinary console after a few days.

## Impact on the frame views stack

`PhotoView`'s thumbnail strip and `ContactSheet` (frame views plan, Task 4) should use `thumbnailUrl` and the same loading attributes once this lands.

## Verification

- `pnpm check`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Bruno: `url` and `thumbnailUrl` contain `f_auto`, `thumbnailUrl` contains `c_fill`.
- Manual, API running: fetch both URLs of a real photo with a browser `Accept` header and compare the sizes.

### Measured (2026-11-23, one real phone photo, 1442×1920)

| URL                                | Format | Size   |
| ---------------------------------- | ------ | ------ |
| Stored image, untransformed        | JPEG   | 471 KB |
| `url` (`f_auto,q_auto`)            | JPEG   | 358 KB |
| `thumbnailUrl` (400×400, `g_auto`) | WebP   | 10 KB  |

The full photo stays JPEG: for this photo, WebP was heavier, so `f_auto` kept JPEG and `q_auto` saved 24 %. A thumbnail drops from 471 KB to 10 KB: the 20-photo grid goes from about 9 MB to about 200 KB.
