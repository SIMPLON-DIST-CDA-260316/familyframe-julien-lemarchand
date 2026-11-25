import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { toAvatarJpeg, toFrameJpeg } from './image.js'

// Built in memory: a test fixture file would hide the size the test depends on.
function landscapePng(): Promise<Buffer> {
  return sharp({
    create: { width: 800, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .png()
    .toBuffer()
}

function photoOfSize(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#808080' } })
    .jpeg()
    .toBuffer()
}

describe('toFrameJpeg', () => {
  it('keeps 4096 px on the long side of a larger photo, enough to print 20x30 cm', async () => {
    const photo = await toFrameJpeg(await photoOfSize(6000, 4000))

    const { format, width, height } = await sharp(photo).metadata()
    expect({ format, width, height }).toEqual({ format: 'jpeg', width: 4096, height: 2731 })
  })

  it('never enlarges a smaller photo', async () => {
    const photo = await toFrameJpeg(await photoOfSize(1200, 800))

    const { width, height } = await sharp(photo).metadata()
    expect({ width, height }).toEqual({ width: 1200, height: 800 })
  })

  it('turns transparency white', async () => {
    const photo = await toFrameJpeg(await landscapePng())

    const { channels } = await sharp(photo).stats()
    expect(channels.slice(0, 3).map((channel) => channel.min)).toEqual([255, 255, 255])
  })
})

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
