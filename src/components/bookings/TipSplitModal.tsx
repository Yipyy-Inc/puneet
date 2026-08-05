"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateTipSplit } from "@/lib/invoice-lifecycle";

// ============================================================================
// Splitting a tip between the people who earned it.
//
// ── WHAT THIS DID BEFORE ──────────────────────────────────────────────────
//
// `onSave={() => {}}`. It computed the split four ways, refused to submit
// unless the allocations balanced to the cent, said "Tip split saved" — and
// threw the result away. The tip itself was real money in `payments.tip`; who
// earned it was recorded nowhere.
//
// The staff it offered to split between were five hardcoded strings
// ("Jessica M.", "Amy C.", …). Not the facility's people, and not anything
// payroll could pay.
//
// ── AN ALLOCATION NAMES A PERSON BY ID ────────────────────────────────────
//
// The rows key on `staffId`, because `booking_tip_allocations.staff_id` is a
// foreign key and a display name is not one. Two services handled by the same
// person MERGE into one allocation before saving — the table holds one row per
// person per booking, and two rows for one person is the same allocation
// written twice.
// ============================================================================

interface StaffService {
  /** The staff row's uuid, when the invoice line names somebody real. */
  staffId?: string;
  staffName: string;
  serviceName: string;
  serviceValue: number;
  multiStaff?: boolean;
}

export interface TipSplitOption {
  /** The staff row's uuid — what the write path takes. */
  id: string;
  name: string;
}

export interface TipAllocationDraft {
  staffId: string;
  amount: number;
}

interface TipSplitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalTip: number;
  staffServices: StaffService[];
  /** The facility's actual people, from /api/staff. */
  staffOptions: TipSplitOption[];
  defaultSplitMethod?: SplitMethod;
  /**
   * Saves the split. May reject — the database refuses a total above the tips
   * actually collected — and the modal stays open when it does.
   */
  onSave: (
    method: SplitMethod,
    allocations: TipAllocationDraft[],
  ) => Promise<void>;
}

type SplitMethod = "by_service" | "equal" | "custom_percent" | "custom_amount";

const METHODS: { value: SplitMethod; label: string }[] = [
  { value: "by_service", label: "By service price" },
  { value: "equal", label: "Split equally" },
  { value: "custom_percent", label: "Custom (%)" },
  { value: "custom_amount", label: "Custom ($)" },
];

const UNASSIGNED = "__unassigned__";

export function TipSplitModal({
  open,
  onOpenChange,
  totalTip,
  staffServices,
  staffOptions,
  defaultSplitMethod = "by_service",
  onSave,
}: TipSplitModalProps) {
  const [method, setMethod] = useState<SplitMethod>(defaultSplitMethod);
  const [customValues, setCustomValues] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Which real person each invoice line belongs to.
   *
   * Seeded from the line's own `staffId` when it has one, and otherwise by
   * matching the name the invoice recorded against the facility's staff list.
   * A line whose name matches nobody starts UNASSIGNED rather than being
   * quietly attached to the first person in the dropdown.
   */
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const byName = new Map(
      staffOptions.map((s) => [s.name.toLowerCase(), s.id]),
    );
    const init: Record<string, string> = {};
    for (const s of staffServices) {
      init[s.serviceName] =
        s.staffId ?? byName.get(s.staffName.toLowerCase()) ?? UNASSIGNED;
    }
    return init;
  });

  const nameFor = useMemo(() => {
    const map = new Map(staffOptions.map((s) => [s.id, s.name]));
    return (id: string) => map.get(id) ?? "Unassigned";
  }, [staffOptions]);

  const hasMultiStaff = staffServices.some((s) => s.multiStaff);

  // `calculateTipSplit` keys on a name, so the id travels as the name and the
  // display name is looked up. That keeps the arithmetic — which is tested and
  // used elsewhere — untouched.
  const currentStaffServices = staffServices.map((s) => ({
    staffName: assignments[s.serviceName] ?? UNASSIGNED,
    serviceValue: s.serviceValue,
  }));

  const entries = calculateTipSplit(
    method,
    totalTip,
    currentStaffServices,
    customValues,
  );

  const totalAllocated = entries.reduce((s, e) => s + e.tipAmount, 0);
  const isBalanced = Math.abs(totalAllocated - totalTip) < 0.02;
  const anyUnassigned = entries.some((e) => e.staffName === UNASSIGNED);

  /** One row per PERSON. Two services by the same groomer is one allocation. */
  const merged = useMemo(() => {
    const byStaff = new Map<string, number>();
    for (const entry of entries) {
      if (entry.staffName === UNASSIGNED) continue;
      byStaff.set(
        entry.staffName,
        (byStaff.get(entry.staffName) ?? 0) + entry.tipAmount,
      );
    }
    return [...byStaff.entries()].map(([staffId, amount]) => ({
      staffId,
      amount: Math.round(amount * 100) / 100,
    }));
  }, [entries]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(method, merged);
      onOpenChange(false);
    } catch (err) {
      // The modal STAYS OPEN. It used to close and toast success regardless,
      // which is the same thing as not saving at all but harder to notice.
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Split Tips</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Total tip */}
          <div className="bg-muted/30 rounded-lg border p-3 text-center">
            <p className="text-muted-foreground text-xs">Total Tip</p>
            <p className="font-[tabular-nums] text-2xl font-bold">
              ${totalTip.toFixed(2)}
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              Collected on this booking
            </p>
          </div>

          {totalTip <= 0 && (
            <div className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-xs">
              No tip has been collected on this booking, so there is nothing to
              split.
            </div>
          )}

          {/* Multi-staff warning */}
          {hasMultiStaff && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <Users className="size-4 shrink-0" />
              <p>
                Some services have multiple staff assigned. Staff reassignment
                is disabled in multi-staff mode — edit individual assignments on
                the invoice first.
              </p>
            </div>
          )}

          {/* Service assignments — review/edit staff per item */}
          <div>
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
              Staff Assignments
            </p>
            <div className="space-y-1.5">
              {staffServices.map((s) => (
                <div
                  key={s.serviceName}
                  className="flex items-center gap-3 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.serviceName}</p>
                    <p className="text-muted-foreground font-[tabular-nums] text-xs">
                      ${s.serviceValue.toFixed(2)}
                    </p>
                  </div>
                  {s.multiStaff ? (
                    <Badge variant="outline" className="text-[10px]">
                      <Users className="mr-1 size-2.5" />
                      Multi-staff
                    </Badge>
                  ) : (
                    <Select
                      value={assignments[s.serviceName] ?? UNASSIGNED}
                      onValueChange={(v) =>
                        setAssignments((prev) => ({
                          ...prev,
                          [s.serviceName]: v,
                        }))
                      }
                    >
                      <SelectTrigger className="h-7 w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/* A sentinel, never "" — a Radix SelectItem with an
                            empty value throws, and the resulting blank modal
                            looks like a screen that does nothing. */}
                        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                        {staffOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Split method */}
          <div className="mb-1 flex items-center justify-between">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              Split Method
            </p>
            <p className="text-muted-foreground text-[10px]">
              Default from Settings → Staff → Payroll
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => {
                  setMethod(m.value);
                  setCustomValues({});
                }}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                  method === m.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "hover:bg-muted/50",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Tip breakdown */}
          <div className="space-y-2">
            <div className="text-muted-foreground grid grid-cols-4 gap-2 text-[10px] font-semibold tracking-wider uppercase">
              <span>Staff</span>
              <span className="text-right">Service $</span>
              <span className="text-right">Tip</span>
              <span className="text-right">%</span>
            </div>
            {entries.map((entry) => (
              <div
                key={entry.staffName}
                className="grid grid-cols-4 items-center gap-2 rounded-md px-1 py-1"
              >
                <span
                  className={cn(
                    "truncate text-sm font-medium",
                    entry.staffName === UNASSIGNED && "text-destructive",
                  )}
                >
                  {nameFor(entry.staffName)}
                </span>
                <span className="text-muted-foreground text-right font-[tabular-nums] text-sm">
                  ${entry.serviceValue.toFixed(2)}
                </span>
                {method === "custom_amount" || method === "custom_percent" ? (
                  <Input
                    type="number"
                    value={customValues[entry.staffName] ?? ""}
                    onChange={(e) =>
                      setCustomValues((prev) => ({
                        ...prev,
                        [entry.staffName]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="h-7 text-right font-[tabular-nums] text-xs"
                    min={0}
                    step={0.01}
                    placeholder={method === "custom_percent" ? "%" : "$"}
                  />
                ) : (
                  <span className="text-right font-[tabular-nums] text-sm font-semibold">
                    ${entry.tipAmount.toFixed(2)}
                  </span>
                )}
                <span className="text-muted-foreground text-right font-[tabular-nums] text-xs">
                  {entry.percentage}%
                </span>
              </div>
            ))}
            <Separator />
            <div className="grid grid-cols-4 gap-2 text-sm font-semibold">
              <span>Total</span>
              <span />
              <span
                className={cn(
                  "text-right font-[tabular-nums]",
                  !isBalanced && "text-destructive",
                )}
              >
                ${totalAllocated.toFixed(2)}
              </span>
              <span className="text-right font-[tabular-nums]">100%</span>
            </div>
            {!isBalanced && (
              <div className="text-destructive flex items-center gap-1.5 text-xs">
                <AlertTriangle className="size-3" />
                Total doesn&apos;t match tip amount — adjust values
              </div>
            )}
            {anyUnassigned && (
              <div className="text-destructive flex items-center gap-1.5 text-xs">
                <AlertTriangle className="size-3" />
                Every line needs a staff member before the split can be saved
              </div>
            )}
            {error && (
              <div className="text-destructive flex items-start gap-1.5 text-xs">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              !isBalanced ||
              anyUnassigned ||
              saving ||
              totalTip <= 0 ||
              merged.length === 0
            }
          >
            {saving ? "Saving…" : "Save Tip Split"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
