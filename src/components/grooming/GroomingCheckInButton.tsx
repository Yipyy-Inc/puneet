"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { handleSalonCheckIn } from "@/lib/grooming-post-booking";
import { toast } from "sonner";

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
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      await handleSalonCheckIn(bookingId, clientId);
      setIsCheckedIn(true);
      toast.success("Check-in successful!", {
        description: "The front desk has been notified that you're here.",
      });
    } catch (error) {
      toast.error("Check-in failed", {
        description: "There was an error checking in. Please contact the front desk.",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (isCheckedIn) {
    return (
      <Button disabled className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Checked In
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
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Checking in...
        </>
      ) : (
        "I'm here - Check In"
      )}
    </Button>
  );
}
