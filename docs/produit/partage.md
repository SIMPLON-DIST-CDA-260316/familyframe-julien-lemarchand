# Partage

Envoyer une photo à un ou plusieurs amis la leur fait parvenir comme du courrier : elle les attend, non ouverte, jusqu'à ce qu'ils la découvrent, puis entre dans leur bibliothèque. On ne peut envoyer qu'à un ami, c'est-à-dire après une demande acceptée (voir [amis.md](amis.md)).

## Choisir à qui envoyer

**Ce que l'on peut faire**

- Ouvrir « Envoyer à des proches » depuis la page « Envoyer » ou depuis une photo de sa bibliothèque (voir les sections suivantes).
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
14. R-PAR-48 · Le message est facultatif et fait 200 caractères au plus ; un compteur indique combien de caractères sont écrits (par exemple « 12 / 200 »). Les espaces au début et à la fin sont retirés, et un message vide ou fait seulement d'espaces compte comme aucun message. Envoyée à plusieurs proches en une fois, la photo leur parvient à tous avec le même message.

**Messages affichés**

| Situation                            | Message                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| En-tête                              | « Envoyer à des proches » — « Elle les attendra sur leur cadre et dans leur bibliothèque. » |
| Chargement des amis                  | « Chargement… »                                                                             |
| Aucun ami                            | « Vous n'avez pas encore d'amis. » et le lien « Ajouter un ami » vers la page Amis          |
| Recherche sans résultat              | « Aucun ami ne correspond à « [texte saisi] ». »                                            |
| Champ du message                     | « Message (facultatif) », avec le compteur « N / 200 »                                      |
| Message trop long                    | « Le message doit faire 200 caractères au plus. »                                           |
| Bouton                               | « Envoyer », « Envoyer à 1 personne », « Envoyer à N personnes »                            |
| Envoi en cours                       | « Envoi… »                                                                                  |
| Envoi réussi                         | « Envoyée à Mamie et Tata » (exemple)                                                       |
| Le destinataire a déjà cette photo   | « Tata a déjà cette photo. »                                                                |
| La personne n'est plus un ami        | « Cette personne ne fait pas partie de vos amis. »                                          |
| La photo a été supprimée entre-temps | « Cette photo a déjà été supprimée. »                                                       |

**Ce qui n'est pas possible**

- Envoyer à une personne qui n'est pas un ami, ou à soi-même.
- Fermer le panneau en le faisant glisser vers le bas : il se ferme avec la croix, la touche Échap ou en touchant à côté.
- Modifier ou retirer le message une fois la photo envoyée.
- Écrire un message différent à chaque proche dans le même envoi : il faut faire un envoi par personne.

## Envoyer une photo depuis la page Envoyer

**Ce que l'on peut faire**

- Sur la page « Envoyer », toucher « Envoyer une photo », puis choisir d'où vient la photo : « Prendre une photo » avec l'appareil photo, « Choisir sur l'appareil » parmi ses images, ou « Depuis ma bibliothèque ».
- Depuis sa bibliothèque, toucher la photo voulue dans la grille ; « Charger plus » montre les photos plus anciennes, et la flèche « Retour » ramène au choix d'origine.
- Choisir ensuite les proches et écrire un message, comme depuis le menu « … » d'une photo.

**Règles**

1. R-PAR-67 · La page s'ouvre sur ce que l'on vient faire : le bouton « Envoyer une photo » est en tête, l'historique des envois en dessous.
2. R-PAR-68 · Une photo prise ou choisie sur l'appareil part uniquement chez les proches : elle n'est pas ajoutée à la bibliothèque de l'expéditeur (R-PAR-20). Une photo choisie dans sa bibliothèque y reste, inchangée (R-PAR-11).
3. R-PAR-69 · On envoie une photo à la fois, avec son message : « Choisir sur l'appareil » ne prend qu'une image.
4. R-PAR-70 · La grille de sa bibliothèque montre les photos ouvertes, de la plus récente à la plus ancienne, comme la bibliothèque elle-même ; les photos reçues qui attendent d'être découvertes n'y sont pas.
5. R-PAR-71 · Choisir la photo ferme le choix d'origine et ouvre le panneau d'envoi avec cette photo (voir [Choisir à qui envoyer](#choisir-à-qui-envoyer)). Le fermer sans envoyer abandonne la photo.
6. R-PAR-72 · Après un envoi réussi, la ligne de l'envoi apparaît en tête de l'historique, sans recharger la page. L'historique revient alors aux 30 envois les plus récents : les envois montrés par « Afficher plus » se remontrent d'un nouvel appui.

**Messages affichés**

| Situation                 | Message                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------- |
| Bouton de la page         | « Envoyer une photo »                                                              |
| Choix d'origine           | « Envoyer une photo » — « Choisissez la photo, puis les proches à qui l'envoyer. » |
| Les trois origines        | « Prendre une photo », « Choisir sur l'appareil », « Depuis ma bibliothèque »      |
| Grille de sa bibliothèque | « Depuis ma bibliothèque » — « Touchez la photo à envoyer. »                       |
| Bouton pour revenir       | « Retour » (pour les lecteurs d'écran)                                             |
| Bibliothèque vide         | « Votre bibliothèque est vide. »                                                   |
| Suite de la grille        | « Charger plus »                                                                   |

**Ce qui n'est pas possible**

- Envoyer plusieurs photos en une fois.
- Envoyer une photo reçue qui attend encore d'être découverte : il faut d'abord la découvrir.

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

- Sur la page « Envoyer », toucher « Envoyer une photo », puis « Prendre une photo » ou « Choisir sur l'appareil » (voir [Envoyer une photo depuis la page Envoyer](#envoyer-une-photo-depuis-la-page-envoyer)).

**Règles**

1. R-PAR-20 · La photo entre uniquement dans la bibliothèque de l'ami : elle n'est pas ajoutée à celle de l'expéditeur.
2. R-PAR-21 · Les règles d'ajout s'appliquent comme pour sa propre bibliothèque : formats JPEG, PNG ou WebP, 10 Mo au plus (une photo très grande ou plus lourde étant d'abord réduite, R-BIB-63), image lisible, photo préparée avant d'être gardée (4096 pixels au plus, assez pour un tirage 20×30 cm) et informations cachées retirées (voir [bibliotheque.md](bibliotheque.md#ajouter-une-photo), R-BIB-03 à R-BIB-09). Les messages d'erreur sont les mêmes.
3. R-PAR-22 · Remplacée : l'envoi depuis l'appareil part de la page « Envoyer » ; le panneau « Ajouter une photo » ne fait plus qu'ajouter (R-PAR-71, R-BIB-67).
4. R-PAR-23 · La notification « Photo ajoutée à votre bibliothèque. » et la vignette grisée de l'envoi en cours ne concernent que l'ajout à sa bibliothèque ; l'envoi à des amis se confirme par sa propre notification (« Envoyée à … »).
5. R-PAR-24 · Remplacée : « Choisir sur l'appareil » ne prend qu'une image (R-PAR-69).

**Messages affichés**

Ceux du panneau d'envoi (voir [Choisir à qui envoyer](#choisir-à-qui-envoyer)) et ceux de l'ajout d'une photo (voir [bibliotheque.md](bibliotheque.md#ajouter-une-photo)).

**Ce qui n'est pas possible**

- Envoyer plusieurs photos à un ami en une fois : les ajouter à sa bibliothèque, puis les envoyer une par une depuis leur menu « … » ou depuis la page « Envoyer ».
- Envoyer une photo à un ami et la garder dans sa bibliothèque en une seule action : il faut l'ajouter à sa bibliothèque, puis l'envoyer depuis son menu « … » ou par « Depuis ma bibliothèque ».

## Recevoir une photo

**Ce que l'on peut faire**

- Voir l'annonce « Vous avez N nouvelles photos » en haut de sa bibliothèque dès qu'une photo arrive, sans recharger.
- Toucher « Découvrir » pour voir les photos reçues une à une, en grand, avec leur expéditeur, leur date et leur message.
- Voir la même annonce en haut de son cadre et lancer de là la même découverte.
- Une fois découverte, la garder, la supprimer ou l'envoyer à son tour à ses propres amis, comme n'importe quelle photo de sa bibliothèque.

**Règles**

1. R-PAR-30 · Remplacée : une photo reçue entre dans la bibliothèque une fois découverte (R-PAR-51, R-PAR-55).
2. R-PAR-31 · Elle porte la mention « Envoyée par » suivie du nom de l'expéditeur : dans la légende du cadre, dans la vue liste et dans la description de la photo.
3. R-PAR-32 · Le nom affiché est le nom actuel de l'expéditeur.
4. R-PAR-33 · Une photo transférée de nouveau nomme la dernière personne qui l'a envoyée, pas l'auteur d'origine.
5. R-PAR-34 · Remplacée : la photo découverte se range à sa date de réception, pas forcément en tête (R-PAR-55).
6. R-PAR-35 · Remplacée : l'annonce et la photo découverte apparaissent sur tous les appareils du destinataire (R-PAR-52, R-PAR-55) ; l'expéditeur ne voit rien changer (R-PAR-56).
7. R-PAR-36 · Remplacée : sur le cadre aussi, la photo reçue attend d'être découverte (R-PAR-57).
8. R-PAR-49 · Le message de l'expéditeur s'affiche entre guillemets sous la mention « Envoyée par » : sur la photo ouverte en grand, dans la légende du diaporama et sur la bande blanche du polaroid. Sur le cadre, il tient sur trois lignes au plus ; la photo ouverte en grand le montre en entier.
9. R-PAR-50 · Une photo transférée de nouveau porte le message de la dernière personne qui l'a envoyée, ou aucun message si elle n'en a pas écrit : le message reçu avec la photo ne la suit pas.
10. R-PAR-51 · Une photo reçue arrive non ouverte : elle n'entre ni dans la bibliothèque ni dans le diaporama tant que le destinataire ne l'a pas découverte. Les photos reçues avant l'arrivée de cette fonctionnalité comptent comme déjà découvertes.
11. R-PAR-52 · L'annonce « Vous avez N nouvelles photos » s'affiche en tête de la bibliothèque tant qu'au moins une photo attend, avec le prénom de chaque expéditeur, une seule fois chacun. Elle se met à jour seule, sur tous les appareils connectés, quand une photo arrive ou est découverte ailleurs.
12. R-PAR-53 · « Découvrir » montre les photos en attente une à une, de la plus ancienne à la plus récente : la photo en grand, « Envoyée par » suivi du nom, la date de réception et le message. « Photo suivante » passe à la suivante ; sur la dernière, « Terminer » referme. Une photo arrivée pendant la découverte attend la suivante.
13. R-PAR-54 · Une photo compte comme découverte dès qu'elle s'affiche, pour tous les appareils du destinataire. Fermer avant la fin, avec la croix ou la touche Échap, laisse les photos suivantes en attente.
14. R-PAR-55 · Une fois découverte, la photo entre dans la bibliothèque à sa date de réception, sur tous les appareils connectés, sans recharger : elle n'est en tête que si rien n'a été ajouté depuis.
15. R-PAR-56 · L'expéditeur ne voit aucun changement sur ses propres écrans et ne sait pas si la photo a été découverte.
16. R-PAR-57 · Sur le cadre, une pastille annonce aussi les photos en attente et lance la même découverte ; une fois découvertes, elles entrent dans le diaporama quand il lit toute la bibliothèque (voir [cadre.md](cadre.md#photos-reçues-en-attente)).

**Messages affichés**

| Situation                     | Message                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Photo reçue (légende, liste)  | « Envoyée par [nom] »                                                               |
| Photo reçue avec un message   | « « [message] » »                                                                   |
| Annonce, une photo en attente | « Vous avez 1 nouvelle photo » — « De Mamie » (exemple) et le bouton « Découvrir »  |
| Annonce, plusieurs photos     | « Vous avez N nouvelles photos » — « De Mamie et Tata » (exemple)                   |
| Découverte                    | « Nouvelle photo 1 / 3 », puis « Photo suivante » ou, sur la dernière, « Terminer » |

**Ce qui n'est pas possible**

- Refuser une photo : une fois découverte, on peut la supprimer.
- Découvrir une photo sans qu'elle compte comme ouverte, ou la remettre en attente.
- Savoir si un proche a découvert la photo qu'on lui a envoyée.
- Être prévenu en dehors de FamilyFrame, par e-mail ou par une notification du téléphone.

## Historique des envois

La page « Envoyer » garde la trace de ce que l'on a envoyé, comme le dossier des messages envoyés d'une boîte mail.

**Ce que l'on peut faire**

- Ouvrir la page « Envoyer » par l'onglet du même nom sur un téléphone, ou par « Envoyer » dans la barre du haut sur un ordinateur.
- Revoir ses envois, du plus récent au plus ancien : la photo en petit, à qui elle est partie, quand, et le message s'il y en avait un.
- Afficher les envois plus anciens.
- Retirer un envoi de son historique.

**Règles**

1. R-PAR-58 · Un envoi fait une seule ligne dans l'historique, même envoyé à plusieurs proches en une fois. La ligne ne nomme que les proches qui ont reçu la photo : ceux qui l'avaient déjà, ou qui ne sont plus des amis, n'y figurent pas. Un envoi que personne n'a reçu ne crée pas de ligne.
2. R-PAR-59 · Chaque ligne montre la photo en petit, « À » suivi des prénoms des proches (« À Mamie et Tata »), la date de l'envoi et, s'il y en avait un, le message entre guillemets, sur deux lignes au plus.
3. R-PAR-60 · La date se lit comme dans une boîte mail : « à l'instant » pendant la première minute, puis « il y a 5 min », « il y a 2 h » le jour même, « hier » la veille, « il y a 3 jours » jusqu'à six jours, puis le jour (« 12 novembre 2026 »). Le jour et l'heure exacts s'affichent au survol.
4. R-PAR-61 · Les prénoms sont ceux d'aujourd'hui : si un proche change de nom, ses anciens envois portent son nouveau nom. Si plus aucun des proches n'a de compte, la ligne affiche « À un compte supprimé ».
5. R-PAR-62 · L'historique est privé : seul l'expéditeur le voit. Il ne dit pas si la photo a été découverte ou gardée, et un proche qui a reçu la photo ne voit pas cet envoi dans son propre historique.
6. R-PAR-63 · Les 30 envois les plus récents s'affichent d'abord ; « Afficher plus » montre les 30 suivants, tant qu'il en reste.
7. R-PAR-64 · Retirer un envoi demande une confirmation. Il quitte alors l'historique, et seulement lui : les proches gardent la photo qu'ils ont reçue, et la photo reste dans la bibliothèque de l'expéditeur si elle y était.
8. R-PAR-65 · Une ligne de l'historique ne s'ouvre pas : pour regarder la photo, on passe par sa bibliothèque.
9. R-PAR-66 · L'historique n'a pas de limite de durée. Il commence avec cette version : les photos envoyées avant n'y figurent pas.
10. R-PAR-73 · Les dates se mettent à jour d'elles-mêmes sur une page restée ouverte (« à l'instant » devient « il y a 1 min »). Au clavier, après le retrait d'un envoi, on reprend depuis le titre « Envois » plutôt que depuis le haut de la page.

**Messages affichés**

| Situation                          | Message                                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| En-tête                            | « Envoyer » — « Faites parvenir une photo à vos proches, sur leur cadre et dans leur bibliothèque. » |
| Titre de la liste                  | « Envois »                                                                                           |
| Chargement                         | « Chargement… »                                                                                      |
| Aucun envoi                        | « Aucun envoi pour l'instant » — « Les photos que vous envoyez à vos proches apparaîtront ici. »     |
| Bouton pour la suite               | « Afficher plus »                                                                                    |
| Bouton de la corbeille             | « Retirer de l'historique » (au survol et pour les lecteurs d'écran)                                 |
| Confirmation                       | « Retirer cet envoi de l'historique ? » — « Vos proches gardent la photo. »                          |
| Boutons de la confirmation         | « Annuler », « Retirer »                                                                             |
| L'envoi a déjà été retiré ailleurs | « Cet envoi a déjà été retiré de l'historique. »                                                     |

**Ce qui n'est pas possible**

- Voir si un proche a découvert ou gardé la photo.
- Retirer la photo de chez ses proches depuis l'historique.
- Vider tout l'historique d'un coup : les envois se retirent un par un.
- Rechercher ou filtrer dans l'historique.

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
