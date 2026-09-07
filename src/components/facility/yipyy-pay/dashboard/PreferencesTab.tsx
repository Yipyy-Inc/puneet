"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  useSaveYipyyPayConfig,
  type YipyyPayOverview,
} from "@/lib/api/yipyy-pay";
import {
  DESCRIPTOR_MAX,
  descriptorPreview,
  formatFeeRate,
  type YipyyPayConfig,
} from "@/lib/settings/yipyy-pay";
import { useSettingsHref } from "@/lib/settings/use-settings-href";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// The settings a facility comes back to change.
//
// ── ONE SAVE BUTTON, EXCEPT WHERE THE SPEC ASKED FOR TWO ──────────────────
//
// The receipt name auto-saves on blur, as specified — it is a single field with
// an obvious commit point. Everything else collects into one Save, because the
// fee choice and the payout schedule are decisions somebody might change their
// mind about halfway through, and a control that writes the instant it is
// touched gives them nowhere to change it back.
//
// ── AND THE TWO THAT COST A CUSTOMER MONEY ASK FIRST ──────────────────────
//
// Turning the fee on adds a line to every invoice. That is a change to what
// people are charged, made by one person in a settings screen, and it deserves
// a sentence and a second press.
//
// ── CARD AUTHENTICATION IS SHOWN, DISABLED, WITH THE REASON ───────────────
//
// The spec asks for a toggle that puts a small hold on a saved card. Two things
// stop it: a Clover pre-authorisation is `final: false`, which Canadian
// acquiring refuses outright, and Yipyy has no card-on-file vault to hold
// against in the first place. It is rendered rather than dropped so a facility
// can see the capability is understood and not merely forgotten — and disabled
// rather than working, because a switch that moves and does nothing is the
// failure this whole screen exists to correct.
// ============================================================================

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-muted-foreground text-sm/relaxed">{description}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Choice({
  selected,
  onSelect,
  title,
  body,
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  body: string;
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
        <span className="block text-sm font-medium">{title}</span>
        <span className="text-muted-foreground mt-1 block text-sm/relaxed">
          {body}
        </span>
      </span>
    </button>
  );
}

export function PreferencesTab({ overview }: { overview: YipyyPayOverview }) {
  const t = useSettingsText().section("yipyy-pay");
  const fill = (key: string, values: Record<string, string>) =>
    Object.entries(values).reduce(
      (text, [name, value]) => text.replace(`{${name}}`, value),
      t(key),
    );
  const settingsPath = useSettingsHref();
  const save = useSaveYipyyPayConfig();
  const saved = overview.config;
  const businessName = overview.merchant?.name ?? overview.facility.name;

  // Derived from the server, never seeded from it — see the banner on
  // Step3Preferences. The value being clobbered here decides what a customer
  // is charged.
  const [draft, setDraft] = useState<YipyyPayConfig | null>(null);
  const form = draft ?? saved;
  const patch = (changes: Partial<YipyyPayConfig>) =>
    setDraft((prev) => ({ ...(prev ?? saved), ...changes }));

  const [descriptorSaved, setDescriptorSaved] = useState(false);

  const dirty = draft !== null;

  const commit = async (next: YipyyPayConfig, message: string) => {
    try {
      await save.mutateAsync(next);
      setDraft(null);
      toast.success(message);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("saveFailed"));
      return false;
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Receipt name: auto-saves on blur ──────────────────────────── */}
      <Section
        title={t("customerSees")}
        description={t("customerSeesShortHelp")}
      >
        <DescriptorField
          value={form.receiptDescriptor}
          businessName={businessName}
          savedFlash={descriptorSaved}
          onChange={(value) => patch({ receiptDescriptor: value })}
          onCommit={async (value) => {
            if (value === saved.receiptDescriptor) return;
            const ok = await commit(
              { ...form, receiptDescriptor: value },
              "Receipt name saved.",
            );
            if (ok) {
              setDescriptorSaved(true);
              setTimeout(() => setDescriptorSaved(false), 2000);
            }
          }}
        />
        <p className="text-muted-foreground text-xs/relaxed">
          {t("statementNoteShort")}
        </p>
      </Section>

      {/* ── The fee ───────────────────────────────────────────────────── */}
      <Section
        title={t("whoPaysFee")}
        description={fill("feeCost", {
          reader: formatFeeRate(form.feeCardPresent),
          online: formatFeeRate(form.feeCardNotPresent),
        })}
      >
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
          <Choice
            selected
            onSelect={() => undefined}
            title={t("feeAbsorb")}
            body="Your customer pays the invoice and nothing more."
          />
          <Choice
            selected={false}
            disabled
            onSelect={() => undefined}
            title={t("feeAddToInvoice")}
            body="Not available yet."
          />
        </div>
        <div className="text-muted-foreground flex items-start gap-2.5 rounded-lg border border-dashed p-3 text-xs/relaxed">
          <ShieldOff className="mt-0.5 size-3.5 shrink-0" />
          <p>
            <span className="text-foreground font-medium">
              {t("passOnNotReadyShort")}
            </span>{" "}
            {t("passOnNotReadyWhy")}
          </p>
        </div>
      </Section>

      {/* ── Payouts ───────────────────────────────────────────────────── */}
      <Section title={t("whenPaid")} description={t("whenPaidShortHelp")}>
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
          <Choice
            selected={form.payoutSchedule === "standard"}
            onSelect={() => patch({ payoutSchedule: "standard" })}
            title={t("payoutStandard")}
            body="Two to three business days after you take the payment."
          />
          <Choice
            selected={form.payoutSchedule === "next_day"}
            onSelect={() => patch({ payoutSchedule: "next_day" })}
            title={t("payoutNextDay")}
            body="Available on some accounts once you have been trading a while."
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href="https://www.clover.com/dashboard"
              target="_blank"
              rel="noreferrer noopener"
            >
              {t("changeOnAccount")}
              <ExternalLink className="size-3.5 opacity-70" />
            </a>
          </Button>
          <p className="text-muted-foreground text-xs/relaxed">
            {t("estimateNoteShort")}
          </p>
        </div>
      </Section>

      {/* ── Tips: a link, not a duplicate ─────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <p className="text-sm font-medium">{t("tipping")}</p>
            <p className="text-muted-foreground text-sm/relaxed">
              {t("tippingHelp")}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={settingsPath("tips")}>
              {t("tipSettings")}
              <ArrowRight className="size-3.5" />
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* ── Card authentication: present, disabled, explained ─────────── */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold">{t("preauthTitle")}</p>
              <p className="text-muted-foreground text-sm/relaxed">
                {t("preauthHelp")}
              </p>
            </div>
            <Switch checked={false} disabled aria-label={t("preauth")} />
          </div>
          <div className="text-muted-foreground flex items-start gap-2.5 rounded-lg border border-dashed p-3 text-xs/relaxed">
            <ShieldOff className="mt-0.5 size-3.5 shrink-0" />
            <p>
              <span className="text-foreground font-medium">
                {t("preauthUnavailable")}
              </span>{" "}
              {t("preauthUnavailableWhy")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Reconnect ─────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <p className="text-sm font-medium">{t("paymentAccount")}</p>
            <p className="text-muted-foreground text-sm/relaxed">
              {overview.connection.merchantId
                ? `${fill("connectedTo", {
                    name: overview.connection.merchantId,
                  })}${
                    overview.connection.environment === "sandbox"
                      ? ` ${t("testAccountSuffix")}`
                      : ""
                  }.`
                : t("noAccountConnected")}{" "}
              {t("switchingReplaces")}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/api/payments/clover/connect">
              {t("useDifferentAccount")}
              <ExternalLink className="size-3.5 opacity-70" />
            </a>
          </Button>
        </CardContent>
      </Card>

      {dirty && (
        <div className="bg-background/95 sticky bottom-4 flex flex-wrap items-center justify-end gap-2 rounded-xl border p-3 shadow-lg backdrop-blur-sm">
          <p className="text-muted-foreground mr-auto text-sm">
            {t("unsavedChanges")}
          </p>
          <Button variant="ghost" onClick={() => setDraft(null)}>
            {t("discard")}
          </Button>
          {/* §1: there is no second action colour. This was `bg-emerald-600`
              — the success ink on the primary action — which is the sixth
              instance of that found during the French pass. */}
          <Button
            disabled={save.isPending}
            onClick={() => commit(form, t("preferencesSaved"))}
          >
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("savePreferences")}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * The receipt name, saved when the field loses focus.
 *
 * A ref rather than an effect for the commit: `onBlur` already tells us the
 * edit is finished, and an effect on the value would fire a write per keystroke
 * with a debounce to undo it.
 */
function DescriptorField({
  value,
  businessName,
  savedFlash,
  onChange,
  onCommit,
}: {
  value: string;
  businessName: string;
  savedFlash: boolean;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
}) {
  const t = useSettingsText().section("yipyy-pay");
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  return (
    <div className="max-w-md space-y-2">
      <Label htmlFor="receipt-descriptor" className="text-sm font-medium">
        {t("receiptName")}
      </Label>
      <div className="relative">
        <Input
          id="receipt-descriptor"
          value={value}
          maxLength={DESCRIPTOR_MAX}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => onCommit(latest.current.trim())}
        />
        {savedFlash && (
          <span className="absolute inset-y-0 right-3 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="size-3.5" />
            {t("savedShort")}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground font-mono text-xs">
          {descriptorPreview(value, businessName)}
        </p>
        <p className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {value.length}/{DESCRIPTOR_MAX}
        </p>
      </div>
    </div>
  );
}
