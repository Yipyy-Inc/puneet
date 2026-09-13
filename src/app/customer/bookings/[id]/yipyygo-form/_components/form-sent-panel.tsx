"use client";

import { CircleCheck } from "lucide-react";

import { RouteState } from "@/components/ui/route-state";
import type {
  CustomerYipyyGoBooking,
  CustomerYipyyGoPet,
  YipyyGoSubmitResult,
} from "@/lib/api/customer-yipyy-go";
import { useCustomerText } from "@/lib/customer/use-customer-text";

const SENT = new Set(["submitted", "approved", "completed_by_staff"]);

// The confirmation after a form is sent (§5d2: `success`, in the panel, never
// the toast). It says only what the server answered: the form is in, and a
// confirmation email went out only when the submit route reports it did — the
// old screen announced one that nothing sent. The one next step is the next
// pet still waiting for a form, or the booking.
export function FormSentPanel({
  data,
  pet,
  result,
  email,
  onSelectPet,
}: {
  data: CustomerYipyyGoBooking;
  pet: CustomerYipyyGoPet;
  result: YipyyGoSubmitResult;
  email: string | undefined;
  onSelectPet: (ref: number) => void;
}) {
  const { t, fill } = useCustomerText("yipyygo");
  const nextPet = data.pets.find(
    (other) =>
      other.ref !== pet.ref &&
      other.editable &&
      !SENT.has(other.submission?.status ?? ""),
  );

  return (
    <RouteState
      surface="card"
      pose="success"
      icon={CircleCheck}
      inkClassName="text-success"
      title={fill("sentTitle", { pet: pet.name })}
      description={
        result.confirmationSent && email
          ? fill("sentWithEmail", { email })
          : t("sentNoEmail")
      }
      action={
        nextPet
          ? {
              label: fill("nextPetForm", { pet: nextPet.name }),
              onClick: () => onSelectPet(nextPet.ref),
            }
          : {
              label: t("backToBooking"),
              href: `/customer/bookings/${data.booking.ref}`,
            }
      }
      className="min-h-0 p-0"
    />
  );
}
