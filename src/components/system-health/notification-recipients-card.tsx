"use client";

import { useState } from "react";

import { Mail, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  addSeverityRecipient,
  removeSeverityRecipient,
  useNotificationSettings,
  type AlertSeverity,
} from "@/lib/notification-settings-store";

const SEVERITIES: AlertSeverity[] = ["Critical", "High", "Medium", "Low"];
const SEVERITY_DOT: Record<AlertSeverity, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-amber-500",
  Low: "bg-slate-400",
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NotificationRecipientsCard() {
  const settings = useNotificationSettings();
  const [drafts, setDrafts] = useState<Record<AlertSeverity, string>>({
    Critical: "",
    High: "",
    Medium: "",
    Low: "",
  });

  const add = (sev: AlertSeverity) => {
    const email = drafts[sev].trim();
    if (!EMAIL_RE.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (settings.recipientsBySeverity[sev].includes(email)) {
      toast.error("Already a recipient for this severity");
      return;
    }
    addSeverityRecipient(sev, email);
    setDrafts((d) => ({ ...d, [sev]: "" }));
    toast.success(`Added ${email} to ${sev}`);
  };

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Mail className="size-5" />
          Email Recipients by Severity
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Each alert severity notifies its own list of email recipients.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {SEVERITIES.map((sev) => (
          <div key={sev} className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={cn("size-2 rounded-full", SEVERITY_DOT[sev])}
                aria-hidden
              />
              <span className="text-sm font-semibold">{sev}</span>
              <span className="text-muted-foreground text-xs">
                {settings.recipientsBySeverity[sev].length} recipient(s)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {settings.recipientsBySeverity[sev].length === 0 && (
                <span className="text-muted-foreground text-xs">
                  No recipients
                </span>
              )}
              {settings.recipientsBySeverity[sev].map((email) => (
                <Badge key={email} variant="secondary" className="gap-1 pr-1">
                  {email}
                  <button
                    type="button"
                    aria-label={`Remove ${email} from ${sev}`}
                    className="hover:text-red-600"
                    onClick={() => {
                      removeSeverityRecipient(sev, email);
                      toast.success(`Removed ${email} from ${sev}`);
                    }}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={drafts[sev]}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [sev]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add(sev);
                  }
                }}
                placeholder="name@company.com"
                aria-label={`Add ${sev} recipient`}
                className="max-w-xs"
              />
              <Button variant="outline" onClick={() => add(sev)}>
                <Plus className="mr-1 size-4" />
                Add
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
