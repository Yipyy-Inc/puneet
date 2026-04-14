"use client";

import { useState } from "react";
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Users,
  MoreHorizontal,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  departments as initialDepts,
  scheduleEmployees,
  getPositionsForDepartment,
} from "@/data/scheduling";
import type { Department } from "@/types/scheduling";

const colorOptions = [
  "#6366f1",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#e11d48",
];

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>(initialDepts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(colorOptions[0]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setColor(colorOptions[0]);
    setDialogOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setName(dept.name);
    setDescription(dept.description || "");
    setColor(dept.color);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editing) {
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === editing.id ? { ...d, name, description, color } : d,
        ),
      );
      toast.success("Department updated");
    } else {
      const newDept: Department = {
        id: `dept-${Date.now()}`,
        name,
        facilityId: 1,
        color,
        description,
        employeeIds: [],
        isActive: true,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setDepartments((prev) => [...prev, newDept]);
      toast.success("Department created");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setDepartments((prev) => prev.filter((d) => d.id !== id));
    toast.success("Department deleted");
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Departments</h2>
          <p className="text-muted-foreground text-sm">
            Manage departments and locations for scheduling
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 size-4" />
          Add Department
        </Button>
      </div>

      {/* Department Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => {
          const employees = scheduleEmployees.filter((e) =>
            e.departmentIds.includes(dept.id),
          );
          const positions = getPositionsForDepartment(dept.id);

          return (
            <Card
              key={dept.id}
              className="group relative overflow-hidden transition-shadow hover:shadow-lg"
            >
              {/* Color stripe */}
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: dept.color }}
              />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${dept.color}20` }}
                    >
                      <Building2
                        className="size-5"
                        style={{ color: dept.color }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base">{dept.name}</CardTitle>
                      {dept.description && (
                        <CardDescription className="mt-0.5 text-xs">
                          {dept.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(dept)}>
                        <Edit2 className="mr-2 size-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(dept.id)}
                      >
                        <Trash2 className="mr-2 size-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Users className="text-muted-foreground size-3.5" />
                    <span className="text-sm font-medium">
                      {employees.length}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      employees
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {positions.length} positions
                    </Badge>
                  </div>
                </div>

                {/* Employee Avatars */}
                <div className="flex -space-x-2">
                  {employees.slice(0, 5).map((emp) => (
                    <Avatar
                      key={emp.id}
                      className="ring-background size-7 ring-2"
                    >
                      <AvatarImage src={emp.avatar} alt={emp.name} />
                      <AvatarFallback
                        className="text-[9px] font-medium"
                        style={{
                          backgroundColor: `${dept.color}25`,
                          color: dept.color,
                        }}
                      >
                        {emp.initials}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {employees.length > 5 && (
                    <div className="ring-background bg-muted flex size-7 items-center justify-center rounded-full ring-2">
                      <span className="text-muted-foreground text-[9px]">
                        +{employees.length - 5}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Department" : "Create Department"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Doggieville MTL"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Palette className="size-3" /> Color
              </Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    className={`size-7 rounded-full transition-transform hover:scale-110 ${color === c ? "ring-2 ring-offset-2" : ""}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {editing ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
