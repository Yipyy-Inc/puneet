"use client";

import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import {
  stepForMissing,
  type YipyyGoFormStep,
} from "@/lib/yipyy-go/owner-form";
import type { YipyyGoMissing } from "@/lib/yipyy-go/validate";
import type { CustomQuestion } from "@/types/yipyygo";

const MISSING_KEYS: Record<string, string> = {
  medications: "missingMedications",
  feeding: "missingFeeding",
  behavior: "missingBehavior",
  belongingsPhoto: "missingBelongingsPhoto",
};

// What still stops a form from being sent, each item a way back to the step
// that answers it. The rule is validateYipyyGoAnswers, which the submit route
// runs too, so this list and the server's refusal always agree.
export function MissingAnswers({
  missing,
  petName,
  questions,
  steps,
  onGoTo,
}: {
  missing: YipyyGoMissing[];
  petName: string;
  /** Every question the facility asks, to name one by its own words. */
  questions: CustomQuestion[];
  steps: YipyyGoFormStep[];
  onGoTo: (step: YipyyGoFormStep) => void;
}) {
  const { t, fill } = useCustomerText("yipyygo");
  if (missing.length === 0) return null;

  return (
    <Alert variant="destructive">
      <CircleAlert aria-hidden />
      <AlertTitle>{fill("missingTitle", { pet: petName })}</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 space-y-1">
          {missing.map((item) => {
            const label = item.startsWith("question:")
              ? (questions.find(
                  (question) => `question:${question.id}` === item,
                )?.label ?? t("missingQuestion"))
              : t(MISSING_KEYS[item] ?? "missingQuestion");
            const step = stepForMissing(item);
            return (
              <li key={item}>
                {steps.includes(step) ? (
                  <Button
                    variant="link"
                    className="px-0 text-left whitespace-normal"
                    onClick={() => onGoTo(step)}
                  >
                    {label}
                  </Button>
                ) : (
                  label
                )}
              </li>
            );
          })}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
