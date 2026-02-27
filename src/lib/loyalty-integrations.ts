/**
 * Loyalty & Referral Integration System
 * 
 * Provides integration hooks for loyalty points, rewards, and referrals
 * across all system modules: Bookings, POS, Payments, Memberships, Packages, etc.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface LoyaltyTransaction {
  id: string;
  customerId: number;
  facilityId: number;
  transactionType: "earned" | "redeemed" | "expired" | "adjusted" | "referral";
  points: number; // Positive for earned, negative for redeemed
  value?: number; // Dollar value if applicable
  description: string;
  source: "booking" | "pos" | "online_payment" | "membership" | "package" | "referral" | "manual";
  sourceId?: string; // ID of the source transaction (booking ID, invoice ID, etc.)
  invoiceId?: string; // Invoice ID if applicable
  bookingId?: string; // Booking ID if applicable
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface RewardRedemption {
  id: string;
  customerId: number;
  facilityId: number;
  rewardId: string;
  rewardType: "points" | "credit" | "discount" | "free_service";
  rewardValue: number | string;
  pointsDeducted?: number;
  creditAmount?: number;
  discountCode?: string;
  appliedToInvoiceId?: string;
  appliedToBookingId?: string;
  status: "pending" | "applied" | "used" | "expired" | "cancelled";
  expiresAt?: string;
  createdAt: string;
  usedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  facilityId: number;
  userId?: number;
  customerId?: number;
  action: string;
  entityType: "loyalty" | "referral" | "reward" | "invoice" | "booking" | "payment";
  entityId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// Integration Hooks
// ============================================================================

/**
 * Process loyalty points earning from a transaction
 */
export function processLoyaltyPointsEarning(
  customerId: number,
  facilityId: number,
  transaction: {
    amount: number;
    type: "booking" | "pos" | "online_payment" | "membership" | "package";
    sourceId: string;
    invoiceId?: string;
    bookingId?: string;
    serviceType?: string;
    isBooking?: boolean;
    visitCount?: number;
  },
  loyaltyConfig: any
): LoyaltyTransaction | null {
  // Import calculation function
  const { calculatePointsEarned } = require("@/data/facility-loyalty-config");
  const { isTransactionEligibleForPoints } = require("@/data/facility-loyalty-config");

  // Check if transaction is eligible
  const eligible = isTransactionEligibleForPoints(loyaltyConfig, {
    type: transaction.type === "booking" || transaction.type === "membership" || transaction.type === "package" ? "service" : "retail",
    serviceType: transaction.serviceType,
    amount: transaction.amount,
    isDiscounted: false,
    isGiftCard: false,
    isPackage: transaction.type === "package",
    isMembership: transaction.type === "membership",
  });

  if (!eligible) {
    return null;
  }

  // Calculate points earned
  const points = calculatePointsEarned(loyaltyConfig, {
    amount: transaction.amount,
    serviceType: transaction.serviceType,
    isBooking: transaction.isBooking || transaction.type === "booking",
    visitCount: transaction.visitCount,
  });

  if (points <= 0) {
    return null;
  }

  // Create loyalty transaction
  const loyaltyTransaction: LoyaltyTransaction = {
    id: `loyalty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    customerId,
    facilityId,
    transactionType: "earned",
    points,
    value: transaction.amount,
    description: `Points earned from ${transaction.type}`,
    source: transaction.type as any,
    sourceId: transaction.sourceId,
    invoiceId: transaction.invoiceId,
    bookingId: transaction.bookingId,
    createdAt: new Date().toISOString(),
    metadata: {
      serviceType: transaction.serviceType,
      visitCount: transaction.visitCount,
    },
  };

  // Log to audit
  logAuditEvent({
    facilityId,
    customerId,
    action: "loyalty_points_earned",
    entityType: "loyalty",
    entityId: loyaltyTransaction.id,
    changes: {
      points: points,
      source: transaction.type,
      sourceId: transaction.sourceId,
    },
    metadata: {
      transactionAmount: transaction.amount,
      serviceType: transaction.serviceType,
    },
  });

  return loyaltyTransaction;
}

/**
 * Process reward redemption
 */
export function processRewardRedemption(
  customerId: number,
  facilityId: number,
  reward: {
    id: string;
    type: "points" | "credit" | "discount" | "free_service";
    value: number | string;
    requiredPoints?: number;
  },
  applyTo?: {
    invoiceId?: string;
    bookingId?: string;
  }
): {
  redemption: RewardRedemption;
  loyaltyTransaction?: LoyaltyTransaction;
  creditTransaction?: any;
  discountCode?: string;
} {
  const redemption: RewardRedemption = {
    id: `redemption-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    customerId,
    facilityId,
    rewardId: reward.id,
    rewardType: reward.type,
    rewardValue: reward.value,
    appliedToInvoiceId: applyTo?.invoiceId,
    appliedToBookingId: applyTo?.bookingId,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  let loyaltyTransaction: LoyaltyTransaction | undefined;
  let creditTransaction: any;
  let discountCode: string | undefined;

  // Handle different reward types
  if (reward.type === "points" && typeof reward.value === "number") {
    // Points redemption - deduct points
    loyaltyTransaction = {
      id: `loyalty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customerId,
      facilityId,
      transactionType: "redeemed",
      points: -reward.value,
      description: `Redeemed ${reward.value} points`,
      source: "manual",
      createdAt: new Date().toISOString(),
    };
    redemption.pointsDeducted = reward.value;
  } else if (reward.type === "credit" && typeof reward.value === "number") {
    // Credit redemption - deduct points and add credit
    if (reward.requiredPoints) {
      loyaltyTransaction = {
        id: `loyalty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customerId,
        facilityId,
        transactionType: "redeemed",
        points: -reward.requiredPoints,
        value: reward.value,
        description: `Redeemed ${reward.requiredPoints} points for $${reward.value} credit`,
        source: "manual",
        createdAt: new Date().toISOString(),
      };
      redemption.pointsDeducted = reward.requiredPoints;
    }
    redemption.creditAmount = reward.value;
    creditTransaction = {
      type: "loyalty_reward",
      amount: reward.value,
      description: `Loyalty reward redemption: ${reward.id}`,
    };
  } else if (reward.type === "discount") {
    // Discount code generation
    discountCode = generateDiscountCode(reward.id, customerId);
    redemption.discountCode = discountCode;
    if (reward.requiredPoints) {
      loyaltyTransaction = {
        id: `loyalty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customerId,
        facilityId,
        transactionType: "redeemed",
        points: -reward.requiredPoints,
        description: `Redeemed ${reward.requiredPoints} points for discount code`,
        source: "manual",
        createdAt: new Date().toISOString(),
      };
      redemption.pointsDeducted = reward.requiredPoints;
    }
  }

  // Log to audit
  logAuditEvent({
    facilityId,
    customerId,
    action: "reward_redemption",
    entityType: "reward",
    entityId: redemption.id,
    changes: {
      rewardId: reward.id,
      rewardType: reward.type,
      rewardValue: reward.value,
      pointsDeducted: redemption.pointsDeducted,
      creditAmount: redemption.creditAmount,
    },
  });

  return {
    redemption,
    loyaltyTransaction,
    creditTransaction,
    discountCode,
  };
}

/**
 * Apply reward to invoice
 */
export function applyRewardToInvoice(
  invoiceId: string,
  redemption: RewardRedemption
): {
  updated: boolean;
  discountApplied?: number;
  creditApplied?: number;
} {
  // In production, this would update the invoice in the database
  // For now, return the structure

  let discountApplied: number | undefined;
  let creditApplied: number | undefined;

  if (redemption.rewardType === "discount" && redemption.discountCode) {
    // Apply discount code to invoice
    // This would be handled by the invoice system
    discountApplied = typeof redemption.rewardValue === "number" ? redemption.rewardValue : 0;
  } else if (redemption.rewardType === "credit" && redemption.creditAmount) {
    // Apply credit to invoice
    creditApplied = redemption.creditAmount;
  }

  redemption.status = "applied";
  redemption.appliedToInvoiceId = invoiceId;

  // Log to audit
  logAuditEvent({
    facilityId: redemption.facilityId,
    customerId: redemption.customerId,
    action: "reward_applied_to_invoice",
    entityType: "invoice",
    entityId: invoiceId,
    changes: {
      redemptionId: redemption.id,
      discountApplied,
      creditApplied,
    },
  });

  return {
    updated: true,
    discountApplied,
    creditApplied,
  };
}

/**
 * Process referral reward
 */
export function processReferralReward(
  referralRelationship: any,
  rewardType: "referrer" | "referee",
  reward: {
    type: "points" | "credit" | "discount";
    value: number | string;
  }
): {
  loyaltyTransaction?: LoyaltyTransaction;
  creditTransaction?: any;
  discountCode?: string;
} {
  const customerId = rewardType === "referrer" 
    ? referralRelationship.referrerId 
    : referralRelationship.referredCustomerId;

  let loyaltyTransaction: LoyaltyTransaction | undefined;
  let creditTransaction: any;
  let discountCode: string | undefined;

  if (reward.type === "points" && typeof reward.value === "number") {
    loyaltyTransaction = {
      id: `loyalty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customerId,
      facilityId: referralRelationship.facilityId,
      transactionType: "referral",
      points: reward.value,
      description: `Referral reward: ${rewardType === "referrer" ? "You referred a friend" : "You were referred"}`,
      source: "referral",
      sourceId: referralRelationship.id,
      createdAt: new Date().toISOString(),
    };
  } else if (reward.type === "credit" && typeof reward.value === "number") {
    creditTransaction = {
      type: "referral_reward",
      amount: reward.value,
      description: `Referral reward: ${rewardType === "referrer" ? "You referred a friend" : "You were referred"}`,
    };
  } else if (reward.type === "discount") {
    discountCode = generateDiscountCode(`referral-${referralRelationship.id}`, customerId);
  }

  // Log to audit
  logAuditEvent({
    facilityId: referralRelationship.facilityId,
    customerId,
    action: "referral_reward_issued",
    entityType: "referral",
    entityId: referralRelationship.id,
    changes: {
      rewardType,
      rewardValue: reward.value,
    },
  });

  return {
    loyaltyTransaction,
    creditTransaction,
    discountCode,
  };
}

/**
 * Generate discount code
 */
function generateDiscountCode(prefix: string, customerId: number): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}-${customerId}-${timestamp}-${random}`;
}

/**
 * Log audit event
 */
export function logAuditEvent(entry: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry {
  const auditEntry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...entry,
    timestamp: new Date().toISOString(),
  };

  // In production, this would save to database
  // For now, we'll just return it
  console.log("[AUDIT LOG]", auditEntry);

  return auditEntry;
}

/**
 * Update invoice with loyalty/reward information
 */
export function updateInvoiceWithLoyalty(
  invoiceId: string,
  updates: {
    loyaltyPointsEarned?: number;
    loyaltyPointsRedeemed?: number;
    rewardRedemptionId?: string;
    discountCode?: string;
    creditApplied?: number;
  }
): void {
  // In production, this would update the invoice in the database
  // This ensures loyalty/reward info is reflected on invoices

  logAuditEvent({
    facilityId: 0, // Would be from invoice
    action: "invoice_updated_with_loyalty",
    entityType: "invoice",
    entityId: invoiceId,
    changes: updates,
  });
}

/**
 * Update revenue report with loyalty/reward impact
 */
export function updateRevenueReport(
  facilityId: number,
  period: {
    startDate: string;
    endDate: string;
  },
  data: {
    totalRevenue: number;
    loyaltyPointsEarned: number;
    rewardsRedeemed: number;
    rewardsValue: number;
    referralRewardsIssued: number;
    referralRewardsValue: number;
  }
): void {
  // In production, this would update revenue reports
  // This ensures loyalty/reward transactions are reflected in financial reports

  logAuditEvent({
    facilityId,
    action: "revenue_report_updated",
    entityType: "loyalty",
    changes: {
      period,
      ...data,
    },
  });
}

/**
 * Update CRM profile with loyalty information
 */
export function updateCRMProfile(
  customerId: number,
  facilityId: number,
  loyaltyData: {
    currentPoints: number;
    lifetimePoints: number;
    currentTier: string;
    totalRewardsRedeemed: number;
    totalReferrals: number;
    lastActivityDate: string;
  }
): void {
  // In production, this would update the CRM profile
  // This ensures loyalty data is visible in customer profiles

  logAuditEvent({
    facilityId,
    customerId,
    action: "crm_profile_updated_with_loyalty",
    entityType: "loyalty",
    changes: loyaltyData,
  });
}

/**
 * Trigger automation builder events
 */
export function triggerAutomationEvent(
  eventType: "loyalty_points_earned" | "loyalty_tier_upgraded" | "reward_redeemed" | "referral_completed",
  data: {
    customerId: number;
    facilityId: number;
    [key: string]: any;
  }
): void {
  // In production, this would trigger automation builder workflows
  // Examples:
  // - Send email when customer reaches new tier
  // - Send SMS when reward is redeemed
  // - Create task when referral is completed

  logAuditEvent({
    facilityId: data.facilityId,
    customerId: data.customerId,
    action: `automation_triggered_${eventType}`,
    entityType: "loyalty",
    metadata: {
      eventType,
      ...data,
    },
  });
}

// ============================================================================
// Integration Examples
// ============================================================================

/**
 * Example: Booking completion integration
 */
export function integrateBookingCompletion(
  booking: {
    id: string;
    customerId: number;
    facilityId: number;
    invoiceId: string;
    amount: number;
    serviceType: string;
    status: string;
    completedAt: string;
  },
  loyaltyConfig: any
): {
  loyaltyTransaction?: LoyaltyTransaction;
  auditLog: AuditLogEntry;
} {
  // Process loyalty points
  const loyaltyTransaction = processLoyaltyPointsEarning(
    booking.customerId,
    booking.facilityId,
    {
      amount: booking.amount,
      type: "booking",
      sourceId: booking.id,
      invoiceId: booking.invoiceId,
      bookingId: booking.id,
      serviceType: booking.serviceType,
      isBooking: true,
    },
    loyaltyConfig
  );

  // Update invoice
  if (loyaltyTransaction) {
    updateInvoiceWithLoyalty(booking.invoiceId, {
      loyaltyPointsEarned: loyaltyTransaction.points,
    });
  }

  // Update CRM profile
  // (Would fetch current points and update)

  // Trigger automation
  if (loyaltyTransaction) {
    triggerAutomationEvent("loyalty_points_earned", {
      customerId: booking.customerId,
      facilityId: booking.facilityId,
      points: loyaltyTransaction.points,
      bookingId: booking.id,
    });
  }

  const auditLog = logAuditEvent({
    facilityId: booking.facilityId,
    customerId: booking.customerId,
    action: "booking_completed_loyalty_processed",
    entityType: "booking",
    entityId: booking.id,
    changes: {
      loyaltyPointsEarned: loyaltyTransaction?.points,
    },
  });

  return {
    loyaltyTransaction: loyaltyTransaction || undefined,
    auditLog,
  };
}

/**
 * Example: POS transaction integration
 */
export function integratePOSTransaction(
  transaction: {
    id: string;
    customerId: number;
    facilityId: number;
    invoiceId: string;
    amount: number;
    items: Array<{ type: "product" | "service"; category?: string }>;
  },
  loyaltyConfig: any
): {
  loyaltyTransaction?: LoyaltyTransaction;
  auditLog: AuditLogEntry;
} {
  // Process loyalty points
  const loyaltyTransaction = processLoyaltyPointsEarning(
    transaction.customerId,
    transaction.facilityId,
    {
      amount: transaction.amount,
      type: "pos",
      sourceId: transaction.id,
      invoiceId: transaction.invoiceId,
    },
    loyaltyConfig
  );

  // Update invoice
  if (loyaltyTransaction) {
    updateInvoiceWithLoyalty(transaction.invoiceId, {
      loyaltyPointsEarned: loyaltyTransaction.points,
    });
  }

  const auditLog = logAuditEvent({
    facilityId: transaction.facilityId,
    customerId: transaction.customerId,
    action: "pos_transaction_loyalty_processed",
    entityType: "invoice",
    entityId: transaction.invoiceId,
    changes: {
      loyaltyPointsEarned: loyaltyTransaction?.points,
    },
  });

  return {
    loyaltyTransaction: loyaltyTransaction || undefined,
    auditLog,
  };
}

/**
 * Example: Reward redemption integration
 */
export function integrateRewardRedemption(
  customerId: number,
  facilityId: number,
  reward: {
    id: string;
    type: "points" | "credit" | "discount" | "free_service";
    value: number | string;
    requiredPoints?: number;
  },
  invoiceId?: string,
  bookingId?: string
): {
  redemption: RewardRedemption;
  loyaltyTransaction?: LoyaltyTransaction;
  creditTransaction?: any;
  discountCode?: string;
  auditLog: AuditLogEntry;
} {
  // Process redemption
  const result = processRewardRedemption(
    customerId,
    facilityId,
    reward,
    { invoiceId, bookingId }
  );

  // Apply to invoice if provided
  if (invoiceId && result.redemption.status === "pending") {
    const applied = applyRewardToInvoice(invoiceId, result.redemption);
    
    // Update invoice
    updateInvoiceWithLoyalty(invoiceId, {
      loyaltyPointsRedeemed: result.redemption.pointsDeducted,
      rewardRedemptionId: result.redemption.id,
      discountCode: result.discountCode,
      creditApplied: applied.creditApplied,
    });
  }

  // Update revenue report
  if (result.redemption.creditAmount || result.redemption.discountCode) {
    updateRevenueReport(facilityId, {
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
    }, {
      totalRevenue: 0, // Would be calculated
      loyaltyPointsEarned: 0,
      rewardsRedeemed: 1,
      rewardsValue: typeof result.redemption.rewardValue === "number" ? result.redemption.rewardValue : 0,
      referralRewardsIssued: 0,
      referralRewardsValue: 0,
    });
  }

  // Trigger automation
  triggerAutomationEvent("reward_redeemed", {
    customerId,
    facilityId,
    rewardId: reward.id,
    rewardType: reward.type,
  });

  const auditLog = logAuditEvent({
    facilityId,
    customerId,
    action: "reward_redemption_completed",
    entityType: "reward",
    entityId: result.redemption.id,
    changes: {
      rewardId: reward.id,
      rewardType: reward.type,
      pointsDeducted: result.redemption.pointsDeducted,
      creditAmount: result.redemption.creditAmount,
    },
  });

  return {
    ...result,
    auditLog,
  };
}
