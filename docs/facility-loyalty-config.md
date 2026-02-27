# Facility Loyalty Configuration System

## Overview

The Facility Loyalty Configuration system is a comprehensive, rule-based configuration system that allows each facility to customize their loyalty program without any hardcoded values. All loyalty behavior is driven by facility-specific configuration.

## Key Principles

1. **Rule-Based**: Nothing is hardcoded. All behavior is configurable.
2. **Facility-Specific**: Each facility can have completely different loyalty rules.
3. **Flexible**: Supports multiple earning methods, expiration rules, tier systems, and more.
4. **Extensible**: Easy to add new reward types, earning methods, or features.

## Core Configuration Components

### 1. Points Earning Methods

Facilities can configure how customers earn points using one or more of these methods:

#### Per Dollar (`per_dollar`)
- Earn X points per $1 spent
- Supports tier-based multipliers
- Can set minimum purchase requirements
- Can cap maximum points per transaction

**Example:**
```typescript
{
  method: "per_dollar",
  perDollar: {
    enabled: true,
    basePoints: 1,  // 1 point per $1
    tierMultipliers: [
      { tierId: "tier-silver", multiplier: 1.25 },
      { tierId: "tier-gold", multiplier: 1.5 }
    ],
    minimumPurchase: 10,
    maximumPointsPerTransaction: 1000
  }
}
```

#### Per Booking (`per_booking`)
- Fixed points per booking
- Can override per service type
- Supports tier multipliers

**Example:**
```typescript
{
  method: "per_booking",
  perBooking: {
    enabled: true,
    basePoints: 50,
    serviceTypePoints: [
      { serviceType: "grooming", points: 50 },
      { serviceType: "boarding", points: 100 }
    ]
  }
}
```

#### Per Service Type (`per_service_type`)
- Different points for different service types
- Can combine with per-dollar earning

**Example:**
```typescript
{
  method: "per_service_type",
  perServiceType: {
    enabled: true,
    servicePoints: [
      { serviceType: "grooming", points: 50 },
      { serviceType: "daycare", points: 50, pointsPerDollar: 0.5 }
    ]
  }
}
```

#### Per Visit Count (`per_visit_count`)
- Bonus points at visit milestones
- e.g., 100 bonus points on 10th visit

**Example:**
```typescript
{
  method: "per_visit_count",
  perVisitCount: {
    enabled: true,
    milestones: [
      { visitCount: 10, bonusPoints: 100, description: "10th Visit Bonus" },
      { visitCount: 25, bonusPoints: 250, description: "25th Visit Bonus" }
    ]
  }
}
```

#### Hybrid (`hybrid`)
- Combine multiple earning methods
- Can add, take max, or use weighted combination

**Example:**
```typescript
{
  method: "hybrid",
  hybrid: {
    enabled: true,
    combinationMethod: "add",
    rules: [
      { /* per_dollar rule */ },
      { /* per_booking rule */ },
      { /* per_visit_count rule */ }
    ]
  }
}
```

### 2. Points Expiration

Facilities can configure when points expire:

- **None**: Points never expire
- **Time-Based**: Points expire after X months/days
- **Activity-Based**: Points expire if customer is inactive
- **Tier-Based**: Different expiration per tier

**Example:**
```typescript
{
  enabled: true,
  expirationType: "time_based",
  timeBased: {
    expirationMonths: 12,
    expirationPolicy: "fifo"  // First in, first out
  },
  warnings: {
    enabled: true,
    warnDaysBefore: [30, 14, 7],
    sendEmail: true,
    showInPortal: true
  }
}
```

### 3. Tier Configuration

Facilities can define custom loyalty tiers with:
- Minimum/maximum points
- Benefits (discounts, bonus points, free services, priority)
- Tier-specific earning multipliers
- Tier-specific discounts

**Example:**
```typescript
{
  id: "tier-gold",
  name: "Gold",
  minPoints: 1500,
  earningMultiplier: 1.5,
  discountPercentage: 10,
  discountApplicableTo: ["services", "retail"],
  benefits: [
    { type: "discount", value: 10, description: "10% discount" },
    { type: "priority", value: 1, description: "Priority booking" }
  ]
}
```

### 4. Points Scope

Defines what transactions earn points:

- **Services Only**: Only service bookings earn points
- **Retail Only**: Only retail purchases earn points
- **Both**: Both services and retail earn points

Can also configure:
- Which service types are included/excluded
- Which product categories are included/excluded
- Exclusions (gift cards, packages, memberships, etc.)

**Example:**
```typescript
{
  enabled: true,
  scope: "both",
  services: {
    enabled: true,
    serviceTypes: ["grooming", "daycare", "boarding"],
    minimumServiceAmount: 25
  },
  retail: {
    enabled: true,
    excludeSaleItems: false
  },
  exclusions: {
    giftCards: true,
    packages: false,
    memberships: false
  }
}
```

### 5. Discount Stacking Rules

Defines how loyalty discounts interact with other discounts:

- **No Stacking**: Loyalty discounts cannot stack
- **Stack with Promos**: Can stack with promo codes
- **Stack with Member**: Can stack with member discounts
- **Stack All**: Can stack with all discounts
- **Best Discount Only**: Apply only the best discount
- **Custom**: Define custom stacking rules

**Example:**
```typescript
{
  enabled: true,
  stackingBehavior: "best_discount_only",
  tierDiscountStacking: {
    enabled: true,
    canStackWithOtherDiscounts: false,
    stackingPriority: "first"
  },
  pointsRedemptionStacking: {
    enabled: true,
    canUseWithDiscounts: true,
    canUseWithPromoCodes: false,
    redemptionPriority: "after_discounts"
  }
}
```

### 6. Reward Types

Facilities can enable/configure different reward types:

- **Discount Code**: Generate a discount code
- **Credit Balance**: Add credit to customer account
- **Auto Apply**: Automatically apply discount to next booking
- **Free Service**: Free service voucher
- **Product Discount**: Discount on specific products
- **Custom**: Custom reward types

**Example:**
```typescript
[
  {
    type: "credit_balance",
    enabled: true,
    defaultExpiryDays: 90,
    applicableTo: ["services", "retail"]
  },
  {
    type: "free_service",
    enabled: true,
    defaultExpiryDays: 60,
    applicableTo: ["services"]
  }
]
```

### 7. Referral Program

Optional referral program configuration:

**Example:**
```typescript
{
  enabled: true,
  referrerReward: {
    type: "points",
    value: 200,
    description: "200 points for referring a friend"
  },
  refereeReward: {
    type: "points",
    value: 100,
    description: "100 points for new customers"
  },
  requirements: {
    minimumPurchase: 50,
    firstBookingOnly: true
  }
}
```

### 8. Special Event Rewards

Birthday, anniversary, and holiday rewards:

**Example:**
```typescript
{
  enabled: true,
  birthdayReward: {
    enabled: true,
    type: "points",
    value: 100,
    validDays: 7
  },
  holidayRewards: {
    enabled: true,
    holidays: [
      {
        holidayName: "Christmas",
        date: "12-25",
        reward: {
          type: "points",
          value: 50,
          description: "Holiday bonus"
        }
      }
    ]
  }
}
```

## Usage

### Getting Facility Configuration

```typescript
import { getFacilityLoyaltyConfig } from '@/data/facility-loyalty-config';

const config = getFacilityLoyaltyConfig(facilityId);
if (config && config.enabled) {
  // Use configuration
}
```

### Calculating Points Earned

```typescript
import { calculatePointsEarned } from '@/data/facility-loyalty-config';

const points = calculatePointsEarned(config, {
  amount: 100,
  serviceType: "grooming",
  isBooking: true,
  visitCount: 10,
  customerTier: "tier-silver"
});
```

### Checking Transaction Eligibility

```typescript
import { isTransactionEligibleForPoints } from '@/data/facility-loyalty-config';

const eligible = isTransactionEligibleForPoints(config, {
  type: "service",
  serviceType: "grooming",
  amount: 50,
  isDiscounted: false
});
```

### Getting Customer Tier

```typescript
import { getCustomerTier } from '@/data/facility-loyalty-config';

const tier = getCustomerTier(config, customerPoints);
if (tier) {
  console.log(`Customer is ${tier.displayName}`);
}
```

### Checking Discount Stacking

```typescript
import { canStackDiscounts } from '@/data/facility-loyalty-config';

const canStack = canStackDiscounts(config, ["promo_code", "member_discount"]);
```

## Implementation Notes

1. **Database Storage**: In production, configurations should be stored in a database table (e.g., `facility_loyalty_configs`).

2. **Admin Interface**: Facilities should be able to configure these settings through an admin interface.

3. **Validation**: All configuration should be validated before saving to ensure:
   - Required fields are present
   - Values are within acceptable ranges
   - No conflicting rules

4. **Migration**: When updating configurations, consider:
   - Versioning configurations
   - Migrating existing customer data
   - Handling edge cases

5. **Performance**: Consider caching configurations for frequently accessed facilities.

6. **Testing**: Test all earning methods, expiration rules, and stacking behaviors thoroughly.

## Example Configurations

See `src/data/facility-loyalty-config.ts` for example configurations:
- `exampleSimplePerDollarConfig`: Simple per-dollar earning
- `examplePerBookingConfig`: Per-booking earning
- `exampleHybridWithMilestonesConfig`: Hybrid with visit milestones

## Migration from Old System

The old `LoyaltySettings` interface in `src/data/marketing.ts` is deprecated but kept for backward compatibility. To migrate:

1. Convert existing `LoyaltySettings` to `FacilityLoyaltyConfig`
2. Update code to use new configuration system
3. Remove old interface once migration is complete
