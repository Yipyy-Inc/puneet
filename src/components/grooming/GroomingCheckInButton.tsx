"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCustomerText } from "@/lib/customer/use-customer-text";

interface GroomingCheckInButtonProps {
  bookingId: string;
  // No `clientId`. The route derives the client from the BOOKING, which is the
  // only copy RLS has already checked belongs to the caller — a client id sent
  // from the browser is a claim, not a fact.
  disabled?: boolean;
}

export function GroomingCheckInButton({
  bookingId,
  disabled = false,
}: GroomingCheckInButtonProps) {
  const { t } = useCustomerText("bookingDetail");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  // ── THE DESK IS ACTUALLY TOLD NOW ───────────────────────────────────────
  //
  // This called `handleSalonCheckIn`, which was a `console.log` under a
  // `// TODO: Notify front desk`. The toast below said the salon knew; nobody
  // did. `POST /api/customer/bookings/<ref>/arrived` rings an urgent bell
  // addressed to whoever holds `check_in_out`.
  //
  // It does NOT check the booking in, and the copy no longer says it does:
  // arrival is a staff act, and a phone outside the door should not move the
  // board's idea of who is in the building.
  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const response = await fetch(
        `/api/customer/bookings/${encodeURIComponent(bookingId)}/arrived`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error(String(response.status));
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
