"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Filter,
  ClipboardList,
  CalendarDays,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  incidents,
  getIncidentStats,
  getPendingFollowUpTasks,
} from "@/data/incidents";
import { CreateIncidentModal } from "@/components/incidents/CreateIncidentModal";
import { IncidentDetailsModal } from "@/components/incidents/IncidentDetailsModal";
import { FollowUpProtocolsManager } from "@/components/incidents/protocols/FollowUpProtocolsManager";
import { FollowUpTaskCard } from "@/components/incidents/follow-up/FollowUpTaskCard";
import type { FollowUpTask } from "@/types/incidents";
import { TagList } from "@/components/shared/TagList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function IncidentsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<
    (typeof incidents)[0] | null
  >(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [taskFilter, setTaskFilter] = useState<"all" | "today" | "overdue" | "upcoming">("all");
  const [tasks, setTasks] = useState<FollowUpTask[]>(getPendingFollowUpTasks());

  const stats = getIncidentStats();
  const pendingTasks = tasks;
  const handleTaskUpdate = (updated: FollowUpTask) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t)),
    );
  };

  // Filter follow-up tasks by date scope
  const now = new Date();
  const todayKey = now.toDateString();
  const filteredTasks = pendingTasks.filter((t) => {
    const due = new Date(t.dueDate);
    if (taskFilter === "today") return due.toDateString() === todayKey;
    if (taskFilter === "overdue") return due < now && t.status !== "completed";
    if (taskFilter === "upcoming") return due > now;
    return true;
  });
  const overdueCount = pendingTasks.filter((t) => {
    const due = new Date(t.dueDate);
    return due < now && t.status !== "completed";
  }).length;
  const todayCount = pendingTasks.filter(
    (t) => new Date(t.dueDate).toDateString() === todayKey,
  ).length;

  // Filter incidents
  const filteredIncidents = incidents.filter((incident) => {
    if (filterStatus !== "all" && incident.status !== filterStatus)
      return false;
    if (filterSeverity !== "all" && incident.severity !== filterSeverity)
      return false;
    return true;
  });

  // Severity badge variant
  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "open":
        return "destructive";
      case "investigating":
        return "default";
      case "resolved":
        return "secondary";
      case "closed":
        return "outline";
      default:
        return "outline";
    }
  };

  // Incident Columns
  const incidentColumns: ColumnDef<(typeof incidents)[0]>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <div className="font-mono font-semibold">{row.original.id}</div>
      ),
    },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => (
        <Badge
          variant={getSeverityVariant(row.original.severity)}
          className="capitalize"
        >
          {row.original.severity === "critical" && (
            <AlertTriangle className="mr-1 inline size-3" />
          )}
          {row.original.severity}
        </Badge>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: "title",
      header: "Incident",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.title}</div>
          <div className="text-muted-foreground text-sm">
            Pets: {row.original.petNames.join(", ")}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {row.original.petIds.map((petId: number) => (
              <TagList
                key={petId}
                entityType="pet"
                entityId={petId}
                compact
                maxVisible={2}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "reportedBy",
      header: "Reported By",
    },
    {
      accessorKey: "incidentDate",
      header: "Date",
      cell: ({ row }) => (
        <div className="text-sm">
          {new Date(row.original.incidentDate).toLocaleDateString("en-CA", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const icon = {
          open: <AlertCircle className="mr-1 inline size-3" />,
          investigating: <Clock className="mr-1 inline size-3" />,
          resolved: <CheckCircle2 className="mr-1 inline size-3" />,
          closed: <XCircle className="mr-1 inline size-3" />,
        }[status];

        return (
          <Badge variant={getStatusVariant(status)} className="capitalize">
            {icon}
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "managerNotified",
      header: "Notified",
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.managerNotified ? (
            <Badge variant="default">
              <CheckCircle2 className="mr-1 inline size-3" />
              Yes
            </Badge>
          ) : (
            <Badge variant="outline">No</Badge>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Incident Reporting</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage facility incidents
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 size-4" />
          Report Incident
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-muted-foreground mt-1 text-xs">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Open Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-destructive text-2xl font-bold">
              {stats.open}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-destructive text-2xl font-bold">
              {stats.critical}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">High priority</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-muted-foreground mt-1 text-xs">New incidents</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="incidents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="incidents">
            <AlertTriangle className="mr-2 size-4" />
            All Incidents
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckCircle2 className="mr-2 size-4" />
            Follow-Up Tasks ({pendingTasks.length})
          </TabsTrigger>
          <TabsTrigger value="protocols">
            <ClipboardList className="mr-2 size-4" />
            Protocols
          </TabsTrigger>
        </TabsList>

        {/* All Incidents Tab */}
        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Incident Reports</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="text-muted-foreground size-4" />
                    <Select
                      value={filterStatus}
                      onValueChange={setFilterStatus}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="investigating">
                          Investigating
                        </SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={filterSeverity}
                      onValueChange={setFilterSeverity}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severity</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={incidentColumns}
                data={filteredIncidents}
                searchColumn="title"
                searchPlaceholder="Search incidents..."
                onRowClick={(incident) => {
                  setSelectedIncident(incident);
                  setShowDetailsModal(true);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-Up Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Follow-Up Tasks</CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Auto-generated from protocols when incidents are reported.
                    These appear on the assignee&apos;s daily task list on the
                    day they&apos;re due.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskFilter("all")}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      taskFilter === "all"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-muted"
                    }`}
                  >
                    All ({pendingTasks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilter("today")}
                    className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      taskFilter === "today"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-muted"
                    }`}
                  >
                    <CalendarDays className="size-3" />
                    Today ({todayCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilter("overdue")}
                    className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      taskFilter === "overdue"
                        ? "border-red-500 bg-red-500 text-white"
                        : overdueCount > 0
                          ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                          : "border-input bg-background hover:bg-muted"
                    }`}
                  >
                    <AlertCircle className="size-3" />
                    Overdue ({overdueCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilter("upcoming")}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      taskFilter === "upcoming"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-muted"
                    }`}
                  >
                    Upcoming
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTasks.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center">
                  <CheckCircle2 className="mx-auto mb-3 size-10 opacity-30" />
                  <p className="font-medium">No tasks match this view</p>
                  <p className="text-sm">
                    {taskFilter === "overdue"
                      ? "Nothing is overdue."
                      : "Try a different filter."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(a.dueDate).getTime() -
                        new Date(b.dueDate).getTime(),
                    )
                    .map((task) => (
                      <FollowUpTaskCard
                        key={task.id}
                        task={task}
                        onUpdate={handleTaskUpdate}
                        siblingTasks={tasks.filter(
                          (t) => t.incidentId === task.incidentId,
                        )}
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Protocols Tab */}
        <TabsContent value="protocols" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <FollowUpProtocolsManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          <CreateIncidentModal onClose={() => setShowCreateModal(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          {selectedIncident && (
            <IncidentDetailsModal
              incident={selectedIncident}
              onClose={() => {
                setShowDetailsModal(false);
                setSelectedIncident(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
