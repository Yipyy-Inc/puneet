# Loyalty & Referral System Architecture

## Design Principles

This system follows strict architectural principles to ensure:
- **Fully configurable per facility** - No hardcoded values
- **Modular** - Can be completely disabled
- **Multi-location aware** - Supports different settings per location
- **Role-permission controlled** - Access based on user roles
- **Scalable for SaaS** - Handles multiple facilities efficiently
- **No hardcoded logic** - All behavior driven by configuration

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Facility Layer                        │
│  ┌───────────────────────────────────────────────────┐ │
│  │         Facility Loyalty Config                     │ │
│  │  - Enabled/Disabled                                 │ │
│  │  - Points Earning Rules                             │ │
│  │  - Tiers Configuration                              │ │
│  │  - Rewards Configuration                            │ │
│  │  - Referral Program                                 │ │
│  └───────────────────────────────────────────────────┘ │
│                          │                               │
│                          ▼                               │
│  ┌───────────────────────────────────────────────────┐ │
│  │         Location Overrides (Optional)              │ │
│  │  - Location-specific earning rules                 │ │
│  │  - Location-specific restrictions                  │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Permission Layer                        │
│  ┌───────────────────────────────────────────────────┐ │
│  │         Role-Based Permissions                     │ │
│  │  - facility_admin: Full access                     │ │
│  │  - manager: Manage + Reports                       │ │
│  │  - staff: View + Redeem                            │ │
│  │  - front_desk: View only                          │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Integration Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Bookings │  │   POS    │  │ Payments │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│       │             │              │                     │
│       └─────────────┴──────────────┘                    │
│                    │                                     │
│                    ▼                                     │
│         Loyalty Integration Service                      │
│         - Process points earning                         │
│         - Handle reward redemption                       │
│         - Track referrals                                │
│         - Update audit logs                              │
└─────────────────────────────────────────────────────────┘
```

## Configuration Hierarchy

### 1. Facility-Level Configuration

**File**: `src/data/facility-loyalty-config.ts`

```typescript
interface FacilityLoyaltyConfig {
  facilityId: number;
  enabled: boolean; // Master switch
  
  // All configuration is here - nothing hardcoded
  pointsEarning: PointsEarningRule;
  pointsExpiration: PointsExpirationConfig;
  tiers: LoyaltyTierConfig[];
  rewardTypes: RewardTypeConfig[];
  pointsScope: PointsScopeConfig;
  discountStacking: DiscountStackingConfig;
  referralProgram?: ReferralProgramConfig;
}
```

### 2. Location-Level Overrides (Optional)

**File**: `src/lib/loyalty-location-config.ts`

```typescript
interface LocationLoyaltyConfig {
  locationId: number;
  facilityId: number;
  enabled: boolean; // Can disable per location
  
  // Override facility defaults
  overridePointsEarning?: boolean;
  overrideTiers?: boolean;
  overrideRewards?: boolean;
  
  // Location-specific settings
  pointsEarning?: PointsEarningRule;
  restrictions?: {
    serviceTypes?: string[];
    minimumPurchase?: number;
  };
}
```

### 3. Permission Configuration

**File**: `src/lib/loyalty-permissions.ts`

```typescript
// Role-based permissions
const defaultLoyaltyPermissions = {
  facility_admin: ["loyalty.*"], // All permissions
  manager: ["loyalty.view", "loyalty.manage", "loyalty.reports.view"],
  staff: ["loyalty.view", "loyalty.rewards.redeem"],
  front_desk: ["loyalty.view"],
};
```

## Modular Design

### Enable/Disable at Multiple Levels

1. **Platform Level**: Can disable loyalty module entirely for all facilities
2. **Facility Level**: Each facility can enable/disable independently
3. **Location Level**: Can disable for specific locations
4. **Feature Level**: Can disable individual features (points, tiers, rewards, referrals)

### Implementation

```typescript
// Check if module is available
const { isEnabled } = useLoyaltyConfig();

// Check if feature is available
const { features } = useLoyaltyConfig();
if (features.pointsEnabled) {
  // Show points features
}

// Conditional rendering
<LoyaltyModuleGuard requireFeature="points">
  <PointsDisplay />
</LoyaltyModuleGuard>
```

## Multi-Location Support

### Location-Aware Configuration

```typescript
// Get config for specific location
const config = getLocationLoyaltyConfig(facilityId, locationId);

// Check if enabled for location
const enabled = isLoyaltyEnabledForLocation(facilityId, locationId);

// Get effective config (merges facility + location)
const effective = getEffectiveLoyaltyConfig(facilityId, locationId);
```

### Use Cases

- **Different earning rates per location**: Downtown location earns 2x points
- **Location-specific restrictions**: Airport location doesn't earn points on retail
- **Location-specific rewards**: Only certain locations offer specific rewards

## Permission System

### Permission Types

```typescript
type LoyaltyPermission =
  | "loyalty.view"              // View loyalty features
  | "loyalty.manage"            // Manage settings
  | "loyalty.reports.view"      // View reports
  | "loyalty.reports.export"    // Export reports
  | "loyalty.rewards.manage"    // Manage rewards
  | "loyalty.rewards.issue"     // Issue rewards manually
  | "loyalty.rewards.redeem"    // Redeem rewards
  | "loyalty.points.adjust"     // Adjust points manually
  | "loyalty.referrals.manage"  // Manage referral program
  | "loyalty.referrals.view"    // View referrals
  | "loyalty.settings.manage";  // Manage configuration
```

### Usage

```typescript
// Check permission
if (hasLoyaltyPermission(userRole, "loyalty.reports.view")) {
  // Show reports
}

// Guard component
<LoyaltyModuleGuard requirePermission="manage">
  <LoyaltySettings />
</LoyaltyModuleGuard>
```

## Scalability for SaaS

### Database Schema (Production)

```sql
-- Facility loyalty configs
CREATE TABLE facility_loyalty_configs (
  id UUID PRIMARY KEY,
  facility_id INTEGER NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  config JSONB NOT NULL, -- Full FacilityLoyaltyConfig
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(facility_id)
);

-- Location overrides
CREATE TABLE location_loyalty_configs (
  id UUID PRIMARY KEY,
  location_id INTEGER NOT NULL,
  facility_id INTEGER NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  override_config JSONB, -- Partial config overrides
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(location_id)
);

-- Permission overrides (optional)
CREATE TABLE loyalty_permission_overrides (
  id UUID PRIMARY KEY,
  facility_id INTEGER NOT NULL,
  user_id INTEGER,
  role VARCHAR(50),
  permissions TEXT[] NOT NULL,
  created_at TIMESTAMP NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_facility_loyalty_configs_facility ON facility_loyalty_configs(facility_id);
CREATE INDEX idx_location_loyalty_configs_location ON location_loyalty_configs(location_id);
CREATE INDEX idx_location_loyalty_configs_facility ON location_loyalty_configs(facility_id);
```

### Caching Strategy

```typescript
// Cache facility configs (TTL: 5 minutes)
const facilityConfigCache = new Map<number, {
  config: FacilityLoyaltyConfig;
  expiresAt: number;
}>();

// Cache location configs (TTL: 5 minutes)
const locationConfigCache = new Map<string, {
  config: LocationLoyaltyConfig | null;
  expiresAt: number;
}>();

// Invalidate on config updates
function invalidateLoyaltyCache(facilityId: number, locationId?: number) {
  facilityConfigCache.delete(facilityId);
  if (locationId) {
    locationConfigCache.delete(`${facilityId}-${locationId}`);
  }
}
```

## No Hardcoded Logic

### All Logic is Configuration-Driven

❌ **BAD** (Hardcoded):
```typescript
// DON'T DO THIS
const pointsEarned = transactionAmount * 1; // Hardcoded 1 point per dollar
```

✅ **GOOD** (Configuration-driven):
```typescript
// DO THIS
const config = getFacilityLoyaltyConfig(facilityId);
const pointsEarned = calculatePointsEarned(config, transaction);
// calculatePointsEarned reads from config.pointsEarning
```

### Configuration Examples

All earning rules, tier thresholds, reward types, etc. come from configuration:

```typescript
// Points earning - from config
const rule = config.pointsEarning;
if (rule.perDollar?.enabled) {
  points = amount * rule.perDollar.basePoints;
}

// Tier thresholds - from config
const tier = config.tiers.find(t => points >= t.minPoints);

// Reward types - from config
const availableRewards = config.rewardTypes.filter(rt => rt.enabled);
```

## Component Usage

### Conditional Rendering

```tsx
// Only show if loyalty is enabled
<LoyaltyModuleGuard>
  <LoyaltyDashboard />
</LoyaltyModuleGuard>

// Only show if points feature is enabled
<ConditionalLoyaltyFeature feature="points">
  <PointsDisplay />
</ConditionalLoyaltyFeature>

// Only show if user has permission
<LoyaltyModuleGuard requirePermission="reports">
  <LoyaltyReports />
</LoyaltyModuleGuard>
```

### Hook Usage

```tsx
// In components
const { isEnabled, features, canViewLoyalty } = useLoyaltyConfig();

if (!isEnabled) {
  return <LoyaltyDisabledMessage />;
}

if (!features.pointsEnabled) {
  return null; // Don't show points features
}

if (!canViewLoyalty) {
  return <AccessDenied />;
}
```

## Testing Strategy

### Unit Tests

```typescript
describe("Loyalty Configuration", () => {
  it("should return null if facility has no config", () => {
    const config = getFacilityLoyaltyConfig(999);
    expect(config).toBeNull();
  });

  it("should respect enabled flag", () => {
    const config = getFacilityLoyaltyConfig(1);
    expect(config?.enabled).toBe(true);
  });

  it("should calculate points from config", () => {
    const config = getFacilityLoyaltyConfig(1);
    const points = calculatePointsEarned(config, {
      amount: 100,
      type: "booking",
    });
    expect(points).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
describe("Loyalty Integration", () => {
  it("should process booking and earn points", async () => {
    const result = integrateBookingCompletion(booking, config);
    expect(result.loyaltyTransaction).toBeDefined();
    expect(result.loyaltyTransaction.points).toBeGreaterThan(0);
  });

  it("should respect location restrictions", () => {
    const config = getLocationLoyaltyConfig(facilityId, locationId);
    const eligible = isTransactionEligibleForPoints(config, transaction);
    expect(eligible).toBe(true);
  });
});
```

## Migration Path

### From Hardcoded to Configurable

1. **Phase 1**: Move all hardcoded values to config
2. **Phase 2**: Add facility-level configuration UI
3. **Phase 3**: Add location-level overrides
4. **Phase 4**: Add permission system
5. **Phase 5**: Add caching and optimization

## Best Practices

1. **Always check `isEnabled`** before processing loyalty logic
2. **Use hooks** (`useLoyaltyConfig`) instead of direct config access
3. **Use guard components** for conditional rendering
4. **Respect permissions** - check before showing features
5. **Cache configurations** for performance
6. **Log all changes** to audit trail
7. **Validate configurations** before saving
8. **Support rollback** of configuration changes

## Configuration Validation

```typescript
function validateLoyaltyConfig(config: FacilityLoyaltyConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.pointsEarning) {
    errors.push("Points earning rule is required");
  }

  if (!config.tiers || config.tiers.length === 0) {
    errors.push("At least one tier is required");
  }

  if (config.tiers) {
    // Validate tier order
    for (let i = 1; i < config.tiers.length; i++) {
      if (config.tiers[i].minPoints <= config.tiers[i - 1].minPoints) {
        errors.push("Tiers must be in ascending order");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

## Summary

This architecture ensures:
- ✅ **Fully configurable**: Every aspect is configurable
- ✅ **Modular**: Can be disabled at any level
- ✅ **Multi-location**: Supports location-specific settings
- ✅ **Permission-controlled**: Role-based access
- ✅ **Scalable**: Efficient for SaaS with caching
- ✅ **No hardcoded logic**: All behavior from configuration
