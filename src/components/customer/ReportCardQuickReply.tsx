"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { replyToReportCard } from "@/lib/api/report-cards";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { serviceTypeLabel } from "@/lib/i18n/labels";

interface ReportCardQuickReplyProps {
  reportCardId: string;
  petName: string;
  serviceType: string;
  /** Report date — referenced in the pre-filled message subject. */
  date?: string;
  onReplySent?: (message: string) => void;
}

// Labels and messages by CATALOGUE KEY. The message is what reaches the
// facility, in the words of whoever tapped it — so it is in their language,
// the same as if they had typed it.
const QUICK_REPLIES = [
  {
    id: "thank-you",
    labelKey: "qrThanks",
    messageKey: "qrThanksMessage",
    icon: Heart,
  },
  {
    id: "concerns",
    labelKey: "qrConcerns",
    messageKey: "qrConcernsMessage",
    icon: MessageCircle,
  },
  {
    id: "book-again",
    labelKey: "qrBookAgain",
    messageKey: "qrBookAgainMessage",
    icon: Calendar,
  },
];

export function ReportCardQuickReply({
  reportCardId,
  petName,
  serviceType,
  date,
  onReplySent,
}: ReportCardQuickReplyProps) {
  const { t, fill, locale } = useCustomerText("reportCards");
  const router = useRouter();
  const [selectedQuickReply, setSelectedQuickReply] = useState<string | null>(
    null,
  );

  const handleQuickReply = async (replyId: string) => {
    const reply = QUICK_REPLIES.find((r) => r.id === replyId);
    if (!reply) return;

    const message = fill(reply.messageKey, { petName });
    setSelectedQuickReply(replyId);

    try {
      // Recorded on the card, through `reply_to_report_card`. This was
      // `await new Promise(r => setTimeout(r, 500))` — a delay impersonating a
      // network call — followed by "Reply sent!". Nothing was sent, and the
      // card id was named `_reportCardId` to mark it deliberately unused.
      await replyToReportCard(reportCardId, message);

      toast.success(t("replySent"));
      onReplySent?.(message);
      setSelectedQuickReply(null);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : t("failedToSendReply"),
      );
      setSelectedQuickReply(null);
    }
  };

  // "Custom message" opens the Messages interface (pre-addressed to the
  // facility) with the report referenced in a pre-filled subject line.
  const handleCustomMessage = () => {
    const service = serviceTypeLabel(locale, serviceType);
    const subject = date
      ? fill("replySubjectDated", { pet: petName, service, date })
      : fill("replySubject", { pet: petName, service });
    router.push(
      `/customer/messages?compose=${encodeURIComponent(`${subject}\n\n`)}`,
    );
  };

  return (
    <div className="space-y-2 border-t pt-4">
      <p className="text-sm font-medium">{t("quickReply")}</p>
      <div className="flex flex-wrap gap-2">
        {QUICK_REPLIES.map((reply) => {
          const Icon = reply.icon;
          return (
            <Button
              key={reply.id}
              variant="outline"
              size="sm"
              onClick={() => handleQuickReply(reply.id)}
              disabled={selectedQuickReply === reply.id}
              className="text-xs"
            >
              <Icon className="mr-1 size-3" />
              {t(reply.labelKey)}
            </Button>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCustomMessage}
          className="text-xs"
        >
          <MessageCircle className="mr-1 size-3" />
          {t("customMessage")}
        </Button>
      </div>
    </div>
  );
}
