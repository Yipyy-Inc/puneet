"use client";

import { useMemo, useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Download,
  AlertCircle,
  Pen,
  Fingerprint,
} from "lucide-react";
import {
  digitalWaivers,
  waiverSignatures,
  type DigitalWaiver,
  type WaiverServiceTag,
  type WaiverSignature,
} from "@/data/additional-features";
import { brandingSettings } from "@/data/global-settings";
import { AgreementSigningDialog } from "@/components/shared/AgreementSigningDialog";
import type { SignatureResult } from "@/components/shared/SignaturePad";
import { useLocationContext } from "@/hooks/use-location-context";
import { Globe } from "lucide-react";
import { toast } from "sonner";
import { WaiverEditorDialog } from "./waivers/WaiverEditorDialog";
import { WaiverContentRenderer } from "./waivers/WaiverContentRenderer";

const SERVICE_LABEL: Record<WaiverServiceTag, string> = {
  boarding: "Boarding",
  daycare: "Daycare",
  grooming: "Grooming",
  training: "Training",
  vet: "Vet",
  retail: "Retail",
  general: "General",
};

const SERVICE_BADGE: Record<WaiverServiceTag, string> = {
  boarding: "bg-blue-500/10 text-blue-700 border-blue-200",
  daycare: "bg-green-500/10 text-green-700 border-green-200",
  grooming: "bg-purple-500/10 text-purple-700 border-purple-200",
  training: "bg-orange-500/10 text-orange-700 border-orange-200",
  vet: "bg-rose-500/10 text-rose-700 border-rose-200",
  retail: "bg-amber-500/10 text-amber-700 border-amber-200",
  general: "bg-gray-500/10 text-gray-700 border-gray-200",
};

const SIG_STATUS_BADGE: Record<WaiverSignature["status"], string> = {
  valid: "bg-green-500/10 text-green-700",
  expired: "bg-red-500/10 text-red-700",
  revoked: "bg-gray-500/10 text-gray-700",
};

/** Services this facility offers — drives which tags can be assigned. */
function useFacilityServices(): WaiverServiceTag[] {
  // TODO: read from facility settings when wired to a real API.
  return ["boarding", "daycare", "grooming", "training"];
}

function getWaiverServices(w: DigitalWaiver): WaiverServiceTag[] {
  return w.services && w.services.length > 0 ? w.services : [w.type];
}

export function DigitalWaiversManager() {
  const facilityServices = useFacilityServices();
  const facilityName = brandingSettings.platformName;

  const [waivers, setWaivers] = useState<DigitalWaiver[]>(digitalWaivers);
  const [signatures, setSignatures] =
    useState<WaiverSignature[]>(waiverSignatures);
  const [searchQuery, setSearchQuery] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTarget, setEditorTarget] = useState<DigitalWaiver | undefined>(
    undefined,
  );
  const [previewWaiver, setPreviewWaiver] = useState<DigitalWaiver | null>(null);
  const [signWaiver, setSignWaiver] = useState<DigitalWaiver | null>(null);
  const [viewSignature, setViewSignature] = useState<WaiverSignature | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<DigitalWaiver | null>(null);

  const stats = useMemo(
    () => ({
      totalWaivers: waivers.length,
      activeWaivers: waivers.filter((w) => w.isActive).length,
      totalSignatures: signatures.length,
      validSignatures: signatures.filter((s) => s.status === "valid").length,
      expiredSignatures: signatures.filter((s) => s.status === "expired").length,
    }),
    [waivers, signatures],
  );

  const filteredSignatures = signatures.filter(
    (sig) =>
      sig.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sig.waiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sig.petName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCreate = () => {
    setEditorTarget(undefined);
    setEditorOpen(true);
  };

  const handleEdit = (waiver: DigitalWaiver) => {
    setEditorTarget(waiver);
    setEditorOpen(true);
  };

  const handleSaveWaiver = (next: DigitalWaiver) => {
    setWaivers((prev) => {
      const idx = prev.findIndex((w) => w.id === next.id);
      if (idx === -1) return [next, ...prev];
      const copy = prev.slice();
      copy[idx] = next;
      return copy;
    });
    toast.success(
      editorTarget ? `Waiver "${next.name}" updated` : `Waiver "${next.name}" created`,
    );
  };

  const handleDelete = (waiver: DigitalWaiver) => {
    setWaivers((prev) => prev.filter((w) => w.id !== waiver.id));
    toast.success(`Waiver "${waiver.name}" deleted`);
    setDeleteTarget(null);
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
      <SharedWaiversBanner />
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatTile
          label="Total Waivers"
          value={stats.totalWaivers}
          icon={<FileText className="text-muted-foreground size-8" />}
        />
        <StatTile
          label="Active"
          value={stats.activeWaivers}
          valueClass="text-green-600"
          icon={<CheckCircle className="size-8 text-green-500" />}
        />
        <StatTile
          label="Total Signatures"
          value={stats.totalSignatures}
          icon={<Fingerprint className="text-muted-foreground size-8" />}
        />
        <StatTile
          label="Valid"
          value={stats.validSignatures}
          valueClass="text-green-600"
          icon={<CheckCircle className="size-8 text-green-500" />}
        />
        <StatTile
          label="Expired"
          value={stats.expiredSignatures}
          valueClass="text-red-600"
          icon={<AlertCircle className="size-8 text-red-500" />}
        />
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="templates">Waiver Templates</TabsTrigger>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Waiver Templates</CardTitle>
                <Button onClick={handleCreate}>
                  <Plus className="mr-2 size-4" />
                  Create Waiver
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {waivers.length === 0 ? (
                <div className="rounded-lg border border-dashed p-10 text-center">
                  <FileText className="mx-auto mb-2 size-8 text-slate-400" />
                  <p className="text-sm font-medium">No waivers yet</p>
                  <p className="text-muted-foreground mb-4 text-xs">
                    Create your first waiver to start collecting signatures.
                  </p>
                  <Button onClick={handleCreate}>
                    <Plus className="mr-2 size-4" />
                    Create Waiver
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Signature</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waivers.map((waiver) => {
                      const tags = getWaiverServices(waiver);
                      return (
                        <TableRow key={waiver.id}>
                          <TableCell className="font-medium">
                            {waiver.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {tags.map((s) => (
                                <Badge
                                  key={s}
                                  variant="outline"
                                  className={SERVICE_BADGE[s]}
                                >
                                  {SERVICE_LABEL[s]}
                                </Badge>
                              ))}
                            </div>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Edit"
                                onClick={() => handleEdit(waiver)}
                              >
                                <Edit className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Delete"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => setDeleteTarget(waiver)}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
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
                        <Badge className={SIG_STATUS_BADGE[signature.status]}>
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

      {/* Editor */}
      <WaiverEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        waiver={editorTarget}
        availableServices={facilityServices}
        facilityName={facilityName}
        onSave={handleSaveWaiver}
      />

      {/* Preview */}
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
          <div className="flex flex-wrap items-center gap-2">
            {previewWaiver &&
              getWaiverServices(previewWaiver).map((s) => (
                <Badge
                  key={s}
                  variant="outline"
                  className={SERVICE_BADGE[s]}
                >
                  {SERVICE_LABEL[s]}
                </Badge>
              ))}
            <Badge variant="outline">v{previewWaiver?.version}</Badge>
            {previewWaiver?.requiresSignature && (
              <Badge className="bg-blue-500/10 text-blue-700">
                <Pen className="mr-1 size-3" />
                Signature Required
              </Badge>
            )}
          </div>
          <ScrollArea className="max-h-[400px] rounded-lg border bg-white p-5">
            {previewWaiver && (
              <WaiverContentRenderer
                blocks={previewWaiver.blocks}
                content={previewWaiver.content}
                context={{
                  customerName: "Sample Customer",
                  petName: "Buddy",
                  facilityName,
                  services: getWaiverServices(previewWaiver),
                }}
              />
            )}
          </ScrollArea>
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground text-xs">
              {previewWaiver?.expiryDays
                ? `Expires ${previewWaiver.expiryDays} days after signing`
                : "No expiration"}
            </div>
            {previewWaiver?.requiresSignature && previewWaiver.isActive && (
              <Button
                onClick={() => {
                  setSignWaiver(previewWaiver);
                  setPreviewWaiver(null);
                }}
              >
                <Pen className="mr-2 size-4" />
                Collect Signature
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sign */}
      {signWaiver && (
        <AgreementSigningDialog
          open={!!signWaiver}
          onOpenChange={() => setSignWaiver(null)}
          title={signWaiver.name}
          agreementContent={signWaiver.content}
          agreementBlocks={signWaiver.blocks}
          mergeContext={{
            facilityName,
            services: getWaiverServices(signWaiver),
          }}
          requiresWitness={signWaiver.requiresWitness}
          onSigned={handleCollectSignature}
          serviceName={getWaiverServices(signWaiver)
            .map((s) => SERVICE_LABEL[s])
            .join(", ")}
        />
      )}

      {/* View Signature */}
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
              <div className="rounded-xl border-2 border-slate-200 bg-white p-3">
                <img
                  src={viewSignature.signatureData}
                  alt="Signature"
                  className="h-28 w-full object-contain"
                />
              </div>
              <div className="space-y-2 rounded-lg bg-slate-50 p-4">
                <SigRow label="Waiver" value={viewSignature.waiverName} />
                <SigRow label="Client" value={viewSignature.clientName} />
                {viewSignature.petName && (
                  <SigRow label="Pet" value={viewSignature.petName} />
                )}
                <SigRow
                  label="Signed"
                  value={new Date(viewSignature.signedAt).toLocaleString()}
                />
                <SigRow
                  label="IP Address"
                  value={viewSignature.ipAddress}
                  mono
                />
                {viewSignature.witnessName && (
                  <SigRow label="Witness" value={viewSignature.witnessName} />
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className={SIG_STATUS_BADGE[viewSignature.status]}>
                    {viewSignature.status}
                  </Badge>
                </div>
                {viewSignature.expiresAt && (
                  <SigRow
                    label="Expires"
                    value={new Date(
                      viewSignature.expiresAt,
                    ).toLocaleDateString()}
                  />
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

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this waiver?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} will be removed. Existing signatures stay on
              record but the template won&apos;t be available for new bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  valueClass,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{label}</p>
            <p className={`text-2xl font-bold ${valueClass ?? ""}`}>{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function SigRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : "font-medium"}>{value}</span>
    </div>
  );
}

function SharedWaiversBanner() {
  const ctx = useLocationContext();
  if (!ctx.isMultiLocation) return null;
  const enabled = ctx.settings.sharedWaivers;
  return (
    <div
      className={
        "flex items-start gap-2.5 rounded-xl border px-4 py-2.5 text-sm " +
        (enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300"
          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300")
      }
    >
      <Globe className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-semibold">
          {enabled
            ? "Shared waivers enabled — clients sign once, valid at every location"
            : "Per-location waivers — clients re-sign at every location they visit"}
        </p>
        <p className="text-xs">
          Toggle in HQ Settings → Cross-Location Features. Waiver version
          updates always require re-signing.
        </p>
      </div>
    </div>
  );
}
