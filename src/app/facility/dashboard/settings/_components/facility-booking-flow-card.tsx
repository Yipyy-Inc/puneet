"use client";

import Link from "next/link";

import { useSettings } from "@/hooks/use-settings";

import { SettingsBlock } from "@/components/ui/settings-block";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import { Switch } from "@/components/ui/switch";
import { useSettingsHref } from "@/lib/settings/use-settings-href";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// Facility booking access: hidden services, the customer's confirmation
// message, and whether services stay out of sight until a pet is evaluated.
export function FacilityBookingFlowCard() {
  const t = useSettingsText().section("booking-rules");
  const settingsHref = useSettingsHref();
  const { bookingFlow, updateBookingFlow } = useSettings();

  const serviceOptions = [
    { id: "daycare", label: t("svcDaycare") },
    { id: "boarding", label: t("svcBoarding") },
    { id: "grooming", label: t("svcGrooming") },
    { id: "training", label: t("svcTraining") },
  ];

  const toggleService = (
    list: string[],
    serviceId: string,
    checked: boolean,
  ) => {
    if (checked) return [...list, serviceId];
    return list.filter((item) => item !== serviceId);
  };

  return (
    <SettingsBlock
      title={t("flowTitle")}
      description={t("flowHelp")}
      data={bookingFlow}
      onSave={updateBookingFlow}
    >
      {(isEditing, localFlow, setLocalFlow) => (
        <div className="space-y-4">
          {/* Which services need an evaluation first is one rule, set on the
              evaluation setup page since 2026-10-02 (lib/evaluations/
              requirement.ts) — this card used to be a second editor of it. */}
          <p className="text-meta text-ink-secondary">
            {t("evaluationRulesMoved")}{" "}
            <Link
              href={settingsHref("evaluations")}
              className="text-primary font-semibold"
            >
              {t("evaluationRulesLink")}
            </Link>
          </p>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">{t("hideUntilEvaluated")}</div>
              <div className="text-muted-foreground text-sm">
                {t("hideUntilEvaluatedHelp")}
              </div>
            </div>
            <Switch
              checked={localFlow.hideServicesUntilEvaluationCompleted}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                setLocalFlow({
                  ...localFlow,
                  hideServicesUntilEvaluationCompleted: checked,
                })
              }
            />
          </div>
          {localFlow.hideServicesUntilEvaluationCompleted ? (
            <div className="space-y-1.5">
              <Label>{t("lockMessage")}</Label>
              <Textarea
                rows={3}
                disabled={!isEditing}
                placeholder={t("lockMessagePlaceholder")}
                value={localFlow.evaluationLockedMessage ?? ""}
                onChange={(e) =>
                  setLocalFlow({
                    ...localFlow,
                    evaluationLockedMessage: e.target.value,
                  })
                }
              />
              <p className="text-muted-foreground text-xs">
                {t("lockMessageHelp")}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>{t("hiddenFromBooking")}</Label>
            <div className="space-y-2 rounded-lg border p-3">
              {serviceOptions.map((service) => (
                <div key={service.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`hidden-${service.id}`}
                    checked={localFlow.hiddenServices.includes(service.id)}
                    disabled={!isEditing}
                    onCheckedChange={(checked) =>
                      setLocalFlow({
                        ...localFlow,
                        hiddenServices: toggleService(
                          localFlow.hiddenServices,
                          service.id,
                          !!checked,
                        ),
                      })
                    }
                  />
                  <Label htmlFor={`hidden-${service.id}`}>
                    {service.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("confirmationMessage")}</Label>
            <Textarea
              rows={4}
              disabled={!isEditing}
              placeholder={t("confirmationPlaceholder")}
              value={localFlow.bookingRequestConfirmationMessage ?? ""}
              onChange={(e) =>
                setLocalFlow({
                  ...localFlow,
                  bookingRequestConfirmationMessage: e.target.value,
                })
              }
            />
            <p className="text-muted-foreground text-xs">
              {t("confirmationHelp")}
            </p>
          </div>
        </div>
      )}
    </SettingsBlock>
  );
}
