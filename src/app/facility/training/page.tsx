"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Plus,
  MoreHorizontal,
  GraduationCap,
  User,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Progress } from "@/components/ui/progress";
import {
  trainingClasses,
  trainers,
  getTrainingStats,
  dayNames,
  type TrainingClass,
} from "@/data/training";

type TrainingClassWithRecord = TrainingClass & Record<string, unknown>;

export default function TrainingClassesPage() {
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<TrainingClass | null>(null);
  const [viewMode, setViewMode] = useState<"schedule" | "list">("schedule");
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trainerId: "",
    classType: "group" as "group" | "private",
    skillLevel: "beginner" as "beginner" | "intermediate" | "advanced",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:00",
    capacity: 8,
    price: 200,
    location: "",
    totalSessions: 6,
  });

  const stats = getTrainingStats();

  const handleAddNew = () => {
    setEditingClass(null);
    setFormData({
      name: "",
      description: "",
      trainerId: "",
      classType: "group",
      skillLevel: "beginner",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:00",
      capacity: 8,
      price: 200,
      location: "",
      totalSessions: 6,
    });
    setIsAddEditModalOpen(true);
  };

  const handleEdit = (trainingClass: TrainingClass) => {
    setEditingClass(trainingClass);
    setFormData({
      name: trainingClass.name,
      description: trainingClass.description,
      trainerId: trainingClass.trainerId,
      classType: trainingClass.classType,
      skillLevel: trainingClass.skillLevel,
      dayOfWeek: trainingClass.dayOfWeek,
      startTime: trainingClass.startTime,
      endTime: trainingClass.endTime,
      capacity: trainingClass.capacity,
      price: trainingClass.price,
      location: trainingClass.location,
      totalSessions: trainingClass.totalSessions,
    });
    setIsAddEditModalOpen(true);
  };

  const handleSave = () => {
    // In a real app, this would save to the backend
    setIsAddEditModalOpen(false);
  };

  const getSkillLevelVariant = (level: string) => {
    switch (level) {
      case "beginner":
        return "default";
      case "intermediate":
        return "secondary";
      case "advanced":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getCapacityColor = (enrolled: number, capacity: number) => {
    const ratio = enrolled / capacity;
    if (ratio >= 1) return "text-red-500";
    if (ratio >= 0.75) return "text-yellow-500";
    return "text-green-500";
  };

  const columns: ColumnDef<TrainingClassWithRecord>[] = [
    {
      key: "name",
      label: "Class Name",
      icon: GraduationCap,
      defaultVisible: true,
    },
    {
      key: "trainerName",
      label: "Trainer",
      icon: User,
      defaultVisible: true,
    },
    {
      key: "dayOfWeek",
      label: "Day",
      icon: Calendar,
      defaultVisible: true,
      render: (item) => dayNames[item.dayOfWeek as number],
    },
    {
      key: "startTime",
      label: "Time",
      icon: Clock,
      defaultVisible: true,
      render: (item) => `${item.startTime} - ${item.endTime}`,
    },
    {
      key: "skillLevel",
      label: "Level",
      defaultVisible: true,
      render: (item) => (
        <Badge variant={getSkillLevelVariant(item.skillLevel as string)}>
          {(item.skillLevel as string).charAt(0).toUpperCase() +
            (item.skillLevel as string).slice(1)}
        </Badge>
      ),
    },
    {
      key: "capacity",
      label: "Capacity",
      icon: Users,
      defaultVisible: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <span
            className={getCapacityColor(
              item.enrolledCount as number,
              item.capacity as number,
            )}
          >
            {item.enrolledCount}/{item.capacity}
          </span>
          <Progress
            value={
              ((item.enrolledCount as number) / (item.capacity as number)) * 100
            }
            className="w-16 h-2"
          />
        </div>
      ),
    },
    {
      key: "price",
      label: "Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (item) => `$${item.price}`,
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (item) => (
        <Badge variant={item.status === "active" ? "default" : "secondary"}>
          {(item.status as string).charAt(0).toUpperCase() +
            (item.status as string).slice(1)}
        </Badge>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "skillLevel",
      label: "Skill Level",
      options: [
        { value: "all", label: "All Levels" },
        { value: "beginner", label: "Beginner" },
        { value: "intermediate", label: "Intermediate" },
        { value: "advanced", label: "Advanced" },
      ],
    },
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
  ];

  const classesByDay = trainingClasses.filter(
    (c) => c.dayOfWeek === selectedDay && c.status === "active",
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Classes
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeClasses}</div>
            <p className="text-xs text-muted-foreground">
              Running this session
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Enrollments
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
            <p className="text-xs text-muted-foreground">Active students</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Capacity Utilization
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.capacityUtilization}%
            </div>
            <Progress value={stats.capacityUtilization} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Trainers
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTrainers}</div>
            <p className="text-xs text-muted-foreground">Available trainers</p>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "schedule" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("schedule")}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule View
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <Users className="h-4 w-4 mr-2" />
            List View
          </Button>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Class
        </Button>
      </div>

      {/* Schedule View */}
      {viewMode === "schedule" && (
        <div className="space-y-4">
          {/* Day Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dayNames.map((day, index) => (
              <Button
                key={day}
                variant={selectedDay === index ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDay(index)}
                className="min-w-[100px]"
              >
                {day}
              </Button>
            ))}
          </div>

          {/* Classes for Selected Day */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classesByDay.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No classes scheduled for {dayNames[selectedDay]}
                  </p>
                </CardContent>
              </Card>
            ) : (
              classesByDay
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((trainingClass) => (
                  <Card key={trainingClass.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {trainingClass.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {trainingClass.trainerName}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEdit(trainingClass)}
                            >
                              Edit Class
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              View Enrollments
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Cancel Class
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {trainingClass.startTime} - {trainingClass.endTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {trainingClass.location}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={getSkillLevelVariant(
                            trainingClass.skillLevel,
                          )}
                        >
                          {trainingClass.skillLevel.charAt(0).toUpperCase() +
                            trainingClass.skillLevel.slice(1)}
                        </Badge>
                        <Badge variant="outline">
                          {trainingClass.classType === "group"
                            ? "Group"
                            : "Private"}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Capacity
                          </span>
                          <span
                            className={getCapacityColor(
                              trainingClass.enrolledCount,
                              trainingClass.capacity,
                            )}
                          >
                            {trainingClass.enrolledCount} /{" "}
                            {trainingClass.capacity} enrolled
                          </span>
                        </div>
                        <Progress
                          value={
                            (trainingClass.enrolledCount /
                              trainingClass.capacity) *
                            100
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-lg font-semibold">
                          ${trainingClass.price}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {trainingClass.totalSessions} sessions
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <DataTable
          data={trainingClasses as TrainingClassWithRecord[]}
          columns={columns}
          filters={filters}
          searchKey="name"
          searchPlaceholder="Search classes..."
          actions={(item) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleEdit(item as TrainingClass)}
                >
                  Edit Class
                </DropdownMenuItem>
                <DropdownMenuItem>View Enrollments</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  {item.status === "active" ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      {/* Add/Edit Class Modal */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClass ? "Edit Class" : "Add New Class"}
            </DialogTitle>
            <DialogDescription>
              {editingClass
                ? "Update the class details below."
                : "Fill in the details to create a new training class."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Class Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Puppy Kindergarten"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of the class..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="trainer">Trainer</Label>
                <Select
                  value={formData.trainerId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, trainerId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trainer" />
                  </SelectTrigger>
                  <SelectContent>
                    {trainers
                      .filter((t) => t.status === "active")
                      .map((trainer) => (
                        <SelectItem key={trainer.id} value={trainer.id}>
                          {trainer.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="classType">Class Type</Label>
                <Select
                  value={formData.classType}
                  onValueChange={(value: "group" | "private") =>
                    setFormData({ ...formData, classType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="skillLevel">Skill Level</Label>
                <Select
                  value={formData.skillLevel}
                  onValueChange={(
                    value: "beginner" | "intermediate" | "advanced",
                  ) => setFormData({ ...formData, skillLevel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dayOfWeek">Day of Week</Label>
                <Select
                  value={formData.dayOfWeek.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, dayOfWeek: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayNames.map((day, index) => (
                      <SelectItem key={day} value={index.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="e.g., Training Room A"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="totalSessions">Total Sessions</Label>
                <Input
                  id="totalSessions"
                  type="number"
                  min={1}
                  value={formData.totalSessions}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalSessions: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingClass ? "Save Changes" : "Create Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
