"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Shield,
  GraduationCap,
  ClipboardList,
  PenTool,
  AlertCircle,
  FilePen,
  Files,
  Search,
  Mail,
  Phone,
  Calendar,
  CheckCheck,
  Users,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  onboardingTasks as initialTasks,
  scheduleEmployees,
  departments,
  employeeDocumentTemplates as initialTemplates,
  employeeDocumentSubmissions as initialSubmissions,
} from "@/data/scheduling";
import { DocumentTemplatesManager } from "@/components/scheduling/DocumentTemplatesManager";
import { EmployeeDocumentSigningDialog } from "@/components/scheduling/EmployeeDocumentSigningDialog";
import type {
  OnboardingTask,
  EmployeeDocumentTemplate,
  EmployeeDocumentSubmission,
  ScheduleEmployee,
} from "@/types/scheduling";

const taskTypeIcon: Record<string, React.ElementType> = {
  document: FileText,
  agreement: PenTool,
  training: GraduationCap,
  form: ClipboardList,
  policy: Shield,
  custom: Circle,
};

const taskStatusStyle: Record<
  string,
  { icon: React.ElementType; color: string }
> = {
  completed: { icon: CheckCircle2, color: "text-emerald-500" },
  in_progress: { icon: Clock, color: "text-blue-500" },
  pending: { icon: Circle, color: "text-muted-foreground" },
  overdue: { icon: AlertCircle, color: "text-rose-500" },
};

const typeLabels: Record<string, string> = {
  employment_agreement: "Employment Agreement",
  nda: "Confidentiality / NDA",
  policy_acknowledgement: "Policy Acknowledgement",
  health_declaration: "Health Declaration",
  emergency_contact: "Emergency Contact",
  direct_deposit: "Direct Deposit",
  tax_form: "Tax Form",
  custom: "Custom Document",
};

type EmployeeGroup = {
  employee: ScheduleEmployee;
  tasks: OnboardingTask[];
};

function progressInfo(tasks: OnboardingTask[]) {
  const completed = tasks.filter((t) => t.status === "completed").length;
  const total = tasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const overdue = tasks.filter((t) => t.status === "overdue").length;
  const pendingSignatures = tasks.filter(
    (t) => t.requiresSignature && t.status !== "completed",
  ).length;
  return { completed, total, percent, overdue, pendingSignatures };
}

function OnboardingCard({
  group,
  onOpen,
}: {
  group: EmployeeGroup;
  onOpen: () => void;
}) {
  const { employee, tasks } = group;
  const info = progressInfo(tasks);
  const dept = departments.find((d) => employee.departmentIds.includes(d.id));
  const isComplete = info.percent === 100;

  return (
    <div
      onClick={onOpen}
      className="group bg-card relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="relative p-5">
        <div className="flex items-start gap-3">
          <Avatar className="ring-background size-12 shrink-0 shadow-sm ring-2">
            <AvatarImage src={employee.avatar} alt={employee.name} />
            <AvatarFallback className="bg-muted text-sm font-semibold">
              {employee.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold tracking-tight">
              {employee.name}
            </div>
            <div className="text-muted-foreground truncate text-xs font-medium">
              {employee.role ?? "Staff"}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {dept && (
                <Badge
                  variant="outline"
                  className="text-[10px]"
                  style={{ borderColor: dept.color, color: dept.color }}
                >
                  <span
                    className="mr-1 inline-block size-1.5 rounded-full"
                    style={{ backgroundColor: dept.color }}
                  />
                  {dept.name}
                </Badge>
              )}
              {isComplete ? (
                <Badge className="bg-emerald-100 text-[10px] text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <CheckCheck className="mr-0.5 size-2.5" />
                  Onboarded
                </Badge>
              ) : info.overdue > 0 ? (
                <Badge className="bg-rose-100 text-[10px] text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                  <AlertCircle className="mr-0.5 size-2.5" />
                  {info.overdue} overdue
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-[10px] text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  <Clock className="mr-0.5 size-2.5" />
                  In progress
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Progress</span>
            <span className="font-semibold">
              {info.completed}/{info.total}{" "}
              <span className="text-muted-foreground font-normal">
                ({info.percent}%)
              </span>
            </span>
          </div>
          <Progress value={info.percent} className="h-2" />
        </div>

        {/* Footer metrics */}
        <div className="border-border/60 mt-4 grid grid-cols-2 gap-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-md p-1.5">
              <ClipboardList className="text-primary size-3.5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">
                {info.total - info.completed}
              </div>
              <div className="text-muted-foreground text-[10px]">
                Remaining
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-amber-500/10 p-1.5">
              <PenTool className="size-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">
                {info.pendingSignatures}
              </div>
              <div className="text-muted-foreground text-[10px]">
                Signatures
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingDialog({
  group,
  open,
  onOpenChange,
  onCompleteTask,
  onOpenSign,
  submissions,
}: {
  group: EmployeeGroup | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCompleteTask: (id: string) => void;
  onOpenSign: (task: OnboardingTask) => void;
  submissions: EmployeeDocumentSubmission[];
}) {
  if (!group) return null;

  const { employee, tasks } = group;
  const info = progressInfo(tasks);
  const dept = departments.find((d) => employee.departmentIds.includes(d.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl md:p-0">
        <DialogTitle className="sr-only">
          {employee.name} — Onboarding
        </DialogTitle>

        {/* Header */}
        <div className="relative border-b">
          <div className="from-primary/5 via-card to-card pointer-events-none absolute inset-0 bg-linear-to-br" />
          <div className="relative p-6">
            <div className="flex items-start gap-4">
              <Avatar className="ring-background size-16 shadow-sm ring-2">
                <AvatarImage src={employee.avatar} alt={employee.name} />
                <AvatarFallback className="bg-muted text-lg font-semibold">
                  {employee.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-bold tracking-tight">
                  {employee.name}
                </p>
                <p className="text-muted-foreground truncate text-sm font-medium">
                  {employee.role ?? "Staff"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {dept && (
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{ borderColor: dept.color, color: dept.color }}
                    >
                      {dept.name}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px]">
                    Hired {employee.hireDate}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {employee.employmentType.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                  Onboarding progress
                </span>
                <span className="font-semibold">
                  {info.completed}/{info.total} · {info.percent}%
                </span>
              </div>
              <Progress value={info.percent} className="h-2" />
            </div>

            {/* Contact row */}
            <div className="text-muted-foreground mt-4 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
              <div className="flex items-center gap-2 truncate">
                <Mail className="size-3 shrink-0" /> {employee.email}
              </div>
              <div className="flex items-center gap-2 truncate">
                <Phone className="size-3 shrink-0" /> {employee.phone}
              </div>
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-muted-foreground mb-3 text-[10px] font-semibold uppercase tracking-wider">
            Onboarding tasks
          </h3>
          <div className="space-y-2.5">
            {tasks.map((task) => {
              const TypeIcon = taskTypeIcon[task.type] ?? Circle;
              const statusInfo =
                taskStatusStyle[task.status] ?? taskStatusStyle.pending;
              const StatusIcon = statusInfo.icon;
              const alreadySigned =
                task.requiresSignature &&
                submissions.some(
                  (s) =>
                    s.onboardingTaskId === task.id && s.status === "signed",
                );
              const isDone = task.status === "completed";

              return (
                <div
                  key={task.id}
                  className={cn(
                    "rounded-xl border p-4 transition-colors",
                    isDone ? "bg-muted/30" : "bg-card hover:bg-muted/20",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <StatusIcon
                      className={cn(
                        "mt-0.5 size-5 shrink-0",
                        statusInfo.color,
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            isDone && "text-muted-foreground line-through",
                          )}
                        >
                          {task.title}
                        </p>
                        <Badge
                          variant="secondary"
                          className="gap-1 text-[10px]"
                        >
                          <TypeIcon className="size-2.5" />
                          {task.type}
                        </Badge>
                        {task.requiresSignature && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              alreadySigned
                                ? "border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400"
                                : "border-amber-200 text-amber-600 dark:border-amber-800 dark:text-amber-400",
                            )}
                          >
                            <PenTool className="mr-0.5 size-2.5" />
                            {alreadySigned ? "Signed" : "Signature required"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {task.description}
                      </p>
                      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            Due {task.dueDate}
                          </span>
                        )}
                        {task.completedAt && (
                          <span>Completed {task.completedAt}</span>
                        )}
                        {task.signedAt && (
                          <span>Signed {task.signedAt.split("T")[0]}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!isDone && (
                    <div className="mt-3 flex justify-end gap-2">
                      {task.requiresSignature ? (
                        <Button
                          size="sm"
                          onClick={() => onOpenSign(task)}
                          className="gap-1.5"
                        >
                          <PenTool className="size-3.5" />
                          Open document
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCompleteTask(task.id)}
                        >
                          <CheckCircle2 className="mr-1 size-3.5" />
                          Mark complete
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type StatusFilter = "all" | "in_progress" | "complete" | "overdue";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in_progress", label: "In progress" },
  { value: "complete", label: "Complete" },
  { value: "overdue", label: "Overdue" },
];

export default function OnboardingPage() {
  const [tasks, setTasks] = useState<OnboardingTask[]>(initialTasks);
  const [templates, setTemplates] =
    useState<EmployeeDocumentTemplate[]>(initialTemplates);
  const [submissions, setSubmissions] =
    useState<EmployeeDocumentSubmission[]>(initialSubmissions);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [signingTask, setSigningTask] = useState<{
    task: OnboardingTask;
    template: EmployeeDocumentTemplate | null;
  } | null>(null);

  const employeeGroups = useMemo<EmployeeGroup[]>(() => {
    const map = new Map<string, EmployeeGroup>();
    for (const task of tasks) {
      if (!map.has(task.employeeId)) {
        const emp = scheduleEmployees.find((e) => e.id === task.employeeId);
        if (!emp) continue;
        map.set(task.employeeId, { employee: emp, tasks: [] });
      }
      map.get(task.employeeId)!.tasks.push(task);
    }
    return Array.from(map.values());
  }, [tasks]);

  const filterCounts = useMemo(() => {
    return {
      all: employeeGroups.length,
      in_progress: employeeGroups.filter(
        (g) => progressInfo(g.tasks).percent < 100,
      ).length,
      complete: employeeGroups.filter(
        (g) => progressInfo(g.tasks).percent === 100,
      ).length,
      overdue: employeeGroups.filter((g) => progressInfo(g.tasks).overdue > 0)
        .length,
    };
  }, [employeeGroups]);

  const filteredGroups = useMemo(() => {
    return employeeGroups.filter((g) => {
      const info = progressInfo(g.tasks);
      if (statusFilter === "complete" && info.percent !== 100) return false;
      if (statusFilter === "in_progress" && info.percent === 100) return false;
      if (statusFilter === "overdue" && info.overdue === 0) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay =
          `${g.employee.name} ${g.employee.email} ${g.employee.role ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [employeeGroups, query, statusFilter]);

  const selectedGroup = useMemo(
    () => employeeGroups.find((g) => g.employee.id === selectedId) ?? null,
    [employeeGroups, selectedId],
  );

  const stats = useMemo(() => {
    const total = employeeGroups.length;
    const complete = employeeGroups.filter(
      (g) => progressInfo(g.tasks).percent === 100,
    ).length;
    const pendingSignatures = tasks.filter(
      (t) => t.requiresSignature && t.status !== "completed",
    ).length;
    return { total, complete, pendingSignatures };
  }, [employeeGroups, tasks]);

  const handleCompleteTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: "completed" as const,
              completedAt: new Date().toISOString().split("T")[0],
            }
          : t,
      ),
    );
    toast.success("Task marked as complete");
  };

  const handleOpenSign = (task: OnboardingTask) => {
    const matchingTemplate =
      templates.find((tmpl) => {
        if (task.type === "agreement")
          return tmpl.type === "employment_agreement" && tmpl.isActive;
        if (task.type === "policy")
          return tmpl.type === "policy_acknowledgement" && tmpl.isActive;
        return false;
      }) ??
      templates.find((t) => t.isActive) ??
      null;
    setSigningTask({ task, template: matchingTemplate });
  };

  const handleSigningComplete = (
    submission: Omit<EmployeeDocumentSubmission, "id" | "facilityId">,
  ) => {
    const newSub: EmployeeDocumentSubmission = {
      ...submission,
      id: `sub-${Date.now()}`,
      facilityId: 1,
    };
    setSubmissions((prev) => [newSub, ...prev]);
    if (submission.onboardingTaskId) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === submission.onboardingTaskId
            ? {
                ...t,
                status: "completed" as const,
                completedAt: new Date().toISOString().split("T")[0],
                signedAt: submission.signedAt,
              }
            : t,
        ),
      );
    }
    toast.success("Document signed and saved successfully");
    setSigningTask(null);
  };

  return (
    <div className="space-y-5 p-6">
      {/* Hero */}
      <div className="bg-card relative overflow-hidden rounded-2xl border p-6">
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
              <Sparkles className="size-3" /> Employee onboarding
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">
              Bring new staff up to speed
            </h2>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Track onboarding tasks, manage document templates, and collect
              signatures — all in one place.
            </p>
          </div>
          {stats.pendingSignatures > 0 && (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <PenTool className="mr-1 size-3" />
              {stats.pendingSignatures} pending signature
              {stats.pendingSignatures !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Stats strip */}
        <div className="relative mt-5 grid grid-cols-3 gap-3">
          <StatPill
            icon={Users}
            label="Onboarding"
            value={stats.total}
            tone="bg-primary/10 text-primary"
          />
          <StatPill
            icon={CheckCircle2}
            label="Completed"
            value={stats.complete}
            tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <StatPill
            icon={ClipboardList}
            label="Tasks remaining"
            value={tasks.filter((t) => t.status !== "completed").length}
            tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees" className="gap-1.5">
            <Users className="size-3.5" />
            Employees
            {employeeGroups.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-0.5 h-4 min-w-4 px-1 text-[10px]"
              >
                {employeeGroups.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <FilePen className="size-3.5" />
            Templates
            {templates.filter((t) => t.isActive).length > 0 && (
              <Badge
                variant="secondary"
                className="ml-0.5 h-4 min-w-4 px-1 text-[10px]"
              >
                {templates.filter((t) => t.isActive).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="signed" className="gap-1.5">
            <Files className="size-3.5" />
            Signed
            {submissions.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-0.5 h-4 min-w-4 px-1 text-[10px]"
              >
                {submissions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Employees ── */}
        <TabsContent value="employees" className="mt-4 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, role…"
                className="h-9 pl-9 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map((t) => {
                const active = statusFilter === t.value;
                const count = filterCounts[t.value];
                return (
                  <button
                    key={t.value}
                    onClick={() => setStatusFilter(t.value)}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs transition-all",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-card hover:bg-muted",
                    )}
                  >
                    {t.label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[10px] font-semibold",
                        active
                          ? "bg-primary-foreground/20"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Employee grid */}
          {filteredGroups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <BookOpen className="text-muted-foreground size-8" />
                <div className="font-semibold">No employees match</div>
                <p className="text-muted-foreground text-sm">
                  Try clearing filters — or add someone new in Staff.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredGroups.map((group) => (
                <OnboardingCard
                  key={group.employee.id}
                  group={group}
                  onOpen={() => setSelectedId(group.employee.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Document Templates ── */}
        <TabsContent value="templates" className="mt-4">
          <DocumentTemplatesManager
            templates={templates}
            submissions={submissions}
            onTemplatesChange={setTemplates}
          />
        </TabsContent>

        {/* ── Tab: Signed Documents ── */}
        <TabsContent value="signed" className="mt-4 space-y-3">
          {submissions.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center py-12 text-center">
              <Files className="mb-3 size-10 opacity-30" />
              <p className="font-medium">No signed documents yet</p>
              <p className="text-sm">
                Documents signed by employees will appear here with full audit
                trails
              </p>
            </div>
          ) : (
            submissions.map((sub) => {
              const emp = scheduleEmployees.find(
                (e) => e.id === sub.employeeId,
              );
              const template = templates.find((t) => t.id === sub.templateId);

              return (
                <Card
                  key={sub.id}
                  className="transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="ring-background size-10 shrink-0 shadow-sm ring-2">
                        <AvatarImage src={emp?.avatar} alt={emp?.name} />
                        <AvatarFallback className="bg-muted text-xs font-semibold">
                          {emp?.initials ?? "??"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">
                            {sub.employeeName}
                          </p>
                          <Badge variant="secondary" className="text-[10px]">
                            {sub.templateTitle}
                          </Badge>
                          {template && (
                            <Badge variant="outline" className="text-[10px]">
                              {typeLabels[template.type] ?? template.type}
                            </Badge>
                          )}
                          <Badge
                            className={cn(
                              "text-[10px]",
                              sub.status === "signed"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                : sub.status === "revoked"
                                  ? "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
                            )}
                          >
                            {sub.status === "signed" && (
                              <CheckCircle2 className="mr-0.5 size-2.5" />
                            )}
                            {sub.status.charAt(0).toUpperCase() +
                              sub.status.slice(1)}
                          </Badge>
                        </div>

                        {Object.keys(sub.fieldValues).length > 0 && (
                          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                            {Object.entries(sub.fieldValues)
                              .slice(0, 4)
                              .map(([key, value]) => {
                                const field = template?.fields.find(
                                  (f) => f.id === key,
                                );
                                return (
                                  <div key={key} className="flex gap-1">
                                    <span className="text-muted-foreground shrink-0">
                                      {field?.label ?? key}:
                                    </span>
                                    <span className="truncate font-medium">
                                      {key === "sin" ? "••••••" : value}
                                    </span>
                                  </div>
                                );
                              })}
                            {Object.keys(sub.fieldValues).length > 4 && (
                              <span className="text-muted-foreground col-span-2 text-[10px]">
                                +{Object.keys(sub.fieldValues).length - 4} more
                                fields
                              </span>
                            )}
                          </div>
                        )}

                        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-3 text-[11px]">
                          <span>
                            Submitted{" "}
                            {new Date(sub.submittedAt).toLocaleDateString(
                              "en-CA",
                              { dateStyle: "medium" },
                            )}
                          </span>
                          {sub.signedAt && (
                            <span>
                              Signed{" "}
                              {new Date(sub.signedAt).toLocaleString("en-CA", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                          )}
                          {sub.ipAddress && <span>IP: {sub.ipAddress}</span>}
                          {sub.timezone && <span>{sub.timezone}</span>}
                          {sub.deviceId && <span>Device: {sub.deviceId}</span>}
                        </div>
                      </div>

                      {sub.signatureData && (
                        <div className="shrink-0">
                          <div className="rounded-lg border bg-white p-1.5 dark:bg-slate-950">
                            <img
                              src={sub.signatureData}
                              alt="Signature"
                              className="h-10 w-24 object-contain"
                            />
                          </div>
                          <p className="text-muted-foreground mt-0.5 text-center text-[9px]">
                            Signature
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Detail dialog (centered popup with blurred overlay) */}
      <OnboardingDialog
        group={selectedGroup}
        open={!!selectedId}
        onOpenChange={(v) => !v && setSelectedId(null)}
        onCompleteTask={handleCompleteTask}
        onOpenSign={handleOpenSign}
        submissions={submissions}
      />

      {/* Signing dialog */}
      {signingTask?.template && (
        <EmployeeDocumentSigningDialog
          open={!!signingTask}
          onOpenChange={(v) => {
            if (!v) setSigningTask(null);
          }}
          template={signingTask.template}
          employee={{
            id:
              scheduleEmployees.find(
                (e) => e.id === signingTask.task.employeeId,
              )?.id ?? signingTask.task.employeeId,
            name:
              scheduleEmployees.find(
                (e) => e.id === signingTask.task.employeeId,
              )?.name ?? "",
            avatar: scheduleEmployees.find(
              (e) => e.id === signingTask.task.employeeId,
            )?.avatar,
            initials:
              scheduleEmployees.find(
                (e) => e.id === signingTask.task.employeeId,
              )?.initials ?? "??",
            role: scheduleEmployees.find(
              (e) => e.id === signingTask.task.employeeId,
            )?.role,
          }}
          onComplete={handleSigningComplete}
          onboardingTaskId={signingTask.task.id}
        />
      )}
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="border-border/60 bg-card/80 flex items-center gap-3 rounded-xl border p-3 backdrop-blur-sm">
      <div className={cn("rounded-lg p-2", tone)}>
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-xl leading-none font-bold">{value}</div>
        <div className="text-muted-foreground mt-0.5 text-[11px]">{label}</div>
      </div>
    </div>
  );
}
