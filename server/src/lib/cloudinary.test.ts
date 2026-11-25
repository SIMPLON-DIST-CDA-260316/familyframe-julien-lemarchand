import { describe, expect, it, vi } from 'vitest'

// The URLs are built and signed locally: a fake account is enough, nothing reaches Cloudinary.
vi.mock('../config.js', () => ({
  config: { cloudinary: { cloudName: 'demo', apiKey: 'key', apiSecret: 'secret' } },
}))

const { deliveryUrls } = await import('./cloudinary.js')

const CLOUDINARY_ID = 'familyframe/abc'
const SIGNATURE = /\/s--[\w-]{8}--\//

describe('deliveryUrls', () => {
  it('limits the full photo to 1920 px for the screens, without enlarging it', () => {
    const { url } = deliveryUrls(CLOUDINARY_ID)

    expect(url).toContain('/c_limit,h_1920,w_1920/f_auto,q_auto/')
  })

  it('keeps the 640 px square thumbnail', () => {
    const { thumbnailUrl } = deliveryUrls(CLOUDINARY_ID)

    expect(thumbnailUrl).toContain('/c_fill,g_auto,h_640,w_640/f_auto,q_auto/')
  })

  it('signs both URLs, as strict transformations require', () => {
    const { url, thumbnailUrl } = deliveryUrls(CLOUDINARY_ID)

    expect(url).toMatch(SIGNATURE)
    expect(thumbnailUrl).toMatch(SIGNATURE)
  })

  it('gives each transformation its own signature', () => {
    const { url, thumbnailUrl } = deliveryUrls(CLOUDINARY_ID)

    expect(url.match(SIGNATURE)?.[0]).not.toBe(thumbnailUrl.match(SIGNATURE)?.[0])
  })
})
