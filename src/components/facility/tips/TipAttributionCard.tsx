"use client";

import { Users } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  TipAttribution,
  TipAttributionMode,
  TipAttributionRule,
} from "@/types/facility";

// ============================================================================
// Who a tip belongs to once it has been collected.
//
// ── PER SERVICE, BECAUSE FACILITIES GENUINELY DIFFER BY SERVICE ───────────
//
// A grooming tip is nearly always the groomer's. A daycare tip is for whoever
// was on the floor, and belongs in a pool. One global setting would force a
// facility to be wrong about one of them.
//
// ── THE DIFFERENCE BETWEEN THE LAST TWO MODES IS MONEY ────────────────────
//
// `pool` is a debt the facility still owes its people and has not divided yet.
// `none` is not a debt at all. They look similar on this screen and are not the
// same thing on the payout report — reporting them as one would tell an owner
// they had settled up when they had not.
//
// ── NOTHING HERE IS RETROACTIVE ───────────────────────────────────────────
//
// Attribution runs when a tip is COLLECTED, from the rule in force at that
// moment. Changing this screen does not re-attribute money already taken, and
// the copy says so — otherwise the obvious reading is that it does.
// ============================================================================

/** The services a facility can run. Mirrors the `service_module` enum. */
const SERVICES: { id: string; label: string }[] = [
  { id: "grooming", label: "Grooming" },
  { id: "boarding", label: "Boarding" },
  { id: "daycare", label: "Daycare" },
  { id: "training", label: "Training" },
  { id: "retail", label: "Retail" },
];

const MODES: { value: TipAttributionMode; label: string; hint: string }[] = [
  {
    value: "assigned",
    label: "Assigned staff member",
    hint: "The whole tip goes to whoever the booking is assigned to.",
  },
  {
    value: "split_even",
    label: "Split evenly",
    hint: "Divided equally between the staff on the booking.",
  },
  {
    value: "pool",
    label: "Pool",
    hint: "Collected and owed to the team, for somebody to divide by hand.",
  },
  {
    value: "none",
    label: "No attribution",
    hint: "Collected and not owed to any individual.",
  },
];

export function TipAttributionCard({
  value,
  onChange,
  disabled,
}: {
  value: TipAttribution;
  onChange: (next: TipAttribution) => void;
  disabled: boolean;
}) {
  const ruleFor = (service: string): TipAttributionRule => ({
    mode: value.byService[service]?.mode ?? value.defaultMode,
    notes: value.byService[service]?.notes,
  });

  const setRule = (service: string, patch: Partial<TipAttributionRule>) =>
    onChange({
      ...value,
      byService: {
        ...value.byService,
        [service]: { ...ruleFor(service), ...patch },
      },
    });

  return (
    <div className="rounded-xl border">
      <div className="flex items-start gap-2 border-b px-4 py-3">
        <Users className="text-primary mt-0.5 size-4 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Staff tip attribution</p>
          <p className="text-muted-foreground text-xs">
            Who a tip is owed to once it has been collected. Applied the moment
            a tip is taken — changing it here does not move money already
            collected.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* The default first: it is what every service without its own rule
            uses, INCLUDING a service that does not exist yet. */}
        <div className="bg-muted/40 space-y-1.5 rounded-lg p-3">
          <Label className="text-xs font-medium">
            Default — used by any service without a rule of its own
          </Label>
          <Select
            value={value.defaultMode}
            disabled={disabled}
            onValueChange={(v) =>
              onChange({ ...value, defaultMode: v as TipAttributionMode })
            }
          >
            <SelectTrigger className="h-8 w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-[11px]">
            {MODES.find((m) => m.value === value.defaultMode)?.hint}
          </p>
        </div>

        <div className="space-y-3">
          {SERVICES.map((service) => {
            const rule = ruleFor(service.id);
            const isOverride = value.byService[service.id] !== undefined;
            return (
              <div
                key={service.id}
                className="grid grid-cols-1 gap-2 border-b pb-3 last:border-0 last:pb-0 sm:grid-cols-[7rem_12rem_1fr] sm:items-center"
              >
                <span className="text-sm font-medium">
                  {service.label}
                  {!isOverride && (
                    <span className="text-muted-foreground ml-1 text-[10px]">
                      (default)
                    </span>
                  )}
                </span>

                <Select
                  value={rule.mode}
                  disabled={disabled}
                  onValueChange={(v) =>
                    setRule(service.id, { mode: v as TipAttributionMode })
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="text"
                  placeholder="Note for your own team (optional)"
                  value={rule.notes ?? ""}
                  disabled={disabled}
                  maxLength={200}
                  className="h-8 text-xs"
                  onChange={(e) =>
                    setRule(service.id, {
                      notes: e.target.value || undefined,
                    })
                  }
                />
              </div>
            );
          })}
        </div>

        {/* Said plainly, because the screen cannot show it: the two modes
            differ only at payout time. */}
        <p className="text-muted-foreground text-[11px]/relaxed">
          A tip with nobody assigned to the booking is reported as{" "}
          <span className="font-medium">Unassigned</span> rather than given to
          somebody by guesswork. Pooled tips are still owed to your team and are
          counted separately from tips you have chosen not to attribute at all.
        </p>
      </div>
    </div>
  );
}
