"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileSignature,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  agreementQueries,
  recordSignature,
  type CapturedSignature,
  type SentAgreement,
} from "@/lib/api/agreements";
import {
  buildAgreementDocumentWithValues,
  substituteMergeFields,
} from "@/lib/agreements/merge-preview";
import {
  MOCK_SIGNING_IP,
  buildSignedDocument,
  extractSignatureBlocks,
  friendlyDevice,
  injectSignatures,
  openSignedDocument,
  sha256Hex,
} from "@/lib/agreements/signature";
import { SignaturePad, type CapturedSignatureValue } from "./SignaturePad";

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/40 min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-5 py-4">
          <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
            <ShieldCheck className="size-4" />
          </span>
          <span className="font-semibold">Yipyy</span>
          <span className="text-muted-foreground text-sm">
            · Secure signing
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-6">{children}</main>
    </div>
  );
}

function StatusCard({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="mx-auto max-w-md rounded-xl border bg-white p-8 text-center">
      <div className="text-muted-foreground mx-auto mb-3 flex size-12 items-center justify-center">
        {icon}
      </div>
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-muted-foreground mt-1 text-sm">{message}</p>
    </div>
  );
}

export function SigningPortal({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(agreementQueries.sentByToken(token));

  const [signatures, setSignatures] = useState<
    Record<string, CapturedSignatureValue>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState<SentAgreement | null>(null);

  const record = data?.record ?? null;

  const blocks = useMemo(() => {
    if (!record) return [];
    const found = extractSignatureBlocks(record.content);
    return found.length > 0
      ? found
      : [{ id: "owner-signature", role: "Facility Owner" }];
  }, [record]);

  const docHtml = useMemo(
    () =>
      record
        ? buildAgreementDocumentWithValues(
            record.content,
            record.templateName,
            record.mergeValues,
          )
        : "",
    [record],
  );

  const allSigned =
    blocks.length > 0 && blocks.every((b) => signatures[b.id]?.image);

  const setBlockSignature = (
    blockId: string,
    value: CapturedSignatureValue | null,
  ) => {
    setSignatures((prev) => {
      const next = { ...prev };
      if (value) next[blockId] = value;
      else delete next[blockId];
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!record || !allSigned) return;
    setSubmitting(true);
    try {
      const filled = substituteMergeFields(record.content, record.mergeValues);
      const dateLabel = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const signedBody = injectSignatures(
        filled,
        mapForInject(signatures),
        dateLabel,
      );
      const documentHash = await sha256Hex(filled);
      const audit = {
        signerEmail: record.ownerEmail,
        ipAddress: MOCK_SIGNING_IP,
        userAgent: navigator.userAgent,
        device: friendlyDevice(navigator.userAgent),
        signedAtUtc: new Date().toISOString(),
        documentHash,
      };
      const captured: CapturedSignature[] = blocks
        .filter((b) => signatures[b.id])
        .map((b) => ({
          blockId: b.id,
          signerRole: b.role,
          method: signatures[b.id].method,
          image: signatures[b.id].image,
          typedName: signatures[b.id].typedName,
        }));
      const signedDocumentHtml = buildSignedDocument(
        signedBody,
        record,
        audit,
        captured.length,
      );

      const updated = recordSignature({
        token,
        signatures: captured,
        audit,
        signedDocumentHtml,
      });
      if (!updated) {
        toast.error("This signing link is no longer valid.");
        return;
      }

      // Mock dispatch of the signed copy to both parties.
      queryClient.invalidateQueries({
        queryKey: agreementQueries.sentByToken(token).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: agreementQueries.sent().queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: agreementQueries.sentForFacility(updated.facilityId).queryKey,
      });
      setSigned(updated);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Render ----

  if (isPending) {
    return (
      <PortalShell>
        <Skeleton className="mb-4 h-24 w-full" />
        <Skeleton className="h-[60vh] w-full" />
      </PortalShell>
    );
  }

  if (signed) {
    return (
      <PortalShell>
        <div className="mx-auto max-w-lg rounded-xl border bg-white p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-12 text-emerald-600" />
          <h1 className="text-xl font-semibold">
            Your agreement has been signed
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            A copy has been sent to{" "}
            <span className="font-medium">{signed.ownerEmail}</span> and to the
            Yipyy admin who sent it.
          </p>
          <div className="bg-muted/40 mt-5 rounded-lg border p-4 text-left text-xs">
            <p className="text-muted-foreground mb-2 font-medium">
              Recorded for your records
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-muted-foreground">Signed (UTC)</dt>
              <dd>{signed.audit?.signedAtUtc}</dd>
              <dt className="text-muted-foreground">Device</dt>
              <dd>{signed.audit?.device}</dd>
              <dt className="text-muted-foreground">IP address</dt>
              <dd>{signed.audit?.ipAddress}</dd>
              <dt className="text-muted-foreground">Document hash</dt>
              <dd className="truncate font-mono">
                {signed.audit?.documentHash}
              </dd>
            </dl>
          </div>
          {signed.signedDocumentHtml ? (
            <Button
              className="mt-5 gap-1.5"
              onClick={() => openSignedDocument(signed.signedDocumentHtml!)}
            >
              <Download className="size-4" />
              View / download signed copy
            </Button>
          ) : null}
        </div>
      </PortalShell>
    );
  }

  if (!record || data?.status === "not-found") {
    return (
      <PortalShell>
        <StatusCard
          icon={<AlertTriangle className="size-10 text-amber-500" />}
          title="This signing link is invalid"
          message="The link may be mistyped or the agreement was withdrawn. Contact Yipyy support for help."
        />
      </PortalShell>
    );
  }

  if (data?.status === "used") {
    return (
      <PortalShell>
        <StatusCard
          icon={<CheckCircle2 className="size-10 text-emerald-600" />}
          title="This agreement is already signed"
          message="This one-time link has already been used. A signed copy was emailed to you when it was completed."
        />
      </PortalShell>
    );
  }

  if (data?.status === "expired") {
    return (
      <PortalShell>
        <StatusCard
          icon={<Clock className="size-10 text-amber-500" />}
          title="This signing link has expired"
          message="The response deadline has passed. Contact Yipyy to request a new signing link."
        />
      </PortalShell>
    );
  }

  return (
    <PortalShell>
      <div className="mb-4 rounded-xl border bg-white p-5">
        <div className="flex items-center gap-2">
          <FileSignature className="text-primary size-5" />
          <h1 className="text-lg font-semibold">{record.templateName}</h1>
          <Badge variant="outline">{record.documentType}</Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {record.facilityName} · Please review the document, then sign below.
          {record.responseExpiresAt
            ? ` This link expires on ${new Date(
                record.responseExpiresAt,
              ).toLocaleDateString()}.`
            : ""}
        </p>
      </div>

      <div className="mb-4 overflow-hidden rounded-xl border bg-white">
        <iframe
          title={`${record.templateName} document`}
          srcDoc={docHtml}
          sandbox="allow-same-origin"
          className="h-[60vh] w-full"
        />
      </div>

      <div className="rounded-xl border bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold">Signatures</h2>
        <p className="text-muted-foreground mb-4 text-xs">
          Draw or type your signature for each block below.
        </p>
        <div className="space-y-5">
          {blocks.map((block) => (
            <div key={block.id}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium">{block.role}</span>
                {signatures[block.id]?.image ? (
                  <Badge className="bg-emerald-600 text-[10px]">Signed</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Required
                  </Badge>
                )}
              </div>
              <SignaturePad
                onChange={(value) => setBlockSignature(block.id, value)}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <p className="text-muted-foreground text-xs">
            Signing as <span className="font-medium">{record.ownerName}</span> ·{" "}
            {record.ownerEmail}
          </p>
          <Button
            onClick={handleSubmit}
            disabled={!allSigned || submitting}
            className="gap-1.5"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSignature className="size-4" />
            )}
            Sign &amp; Submit
          </Button>
        </div>
      </div>
    </PortalShell>
  );
}

function mapForInject(
  signatures: Record<string, CapturedSignatureValue>,
): Record<string, CapturedSignature> {
  const out: Record<string, CapturedSignature> = {};
  for (const [blockId, value] of Object.entries(signatures)) {
    out[blockId] = {
      blockId,
      signerRole: "",
      method: value.method,
      image: value.image,
      typedName: value.typedName,
    };
  }
  return out;
}
