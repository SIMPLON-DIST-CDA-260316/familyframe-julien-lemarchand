import { type ResizeDecision, resizeDecision } from '@/upload/photoResize.ts'

const JPEG_TYPE = 'image/jpeg'
const JPEG_QUALITY = 0.92

type TargetSize = Extract<ResizeDecision, { shouldResize: true }>

// from-image: the photo is drawn the right way up, as the phone's sensor saw it turned. Older
// browsers reject the option itself with a TypeError: they decode without it.
async function decodeUpright(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch (error: unknown) {
    if (!(error instanceof TypeError)) throw error
    return createImageBitmap(file)
  }
}

// null: the browser cannot read this file (a HEIC on a computer, a damaged file).
async function decode(file: File): Promise<ImageBitmap | null> {
  try {
    return await decodeUpright(file)
  } catch {
    return null
  }
}

// iOS Safari counts every live canvas against a small memory budget: twenty large photos in a
// row would exhaust it unless each canvas gives its pixels back.
function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0
  canvas.height = 0
}

function drawAsJpeg(bitmap: ImageBitmap, { width, height }: TargetSize): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (context === null) return Promise.resolve(null)
  // JPEG has no transparency: white behind it, as the server does for its own copy.
  context.fillStyle = 'white'
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        releaseCanvas(canvas)
        resolve(blob)
      },
      JPEG_TYPE,
      JPEG_QUALITY,
    )
  })
}

function jpegName(fileName: string): string {
  return `${fileName.replace(/\.[^.]+$/, '')}.jpg`
}

// The original file whenever it fits the server, so nothing is lost; otherwise a lighter JPEG.
// A file the browser cannot read goes as it is: the server decides and explains a refusal.
export async function preparePhoto(file: File): Promise<File> {
  const bitmap = await decode(file)
  if (bitmap === null) return file
  const decision = resizeDecision(bitmap.width, bitmap.height, file.size)
  const blob = decision.shouldResize ? await drawAsJpeg(bitmap, decision) : null
  bitmap.close()
  if (blob === null) return file
  return new File([blob], jpegName(file.name), { type: JPEG_TYPE })
}
