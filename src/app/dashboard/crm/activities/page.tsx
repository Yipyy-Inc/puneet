"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckSquare,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
} from "lucide-react";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { ActivityModal } from "@/components/modals/ActivityModal";
import {
  activities,
  Activity,
  ActivityType,
  getPendingActivities,
  getOverdueActivities,
  getActivitiesByType,
} from "@/data/crm/activities";

const activityTypeInfo: Record<
  ActivityType,
  { label: string; icon: typeof Phone; color: string }
> = {
  call: { label: "Calls", icon: Phone, color: "text-green-600 bg-green-100" },
  email: { label: "Emails", icon: Mail, color: "text-blue-600 bg-blue-100" },
  meeting: {
    label: "Meetings",
    icon: Calendar,
    color: "text-purple-600 bg-purple-100",
  },
  note: {
    label: "Notes",
    icon: FileText,
    color: "text-yellow-600 bg-yellow-100",
  },
  task: {
    label: "Tasks",
    icon: CheckSquare,
    color: "text-orange-600 bg-orange-100",
  },
};

export default function ActivitiesPage() {
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<
    Activity | undefined
  >();
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "completed">(
    "all",
  );

  const pendingActivities = getPendingActivities();
  const overdueActivities = getOverdueActivities();
  const completedActivities = activities.filter(
    (a) => a.status === "completed",
  );

  const callCount = getActivitiesByType("call").length;
  const emailCount = getActivitiesByType("email").length;
  const meetingCount = getActivitiesByType("meeting").length;
  const taskCount = getActivitiesByType("task").length;

  const getFilteredActivities = () => {
    switch (activeTab) {
      case "pending":
        return pendingActivities;
      case "completed":
        return completedActivities;
      default:
        return activities;
    }
  };

  const handleAddActivity = () => {
    setSelectedActivity(undefined);
    setShowActivityModal(true);
  };

  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowActivityModal(true);
  };

  const handleSaveActivity = (activityData: Partial<Activity>) => {
    // In a real app, this would save to the backend
    console.log("Saving activity:", activityData);
    setShowActivityModal(false);
    setSelectedActivity(undefined);
  };

  const handleCompleteActivity = (activity: Activity) => {
    // In a real app, this would update the backend
    console.log("Completing activity:", activity.id);
  };

  const handleDeleteActivity = (activity: Activity) => {
    // In a real app, this would delete from the backend
    console.log("Deleting activity:", activity.id);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activities</h1>
          <p className="text-muted-foreground">
            Track and manage all sales activities and follow-ups
          </p>
        </div>
        <Button onClick={handleAddActivity}>
          <Plus className="h-4 w-4 mr-2" />
          Log Activity
        </Button>
      </div>

      {/* Activity Type Summary */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className={`p-2 rounded-lg ${activityTypeInfo.call.color}`}>
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{callCount}</div>
              <div className="text-sm text-muted-foreground">Calls</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className={`p-2 rounded-lg ${activityTypeInfo.email.color}`}>
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{emailCount}</div>
              <div className="text-sm text-muted-foreground">Emails</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className={`p-2 rounded-lg ${activityTypeInfo.meeting.color}`}>
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{meetingCount}</div>
              <div className="text-sm text-muted-foreground">Meetings</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className={`p-2 rounded-lg ${activityTypeInfo.task.color}`}>
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{taskCount}</div>
              <div className="text-sm text-muted-foreground">Tasks</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-700">
                {overdueActivities.length}
              </div>
              <div className="text-sm text-red-600">Overdue</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Activities
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingActivities.length}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed This Week
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                completedActivities.filter((a) => {
                  if (!a.completedAt) return false;
                  const completed = new Date(a.completedAt);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return completed >= weekAgo;
                }).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Activities
            </CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Activities List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activity Log</CardTitle>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            >
              <TabsList>
                <TabsTrigger value="all">
                  All
                  <Badge variant="secondary" className="ml-2">
                    {activities.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending
                  <Badge variant="secondary" className="ml-2">
                    {pendingActivities.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed
                  <Badge variant="secondary" className="ml-2">
                    {completedActivities.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ActivityTimeline
            activities={getFilteredActivities()}
            onAddActivity={handleAddActivity}
            onEditActivity={handleEditActivity}
            onCompleteActivity={handleCompleteActivity}
            onDeleteActivity={handleDeleteActivity}
          />
        </CardContent>
      </Card>

      {/* Activity Modal */}
      <ActivityModal
        open={showActivityModal}
        onOpenChange={setShowActivityModal}
        activity={selectedActivity}
        onSave={handleSaveActivity}
        mode={selectedActivity ? "edit" : "create"}
      />
    </div>
  );
}
