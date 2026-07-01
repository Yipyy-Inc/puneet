"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Send,
  Download,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useFacilityAgreements,
  addAgreement,
  requestSignature,
} from "@/lib/agreements-store";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import type {
  AgreementType,
  FacilityAgreement,
} from "@/types/facility-agreement";

const AGREEMENT_TYPES: AgreementType[] = [
  "Agreement",
  "Waiver",
  "Amendment",
  "Addendum",
];

const TYPE_BADGE: Record<AgreementType, string> = {
  Agreement: "border-violet-200 text-violet-700 dark:text-violet-300",
  Waiver: "border-amber-200 text-amber-700 dark:text-amber-300",
  Amendment: "border-sky-200 text-sky-700 dark:text-sky-300",
  Addendum: "border-emerald-200 text-emerald-700 dark:text-emerald-300",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Honest download: a real, minimal single-page PDF summarising the document.
function downloadAgreement(doc: FacilityAgreement, facilityName: string): void {
  downloadInvoicePdf(
    `${doc.name} v${doc.version}`.replace(/[^\w.-]+/g, "_"),
    doc.name,
    [
      `Facility: ${facilityName}`,
      `Type: ${doc.type}`,
      `Version: ${doc.version}`,
      `Status: ${doc.status === "signed" ? "Signed" : "Awaiting signature"}`,
      `Date signed: ${formatDate(doc.dateSigned)}`,
      `Signed by: ${doc.signedBy || "—"}`,
    ],
  );
}

interface AgreementsTabProps {
  facilityId: number;
  facilityName: string;
  ownerName: string;
  contactEmail: string;
  /** Super Admin view unlocks upload / request-signature. Default true. */
  canManage?: boolean;
}

export function AgreementsTab({
  facilityId,
  facilityName,
  ownerName,
  contactEmail,
  canManage = true,
}: AgreementsTabProps) {
  const agreements = useFacilityAgreements(facilityId);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  const columns: ColumnDef<FacilityAgreement>[] = [
    {
      key: "name",
      label: "Document Name",
      render: (doc) => (
        <div className="flex items-center gap-2">
          <FileText className="text-muted-foreground size-4 shrink-0" />
          <span>{doc.name}</span>
          {doc.status === "pending" && (
            <Badge
              variant="outline"
              className="border-amber-200 px-1.5 py-0 text-[10px] text-amber-700 dark:text-amber-300"
            >
              <Clock className="mr-1 size-2.5" />
              Pending signature
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (doc) => (
        <Badge
          variant="outline"
          className={`px-1.5 py-0 text-[11px] font-normal ${TYPE_BADGE[doc.type]}`}
        >
          {doc.type}
        </Badge>
      ),
    },
    {
      key: "dateSigned",
      label: "Date Signed",
      sortValue: (doc) => doc.dateSigned ?? "",
      render: (doc) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(doc.dateSigned)}
        </span>
      ),
    },
    {
      key: "signedBy",
      label: "Signed By",
      render: (doc) => <span className="text-sm">{doc.signedBy || "—"}</span>,
    },
    {
      key: "version",
      label: "Version",
      render: (doc) => (
        <span className="text-muted-foreground text-sm">v{doc.version}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-card border-0">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="size-5" />
              Agreements &amp; Legal Documents
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Platform agreements, amendments, addenda and waivers between{" "}
              {facilityName} and Yipyy. Managed by Yipyy — the facility can view
              and download only.
            </p>
          </div>
          {canManage && (
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRequestOpen(true)}
              >
                <Send className="mr-2 size-4" />
                Request Signature
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="mr-2 size-4" />
                Upload Document
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <DataTable
            data={[...agreements]}
            columns={columns}
            searchKeys={["name", "type"]}
            searchPlaceholder="Search by document name or type…"
            itemsPerPage={25}
            actions={(doc) => (
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadAgreement(doc, facilityName)}
              >
                <Download className="mr-2 size-4" />
                Download PDF
              </Button>
            )}
            emptyState={{
              icon: ShieldCheck,
              title: "No agreements on file",
              description:
                "Upload an executed document or request a signature to get started.",
            }}
          />
        </CardContent>
      </Card>

      {canManage && (
        <>
          <UploadDialog
            open={uploadOpen}
            onOpenChange={setUploadOpen}
            ownerName={ownerName}
            onSubmit={(values) => {
              addAgreement(facilityId, values);
              toast.success(`"${values.name}" filed to the repository.`);
              setUploadOpen(false);
            }}
          />
          <RequestSignatureDialog
            open={requestOpen}
            onOpenChange={setRequestOpen}
            contactEmail={contactEmail}
            onSubmit={(values) => {
              requestSignature(facilityId, values);
              toast.success(`Signature request sent to ${contactEmail}.`);
              setRequestOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}

interface AgreementFormValues {
  name: string;
  type: AgreementType;
  version: string;
}

function useAgreementForm() {
  const [name, setName] = useState("");
  const [type, setType] = useState<AgreementType>("Agreement");
  const [version, setVersion] = useState("1.0");
  const reset = () => {
    setName("");
    setType("Agreement");
    setVersion("1.0");
  };
  return { name, setName, type, setType, version, setVersion, reset };
}

function AgreementFields({
  form,
}: {
  form: ReturnType<typeof useAgreementForm>;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="agreement-name">Document name</Label>
        <Input
          id="agreement-name"
          placeholder="e.g. Grooming Service Addendum"
          value={form.name}
          onChange={(e) => form.setName(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="agreement-type">Type</Label>
          <Select
            value={form.type}
            onValueChange={(v) => form.setType(v as AgreementType)}
          >
            <SelectTrigger id="agreement-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGREEMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agreement-version">Version</Label>
          <Input
            id="agreement-version"
            placeholder="1.0"
            value={form.version}
            onChange={(e) => form.setVersion(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  ownerName,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerName: string;
  onSubmit: (values: AgreementFormValues) => void;
}) {
  const form = useAgreementForm();
  const submit = () => {
    if (!form.name.trim()) return;
    onSubmit({ name: form.name, type: form.type, version: form.version });
    form.reset();
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) form.reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>
            File an executed agreement into this facility&apos;s repository. It
            is recorded as signed today by {ownerName}.
          </DialogDescription>
        </DialogHeader>
        <AgreementFields form={form} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!form.name.trim()}
            onClick={submit}
          >
            <Upload className="mr-2 size-4" />
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestSignatureDialog({
  open,
  onOpenChange,
  contactEmail,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactEmail: string;
  onSubmit: (values: AgreementFormValues) => void;
}) {
  const form = useAgreementForm();
  const submit = () => {
    if (!form.name.trim()) return;
    onSubmit({ name: form.name, type: form.type, version: form.version });
    form.reset();
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) form.reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request signature</DialogTitle>
          <DialogDescription>
            Send a document to{" "}
            {contactEmail || "the facility's primary contact"} for e-signature.
            It appears here as “Pending signature” until countersigned.
          </DialogDescription>
        </DialogHeader>
        <AgreementFields form={form} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!form.name.trim()}
            onClick={submit}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Send className="mr-2 size-4" />
            Send for signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
