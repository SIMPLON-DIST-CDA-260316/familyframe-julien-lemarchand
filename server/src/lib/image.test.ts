import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { toAvatarJpeg } from './image.js'

// Built in memory: a test fixture file would hide the size the test depends on.
function landscapePng(): Promise<Buffer> {
  return sharp({
    create: { width: 800, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .png()
    .toBuffer()
}

describe('toAvatarJpeg', () => {
  it('turns a landscape PNG into a 256 px JPEG square', async () => {
    const avatar = await toAvatarJpeg(await landscapePng())

    const { format, width, height } = await sharp(avatar).metadata()
    expect({ format, width, height }).toEqual({ format: 'jpeg', width: 256, height: 256 })
  })

  it('throws on a file that is not an image', async () => {
    await expect(toAvatarJpeg(Buffer.from('pas une image'))).rejects.toThrow()
  })
})
