"use client";

import { useState, useMemo } from "react";
import {
  Shield,
  Plus,
  AlertTriangle,
  Search,
  MoreHorizontal,
  Edit2,
  MessageSquare,
  Calendar,
  User,
  CheckCircle2,
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
import { Textarea } from "@/components/ui/textarea";
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
  employeeWarnings as initialWarnings,
  departments,
  scheduleEmployees,
} from "@/data/scheduling";
import type { EmployeeWarning } from "@/types/scheduling";

const typeColors: Record<string, { bg: string; text: string; label: string }> = {
  verbal: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", label: "Verbal Warning" },
  written: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", label: "Written Warning" },
  final: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Final Warning" },
  suspension: { bg: "bg-red-200 dark:bg-red-900/50", text: "text-red-800 dark:text-red-300", label: "Suspension" },
  termination: { bg: "bg-red-300 dark:bg-red-900/70", text: "text-red-900 dark:text-red-200", label: "Termination" },
  custom: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-400", label: "Custom" },
};

const statusLabels: Record<string, string> = {
  issued: "Issued",
  acknowledged: "Acknowledged",
  appealed: "Appealed",
  resolved: "Resolved",
};

export default function WarningsPage() {
  const [warnings, setWarnings] = useState<EmployeeWarning[]>(initialWarnings);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formType, setFormType] = useState<string>("verbal");
  const [formReason, setFormReason] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formWitness, setFormWitness] = useState("");

  const filtered = useMemo(() => {
    if (!searchQuery) return warnings;
    const q = searchQuery.toLowerCase();
    return warnings.filter(
      (w) =>
        w.employeeName.toLowerCase().includes(q) ||
        w.reason.toLowerCase().includes(q),
    );
  }, [warnings, searchQuery]);

  const handleCreate = () => {
    if (!formEmployeeId || !formReason.trim()) return;
    const emp = scheduleEmployees.find((e) => e.id === formEmployeeId);
    const warning: EmployeeWarning = {
      id: `warn-${Date.now()}`,
      employeeId: formEmployeeId,
      employeeName: emp?.name || "",
      type: formType as EmployeeWarning["type"],
      reason: formReason,
      description: formDescription,
      managerNotes: formNotes,
      issuedBy: "emp-1",
      issuedByName: "Sarah Johnson",
      issuedAt: new Date().toISOString().split("T")[0],
      witnessName: formWitness || undefined,
      status: "issued",
      departmentId: emp?.departmentIds[0] || "",
    };
    setWarnings((prev) => [warning, ...prev]);
    setDialogOpen(false);
    resetForm();
    toast.success("Warning issued");
  };

  const resetForm = () => {
    setFormEmployeeId("");
    setFormType("verbal");
    setFormReason("");
    setFormDescription("");
    setFormNotes("");
    setFormWitness("");
  };

  const handleAcknowledge = (id: string) => {
    setWarnings((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              status: "acknowledged" as const,
              acknowledgedAt: new Date().toISOString().split("T")[0],
            }
          : w,
      ),
    );
    toast.success("Warning marked as acknowledged");
  };

  // Count by employee
  const warningsByEmployee = useMemo(() => {
    const counts = new Map<string, number>();
    warnings.forEach((w) => {
      counts.set(w.employeeId, (counts.get(w.employeeId) || 0) + 1);
    });
    return counts;
  }, [warnings]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Employee Warnings & Discipline
          </h2>
          <p className="text-muted-foreground text-sm">
            Track verbal, written, and final warnings with manager notes and
            witness records
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1.5 size-4" />
          Issue Warning
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by employee or reason..."
          className="pl-9"
        />
      </div>

      {/* Warning Cards */}
      <div className="space-y-3">
        {filtered.map((warn) => {
          const emp = scheduleEmployees.find(
            (e) => e.id === warn.employeeId,
          );
          const typeInfo = typeColors[warn.type] || typeColors.custom;
          const dept = departments.find((d) => d.id === warn.departmentId);
          const totalWarnings = warningsByEmployee.get(warn.employeeId) || 0;

          return (
            <Card
              key={warn.id}
              className="group transition-shadow hover:shadow-md"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="size-10 ring-2 ring-background shadow">
                    <AvatarImage src={emp?.avatar} alt={emp?.name} />
                    <AvatarFallback className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold">
                      {emp?.initials || "??"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{warn.employeeName}</p>
                      <Badge className={`text-[10px] ${typeInfo.bg} ${typeInfo.text}`}>
                        {typeInfo.label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                      >
                        {statusLabels[warn.status]}
                      </Badge>
                      {totalWarnings >= 3 && (
                        <Badge className="bg-red-100 text-red-700 text-[10px] dark:bg-red-900/30 dark:text-red-400">
                          <AlertTriangle className="mr-0.5 size-2.5" />
                          {totalWarnings} warnings
                        </Badge>
                      )}
                    </div>

                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      {warn.reason}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {warn.description}
                    </p>

                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" /> {warn.issuedAt}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="size-3" /> Issued by {warn.issuedByName}
                      </span>
                      {warn.witnessName && (
                        <span className="flex items-center gap-1">
                          <User className="size-3" /> Witness: {warn.witnessName}
                        </span>
                      )}
                    </div>

                    {warn.managerNotes && (
                      <div className="mt-2 rounded-md bg-muted/50 px-3 py-2">
                        <p className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-0.5">
                          <MessageSquare className="size-2.5" /> Manager Notes
                        </p>
                        <p className="text-xs">{warn.managerNotes}</p>
                      </div>
                    )}
                  </div>

                  {warn.status === "issued" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcknowledge(warn.id)}
                    >
                      <CheckCircle2 className="mr-1 size-3.5" />
                      Acknowledge
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-muted-foreground flex flex-col items-center py-12 text-center">
            <Shield className="mb-3 size-10 opacity-30" />
            <p className="font-medium">No warnings recorded</p>
            <p className="text-sm">
              Employee warnings and disciplinary actions will appear here
            </p>
          </div>
        )}
      </div>

      {/* Issue Warning Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Issue Warning</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={formEmployeeId} onValueChange={setFormEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {scheduleEmployees.filter((e) => e.status === "active").map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Warning Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeColors).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={formReason} onChange={(e) => setFormReason(e.target.value)} placeholder="e.g., Tardiness, Policy violation" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Detailed description of the incident..." rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Manager Notes</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Internal notes, action items, follow-up..." rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Witness (optional)</Label>
              <Input value={formWitness} onChange={(e) => setFormWitness(e.target.value)} placeholder="Witness name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formEmployeeId || !formReason.trim()} className="bg-red-600 hover:bg-red-700 text-white">
              <AlertTriangle className="mr-1.5 size-3.5" />
              Issue Warning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
