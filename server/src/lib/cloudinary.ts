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

// The frame and the viewer: a full HD screen. The stored photo is larger, kept for printing.
const DISPLAY_SIZE = 1920

// Decided per request: WebP when the browser takes it and it is lighter, else JPEG.
// Compression is picked from the image content.
const OPTIMIZED_DELIVERY: ImageTransformationOptions = { fetch_format: 'auto', quality: 'auto' }

export type UploadedImage = { url: string; cloudinaryId: string }

export type DeliveryUrls = { url: string; thumbnailUrl: string }

// Data URI rather than a stream: simpler, and fine up to 10 MB.
async function uploadToFolder(jpeg: Buffer, folder: string): Promise<UploadedImage> {
  const dataUri = `data:image/jpeg;base64,${jpeg.toString('base64')}`
  const result = await cloudinary.uploader.upload(dataUri, { folder })
  return { url: result.secure_url, cloudinaryId: result.public_id }
}

export function uploadImage(jpeg: Buffer): Promise<UploadedImage> {
  return uploadToFolder(jpeg, 'familyframe')
}

// A folder of their own: the Cloudinary console tells profile photos from library photos.
export function uploadAvatar(jpeg: Buffer): Promise<UploadedImage> {
  return uploadToFolder(jpeg, 'familyframe/avatars')
}

// invalidate: the CDN would otherwise keep serving the cached derived images.
// destroy answers "not found" instead of failing: throw so the caller logs it.
export async function deleteImage(cloudinaryId: string): Promise<void> {
  const { result } = await cloudinary.uploader.destroy(cloudinaryId, { invalidate: true })
  if (result !== 'ok') {
    throw new Error(`Cloudinary destroy answered "${result}"`)
  }
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

// limit: shrinks a larger photo, never enlarges one; photos stored before the 4096 px cap stay
// at 1920 px and go through unchanged.
export function deliveryUrls(cloudinaryId: string): DeliveryUrls {
  const display: ImageTransformationOptions = {
    crop: 'limit',
    width: DISPLAY_SIZE,
    height: DISPLAY_SIZE,
  }
  const thumbnail: ImageTransformationOptions = {
    crop: 'fill',
    gravity: 'auto',
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  }
  return {
    url: deliveryUrl(cloudinaryId, [display, OPTIMIZED_DELIVERY]),
    thumbnailUrl: deliveryUrl(cloudinaryId, [thumbnail, OPTIMIZED_DELIVERY]),
  }
}

// toAvatarJpeg already made it a 256 px square: only the format and the compression change.
export function avatarUrl(cloudinaryId: string): string {
  return deliveryUrl(cloudinaryId, [OPTIMIZED_DELIVERY])
}
