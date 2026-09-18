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
import { formatMoney } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

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

const METHODS: { value: SplitMethod; key: string }[] = [
  { value: "by_service", key: "byService" },
  { value: "equal", key: "equal" },
  { value: "custom_percent", key: "customPercent" },
  { value: "custom_amount", key: "customAmount" },
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
  const { t, locale } = useStaffText("tipSplit");
  const money = (value: number) => formatMoney(value, locale);

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
    return (id: string) => map.get(id) ?? t("unassigned");
  }, [staffOptions, t]);

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
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Total tip */}
          <div className="border-line rounded-2xl border p-3 text-center">
            <p className="text-ink-secondary text-xs">{t("total")}</p>
            <p className="text-body-ink text-2xl font-bold tabular-nums">
              {money(totalTip)}
            </p>
            <p className="text-ink-tertiary mt-0.5 text-xs">
              {t("collectedHere")}
            </p>
          </div>

          {totalTip <= 0 && (
            <p className="border-line text-ink-secondary rounded-2xl border px-3 py-2 text-sm">
              {t("nothingToSplit")}
            </p>
          )}

          {/* Multi-staff warning */}
          {hasMultiStaff && (
            <div className="border-warning text-warning flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm">
              <Users className="size-4 shrink-0" />
              <p>{t("multiStaff")}</p>
            </div>
          )}

          {/* Service assignments — review/edit staff per item */}
          <div>
            <p className="text-ink-tertiary mb-2 text-xs font-bold tracking-[.06em] uppercase">
              {t("assignments")}
            </p>
            <div className="space-y-1.5">
              {staffServices.map((s) => (
                <div
                  key={s.serviceName}
                  className="border-line flex flex-wrap items-center gap-3 rounded-2xl border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-body-ink text-sm font-semibold">
                      {s.serviceName}
                    </p>
                    <p className="text-ink-tertiary text-xs tabular-nums">
                      {money(s.serviceValue)}
                    </p>
                  </div>
                  {s.multiStaff ? (
                    <Badge variant="outline">
                      <Users className="size-4" />
                      {t("multiStaffBadge")}
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
                      <SelectTrigger
                        className="w-44 text-sm"
                        aria-label={t("assignments")}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/* A sentinel, never "" — a Radix SelectItem with an
                            empty value throws, and the resulting blank modal
                            looks like a screen that does nothing. */}
                        <SelectItem value={UNASSIGNED}>
                          {t("unassigned")}
                        </SelectItem>
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

          {/* Split method. It said "Default from Settings → Staff → Payroll";
              no default is read from there. */}
          <p className="text-ink-tertiary mb-1 text-xs font-bold tracking-[.06em] uppercase">
            {t("method")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={method === m.value}
                onClick={() => {
                  setMethod(m.value);
                  setCustomValues({});
                }}
                className={cn(
                  // Chosen is a 2px ring, never a tint (§6 rules 1 and 2).
                  "min-h-10 rounded-full border px-3 text-sm font-semibold",
                  method === m.value
                    ? "border-primary text-primary shadow-[inset_0_0_0_2px_var(--primary)]"
                    : "text-body-ink",
                )}
              >
                {t(m.key)}
              </button>
            ))}
          </div>

          {/* Tip breakdown */}
          <div className="space-y-2">
            <div className="text-ink-tertiary grid grid-cols-4 gap-2 text-xs font-bold tracking-[.06em] uppercase">
              <span>{t("colStaff")}</span>
              <span className="text-right">{t("colService")}</span>
              <span className="text-right">{t("colTip")}</span>
              <span className="text-right">%</span>
            </div>
            {entries.map((entry) => (
              <div
                key={entry.staffName}
                className="grid grid-cols-4 items-center gap-2 px-1 py-1"
              >
                <span
                  className={cn(
                    "truncate text-sm font-semibold",
                    entry.staffName === UNASSIGNED
                      ? "text-destructive"
                      : "text-body-ink",
                  )}
                >
                  {nameFor(entry.staffName)}
                </span>
                <span className="text-ink-secondary text-right text-sm tabular-nums">
                  {money(entry.serviceValue)}
                </span>
                {method === "custom_amount" || method === "custom_percent" ? (
                  <Input
                    type="number"
                    aria-label={t("colTip")}
                    value={customValues[entry.staffName] ?? ""}
                    onChange={(e) =>
                      setCustomValues((prev) => ({
                        ...prev,
                        [entry.staffName]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="text-right text-sm tabular-nums"
                    min={0}
                    step={0.01}
                    placeholder={method === "custom_percent" ? "%" : "$"}
                  />
                ) : (
                  <span className="text-body-ink text-right text-sm font-semibold tabular-nums">
                    {money(entry.tipAmount)}
                  </span>
                )}
                <span className="text-ink-secondary text-right text-xs tabular-nums">
                  {entry.percentage}%
                </span>
              </div>
            ))}
            <Separator />
            <div className="grid grid-cols-4 gap-2 text-sm font-semibold">
              <span>{t("colTotal")}</span>
              <span />
              <span
                className={cn(
                  "text-right tabular-nums",
                  !isBalanced && "text-destructive",
                )}
              >
                {money(totalAllocated)}
              </span>
              <span className="text-right tabular-nums">100%</span>
            </div>
            {!isBalanced && (
              <p className="text-destructive flex items-center gap-1.5 text-sm">
                <AlertTriangle className="size-4 shrink-0" />
                {t("notBalanced")}
              </p>
            )}
            {anyUnassigned && (
              <p className="text-destructive flex items-center gap-1.5 text-sm">
                <AlertTriangle className="size-4 shrink-0" />
                {t("needsStaff")}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="text-destructive flex items-start gap-1.5 text-sm"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("keep")}
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={
              !isBalanced ||
              anyUnassigned ||
              totalTip <= 0 ||
              merged.length === 0
            }
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
