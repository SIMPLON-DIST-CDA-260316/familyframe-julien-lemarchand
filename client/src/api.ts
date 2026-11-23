// Copy of server/src/types.ts, see why there. Keep both in sync.
export type ApiErrorCode =
  | 'PHOTO_MISSING'
  | 'UPLOAD_INVALID'
  | 'BODY_INVALID'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'ROUTE_NOT_FOUND'
  | 'PHOTO_NOT_FOUND'
  | 'PHOTO_TOO_LARGE'
  | 'FORMAT_UNSUPPORTED'
  | 'IMAGE_UNREADABLE'
  | 'SERVER_ERROR'

const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  PHOTO_MISSING: 'Prenez ou choisissez une photo.',
  UPLOAD_INVALID: 'Envoi invalide : une seule photo à la fois.',
  BODY_INVALID: 'Requête invalide. Rechargez la page et réessayez.',
  UNAUTHENTICATED: 'Votre session a expiré. Reconnectez-vous.',
  INVALID_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
  ROUTE_NOT_FOUND: "Cette adresse n'existe pas sur le serveur.",
  PHOTO_NOT_FOUND: 'Cette photo a déjà été supprimée.',
  PHOTO_TOO_LARGE: 'La photo est trop lourde (10 Mo maximum).',
  FORMAT_UNSUPPORTED: 'Format non pris en charge : JPEG, PNG ou WebP uniquement.',
  IMAGE_UNREADABLE: "Ce fichier n'est pas une image lisible.",
  SERVER_ERROR: 'Le serveur a rencontré un problème. Réessayez plus tard.',
}

const GENERIC_MESSAGE = "L'opération a échoué. Vérifiez la connexion et réessayez."

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && Object.hasOwn(ERROR_MESSAGES, value)
}

export function errorMessage(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'error' in body && isApiErrorCode(body.error)) {
    return ERROR_MESSAGES[body.error]
  }
  return GENERIC_MESSAGE
}
