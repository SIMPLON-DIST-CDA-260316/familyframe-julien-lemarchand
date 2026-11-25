# Bibliothèque

La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajoutées et celles que ses amis lui ont envoyées. Elle est privée. C'est la page d'accueil de l'application une fois connecté (« Ma bibliothèque » dans la barre du haut, l'onglet « Bibliothèque » sur un téléphone, « Bibliothèque » en titre de la page). La page est consacrée aux photos : les amis se gèrent sur la page « Amis » (voir [amis.md](amis.md)). Le cadre affiche ces mêmes photos (voir [cadre.md](cadre.md)) ; l'envoi à un ami est décrit dans [partage.md](partage.md).

## Ajouter une photo

**Ce que l'on peut faire**

- Toucher « Ajouter », en haut de la bibliothèque sur un ordinateur, ou le bouton rond « + » en bas à droite de l'écran sur un téléphone : le panneau « Ajouter une photo » s'ouvre, par le bas de l'écran sur un téléphone, au centre sur un ordinateur.
- Dans ce panneau, prendre une photo avec l'appareil photo du téléphone (« Prendre une photo ») ou choisir une ou plusieurs images déjà enregistrées (« Choisir des images »).
- Les photos choisies sont ajoutées aussitôt à sa bibliothèque : il n'y a rien d'autre à confirmer. Pour envoyer une photo à un ami sans la garder, passer par la page « Envoyer » (voir [partage.md](partage.md#envoyer-une-photo-depuis-la-page-envoyer)).
- Suivre l'envoi sur la vignette de la photo, qui apparaît aussitôt dans la bibliothèque.

**Règles**

1. R-BIB-01 · Remplacée : il n'y a plus de bouton à confirmer, choisir les photos les ajoute (R-BIB-67).
2. R-BIB-02 · Remplacée : plusieurs photos peuvent être ajoutées d'un coup (R-BIB-60).
3. R-BIB-03 · Formats acceptés : JPEG, PNG et WebP. Seuls ces formats peuvent être choisis ; le téléphone convertit lui-même une photo prise avec l'appareil photo. Tout autre format (GIF, HEIC, vidéo…) est refusé.
4. R-BIB-04 · Une photo envoyée pèse au plus 10 Mo. Une photo plus lourde est d'abord réduite sur l'appareil (R-BIB-63) ; si l'appareil ne sait pas la lire, elle part telle quelle et elle est refusée.
5. R-BIB-05 · Le fichier doit être une image lisible ; un fichier abîmé ou déguisé en image est refusé.
6. R-BIB-06 · Remplacée : une photo reçue en attente d'être découverte compte aussi (R-BIB-43).
7. R-BIB-43 · Une photo identique, octet pour octet, à une photo déjà présente dans la bibliothèque, ou reçue d'un ami et en attente d'être découverte, est refusée, qu'elle ait été ajoutée par soi ou reçue d'un ami. Une version retouchée, recadrée ou réenregistrée de la même photo est un autre fichier : elle est acceptée. Une très grande photo réduite sur l'appareil (R-BIB-63) peut donc ne pas être reconnue si on l'ajoute de nouveau depuis un autre appareil.
8. R-BIB-07 · Supprimer une photo permet de l'ajouter de nouveau ensuite.
9. R-BIB-08 · La photo ajoutée est préparée avant d'être gardée : elle est remise dans le bon sens (photo prise téléphone tourné), réduite à 4096 pixels au plus sur son plus grand côté (jamais agrandie), assez pour un tirage 20×30 cm, et les zones transparentes deviennent blanches. Le cadre et la bibliothèque l'affichent à la taille d'un écran, 1920 pixels au plus : elle ne s'affiche pas plus lentement qu'avant. Les photos ajoutées avant ce changement restent gardées à 1920 pixels au plus : assez pour l'écran, pas pour un tirage 20×30 cm.
10. R-BIB-09 · Les informations cachées de la photo, dont le lieu de prise de vue, sont retirées à l'ajout : elles ne sont jamais conservées ni montrées.
11. R-BIB-10 · Une photo ajoutée porte la date et l'heure de son ajout. La date de prise de vue n'est pas utilisée.
12. R-BIB-11 · Remplacée : le panneau n'attend plus la fin de l'envoi (R-BIB-54).
13. R-BIB-12 · Après un ajout réussi, la vignette grisée laisse place à la photo, un message de réussite s'affiche, et la photo apparaît en tête de la bibliothèque et sur le cadre qui lit toute la bibliothèque, sur tous les appareils connectés au compte, sans recharger la page. Ajoutée pendant qu'une collection est affichée, elle est aussi rangée dans cette collection (R-COL-21).
14. R-BIB-13 · Remplacée : un échec se signale sur la bibliothèque, le panneau étant déjà fermé (R-BIB-55).
15. R-BIB-44 · Remplacée : le panneau ne garde plus de photo choisie, elle part dès qu'on la choisit (R-BIB-67).
16. R-BIB-48 · Sur un téléphone, « Ajouter » est un bouton rond « + » en bas à droite de l'écran, au-dessus de la barre d'onglets, bien visible en thème clair comme sombre ; il n'apparaît que sur la bibliothèque. Il s'efface pendant que l'on fait défiler les photos vers le bas, pour ne pas cacher leurs boutons « … », et revient dès que l'on remonte, en haut de la page ou à la fin de la liste. Au clavier, il revient quand on l'atteint ; effacé, il ne garde pas la sélection. Si l'appareil demande de réduire les animations, il disparaît et revient sans glisser. L'en-tête n'y montre plus « Ajouter » ni « Mode cadre » : le cadre s'ouvre avec l'onglet « Cadre » (R-APP-64). La fin de la page reste visible au-dessus du bouton.
17. R-BIB-54 · Choisir les photos ferme aussitôt le panneau (R-BIB-67). La photo apparaît tout de suite en tête des photos affichées, en vignette grisée qui indique où en est l'envoi : « En attente », puis le pourcentage envoyé (« 42 % »), puis « Finalisation… » pendant que la photo est préparée. Sur un téléphone, où les vignettes sont petites, seuls le pourcentage et la barre de progression s'affichent. Tant qu'elle est grisée, elle ne s'ouvre pas et n'a pas de menu « … ».
18. R-BIB-55 · Après un échec, la vignette grisée disparaît et une notification donne la raison, avec le nom du fichier. Un envoi qui n'a pas abouti au bout de 2 minutes échoue de la même façon, avec le message d'erreur de connexion, et les photos suivantes partent.
19. R-BIB-56 · Les photos partent une par une, dans l'ordre où elles ont été ajoutées : ajouter une photo pendant qu'une autre s'envoie la met en attente derrière. Un seul message de réussite s'affiche, quand la dernière est envoyée.
20. R-BIB-57 · La vignette grisée s'affiche dans la vue d'où la photo a été ajoutée : toute la bibliothèque, ou la collection affichée (voir [collections.md](collections.md#parcourir-une-collection)). Dans une collection, la vignette grisée reste jusqu'à ce que la photo y soit rangée.
21. R-BIB-58 · Quitter la bibliothèque pour une autre page de l'application n'interrompt pas les envois, qui continuent un par un ; les vignettes grisées sont de nouveau là au retour. Choisir d'autres photos entre-temps les met en attente derrière les premières. Fermer l'application ou recharger la page interrompt ceux qui ne sont pas terminés. Se déconnecter les interrompt aussi, sans message : aucune photo choisie ne part vers le compte qui se connecte ensuite.
22. R-BIB-59 · Un lecteur d'écran annonce le nombre de photos en cours d'envoi chaque fois qu'il change.
23. R-BIB-60 · « Choisir des images » permet de choisir jusqu'à 20 photos d'un coup ; « Prendre une photo » en prend une à la fois. Refermer le sélecteur sans rien choisir laisse le panneau ouvert, sans rien ajouter ; choisir de nouveau la même photo fonctionne (elle est alors refusée comme doublon, R-BIB-43).
24. R-BIB-61 · Au-delà de 20 photos choisies d'un coup, aucune n'est ajoutée : le panneau reste ouvert et un message demande d'en choisir moins.
25. R-BIB-62 · Chaque photo choisie a sa propre vignette grisée. Une photo refusée n'arrête pas les suivantes : sa vignette disparaît, sa raison s'affiche, et le message de fin compte les photos ajoutées et refusées.
26. R-BIB-63 · Une très grande photo, de plus de 4096 pixels sur son plus grand côté, est réduite sur l'appareil avant l'envoi, à 4096 pixels sur ce côté, pour pouvoir être envoyée. Une photo de plus de 10 Mo mais moins grande garde sa taille : elle est seulement réenregistrée plus légère. Les autres photos partent telles quelles, sans aucune retouche. Sur un navigateur ancien, qui ne sait pas remettre une photo à l'endroit, une photo de 10 Mo au plus part telle quelle, même très grande : l'application la réduit et la remet à l'endroit elle-même. Il n'y a rien à régler. Une photo assez grande au départ reste imprimable en 20×30 cm jusqu'au bout : réduite sur l'appareil puis gardée à 4096 pixels au plus (R-BIB-08).
27. R-BIB-64 · Une image que l'appareil ne sait pas lire part telle quelle : l'application l'accepte ou la refuse avec sa raison, comme toute photo.
28. R-BIB-65 · Quand le panneau « Ajouter une photo » se ferme, la navigation au clavier reprend sur le bouton « Ajouter » affiché : celui de l'en-tête sur un ordinateur, le bouton rond « + » sur un téléphone (qui réapparaît s'il s'était effacé), même si le panneau avait été ouvert depuis une bibliothèque vide.
29. R-BIB-67 · Le panneau « Ajouter une photo » ne sert qu'à ajouter : prendre ou choisir des photos les ajoute aussitôt à sa bibliothèque et ferme le panneau, sans aperçu ni bouton à confirmer. L'envoi à un ami a quitté ce panneau pour la page « Envoyer » (voir [partage.md](partage.md#envoyer-une-photo-depuis-la-page-envoyer)).

**Messages affichés**

| Situation                       | Message                                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| En-tête du panneau              | « Ajouter une photo » — « Ajoutez-en une ou plusieurs à votre bibliothèque. »                                     |
| Trop de photos choisies         | « 20 photos au plus à la fois : vous en avez choisi 25. »                                                         |
| Envoi en attente                | « En attente », sur la vignette grisée (la barre vide seule sur un téléphone)                                     |
| Envoi en cours                  | « 42 % » et une barre de progression, sur la vignette grisée                                                      |
| Photo en préparation            | « Finalisation… », sur la vignette grisée (« 100 % » sur un téléphone)                                            |
| Annonce du lecteur d'écran      | « Envoi d'une photo en cours. » ou « Envoi de 3 photos en cours. »                                                |
| Photo ajoutée                   | « Photo ajoutée à votre bibliothèque. », dans une courte notification en bas de l'écran qui disparaît d'elle-même |
| Plusieurs photos ajoutées       | « 3 photos ajoutées à votre bibliothèque. », dans la même notification, une fois la dernière envoyée              |
| Certaines photos refusées       | « 2 photos ajoutées à votre bibliothèque, 1 refusée. », en avertissement                                          |
| Toutes les photos refusées      | « Aucune photo ajoutée, 3 refusées. », en erreur                                                                  |
| Photo refusée                   | La raison (voir ci-dessous) et le nom du fichier, dans une notification                                           |
| Aucun fichier reçu              | « Prenez ou choisissez une photo. »                                                                               |
| Plusieurs fichiers d'un coup    | « Envoi invalide : une seule photo à la fois. »                                                                   |
| Format refusé                   | « Format non pris en charge : JPEG, PNG ou WebP uniquement. »                                                     |
| Fichier trop lourd              | « La photo est trop lourde (10 Mo maximum). »                                                                     |
| Fichier illisible               | « Ce fichier n'est pas une image lisible. »                                                                       |
| Photo déjà dans la bibliothèque | « Cette photo est déjà dans votre bibliothèque, ou attend d'être découverte. »                                    |

**Ce qui n'est pas possible**

- Ajouter plus de 20 photos d'un coup, ou des vidéos.
- Envoyer plusieurs photos à un ami en une fois (voir [partage.md](partage.md#envoyer-une-photo-depuis-son-appareil)).
- Ajouter une légende, un titre ou un lieu à une photo.
- Retoucher, recadrer ou faire pivoter une photo dans l'application.
- Récupérer le fichier d'origine en pleine résolution : seule la version préparée est conservée.
- Envoyer une image HEIC ou une animation GIF : elles ne sont pas proposées au choix.

## Voir sa bibliothèque

**Ce que l'on peut faire**

- Voir ses photos sous l'en-tête « Bibliothèque », qui indique leur nombre, en miniatures (grille de vignettes carrées) ou en liste, regroupées par jour sous la date (« Aujourd'hui », « Hier », « dim. 22 nov. »…).
- Passer de l'un à l'autre avec les boutons « Miniatures » et « Liste ».
- Charger les photos plus anciennes avec « Charger plus ».
- Ouvrir une photo en grand dans l'application, puis passer à la suivante ou à la précédente d'un geste du doigt, avec les flèches à l'écran ou celles du clavier.
- Sur une photo ouverte, laisser la photo seule à l'écran : les boutons, le compteur, la légende et les flèches s'effacent, et reviennent quand on en a besoin.
- Sur un téléphone, fermer une photo ouverte en la faisant glisser du doigt vers le bas ; partout, avec ✕ ou la touche Échap.
- Sur un téléphone, partager une photo ouverte vers une autre application (Messages, WhatsApp, e-mail…) avec « Partager… » dans son menu « … ».
- Sur une photo ouverte, lire ses infos avec le bouton ⓘ « Infos » (ou la touche I) : quand elle a été ajoutée ou reçue, qui l'a envoyée et son message, ses collections, sa taille et son poids.
- Agrandir une photo ouverte pour en voir les détails : en écartant deux doigts, d'un double toucher ou d'un double clic, ou avec les touches + et − du clavier ; puis la déplacer du doigt ou à la souris.
- Ouvrir le menu « … » d'une photo (ou, sur Android, appuyer longuement sur sa miniature) pour lancer sa radio sur le cadre (voir [cadre.md](cadre.md#radio)), l'envoyer à un ami, la ranger dans ses collections (voir [collections.md](collections.md#ranger-ses-photos-dans-une-collection)) ou la supprimer.
- Lancer le mode cadre, en plein écran, depuis la bibliothèque (« Mode cadre » sur un ordinateur, l'onglet « Cadre » sur un téléphone), ou depuis une photo ouverte pour que le diaporama commence par elle (voir [cadre.md](cadre.md)).
- Découvrir les photos envoyées par ses proches depuis l'annonce placée sous l'en-tête (voir [partage.md](partage.md#recevoir-une-photo)).
- N'afficher que les photos d'une collection, depuis la rangée « Toutes », « Noël », « Les vacances »… placée sous l'annonce (voir [collections.md](collections.md#parcourir-une-collection)).
- Créer une collection au bout de cette rangée, et renommer, supprimer ou lire sur le cadre la collection affichée (voir [collections.md](collections.md)).

**Règles**

1. R-BIB-20 · Les photos sont classées de la plus récente à la plus ancienne, selon leur date d'ajout ou de réception.
2. R-BIB-21 · La bibliothèque affiche d'abord les 30 photos les plus récentes. « Charger plus » ajoute les 30 suivantes, et ainsi de suite ; le bouton disparaît quand toutes les photos sont affichées.
3. R-BIB-22 · Les vignettes sont carrées : la photo est recadrée autour de son sujet principal. La photo entière reste visible en l'ouvrant.
4. R-BIB-23 · En miniatures, chaque vignette est seule. En liste, chaque ligne montre la vignette, l'heure d'ajout (par exemple « 14:05 » ; le jour est dans le titre du groupe, R-BIB-66) et, pour une photo reçue, « Envoyée par » suivi du nom de l'expéditeur.
5. R-BIB-24 · L'affichage choisi (miniatures ou liste) est retenu sur l'appareil Par défaut : miniatures.
6. R-BIB-25 · Cliquer sur une photo l'ouvre en grand dans l'application.
7. R-BIB-26 · Remplacée : une photo reçue n'apparaît plus dès son arrivée, mais une fois découverte (R-BIB-42).
8. R-BIB-27 · Après une coupure de réseau, la bibliothèque se recharge seule depuis le début dès que la connexion revient, pour rattraper ce qui a changé entre-temps, sans revenir aux 30 premières photos.
9. R-BIB-28 · Remplacée : les photos de la bibliothèque suivent désormais le thème choisi (R-BIB-53). Elles étaient toujours sur fond sombre, comme sur le cadre.
10. R-BIB-29 · Remplacée : la carte « Vos proches » a quitté la bibliothèque (R-BIB-45).
11. R-BIB-36 · La photo affiche sa date, et « Envoyée par » suivi du nom quand elle a été reçue.
12. R-BIB-37 · Un compteur indique la position de la photo (« 3 / 42 ») ; « 30+ » signifie que d'autres photos plus anciennes ne sont pas encore chargées.
13. R-BIB-38 · Fermer la photo ramène à l'endroit de la bibliothèque où se trouve la dernière photo regardée.
14. R-BIB-39 · Supprimer la photo affichée montre la suivante ; s'il n'en reste aucune, la photo se ferme.
15. R-BIB-40 · Le bouton retour du téléphone ferme la photo.
16. R-BIB-41 · Un lien vers une photo qui n'existe plus ramène simplement à la bibliothèque.
17. R-BIB-45 · La bibliothèque ne propose ni la gestion des amis ni les invitations : « Amis » et, pour l'administrateur, « Invitations » sont dans la barre du haut sur un ordinateur ; sur un téléphone, « Amis » est un onglet de la barre d'onglets et « Invitations » est dans le menu du compte.
18. R-BIB-46 · Le nombre de photos s'affiche sous le titre (« 12 photos ») ; « Plus de 30 photos » tant que des photos plus anciennes ne sont pas encore chargées. Dans une collection, il compte les photos de cette collection ; il disparaît quand la collection ne peut pas s'afficher (« Cette collection n'existe plus. »).
19. R-BIB-47 · Une bibliothèque vide propose « Ajouter une photo », qui ouvre le même panneau que « Ajouter ».
20. R-BIB-49 · Sur un écran tactile, toucher la photo ouverte efface les boutons, le compteur et la légende ; la toucher de nouveau les fait revenir. Passer à une autre photo d'un geste du doigt les laisse comme ils sont. Ils ne s'effacent jamais seuls. Il n'y a pas de flèches à l'écran : le geste du doigt les remplace.
21. R-BIB-50 · À la souris, les boutons, le compteur, la légende et les flèches apparaissent dès que la souris bouge et s'effacent après 3 secondes sans mouvement. Ils restent tant que la souris est sur un bouton ou qu'un menu ou une fenêtre est ouvert (menu « … », « Envoyer à des proches », « Supprimer cette photo ? »). Cliquer sur la photo ne les efface pas.
22. R-BIB-51 · Au clavier, les flèches gauche et droite changent de photo sans faire revenir les boutons ; la touche Tab les fait revenir et passe d'un bouton à l'autre. Ils restent tant que l'un d'eux est choisi au clavier. Effacés, ils ne peuvent pas être choisis.
23. R-BIB-52 · Les boutons apparaissent et s'effacent en fondu ; si l'appareil demande de réduire les animations, ils apparaissent et disparaissent d'un coup.
24. R-BIB-53 · Les photos de la bibliothèque, en miniatures comme en liste, s'affichent sur le fond de la page et suivent le thème choisi, clair ou sombre, comme le reste de l'application ; leur menu « … » et les fenêtres qu'il ouvre aussi. Seul le cadre, et une photo ouverte en grand, restent toujours sombres. Sur une miniature, le bouton « … » reste un rond sombre, posé sur la photo. Sur un téléphone, les miniatures tiennent sur trois colonnes serrées ; leur bouton « … », plus petit et collé au coin, cache peu de la photo mais reste aussi facile à toucher. Sur Android, un appui long sur une miniature ouvre le même menu, sans ouvrir la photo en lâchant ; sur iPhone, le bouton « … » reste le chemin. Au clavier, sur une miniature, la touche Menu ou Maj+F10 ouvre aussi ce menu.
25. R-BIB-42 · La bibliothèque se met à jour seule, sans recharger la page : une photo ajoutée depuis un autre appareil apparaît en tête, une photo reçue y entre à sa date de réception dès qu'elle est découverte (sur cet appareil ou un autre), une photo supprimée disparaît.
26. R-BIB-66 · En miniatures comme en liste, les photos sont regroupées par jour d'ajout ou de réception, du plus récent au plus ancien, chaque jour sous un petit titre : « Aujourd'hui », « Hier », puis le jour abrégé (« dim. 22 nov. »), suivi de l'année quand ce n'est pas l'année en cours (« sam. 14 juin 2025 »). Le jour est celui de l'appareil : une photo ajoutée à 23 h 30 compte pour ce soir-là. Un jour commence une nouvelle rangée de vignettes. « Charger plus » continue le dernier jour affiché sans répéter son titre. Les titres changent au rechargement de la page, ou dès que la bibliothèque bouge : une page laissée ouverte après minuit peut encore dire « Aujourd'hui » pour la veille. Les photos en cours d'envoi (R-BIB-54) se placent en tête du jour « Aujourd'hui », qui s'affiche pour elles même quand aucune photo n'a encore été ajoutée ce jour-là.
27. R-BIB-68 · Sur un téléphone, une photo ouverte suit le doigt qui la tire vers le bas, et pâlit en descendant. Lâchée assez bas, elle se ferme et l'on revient à la bibliothèque ; lâchée plus tôt, elle reprend sa place. Un geste de côté passe toujours à la photo voisine. À la souris, la photo ne se tire pas : elle se ferme avec ✕ ou Échap.
28. R-BIB-69 · Une photo ouverte s'agrandit jusqu'à quatre fois sa taille : en écartant deux doigts, autour du point qu'ils pincent ; d'un double toucher ou d'un double clic, à deux fois et demie, autour du point touché, et le même geste la remet entière ; avec + (ou =) et −, d'une fois et demie par touche, autour du centre. Agrandie, la photo se déplace du doigt ou à la souris sans jamais laisser de vide sur les bords, et le geste de côté la déplace au lieu de changer de photo : les flèches à l'écran et celles du clavier changent toujours de photo. Une autre photo s'ouvre toujours entière. Pendant qu'un menu est ouvert, ces touches ne font rien ; avec Ctrl, elles agrandissent la page comme d'habitude.
29. R-BIB-70 · Les infos d'une photo disent, dans cet ordre : « Ajoutée » (ou « Reçue », pour une photo envoyée par un proche) avec le jour, dit comme dans la bibliothèque (« Aujourd'hui », « Hier », « dim. 22 nov. »), et l'heure (« Aujourd'hui à 14:05 ») ; pour une photo reçue, « Envoyée par » avec le nom de l'expéditeur et son message, s'il en a écrit un ; « Collections », la liste des collections où la photo est rangée, chacune menant à la bibliothèque réduite à cette collection, ou « Dans aucune collection » ; « Image », la taille en pixels et le poids (« 4000 × 3000 · 2,4 Mo »). Les photos ajoutées avant cette version n'ont pas de ligne « Image » : leur taille n'avait pas été gardée. Les infos ne montrent jamais de lieu.
30. R-BIB-71 · Sur un ordinateur, les infos s'ouvrent dans un panneau à droite de la photo, qui rapetisse pour lui laisser la place ; le panneau reste ouvert quand on passe à la photo suivante ou précédente, et se rouvre de lui-même à la photo suivante ouverte, tant que l'onglet reste ouvert. Il se ferme avec sa croix, le bouton « Infos » ou la touche I. Sur un téléphone, les infos montent du bas de l'écran sur la moitié de sa hauteur, la photo restant visible au-dessus ; elles se ferment avec la croix, en les faisant glisser vers le bas (R-APP-75) ou en touchant la photo au-dessus, et sont fermées à chaque photo ouverte.
31. R-BIB-72 · « Partager… », dans le menu « … » d'une photo ouverte, n'apparaît que sur un appareil qui sait partager une image vers ses autres applications (la plupart des téléphones). Il envoie la photo elle-même, en 1920 pixels au plus sur son plus grand côté, pas un lien. Renoncer au partage ne montre aucun message ; si la photo n'a pas pu être chargée ou partagée, le message « La photo n'a pas pu être partagée. » s'affiche. C'est un partage hors de FamilyFrame : « Envoyer à un ami » reste le moyen d'envoyer une photo à un proche dans l'application.
32. R-BIB-73 · Une photo ouverte sur un téléphone se charge en 1280 pixels au plus sur son plus grand côté, assez pour son écran : plus rapide et plus léger. Agrandie, ou sur un ordinateur, elle se charge en 1920 pixels.

**Messages affichés**

| Situation                                                 | Message                                                                                                                                                   |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| En-tête                                                   | « Bibliothèque », le nombre de photos, et les boutons « Ajouter » et « Mode cadre » (ordinateur) ; le nom d'une collection affichée à la place (R-COL-23) |
| Bouton d'ajout sur un téléphone (survol, lecture d'écran) | « Ajouter une photo »                                                                                                                                     |
| Chargement de la bibliothèque                             | formes grises (R-APP-71), « Chargement… » pour les lecteurs d'écran                                                                                       |
| Chargement impossible (R-APP-73)                          | « Les photos n'ont pas pu être chargées. » et le bouton « Réessayer »                                                                                     |
| Bibliothèque vide                                         | « Aucune photo pour l'instant. » et le bouton « Ajouter une photo »                                                                                       |
| Photo en cours d'arrivée                                  | formes grises (R-APP-71), « Chargement… » pour les lecteurs d'écran                                                                                       |
| Titre d'un jour de photos                                 | « Aujourd'hui », « Hier », « dim. 22 nov. », ou « sam. 14 juin 2025 » une autre année                                                                     |
| Chargement des photos suivantes                           | « Chargement… » (sur le bouton « Charger plus »)                                                                                                          |
| Photos reçues en attente                                  | « Vous avez N nouvelles photos » et le bouton « Découvrir » (voir [partage.md](partage.md#recevoir-une-photo))                                            |
| Description d'une photo (lecture d'écran)                 | « Photo du 24 novembre 2026 » ou « Photo envoyée par [nom], du 24 novembre 2026 »                                                                         |
| Partage impossible (R-BIB-72)                             | « La photo n'a pas pu être partagée. »                                                                                                                    |
| Infos d'une photo sans collection (R-BIB-70)              | « Dans aucune collection »                                                                                                                                |

**Ce qui n'est pas possible**

- Trier les photos, les filtrer autrement que par collection (par date, par expéditeur…), ou les rechercher.
- Ranger les photos dans des albums : les collections en tiennent lieu (voir [collections.md](collections.md)).
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
