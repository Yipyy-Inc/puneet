"use client";

import {
  SERVICE_TYPE_LABELS,
  REQUIREMENT_LABELS,
  DELIVERY_CHANNEL_LABELS,
  type ServiceType,
  type YipyyGoRequirement,
  type DeliveryChannel,
} from "@/data/yipyygo-config";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// The three label tables Yipyy Go reads out of a src/data fixture.
//
// A fixture cannot know a locale, and these three are read from four different
// components — so the lookup lives here once rather than four times. Each falls
// back to the fixture's own English on a miss, so a service type or channel
// added to the fixture later reads as English words rather than as a raw key.
//
// The KEY is what travels: `serviceType` is stored on the config and matched
// against the booking, so only the label moves.
// ============================================================================

const SERVICE_TYPE_KEYS: Record<ServiceType, string> = {
  daycare: "svcDaycare",
  boarding: "svcBoarding",
  grooming: "svcGrooming",
  training: "svcTraining",
  custom: "svcCustom",
};

const REQUIREMENT_KEYS: Record<YipyyGoRequirement, string> = {
  mandatory: "reqMandatory",
  optional: "reqOptional",
};

const CHANNEL_KEYS: Record<DeliveryChannel, string> = {
  email: "chEmail",
  sms: "chSms",
  push: "chPush",
};

// Named `use…` so the rules-of-hooks lint can see that it calls one.
function useLabelResolver<K extends string>(
  keys: Record<K, string>,
  fallbacks: Record<K, string>,
): (value: K) => string {
  const t = useSettingsText().section("yipyygo");
  return (value: K) => {
    const key = keys[value];
    if (key === undefined) return fallbacks[value] ?? value;
    const label = t(key);
    return label === key ? (fallbacks[value] ?? value) : label;
  };
}

export function useServiceTypeLabel(): (value: ServiceType) => string {
  return useLabelResolver(SERVICE_TYPE_KEYS, SERVICE_TYPE_LABELS);
}

export function useRequirementLabel(): (value: YipyyGoRequirement) => string {
  return useLabelResolver(REQUIREMENT_KEYS, REQUIREMENT_LABELS);
}

export function useDeliveryChannelLabel(): (value: DeliveryChannel) => string {
  return useLabelResolver(CHANNEL_KEYS, DELIVERY_CHANNEL_LABELS);
}
