# 📅 Daily Report — Yipyy (plateforme de services animaliers)

**Date :** 05–06/08/2026
**Développeur :** Houssem Ferrani

---

## ✅ Travail effectué

**55 commits sur deux jours** (32 le 05, 23 le 06). Regroupés par lot — le
détail complet est dans `git log`.

**Commits — 05/08 (32) :**

_Le comptoir écrit à la facture_

- `b88980b1` — « Collect Payment » encaisse réellement les réservations qu'il liste
- `68f4bab8` — une réservation peut recevoir des articles ; le solde dû est **dérivé**
- `5d4ca347` — les quatre dialogues du comptoir (article, acompte, prépaiement, caisse) écrivent en base
- `00a5b426` — un pourboire est **dû à quelqu'un** : table d'affectation par employé, plafonnée par le registre
- `d6ca55c9` — fix(dashboard) : la sortie prend l'argent (le paiement n'était jamais appelé)

_Les tableaux de présence — une seule réponse à « ce chien est-il là ? »_

- `13deaee5` — un écran qui montre le box d'un pensionnaire et permet de le déplacer
- `01a48e51` — la garderie est un enregistrement, plus un tableau en mémoire
- `a55ca886` — le tableau d'arrivée de la garderie écrit sur le sol
- `9d13c8a3` — refactor : suppression de deux tableaux d'arrivée que rien n'affichait (3 242 lignes)
- `28e5213b` — le tableau d'arrivée de la pension montre enfin la **pension**
- `5f28090f` — le tableau d'accueil compte le même jour que les écrans d'arrivée
- `b4f871f4` — `booking_presence` : une seule réponse, pour tous les services
- `4f2b9732` / `1816479f` — la présence en cours de dressage, et un formateur est un membre du personnel

_Vérité des écrans_

- `63697810` — les dialogues d'abonnement cessent d'annoncer un succès qu'ils ne peuvent pas livrer
- `5e0ee3f2` — le crédit prépayé **est** l'avoir en compte (il y avait deux soldes, un seul honoré)
- `0e5a17db` — le lien vers le détail d'une réservation se résout en base

_Migration de l'authentification vers Clerk (soirée)_

- `05617776` / `be16d372` — le harnais de tests RLS pose le JSON des claims, pas la variable scalaire
- `a4c85345` — **fix(security)** : `anon` pouvait exécuter quatre fonctions dans `public`
- `96f7ac91` — **Postgres identifie l'appelant par le `sub` Clerk**, plus par `auth.uid()`
- `e46b9b3f` — l'application se connecte avec Clerk (`/sign-in`, `/sign-up`)
- `1b406321` — les utilisateurs Clerk sont synchronisés vers `profiles` par webhook signé
- `418bd4f2` / `02b62bf2` — retrait des identités pré-Clerk et de l'échafaudage de bascule

**Commits — 06/08 (23) :**

- `a3615695` / `09a9d43e` / `6b02e709` — **le bouton Déconnexion ne faisait rien en production** (trois causes distinctes)
- `c7b50cc0` — les écrans de connexion reprennent l'habillage Yipyy
- `5b5bed30` — connexion par identifiant + mot de passe à côté de Google, avec réinitialisation
- `fa2c95e7` / `b1418978` / `45b8b716` — les formulaires d'authentification cessent d'échouer en silence
- `164bec55` — **une adresse e-mail ne peut porter qu'une seule identité**
- `5844a7f8` — une habilitation est accordée à une identité Clerk (la table était vide et ne pouvait plus se remplir)
- `054fe53d` — **fix(auth)!** : les huit dernières colonnes d'auteur acceptent un sujet Clerk — la chaîne de paiement était tombée
- `2d5e014a` / `0553ce55` — la suite de tests bout-en-bout se connecte via l'API Backend de Clerk
- `0bf98a0e` / `f628efee` / `619a2df8` / `de5a8110` / `f876460f` — remise au vert de la suite (179 tests)
- `709409de` — **fix(db)** : le registre financier verrouille ce qu'il référence (11 clés étrangères manquantes)

**Fonctionnalités développées :**

- **Le comptoir est réel** — ajouter un sac de croquettes, prendre un acompte, encaisser un prépaiement, régler plusieurs réservations d'un coup : les quatre dialogues écrivaient dans l'état React et perdaient tout à la fermeture. Tout passe par la base. Le solde dû d'une réservation est **calculé** (`prix + extras − encaissé`) : une facture qui grossit fait bouger le solde du client, le statut de paiement et le montant d'un règlement groupé au même instant.
- **Le pourboire est dû à quelqu'un** — le dialogue de répartition calculait la ventilation au centime près puis **jetait le résultat**. Il existe maintenant une table par employé, plafonnée par la somme réellement encaissée (contrôle en base, pas à l'écran), et la paie a de quoi payer.
- **La présence est un fait, pas un statut** — garderie, pension et dressage ont chacun leur table d'arrivée, et une vue unique (`booking_presence`) répond « ce chien est-il sur place » de la même façon pour tous les services. Avant, la liste des réservations savait le dire d'un toilettage et pas d'un pensionnaire présent depuis mardi.
- **Un écran de gestion des box** — le point d'entrée pour déplacer un pensionnaire existait en base depuis quatre lots, sans aucun écran pour l'appeler. Le tableau nomme le chien et son propriétaire, plus seulement le numéro de réservation.
- **Migration complète de l'authentification vers Clerk** — Postgres identifie désormais l'appelant par son sujet Clerk ; les 13 fonctions d'identité, 220 politiques de sécurité et les 4 portails ont suivi. Connexion Google **et** identifiant/mot de passe, réinitialisation incluse, dans l'habillage Yipyy.
- **Synchronisation par webhook signé** — un compte Clerk devient un profil applicatif ; la vérification de signature s'exécute avant toute écriture, faute de quoi le point d'entrée serait une porte ouverte sur les identités.
- **Suite de tests bout-en-bout remise au vert** — 179 tests, désormais authentifiés via l'API Backend de Clerk plutôt qu'en pilotant le formulaire (une sortie de version Clerk ne peut plus casser les 36 spécifications d'un coup).

**Bugs corrigés :**

- **La chaîne de paiement était tombée** — prendre un paiement, ajouter un article et émettre un avoir répondaient tous une erreur 500 : huit colonnes d'auteur attendaient encore un identifiant au format UUID là où Clerk fournit `user_3HY…`. Ni le typage, ni le lint, ni la compilation ne peuvent voir une conversion Postgres. Une garde a été ajoutée : une neuvième colonne du même type fait échouer la migration au lieu d'être découverte en production.
- **Plus personne ne pouvait être habilité** — l'unique chemin qui crée une habilitation écrivait encore un identifiant fictif. Résultat : la table des habilitations était vide et ne pouvait pas se remplir ; les personnes connectées étaient renvoyées vers le portail client et **tous les écrans s'affichaient normalement, vides, sans une seule erreur dans les journaux**.
- **Une même adresse e-mail portait deux identités** — conséquence d'une fenêtre de quelques heures pendant la migration. Deux protections : un index unique en base (insensible à la casse) et un refus lisible côté webhook. La migration **refuse de s'appliquer** tant que le doublon existe, en nommant les lignes concernées.
- **Le bouton Déconnexion ne faisait rien en production** — trois causes empilées, chacune corrigée après reproduction réelle dans le navigateur : une référence globale absente au moment du clic, une redirection sur laquelle on comptait à tort, et — la vraie — **un bouton du portail client qui n'avait jamais été relié à quoi que ce soit**. Un contrôle qui ne peut pas agir n'est plus affiché.
- **Le formulaire de connexion affichait un cadre rouge vide** — la valeur lue juste après la soumission était celle d'avant l'appel. Une seule erreur produisait tous les symptômes : bouton sans effet apparent, erreur avalée, session jamais finalisée.
- **La sortie de garde n'encaissait pas** — l'écran annonçait « Débité de X $ », attribuait les points de fidélité, consommait le bon de réduction et marquait le départ, **sans appeler le moindre point de paiement**. Pire : une fenêtre superposée faisait naviguer l'opérateur avant l'ouverture du paiement — le chien était marqué parti et personne n'avait demandé l'argent.
- **Deux soldes pour un client, un seul honoré** — l'écran des crédits prépayés permettait d'accorder 200 $ à un client **inexistant** (identifiant inventé à partir de l'horodatage), pendant que la caisse n'honorait que le vrai registre.
- **Onze colonnes de référence sans clé étrangère** dans les quatre tables d'argent et d'audit. Supprimer une réservation annulée aurait laissé 238 lignes de paiement (2 954 $) pointant dans le vide — et comme ces tables sont volontairement immuables, ces orphelins n'auraient **jamais pu être nettoyés**. Corrigé en `RESTRICT` : on ne supprime pas un client qui a de l'argent à son nom.
- **`anon` pouvait exécuter quatre fonctions** — troisième occurrence de cette famille. Deux d'entre elles permettaient d'énumérer des références de réservation valides en comparant les messages d'erreur.
- **Tous les liens vers le détail d'une réservation étaient cassés pour les données réelles** — huit points d'entrée (facturation, arrivée, fiche client, vue des box) passaient par 1 197 lignes d'écran qui cherchaient la réservation dans un tableau de démonstration. Remplacé par 60 lignes côté serveur.
- **Le tableau d'arrivée de la pension était celui de la garderie** — depuis toujours, invisible tant que les deux déplaçaient des objets en mémoire.
- **Neuf chiens « sur place depuis des jours »** — résidus de tests automatisés qui annulaient leur réservation sans annuler l'arrivée. Invisibles jusqu'à ce qu'un écran pose la question tous services confondus.
- **Le tableau d'accueil et les écrans d'arrivée donnaient deux réponses** pour la même journée — le premier comptait encore des données de mars 2024.
- **Un filtre de localisation qui masquait deux tiers des réservations** — le tri se faisait sur le reste de la division du numéro de réservation par trois, hérité des données de démonstration.
- **Les dialogues d'abonnement annonçaient un remboursement et un e-mail qui n'existent pas** — le texte a été corrigé pour dire la vérité, ce qui se lit moins bien mais reste la seule version non mensongère.
- **3 242 lignes d'écrans que rien n'affichait** supprimées (deux tableaux d'arrivée jamais montés).

---

## 🚧 En cours

**Tâche actuelle :**

> **Le portail client doit savoir qui est connecté.** Un identifiant en dur —
> `MOCK_CUSTOMER_ID = 15`, « Alice Johnson » — est présent dans **35 fichiers**
> du portail client : chaque propriétaire connecté voit les réservations, les
> animaux et le foyer de la même personne fictive.
>
> Fait à ce stade : la route `/api/clients/me`, le point d'entrée unique
> `useCurrentCustomer()` (façonné comme celui du portail facility), la migration
> qui permet à un client de **réclamer sa propre fiche** et sa suite de tests
> SQL, plus un script de vérification. Le tableau de bord client est le premier
> écran converti.

**Blocage sur cette tâche :**

> Aucun blocage. Une découverte à signaler : le mécanisme censé relier un
> compte à sa fiche client **n'a jamais pu fonctionner** — un garde-fou en base
> refuse tout changement de propriétaire à qui ne détient pas le droit
> d'éditer les clients, ce qu'un client n'a par définition pas. La fiche restait
> donc non réclamée pour tout le monde. La dérogation ajoutée est délibérément
> étroite : uniquement une fiche libre, uniquement pour soi-même, et uniquement
> si l'adresse correspond à celle que Clerk a vérifiée.

---

## 🚧 Blocages

- **Un point de décision côté client (non technique) :** la base de production
  ne contient aucun administrateur de plateforme et aucune habilitation, donc
  personne ne peut inviter personne. Il faut désigner qui détient ce premier
  accès — une ligne à créer, une décision à prendre.

---

## 💬 Message pour le client

> Deux journées denses (55 commits) en deux temps : **l'encaissement**, puis le
> **changement de système de connexion**.
>
> Côté encaissement, le comptoir est devenu réel. Ajouter un article, prendre un
> acompte, encaisser un prépaiement, régler plusieurs réservations d'un coup :
> ces quatre dialogues calculaient soigneusement des montants puis les
> oubliaient à la fermeture de l'onglet. Le pourboire aussi — la répartition
> entre employés était calculée au centime près et jetée, la paie n'avait rien à
> verser. Et à la sortie de garde, l'écran annonçait un débit, attribuait les
> points de fidélité et marquait le départ **sans jamais appeler le paiement** :
> le chien repartait, l'argent n'était pas demandé.
>
> Nous avons aussi unifié la question « ce chien est-il ici ? ». Elle recevait
> jusqu'ici trois réponses différentes selon le service, et l'écran de la pension
> affichait en réalité celui de la garderie. Au passage, neuf chiens figuraient
> « sur place depuis des jours » — des résidus de tests, invisibles tant que
> personne ne posait la question tous services confondus.
>
> Le second temps est le passage à **Clerk** pour la connexion. C'est un
> changement de fond : la base de données identifie désormais chaque utilisateur
> par son identité Clerk, ce qui a touché les 13 fonctions d'identité, les 220
> règles de sécurité et les quatre portails. La connexion par identifiant et mot
> de passe a été ajoutée à côté de Google, réinitialisation comprise, dans
> l'habillage Yipyy. Trois défauts sérieux ont été trouvés et corrigés dans la
> foulée, tous invisibles aux contrôles automatiques : le bouton Déconnexion du
> portail client n'était **relié à rien**, la chaîne de paiement était tombée
> après la migration, et plus aucune habilitation ne pouvait être accordée — les
> écrans s'affichaient parfaitement, vides, sans la moindre erreur.
>
> La suite de tests bout-en-bout (179 tests) est remise au vert et se connecte
> désormais par le canal serveur de Clerk.
>
> Un point demande votre décision : la base de production n'a aujourd'hui aucun
> administrateur, donc personne ne peut inviter personne. Il faut désigner qui
> détient ce premier accès.
>
> Prochain lot, déjà entamé : le portail client affiche encore les données d'un
> client de démonstration pour tout le monde. Chaque écran va apprendre à
> demander qui est réellement connecté.

---

## 📊 Suivi

| Indicateur             | Valeur |
| ---------------------- | ------ |
| ⏱️ Heures travaillées  | `20` h |
| 🖥️ Avancement Frontend | `90` % |
| ⚙️ Avancement Backend  | `78` % |
