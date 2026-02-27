# Exemples d'Affichage de l'Intégration Loyauté & Parrainage

Ce document montre comment l'intégration de la loyauté et des parrainages apparaît dans chaque partie du système.

## 1. Factures (Invoices)

### Affichage dans les Factures Client

**Composant**: `InvoiceLoyaltySection`

```tsx
<InvoiceLoyaltySection
  loyaltyPointsEarned={50}
  loyaltyPointsRedeemed={500}
  rewardRedemptionId="redemption-123"
  discountCode="LOYALTY20"
  creditApplied={20}
  tierDiscount={5}
/>
```

**Apparence**:
```
┌─────────────────────────────────────┐
│ ⭐ Loyalty & Rewards                │
├─────────────────────────────────────┤
│ 📈 Points Earned        [+50 pts]  │
│ 🎁 Points Redeemed      [-500 pts] │
│ ⭐ Tier Discount        [5% off]   │
│ 🎁 Discount Code        [LOYALTY20]│
│ 🎁 Credit Applied       [$20.00]   │
│                                     │
│ Reward ID: redemption-123           │
└─────────────────────────────────────┘
```

### Intégration dans InvoiceItem

Les factures affichent automatiquement:
- Points gagnés sur cette transaction
- Points échangés (si applicable)
- Réductions de tier appliquées
- Codes de réduction utilisés
- Crédits appliqués

## 2. Rapports de Revenus (Revenue Reports)

### Affichage dans les Rapports Financiers

**Composant**: `RevenueReportLoyaltySection`

```tsx
<RevenueReportLoyaltySection
  loyaltyPointsEarned={50000}
  rewardsRedeemed={150}
  rewardsValue={3000}
  referralRewardsIssued={25}
  referralRewardsValue={500}
  period={{
    startDate: "2026-01-01",
    endDate: "2026-01-31"
  }}
/>
```

**Apparence**:
```
┌─────────────────────────────────────────────────────────┐
│ 🎁 Loyalty & Referral Impact                           │
│ Impact of loyalty program and referrals on revenue     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📈 Points Earned    🎁 Rewards Redeemed  📉 Rewards   │
│     50,000                 150              $3,000     │
│  Total points issued  Total redemptions  Total value   │
│                                                         │
│  👥 Referral Rewards  📉 Referral Value                │
│         25                  $500                       │
│  Rewards issued      Total referral value              │
│                                                         │
│  ┌───────────────────────────────────────────────┐   │
│  │ Total Loyalty Impact                          │   │
│  │ Combined value of all rewards and referrals   │   │
│  │                                    -$3,500.00 │   │
│  │                              Net impact       │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 3. Profils CRM

### Affichage dans les Profils Clients

**Composant**: `CRMLoyaltySection`

```tsx
<CRMLoyaltySection
  customerId={15}
  currentPoints={1250}
  lifetimePoints={2100}
  currentTier={{
    id: "tier-silver",
    name: "Silver",
    displayName: "Silver Member",
    minPoints: 500,
    color: "#C0C0C0"
  }}
  nextTier={{
    id: "tier-gold",
    name: "Gold",
    minPoints: 1500
  }}
  totalRewardsRedeemed={3}
  totalReferrals={5}
  lastActivityDate="2026-02-15"
/>
```

**Apparence**:
```
┌─────────────────────────────────────┐
│ ⭐ Loyalty Program        [Details] │
│ Customer loyalty status and activity│
├─────────────────────────────────────┤
│                                     │
│ Current Tier        Points Balance  │
│ [🥈 Silver Member]      1,250       │
│                                     │
│ Progress to Gold                    │
│ ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░ 83%   │
│ 250 points needed                   │
│                                     │
│ ┌──────────────┬──────────────┐    │
│ │ 📈 Lifetime  │ 🎁 Rewards   │    │
│ │   2,100      │      3       │    │
│ │              │              │    │
│ │ 👥 Referrals │ ⭐ Last      │    │
│ │      5       │  Feb 15, 2026│    │
│ └──────────────┴──────────────┘    │
└─────────────────────────────────────┘
```

## 4. Réservations (Bookings)

### Badge de Loyauté sur les Réservations

**Composant**: `BookingLoyaltyBadge`

```tsx
<BookingLoyaltyBadge
  pointsEarned={50}
  tierDiscount={5}
  showPoints={true}
/>
```

**Apparence**:
```
[📈 +50 pts] [⭐ 5% tier discount]
```

### Affichage dans la Liste des Réservations

Chaque réservation complétée affiche:
- Points gagnés
- Réduction de tier appliquée (si applicable)
- Badge de tier du client

## 5. POS (Point of Sale)

### Affichage dans le Terminal POS

**Composant**: `POSLoyaltyDisplay`

```tsx
<POSLoyaltyDisplay
  customerPoints={1250}
  customerTier={{
    name: "Silver",
    displayName: "Silver Member",
    color: "#C0C0C0",
    discountPercentage: 5
  }}
  pointsEarned={50}
  rewardApplied={{
    type: "credit",
    value: 20
  }}
  onRedeemReward={() => openRewardModal()}
/>
```

**Apparence**:
```
┌─────────────────────────────────────┐
│ ⭐ Loyalty Status                   │
│ [🥈 Silver Member]    1,250 pts    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📈 Points Earned                │ │
│ │                    [+50 pts]   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🎁 Reward Applied               │ │
│ │                    [$20.00]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ✨ Tier Discount               │ │
│ │                    [5% off]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [🎁 Redeem Rewards]                │
└─────────────────────────────────────┘
```

## 6. Paiements en Ligne

### Affichage lors du Checkout

Lors du paiement en ligne, les clients voient:
- Points qu'ils gagneront avec cette transaction
- Réductions de tier applicables
- Option d'échanger des points pour une réduction
- Crédit disponible à appliquer

**Exemple**:
```
Checkout Summary
─────────────────
Subtotal:          $100.00
Tier Discount (5%): -$5.00
Credit Applied:     -$20.00
─────────────────
Total:              $75.00

You'll earn: +75 points
```

## 7. Memberships

### Affichage lors de l'Achat de Membership

Lors de l'achat ou du renouvellement d'un membership:
- Points gagnés pour l'achat
- Avantages de tier appliqués
- Réductions de tier (si applicable)

**Exemple**:
```
Membership Purchase
─────────────────
Monthly Plan:      $99.99
Tier Discount (5%): -$5.00
─────────────────
Total:              $94.99

You'll earn: +95 points
Tier benefits applied automatically
```

## 8. Packages

### Affichage lors de l'Achat de Package

Lors de l'achat d'un package:
- Points gagnés
- Règles spécifiques au package (si configurées)

**Exemple**:
```
Package Purchase
─────────────────
10-Visit Package:  $450.00
─────────────────
Total:              $450.00

You'll earn: +450 points
Bonus: +50 points (package bonus)
```

## 9. Dashboard Client

### Affichage dans le Dashboard

Le dashboard client affiche:
- Solde de points actuel
- Tier actuel avec progression
- Récompenses disponibles
- Historique récent

## 10. Audit Logs

### Entrées dans les Logs d'Audit

Toutes les transactions de loyauté sont enregistrées:

```
[2026-02-15 10:30:00] Loyalty Points Earned
  Customer: Alice Smith (ID: 15)
  Points: +50
  Source: Booking (booking-123)
  Invoice: inv-456

[2026-02-15 10:31:00] Reward Redemption
  Customer: Alice Smith (ID: 15)
  Reward: $20 Credit
  Points Deducted: 500
  Applied to: inv-456

[2026-02-15 10:32:00] Invoice Updated with Loyalty
  Invoice: inv-456
  Points Earned: 50
  Points Redeemed: 500
  Credit Applied: $20
```

## Intégration Complète

Tous ces composants sont intégrés automatiquement dans:
- ✅ Factures (côté client et établissement)
- ✅ Rapports de revenus
- ✅ Profils CRM
- ✅ Réservations
- ✅ POS
- ✅ Paiements en ligne
- ✅ Memberships
- ✅ Packages
- ✅ Dashboard client
- ✅ Logs d'audit

Chaque transaction de loyauté est automatiquement reflétée dans tous les systèmes concernés.
