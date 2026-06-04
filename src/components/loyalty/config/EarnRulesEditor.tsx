"use client";

import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type {
  PointsEarningRule,
  PointsEarningMethod,
} from "@/types/loyalty";
import { BOOKABLE_SERVICE_TYPES } from "@/data/facility-loyalty-config";

const methodLabels: Record<PointsEarningMethod, string> = {
  per_dollar: "Per Dollar Spent",
  per_booking: "Per Booking",
  per_service_type: "Per Service Type",
  per_visit_count: "Per Visit Count (Milestones)",
  hybrid: "Hybrid (Multiple Methods)",
};

const methodOrder: PointsEarningMethod[] = [
  "per_dollar",
  "per_booking",
  "per_service_type",
  "per_visit_count",
  "hybrid",
];

/** Parse a numeric input; empty -> undefined, else the parsed number. */
function optionalNumber(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

/** Parse a required numeric input; empty/NaN -> 0. */
function requiredNumber(raw: string): number {
  if (raw.trim() === "") return 0;
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

export function EarnRulesEditor({
  value,
  onChange,
}: {
  value: PointsEarningRule;
  onChange: (v: PointsEarningRule) => void;
}) {
  const counter = useRef(0);
  const nextId = (prefix: string) =>
    `${prefix}-${Date.now()}-${counter.current++}`;

  function changeMethod(method: PointsEarningMethod) {
    const next: PointsEarningRule = { ...value, method };
    switch (method) {
      case "per_dollar":
        if (!next.perDollar)
          next.perDollar = { enabled: true, basePoints: 1 };
        break;
      case "per_booking":
        if (!next.perBooking)
          next.perBooking = {
            enabled: true,
            basePoints: 10,
            serviceTypePoints: [],
          };
        break;
      case "per_service_type":
        if (!next.perServiceType)
          next.perServiceType = { enabled: true, servicePoints: [] };
        break;
      case "per_visit_count":
        if (!next.perVisitCount)
          next.perVisitCount = { enabled: true, milestones: [] };
        break;
      case "hybrid":
        if (!next.hybrid)
          next.hybrid = {
            enabled: true,
            combinationMethod: "add",
            rules: [
              {
                id: nextId("hybrid-rule"),
                method: "per_dollar",
                perDollar: { enabled: true, basePoints: 1 },
              },
              {
                id: nextId("hybrid-rule"),
                method: "per_booking",
                perBooking: { enabled: true, basePoints: 10 },
              },
            ],
          };
        break;
    }
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label>Earning Method</Label>
            <Select value={value.method} onValueChange={changeMethod}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select an earning method" />
              </SelectTrigger>
              <SelectContent>
                {methodOrder.map((m) => (
                  <SelectItem key={m} value={m}>
                    {methodLabels[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {value.method === "per_dollar" && (
        <PerDollarSection value={value} onChange={onChange} />
      )}
      {value.method === "per_booking" && (
        <PerBookingSection value={value} onChange={onChange} />
      )}
      {value.method === "per_service_type" && (
        <PerServiceTypeSection value={value} onChange={onChange} />
      )}
      {value.method === "per_visit_count" && (
        <PerVisitCountSection value={value} onChange={onChange} />
      )}
      {value.method === "hybrid" && (
        <HybridSection value={value} onChange={onChange} />
      )}
    </div>
  );
}

type SectionProps = {
  value: PointsEarningRule;
  onChange: (v: PointsEarningRule) => void;
};

function PerDollarSection({ value, onChange }: SectionProps) {
  const pd = value.perDollar ?? { enabled: true, basePoints: 1 };
  const update = (patch: Partial<NonNullable<PointsEarningRule["perDollar"]>>) =>
    onChange({ ...value, perDollar: { ...pd, ...patch } });

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div>
          <Label>Base Points per Dollar</Label>
          <Input
            type="number"
            className="mt-1"
            value={pd.basePoints}
            onChange={(e) =>
              update({ basePoints: requiredNumber(e.target.value) })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Minimum Purchase</Label>
            <Input
              type="number"
              className="mt-1"
              placeholder="No minimum"
              value={pd.minimumPurchase ?? ""}
              onChange={(e) =>
                update({ minimumPurchase: optionalNumber(e.target.value) })
              }
            />
          </div>
          <div>
            <Label>Max Points / Transaction</Label>
            <Input
              type="number"
              className="mt-1"
              placeholder="No maximum"
              value={pd.maximumPointsPerTransaction ?? ""}
              onChange={(e) =>
                update({
                  maximumPointsPerTransaction: optionalNumber(e.target.value),
                })
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PerBookingSection({ value, onChange }: SectionProps) {
  const pb = value.perBooking ?? {
    enabled: true,
    basePoints: 10,
    serviceTypePoints: [],
  };
  const overrides = pb.serviceTypePoints ?? [];
  const update = (patch: Partial<NonNullable<PointsEarningRule["perBooking"]>>) =>
    onChange({ ...value, perBooking: { ...pb, ...patch } });

  const setOverride = (index: number, key: "serviceType" | "points", v: string) => {
    const next = overrides.map((o, i) =>
      i === index
        ? {
            ...o,
            [key]: key === "points" ? requiredNumber(v) : v,
          }
        : o,
    );
    update({ serviceTypePoints: next });
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div>
          <Label>Base Points per Booking</Label>
          <Input
            type="number"
            className="mt-1"
            value={pb.basePoints}
            onChange={(e) =>
              update({ basePoints: requiredNumber(e.target.value) })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Service Type Overrides</Label>
          {overrides.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No overrides — all bookings earn the base points.
            </p>
          )}
          {overrides.map((o, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <Select
                  value={o.serviceType || "__none__"}
                  onValueChange={(v) =>
                    setOverride(i, "serviceType", v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOKABLE_SERVICE_TYPES.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28">
                <Input
                  type="number"
                  placeholder="Points"
                  value={o.points}
                  onChange={(e) => setOverride(i, "points", e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove service override"
                onClick={() =>
                  update({
                    serviceTypePoints: overrides.filter((_, idx) => idx !== i),
                  })
                }
              >
                <Trash2 className="text-destructive size-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              update({
                serviceTypePoints: [
                  ...overrides,
                  { serviceType: BOOKABLE_SERVICE_TYPES[0], points: 0 },
                ],
              })
            }
          >
            <Plus className="size-4" /> Add Override
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PerServiceTypeSection({ value, onChange }: SectionProps) {
  const pst = value.perServiceType ?? { enabled: true, servicePoints: [] };
  const rows = pst.servicePoints;
  const update = (
    patch: Partial<NonNullable<PointsEarningRule["perServiceType"]>>,
  ) => onChange({ ...value, perServiceType: { ...pst, ...patch } });

  const setRow = (
    index: number,
    key: "serviceType" | "points" | "pointsPerDollar",
    raw: string,
  ) => {
    const next = rows.map((r, i) => {
      if (i !== index) return r;
      if (key === "serviceType") return { ...r, serviceType: raw };
      if (key === "points") return { ...r, points: requiredNumber(raw) };
      return { ...r, pointsPerDollar: optionalNumber(raw) };
    });
    update({ servicePoints: next });
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label>Service Point Rules</Label>
          {rows.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Add a rule for each service type.
            </p>
          )}
          {rows.map((r, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <Select
                  value={r.serviceType || "__none__"}
                  onValueChange={(v) =>
                    setRow(i, "serviceType", v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOKABLE_SERVICE_TYPES.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  placeholder="Points"
                  value={r.points}
                  onChange={(e) => setRow(i, "points", e.target.value)}
                />
              </div>
              <div className="w-28">
                <Input
                  type="number"
                  placeholder="Pts/$"
                  value={r.pointsPerDollar ?? ""}
                  onChange={(e) => setRow(i, "pointsPerDollar", e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove service rule"
                onClick={() =>
                  update({
                    servicePoints: rows.filter((_, idx) => idx !== i),
                  })
                }
              >
                <Trash2 className="text-destructive size-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              update({
                servicePoints: [
                  ...rows,
                  { serviceType: BOOKABLE_SERVICE_TYPES[0], points: 0 },
                ],
              })
            }
          >
            <Plus className="size-4" /> Add Service Rule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PerVisitCountSection({ value, onChange }: SectionProps) {
  const pvc = value.perVisitCount ?? { enabled: true, milestones: [] };
  const milestones = pvc.milestones;
  const update = (
    patch: Partial<NonNullable<PointsEarningRule["perVisitCount"]>>,
  ) => onChange({ ...value, perVisitCount: { ...pvc, ...patch } });

  const setMilestone = (
    index: number,
    key: "visitCount" | "bonusPoints" | "description",
    raw: string,
  ) => {
    const next = milestones.map((m, i) => {
      if (i !== index) return m;
      if (key === "description") return { ...m, description: raw };
      return { ...m, [key]: requiredNumber(raw) };
    });
    update({ milestones: next });
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label>Visit Milestones</Label>
          {milestones.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Reward customers when they reach a visit count.
            </p>
          )}
          {milestones.map((m, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="w-24">
                <Input
                  type="number"
                  placeholder="Visits"
                  value={m.visitCount}
                  onChange={(e) => setMilestone(i, "visitCount", e.target.value)}
                />
              </div>
              <div className="w-28">
                <Input
                  type="number"
                  placeholder="Bonus pts"
                  value={m.bonusPoints}
                  onChange={(e) =>
                    setMilestone(i, "bonusPoints", e.target.value)
                  }
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Description"
                  value={m.description}
                  onChange={(e) =>
                    setMilestone(i, "description", e.target.value)
                  }
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove milestone"
                onClick={() =>
                  update({
                    milestones: milestones.filter((_, idx) => idx !== i),
                  })
                }
              >
                <Trash2 className="text-destructive size-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              update({
                milestones: [
                  ...milestones,
                  { visitCount: 0, bonusPoints: 0, description: "" },
                ],
              })
            }
          >
            <Plus className="size-4" /> Add Milestone
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function HybridSection({ value, onChange }: SectionProps) {
  const hybrid = value.hybrid ?? {
    enabled: true,
    combinationMethod: "add" as const,
    rules: [] as PointsEarningRule[],
  };
  const rules = hybrid.rules;

  const innerDollar = rules.find((r) => r.method === "per_dollar");
  const innerBooking = rules.find((r) => r.method === "per_booking");

  const update = (patch: Partial<NonNullable<PointsEarningRule["hybrid"]>>) =>
    onChange({ ...value, hybrid: { ...hybrid, ...patch } });

  const setInnerBasePoints = (
    method: "per_dollar" | "per_booking",
    raw: string,
  ) => {
    const pts = requiredNumber(raw);
    const next = rules.map((r) => {
      if (r.method !== method) return r;
      if (method === "per_dollar") {
        const pd = r.perDollar ?? { enabled: true, basePoints: 1 };
        return { ...r, perDollar: { ...pd, basePoints: pts } };
      }
      const pb = r.perBooking ?? { enabled: true, basePoints: 10 };
      return { ...r, perBooking: { ...pb, basePoints: pts } };
    });
    update({ rules: next });
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <p className="text-muted-foreground text-sm">
          <Badge variant="secondary" className="mr-2">
            Hybrid
          </Badge>
          Combines a per-dollar rule and a per-booking rule.
        </p>

        <div>
          <Label>Combination Method</Label>
          <Select
            value={hybrid.combinationMethod}
            onValueChange={(v) =>
              update({
                combinationMethod: v as "add" | "max" | "weighted",
              })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="add">Add (sum both rules)</SelectItem>
              <SelectItem value="max">Max (use higher result)</SelectItem>
              <SelectItem value="weighted">Weighted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Per-Dollar Base Points</Label>
            <Input
              type="number"
              className="mt-1"
              value={innerDollar?.perDollar?.basePoints ?? 1}
              onChange={(e) => setInnerBasePoints("per_dollar", e.target.value)}
            />
          </div>
          <div>
            <Label>Per-Booking Base Points</Label>
            <Input
              type="number"
              className="mt-1"
              value={innerBooking?.perBooking?.basePoints ?? 10}
              onChange={(e) => setInnerBasePoints("per_booking", e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
