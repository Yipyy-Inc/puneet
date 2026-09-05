"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Clock, Info } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGroomingScheduling,
  type SlotGranularityMin,
} from "@/hooks/use-grooming-scheduling";
import { settingsHref } from "@/lib/settings/nav";

// ============================================================================
// How grooming slots are offered.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// 969 lines whose save button was, literally:
//
//   // TODO: Save to backend
//   await new Promise((resolve) => setTimeout(resolve, 1000));
//   toast.success("Booking rules saved successfully");
//
// A one-second sleep and a confirmation. Six sections of state — a service
// catalogue with size pricing, add-on restrictions, scheduling rules, per-
// groomer buffers, a capacity guard and blackout dates — none of which ever
// left the browser tab.
//
// ── AND FIVE OF THE SIX ALREADY HAD REAL EDITORS ──────────────────────────
//
// That is why this screen is now small rather than converted. Building a
// second backend for them would have created the disagreement this project
// keeps finding: two screens editing one fact, only one of them writing.
//
//   service catalogue + size pricing  ->  Grooming > Rates (useSaveGroomingService)
//   advance booking / capacity        ->  Settings > Business (booking_rules)
//   blackout dates                    ->  Settings > Business (service_date_blocks)
//
// What was genuinely missing is what remains here: the three values that
// decide the SHAPE OF THE SLOT GRID, which `GroomingDetails` and
// `new-appointment-dialog` read when somebody books. They were real settings
// with a real effect, kept in `localStorage` — so they were per-BROWSER, and
// two people booking the same day were offered different grids. They are a
// facility settings domain now.
// ============================================================================

const GRANULARITIES: SlotGranularityMin[] = [15, 30, 60];

/** Where the sections this screen used to imitate actually live. */
const ELSEWHERE = [
  {
    title: "Services and size pricing",
    detail: "The grooming menu — what you offer, and the price by dog size.",
    href: "/facility/dashboard/services/grooming/rates",
  },
  {
    title: "Advance booking, capacity and overbooking",
    detail:
      "How far ahead customers may book, daily limits, and whether you allow overbooking.",
    href: settingsHref("booking-rules"),
  },
  {
    title: "Blackout dates and closures",
    detail: "Days you are closed, or not taking a particular service.",
    href: settingsHref("hours"),
  },
];

export default function GroomingBookingRulesPage() {
  const {
    smartSchedulingEnabled,
    slotGranularityMin,
    defaultBufferMin,
    update,
  } = useGroomingScheduling();

  const save = (patch: Parameters<typeof update>[0], message: string) => {
    void update(patch).then(
      () => toast.success(message),
      (error: unknown) =>
        toast.error(
          error instanceof Error ? error.message : "Could not save that.",
        ),
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Grooming booking rules
        </h2>
        <p className="text-muted-foreground text-sm">
          How the time-slot grid is built when somebody books a groom. These
          apply to the whole facility, not just this browser.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4" />
            Slot grid
          </CardTitle>
          <CardDescription>
            Read by the booking dialog, so a change here changes what staff are
            offered — not just what this page shows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="smart-scheduling">Smart scheduling</Label>
              <p className="text-muted-foreground text-xs">
                Highlights slots that respect the buffer. Others stay pickable —
                staff have the final say.
              </p>
            </div>
            <Switch
              id="smart-scheduling"
              checked={smartSchedulingEnabled}
              onCheckedChange={(checked) =>
                save(
                  { smartSchedulingEnabled: checked },
                  checked ? "Smart scheduling on" : "Smart scheduling off",
                )
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="granularity">Slot length</Label>
              <Select
                value={String(slotGranularityMin)}
                onValueChange={(value) =>
                  save(
                    { slotGranularityMin: Number(value) as SlotGranularityMin },
                    "Slot length saved",
                  )
                }
              >
                <SelectTrigger id="granularity" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRANULARITIES.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {minutes} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="buffer">Buffer either side (minutes)</Label>
              <Input
                id="buffer"
                type="number"
                min={0}
                max={240}
                defaultValue={defaultBufferMin}
                // On blur, not on every keystroke: each save is a request, and
                // "3" on the way to "30" is not a value anybody chose.
                onBlur={(e) => {
                  const next = Number(e.target.value);
                  if (!Number.isInteger(next) || next < 0 || next > 240) {
                    toast.error("A buffer is 0 to 240 minutes.");
                    e.target.value = String(defaultBufferMin);
                    return;
                  }
                  if (next === defaultBufferMin) return;
                  save({ defaultBufferMin: next }, "Buffer saved");
                }}
              />
              <p className="text-muted-foreground text-xs">
                Used when smart scheduling is on and a groomer has no override.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="size-4" />
            The rest lives elsewhere
          </CardTitle>
          <CardDescription>
            This screen used to hold copies of these. Each is edited in one
            place now, so two screens cannot disagree about the same fact.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {ELSEWHERE.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="hover:bg-muted/50 flex items-center justify-between gap-3 rounded-md border px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-muted-foreground text-xs">{item.detail}</p>
              </div>
              <ArrowRight className="text-muted-foreground size-4 shrink-0" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
