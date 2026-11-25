# Partage

Envoyer une photo à un ou plusieurs amis la fait entrer dans sa bibliothèque et l'affiche aussitôt sur son cadre. On ne peut envoyer qu'à un ami, c'est-à-dire après une demande acceptée (voir [amis.md](amis.md)).

## Choisir à qui envoyer

**Ce que l'on peut faire**

- Ouvrir « Envoyer à des proches » depuis une photo de sa bibliothèque ou depuis le formulaire d'ajout (voir les deux sections suivantes).
- Voir un aperçu de la photo, puis ses amis sous forme de ronds portant leur photo de profil ou, sans photo, leur initiale.
- Envoyer une photo à plusieurs proches en une fois, en touchant leur visage puis un seul bouton.
- Rechercher un ami par son nom ou son adresse e-mail quand on en a beaucoup.
- Écrire un petit message qui accompagne la photo, si on le souhaite.
- Fermer avec la croix, la touche Échap ou en touchant à côté.

**Règles**

1. R-PAR-01 · Seuls les amis acceptés apparaissent ; les demandes en attente, dans un sens comme dans l'autre, ne permettent pas d'envoyer.
2. R-PAR-02 · La liste des amis est chargée à chaque ouverture.
3. R-PAR-03 · Remplacée : les amis se choisissent désormais en touchant leur rond (R-PAR-44).
4. R-PAR-04 · Le champ « Rechercher un ami » n'apparaît qu'à partir de 6 amis. La recherche porte sur le nom et l'adresse e-mail, sans tenir compte des majuscules ni des accents (« elodie » trouve « Élodie »). Un ami déjà coché le reste quand la recherche le masque.
5. R-PAR-05 · Remplacée : le bouton d'envoi indique le nombre de personnes choisies (R-PAR-45).
6. R-PAR-06 · Remplacée : l'issue de l'envoi est décrite par la fermeture du panneau et la notification (R-PAR-46).
7. R-PAR-07 · Une photo que le destinataire possède déjà (identique octet pour octet, ajoutée par lui ou reçue de quelqu'un d'autre) est refusée.
8. R-PAR-08 · Une personne retirée des amis entre l'ouverture et l'envoi ne peut pas recevoir la photo.
9. R-PAR-09 · Le panneau garde la photo choisie à son ouverture : si le diaporama passe à une autre photo pendant ce temps, c'est bien la photo d'origine qui est envoyée.
10. R-PAR-44 · Remplacée : le rond porte désormais la photo de profil quand il y en a une (R-PAR-47). Les proches apparaissent avec leur prénom ; le nom complet s'affiche au survol. Leur adresse e-mail n'est pas montrée.
11. R-PAR-45 · Le bouton indique combien de personnes recevront la photo et reste grisé tant que personne n'est choisi.
12. R-PAR-46 · Dès qu'au moins une personne a reçu la photo, le panneau se ferme et une notification dit à qui elle est partie, ainsi que pour qui l'envoi a échoué. Si personne ne l'a reçue, le panneau reste ouvert avec les raisons, et le choix est gardé.
13. R-PAR-47 · Le rond de chaque proche porte sa photo de profil quand il en a une, et sa première lettre en majuscule sinon.
14. R-PAR-48 · Le message est facultatif et fait 200 caractères au plus ; un compteur indique combien il en reste. Les espaces au début et à la fin sont retirés, et un message vide ou fait seulement d'espaces compte comme aucun message. Envoyée à plusieurs proches en une fois, la photo leur parvient à tous avec le même message.

**Messages affichés**

| Situation                            | Message                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| En-tête                              | « Envoyer à des proches » — « La photo s'affichera aussitôt sur leur cadre. »      |
| Chargement des amis                  | « Chargement… »                                                                    |
| Aucun ami                            | « Vous n'avez pas encore d'amis. » et le lien « Ajouter un ami » vers la page Amis |
| Recherche sans résultat              | « Aucun ami ne correspond à « [texte saisi] ». »                                   |
| Champ du message                     | « Message (facultatif) », avec le compteur « N / 200 »                             |
| Message trop long                    | « Le message doit faire 200 caractères au plus. »                                  |
| Bouton                               | « Envoyer », « Envoyer à 1 personne », « Envoyer à N personnes »                   |
| Envoi en cours                       | « Envoi… »                                                                         |
| Envoi réussi                         | « Envoyée à Mamie et Tata » (exemple)                                              |
| Le destinataire a déjà cette photo   | « Tata a déjà cette photo. »                                                       |
| La personne n'est plus un ami        | « Cette personne ne fait pas partie de vos amis. »                                 |
| La photo a été supprimée entre-temps | « Cette photo a déjà été supprimée. »                                              |

**Ce qui n'est pas possible**

- Envoyer à une personne qui n'est pas un ami, ou à soi-même.
- Fermer le panneau en le faisant glisser vers le bas : il se ferme avec la croix, la touche Échap ou en touchant à côté.
- Modifier ou retirer le message une fois la photo envoyée.
- Écrire un message différent à chaque proche dans le même envoi : il faut faire un envoi par personne.

## Envoyer une photo de sa bibliothèque

**Ce que l'on peut faire**

- Dans le menu « … » d'une photo, choisir « Envoyer à un ami ». Ce menu existe dans la bibliothèque, sur une photo ouverte en grand et dans le diaporama.

**Règles**

1. R-PAR-10 · On peut envoyer toute photo de sa bibliothèque, y compris une photo que l'on a soi-même reçue d'un ami.
2. R-PAR-11 · La photo reste dans la bibliothèque de l'expéditeur, inchangée.
3. R-PAR-12 · On ne peut envoyer que ses propres photos : pas celles d'un autre compte.

**Messages affichés**

Ceux du panneau d'envoi (voir [Choisir à qui envoyer](#choisir-à-qui-envoyer)).

**Ce qui n'est pas possible**

- Voir la liste des amis à qui une photo a déjà été envoyée.

## Envoyer une photo depuis son appareil

**Ce que l'on peut faire**

- Dans la carte « Ajouter une photo » de la bibliothèque, prendre ou choisir une photo, puis cliquer sur « Envoyer à un ami » au lieu de « Ajouter à ma bibliothèque ».

**Règles**

1. R-PAR-20 · La photo entre uniquement dans la bibliothèque de l'ami : elle n'est pas ajoutée à celle de l'expéditeur.
2. R-PAR-21 · Les règles d'ajout s'appliquent comme pour sa propre bibliothèque : formats JPEG, PNG ou WebP, 10 Mo au plus, image lisible, photo préparée pour l'affichage et informations cachées retirées (voir [bibliotheque.md](bibliotheque.md#ajouter-une-photo), R-BIB-03 à R-BIB-09). Les messages d'erreur sont les mêmes.
3. R-PAR-22 · Après un envoi réussi, le formulaire d'ajout se vide et le panneau se ferme.
4. R-PAR-23 · La notification « Photo ajoutée à votre bibliothèque. » du formulaire ne concerne que l'ajout à sa bibliothèque ; l'envoi à des amis se confirme par sa propre notification (« Envoyée à … »).

**Messages affichés**

Ceux du panneau d'envoi (voir [Choisir à qui envoyer](#choisir-à-qui-envoyer)) et ceux de l'ajout d'une photo (voir [bibliotheque.md](bibliotheque.md#ajouter-une-photo)).

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
8. R-PAR-49 · Le message de l'expéditeur s'affiche entre guillemets sous la mention « Envoyée par » : sur la photo ouverte en grand, dans la légende du diaporama et sur la bande blanche du polaroid. Sur le cadre, il tient sur trois lignes au plus ; la photo ouverte en grand le montre en entier.
9. R-PAR-50 · Une photo transférée de nouveau porte le message de la dernière personne qui l'a envoyée, ou aucun message si elle n'en a pas écrit : le message reçu avec la photo ne la suit pas.

**Messages affichés**

| Situation                    | Message               |
| ---------------------------- | --------------------- |
| Photo reçue (légende, liste) | « Envoyée par [nom] » |
| Photo reçue avec un message  | « « [message] » »     |

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
