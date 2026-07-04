"use client";

import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import {
  Download,
  FileText,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addFacilityWaiver,
  deleteFacilityWaiver,
  inferWaiverType,
  renameFacilityWaiver,
  useFacilityWaivers,
  usePlatformAgreements,
} from "@/lib/facility-documents-store";
import type { FacilityDocument } from "@/types/facility-document";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// No real file storage in this mock — produce an honest placeholder download.
function downloadDocument(doc: FacilityDocument) {
  const content = `${doc.name}\nType: ${doc.type}\nAdded: ${formatDate(doc.dateAdded)}\n\nPlaceholder document — demo environment, no real file storage.`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.name.replace(/[^\w.-]+/g, "_")}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name…"
        className="pl-9"
        aria-label="Search documents by name"
      />
    </div>
  );
}

function DocTable({
  documents,
  emptyLabel,
  actions,
}: {
  documents: FacilityDocument[];
  emptyLabel: string;
  actions?: (doc: FacilityDocument) => ReactNode;
}) {
  if (documents.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        {emptyLabel}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-xs">
            <th className="py-2 pr-3 font-medium">Name</th>
            <th className="hidden px-3 py-2 font-medium sm:table-cell">Type</th>
            <th className="hidden px-3 py-2 font-medium sm:table-cell">
              Date Added
            </th>
            <th className="py-2 pl-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {documents.map((d) => (
            <tr key={d.id} className="hover:bg-muted/40">
              <td className="py-2.5 pr-3">
                <div className="flex items-center gap-2">
                  <FileText className="text-muted-foreground size-4 shrink-0" />
                  <span className="font-medium">{d.name}</span>
                </div>
                <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs sm:hidden">
                  <span>{d.type}</span>
                  <span aria-hidden>·</span>
                  <span>{formatDate(d.dateAdded)}</span>
                </div>
              </td>
              <td className="hidden px-3 py-2.5 sm:table-cell">
                <Badge variant="outline" className="text-xs font-normal">
                  {d.type}
                </Badge>
              </td>
              <td className="text-muted-foreground hidden px-3 py-2.5 whitespace-nowrap sm:table-cell">
                {formatDate(d.dateAdded)}
              </td>
              <td className="py-2.5 pl-3">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadDocument(d)}
                  >
                    <Download className="size-3.5" />
                    Download
                  </Button>
                  {actions?.(d)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Yipyy Agreements are legally signed records: this tab is DELIBERATELY
// download-only. No rename, delete or upload actions are wired here (DocTable is
// rendered without an `actions` prop, so only Download shows). Access to the
// whole Documents page is additionally restricted to the Facility Owner by the
// server-side route guard in ../page.tsx.
function AgreementsTab() {
  const docs = usePlatformAgreements();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? docs.filter((d) => d.name.toLowerCase().includes(q)) : docs;
  }, [docs, query]);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            Locked legal records — signed agreements &amp; terms from Yipyy.
            Download only; these cannot be renamed, edited or deleted.
          </p>
          <SearchBox value={query} onChange={setQuery} />
        </div>
        <DocTable
          documents={filtered}
          emptyLabel={
            query ? "No agreements match your search." : "No agreements yet."
          }
        />
      </CardContent>
    </Card>
  );
}

function WaiversTab() {
  const docs = useFacilityWaivers();
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [renameTarget, setRenameTarget] = useState<FacilityDocument | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FacilityDocument | null>(
    null,
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? docs.filter((d) => d.name.toLowerCase().includes(q)) : docs;
  }, [docs, query]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const name = file.name.replace(/\.[^.]+$/, "");
      const doc = addFacilityWaiver({
        name,
        type: inferWaiverType(file.name),
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
      });
      toast.success(`“${doc.name}” uploaded`);
    }
    e.target.value = "";
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchBox value={query} onChange={setQuery} />
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-1.5 size-4" />
            Upload
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={onFile}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          Storage &amp; reference only — the facility portal has no e-signature.
          E-signature requests are sent from Yipyy.
        </p>
        <DocTable
          documents={filtered}
          emptyLabel={
            query
              ? "No waivers match your search."
              : "No waivers yet — upload your first PDF."
          }
          actions={(d) => (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Rename ${d.name}`}
                onClick={() => {
                  setRenameTarget(d);
                  setRenameValue(d.name);
                }}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-rose-600 hover:text-rose-700"
                aria-label={`Delete ${d.name}`}
                onClick={() => setDeleteTarget(d)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </>
          )}
        />
      </CardContent>

      {/* Rename */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(o) => !o && setRenameTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="rename-doc">Name</Label>
            <Input
              id="rename-doc"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameValue.trim() && renameTarget) {
                  renameFacilityWaiver(renameTarget.id, renameValue);
                  toast.success("Document renamed");
                  setRenameTarget(null);
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!renameValue.trim()}
              onClick={() => {
                if (renameTarget) {
                  renameFacilityWaiver(renameTarget.id, renameValue);
                  toast.success("Document renamed");
                }
                setRenameTarget(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.name}” will be permanently removed. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => {
                if (deleteTarget) {
                  deleteFacilityWaiver(deleteTarget.id);
                  toast.success("Document deleted");
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export function FacilityDocumentsClient() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-muted-foreground text-sm">
          Platform agreements from Yipyy and your own customer-facing waivers —
          storage &amp; reference only.
        </p>
      </div>

      <Tabs defaultValue="agreements">
        <TabsList>
          <TabsTrigger value="agreements">Yipyy Agreements</TabsTrigger>
          <TabsTrigger value="waivers">My Waivers</TabsTrigger>
        </TabsList>
        <TabsContent value="agreements" className="mt-4">
          <AgreementsTab />
        </TabsContent>
        <TabsContent value="waivers" className="mt-4">
          <WaiversTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
