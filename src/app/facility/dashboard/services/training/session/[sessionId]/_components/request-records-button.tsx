"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import { toast } from "sonner";
import { useMessageClient } from "@/lib/api/client";
import { useStaffText } from "@/lib/staff/use-staff-text";

interface Props {
  /** The owner's client reference — who the request goes to. */
  ownerRef: number;
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
 * SMS. It goes through /api/clients/[ref]/message, which sends or says why
 * not; it was a toast that printed the message and said "sent". The button
 * flips to "Records requested" only once it has gone, so it cannot be
 * double-fired in the same session.
 */
export function RequestRecordsButton({
  ownerRef,
  ownerName,
  ownerEmail,
  ownerPhone,
  petName,
  vaccineName,
  expired,
}: Props) {
  const [requested, setRequested] = useState(false);
  const { mutateAsync: sendMessage, isPending } = useMessageClient();
  const { fill } = useStaffText("clientMessage");
  const channel: "email" | "sms" = ownerEmail ? "email" : "sms";
  const firstName = ownerName.split(/\s+/)[0] || ownerName;
  const vax = vaccineName ?? "vaccination";

  async function handleRequest() {
    const body = `Hi ${firstName} — our records show ${petName}'s ${vax} ${
      expired ? "has expired" : "is expiring soon"
    }. Please upload ${petName}'s current vaccine certificate through your client portal so we can keep them in class. Thank you!`;
    const dest = channel === "email" ? ownerEmail : ownerPhone;
    try {
      const result = await sendMessage({
        clientRef: ownerRef,
        channel,
        body,
        subject:
          channel === "email"
            ? fill("recordsSubject", { pet: petName })
            : undefined,
      });
      if (!result.sent) {
        toast.error(fill("notSentTo", { name: ownerName }), {
          description: result.detail,
        });
        return;
      }
      toast.success(fill("recordsSentTo", { name: ownerName }), {
        description: `${channel === "email" ? "Email" : "SMS"}${
          dest ? ` · ${dest}` : ""
        }`,
      });
      setRequested(true);
    } catch (error) {
      toast.error(fill("notSentTo", { name: ownerName }), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  if (requested) {
    return (
      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-red-700/80 dark:text-red-300/80">
        <Check className="size-3" />
        Records requested
      </span>
    );
  }

  return (
    <button
      type="button"
      data-no-swipe
      disabled={isPending}
      onClick={handleRequest}
      title={`Send ${ownerName} an automated request to submit ${petName}'s current vaccine certificate`}
      className="mt-2 inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-950/40"
    >
      <Send className="size-3" />
      Request records
    </button>
  );
}
