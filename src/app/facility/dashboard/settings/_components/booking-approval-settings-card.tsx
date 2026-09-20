"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "@/components/ui/save-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useCustomServices } from "@/hooks/use-custom-services";
import {
  useBookingApproval,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import {
  APPROVAL_SERVICES,
  DEFAULT_RESPONSE_HOURS,
  responseHoursSchema,
  type ApprovalService,
  type BookingApproval,
} from "@/lib/settings/booking-approval";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// The wait a customer is told to expect after asking for a booking.
//
// This card used to offer a per-service "requires approval" switch and an
// auto-confirm delay, saved to localStorage. Neither decided anything: the
// database makes every booking a customer inserts a request, and nothing read
// the delay. What a customer really reads is the response time, so that is
// what this sets — see lib/settings/booking-approval.ts.
// ============================================================================

// Which services a direct booking can actually be priced for, server-side.
//
// Grooming and training are absent on purpose: their price comes from the pet
// (size, coat, breed, the groomer's tier) or from a series enrolment, and
// re-deriving either on the server is where a second implementation of the
// rules would begin — the first bug it causes is a customer charged something
// other than what they were shown. The switch is still SHOWN for them, saying
// why, rather than offered as a toggle that decides nothing.
// See lib/bookings/price-booking.ts.
const SERVER_PRICEABLE = new Set(["boarding", "daycare"]);

const SERVICE_KEY: Record<ApprovalService, string> = {
  boarding: "svcBoarding",
  daycare: "svcDaycare",
  grooming: "svcGrooming",
  training: "svcTraining",
};

type HoursDraft = Record<ApprovalService, string>;

function hoursOf(approval: BookingApproval): HoursDraft {
  return Object.fromEntries(
    APPROVAL_SERVICES.map((service) => [
      service,
      String(approval.responseHours[service] ?? DEFAULT_RESPONSE_HOURS),
    ]),
  ) as HoursDraft;
}

// Nothing renders until the row has arrived: the editor seeds `useState` from
// what it is handed, and a first Save against the fallback would write the
// defaults over the facility's own hours.
export function BookingApprovalSettingsCard() {
  const { approval, configured, isPending } = useBookingApproval();

  if (isPending) {
    return <Skeleton className="h-72 w-full rounded-xl" />;
  }

  return (
    <ResponseHoursEditor
      key={configured ? "stored" : "shipped"}
      initial={approval}
    />
  );
}

function ResponseHoursEditor({ initial }: { initial: BookingApproval }) {
  const t = useSettingsText().section("booking-rules");
  const save = useSaveFacilitySetting();
  const { activeModules } = useCustomServices();
  const [saved, setSaved] = useState<HoursDraft>(() => hoursOf(initial));
  const [draft, setDraft] = useState<HoursDraft>(saved);
  const [savedAuto, setSavedAuto] = useState<Record<string, boolean>>(
    () => initial.autoConfirm ?? {},
  );
  const [autoDraft, setAutoDraft] =
    useState<Record<string, boolean>>(savedAuto);

  // Every service the facility sells, not just the four built-ins: a custom
  // module is a bookable service and its customers deserve the same answer.
  const services: { id: string; label: string }[] = [
    ...APPROVAL_SERVICES.map((id) => ({ id, label: t(SERVICE_KEY[id]) })),
    ...activeModules.map((m) => ({ id: m.slug, label: m.name })),
  ];

  const dirty =
    APPROVAL_SERVICES.some((service) => draft[service] !== saved[service]) ||
    services.some(
      (service) =>
        Boolean(autoDraft[service.id]) !== Boolean(savedAuto[service.id]),
    );

  const handleSave = () => {
    const parsed = APPROVAL_SERVICES.map((service) =>
      responseHoursSchema.safeParse(Number(draft[service])),
    );
    if (parsed.some((result) => !result.success)) {
      toast.error(t("responseHoursInvalid"));
      return;
    }
    const value: BookingApproval = {
      responseHours: Object.fromEntries(
        APPROVAL_SERVICES.map((service) => [service, Number(draft[service])]),
      ),
      // Written with the hours, not instead of them: this object replaces the
      // stored one whole, so leaving it out would silently clear every switch.
      autoConfirm: autoDraft,
    };
    save.mutate(
      { domain: "booking_approval", value },
      {
        onSuccess: () => {
          setSaved(draft);
          setSavedAuto(autoDraft);
          toast.success(t("autoConfirmSaved"));
        },
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : t("saveFailed")),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("responseTitle")}</CardTitle>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("responseHelp")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{t("autoConfirmTitle")}</h3>
          <p className="text-muted-foreground text-sm">
            {t("autoConfirmHelp")}
          </p>
        </div>
        <div className="space-y-2">
          {services.map((service) => {
            const priceable = SERVER_PRICEABLE.has(service.id);
            const on = priceable && Boolean(autoDraft[service.id]);
            return (
              <div
                key={service.id}
                className="flex min-h-12 items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{service.label}</p>
                  <p className="text-muted-foreground text-xs">
                    {!priceable
                      ? t("autoConfirmUnpriceable")
                      : on
                        ? t("autoConfirmOn")
                        : t("autoConfirmOff")}
                  </p>
                </div>
                <Switch
                  checked={on}
                  disabled={!priceable}
                  aria-label={service.label}
                  onCheckedChange={(next) =>
                    setAutoDraft((previous) => ({
                      ...previous,
                      [service.id]: next,
                    }))
                  }
                />
              </div>
            );
          })}
        </div>
        <p className="text-muted-foreground text-xs">
          {t("autoConfirmNoRates")}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {APPROVAL_SERVICES.map((service) => (
            <div key={service} className="min-w-0 space-y-1.5">
              <Label htmlFor={`response-hours-${service}`}>
                {t(SERVICE_KEY[service])}
              </Label>
              <Input
                id={`response-hours-${service}`}
                type="number"
                inputMode="numeric"
                min={1}
                max={720}
                step={1}
                value={draft[service]}
                aria-describedby="response-hours-unit"
                className="tabular-nums"
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    [service]: event.target.value,
                  }))
                }
              />
            </div>
          ))}
        </div>
        <p id="response-hours-unit" className="text-muted-foreground text-xs">
          {t("responseHoursUnit")}
        </p>
        <SaveBar
          placement="card"
          dirty={dirty}
          saving={save.isPending}
          onSave={handleSave}
          onReset={() => {
            setDraft(saved);
            setAutoDraft(savedAuto);
          }}
        />
      </CardContent>
    </Card>
  );
}
