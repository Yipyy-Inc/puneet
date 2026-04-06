"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Download,
  AlertCircle,
  Pen,
  Fingerprint,
} from "lucide-react";
import {
  digitalWaivers,
  waiverSignatures,
  type DigitalWaiver,
  type WaiverSignature,
} from "@/data/additional-features";
import { AgreementSigningDialog } from "@/components/shared/AgreementSigningDialog";
import type { SignatureResult } from "@/components/shared/SignaturePad";
import { toast } from "sonner";

export function DigitalWaiversManager() {
  const [waivers] = useState(digitalWaivers);
  const [signatures, setSignatures] = useState(waiverSignatures);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs
  const [previewWaiver, setPreviewWaiver] = useState<DigitalWaiver | null>(
    null,
  );
  const [signWaiver, setSignWaiver] = useState<DigitalWaiver | null>(null);
  const [viewSignature, setViewSignature] = useState<WaiverSignature | null>(
    null,
  );

  const getTypeBadge = (type: string) => {
    const styles = {
      boarding: "bg-blue-500/10 text-blue-700",
      daycare: "bg-green-500/10 text-green-700",
      grooming: "bg-purple-500/10 text-purple-700",
      training: "bg-orange-500/10 text-orange-700",
      general: "bg-gray-500/10 text-gray-700",
    };
    return styles[type as keyof typeof styles] || "";
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      valid: "bg-green-500/10 text-green-700",
      expired: "bg-red-500/10 text-red-700",
      revoked: "bg-gray-500/10 text-gray-700",
    };
    return styles[status as keyof typeof styles] || "";
  };

  const filteredSignatures = signatures.filter(
    (sig) =>
      sig.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sig.waiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sig.petName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const stats = {
    totalWaivers: waivers.length,
    activeWaivers: waivers.filter((w) => w.isActive).length,
    totalSignatures: signatures.length,
    validSignatures: signatures.filter((s) => s.status === "valid").length,
    expiredSignatures: signatures.filter((s) => s.status === "expired").length,
  };

  const handleCollectSignature = (result: SignatureResult) => {
    if (!signWaiver) return;
    const newSig: WaiverSignature = {
      id: `sig-${Date.now()}`,
      waiverId: signWaiver.id,
      waiverName: signWaiver.name,
      clientId: "walk-in",
      clientName: result.witnessName || "Walk-in Client",
      signatureData: result.signatureData,
      signedAt: result.signedAt,
      ipAddress: result.ipAddress,
      witnessName: result.witnessName,
      status: "valid",
      expiresAt: signWaiver.expiryDays
        ? new Date(Date.now() + signWaiver.expiryDays * 86400000).toISOString()
        : undefined,
    };
    setSignatures((prev) => [newSig, ...prev]);
    setSignWaiver(null);
    toast.success(`Signature collected for "${signWaiver.name}"`);
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Total Waivers
                </p>
                <p className="text-2xl font-bold">{stats.totalWaivers}</p>
              </div>
              <FileText className="text-muted-foreground size-8" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Active
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.activeWaivers}
                </p>
              </div>
              <CheckCircle className="size-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Total Signatures
                </p>
                <p className="text-2xl font-bold">{stats.totalSignatures}</p>
              </div>
              <Fingerprint className="text-muted-foreground size-8" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Valid
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.validSignatures}
                </p>
              </div>
              <CheckCircle className="size-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Expired
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.expiredSignatures}
                </p>
              </div>
              <AlertCircle className="size-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="templates">Waiver Templates</TabsTrigger>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
        </TabsList>

        {/* Waiver Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Waiver Templates</CardTitle>
                <Button>
                  <Plus className="mr-2 size-4" />
                  Create Waiver
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requires Signature</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waivers.map((waiver) => (
                    <TableRow key={waiver.id}>
                      <TableCell className="font-medium">
                        {waiver.name}
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeBadge(waiver.type)}>
                          {waiver.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">v{waiver.version}</Badge>
                      </TableCell>
                      <TableCell>
                        {waiver.isActive ? (
                          <Badge className="bg-green-500/10 text-green-700">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-500/10 text-gray-700">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {waiver.requiresSignature ? (
                          <CheckCircle className="size-4 text-green-600" />
                        ) : (
                          <XCircle className="size-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        {waiver.expiryDays
                          ? `${waiver.expiryDays} days`
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(waiver.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Preview"
                            onClick={() => setPreviewWaiver(waiver)}
                          >
                            <Eye className="size-3" />
                          </Button>
                          {waiver.requiresSignature && waiver.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Collect Signature"
                              onClick={() => setSignWaiver(waiver)}
                            >
                              <Pen className="size-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" title="Edit">
                            <Edit className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signatures Tab */}
        <TabsContent value="signatures" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>E-Signatures</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
                    <Input
                      placeholder="Search client, pet, waiver..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64 pl-8"
                    />
                  </div>
                  <Button variant="outline">
                    <Download className="mr-2 size-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waiver</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Pet</TableHead>
                    <TableHead>Signed Date</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSignatures.map((signature) => (
                    <TableRow key={signature.id}>
                      <TableCell className="font-medium">
                        {signature.waiverName}
                      </TableCell>
                      <TableCell>{signature.clientName}</TableCell>
                      <TableCell>{signature.petName || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(signature.signedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {signature.ipAddress}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(signature.status)}>
                          {signature.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {signature.expiresAt
                          ? new Date(signature.expiresAt).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View Signature"
                            onClick={() => setViewSignature(signature)}
                          >
                            <Eye className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Download"
                            onClick={() => {
                              const link = document.createElement("a");
                              link.download = `${signature.waiverName}-${signature.clientName}.png`;
                              link.href = signature.signatureData;
                              link.click();
                            }}
                          >
                            <Download className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Waiver Dialog */}
      <Dialog
        open={!!previewWaiver}
        onOpenChange={() => setPreviewWaiver(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              {previewWaiver?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className={getTypeBadge(previewWaiver?.type ?? "general")}>
              {previewWaiver?.type}
            </Badge>
            <Badge variant="outline">v{previewWaiver?.version}</Badge>
            {previewWaiver?.requiresSignature && (
              <Badge className="bg-blue-500/10 text-blue-700">
                <Pen className="mr-1 size-3" />
                Signature Required
              </Badge>
            )}
          </div>
          <ScrollArea className="max-h-[400px] rounded-lg border bg-slate-50 p-5">
            <div className="prose prose-sm max-w-none text-sm/relaxed text-slate-600">
              {previewWaiver?.content.split("\n").map((line, i) => (
                <p key={i} className={line.trim() === "" ? "h-2" : ""}>
                  {line}
                </p>
              ))}
            </div>
          </ScrollArea>
          <div className="flex justify-between">
            <div className="text-muted-foreground text-xs">
              {previewWaiver?.expiryDays
                ? `Expires ${previewWaiver.expiryDays} days after signing`
                : "No expiration"}
            </div>
            {previewWaiver?.requiresSignature && previewWaiver.isActive && (
              <Button
                onClick={() => {
                  setPreviewWaiver(null);
                  setSignWaiver(previewWaiver);
                }}
              >
                <Pen className="mr-2 size-4" />
                Collect Signature
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Collect Signature Dialog */}
      {signWaiver && (
        <AgreementSigningDialog
          open={!!signWaiver}
          onOpenChange={() => setSignWaiver(null)}
          title={signWaiver.name}
          agreementContent={signWaiver.content}
          requiresWitness={signWaiver.requiresWitness}
          onSigned={handleCollectSignature}
          serviceName={signWaiver.type}
        />
      )}

      {/* View Signature Dialog */}
      <Dialog
        open={!!viewSignature}
        onOpenChange={() => setViewSignature(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="size-5" />
              Signature Details
            </DialogTitle>
          </DialogHeader>

          {viewSignature && (
            <div className="space-y-4">
              {/* Signature image */}
              <div className="rounded-xl border-2 border-slate-200 bg-white p-3">
                <img
                  src={viewSignature.signatureData}
                  alt="Signature"
                  className="h-28 w-full object-contain"
                />
              </div>

              {/* Metadata */}
              <div className="space-y-2 rounded-lg bg-slate-50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Waiver</span>
                  <span className="font-medium">
                    {viewSignature.waiverName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">
                    {viewSignature.clientName}
                  </span>
                </div>
                {viewSignature.petName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pet</span>
                    <span className="font-medium">{viewSignature.petName}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Signed</span>
                  <span className="font-medium">
                    {new Date(viewSignature.signedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IP Address</span>
                  <span className="font-mono text-xs">
                    {viewSignature.ipAddress}
                  </span>
                </div>
                {viewSignature.witnessName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Witness</span>
                    <span className="font-medium">
                      {viewSignature.witnessName}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className={getStatusBadge(viewSignature.status)}>
                    {viewSignature.status}
                  </Badge>
                </div>
                {viewSignature.expiresAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expires</span>
                    <span className="font-medium">
                      {new Date(viewSignature.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-[10px] leading-relaxed text-slate-400">
                This electronic signature was captured with full digital
                fingerprint including IP address, device ID, user agent, and
                timezone for legal verification purposes.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
