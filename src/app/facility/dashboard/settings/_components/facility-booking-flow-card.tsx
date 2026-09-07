"use client";

import { useSettings } from "@/hooks/use-settings";

import { SettingsBlock } from "@/components/ui/settings-block";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import { Switch } from "@/components/ui/switch";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// Facility booking access & evaluation requirements
export function FacilityBookingFlowCard() {
  const t = useSettingsText().section("booking-rules");
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
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">{t("evaluationRequired")}</div>
              <div className="text-muted-foreground text-sm">
                {t("evaluationRequiredHelp")}
              </div>
            </div>
            <Switch
              checked={localFlow.evaluationRequired}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                setLocalFlow({ ...localFlow, evaluationRequired: checked })
              }
            />
          </div>

          {localFlow.evaluationRequired ? (
            <div className="space-y-3">
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
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("servicesRequiringEval")}</Label>
                <div className="space-y-2 rounded-lg border p-3">
                  {serviceOptions.map((service) => (
                    <div key={service.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`eval-${service.id}`}
                        checked={localFlow.servicesRequiringEvaluation.includes(
                          service.id,
                        )}
                        disabled={!isEditing}
                        onCheckedChange={(checked) =>
                          setLocalFlow({
                            ...localFlow,
                            servicesRequiringEvaluation: toggleService(
                              localFlow.servicesRequiringEvaluation,
                              service.id,
                              !!checked,
                            ),
                          })
                        }
                      />
                      <Label htmlFor={`eval-${service.id}`}>
                        {service.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

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
            </div>
          )}

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
