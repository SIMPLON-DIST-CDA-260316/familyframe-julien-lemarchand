// Copy of server/src/types.ts, see why there. Keep both in sync.
export type ApiErrorCode =
  | 'PHOTO_MISSING'
  | 'EMAIL_INVALID'
  | 'UPLOAD_INVALID'
  | 'BODY_INVALID'
  | 'QUERY_INVALID'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'ROUTE_NOT_FOUND'
  | 'PHOTO_NOT_FOUND'
  | 'PHOTO_DUPLICATE'
  | 'ACCOUNT_EXISTS'
  | 'PHOTO_TOO_LARGE'
  | 'FORMAT_UNSUPPORTED'
  | 'IMAGE_UNREADABLE'
  | 'SERVER_ERROR'

const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  PHOTO_MISSING: 'Prenez ou choisissez une photo.',
  EMAIL_INVALID: 'Adresse e-mail invalide.',
  UPLOAD_INVALID: 'Envoi invalide : une seule photo à la fois.',
  BODY_INVALID: 'Requête invalide. Rechargez la page et réessayez.',
  QUERY_INVALID: 'Requête invalide. Rechargez la page et réessayez.',
  UNAUTHENTICATED: 'Votre session a expiré. Reconnectez-vous.',
  INVALID_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
  FORBIDDEN: "Cette action est réservée à l'administrateur.",
  ROUTE_NOT_FOUND: "Cette adresse n'existe pas sur le serveur.",
  PHOTO_NOT_FOUND: 'Cette photo a déjà été supprimée.',
  PHOTO_DUPLICATE: 'Cette photo est déjà dans votre bibliothèque.',
  ACCOUNT_EXISTS: 'Un compte existe déjà pour cette adresse e-mail.',
  PHOTO_TOO_LARGE: 'La photo est trop lourde (10 Mo maximum).',
  FORMAT_UNSUPPORTED: 'Format non pris en charge : JPEG, PNG ou WebP uniquement.',
  IMAGE_UNREADABLE: "Ce fichier n'est pas une image lisible.",
  SERVER_ERROR: 'Le serveur a rencontré un problème. Réessayez plus tard.',
}

// UNAUTHENTICATED: the session ended on the server, the client drops its user.
export const UNAUTHORIZED_STATUS = 401

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
