"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateFormModal } from "@/components/forms/CreateFormModal";
import {
  getFormsByFacility,
  duplicateForm,
  archiveForm,
  deleteForm,
  type Form,
  type FormType,
} from "@/data/forms";
import { triggerFormEvent } from "@/lib/form-automation-events";
import {
  Plus,
  Lock,
  Pencil,
  Copy,
  ExternalLink,
  Share2,
  Code,
  PenLine,
  Archive,
  Trash2,
  MoreVertical,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

const FORM_CATEGORIES: { value: FormType; label: string }[] = [
  { value: "intake", label: "Intake Forms" },
  { value: "pet", label: "Pet Profile Forms" },
  { value: "owner", label: "Customer Profile Forms" },
  { value: "service", label: "Service Forms" },
  { value: "internal", label: "Internal Forms" },
];

const FACILITY_ID = 11;

export default function IntakeFormsPage() {
  const [category, setCategory] = useState<FormType>("intake");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();
  const allForms = getFormsByFacility(FACILITY_ID);
  const formsInCategory = allForms.filter((f) => f.type === category);

  const _refresh = refreshKey; // force re-render on state change

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Intake Forms</h2>
          <p className="text-muted-foreground">
            View and manage forms by category. Create and edit in Form Builder.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-2 size-4" />
            Create New
          </Button>
          <Button variant="outline" asChild>
            <Link href="/facility/dashboard/forms/templates">
              From template
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/facility/dashboard/forms/audit">
              <Shield className="mr-2 size-4" />
              Audit Trail
            </Link>
          </Button>
        </div>
        <CreateFormModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          facilityId={FACILITY_ID}
          defaultCategory={category}
        />
      </div>

      <Tabs value={category} onValueChange={(v) => setCategory(v as FormType)}>
        <div className="flex flex-wrap items-center gap-2">
          <TabsList className="flex h-auto flex-wrap gap-1">
            {FORM_CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value}>
                {cat.value === "internal" && (
                  <Lock className="text-muted-foreground mr-1.5 size-3.5" />
                )}
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link
              href="/facility/dashboard/forms/builder?new=1"
              className="gap-2"
            >
              <PenLine className="size-4" />
              Form Builder
            </Link>
          </Button>
        </div>
        <TabsContent value={category} className="mt-4">
          {formsInCategory.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No{" "}
                  {FORM_CATEGORIES.find(
                    (c) => c.value === category,
                  )?.label.toLowerCase()}{" "}
                  yet.
                </p>
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  Create form
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {formsInCategory.map((form) => (
                <FormCard
                  key={form.id}
                  form={form}
                  facilityId={FACILITY_ID}
                  router={router}
                  onRefresh={() => setRefreshKey((k) => k + 1)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function statusBadge(status?: string) {
  switch (status) {
    case "published":
      return (
        <Badge className="border-0 bg-green-100 text-xs text-green-800 hover:bg-green-100">
          Published
        </Badge>
      );
    case "archived":
      return (
        <Badge variant="outline" className="text-muted-foreground text-xs">
          Archived
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-xs">
          Draft
        </Badge>
      );
  }
}

function FormCard({
  form,
  facilityId,
  router,
  onRefresh,
}: {
  form: Form;
  facilityId: number;
  router: ReturnType<typeof useRouter>;
  onRefresh: () => void;
}) {
  const sharePath = `/forms/${form.slug}`;
  const [embedOpen, setEmbedOpen] = useState(false);

  const copyLink = () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${sharePath}`
        : sharePath;
    navigator.clipboard.writeText(url);
    triggerFormEvent("form_link_sent", {
      facilityId: form.facilityId,
      formId: form.id,
      formName: form.name,
      sentVia: "copy",
    });
    toast.success("Link copied to clipboard");
  };

  const embedSnippet =
    typeof window !== "undefined"
      ? `<iframe src="${window.location.origin}${sharePath}" width="100%" height="600" frameborder="0" title="${form.name}"></iframe>`
      : `<iframe src="https://yoursite.com${sharePath}" width="100%" height="600" frameborder="0" title="${form.name}"></iframe>`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedSnippet);
    toast.success("Embed code copied to clipboard");
  };

  const handleArchive = () => {
    archiveForm(form.id);
    toast.success("Form archived");
    onRefresh();
  };

  const handleDelete = () => {
    if (!confirm(`Delete "${form.name}"? This cannot be undone.`)) return;
    deleteForm(form.id);
    toast.success("Form deleted");
    onRefresh();
  };

  return (
    <>
      <Card className={form.status === "archived" ? "opacity-60" : ""}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="text-base font-medium">{form.name}</CardTitle>
            <div className="flex flex-wrap items-center gap-1.5">
              {statusBadge(form.status)}
              {form.internal && (
                <Badge variant="secondary" className="text-xs">
                  <Lock className="mr-0.5 h-2.5 w-2.5" />
                  Staff only
                </Badge>
              )}
              {form.audience === "both" && (
                <Badge variant="secondary" className="text-xs">
                  Both
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 shrink-0">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/facility/dashboard/forms/builder?id=${form.id}`)
                }
              >
                <Pencil className="mr-2 size-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const copy = duplicateForm(form.id, facilityId);
                  if (copy)
                    router.push(
                      `/facility/dashboard/forms/builder?id=${copy.id}`,
                    );
                }}
              >
                <Copy className="mr-2 size-3.5" />
                Duplicate
              </DropdownMenuItem>
              {form.status !== "archived" && (
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="mr-2 size-3.5" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-xs">
            {form.questions.length} question
            {form.questions.length !== 1 ? "s" : ""}
            {form.serviceType && ` · ${form.serviceType}`}
            {form.appliesTo?.petTypes?.length
              ? ` · ${form.appliesTo.petTypes.join(", ")}`
              : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                router.push(`/facility/dashboard/forms/builder?id=${form.id}`)
              }
            >
              <Pencil className="mr-1 size-3.5" />
              Edit
            </Button>
            {!form.internal && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <Share2 className="mr-1 size-3.5" />
                      Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={copyLink}>
                      <Copy className="mr-2 size-3.5" />
                      Copy link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEmbedOpen(true)}>
                      <Code className="mr-2 size-3.5" />
                      Embed code
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" variant="ghost" asChild>
                  <a href={sharePath} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1 size-3.5" />
                    Open link
                  </a>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions link — moved to Settings */}
      <div className="bg-muted/50 flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm">
        <Shield className="text-muted-foreground size-4" />
        <span className="text-muted-foreground">
          Manage form permissions in{" "}
          <Link
            href="/facility/dashboard/settings?section=form-permissions"
            className="text-primary hover:underline"
          >
            Settings → Forms &amp; Intake → Permissions
          </Link>
        </span>
      </div>

      <Dialog open={embedOpen} onOpenChange={setEmbedOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Embed form</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Paste this code on your website to embed the form.
          </p>
          <pre className="bg-muted max-h-32 overflow-x-auto rounded-sm p-3 text-xs">
            {embedSnippet}
          </pre>
          <Button onClick={copyEmbed} variant="outline" size="sm">
            <Copy className="mr-2 size-3.5" />
            Copy embed code
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
