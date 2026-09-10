"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { handleSalonCheckIn } from "@/lib/grooming-post-booking";
import { toast } from "sonner";
import { useCustomerText } from "@/lib/customer/use-customer-text";

interface GroomingCheckInButtonProps {
  bookingId: string;
  clientId: number;
  disabled?: boolean;
}

export function GroomingCheckInButton({
  bookingId,
  clientId,
  disabled = false,
}: GroomingCheckInButtonProps) {
  const { t } = useCustomerText("bookingDetail");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      await handleSalonCheckIn(bookingId, clientId);
      setIsCheckedIn(true);
      toast.success(t("checkInSuccess"), {
        description: t("checkInSuccessHelp"),
      });
    } catch {
      toast.error(t("checkInFailed"), {
        description: t("checkInFailedHelp"),
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (isCheckedIn) {
    return (
      <Button disabled className="border-green-200 bg-green-50 text-green-700">
        <CheckCircle2 className="mr-2 size-4" />
        {t("checkedIn")}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleCheckIn}
      disabled={disabled || isCheckingIn}
      className="w-full sm:w-auto"
    >
      {isCheckingIn ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          {t("checkingIn")}
        </>
      ) : (
        t("imHere")
      )}
    </Button>
  );
}
