import sharp from 'sharp'

const MAX_SIZE = 1920

// Throws on unreadable input: the real format check, as the browser's mimetype can lie.
export async function toFrameJpeg(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate() // EXIF orientation of phone photos
    .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' }) // JPEG has no transparency
    .jpeg({ quality: 85 })
    .toBuffer() // drops metadata, GPS included
}
