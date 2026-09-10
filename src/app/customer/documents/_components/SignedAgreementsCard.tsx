"use client";

import { useMemo } from "react";
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileSignature,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ClientDocument } from "@/data/documents";
import {
  digitalWaivers,
  type WaiverSignature,
} from "@/data/additional-features";
import {
  SERVICE_BADGE,
  getWaiverServices,
} from "@/components/additional-features/waivers/service-display";
import { cn } from "@/lib/utils";
import type { WaiverServiceTag } from "@/data/additional-features";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatDateLong, formatTime } from "@/lib/i18n/format";
import { waiverServiceLabel } from "./waiver-service-label";

interface SignedAgreementsCardProps {
  agreementDocs: ClientDocument[];
  waiverSignatures: WaiverSignature[];
  hasPending: boolean;
  onDownload: (url?: string, name?: string) => void;
}

interface NormalizedAgreement {
  key: string;
  name: string;
  signedAt: string;
  source: "document" | "digital";
  signatureType?: string;
  agreedToTerms?: string[];
  fileUrl?: string;
  /** Service TAGS, named where they render — not the English label. */
  serviceTags?: WaiverServiceTag[];
  version?: string;
}

export function SignedAgreementsCard({
  agreementDocs,
  waiverSignatures,
  hasPending,
  onDownload,
}: SignedAgreementsCardProps) {
  const { t, fill, locale } = useCustomerText("documents");
  const items = useMemo<NormalizedAgreement[]>(() => {
    const fromDocs: NormalizedAgreement[] = agreementDocs.map((doc) => ({
      key: `doc-${doc.id}`,
      name: doc.name,
      signedAt: doc.signedAt ?? doc.uploadedAt,
      source: "document",
      signatureType: doc.signatureType,
      agreedToTerms: doc.agreedToTerms,
      fileUrl: doc.fileUrl,
    }));

    const fromSignatures: NormalizedAgreement[] = waiverSignatures.map(
      (sig) => {
        const waiver = digitalWaivers.find((w) => w.id === sig.waiverId);
        const services = waiver ? getWaiverServices(waiver) : undefined;
        return {
          key: `sig-${sig.id}`,
          name: sig.waiverName,
          signedAt: sig.signedAt,
          source: "digital",
          signatureType: "digital",
          serviceTags: services,
          version: waiver?.version,
        };
      },
    );

    return [...fromDocs, ...fromSignatures].sort(
      (a, b) => new Date(b.signedAt).getTime() - new Date(a.signedAt).getTime(),
    );
  }, [agreementDocs, waiverSignatures]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5" />
          {t("agreementsAndWaivers")}
        </CardTitle>
        <CardDescription>{t("requiredByFacility")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && !hasPending ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <AlertCircle className="text-muted-foreground mb-2 size-10" />
            <p className="font-semibold">{t("noAgreementsYet")}</p>
            <p className="text-muted-foreground text-sm">{t("mayAskToSign")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.key}
                className="bg-background/60 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex items-center gap-2 font-medium">
                    <FileSignature className="text-primary size-4 shrink-0" />
                    <span className="truncate">{item.name}</span>
                    {item.version && (
                      <span className="text-muted-foreground text-xs">
                        v{item.version}
                      </span>
                    )}
                  </p>
                  {item.serviceTags && item.serviceTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {item.serviceTags.map((tag) => {
                        const className = SERVICE_BADGE[tag];
                        return (
                          <span
                            key={tag}
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                              className,
                            )}
                          >
                            {waiverServiceLabel(tag, locale, t)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {fill("signedOn", {
                      date: `${formatDateLong(item.signedAt, locale)} · ${formatTime(item.signedAt, locale)}`,
                    })}
                  </p>
                  {item.agreedToTerms && item.agreedToTerms.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      {fill("termsAgreed", {
                        terms: item.agreedToTerms.join(" · "),
                      })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <Badge variant="outline" className="gap-1 text-xs">
                    <CheckCircle className="size-3 text-green-500" />
                    {item.source === "digital" ||
                    item.signatureType === "digital"
                      ? t("signedOnline")
                      : t("onFile")}
                  </Badge>
                  {item.fileUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDownload(item.fileUrl, item.name)}
                    >
                      <Download className="mr-1 size-4" />
                      {t("download")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
