"use client";

import { useState, useMemo } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useSettings } from "@/hooks/use-settings";
import { clients } from "@/data/clients";
import { AdditionalContactsManager } from "@/components/clients/AdditionalContactsManager";
import type { AdditionalContact } from "@/types/client";
import { getEnabledCustomerLanguageOptions } from "@/lib/language-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Mail,
  Phone,
  MapPin,
  UserCircle,
  Bell,
  Save,
  Edit,
  AlertCircle,
  Loader2,
  Check,
  ChevronDown,
  X,
  Megaphone,
  CalendarCheck,
  CalendarClock,
  LogIn,
  CreditCard,
  Sparkles,
  ShieldAlert,
  Percent,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type NotificationChannel = "email" | "sms" | "push";

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: "Email",
  sms: "SMS",
  push: "Push",
};

type NotificationCategoryKey =
  | "bookingConfirmations"
  | "bookingReminders"
  | "checkInOut"
  | "reportCards"
  | "paymentReceipts"
  | "emergencyAlerts"
  | "marketing";

type NotificationCategoryGroup = "service" | "marketing";

interface NotificationCategoryMeta {
  key: NotificationCategoryKey;
  label: string;
  description: string;
  allowedChannels: NotificationChannel[];
  group: NotificationCategoryGroup;
  icon: typeof Bell;
  iconClass: string;
}

const NOTIFICATION_CATEGORIES: NotificationCategoryMeta[] = [
  {
    key: "bookingConfirmations",
    label: "Booking confirmations",
    description:
      "Updates when a booking is confirmed, rescheduled, or cancelled.",
    allowedChannels: ["email", "sms", "push"],
    group: "service",
    icon: CalendarCheck,
    iconClass: "bg-emerald-50 text-emerald-600",
  },
  {
    key: "bookingReminders",
    label: "Booking reminders",
    description: "Friendly reminders 24 hours before each appointment.",
    allowedChannels: ["email", "sms", "push"],
    group: "service",
    icon: CalendarClock,
    iconClass: "bg-blue-50 text-blue-600",
  },
  {
    key: "checkInOut",
    label: "Check-in & check-out",
    description: "Alerts when your pet arrives at and leaves the facility.",
    allowedChannels: ["email", "sms", "push"],
    group: "service",
    icon: LogIn,
    iconClass: "bg-violet-50 text-violet-600",
  },
  {
    key: "reportCards",
    label: "Report cards & pet updates",
    description: "Photos and daily updates from the team.",
    allowedChannels: ["email", "push"],
    group: "service",
    icon: Sparkles,
    iconClass: "bg-amber-50 text-amber-600",
  },
  {
    key: "paymentReceipts",
    label: "Payment receipts",
    description: "A receipt every time you’re charged.",
    allowedChannels: ["email"],
    group: "service",
    icon: CreditCard,
    iconClass: "bg-slate-100 text-slate-600",
  },
  {
    key: "emergencyAlerts",
    label: "Emergency alerts",
    description: "Critical, time-sensitive issues only.",
    allowedChannels: ["sms", "push"],
    group: "service",
    icon: ShieldAlert,
    iconClass: "bg-rose-50 text-rose-600",
  },
  {
    key: "marketing",
    label: "Promotions & news",
    description:
      "Occasional offers and facility news. Standard rates may apply.",
    allowedChannels: ["email", "sms"],
    group: "marketing",
    icon: Megaphone,
    iconClass: "bg-pink-50 text-pink-600",
  },
];

type NotificationCategoryState = Record<
  NotificationCategoryKey,
  { enabled: boolean; channels: NotificationChannel[] }
>;

const DEFAULT_CATEGORY_STATE: NotificationCategoryState = {
  bookingConfirmations: { enabled: true, channels: ["email", "push"] },
  bookingReminders: { enabled: true, channels: ["email", "sms", "push"] },
  checkInOut: { enabled: true, channels: ["email"] },
  reportCards: { enabled: true, channels: ["email", "push"] },
  paymentReceipts: { enabled: true, channels: ["email"] },
  emergencyAlerts: { enabled: true, channels: ["sms", "push"] },
  marketing: { enabled: false, channels: [] },
};

function ChannelSelect({
  value,
  onChange,
  allowed,
  disabled,
}: {
  value: NotificationChannel[];
  onChange: (next: NotificationChannel[]) => void;
  allowed: NotificationChannel[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ordered = allowed.filter((c) => value.includes(c));

  const toggle = (channel: NotificationChannel) => {
    onChange(
      value.includes(channel)
        ? value.filter((c) => c !== channel)
        : [...value, channel],
    );
  };

  // Single-channel categories don't need a multi-select — show a static badge.
  if (allowed.length === 1) {
    return (
      <div
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-md border border-dashed bg-muted/30 px-2.5 text-xs",
          disabled && "opacity-50",
        )}
      >
        <span className="text-muted-foreground">Sent via</span>
        <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
          {CHANNEL_LABELS[allowed[0]]}
        </Badge>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-state={open ? "open" : "closed"}
          className={cn(
            "group flex h-9 w-full items-center gap-1 rounded-md border border-input bg-background px-2 text-left text-sm shadow-xs transition-colors outline-none",
            "hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <div className="flex flex-1 flex-wrap items-center gap-1 overflow-hidden">
            {ordered.length === 0 ? (
              <span className="text-muted-foreground text-xs">
                Pick a channel
              </span>
            ) : (
              ordered.map((c) => (
                <Badge
                  key={c}
                  variant="secondary"
                  className="h-6 gap-0.5 px-1.5 text-[11px]"
                >
                  {CHANNEL_LABELS[c]}
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Remove ${CHANNEL_LABELS[c]}`}
                    className="hover:bg-foreground/10 -mr-0.5 inline-flex size-4 items-center justify-center rounded-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!disabled) toggle(c);
                    }}
                  >
                    <X className="size-2.5" />
                  </span>
                </Badge>
              ))
            )}
          </div>
          <ChevronDown
            className={cn(
              "text-muted-foreground ml-1 size-4 shrink-0 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
        <div className="space-y-0.5">
          {allowed.map((channel) => {
            const checked = value.includes(channel);
            return (
              <button
                type="button"
                key={channel}
                onClick={() => toggle(channel)}
                className="hover:bg-muted flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm transition-colors"
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-sm border",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {checked && <Check className="size-3" />}
                </span>
                <span>{CHANNEL_LABELS[channel]}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export default function CustomerSettingsPage() {
  const { selectedFacility: _selectedFacility } = useCustomerFacility();
  const { languageSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Get customer data
  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    [],
  );

  const [profileData, setProfileData] = useState({
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
  });

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

  const initialAutoTip = customer?.customerSettings?.autoTip ?? {
    enabled: false,
    type: "percentage" as "percentage" | "fixed",
    value: 20,
  };
  const [paymentPreferences, setPaymentPreferences] = useState(initialAutoTip);

  const [notificationPreferences, setNotificationPreferences] = useState({
    categories: DEFAULT_CATEGORY_STATE,
    // Per-pet preferences (report cards)
    perPetReportCards: {} as Record<number, boolean>,
    // Quiet hours for SMS/push
    quietHoursEnabled: false,
    quietHoursStart: "21:00",
    quietHoursEnd: "07:00",
    // Language preference
    language: defaultNotificationLanguage,
  });

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

  // Derive pets for this customer (for per-pet notification preferences)
  const customerPets = useMemo(() => {
    return customer?.pets || [];
  }, [customer]);

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
      const normalizedNotificationPreferences = {
        ...notificationPreferences,
        language: selectedNotificationLanguage,
      };

      // TODO: Replace with actual API call
      // This should update the customer profile and sync to all facilities
      await updateCustomerProfile(
        profileData,
        normalizedNotificationPreferences,
        paymentPreferences,
      );
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
    // Reset to original customer data
    setProfileData({
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
    });
    setPaymentPreferences(initialAutoTip);
    setErrors({});
    setIsEditing(false);
  };

  // Placeholder function - replace with actual API call
  const updateCustomerProfile = async (
    _data: typeof profileData,
    _notifications: typeof notificationPreferences,
    _payment: typeof paymentPreferences,
  ) => {
    // TODO: API call to update customer profile
    // This should sync to all facilities automatically
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your profile and preferences
            </p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 size-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Your personal information. Updates will reflect on the facility
              side automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData({ ...profileData, name: e.target.value })
                  }
                  disabled={!isEditing}
                  aria-invalid={errors.name ? "true" : "false"}
                />
                {errors.name && (
                  <p className="text-destructive text-sm">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({ ...profileData, email: e.target.value })
                    }
                    disabled={!isEditing}
                    className="pl-9"
                    aria-invalid={errors.email ? "true" : "false"}
                  />
                </div>
                {errors.email && (
                  <p className="text-destructive text-sm">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) =>
                      setProfileData({ ...profileData, phone: e.target.value })
                    }
                    disabled={!isEditing}
                    className="pl-9"
                    placeholder="(555) 123-4567"
                    aria-invalid={errors.phone ? "true" : "false"}
                  />
                </div>
                {errors.phone && (
                  <p className="text-destructive text-sm">{errors.phone}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Address */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="text-muted-foreground size-5" />
                <Label className="text-base font-semibold">Address</Label>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={profileData.address.street}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        address: {
                          ...profileData.address,
                          street: e.target.value,
                        },
                      })
                    }
                    disabled={!isEditing}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={profileData.address.city}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        address: {
                          ...profileData.address,
                          city: e.target.value,
                        },
                      })
                    }
                    disabled={!isEditing}
                    placeholder="Springfield"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={profileData.address.state}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        address: {
                          ...profileData.address,
                          state: e.target.value,
                        },
                      })
                    }
                    disabled={!isEditing}
                    placeholder="IL"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={profileData.address.zip}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        address: {
                          ...profileData.address,
                          zip: e.target.value,
                        },
                      })
                    }
                    disabled={!isEditing}
                    placeholder="62701"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={profileData.address.country}
                    onValueChange={(value) =>
                      setProfileData({
                        ...profileData,
                        address: { ...profileData.address, country: value },
                      })
                    }
                    disabled={!isEditing}
                  >
                    <SelectTrigger id="country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USA">United States</SelectItem>
                      <SelectItem value="CAN">Canada</SelectItem>
                      <SelectItem value="MEX">Mexico</SelectItem>
                      <SelectItem value="GBR">United Kingdom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Contacts */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <UserCircle className="text-muted-foreground size-5" />
                <Label className="text-base font-semibold">
                  Additional Contacts
                </Label>
              </div>
              <AdditionalContactsManager
                value={profileData.additionalContacts}
                onChange={(contacts) =>
                  setProfileData({
                    ...profileData,
                    additionalContacts: contacts,
                  })
                }
                disabled={!isEditing}
                heading=""
                description="Add people who can be contacted for emergencies, pickup, or drop-off. Tag each contact with what they're authorized to do."
              />
            </div>
          </CardContent>
        </Card>

        {/* Pick-up & Drop-off Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-5" />
              Pick-up & Drop-off Instructions
            </CardTitle>
            <CardDescription>
              Let the facility know who is allowed to pick up your pets and any
              special instructions for boarding or daycare.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="authorizedPickup">
                  Who is allowed to pick up?{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    (Names of family, friends, pet transport services)
                  </span>
                </Label>
                <Textarea
                  id="authorizedPickup"
                  placeholder="Example: Robert Johnson (spouse), Sarah Lee (sister), Paws Taxi Service"
                  rows={4}
                  value={profileData.pickupDropoff.authorizedPickupPeople}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      pickupDropoff: {
                        ...profileData.pickupDropoff,
                        authorizedPickupPeople: e.target.value,
                      },
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickupNotes">
                  Additional instructions (optional)
                </Label>
                <Textarea
                  id="pickupNotes"
                  placeholder="Gate code, parking details, which door to use, special handling notes..."
                  rows={4}
                  value={profileData.pickupDropoff.notes}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      pickupDropoff: {
                        ...profileData.pickupDropoff,
                        notes: e.target.value,
                      },
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Staff will use this information at check-in and pick-up. Make sure
              the people you list bring a valid ID when picking up your pet.
            </p>
          </CardContent>
        </Card>

        {/* Payment Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-5" />
              Payment Preferences
            </CardTitle>
            <CardDescription>
              Set a default tip to apply automatically when a card on file is
              charged. Skips the tip prompt at checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-0.5 pr-4">
                <Label className="text-sm">
                  Apply the tip to my account automatically when processing the
                  payment
                </Label>
                <p className="text-muted-foreground text-xs">
                  When enabled, the tip below is added to every payment without
                  showing a prompt.
                </p>
              </div>
              <Switch
                checked={paymentPreferences.enabled}
                onCheckedChange={(checked) =>
                  setPaymentPreferences({
                    ...paymentPreferences,
                    enabled: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>

            <div
              className={cn(
                "rounded-lg border p-4 transition-opacity",
                !paymentPreferences.enabled && "opacity-50",
              )}
            >
              <Label className="text-sm">Auto tipping</Label>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr]">
                <Select
                  value={paymentPreferences.type}
                  onValueChange={(value) =>
                    setPaymentPreferences({
                      ...paymentPreferences,
                      type: value as "percentage" | "fixed",
                    })
                  }
                  disabled={!isEditing || !paymentPreferences.enabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">By percentage</SelectItem>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  {paymentPreferences.type === "fixed" && (
                    <DollarSign className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  )}
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={paymentPreferences.type === "percentage" ? 1 : 0.5}
                    value={paymentPreferences.value}
                    onChange={(e) =>
                      setPaymentPreferences({
                        ...paymentPreferences,
                        value:
                          e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                    disabled={!isEditing || !paymentPreferences.enabled}
                    className={cn(
                      paymentPreferences.type === "fixed"
                        ? "pl-9 pr-12"
                        : "pr-9",
                    )}
                  />
                  <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                    {paymentPreferences.type === "percentage" ? (
                      <Percent className="size-4" />
                    ) : (
                      "USD"
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose how you want to receive notifications from the facility
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Service notifications — what + how */}
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-semibold">Service notifications</h3>
                <p className="text-muted-foreground hidden text-xs sm:block">
                  Choose what to be notified about and where to receive it.
                </p>
              </div>

              <div className="divide-border/70 bg-card overflow-hidden rounded-xl border divide-y">
                {NOTIFICATION_CATEGORIES.filter((c) => c.group === "service").map(
                  (cat) => {
                    const state = notificationPreferences.categories[cat.key];
                    const Icon = cat.icon;
                    const isOn = state.enabled;
                    return (
                      <div
                        key={cat.key}
                        data-enabled={isOn}
                        className="grid grid-cols-1 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/20 sm:grid-cols-[1fr_minmax(0,18rem)] sm:gap-6"
                      >
                        <label
                          htmlFor={`notif-${cat.key}`}
                          className={cn(
                            "flex cursor-pointer items-start gap-3",
                            !isEditing && "cursor-default",
                          )}
                        >
                          <Checkbox
                            id={`notif-${cat.key}`}
                            checked={isOn}
                            onCheckedChange={(checked) => {
                              const enabled = checked === true;
                              const next: Partial<
                                NotificationCategoryState[NotificationCategoryKey]
                              > = { enabled };
                              // Re-enabling with no channels left? Restore the
                              // category's defaults so the user isn't stranded
                              // with an "on" toggle that delivers nothing.
                              if (enabled && state.channels.length === 0) {
                                next.channels =
                                  DEFAULT_CATEGORY_STATE[cat.key].channels;
                              }
                              updateCategory(cat.key, next);
                            }}
                            disabled={!isEditing}
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "flex size-7 shrink-0 items-center justify-center rounded-lg",
                                  cat.iconClass,
                                  !isOn && "opacity-50",
                                )}
                              >
                                <Icon className="size-3.5" />
                              </span>
                              <p
                                className={cn(
                                  "text-sm font-medium",
                                  !isOn && "text-muted-foreground",
                                )}
                              >
                                {cat.label}
                              </p>
                            </div>
                            <p className="text-muted-foreground mt-1 ml-9 text-xs leading-relaxed">
                              {cat.description}
                            </p>
                          </div>
                        </label>

                        <div
                          className={cn(
                            "sm:justify-self-end sm:w-full pl-7 sm:pl-0",
                            !isOn && "pointer-events-none opacity-40",
                          )}
                        >
                          <ChannelSelect
                            value={state.channels}
                            onChange={(channels) =>
                              updateCategory(cat.key, { channels })
                            }
                            allowed={cat.allowedChannels}
                            disabled={!isEditing || !isOn}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            {/* Marketing — separate group to make the consent boundary explicit */}
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-semibold">Marketing</h3>
                <p className="text-muted-foreground hidden text-xs sm:block">
                  Optional. Unsubscribe at any time.
                </p>
              </div>

              <div className="divide-border/70 bg-card overflow-hidden rounded-xl border divide-y">
                {NOTIFICATION_CATEGORIES.filter((c) => c.group === "marketing").map(
                  (cat) => {
                    const state = notificationPreferences.categories[cat.key];
                    const Icon = cat.icon;
                    const isOn = state.enabled;
                    return (
                      <div
                        key={cat.key}
                        className="grid grid-cols-1 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/20 sm:grid-cols-[1fr_minmax(0,18rem)] sm:gap-6"
                      >
                        <label
                          htmlFor={`notif-${cat.key}`}
                          className={cn(
                            "flex cursor-pointer items-start gap-3",
                            !isEditing && "cursor-default",
                          )}
                        >
                          <Checkbox
                            id={`notif-${cat.key}`}
                            checked={isOn}
                            onCheckedChange={(checked) => {
                              const enabled = checked === true;
                              const next: Partial<
                                NotificationCategoryState[NotificationCategoryKey]
                              > = { enabled };
                              if (enabled && state.channels.length === 0) {
                                next.channels = ["email"];
                              }
                              updateCategory(cat.key, next);
                            }}
                            disabled={!isEditing}
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "flex size-7 shrink-0 items-center justify-center rounded-lg",
                                  cat.iconClass,
                                  !isOn && "opacity-50",
                                )}
                              >
                                <Icon className="size-3.5" />
                              </span>
                              <p
                                className={cn(
                                  "text-sm font-medium",
                                  !isOn && "text-muted-foreground",
                                )}
                              >
                                {cat.label}
                              </p>
                            </div>
                            <p className="text-muted-foreground mt-1 ml-9 text-xs leading-relaxed">
                              {cat.description}
                            </p>
                          </div>
                        </label>

                        <div
                          className={cn(
                            "sm:justify-self-end sm:w-full pl-7 sm:pl-0",
                            !isOn && "pointer-events-none opacity-40",
                          )}
                        >
                          <ChannelSelect
                            value={state.channels}
                            onChange={(channels) =>
                              updateCategory(cat.key, { channels })
                            }
                            allowed={cat.allowedChannels}
                            disabled={!isEditing || !isOn}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            <Separator />

            {/* Per-Pet Report Card Preferences */}
            {customerPets.length > 0 && (
              <>
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-base font-semibold">
                      Report cards by pet
                    </h3>
                    <p className="text-muted-foreground hidden text-xs sm:block">
                      Pick which pets should generate report cards.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {customerPets.map((pet) => {
                      const enabled =
                        notificationPreferences.perPetReportCards[pet.id] ??
                        true;
                      return (
                        <label
                          key={pet.id}
                          htmlFor={`pet-rc-${pet.id}`}
                          className={cn(
                            "bg-card hover:bg-muted/30 flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                            !isEditing && "cursor-default",
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full text-sm">
                              {pet.type === "Dog"
                                ? "🐶"
                                : pet.type === "Cat"
                                  ? "🐱"
                                  : "🐾"}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {pet.name}
                              </p>
                              <p className="text-muted-foreground truncate text-xs">
                                {pet.breed}
                              </p>
                            </div>
                          </div>
                          <Switch
                            id={`pet-rc-${pet.id}`}
                            checked={enabled}
                            onCheckedChange={(checked) =>
                              setNotificationPreferences({
                                ...notificationPreferences,
                                perPetReportCards: {
                                  ...notificationPreferences.perPetReportCards,
                                  [pet.id]: checked,
                                },
                              })
                            }
                            disabled={!isEditing}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Quiet Hours & Language */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Quiet Hours */}
              <div className="space-y-4">
                <div className="mb-1 flex items-center gap-2">
                  <Bell className="text-muted-foreground size-5" />
                  <h3 className="text-lg font-semibold">
                    Quiet Hours (SMS & Push)
                  </h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  During quiet hours, non‑urgent SMS and push notifications will
                  be held and sent after your quiet period ends. Emergency
                  alerts may still be delivered.
                </p>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Enable Quiet Hours</Label>
                    <p className="text-muted-foreground text-xs">
                      Temporarily mute reminders and updates overnight.
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.quietHoursEnabled}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        quietHoursEnabled: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
                {notificationPreferences.quietHoursEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="quiet-start">Start Time</Label>
                      <Input
                        id="quiet-start"
                        type="time"
                        value={notificationPreferences.quietHoursStart}
                        onChange={(e) =>
                          setNotificationPreferences({
                            ...notificationPreferences,
                            quietHoursStart: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="quiet-end">End Time</Label>
                      <Input
                        id="quiet-end"
                        type="time"
                        value={notificationPreferences.quietHoursEnd}
                        onChange={(e) =>
                          setNotificationPreferences({
                            ...notificationPreferences,
                            quietHoursEnd: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Language Preference */}
              <div className="space-y-4">
                <div className="mb-1 flex items-center gap-2">
                  <UserCircle className="text-muted-foreground size-5" />
                  <h3 className="text-lg font-semibold">Language Preference</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Choose the language you prefer for emails, SMS (where
                  supported), and in‑app communications for facilities that
                  support multiple languages.
                </p>
                <div className="max-w-xs space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={selectedNotificationLanguage}
                    onValueChange={(value) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        language: value,
                      })
                    }
                    disabled={!isEditing}
                  >
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerLanguageOptions.map((option) => (
                        <SelectItem key={option.code} value={option.code}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Language options are based on your facility settings.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Banner */}
        {isEditing && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-primary mt-0.5 size-5" />
                <div className="flex-1">
                  <p className="mb-1 text-sm font-medium">
                    Changes sync automatically
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Any updates you make will automatically reflect on the
                    facility side. The facility staff will see your updated
                    information immediately.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
