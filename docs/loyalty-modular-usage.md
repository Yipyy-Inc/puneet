# Loyalty System - Modular Usage Guide

## Overview

The loyalty system is designed to be fully modular, configurable, and permission-controlled. This guide shows how to use the system correctly.

## Core Principles

1. **Always check if enabled** before showing loyalty features
2. **Use hooks** for configuration access
3. **Use guard components** for conditional rendering
4. **Respect permissions** at all times
5. **Support multi-location** configurations

## Usage Patterns

### 1. Basic Component Guard

```tsx
import { LoyaltyModuleGuard } from "@/components/loyalty/LoyaltyModuleGuard";

function MyComponent() {
  return (
    <LoyaltyModuleGuard>
      <LoyaltyDashboard />
    </LoyaltyModuleGuard>
  );
}
```

### 2. Feature-Specific Guard

```tsx
import { ConditionalLoyaltyFeature } from "@/components/loyalty/ConditionalLoyaltyFeature";

function MyComponent() {
  return (
    <>
      <ConditionalLoyaltyFeature feature="points">
        <PointsDisplay />
      </ConditionalLoyaltyFeature>

      <ConditionalLoyaltyFeature feature="referrals">
        <ReferralSection />
      </ConditionalLoyaltyFeature>
    </>
  );
}
```

### 3. Permission-Based Guard

```tsx
import { LoyaltyModuleGuard } from "@/components/loyalty/LoyaltyModuleGuard";

function ReportsPage() {
  return (
    <LoyaltyModuleGuard requirePermission="reports">
      <LoyaltyReports />
    </LoyaltyModuleGuard>
  );
}
```

### 4. Using Hooks

```tsx
import { useLoyaltyConfig } from "@/hooks/use-loyalty-config";

function MyComponent() {
  const {
    isEnabled,
    features,
    canViewLoyalty,
    canManageLoyalty,
  } = useLoyaltyConfig();

  if (!isEnabled) {
    return <LoyaltyDisabledMessage />;
  }

  if (!canViewLoyalty) {
    return <AccessDenied />;
  }

  return (
    <>
      {features.pointsEnabled && <PointsDisplay />}
      {features.referralsEnabled && <ReferralSection />}
    </>
  );
}
```

### 5. Customer-Facing Features

```tsx
import { useCustomerLoyaltyAccess } from "@/hooks/use-loyalty-config";

function CustomerRewardsPage() {
  const { canViewLoyalty, canRedeemRewards, canViewReferrals } = 
    useCustomerLoyaltyAccess();

  if (!canViewLoyalty) {
    return <NotAvailable />;
  }

  return (
    <>
      {canRedeemRewards && <RewardsSection />}
      {canViewReferrals && <ReferralSection />}
    </>
  );
}
```

### 6. Location-Aware Usage

```tsx
import { useLoyaltyConfig } from "@/hooks/use-loyalty-config";

function LocationSpecificComponent({ locationId }: { locationId: number }) {
  const { isEnabledForLocation, getLocationConfig } = useLoyaltyConfig(locationId);

  if (!isEnabledForLocation(locationId)) {
    return <NotAvailableForLocation />;
  }

  const locationConfig = getLocationConfig(locationId);
  // Use location-specific config
}
```

## Integration Examples

### Booking Completion

```tsx
import { integrateBookingCompletion } from "@/lib/loyalty-integrations";
import { useLoyaltyConfig } from "@/hooks/use-loyalty-config";

async function handleBookingComplete(booking: Booking) {
  const { isEnabled, config } = useLoyaltyConfig();
  
  if (!isEnabled || !config) {
    return; // Skip loyalty processing
  }

  const result = integrateBookingCompletion(booking, config);
  // Process result...
}
```

### POS Transaction

```tsx
import { integratePOSTransaction } from "@/lib/loyalty-integrations";
import { useLoyaltyConfig } from "@/hooks/use-loyalty-config";

async function handlePOSTransaction(transaction: POSTransaction) {
  const { isEnabled, config, isEnabledForLocation } = useLoyaltyConfig(transaction.locationId);
  
  if (!isEnabled || !isEnabledForLocation(transaction.locationId)) {
    return; // Skip loyalty processing
  }

  const result = integratePOSTransaction(transaction, config);
  // Process result...
}
```

## Permission Checks

### In Components

```tsx
import { hasLoyaltyPermission } from "@/lib/loyalty-permissions";

function MyComponent({ userRole }: { userRole: string }) {
  const canManage = hasLoyaltyPermission(userRole, "loyalty.manage");
  const canViewReports = hasLoyaltyPermission(userRole, "loyalty.reports.view");

  return (
    <>
      {canManage && <ManageButton />}
      {canViewReports && <ReportsLink />}
    </>
  );
}
```

## Configuration Access

### Never Hardcode Values

❌ **BAD**:
```tsx
const pointsPerDollar = 1; // Hardcoded
const points = amount * pointsPerDollar;
```

✅ **GOOD**:
```tsx
const { config } = useLoyaltyConfig();
if (config?.pointsEarning?.perDollar?.enabled) {
  const points = calculatePointsEarned(config, { amount, type: "booking" });
}
```

## Multi-Location Support

```tsx
import { getLocationLoyaltyConfig } from "@/lib/loyalty-location-config";

function LocationComponent({ locationId }: { locationId: number }) {
  const config = getLocationLoyaltyConfig(facilityId, locationId);
  
  if (!config || !config.enabled) {
    return <NotAvailable />;
  }

  // Use location-specific config
  const points = calculatePointsEarned(config, transaction);
}
```

## Best Practices

1. **Always use guards** for conditional rendering
2. **Check permissions** before showing features
3. **Use hooks** instead of direct config access
4. **Respect location settings** when applicable
5. **Handle disabled state** gracefully
6. **Log access attempts** for audit
7. **Cache configurations** for performance
8. **Validate configs** before using

## Error Handling

```tsx
function LoyaltyComponent() {
  const { isEnabled, config } = useLoyaltyConfig();

  if (!isEnabled) {
    return <LoyaltyDisabledMessage />;
  }

  if (!config) {
    return <ConfigurationError />;
  }

  try {
    // Use config
  } catch (error) {
    return <ErrorDisplay error={error} />;
  }
}
```
