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
  SERVICE_LABEL,
  getWaiverServices,
} from "@/components/additional-features/waivers/service-display";
import { cn } from "@/lib/utils";

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
  serviceTags?: string[];
  version?: string;
}

export function SignedAgreementsCard({
  agreementDocs,
  waiverSignatures,
  hasPending,
  onDownload,
}: SignedAgreementsCardProps) {
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

    const fromSignatures: NormalizedAgreement[] = waiverSignatures.map((sig) => {
      const waiver = digitalWaivers.find((w) => w.id === sig.waiverId);
      const services = waiver
        ? getWaiverServices(waiver).map((s) => SERVICE_LABEL[s])
        : undefined;
      return {
        key: `sig-${sig.id}`,
        name: sig.waiverName,
        signedAt: sig.signedAt,
        source: "digital",
        signatureType: "digital",
        serviceTags: services,
        version: waiver?.version,
      };
    });

    return [...fromDocs, ...fromSignatures].sort(
      (a, b) =>
        new Date(b.signedAt).getTime() - new Date(a.signedAt).getTime(),
    );
  }, [agreementDocs, waiverSignatures]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5" />
          Agreements & Waivers
        </CardTitle>
        <CardDescription>
          These agreements are required by your facility for services like
          daycare and boarding. You can review what you&apos;ve signed at any
          time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && !hasPending ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <AlertCircle className="text-muted-foreground mb-2 size-10" />
            <p className="font-semibold">No agreements on file yet</p>
            <p className="text-muted-foreground text-sm">
              Your facility may ask you to sign agreements or waivers before
              your next booking.
            </p>
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
                        const tagKey = tag.toLowerCase() as keyof typeof SERVICE_BADGE;
                        const className = SERVICE_BADGE[tagKey];
                        return (
                          <span
                            key={tag}
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                              className,
                            )}
                          >
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-muted-foreground text-xs">
                    Signed: {formatDateTime(item.signedAt)}
                  </p>
                  {item.agreedToTerms && item.agreedToTerms.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      Terms agreed: {item.agreedToTerms.join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <Badge variant="outline" className="gap-1 text-xs">
                    <CheckCircle className="size-3 text-green-500" />
                    {item.source === "digital"
                      ? "Signed Online"
                      : item.signatureType === "digital"
                        ? "Signed Online"
                        : "On File"}
                  </Badge>
                  {item.fileUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDownload(item.fileUrl, item.name)}
                    >
                      <Download className="mr-1 size-4" />
                      Download
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

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
