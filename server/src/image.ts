import sharp from 'sharp'

const MAX_SIZE = 1920

// Decode the upload and re-encode it as a JPEG of at most 1920 px.
// Throws if the buffer is not a readable image: this is the real format check,
// since the mimetype sent by the browser can be anything.
export async function toFrameJpeg(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate() // apply the EXIF orientation (phone photos), then drop it
    .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' }) // PNG transparency becomes white
    .jpeg({ quality: 85 })
    .toBuffer() // metadata (GPS included) is not copied by default
}
