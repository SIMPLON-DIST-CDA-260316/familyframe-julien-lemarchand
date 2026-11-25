# Invitations

Personne ne s'inscrit seul dans FamilyFrame : l'administrateur crée un lien d'invitation pour une adresse e-mail, le transmet lui-même, et la personne invitée crée son compte avec ce lien.

## Créer un lien d'invitation (administrateur)

**Ce que l'on peut faire**

- Ouvrir la page « Invitations » depuis la barre du haut (entrée « Invitations » ; sur un téléphone, dans le menu du compte) ou depuis la bibliothèque (bouton « Inviter un proche sur FamilyFrame »). Ces deux accès n'apparaissent que pour l'administrateur.
- Saisir l'adresse e-mail de la personne à inviter et créer le lien.
- Copier le lien d'un clic avec « Copier le lien », ou le sélectionner pour le copier à la main.
- Transmettre le lien soi-même, par le moyen de son choix (SMS, message, e-mail personnel).

**Règles**

1. R-INV-01 · Seul l'administrateur peut créer des invitations.
2. R-INV-02 · L'adresse e-mail est obligatoire et doit avoir une forme d'adresse (un « @ », sans espace). Les majuscules et les espaces autour sont ignorés.
3. R-INV-03 · On ne peut pas inviter une adresse qui a déjà un compte.
4. R-INV-04 · Un lien est valable 7 jours à partir de sa création.
5. R-INV-05 · Un lien ne sert qu'une seule fois : il devient inutilisable dès que le compte est créé.
6. R-INV-06 · Le lien n'est affiché qu'une seule fois, juste après sa création. Il disparaît si l'on recharge ou quitte la page, et ne peut plus être retrouvé ensuite.
7. R-INV-07 · Inviter de nouveau une adresse dont l'invitation n'a pas servi (en attente ou expirée) crée un nouveau lien et rend l'ancien inutilisable. C'est la solution quand un lien est perdu ou expiré.
8. R-INV-08 · Le lien reprend l'adresse du site par laquelle l'administrateur consulte la page : il doit donc créer les liens depuis l'adresse que la famille utilise.
9. R-INV-09 · Le bouton « Copier le lien » n'apparaît que si l'appareil autorise la copie automatique ; sinon, le champ du lien se sélectionne en entier au toucher pour une copie manuelle. Après une copie réussie, le bouton affiche « Lien copié » pendant 2 secondes.
10. R-INV-10 · Après une création réussie, le champ e-mail se vide et la liste des invitations se met à jour.
11. R-INV-11 · L'application n'envoie aucun e-mail : c'est l'administrateur qui transmet le lien.

**Messages affichés**

| Situation                        | Message                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| En-tête de la page               | « Invitations » — « Créez un lien pour inviter un proche dans FamilyFrame. »                                                 |
| Champ de saisie                  | « E-mail de la personne invitée »                                                                                            |
| Création en cours                | « Création… » (sur le bouton « Créer le lien »)                                                                              |
| Lien créé                        | « Lien d'invitation », puis « Envoyez ce lien vous-même. Il sert une seule fois, pendant 7 jours, et ne sera plus affiché. » |
| Copie réussie                    | « Lien copié » (pendant 2 secondes, à la place de « Copier le lien »)                                                        |
| Adresse mal formée               | « Adresse e-mail invalide. »                                                                                                 |
| L'adresse a déjà un compte       | « Un compte existe déjà pour cette adresse e-mail. »                                                                         |
| Un membre tente d'ouvrir la page | « Cette page est réservée à l'administrateur. »                                                                              |

**Ce qui n'est pas possible**

- Révoquer un lien sans en créer un nouveau.
- Revoir un lien après avoir quitté la page.
- Choisir la durée de validité d'un lien.
- Inviter un nouvel administrateur : tout compte créé par invitation est un compte membre.
- Inviter plusieurs adresses en une fois.

## Suivre les invitations envoyées (administrateur)

**Ce que l'on peut faire**

- Voir, sous « Invitations envoyées », toutes les invitations créées, avec l'adresse, un statut et une date.

**Règles**

1. R-INV-20 · Les invitations sont listées de la plus récente à la plus ancienne.
2. R-INV-21 · Une invitation a l'un de ces trois statuts : « En attente » (lien encore valable), « Utilisée » (le compte a été créé), « Expirée » (7 jours passés sans servir).
3. R-INV-22 · Une invitation utilisée reste « Utilisée » pour toujours, même après ses 7 jours.
4. R-INV-23 · Une invitation en attente affiche sa date d'expiration (« expire le 1 décembre 2026 ») ; une invitation utilisée ou expirée affiche sa date de création (« créée le 24 novembre 2026 »).
5. R-INV-24 · Une invitation remplacée par un nouveau lien (R-INV-07) disparaît de la liste ; seule la plus récente reste.

**Messages affichés**

| Situation              | Message                                   |
| ---------------------- | ----------------------------------------- |
| Chargement de la liste | « Chargement… »                           |
| Aucune invitation      | « Aucune invitation pour l'instant. »     |
| Statuts                | « En attente », « Utilisée », « Expirée » |

**Ce qui n'est pas possible**

- Supprimer une invitation de la liste.
- Voir le nom choisi par la personne invitée : la liste ne montre que l'adresse e-mail.

## Créer son compte avec une invitation (personne invitée)

**Ce que l'on peut faire**

- Ouvrir le lien reçu, choisir son nom et son mot de passe, et créer son compte.
- Arriver connecté sur sa bibliothèque, sans passer par la page de connexion.

**Règles**

1. R-INV-30 · Le compte est créé avec l'adresse e-mail pour laquelle l'invitation a été faite. La personne ne la saisit pas et ne peut pas la changer.
2. R-INV-31 · Les trois champs « Votre nom », « Mot de passe » et « Confirmer le mot de passe » sont obligatoires.
3. R-INV-32 · Le nom compte de 1 à 50 caractères ; les espaces au début et à la fin sont retirés et ne comptent pas. Un nom fait uniquement d'espaces est refusé.
4. R-INV-33 · Le mot de passe compte de 12 à 128 caractères. Les espaces font partie du mot de passe.
5. R-INV-34 · Le mot de passe et sa confirmation doivent être identiques ; sinon, rien n'est envoyé.
6. R-INV-35 · Le lien est vérifié en premier : un lien invalide, déjà utilisé ou expiré est refusé avant même de regarder le nom et le mot de passe.
7. R-INV-36 · Un lien déjà utilisé donne le conseil de se connecter, même s'il a aussi dépassé ses 7 jours.
8. R-INV-37 · Le compte créé est un compte membre.
9. R-INV-38 · Une personne déjà connectée qui ouvre un lien d'invitation ne voit pas le formulaire : un encart lui indique sous quel nom elle est connectée et propose « Se déconnecter ». Le lien n'est pas consommé.
10. R-INV-39 · Après la création, la personne est connectée sur cet appareil (mêmes règles que [Rester connecté](comptes-et-connexion.md#rester-connecté)) et arrive sur sa bibliothèque.
11. R-INV-40 · Si deux personnes utilisent le même lien en même temps, un seul compte est créé ; l'autre reçoit le message « Un compte existe déjà pour cette adresse e-mail. ».

**Messages affichés**

| Situation                                   | Message                                                                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| En-tête du formulaire                       | « Rejoindre FamilyFrame » — « Choisissez votre nom et votre mot de passe. »                                            |
| Création en cours                           | « Création… » (sur le bouton « Créer mon compte »)                                                                     |
| Mot de passe et confirmation différents     | « Les deux mots de passe ne correspondent pas. »                                                                       |
| Nom vide ou trop long                       | « Choisissez un nom de 1 à 50 caractères. »                                                                            |
| Mot de passe trop court ou trop long        | « Le mot de passe doit faire entre 12 et 128 caractères. »                                                             |
| Lien inconnu, incomplet ou remplacé         | « Ce lien d'invitation n'est pas valide. Demandez-en un nouveau. »                                                     |
| Lien expiré                                 | « Ce lien d'invitation a expiré. Demandez-en un nouveau. »                                                             |
| Lien déjà utilisé                           | « Ce lien d'invitation a déjà servi. Connectez-vous. »                                                                 |
| Compte déjà existant pour cette adresse     | « Un compte existe déjà pour cette adresse e-mail. »                                                                   |
| Lien ouvert par une personne déjà connectée | « Rejoindre FamilyFrame » — « Vous êtes connecté en tant que [nom]. Déconnectez-vous pour utiliser cette invitation. » |

**Ce qui n'est pas possible**

- Créer un compte sans lien d'invitation.
- Choisir une autre adresse e-mail que celle de l'invitation.
- Créer son compte depuis un appareil où quelqu'un est déjà connecté, sans se déconnecter d'abord.
