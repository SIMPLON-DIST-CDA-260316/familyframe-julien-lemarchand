// Copy of server/src/types.ts, see why there. Keep both in sync.
export type ApiErrorCode =
  | 'UPLOADER_NAME_INVALID'
  | 'PHOTO_MISSING'
  | 'UPLOAD_INVALID'
  | 'PHOTO_TOO_LARGE'
  | 'FORMAT_UNSUPPORTED'
  | 'IMAGE_UNREADABLE'
  | 'SERVER_ERROR'

const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  UPLOADER_NAME_INVALID: 'Indiquez un pseudo (30 caractères maximum).',
  PHOTO_MISSING: 'Prenez ou choisissez une photo.',
  UPLOAD_INVALID: 'Envoi invalide : une seule photo à la fois.',
  PHOTO_TOO_LARGE: 'La photo est trop lourde (10 Mo maximum).',
  FORMAT_UNSUPPORTED: 'Format non pris en charge : JPEG, PNG ou WebP uniquement.',
  IMAGE_UNREADABLE: "Ce fichier n'est pas une image lisible.",
  SERVER_ERROR: 'Le serveur a rencontré un problème. Réessayez plus tard.',
}

const GENERIC_MESSAGE = "L'envoi a échoué. Vérifiez la connexion et réessayez."

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && Object.hasOwn(ERROR_MESSAGES, value)
}

export function errorMessage(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'error' in body && isApiErrorCode(body.error)) {
    return ERROR_MESSAGES[body.error]
  }
  return GENERIC_MESSAGE
}
