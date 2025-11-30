"use client";

import { useState } from "react";
import { facilities } from "@/data/facilities";
import {
  taskTemplates,
  staffTasks,
  TaskTemplate as BaseTaskTemplate,
  StaffTask as BaseStaffTask,
} from "@/data/staff-tasks";

// Extend types to be compatible with DataTable's Record<string, unknown> constraint
type TaskTemplate = BaseTaskTemplate & Record<string, unknown>;
type StaffTask = BaseStaffTask & Record<string, unknown>;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  Camera,
  User,
  PawPrint,
  Calendar,
  PlayCircle,
} from "lucide-react";

const exampleStaff = [
  { id: 1, name: "Admin User" },
  { id: 2, name: "Manager One" },
  { id: 3, name: "Mike Chen" },
  { id: 5, name: "Emily Davis" },
  { id: 7, name: "David Wilson" },
  { id: 8, name: "Lisa Rodriguez" },
  { id: 9, name: "Tom Anderson" },
];

const priorityColors = {
  low: "bg-slate-100 text-slate-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  skipped: "bg-gray-100 text-gray-800",
};

const categoryColors = {
  boarding: "bg-purple-100 text-purple-800",
  daycare: "bg-cyan-100 text-cyan-800",
  cleaning: "bg-emerald-100 text-emerald-800",
  medication: "bg-rose-100 text-rose-800",
  grooming: "bg-pink-100 text-pink-800",
  general: "bg-slate-100 text-slate-800",
};

export default function StaffTasksPage() {
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

  const [activeTab, setActiveTab] = useState("assigned");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StaffTask | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(
    null,
  );
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<StaffTask | null>(null);

  const [taskForm, setTaskForm] = useState({
    templateId: "",
    assignedTo: "",
    petId: "",
    petName: "",
    dueDate: new Date().toISOString().split("T")[0],
    dueTime: "09:00",
    repeatPattern: "none" as StaffTask["repeatPattern"],
    notes: "",
  });

  const [templateForm, setTemplateForm] = useState({
    name: "",
    category: "general" as TaskTemplate["category"],
    description: "",
    estimatedMinutes: 30,
    requiresPhoto: false,
    priority: "medium" as TaskTemplate["priority"],
  });

  const [completionForm, setCompletionForm] = useState({
    notes: "",
    hasPhoto: false,
  });

  if (!facility) {
    return <div>Facility not found</div>;
  }

  const facilityTasks: StaffTask[] = staffTasks.filter(
    (t) => t.facility === "Paws & Play Daycare",
  ) as StaffTask[];
  const facilityTemplates: TaskTemplate[] = taskTemplates.filter(
    (t) => t.isActive,
  ) as TaskTemplate[];

  const today = new Date().toISOString().split("T")[0];
  const todayTasks = facilityTasks.filter((t) => t.dueDate === today);
  const pendingTasks = todayTasks.filter((t) => t.status === "pending");
  const completedTasks = todayTasks.filter((t) => t.status === "completed");
  const inProgressTasks = todayTasks.filter((t) => t.status === "in_progress");

  const handleAddTask = () => {
    setEditingTask(null);
    setTaskForm({
      templateId: "",
      assignedTo: "",
      petId: "",
      petName: "",
      dueDate: new Date().toISOString().split("T")[0],
      dueTime: "09:00",
      repeatPattern: "none",
      notes: "",
    });
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: StaffTask) => {
    setEditingTask(task);
    setTaskForm({
      templateId: task.templateId.toString(),
      assignedTo: task.assignedTo.toString(),
      petId: task.petId?.toString() || "",
      petName: task.petName || "",
      dueDate: task.dueDate,
      dueTime: task.dueTime || "09:00",
      repeatPattern: task.repeatPattern || "none",
      notes: task.notes || "",
    });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = () => {
    setIsTaskModalOpen(false);
  };

  const handleAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: "",
      category: "general",
      description: "",
      estimatedMinutes: 30,
      requiresPhoto: false,
      priority: "medium",
    });
    setIsTemplateModalOpen(true);
  };

  const handleEditTemplate = (template: TaskTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      category: template.category,
      description: template.description,
      estimatedMinutes: template.estimatedMinutes,
      requiresPhoto: template.requiresPhoto,
      priority: template.priority,
    });
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = () => {
    setIsTemplateModalOpen(false);
  };

  const handleCompleteTask = (task: StaffTask) => {
    setCompletingTask(task);
    setCompletionForm({ notes: "", hasPhoto: false });
    setIsCompleteModalOpen(true);
  };

  const handleSubmitCompletion = () => {
    setIsCompleteModalOpen(false);
    setCompletingTask(null);
  };

  const taskColumns: ColumnDef<StaffTask>[] = [
    {
      key: "templateName",
      label: "Task",
      icon: ClipboardList,
      defaultVisible: true,
      render: (task) => (
        <div className="flex flex-col">
          <span className="font-medium">{task.templateName}</span>
          {task.petName && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <PawPrint className="h-3 w-3" />
              {task.petName}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      defaultVisible: true,
      render: (task) => (
        <Badge className={categoryColors[task.category]} variant="secondary">
          {task.category}
        </Badge>
      ),
    },
    {
      key: "assignedToName",
      label: "Assigned To",
      icon: User,
      defaultVisible: true,
    },
    {
      key: "priority",
      label: "Priority",
      defaultVisible: true,
      render: (task) => (
        <Badge className={priorityColors[task.priority]} variant="secondary">
          {task.priority}
        </Badge>
      ),
    },
    {
      key: "dueTime",
      label: "Due Time",
      icon: Clock,
      defaultVisible: true,
      render: (task) => task.dueTime || "—",
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (task) => (
        <Badge className={statusColors[task.status]} variant="secondary">
          {task.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "requiresPhoto",
      label: "Photo",
      icon: Camera,
      defaultVisible: true,
      render: (task) =>
        task.requiresPhoto ? (
          <Camera className="h-4 w-4 text-muted-foreground" />
        ) : (
          "—"
        ),
    },
  ];

  const taskFilters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Status" },
        { value: "pending", label: "Pending" },
        { value: "in_progress", label: "In Progress" },
        { value: "completed", label: "Completed" },
        { value: "skipped", label: "Skipped" },
      ],
    },
    {
      key: "priority",
      label: "Priority",
      options: [
        { value: "all", label: "All Priorities" },
        { value: "urgent", label: "Urgent" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ],
    },
    {
      key: "category",
      label: "Category",
      options: [
        { value: "all", label: "All Categories" },
        { value: "boarding", label: "Boarding" },
        { value: "daycare", label: "Daycare" },
        { value: "cleaning", label: "Cleaning" },
        { value: "medication", label: "Medication" },
        { value: "grooming", label: "Grooming" },
        { value: "general", label: "General" },
      ],
    },
  ];

  const templateColumns: ColumnDef<TaskTemplate>[] = [
    {
      key: "name",
      label: "Template Name",
      icon: ClipboardList,
      defaultVisible: true,
    },
    {
      key: "category",
      label: "Category",
      defaultVisible: true,
      render: (template) => (
        <Badge
          className={categoryColors[template.category]}
          variant="secondary"
        >
          {template.category}
        </Badge>
      ),
    },
    {
      key: "description",
      label: "Description",
      defaultVisible: true,
      render: (template) => (
        <span className="text-sm text-muted-foreground line-clamp-1">
          {template.description}
        </span>
      ),
    },
    {
      key: "estimatedMinutes",
      label: "Est. Time",
      icon: Clock,
      defaultVisible: true,
      render: (template) => `${template.estimatedMinutes} min`,
    },
    {
      key: "priority",
      label: "Priority",
      defaultVisible: true,
      render: (template) => (
        <Badge
          className={priorityColors[template.priority]}
          variant="secondary"
        >
          {template.priority}
        </Badge>
      ),
    },
    {
      key: "requiresPhoto",
      label: "Photo Required",
      icon: Camera,
      defaultVisible: true,
      render: (template) => (template.requiresPhoto ? "Yes" : "No"),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Tasks
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              {pendingTasks.length} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <PlayCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressTasks.length}</div>
            <p className="text-xs text-muted-foreground">Being worked on</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              {todayTasks.length > 0
                ? `${Math.round((completedTasks.length / todayTasks.length) * 100)}% completion rate`
                : "No tasks today"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Task Templates
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facilityTemplates.length}</div>
            <p className="text-xs text-muted-foreground">Active templates</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Assigned Tasks and Templates */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="assigned">Assigned Tasks</TabsTrigger>
            <TabsTrigger value="templates">Task Templates</TabsTrigger>
          </TabsList>
          <div className="flex items-center space-x-2">
            {activeTab === "assigned" && (
              <Button onClick={handleAddTask}>
                <Plus className="mr-2 h-4 w-4" />
                Assign Task
              </Button>
            )}
            {activeTab === "templates" && (
              <Button onClick={handleAddTemplate}>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="assigned" className="space-y-4">
          <DataTable
            data={facilityTasks}
            columns={taskColumns}
            filters={taskFilters}
            searchKey="templateName"
            searchPlaceholder="Search tasks..."
            itemsPerPage={10}
            actions={(task) => (
              <div className="flex gap-2">
                {task.status === "pending" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCompleteTask(task)}
                    title="Mark as Complete"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditTask(task)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <DataTable
            data={facilityTemplates}
            columns={templateColumns}
            searchKey="name"
            searchPlaceholder="Search templates..."
            itemsPerPage={10}
            actions={(template) => (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTaskForm({
                      ...taskForm,
                      templateId: (template as TaskTemplate).id.toString(),
                    });
                    setIsTaskModalOpen(true);
                  }}
                  title="Create Task from Template"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditTemplate(template)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* Assign Task Modal */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Edit Task" : "Assign New Task"}
            </DialogTitle>
            <DialogDescription>
              {editingTask
                ? "Update task details and assignment."
                : "Create a new task from a template and assign it to a staff member."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template">Task Template *</Label>
              <Select
                value={taskForm.templateId}
                onValueChange={(value) =>
                  setTaskForm({ ...taskForm, templateId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {facilityTemplates.map((template) => (
                    <SelectItem
                      key={template.id}
                      value={template.id.toString()}
                    >
                      {template.name} ({template.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee">Assign To *</Label>
              <Select
                value={taskForm.assignedTo}
                onValueChange={(value) =>
                  setTaskForm({ ...taskForm, assignedTo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {exampleStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id.toString()}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="petName">Pet Name (Optional)</Label>
              <Input
                id="petName"
                value={taskForm.petName}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, petName: e.target.value })
                }
                placeholder="e.g., Buddy, Max"
              />
              <p className="text-xs text-muted-foreground">
                Associate this task with a specific pet
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, dueDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueTime">Due Time</Label>
                <Input
                  id="dueTime"
                  type="time"
                  value={taskForm.dueTime}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, dueTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repeat">Repeat Pattern</Label>
              <Select
                value={taskForm.repeatPattern}
                onValueChange={(value) =>
                  setTaskForm({
                    ...taskForm,
                    repeatPattern: value as BaseStaffTask["repeatPattern"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekdays">Weekdays Only</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={taskForm.notes}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, notes: e.target.value })
                }
                placeholder="Additional instructions..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTask}>
              {editingTask ? "Update Task" : "Assign Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Template Modal */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create Task Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Update the task template details."
                : "Create a reusable task template for common activities."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name *</Label>
              <Input
                id="templateName"
                value={templateForm.name}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, name: e.target.value })
                }
                placeholder="e.g., Morning Feeding"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={templateForm.category}
                onValueChange={(value: TaskTemplate["category"]) =>
                  setTemplateForm({ ...templateForm, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boarding">Boarding</SelectItem>
                  <SelectItem value="daycare">Daycare</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="grooming">Grooming</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={templateForm.description}
                onChange={(e) =>
                  setTemplateForm({
                    ...templateForm,
                    description: e.target.value,
                  })
                }
                placeholder="Describe what this task involves..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedMinutes">Est. Minutes *</Label>
                <Input
                  id="estimatedMinutes"
                  type="number"
                  min="1"
                  value={templateForm.estimatedMinutes}
                  onChange={(e) =>
                    setTemplateForm({
                      ...templateForm,
                      estimatedMinutes: parseInt(e.target.value) || 30,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select
                  value={templateForm.priority}
                  onValueChange={(value: TaskTemplate["priority"]) =>
                    setTemplateForm({ ...templateForm, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="requiresPhoto"
                checked={templateForm.requiresPhoto}
                onCheckedChange={(checked) =>
                  setTemplateForm({
                    ...templateForm,
                    requiresPhoto: !!checked,
                  })
                }
              />
              <Label htmlFor="requiresPhoto" className="font-normal">
                Require photo proof upon completion
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTemplateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              {editingTemplate ? "Update Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Task Modal */}
      <Dialog open={isCompleteModalOpen} onOpenChange={setIsCompleteModalOpen}>
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle>Complete Task</DialogTitle>
            <DialogDescription>
              Mark the selected task as completed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {completingTask?.requiresPhoto && (
              <div className="space-y-2">
                <Label>Photo Proof (Required)</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload photo proof
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="photoUpload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() =>
                      document.getElementById("photoUpload")?.click()
                    }
                  >
                    Upload Photo
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="completionNotes">Completion Notes</Label>
              <Textarea
                id="completionNotes"
                value={completionForm.notes}
                onChange={(e) =>
                  setCompletionForm({
                    ...completionForm,
                    notes: e.target.value,
                  })
                }
                placeholder="Any notes about task completion..."
                rows={3}
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium">Completion Details:</p>
              <ul className="mt-1 text-muted-foreground">
                <li>• Staff ID and initials will be recorded</li>
                <li>• Timestamp: {new Date().toLocaleString()}</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCompleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitCompletion}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
