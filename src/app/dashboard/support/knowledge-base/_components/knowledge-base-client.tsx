"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  FolderCog,
  MoreVertical,
  PencilLine,
  Plus,
  Send,
  ThumbsUp,
  Trash2,
} from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  deleteKbArticle,
  setKbArticleStatus,
  useKbState,
} from "@/lib/kb-articles-store";
import type { KbArticle, KbArticleStatus } from "@/types/knowledge-base";
import { CategoryManagerDialog } from "./category-manager-dialog";
import {
  bodyPreview,
  formatViews,
  helpfulnessScore,
  helpfulnessTone,
  STATUS_BADGE,
  STATUS_TABS,
} from "./kb-utils";

const EDITOR_URL = "/dashboard/support/knowledge-base/editor";

export function KnowledgeBaseClient() {
  const router = useRouter();
  const { articles, categories } = useKbState();
  const hydrated = useHydrated();
  const [tab, setTab] = useState<KbArticleStatus | "all">("all");
  const [category, setCategory] = useState("all");
  const [manageOpen, setManageOpen] = useState(false);

  const counts = useMemo(
    () => ({
      total: articles.length,
      published: articles.filter((a) => a.status === "Published").length,
      drafts: articles.filter((a) => a.status === "Draft").length,
      views: articles.reduce((s, a) => s + a.views, 0),
    }),
    [articles],
  );

  const filtered = useMemo(
    () =>
      articles.filter((a) => {
        if (tab !== "all" && a.status !== tab) return false;
        if (category !== "all" && a.category !== category) return false;
        return true;
      }),
    [articles, tab, category],
  );

  const columns: ColumnDef<KbArticle>[] = [
    {
      key: "title",
      label: "Title",
      icon: FileText,
      sortable: true,
      render: (a) => (
        <div className="max-w-[320px]">
          <p className="truncate font-medium">{a.title}</p>
          <p className="text-muted-foreground truncate text-xs">
            {bodyPreview(a.body)}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      render: (a) => (
        <Badge variant="outline" className="text-xs">
          {a.category}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (a) => (
        <Badge variant="outline" className={cn(STATUS_BADGE[a.status])}>
          {a.status}
        </Badge>
      ),
    },
    {
      key: "views",
      label: "Views",
      sortable: true,
      sortValue: (a) => a.views,
      render: (a) => (
        <span className="text-muted-foreground inline-flex items-center gap-1 text-sm tabular-nums">
          <Eye className="size-3.5" />
          {formatViews(a.views)}
        </span>
      ),
    },
    {
      key: "helpfulness",
      label: "Helpfulness",
      sortable: true,
      sortValue: (a) => helpfulnessScore(a) ?? -1,
      render: (a) => {
        const score = helpfulnessScore(a);
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-sm font-medium tabular-nums",
              helpfulnessTone(score),
            )}
          >
            <ThumbsUp className="size-3.5" />
            {score == null ? "—" : `${score}%`}
          </span>
        );
      },
    },
    {
      key: "updatedAt",
      label: "Updated",
      icon: Clock,
      sortable: true,
      sortValue: (a) => a.updatedAt,
      render: (a) => (
        <span className="text-muted-foreground text-sm">
          {new Date(a.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  if (!hydrated) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Knowledge Base
          </h1>
          <p className="text-muted-foreground text-sm">
            Help articles that power the facility Help Center.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setManageOpen(true)}
          >
            <FolderCog className="size-4" />
            Manage Categories
          </Button>
          <Button
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => router.push(EDITOR_URL)}
          >
            <Plus className="size-4" />
            New Article
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Total Articles"
          value={counts.total}
          icon={BookOpen}
          tone="indigo"
        />
        <KpiTile
          label="Published"
          value={counts.published}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile
          label="Drafts"
          value={counts.drafts}
          icon={FileText}
          tone="amber"
        />
        <KpiTile
          label="Total Views"
          value={formatViews(counts.views)}
          icon={Eye}
          tone="violet"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="flex-wrap">
            {STATUS_TABS.map((s) => (
              <TabsTrigger key={s} value={s}>
                {s === "all" ? "All" : s}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        searchKey="title"
        searchPlaceholder="Search articles…"
        itemsPerPage={10}
        emptyState={{
          icon: BookOpen,
          title: "No articles yet",
          description:
            "Create your first help article to power the facility Help Center.",
          action: {
            label: "New Article",
            onClick: () => router.push(EDITOR_URL),
            icon: Plus,
          },
        }}
        onRowClick={(a) => router.push(`${EDITOR_URL}?id=${a.id}`)}
        actions={(a) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => router.push(`${EDITOR_URL}?id=${a.id}`)}
              >
                <PencilLine className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              {a.status !== "Published" && (
                <DropdownMenuItem
                  onClick={() => {
                    setKbArticleStatus(a.id, "Published");
                    toast.success("Article published");
                  }}
                >
                  <Send className="mr-2 size-4" />
                  Publish
                </DropdownMenuItem>
              )}
              {a.status === "Published" && (
                <DropdownMenuItem
                  onClick={() => {
                    setKbArticleStatus(a.id, "Archived");
                    toast.success("Article archived");
                  }}
                >
                  <Archive className="mr-2 size-4" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-600 dark:text-rose-400"
                onClick={() => {
                  deleteKbArticle(a.id);
                  toast.success("Article deleted");
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <CategoryManagerDialog open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  );
}
