"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { clients } from "@/data/clients";
import {
  memberships as allMemberships,
  membershipPlans,
} from "@/data/services-pricing";
import { defaultCustomerSettings, type CustomerSettings } from "@/types/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import {
  Settings,
  Mail,
  Save,
  Zap,
  HelpCircle,
  Crown,
  ExternalLink,
  Ban,
  CreditCard,
  Percent,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
];

interface ToggleRowProps {
  label: string;
  description?: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  highlight?: boolean;
}

function ToggleRow({
  label,
  description,
  hint,
  checked,
  onCheckedChange,
  disabled,
  highlight,
}: ToggleRowProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
        highlight
          ? "border-amber-200 bg-amber-50/40"
          : "hover:bg-muted/30"
      }`}
    >
      <div className="space-y-0.5 pr-4">
        <div className="flex items-center gap-1.5">
          <Label className="text-base">{label}</Label>
          {hint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <HelpCircle className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">{hint}</TooltipContent>
            </Tooltip>
          )}
        </div>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export default function FacilityClientSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const clientId = parseInt(id, 10);
  const client = clients.find((c) => c.id === clientId);

  const initialSettings: CustomerSettings = useMemo(
    () => ({
      ...defaultCustomerSettings,
      preferredLanguage:
        client?.preferredLanguage ?? defaultCustomerSettings.preferredLanguage,
      ...(client?.customerSettings ?? {}),
    }),
    [client],
  );

  const [settings, setSettings] = useState<CustomerSettings>(initialSettings);
  const [isBlocked, setIsBlocked] = useState<boolean>(client?.isBlocked ?? false);
  const [blockedReason, setBlockedReason] = useState<string>(
    client?.blockedReason ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);

  const customerIdStr = String(clientId);
  const activeMembership = useMemo(
    () =>
      allMemberships.find(
        (m) => m.customerId === customerIdStr && m.status === "active",
      ),
    [customerIdStr],
  );
  const activePlan = useMemo(
    () =>
      activeMembership
        ? membershipPlans.find((p) => p.id === activeMembership.planId)
        : undefined,
    [activeMembership],
  );
  const planInstabookServices = activePlan?.instabookServices ?? [];

  if (!client) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Client not found.</p>
      </div>
    );
  }

  const dirty =
    JSON.stringify(settings) !== JSON.stringify(initialSettings) ||
    isBlocked !== (client?.isBlocked ?? false) ||
    blockedReason !== (client?.blockedReason ?? "");

  const update = (patch: Partial<CustomerSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  const updateAutoTip = (patch: Partial<CustomerSettings["autoTip"]>) =>
    setSettings((prev) => ({
      ...prev,
      autoTip: { ...prev.autoTip, ...patch },
    }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: persist to backend
      await new Promise((resolve) => setTimeout(resolve, 600));
      const wasBlocked = client?.isBlocked ?? false;
      if (isBlocked !== wasBlocked) {
        toast.success(
          isBlocked
            ? `${client?.name ?? "Client"} has been blocked`
            : `${client?.name ?? "Client"} has been unblocked`,
        );
      } else {
        toast.success("Customer settings updated");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(initialSettings);
    setIsBlocked(client?.isBlocked ?? false);
    setBlockedReason(client?.blockedReason ?? "");
  };

  return (
    <div className="space-y-6 p-4 pt-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Settings className="size-5" />
            Customer Settings
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure email, notification, and booking preferences for{" "}
            <span className="font-medium">{client.name}</span>. These mirror
            what the customer sees in their account settings.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!dirty || isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!dirty || isSaving}>
            <Save className="mr-2 size-4" />
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Account Status — Block this client */}
      <Card
        className={
          isBlocked
            ? "border-red-300 bg-red-50/40"
            : "border-amber-200/70"
        }
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ban
              className={`size-4 ${isBlocked ? "text-red-600" : "text-amber-600"}`}
            />
            Account Status
          </CardTitle>
          <CardDescription>
            Block this client to stop all communication. The profile, booking
            history, and pet records remain visible for reference, but the
            facility will no longer interact with them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className={`flex items-start justify-between gap-4 rounded-lg border p-4 transition-colors ${
              isBlocked
                ? "border-red-300 bg-red-50/60"
                : "border-amber-200 bg-amber-50/40"
            }`}
          >
            <div className="space-y-1.5 pr-4">
              <div className="flex items-center gap-2">
                <Label className="text-base">Block this client</Label>
                {isBlocked && (
                  <Badge
                    variant="outline"
                    className="h-5 border-red-300 bg-white px-2 text-[10px] font-medium text-red-700"
                  >
                    Blocked
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                When enabled:
              </p>
              <ul className="text-muted-foreground ml-4 list-disc space-y-0.5 text-sm">
                <li>The client can no longer send messages to the facility</li>
                <li>
                  Excluded from all marketing campaigns, reminders, and
                  automated emails / SMS
                </li>
                <li>
                  Call forwarding from this client and their additional
                  contacts is disabled
                </li>
                <li>
                  Booking history, pets, and invoices are preserved for the
                  record
                </li>
              </ul>
            </div>
            <Switch
              checked={isBlocked}
              onCheckedChange={setIsBlocked}
              className="mt-1 data-[state=checked]:bg-red-600"
            />
          </div>

          {isBlocked && (
            <div className="space-y-1.5">
              <Label className="text-sm">
                Internal note (optional)
                <span className="text-muted-foreground ml-1 font-normal">
                  — visible to staff only
                </span>
              </Label>
              <Textarea
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
                placeholder="e.g. Repeated no-shows, abusive behavior toward staff…"
                rows={2}
                className="bg-white"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email & Notification preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4" />
            Email & Notification Preferences
          </CardTitle>
          <CardDescription>
            Controls automated emails sent to this customer for their bookings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            label="Enable thank you emails"
            description="Send a thank-you email after each completed visit."
            checked={settings.enableThankYouEmails}
            onCheckedChange={(v) => update({ enableThankYouEmails: v })}
          />
          <ToggleRow
            label="Enable reminder emails"
            description="Send appointment reminder emails before each booking."
            checked={settings.enableReminderEmails}
            onCheckedChange={(v) => update({ enableReminderEmails: v })}
          />
          <ToggleRow
            label="Enable ongoing schedule reminder emails"
            description="Reminders for recurring/ongoing schedules (weekly daycare, etc.)."
            checked={settings.enableOngoingScheduleReminderEmails}
            onCheckedChange={(v) =>
              update({ enableOngoingScheduleReminderEmails: v })
            }
          />
          <ToggleRow
            label="Apply passes by default when the customer books online"
            description="Automatically deduct credits from their active package/membership at checkout."
            checked={settings.applyPassesByDefault}
            onCheckedChange={(v) => update({ applyPassesByDefault: v })}
          />
          <ToggleRow
            label="Copy the additional contact when sending booking confirmation emails"
            checked={settings.copyAdditionalContactOnBookingConfirmations}
            onCheckedChange={(v) =>
              update({ copyAdditionalContactOnBookingConfirmations: v })
            }
          />
          <ToggleRow
            label="Copy the additional contact when sending other system emails"
            checked={settings.copyAdditionalContactOnSystemEmails}
            onCheckedChange={(v) =>
              update({ copyAdditionalContactOnSystemEmails: v })
            }
          />

          <Separator className="my-2" />

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Preferred language</Label>
              <p className="text-muted-foreground text-sm">
                Used for automated emails and SMS templates.
              </p>
            </div>
            <Select
              value={settings.preferredLanguage}
              onValueChange={(v) => update({ preferredLanguage: v })}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payment preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4" />
            Payment Preferences
          </CardTitle>
          <CardDescription>
            Auto-apply a tip when processing this customer&apos;s payments. Works
            seamlessly when a card is saved on file. The customer can also
            manage this from their account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-0.5 pr-4">
              <Label className="text-base">
                Apply the tip to this client automatically when processing the
                payment
              </Label>
              <p className="text-muted-foreground text-sm">
                Skip the tip prompt at checkout — the chosen amount is added
                automatically.
              </p>
            </div>
            <Switch
              checked={settings.autoTip.enabled}
              onCheckedChange={(v) => updateAutoTip({ enabled: v })}
            />
          </div>

          <div
            className={cn(
              "rounded-lg border p-4 transition-opacity",
              !settings.autoTip.enabled && "opacity-50",
            )}
          >
            <Label className="text-base">Auto tipping</Label>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr]">
              <Select
                value={settings.autoTip.type}
                onValueChange={(v) =>
                  updateAutoTip({ type: v as "percentage" | "fixed" })
                }
                disabled={!settings.autoTip.enabled}
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
                {settings.autoTip.type === "fixed" && (
                  <DollarSign className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                )}
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={settings.autoTip.type === "percentage" ? 1 : 0.5}
                  value={settings.autoTip.value}
                  onChange={(e) =>
                    updateAutoTip({
                      value: e.target.value === "" ? 0 : Number(e.target.value),
                    })
                  }
                  disabled={!settings.autoTip.enabled}
                  className={cn(
                    settings.autoTip.type === "fixed" ? "pl-9 pr-9" : "pr-9",
                  )}
                />
                <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                  {settings.autoTip.type === "percentage" ? (
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

      {/* Instant booking */}
      <Card className="border-amber-200/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="size-4 text-amber-500" />
            Instant Booking (skip approval)
          </CardTitle>
          <CardDescription>
            When enabled, this customer&apos;s online bookings skip the booking
            requests queue and are auto-confirmed (room/section assigned
            automatically). The customer immediately receives the same email
            and SMS confirmation they would have received after staff approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {activePlan && planInstabookServices.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm">
              <Crown className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="font-medium text-amber-900">
                  {activePlan.name} membership grants instant booking for:
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {planInstabookServices.map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className="border-amber-300 bg-white text-[10px] capitalize text-amber-800"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-amber-800/80">
                  Membership-granted instant booking applies on top of the
                  per-customer toggles below.
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-7">
                <Link href="/facility/services/memberships">
                  <ExternalLink className="size-3.5" />
                </Link>
              </Button>
            </div>
          )}

          <ToggleRow
            highlight
            label="Allow this customer to instabook daycare instead of submitting a request"
            description="Daycare reservations are auto-confirmed without staff review."
            hint="The system will skip the requests queue, automatically assign the daycare section based on the customer's selection (or the default), and immediately send the confirmation email/SMS the customer would normally receive after staff approval."
            checked={settings.instabookDaycare}
            onCheckedChange={(v) => update({ instabookDaycare: v })}
          />
          <ToggleRow
            highlight
            label="Allow this customer to instabook boarding"
            description="Boarding stays are auto-confirmed without staff review."
            checked={settings.instabookBoarding}
            onCheckedChange={(v) => update({ instabookBoarding: v })}
          />
          <ToggleRow
            highlight
            label="Allow this customer to instabook grooming"
            description="Grooming appointments are auto-confirmed at the requested time."
            checked={settings.instabookGrooming}
            onCheckedChange={(v) => update({ instabookGrooming: v })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
