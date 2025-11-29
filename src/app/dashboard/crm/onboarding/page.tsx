"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Clock,
  Users,
  Calendar,
  ArrowRight,
  Filter,
  Plus,
} from "lucide-react";
import { OnboardingChecklistList } from "@/components/crm/OnboardingChecklist";
import {
  onboardingChecklists,
  onboardingSteps,
  getPendingOnboardings,
  getCompletedOnboardings,
  getOnboardingProgress,
} from "@/data/crm/onboarding";
import { salesTeamMembers } from "@/data/crm/sales-team";

export default function OnboardingPage() {
  const [tab, setTab] = useState<"pending" | "completed">("pending");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const pendingOnboardings = getPendingOnboardings();
  const completedOnboardings = getCompletedOnboardings();

  const filteredPending =
    assigneeFilter === "all"
      ? pendingOnboardings
      : pendingOnboardings.filter((o) => o.assignedTo === assigneeFilter);

  const filteredCompleted =
    assigneeFilter === "all"
      ? completedOnboardings
      : completedOnboardings.filter((o) => o.assignedTo === assigneeFilter);

  // Calculate metrics
  const totalOnboardings = onboardingChecklists.length;
  const avgProgress =
    pendingOnboardings.length > 0
      ? Math.round(
          pendingOnboardings.reduce(
            (sum, o) => sum + getOnboardingProgress(o),
            0,
          ) / pendingOnboardings.length,
        )
      : 0;

  const avgCompletionTime =
    completedOnboardings.length > 0
      ? Math.round(
          completedOnboardings.reduce((sum, o) => {
            const start = new Date(o.startedAt);
            const end = new Date(o.completedAt!);
            return (
              sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
            );
          }, 0) / completedOnboardings.length,
        )
      : 0;

  const handleStepToggle = (
    checklistId: string,
    stepId: string,
    completed: boolean,
  ) => {
    // In a real app, this would update the backend
    console.log(
      `Toggling step ${stepId} on checklist ${checklistId} to ${completed}`,
    );
  };

  const handleStepNoteUpdate = (
    checklistId: string,
    stepId: string,
    notes: string,
  ) => {
    // In a real app, this would update the backend
    console.log(
      `Updating notes for step ${stepId} on checklist ${checklistId}: ${notes}`,
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Onboarding</h1>
          <p className="text-muted-foreground">
            Track and manage customer onboarding progress
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Onboarding
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Onboardings
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOnboardings}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingOnboardings.length}
            </div>
            <p className="text-xs text-muted-foreground">Active onboardings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Progress
            </CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProgress}%</div>
            <p className="text-xs text-muted-foreground">Active onboardings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Completion Time
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCompletionTime} days</div>
            <p className="text-xs text-muted-foreground">Start to finish</p>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Steps Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Onboarding Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {onboardingSteps.map((step, index) => (
              <div
                key={step.id}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-medium text-sm">
                    {step.title}
                    {step.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {salesTeamMembers
              .filter((m) => m.status === "active")
              .map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {assigneeFilter !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAssigneeFilter("all")}
          >
            Clear filter
          </Button>
        )}
      </div>

      {/* Onboarding Lists */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "pending" | "completed")}
      >
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            In Progress
            <Badge variant="secondary" className="ml-1">
              {filteredPending.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed
            <Badge variant="secondary" className="ml-1">
              {filteredCompleted.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <OnboardingChecklistList
            checklists={filteredPending}
            onStepToggle={handleStepToggle}
            onStepNoteUpdate={handleStepNoteUpdate}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <OnboardingChecklistList checklists={filteredCompleted} readonly />
        </TabsContent>
      </Tabs>
    </div>
  );
}
