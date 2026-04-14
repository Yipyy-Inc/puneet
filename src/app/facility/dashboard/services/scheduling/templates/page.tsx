"use client";

import { useState } from "react";
import {
  Plus,
  Copy,
  Trash2,
  MoreHorizontal,
  Calendar,
  Clock,
  Users,
  Upload,
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  scheduleTemplates as initialTemplates,
  departments,
} from "@/data/scheduling";
import type { ScheduleTemplate } from "@/types/scheduling";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TemplatesPage() {
  const [templates, setTemplates] =
    useState<ScheduleTemplate[]>(initialTemplates);
  const [createOpen, setCreateOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ScheduleTemplate | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDeptId, setNewDeptId] = useState(departments[0]?.id || "");

  const handleCreate = () => {
    if (!newName.trim()) return;
    const tmpl: ScheduleTemplate = {
      id: `tmpl-${Date.now()}`,
      name: newName,
      departmentId: newDeptId,
      description: newDescription,
      shifts: [],
      createdAt: new Date().toISOString().split("T")[0],
      createdBy: "emp-1",
    };
    setTemplates((prev) => [...prev, tmpl]);
    setCreateOpen(false);
    setNewName("");
    setNewDescription("");
    toast.success("Template created. Add shifts from the main schedule view.");
  };

  const handleDelete = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success("Template deleted");
  };

  const handleDuplicate = (tmpl: ScheduleTemplate) => {
    const dup: ScheduleTemplate = {
      ...tmpl,
      id: `tmpl-${Date.now()}`,
      name: `${tmpl.name} (Copy)`,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setTemplates((prev) => [...prev, dup]);
    toast.success("Template duplicated");
  };

  const handleApply = () => {
    if (!selectedTemplate) return;
    toast.success(
      `Template "${selectedTemplate.name}" applied as draft shifts. Review and publish when ready.`,
    );
    setApplyOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Schedule Templates
          </h2>
          <p className="text-muted-foreground text-sm">
            Save and reuse schedule patterns for holidays, seasons, and regular
            weeks
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          New Template
        </Button>
      </div>

      {/* Template Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((tmpl) => {
          const dept = departments.find((d) => d.id === tmpl.departmentId);
          const uniqueEmployees = new Set(tmpl.shifts.map((s) => s.employeeId))
            .size;
          const uniqueDays = new Set(tmpl.shifts.map((s) => s.dayOfWeek)).size;

          return (
            <Card
              key={tmpl.id}
              className="group transition-shadow hover:shadow-lg"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{tmpl.name}</CardTitle>
                    {tmpl.description && (
                      <CardDescription className="mt-0.5 text-xs">
                        {tmpl.description}
                      </CardDescription>
                    )}
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
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedTemplate(tmpl);
                          setApplyOpen(true);
                        }}
                      >
                        <Upload className="mr-2 size-3.5" /> Apply to Schedule
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(tmpl)}>
                        <Copy className="mr-2 size-3.5" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(tmpl.id)}
                      >
                        <Trash2 className="mr-2 size-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  {dept && (
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{ borderColor: dept.color, color: dept.color }}
                    >
                      {dept.name}
                    </Badge>
                  )}
                  <span className="text-muted-foreground text-xs">
                    Created {tmpl.createdAt}
                  </span>
                </div>

                <div className="text-muted-foreground flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {tmpl.shifts.length} shifts
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="size-3" />
                    {uniqueEmployees} employees
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {uniqueDays} days
                  </span>
                </div>

                {/* Day dots */}
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                    const hasShifts = tmpl.shifts.some(
                      (s) => s.dayOfWeek === day,
                    );
                    return (
                      <div
                        key={day}
                        className={`flex size-7 items-center justify-center rounded-sm text-[10px] font-medium ${
                          hasShifts
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {dayNames[day]}
                      </div>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSelectedTemplate(tmpl);
                    setApplyOpen(true);
                  }}
                >
                  <Upload className="mr-1.5 size-3.5" />
                  Apply to Schedule
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
            <DialogDescription>
              Create a new schedule template. You can populate it with shifts
              later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Template Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Holiday Schedule"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={newDeptId} onValueChange={setNewDeptId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Describe when to use this template..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Apply Template</DialogTitle>
            <DialogDescription>
              This will add all shifts from &quot;{selectedTemplate?.name}&quot;
              as draft shifts to the current schedule period. You can review and
              modify them before publishing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>Apply as Draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
