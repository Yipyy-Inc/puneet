"use client";

import { useState } from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Gift,
  UserPlus,
  Target,
  MessageSquare,
  ClipboardCheck,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import { buildDefaultReferralProgram } from "@/data/facility-loyalty-config";
import {
  BOOKABLE_SERVICE_TYPES,
  referralProgramSchema,
  type ReferralProgram,
  type ReferralRewardConfig,
  type EarnRuleRewardType,
  type ReferralRewardTrigger,
} from "@/types/loyalty";
import {
  REFERRAL_REWARD_TYPE_LABELS,
  REFERRAL_TRIGGER_LABELS,
  REFERRAL_TRIGGER_HINTS,
  isItemReward,
  referralRewardFullText,
  renderReferralTemplate,
  previewTokens,
} from "@/lib/loyalty/referral-program";

const STEPS = ["Rewards", "Trigger & limits", "Messages", "Review"] as const;

function valueFieldFor(type: EarnRuleRewardType): {
  label: string;
  isText: boolean;
  placeholder: string;
} {
  switch (type) {
    case "points":
      return { label: "Points amount", isText: false, placeholder: "e.g. 100" };
    case "credit":
    case "gift_card":
    case "discount_fixed":
      return { label: "Amount ($)", isText: false, placeholder: "e.g. 25" };
    case "discount_pct":
      return { label: "Percentage (%)", isText: false, placeholder: "e.g. 10" };
    case "freebie":
      return {
        label: "Service / item name",
        isText: true,
        placeholder: "e.g. Nail trim",
      };
  }
}

function normalizeRewardValue(
  type: EarnRuleRewardType,
  value: number | string,
): number | string {
  if (isItemReward(type)) {
    return typeof value === "string" ? value.trim() : String(value);
  }
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function ReferralProgramWizard({ onClose }: { onClose: () => void }) {
  const { config, facilityId, patchConfig } = useLoyaltyProgram();
  const [step, setStep] = useState(0);
  // Tolerate a stale/old-shape persisted value: fall back to a fresh default
  // when the stored program doesn't match the current schema.
  const [draft, setDraft] = useState<ReferralProgram>(() => {
    const parsed = referralProgramSchema.safeParse(config.referralProgramSetup);
    return parsed.success
      ? parsed.data
      : buildDefaultReferralProgram(facilityId);
  });

  const patch = (p: Partial<ReferralProgram>) =>
    setDraft((prev) => ({ ...prev, ...p }));

  const patchReward = (
    side: "referrerReward" | "refereeReward",
    p: Partial<ReferralRewardConfig>,
  ) => setDraft((prev) => ({ ...prev, [side]: { ...prev[side], ...p } }));

  const setRewardType = (
    side: "referrerReward" | "refereeReward",
    type: EarnRuleRewardType,
  ) =>
    // Reset the value to a type-appropriate default when switching kinds.
    patchReward(side, {
      rewardType: type,
      rewardValue: isItemReward(type) ? "" : 0,
    });

  const isLast = step === STEPS.length - 1;
  const tokens = previewTokens(draft);

  const handleSave = () => {
    patchConfig({
      referralProgramSetup: {
        ...draft,
        facilityId,
        referrerReward: {
          ...draft.referrerReward,
          rewardValue: normalizeRewardValue(
            draft.referrerReward.rewardType,
            draft.referrerReward.rewardValue,
          ),
        },
        refereeReward: {
          ...draft.refereeReward,
          rewardValue: normalizeRewardValue(
            draft.refereeReward.rewardType,
            draft.refereeReward.rewardValue,
          ),
        },
      },
    });
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Gift className="size-5" />
          Configure Referral Program
        </DialogTitle>
        <DialogDescription>
          A guided setup for what referrers and friends earn, when rewards fire,
          and the messages they see.
        </DialogDescription>
      </DialogHeader>

      {/* Stepper */}
      <ol className="flex items-center gap-2 py-1">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(i)}
              className="flex items-center gap-2 text-left"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  i < step && "bg-primary text-primary-foreground",
                  i === step && "border-primary text-primary border-2",
                  i > step && "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? <Check className="size-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:inline",
                  i === step ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && <span className="bg-border h-px flex-1" />}
          </li>
        ))}
      </ol>

      <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2 pr-1">
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Referrer and friend rewards are set independently — mix any
              combination (e.g. $25 credit for the referrer, a free nail trim
              for the friend).
            </p>
            <RewardFields
              icon={Gift}
              title="Referrer reward"
              description="What the existing customer earns for referring a friend."
              config={draft.referrerReward}
              onChange={(p) => patchReward("referrerReward", p)}
              onTypeChange={(t) => setRewardType("referrerReward", t)}
            />
            <RewardFields
              icon={UserPlus}
              title="Referee reward"
              description="What the new customer (the friend) receives."
              config={draft.refereeReward}
              onChange={(p) => patchReward("refereeReward", p)}
              onTypeChange={(t) => setRewardType("refereeReward", t)}
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center gap-2">
                  <Target className="text-primary size-4" />
                  <Label className="text-base">When rewards fire</Label>
                </div>
                <Select
                  value={draft.rewardTrigger}
                  onValueChange={(v: ReferralRewardTrigger) =>
                    patch({ rewardTrigger: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.keys(
                        REFERRAL_TRIGGER_LABELS,
                      ) as ReferralRewardTrigger[]
                    ).map((key) => (
                      <SelectItem key={key} value={key}>
                        {REFERRAL_TRIGGER_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-sm">
                  {REFERRAL_TRIGGER_HINTS[draft.rewardTrigger]}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-5 pt-6">
                <Label className="text-base">Limits &amp; rules</Label>

                <NullableNumberRow
                  label="Minimum spend before reward"
                  hint="Friend must spend at least this much for the reward to fire."
                  prefix="$"
                  value={draft.minimumSpend}
                  defaultWhenOn={50}
                  onChange={(v) => patch({ minimumSpend: v })}
                />
                <NullableNumberRow
                  label="Maximum uses per code"
                  hint="Cap how many friends can redeem a single referral code."
                  value={draft.maxUsagePerCode}
                  defaultWhenOn={10}
                  integer
                  onChange={(v) => patch({ maxUsagePerCode: v })}
                />
                <NullableNumberRow
                  label="Code expiry"
                  hint="Days a referral code stays valid after it is issued."
                  suffix="days"
                  value={draft.codeExpiryDays}
                  defaultWhenOn={90}
                  integer
                  onChange={(v) => patch({ codeExpiryDays: v })}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-primary size-4" />
                  <Label className="text-base">Welcome message (referee)</Label>
                </div>
                <Textarea
                  rows={3}
                  value={draft.welcomeMessageTemplate}
                  onChange={(e) =>
                    patch({ welcomeMessageTemplate: e.target.value })
                  }
                />
                <TokenHint tokens={["code", "referrerName", "refereeReward"]} />
                <MessagePreview
                  text={renderReferralTemplate(
                    draft.welcomeMessageTemplate,
                    tokens,
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-primary size-4" />
                  <Label className="text-base">Share message (referrer)</Label>
                </div>
                <Textarea
                  rows={3}
                  value={draft.shareMessageTemplate}
                  onChange={(e) =>
                    patch({ shareMessageTemplate: e.target.value })
                  }
                />
                <TokenHint
                  tokens={["code", "refereeReward", "referrerReward"]}
                />
                <MessagePreview
                  text={renderReferralTemplate(
                    draft.shareMessageTemplate,
                    tokens,
                  )}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Enable referral program</Label>
                <p className="text-muted-foreground text-sm">
                  Turn the program on so customers can start referring friends.
                </p>
              </div>
              <Switch
                checked={draft.enabled}
                onCheckedChange={(checked) => patch({ enabled: checked })}
              />
            </div>

            <Card>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="text-primary size-4" />
                  <Label className="text-base">Summary</Label>
                </div>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <SummaryRow
                    label="Referrer earns"
                    value={referralRewardFullText(draft.referrerReward)}
                  />
                  <SummaryRow
                    label="Friend gets"
                    value={referralRewardFullText(draft.refereeReward)}
                  />
                  <SummaryRow
                    label="Rewards fire"
                    value={REFERRAL_TRIGGER_LABELS[draft.rewardTrigger]}
                  />
                  <SummaryRow
                    label="Minimum spend"
                    value={
                      draft.minimumSpend != null
                        ? `$${draft.minimumSpend}`
                        : "None"
                    }
                  />
                  <SummaryRow
                    label="Max uses per code"
                    value={
                      draft.maxUsagePerCode != null
                        ? `${draft.maxUsagePerCode}`
                        : "Unlimited"
                    }
                  />
                  <SummaryRow
                    label="Code expiry"
                    value={
                      draft.codeExpiryDays != null
                        ? `${draft.codeExpiryDays} days`
                        : "Never"
                    }
                  />
                </dl>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="mr-1 size-4" />
              Back
            </Button>
          )}
          {!isLast ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Next
              <ChevronRight className="ml-1 size-4" />
            </Button>
          ) : (
            <Button onClick={handleSave}>
              <Check className="mr-1 size-4" />
              Save program
            </Button>
          )}
        </div>
      </DialogFooter>
    </>
  );
}

function RewardFields({
  icon: Icon,
  title,
  description,
  config,
  onChange,
  onTypeChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  config: ReferralRewardConfig;
  onChange: (p: Partial<ReferralRewardConfig>) => void;
  onTypeChange: (t: EarnRuleRewardType) => void;
}) {
  const field = valueFieldFor(config.rewardType);
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-2">
          <Icon className="text-primary size-4" />
          <Label className="text-base">{title}</Label>
        </div>
        <p className="text-muted-foreground -mt-2 text-sm">{description}</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Reward type</Label>
            <Select
              value={config.rewardType}
              onValueChange={(v: EarnRuleRewardType) => onTypeChange(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(
                    REFERRAL_REWARD_TYPE_LABELS,
                  ) as EarnRuleRewardType[]
                ).map((key) => (
                  <SelectItem key={key} value={key}>
                    {REFERRAL_REWARD_TYPE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{field.label}</Label>
            <Input
              type={field.isText ? "text" : "number"}
              value={
                config.rewardValue === 0 && !field.isText
                  ? ""
                  : config.rewardValue
              }
              placeholder={field.placeholder}
              min={field.isText ? undefined : 0}
              onChange={(e) =>
                onChange({
                  rewardValue: field.isText
                    ? e.target.value
                    : e.target.value === ""
                      ? 0
                      : Number(e.target.value),
                })
              }
            />
          </div>
        </div>

        <ServiceTypeChips
          value={config.appliesToServiceTypes}
          onChange={(v) => onChange({ appliesToServiceTypes: v })}
        />

        <NullableNumberRow
          label="Reward expires after"
          hint="Days the issued reward stays valid once it fires."
          suffix="days"
          value={config.expiresAfterDays}
          defaultWhenOn={30}
          integer
          onChange={(v) => onChange({ expiresAfterDays: v })}
        />
      </CardContent>
    </Card>
  );
}

function ServiceTypeChips({
  value,
  onChange,
}: {
  value: string[] | null;
  onChange: (v: string[] | null) => void;
}) {
  const selected = value ?? [];
  const toggle = (service: string) => {
    const next = selected.includes(service)
      ? selected.filter((s) => s !== service)
      : [...selected, service];
    onChange(next.length === 0 ? null : next);
  };
  return (
    <div className="space-y-2">
      <Label>Applies to services</Label>
      <div className="flex flex-wrap gap-2">
        {BOOKABLE_SERVICE_TYPES.map((service) => (
          <Badge
            key={service}
            variant={selected.includes(service) ? "default" : "outline"}
            className="cursor-pointer capitalize"
            role="button"
            tabIndex={0}
            onClick={() => toggle(service)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle(service);
              }
            }}
          >
            {service}
          </Badge>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        {selected.length === 0
          ? "Applies to all services."
          : "Select none to apply to all services."}
      </p>
    </div>
  );
}

function NullableNumberRow({
  label,
  hint,
  value,
  defaultWhenOn,
  prefix,
  suffix,
  integer,
  onChange,
}: {
  label: string;
  hint: string;
  value: number | null;
  defaultWhenOn: number;
  prefix?: string;
  suffix?: string;
  integer?: boolean;
  onChange: (v: number | null) => void;
}) {
  const enabled = value != null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>{label}</Label>
          <p className="text-muted-foreground text-xs">{hint}</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) =>
            onChange(checked ? defaultWhenOn : null)
          }
        />
      </div>
      {enabled && (
        <div className="flex items-center gap-2">
          {prefix && (
            <span className="text-muted-foreground text-sm">{prefix}</span>
          )}
          <Input
            type="number"
            className="max-w-40"
            min={0}
            step={integer ? 1 : "any"}
            value={value}
            onChange={(e) =>
              onChange(e.target.value === "" ? 0 : Number(e.target.value))
            }
          />
          {suffix && (
            <span className="text-muted-foreground text-sm">{suffix}</span>
          )}
        </div>
      )}
    </div>
  );
}

function TokenHint({ tokens }: { tokens: string[] }) {
  return (
    <p className="text-muted-foreground text-xs">
      Available tokens:{" "}
      {tokens.map((t, i) => (
        <span key={t}>
          {i > 0 && ", "}
          <code className="bg-muted rounded-sm px-1 py-0.5">{`{${t}}`}</code>
        </span>
      ))}
    </p>
  );
}

function MessagePreview({ text }: { text: string }) {
  return (
    <div className="bg-muted/40 text-foreground/80 rounded-md border p-3 text-sm">
      <span className="text-muted-foreground mb-1 block text-xs font-medium">
        Preview
      </span>
      {text}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-1 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
