// Copy of server/src/types.ts, see why there. Keep both in sync.
export type ApiErrorCode =
  | 'PHOTO_MISSING'
  | 'EMAIL_INVALID'
  | 'UPLOAD_INVALID'
  | 'BODY_INVALID'
  | 'QUERY_INVALID'
  | 'DISPLAY_NAME_INVALID'
  | 'PASSWORD_INVALID'
  | 'PASSWORD_INCORRECT'
  | 'MESSAGE_INVALID'
  | 'SELF_FRIEND'
  | 'COLLECTION_NAME_INVALID'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FRIENDS'
  | 'ROUTE_NOT_FOUND'
  | 'PHOTO_NOT_FOUND'
  | 'INVITATION_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'FRIENDSHIP_NOT_FOUND'
  | 'COLLECTION_NOT_FOUND'
  | 'PHOTO_DUPLICATE'
  | 'ACCOUNT_EXISTS'
  | 'ALREADY_FRIENDS'
  | 'FRIEND_REQUEST_EXISTS'
  | 'COLLECTION_EXISTS'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_USED'
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
  DISPLAY_NAME_INVALID: 'Choisissez un nom de 1 à 50 caractères.',
  PASSWORD_INVALID: 'Le mot de passe doit faire entre 12 et 128 caractères.',
  PASSWORD_INCORRECT: 'Mot de passe actuel incorrect.',
  MESSAGE_INVALID: 'Le message doit faire 200 caractères au plus.',
  SELF_FRIEND: 'Vous ne pouvez pas vous ajouter vous-même.',
  COLLECTION_NAME_INVALID: 'Choisissez un nom de 1 à 50 caractères.',
  UNAUTHENTICATED: 'Votre session a expiré. Reconnectez-vous.',
  INVALID_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
  FORBIDDEN: "Cette action est réservée à l'administrateur.",
  NOT_FRIENDS: 'Cette personne ne fait pas partie de vos amis.',
  ROUTE_NOT_FOUND: "Cette adresse n'existe pas sur le serveur.",
  PHOTO_NOT_FOUND: 'Cette photo a déjà été supprimée.',
  INVITATION_NOT_FOUND: "Ce lien d'invitation n'est pas valide. Demandez-en un nouveau.",
  USER_NOT_FOUND:
    "Aucun compte n'utilise cette adresse e-mail. Demandez à l'administrateur d'inviter cette personne.",
  FRIENDSHIP_NOT_FOUND: "Cette demande ou cette amitié n'existe plus.",
  COLLECTION_NOT_FOUND: "Cette collection n'existe plus.",
  PHOTO_DUPLICATE: "Cette photo est déjà dans votre bibliothèque, ou attend d'être découverte.",
  ACCOUNT_EXISTS: 'Un compte existe déjà pour cette adresse e-mail.',
  ALREADY_FRIENDS: 'Vous êtes déjà amis.',
  COLLECTION_EXISTS: 'Vous avez déjà une collection de ce nom.',
  FRIEND_REQUEST_EXISTS:
    'Vous avez déjà envoyé une demande à cette personne : elle attend sa réponse.',
  INVITATION_EXPIRED: "Ce lien d'invitation a expiré. Demandez-en un nouveau.",
  INVITATION_USED: "Ce lien d'invitation a déjà servi. Connectez-vous.",
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
