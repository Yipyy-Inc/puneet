/**
 * YipyyGo Configuration
 *
 * Pre-check-in form system configuration for facilities.
 * Allows facilities to configure which services require pre-check-in forms,
 * timing, reminders, and form templates.
 */

import type {
  YipyyGoServiceType as ServiceType,
  YipyyGoRequirement,
  DeliveryChannel,
  CustomQuestionType,
  MultiPetBehavior,
  ServiceYipyyGoConfig,
  ReminderRule,
  TimingConfig,
  CustomQuestion,
  FormSection,
  FormTemplateConfig,
  YipyyGoAddOnsApproval,
  YipyyGoConfig,
} from "@/types/yipyygo";

export type {
  ServiceType,
  YipyyGoRequirement,
  DeliveryChannel,
  CustomQuestionType,
  MultiPetBehavior,
  ServiceYipyyGoConfig,
  ReminderRule,
  TimingConfig,
  CustomQuestion,
  FormSection,
  FormTemplateConfig,
  YipyyGoAddOnsApproval,
  YipyyGoConfig,
};

// ============================================================================
// Default Configurations
// ============================================================================

export const defaultTimingConfig: TimingConfig = {
  initialSendTime: 48, // 48 hours before check-in
  deadline: 12, // Must be completed 12 hours before
  reminderRules: [
    {
      id: "reminder-1",
      sendTime: 24, // 24 hours before
      channel: "email",
    },
    {
      id: "reminder-2",
      sendTime: 6, // 6 hours before
      channel: "sms",
    },
  ],
  deliveryChannels: ["email", "sms"],
};

export const defaultFormTemplate: FormTemplateConfig = {
  sections: {
    petInfo: {
      id: "pet-info",
      label: "Pet Information",
      enabled: true,
      required: true,
      order: 1,
    },
    careInstructions: {
      id: "care-instructions",
      label: "Care Instructions",
      enabled: true,
      required: false,
      order: 2,
    },
    medications: {
      id: "medications",
      label: "Medications",
      enabled: true,
      required: false,
      order: 3,
    },
    feedingSchedule: {
      id: "feeding-schedule",
      label: "Feeding Schedule",
      enabled: true,
      required: false,
      order: 4,
    },
    emergencyContact: {
      id: "emergency-contact",
      label: "Emergency Contact",
      enabled: true,
      required: true,
      order: 5,
    },
    specialRequests: {
      id: "special-requests",
      label: "Special Requests",
      enabled: true,
      required: false,
      order: 6,
    },
    customSections: [],
  },
  features: {
    photoUploads: true,
    addOnsSection: true,
    tipSection: false,
  },
  multiPetBehavior: "one_form_per_pet",
  addOnsScope: "booking",
  globalCustomQuestions: [],
};

export const defaultYipyyGoConfig: Omit<
  YipyyGoConfig,
  "facilityId" | "createdAt" | "updatedAt" | "updatedBy"
> = {
  enabled: false,
  addOnsApproval: "staff_approval",
  notifyStaffEmailOnSubmit: false,
  serviceConfigs: [
    {
      serviceType: "daycare",
      enabled: false,
      requirement: "optional",
    },
    {
      serviceType: "boarding",
      enabled: false,
      requirement: "optional",
    },
    {
      serviceType: "grooming",
      enabled: false,
      requirement: "optional",
    },
    {
      serviceType: "training",
      enabled: false,
      requirement: "optional",
    },
  ],
  timing: defaultTimingConfig,
  formTemplate: defaultFormTemplate,
};

// ============================================================================
// Mock Data & Utilities
// ============================================================================

const mockYipyyGoConfigs: YipyyGoConfig[] = [
  {
    ...defaultYipyyGoConfig,
    facilityId: 1,
    addOnsApproval: "staff_approval",
    notifyStaffEmailOnSubmit: false,
    enabled: true,
    serviceConfigs: [
      {
        serviceType: "daycare",
        enabled: true,
        requirement: "mandatory",
      },
      {
        serviceType: "boarding",
        enabled: true,
        requirement: "mandatory",
      },
      {
        serviceType: "grooming",
        enabled: true,
        requirement: "optional",
      },
      {
        serviceType: "training",
        enabled: false,
        requirement: "optional",
      },
    ],
    timing: {
      ...defaultTimingConfig,
      initialSendTime: 72,
      deadline: 24,
      reminderRules: [
        {
          id: "reminder-1",
          sendTime: 48,
          channel: "email",
        },
        {
          id: "reminder-2",
          sendTime: 24,
          channel: "email",
        },
        {
          id: "reminder-3",
          sendTime: 6,
          channel: "sms",
        },
      ],
    },
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-20T14:30:00Z",
    updatedBy: 1,
  },
  // Facility 11 (main app facility) – YipyyGo enabled for daycare, boarding, grooming
  {
    ...defaultYipyyGoConfig,
    facilityId: 11,
    enabled: true,
    addOnsApproval: "staff_approval",
    notifyStaffEmailOnSubmit: false,
    serviceConfigs: [
      { serviceType: "daycare", enabled: true, requirement: "optional" },
      { serviceType: "boarding", enabled: true, requirement: "optional" },
      { serviceType: "grooming", enabled: true, requirement: "optional" },
      { serviceType: "training", enabled: false, requirement: "optional" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 0,
  },
];

export function getYipyyGoConfig(facilityId: number): YipyyGoConfig | null {
  const config = mockYipyyGoConfigs.find((c) => c.facilityId === facilityId);
  if (config) {
    return { ...config };
  }

  // Return default config if not found
  return {
    ...defaultYipyyGoConfig,
    facilityId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 0,
  };
}

export function saveYipyyGoConfig(config: YipyyGoConfig): YipyyGoConfig {
  // In production, this would save to database
  const index = mockYipyyGoConfigs.findIndex(
    (c) => c.facilityId === config.facilityId,
  );
  const updatedConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    mockYipyyGoConfigs[index] = updatedConfig;
  } else {
    mockYipyyGoConfigs.push(updatedConfig);
  }

  return updatedConfig;
}

// ============================================================================
// Service Type Labels
// ============================================================================

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  daycare: "Daycare",
  boarding: "Boarding",
  grooming: "Grooming",
  training: "Training",
  custom: "Custom Service",
};

export const REQUIREMENT_LABELS: Record<YipyyGoRequirement, string> = {
  mandatory: "Mandatory",
  optional: "Optional",
};

export const DELIVERY_CHANNEL_LABELS: Record<DeliveryChannel, string> = {
  email: "Email",
  sms: "SMS",
  push: "Push Notification",
};

export const QUESTION_TYPE_LABELS: Record<CustomQuestionType, string> = {
  short_text: "Short Text",
  dropdown: "Dropdown",
  checkbox: "Checkbox",
  number: "Number",
  date: "Date",
  file_upload: "File Upload",
};

export const MULTI_PET_BEHAVIOR_LABELS: Record<MultiPetBehavior, string> = {
  one_form_per_pet: "One form per pet per booking",
  combined_form_with_sections: "Combined form with per-pet sections",
};
