"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  useFacilitySettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// How many pets one staff member can hold, for one service.
//
// ── WHAT IT WAS ───────────────────────────────────────────────────────────
//
// `localStorage["yipyy:max-pets-per-staff:11:daycare"]` — the fixture facility
// 11, in one browser. Every facility shared one number, no facility had its
// own, and the manager who typed it was the only person who could see it. It
// is the `staffing_ratios` settings domain now, so it belongs to the facility
// and reaches whoever opens the screen next.
//
// ── IT IS STILL READ BY NOTHING ───────────────────────────────────────────
//
// Smart Insights is the intended consumer (Understaffing Risk compares the
// confirmed pet count against staff × this number) and is fixture data, so
// today this stores a policy nobody acts on. Saying so is the point: a number
// that is kept is not the same as a number that decides something. Debt map.
// ============================================================================

interface Props {
  service: "daycare" | "boarding";
}

const DEFAULT_MAX_PETS = 12;

export function MaxPetsPerStaffCard({ service }: Props) {
  const { t, fill } = useStaffText("staffingRatios");
  // `isPending` is load-bearing: useState captures ONCE, and seeding from the
  // documented default before the row lands would write that default over the
  // facility's own number the moment somebody pressed Save.
  const { settings, isPending } = useFacilitySettings();
  const saveSetting = useSaveFacilitySetting();
  const ratios = settings.staffing_ratios.value;
  const stored = ratios[service];

  const [value, setValue] = useState<number>(DEFAULT_MAX_PETS);
  const [initial, setInitial] = useState<number>(DEFAULT_MAX_PETS);

  useEffect(() => {
    if (isPending) return;
    const next = stored ?? DEFAULT_MAX_PETS;
    setValue(next);
    setInitial(next);
  }, [isPending, stored]);

  const dirty = value !== initial;

  const handleSave = () => {
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(t("positiveNumber"));
      return;
    }
    saveSetting.mutate(
      { domain: "staffing_ratios", value: { ...ratios, [service]: value } },
      {
        onSuccess: () => {
          setInitial(value);
          toast.success(t("saved"));
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  };

  const handleReset = () => {
    setValue(initial);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5 text-purple-500" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor={`mpps-${service}`}>{t("label")}</Label>
            <Input
              id={`mpps-${service}`}
              type="number"
              min={1}
              step={1}
              disabled={isPending}
              value={Number.isFinite(value) ? value : ""}
              onChange={(e) => setValue(parseInt(e.target.value, 10))}
              className="w-32"
            />
          </div>
          <div className="flex gap-2">
            {dirty && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
              >
                {t("cancel")}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!dirty || isPending || saveSetting.isPending}
            >
              {saveSetting.isPending ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          {fill("defaultHint", { n: DEFAULT_MAX_PETS })}
        </p>
      </CardContent>
    </Card>
  );
}
