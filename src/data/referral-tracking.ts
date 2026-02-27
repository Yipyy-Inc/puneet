/**
 * Referral Tracking System
 * 
 * Tracks referral relationships, booking events, and reward issuance
 * to prevent abuse and ensure accurate reward distribution.
 */

// ============================================================================
// Data Structures
// ============================================================================

/**
 * Referral Relationship
 * Links a referrer to a referred customer
 */
export interface ReferralRelationship {
  id: string;
  referrerId: number;              // Client ID of the person who referred
  referredCustomerId: number;       // Client ID of the person who was referred
  referralCode: string;             // The referral code used
  facilityId: number;              // Facility where referral was made
  createdAt: string;                // When the referral relationship was created
  status: "pending" | "active" | "completed" | "cancelled";
  
  // Tracking fields
  firstBookingId?: string;          // ID of the first booking
  firstBookingDate?: string;        // Date of first completed booking
  firstBookingValue?: number;       // Value of first booking
  totalBookingValue?: number;       // Total value of all bookings
  
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
  isSelfReferral: boolean;          // Prevent self-referrals
  isDuplicate: boolean;             // Prevent duplicate rewards
  validationNotes?: string;         // Notes about validation
}

/**
 * Referral Event
 * Tracks events related to referrals (booking created, completed, cancelled, etc.)
 */
export interface ReferralEvent {
  id: string;
  referralRelationshipId: string;
  eventType: "booking_created" | "booking_completed" | "booking_cancelled" | "booking_refunded" | "reward_issued" | "reward_cancelled";
  bookingId?: string;
  bookingValue?: number;
  rewardValue?: number | string;
  rewardType?: "points" | "credit" | "discount";
  timestamp: string;
  notes?: string;
}

/**
 * Referral Validation Result
 * Result of validating a referral action
 */
export interface ReferralValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canTriggerReward: boolean;
  reason?: string;
}

// ============================================================================
// Mock Data (In production, this would be in a database)
// ============================================================================

export const referralRelationships: ReferralRelationship[] = [
  {
    id: "ref-rel-001",
    referrerId: 15, // Alice (MOCK_CUSTOMER_ID)
    referredCustomerId: 1, // Sarah
    referralCode: "ALICE-PET",
    facilityId: 1,
    createdAt: "2026-01-10T10:00:00Z",
    status: "completed",
    firstBookingId: "booking-001",
    firstBookingDate: "2026-01-20T10:00:00Z",
    firstBookingValue: 85.00,
    totalBookingValue: 85.00,
    referrerRewardStatus: "issued",
    referrerRewardIssuedAt: "2026-01-21T10:00:00Z",
    referrerRewardValue: 20,
    referrerRewardType: "credit",
    refereeRewardStatus: "issued",
    refereeRewardIssuedAt: "2026-01-20T10:00:00Z",
    refereeRewardValue: 10,
    refereeRewardType: "credit",
    isSelfReferral: false,
    isDuplicate: false,
  },
  {
    id: "ref-rel-002",
    referrerId: 15, // Alice
    referredCustomerId: 2, // Mike
    referralCode: "ALICE-PET",
    facilityId: 1,
    createdAt: "2026-02-05T10:00:00Z",
    status: "active",
    firstBookingId: "booking-002",
    firstBookingDate: "2026-02-12T10:00:00Z",
    firstBookingValue: 50.00,
    totalBookingValue: 50.00,
    referrerRewardStatus: "eligible",
    refereeRewardStatus: "issued",
    refereeRewardIssuedAt: "2026-02-12T10:00:00Z",
    refereeRewardValue: 10,
    refereeRewardType: "credit",
    isSelfReferral: false,
    isDuplicate: false,
  },
  {
    id: "ref-rel-003",
    referrerId: 15, // Alice
    referredCustomerId: 3, // Emma
    referralCode: "ALICE-PET",
    facilityId: 1,
    createdAt: "2026-02-10T10:00:00Z",
    status: "pending",
    referrerRewardStatus: "pending",
    refereeRewardStatus: "pending",
    isSelfReferral: false,
    isDuplicate: false,
  },
];

export const referralEvents: ReferralEvent[] = [
  {
    id: "event-001",
    referralRelationshipId: "ref-rel-001",
    eventType: "booking_created",
    bookingId: "booking-001",
    bookingValue: 85.00,
    timestamp: "2026-01-15T10:00:00Z",
  },
  {
    id: "event-002",
    referralRelationshipId: "ref-rel-001",
    eventType: "booking_completed",
    bookingId: "booking-001",
    bookingValue: 85.00,
    timestamp: "2026-01-20T10:00:00Z",
  },
  {
    id: "event-003",
    referralRelationshipId: "ref-rel-001",
    eventType: "reward_issued",
    rewardValue: 20,
    rewardType: "credit",
    timestamp: "2026-01-21T10:00:00Z",
    notes: "Referrer reward issued",
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get referral relationship by referred customer ID
 */
export function getReferralRelationshipByReferredCustomer(
  referredCustomerId: number
): ReferralRelationship | null {
  return referralRelationships.find(
    (rel) => rel.referredCustomerId === referredCustomerId && rel.status !== "cancelled"
  ) || null;
}

/**
 * Get all referral relationships for a referrer
 */
export function getReferralRelationshipsByReferrer(
  referrerId: number
): ReferralRelationship[] {
  return referralRelationships.filter(
    (rel) => rel.referrerId === referrerId && rel.status !== "cancelled"
  );
}

/**
 * Get referral events for a relationship
 */
export function getReferralEvents(
  referralRelationshipId: string
): ReferralEvent[] {
  return referralEvents.filter(
    (event) => event.referralRelationshipId === referralRelationshipId
  );
}

/**
 * Validate if a referral is valid (not self-referral, not duplicate)
 */
export function validateReferral(
  referrerId: number,
  referredCustomerId: number,
  referralCode: string,
  facilityId: number
): ReferralValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for self-referral
  if (referrerId === referredCustomerId) {
    errors.push("Self-referrals are not allowed");
    return {
      isValid: false,
      errors,
      warnings,
      canTriggerReward: false,
      reason: "Self-referral detected",
    };
  }

  // Check for duplicate referral relationship
  const existingRelationship = referralRelationships.find(
    (rel) =>
      rel.referrerId === referrerId &&
      rel.referredCustomerId === referredCustomerId &&
      rel.facilityId === facilityId &&
      rel.status !== "cancelled"
  );

  if (existingRelationship) {
    errors.push("Referral relationship already exists");
    return {
      isValid: false,
      errors,
      warnings,
      canTriggerReward: false,
      reason: "Duplicate referral relationship",
    };
  }

  // Check if referrer has already received reward for this customer
  if (existingRelationship && existingRelationship.referrerRewardStatus === "issued") {
    errors.push("Reward already issued for this referral");
    return {
      isValid: false,
      errors,
      warnings,
      canTriggerReward: false,
      reason: "Reward already issued",
    };
  }

  return {
    isValid: true,
    errors: [],
    warnings,
    canTriggerReward: true,
  };
}

/**
 * Validate if a booking should trigger a referral reward
 */
export function validateBookingForReferralReward(
  referralRelationship: ReferralRelationship,
  booking: {
    id: string;
    customerId: number;
    value: number;
    status: string;
    isRefunded: boolean;
    isCancelled: boolean;
    completedAt?: string;
  },
  referralProgramConfig?: {
    requirements?: {
      minimumPurchase?: number;
      firstBookingOnly?: boolean;
      serviceTypes?: string[];
    };
  }
): ReferralValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if this is the referred customer
  if (booking.customerId !== referralRelationship.referredCustomerId) {
    errors.push("Booking customer does not match referred customer");
    return {
      isValid: false,
      errors,
      warnings,
      canTriggerReward: false,
      reason: "Customer mismatch",
    };
  }

  // Check if booking is completed
  if (booking.status !== "completed") {
    errors.push("Booking must be completed to trigger reward");
    return {
      isValid: false,
      errors,
      warnings,
      canTriggerReward: false,
      reason: "Booking not completed",
    };
  }

  // Check if booking is cancelled
  if (booking.isCancelled) {
    errors.push("Cancelled bookings cannot trigger rewards");
    return {
      isValid: false,
      errors,
      warnings,
      canTriggerReward: false,
      reason: "Booking cancelled",
    };
  }

  // Check if booking is refunded
  if (booking.isRefunded) {
    errors.push("Refunded bookings cannot trigger rewards");
    return {
      isValid: false,
      errors,
      warnings,
      canTriggerReward: false,
      reason: "Booking refunded",
    };
  }

  // Check if this is the first booking (if required)
  if (referralProgramConfig?.requirements?.firstBookingOnly) {
    if (referralRelationship.firstBookingId && referralRelationship.firstBookingId !== booking.id) {
      errors.push("Only first booking triggers reward");
      return {
        isValid: false,
        errors,
        warnings,
        canTriggerReward: false,
        reason: "Not first booking",
      };
    }
  }

  // Check minimum purchase requirement
  if (referralProgramConfig?.requirements?.minimumPurchase) {
    if (booking.value < referralProgramConfig.requirements.minimumPurchase) {
      errors.push(
        `Minimum purchase of $${referralProgramConfig.requirements.minimumPurchase} required`
      );
      return {
        isValid: false,
        errors,
        warnings,
        canTriggerReward: false,
        reason: "Minimum purchase not met",
      };
    }
  }

  // Check if reward already issued
  if (referralRelationship.referrerRewardStatus === "issued") {
    errors.push("Reward already issued for this referral");
    return {
      isValid: false,
      errors,
      warnings,
      canTriggerReward: false,
      reason: "Reward already issued",
    };
  }

  return {
    isValid: true,
    errors: [],
    warnings,
    canTriggerReward: true,
  };
}

/**
 * Create a new referral relationship
 */
export function createReferralRelationship(
  referrerId: number,
  referredCustomerId: number,
  referralCode: string,
  facilityId: number
): ReferralRelationship {
  // Validate first
  const validation = validateReferral(referrerId, referredCustomerId, referralCode, facilityId);
  
  if (!validation.isValid) {
    throw new Error(`Invalid referral: ${validation.errors.join(", ")}`);
  }

  const relationship: ReferralRelationship = {
    id: `ref-rel-${Date.now()}`,
    referrerId,
    referredCustomerId,
    referralCode,
    facilityId,
    createdAt: new Date().toISOString(),
    status: "pending",
    referrerRewardStatus: "pending",
    refereeRewardStatus: "pending",
    isSelfReferral: referrerId === referredCustomerId,
    isDuplicate: false,
  };

  // In production, save to database
  referralRelationships.push(relationship);

  // Log event
  referralEvents.push({
    id: `event-${Date.now()}`,
    referralRelationshipId: relationship.id,
    eventType: "booking_created",
    timestamp: new Date().toISOString(),
    notes: "Referral relationship created",
  });

  return relationship;
}

/**
 * Process booking completion for referral rewards
 */
export function processBookingForReferral(
  booking: {
    id: string;
    customerId: number;
    value: number;
    status: string;
    isRefunded: boolean;
    isCancelled: boolean;
    completedAt?: string;
  },
  referralProgramConfig?: {
    referrerReward: {
      type: "points" | "credit" | "discount";
      value: number | string;
    };
    refereeReward: {
      type: "points" | "credit" | "discount";
      value: number | string;
    };
    requirements?: {
      minimumPurchase?: number;
      firstBookingOnly?: boolean;
      serviceTypes?: string[];
    };
  }
): {
  relationship: ReferralRelationship | null;
  referrerRewardIssued: boolean;
  refereeRewardIssued: boolean;
} {
  // Find referral relationship for this customer
  const relationship = getReferralRelationshipByReferredCustomer(booking.customerId);
  
  if (!relationship) {
    return {
      relationship: null,
      referrerRewardIssued: false,
      refereeRewardIssued: false,
    };
  }

  // Validate booking
  const validation = validateBookingForReferralReward(relationship, booking, referralProgramConfig);
  
  if (!validation.canTriggerReward) {
    // Log validation failure
    referralEvents.push({
      id: `event-${Date.now()}`,
      referralRelationshipId: relationship.id,
      eventType: "booking_completed",
      bookingId: booking.id,
      bookingValue: booking.value,
      timestamp: new Date().toISOString(),
      notes: `Validation failed: ${validation.reason}`,
    });

    return {
      relationship,
      referrerRewardIssued: false,
      refereeRewardIssued: false,
    };
  }

  // Update relationship with booking info
  if (!relationship.firstBookingId) {
    relationship.firstBookingId = booking.id;
    relationship.firstBookingDate = booking.completedAt || new Date().toISOString();
    relationship.firstBookingValue = booking.value;
    relationship.totalBookingValue = booking.value;
  } else {
    relationship.totalBookingValue = (relationship.totalBookingValue || 0) + booking.value;
  }

  let referrerRewardIssued = false;
  let refereeRewardIssued = false;

  // Issue referrer reward
  if (relationship.referrerRewardStatus === "pending" || relationship.referrerRewardStatus === "eligible") {
    if (referralProgramConfig?.referrerReward) {
      relationship.referrerRewardStatus = "issued";
      relationship.referrerRewardIssuedAt = new Date().toISOString();
      relationship.referrerRewardValue = referralProgramConfig.referrerReward.value;
      relationship.referrerRewardType = referralProgramConfig.referrerReward.type;
      referrerRewardIssued = true;

      // Log event
      referralEvents.push({
        id: `event-${Date.now()}`,
        referralRelationshipId: relationship.id,
        eventType: "reward_issued",
        bookingId: booking.id,
        rewardValue: referralProgramConfig.referrerReward.value,
        rewardType: referralProgramConfig.referrerReward.type,
        timestamp: new Date().toISOString(),
        notes: "Referrer reward issued",
      });
    }
  }

  // Issue referee reward (if not already issued)
  if (relationship.refereeRewardStatus === "pending" || relationship.refereeRewardStatus === "eligible") {
    if (referralProgramConfig?.refereeReward) {
      relationship.refereeRewardStatus = "issued";
      relationship.refereeRewardIssuedAt = new Date().toISOString();
      relationship.refereeRewardValue = referralProgramConfig.refereeReward.value;
      relationship.refereeRewardType = referralProgramConfig.refereeReward.type;
      refereeRewardIssued = true;

      // Log event
      referralEvents.push({
        id: `event-${Date.now()}`,
        referralRelationshipId: relationship.id,
        eventType: "reward_issued",
        bookingId: booking.id,
        rewardValue: referralProgramConfig.refereeReward.value,
        rewardType: referralProgramConfig.refereeReward.type,
        timestamp: new Date().toISOString(),
        notes: "Referee reward issued",
      });
    }
  }

  // Update relationship status
  if (relationship.referrerRewardStatus === "issued" && relationship.refereeRewardStatus === "issued") {
    relationship.status = "completed";
  } else {
    relationship.status = "active";
  }

  // Log booking completion
  referralEvents.push({
    id: `event-${Date.now()}`,
    referralRelationshipId: relationship.id,
    eventType: "booking_completed",
    bookingId: booking.id,
    bookingValue: booking.value,
    timestamp: new Date().toISOString(),
  });

  return {
    relationship,
    referrerRewardIssued,
    refereeRewardIssued,
  };
}

/**
 * Handle booking cancellation/refund - cancel rewards if needed
 */
export function handleBookingCancellationForReferral(
  bookingId: string,
  customerId: number
): {
  relationship: ReferralRelationship | null;
  rewardsCancelled: boolean;
} {
  const relationship = getReferralRelationshipByReferredCustomer(customerId);
  
  if (!relationship || relationship.firstBookingId !== bookingId) {
    return {
      relationship: null,
      rewardsCancelled: false,
    };
  }

  // Cancel rewards if they were issued for this booking
  let rewardsCancelled = false;

  if (relationship.referrerRewardStatus === "issued" && relationship.firstBookingId === bookingId) {
    relationship.referrerRewardStatus = "cancelled";
    rewardsCancelled = true;

    referralEvents.push({
      id: `event-${Date.now()}`,
      referralRelationshipId: relationship.id,
      eventType: "reward_cancelled",
      bookingId,
      timestamp: new Date().toISOString(),
      notes: "Referrer reward cancelled due to booking cancellation",
    });
  }

  if (relationship.refereeRewardStatus === "issued" && relationship.firstBookingId === bookingId) {
    relationship.refereeRewardStatus = "cancelled";
    rewardsCancelled = true;

    referralEvents.push({
      id: `event-${Date.now()}`,
      referralRelationshipId: relationship.id,
      eventType: "reward_cancelled",
      bookingId,
      timestamp: new Date().toISOString(),
      notes: "Referee reward cancelled due to booking cancellation",
    });
  }

  if (rewardsCancelled) {
    relationship.status = "cancelled";
  }

  // Log cancellation event
  referralEvents.push({
    id: `event-${Date.now()}`,
    referralRelationshipId: relationship.id,
    eventType: "booking_cancelled",
    bookingId,
    timestamp: new Date().toISOString(),
  });

  return {
    relationship,
    rewardsCancelled,
  };
}

/**
 * Get referral statistics for a referrer
 */
export function getReferralStats(referrerId: number): {
  totalReferrals: number;
  activeReferrals: number;
  completedReferrals: number;
  rewardsEarned: number;
  rewardsPending: number;
  totalRewardValue: number;
} {
  const relationships = getReferralRelationshipsByReferrer(referrerId);

  const totalReferrals = relationships.length;
  const activeReferrals = relationships.filter((r) => r.status === "active").length;
  const completedReferrals = relationships.filter((r) => r.status === "completed").length;
  const rewardsEarned = relationships.filter((r) => r.referrerRewardStatus === "issued").length;
  const rewardsPending = relationships.filter(
    (r) => r.referrerRewardStatus === "pending" || r.referrerRewardStatus === "eligible"
  ).length;

  const totalRewardValue = relationships
    .filter((r) => r.referrerRewardStatus === "issued")
    .reduce((sum, r) => {
      const value = typeof r.referrerRewardValue === "number" ? r.referrerRewardValue : 0;
      return sum + value;
    }, 0);

  return {
    totalReferrals,
    activeReferrals,
    completedReferrals,
    rewardsEarned,
    rewardsPending,
    totalRewardValue,
  };
}
