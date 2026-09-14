"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "@/components/ui/save-bar";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [saved, setSaved] = useState<HoursDraft>(() => hoursOf(initial));
  const [draft, setDraft] = useState<HoursDraft>(saved);

  const dirty = APPROVAL_SERVICES.some(
    (service) => draft[service] !== saved[service],
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
    };
    save.mutate(
      { domain: "booking_approval", value },
      {
        onSuccess: () => {
          setSaved(draft);
          toast.success(t("responseSaved"));
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
          onReset={() => setDraft(saved)}
        />
      </CardContent>
    </Card>
  );
}
