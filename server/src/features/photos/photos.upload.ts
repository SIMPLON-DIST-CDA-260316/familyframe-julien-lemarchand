import multer from 'multer'

const MAX_FILE_SIZE = 10 * 1024 * 1024

// In memory: the file goes to sharp, never to disk.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
})
