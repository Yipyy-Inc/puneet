"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, FileCheck2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agreementQueries } from "@/lib/api/agreements";
import { openSignedDocument } from "@/lib/agreements/signature";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Read-only, locked list of agreements a facility signed through the platform
 * Agreements & Waivers flow (Task 5/6). Rendered inside the Super Admin
 * Agreements tab. Hidden when the facility has no signed platform agreements.
 */
export function SignedYipyyAgreements({ facilityId }: { facilityId: number }) {
  const { data = [] } = useQuery(agreementQueries.sentForFacility(facilityId));

  if (data.length === 0) return null;

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <FileCheck2 className="size-5" />
          Signed via Agreements &amp; Waivers
        </CardTitle>
        <p className="text-muted-foreground mt-1 text-sm">
          E-signed documents sent from the platform. Locked and read-only —
          download the signed copy with its signature certificate.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-4"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                <FileCheck2 className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {doc.templateName}{" "}
                  <span className="text-muted-foreground">
                    v{doc.templateVersion}
                  </span>
                </p>
                <p className="text-muted-foreground text-xs">
                  Signed {formatDate(doc.signedAt)} by{" "}
                  {doc.audit?.signerEmail ?? doc.ownerEmail}
                </p>
              </div>
              <Badge variant="outline">{doc.documentType}</Badge>
              <Badge className="gap-1 bg-emerald-600 text-[10px]">
                <Lock className="size-2.5" />
                Locked
              </Badge>
              <Button
                variant="outline"
                size="sm"
                disabled={!doc.signedDocumentHtml}
                onClick={() =>
                  doc.signedDocumentHtml &&
                  openSignedDocument(doc.signedDocumentHtml)
                }
              >
                <Download className="mr-2 size-4" />
                Download PDF
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
