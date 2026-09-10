"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { YipyyGoFormSectionProps } from "@/types/yipyygo";
import { useShellText } from "@/lib/shell/use-shell-text";

type ReviewSectionProps = YipyyGoFormSectionProps;

export function ReviewSection({
  formData,
  booking,
  onBack,
  onSubmit,
  isSubmitting,
}: ReviewSectionProps) {
  const t = useShellText("yipyygo");
  const addOnsTotal = formData.addOns
    .filter((ao) => ao.selected)
    .reduce((sum, ao) => sum + ao.price * (ao.quantity || 1), 0);

  const tipAmount =
    formData.tip?.type === "percentage"
      ? ((booking?.totalCost || 0) * (formData.tip.percentage || 0)) / 100
      : formData.tip?.customAmount || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("reviewAndSubmit")}</CardTitle>
        <CardDescription>
          {t("reviewYourInformationBeforeSubmitting")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Sections */}
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 font-semibold">{t("belongings")}</h3>
            {formData.belongings.length > 0 ? (
              <ul className="text-muted-foreground list-inside list-disc text-sm">
                {formData.belongings.map((item) => (
                  <li key={item.id}>
                    {item.type} {item.quantity && `(Qty: ${item.quantity})`}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t("noBelongingsListed")}
              </p>
            )}
          </div>

          <Separator />

          {formData.feedingInstructions && (
            <>
              <div>
                <h3 className="mb-2 font-semibold">
                  {t("feedingInstructions")}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {formData.feedingInstructions.foodType} -{" "}
                  {formData.feedingInstructions.portionSize}{" "}
                  {formData.feedingInstructions.portionUnit}
                </p>
              </div>
              <Separator />
            </>
          )}

          {!formData.noMedications && formData.medications.length > 0 && (
            <>
              <div>
                <h3 className="mb-2 font-semibold">{t("medications")}</h3>
                <ul className="text-muted-foreground list-inside list-disc text-sm">
                  {formData.medications.map((med) => (
                    <li key={med.id}>
                      {med.name} - {med.dosage} ({med.frequency})
                    </li>
                  ))}
                </ul>
              </div>
              <Separator />
            </>
          )}

          {formData.behaviorNotes && (
            <>
              <div>
                <h3 className="mb-2 font-semibold">{t("behaviorNotes")}</h3>
                <p className="text-muted-foreground text-sm">
                  {t("behaviorSummary")
                    .replace("{energy}", formData.behaviorNotes.energyLevel)
                    .replace(
                      "{dogs}",
                      formData.behaviorNotes.socialization.withDogs,
                    )
                    .replace(
                      "{humans}",
                      formData.behaviorNotes.socialization.withHumans,
                    )}
                </p>
              </div>
              <Separator />
            </>
          )}

          {formData.addOns.filter((ao) => ao.selected).length > 0 && (
            <>
              <div>
                <h3 className="mb-2 font-semibold">Add-ons</h3>
                <ul className="text-muted-foreground list-inside list-disc text-sm">
                  {formData.addOns
                    .filter((ao) => ao.selected)
                    .map((ao) => (
                      <li key={ao.id}>
                        {ao.name}{" "}
                        {ao.quantity && ao.quantity > 1 && `x${ao.quantity}`} -
                        ${((ao.quantity || 1) * ao.price).toFixed(2)}
                      </li>
                    ))}
                </ul>
              </div>
              <Separator />
            </>
          )}

          {tipAmount > 0 && (
            <>
              <div>
                <h3 className="mb-2 font-semibold">{t("tip")}</h3>
                <p className="text-muted-foreground text-sm">
                  ${tipAmount.toFixed(2)}
                </p>
              </div>
              <Separator />
            </>
          )}
        </div>

        {/* Totals */}
        <div className="bg-muted space-y-2 rounded-lg p-4">
          <div className="flex justify-between">
            <span>{t("stayTotal")}</span>
            <span>${(booking?.totalCost || 0).toFixed(2)}</span>
          </div>
          {addOnsTotal > 0 && (
            <div className="flex justify-between">
              <span>{t("addOns")}</span>
              <span>${addOnsTotal.toFixed(2)}</span>
            </div>
          )}
          {tipAmount > 0 && (
            <div className="flex justify-between">
              <span>{t("tip2")}</span>
              <span>${tipAmount.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>{t("total")}</span>
            <span>
              $
              {((booking?.totalCost || 0) + addOnsTotal + tipAmount).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Submit Alert */}
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertDescription>{t("bySubmittingConfirm")}</AlertDescription>
        </Alert>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
            {t("back")}
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting} size="lg">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 size-4" />
                {t("submitForm")}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
