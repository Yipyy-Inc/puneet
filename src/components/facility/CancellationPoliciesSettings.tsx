"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useCancellationPolicies,
  useDepositRules,
  useFacilitySettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import {
  NO_CHARGE,
  seedFromExisting,
  type CancellationCharge,
  type CancellationPolicies,
  type CancellationRefund,
  type CancellationTier,
  type ServiceCancellationPolicy,
} from "@/lib/settings/cancellation";
import { SERVICE_TYPES_FOR_DEPOSITS } from "@/types/deposit-rules";

// ============================================================================
// Where a facility writes what a cancellation costs.
//
// ── IT DECIDES NOTHING YET, AND THE SCREEN SAYS SO ────────────────────────
//
// The engine that reads this domain lands separately. Rather than hide that,
// the screen states it: a facility should not discover that the terms it
// carefully authored were inert. §5q — say the true thing plainly.
//
// ── THE SEED IS SHOWN, NEVER SAVED ON ANYONE'S BEHALF ─────────────────────
//
// A facility already has a notice window and a fee percentage in its booking
// rules, and a refund policy in its deposit rules, and both are already shown
// to customers. Opening this screen to an empty page would look like those
// terms had been lost, so it opens showing them — as a DRAFT. Until somebody
// presses save, `configured` stays false and nothing is written. Storing a
// policy nobody authored is how a fixture's numbers reach a real invoice.
//
// ── AND IT WAITS FOR THE ROW ──────────────────────────────────────────────
//
// `useFacilitySettings()` answers with documented defaults while its request
// is in flight. A component that seeds `useState` from that captures the
// defaults, and Save then writes them over whatever the facility had — a load
// delay becoming data loss, silently, for whoever was unlucky with the
// network. It happened three times in one day (see check:settings-seeding), so
// nothing here holds a value at all until `isPending` is false — and it
// derives rather than copies, so there is no capture to get wrong.
// ============================================================================

type Draft = CancellationPolicies;

const CHARGE_KINDS = [
  "none",
  "keep_deposit",
  "percentage",
  "flat",
  "forfeit_pass",
] as const;

const REFUNDS: CancellationRefund[] = ["original", "store_credit", "none"];

/**
 * The words a person reads for each service, keyed into this section's copy.
 *
 * The slug itself is NOT a label. `capitalize` on "boarding" reads as English
 * to a French user and `check:ui-french` cannot see it, because the string
 * never appears in the source — it arrives as data. Same map, same reason, as
 * `DepositRulesSettings`.
 */
const SERVICE_TEXT: Record<string, string> = {
  boarding: "svcBoarding",
  daycare: "svcDaycare",
  grooming: "svcGrooming",
  training: "svcTraining",
};

function chargeOf(
  kind: string,
  previous: CancellationCharge,
): CancellationCharge {
  const value =
    previous.kind === "percentage" || previous.kind === "flat"
      ? previous.value
      : 0;
  switch (kind) {
    case "percentage":
      return { kind: "percentage", value };
    case "flat":
      return { kind: "flat", value };
    case "keep_deposit":
      return { kind: "keep_deposit" };
    case "forfeit_pass":
      return { kind: "forfeit_pass" };
    default:
      return NO_CHARGE;
  }
}

function emptyPolicy(): ServiceCancellationPolicy {
  return { enabled: true, customerMayCancel: "instant", tiers: [] };
}

export function CancellationPoliciesSettings() {
  const { policies, configured, isPending } = useCancellationPolicies();
  const { refundPolicy } = useDepositRules();
  const { settings } = useFacilitySettings();
  const save = useSaveFacilitySetting();
  const { section } = useSettingsText();
  const t = section("cancellation-policies");

  const bookingRules = settings.booking_rules.value;

  // ── DERIVED, NOT SEEDED IN AN EFFECT ──────────────────────────────────
  //
  // `null` until the row lands, so nothing can capture the documented
  // defaults and write them back over the facility's own policy. Deriving it
  // rather than copying it into state in a `useEffect` also means there is no
  // cascading render to reason about, and no ref tracking whether the copy
  // already happened.
  const fromServer = useMemo<Draft | null>(
    () =>
      isPending
        ? null
        : configured
          ? policies
          : seedFromExisting({
              cancelPolicyHours: bookingRules.cancelPolicyHours,
              cancelFeePercentage: bookingRules.cancelFeePercentage,
              refundType: refundPolicy.type,
              services: SERVICE_TYPES_FOR_DEPOSITS,
            }),
    [isPending, configured, policies, bookingRules, refundPolicy],
  );

  // Once somebody has edited, THEIR version wins — a later refetch must not
  // pull the ground out from under a half-written policy.
  const [edited, setEdited] = useState<Draft | null>(null);
  const draft = edited ?? fromServer;

  const setDraft = (change: (current: Draft) => Draft) =>
    setEdited((current) => {
      const base = current ?? fromServer;
      return base ? change(base) : current;
    });

  if (isPending || !draft) {
    return (
      <Card>
        <CardContent className="text-ink-tertiary py-10 text-center text-[14.5px]">
          {t("loading")}
        </CardContent>
      </Card>
    );
  }

  const policyFor = (service: string): ServiceCancellationPolicy =>
    draft.services[service] ?? {
      enabled: false,
      customerMayCancel: "instant",
      tiers: [],
    };

  const update = (
    service: string,
    change: (policy: ServiceCancellationPolicy) => ServiceCancellationPolicy,
  ) =>
    setDraft((current) => ({
      ...current,
      services: {
        ...current.services,
        [service]: change(
          current.services[service] ?? {
            enabled: false,
            customerMayCancel: "instant",
            tiers: [],
          },
        ),
      },
    }));

  const updateTier = (
    service: string,
    id: string,
    change: (tier: CancellationTier) => CancellationTier,
  ) =>
    update(service, (policy) => ({
      ...policy,
      tiers: policy.tiers.map((tier) => (tier.id === id ? change(tier) : tier)),
    }));

  const onSave = async () => {
    try {
      await save.mutateAsync({ domain: "cancellation_policies", value: draft });
      toast.success(t("saved"));
    } catch (error) {
      toast.error(
        `${t("saveFailed")} ${error instanceof Error ? error.message : ""}`.trim(),
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* No title: the settings shell's own page header already carries it,
          and two "Cancellation policies" one above the other reads as a bug. */}
      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="text-ink-secondary text-[14.5px]">{t("intro")}</p>
          <p className="text-ink-tertiary text-[13.5px]">{t("inertNotice")}</p>
          {!configured && (
            <p className="text-ink-tertiary text-[13.5px]">
              {t("notConfigured")}
            </p>
          )}
        </CardContent>
      </Card>

      {SERVICE_TYPES_FOR_DEPOSITS.map((service) => {
        const policy = policyFor(service);
        const serviceLabel = SERVICE_TEXT[service]
          ? t(SERVICE_TEXT[service])
          : service;
        return (
          <Card key={service}>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>{serviceLabel}</CardTitle>
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-ink-tertiary text-[13.5px]">
                  {policy.enabled ? t("serviceOn") : t("serviceOff")}
                </span>
                <Switch
                  checked={policy.enabled}
                  aria-label={t("enable").replace("{service}", serviceLabel)}
                  onCheckedChange={(enabled) =>
                    update(service, (current) =>
                      enabled
                        ? { ...emptyPolicy(), ...current, enabled: true }
                        : { ...current, enabled: false },
                    )
                  }
                />
              </div>
            </CardHeader>

            {!policy.enabled ? (
              <CardContent>
                <p className="text-ink-tertiary text-[13.5px]">
                  {t("serviceOffHelp")}
                </p>
              </CardContent>
            ) : (
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>{t("whoCancels")}</Label>
                  <Select
                    value={policy.customerMayCancel}
                    onValueChange={(value) =>
                      update(service, (current) => ({
                        ...current,
                        customerMayCancel:
                          value === "request" ? "request" : "instant",
                      }))
                    }
                  >
                    <SelectTrigger className="max-w-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">{t("instant")}</SelectItem>
                      <SelectItem value="request">{t("request")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>{t("tiers")}</Label>
                    <p className="text-ink-tertiary mt-1 text-[13.5px]">
                      {t("tiersHelp")}
                    </p>
                  </div>

                  {policy.tiers.length === 0 && (
                    <p className="text-ink-tertiary text-[13.5px]">
                      {t("noTiersYet")}
                    </p>
                  )}

                  {policy.tiers.map((tier) => (
                    <div
                      key={tier.id}
                      className="bg-surface-inset grid gap-3 rounded-(--r-row) p-4 md:grid-cols-2 lg:grid-cols-4"
                    >
                      <div className="space-y-2">
                        <Label>{t("noticeHours")}</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={String(tier.minNoticeHours)}
                            onChange={(event) =>
                              updateTier(service, tier.id, (current) => ({
                                ...current,
                                minNoticeHours: Math.max(
                                  0,
                                  Number(event.target.value) || 0,
                                ),
                              }))
                            }
                          />
                          <span className="text-ink-tertiary shrink-0 text-[13.5px]">
                            {t("hours")}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>{t("charge")}</Label>
                        <Select
                          value={tier.charge.kind}
                          onValueChange={(kind) =>
                            updateTier(service, tier.id, (current) => ({
                              ...current,
                              charge: chargeOf(kind, current.charge),
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CHARGE_KINDS.map((kind) => (
                              <SelectItem key={kind} value={kind}>
                                {t(
                                  `charge${kind
                                    .split("_")
                                    .map(
                                      (part) =>
                                        part.charAt(0).toUpperCase() +
                                        part.slice(1),
                                    )
                                    .join("")}`,
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(tier.charge.kind === "percentage" ||
                          tier.charge.kind === "flat") && (
                          <Input
                            type="number"
                            min={0}
                            inputMode="decimal"
                            value={String(tier.charge.value)}
                            onChange={(event) =>
                              updateTier(service, tier.id, (current) => ({
                                ...current,
                                charge: {
                                  kind:
                                    current.charge.kind === "flat"
                                      ? "flat"
                                      : "percentage",
                                  value: Math.max(
                                    0,
                                    Number(event.target.value) || 0,
                                  ),
                                },
                              }))
                            }
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>{t("refund")}</Label>
                        <Select
                          value={tier.refund}
                          onValueChange={(value) =>
                            updateTier(service, tier.id, (current) => ({
                              ...current,
                              refund: (REFUNDS.includes(
                                value as CancellationRefund,
                              )
                                ? value
                                : "original") as CancellationRefund,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="original">
                              {t("refundOriginal")}
                            </SelectItem>
                            <SelectItem value="store_credit">
                              {t("refundStoreCredit")}
                            </SelectItem>
                            <SelectItem value="none">
                              {t("refundNone")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex min-w-0 flex-col gap-2">
                        <Label>{t("tierLabel")}</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={tier.label ?? ""}
                            placeholder={t("tierLabelPlaceholder")}
                            onChange={(event) =>
                              updateTier(service, tier.id, (current) => ({
                                ...current,
                                label: event.target.value || undefined,
                              }))
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t("removeTier")}
                            onClick={() =>
                              update(service, (current) => ({
                                ...current,
                                tiers: current.tiers.filter(
                                  (row) => row.id !== tier.id,
                                ),
                              }))
                            }
                          >
                            <Trash2 className="size-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      update(service, (current) => ({
                        ...current,
                        tiers: [
                          ...current.tiers,
                          {
                            id: `${service}-${Date.now()}`,
                            minNoticeHours: 0,
                            charge: NO_CHARGE,
                            refund: "original",
                          },
                        ],
                      }))
                    }
                  >
                    <Plus className="size-5" />
                    {t("addTier")}
                  </Button>
                </div>

                <p className="text-ink-tertiary text-[13.5px]">
                  {t("belowEveryTier")}
                </p>
              </CardContent>
            )}
          </Card>
        );
      })}

      <div className="flex justify-end">
        <Button
          type="button"
          size="lg"
          onClick={() => void onSave()}
          disabled={save.isPending}
          aria-busy={save.isPending}
        >
          {save.isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
