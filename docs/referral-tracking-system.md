# Referral Tracking System

## Overview

The Referral Tracking System provides comprehensive tracking and validation for referral relationships, ensuring rewards are issued correctly and preventing abuse.

## Key Features

### 1. Referral Relationship Tracking

Tracks the complete lifecycle of a referral:
- **Referrer ID**: The customer who made the referral
- **Referred Customer ID**: The customer who was referred
- **Referral Code**: The code used for the referral
- **First Booking Date**: When the first booking was completed
- **Booking Value**: Value of the first booking and total bookings
- **Reward Trigger Status**: Whether conditions are met for reward
- **Reward Issued Status**: Whether reward has been issued

### 2. Validation & Abuse Prevention

#### Self-Referral Prevention
```typescript
// Automatically detected and blocked
if (referrerId === referredCustomerId) {
  // Error: Self-referrals are not allowed
}
```

#### Duplicate Prevention
- Checks for existing referral relationships
- Prevents multiple rewards for the same referral
- Tracks reward issuance status

#### Booking Validation
Rewards only trigger when:
- ✅ Booking is **completed** (not pending/cancelled)
- ✅ Booking is **not refunded**
- ✅ Booking is **not cancelled**
- ✅ Meets **minimum purchase** requirement (if configured)
- ✅ Is **first booking** (if `firstBookingOnly` is enabled)

### 3. Reward Trigger Logic

Rewards trigger automatically when:
1. Referred customer completes their first booking
2. Booking meets minimum purchase requirement (if configured)
3. Booking is not cancelled or refunded
4. Reward hasn't been issued already

## Data Structures

### ReferralRelationship

```typescript
interface ReferralRelationship {
  id: string;
  referrerId: number;
  referredCustomerId: number;
  referralCode: string;
  facilityId: number;
  createdAt: string;
  status: "pending" | "active" | "completed" | "cancelled";
  
  // Booking tracking
  firstBookingId?: string;
  firstBookingDate?: string;
  firstBookingValue?: number;
  totalBookingValue?: number;
  
  // Reward tracking
  referrerRewardStatus: "pending" | "eligible" | "issued" | "cancelled";
  referrerRewardIssuedAt?: string;
  referrerRewardValue?: number | string;
  referrerRewardType?: "points" | "credit" | "discount";
  
  refereeRewardStatus: "pending" | "eligible" | "issued" | "cancelled";
  refereeRewardIssuedAt?: string;
  refereeRewardValue?: number | string;
  refereeRewardType?: "points" | "credit" | "discount";
  
  // Validation flags
  isSelfReferral: boolean;
  isDuplicate: boolean;
  validationNotes?: string;
}
```

### ReferralEvent

Tracks all events related to referrals:
- `booking_created`: When a booking is created
- `booking_completed`: When a booking is completed
- `booking_cancelled`: When a booking is cancelled
- `booking_refunded`: When a booking is refunded
- `reward_issued`: When a reward is issued
- `reward_cancelled`: When a reward is cancelled

## Usage

### 1. Create Referral Relationship

When a new customer signs up with a referral code:

```typescript
import { createReferralRelationship, validateReferral } from '@/data/referral-tracking';

// Validate first
const validation = validateReferral(
  referrerId,
  referredCustomerId,
  referralCode,
  facilityId
);

if (!validation.isValid) {
  // Handle errors
  console.error(validation.errors);
  return;
}

// Create relationship
const relationship = createReferralRelationship(
  referrerId,
  referredCustomerId,
  referralCode,
  facilityId
);
```

### 2. Process Booking Completion

When a booking is completed, check for referral rewards:

```typescript
import { processBookingForReferral } from '@/data/referral-tracking';
import { getFacilityLoyaltyConfig } from '@/data/facility-loyalty-config';

// Get referral program config
const loyaltyConfig = getFacilityLoyaltyConfig(facilityId);
const referralProgram = loyaltyConfig?.referralProgram;

// Process booking
const result = processBookingForReferral(
  {
    id: booking.id,
    customerId: booking.customerId,
    value: booking.totalAmount,
    status: booking.status,
    isRefunded: booking.isRefunded,
    isCancelled: booking.isCancelled,
    completedAt: booking.completedAt,
  },
  referralProgram
);

if (result.referrerRewardIssued) {
  // Issue reward to referrer
  // e.g., add credit, points, or discount code
  await issueReward(
    result.relationship.referrerId,
    result.relationship.referrerRewardValue,
    result.relationship.referrerRewardType
  );
}

if (result.refereeRewardIssued) {
  // Issue reward to referee
  await issueReward(
    result.relationship.referredCustomerId,
    result.relationship.refereeRewardValue,
    result.relationship.refereeRewardType
  );
}
```

### 3. Handle Booking Cancellation/Refund

When a booking is cancelled or refunded:

```typescript
import { handleBookingCancellationForReferral } from '@/data/referral-tracking';

const result = handleBookingCancellationForReferral(
  bookingId,
  customerId
);

if (result.rewardsCancelled) {
  // Reverse rewards that were issued
  await reverseReward(
    result.relationship.referrerId,
    result.relationship.referrerRewardValue,
    result.relationship.referrerRewardType
  );
}
```

### 4. Get Referral Statistics

```typescript
import { getReferralStats } from '@/data/referral-tracking';

const stats = getReferralStats(referrerId);

console.log({
  totalReferrals: stats.totalReferrals,
  activeReferrals: stats.activeReferrals,
  completedReferrals: stats.completedReferrals,
  rewardsEarned: stats.rewardsEarned,
  rewardsPending: stats.rewardsPending,
  totalRewardValue: stats.totalRewardValue,
});
```

### 5. Get Referral Relationships

```typescript
import { getReferralRelationshipsByReferrer } from '@/data/referral-tracking';

const relationships = getReferralRelationshipsByReferrer(referrerId);

// Display in UI
relationships.forEach(rel => {
  console.log({
    referredCustomer: rel.referredCustomerId,
    status: rel.status,
    rewardStatus: rel.referrerRewardStatus,
    firstBookingDate: rel.firstBookingDate,
  });
});
```

## Integration Points

### 1. Customer Signup

When a new customer signs up with a referral code:

```typescript
// In signup handler
if (referralCode) {
  const referrer = await findReferrerByCode(referralCode);
  if (referrer) {
    await createReferralRelationship(
      referrer.id,
      newCustomer.id,
      referralCode,
      facilityId
    );
  }
}
```

### 2. Booking Completion

In your booking completion handler:

```typescript
// After booking is marked as completed
if (booking.status === 'completed' && !booking.isRefunded) {
  await processBookingForReferral(booking, referralProgram);
}
```

### 3. Booking Cancellation

In your booking cancellation handler:

```typescript
// When booking is cancelled or refunded
if (booking.isCancelled || booking.isRefunded) {
  await handleBookingCancellationForReferral(booking.id, booking.customerId);
}
```

## Validation Rules

### Self-Referral Check
- ✅ Prevents customers from referring themselves
- ✅ Automatically flagged in relationship

### Duplicate Check
- ✅ Prevents multiple referral relationships between same customers
- ✅ Prevents duplicate reward issuance

### Booking Validation
- ✅ Must be completed (not pending)
- ✅ Must not be cancelled
- ✅ Must not be refunded
- ✅ Must meet minimum purchase (if configured)
- ✅ Must be first booking (if `firstBookingOnly` is enabled)

## Reward Types Supported

1. **Points**: Add loyalty points to customer account
2. **Credit**: Add credit balance to customer account
3. **Discount**: Generate discount code or apply discount

## Event Tracking

All referral events are logged for audit purposes:
- Relationship creation
- Booking events
- Reward issuance
- Reward cancellation

## Database Schema (Production)

In production, you'll need these tables:

```sql
-- Referral Relationships
CREATE TABLE referral_relationships (
  id UUID PRIMARY KEY,
  referrer_id INTEGER NOT NULL,
  referred_customer_id INTEGER NOT NULL,
  referral_code VARCHAR(50) NOT NULL,
  facility_id INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,
  first_booking_id UUID,
  first_booking_date TIMESTAMP,
  first_booking_value DECIMAL(10,2),
  total_booking_value DECIMAL(10,2),
  referrer_reward_status VARCHAR(20),
  referrer_reward_issued_at TIMESTAMP,
  referrer_reward_value VARCHAR(50),
  referrer_reward_type VARCHAR(20),
  referee_reward_status VARCHAR(20),
  referee_reward_issued_at TIMESTAMP,
  referee_reward_value VARCHAR(50),
  referee_reward_type VARCHAR(20),
  is_self_referral BOOLEAN DEFAULT FALSE,
  is_duplicate BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(referrer_id, referred_customer_id, facility_id)
);

-- Referral Events
CREATE TABLE referral_events (
  id UUID PRIMARY KEY,
  referral_relationship_id UUID NOT NULL REFERENCES referral_relationships(id),
  event_type VARCHAR(50) NOT NULL,
  booking_id UUID,
  booking_value DECIMAL(10,2),
  reward_value VARCHAR(50),
  reward_type VARCHAR(20),
  timestamp TIMESTAMP NOT NULL,
  notes TEXT
);

-- Indexes
CREATE INDEX idx_referral_relationships_referrer ON referral_relationships(referrer_id);
CREATE INDEX idx_referral_relationships_referred ON referral_relationships(referred_customer_id);
CREATE INDEX idx_referral_events_relationship ON referral_events(referral_relationship_id);
```

## Testing

### Test Cases

1. **Self-Referral Prevention**
   - Try to refer yourself → Should fail validation

2. **Duplicate Prevention**
   - Try to create duplicate referral → Should fail validation

3. **Reward Trigger**
   - Complete first booking → Reward should trigger
   - Complete second booking → Reward should NOT trigger (if firstBookingOnly)

4. **Minimum Purchase**
   - Booking below minimum → Reward should NOT trigger
   - Booking above minimum → Reward should trigger

5. **Cancellation Handling**
   - Cancel booking after reward issued → Reward should be cancelled

6. **Refund Handling**
   - Refund booking after reward issued → Reward should be cancelled

## Security Considerations

1. **Validation**: All referral actions are validated before processing
2. **Audit Trail**: All events are logged for audit purposes
3. **Idempotency**: Duplicate reward issuance is prevented
4. **Status Tracking**: Clear status tracking prevents race conditions

## Future Enhancements

- Multi-level referrals (referrer's referrer gets reward)
- Referral expiration dates
- Referral code usage limits
- Referral analytics dashboard
- Automated reward issuance via webhooks
