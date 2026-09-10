"use client";

import { useMemo, useState } from "react";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import { toast } from "sonner";
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
import { useCustomerText } from "@/lib/customer/use-customer-text";

export function useCustomerSettingsForm() {
  const { t } = useCustomerText("settings");
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  const { languageSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
      (m) => m.customerId === String(customerId) && m.status === "active",
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
          fromSetting: !!cs?.instabookDaycare,
          fromMembership: fromMembership.has("daycare"),
        },
        {
          key: "boarding" as const,
          fromSetting: !!cs?.instabookBoarding,
          fromMembership: fromMembership.has("boarding"),
        },
        {
          key: "grooming" as const,
          fromSetting: !!cs?.instabookGrooming,
          fromMembership: fromMembership.has("grooming"),
        },
      ],
    };
  }, [customerId, customer]);

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

  // Each error is a CATALOGUE KEY; the field renders it through `t`, so a
  // French customer reads the message in French.
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!profileData.name.trim()) {
      newErrors.name = "errNameRequired";
    }

    if (!profileData.email.trim()) {
      newErrors.email = "errEmailRequired";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      newErrors.email = "errEmailInvalid";
    }

    if (profileData.phone && !/^[\d\s\-\(\)]+$/.test(profileData.phone)) {
      newErrors.phone = "errPhoneInvalid";
    }

    profileData.additionalContacts.forEach((contact, index) => {
      if (!contact.name.trim()) {
        // french-ok: an error-map key, not copy
        newErrors[`additionalContact-${index}-name`] = "errNameRequired";
      }
      if (!contact.phone.trim()) {
        // french-ok: an error-map key, not copy
        newErrors[`additionalContact-${index}-phone`] = "errPhoneRequired";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error(t("fixErrorsBeforeSaving"));
      return;
    }

    setIsSaving(true);

    try {
      // TODO: Replace with actual API call
      // This should update the customer profile and sync to all facilities
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsEditing(false);
      toast.success(t("profileUpdated"));
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : t("profileUpdateFailed"),
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
