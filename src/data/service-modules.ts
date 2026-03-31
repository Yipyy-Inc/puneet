/**
 * Built-in service modules defined as ServiceModule config objects.
 *
 * These follow the EXACT same schema as custom modules — the system
 * treats them identically. The only difference is `isBuiltIn: true`.
 */

import type { ServiceModule } from "@/types/service-module";
import { getTemplatesForModule } from "@/data/task-templates";

// ============================================================================
// Built-in Modules
// ============================================================================

export const builtInModules: ServiceModule[] = [
  {
    id: "boarding",
    slug: "boarding",
    name: "Boarding",
    description: "Overnight pet stays with full care",
    icon: "Home",
    color: "#8b5cf6",
    isBuiltIn: true,
    status: "active",
    category: "stay_based",
    booking: {
      supportsMultiPet: true,
      supportsRecurring: false,
      supportsExtension: true,
      requiresCheckIn: true,
      checkInType: "both",
      statusFlow: [
        "scheduled",
        "checked_in",
        "in_progress",
        "completed",
        "checked_out",
      ],
      cancellationPolicy: {
        allowCancellation: true,
        freeBeforeHours: 48,
        fee: { type: "percentage", value: 50 },
      },
    },
    scheduling: {
      type: "date_range",
      advanceBookingDays: 365,
      sameDayBooking: true,
    },
    resources: {
      enabled: true,
      resources: [],
      waitlistEnabled: true,
      maxWaitlist: 10,
      autoPromote: true,
    },
    billing: {
      pricingModel: "duration_based",
      basePrice: 45,
      taxable: true,
      tipsEnabled: true,
      supportsPackages: true,
      supportsMemberships: true,
      supportsDiscounts: true,
      depositRequired: true,
      depositAmount: 50,
      depositType: "fixed",
    },
    tasks: {
      autoGenerate: true,
      templates: getTemplatesForModule("boarding").map((t) => ({
        ...t,
        timing: { ...t.timing },
      })),
    },
    reporting: {
      trackRevenue: true,
      trackUtilization: true,
      trackStaffTime: true,
      utilizationMetric: "room_nights",
      reportCategory: "Boarding",
    },
    staff: {
      autoAssign: true,
      requiredRole: "kennel_attendant",
    },
    showInSidebar: true,
    sidebarPosition: 1,
  },

  {
    id: "daycare",
    slug: "daycare",
    name: "Daycare",
    description: "Full-day and half-day supervised pet care",
    icon: "Sun",
    color: "#3b82f6",
    isBuiltIn: true,
    status: "active",
    category: "timed_session",
    booking: {
      supportsMultiPet: true,
      supportsRecurring: true,
      supportsExtension: false,
      requiresCheckIn: true,
      checkInType: "both",
      statusFlow: ["scheduled", "checked_in", "completed", "checked_out"],
      cancellationPolicy: {
        allowCancellation: true,
        freeBeforeHours: 24,
        fee: { type: "fixed", value: 15 },
      },
    },
    scheduling: {
      type: "time_slot",
      slotDuration: 480,
      bufferBetween: 0,
      advanceBookingDays: 90,
      sameDayBooking: true,
    },
    resources: {
      enabled: true,
      resources: [],
      waitlistEnabled: true,
      maxWaitlist: 5,
      autoPromote: true,
    },
    billing: {
      pricingModel: "flat_rate",
      basePrice: 50,
      taxable: true,
      tipsEnabled: false,
      supportsPackages: true,
      supportsMemberships: true,
      supportsDiscounts: true,
      depositRequired: false,
    },
    tasks: {
      autoGenerate: true,
      templates: getTemplatesForModule("daycare").map((t) => ({
        ...t,
        timing: { ...t.timing },
      })),
    },
    reporting: {
      trackRevenue: true,
      trackUtilization: true,
      trackStaffTime: true,
      utilizationMetric: "slots",
      reportCategory: "Daycare",
    },
    staff: {
      autoAssign: true,
      requiredRole: "daycare_staff",
    },
    showInSidebar: true,
    sidebarPosition: 2,
  },

  {
    id: "grooming",
    slug: "grooming",
    name: "Grooming",
    description: "Professional pet grooming services",
    icon: "Scissors",
    color: "#ec4899",
    isBuiltIn: true,
    status: "active",
    category: "one_time_appointment",
    booking: {
      supportsMultiPet: false,
      supportsRecurring: true,
      supportsExtension: false,
      requiresCheckIn: true,
      checkInType: "manual",
      statusFlow: ["scheduled", "checked_in", "in_progress", "completed"],
    },
    scheduling: {
      type: "time_slot",
      slotDuration: 60,
      bufferBetween: 15,
      advanceBookingDays: 60,
      sameDayBooking: false,
    },
    resources: {
      enabled: true,
      resources: [],
      waitlistEnabled: false,
    },
    billing: {
      pricingModel: "flat_rate",
      basePrice: 65,
      taxable: true,
      tipsEnabled: true,
      supportsPackages: true,
      supportsMemberships: true,
      supportsDiscounts: true,
      depositRequired: false,
      addOns: [
        { name: "Nail Trim", price: 15, taxable: true },
        { name: "Ear Cleaning", price: 10, taxable: true },
        { name: "Teeth Brushing", price: 12, taxable: true },
        { name: "De-matting", price: 25, taxable: true },
        { name: "Flea Treatment", price: 20, taxable: true },
      ],
    },
    tasks: {
      autoGenerate: true,
      templates: getTemplatesForModule("grooming").map((t) => ({
        ...t,
        timing: { ...t.timing },
      })),
    },
    reporting: {
      trackRevenue: true,
      trackUtilization: true,
      trackStaffTime: true,
      utilizationMetric: "slots",
      reportCategory: "Grooming",
    },
    staff: {
      autoAssign: false,
      requiredRole: "groomer",
    },
    showInSidebar: true,
    sidebarPosition: 3,
  },

  {
    id: "training",
    slug: "training",
    name: "Training",
    description: "Professional pet training and behavior classes",
    icon: "GraduationCap",
    color: "#f59e0b",
    isBuiltIn: true,
    status: "active",
    category: "timed_session",
    booking: {
      supportsMultiPet: true,
      supportsRecurring: true,
      supportsExtension: false,
      requiresCheckIn: true,
      checkInType: "manual",
      statusFlow: ["scheduled", "in_progress", "completed"],
    },
    scheduling: {
      type: "time_slot",
      slotDuration: 60,
      bufferBetween: 15,
      advanceBookingDays: 90,
      sameDayBooking: false,
    },
    resources: {
      enabled: true,
      resources: [],
      waitlistEnabled: true,
      maxWaitlist: 3,
    },
    billing: {
      pricingModel: "flat_rate",
      basePrice: 75,
      taxable: true,
      tipsEnabled: true,
      supportsPackages: true,
      supportsMemberships: true,
      supportsDiscounts: true,
      depositRequired: false,
    },
    tasks: {
      autoGenerate: true,
      templates: getTemplatesForModule("training").map((t) => ({
        ...t,
        timing: { ...t.timing },
      })),
    },
    reporting: {
      trackRevenue: true,
      trackUtilization: true,
      trackStaffTime: true,
      utilizationMetric: "slots",
      reportCategory: "Training",
    },
    staff: {
      autoAssign: false,
      requiredRole: "trainer",
    },
    showInSidebar: true,
    sidebarPosition: 4,
  },
];
