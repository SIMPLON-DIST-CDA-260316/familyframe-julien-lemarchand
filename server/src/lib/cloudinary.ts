import { v2 as cloudinary, type ImageTransformationOptions } from 'cloudinary'
import { config } from '../config.js'

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  // Otherwise every URL gets an SDK tracking query string.
  analytics: false,
})

// Covers a contact sheet cell (up to about 320 CSS px) on a 2x screen.
const THUMBNAIL_SIZE = 640

// Decided per request: WebP when the browser takes it and it is lighter, else JPEG.
// Compression is picked from the image content.
const OPTIMIZED_DELIVERY: ImageTransformationOptions = { fetch_format: 'auto', quality: 'auto' }

export type UploadedImage = { url: string; cloudinaryId: string }

export type DeliveryUrls = { url: string; thumbnailUrl: string }

// Data URI rather than a stream: simpler, and fine up to 10 MB.
export async function uploadImage(jpeg: Buffer): Promise<UploadedImage> {
  const dataUri = `data:image/jpeg;base64,${jpeg.toString('base64')}`
  const result = await cloudinary.uploader.upload(dataUri, { folder: 'familyframe' })
  return { url: result.secure_url, cloudinaryId: result.public_id }
}

// The .jpg extension is the fallback format: f_auto overrides it when WebP wins.
// Signed: with strict transformations on, Cloudinary refuses any other transformation,
// so nobody can spend our quota by editing the URL.
function deliveryUrl(cloudinaryId: string, transformation: ImageTransformationOptions[]): string {
  return cloudinary.url(cloudinaryId, {
    secure: true,
    format: 'jpg',
    sign_url: true,
    transformation,
  })
}

// No resize for the full photo: sharp already capped it at upload.
export function deliveryUrls(cloudinaryId: string): DeliveryUrls {
  const thumbnail: ImageTransformationOptions = {
    crop: 'fill',
    gravity: 'auto',
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  }
  return {
    url: deliveryUrl(cloudinaryId, [OPTIMIZED_DELIVERY]),
    thumbnailUrl: deliveryUrl(cloudinaryId, [thumbnail, OPTIMIZED_DELIVERY]),
  }
}
