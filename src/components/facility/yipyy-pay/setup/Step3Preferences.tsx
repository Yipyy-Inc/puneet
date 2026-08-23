"use client";

import { useState } from "react";
import { ArrowRight, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  useSaveYipyyPayConfig,
  type YipyyPayOverview,
} from "@/lib/api/yipyy-pay";
import {
  DESCRIPTOR_MAX,
  descriptorPreview,
  formatFeeRate,
  type PayoutSchedule,
  type YipyyPayConfig,
} from "@/lib/settings/yipyy-pay";
import { PreferencesIllustration } from "../illustrations";

// ============================================================================
// Step 3 — the part that is genuinely Yipyy's.
//
// No redirect and no round trip: every control here writes to the
// `yipyy_pay_config` settings domain and changes something Yipyy does.
//
// ── EXCEPT THE PAYOUT SCHEDULE, WHICH IS A DECLARATION ────────────────────
//
// Clover decides when a merchant is paid, and exposes no way to read or set it.
// So this asks what the facility's account is on, uses the answer to estimate
// arrival dates on the dashboard, and says plainly that changing it happens at
// Clover. The alternative — a radio that looks like it commands a payout
// schedule and commands nothing — is the exact failure mode this whole feature
// was built to remove.
//
// ── AND THE DESCRIPTOR, WHICH IS TWO DIFFERENT THINGS ─────────────────────
//
// The line on a customer's bank statement belongs to the merchant account and
// is set at Clover. What Yipyy prints on its own receipts, invoices and emails
// is ours. Both are shown, labelled as what they are, and only the second is
// editable — because only the second can be edited from here.
// ============================================================================

/** A radio card. Bigger tap target than a bare radio, and states its trade-off. */
function Choice({
  selected,
  onSelect,
  title,
  body,
  badge,
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  body: string;
  badge?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
        selected
          ? "border-sky-500 bg-sky-500/5 ring-1 ring-sky-500/30"
          : "hover:bg-muted/50",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-sky-500" : "border-muted-foreground/40",
        )}
      >
        {selected && <span className="size-2 rounded-full bg-sky-500" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {badge && (
            <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
              {badge}
            </span>
          )}
        </span>
        <span className="text-muted-foreground mt-1 block text-sm/relaxed">
          {body}
        </span>
      </span>
    </button>
  );
}

function draftFrom(
  saved: YipyyPayConfig,
  fallbackName: string,
): YipyyPayConfig {
  return {
    ...saved,
    // Pre-filled from the business name so the common case is "looks right,
    // carry on". Still theirs to change, and still shown in the preview
    // exactly as a customer would read it.
    receiptDescriptor:
      saved.receiptDescriptor || fallbackName.slice(0, DESCRIPTOR_MAX),
  };
}

export function Step3Preferences({
  overview,
  onComplete,
}: {
  overview: YipyyPayOverview;
  onComplete: () => void;
}) {
  const save = useSaveYipyyPayConfig();
  const saved = overview.config;
  const businessName = overview.merchant?.name ?? overview.facility.name;

  // ── DERIVED FROM THE SERVER, NOT SEEDED FROM IT ────────────────────────
  //
  // `useState(saved.feePayer)` runs on the first render, when the settings query
  // has not resolved and `saved` is still the documented default. Save then
  // writes that default over whatever the facility had actually stored. The rule
  // the payroll screen earned the hard way; it applies with more force here,
  // because the value being clobbered decides what a customer is charged.
  const [draft, setDraft] = useState<YipyyPayConfig | null>(null);
  const form = draft ?? draftFrom(saved, businessName);
  const patch = (changes: Partial<YipyyPayConfig>) =>
    setDraft((prev) => ({
      ...(prev ?? draftFrom(saved, businessName)),
      ...changes,
    }));

  const multiLocation = overview.locations.length > 1;
  const descriptorTooLong = form.receiptDescriptor.length > DESCRIPTOR_MAX;

  const complete = async () => {
    if (descriptorTooLong) {
      toast.error("Shorten the receipt name before finishing.");
      return;
    }
    try {
      await save.mutateAsync({
        ...form,
        setupStep: 3,
        setupCompletedAt: new Date().toISOString(),
        // A single-site business has nothing to scope. Forced rather than
        // trusted from the form, so a stale "selected" from an earlier
        // multi-location state cannot survive into a facility that has one.
        locationScope: multiLocation ? form.locationScope : "all",
        locationIds: multiLocation ? form.locationIds : [],
      });
      setDraft(null);
      onComplete();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Your preferences were not saved.",
      );
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <PreferencesIllustration />
        <div className="space-y-2 text-center">
          <h3 className="text-xl font-semibold">Set your preferences</h3>
          <p className="text-muted-foreground mx-auto max-w-md text-sm/relaxed">
            The last step, and all of it stays in Yipyy. You can change any of
            this later.
          </p>
        </div>
      </div>

      <Separator />

      {/* ── Payouts ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <p className="font-semibold">When you get paid</p>
          <p className="text-muted-foreground text-sm/relaxed">
            Your payout schedule is set on your merchant account. Tell us which
            one you are on and we will show you when money should land.
          </p>
        </div>
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
          {(
            [
              {
                value: "standard" as PayoutSchedule,
                title: "Standard",
                body: "Money reaches your bank two to three business days after you take it.",
              },
              {
                value: "next_day" as PayoutSchedule,
                title: "Next business day",
                body: "Available on some accounts once you have been trading a while. Check your Clover account.",
                badge: "If enabled",
              },
            ] as const
          ).map((option) => (
            <Choice
              key={option.value}
              selected={form.payoutSchedule === option.value}
              onSelect={() => patch({ payoutSchedule: option.value })}
              title={option.title}
              body={option.body}
              badge={"badge" in option ? option.badge : undefined}
            />
          ))}
        </div>
        <p className="text-muted-foreground text-xs/relaxed">
          This changes the dates Yipyy estimates — it does not change your
          schedule. To change the schedule itself, do it on your merchant
          account.
        </p>
      </section>

      <Separator />

      {/* ── What the customer sees ─────────────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <p className="font-semibold">What your customers see</p>
          <p className="text-muted-foreground text-sm/relaxed">
            The name printed on receipts, invoices and payment emails from
            Yipyy.
          </p>
        </div>
        <div className="max-w-md space-y-2">
          <Label htmlFor="yipyy-pay-descriptor" className="text-sm font-medium">
            Name on receipts
          </Label>
          <Input
            id="yipyy-pay-descriptor"
            value={form.receiptDescriptor}
            maxLength={DESCRIPTOR_MAX}
            onChange={(event) =>
              patch({ receiptDescriptor: event.target.value })
            }
            className={cn(descriptorTooLong && "border-rose-400")}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground font-mono text-xs">
              {descriptorPreview(form.receiptDescriptor, businessName)}
            </p>
            <p
              className={cn(
                "text-muted-foreground shrink-0 text-xs tabular-nums",
                descriptorTooLong && "text-rose-600",
              )}
            >
              {form.receiptDescriptor.length}/{DESCRIPTOR_MAX}
            </p>
          </div>
          <p className="text-muted-foreground text-xs/relaxed">
            The line on your customer&rsquo;s bank statement is separate and is
            set on your merchant account, not here.
          </p>
        </div>
      </section>

      <Separator />

      {/* ── The fee ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <p className="font-semibold">Who pays the card fee</p>
          <p className="text-muted-foreground text-sm/relaxed">
            Card payments cost {formatFeeRate(form.feeCardPresent)} on your
            terminal and {formatFeeRate(form.feeCardNotPresent)} online.
          </p>
        </div>
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
          <Choice
            selected={form.feePayer === "business"}
            onSelect={() => patch({ feePayer: "business" })}
            title="We absorb it"
            body="Your customer pays the price on the invoice and nothing more. The fee comes out of your takings."
          />
          <Choice
            selected={form.feePayer === "client"}
            onSelect={() => patch({ feePayer: "client" })}
            title="Add it to the invoice"
            body="The fee appears as its own line, named and visible, before the customer pays."
          />
        </div>
        {form.feePayer === "client" && (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="max-w-sm space-y-1.5">
              <Label htmlFor="yipyy-pay-fee-label" className="text-sm">
                What to call it on the invoice
              </Label>
              <Input
                id="yipyy-pay-fee-label"
                value={form.feeLabel}
                maxLength={40}
                onChange={(event) => patch({ feeLabel: event.target.value })}
              />
            </div>
            <label className="flex items-start gap-2.5">
              <Checkbox
                checked={form.feeExcludeDebit}
                onCheckedChange={(checked) =>
                  patch({ feeExcludeDebit: checked === true })
                }
                className="mt-0.5"
              />
              <span className="text-sm/relaxed">
                Do not add it to debit cards
                <span className="text-muted-foreground block text-xs/relaxed">
                  Several card networks forbid surcharging a debit transaction.
                  Leave this on unless you have checked otherwise.
                </span>
              </span>
            </label>
            <p className="text-muted-foreground text-xs/relaxed">
              Passing the fee on is regulated, and the rules differ by country
              and by state. Check what applies where you trade — Yipyy shows the
              fee clearly to the customer, but the decision to charge it is
              yours.
            </p>
          </div>
        )}
      </section>

      {multiLocation && (
        <>
          <Separator />
          <section className="space-y-3">
            <div>
              <p className="font-semibold">Which locations use Yipyy Pay</p>
              <p className="text-muted-foreground text-sm/relaxed">
                You have {overview.locations.length} locations on this account.
              </p>
            </div>
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
              <Choice
                selected={form.locationScope === "all"}
                onSelect={() =>
                  patch({ locationScope: "all", locationIds: [] })
                }
                title="All locations"
                body="Every site takes card payments through this account."
              />
              <Choice
                selected={form.locationScope === "selected"}
                onSelect={() => patch({ locationScope: "selected" })}
                title="Only some"
                body="Choose the sites below."
              />
            </div>
            {form.locationScope === "selected" && (
              <div className="space-y-2 rounded-lg border p-4">
                {overview.locations.map((location) => {
                  const on = form.locationIds.includes(location.id);
                  return (
                    <label
                      key={location.id}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <Checkbox
                        checked={on}
                        onCheckedChange={(checked) =>
                          patch({
                            locationIds:
                              checked === true
                                ? [...form.locationIds, location.id]
                                : form.locationIds.filter(
                                    (id) => id !== location.id,
                                  ),
                          })
                        }
                      />
                      {location.name}
                      {location.isPrimary && (
                        <span className="text-muted-foreground text-xs">
                          Main
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
        <Button asChild variant="ghost" size="sm">
          <a
            href="https://www.clover.com/dashboard"
            target="_blank"
            rel="noreferrer noopener"
          >
            Open your merchant account
            <ExternalLink className="size-3.5 opacity-70" />
          </a>
        </Button>
        <Button
          size="lg"
          onClick={complete}
          disabled={save.isPending || descriptorTooLong}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {save.isPending && <Loader2 className="size-4 animate-spin" />}
          {save.isPending ? "Finishing…" : "Finish setup"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
