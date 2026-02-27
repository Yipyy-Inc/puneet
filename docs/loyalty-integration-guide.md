# Loyalty & Referral Integration Guide

## Overview

This guide explains how the Loyalty & Referral system integrates with all modules of the Yipyy platform to ensure consistent tracking, reporting, and user experience.

## Integration Points

### 1. Bookings Integration

When a booking is completed, the system automatically:

1. **Calculates loyalty points** based on facility configuration
2. **Updates the invoice** with points earned
3. **Updates CRM profile** with new points balance
4. **Triggers automation** events (e.g., tier upgrade notifications)
5. **Logs to audit trail**

#### Example Flow

```typescript
import { integrateBookingCompletion } from '@/lib/loyalty-integrations';
import { getFacilityLoyaltyConfig } from '@/data/facility-loyalty-config';

// When booking is completed
const loyaltyConfig = getFacilityLoyaltyConfig(facilityId);
const result = integrateBookingCompletion({
  id: booking.id,
  customerId: booking.customerId,
  facilityId: booking.facilityId,
  invoiceId: booking.invoiceId,
  amount: booking.totalAmount,
  serviceType: booking.serviceType,
  status: 'completed',
  completedAt: booking.completedAt,
}, loyaltyConfig);

// Result includes:
// - loyaltyTransaction: Points earned
// - auditLog: Audit trail entry
```

### 2. POS Integration

When a POS transaction is completed:

1. **Calculates loyalty points** for eligible purchases
2. **Updates the invoice** with points earned
3. **Applies rewards** if customer redeems points
4. **Updates revenue reports** with reward impact

#### Example Flow

```typescript
import { integratePOSTransaction } from '@/lib/loyalty-integrations';

// When POS transaction completes
const result = integratePOSTransaction({
  id: transaction.id,
  customerId: transaction.customerId,
  facilityId: transaction.facilityId,
  invoiceId: transaction.invoiceId,
  amount: transaction.total,
  items: transaction.items,
}, loyaltyConfig);

// If customer redeems reward at POS
if (redeemReward) {
  const redemption = integrateRewardRedemption(
    customerId,
    facilityId,
    reward,
    transaction.invoiceId
  );
  
  // Apply discount/credit to transaction
  applyDiscountToTransaction(transaction.id, redemption.discountCode);
  applyCreditToTransaction(transaction.id, redemption.creditTransaction);
}
```

### 3. Online Payments Integration

When an online payment is processed:

1. **Calculates loyalty points** for the payment
2. **Updates invoice** with points earned
3. **Applies rewards** if customer redeems during checkout
4. **Updates payment record** with loyalty information

#### Example Flow

```typescript
// During checkout
const payment = await processPayment({
  customerId,
  amount,
  invoiceId,
});

// After payment success
const loyaltyTransaction = processLoyaltyPointsEarning(
  customerId,
  facilityId,
  {
    amount: payment.amount,
    type: 'online_payment',
    sourceId: payment.id,
    invoiceId: payment.invoiceId,
  },
  loyaltyConfig
);

// If customer applied reward during checkout
if (appliedReward) {
  const redemption = integrateRewardRedemption(
    customerId,
    facilityId,
    appliedReward,
    payment.invoiceId
  );
}
```

### 4. Memberships Integration

When a membership is purchased or renewed:

1. **Calculates loyalty points** for membership purchase
2. **Applies tier benefits** if customer is in a loyalty tier
3. **Updates membership record** with loyalty information
4. **Triggers automation** for membership + loyalty events

#### Example Flow

```typescript
// When membership is purchased
const membership = await createMembership({
  customerId,
  facilityId,
  planId,
  amount,
});

// Process loyalty points
const loyaltyTransaction = processLoyaltyPointsEarning(
  customerId,
  facilityId,
  {
    amount: membership.amount,
    type: 'membership',
    sourceId: membership.id,
  },
  loyaltyConfig
);

// Apply tier discount if applicable
const tier = getCustomerTier(loyaltyConfig, customerPoints);
if (tier?.discountPercentage) {
  applyTierDiscount(membership.id, tier.discountPercentage);
}
```

### 5. Packages Integration

When a package is purchased:

1. **Calculates loyalty points** for package purchase
2. **Applies package-specific earning rules** if configured
3. **Updates package record** with loyalty information

#### Example Flow

```typescript
// When package is purchased
const package = await createPackage({
  customerId,
  facilityId,
  packageId,
  amount,
});

// Process loyalty points
const loyaltyTransaction = processLoyaltyPointsEarning(
  customerId,
  facilityId,
  {
    amount: package.amount,
    type: 'package',
    sourceId: package.id,
  },
  loyaltyConfig
);
```

### 6. Automation Builder Integration

Loyalty events trigger automation workflows:

1. **Points earned** → Send notification, check for tier upgrade
2. **Tier upgraded** → Send congratulations email, apply tier benefits
3. **Reward redeemed** → Send confirmation, update customer profile
4. **Referral completed** → Send thank you message, issue rewards

#### Example Automation Rules

```typescript
// Automation: Tier Upgrade Notification
triggerAutomationEvent('loyalty_tier_upgraded', {
  customerId,
  facilityId,
  oldTier: 'bronze',
  newTier: 'silver',
  points: customerPoints,
});

// Automation: Reward Redemption Confirmation
triggerAutomationEvent('reward_redeemed', {
  customerId,
  facilityId,
  rewardId: reward.id,
  rewardType: reward.type,
  rewardValue: reward.value,
});
```

### 7. CRM Profile Integration

Loyalty data is displayed in CRM profiles:

1. **Current points balance**
2. **Lifetime points earned**
3. **Current tier**
4. **Rewards redeemed**
5. **Referrals made**
6. **Last activity date**

#### Example Update

```typescript
// Update CRM profile with loyalty data
updateCRMProfile(customerId, facilityId, {
  currentPoints: 1250,
  lifetimePoints: 2100,
  currentTier: 'tier-silver',
  totalRewardsRedeemed: 3,
  totalReferrals: 5,
  lastActivityDate: new Date().toISOString(),
});
```

### 8. Reporting Integration

Loyalty transactions are included in all financial reports:

1. **Revenue Reports**: Show impact of rewards on revenue
2. **Loyalty Reports**: Points earned/redeemed, tier distribution
3. **Referral Reports**: Referrals made, rewards issued
4. **Customer Reports**: Loyalty activity per customer

#### Example Report Update

```typescript
// Update revenue report with loyalty impact
updateRevenueReport(facilityId, {
  startDate: '2026-01-01',
  endDate: '2026-01-31',
}, {
  totalRevenue: 50000,
  loyaltyPointsEarned: 50000,
  rewardsRedeemed: 150,
  rewardsValue: 3000, // Total value of rewards redeemed
  referralRewardsIssued: 25,
  referralRewardsValue: 500, // Total value of referral rewards
});
```

## Complete Integration Example: Reward Redemption

When a customer redeems a $20 credit reward:

### Step 1: Redemption Processing

```typescript
const redemption = integrateRewardRedemption(
  customerId,
  facilityId,
  {
    id: 'reward-001',
    type: 'credit',
    value: 20,
    requiredPoints: 500,
  },
  invoiceId
);
```

### Step 2: Invoice Update

The invoice is automatically updated with:
- **Loyalty Points Redeemed**: 500 points
- **Reward Redemption ID**: redemption.id
- **Credit Applied**: $20
- **Line Item**: "Loyalty Reward - $20 Credit"

```typescript
// Invoice now shows:
{
  subtotal: 100,
  discounts: [],
  credits: [
    {
      type: 'loyalty_reward',
      amount: 20,
      redemptionId: redemption.id,
    }
  ],
  loyaltyPointsRedeemed: 500,
  total: 80,
}
```

### Step 3: Revenue Report Update

The revenue report reflects:
- **Gross Revenue**: $100
- **Rewards Redeemed**: $20
- **Net Revenue**: $80

```typescript
updateRevenueReport(facilityId, period, {
  totalRevenue: 100,
  rewardsRedeemed: 1,
  rewardsValue: 20,
  // ... other metrics
});
```

### Step 4: Loyalty Deduction

Customer's loyalty balance is updated:
- **Previous Points**: 1250
- **Points Deducted**: 500
- **New Balance**: 750

```typescript
// Loyalty transaction created
{
  transactionType: 'redeemed',
  points: -500,
  description: 'Redeemed 500 points for $20 credit',
  source: 'manual',
}
```

### Step 5: Audit Log

Complete audit trail entry:

```typescript
{
  action: 'reward_redemption_completed',
  entityType: 'reward',
  entityId: redemption.id,
  changes: {
    rewardId: 'reward-001',
    rewardType: 'credit',
    pointsDeducted: 500,
    creditAmount: 20,
    invoiceId: invoiceId,
  },
  timestamp: '2026-02-15T10:30:00Z',
}
```

## Integration Checklist

When implementing loyalty/referral features, ensure:

- [ ] **Invoice Integration**: Points earned/redeemed shown on invoice
- [ ] **Revenue Report Integration**: Rewards impact reflected in reports
- [ ] **Loyalty Deduction**: Points balance updated correctly
- [ ] **Audit Log**: All transactions logged
- [ ] **CRM Profile**: Loyalty data visible in customer profile
- [ ] **Automation Triggers**: Events trigger appropriate workflows
- [ ] **Real-time Updates**: Changes reflected immediately
- [ ] **Error Handling**: Failed transactions are handled gracefully
- [ ] **Validation**: All transactions validated before processing
- [ ] **Idempotency**: Duplicate transactions prevented

## Best Practices

1. **Always validate** before processing loyalty transactions
2. **Log everything** to audit trail for compliance
3. **Update all systems** atomically (use transactions)
4. **Handle errors gracefully** with rollback capability
5. **Test integrations** thoroughly before deployment
6. **Monitor performance** of integration points
7. **Document custom integrations** for future reference

## Database Schema Requirements

For production, ensure these tables exist:

- `loyalty_transactions` - All loyalty point transactions
- `reward_redemptions` - All reward redemptions
- `audit_logs` - Complete audit trail
- `referral_relationships` - Referral tracking
- `referral_events` - Referral event history

See `docs/referral-tracking-system.md` for detailed schema.
