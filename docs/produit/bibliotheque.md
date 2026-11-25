# Bibliothèque

La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajoutées et celles que ses amis lui ont envoyées. Elle est privée. C'est la page d'accueil de l'application une fois connecté (« Ma bibliothèque »). Le cadre affiche ces mêmes photos (voir [cadre.md](cadre.md)) ; l'envoi à un ami est décrit dans [partage.md](partage.md).

## Ajouter une photo

**Ce que l'on peut faire**

- Dans la carte « Ajouter une photo », prendre une photo avec l'appareil photo du téléphone (« Prendre une photo ») ou choisir une image déjà enregistrée (« Choisir une image »).
- Voir un aperçu de la photo choisie avant de l'envoyer.
- L'ajouter à sa bibliothèque avec « Ajouter à ma bibliothèque », ou l'envoyer directement à un ami avec « Envoyer à un ami » (voir [partage.md](partage.md#envoyer-une-photo-depuis-son-appareil)).

**Règles**

1. R-BIB-01 · Les deux boutons restent désactivés tant qu'aucune photo n'est choisie.
2. R-BIB-02 · Une seule photo est ajoutée à la fois. Choisir une nouvelle photo remplace la précédente dans le formulaire et efface le dernier message.
3. R-BIB-03 · Formats acceptés : JPEG, PNG et WebP. Seuls ces formats peuvent être choisis ; le téléphone convertit lui-même une photo prise avec l'appareil photo. Tout autre format (GIF, HEIC, vidéo…) est refusé.
4. R-BIB-04 · Une photo pèse au plus 10 Mo.
5. R-BIB-05 · Le fichier doit être une image lisible ; un fichier abîmé ou déguisé en image est refusé.
6. R-BIB-06 · Remplacée : une photo reçue en attente d'être découverte compte aussi (R-BIB-43).
7. R-BIB-43 · Une photo identique, octet pour octet, à une photo déjà présente dans la bibliothèque, ou reçue d'un ami et en attente d'être découverte, est refusée, qu'elle ait été ajoutée par soi ou reçue d'un ami. Une version retouchée, recadrée ou réenregistrée de la même photo est un autre fichier : elle est acceptée.
8. R-BIB-07 · Supprimer une photo permet de l'ajouter de nouveau ensuite.
9. R-BIB-08 · La photo ajoutée est préparée pour l'affichage : elle est remise dans le bon sens (photo prise téléphone tourné), réduite à 1920 pixels au plus sur son plus grand côté (jamais agrandie), et les zones transparentes deviennent blanches.
10. R-BIB-09 · Les informations cachées de la photo, dont le lieu de prise de vue, sont retirées à l'ajout : elles ne sont jamais conservées ni montrées.
11. R-BIB-10 · Une photo ajoutée porte la date et l'heure de son ajout. La date de prise de vue n'est pas utilisée.
12. R-BIB-11 · Pendant l'envoi, les deux boutons sont désactivés et le premier affiche « Envoi… ».
13. R-BIB-12 · Après un ajout réussi, le formulaire se vide, un message de réussite s'affiche, et la photo apparaît en tête de la bibliothèque et sur le cadre, sur tous les appareils connectés au compte, sans recharger la page.
14. R-BIB-13 · Après un échec, la photo reste choisie dans le formulaire et un message explique la raison.

**Messages affichés**

| Situation                       | Message                                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| En-tête de la carte             | « Ajouter une photo » — « Ajoutez-la à votre bibliothèque ou envoyez-la directement à un ami. »                   |
| Aperçu                          | Image décrite comme « Aperçu avant envoi »                                                                        |
| Envoi en cours                  | « Envoi… »                                                                                                        |
| Photo ajoutée                   | « Photo ajoutée à votre bibliothèque. », dans une courte notification en bas de l'écran qui disparaît d'elle-même |
| Aucun fichier reçu              | « Prenez ou choisissez une photo. »                                                                               |
| Plusieurs fichiers d'un coup    | « Envoi invalide : une seule photo à la fois. »                                                                   |
| Format refusé                   | « Format non pris en charge : JPEG, PNG ou WebP uniquement. »                                                     |
| Fichier trop lourd              | « La photo est trop lourde (10 Mo maximum). »                                                                     |
| Fichier illisible               | « Ce fichier n'est pas une image lisible. »                                                                       |
| Photo déjà dans la bibliothèque | « Cette photo est déjà dans votre bibliothèque, ou attend d'être découverte. »                                    |

**Ce qui n'est pas possible**

- Ajouter plusieurs photos en une fois, ou des vidéos.
- Ajouter une légende, un titre ou un lieu à une photo.
- Retoucher, recadrer ou faire pivoter une photo dans l'application.
- Récupérer le fichier d'origine en pleine résolution : seule la version préparée est conservée.
- Envoyer une image HEIC ou une animation GIF : elles ne sont pas proposées au choix.

## Voir sa bibliothèque

**Ce que l'on peut faire**

- Voir ses photos dans la section « Ma bibliothèque », en miniatures (grille de vignettes carrées) ou en liste.
- Passer de l'un à l'autre avec les boutons « Miniatures » et « Liste ».
- Charger les photos plus anciennes avec « Charger plus ».
- Ouvrir une photo en grand dans l'application, puis passer à la suivante ou à la précédente d'un geste du doigt, avec les flèches à l'écran ou celles du clavier.
- Ouvrir le menu « … » d'une photo pour l'envoyer à un ami ou la supprimer.
- Lancer le mode cadre, en plein écran, depuis la bibliothèque, ou depuis une photo ouverte pour que le diaporama commence par elle (voir [cadre.md](cadre.md)).

**Règles**

1. R-BIB-20 · Les photos sont classées de la plus récente à la plus ancienne, selon leur date d'ajout ou de réception.
2. R-BIB-21 · La bibliothèque affiche d'abord les 30 photos les plus récentes. « Charger plus » ajoute les 30 suivantes, et ainsi de suite ; le bouton disparaît quand toutes les photos sont affichées.
3. R-BIB-22 · Les vignettes sont carrées : la photo est recadrée autour de son sujet principal. La photo entière reste visible en l'ouvrant.
4. R-BIB-23 · En miniatures, chaque vignette est seule. En liste, chaque ligne montre la vignette, la date et l'heure d'ajout (par exemple « 24 nov. 2026, 14:05 ») et, pour une photo reçue, « Envoyée par » suivi du nom de l'expéditeur.
5. R-BIB-24 · L'affichage choisi (miniatures ou liste) est retenu sur l'appareil Par défaut : miniatures.
6. R-BIB-25 · Cliquer sur une photo l'ouvre en grand dans l'application.
7. R-BIB-26 · La bibliothèque se met à jour seule : une photo ajoutée depuis un autre appareil ou reçue d'un ami apparaît en tête, une photo supprimée disparaît, sans recharger la page.
8. R-BIB-27 · Après une coupure de réseau, la bibliothèque se recharge seule depuis le début dès que la connexion revient, pour rattraper ce qui a changé entre-temps, sans revenir aux 30 premières photos.
9. R-BIB-28 · La section « Ma bibliothèque » est toujours sombre, quel que soit le thème choisi, pour présenter les photos comme sur le cadre.
10. R-BIB-29 · Pour l'administrateur, la carte « Vos proches » propose en plus « Inviter un proche sur FamilyFrame ».
11. R-BIB-36 · La photo affiche sa date, et « Envoyée par » suivi du nom quand elle a été reçue.
12. R-BIB-37 · Un compteur indique la position de la photo (« 3 / 42 ») ; « 30+ » signifie que d'autres photos plus anciennes ne sont pas encore chargées.
13. R-BIB-38 · Fermer la photo ramène à l'endroit de la bibliothèque où se trouve la dernière photo regardée.
14. R-BIB-39 · Supprimer la photo affichée montre la suivante ; s'il n'en reste aucune, la photo se ferme.
15. R-BIB-40 · Le bouton retour du téléphone ferme la photo.
16. R-BIB-41 · Un lien vers une photo qui n'existe plus ramène simplement à la bibliothèque.

**Messages affichés**

| Situation                                 | Message                                                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Bibliothèque vide                         | « Aucune photo pour l'instant. »                                                                                |
| Photo en cours d'arrivée                  | « Chargement… »                                                                                                 |
| Chargement des photos suivantes           | « Chargement… » (sur le bouton « Charger plus »)                                                                |
| Carte d'accès aux amis                    | « Vos proches » — « Ajoutez vos proches en amis pour leur envoyer des photos. » et le bouton « Gérer mes amis » |
| Description d'une photo (lecture d'écran) | « Photo du 24 novembre 2026 » ou « Photo envoyée par [nom], du 24 novembre 2026 »                               |

**Ce qui n'est pas possible**

- Trier ou filtrer les photos (par date, par expéditeur…), ou les rechercher.
- Ranger les photos dans des albums ou des collections : prévu, voir [a-venir.md](a-venir.md).
- Voir la bibliothèque d'un autre membre.

## Supprimer une photo

**Ce que l'on peut faire**

- Depuis le menu « … » d'une photo (bibliothèque, photo ouverte en grand ou diaporama), choisir « Supprimer », puis confirmer.

**Règles**

1. R-BIB-30 · On ne peut supprimer que les photos de sa propre bibliothèque, y compris les photos reçues.
2. R-BIB-31 · La suppression demande une confirmation ; « Annuler » ferme la fenêtre sans rien changer.
3. R-BIB-32 · La suppression est définitive : il n'y a ni corbeille ni annulation.
4. R-BIB-33 · La photo disparaît aussitôt de la bibliothèque et du cadre, sur tous les appareils connectés au compte.
5. R-BIB-34 · Supprimer une photo que l'on a envoyée à des amis ne la retire pas de leur bibliothèque ; supprimer une photo reçue ne la retire pas de celle de l'expéditeur (voir [partage.md](partage.md)).
6. R-BIB-35 · Si la photo a déjà été supprimée ailleurs (sur un autre appareil), le motif s'affiche dans une notification en bas de l'écran.

**Messages affichés**

| Situation            | Message                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirmation         | « Supprimer cette photo ? » — « Cette photo sera supprimée de votre bibliothèque et de votre cadre. Cette action est irréversible. » Boutons « Annuler » et « Supprimer » |
| Photo déjà supprimée | « Cette photo a déjà été supprimée. »                                                                                                                                     |
| Réseau coupé         | « L'opération a échoué. Vérifiez la connexion et réessayez. »                                                                                                             |

**Ce qui n'est pas possible**

- Supprimer plusieurs photos en une fois.
- Récupérer une photo supprimée.
- Retirer une photo de la bibliothèque d'un ami à qui on l'a envoyée.
