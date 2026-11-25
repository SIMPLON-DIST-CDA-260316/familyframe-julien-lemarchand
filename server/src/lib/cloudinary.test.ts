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

  it('limits the medium photo to 1280 px for phone screens', () => {
    const { mediumUrl } = deliveryUrls(CLOUDINARY_ID)

    expect(mediumUrl).toContain('/c_limit,h_1280,w_1280/f_auto,q_auto/')
  })

  it('keeps the 640 px square thumbnail', () => {
    const { thumbnailUrl } = deliveryUrls(CLOUDINARY_ID)

    expect(thumbnailUrl).toContain('/c_fill,g_auto,h_640,w_640/f_auto,q_auto/')
  })

  it('signs every URL, as strict transformations require', () => {
    const { url, mediumUrl, thumbnailUrl } = deliveryUrls(CLOUDINARY_ID)

    expect(url).toMatch(SIGNATURE)
    expect(mediumUrl).toMatch(SIGNATURE)
    expect(thumbnailUrl).toMatch(SIGNATURE)
  })

  it('gives each transformation its own signature', () => {
    const signatures = Object.values(deliveryUrls(CLOUDINARY_ID)).map(
      (deliveredUrl) => deliveredUrl.match(SIGNATURE)?.[0],
    )

    expect(new Set(signatures).size).toBe(signatures.length)
  })
})
