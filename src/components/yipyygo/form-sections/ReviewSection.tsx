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
import type { YipyyGoFormData } from "@/data/yipyygo-forms";
import type { YipyyGoConfig } from "@/data/yipyygo-config";

interface ReviewSectionProps {
  formData: YipyyGoFormData;
  updateFormData: (updates: Partial<YipyyGoFormData>) => void;
  booking: any;
  pet: any;
  customer: any;
  config: YipyyGoConfig | null;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isLastSection: boolean;
}

export function ReviewSection({
  formData,
  booking,
  onBack,
  onSubmit,
  isSubmitting,
}: ReviewSectionProps) {
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
        <CardTitle>Review & Submit</CardTitle>
        <CardDescription>
          Review your information before submitting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Sections */}
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 font-semibold">Belongings</h3>
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
                No belongings listed
              </p>
            )}
          </div>

          <Separator />

          {formData.feedingInstructions && (
            <>
              <div>
                <h3 className="mb-2 font-semibold">Feeding Instructions</h3>
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
                <h3 className="mb-2 font-semibold">Medications</h3>
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
                <h3 className="mb-2 font-semibold">Behavior Notes</h3>
                <p className="text-muted-foreground text-sm">
                  Energy: {formData.behaviorNotes.energyLevel} | Dogs:{" "}
                  {formData.behaviorNotes.socialization.withDogs} | Humans:{" "}
                  {formData.behaviorNotes.socialization.withHumans}
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
                <h3 className="mb-2 font-semibold">Tip</h3>
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
            <span>Stay Total:</span>
            <span>${(booking?.totalCost || 0).toFixed(2)}</span>
          </div>
          {addOnsTotal > 0 && (
            <div className="flex justify-between">
              <span>Add-ons:</span>
              <span>${addOnsTotal.toFixed(2)}</span>
            </div>
          )}
          {tipAmount > 0 && (
            <div className="flex justify-between">
              <span>Tip:</span>
              <span>${tipAmount.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>
              $
              {((booking?.totalCost || 0) + addOnsTotal + tipAmount).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Submit Alert */}
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertDescription>
            By submitting this form, you confirm that all information is
            accurate. You can edit this form until the deadline.
          </AlertDescription>
        </Alert>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
            Back
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting} size="lg">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 size-4" />
                Submit Form
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
