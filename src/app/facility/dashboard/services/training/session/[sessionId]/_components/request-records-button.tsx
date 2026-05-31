"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  petName: string;
  /** The expiring/expired vaccine name, for the message body. */
  vaccineName: string | null;
  /** True when the vaccine has already expired (vs. expiring soon). */
  expired: boolean;
}

/**
 * Small secondary action on the in-session vaccine-expiry alert. One tap sends
 * the owner an automated message (via the Messaging module) asking them to
 * submit their dog's current vaccine certificate — so the trainer can act on
 * the alert without leaving the session. Email is preferred when on file, else
 * SMS. Mock send is toast-only (matching every other send action in the app);
 * the button flips to a "Records requested" confirmation so it can't be
 * double-fired in the same session.
 */
export function RequestRecordsButton({
  ownerName,
  ownerEmail,
  ownerPhone,
  petName,
  vaccineName,
  expired,
}: Props) {
  const [requested, setRequested] = useState(false);
  const channel: "email" | "sms" = ownerEmail ? "email" : "sms";
  const firstName = ownerName.split(/\s+/)[0] || ownerName;
  const vax = vaccineName ?? "vaccination";

  function handleRequest() {
    const body = `Hi ${firstName} — our records show ${petName}'s ${vax} ${
      expired ? "has expired" : "is expiring soon"
    }. Please upload ${petName}'s current vaccine certificate through your client portal so we can keep them in class. Thank you!`;
    const dest = channel === "email" ? ownerEmail : ownerPhone;
    toast.message(`Records request sent to ${ownerName}`, {
      description: `${channel === "email" ? "Email" : "SMS"}${
        dest ? ` · ${dest}` : ""
      } — ${body}`,
      duration: 8000,
    });
    setRequested(true);
  }

  if (requested) {
    return (
      <span className="text-red-700/80 dark:text-red-300/80 mt-2 inline-flex items-center gap-1 text-[11px] font-semibold">
        <Check className="size-3" />
        Records requested
      </span>
    );
  }

  return (
    <button
      type="button"
      data-no-swipe
      onClick={handleRequest}
      title={`Send ${ownerName} an automated request to submit ${petName}'s current vaccine certificate`}
      className="text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40 mt-2 inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-[11px] font-semibold dark:bg-transparent"
    >
      <Send className="size-3" />
      Request records
    </button>
  );
}
