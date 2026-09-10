"use client";

import { useMemo } from "react";
import { FileSignature, Pen, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  UNCATEGORIZED_ID,
  bucketByCategory,
  resolveCategories,
} from "@/components/additional-features/waivers/categories";
import {
  SERVICE_BADGE,
  getWaiverServices,
} from "@/components/additional-features/waivers/service-display";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { waiverServiceLabel } from "./waiver-service-label";
import {
  customWaiverCategories,
  type DigitalWaiver,
  type WaiverServiceTag,
} from "@/data/additional-features";

interface PendingWaiversCardProps {
  pendingWaivers: DigitalWaiver[];
  onSign: (waiver: DigitalWaiver) => void;
  facilityServices: WaiverServiceTag[];
}

export function PendingWaiversCard({
  pendingWaivers,
  onSign,
  facilityServices,
}: PendingWaiversCardProps) {
  const { t, fill, locale } = useCustomerText("documents");
  const grouped = useMemo(() => {
    const categories = resolveCategories(
      facilityServices,
      customWaiverCategories,
    );
    return bucketByCategory(pendingWaivers, categories).filter(
      (group) => group.items.length > 0,
    );
  }, [pendingWaivers, facilityServices]);

  // `resolveCategories` names a service category "Boarding Waivers" in
  // English, for the facility's screens. A service or the catch-all is
  // named here instead; a custom category is the facility's own name.
  const categoryLabel = (id: string, name: string) => {
    if (id === UNCATEGORIZED_ID) return t("uncategorized");
    if (id.startsWith("svc-"))
      return fill("waiversFor", {
        service: waiverServiceLabel(
          id.slice("svc-".length) as WaiverServiceTag,
          locale,
          t,
        ),
      });
    return name;
  };

  if (pendingWaivers.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Pen className="size-4 text-amber-600" />
          {t("pendingSignatures")}
          <Badge className="ml-auto bg-amber-500 text-white">
            {pendingWaivers.length}
          </Badge>
        </CardTitle>
        <CardDescription>{t("requireYourSignature")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {grouped.map((group) => (
          <div key={group.categoryId} className="space-y-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              {categoryLabel(group.categoryId, group.categoryName)}
            </p>
            <div className="space-y-2">
              {group.items.map((waiver) => (
                <div
                  key={waiver.id}
                  className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="flex items-center gap-2 font-medium">
                      <FileSignature className="size-4 shrink-0 text-amber-600" />
                      <span className="truncate">{waiver.name}</span>
                    </p>
                    <ServiceTagChips services={getWaiverServices(waiver)} />
                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span>v{waiver.version}</span>
                      {waiver.expiryDays && (
                        <>
                          <span>·</span>
                          <span>
                            {fill("validForDays", { n: waiver.expiryDays })}
                          </span>
                        </>
                      )}
                      {waiver.requiresWitness && (
                        <>
                          <span>·</span>
                          <Badge
                            variant="outline"
                            className="h-4 border-amber-300 px-1 text-[9px] text-amber-800"
                          >
                            {t("witnessRequired")}
                          </Badge>
                        </>
                      )}
                      {!waiver.requireDigitalSignature && (
                        <>
                          <span>·</span>
                          <Badge
                            variant="outline"
                            className="h-4 px-1 text-[9px]"
                          >
                            <ShieldCheck className="mr-0.5 size-2.5" />
                            {t("checkboxAgreement")}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onSign(waiver)}
                    className="self-start sm:self-center"
                  >
                    <Pen className="mr-1.5 size-3.5" />
                    {waiver.requireDigitalSignature
                      ? t("signNow")
                      : t("reviewAndAgree")}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ServiceTagChips({ services }: { services: WaiverServiceTag[] }) {
  const { t, locale } = useCustomerText("documents");
  return (
    <div className="flex flex-wrap gap-1">
      {services.map((tag) => (
        <span
          key={tag}
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
            SERVICE_BADGE[tag],
          )}
        >
          {waiverServiceLabel(tag, locale, t)}
        </span>
      ))}
    </div>
  );
}
