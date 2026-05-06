"use client";

import { Crown, Zap } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface InstantBookingService {
  key: "daycare" | "boarding" | "grooming";
  label: string;
  fromSetting: boolean;
  fromMembership: boolean;
}

interface InstantBookingCardProps {
  summary: {
    planName?: string;
    services: InstantBookingService[];
  };
  hasAny: boolean;
}

export function InstantBookingCard({ summary, hasAny }: InstantBookingCardProps) {
  return (
    <Card className="border-amber-200/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="size-5 text-amber-500" />
          Instant Booking
        </CardTitle>
        <CardDescription>
          Services with instant booking skip staff approval — your reservation
          is auto-confirmed and you receive the confirmation email/SMS right
          away. Your facility manages this perk; reach out to staff to request
          changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary.planName && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm">
            <Crown className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="flex-1 text-amber-900">
              Your <span className="font-medium">{summary.planName}</span>{" "}
              membership unlocks instant booking on the services below.
            </p>
          </div>
        )}
        <div className="space-y-2">
          {summary.services.map((s) => {
            const enabled = s.fromSetting || s.fromMembership;
            return (
              <div
                key={s.key}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3",
                  enabled
                    ? "border-amber-200 bg-amber-50/40"
                    : "bg-muted/20",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{s.label}</span>
                  {s.fromMembership && (
                    <Badge
                      variant="outline"
                      className="h-5 border-amber-300 bg-white px-1.5 text-[10px] text-amber-800"
                    >
                      <Crown className="mr-1 size-3" />
                      Membership
                    </Badge>
                  )}
                  {s.fromSetting && !s.fromMembership && (
                    <Badge
                      variant="outline"
                      className="h-5 border-amber-300 bg-white px-1.5 text-[10px] text-amber-800"
                    >
                      Granted by facility
                    </Badge>
                  )}
                </div>
                <Badge
                  variant={enabled ? "default" : "secondary"}
                  className={cn(
                    "h-5 px-2 text-[10px]",
                    enabled && "bg-amber-500 hover:bg-amber-500",
                  )}
                >
                  {enabled ? "Instant" : "Requires approval"}
                </Badge>
              </div>
            );
          })}
        </div>
        {!hasAny && (
          <p className="text-muted-foreground text-xs">
            No instant booking is currently active for your account. Ask your
            facility about membership plans that include this perk.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
