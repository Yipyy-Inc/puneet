"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Users,
  MoreHorizontal,
  Palette,
  UserPlus,
  X,
  Search,
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  departments as initialDepts,
  scheduleEmployees as initialEmployees,
  getPositionsForDepartment,
} from "@/data/scheduling";
import type { Department, ScheduleEmployee } from "@/types/scheduling";

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
  const [employees, setEmployees] =
    useState<ScheduleEmployee[]>(initialEmployees);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(colorOptions[0]);

  const [manageDept, setManageDept] = useState<Department | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(
    new Set(),
  );
  const [employeeSearch, setEmployeeSearch] = useState("");

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q),
    );
  }, [employees, employeeSearch]);

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
    setEmployees((prev) =>
      prev.map((e) =>
        e.departmentIds.includes(id)
          ? {
              ...e,
              departmentIds: e.departmentIds.filter((d) => d !== id),
            }
          : e,
      ),
    );
    toast.success("Department deleted");
  };

  const openManageEmployees = (dept: Department) => {
    setManageDept(dept);
    setSelectedEmployeeIds(
      new Set(
        employees
          .filter((e) => e.departmentIds.includes(dept.id))
          .map((e) => e.id),
      ),
    );
    setEmployeeSearch("");
  };

  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeEmployeeFromDept = (deptId: string, empId: string) => {
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === empId
          ? {
              ...e,
              departmentIds: e.departmentIds.filter((d) => d !== deptId),
            }
          : e,
      ),
    );
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === deptId
          ? { ...d, employeeIds: d.employeeIds.filter((id) => id !== empId) }
          : d,
      ),
    );
    toast.success("Employee removed from department");
  };

  const handleSaveEmployees = () => {
    if (!manageDept) return;
    const deptId = manageDept.id;
    setEmployees((prev) =>
      prev.map((e) => {
        const shouldBeIn = selectedEmployeeIds.has(e.id);
        const isIn = e.departmentIds.includes(deptId);
        if (shouldBeIn && !isIn) {
          return { ...e, departmentIds: [...e.departmentIds, deptId] };
        }
        if (!shouldBeIn && isIn) {
          return {
            ...e,
            departmentIds: e.departmentIds.filter((d) => d !== deptId),
          };
        }
        return e;
      }),
    );
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === deptId
          ? { ...d, employeeIds: Array.from(selectedEmployeeIds) }
          : d,
      ),
    );
    toast.success(`Employees updated for ${manageDept.name}`);
    setManageDept(null);
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
          const deptEmployees = employees.filter((e) =>
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
                        onClick={() => openManageEmployees(dept)}
                      >
                        <UserPlus className="mr-2 size-3.5" />
                        Manage Employees
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
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
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Users className="text-muted-foreground size-3.5" />
                      <span className="text-sm font-medium">
                        {deptEmployees.length}
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => openManageEmployees(dept)}
                  >
                    <UserPlus className="mr-1.5 size-3.5" />
                    Manage
                  </Button>
                </div>

                {/* Employee Chips */}
                {deptEmployees.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {deptEmployees.slice(0, 6).map((emp) => (
                      <div
                        key={emp.id}
                        className="group/chip bg-muted/50 hover:bg-muted flex items-center gap-1.5 rounded-full py-0.5 pr-1 pl-0.5 text-xs transition-colors"
                      >
                        <Avatar className="size-5">
                          <AvatarImage src={emp.avatar} alt={emp.name} />
                          <AvatarFallback
                            className="text-[8px] font-medium"
                            style={{
                              backgroundColor: `${dept.color}25`,
                              color: dept.color,
                            }}
                          >
                            {emp.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="max-w-[80px] truncate">
                          {emp.name.split(" ")[0]}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeEmployeeFromDept(dept.id, emp.id)}
                          className="hover:bg-destructive/15 hover:text-destructive text-muted-foreground flex size-4 items-center justify-center rounded-full opacity-0 transition-opacity group-hover/chip:opacity-100"
                          aria-label={`Remove ${emp.name}`}
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                    {deptEmployees.length > 6 && (
                      <div className="bg-muted text-muted-foreground flex items-center rounded-full px-2 py-0.5 text-[10px]">
                        +{deptEmployees.length - 6} more
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs italic">
                    No employees assigned
                  </p>
                )}
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

      {/* Manage Employees Dialog */}
      <Dialog
        open={!!manageDept}
        onOpenChange={(open) => !open && setManageDept(null)}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {manageDept && (
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: manageDept.color }}
                />
              )}
              Manage Employees
            </DialogTitle>
            <DialogDescription>
              {manageDept
                ? `Select employees to assign to ${manageDept.name}.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search employees..."
                className="pl-8"
              />
            </div>
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>{selectedEmployeeIds.size} selected</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() =>
                    setSelectedEmployeeIds(
                      new Set(filteredEmployees.map((e) => e.id)),
                    )
                  }
                >
                  Select all
                </button>
                <span>·</span>
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() => setSelectedEmployeeIds(new Set())}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="max-h-[320px] space-y-1 overflow-y-auto rounded-md border p-1">
              {filteredEmployees.length === 0 ? (
                <p className="text-muted-foreground p-4 text-center text-sm">
                  No employees match your search.
                </p>
              ) : (
                filteredEmployees.map((emp) => {
                  const checked = selectedEmployeeIds.has(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-md p-2"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleEmployee(emp.id)}
                      />
                      <Avatar className="size-7">
                        <AvatarImage src={emp.avatar} alt={emp.name} />
                        <AvatarFallback className="text-[10px] font-medium">
                          {emp.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {emp.name}
                        </div>
                        <div className="text-muted-foreground truncate text-xs">
                          {emp.role}
                        </div>
                      </div>
                      {emp.departmentIds.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {emp.departmentIds.length} dept
                          {emp.departmentIds.length === 1 ? "" : "s"}
                        </Badge>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageDept(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEmployees}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
