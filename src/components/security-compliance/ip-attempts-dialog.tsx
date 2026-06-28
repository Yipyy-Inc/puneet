"use client";

import { ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  failedLoginAttempts,
  type IPWhitelist,
} from "@/data/security-compliance";

const SEVERITY_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  Low: "secondary",
  Medium: "outline",
  High: "default",
  Critical: "destructive",
};

export function IpAttemptsDialog({
  ip,
  onOpenChange,
}: {
  ip: IPWhitelist | null;
  onOpenChange: (open: boolean) => void;
}) {
  const attempts = ip
    ? failedLoginAttempts.filter((a) => a.ipAddress === ip.ipAddress)
    : [];

  return (
    <Dialog open={!!ip} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="size-5" />
            Login Attempts
          </DialogTitle>
          <DialogDescription>
            Failed login attempts recorded from{" "}
            <span className="font-mono">{ip?.ipAddress}</span>
            {ip ? ` · ${ip.description}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {attempts.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No recorded login attempts from this IP.
            </p>
          )}
          {attempts.map((a) => (
            <div
              key={a.id}
              className="flex items-start justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {a.userName ?? a.email}
                </div>
                <div className="text-muted-foreground text-xs">
                  {a.failureReason} · {a.location} · {a.browser}
                </div>
                <div className="text-muted-foreground text-xs">
                  {new Date(a.attemptTime).toLocaleString()} · {a.attemptCount}{" "}
                  attempt(s)
                </div>
              </div>
              <Badge variant={SEVERITY_VARIANT[a.severity] ?? "outline"}>
                {a.severity}
              </Badge>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
