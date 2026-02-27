/**
 * YipyyGo Configuration
 * 
 * Pre-check-in form system configuration for facilities.
 * Allows facilities to configure which services require pre-check-in forms,
 * timing, reminders, and form templates.
 */

// ============================================================================
// Core Types
// ============================================================================

export type ServiceType = "daycare" | "boarding" | "grooming" | "training" | "custom";

export type YipyyGoRequirement = "mandatory" | "optional";

export type DeliveryChannel = "email" | "sms" | "push";

export type CustomQuestionType = "short_text" | "dropdown" | "checkbox" | "number" | "date" | "file_upload";

export type MultiPetBehavior = "one_form_per_pet" | "combined_form_with_sections";

// ============================================================================
// Service Configuration
// ============================================================================

export interface ServiceYipyyGoConfig {
  serviceType: ServiceType;
  customServiceName?: string; // For custom services
  enabled: boolean;
  requirement: YipyyGoRequirement;
}

// ============================================================================
// Timing & Reminders Configuration
// ============================================================================

export interface ReminderRule {
  id: string;
  sendTime: number; // Hours before check-in (e.g., 48 = 48 hours before)
  channel: DeliveryChannel;
  template?: string; // Optional custom message template
}

export interface TimingConfig {
  initialSendTime: number; // Hours before check-in to send initial form
  deadline: number; // Hours before check-in that form must be completed
  reminderRules: ReminderRule[];
  deliveryChannels: DeliveryChannel[];
}

// ============================================================================
// Form Template Configuration
// ============================================================================

export interface CustomQuestion {
  id: string;
  type: CustomQuestionType;
  label: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  
  // For dropdown type
  options?: { value: string; label: string }[];
  
  // For checkbox type
  defaultChecked?: boolean;
  
  // For number type
  min?: number;
  max?: number;
  
  // For date type
  minDate?: string;
  maxDate?: string;
  
  // Display order
  order: number;
}

export interface FormSection {
  id: string;
  label: string;
  enabled: boolean;
  required: boolean;
  order: number;
  customQuestions?: CustomQuestion[];
}

export interface FormTemplateConfig {
  // Section toggles
  sections: {
    petInfo: FormSection;
    careInstructions: FormSection;
    medications: FormSection;
    feedingSchedule: FormSection;
    emergencyContact: FormSection;
    specialRequests: FormSection;
    customSections: FormSection[]; // Additional custom sections
  };
  
  // Feature toggles
  features: {
    photoUploads: boolean;
    addOnsSection: boolean;
    tipSection: boolean;
  };
  
  // Multi-pet behavior
  multiPetBehavior: MultiPetBehavior;
  
  // Custom questions (global, not section-specific)
  globalCustomQuestions: CustomQuestion[];
}

// ============================================================================
// Complete YipyyGo Configuration
// ============================================================================

export interface YipyyGoConfig {
  facilityId: number;
  enabled: boolean;
  
  // Service scope
  serviceConfigs: ServiceYipyyGoConfig[];
  
  // Timing & reminders
  timing: TimingConfig;
  
  // Form template
  formTemplate: FormTemplateConfig;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  updatedBy: number; // User ID
}

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
  globalCustomQuestions: [],
};

export const defaultYipyyGoConfig: Omit<YipyyGoConfig, "facilityId" | "createdAt" | "updatedAt" | "updatedBy"> = {
  enabled: false,
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
  const index = mockYipyyGoConfigs.findIndex((c) => c.facilityId === config.facilityId);
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
