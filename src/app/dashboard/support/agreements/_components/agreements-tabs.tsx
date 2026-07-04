"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { FileSignature, FileText, Plus, Send } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { agreementQueries, type AgreementTemplate } from "@/lib/api/agreements";
import { SentAgreementsTab } from "./SentAgreementsTab";

const AgreementTemplateEditor = dynamic(
  () =>
    import("./AgreementTemplateEditor").then((m) => m.AgreementTemplateEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-xl border">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <FileSignature className="size-4 animate-pulse" />
          Loading editor…
        </div>
      </div>
    ),
  },
);

const SendAgreementModal = dynamic(
  () => import("./SendAgreementModal").then((m) => m.SendAgreementModal),
  { ssr: false },
);

/** Placeholder rows shown until the backend / later tasks land real content. */
function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
          <Skeleton className="size-9 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function TemplateRow({
  template,
  onEdit,
  onSend,
}: {
  template: AgreementTemplate;
  onEdit: () => void;
  onSend: () => void;
}) {
  return (
    <div className="hover:border-primary/40 hover:bg-muted/40 flex items-center gap-3 rounded-lg border p-4 transition-colors">
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
      >
        <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
          <FileText className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {template.name}
          </span>
          <span className="text-muted-foreground text-xs">
            Updated {new Date(template.updatedAt).toLocaleDateString()} · v
            {template.version}
          </span>
        </span>
      </button>
      <Badge variant="outline">{template.type}</Badge>
      <Badge
        variant={template.status === "published" ? "default" : "secondary"}
        className="capitalize"
      >
        {template.status}
      </Badge>
      <Button variant="outline" size="sm" onClick={onSend} className="gap-1.5">
        <Send className="size-3.5" />
        Send to Facility
      </Button>
    </div>
  );
}

function TemplatesTab({
  onNew,
  onEdit,
  onSend,
}: {
  onNew: () => void;
  onEdit: (template: AgreementTemplate) => void;
  onSend: (template: AgreementTemplate) => void;
}) {
  const { data, isPending } = useQuery(agreementQueries.templates());

  if (isPending) return <ListSkeleton />;

  const templates = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {templates.length} reusable document{" "}
          {templates.length === 1 ? "template" : "templates"}
        </p>
        <Button size="sm" onClick={onNew} className="gap-1.5">
          <Plus className="size-4" />
          New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-10 text-center">
          <FileText className="mx-auto mb-3 size-8 opacity-50" />
          <p className="text-sm font-medium">No templates yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs">
            Build a reusable agreement or waiver with the document editor — rich
            formatting, images and a clause library.
          </p>
          <Button size="sm" onClick={onNew} className="mt-4 gap-1.5">
            <Plus className="size-4" />
            New Template
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <TemplateRow
              key={template.id}
              template={template}
              onEdit={() => onEdit(template)}
              onSend={() => onSend(template)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AgreementsTabs() {
  const [tab, setTab] = useState("templates");
  const [editing, setEditing] = useState<{
    template: AgreementTemplate | null;
  } | null>(null);
  const [sending, setSending] = useState<AgreementTemplate | null>(null);

  // The document editor takes over the full page area when open.
  if (editing) {
    return (
      <AgreementTemplateEditor
        template={editing.template}
        onClose={() => setEditing(null)}
      />
    );
  }

  return (
    <>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="px-0">
          <TabsTrigger value="templates">
            <FileText />
            Templates
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Send />
            Sent Agreements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="pt-4">
          <TemplatesTab
            onNew={() => setEditing({ template: null })}
            onEdit={(template) => setEditing({ template })}
            onSend={(template) => setSending(template)}
          />
        </TabsContent>

        <TabsContent value="sent" className="pt-4">
          <SentAgreementsTab />
        </TabsContent>
      </Tabs>

      {sending ? (
        <SendAgreementModal
          open={sending !== null}
          onOpenChange={(open) => {
            if (!open) setSending(null);
          }}
          template={sending}
        />
      ) : null}
    </>
  );
}
