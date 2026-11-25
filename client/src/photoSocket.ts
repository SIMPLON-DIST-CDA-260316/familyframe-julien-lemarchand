import { io, type Socket } from 'socket.io-client'
import { isPhoto, type Photo, type ServerToClientEvents } from '@/photo.ts'

// The message the server's Socket.IO middleware rejects a handshake with, like the HTTP code.
const UNAUTHENTICATED_SOCKET_ERROR = 'UNAUTHENTICATED'

export type PhotoSocket = Socket<ServerToClientEvents>

// Each page listens to the events it shows: the library ignores photo:received, the
// waiting photos ignore photo:new.
export type PhotoSocketHandlers = {
  onConnect: () => void
  onRefused: () => void
  onNewPhoto?: (photo: Photo) => void
  onReceivedPhoto?: (photo: Photo) => void
  onOpenedPhoto?: (photo: Photo) => void
  onDeletedPhoto?: (id: string) => void
}

type PhotoEvent = 'photo:new' | 'photo:received' | 'photo:opened'

// Socket.IO types are a promise, not a check.
function listenForPhoto(
  socket: PhotoSocket,
  event: PhotoEvent,
  onPhoto: ((photo: Photo) => void) | undefined,
): void {
  if (!onPhoto) return
  socket.on(event, (photo: unknown) => {
    if (!isPhoto(photo)) {
      console.error(`Unexpected ${event} payload from the API`)
      return
    }
    onPhoto(photo)
  })
}

export function connectPhotoSocket({
  onConnect,
  onRefused,
  onNewPhoto,
  onReceivedPhoto,
  onOpenedPhoto,
  onDeletedPhoto,
}: PhotoSocketHandlers): PhotoSocket {
  // Same origin: Vite proxies /socket.io to the API, the session cookie goes with it.
  const socket: PhotoSocket = io()
  // Reconnections too: catches what changed while offline.
  socket.on('connect', onConnect)
  // Socket.IO does not retry a handshake its server refused.
  socket.on('connect_error', ({ message }) => {
    if (message === UNAUTHENTICATED_SOCKET_ERROR) onRefused()
  })
  listenForPhoto(socket, 'photo:new', onNewPhoto)
  listenForPhoto(socket, 'photo:received', onReceivedPhoto)
  listenForPhoto(socket, 'photo:opened', onOpenedPhoto)
  if (onDeletedPhoto) socket.on('photo:deleted', onDeletedPhoto)
  return socket
}
