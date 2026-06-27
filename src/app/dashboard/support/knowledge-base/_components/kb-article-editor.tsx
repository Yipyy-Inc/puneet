"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, Save, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";
import { upsertKbArticle, useKbState } from "@/lib/kb-articles-store";
import type { KbArticle, KbArticleStatus } from "@/types/knowledge-base";
import { KbRichEditor } from "./kb-rich-editor";
import {
  bodyPreview,
  formatViews,
  helpfulnessScore,
  helpfulnessTone,
  STATUS_BADGE,
} from "./kb-utils";

const LIST_URL = "/dashboard/support/knowledge-base";
const STATUSES: KbArticleStatus[] = ["Draft", "Published", "Archived"];

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
  const [previewOpen, setPreviewOpen] = useState(false);

  const canSave = title.trim().length > 0 && bodyPreview(body).length > 0;
  const score = existing ? helpfulnessScore(existing) : null;

  function save() {
    if (!canSave) return;
    upsertKbArticle({
      id: existing?.id,
      title: title.trim(),
      category,
      body,
      status,
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

        {/* RIGHT — metadata */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
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
                  Only Published articles appear in the facility Help Center.
                </p>
              </div>
            </CardContent>
          </Card>

          {existing && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Performance</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
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
                    <ThumbsUp className="size-3.5" />
                    {score == null
                      ? "No votes"
                      : `${score}% (${existing.helpfulYes}/${existing.helpfulYes + existing.helpfulNo})`}
                  </p>
                </div>
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
    </div>
  );
}
