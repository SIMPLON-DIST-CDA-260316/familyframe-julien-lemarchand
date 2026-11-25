import { io, type Socket } from 'socket.io-client'
import { isPhoto, type Photo, type ServerToClientEvents } from '@/photo.ts'

// The message the server's Socket.IO middleware rejects a handshake with, like the HTTP code.
const UNAUTHENTICATED_SOCKET_ERROR = 'UNAUTHENTICATED'

export type PhotoSocket = Socket<ServerToClientEvents>

export type PhotoSocketHandlers = {
  onConnect: () => void
  onNewPhoto: (photo: Photo) => void
  onDeletedPhoto: (id: string) => void
  onRefused: () => void
}

// Socket.IO types are a promise, not a check.
function handleNewPhoto(photo: unknown, onNewPhoto: (photo: Photo) => void): void {
  if (!isPhoto(photo)) {
    console.error('Unexpected photo:new payload from the API')
    return
  }
  onNewPhoto(photo)
}

export function connectPhotoSocket({
  onConnect,
  onNewPhoto,
  onDeletedPhoto,
  onRefused,
}: PhotoSocketHandlers): PhotoSocket {
  // Same origin: Vite proxies /socket.io to the API, the session cookie goes with it.
  const socket: PhotoSocket = io()
  // Reconnections too: catches what changed while offline.
  socket.on('connect', onConnect)
  // Socket.IO does not retry a handshake its server refused.
  socket.on('connect_error', ({ message }) => {
    if (message === UNAUTHENTICATED_SOCKET_ERROR) onRefused()
  })
  socket.on('photo:new', (photo) => handleNewPhoto(photo, onNewPhoto))
  socket.on('photo:deleted', onDeletedPhoto)
  return socket
}
