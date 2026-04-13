"use client";

import { useState, useMemo } from "react";
import {
  Users,
  Plus,
  Edit2,
  MoreHorizontal,
  Search,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Clock,
  Building2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { toast } from "sonner";
import {
  scheduleEmployees as initialEmployees,
  departments,
  positions,
  getEmployeeScheduledHours,
} from "@/data/scheduling";
import type { ScheduleEmployee } from "@/types/scheduling";

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  inactive: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  onboarding: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  terminated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<ScheduleEmployee[]>(initialEmployees);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleEmployee | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDeptIds, setFormDeptIds] = useState<string[]>([]);
  const [formPosIds, setFormPosIds] = useState<string[]>([]);
  const [formMaxHours, setFormMaxHours] = useState("40");
  const [formType, setFormType] = useState<"full_time" | "part_time" | "contract">("full_time");

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (searchQuery && !e.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterDept !== "all" && !e.departmentIds.includes(filterDept)) return false;
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      return true;
    });
  }, [employees, searchQuery, filterDept, filterStatus]);

  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormDeptIds([departments[0]?.id || ""]);
    setFormPosIds([]);
    setFormMaxHours("40");
    setFormType("full_time");
    setDialogOpen(true);
  };

  const openEdit = (emp: ScheduleEmployee) => {
    setEditing(emp);
    setFormName(emp.name);
    setFormEmail(emp.email);
    setFormPhone(emp.phone);
    setFormDeptIds(emp.departmentIds);
    setFormPosIds(emp.positionIds);
    setFormMaxHours(emp.maxHoursPerWeek.toString());
    setFormType(emp.employmentType);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    const initials = formName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    if (editing) {
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === editing.id
            ? {
                ...e,
                name: formName,
                email: formEmail,
                phone: formPhone,
                initials,
                departmentIds: formDeptIds,
                positionIds: formPosIds,
                primaryPositionId: formPosIds[0] || e.primaryPositionId,
                maxHoursPerWeek: parseInt(formMaxHours) || 40,
                employmentType: formType,
              }
            : e,
        ),
      );
      toast.success("Employee updated");
    } else {
      const newEmp: ScheduleEmployee = {
        id: `emp-${Date.now()}`,
        name: formName,
        email: formEmail,
        phone: formPhone,
        initials,
        departmentIds: formDeptIds,
        positionIds: formPosIds,
        primaryPositionId: formPosIds[0] || "",
        hireDate: new Date().toISOString().split("T")[0],
        status: "active",
        maxHoursPerWeek: parseInt(formMaxHours) || 40,
        employmentType: formType,
        role: "Staff",
      };
      setEmployees((prev) => [...prev, newEmp]);
      toast.success("Employee added to schedule");
    }
    setDialogOpen(false);
  };

  // Current week date range for hours
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Employees</h2>
          <p className="text-muted-foreground text-sm">
            Manage employees, positions, and availability for scheduling
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 size-4" />
          Add Employee
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employees..."
            className="pl-9"
          />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-[170px]">
            <Building2 className="mr-1.5 size-3.5" />
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <Filter className="mr-1.5 size-3.5" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Employee Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((emp) => {
          const empDepts = departments.filter((d) => emp.departmentIds.includes(d.id));
          const empPositions = positions.filter((p) => emp.positionIds.includes(p.id));
          const weekHours = getEmployeeScheduledHours(emp.id, weekStartStr, weekEndStr);
          const isOverHours = weekHours > emp.maxHoursPerWeek;

          return (
            <Card key={emp.id} className="group transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-11 ring-2 ring-background shadow">
                      <AvatarImage src={emp.avatar} alt={emp.name} />
                      <AvatarFallback className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-sm font-semibold">
                        {emp.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{emp.name}</p>
                      <p className="text-muted-foreground text-xs">{emp.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${statusColors[emp.status]}`}>
                      {emp.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-6 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(emp)}>
                          <Edit2 className="mr-2 size-3.5" /> Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {/* Contact */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="size-3" /> {emp.email}
                    </span>
                  </div>

                  {/* Departments */}
                  <div className="flex flex-wrap gap-1">
                    {empDepts.map((d) => (
                      <Badge key={d.id} variant="outline" className="text-[10px]" style={{ borderColor: d.color, color: d.color }}>
                        {d.name}
                      </Badge>
                    ))}
                  </div>

                  {/* Positions */}
                  <div className="flex flex-wrap gap-1">
                    {empPositions.map((p) => (
                      <Badge key={p.id} variant="secondary" className="text-[10px] gap-1">
                        <div className="size-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </Badge>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 pt-1 border-t text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      <span className={isOverHours ? "text-red-600 font-medium" : ""}>
                        {weekHours.toFixed(1)}h
                      </span>
                      / {emp.maxHoursPerWeek}h
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" /> {emp.hireDate}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {emp.employmentType.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Full Name</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="John Doe" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="john@example.com" type="email" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+1-555-0100" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={formDeptIds[0] || ""} onValueChange={(v) => setFormDeptIds([v])}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Positions (select all that apply)</Label>
              <div className="flex flex-wrap gap-2">
                {positions
                  .filter((p) => formDeptIds.includes(p.departmentId))
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setFormPosIds((prev) =>
                          prev.includes(p.id)
                            ? prev.filter((id) => id !== p.id)
                            : [...prev, p.id],
                        );
                      }}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                        formPosIds.includes(p.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </button>
                  ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Employment Type</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as typeof formType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Max Hours/Week</Label>
                <Input type="number" value={formMaxHours} onChange={(e) => setFormMaxHours(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>{editing ? "Save" : "Add Employee"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
