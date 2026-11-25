# FamilyFrame : description du produit

FamilyFrame est un cadre photo connecté pour les familles éloignées. Chaque membre de la famille a un compte, une bibliothèque de photos qu'il peut ranger en collections, et un cadre : un écran (tablette, vieil ordinateur, télévision) qui fait défiler ses photos. Les membres deviennent amis entre eux et s'envoient des photos : une photo envoyée est annoncée sur le cadre et dans la bibliothèque de l'ami, qui la découvre quand bon lui semble, sans que personne ait à recharger la page.

Cette documentation décrit ce que l'application permet de faire et selon quelles règles. Elle ne parle pas de la manière dont c'est construit.

## Qui utilise FamilyFrame

| Rôle               | Ce qu'il peut faire                                                                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Membre**         | Se connecter, gérer sa bibliothèque et ses collections, afficher son cadre, ajouter des amis, envoyer des photos à ses amis, choisir son thème.                                                 |
| **Administrateur** | Tout ce que fait un membre, plus inviter de nouvelles personnes dans FamilyFrame. Il n'y a qu'un administrateur, créé à l'installation de l'application. Personne ne s'inscrit sans invitation. |

## Glossaire

| Terme                  | Sens dans FamilyFrame                                                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Compte**             | L'accès personnel d'une personne : une adresse e-mail, un nom affiché et un mot de passe. Chaque compte a une seule bibliothèque, que tous ses cadres affichent.       |
| **Administrateur**     | Le compte qui peut créer des invitations. Il est aussi un membre comme les autres.                                                                                     |
| **Membre**             | Toute personne qui a un compte. Un compte créé par invitation est toujours un compte membre.                                                                           |
| **Invitation**         | Un lien personnel, créé par l'administrateur pour une adresse e-mail, qui permet à une personne de créer son compte. Il sert une seule fois et pendant 7 jours.        |
| **Proche / ami**       | Un autre membre avec qui l'on a une amitié acceptée des deux côtés. On ne peut envoyer des photos qu'à ses amis.                                                       |
| **Demande d'ami**      | La proposition d'amitié envoyée à un autre membre. Elle reste « en attente » jusqu'à ce que l'autre l'accepte ou la refuse, ou que l'on l'annule.                      |
| **Bibliothèque**       | L'ensemble des photos d'un compte : celles qu'il a ajoutées et celles que ses amis lui ont envoyées. Elle est privée : personne d'autre ne la voit.                    |
| **Photo reçue**        | Une photo qu'un ami a envoyée. Elle fait partie de la bibliothèque du destinataire comme les autres et porte la mention « Envoyée par » suivie du nom de l'expéditeur. |
| **Expéditeur**         | Le membre qui a envoyé une photo reçue.                                                                                                                                |
| **Collection**         | Une liste de photos de sa bibliothèque, rangées sous un nom (« Noël », « Les vacances »). Elle est privée.                                                             |
| **Cadre**              | L'affichage plein écran de sa bibliothèque, pensé pour un écran posé chez soi. Il montre toutes les photos du compte connecté.                                         |
| **Diaporama**          | Le mode du cadre qui affiche une photo à la fois, en grand, et passe seul à la suivante.                                                                               |
| **Modèle d'affichage** | La façon dont le cadre présente chaque photo : ajustée sur un fond flouté, en plein format, dans un passe-partout ou en polaroïd. Chaque appareil garde le sien.       |
| **Vignette**           | La petite image carrée qui représente une photo dans une grille, une liste ou un bandeau.                                                                              |
| **Thème**              | L'apparence claire ou sombre de l'application, choisie par chaque personne sur chaque appareil.                                                                        |

## Fichiers

| Fichier                                                  | Contenu                                                                                                               |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [comptes-et-connexion.md](comptes-et-connexion.md)       | Connexion, durée de la connexion, déconnexion, pages réservées aux personnes connectées.                              |
| [invitations.md](invitations.md)                         | Création des liens d'invitation par l'administrateur et création de compte par la personne invitée.                   |
| [amis.md](amis.md)                                       | Demandes d'ami, acceptation, refus, annulation, retrait d'un ami.                                                     |
| [bibliotheque.md](bibliotheque.md)                       | Ajout de photos, formats acceptés, doublons, affichage, chargement, suppression.                                      |
| [partage.md](partage.md)                                 | Envoi d'une photo à un ami, depuis sa bibliothèque ou depuis son appareil.                                            |
| [collections.md](collections.md)                         | Création, renommage et suppression des collections.                                                                   |
| [cadre.md](cadre.md)                                     | Vue cadre, diaporama, arrivée des photos en direct, comportement sans activité ou sans connexion.                     |
| [apparence-et-navigation.md](apparence-et-navigation.md) | Barre du haut, menus, thème, page introuvable, messages d'erreur communs.                                             |
| [preferences.md](preferences.md)                         | Page « Préférences » : photo de profil, nom affiché, mot de passe, adresse e-mail, réglages du cadre de cet appareil. |
| [a-venir.md](a-venir.md)                                 | Fonctionnalités prévues mais pas encore livrées.                                                                      |

## Conventions

- Chaque fonctionnalité suit le même plan : **Ce que l'on peut faire**, **Règles**, **Messages affichés**, **Ce qui n'est pas possible**.
- Chaque règle porte un identifiant stable `R-<DOMAINE>-<NN>` (par exemple `R-AMI-03`). Un identifiant n'est jamais réutilisé pour une autre règle : une règle supprimée garde son numéro, barré.
- Les messages sont recopiés mot pour mot depuis l'application, entre guillemets français.
- Une fonctionnalité ou une règle qui change met à jour ces fichiers en même temps.
