import sharp from 'sharp'

// The stored photo must print at 20x30 cm, 300 dpi: 3543 px on the long side. Screens get a
// lighter copy from Cloudinary (DISPLAY_SIZE in cloudinary.ts).
const PRINT_SIZE = 4096
// Shown at most 128 CSS px wide (the settings page) on a 2x screen.
const AVATAR_SIZE = 256
const JPEG_QUALITY = 85

// Throws on unreadable input: the real format check, as the browser's mimetype can lie.
export async function toFrameJpeg(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate() // EXIF orientation of phone photos
    .resize({ width: PRINT_SIZE, height: PRINT_SIZE, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' }) // JPEG has no transparency
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer() // drops metadata, GPS included
}

// A square cropped around the centre: the client shows it in a circle, without a crop tool.
export async function toAvatarJpeg(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: AVATAR_SIZE, height: AVATAR_SIZE, fit: 'cover', position: 'centre' })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
}
