# Apparence et navigation

Comment on se déplace dans l'application, comment on choisit son thème, et les messages communs à toutes les pages. Le cadre a sa propre présentation, sans barre ni menus (voir [cadre.md](cadre.md)).

## Barre du haut

**Ce que l'on peut faire**

- Revenir à sa bibliothèque en touchant « FamilyFrame ».
- Sur un ordinateur, aller sur « Ma bibliothèque », « Envoyer », « Cadre » ou « Amis » ; l'administrateur a en plus « Invitations ». Sur un téléphone, ces pages sont dans la barre d'onglets en bas de l'écran (voir [Barre d'onglets](#barre-donglets-téléphone)).

**Règles**

1. R-APP-01 · La barre du haut est présente sur toutes les pages accessibles une fois connecté, sauf le cadre. Elle n'apparaît ni sur la page de connexion ni sur la page d'invitation.
2. R-APP-02 · Elle reste visible en haut de l'écran quand on fait défiler la page.
3. R-APP-03 · L'entrée de la page où l'on se trouve est mise en évidence.
4. R-APP-04 · L'entrée « Invitations » n'apparaît que pour l'administrateur.
5. R-APP-05 · Sur un écran large (ordinateur), les entrées s'affichent dans la barre et le menu du compte est à droite. Sur un écran étroit (téléphone), la barre ne garde que « FamilyFrame » et le menu du compte, à droite ; les entrées sont dans la barre d'onglets (R-APP-60).

**Messages affichés**

| Situation             | Message                                                                    |
| --------------------- | -------------------------------------------------------------------------- |
| Entrées de navigation | « Ma bibliothèque », « Cadre », « Amis », « Invitations » (administrateur) |

**Ce qui n'est pas possible**

- Personnaliser ou réordonner les entrées.

## Menu du compte

**Ce que l'on peut faire**

- Ouvrir le menu en touchant le rond de son profil (sa photo, ou son initiale), à droite de la barre du haut, sur un ordinateur comme sur un téléphone.
- Y voir son nom, son adresse e-mail et, pour l'administrateur, la mention « Admin ».
- Y ouvrir ses « Préférences », choisir son thème et se déconnecter.
- Sur un téléphone, pour l'administrateur, y ouvrir aussi « Invitations ».

**Règles**

1. R-APP-10 · Remplacée : le rond affiche la photo de profil quand il y en a une (R-APP-55). Il affichait la première lettre du nom, en majuscule.
2. R-APP-11 · La mention « Admin » s'affiche à côté du nom de l'administrateur, dans le menu du compte.
3. R-APP-12 · Sur un téléphone, le menu du compte propose aussi « Invitations » à l'administrateur, juste sous « Préférences » : la barre d'onglets n'a pas cette entrée. Sur un ordinateur, « Invitations » reste dans la barre du haut et n'est pas répété dans le menu.
4. R-APP-55 · Le rond de profil, dans le menu du compte, montre la photo de profil de la personne quand elle en a une, et sa première lettre en majuscule sinon. « Préférences » ouvre la page décrite dans [preferences.md](preferences.md).

**Messages affichés**

| Situation                       | Message                                                                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Nom du bouton (lecture d'écran) | « Menu du compte »                                                                                                                              |
| Contenu                         | [nom], « Admin » (administrateur), [e-mail], « Préférences », « Invitations » (administrateur, sur un téléphone), « Thème », « Se déconnecter » |

**Ce qui n'est pas possible**

- Rien de particulier.

## Menu mobile (retiré)

Le menu à trois traits a laissé sa place à la barre d'onglets (R-APP-60) et au menu du compte, désormais affiché aussi sur un téléphone. Les règles ci-dessous gardent leur numéro.

**Règles**

1. R-APP-20 · Remplacée : le menu mobile n'existe plus ; un onglet ouvre directement sa page (R-APP-60).
2. R-APP-21 · Remplacée : le menu mobile n'existe plus ; le menu du compte se ferme en touchant à côté, comme sur un ordinateur.

## Thème clair, sombre ou système

**Ce que l'on peut faire**

- Choisir, dans le menu du compte, sur la ligne « Thème » : « Clair », « Sombre » ou « Système ».

**Règles**

1. R-APP-30 · Par défaut, le thème est « Système » : l'application suit le réglage clair ou sombre de l'appareil.
2. R-APP-31 · En « Système », un changement de réglage de l'appareil (passage automatique en sombre le soir, par exemple) s'applique aussitôt, sans recharger.
3. R-APP-32 · Le choix s'applique immédiatement à toute l'application.
4. R-APP-33 · Le choix est retenu sur cet appareil et dans ce navigateur seulement : il ne suit pas le compte sur ses autres appareils. Si l'appareil ne permet pas de le retenir (navigation privée, par exemple), le choix vaut jusqu'à la fermeture de la page, puis l'application revient à « Système ».
5. R-APP-34 · Le cadre et une photo ouverte en grand restent toujours sur fond sombre, quel que soit le thème (R-CAD-02). Les photos de la bibliothèque, elles, suivent le thème (R-BIB-53).

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

1. R-APP-40 · Toute adresse inconnue de l'application, ouverte en étant connecté, affiche la page introuvable, avec la barre du haut mais sans la barre d'onglets du téléphone.
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
5. R-APP-54 · Sur un écran tactile, tous les boutons, champs de saisie, entrées de menu et choix des préférences sont agrandis à la taille d'un doigt, y compris les plus petits (menu « … » d'une photo, croix qui ferme une fenêtre, œil du mot de passe). À la souris, ils restent compacts.

**Messages affichés**

| Situation                                          | Message                                                       |
| -------------------------------------------------- | ------------------------------------------------------------- |
| Réseau coupé ou réponse incompréhensible           | « L'opération a échoué. Vérifiez la connexion et réessayez. » |
| Problème interne de l'application                  | « Le serveur a rencontré un problème. Réessayez plus tard. »  |
| Demande mal formée (page ancienne ou modifiée)     | « Requête invalide. Rechargez la page et réessayez. »         |
| Adresse d'action inconnue (application pas à jour) | « Cette adresse n'existe pas sur le serveur. »                |

**Ce qui n'est pas possible**

- Signaler un problème depuis l'application.

## Écran de téléphone

**Ce que l'on peut faire**

- Utiliser l'application sur toute la surface de l'écran d'un téléphone, encoche et coins arrondis compris.

**Règles**

1. R-APP-56 · Sur un téléphone à encoche, à coins arrondis ou à barre de navigation en bas, l'application occupe tout l'écran, mais aucun bouton ni texte ne passe sous l'encoche, dans un coin ou sous cette barre : la barre du haut, les panneaux qui montent du bas, la photo ouverte en grand, la découverte des photos reçues et le cadre gardent leurs boutons et leurs légendes dans la partie utilisable de l'écran, téléphone tenu droit ou couché.
2. R-APP-57 · La barre du navigateur, autour de l'adresse, prend la couleur claire ou sombre du réglage de l'appareil, et la page s'affiche dans ces couleurs dès son ouverture. Avec un thème choisi à l'inverse de l'appareil (« Sombre » sur un appareil réglé en clair, par exemple), la barre du navigateur garde la couleur de l'appareil.
3. R-APP-74 · Sur le clavier d'un téléphone, une adresse e-mail se tape sans majuscule automatique ni correction, et la touche Entrée du dernier champ d'un formulaire annonce ce qu'elle fait : « Aller » pour se connecter ou créer son compte, « Envoyer » pour une invitation ou une demande d'ami, « OK » pour un nom ou un mot de passe. Le mot exact dépend du téléphone.
4. R-APP-75 · Sur un téléphone, un panneau qui monte du bas de l'écran (« Ajouter », « Envoyer à des proches », les infos d'une photo…) porte une petite barre en haut : la tirer vers le bas fait suivre le panneau, et le lâcher assez bas le ferme ; lâché plus haut, il remonte. La croix et la touche Échap le ferment toujours.

**Messages affichés**

Aucun message.

**Ce qui n'est pas possible**

- Choisir la couleur de la barre du navigateur.

## Chargements et coupure de réseau

**Ce que l'on peut faire**

- Voir, dès l'ouverture d'une page, la forme de ce qui va s'afficher.
- Savoir que l'appareil n'a plus de réseau.
- Relancer un chargement qui a échoué, avec « Réessayer ».

**Règles**

1. R-APP-71 · Pendant qu'une page charge son contenu (la bibliothèque, une photo ouverte en grand, la page « Amis », la liste des invitations), des formes grises qui pulsent doucement tiennent la place des vignettes, des lignes ou de la photo attendues, dans la disposition choisie (miniatures ou liste). Le contenu les remplace sans que la page saute. Si l'appareil demande de réduire les animations, elles ne pulsent pas. Les lecteurs d'écran annoncent « Chargement… ». Le cadre garde son propre écran (« Chargement des photos… », voir [cadre.md](cadre.md)).
2. R-APP-72 · Quand l'appareil perd le réseau, un bandeau s'affiche sous la barre du haut, et y reste pendant le défilement, jusqu'au retour du réseau. Il n'apparaît pas sur le cadre, qui gère lui-même la coupure (voir [cadre.md](cadre.md#coupure-de-réseau)), ni sur une photo ouverte en grand.
3. R-APP-73 · Quand le premier chargement de la bibliothèque (ou d'une collection), de la page « Amis » ou de la liste des invitations échoue, la page le dit et propose « Réessayer », qui relance ce chargement. Les photos plus anciennes qui ne se chargent pas se redemandent avec « Charger plus », toujours affiché.

**Messages affichés**

| Situation                    | Message                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| Chargement (lecture d'écran) | « Chargement… »                                                          |
| Chargement impossible        | Le message propre à la page, et le bouton « Réessayer »                  |
| Plus de réseau               | « Pas de connexion. Les photos se mettront à jour au retour du réseau. » |

**Ce qui n'est pas possible**

- Interrompre un chargement.

## Installer l'application

**Ce que l'on peut faire**

- Ajouter FamilyFrame à l'écran d'accueil d'un téléphone ou d'une tablette, ou l'installer sur un ordinateur, depuis le menu du navigateur (« Ajouter à l'écran d'accueil », « Installer l'application »).

**Règles**

1. R-APP-69 · Installée, FamilyFrame s'ouvre depuis son icône comme une application : en plein écran, sans barre d'adresse, avec son nom « FamilyFrame » et son icône (un cadre photo avec un paysage). L'onglet du navigateur montre la même icône.
2. R-APP-70 · Installée ou non, FamilyFrame a besoin du réseau : sans connexion, elle ne s'ouvre pas et le navigateur l'indique. Rien n'est gardé sur l'appareil pour être vu hors ligne.

**Messages affichés**

Aucun message : les mots « Installer » ou « Ajouter à l'écran d'accueil » sont ceux du navigateur.

**Ce qui n'est pas possible**

- Installer FamilyFrame depuis un magasin d'applications.
- Consulter ses photos sans connexion.

## Barre d'onglets (téléphone)

**Ce que l'on peut faire**

- Sur un téléphone, aller d'un toucher sur « Bibliothèque », « Envoyer », « Cadre » ou « Amis », avec la barre d'onglets en bas de l'écran, sous le pouce.
- Ouvrir ses préférences depuis le menu du compte (rond de profil, en haut à droite).
- Sur un téléphone, toucher le bouton rond en bas à droite pour l'action principale de la page : ajouter une photo dans la bibliothèque, envoyer une photo sur la page « Envoyer », ajouter un ami sur la page « Amis ».

**Règles**

1. R-APP-60 · Remplacée : les onglets sont désormais « Bibliothèque », « Envoyer », « Cadre », « Amis » (R-APP-67).
2. R-APP-61 · La barre d'onglets est présente sur la bibliothèque, la page « Envoyer », la page « Amis », les préférences et la page des invitations. Elle n'apparaît ni sur le cadre, ni sur la page de connexion, ni sur la page d'invitation, ni sur la page introuvable.
3. R-APP-62 · L'onglet de la page où l'on se trouve est mis en évidence. Sur la page des invitations et sur les préférences, qui s'ouvrent depuis le menu du compte (R-APP-12, R-APP-68), aucun onglet ne l'est.
4. R-APP-63 · Remplacée : « Compte » n'est plus un onglet ; les préférences s'ouvrent depuis le menu du compte (R-APP-68).
5. R-APP-64 · « Cadre » ouvre le cadre en plein écran, comme « Mode cadre » (R-CAD-58). Ouvert depuis la bibliothèque, quitter le cadre ramène à cette bibliothèque.
6. R-APP-65 · La barre d'onglets reste en bas de l'écran quand on fait défiler la page, et la fin de chaque page reste visible au-dessus d'elle.
7. R-APP-66 · Tant que la barre d'onglets est affichée (écran étroit), les courtes notifications (R-APP-53) s'affichent au-dessus d'elle, sans la cacher. Dans la bibliothèque, tant que le bouton rond « Ajouter » est visible, elles s'affichent aussi au-dessus de lui ; quand il s'efface au défilement, elles redescendent juste au-dessus de la barre.
8. R-APP-67 · Sur un écran étroit (téléphone), une barre d'onglets en bas de l'écran remplace l'ancien menu à trois traits : « Bibliothèque », « Envoyer », « Cadre », « Amis », dans cet ordre. Sur un écran large (ordinateur), il n'y a pas de barre d'onglets : « Envoyer » s'affiche dans la barre du haut, juste après « Ma bibliothèque ».
9. R-APP-68 · Les préférences (voir [preferences.md](preferences.md)) s'ouvrent depuis le menu du compte (rond de profil, en haut à droite), avec le thème et « Se déconnecter » : on les règle rarement, elles n'ont pas d'onglet.
10. R-APP-76 · Sur un téléphone, l'action principale d'une page est un bouton rond en bas à droite de l'écran, au-dessus de la barre d'onglets, qui se comporte partout comme le « + » de la bibliothèque (R-BIB-48) : il s'efface pendant que l'on fait défiler la page vers le bas et revient quand on remonte, en haut ou à la fin de la page, et la fin de la page reste visible au-dessus de lui. Une page en a un au plus, et seulement si elle a une action principale : « Ajouter une photo » (« + ») sur la bibliothèque, « Envoyer une photo » (avion en papier) sur la page « Envoyer », « Ajouter un ami » (silhouette et « + ») sur la page « Amis ». Le cadre, qui occupe tout l'écran, n'en a pas, ni les préférences, faites de réglages indépendants, ni la page des invitations, dont le formulaire est déjà sur la page. Sur ces pages, le bouton de l'en-tête n'apparaît que sur un ordinateur, qui n'a pas de bouton rond.
11. R-APP-77 · Les courtes notifications passent au-dessus du bouton rond (R-APP-76) tant qu'il est visible, sur chaque page qui en a un, et pas seulement dans la bibliothèque (R-APP-66) ; quand il s'efface au défilement, elles redescendent juste au-dessus de la barre d'onglets.

**Messages affichés**

| Situation                         | Message                                            |
| --------------------------------- | -------------------------------------------------- |
| Onglets                           | « Bibliothèque », « Envoyer », « Cadre », « Amis » |
| Nom de la barre (lecture d'écran) | « Navigation principale »                          |

**Ce qui n'est pas possible**

- Personnaliser ou réordonner les onglets.
- Ouvrir « Invitations » depuis la barre d'onglets : l'entrée est dans le menu du compte (R-APP-12).
