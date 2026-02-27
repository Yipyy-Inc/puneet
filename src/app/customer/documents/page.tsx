"use client";

import { useMemo, useState } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { clientDocuments } from "@/data/documents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export default function CustomerDocumentsPage() {
  const { selectedFacility } = useCustomerFacility();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"agreements" | "documents">("agreements");

  const customerDocs = useMemo(() => {
    let filtered = clientDocuments.filter((d) => d.clientId === MOCK_CUSTOMER_ID);
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
    () => customerDocs.filter((d) => d.type === "agreement" || d.type === "waiver"),
    [customerDocs],
  );
  const otherDocs = useMemo(
    () => customerDocs.filter((d) => d.type !== "agreement" && d.type !== "waiver"),
    [customerDocs],
  );

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Documents & Agreements</h1>
            <p className="text-muted-foreground mt-1">
              View and manage your signed agreements, waivers, and uploaded documents.
            </p>
          </div>
        </div>

        {/* Search + Tabs */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="relative md:max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
              <TabsTrigger value="agreements">Agreements & Waivers</TabsTrigger>
              <TabsTrigger value="documents">Documents Vault</TabsTrigger>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Agreements & Waivers
                </CardTitle>
                <CardDescription>
                  These agreements are required by your facility for services like daycare and
                  boarding. You can review what you’ve signed at any time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {agreementDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-10">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="font-semibold">No agreements on file yet</p>
                    <p className="text-sm text-muted-foreground">
                      Your facility may ask you to sign agreements or waivers before your next
                      booking.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agreementDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-background/60"
                      >
                        <div className="space-y-0.5">
                          <p className="font-medium flex items-center gap-2">
                            <FileSignature className="h-4 w-4 text-primary" />
                            {doc.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Signed:{" "}
                            {doc.signedAt
                              ? formatDateTime(doc.signedAt)
                              : formatDateTime(doc.uploadedAt)}
                          </p>
                          {doc.agreedToTerms && (
                            <p className="text-xs text-muted-foreground">
                              Terms agreed: {doc.agreedToTerms.join(" · ")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {doc.signatureType === "digital" ? "Signed Online" : "On File"}
                          </Badge>
                          {doc.fileUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(doc.fileUrl, doc.name)}
                            >
                              <Download className="h-4 w-4 mr-1" />
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
              <CardContent className="py-4 text-sm text-muted-foreground">
                Facilities can require certain agreements to be signed before new bookings are
                approved. If you’re blocked from booking, check here to see if any agreements are
                missing or contact the facility for help.
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Vault */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents Vault
                </CardTitle>
                <CardDescription>
                  All documents your facility has shared with you: vaccine records, medical notes,
                  and more.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {otherDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-10">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="font-semibold">No documents yet</p>
                    <p className="text-sm text-muted-foreground">
                      When your facility uploads vaccine records, medical notes, or other files,
                      they will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {otherDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/40 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <p className="font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {doc.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Type: {doc.type}
                            {doc.petId && (
                              <>
                                {" "}
                                · <Dog className="inline-block h-3 w-3 mr-1" />
                                Pet ID #{doc.petId}
                              </>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded: {formatDateTime(doc.uploadedAt)}
                            {doc.expiryDate && ` · Expires: ${formatDateTime(doc.expiryDate)}`}
                          </p>
                          {doc.notes && (
                            <p className="text-xs text-muted-foreground">{doc.notes}</p>
                          )}
                        </div>
                        {doc.fileUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(doc.fileUrl, doc.name)}
                          >
                            <Download className="h-4 w-4 mr-1" />
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
    </div>
  );
}

