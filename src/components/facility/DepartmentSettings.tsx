"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Building2, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useFacilityViewer } from "@/hooks/use-facility-rbac";
import { departments, staffSkills } from "@/data/shifts";

const COLOR_OPTIONS = [
  { value: "blue", label: "Blue", dot: "bg-blue-500" },
  { value: "emerald", label: "Green", dot: "bg-emerald-500" },
  { value: "purple", label: "Purple", dot: "bg-purple-500" },
  { value: "amber", label: "Amber", dot: "bg-amber-500" },
  { value: "orange", label: "Orange", dot: "bg-orange-500" },
  { value: "red", label: "Red", dot: "bg-red-500" },
  { value: "teal", label: "Teal", dot: "bg-teal-500" },
  { value: "pink", label: "Pink", dot: "bg-pink-500" },
  { value: "slate", label: "Gray", dot: "bg-slate-500" },
];

let _deptId = 700;

export function DepartmentSettings() {
  const { viewer } = useFacilityViewer();
  const role = viewer.primaryRole;
  const [depts, setDepts] = useState(departments);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("blue");

  const handleSave = () => {
    // Update the global departments array
    departments.length = 0;
    departments.push(...depts);
    toast.success("Departments saved");
  };

  if (role !== "owner" && role !== "manager") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8">
          <Shield className="text-muted-foreground size-5" />
          <p className="text-muted-foreground text-sm">
            Department settings are only accessible to facility owners and
            managers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Building2 className="size-4" />
            Facility Departments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {depts.map((dept, idx) => {
            const colorDot =
              COLOR_OPTIONS.find((c) => c.value === dept.color)?.dot ??
              "bg-slate-500";
            const staffCount = staffSkills.filter(
              (s) => s.departmentId === dept.id,
            ).length;
            return (
              <div
                key={dept.id}
                className="bg-background flex items-center gap-4 rounded-xl border px-4 py-3"
              >
                <div className={cn("size-3 shrink-0 rounded-full", colorDot)} />
                <Input
                  value={dept.name}
                  onChange={(e) => {
                    const next = [...depts];
                    next[idx] = { ...dept, name: e.target.value };
                    setDepts(next);
                  }}
                  className="h-7 w-48 shrink-0 border-0 bg-transparent p-0 text-sm font-medium shadow-none focus-visible:ring-0"
                />
                <Input
                  value={dept.description ?? ""}
                  onChange={(e) => {
                    const next = [...depts];
                    next[idx] = { ...dept, description: e.target.value };
                    setDepts(next);
                  }}
                  placeholder="Description..."
                  className="text-muted-foreground h-7 flex-1 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                />
                <div className="flex shrink-0 items-center gap-3 pl-2">
                  <Select
                    value={dept.color}
                    onValueChange={(v) => {
                      const next = [...depts];
                      next[idx] = { ...dept, color: v };
                      setDepts(next);
                    }}
                  >
                    <SelectTrigger className="h-8 w-28 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={cn(
                            "size-2.5 rounded-full",
                            COLOR_OPTIONS.find((c) => c.value === dept.color)
                              ?.dot,
                          )}
                        />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn("size-2.5 rounded-full", c.dot)}
                            />
                            {c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground flex w-10 items-center justify-center gap-1 text-xs tabular-nums">
                    <Users className="size-3.5" />
                    {staffCount}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive size-8 p-0"
                    onClick={() => {
                      if (staffCount > 0) {
                        toast.error(
                          `${dept.name} has ${staffCount} staff — reassign them first`,
                        );
                        return;
                      }
                      setDepts(depts.filter((_, i) => i !== idx));
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          <div className="flex gap-2 pt-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New department name..."
              className="h-8 flex-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) {
                  _deptId += 1;
                  setDepts([
                    ...depts,
                    {
                      id: `dept-${_deptId}`,
                      name: newName.trim(),
                      color: newColor,
                    },
                  ]);
                  setNewName("");
                }
              }}
            />
            <Select value={newColor} onValueChange={setNewColor}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "size-2.5 rounded-full",
                      COLOR_OPTIONS.find((c) => c.value === newColor)?.dot,
                    )}
                  />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {COLOR_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn("size-2.5 rounded-full", c.dot)} />
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              disabled={!newName.trim()}
              onClick={() => {
                _deptId += 1;
                setDepts([
                  ...depts,
                  {
                    id: `dept-${_deptId}`,
                    name: newName.trim(),
                    color: newColor,
                  },
                ]);
                setNewName("");
              }}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-1.5">
          Save Departments
        </Button>
      </div>
    </div>
  );
}
