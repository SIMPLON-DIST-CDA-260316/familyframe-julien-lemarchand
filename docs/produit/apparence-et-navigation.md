# Apparence et navigation

Comment on se déplace dans l'application, comment on choisit son thème, et les messages communs à toutes les pages. Le cadre a sa propre présentation, sans barre ni menus (voir [cadre.md](cadre.md)).

## Barre du haut

**Ce que l'on peut faire**

- Revenir à sa bibliothèque en touchant « FamilyFrame ».
- Aller sur « Ma bibliothèque », « Cadre » ou « Amis » ; l'administrateur a en plus « Invitations ».

**Règles**

1. R-APP-01 · La barre du haut est présente sur toutes les pages accessibles une fois connecté, sauf le cadre. Elle n'apparaît ni sur la page de connexion ni sur la page d'invitation.
2. R-APP-02 · Elle reste visible en haut de l'écran quand on fait défiler la page.
3. R-APP-03 · L'entrée de la page où l'on se trouve est mise en évidence.
4. R-APP-04 · L'entrée « Invitations » n'apparaît que pour l'administrateur.
5. R-APP-05 · Sur un écran large (ordinateur), les entrées s'affichent dans la barre et le menu du compte est à droite. Sur un écran étroit (téléphone), elles sont regroupées dans le menu mobile.

**Messages affichés**

| Situation             | Message                                                                    |
| --------------------- | -------------------------------------------------------------------------- |
| Entrées de navigation | « Ma bibliothèque », « Cadre », « Amis », « Invitations » (administrateur) |

**Ce qui n'est pas possible**

- Personnaliser ou réordonner les entrées.

## Menu du compte (écran large)

**Ce que l'on peut faire**

- Ouvrir le menu en touchant le rond portant son initiale, à droite de la barre.
- Y voir son nom, son adresse e-mail et, pour l'administrateur, la mention « Admin ».
- Y choisir son thème et se déconnecter.

**Règles**

1. R-APP-10 · Le rond affiche la première lettre du nom, en majuscule.
2. R-APP-11 · La mention « Admin » s'affiche à côté du nom de l'administrateur, dans le menu du compte et dans le menu mobile.

**Messages affichés**

| Situation                       | Message                                                                    |
| ------------------------------- | -------------------------------------------------------------------------- |
| Nom du bouton (lecture d'écran) | « Menu du compte »                                                         |
| Contenu                         | [nom], « Admin » (administrateur), [e-mail], « Thème », « Se déconnecter » |

**Ce qui n'est pas possible**

- Ajouter une photo de profil : prévu, voir [a-venir.md](a-venir.md).
- Ouvrir une page de préférences du compte : prévu, voir [a-venir.md](a-venir.md).

## Menu mobile (écran étroit)

**Ce que l'on peut faire**

- Ouvrir le menu avec le bouton à trois traits, à gauche de la barre : il glisse depuis le bord gauche.
- Y retrouver son nom, son adresse e-mail, les entrées de navigation, le choix du thème et « Se déconnecter ».

**Règles**

1. R-APP-20 · Toucher une entrée de navigation ferme le menu et ouvre la page.
2. R-APP-21 · Le menu se ferme aussi en touchant à côté ou avec sa croix.

**Messages affichés**

| Situation                       | Message            |
| ------------------------------- | ------------------ |
| Nom du bouton (lecture d'écran) | « Ouvrir le menu » |
| Titre du menu                   | « FamilyFrame »    |

**Ce qui n'est pas possible**

- Rien de plus que dans le menu du compte et la barre du haut.

## Thème clair, sombre ou système

**Ce que l'on peut faire**

- Choisir, dans le menu du compte ou le menu mobile, sur la ligne « Thème » : « Clair », « Sombre » ou « Système ».

**Règles**

1. R-APP-30 · Par défaut, le thème est « Système » : l'application suit le réglage clair ou sombre de l'appareil.
2. R-APP-31 · En « Système », un changement de réglage de l'appareil (passage automatique en sombre le soir, par exemple) s'applique aussitôt, sans recharger.
3. R-APP-32 · Le choix s'applique immédiatement à toute l'application.
4. R-APP-33 · Le choix est retenu sur cet appareil et dans ce navigateur seulement : il ne suit pas le compte sur ses autres appareils. Si l'appareil ne permet pas de le retenir (navigation privée, par exemple), le choix vaut jusqu'à la fermeture de la page, puis l'application revient à « Système ».
5. R-APP-34 · Le cadre et la section « Ma bibliothèque » restent toujours sombres, quel que soit le thème (R-CAD-02, R-BIB-28).

**Messages affichés**

| Situation | Message                                        |
| --------- | ---------------------------------------------- |
| Choix     | « Thème » : « Clair », « Sombre », « Système » |

**Ce qui n'est pas possible**

- Choisir d'autres couleurs.
- Retrouver son thème sur un nouvel appareil sans le choisir de nouveau.

## Page introuvable

**Ce que l'on peut faire**

- Revenir à sa bibliothèque depuis une adresse qui n'existe pas, avec « Retour à ma bibliothèque ».

**Règles**

1. R-APP-40 · Toute adresse inconnue de l'application, ouverte en étant connecté, affiche la page introuvable, avec la barre du haut.
2. R-APP-41 · Sans être connecté, une adresse inconnue mène d'abord à la page de connexion (R-CNX-31).

**Messages affichés**

| Situation        | Message                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adresse inconnue | « ERREUR 404 » — « Cette page n'existe pas » — « L'adresse est peut-être mal tapée, ou la page a changé de place. » et le bouton « Retour à ma bibliothèque » |

**Ce qui n'est pas possible**

- Rien de particulier.

## Messages d'erreur communs

**Ce que l'on peut faire**

- Réessayer l'action après un message d'erreur : aucun message ne bloque l'application.

**Règles**

1. R-APP-50 · Quand l'application est injoignable (réseau coupé), toute action affiche un message général invitant à vérifier la connexion.
2. R-APP-51 · Quand l'application elle-même rencontre un problème, un message invite à réessayer plus tard.
3. R-APP-52 · Les erreurs propres à une fonctionnalité sont décrites dans le fichier de cette fonctionnalité.
4. R-APP-53 · Les confirmations et les erreurs d'une action terminée s'affichent dans une courte notification en bas de l'écran, qui disparaît d'elle-même et suit le thème clair ou sombre.
5. R-APP-54 · Sur un écran tactile, les petits boutons (menu « … » d'une photo, croix qui ferme une fenêtre) sont agrandis à la taille d'un doigt ; à la souris, ils restent compacts.

**Messages affichés**

| Situation                                          | Message                                                       |
| -------------------------------------------------- | ------------------------------------------------------------- |
| Réseau coupé ou réponse incompréhensible           | « L'opération a échoué. Vérifiez la connexion et réessayez. » |
| Problème interne de l'application                  | « Le serveur a rencontré un problème. Réessayez plus tard. »  |
| Demande mal formée (page ancienne ou modifiée)     | « Requête invalide. Rechargez la page et réessayez. »         |
| Adresse d'action inconnue (application pas à jour) | « Cette adresse n'existe pas sur le serveur. »                |

**Ce qui n'est pas possible**

- Signaler un problème depuis l'application.
