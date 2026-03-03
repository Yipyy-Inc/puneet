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
import { getFormsByFacility, duplicateForm, type Form, type FormType } from "@/data/forms";
import { triggerFormEvent } from "@/lib/form-automation-events";
import { Plus, Lock, Pencil, Copy, ExternalLink, Share2, Code } from "lucide-react";
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
  const router = useRouter();
  const allForms = getFormsByFacility(FACILITY_ID);
  const formsInCategory = allForms.filter((f) => f.type === category);

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
            <Plus className="mr-2 h-4 w-4" />
            Create New
          </Button>
          <Button variant="outline" asChild>
            <Link href="/facility/dashboard/forms/builder?new=1">New from scratch</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/facility/dashboard/forms/templates">From template</Link>
          </Button>
        </div>
        <CreateFormModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          facilityId={FACILITY_ID}
        />
      </div>

      <Tabs value={category} onValueChange={(v) => setCategory(v as FormType)}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {FORM_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.value === "internal" && (
                <Lock className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              )}
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={category} className="mt-4">
          {formsInCategory.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No {FORM_CATEGORIES.find((c) => c.value === category)?.label.toLowerCase()} yet.
                </p>
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create form
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {formsInCategory.map((form) => (
                <FormCard key={form.id} form={form} facilityId={FACILITY_ID} router={router} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FormCard({
  form,
  facilityId,
  router,
}: {
  form: Form;
  facilityId: number;
  router: ReturnType<typeof useRouter>;
}) {
  const sharePath = `/forms/${form.slug}`;
  const [embedOpen, setEmbedOpen] = useState(false);

  const copyLink = () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}${sharePath}` : sharePath;
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

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">{form.name}</CardTitle>
          {form.internal && (
            <Badge variant="secondary" className="text-xs">
              Staff only
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {form.questions.length} question{form.questions.length !== 1 ? "s" : ""}
            {form.serviceType && ` · ${form.serviceType}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/facility/dashboard/forms/builder?id=${form.id}`)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            {!form.internal && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <Share2 className="h-3.5 w-3.5 mr-1" />
                      Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={copyLink}>
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      Copy link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEmbedOpen(true)}>
                      <Code className="h-3.5 w-3.5 mr-2" />
                      Embed code
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" variant="ghost" asChild>
                  <a href={sharePath} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Open link
                  </a>
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const copy = duplicateForm(form.id, facilityId);
                if (copy) router.push(`/facility/dashboard/forms/builder?id=${copy.id}`);
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              Duplicate
            </Button>
          </div>
        </CardContent>
      </Card>
      <Dialog open={embedOpen} onOpenChange={setEmbedOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Embed form</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Paste this code on your website to embed the form.
          </p>
          <pre className="rounded bg-muted p-3 text-xs overflow-x-auto max-h-32">
            {embedSnippet}
          </pre>
          <Button onClick={copyEmbed} variant="outline" size="sm">
            <Copy className="h-3.5 w-3.5 mr-2" />
            Copy embed code
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
