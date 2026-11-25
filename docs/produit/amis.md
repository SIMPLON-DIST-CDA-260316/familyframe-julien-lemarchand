# Amis

Deux membres deviennent amis quand l'un envoie une demande et que l'autre l'accepte. L'amitié est alors réciproque : chacun peut envoyer des photos à l'autre (voir [partage.md](partage.md)). Tout se passe sur la page « Amis ».

## Consulter ses amis et ses demandes

**Ce que l'on peut faire**

- Ouvrir la page « Amis » depuis la barre du haut, ou l'onglet « Amis » sur un téléphone ; c'est le seul endroit où gérer ses amis. Le panneau d'envoi d'une photo, sans ami, propose « Ajouter un ami », qui mène ici.
- Basculer entre deux vues : « Mes amis » et « En attente », chacune avec son nombre.
- Dans « En attente », voir séparément les « Demandes reçues » et les « Demandes envoyées », chacune avec son nombre.

**Règles**

1. R-AMI-01 · Remplacée : le rond montre désormais la photo de profil quand il y en a une (R-AMI-45). Chaque ligne montre le nom et l'adresse e-mail de l'autre personne. L'adresse permet de distinguer deux personnes qui ont le même nom.
2. R-AMI-02 · Le nombre affiché sur « En attente » additionne les demandes reçues et envoyées. Il est mis en évidence en rouge dès qu'au moins une demande reçue attend une réponse.
3. R-AMI-03 · À l'ouverture de la page, la vue « En attente » s'affiche d'office s'il y a au moins une demande reçue ; sinon, la vue « Mes amis ». Une fois que la personne a choisi une vue, celle-ci reste affichée.
4. R-AMI-04 · Dans « En attente », les demandes reçues passent avant les demandes envoyées. Une section vide n'est pas affichée.
5. R-AMI-05 · Dans chaque liste, les plus récentes sont en haut.
6. R-AMI-06 · Les listes ne se mettent pas à jour toutes seules quand l'autre personne agit : il faut recharger la page pour voir sa réponse. Elles se rechargent en revanche après chacune de ses propres actions, réussie ou non.
7. R-AMI-07 · L'administrateur est un membre comme les autres sur cette page : il a ses propres amis et demandes.
8. R-AMI-45 · Chaque ligne montre un rond qui porte la photo de profil de l'autre personne, ou sa première lettre en majuscule quand elle n'en a pas.

**Messages affichés**

| Situation                        | Message                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| En-tête de la page               | « Amis » — « Les proches à qui vous pouvez envoyer des photos. »                                                    |
| Chargement                       | formes grises (R-APP-71), « Chargement… » pour les lecteurs d'écran                                                 |
| Chargement impossible (R-APP-73) | Le motif, et le bouton « Réessayer »                                                                                |
| Aucun ami                        | « Pas encore d'amis » — « Ajoutez un proche pour pouvoir lui envoyer vos photos. » et le bouton « Ajouter un ami »  |
| Aucune demande en attente        | « Aucune demande en attente » — « Les demandes que vous recevez ou envoyez apparaissent ici jusqu'à leur réponse. » |

**Ce qui n'est pas possible**

- Être prévenu d'une nouvelle demande ou d'une réponse ailleurs que sur cette page (pas de notification, pas d'e-mail).
- Rechercher ou parcourir la liste des membres de FamilyFrame.
- Voir les amis de ses amis.

## Envoyer une demande d'ami

**Ce que l'on peut faire**

- Cliquer sur « Ajouter un ami » (en haut de la page, ou dans la vue « Mes amis » vide), saisir l'adresse e-mail du compte FamilyFrame d'un proche et envoyer la demande.

**Règles**

1. R-AMI-10 · L'adresse e-mail est obligatoire et doit avoir une forme d'adresse. Les majuscules et les espaces autour sont ignorés.
2. R-AMI-11 · Une demande ne peut être envoyée qu'à une adresse e-mail qui correspond à un compte existant. Pour une personne sans compte, il faut demander une invitation à l'administrateur.
3. R-AMI-12 · On ne peut pas s'envoyer une demande à soi-même.
4. R-AMI-13 · On ne peut pas envoyer de demande à quelqu'un qui est déjà un ami.
5. R-AMI-14 · On ne peut pas renvoyer une demande à quelqu'un qui n'a pas encore répondu à la précédente.
6. R-AMI-15 · Si l'autre personne avait déjà envoyé une demande, envoyer à son tour une demande l'accepte : les deux deviennent amis immédiatement.
7. R-AMI-16 · Entre deux personnes, il n'existe jamais plus d'une demande ou d'une amitié à la fois, dans un sens ou dans l'autre, même si les deux envoient leur demande au même instant.
8. R-AMI-17 · En cas de réussite, la fenêtre se ferme, un message de confirmation s'affiche sur la page et la vue bascule : « En attente » pour une demande envoyée, « Mes amis » pour une amitié conclue (R-AMI-15).
9. R-AMI-18 · En cas d'échec, la fenêtre reste ouverte avec le message d'erreur et l'adresse saisie. Modifier l'adresse efface le message.
10. R-AMI-19 · La personne qui reçoit la demande la voit sous « Demandes reçues » à son prochain chargement de la page (R-AMI-06).

**Messages affichés**

| Situation                                   | Message                                                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Fenêtre d'ajout                             | « Ajouter un ami » — « Saisissez l'adresse e-mail de son compte FamilyFrame : il recevra votre demande. » |
| Champ de saisie                             | « E-mail du proche »                                                                                      |
| Envoi en cours                              | « Envoi… » (sur le bouton « Envoyer la demande »)                                                         |
| Demande envoyée                             | « Demande envoyée à [nom]. »                                                                              |
| L'autre avait déjà demandé : amitié conclue | « Vous êtes maintenant amis avec [nom]. »                                                                 |
| Adresse mal formée                          | « Adresse e-mail invalide. »                                                                              |
| Aucun compte pour cette adresse             | « Aucun compte n'utilise cette adresse e-mail. Demandez à l'administrateur d'inviter cette personne. »    |
| Sa propre adresse                           | « Vous ne pouvez pas vous ajouter vous-même. »                                                            |
| Déjà amis                                   | « Vous êtes déjà amis. »                                                                                  |
| Demande déjà envoyée, sans réponse          | « Vous avez déjà envoyé une demande à cette personne : elle attend sa réponse. »                          |

**Ce qui n'est pas possible**

- Envoyer une demande à partir d'un nom : seule l'adresse e-mail exacte fonctionne.
- Joindre un message à la demande.
- Envoyer une demande à plusieurs personnes en une fois.

## Accepter ou refuser une demande reçue

**Ce que l'on peut faire**

- Sous « Demandes reçues », cliquer sur « Accepter » ou sur « Refuser ».

**Règles**

1. R-AMI-20 · Seule la personne qui a reçu la demande peut l'accepter ou la refuser.
2. R-AMI-21 · Une demande acceptée devient une amitié réciproque : chacun apparaît dans « Mes amis » de l'autre.
3. R-AMI-22 · Une demande refusée disparaît des deux côtés, sans trace. La personne qui l'avait envoyée n'est pas prévenue ; sa demande disparaît simplement de « Demandes envoyées », et elle peut en envoyer une nouvelle plus tard.
4. R-AMI-23 · Le refus ne demande pas de confirmation.
5. R-AMI-24 · Pendant le traitement, les boutons de la ligne concernée sont désactivés ; les autres lignes restent utilisables.
6. R-AMI-25 · Si l'autre personne a annulé sa demande entre-temps, l'action échoue avec un message, et les listes se rechargent.

**Messages affichés**

| Situation                                   | Message                                          |
| ------------------------------------------- | ------------------------------------------------ |
| Demande annulée ou déjà traitée entre-temps | « Cette demande ou cette amitié n'existe plus. » |

**Ce qui n'est pas possible**

- Bloquer une personne : après un refus, elle peut redemander.
- Retrouver une demande refusée.

## Annuler une demande envoyée

**Ce que l'on peut faire**

- Sous « Demandes envoyées », cliquer sur « Annuler ».

**Règles**

1. R-AMI-30 · Seule la personne qui a envoyé la demande peut l'annuler.
2. R-AMI-31 · L'annulation fait disparaître la demande des deux côtés, sans confirmation et sans prévenir l'autre personne.
3. R-AMI-32 · Après une annulation, on peut envoyer une nouvelle demande à la même personne.
4. R-AMI-33 · Si l'autre personne a déjà accepté ou refusé entre-temps, l'action échoue avec un message, et les listes se rechargent.

**Messages affichés**

| Situation                                    | Message                                          |
| -------------------------------------------- | ------------------------------------------------ |
| Demande déjà acceptée ou refusée entre-temps | « Cette demande ou cette amitié n'existe plus. » |

**Ce qui n'est pas possible**

- Modifier une demande envoyée.

## Retirer un ami

**Ce que l'on peut faire**

- Dans « Mes amis », cliquer sur « Retirer » à côté d'un ami, puis confirmer.

**Règles**

1. R-AMI-40 · Chacun des deux amis peut retirer l'autre.
2. R-AMI-41 · Le retrait demande une confirmation ; « Annuler » ferme la fenêtre sans rien changer.
3. R-AMI-42 · Après le retrait, l'amitié disparaît des deux côtés, sans prévenir l'autre personne. Aucun des deux ne peut plus envoyer de photo à l'autre.
4. R-AMI-43 · Les photos déjà envoyées restent dans la bibliothèque de celui qui les a reçues (voir [partage.md](partage.md)).
5. R-AMI-44 · Après un retrait, chacun peut de nouveau envoyer une demande à l'autre.

**Messages affichés**

| Situation                      | Message                                                                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirmation                   | « Retirer [nom] de vos amis ? » — « Vous ne pourrez plus vous envoyer de photos. Chacun pourra refaire une demande. » Boutons « Annuler » et « Retirer » |
| L'autre a déjà retiré l'amitié | « Cette demande ou cette amitié n'existe plus. »                                                                                                         |

**Ce qui n'est pas possible**

- Retirer les photos déjà reçues de cet ami en même temps : elles se suppriment une par une (voir [bibliotheque.md](bibliotheque.md)).
