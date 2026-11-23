# Photo field names

- Date: 2026-11-23
- Changes: the `Photo` model of [the J1 MVP plan](../plans/2026-11-23-j1-mvp.md)
- AI usage: raised by the author while reviewing PR #4; Claude Code weighed the options and applied the renames.

## Decisions

| Before     | After          | Why                                                                                                                                            |
| ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `publicId` | `cloudinaryId` | `publicId` is Cloudinary's term and reads as "exposed to the public", while the field is server-only. The brief says "identifiant Cloudinary". |
| `nickname` | `uploaderName` | The field holds who uploaded the photo: name the role, not the UI wording. The UI still says "pseudo".                                         |

The API follows: multipart field `uploaderName`, error code `UPLOADER_NAME_INVALID`, DTO `{ id, url, uploaderName, createdAt }`.

## Not done: a `userId` foreign key

The uploader would ideally be a `User` reference. Not now:

- The brief has no user accounts: a relative types a nickname.
- Without authentication, a `userId` sent by the client proves nothing.
- MongoDB has no foreign keys; Prisma only emulates referential integrity.

If accounts come, add `uploaderId` next to `uploaderName`, and keep the name as a snapshot so the history does not change when a user renames themselves.

## Existing data

Documents written before the rename are migrated in place with `$rename` (old unique index dropped first), then `pnpm db:push` creates the `cloudinaryId` unique index.
