"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, DollarSign, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  positions as initialPositions,
  departments,
  scheduleEmployees,
} from "@/data/scheduling";
import type { Position } from "@/types/scheduling";

const colorOptions = [
  "#818cf8",
  "#34d399",
  "#f472b6",
  "#fbbf24",
  "#f97316",
  "#a78bfa",
  "#2dd4bf",
  "#fb923c",
  "#6366f1",
  "#ec4899",
];

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>(initialPositions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || "");
  const [payType, setPayType] = useState<"hourly" | "salary">("hourly");
  const [hourlyRate, setHourlyRate] = useState("");
  const [salary, setSalary] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(colorOptions[0]);
  const [filterDept, setFilterDept] = useState<string>("all");

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDepartmentId(
      filterDept !== "all" ? filterDept : departments[0]?.id || "",
    );
    setPayType("hourly");
    setHourlyRate("");
    setSalary("");
    setDescription("");
    setColor(colorOptions[0]);
    setDialogOpen(true);
  };

  const openEdit = (pos: Position) => {
    setEditing(pos);
    setName(pos.name);
    setDepartmentId(pos.departmentId);
    setPayType(pos.payType);
    setHourlyRate(pos.hourlyRate?.toString() || "");
    setSalary(pos.salary?.toString() || "");
    setDescription(pos.description || "");
    setColor(pos.color);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim() || !departmentId) return;
    if (editing) {
      setPositions((prev) =>
        prev.map((p) =>
          p.id === editing.id
            ? {
                ...p,
                name,
                departmentId,
                payType,
                hourlyRate:
                  payType === "hourly"
                    ? parseFloat(hourlyRate) || undefined
                    : undefined,
                salary:
                  payType === "salary"
                    ? parseFloat(salary) || undefined
                    : undefined,
                description,
                color,
              }
            : p,
        ),
      );
      toast.success("Position updated");
    } else {
      const newPos: Position = {
        id: `pos-${Date.now()}`,
        name,
        departmentId,
        payType,
        hourlyRate:
          payType === "hourly"
            ? parseFloat(hourlyRate) || undefined
            : undefined,
        salary:
          payType === "salary" ? parseFloat(salary) || undefined : undefined,
        description,
        color,
        isActive: true,
      };
      setPositions((prev) => [...prev, newPos]);
      toast.success("Position created");
    }
    setDialogOpen(false);
  };

  const filteredPositions =
    filterDept === "all"
      ? positions
      : positions.filter((p) => p.departmentId === filterDept);

  const groupedByDept = departments.map((dept) => ({
    ...dept,
    positions: filteredPositions.filter((p) => p.departmentId === dept.id),
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Positions</h2>
          <p className="text-muted-foreground text-sm">
            Define roles with pay rates for labor cost tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="size-2 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    {d.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 size-4" />
            Add Position
          </Button>
        </div>
      </div>

      {/* Position Cards by Department */}
      {groupedByDept
        .filter((g) => g.positions.length > 0)
        .map((group) => (
          <div key={group.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="size-2.5 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <h3 className="text-sm font-semibold">{group.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {group.positions.length}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.positions.map((pos) => {
                const empCount = scheduleEmployees.filter((e) =>
                  e.positionIds.includes(pos.id),
                ).length;

                return (
                  <Card
                    key={pos.id}
                    className="group transition-shadow hover:shadow-md"
                  >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="size-3 rounded-full"
                          style={{ backgroundColor: pos.color }}
                        />
                        <CardTitle className="text-sm">{pos.name}</CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(pos)}>
                            <Edit2 className="mr-2 size-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setPositions((prev) =>
                                prev.filter((p) => p.id !== pos.id),
                              );
                              toast.success("Position deleted");
                            }}
                          >
                            <Trash2 className="mr-2 size-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {pos.description && (
                        <p className="text-muted-foreground text-xs">
                          {pos.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="gap-1 text-xs">
                          <DollarSign className="size-2.5" />
                          {pos.payType === "hourly"
                            ? `$${pos.hourlyRate?.toFixed(2)}/hr`
                            : `$${(pos.salary || 0).toLocaleString()}/yr`}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {empCount} staff
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Position" : "Create Position"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Position Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Receptionist"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
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
              <Label>Pay Type</Label>
              <Select
                value={payType}
                onValueChange={(v) => setPayType(v as "hourly" | "salary")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {payType === "hourly" ? (
              <div className="space-y-1.5">
                <Label>Hourly Rate ($)</Label>
                <Input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="18.50"
                  step="0.50"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Annual Salary ($)</Label>
                <Input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="55000"
                />
              </div>
            )}
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
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    className={`size-6 rounded-full transition-transform hover:scale-110 ${color === c ? "ring-2 ring-offset-2" : ""}`}
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
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
