"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  overdue: { icon: AlertCircle, color: "text-red-500" },
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

export default function OnboardingPage() {
  const [tasks, setTasks] = useState<OnboardingTask[]>(initialTasks);
  const [templates, setTemplates] =
    useState<EmployeeDocumentTemplate[]>(initialTemplates);
  const [submissions, setSubmissions] =
    useState<EmployeeDocumentSubmission[]>(initialSubmissions);

  // Signing dialog state
  const [signingTask, setSigningTask] = useState<{
    task: OnboardingTask;
    template: EmployeeDocumentTemplate | null;
  } | null>(null);

  // Group tasks by employee
  const onboardingEmployees = useMemo(() => {
    const empMap = new Map<
      string,
      { employee: (typeof scheduleEmployees)[0]; tasks: OnboardingTask[] }
    >();

    for (const task of tasks) {
      if (!empMap.has(task.employeeId)) {
        const emp = scheduleEmployees.find((e) => e.id === task.employeeId);
        if (!emp) continue;
        empMap.set(task.employeeId, { employee: emp, tasks: [] });
      }
      empMap.get(task.employeeId)!.tasks.push(task);
    }

    return Array.from(empMap.values());
  }, [tasks]);

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
    // Find a matching active template based on task type
    const matchingTemplate =
      templates.find((tmpl) => {
        if (task.type === "agreement")
          return tmpl.type === "employment_agreement" && tmpl.isActive;
        if (task.type === "policy")
          return tmpl.type === "policy_acknowledgement" && tmpl.isActive;
        return false;
      }) ?? templates.find((t) => t.isActive) ?? null;
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

    // Mark linked task as completed
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

  const pendingSignatureCount = tasks.filter(
    (t) => t.requiresSignature && t.status !== "completed",
  ).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Employee Onboarding
          </h2>
          <p className="text-muted-foreground text-sm">
            Track onboarding tasks, manage document templates, and collect
            employee signatures
          </p>
        </div>
        {pendingSignatureCount > 0 && (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <PenTool className="mr-1 size-3" />
            {pendingSignatureCount} pending signature
            {pendingSignatureCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <BookOpen className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {onboardingEmployees.length}
              </p>
              <p className="text-muted-foreground text-xs">
                Employees onboarding
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Clock className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {
                  tasks.filter(
                    (t) =>
                      t.status === "pending" || t.status === "in_progress",
                  ).length
                }
              </p>
              <p className="text-muted-foreground text-xs">Tasks remaining</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {tasks.filter((t) => t.status === "completed").length}
              </p>
              <p className="text-muted-foreground text-xs">Tasks completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks" className="gap-1.5">
            <ClipboardList className="size-3.5" />
            Onboarding Tasks
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <FilePen className="size-3.5" />
            Document Templates
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
            Signed Documents
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

        {/* ── Tab: Onboarding Tasks ── */}
        <TabsContent value="tasks" className="mt-4 space-y-4">
          {onboardingEmployees.map(({ employee, tasks: empTasks }) => {
            const completed = empTasks.filter(
              (t) => t.status === "completed",
            ).length;
            const total = empTasks.length;
            const progress = total > 0 ? (completed / total) * 100 : 0;
            const dept = departments.find((d) =>
              employee.departmentIds.includes(d.id),
            );

            return (
              <Card key={employee.id} className="overflow-hidden">
                <CardHeader className="border-b bg-muted/30 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-11 ring-2 ring-background shadow">
                        <AvatarImage
                          src={employee.avatar}
                          alt={employee.name}
                        />
                        <AvatarFallback className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-sm font-semibold">
                          {employee.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">
                          {employee.name}
                        </CardTitle>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            {employee.role}
                          </span>
                          {dept && (
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                              style={{
                                borderColor: dept.color,
                                color: dept.color,
                              }}
                            >
                              {dept.name}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px]">
                            Hired {employee.hireDate}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {completed}/{total} complete
                      </p>
                      <Progress value={progress} className="mt-1 h-2 w-32" />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="divide-y p-0">
                  {empTasks.map((task) => {
                    const TypeIcon = taskTypeIcon[task.type] || Circle;
                    const statusInfo =
                      taskStatusStyle[task.status] || taskStatusStyle.pending;
                    const StatusIcon = statusInfo.icon;
                    const alreadySigned =
                      task.requiresSignature &&
                      submissions.some(
                        (s) =>
                          s.onboardingTaskId === task.id &&
                          s.status === "signed",
                      );

                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/30"
                      >
                        <StatusIcon
                          className={`size-5 shrink-0 ${statusInfo.color}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={`text-sm font-medium ${task.status === "completed" ? "text-muted-foreground line-through" : ""}`}
                            >
                              {task.title}
                            </p>
                            <Badge
                              variant="secondary"
                              className="text-[10px] gap-1"
                            >
                              <TypeIcon className="size-2.5" />
                              {task.type}
                            </Badge>
                            {task.requiresSignature && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${alreadySigned ? "border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400" : "border-amber-200 text-amber-600 dark:border-amber-800 dark:text-amber-400"}`}
                              >
                                <PenTool className="mr-0.5 size-2.5" />
                                {alreadySigned
                                  ? "Signed"
                                  : "Signature required"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {task.description}
                          </p>
                          {task.dueDate && (
                            <p className="text-muted-foreground mt-0.5 text-[11px]">
                              Due: {task.dueDate}
                              {task.completedAt &&
                                ` · Completed: ${task.completedAt}`}
                              {task.signedAt &&
                                ` · Signed: ${task.signedAt.split("T")[0]}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {task.status !== "completed" &&
                            task.requiresSignature && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleOpenSign(task)}
                                className="gap-1.5"
                              >
                                <PenTool className="size-3.5" />
                                Open Document
                              </Button>
                            )}
                          {task.status !== "completed" &&
                            !task.requiresSignature && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCompleteTask(task.id)}
                              >
                                <CheckCircle2 className="mr-1 size-3.5" />
                                Complete
                              </Button>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}

          {onboardingEmployees.length === 0 && (
            <div className="text-muted-foreground flex flex-col items-center py-12 text-center">
              <BookOpen className="mb-3 size-10 opacity-30" />
              <p className="font-medium">No employees onboarding</p>
              <p className="text-sm">
                New employees with onboarding tasks will appear here
              </p>
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
            <div className="flex flex-col items-center py-12 text-center text-muted-foreground">
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
                      {/* Employee avatar */}
                      <Avatar className="size-10 ring-2 ring-background shadow shrink-0">
                        <AvatarImage src={emp?.avatar} alt={emp?.name} />
                        <AvatarFallback className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold">
                          {emp?.initials ?? "??"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-sm">
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
                            className={`text-[10px] ${
                              sub.status === "signed"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : sub.status === "revoked"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            }`}
                          >
                            {sub.status === "signed" && (
                              <CheckCircle2 className="mr-0.5 size-2.5" />
                            )}
                            {sub.status.charAt(0).toUpperCase() +
                              sub.status.slice(1)}
                          </Badge>
                        </div>

                        {/* Field values preview */}
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

                        {/* Audit trail */}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
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
                          {sub.ipAddress && (
                            <span>IP: {sub.ipAddress}</span>
                          )}
                          {sub.timezone && <span>{sub.timezone}</span>}
                          {sub.deviceId && (
                            <span>Device: {sub.deviceId}</span>
                          )}
                        </div>
                      </div>

                      {/* Signature preview */}
                      {sub.signatureData && (
                        <div className="shrink-0">
                          <div className="rounded-lg border bg-white p-1.5 dark:bg-slate-950">
                            <img
                              src={sub.signatureData}
                              alt="Signature"
                              className="h-10 w-24 object-contain"
                            />
                          </div>
                          <p className="mt-0.5 text-center text-[9px] text-muted-foreground">
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

      {/* Signing dialog */}
      {signingTask?.template && (
        <EmployeeDocumentSigningDialog
          open={!!signingTask}
          onOpenChange={(v) => {
            if (!v) setSigningTask(null);
          }}
          template={signingTask.template}
          employee={{
            id: scheduleEmployees.find(
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
