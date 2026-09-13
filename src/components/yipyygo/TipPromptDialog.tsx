"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { YipyyGoTipChoice } from "@/lib/api/mappers/yipyy-go";
import { formatMoney } from "@/lib/i18n/format";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { TipPopupConfig, TipPopupPreset } from "@/types/yipyygo";

// ============================================================================
// The facility's tip prompt, as the pre-arrival form is sent.
//
// What it hands back is a CHOICE — one of the facility's presets by its id, an
// amount, or no tip — never a figure the server takes on trust.
// yipyy_go_pledge_tip prices a preset from the facility's own list, on what the
// booking comes to once the form's add-ons are on it, and holds an amount to
// the booking. The amounts on screen are that arithmetic done early.
//
// The old dialog handed back a percentage and a dollar figure of its own.
// ============================================================================

interface TipPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: TipPopupConfig;
  /** What a percentage is taken of: the booking with this form's add-ons. */
  base: number;
  petName: string;
  /** The choice this form sent last time, to start from. */
  initial: YipyyGoTipChoice | null;
  sending: boolean;
  onSend: (tip: YipyyGoTipChoice) => void;
}

export function TipPromptDialog(props: TipPromptDialogProps) {
  const { open, onOpenChange, config, sending } = props;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!sending) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          {config.message && (
            <DialogDescription>{config.message}</DialogDescription>
          )}
        </DialogHeader>
        {/* Mounted with the dialog, so every opening starts from `initial`. */}
        {open && <TipChoice {...props} />}
      </DialogContent>
    </Dialog>
  );
}

type Choice =
  | { kind: "preset"; id: string }
  | { kind: "custom" }
  | { kind: "none" };

const PILL =
  "border-line-strong text-body-ink hover:border-ink-disabled aria-pressed:text-primary-hover flex min-h-12 flex-col items-center justify-center rounded-xl border px-2 py-2 text-center aria-pressed:shadow-[inset_0_0_0_2px_var(--primary)]";

function TipChoice({
  config,
  base,
  petName,
  initial,
  sending,
  onSend,
}: TipPromptDialogProps) {
  const t = useShellText("yipyygo");
  const locale = useShellLocale();
  const offered = (id: string) =>
    config.presets.some((preset) => preset.id === id);
  const [choice, setChoice] = useState<Choice>(() =>
    initial?.type === "preset" && offered(initial.presetId)
      ? { kind: "preset", id: initial.presetId }
      : initial?.type === "custom" && config.allowCustomAmount
        ? { kind: "custom" }
        : { kind: "none" },
  );
  const [custom, setCustom] = useState(() =>
    initial?.type === "custom" ? String(initial.amount) : "",
  );

  // The server holds a custom tip to what the booking comes to, and to $1,000.
  const cap = Math.min(1000, Math.max(0, base));
  const presetAmount = (preset: TipPopupPreset) =>
    preset.type === "percentage"
      ? Math.round(base * preset.value) / 100
      : preset.value;
  const customAmount = Math.round(Number(custom) * 100) / 100;
  const customValid =
    Number.isFinite(customAmount) && customAmount > 0 && customAmount <= cap;
  const preset =
    choice.kind === "preset"
      ? config.presets.find((candidate) => candidate.id === choice.id)
      : undefined;
  const amount = preset
    ? presetAmount(preset)
    : choice.kind === "custom"
      ? customAmount
      : 0;
  const ready =
    choice.kind === "none"
      ? config.allowSkip
      : choice.kind === "custom"
        ? customValid
        : Boolean(preset);
  const pet = () => petName;
  const money = () => formatMoney(amount, locale);

  const send = () => {
    if (!ready) return;
    onSend(
      preset
        ? { type: "preset", presetId: preset.id }
        : choice.kind === "custom"
          ? { type: "custom", amount: customAmount }
          : { type: "none" },
    );
  };

  return (
    <>
      <div className="space-y-4">
        {config.presets.length > 0 && (
          <div
            role="group"
            aria-label={t("tipAmount")}
            className="grid grid-cols-3 gap-2"
          >
            {config.presets.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                aria-pressed={
                  choice.kind === "preset" && choice.id === candidate.id
                }
                onClick={() => setChoice({ kind: "preset", id: candidate.id })}
                className={PILL}
              >
                <span className="text-[15px] font-semibold">
                  {candidate.label}
                </span>
                <span className="text-ink-secondary text-[13px] tabular-nums">
                  {formatMoney(presetAmount(candidate), locale)}
                </span>
              </button>
            ))}
          </div>
        )}

        {config.allowCustomAmount && (
          <div className="space-y-1.5">
            <Label htmlFor="tip-custom-amount">{t("customAmount")}</Label>
            <Input
              id="tip-custom-amount"
              type="number"
              inputMode="decimal"
              min={0}
              max={cap}
              step={0.01}
              value={custom}
              placeholder={t("enterAmount")}
              aria-invalid={
                choice.kind === "custom" && custom !== "" && !customValid
                  ? true
                  : undefined
              }
              aria-describedby={
                choice.kind === "custom" && custom !== "" && !customValid
                  ? "tip-custom-note"
                  : undefined
              }
              onFocus={() => setChoice({ kind: "custom" })}
              onChange={(event) => {
                setCustom(event.target.value);
                setChoice({ kind: "custom" });
              }}
            />
            {choice.kind === "custom" && custom !== "" && !customValid && (
              <p
                id="tip-custom-note"
                className="text-destructive text-[13px] font-medium"
              >
                {t("tipUpTo").replace("{amount}", () =>
                  formatMoney(cap, locale),
                )}
              </p>
            )}
          </div>
        )}

        {config.allowSkip && (
          <button
            type="button"
            aria-pressed={choice.kind === "none"}
            onClick={() => {
              setChoice({ kind: "none" });
              setCustom("");
            }}
            className={`${PILL} w-full`}
          >
            <span className="text-[15px] font-semibold">{t("noTip")}</span>
          </button>
        )}
      </div>

      <DialogFooter>
        {/* The label carries the amount and the pet, and in French it is wider
            than a phone: it wraps inside the button rather than pushing the
            dialog past the screen. */}
        <Button
          onClick={send}
          disabled={!ready || sending}
          loading={sending}
          className="h-auto min-h-10 w-full py-2.5 text-center text-balance whitespace-normal max-lg:h-auto max-lg:min-h-12 sm:w-auto"
        >
          {choice.kind === "none"
            ? config.allowSkip
              ? t("sendWithoutTip").replace("{pet}", pet)
              : t("chooseTipToSend")
            : t("addTipAndSend")
                .replace("{amount}", money)
                .replace("{pet}", pet)}
        </Button>
      </DialogFooter>
    </>
  );
}
