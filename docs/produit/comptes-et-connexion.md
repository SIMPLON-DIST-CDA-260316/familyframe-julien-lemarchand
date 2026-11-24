# Comptes et connexion

Comment on entre dans FamilyFrame, combien de temps on y reste connecté et comment on en sort. La création d'un compte passe par une invitation : voir [invitations.md](invitations.md).

## Se connecter

**Ce que l'on peut faire**

- Se connecter avec son adresse e-mail et son mot de passe, sur la page de connexion.
- Afficher ou masquer le mot de passe pendant la saisie (bouton en forme d'œil).
- Arriver directement sur la page que l'on voulait ouvrir avant d'être renvoyé vers la connexion.

**Règles**

1. R-CNX-01 · Les deux champs « E-mail » et « Mot de passe » sont obligatoires.
2. R-CNX-02 · L'adresse e-mail est reconnue sans tenir compte des majuscules ni des espaces placés avant ou après.
3. R-CNX-03 · Le mot de passe doit être saisi exactement : majuscules et espaces comptent.
4. R-CNX-04 · Une adresse inconnue et un mauvais mot de passe donnent le même message : la page ne révèle pas si une adresse a un compte.
5. R-CNX-05 · Après une connexion réussie, la personne arrive sur la page qu'elle avait demandée ; à défaut, sur sa bibliothèque.
6. R-CNX-06 · Une personne déjà connectée qui ouvre la page de connexion est envoyée directement sur sa bibliothèque (ou sur la page demandée).
7. R-CNX-07 · Pendant l'envoi, le bouton affiche « Connexion… » et ne peut pas être cliqué une deuxième fois.
8. R-CNX-08 · Après un échec, les champs gardent leur contenu et la personne peut réessayer aussitôt.
9. R-CNX-09 · On peut être connecté au même compte sur plusieurs appareils en même temps (téléphone, ordinateur, cadre). Chaque appareil a sa propre connexion.

**Messages affichés**

| Situation                                  | Message                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| Titre et invitation de la page             | « FamilyFrame » — « Connectez-vous pour envoyer des photos et voir le cadre. » |
| Adresse inconnue ou mot de passe incorrect | « E-mail ou mot de passe incorrect. »                                          |
| Connexion en cours                         | « Connexion… » (sur le bouton « Se connecter »)                                |
| Application injoignable (réseau coupé)     | « L'opération a échoué. Vérifiez la connexion et réessayez. »                  |

**Ce qui n'est pas possible**

- S'inscrire seul : un compte se crée uniquement par une invitation de l'administrateur.
- Réinitialiser un mot de passe oublié : aucune procédure « mot de passe oublié » n'existe.
- Changer son mot de passe, son nom ou son adresse e-mail : prévu en partie, voir [a-venir.md](a-venir.md).
- Être bloqué après plusieurs essais ratés : le nombre d'essais n'est pas limité.

## Rester connecté

**Ce que l'on peut faire**

- Rester connecté sans ressaisir son mot de passe, y compris après avoir fermé la page ou éteint l'appareil.
- Laisser un cadre allumé pendant des mois sans qu'il se déconnecte.

**Règles**

1. R-CNX-10 · Une connexion reste valable 90 jours.
2. R-CNX-11 · Une connexion utilisée se prolonge seule : dès qu'il lui reste moins de 45 jours, la moindre action dans l'application la repousse à 90 jours à partir de ce moment.
3. R-CNX-12 · Un cadre allumé recharge ses photos une fois par jour, ce qui suffit à prolonger sa connexion : un cadre allumé en continu ne se déconnecte jamais (voir [cadre.md](cadre.md)).
4. R-CNX-13 · Une connexion qui n'a pas servi pendant 90 jours expire : la personne doit se reconnecter.
5. R-CNX-14 · Quand la connexion a expiré ou a été fermée, la personne est ramenée à la page de connexion dès sa prochaine action ; après s'être reconnectée, elle revient sur la page où elle était.
6. R-CNX-15 · Au démarrage, tant que l'application ne sait pas encore si la personne est connectée, la page reste vide plutôt que d'afficher la connexion par erreur.
7. R-CNX-16 · Si l'application est injoignable au démarrage (Wi-Fi pas encore prêt, coupure), elle réessaie toutes les 5 secondes, sans fin, au lieu d'envoyer la personne vers la page de connexion. Un cadre rallumé retrouve ainsi ses photos seul dès que le réseau revient.

**Messages affichés**

| Situation                                           | Message                                                        |
| --------------------------------------------------- | -------------------------------------------------------------- |
| Connexion expirée pendant une action                | Aucun message : retour direct à la page de connexion.          |
| Démarrage pendant que l'application est injoignable | Aucun message : page vide, nouvel essai toutes les 5 secondes. |

**Ce qui n'est pas possible**

- Choisir la durée de connexion ou cocher « se souvenir de moi » : tous les appareils ont la même règle.
- Voir la liste des appareils connectés à son compte, ou déconnecter un autre appareil à distance.

## Se déconnecter

**Ce que l'on peut faire**

- Se déconnecter avec « Se déconnecter », depuis le menu du compte (ordinateur), le menu mobile (téléphone) ou la page d'invitation quand on y arrive déjà connecté.

**Règles**

1. R-CNX-20 · La déconnexion ne concerne que l'appareil utilisé : les autres appareils du compte, le cadre compris, restent connectés.
2. R-CNX-21 · Après la déconnexion, la personne arrive sur la page de connexion.
3. R-CNX-22 · La déconnexion fonctionne même si l'application est momentanément injoignable : l'appareil oublie la personne tout de suite.
4. R-CNX-23 · Se déconnecter deux fois, ou alors que la connexion avait déjà expiré, ne provoque aucune erreur.

**Messages affichés**

| Situation   | Message                                        |
| ----------- | ---------------------------------------------- |
| Déconnexion | Aucun message : retour à la page de connexion. |

**Ce qui n'est pas possible**

- Déconnecter tous ses appareils en une fois.

## Pages réservées

**Ce que l'on peut faire**

- Ouvrir sans être connecté : la page de connexion et la page d'une invitation.
- Ouvrir une fois connecté : la bibliothèque, le cadre, les amis, une page introuvable ; en plus, pour l'administrateur, les invitations.

**Règles**

1. R-CNX-30 · Toute page autre que la connexion et l'invitation exige d'être connecté. Sans connexion, la personne est envoyée vers la page de connexion, puis ramenée à la page demandée après s'être connectée (R-CNX-05).
2. R-CNX-31 · Une adresse inconnue ouverte sans être connecté mène d'abord à la connexion, puis à la page introuvable (voir [apparence-et-navigation.md](apparence-et-navigation.md)).
3. R-CNX-32 · La page des invitations est réservée à l'administrateur. Un membre qui l'ouvre voit un encart d'explication avec un lien de retour, sans le formulaire (voir [invitations.md](invitations.md)).
4. R-CNX-33 · Chaque compte ne voit que ses propres photos, ses propres amis et ses propres demandes.

**Messages affichés**

| Situation                                    | Message                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Un membre ouvre la page des invitations      | « Invitations » — « Cette page est réservée à l'administrateur. » et le lien « Retour à la bibliothèque » |
| Action d'administration tentée par un membre | « Cette action est réservée à l'administrateur. »                                                         |

**Ce qui n'est pas possible**

- Consulter la bibliothèque ou le cadre d'un autre compte, même celui d'un ami.
- Partager publiquement un lien vers une page de l'application : tout est privé.
