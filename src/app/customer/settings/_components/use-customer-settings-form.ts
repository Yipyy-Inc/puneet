"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { clients } from "@/data/clients";
import {
  memberships as allMemberships,
  membershipPlans,
} from "@/data/services-pricing";
import { getEnabledCustomerLanguageOptions } from "@/lib/language-settings";
import { useSettings } from "@/hooks/use-settings";
import type { AdditionalContact } from "@/types/client";
import {
  DEFAULT_CATEGORY_STATE,
  DEFAULT_PRIVACY_PREFERENCES,
  type NotificationCategoryKey,
  type NotificationCategoryState,
  type NotificationPreferences,
  type PaymentPreferences,
  type PrivacyPreferences,
  type ProfileData,
} from "./types";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export function useCustomerSettingsForm() {
  const { languageSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    [],
  );

  const initialProfileData: ProfileData = useMemo(
    () => ({
      name: customer?.name || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      address: {
        street: customer?.address?.street || "",
        city: customer?.address?.city || "",
        state: customer?.address?.state || "",
        zip: customer?.address?.zip || "",
        country: customer?.address?.country || "USA",
      },
      additionalContacts: (customer?.additionalContacts ??
        []) as AdditionalContact[],
      pickupDropoff: {
        authorizedPickupPeople: "",
        notes: "",
      },
    }),
    [customer],
  );

  const [profileData, setProfileData] =
    useState<ProfileData>(initialProfileData);

  const customerLanguageOptions = useMemo(
    () => getEnabledCustomerLanguageOptions(languageSettings),
    [languageSettings],
  );

  const defaultNotificationLanguage = useMemo(() => {
    const customerPreferredLanguage = customer?.preferredLanguage
      ?.trim()
      .toLowerCase();

    if (
      customerPreferredLanguage &&
      customerLanguageOptions.some(
        (option) => option.code === customerPreferredLanguage,
      )
    ) {
      return customerPreferredLanguage;
    }

    return customerLanguageOptions[0]?.code ?? languageSettings.primaryLocale;
  }, [customer, customerLanguageOptions, languageSettings.primaryLocale]);

  const initialAutoTip: PaymentPreferences = customer?.customerSettings
    ?.autoTip ?? {
    enabled: false,
    type: "percentage",
    value: 20,
  };
  const [paymentPreferences, setPaymentPreferences] =
    useState<PaymentPreferences>(initialAutoTip);

  // Instant booking is facility-managed (staff toggles it on the client file).
  // The customer sees a read-only summary so they know which of their
  // bookings will skip the request queue and be auto-confirmed.
  const instabookSummary = useMemo(() => {
    const cs = customer?.customerSettings;
    const activeMembership = allMemberships.find(
      (m) =>
        m.customerId === String(MOCK_CUSTOMER_ID) && m.status === "active",
    );
    const activePlan = activeMembership
      ? membershipPlans.find((p) => p.id === activeMembership.planId)
      : undefined;
    const fromMembership = new Set(activePlan?.instabookServices ?? []);
    return {
      planName: activePlan?.name,
      services: [
        {
          key: "daycare" as const,
          label: "Daycare",
          fromSetting: !!cs?.instabookDaycare,
          fromMembership: fromMembership.has("daycare"),
        },
        {
          key: "boarding" as const,
          label: "Boarding",
          fromSetting: !!cs?.instabookBoarding,
          fromMembership: fromMembership.has("boarding"),
        },
        {
          key: "grooming" as const,
          label: "Grooming",
          fromSetting: !!cs?.instabookGrooming,
          fromMembership: fromMembership.has("grooming"),
        },
      ],
    };
  }, [customer]);

  const hasAnyInstabook = instabookSummary.services.some(
    (s) => s.fromSetting || s.fromMembership,
  );

  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>({
      categories: DEFAULT_CATEGORY_STATE,
      perPetReportCards: {},
      quietHoursEnabled: false,
      quietHoursStart: "21:00",
      quietHoursEnd: "07:00",
      language: defaultNotificationLanguage,
    });

  const [privacyPreferences, setPrivacyPreferences] =
    useState<PrivacyPreferences>(DEFAULT_PRIVACY_PREFERENCES);

  const updateCategory = (
    key: NotificationCategoryKey,
    next: Partial<NotificationCategoryState[NotificationCategoryKey]>,
  ) => {
    setNotificationPreferences((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [key]: { ...prev.categories[key], ...next },
      },
    }));
  };

  const selectedNotificationLanguage = customerLanguageOptions.some(
    (option) => option.code === notificationPreferences.language,
  )
    ? notificationPreferences.language
    : defaultNotificationLanguage;

  const [errors, setErrors] = useState<Record<string, string>>({});

  const customerPets = useMemo(() => customer?.pets || [], [customer]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!profileData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!profileData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (profileData.phone && !/^[\d\s\-\(\)]+$/.test(profileData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    profileData.additionalContacts.forEach((contact, index) => {
      if (!contact.name.trim()) {
        newErrors[`additionalContact-${index}-name`] = "Name is required";
      }
      if (!contact.phone.trim()) {
        newErrors[`additionalContact-${index}-phone`] = "Phone is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors before saving");
      return;
    }

    setIsSaving(true);

    try {
      // TODO: Replace with actual API call
      // This should update the customer profile and sync to all facilities
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsEditing(false);
      toast.success(
        "Profile updated successfully! Changes will reflect on the facility side.",
      );
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setProfileData(initialProfileData);
    setPaymentPreferences(initialAutoTip);
    setPrivacyPreferences(DEFAULT_PRIVACY_PREFERENCES);
    setErrors({});
    setIsEditing(false);
  };

  return {
    // mode
    isEditing,
    setIsEditing,
    isSaving,
    handleSave,
    handleCancel,
    // profile
    profileData,
    setProfileData,
    errors,
    // payment
    paymentPreferences,
    setPaymentPreferences,
    // privacy
    privacyPreferences,
    setPrivacyPreferences,
    // notifications
    notificationPreferences,
    setNotificationPreferences,
    updateCategory,
    selectedNotificationLanguage,
    customerLanguageOptions,
    // instant booking
    instabookSummary,
    hasAnyInstabook,
    // pets
    customerPets,
  };
}

export type CustomerSettingsForm = ReturnType<typeof useCustomerSettingsForm>;
