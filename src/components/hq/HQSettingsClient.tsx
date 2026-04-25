"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { HQSettings, Location } from "@/types/location";

interface Props {
  settings: HQSettings;
  locations: Location[];
}

function ToggleSetting({
  label,
  description,
  icon: Icon,
  value,
  onChange,
  accent,
}: {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  value: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent ?? "#0ea5e9"}18` }}
        >
          <Icon className="size-4" style={{ color: accent ?? "#0ea5e9" }} />
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
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
  accent,
}: {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  accent?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent ?? "#8b5cf6"}18` }}
        >
          <Icon className="size-4" style={{ color: accent ?? "#8b5cf6" }} />
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
              value === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/60",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function HQSettingsClient({ settings, locations }: Props) {
  const [s, setS] = useState(settings);
  const [dirty, setDirty] = useState(false);

  const update = (patch: Partial<typeof s>) => {
    setS((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const save = () => {
    setDirty(false);
    toast.success("HQ settings saved successfully");
  };

  return (
    <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/facility/hq/overview">
            <Button variant="ghost" size="icon" className="size-9">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">HQ Settings</h1>
            <p className="text-muted-foreground text-sm">Multi-location controls & policies</p>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={save}
          disabled={!dirty}
        >
          <Save className="size-3.5" />
          Save Changes
        </Button>
      </div>

      {dirty && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
          <Pencil className="size-3.5 shrink-0" />
          You have unsaved changes
        </div>
      )}

      {/* Locations Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Globe className="size-4" />
            Locations
          </CardTitle>
          <CardDescription>All active locations in this facility network</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/30"
            >
              <div
                className="flex size-8 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                style={{ backgroundColor: loc.color }}
              >
                {loc.shortCode}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{loc.name}</p>
                  {loc.isPrimary && (
                    <Badge variant="secondary" className="text-[10px]">Primary</Badge>
                  )}
                </div>
                <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                  <MapPin className="size-3" />
                  {loc.address}, {loc.city}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex gap-1 flex-wrap justify-end">
                  {loc.services.map((svc) => (
                    <Badge key={svc} variant="outline" className="text-[10px] capitalize">{svc}</Badge>
                  ))}
                </div>
                <div className={cn(
                  "flex size-6 items-center justify-center rounded-full",
                  loc.isActive ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-red-100 dark:bg-red-950/40",
                )}>
                  <div className={cn(
                    "size-2 rounded-full",
                    loc.isActive ? "bg-emerald-500" : "bg-red-500",
                  )} />
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full gap-1.5 text-xs"
            onClick={() => toast.info("Add location — coming soon")}
          >
            + Add Location
          </Button>
        </CardContent>
      </Card>

      {/* Data Sharing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="size-4" />
            Data Sharing
          </CardTitle>
          <CardDescription>Control what data is shared across all locations</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <ToggleSetting
            label="Centralized Customer Data"
            description="Customers and pets exist once globally, with location-specific booking history. Disabling this creates separate customer records per location."
            icon={Users}
            value={s.centralizedCustomerData}
            onChange={(v) => update({ centralizedCustomerData: v })}
            accent="#0ea5e9"
          />
          <ToggleSetting
            label="Shared Staff Pool"
            description="Allow staff to be assigned to multiple locations. Enables cross-location conflict detection in scheduling."
            icon={Users}
            value={s.sharedStaffPool}
            onChange={(v) => update({ sharedStaffPool: v })}
            accent="#8b5cf6"
          />
          <ScopeSetting
            label="Agreements"
            description="Control whether customer agreements are shared globally or signed per-location."
            icon={FileText}
            value={s.agreementsScope}
            options={[{ value: "global", label: "Global" }, { value: "per_location", label: "Per location" }]}
            onChange={(v) => update({ agreementsScope: v as typeof s.agreementsScope })}
          />
          <ScopeSetting
            label="Tags"
            description="Manage whether pet and client tags are shared across all locations or kept separate."
            icon={Tags}
            value={s.tagsScope}
            options={[{ value: "global", label: "Global" }, { value: "per_location", label: "Per location" }]}
            onChange={(v) => update({ tagsScope: v as typeof s.tagsScope })}
          />
          <ScopeSetting
            label="Payment Methods"
            description="Whether saved customer payment methods are available at all locations or just the registering location."
            icon={CreditCard}
            value={s.paymentMethodsScope}
            options={[{ value: "global", label: "Global" }, { value: "per_location", label: "Per location" }]}
            onChange={(v) => update({ paymentMethodsScope: v as typeof s.paymentMethodsScope })}
          />
          <ScopeSetting
            label="Internal Notes"
            description="Staff notes about customers or pets — choose between shared visibility or location-scoped privacy."
            icon={StickyNote}
            value={s.internalNotesScope}
            options={[{ value: "global", label: "Shared" }, { value: "per_location", label: "Private" }]}
            onChange={(v) => update({ internalNotesScope: v as typeof s.internalNotesScope })}
            accent="#f59e0b"
          />
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <DollarSign className="size-4" />
            Pricing Model
          </CardTitle>
          <CardDescription>How service pricing is managed across your locations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["centralized", "per_location"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => update({ pricingModel: opt })}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all",
                  s.pricingModel === opt
                    ? "border-primary bg-primary/5"
                    : "hover:border-border/80 hover:bg-muted/30",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold capitalize">
                    {opt === "centralized" ? "Centralized" : "Per location"}
                  </span>
                  {s.pricingModel === opt && (
                    <div className="flex size-5 items-center justify-center rounded-full bg-primary">
                      <Check className="size-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  {opt === "centralized"
                    ? "One pricing structure applies to all locations. Changes propagate everywhere."
                    : "Each location manages its own pricing independently. Allows regional variation."}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transfer Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ArrowLeftRight className="size-4" />
            Booking Transfer Policy
          </CardTitle>
          <CardDescription>Rules for moving bookings between locations</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <ToggleSetting
            label="Require Customer Approval"
            description="When enabled, a customer must confirm before a booking transfer is finalized. A notification is sent requesting approval."
            icon={Shield}
            value={s.transferRequiresCustomerApproval}
            onChange={(v) => update({ transferRequiresCustomerApproval: v })}
            accent="#ef4444"
          />
          <div className="py-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                <DollarSign className="size-4 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Transfer Pricing</p>
                <p className="text-muted-foreground text-xs">What happens to pricing when a booking is transferred</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 ml-11">
              {([
                { value: "keep_original", label: "Keep original", desc: "Price doesn't change" },
                { value: "apply_destination", label: "Apply new price", desc: "Use destination pricing" },
                { value: "staff_choice", label: "Staff decides", desc: "Prompt staff each time" },
              ] as const).map((opt) => (
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
                    <span className="font-medium">{opt.label}</span>
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
          <CardDescription>Template and automation sharing across locations</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <ToggleSetting
            label="Shared Email Templates"
            description="All locations use the same email templates. Disabling lets each location customize their own messaging."
            icon={MessageSquare}
            value={s.sharedEmailTemplates}
            onChange={(v) => update({ sharedEmailTemplates: v })}
            accent="#0ea5e9"
          />
          <ToggleSetting
            label="Shared Automations"
            description="Automation rules (reminders, follow-ups) are shared globally. Disabling creates separate automation configs per location."
            icon={Zap}
            value={s.sharedAutomations}
            onChange={(v) => update({ sharedAutomations: v })}
            accent="#8b5cf6"
          />
        </CardContent>
      </Card>

      <Separator />
      <div className="flex justify-end">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={save}
          disabled={!dirty}
        >
          <Save className="size-3.5" />
          Save HQ Settings
        </Button>
      </div>
    </div>
  );
}
