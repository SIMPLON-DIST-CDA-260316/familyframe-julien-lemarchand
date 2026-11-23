import { v2 as cloudinary } from 'cloudinary'
import { config } from '../config.js'

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
})

export type UploadedImage = { url: string; cloudinaryId: string }

// Data URI rather than a stream: simpler, and fine up to 10 MB.
export async function uploadImage(jpeg: Buffer): Promise<UploadedImage> {
  const dataUri = `data:image/jpeg;base64,${jpeg.toString('base64')}`
  const result = await cloudinary.uploader.upload(dataUri, { folder: 'familyframe' })
  return { url: result.secure_url, cloudinaryId: result.public_id }
}
