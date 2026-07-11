"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Calendar } from "lucide-react";
import { toast } from "sonner";

interface ReportCardQuickReplyProps {
  reportCardId: string;
  petName: string;
  serviceType: string;
  /** Report date — referenced in the pre-filled message subject. */
  date?: string;
  onReplySent?: (message: string) => void;
}

const QUICK_REPLIES = [
  {
    id: "thank-you",
    label: "Awww thank you!",
    icon: Heart,
    message:
      "Awww thank you so much! We're so happy to see {petName} had a great time! ❤️",
  },
  {
    id: "concerns",
    label: "Any concerns?",
    icon: MessageCircle,
    message:
      "Thank you for the update! Is there anything we should be aware of or any concerns?",
  },
  {
    id: "book-again",
    label: "Can we book again?",
    icon: Calendar,
    message:
      "Thank you! We'd love to book {petName} again. When would be a good time?",
  },
];

export function ReportCardQuickReply({
  reportCardId: _reportCardId,
  petName,
  serviceType,
  date,
  onReplySent,
}: ReportCardQuickReplyProps) {
  const router = useRouter();
  const [selectedQuickReply, setSelectedQuickReply] = useState<string | null>(
    null,
  );

  const handleQuickReply = async (replyId: string) => {
    const reply = QUICK_REPLIES.find((r) => r.id === replyId);
    if (!reply) return;

    const message = reply.message.replace(/{petName}/g, petName);
    setSelectedQuickReply(replyId);

    try {
      // TODO: API call to send reply
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast.success("Reply sent!");
      onReplySent?.(message);
      setSelectedQuickReply(null);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send reply",
      );
      setSelectedQuickReply(null);
    }
  };

  // "Custom message" opens the Messages interface (pre-addressed to the
  // facility) with the report referenced in a pre-filled subject line.
  const handleCustomMessage = () => {
    const subject = date
      ? `Re: ${petName}'s ${serviceType} report (${date})`
      : `Re: ${petName}'s ${serviceType} report`;
    router.push(
      `/customer/messages?compose=${encodeURIComponent(`${subject}\n\n`)}`,
    );
  };

  return (
    <div className="space-y-2 border-t pt-4">
      <p className="text-sm font-medium">Quick Reply</p>
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
              {reply.label}
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
          Custom message
        </Button>
      </div>
    </div>
  );
}
