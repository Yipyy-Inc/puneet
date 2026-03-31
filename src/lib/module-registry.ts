/**
 * Unified Module Registry — single source of truth for ALL service modules.
 *
 * Components and engines import from here instead of directly from
 * service data files. This ensures built-in and custom modules are
 * treated identically throughout the system.
 */

import type {
  ServiceModule,
  ServiceCategory,
  BookingEngineConfig,
  BillingEngineConfig,
  SchedulingEngineConfig,
  ResourceEngineConfig,
  TaskEngineConfig,
  ReportingEngineConfig,
} from "@/types/service-module";
import { builtInModules } from "@/data/service-modules";
import { defaultCustomServiceModules } from "@/data/custom-services";
import { getTemplatesForModule } from "@/data/task-templates";

// ============================================================================
// Convert legacy CustomServiceModule → ServiceModule
// ============================================================================

function convertCustomModule(csm: (typeof defaultCustomServiceModules)[number]): ServiceModule {
  return {
    id: csm.id,
    slug: csm.slug,
    name: csm.name,
    description: csm.description,
    icon: csm.icon,
    color: csm.iconColor,
    isBuiltIn: false,
    status: csm.status === "active" ? "active" : csm.status === "draft" ? "draft" : "disabled",
    facilityId: csm.facilityId,
    category: csm.category as ServiceCategory,

    booking: {
      supportsMultiPet: csm.onlineBooking.maxDogsPerSession > 1,
      supportsRecurring: false,
      supportsExtension: csm.stayBased.enabled,
      requiresCheckIn: csm.checkInOut.enabled,
      checkInType: csm.checkInOut.qrCodeSupport ? "both" : "manual",
      statusFlow: ["scheduled", "checked_in", "in_progress", "completed"],
      cancellationPolicy: csm.onlineBooking.cancellationPolicy
        ? {
            allowCancellation: true,
            freeBeforeHours: csm.onlineBooking.cancellationPolicy.hoursBeforeBooking,
            fee: {
              type: "percentage",
              value: csm.onlineBooking.cancellationPolicy.feePercentage,
            },
          }
        : undefined,
    },

    scheduling: {
      type: csm.category === "stay_based"
        ? "date_range"
        : csm.category === "transport"
          ? "on_demand"
          : "time_slot",
      slotDuration: csm.calendar.durationOptions[0]?.minutes,
      bufferBetween: csm.calendar.bufferTimeMinutes,
      sameDayBooking: true,
    },

    resources: {
      enabled: csm.calendar.assignedResourceIds.length > 0,
      resources: (csm.capacity?.resources ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        maxConcurrent: r.maxConcurrent,
        shared: r.shared,
        sharedWith: r.sharedWith,
      })),
      capacityPerSlot: csm.capacity?.maxPerSlot ?? csm.calendar.maxSimultaneousBookings,
      waitlistEnabled: csm.capacity?.waitlistEnabled ?? false,
      maxWaitlist: csm.capacity?.maxWaitlist,
      autoPromote: csm.capacity?.autoPromote,
    },

    billing: {
      pricingModel: csm.pricing.model as ServiceModule["billing"]["pricingModel"],
      basePrice: csm.pricing.basePrice,
      pricingTiers: csm.pricing.durationTiers?.map((t) => ({
        durationMinutes: t.durationMinutes,
        price: t.price,
      })),
      taxable: csm.pricing.taxable,
      tipsEnabled: csm.pricing.tipAllowed,
      supportsPackages: true,
      supportsMemberships: csm.pricing.membershipDiscountEligible,
      supportsDiscounts: true,
      depositRequired: csm.onlineBooking.depositRequired,
      depositAmount: csm.onlineBooking.depositAmount,
      depositType: csm.onlineBooking.depositType as "fixed" | "percentage" | undefined,
    },

    tasks: {
      autoGenerate: csm.staffAssignment.taskGeneration.length > 0,
      templates: getTemplatesForModule(csm.slug).map((t) => ({
        ...t,
        timing: { ...t.timing },
      })),
    },

    reporting: {
      trackRevenue: true,
      trackUtilization: true,
      trackStaffTime: true,
      utilizationMetric:
        csm.category === "stay_based"
          ? "room_nights"
          : csm.category === "transport"
            ? "routes"
            : csm.category === "event_based"
              ? "attendance"
              : "slots",
      reportCategory: csm.name,
    },

    staff: {
      autoAssign: csm.staffAssignment.autoAssign,
      requiredRole: csm.staffAssignment.requiredRole,
      customRoleName: csm.staffAssignment.customRoleName,
    },

    eligibility: csm.eligibilityRules
      ? {
          enabled: csm.eligibilityRules.enabled,
          operator: csm.eligibilityRules.operator,
          conditions: csm.eligibilityRules.conditions.map((c) => ({
            id: c.id,
            type: c.type as ServiceModule extends { eligibility: infer E } ? E extends { conditions: (infer C)[] } ? C extends { type: infer T } ? T : never : never : never,
            operator: c.operator as "equals" | "not_equals" | "has" | "not_has" | "greater_than" | "less_than" | "in_list",
            value: c.value,
            label: c.label,
          })),
          deniedMessage: csm.eligibilityRules.deniedMessage,
        }
      : undefined,

    dependencies: csm.serviceDependencies
      ? {
          requiresServices: csm.serviceDependencies.requiresServices,
          addonOnly: csm.serviceDependencies.addonOnly,
          addonFor: csm.serviceDependencies.addonFor,
          excludesWith: csm.serviceDependencies.excludesWith,
        }
      : undefined,

    yipyyGo: csm.yipyyGo
      ? {
          enabled: csm.yipyyGo.enabled,
          sendBeforeHours: csm.yipyyGo.sendBeforeHours,
          required: csm.yipyyGo.required,
          standardSections: csm.yipyyGo.standardSections,
          customSections: csm.yipyyGo.customSections,
        }
      : undefined,

    onlineBooking: {
      enabled: csm.onlineBooking.enabled,
      eligibleClients: csm.onlineBooking.eligibleClients,
      approvalRequired: csm.onlineBooking.approvalRequired,
      maxPetsPerBooking: csm.onlineBooking.maxDogsPerSession,
    },

    showInSidebar: csm.showInSidebar,
    sidebarPosition: csm.sidebarPosition,
    createdAt: csm.createdAt,
    updatedAt: csm.updatedAt,
  };
}

// ============================================================================
// Registry API
// ============================================================================

/**
 * Get ALL modules — built-in + custom, merged into a single list.
 */
export function getAllModules(): ServiceModule[] {
  const custom = defaultCustomServiceModules
    .filter((m) => m.status !== "draft")
    .map(convertCustomModule);
  return [...builtInModules, ...custom];
}

/**
 * Get only active modules.
 */
export function getActiveModules(): ServiceModule[] {
  return getAllModules().filter((m) => m.status === "active");
}

/**
 * Look up a module by ID or slug.
 */
export function getServiceModule(idOrSlug: string): ServiceModule | undefined {
  const lower = idOrSlug.toLowerCase();
  return getAllModules().find(
    (m) => m.id.toLowerCase() === lower || m.slug.toLowerCase() === lower,
  );
}

/**
 * Get modules filtered by category.
 */
export function getModulesByCategory(
  category: ServiceCategory,
): ServiceModule[] {
  return getActiveModules().filter((m) => m.category === category);
}

// ============================================================================
// Engine config accessors (type-safe shortcuts)
// ============================================================================

export function getBookingConfig(
  moduleId: string,
): BookingEngineConfig | undefined {
  return getServiceModule(moduleId)?.booking;
}

export function getBillingConfig(
  moduleId: string,
): BillingEngineConfig | undefined {
  return getServiceModule(moduleId)?.billing;
}

export function getSchedulingConfig(
  moduleId: string,
): SchedulingEngineConfig | undefined {
  return getServiceModule(moduleId)?.scheduling;
}

export function getResourceConfig(
  moduleId: string,
): ResourceEngineConfig | undefined {
  return getServiceModule(moduleId)?.resources;
}

export function getTaskConfig(
  moduleId: string,
): TaskEngineConfig | undefined {
  return getServiceModule(moduleId)?.tasks;
}

export function getReportingConfig(
  moduleId: string,
): ReportingEngineConfig | undefined {
  return getServiceModule(moduleId)?.reporting;
}
