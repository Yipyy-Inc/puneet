"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpCircle,
  Clock,
  Inbox,
  Search,
  ShieldAlert,
  Ticket as TicketIcon,
} from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supportTickets } from "@/data/support-tickets";
import type { SupportTicket } from "@/types/support";
import { useTicketAssignments } from "@/lib/ticket-assignment-store";
import { AssignCell } from "./assign-cell";
import {
  CATEGORIES,
  PRIORITIES,
  PRIORITY_BADGE,
  priorityRank,
  SLA_STATUSES,
  SLA_TEXT,
  slaRank,
  slaStatusOf,
  STATUS_BADGE,
  STATUS_TABS,
  statusRank,
} from "./ticket-list-utils";

export function TicketsListClient() {
  const router = useRouter();
  const assignments = useTicketAssignments();
  const [tab, setTab] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");
  const [sla, setSla] = useState("all");

  // Apply inline assignments made this session.
  const tickets = useMemo<SupportTicket[]>(
    () =>
      supportTickets.map((t) =>
        t.id in assignments ? { ...t, assignedTo: assignments[t.id] } : t,
      ),
    [assignments],
  );

  const kpis = useMemo(
    () => ({
      open: tickets.filter((t) => t.status === "Open").length,
      inProgress: tickets.filter((t) => t.status === "In Progress").length,
      escalated: tickets.filter((t) => t.status === "Escalated").length,
      slaBreached: tickets.filter((t) => slaStatusOf(t) === "Breached").length,
    }),
    [tickets],
  );

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: tickets.length };
    for (const s of STATUS_TABS) {
      if (s !== "All") counts[s] = tickets.filter((t) => t.status === s).length;
    }
    return counts;
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (tab !== "All" && t.status !== tab) return false;
      if (priority !== "all" && t.priority !== priority) return false;
      if (category !== "all" && t.category !== category) return false;
      if (sla !== "all" && slaStatusOf(t) !== sla) return false;
      if (
        q &&
        !(
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.facility.toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [tickets, tab, priority, category, sla, search]);

  const columns: ColumnDef<SupportTicket>[] = [
    {
      key: "id",
      label: "Ticket ID",
      icon: TicketIcon,
      sortable: true,
      render: (t) => (
        <span className="font-mono text-sm font-medium">{t.id}</span>
      ),
    },
    {
      key: "title",
      label: "Title",
      sortable: true,
      render: (t) => (
        <div className="max-w-[280px]">
          <p className="truncate font-medium">{t.title}</p>
          <p className="text-muted-foreground truncate text-xs">{t.facility}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      sortValue: (t) => statusRank(t.status),
      render: (t) => (
        <Badge variant="outline" className={cn(STATUS_BADGE[t.status])}>
          {t.status}
        </Badge>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      sortValue: (t) => priorityRank(t.priority),
      render: (t) => (
        <Badge variant="outline" className={cn(PRIORITY_BADGE[t.priority])}>
          {t.priority}
        </Badge>
      ),
    },
    {
      key: "sla",
      label: "SLA Status",
      sortable: true,
      sortValue: (t) => slaRank(slaStatusOf(t)),
      render: (t) => {
        const s = slaStatusOf(t);
        return (
          <span className={cn("text-sm font-medium", SLA_TEXT[s])}>{s}</span>
        );
      },
    },
    {
      key: "assignedTo",
      label: "Assigned To",
      sortable: true,
      sortValue: (t) => t.assignedTo ?? "zzz",
      render: (t) =>
        t.assignedTo ? (
          <span className="text-sm">{t.assignedTo}</span>
        ) : (
          <AssignCell ticketId={t.id} />
        ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Support Tickets
        </h1>
        <p className="text-muted-foreground text-sm">
          Facility support requests across the platform.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Total Open"
          value={kpis.open}
          icon={Inbox}
          tone="indigo"
        />
        <KpiTile
          label="In Progress"
          value={kpis.inProgress}
          icon={Clock}
          tone="violet"
        />
        <KpiTile
          label="Escalated"
          value={kpis.escalated}
          icon={ArrowUpCircle}
          tone="amber"
        />
        <KpiTile
          label="SLA Breached"
          value={kpis.slaBreached}
          icon={ShieldAlert}
          tone="rose"
          alert={
            kpis.slaBreached > 0
              ? { label: "Needs attention", tone: "rose" }
              : undefined
          }
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          {STATUS_TABS.map((s) => (
            <TabsTrigger key={s} value={s}>
              {s}
              <span className="text-muted-foreground ml-1.5 text-xs">
                {tabCounts[s] ?? 0}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search ticket, title, or facility…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sla} onValueChange={setSla}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="SLA Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All SLA</SelectItem>
            {SLA_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        itemsPerPage={12}
        onRowClick={(t) => router.push(`/dashboard/support/tickets/${t.id}`)}
        emptyState={{
          icon: TicketIcon,
          title: "No tickets yet",
          description:
            "Facility support requests will appear here once submitted.",
        }}
      />
    </div>
  );
}
