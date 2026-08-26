"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  Globe,
  DollarSign,
  FileText,
  Tags,
  CreditCard,
  MessageSquare,
  Zap,
  ArrowLeftRight,
  Shield,
  StickyNote,
  MapPin,
  Check,
  Pencil,
  Save,
  ChevronRight,
  Network,
  Plus,
  Building2,
  Type,
  Image as ImageIcon,
  Palette,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { FacilityLocation } from "@/types/location";
import type { NetworkPolicy } from "@/types/facility";
import {
  locationStyles,
  locationHex,
  styleFromKey,
  type LocationColorKey,
} from "@/lib/hq/location-styles";
import {
  locationOnboardingSteps,
  type OnboardingStaffMember,
} from "@/lib/hq/location-onboarding";
import { useSettings } from "@/hooks/use-settings";
import { useFacilityLocations } from "@/lib/api/locations";
import { useStaffHomeLocations, staffQueries } from "@/lib/api/staff";
import { useHqNetworkSubscription } from "@/lib/api/hq-billing";
import { formatCurrencyWhole } from "@/lib/format";
import type { HqSubscriptionStatus } from "@/types/hq-billing";

function ToggleSetting({
  label,
  description,
  icon: Icon,
  value,
  onChange,
  tone = "sky",
}: {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  value: boolean;
  onChange: (v: boolean) => void;
  tone?: LocationColorKey;
}) {
  const s = styleFromKey(tone);
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
            s.bgSoft,
          )}
        >
          <Icon className={cn("size-4", s.text)} />
        </div>
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-muted-foreground mt-0.5 text-xs/relaxed">
            {description}
          </p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-all duration-200",
          value ? "bg-primary" : "bg-gray-200 dark:bg-gray-700",
        )}
        role="switch"
        aria-checked={value}
        aria-label={label}
      >
        <span
          className={cn(
            "inline-block size-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            value ? "translate-x-4.5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

function ScopeSetting({
  label,
  description,
  icon: Icon,
  value,
  options,
  onChange,
  tone = "violet",
}: {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  tone?: LocationColorKey;
}) {
  const s = styleFromKey(tone);
  return (
    <div className="py-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
            s.bgSoft,
          )}
        >
          <Icon className={cn("size-4", s.text)} />
        </div>
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-muted-foreground mt-0.5 text-xs/relaxed">
            {description}
          </p>
        </div>
      </div>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          "bg-muted/30 mt-3 grid w-full gap-1 rounded-lg border p-1 sm:ml-11",
          options.length === 3 ? "grid-cols-3 sm:w-96" : "grid-cols-2 sm:w-72",
        )}
      >
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-md px-3 py-2 text-xs font-semibold transition-all",
                active
                  ? cn(s.bg, "text-white shadow-sm")
                  : "text-muted-foreground hover:bg-background hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChoiceCard({
  active,
  onClick,
  title,
  description,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all",
        active
          ? "border-primary bg-primary/5 shadow-sm"
          : "hover:border-border/80 hover:bg-muted/30",
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg transition-colors",
            active
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </div>
        {active && (
          <div className="bg-primary flex size-5 items-center justify-center rounded-full">
            <Check className="size-3 text-white" />
          </div>
        )}
      </div>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-muted-foreground text-xs/relaxed">
        {description}
      </span>
    </button>
  );
}

function LocationOnboardingRow({
  loc,
  staffAtLocation,
}: {
  loc: FacilityLocation;
  staffAtLocation: OnboardingStaffMember[];
}) {
  const steps = locationOnboardingSteps(loc, staffAtLocation);
  const done = steps.filter((step) => step.done).length;
  const missing = steps.filter((step) => !step.done);
  const total = steps.length;
  const ready = missing.length === 0;
  const s = locationStyles(loc);

  return (
    <div className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white",
            s.bg,
          )}
        >
          {(loc.shortCode ?? loc.name).slice(0, 3)}
        </span>
        <span className="text-sm font-semibold">{loc.name}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {done}/{total} steps
        </span>
        {ready ? (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            Ready to go live
          </span>
        ) : (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <AlertCircle className="size-3.5" />
            {missing.length} step{missing.length === 1 ? "" : "s"} remaining
          </span>
        )}
      </div>
      <div className="bg-muted mt-2 h-1.5 w-full overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            ready ? "bg-emerald-500" : "bg-amber-500",
          )}
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
      {!ready && (
        <p className="text-muted-foreground mt-1.5 text-[11px]">
          <span className="font-semibold">Missing:</span>{" "}
          {missing.map((m) => m.label).join(", ")}
        </p>
      )}
    </div>
  );
}

const SUBSCRIPTION_STATUS_STYLE: Record<
  HqSubscriptionStatus,
  { label: string; className: string }
> = {
  trialing: {
    label: "Trialing",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  active: {
    label: "Active",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  past_due: {
    label: "Past due",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  suspended: {
    label: "Suspended",
    className:
      "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-border bg-muted text-muted-foreground",
  },
};

export function HQSettingsClient() {
  const { networkPolicy, updateNetworkPolicy } = useSettings();
  // A draft only exists once the owner starts editing -- `null` means "show
  // the real, saved policy". Mirrors HQIntegrationsClient's read (no loading
  // guard needed: useFacilitySettings falls back to the domain's default
  // synchronously), but keeps THIS screen's existing review-before-committing
  // shape, which many toggles with real cross-location consequences warrants.
  const [draft, setDraft] = useState<NetworkPolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDisableAutomations, setConfirmDisableAutomations] =
    useState(false);

  const { data: locationsData, isPending: locationsPending } =
    useFacilityLocations();
  const { data: staffHomeLocations } = useStaffHomeLocations();
  const { data: staffProfiles } = useQuery(staffQueries.profiles());
  const { data: subscription, isPending: subscriptionPending } =
    useHqNetworkSubscription();
  const locations = locationsData ?? [];

  // Every staff member currently claimed and living at that branch, by
  // primaryRole -- everything `locationOnboardingSteps` needs to judge
  // "staff assigned" and "manager designated" for real.
  const staffByLocation = useMemo(() => {
    const profileByStaffId = new Map(
      (staffProfiles ?? []).map((p) => [p.id, p]),
    );
    const map = new Map<string, OnboardingStaffMember[]>();
    for (const s of staffHomeLocations ?? []) {
      if (!s.claimed || !s.homeLocationId) continue;
      const profile = profileByStaffId.get(s.staffId);
      if (!profile) continue;
      const existing = map.get(s.homeLocationId) ?? [];
      existing.push({ primaryRole: profile.primaryRole });
      map.set(s.homeLocationId, existing);
    }
    return map;
  }, [staffHomeLocations, staffProfiles]);

  const s = draft ?? networkPolicy;
  const dirty = draft !== null;

  const update = (patch: Partial<NetworkPolicy>) => {
    setDraft({ ...s, ...patch });
  };

  const save = () => {
    if (!draft) return;
    setSaving(true);
    void updateNetworkPolicy(draft).then(
      () => {
        setDraft(null);
        setSaving(false);
        toast.success("HQ settings saved");
      },
      (error: unknown) => {
        setSaving(false);
        toast.error(
          error instanceof Error ? error.message : "Could not save that.",
        );
      },
    );
  };

  if (locationsPending) {
    return (
      <div className="space-y-6 p-4 pt-6 md:p-8">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-7 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/facility/hq/overview">
            <Button variant="ghost" size="icon" className="size-9">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
              <Link
                href="/facility/hq/overview"
                className="hover:text-foreground transition-colors"
              >
                HQ
              </Link>
              <ChevronRight className="size-3" />
              <span>Settings</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">HQ Settings</h1>
            <p className="text-muted-foreground text-sm">
              Multi-location controls, policies & data sharing
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={save}
          disabled={!dirty || saving}
        >
          <Save className="size-3.5" />
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      {dirty && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
          <Pencil className="size-3.5 shrink-0" />
          You have unsaved changes
        </div>
      )}

      {/* Locations overview */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="size-4" />
                Active Locations
              </CardTitle>
              <CardDescription>
                {locations.length} branches in this network
              </CardDescription>
            </div>
            {/* One screen creates a location, and it is not this one --
                /facility/hq/locations owns the real Add Location dialog. */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
            >
              <Link href="/facility/hq/locations">
                <Plus className="size-3.5" />
                Add Location
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => {
            const ls = locationStyles(loc);
            return (
              <div
                key={loc.id}
                className={cn(
                  "group relative overflow-hidden rounded-xl border p-3 transition-all hover:shadow-sm",
                  ls.borderSoft,
                )}
              >
                <div className={cn("absolute inset-x-0 top-0 h-0.5", ls.bg)} />
                <div className="flex items-start gap-2.5">
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white shadow-sm",
                      ls.bg,
                    )}
                  >
                    {(loc.shortCode ?? loc.name).slice(0, 3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">
                        {loc.name}
                      </p>
                      {loc.isPrimary && (
                        <span className="rounded-sm bg-sky-100 px-1 py-px text-[9px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                      <MapPin className="size-3" />
                      {loc.address?.city ?? "No address yet"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      loc.status === "active"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : loc.status === "coming_soon"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        loc.status === "active"
                          ? "bg-emerald-500"
                          : loc.status === "coming_soon"
                            ? "bg-amber-500"
                            : "bg-rose-500",
                      )}
                    />
                    {loc.status === "active"
                      ? "Live"
                      : loc.status === "coming_soon"
                        ? "Coming soon"
                        : "Closed"}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Data Sharing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="size-4" />
            Data Sharing
          </CardTitle>
          <CardDescription>
            Control what data is shared across all locations
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <ToggleSetting
            label="Centralized Customer Data"
            description="Customers and pets exist once globally, with location-specific booking history. Disabling creates separate customer records per location."
            icon={Users}
            value={s.centralizedCustomerData}
            onChange={(v) => update({ centralizedCustomerData: v })}
            tone="sky"
          />
          <ToggleSetting
            label="Shared Staff Pool"
            description="Allow staff to be assigned to multiple locations. Enables cross-location conflict detection in scheduling."
            icon={Network}
            value={s.sharedStaffPool}
            onChange={(v) => update({ sharedStaffPool: v })}
            tone="violet"
          />
          <ScopeSetting
            label="Agreements"
            description="Whether customer agreements are shared globally or signed per-location."
            icon={FileText}
            value={s.agreementsScope}
            options={[
              { value: "global", label: "Global" },
              { value: "per_location", label: "Per-Location" },
            ]}
            onChange={(v) =>
              update({ agreementsScope: v as typeof s.agreementsScope })
            }
            tone="emerald"
          />
          <ScopeSetting
            label="Tags"
            description="Whether pet and client tags are shared across all locations or kept separate."
            icon={Tags}
            value={s.tagsScope}
            options={[
              { value: "global", label: "Global" },
              { value: "per_location", label: "Per-Location" },
            ]}
            onChange={(v) => update({ tagsScope: v as typeof s.tagsScope })}
            tone="amber"
          />
          <ScopeSetting
            label="Payment Methods"
            description="Whether saved customer payment methods are available at all locations or just the registering location."
            icon={CreditCard}
            value={s.paymentMethodsScope}
            options={[
              { value: "global", label: "Global" },
              { value: "per_location", label: "Per-Location" },
            ]}
            onChange={(v) =>
              update({ paymentMethodsScope: v as typeof s.paymentMethodsScope })
            }
            tone="rose"
          />
          <ScopeSetting
            label="Internal Notes"
            description="Staff notes about customers or pets. Shared = any staff at any location can see notes written by any other location's staff. Private = notes are visible only to staff at the location that wrote them."
            icon={StickyNote}
            value={s.internalNotesScope}
            options={[
              { value: "global", label: "Shared" },
              { value: "per_location", label: "Private" },
            ]}
            onChange={(v) =>
              update({ internalNotesScope: v as typeof s.internalNotesScope })
            }
            tone="sky"
          />
        </CardContent>
      </Card>

      {/* Network Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Palette className="size-4" />
            Network Branding
          </CardTitle>
          <CardDescription>
            Control which branding is shared across the network and which each
            location sets for itself.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <ScopeSetting
            label="Name"
            description="How the business name appears. Both = the network name with each location as a suffix (e.g. “Yipyy – Plateau”)."
            icon={Type}
            value={s.brandingNameScope}
            options={[
              { value: "network", label: "Network name" },
              { value: "per_location", label: "Own name" },
              { value: "both", label: "Both" },
            ]}
            onChange={(v) =>
              update({ brandingNameScope: v as typeof s.brandingNameScope })
            }
            tone="violet"
          />
          <ScopeSetting
            label="Logo"
            description="One shared logo across every location, or a distinct logo per location."
            icon={ImageIcon}
            value={s.brandingLogoScope}
            options={[
              { value: "global", label: "One for all" },
              { value: "per_location", label: "Per-Location" },
            ]}
            onChange={(v) =>
              update({ brandingLogoScope: v as typeof s.brandingLogoScope })
            }
            tone="sky"
          />
          <ScopeSetting
            label="Primary Colour"
            description="One global brand colour, or let each location pick its own accent colour."
            icon={Palette}
            value={s.brandingColorScope}
            options={[
              { value: "global", label: "Global" },
              { value: "per_location", label: "Per-Location" },
            ]}
            onChange={(v) =>
              update({ brandingColorScope: v as typeof s.brandingColorScope })
            }
            tone="emerald"
          />
        </CardContent>
      </Card>

      {/* Location Onboarding Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ClipboardCheck className="size-4" />
            Location Onboarding Checklist
          </CardTitle>
          <CardDescription>
            Configuration each location needs before it can go live — derived
            from the location record.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {locations.map((loc) => (
            <LocationOnboardingRow
              key={loc.id}
              loc={loc}
              staffAtLocation={staffByLocation.get(loc.id) ?? []}
            />
          ))}
        </CardContent>
      </Card>

      {/* Network Billing */}
      {(() => {
        const activeLocations = locations.filter(
          (l) => l.status === "active",
        ).length;
        const cycleShort: Record<string, string> = {
          monthly: "mo",
          quarterly: "qtr",
          yearly: "yr",
        };
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CreditCard className="size-4" />
                Network Billing
              </CardTitle>
              <CardDescription>
                Your Yipyy subscription for this network.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscriptionPending ? (
                <Skeleton className="h-24 rounded-lg" />
              ) : !subscription ? (
                <p className="text-muted-foreground text-sm">
                  No subscription on file for this facility yet.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {subscription.tierName}
                      </p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {formatCurrencyWhole(subscription.amountCents / 100)} /{" "}
                        {cycleShort[subscription.billingCycle] ??
                          subscription.billingCycle}{" "}
                        · {subscription.billingCycle}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                        SUBSCRIPTION_STATUS_STYLE[subscription.status]
                          .className,
                      )}
                    >
                      {SUBSCRIPTION_STATUS_STYLE[subscription.status].label}
                    </span>
                  </div>

                  {subscription.status === "trialing" &&
                    subscription.trialEndsAt && (
                      <p className="text-muted-foreground text-xs">
                        Trial ends{" "}
                        {new Date(subscription.trialEndsAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                    )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="bg-muted/40 rounded-lg border p-3">
                      <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                        Locations
                      </p>
                      <p className="mt-0.5 text-sm font-bold tabular-nums">
                        {activeLocations} /{" "}
                        {subscription.maxLocations ?? "Unlimited"}
                      </p>
                      {subscription.maxLocations !== null &&
                        activeLocations > subscription.maxLocations && (
                          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            over your plan&apos;s location limit
                          </p>
                        )}
                    </div>
                    <div className="bg-muted/40 rounded-lg border p-3">
                      <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                        Renews
                      </p>
                      <p className="mt-0.5 text-sm font-bold tabular-nums">
                        {subscription.periodEnd
                          ? new Date(subscription.periodEnd).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Link href="/facility/settings/billing">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <CreditCard className="size-3.5" />
                        Manage subscription
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Pricing model */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <DollarSign className="size-4" />
            Pricing Model
          </CardTitle>
          <CardDescription>
            How service pricing is managed across your locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceCard
              active={s.pricingModel === "centralized"}
              onClick={() => update({ pricingModel: "centralized" })}
              icon={Globe}
              title="Centralized"
              description="One pricing structure applies to all locations. Changes propagate everywhere."
            />
            <ChoiceCard
              active={s.pricingModel === "per_location"}
              onClick={() => update({ pricingModel: "per_location" })}
              icon={MapPin}
              title="Per location"
              description="Each location manages its own pricing. Allows regional variation."
            />
          </div>
        </CardContent>
      </Card>

      {/* Transfer policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ArrowLeftRight className="size-4" />
            Booking Transfer Policy
          </CardTitle>
          <CardDescription>
            Rules for moving bookings between locations
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <ToggleSetting
            label="Require Customer Approval"
            description="When enabled, the customer must confirm before a booking transfer is finalized. A notification is sent requesting approval."
            icon={Shield}
            value={s.transferRequiresCustomerApproval}
            onChange={(v) => update({ transferRequiresCustomerApproval: v })}
            tone="rose"
          />
          <div className="py-4">
            <div className="mb-3 flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <DollarSign className="size-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">Transfer Pricing</p>
                <p className="text-muted-foreground text-xs">
                  What happens to pricing when a booking is transferred between
                  locations
                </p>
              </div>
            </div>
            <div className="ml-11 grid gap-2 sm:grid-cols-3">
              {(
                [
                  {
                    value: "keep_original",
                    label: "Keep original",
                    desc: "Price doesn't change",
                  },
                  {
                    value: "apply_destination",
                    label: "Apply new price",
                    desc: "Use destination pricing",
                  },
                  {
                    value: "staff_choice",
                    label: "Staff decides",
                    desc: "Prompt staff each time",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update({ transferPricingPolicy: opt.value })}
                  className={cn(
                    "flex flex-col gap-0.5 rounded-xl border p-3 text-left text-xs transition-all",
                    s.transferPricingPolicy === opt.value
                      ? "border-primary bg-primary/5"
                      : "hover:border-border/80 hover:bg-muted/30",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{opt.label}</span>
                    {s.transferPricingPolicy === opt.value && (
                      <Check className="text-primary size-3" />
                    )}
                  </div>
                  <span className="text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Communications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <MessageSquare className="size-4" />
            Communications & Automations
          </CardTitle>
          <CardDescription>
            Template and automation sharing across locations
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <ToggleSetting
            label="Shared Email Templates"
            description="All locations use the same email templates. Disabling lets each location customize their own messaging."
            icon={MessageSquare}
            value={s.sharedEmailTemplates}
            onChange={(v) => update({ sharedEmailTemplates: v })}
            tone="sky"
          />
          <ToggleSetting
            label="Shared Automations"
            description="Automation rules (reminders, follow-ups) are shared globally. Disabling creates separate automation configs per location."
            icon={Zap}
            value={s.sharedAutomations}
            onChange={(v) => {
              if (v) {
                update({ sharedAutomations: true });
              } else {
                // Turning off is disruptive — confirm before applying.
                setConfirmDisableAutomations(true);
              }
            }}
            tone="violet"
          />
        </CardContent>
      </Card>

      {/* ── Per-location booking pages ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Globe className="size-4" />
            Per-Location Booking Pages
          </CardTitle>
          <CardDescription>
            Each location has its own public booking URL. Share these directly
            with clients.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {locations.map((loc) => {
            const slug = (loc.shortCode ?? loc.name).toLowerCase();
            const url = `/book/${slug}`;
            return (
              <div
                key={loc.id}
                className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: locationHex(loc) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{loc.name}</p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground font-mono text-xs hover:underline"
                  >
                    yipyy.com{url}
                  </a>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (typeof navigator !== "undefined") {
                      navigator.clipboard.writeText(
                        `${typeof window !== "undefined" ? window.location.origin : ""}${url}`,
                      );
                      toast.success("Link copied");
                    }
                  }}
                >
                  Copy link
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    Preview
                  </a>
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Cross-location features ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Network className="size-4" />
            Cross-Location Features
          </CardTitle>
          <CardDescription>
            Toggle which features bridge across all locations. Off = each
            location operates in isolation.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <ToggleSetting
            label="Cross-Location Loyalty"
            description="Loyalty points earned at one location can be redeemed at any location. Off = points stay tied to the location they were earned at."
            icon={Shield}
            value={s.crossLocationLoyalty}
            onChange={(v) => update({ crossLocationLoyalty: v })}
            tone="amber"
          />
          <ToggleSetting
            label="Cross-Location Gift Cards"
            description="Gift cards purchased at one location can be redeemed at any location."
            icon={CreditCard}
            value={s.crossLocationGiftCards}
            onChange={(v) => update({ crossLocationGiftCards: v })}
            tone="violet"
          />
          <ToggleSetting
            label="Shared Waivers"
            description="A signed waiver is valid at every location until the waiver version is updated. Off = client signs fresh at each location."
            icon={FileText}
            value={s.sharedWaivers}
            onChange={(v) => update({ sharedWaivers: v })}
            tone="sky"
          />
          <ToggleSetting
            label="Shared Incident History"
            description="Incidents at any location are visible at every other location — safety-critical, highly recommended on."
            icon={Shield}
            value={s.sharedIncidentHistory}
            onChange={(v) => update({ sharedIncidentHistory: v })}
            tone="rose"
          />
          <ToggleSetting
            label="Shared Medical Records"
            description="Vaccinations, allergies, and medications are pooled across all locations."
            icon={Shield}
            value={s.sharedMedicalRecords}
            onChange={(v) => update({ sharedMedicalRecords: v })}
            tone="emerald"
          />
        </CardContent>
      </Card>

      <Separator />
      <div className="flex justify-end">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={save}
          disabled={!dirty || saving}
        >
          <Save className="size-3.5" />
          {saving ? "Saving…" : "Save HQ Settings"}
        </Button>
      </div>

      <AlertDialog
        open={confirmDisableAutomations}
        onOpenChange={setConfirmDisableAutomations}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable shared automations?</AlertDialogTitle>
            <AlertDialogDescription>
              Disabling shared automations means you will need to configure
              reminder and follow-up rules separately for each location. Are you
              sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => update({ sharedAutomations: false })}
            >
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
