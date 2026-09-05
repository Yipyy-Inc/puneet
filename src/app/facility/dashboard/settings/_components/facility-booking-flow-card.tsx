"use client";

import { useSettings } from "@/hooks/use-settings";

import { SettingsBlock } from "@/components/ui/settings-block";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import { Switch } from "@/components/ui/switch";

// Facility booking access & evaluation requirements
export function FacilityBookingFlowCard() {
  const { bookingFlow, updateBookingFlow } = useSettings();

  const serviceOptions = [
    { id: "daycare", label: "Daycare" },
    { id: "boarding", label: "Boarding" },
    { id: "grooming", label: "Grooming" },
    { id: "training", label: "Training" },
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
      title="Booking Access & Evaluation Rules"
      description="Control when evaluations are required and which services appear in online booking."
      data={bookingFlow}
      onSave={updateBookingFlow}
    >
      {(isEditing, localFlow, setLocalFlow) => (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">Evaluation Required</div>
              <div className="text-muted-foreground text-sm">
                Require evaluation before any service booking.
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
                  <div className="font-medium">
                    Hide Services Until Evaluation Completed
                  </div>
                  <div className="text-muted-foreground text-sm">
                    Show only the Evaluation service until it is completed or
                    booked.
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
                <Label>Custom lock message shown to customers</Label>
                <Textarea
                  rows={3}
                  disabled={!isEditing}
                  placeholder="e.g. This service requires a pet evaluation first. Please book an evaluation so we can get to know your pet."
                  value={localFlow.evaluationLockedMessage ?? ""}
                  onChange={(e) =>
                    setLocalFlow({
                      ...localFlow,
                      evaluationLockedMessage: e.target.value,
                    })
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Shown to customers when they try to book a service that
                  requires evaluation.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Services Requiring Evaluation First</Label>
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
                <Label>Hidden From Online Booking</Label>
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
            <Label>Booking Request Confirmation Message</Label>
            <Textarea
              rows={4}
              disabled={!isEditing}
              placeholder="e.g. Thank you! We've received your booking request and will verify all the details. You'll receive a confirmation email shortly."
              value={localFlow.bookingRequestConfirmationMessage ?? ""}
              onChange={(e) =>
                setLocalFlow({
                  ...localFlow,
                  bookingRequestConfirmationMessage: e.target.value,
                })
              }
            />
            <p className="text-muted-foreground text-xs">
              Shown to customers on the confirmation screen after they submit a
              booking request.
            </p>
          </div>
        </div>
      )}
    </SettingsBlock>
  );
}
