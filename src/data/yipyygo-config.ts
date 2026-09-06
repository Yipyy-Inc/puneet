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
  MedicationFeeConfig,
  MedicationFeeBilling,
  TipPopupConfig,
  TipPopupPreset,
  ConfirmationEmailConfig,
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
  MedicationFeeConfig,
  MedicationFeeBilling,
  TipPopupConfig,
  TipPopupPreset,
  ConfirmationEmailConfig,
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
    additionalContacts: {
      id: "additional-contacts",
      label: "Additional Contacts",
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
    tipSection: true,
    contactInfoSection: true,
    petDetailsSection: true,
    bookingDetailsSection: true,
    belongingsPhotoRequired: true,
  },
  multiPetBehavior: "one_form_per_pet",
  addOnsScope: "booking",
  globalCustomQuestions: [],
};

export const defaultMedicationFeeConfig: MedicationFeeConfig = {
  enabled: false,
  amount: 0,
  billing: "per_day",
  label: "Medication administration fee",
  description: "",
};

export const defaultTipPopupConfig: TipPopupConfig = {
  enabled: true,
  title: "Leave a tip for the team?",
  message:
    "Our team loves caring for your pet. If you'd like to leave a tip, it goes directly to the staff looking after them.",
  appliesTo: "stay_total",
  allowCustomAmount: true,
  allowSkip: true,
  presets: [
    { id: "tip-10", label: "10%", type: "percentage", value: 10 },
    { id: "tip-15", label: "15%", type: "percentage", value: 15 },
    { id: "tip-20", label: "20%", type: "percentage", value: 20 },
  ],
};

export const defaultConfirmationEmailConfig: ConfirmationEmailConfig = {
  enabled: true,
  subject: "Thank you for completing your Express Check-in",
  message:
    "Thank you for completing your Express Check-in. We're excited to meet {petName} on {date}!",
};

export const defaultYipyyGoConfig: Omit<
  YipyyGoConfig,
  "facilityId" | "createdAt" | "updatedAt" | "updatedBy"
> = {
  enabled: false,
  addOnsApproval: "staff_approval",
  notifyStaffEmailOnSubmit: false,
  medicationFee: defaultMedicationFeeConfig,
  tipPopup: defaultTipPopupConfig,
  confirmationEmail: defaultConfirmationEmailConfig,
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
// THE CONFIG STORE THAT USED TO BE HERE IS GONE (2026-09-06).
//
// `mockYipyyGoConfigs`, `getYipyyGoConfig()` and `saveYipyyGoConfig()` lived
// under this heading. The save was a splice into a module-level array —
//
//   // In production, this would save to database
//   mockYipyyGoConfigs[index] = updatedConfig;
//
// — under a settings screen that then said "Express Check-in settings saved
// successfully". Twelve call sites read the array, including the customer's own
// booking page and the trigger that decides whether to ask for a form at all.
//
// The setup now lives in `facility_settings.yipyy_go_config`. Read it with
// `useYipyyGoConfig()` inside the facility portal, or `useCustomerYipyyGo()` in
// the customer portal — they are separate on purpose, and the banner on
// src/lib/api/customer-yipyy-go.ts says why crossing them is a real bug.
//
// What is left in this file is what it should always have been: the shipped
// DEFAULTS, two pure helpers, and the label maps. No state.
// ============================================================================

/**
 * Builds the per-service override key used in `YipyyGoConfig.formTemplates`.
 * Standard service types are stored under their slug ("daycare"); custom
 * services are keyed as `custom:<serviceName>` so two custom services don't
 * collide on the bare "custom" key.
 */
export function getServiceTemplateKey(
  serviceType: string,
  customServiceName?: string,
): string {
  if (serviceType === "custom" && customServiceName) {
    return `custom:${customServiceName}`;
  }
  return serviceType;
}

/**
 * Resolves the form template to use for a given booking's service. Returns the
 * per-service override if one exists, otherwise falls back to the global
 * `formTemplate`. Use this in any consumer that renders/queries the customer
 * Express Check-in form so it picks up per-service customization.
 */
export function getFormTemplateForService(
  // The two template fields, not the whole row. Callers now hand it a
  // `YipyyGoSettings` off `facility_settings`, which has no facilityId or
  // timestamps — and this function never wanted them.
  config: Pick<YipyyGoConfig, "formTemplate" | "formTemplates">,
  serviceType: string,
  customServiceName?: string,
): FormTemplateConfig {
  const key = getServiceTemplateKey(serviceType, customServiceName);
  return config.formTemplates?.[key] ?? config.formTemplate;
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
  long_text: "Long Text",
  yes_no: "Yes / No",
  dropdown: "Dropdown (single select)",
  multi_select: "Multi-select",
  checkbox: "Checkbox",
  number: "Number",
  date: "Date",
  file_upload: "File Upload",
};

export const MULTI_PET_BEHAVIOR_LABELS: Record<MultiPetBehavior, string> = {
  one_form_per_pet: "One form per pet per booking",
  combined_form_with_sections: "Combined form with per-pet sections",
};
