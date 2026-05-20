"use client";

import { Eye } from "lucide-react";

interface PreviewItem {
  label: string;
  value: string | number;
}

interface Props {
  channel: "email" | "sms" | "campaign" | "notification";
  recipients: string[];
  subject?: string;
  body: string;
  meta?: PreviewItem[];
}

const CHANNEL_LABEL: Record<Props["channel"], string> = {
  email: "Email preview",
  sms: "SMS preview",
  campaign: "Campaign preview",
  notification: "Notification preview",
};

/**
 * Renders a read-only preview of what will be sent. Spec 10.3 requires that
 * any action that sends a message or creates a campaign shows a preview
 * before the manager confirms.
 */
export function PreviewBeforeSend({
  channel,
  recipients,
  subject,
  body,
  meta,
}: Props) {
  const recipientPreview = recipients.slice(0, 3).join(", ");
  const extraRecipients = Math.max(0, recipients.length - 3);

  return (
    <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
      <div className="text-muted-foreground flex items-center gap-2 text-xs uppercase tracking-wide">
        <Eye className="size-3.5" />
        {CHANNEL_LABEL[channel]}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex gap-2">
          <span className="text-muted-foreground w-20 shrink-0">To</span>
          <span className="font-medium">
            {recipientPreview}
            {extraRecipients > 0 && (
              <span className="text-muted-foreground">
                {" "}
                +{extraRecipients} more ({recipients.length} total)
              </span>
            )}
          </span>
        </div>

        {subject && (
          <div className="flex gap-2">
            <span className="text-muted-foreground w-20 shrink-0">Subject</span>
            <span className="font-medium">{subject}</span>
          </div>
        )}

        <div className="border-t pt-2">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {body}
          </p>
        </div>

        {meta && meta.length > 0 && (
          <div className="grid grid-cols-2 gap-2 border-t pt-2 text-xs">
            {meta.map((m) => (
              <div key={m.label}>
                <span className="text-muted-foreground">{m.label}: </span>
                <span className="font-semibold">{m.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
