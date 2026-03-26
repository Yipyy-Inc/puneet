"use client";

import { useState } from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Plus,
  CheckSquare,
  AlertCircle,
  XCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { NotesList } from "@/components/shared/NotesList";

interface IncidentPhoto {
  id: string;
  caption?: string;
  isClientVisible: boolean;
}

interface FollowUpTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: "pending" | "in_progress" | "completed";
  completedDate?: string;
  completedBy?: string;
  notes?: string;
}

interface Incident {
  id: string;
  type:
    | "injury"
    | "illness"
    | "behavioral"
    | "accident"
    | "escape"
    | "fight"
    | "other";
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved" | "closed";
  title: string;
  description: string;
  internalNotes: string;
  clientFacingNotes: string;
  petIds: number[];
  petNames: string[];
  staffInvolved: string[];
  reportedBy: string;
  incidentDate: string;
  reportedDate: string;
  resolvedDate?: string;
  closedDate?: string;
  photos: IncidentPhoto[];
  followUpTasks: FollowUpTask[];
  managerNotified: boolean;
  managersNotified: string[];
  clientNotified: boolean;
  clientNotificationDate?: string;
  createdAt: string;
  updatedAt: string;
  closedBy?: string;
}

interface IncidentDetailsModalProps {
  incident: Incident;
  onClose: () => void;
}

export function IncidentDetailsModal({
  incident,
  onClose,
}: IncidentDetailsModalProps) {
  const [status, setStatus] = useState<
    "open" | "investigating" | "resolved" | "closed"
  >(incident.status);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
  });
  const [showAddTask, setShowAddTask] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-50 border-red-200";
      case "high":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "";
    }
  };

  const getStatusIcon = (stat: string) => {
    switch (stat) {
      case "open":
        return <AlertCircle className="size-4" />;
      case "investigating":
        return <Clock className="size-4" />;
      case "resolved":
        return <CheckCircle2 className="size-4" />;
      case "closed":
        return <XCircle className="size-4" />;
      default:
        return null;
    }
  };

  const handleStatusChange = (
    newStatus: "open" | "investigating" | "resolved" | "closed",
  ) => {
    setStatus(newStatus);
    console.log("Status changed to:", newStatus);
    // In a real app, would save to backend
  };

  const handleCloseIncident = () => {
    setStatus("closed");
    console.log("Incident closed");
    onClose();
  };

  const handleAddTask = () => {
    console.log("Adding task:", newTask);
    setNewTask({ title: "", description: "", assignedTo: "", dueDate: "" });
    setShowAddTask(false);
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive size-5" />
              Incident Report: {incident.id}
            </DialogTitle>
            <DialogDescription>{incident.title}</DialogDescription>
          </div>
          <Badge
            variant="outline"
            className={`px-3 py-1 text-base ${getSeverityColor(incident.severity)} `}
          >
            {incident.severity.toUpperCase()} SEVERITY
          </Badge>
        </div>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Status Change */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="mb-2 block text-base">Incident Status</Label>
                <div className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <span className="font-semibold capitalize">{status}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                {status !== "closed" && (
                  <Button variant="default" onClick={handleCloseIncident}>
                    <CheckCircle2 className="mr-2 size-4" />
                    Close Incident
                  </Button>
                )}
              </div>
            </div>
            {status === "closed" && incident.closedBy && (
              <div className="bg-muted mt-3 rounded-lg p-3">
                <p className="text-muted-foreground text-sm">
                  Closed by <strong>{incident.closedBy}</strong> on{" "}
                  {incident.closedDate
                    ? new Date(incident.closedDate).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for Details */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="photos">
              Photos ({incident.photos.length})
            </TabsTrigger>
            <TabsTrigger value="tasks">
              Follow-Up ({incident.followUpTasks.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">
                      Type
                    </Label>
                    <div className="mt-1 font-medium capitalize">
                      {incident.type}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">
                      Severity
                    </Label>
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className={getSeverityColor(incident.severity)}
                      >
                        {incident.severity}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">
                      Incident Date
                    </Label>
                    <div className="mt-1 flex items-center gap-2 font-medium">
                      <Calendar className="size-4" />
                      {new Date(incident.incidentDate).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">
                      Reported By
                    </Label>
                    <div className="mt-1 flex items-center gap-2 font-medium">
                      <User className="size-4" />
                      {incident.reportedBy}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Pets Involved
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {incident.petNames.map((name: string, idx: number) => (
                      <Badge key={idx} variant="default">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {incident.staffInvolved.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-sm">
                      Staff Involved
                    </Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {incident.staffInvolved.map(
                        (staff: string, idx: number) => (
                          <Badge key={idx} variant="secondary">
                            {staff}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Label className="mb-3 block text-base">Description</Label>
                <p className="text-sm whitespace-pre-wrap">
                  {incident.description}
                </p>
              </CardContent>
            </Card>

            {/* Manager Notifications */}
            <Card>
              <CardContent className="pt-6">
                <Label className="mb-3 block text-base">Notifications</Label>
                <div className="space-y-2">
                  <div className="bg-muted flex items-center justify-between rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-green-600" />
                      <span className="text-sm font-medium">
                        Manager Notified
                      </span>
                    </div>
                    {incident.managerNotified && (
                      <div className="flex flex-wrap gap-1">
                        {incident.managersNotified.map(
                          (manager: string, idx: number) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {manager}
                            </Badge>
                          ),
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-muted flex items-center justify-between rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      {incident.clientNotified ? (
                        <CheckCircle2 className="size-4 text-green-600" />
                      ) : (
                        <XCircle className="text-muted-foreground size-4" />
                      )}
                      <span className="text-sm font-medium">
                        Client Notified
                      </span>
                    </div>
                    {incident.clientNotified &&
                      incident.clientNotificationDate && (
                        <span className="text-muted-foreground text-xs">
                          {new Date(
                            incident.clientNotificationDate,
                          ).toLocaleString()}
                        </span>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            {/* Internal Notes */}
            <Card>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Internal Notes</Label>
                  <Badge variant="secondary">
                    <EyeOff className="mr-1 size-3" />
                    Staff Only
                  </Badge>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">
                    {incident.internalNotes}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">
                  These notes are for internal use only and are not visible to
                  clients
                </p>
              </CardContent>
            </Card>

            {/* Client-Facing Notes */}
            <Card>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Client-Facing Notes</Label>
                  <Badge variant="default">
                    <Eye className="mr-1 size-3" />
                    Client Visible
                  </Badge>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm whitespace-pre-wrap">
                    {incident.clientFacingNotes}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">
                  This version is shared with clients when they&apos;re notified
                </p>
              </CardContent>
            </Card>

            {/* Structured Notes */}
            <Card>
              <CardContent className="space-y-3 pt-6">
                <Label className="text-base">Structured Notes</Label>
                <NotesList
                  category="incident"
                  entityId={Number(incident.id.replace(/\D/g, "")) || 1}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-4">
            {incident.photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {incident.photos.map((photo) => (
                  <Card key={photo.id}>
                    <CardContent className="pt-6">
                      <div className="bg-muted mb-3 flex aspect-video items-center justify-center rounded-lg">
                        <ImageIcon className="text-muted-foreground size-12" />
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          {photo.caption || "No caption"}
                        </div>
                        <div className="flex items-center gap-2">
                          {photo.isClientVisible ? (
                            <Badge variant="default" className="text-xs">
                              <Eye className="mr-1 size-3" />
                              Client Visible
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <EyeOff className="mr-1 size-3" />
                              Internal Only
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-muted-foreground pt-6 text-center">
                  <ImageIcon className="mx-auto mb-2 size-12 opacity-20" />
                  <p>No photos attached to this incident</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Follow-Up Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Follow-Up Tasks</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddTask(!showAddTask)}
              >
                <Plus className="mr-2 size-4" />
                Add Task
              </Button>
            </div>

            {showAddTask && (
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <Input
                    placeholder="Task title"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                  />
                  <Textarea
                    placeholder="Task description"
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      value={newTask.assignedTo}
                      onValueChange={(value) =>
                        setNewTask({ ...newTask, assignedTo: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Assign to" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sarah Johnson">
                          Sarah Johnson
                        </SelectItem>
                        <SelectItem value="Mike Davis">Mike Davis</SelectItem>
                        <SelectItem value="Emily Brown">Emily Brown</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="datetime-local"
                      value={newTask.dueDate}
                      onChange={(e) =>
                        setNewTask({ ...newTask, dueDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddTask} disabled={!newTask.title}>
                      Add Task
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowAddTask(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {incident.followUpTasks.length > 0 ? (
              <div className="space-y-3">
                {incident.followUpTasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <CheckSquare className="size-4" />
                            <span className="font-medium">{task.title}</span>
                          </div>
                          <p className="text-muted-foreground mb-3 text-sm">
                            {task.description}
                          </p>
                          <div className="text-muted-foreground flex items-center gap-4 text-xs">
                            <div>
                              Assigned to: <strong>{task.assignedTo}</strong>
                            </div>
                            <div>
                              Due: {new Date(task.dueDate).toLocaleString()}
                            </div>
                          </div>
                          {task.completedDate && (
                            <div className="mt-2 rounded-sm bg-green-50 p-2 text-xs">
                              ✓ Completed by <strong>{task.completedBy}</strong>{" "}
                              on {new Date(task.completedDate).toLocaleString()}
                              {task.notes && (
                                <div className="mt-1">{task.notes}</div>
                              )}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant={
                            task.status === "completed"
                              ? "default"
                              : task.status === "in_progress"
                                ? "secondary"
                                : "outline"
                          }
                          className="capitalize"
                        >
                          {task.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-muted-foreground pt-6 text-center">
                  <CheckSquare className="mx-auto mb-2 size-12 opacity-20" />
                  <p>No follow-up tasks for this incident</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <DialogFooter>
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </>
  );
}
