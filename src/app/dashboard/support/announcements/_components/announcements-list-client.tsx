"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Clock,
  FileText,
  Megaphone,
  MoreVertical,
  Plus,
  Send,
  Trash2,
  PencilLine,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  deleteAnnouncement,
  setAnnouncementStatus,
  useAnnouncements,
} from "@/lib/announcements-store";
import type { EnhancedAnnouncement } from "@/types/announcement";
import { toast } from "sonner";
import {
  ANNOUNCEMENT_TABS,
  type AnnouncementTab,
  bodyPreview,
  DELIVERY_LABEL,
  PRIORITY_BADGE,
  STATUS_BADGE,
  targetSummary,
} from "./announcement-utils";

export function AnnouncementsListClient() {
  const router = useRouter();
  const announcements = useAnnouncements();
  const hydrated = useHydrated();
  const [tab, setTab] = useState<AnnouncementTab>("all");

  const counts = useMemo(
    () => ({
      Published: announcements.filter((a) => a.status === "Published").length,
      Scheduled: announcements.filter((a) => a.status === "Scheduled").length,
      Draft: announcements.filter((a) => a.status === "Draft").length,
      Archived: announcements.filter((a) => a.status === "Archived").length,
    }),
    [announcements],
  );

  const filtered = useMemo(
    () =>
      tab === "all"
        ? announcements
        : announcements.filter((a) => a.status === tab),
    [announcements, tab],
  );

  const columns: ColumnDef<EnhancedAnnouncement>[] = [
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
      key: "priority",
      label: "Priority",
      sortable: true,
      render: (a) => (
        <Badge variant="outline" className={cn(PRIORITY_BADGE[a.priority])}>
          {a.priority}
        </Badge>
      ),
    },
    {
      key: "target",
      label: "Target",
      render: (a) => <span className="text-sm">{targetSummary(a)}</span>,
    },
    {
      key: "delivery",
      label: "Delivery",
      render: (a) => (
        <span className="text-muted-foreground text-sm">
          {DELIVERY_LABEL[a.deliveryMethod]}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      icon: Clock,
      sortable: true,
      sortValue: (a) => a.createdAt,
      render: (a) => (
        <span className="text-muted-foreground text-sm">
          {new Date(a.createdAt).toLocaleDateString()}
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
            Announcements
          </h1>
          <p className="text-muted-foreground text-sm">
            Broadcast updates to facilities across the platform.
          </p>
        </div>
        <Button
          className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() =>
            router.push("/dashboard/support/announcements/compose")
          }
        >
          <Plus className="size-4" />
          New Announcement
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Published"
          value={counts.Published}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile
          label="Scheduled"
          value={counts.Scheduled}
          icon={Clock}
          tone="indigo"
        />
        <KpiTile
          label="Drafts"
          value={counts.Draft}
          icon={FileText}
          tone="amber"
        />
        <KpiTile
          label="Archived"
          value={counts.Archived}
          icon={Archive}
          tone="slate"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as AnnouncementTab)}>
        <TabsList className="flex-wrap">
          {ANNOUNCEMENT_TABS.map((t) => {
            const n =
              t.value === "all"
                ? announcements.length
                : counts[t.value as keyof typeof counts];
            return (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
                <span className="text-muted-foreground ml-1.5 text-xs">
                  {n}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <DataTable
        data={filtered}
        columns={columns}
        searchKey="title"
        searchPlaceholder="Search announcements…"
        itemsPerPage={10}
        emptyState={{
          icon: Megaphone,
          title: "No announcements yet",
          description: "Broadcast updates to facilities across the platform.",
          action: {
            label: "New Announcement",
            onClick: () =>
              router.push("/dashboard/support/announcements/compose"),
            icon: Plus,
          },
        }}
        actions={(a) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVertical className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  router.push(
                    `/dashboard/support/announcements/compose?id=${a.id}`,
                  )
                }
              >
                <PencilLine className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              {(a.status === "Draft" || a.status === "Scheduled") && (
                <DropdownMenuItem
                  onClick={() => {
                    setAnnouncementStatus(a.id, "Published");
                    toast.success("Announcement published");
                  }}
                >
                  <Send className="mr-2 size-4" />
                  Publish now
                </DropdownMenuItem>
              )}
              {a.status === "Published" && (
                <DropdownMenuItem
                  onClick={() => {
                    setAnnouncementStatus(a.id, "Archived");
                    toast.success("Announcement archived");
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
                  deleteAnnouncement(a.id);
                  toast.success("Announcement deleted");
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      {filtered.length === 0 && (
        <p className="text-muted-foreground flex items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-sm">
          <Megaphone className="size-4" />
          No announcements in this view.
        </p>
      )}
    </div>
  );
}
