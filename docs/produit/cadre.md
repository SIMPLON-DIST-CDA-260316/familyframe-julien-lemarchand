# Cadre

Le cadre est la page à laisser affichée en plein écran sur l'appareil posé chez soi (tablette, vieil ordinateur, télévision). Il montre toutes les photos de la bibliothèque du compte connecté (voir [bibliotheque.md](bibliotheque.md)), ou celles d'une de ses collections (voir [collections.md](collections.md)), et reçoit les nouvelles en direct. On l'ouvre avec l'entrée « Cadre » de la barre du haut, ou avec « Mode cadre » depuis la bibliothèque ou une photo ouverte : il passe alors en plein écran. Il n'affiche que le diaporama (une photo à la fois) ; les vignettes et la liste sont dans la bibliothèque.

## Mettre en place un cadre

**Ce que l'on peut faire**

- Se connecter sur l'appareil du cadre avec le compte dont on veut afficher les photos, puis ouvrir « Cadre ».
- Laisser l'appareil allumé : le cadre reste connecté et à jour sans intervention.
- Ouvrir le cadre en plein écran d'un seul toucher, depuis la barre du haut, la bibliothèque ou une photo ouverte.
- Passer en plein écran avec le bouton « Plein écran » quand le cadre a été ouvert directement (au démarrage de l'appareil, par exemple).
- Quitter le cadre (✕, Échap ou sortie du plein écran) pour revenir à la bibliothèque, sur la photo qui était affichée.

**Règles**

1. R-CAD-01 · Un cadre affiche les photos d'un seul compte : celui qui y est connecté.
2. R-CAD-02 · Le cadre est toujours sombre, quel que soit le thème choisi, pour mettre les photos en valeur.
3. R-CAD-03 · Le cadre occupe toute la page : la barre du haut et les menus de l'application n'y sont pas affichés.
4. R-CAD-04 · Le cadre affiche toutes les photos de la bibliothèque, ou de la sélection du jour ou de la collection choisie (R-CAD-77), des plus récentes aux plus anciennes, sans limite de nombre : les anciennes photos ne disparaissent jamais du cadre.
5. R-CAD-05 · Le cadre recharge toutes ses photos une fois par jour. Cela garde sa connexion active (voir [comptes-et-connexion.md](comptes-et-connexion.md#rester-connecté)) : un cadre allumé en continu ne se déconnecte jamais.
6. R-CAD-06 · Un cadre rallumé alors que le réseau n'est pas encore prêt attend et réessaie seul toutes les 5 secondes, sans afficher la page de connexion (R-CNX-16).
7. R-CAD-07 · Si sa connexion au compte a expiré ou a été fermée, le cadre revient à la page de connexion : il faut se reconnecter sur l'appareil.
8. R-CAD-08 · Remplacée : le cadre distingue désormais le chargement de la bibliothèque vide ; seul le message « bibliothèque vide » montre l'adresse du site (R-CAD-55).
9. R-CAD-53 · Le cadre n'affiche que le diaporama : les vignettes et la liste sont dans la bibliothèque.
10. R-CAD-54 · Le diaporama ne démarre plus de lui-même après une minute : il est déjà la seule vue du cadre.
11. R-CAD-55 · Sans photo à montrer, le cadre dit pourquoi : chargement en cours, aucune photo encore, collection lue vide (R-CAD-82), ou chargement impossible ; il réessaie tout seul quand la connexion revient.
12. R-CAD-56 · Un bouton « Retour à la bibliothèque » permet toujours de sortir du cadre.
13. R-CAD-57 · Lancé depuis une photo, le diaporama commence par cette photo.
14. R-CAD-58 · Ouvert depuis l'application (« Cadre » dans la barre du haut, « Mode cadre » dans la bibliothèque ou sur une photo ouverte), le cadre passe en plein écran. Sur un appareil qui ne le permet pas (iPhone), ou si le navigateur le refuse, le cadre s'affiche dans la page, sans message.
15. R-CAD-59 · Sortir du plein écran, de n'importe quelle façon (✕, touche Échap, touche F11, geste de l'appareil), quitte le cadre : on revient à la bibliothèque, sur la photo qui était affichée, ou à la bibliothèque seule s'il n'y avait pas de photo. Exception : si un menu ou une fenêtre est ouvert (menu « … », « Envoyer à des proches », « Supprimer cette photo ? »), sortir du plein écran ne quitte pas le cadre, car la touche Échap visait ce menu : le cadre reste affiché, hors plein écran, et le bouton « Plein écran » revient.
16. R-CAD-60 · Quitter le cadre autrement (bouton retour du navigateur, « Retour à la bibliothèque ») sort aussi du plein écran : la bibliothèque ne reste jamais en plein écran.
17. R-CAD-61 · Tant que le cadre n'est pas en plein écran, un bouton « Plein écran » s'affiche en haut à droite, sur le diaporama comme sur les écrans sans photo. Sur le diaporama, il s'efface avec les autres boutons (R-CAD-24). Il n'apparaît pas sur un appareil qui ne permet pas le plein écran.

**Messages affichés**

| Situation               | Message                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Aucune photo à afficher | « En attente de la première photo… » — « Envoyez-en une depuis votre téléphone : [adresse du site] » |
| Chargement en cours     | « Chargement des photos… »                                                                           |
| Chargement impossible   | « Les photos n'ont pas pu être chargées. » — « Le cadre réessaiera dès que la connexion reviendra. » |
| Passer en plein écran   | « Plein écran » (bouton)                                                                             |
| Sortir du cadre         | « Retour à la bibliothèque »                                                                         |

**Ce qui n'est pas possible**

- Associer un cadre à un compte sans saisir le mot de passe sur l'appareil (par exemple avec un code).
- Afficher sur un même cadre les photos de plusieurs comptes.
- Passer en plein écran sur iPhone : Safari ne le permet pas, le cadre s'affiche dans la page.
- Rester en plein écran après avoir quitté le cadre.

## Vue bibliothèque du cadre (retirée)

Le cadre n'a plus de vue bibliothèque : voir R-CAD-53. Les règles ci-dessous gardent leur numéro, remplacées par le diaporama seul et par la bibliothèque (voir [bibliotheque.md](bibliotheque.md)).

**Règles**

1. R-CAD-10 · Remplacée : le cadre n'a plus de vue bibliothèque (R-CAD-53).
2. R-CAD-11 · Remplacée : le cadre n'a plus de vue bibliothèque (R-CAD-53).
3. R-CAD-12 · Remplacée : le cadre n'a plus de vue bibliothèque (R-CAD-53).
4. R-CAD-13 · Remplacée : le cadre n'a plus de vue bibliothèque (R-CAD-53).
5. R-CAD-14 · Remplacée : le cadre n'a plus de vue bibliothèque (R-CAD-53).
6. R-CAD-15 · Remplacée : le cadre n'a plus de vue bibliothèque (R-CAD-53).
7. R-CAD-16 · Remplacée : le cadre n'a plus de vue bibliothèque (R-CAD-53).
8. R-CAD-17 · Remplacée : le cadre n'a plus de vue bibliothèque (R-CAD-53).

## Diaporama

**Ce que l'on peut faire**

- Regarder les photos une à une, en grand, avec leur date et, pour une photo reçue, « Envoyée par » suivi du nom de l'expéditeur.
- Passer à la photo précédente ou suivante avec les flèches à l'écran, les flèches gauche et droite du clavier, ou en faisant glisser la photo du doigt.
- Mettre en pause ou relancer la lecture automatique.
- Choisir le modèle d'affichage : « Ajusté », « Plein format », « Passe-partout » ou « Polaroïd » (menu « … », « Affichage ») ; l'appareil le retient.
- Choisir la vitesse : 5 s, 10 s ou 20 s par photo (menu « … », « Vitesse ») ; l'appareil la retient.
- Choisir l'ordre de lecture : « Dans l'ordre » (des plus récentes aux plus anciennes) ou « Aléatoire » (menu « … », « Lecture ») ; l'appareil le retient.
- Faire ces mêmes réglages depuis la page « Préférences », encart « Cadre de cet appareil » (voir [preferences.md](preferences.md#cadre-de-cet-appareil)).
- Choisir les photos lues : toute la bibliothèque, la sélection du jour ou une collection (menu « … », « Photos ») ; l'appareil le retient (voir [Choisir les photos du cadre](#choisir-les-photos-du-cadre)).
- Afficher ou masquer un bandeau de vignettes (« Vignettes ») et toucher une vignette pour aller à cette photo.
- Lancer la radio de la photo affichée (voir [Radio](#radio)), l'envoyer à un ami, la ranger dans ses collections ou la supprimer (menu « … »).
- Quitter le mode cadre (bouton ✕, touche Échap ou sortie du plein écran) pour revenir à la bibliothèque, sur la photo affichée.

**Règles**

1. R-CAD-20 · Réglages au premier affichage : lecture automatique, 10 secondes par photo, bandeau de vignettes masqué.
2. R-CAD-21 · Remplacée : la vitesse est désormais retenue sur l'appareil ; seules la pause et l'affichage du bandeau reviennent aux réglages par défaut (R-CAD-62).
3. R-CAD-22 · Remplacée : la lecture suit désormais l'ordre choisi, dans l'ordre ou aléatoire (R-CAD-64).
4. R-CAD-23 · La lecture automatique attend pendant que quelqu'un utilise le cadre : elle ne change pas de photo tant qu'il y a eu une activité dans les 4 dernières secondes, ni tant qu'un menu ou une fenêtre est ouvert.
5. R-CAD-24 · Les boutons (✕, « … », flèches, lecture, vignettes) et le bandeau s'affichent dès qu'il y a une activité et s'effacent après 4 secondes sans activité ; le pointeur de la souris se cache aussi. Ils restent affichés tant qu'un menu ou une fenêtre est ouvert.
6. R-CAD-25 · Pendant qu'un menu est ouvert, les flèches du clavier et la touche Échap servent au menu : elles ne changent pas de photo et ne ferment pas le diaporama.
7. R-CAD-26 · Remplacée : l'affichage de la photo dépend du modèle choisi (R-CAD-67).
8. R-CAD-27 · Remplacée : le zoom lent ne concerne plus que deux modèles (R-CAD-68).
9. R-CAD-28 · Le bandeau de vignettes garde la photo affichée au centre. Il défile au doigt, à la molette ou en le faisant glisser à la souris ; un glissement ne déclenche pas l'ouverture de la vignette où il se termine.
10. R-CAD-29 · Si la photo affichée est supprimée (ici ou depuis un autre appareil), le diaporama passe à la photo la plus récente.
11. R-CAD-62 · La vitesse choisie est retenue sur l'appareil, dans ce navigateur : elle reste la même quand la page du cadre est rechargée ou rouverte, le lendemain comme après un redémarrage. La lecture ou la pause et l'affichage du bandeau reviennent aux réglages par défaut (lecture automatique, bandeau masqué). Le rechargement quotidien des photos (R-CAD-05) ne change rien.
12. R-CAD-63 · En navigation privée, ou si le navigateur bloque l'enregistrement, le réglage vaut jusqu'à la fermeture de la page. Un réglage devenu illisible revient à sa valeur par défaut sans effacer les autres.
13. R-CAD-64 · Deux ordres de lecture. « Dans l'ordre » (par défaut) : la lecture passe à la photo suivante, plus ancienne, à chaque intervalle ; après la plus ancienne, elle repart de la plus récente, en boucle et sans retour en arrière visible. « Aléatoire » : les photos sont mélangées une fois, et chacune passe une fois avant qu'un nouveau mélange commence ; le nouveau tour ne remontre pas tout de suite la photo qui vient de passer.
14. R-CAD-65 · En « Aléatoire », une nouvelle photo se place juste après celle qui est affichée : les règles d'arrivée (R-CAD-40 à R-CAD-42) s'appliquent comme dans l'ordre. Une photo supprimée sort du mélange ; si c'était la photo affichée, le diaporama passe à la plus récente (R-CAD-29).
15. R-CAD-66 · L'ordre choisi est retenu sur l'appareil, comme la vitesse (R-CAD-62, R-CAD-63). Le bandeau de vignettes suit l'ordre de lecture.
16. R-CAD-67 · Quatre modèles d'affichage. « Ajusté » (par défaut) : la photo entière, sans être coupée, l'espace autour rempli par une version floutée d'elle-même. « Plein format » : la photo remplit tout l'écran, quitte à couper ses bords. « Passe-partout » : la photo entière dans un large carton clair, sur un mur sombre. « Polaroïd » : la photo entière sur un tirage blanc légèrement penché, avec une bande en bas.
17. R-CAD-68 · Avec « Ajusté » et « Plein format », la photo affichée s'agrandit très lentement et légèrement (zoom lent) pendant 20 secondes ; « Passe-partout » et « Polaroïd » restent immobiles. Le zoom lent est désactivé sur les appareils réglés pour réduire les animations.
18. R-CAD-69 · Remplacée : la bande du tirage porte aussi le message de l'expéditeur (R-CAD-71).
19. R-CAD-70 · Le modèle choisi est retenu sur l'appareil, comme la vitesse et l'ordre (R-CAD-62, R-CAD-63).
20. R-CAD-30 · La légende montre la date d'ajout ou de réception (« 24 novembre 2026 »), sans l'heure.
21. R-CAD-71 · Avec « Polaroïd », la date, puis pour une photo reçue « Envoyée par [nom] » et le message de l'expéditeur, s'écrivent dans la bande du tirage, et non plus en bas de l'écran. Une même photo penche toujours du même côté.

**Messages affichés**

| Situation                                  | Message                                                                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Légende d'une photo                        | « [date] » et, pour une photo reçue, « Envoyée par [nom] » puis son message entre guillemets, sur trois lignes au plus       |
| Choix des photos                           | « Photos » : « Toute la bibliothèque », puis le nom de chaque collection                                                     |
| Choix du modèle                            | « Affichage » : « Ajusté », « Plein format », « Passe-partout », « Polaroïd »                                                |
| Choix de l'ordre                           | « Lecture » : « Dans l'ordre », « Aléatoire »                                                                                |
| Choix de vitesse                           | « Vitesse » : « 5 s », « 10 s », « 20 s »                                                                                    |
| Noms des boutons (survol, lecture d'écran) | « Quitter le mode cadre », « Plein écran », « Photo précédente », « Lecture automatique », « Photo suivante », « Vignettes » |

**Ce qui n'est pas possible**

- Choisir une autre vitesse que 5, 10 ou 20 secondes.
- Retrouver ses réglages sur un autre appareil ou dans un autre navigateur : chaque appareil garde les siens.

## Choisir les photos du cadre

**Ce que l'on peut faire**

- Dans le menu « … » du diaporama, « Photos », choisir « Toute la bibliothèque », « Sélection du jour » (voir [Sélection du jour](#sélection-du-jour)) ou l'une de ses collections.
- Faire ce choix depuis la page « Préférences », encart « Cadre de cet appareil » (voir [preferences.md](preferences.md#cadre-de-cet-appareil)).
- Depuis la carte « Mes collections » de la bibliothèque, choisir « Lire sur le cadre » dans le menu « … » d'une collection : le cadre s'ouvre en plein écran sur elle (voir [collections.md](collections.md)).

**Règles**

1. R-CAD-77 · Le cadre lit toute la bibliothèque (par défaut), la sélection du jour (R-CAD-84) ou une seule collection. Le choix est retenu sur l'appareil, comme la vitesse (R-CAD-62, R-CAD-63).
2. R-CAD-78 · Une collection se lit comme la bibliothèque : des plus récentes aux plus anciennes et en boucle, ou en ordre aléatoire, selon « Lecture » ; avec la même vitesse et le même modèle d'affichage.
3. R-CAD-79 · Changer de photos fait repartir le diaporama de la photo la plus récente du nouveau choix ; en « Aléatoire », un nouveau mélange commence.
4. R-CAD-80 · Une photo rangée dans la collection lue, ou retirée, depuis cet appareil ou un autre, entre dans le diaporama ou en sort en quelques instants, sans recharger. Une photo ajoutée à la bibliothèque n'arrive sur le cadre que si elle est rangée dans la collection lue.
5. R-CAD-81 · Si la collection lue est supprimée, le cadre repasse à toute la bibliothèque. Si les collections n'ont pas pu être chargées, il lit toute la bibliothèque en attendant, puis passe à la collection dès qu'elles arrivent.
6. R-CAD-82 · Une collection vide ne repasse pas à la bibliothèque : le cadre dit qu'elle est vide, avec le bouton « Retour à la bibliothèque » (R-CAD-56).
7. R-CAD-83 · Lancé depuis une photo qui n'est pas dans la collection lue, le diaporama commence par la photo la plus récente de la collection (exception à R-CAD-57).

**Messages affichés**

| Situation       | Message                                                                           |
| --------------- | --------------------------------------------------------------------------------- |
| Collection vide | « Cette collection est vide. » — « Ajoutez-y des photos depuis la bibliothèque. » |

**Ce qui n'est pas possible**

- Lire plusieurs collections à la fois.
- Garder le choix d'une collection sur un autre appareil : chaque appareil garde le sien.

## Sélection du jour

**Ce que l'on peut faire**

- Dans le menu « … » du diaporama, « Photos », choisir « Sélection du jour » : le cadre lit 20 photos de la bibliothèque tirées au hasard, un lot différent chaque jour.
- Faire ce choix depuis la page « Préférences », encart « Cadre de cet appareil » (voir [preferences.md](preferences.md#cadre-de-cet-appareil)).

**Règles**

1. R-CAD-84 · La sélection du jour compte 20 photos de la bibliothèque, tirées au hasard. Une photo reçue n'y entre qu'une fois découverte. Avec 20 photos ou moins, la sélection les contient toutes. Le choix est retenu sur l'appareil, comme les autres choix de « Photos » (R-CAD-77).
2. R-CAD-85 · Le lot reste le même toute la journée, à chaque ouverture et sur tous les appareils du compte. Un nouveau lot est tiré chaque jour à minuit, heure de Paris ; un cadre allumé y passe dans le quart d'heure qui suit, sans recharger.
3. R-CAD-86 · Une photo ajoutée ou découverte dans la journée ne remplace pas une photo du lot : elle n'y entre que s'il reste de la place, sinon elle peut être tirée les jours suivants. Une photo reçue la veille et découverte ce matin compte donc comme une photo du jour.
4. R-CAD-87 · Une photo supprimée quitte la sélection en quelques instants ; une autre photo de la bibliothèque prend sa place s'il y en a.
5. R-CAD-88 · La sélection se lit comme une collection : des plus récentes aux plus anciennes ou en ordre aléatoire, selon « Lecture », avec la même vitesse et le même modèle d'affichage (R-CAD-78, R-CAD-79).
6. R-CAD-89 · Si la sélection ne peut pas être chargée, le cadre lit toute la bibliothèque en attendant, sans message ; il réessaie au plus tard un quart d'heure après, et passe à la sélection dès qu'elle arrive. Le menu garde « Sélection du jour » coché.

**Ce qui n'est pas possible**

- Choisir le nombre de photos de la sélection.
- Tirer un nouveau lot avant le lendemain, ou garder une photo d'un jour sur l'autre.

## Radio

**Ce que l'on peut faire**

- Dans le menu « … » d'une photo (bibliothèque, photo ouverte en grand ou diaporama), choisir « Lancer la radio » : le cadre s'ouvre en plein écran sur cette photo, puis enchaîne des photos qui lui sont liées.

**Règles**

1. R-CAD-90 · La radio commence par la photo choisie, puis passe les photos qui lui sont liées : envoyées par le même ami, arrivées à 7 jours d'écart au plus, ou rangées dans les mêmes collections. Plus une photo a de liens, plus elle passe tôt ; à égalité, la plus proche dans le temps passe d'abord.
2. R-CAD-91 · Deux photos que l'on a ajoutées soi-même ne comptent pas comme venant du même expéditeur : ce lien ne vaut que pour les photos reçues d'un ami.
3. R-CAD-92 · Quand les photos liées ne suffisent pas, d'autres photos de la bibliothèque, tirées au hasard, complètent la radio, jusqu'à 30 photos en tout. Une photo reçue n'y entre qu'une fois découverte.
4. R-CAD-93 · « Dans l'ordre » lit la radio dans cet ordre, en boucle ; « Aléatoire » la mélange. La vitesse et le modèle d'affichage restent ceux choisis.
5. R-CAD-94 · La radio est construite à son lancement et ne change plus : une photo ajoutée ou découverte ensuite n'y entre pas ; une photo supprimée en sort en quelques instants.
6. R-CAD-95 · La radio n'est pas retenue sur l'appareil. Tant qu'elle joue, « Photos » la montre en tête, cochée, sous le nom « Radio » ; choisir une autre option l'arrête et retient ce choix. Quitter le cadre l'arrête aussi : rouvert, le cadre lit le choix retenu.
7. R-CAD-96 · Lancée depuis le diaporama, la radio remplace aussitôt ce qu'il lisait et repart de la photo choisie. Quitter le cadre ramène, comme toujours, à la photo qui était affichée (R-CAD-59).
8. R-CAD-97 · Si la radio ne peut pas être chargée (photo supprimée entre-temps, coupure de réseau), le cadre lit toute la bibliothèque, sans message. Le menu garde « Radio » coché.

**Ce qui n'est pas possible**

- Garder une radio pour plus tard, ou la retrouver sur un autre appareil.
- Choisir les liens pris en compte, ou la longueur de la radio.
- Lancer une radio depuis une photo reçue pas encore découverte.

## Arrivée d'une nouvelle photo

**Ce que l'on peut faire**

- Voir une photo ajoutée depuis un téléphone, ou découverte sur un autre appareil, arriver sur le cadre en quelques instants, sans recharger (quand il lit toute la bibliothèque, R-CAD-80).
- Quand quelqu'un regarde le cadre, aller à la nouvelle photo en touchant la pastille « 1 nouvelle photo ».

**Règles**

1. R-CAD-40 · Diaporama en lecture automatique et personne n'utilise le cadre : la nouvelle photo s'affiche immédiatement et reste à l'écran un intervalle complet avant que la lecture reprenne.
2. R-CAD-41 · Diaporama pendant que quelqu'un utilise le cadre : la photo regardée reste à l'écran et une pastille annonce le nombre de nouvelles photos. Toucher la pastille affiche la plus récente. Sans geste, la plus récente s'affiche seule dès que le cadre redevient inactif (4 secondes).
3. R-CAD-42 · Diaporama en pause : la photo choisie reste à l'écran et la pastille s'affiche ; elle ne disparaît que lorsqu'on la touche, que l'on va soi-même sur la photo la plus récente ou que l'on ferme le diaporama. Si l'on relance la lecture, la règle R-CAD-41 s'applique.
4. R-CAD-43 · Remplacée : le cadre n'a plus de vue bibliothèque (R-CAD-53).
5. R-CAD-44 · La pastille additionne les photos arrivées tant qu'elle n'a pas été touchée.
6. R-CAD-45 · Une photo supprimée depuis un autre appareil disparaît du cadre en quelques instants, sans recharger.
7. R-CAD-76 · Une photo envoyée par un ami ne s'affiche pas à son arrivée : elle attend d'être découverte (voir [Photos reçues en attente](#photos-reçues-en-attente)). Découverte sur un autre appareil, elle entre dans le diaporama à sa date de réception, quand il lit toute la bibliothèque (R-CAD-80) ; si c'est la plus récente, les règles d'arrivée ci-dessus s'appliquent.

**Messages affichés**

| Situation                 | Message                       |
| ------------------------- | ----------------------------- |
| Une photo arrivée         | « 1 nouvelle photo »          |
| Plusieurs photos arrivées | « [nombre] nouvelles photos » |

**Ce qui n'est pas possible**

- Être averti par un son ou une vibration.

## Photos reçues en attente

**Ce que l'on peut faire**

- Voir en haut du cadre la pastille « Vous avez N nouvelles photos » quand des proches ont envoyé des photos.
- Toucher la pastille pour découvrir les photos une à une, en grand, avec leur expéditeur, leur date et leur message.

**Règles**

1. R-CAD-72 · Tant qu'au moins une photo reçue attend, une pastille blanche, marquée d'une enveloppe, s'affiche en haut au centre du cadre, même quand personne ne l'utilise. Elle se place au-dessus de la pastille des nouvelles photos, sans la cacher, et se met à jour seule.
2. R-CAD-73 · Toucher la pastille lance la découverte, comme dans la bibliothèque (voir [partage.md](partage.md#recevoir-une-photo), R-PAR-53 et R-PAR-54). Le diaporama s'arrête pendant ce temps.
3. R-CAD-74 · Après « Terminer » ou la fermeture, le diaporama repart de la photo la plus récente. Les photos découvertes y sont déjà, à leur date de réception, quand il lit toute la bibliothèque (R-CAD-80) : la pastille des nouvelles photos ne les annonce pas.
4. R-CAD-75 · Sans aucune photo dans la bibliothèque mais avec des photos en attente, le cadre affiche « Des photos vous attendent. » sous la pastille.

**Messages affichés**

| Situation                            | Message                          |
| ------------------------------------ | -------------------------------- |
| Une photo en attente                 | « Vous avez 1 nouvelle photo »   |
| Plusieurs photos en attente          | « Vous avez N nouvelles photos » |
| Bibliothèque vide, photos en attente | « Des photos vous attendent. »   |

**Ce qui n'est pas possible**

- Voir la liste des photos en attente sans les découvrir.
- Découvrir les photos sans que le diaporama s'arrête.

## Coupure de réseau

**Ce que l'on peut faire**

- Laisser le cadre allumé pendant une coupure : il continue d'afficher les photos déjà chargées et se remet à jour seul quand le réseau revient.

**Règles**

1. R-CAD-50 · Pendant une coupure, le cadre continue le diaporama avec les photos déjà affichées. Aucune nouvelle photo n'arrive.
2. R-CAD-51 · Dès que la connexion revient, le cadre se reconnecte seul et recharge toutes ses photos : les photos ajoutées, reçues ou supprimées pendant la coupure sont prises en compte. Plusieurs photos arrivées pendant la coupure suivent les règles d'arrivée ci-dessus et sont comptées ensemble dans la pastille.
3. R-CAD-52 · Si la connexion au compte n'est plus valable au moment de la reconnexion, le cadre revient à la page de connexion (R-CAD-07).

**Messages affichés**

Aucun message : la coupure ne s'affiche pas à l'écran.

**Ce qui n'est pas possible**

- Voir sur le cadre qu'il est hors ligne.
