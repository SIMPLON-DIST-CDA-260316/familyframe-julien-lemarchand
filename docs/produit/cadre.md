# Cadre

Le cadre est la page à laisser affichée en plein écran sur l'appareil posé chez soi (tablette, vieil ordinateur, télévision). Il montre toutes les photos de la bibliothèque du compte connecté (voir [bibliotheque.md](bibliotheque.md)) et reçoit les nouvelles en direct. On l'ouvre avec l'entrée « Cadre » de la barre du haut. Il n'affiche que le diaporama (une photo à la fois) ; les vignettes et la liste sont dans la bibliothèque.

## Mettre en place un cadre

**Ce que l'on peut faire**

- Se connecter sur l'appareil du cadre avec le compte dont on veut afficher les photos, puis ouvrir « Cadre ».
- Laisser l'appareil allumé : le cadre reste connecté et à jour sans intervention.
- Quitter le diaporama pour revenir à la bibliothèque, sur la photo qui était affichée.

**Règles**

1. R-CAD-01 · Un cadre affiche les photos d'un seul compte : celui qui y est connecté.
2. R-CAD-02 · Le cadre est toujours sombre, quel que soit le thème choisi, pour mettre les photos en valeur.
3. R-CAD-03 · Le cadre occupe toute la page : la barre du haut et les menus de l'application n'y sont pas affichés.
4. R-CAD-04 · Le cadre affiche toutes les photos de la bibliothèque, des plus récentes aux plus anciennes, sans limite de nombre : les anciennes photos ne disparaissent jamais du cadre.
5. R-CAD-05 · Le cadre recharge toutes ses photos une fois par jour. Cela garde sa connexion active (voir [comptes-et-connexion.md](comptes-et-connexion.md#rester-connecté)) : un cadre allumé en continu ne se déconnecte jamais.
6. R-CAD-06 · Un cadre rallumé alors que le réseau n'est pas encore prêt attend et réessaie seul toutes les 5 secondes, sans afficher la page de connexion (R-CNX-16).
7. R-CAD-07 · Si sa connexion au compte a expiré ou a été fermée, le cadre revient à la page de connexion : il faut se reconnecter sur l'appareil.
8. R-CAD-08 · Tant qu'aucune photo n'est affichée (bibliothèque vide, ou pendant le tout premier chargement), le cadre montre un message d'attente avec l'adresse du site, pour inviter à envoyer une première photo.
9. R-CAD-53 · Le cadre n'affiche que le diaporama : les vignettes et la liste sont dans la bibliothèque.
10. R-CAD-54 · Le diaporama ne démarre plus de lui-même après une minute : il est déjà la seule vue du cadre.
11. R-CAD-55 · Sans photo à montrer, le cadre dit pourquoi : chargement en cours, aucune photo encore, ou chargement impossible ; il réessaie tout seul quand la connexion revient.
12. R-CAD-56 · Un bouton « Retour à la bibliothèque » permet toujours de sortir du cadre.
13. R-CAD-57 · Lancé depuis une photo, le diaporama commence par cette photo.

**Messages affichés**

| Situation               | Message                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Aucune photo à afficher | « En attente de la première photo… » — « Envoyez-en une depuis votre téléphone : [adresse du site] » |
| Chargement en cours     | « Chargement des photos… »                                                                           |
| Chargement impossible   | « Les photos n'ont pas pu être chargées. » — « Le cadre réessaiera dès que la connexion reviendra. » |
| Sortir du cadre         | « Retour à la bibliothèque »                                                                         |

**Ce qui n'est pas possible**

- Associer un cadre à un compte sans saisir le mot de passe sur l'appareil (par exemple avec un code).
- Afficher sur un même cadre les photos de plusieurs comptes.
- Passer en plein écran depuis l'application : prévu, voir [a-venir.md](a-venir.md).

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
- Choisir la vitesse : 5 s, 10 s ou 20 s par photo (menu « … », « Vitesse »).
- Afficher ou masquer un bandeau de vignettes (« Vignettes ») et toucher une vignette pour aller à cette photo.
- Envoyer la photo affichée à un ami ou la supprimer (menu « … »).
- Quitter le mode cadre (bouton ✕ ou touche Échap) pour revenir à la bibliothèque, sur la photo affichée.

**Règles**

1. R-CAD-20 · Réglages au premier affichage : lecture automatique, 10 secondes par photo, bandeau de vignettes masqué.
2. R-CAD-21 · La vitesse, la lecture ou la pause et l'affichage du bandeau reviennent aux réglages par défaut quand la page du cadre est rechargée ou rouverte. Le rechargement quotidien des photos (R-CAD-05) ne les modifie pas.
3. R-CAD-22 · La lecture automatique passe à la photo suivante, plus ancienne, à chaque intervalle. Après la plus ancienne, elle repart de la plus récente, en boucle et sans retour en arrière visible.
4. R-CAD-23 · La lecture automatique attend pendant que quelqu'un utilise le cadre : elle ne change pas de photo tant qu'il y a eu une activité dans les 4 dernières secondes, ni tant qu'un menu ou une fenêtre est ouvert.
5. R-CAD-24 · Les boutons (✕, « … », flèches, lecture, vignettes) et le bandeau s'affichent dès qu'il y a une activité et s'effacent après 4 secondes sans activité ; le pointeur de la souris se cache aussi. Ils restent affichés tant qu'un menu ou une fenêtre est ouvert.
6. R-CAD-25 · Pendant qu'un menu est ouvert, les flèches du clavier et la touche Échap servent au menu : elles ne changent pas de photo et ne ferment pas le diaporama.
7. R-CAD-26 · Chaque photo s'affiche entière, sans être coupée ; l'espace autour est rempli par une version floutée de la photo elle-même.
8. R-CAD-27 · La photo affichée s'agrandit très lentement et légèrement (zoom lent) pendant 20 secondes. Cet effet est désactivé sur les appareils réglés pour réduire les animations.
9. R-CAD-28 · Le bandeau de vignettes garde la photo affichée au centre. Il défile au doigt, à la molette ou en le faisant glisser à la souris ; un glissement ne déclenche pas l'ouverture de la vignette où il se termine.
10. R-CAD-29 · Si la photo affichée est supprimée (ici ou depuis un autre appareil), le diaporama passe à la photo la plus récente.
11. R-CAD-30 · La légende montre la date d'ajout ou de réception (« 24 novembre 2026 »), sans l'heure.

**Messages affichés**

| Situation                                  | Message                                                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Légende d'une photo                        | « [date] » et, pour une photo reçue, « Envoyée par [nom] »                                                  |
| Choix de vitesse                           | « Vitesse » : « 5 s », « 10 s », « 20 s »                                                                   |
| Noms des boutons (survol, lecture d'écran) | « Quitter le mode cadre », « Photo précédente », « Lecture automatique », « Photo suivante », « Vignettes » |

**Ce qui n'est pas possible**

- Choisir une autre vitesse que 5, 10 ou 20 secondes.
- Lire les photos dans un ordre aléatoire : prévu, voir [a-venir.md](a-venir.md).
- Choisir un modèle d'affichage (passe-partout, polaroïd…) : prévu, voir [a-venir.md](a-venir.md).
- Retenir ses réglages de diaporama d'un jour à l'autre : prévu, voir [a-venir.md](a-venir.md).

## Arrivée d'une nouvelle photo

**Ce que l'on peut faire**

- Voir une photo ajoutée depuis un téléphone ou envoyée par un ami arriver sur le cadre en quelques instants, sans recharger.
- Quand quelqu'un regarde le cadre, aller à la nouvelle photo en touchant la pastille « 1 nouvelle photo ».

**Règles**

1. R-CAD-40 · Diaporama en lecture automatique et personne n'utilise le cadre : la nouvelle photo s'affiche immédiatement et reste à l'écran un intervalle complet avant que la lecture reprenne.
2. R-CAD-41 · Diaporama pendant que quelqu'un utilise le cadre : la photo regardée reste à l'écran et une pastille annonce le nombre de nouvelles photos. Toucher la pastille affiche la plus récente. Sans geste, la plus récente s'affiche seule dès que le cadre redevient inactif (4 secondes).
3. R-CAD-42 · Diaporama en pause : la photo choisie reste à l'écran et la pastille s'affiche ; elle ne disparaît que lorsqu'on la touche, que l'on va soi-même sur la photo la plus récente ou que l'on ferme le diaporama. Si l'on relance la lecture, la règle R-CAD-41 s'applique.
4. R-CAD-43 · Remplacée : le cadre n'a plus de vue bibliothèque (R-CAD-53).
5. R-CAD-44 · La pastille additionne les photos arrivées tant qu'elle n'a pas été touchée.
6. R-CAD-45 · Une photo supprimée depuis un autre appareil disparaît du cadre en quelques instants, sans recharger.

**Messages affichés**

| Situation                 | Message                       |
| ------------------------- | ----------------------------- |
| Une photo arrivée         | « 1 nouvelle photo »          |
| Plusieurs photos arrivées | « [nombre] nouvelles photos » |

**Ce qui n'est pas possible**

- Être averti par un son ou une vibration.
- Voir la liste des photos reçues mais pas encore regardées : prévu, voir [a-venir.md](a-venir.md).

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
