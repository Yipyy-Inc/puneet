"use client";

import { useMemo, useState } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { clientDocuments } from "@/data/documents";
import { getFormsByFacility } from "@/data/forms";
import { digitalWaivers, waiverSignatures } from "@/data/additional-features";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  ShieldCheck,
  FileSignature,
  Search,
  Download,
  Dog,
  AlertCircle,
  ClipboardList,
  ExternalLink,
  Pen,
  CheckCircle,
} from "lucide-react";
import { AgreementSigningDialog } from "@/components/shared/AgreementSigningDialog";
import type { SignatureResult } from "@/components/shared/SignaturePad";
import { toast } from "sonner";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export default function CustomerDocumentsPage() {
  const { selectedFacility } = useCustomerFacility();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "agreements" | "documents" | "forms"
  >("agreements");
  const [signingWaiver, setSigningWaiver] = useState<
    (typeof digitalWaivers)[number] | null
  >(null);
  const [signedWaiverIds, setSignedWaiverIds] = useState<Set<string>>(
    () => new Set(waiverSignatures.map((s) => s.waiverId)),
  );

  const customerDocs = useMemo(() => {
    let filtered = clientDocuments.filter(
      (d) => d.clientId === MOCK_CUSTOMER_ID,
    );
    if (selectedFacility) {
      filtered = filtered.filter((d) => d.facilityId === selectedFacility.id);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q) ||
          d.notes?.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [selectedFacility, searchQuery]);

  const agreementDocs = useMemo(
    () =>
      customerDocs.filter((d) => d.type === "agreement" || d.type === "waiver"),
    [customerDocs],
  );
  const otherDocs = useMemo(
    () =>
      customerDocs.filter((d) => d.type !== "agreement" && d.type !== "waiver"),
    [customerDocs],
  );

  // Pending waivers: active waivers that require signature and haven't been signed
  const pendingWaivers = useMemo(
    () =>
      digitalWaivers.filter(
        (w) => w.isActive && w.requiresSignature && !signedWaiverIds.has(w.id),
      ),
    [signedWaiverIds],
  );

  const formatDateTime = (iso: string) => {
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
  };

  const handleDownload = (url?: string, name?: string) => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = name || "document.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSign = (_result: SignatureResult) => {
    if (!signingWaiver) return;
    setSignedWaiverIds((prev) => new Set([...prev, signingWaiver.id]));
    setSigningWaiver(null);
    toast.success("Agreement signed successfully");
  };

  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Documents & Agreements</h1>
            <p className="text-muted-foreground mt-1">
              View and manage your signed agreements, waivers, and uploaded
              documents.
            </p>
          </div>
        </div>

        {/* Search + Tabs */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="relative w-full md:max-w-sm">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search documents..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as typeof activeTab)}
          >
            <TabsList>
              <TabsTrigger value="agreements">
                Agreements & Waivers
                {pendingWaivers.length > 0 && (
                  <Badge className="ml-1.5 size-5 justify-center rounded-full bg-red-500 p-0 text-[10px] text-white">
                    {pendingWaivers.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="documents">Documents Vault</TabsTrigger>
              <TabsTrigger value="forms">Forms</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as typeof activeTab)}
          className="space-y-4"
        >
          {/* Agreements & Waivers */}
          <TabsContent value="agreements" className="space-y-4">
            {/* Pending waivers requiring signature */}
            {pendingWaivers.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Pen className="size-4 text-amber-600" />
                    Pending Signatures
                  </CardTitle>
                  <CardDescription>
                    These agreements require your signature before you can book
                    services.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pendingWaivers.map((waiver) => (
                    <div
                      key={waiver.id}
                      className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-4"
                    >
                      <div className="space-y-0.5">
                        <p className="flex items-center gap-2 font-medium">
                          <FileSignature className="size-4 text-amber-600" />
                          {waiver.name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          <Badge
                            variant="outline"
                            className="mr-1.5 text-[10px] capitalize"
                          >
                            {waiver.type}
                          </Badge>
                          v{waiver.version}
                          {waiver.expiryDays &&
                            ` · Valid for ${waiver.expiryDays} days`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setSigningWaiver(waiver)}
                      >
                        <Pen className="mr-1.5 size-3.5" />
                        Sign Now
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Signed agreements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-5" />
                  Agreements & Waivers
                </CardTitle>
                <CardDescription>
                  These agreements are required by your facility for services
                  like daycare and boarding. You can review what you&apos;ve
                  signed at any time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {agreementDocs.length === 0 && pendingWaivers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <AlertCircle className="text-muted-foreground mb-2 size-10" />
                    <p className="font-semibold">No agreements on file yet</p>
                    <p className="text-muted-foreground text-sm">
                      Your facility may ask you to sign agreements or waivers
                      before your next booking.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agreementDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-background/60 flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="space-y-0.5">
                          <p className="flex items-center gap-2 font-medium">
                            <FileSignature className="text-primary size-4" />
                            {doc.name}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Signed:{" "}
                            {doc.signedAt
                              ? formatDateTime(doc.signedAt)
                              : formatDateTime(doc.uploadedAt)}
                          </p>
                          {doc.agreedToTerms && (
                            <p className="text-muted-foreground text-xs">
                              Terms agreed: {doc.agreedToTerms.join(" · ")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="gap-1 text-xs">
                            <CheckCircle className="size-3 text-green-500" />
                            {doc.signatureType === "digital"
                              ? "Signed Online"
                              : "On File"}
                          </Badge>
                          {doc.fileUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleDownload(doc.fileUrl, doc.name)
                              }
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

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="text-muted-foreground py-4 text-sm">
                Facilities can require certain agreements to be signed before
                new bookings are approved. If you&apos;re blocked from booking,
                check here to see if any agreements are missing or contact the
                facility for help.
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forms */}
          <TabsContent value="forms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="size-5" />
                  Available Forms
                </CardTitle>
                <CardDescription>
                  Fill out required and optional forms for your facility. Your
                  progress is saved automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  // Try selected facility first, fall back to facility 11 (demo forms)
                  const primaryId = selectedFacility?.id ?? 1;
                  const allForms = [
                    ...getFormsByFacility(primaryId),
                    ...(primaryId !== 11 ? getFormsByFacility(11) : []),
                  ];
                  const forms = allForms.filter(
                    (f) =>
                      f.status === "published" &&
                      f.audience !== "staff" &&
                      (f.type === "intake" ||
                        f.type === "owner" ||
                        f.type === "customer"),
                  );
                  if (forms.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <AlertCircle className="text-muted-foreground mb-2 size-10" />
                        <p className="font-semibold">No forms available</p>
                        <p className="text-muted-foreground text-sm">
                          Your facility hasn&apos;t published any forms yet.
                          Check back later.
                        </p>
                      </div>
                    );
                  }
                  return forms.map((form) => (
                    <div
                      key={form.id}
                      className="hover:bg-muted/40 flex items-center justify-between rounded-lg border p-4 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <p className="flex items-center gap-2 font-medium">
                          <ClipboardList className="text-primary size-4" />
                          {form.name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {form.questions.length} question
                          {form.questions.length !== 1 ? "s" : ""}
                          {form.type && (
                            <>
                              {" "}
                              · <span className="capitalize">{form.type}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <Button size="sm" asChild>
                        <Link href={`/forms/${form.slug}`}>
                          <ExternalLink className="mr-1 size-4" />
                          Fill out
                        </Link>
                      </Button>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Vault */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-5" />
                  Documents Vault
                </CardTitle>
                <CardDescription>
                  All documents your facility has shared with you: vaccine
                  records, medical notes, and more.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {otherDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <AlertCircle className="text-muted-foreground mb-2 size-10" />
                    <p className="font-semibold">No documents yet</p>
                    <p className="text-muted-foreground text-sm">
                      When your facility uploads vaccine records, medical notes,
                      or other files, they will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {otherDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="hover:bg-muted/40 flex items-center justify-between rounded-lg border p-4 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <p className="flex items-center gap-2 font-medium">
                            <FileText className="text-muted-foreground size-4" />
                            {doc.name}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Type: {doc.type}
                            {doc.petId && (
                              <>
                                {" "}
                                · <Dog className="mr-1 inline-block size-3" />
                                Pet ID #{doc.petId}
                              </>
                            )}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Uploaded: {formatDateTime(doc.uploadedAt)}
                            {doc.expiryDate &&
                              ` · Expires: ${formatDateTime(doc.expiryDate)}`}
                          </p>
                          {doc.notes && (
                            <p className="text-muted-foreground text-xs">
                              {doc.notes}
                            </p>
                          )}
                        </div>
                        {doc.fileUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDownload(doc.fileUrl, doc.name)
                            }
                          >
                            <Download className="mr-1 size-4" />
                            Download
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Signing Dialog */}
      {signingWaiver && (
        <AgreementSigningDialog
          open={!!signingWaiver}
          onOpenChange={() => setSigningWaiver(null)}
          title={signingWaiver.name}
          agreementContent={signingWaiver.content}
          requiresWitness={signingWaiver.requiresWitness}
          onSigned={handleSign}
          serviceName={signingWaiver.type}
        />
      )}
    </div>
  );
}
