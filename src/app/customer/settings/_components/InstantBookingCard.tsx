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
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { rich } from "@/lib/i18n/rich";
import { serviceTypeLabel } from "@/lib/i18n/labels";

interface InstantBookingService {
  key: "daycare" | "boarding" | "grooming";
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

export function InstantBookingCard({
  summary,
  hasAny,
}: InstantBookingCardProps) {
  const { t, locale } = useCustomerText("settings");
  return (
    <Card className="border-amber-200/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="size-5 text-amber-500" />
          {t("instantBooking")}
        </CardTitle>
        <CardDescription>{t("instantBookingHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary.planName && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm">
            <Crown className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="flex-1 text-amber-900">
              {rich(t("planUnlocksInstantBooking"), {
                plan: <span className="font-medium">{summary.planName}</span>,
              })}
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
                  enabled ? "border-amber-200 bg-amber-50/40" : "bg-muted/20",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {serviceTypeLabel(locale, s.key)}
                  </span>
                  {s.fromMembership && (
                    <Badge
                      variant="outline"
                      className="h-5 border-amber-300 bg-white px-1.5 text-[10px] text-amber-800"
                    >
                      <Crown className="mr-1 size-3" />
                      {t("membership")}
                    </Badge>
                  )}
                  {s.fromSetting && !s.fromMembership && (
                    <Badge
                      variant="outline"
                      className="h-5 border-amber-300 bg-white px-1.5 text-[10px] text-amber-800"
                    >
                      {t("grantedByFacility")}
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
                  {enabled ? t("instant") : t("requiresApproval")}
                </Badge>
              </div>
            );
          })}
        </div>
        {!hasAny && (
          <p className="text-muted-foreground text-xs">
            {t("noInstantBooking")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
