# Partage

Envoyer une photo à un ami la fait entrer dans sa bibliothèque et l'affiche aussitôt sur son cadre. On ne peut envoyer qu'à un ami, c'est-à-dire après une demande acceptée (voir [amis.md](amis.md)).

## Choisir à qui envoyer

**Ce que l'on peut faire**

- Ouvrir la fenêtre « Envoyer à un ami » depuis une photo de sa bibliothèque ou depuis le formulaire d'ajout (voir les deux sections suivantes).
- Voir un aperçu de la photo, puis la liste de ses amis avec un bouton « Envoyer » pour chacun.
- Envoyer la même photo à plusieurs amis depuis la même fenêtre, l'un après l'autre.
- Rechercher un ami par son nom ou son adresse e-mail quand on en a beaucoup.
- Fermer la fenêtre avec « Fermer ».

**Règles**

1. R-PAR-01 · Seuls les amis acceptés apparaissent dans la liste ; les demandes en attente, dans un sens comme dans l'autre, ne permettent pas d'envoyer.
2. R-PAR-02 · La liste des amis est chargée à chaque ouverture de la fenêtre.
3. R-PAR-03 · Chaque ligne montre l'initiale, le nom et l'adresse e-mail de l'ami.
4. R-PAR-04 · Le champ « Rechercher un ami » n'apparaît qu'à partir de 6 amis. La recherche porte sur le nom et l'adresse e-mail, sans tenir compte des majuscules ni des accents (« elodie » trouve « Élodie »).
5. R-PAR-05 · Le bouton d'un ami affiche « Envoi… » pendant l'envoi, puis « Envoyée » et reste désactivé : on ne peut pas renvoyer la photo au même ami depuis la même fenêtre. Les autres amis restent disponibles.
6. R-PAR-06 · En cas d'échec, le message s'affiche au-dessus de la liste et le bouton de l'ami redevient utilisable.
7. R-PAR-07 · Une photo que le destinataire possède déjà (identique octet pour octet, ajoutée par lui ou reçue de quelqu'un d'autre) est refusée.
8. R-PAR-08 · Une personne retirée des amis entre l'ouverture de la fenêtre et l'envoi ne peut pas recevoir la photo.
9. R-PAR-09 · La fenêtre garde la photo choisie à son ouverture : si le diaporama passe à une autre photo pendant ce temps, c'est bien la photo d'origine qui est envoyée.

**Messages affichés**

| Situation                            | Message                                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| En-tête de la fenêtre                | « Envoyer à un ami » — « La photo s'affiche sur le cadre de l'ami que vous choisissez. » |
| Chargement des amis                  | « Chargement… »                                                                          |
| Aucun ami                            | « Vous n'avez pas encore d'amis. » et le lien « Ajouter un ami » vers la page Amis       |
| Recherche sans résultat              | « Aucun ami ne correspond à « [texte saisi] ». »                                         |
| Envoi en cours, puis réussi          | « Envoi… », puis « Envoyée »                                                             |
| Le destinataire a déjà cette photo   | « Cette personne a déjà cette photo. »                                                   |
| La personne n'est plus un ami        | « Cette personne ne fait pas partie de vos amis. »                                       |
| La photo a été supprimée entre-temps | « Cette photo a déjà été supprimée. »                                                    |

**Ce qui n'est pas possible**

- Envoyer à une personne qui n'est pas un ami, ou à soi-même.
- Cocher plusieurs amis et envoyer en une seule fois : prévu, voir [a-venir.md](a-venir.md).
- Joindre un message à la photo : prévu, voir [a-venir.md](a-venir.md).

## Envoyer une photo de sa bibliothèque

**Ce que l'on peut faire**

- Dans le menu « … » d'une photo, choisir « Envoyer à un ami ». Ce menu existe dans la bibliothèque, sur une photo ouverte en grand et dans le diaporama.

**Règles**

1. R-PAR-10 · On peut envoyer toute photo de sa bibliothèque, y compris une photo que l'on a soi-même reçue d'un ami.
2. R-PAR-11 · La photo reste dans la bibliothèque de l'expéditeur, inchangée.
3. R-PAR-12 · On ne peut envoyer que ses propres photos : pas celles d'un autre compte.

**Messages affichés**

Ceux de la fenêtre d'envoi (voir [Choisir à qui envoyer](#choisir-à-qui-envoyer)).

**Ce qui n'est pas possible**

- Voir la liste des amis à qui une photo a déjà été envoyée.

## Envoyer une photo depuis son appareil

**Ce que l'on peut faire**

- Dans la carte « Ajouter une photo » de la bibliothèque, prendre ou choisir une photo, puis cliquer sur « Envoyer à un ami » au lieu de « Ajouter à ma bibliothèque ».

**Règles**

1. R-PAR-20 · La photo entre uniquement dans la bibliothèque de l'ami : elle n'est pas ajoutée à celle de l'expéditeur.
2. R-PAR-21 · Les règles d'ajout s'appliquent comme pour sa propre bibliothèque : formats JPEG, PNG ou WebP, 10 Mo au plus, image lisible, photo préparée pour l'affichage et informations cachées retirées (voir [bibliotheque.md](bibliotheque.md#ajouter-une-photo), R-BIB-03 à R-BIB-09). Les messages d'erreur sont les mêmes.
3. R-PAR-22 · Après le premier envoi réussi, le formulaire d'ajout se vide, mais la fenêtre reste ouverte avec la photo pour l'envoyer à d'autres amis.
4. R-PAR-23 · La notification « Photo ajoutée à votre bibliothèque. » du formulaire ne concerne que l'ajout à sa bibliothèque ; l'envoi à un ami se confirme dans la fenêtre, par le bouton « Envoyée ».

**Messages affichés**

Ceux de la fenêtre d'envoi (voir [Choisir à qui envoyer](#choisir-à-qui-envoyer)) et ceux de l'ajout d'une photo (voir [bibliotheque.md](bibliotheque.md#ajouter-une-photo)).

**Ce qui n'est pas possible**

- Envoyer une photo à un ami et la garder dans sa bibliothèque en une seule action : il faut l'ajouter à sa bibliothèque, puis l'envoyer depuis son menu « … ».

## Recevoir une photo

**Ce que l'on peut faire**

- Voir la photo reçue apparaître seule, sans recharger, en tête de sa bibliothèque et sur son cadre.
- La garder, la supprimer ou l'envoyer à son tour à ses propres amis, comme n'importe quelle photo de sa bibliothèque.

**Règles**

1. R-PAR-30 · Une photo reçue devient une photo de la bibliothèque du destinataire, à part entière.
2. R-PAR-31 · Elle porte la mention « Envoyée par » suivie du nom de l'expéditeur : dans la légende du cadre, dans la vue liste et dans la description de la photo.
3. R-PAR-32 · Le nom affiché est le nom actuel de l'expéditeur.
4. R-PAR-33 · Une photo transférée de nouveau nomme la dernière personne qui l'a envoyée, pas l'auteur d'origine.
5. R-PAR-34 · Sa date est celle de sa réception, pas celle de son ajout chez l'expéditeur : elle se range donc en tête de la bibliothèque.
6. R-PAR-35 · La photo s'affiche sur tous les appareils du destinataire connectés à ce moment-là ; l'expéditeur ne voit aucun changement sur ses propres écrans.
7. R-PAR-36 · Sur un cadre en diaporama, la photo reçue s'affiche selon les règles d'arrivée d'une nouvelle photo (voir [cadre.md](cadre.md#arrivée-dune-nouvelle-photo)).

**Messages affichés**

| Situation                    | Message               |
| ---------------------------- | --------------------- |
| Photo reçue (légende, liste) | « Envoyée par [nom] » |

**Ce qui n'est pas possible**

- Refuser une photo avant qu'elle arrive : elle entre directement dans la bibliothèque.
- Être prévenu autrement que par son apparition sur le cadre et dans la bibliothèque : prévu, voir [a-venir.md](a-venir.md).

## Ce que deviennent les photos envoyées

**Ce que l'on peut faire**

- Gérer chacun ses photos de son côté, indépendamment de l'autre.

**Règles**

1. R-PAR-40 · Supprimer l'original chez l'expéditeur ne retire pas la photo de la bibliothèque des amis qui l'ont reçue.
2. R-PAR-41 · Supprimer une photo reçue ne la retire pas de la bibliothèque de l'expéditeur, ni de celle des autres destinataires.
3. R-PAR-42 · Retirer un ami ne retire aucune photo déjà échangée : chacun garde les photos qu'il a reçues.
4. R-PAR-43 · Après une suppression, la même photo peut de nouveau être envoyée ou ajoutée à cette bibliothèque.

**Messages affichés**

Aucun message propre.

**Ce qui n'est pas possible**

- Reprendre une photo envoyée (« annuler l'envoi »).
- Supprimer une photo dans toutes les bibliothèques à la fois.
