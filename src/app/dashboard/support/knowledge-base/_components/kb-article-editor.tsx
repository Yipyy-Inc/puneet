"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, FolderCog, Save, Users2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";
import { upsertKbArticle, useKbState } from "@/lib/kb-articles-store";
import { subscriptionTiers } from "@/data/subscription-tiers";
import { facilities } from "@/data/facilities";
import type { KbArticle, KbArticleStatus } from "@/types/knowledge-base";
import { KbRichEditor } from "./kb-rich-editor";
import { CategoryManagerDialog } from "./category-manager-dialog";
import {
  bodyPreview,
  formatViews,
  helpfulnessScore,
  helpfulnessTone,
  STATUS_BADGE,
} from "./kb-utils";

const LIST_URL = "/dashboard/support/knowledge-base";
const STATUSES: KbArticleStatus[] = ["Draft", "Published", "Archived"];

const STATUS_HELP: Record<KbArticleStatus, string> = {
  Published: "Visible to all facility users in the Help Center.",
  Draft: "Only visible to Yipyy admins here in the KB editor.",
  Archived: "Removed from the Help Center but kept for reference.",
};

const PLAN_TIERS = subscriptionTiers
  .filter((t) => t.isActive)
  .map((t) => t.name);

/** Deterministic per-facility view count for the "top facilities" panel. */
function stableViews(articleId: string, facilityId: number): number {
  let h = 0;
  const s = `${articleId}-${facilityId}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 400) + 5;
}

export function KbArticleEditor() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const { articles } = useKbState();
  const hydrated = useHydrated();

  if (editId && !hydrated) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const existing = editId
    ? (articles.find((a) => a.id === editId) ?? null)
    : null;

  return <EditorForm key={existing?.id ?? "new"} existing={existing} />;
}

function EditorForm({ existing }: { existing: KbArticle | null }) {
  const router = useRouter();
  const { categories } = useKbState();

  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [category, setCategory] = useState(
    existing?.category ?? categories[0] ?? "Getting Started",
  );
  const [status, setStatus] = useState<KbArticleStatus>(
    existing?.status ?? "Draft",
  );
  const [summary, setSummary] = useState(existing?.summary ?? "");
  const [tags, setTags] = useState((existing?.tags ?? []).join(", "));
  const [planTiers, setPlanTiers] = useState<string[]>(
    existing?.planTiers ?? [],
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [topFacilitiesOpen, setTopFacilitiesOpen] = useState(false);

  const canSave = title.trim().length > 0 && bodyPreview(body).length > 0;
  const score = existing ? helpfulnessScore(existing) : null;

  const toggleTier = (tier: string) =>
    setPlanTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier],
    );

  const topFacilities = existing
    ? facilities
        .map((f) => ({ name: f.name, views: stableViews(existing.id, f.id) }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 6)
    : [];

  function save() {
    if (!canSave) return;
    upsertKbArticle({
      id: existing?.id,
      title: title.trim(),
      category,
      body,
      status,
      summary: summary.trim() || undefined,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      planTiers,
    });
    toast.success(
      status === "Published" ? "Article published" : "Article saved",
    );
    router.push(LIST_URL);
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to knowledge base"
            onClick={() => router.push(LIST_URL)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {existing ? "Edit Article" : "New Article"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Write help content for the facility Help Center.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="size-4" />
            Preview
          </Button>
          <Button
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!canSave}
            onClick={save}
          >
            <Save className="size-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        {/* LEFT — title + body */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="kb-title">Title</Label>
            <Input
              id="kb-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
              className="text-base font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Body</Label>
            <KbRichEditor
              initialValue={existing?.body ?? ""}
              onChange={setBody}
            />
          </div>
        </div>

        {/* RIGHT — settings panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Category</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => setCatManagerOpen(true)}
                  >
                    <FolderCog className="size-3.5" />
                    Manage Categories
                  </Button>
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as KbArticleStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {STATUS_HELP[status]}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Visibility */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground text-xs">
                Restrict this article to specific plan tiers. Default: all
                plans.
              </p>
              <Label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={planTiers.length === 0}
                  onCheckedChange={(v) => v === true && setPlanTiers([])}
                />
                All Plans
              </Label>
              {PLAN_TIERS.map((tier) => (
                <Label
                  key={tier}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={planTiers.includes(tier)}
                    onCheckedChange={() => toggleTier(tier)}
                  />
                  {tier}
                </Label>
              ))}
              {planTiers.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  Shown only to: {planTiers.join(", ")}.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Search & SEO */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Search &amp; SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="kb-summary">Article summary</Label>
                <Textarea
                  id="kb-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  placeholder="2–3 sentences shown in Help Center search results."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kb-tags">Tags</Label>
                <Input
                  id="kb-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="billing, invoices, multi-location"
                />
                <p className="text-muted-foreground text-xs">
                  Comma-separated keywords that improve internal search.
                </p>
              </div>
            </CardContent>
          </Card>

          {existing && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Views</p>
                    <p className="font-semibold tabular-nums">
                      {formatViews(existing.views)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Helpfulness</p>
                    <p
                      className={cn(
                        "inline-flex items-center gap-1 font-semibold tabular-nums",
                        helpfulnessTone(score),
                      )}
                    >
                      {score == null
                        ? "No votes"
                        : `${score}% (${existing.helpfulYes}👍 / ${existing.helpfulNo}👎)`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="link"
                  className="h-auto gap-1.5 p-0 text-xs"
                  onClick={() => setTopFacilitiesOpen(true)}
                >
                  <Users2 className="size-3.5" />
                  See which facilities viewed this most
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
            <DialogDescription>
              How this article looks in the facility Help Center.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {category}
              </Badge>
              <Badge variant="outline" className={cn(STATUS_BADGE[status])}>
                {status}
              </Badge>
            </div>
            <h3 className="text-base font-semibold">{title || "Untitled"}</h3>
            <div
              className="text-foreground/90 [&_a]:text-primary text-sm/relaxed [&_a]:underline [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{
                __html:
                  body ||
                  "<p class='text-muted-foreground'>No content yet.</p>",
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <CategoryManagerDialog
        open={catManagerOpen}
        onOpenChange={setCatManagerOpen}
      />

      <Dialog open={topFacilitiesOpen} onOpenChange={setTopFacilitiesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Top facilities by views</DialogTitle>
            <DialogDescription>
              Facilities that viewed “{title || "this article"}” most.
            </DialogDescription>
          </DialogHeader>
          <ul className="divide-y">
            {topFacilities.map((f, i) => (
              <li
                key={f.name}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground w-4 text-xs">
                    {i + 1}
                  </span>
                  {f.name}
                </span>
                <span className="font-medium tabular-nums">
                  {f.views.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
