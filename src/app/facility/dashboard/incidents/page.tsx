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
  Eye,
  Filter,
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
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const stats = getIncidentStats();
  const pendingTasks = getPendingFollowUpTasks();

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
            <AlertTriangle className="h-3 w-3 mr-1 inline" />
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
          <div className="text-sm text-muted-foreground">
            Pets: {row.original.petNames.join(", ")}
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
          {new Date(row.original.incidentDate).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const icon = {
          open: <AlertCircle className="h-3 w-3 mr-1 inline" />,
          investigating: <Clock className="h-3 w-3 mr-1 inline" />,
          resolved: <CheckCircle2 className="h-3 w-3 mr-1 inline" />,
          closed: <XCircle className="h-3 w-3 mr-1 inline" />,
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
              <CheckCircle2 className="h-3 w-3 mr-1 inline" />
              Yes
            </Badge>
          ) : (
            <Badge variant="outline">No</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedIncident(row.original);
            setShowDetailsModal(true);
          }}
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      ),
    },
  ];

  // Follow-up Tasks Columns
  const taskColumns: ColumnDef<(typeof pendingTasks)[0]>[] = [
    {
      accessorKey: "incidentId",
      header: "Incident",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.original.incidentId}</div>
      ),
    },
    {
      accessorKey: "title",
      header: "Task",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.title}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.description}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "assignedTo",
      header: "Assigned To",
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => {
        const dueDate = new Date(row.original.dueDate);
        const now = new Date();
        const isOverdue = dueDate < now;

        return (
          <div className={isOverdue ? "text-destructive font-semibold" : ""}>
            {dueDate.toLocaleString()}
            {isOverdue && <div className="text-xs">OVERDUE</div>}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === "completed"
              ? "default"
              : row.original.status === "in_progress"
                ? "secondary"
                : "outline"
          }
          className="capitalize"
        >
          {row.original.status.replace("_", " ")}
        </Badge>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Incident Reporting</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage facility incidents
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Report Incident
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Open Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.open}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.critical}
            </div>
            <p className="text-xs text-muted-foreground mt-1">High priority</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">New incidents</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="incidents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="incidents">
            <AlertTriangle className="h-4 w-4 mr-2" />
            All Incidents
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Follow-Up Tasks ({pendingTasks.length})
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
                    <Filter className="h-4 w-4 text-muted-foreground" />
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
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-Up Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Follow-Up Tasks</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Tasks assigned to staff for incident resolution
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={taskColumns}
                data={pendingTasks}
                searchColumn="title"
                searchPlaceholder="Search tasks..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <CreateIncidentModal onClose={() => setShowCreateModal(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
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
