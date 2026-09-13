"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  YipyyGoAddOnRequest,
  YipyyGoOfferedAddOn,
} from "@/lib/api/mappers/yipyy-go";
import { formatMoney } from "@/lib/i18n/format";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import { addOnLine, takesQuantity } from "@/lib/yipyy-go/charges-preview";

// ============================================================================
// The add-ons this booking can take, as the facility sells them.
//
// The offer and every price come from the server (yipyy_go_offered_add_ons):
// grooming's own list for a grooming booking, the facility's service add-ons
// for the rest. What the owner hands back is a choice — which add-on, and how
// many — never a price. The step this replaces showed five invented add-ons
// at invented prices that "will be added to your booking", and never were.
// ============================================================================

const UNIT_KEYS: Record<string, string> = {
  per_day: "feePerDay",
  per_session: "unitPerSession",
  per_hour: "unitPerHour",
  per_item: "unitEach",
};

interface AddOnsSectionProps {
  petName: string;
  offered: YipyyGoOfferedAddOn[];
  requests: YipyyGoAddOnRequest[];
  /** The days a per-day add-on counts (stayDaysFor). */
  stayDays: number;
  approval: "auto" | "staff_approval";
  onChange: (requests: YipyyGoAddOnRequest[]) => void;
}

export function AddOnsSection({
  petName,
  offered,
  requests,
  stayDays,
  approval,
  onChange,
}: AddOnsSectionProps) {
  const t = useShellText("yipyygo");
  const locale = useShellLocale();
  const chosen = new Map(requests.map((request) => [request.addOnId, request]));

  const toggle = (offer: YipyyGoOfferedAddOn, on: boolean) => {
    const others = requests.filter((request) => request.addOnId !== offer.id);
    onChange(on ? [...others, { addOnId: offer.id, quantity: 1 }] : others);
  };

  const setQuantity = (offer: YipyyGoOfferedAddOn, value: number) => {
    const quantity = Math.min(
      Math.max(Math.floor(value) || 1, 1),
      Math.max(1, offer.maxQuantity),
    );
    onChange(
      requests.map((request) =>
        request.addOnId === offer.id ? { ...request, quantity } : request,
      ),
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("addOnsTitle")}</CardTitle>
        <CardDescription>
          {t("enhanceStay").replaceAll("{pet}", () => petName)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3">
          {offered.map((offer) => {
            const request = chosen.get(offer.id);
            const id = `add-on-${offer.id}`;
            const unit = UNIT_KEYS[offer.pricingType];
            const line = addOnLine(offer, request?.quantity ?? 1, stayDays);
            return (
              <li
                key={offer.id}
                data-selected={Boolean(request)}
                className="border-line rounded-xl border p-4 data-[selected=true]:shadow-[inset_0_0_0_2px_var(--primary)]"
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={id}
                    checked={Boolean(request)}
                    onCheckedChange={(checked) =>
                      toggle(offer, checked === true)
                    }
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <Label
                        htmlFor={id}
                        className="text-body-ink text-[15px] font-semibold"
                      >
                        {offer.name}
                      </Label>
                      <span className="text-body-ink text-[14.5px] font-semibold tabular-nums">
                        {formatMoney(offer.unitPrice, locale)}
                        {unit && (
                          <span className="text-ink-secondary font-normal">
                            {" "}
                            {t(unit)}
                          </span>
                        )}
                      </span>
                    </div>
                    {offer.description && (
                      <p className="text-ink-secondary text-[13.5px]">
                        {offer.description}
                      </p>
                    )}
                    {request && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
                        {takesQuantity(offer) && (
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`${id}-count`}
                              className="text-[13.5px]"
                            >
                              {t("howMany")}
                            </Label>
                            <Input
                              id={`${id}-count`}
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={offer.maxQuantity}
                              value={String(request.quantity ?? 1)}
                              onChange={(event) =>
                                setQuantity(offer, Number(event.target.value))
                              }
                              className="w-24 tabular-nums"
                            />
                          </div>
                        )}
                        <span className="text-ink-secondary text-[13.5px] tabular-nums">
                          {t("aboutInAll").replace("{amount}", () =>
                            formatMoney(line.total, locale),
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-ink-secondary text-[13.5px]">
          {approval === "staff_approval"
            ? t("addOnsBilledOnApproval")
            : t("addOnsBilledOnSend")}
        </p>
      </CardContent>
    </Card>
  );
}
