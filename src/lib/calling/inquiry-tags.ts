import type { InquiryTag } from "@/types/calling";

/**
 * Maps each IVR menu key the caller can press to an inquiry tag. This is what
 * lets the queue card auto-populate its inquiry label from the IVR selection
 * instead of staff typing it. Keep in sync with the IVR `nodes` in
 * `@/data/calling` (ivrConfig).
 */
export const IVR_KEY_TO_INQUIRY_TAG: Record<string, InquiryTag> = {
  "1": "reception",
  "2": "grooming",
  "3": "boarding",
  "4": "billing",
  "5": "emergency",
  "6": "training",
};

/** Label + pill colour for each inquiry tag. */
export const INQUIRY_TAG_META: Record<
  InquiryTag,
  { label: string; pill: string }
> = {
  reception: {
    label: "Reception",
    pill: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700",
  },
  grooming: {
    label: "Grooming",
    pill: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  },
  boarding: {
    label: "Boarding",
    pill: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  },
  billing: {
    label: "Billing",
    pill: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  },
  emergency: {
    label: "Emergency",
    pill: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  },
  training: {
    label: "Training",
    pill: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  },
};

/** Resolve the inquiry tag a caller selected from the IVR key they pressed. */
export function inquiryTagForIvrKey(
  key: string | undefined,
): InquiryTag | undefined {
  if (!key) return undefined;
  return IVR_KEY_TO_INQUIRY_TAG[key];
}
