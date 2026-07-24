# 📅 Daily Report — Yipyy (plateforme pet-services)

**Date :** 24/07/2026 _(période couverte : 22 → 24/07/2026)_
**Développeur :** Houssem Ferrani

---

## ✅ Travail effectué

**Commits (sélection — 54 commits sur la période) :**

_22/07 — Fondations du portail Employé (RBAC)_

- `5f4946be` — resolve employee-portal permissions for the signed-in staff member
- `bbcf169b` — permission-driven navigation replaces NAV_BY_ROLE
- `6cef52ba` — gate actions and financial columns in the shared admin components
- `c635f0a9` — scope assigned_only data in the query layer
- `1a171d67` — employee modules reuse the admin screens, gated and scoped
- `7c3456f7` — derive the dashboard from permissions instead of role names
- `f620e30f` — preview as employee, and clearer permission state in the studio
- `840d7b9b` — daily-care : two-step feeding (serve first, log consumption later)

_23/07 — Intégration comptable QuickBooks Online (mock complet, Phases 1 → 10)_

- `a533d45f` → `1e50ac3b` — connexion OAuth simulée, données société, health-check
  des comptes, écran de mapping service→compte, moteur de sync idempotent
- `b9c2c735` / `45fadbce` / `3219801d` — dashboard de gestion, journal d'activité
  (filtres, retry, export CSV), panneau d'erreurs en langage clair
- `fe6e6f9f` / `fa230a63` / `2152082d` — reçus de remboursement, factures, avoirs ;
  builders package/dépôt ; cartes-cadeaux, abonnements, retail et pourboires
- `52f3842f` / `70a64fb8` — multi-emplacements (Classes QuickBooks + une société par
  emplacement sur la vue HQ)
- `257b651c` / `b0d42e6d` / `2518ea1b` — sync de l'historique, mode Test (sandbox),
  scénarios Section 5 en assertions exécutables

_24/07 — Parité complète du portail Employé_

- `1ae3f607` — feat(employee) : full facility-parity staff portal gated by RBAC

**Fonctionnalités développées :**

- **Portail Employé à parité avec l'admin.** Le portail `/employee` réutilise les
  vrais écrans admin, filtrés par les permissions de l'employé connecté :
  - _Dashboard_ : le vrai tableau de bord (arrivées, invités, activité, insights),
    moins les tuiles réservées au propriétaire (revenu).
  - _Navigation_ : un **modèle de nav unique** (`src/lib/nav/operations-nav.ts`)
    alimente les deux barres latérales (admin + employé) — plus de dérive possible
    (garde-fou `check:nav-parity`).
  - _Header_ : recherche + « + New » + messages + cloche + avatar, chaque
    action gated par permission.
  - _Écrans_ : chaque module a son wrapper `/employee/...` ; les boutons d'action et
    colonnes financières sont gated **à l'intérieur** des composants partagés
    (bookings, retail/POS, dossier médical, toilettage, staff).
- **Presets de rôles généreux.** Les rôles opérationnels sont largement
  permissionnés ; Réglages, Rôles & Permissions, Gestion du personnel, finances
  propriétaire et HQ restent réservés au propriétaire sauf attribution explicite.
- **Gestion du personnel.** La création/édition d'un employé écrit dans un annuaire
  partagé (`upsertFacilityStaff`) : un nouvel embauché est résolu immédiatement par
  le moteur RBAC. Overrides individuels par personne + « Aperçu en tant qu'employé ».
- **Réglages filtrés.** Même composant `SettingsPage` réutilisé : sections
  personnelles (Mon Profil, Mes Notifications) toujours disponibles, sections
  admin gated par clé (ex. Rôles → `manage_roles`, Taxes → `settings_manage_taxes`).
- **Intégration QuickBooks Online (mock).** Connexion, mapping des comptes, moteur
  de synchronisation idempotent, reçus/factures/avoirs, cartes-cadeaux/abonnements/
  retail/pourboires, multi-emplacements, sync historique et mode Test sandbox —
  le tout derrière la couche mock (aucun appel réseau réel).

**Bugs corrigés :**

- `a0bb3655` — la sync temps-réel ne vidait pas la file après un paiement
  (les paiements restaient « Pending »).
- Double conversion des centimes dans l'avoir (crédit magasin surévalué ×100).
- Le grand livre ne comptabilisait pas le côté « dépôt » (passif carte-cadeau qui
  n'augmentait jamais correctement).
- Un `realm` identique pour chaque emplacement (même société QuickBooks partout).
- Le passage en production gardait l'étiquette « Sandbox ».
- Un nouvel employé créé restait invisible du moteur RBAC et du portail (corrigé par
  l'écriture directe dans l'annuaire partagé).

---

## 🚧 En cours

**Tâche actuelle :**

> Parité du portail Employé **terminée et vérifiée en bout-en-bout** (test navigateur
> Playwright réel connecté en tant que réceptionniste : dashboard, navigation, header,
> écrans réutilisés et réglages — tout conforme). En attente des prochaines priorités
> client.

**Blocage sur cette tâche :**

> Aucun.

---

## 🧱 Blocages

- **Aucun blocage bloquant.**
- _Limite connue (mock, sans backend)_ : le **nom** affiché dans le bonjour du portail
  d'un employé fraîchement créé est rendu côté serveur et ne lit pas le cache client ;
  il peut afficher un nom générique jusqu'à un rechargement. La navigation, le
  dashboard, le header et les écrans (pilotés par permissions) sont, eux, corrects.
- _À signaler (hors périmètre)_ : GitHub a relevé **9 vulnérabilités de dépendances**
  sur le dépôt (4 hautes, 5 modérées) — pré-existantes, à examiner via Dependabot.

---

## 💬 Message pour le client

> Trois axes livrés et poussés sur `main` cette période :
>
> 1. **Le portail Employé est maintenant une vraie parité de l'espace admin,**
>    filtré par les permissions de chaque personne. Un(e) réceptionniste se connecte
>    et peut immédiatement prendre des réservations, faire un check-in, encaisser au
>    POS, écrire à un client et voir le calendrier — **sans configuration
>    supplémentaire** — tout en ne voyant **jamais** les réglages, rôles, gestion du
>    personnel, paie ou HQ réservés au propriétaire.
> 2. **Embaucher = opérationnel tout de suite :** créer un compte, assigner un rôle
>    (et éventuellement un ajustement individuel), et l'employé voit exactement ce qui
>    lui a été accordé. Un bouton « Aperçu en tant qu'employé » permet de vérifier
>    avant même sa connexion.
> 3. **Intégration comptable QuickBooks Online** (maquette complète, Phases 1 à 10)
>    prête à être branchée sur la vraie API Intuit le moment venu.
>
> Le tout est vérifié (typecheck / lint / build verts + parcours navigateur réel) et
> déjà en ligne sur `main`.

---

## 📊 Suivi

| Indicateur | Valeur |
|---|---|
| ⏱️ Heures travaillées | `~14` h  |
| 🖥️ Avancement Frontend | `95` % |
| ⚙️ Avancement Backend | `N/A` _(projet mock — pas de backend réel ; couche de données mock complète)_ |
