"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  PawPrint,
  Calendar,
  User,
  MessageSquare,
  TrendingUp,
  Star,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  progressRecords,
  trainerNotes,
  enrollments,
  type ProgressRecord,
  type TrainerNote,
} from "@/data/training";

type ProgressRecordWithRecord = ProgressRecord & Record<string, unknown>;
type TrainerNoteWithRecord = TrainerNote & Record<string, unknown>;

export default function ProgressPage() {
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [isViewProgressModalOpen, setIsViewProgressModalOpen] = useState(false);
  const [selectedProgress, setSelectedProgress] =
    useState<ProgressRecord | null>(null);
  const [selectedTab, setSelectedTab] = useState<"progress" | "notes">(
    "progress",
  );

  const [noteFormData, setNoteFormData] = useState({
    enrollmentId: "",
    note: "",
    category: "progress" as
      | "behavior"
      | "progress"
      | "concern"
      | "achievement"
      | "general",
    isPrivate: false,
  });

  const handleAddNote = () => {
    setNoteFormData({
      enrollmentId: "",
      note: "",
      category: "progress",
      isPrivate: false,
    });
    setIsAddNoteModalOpen(true);
  };

  const handleViewProgress = (progress: ProgressRecord) => {
    setSelectedProgress(progress);
    setIsViewProgressModalOpen(true);
  };

  const handleSaveNote = () => {
    // In a real app, this would save to the backend
    setIsAddNoteModalOpen(false);
  };

  const getProgressColor = (value: number) => {
    if (value >= 80) return "text-green-500";
    if (value >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getSkillStatusIcon = (status: string) => {
    switch (status) {
      case "mastered":
        return <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />;
      case "in-progress":
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case "not-started":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getCategoryVariant = (category: string) => {
    switch (category) {
      case "achievement":
        return "default";
      case "progress":
        return "secondary";
      case "concern":
        return "destructive";
      case "behavior":
        return "outline";
      default:
        return "outline";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "achievement":
        return <Star className="h-4 w-4" />;
      case "progress":
        return <TrendingUp className="h-4 w-4" />;
      case "concern":
        return <AlertCircle className="h-4 w-4" />;
      case "behavior":
        return <PawPrint className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const progressColumns: ColumnDef<ProgressRecordWithRecord>[] = [
    {
      key: "petName",
      label: "Pet",
      icon: PawPrint,
      defaultVisible: true,
      render: (item) => (
        <div>
          <div className="font-medium">{item.petName}</div>
          <div className="text-sm text-muted-foreground">{item.petBreed}</div>
        </div>
      ),
    },
    {
      key: "className",
      label: "Class",
      defaultVisible: true,
    },
    {
      key: "trainerName",
      label: "Trainer",
      icon: User,
      defaultVisible: true,
    },
    {
      key: "overallProgress",
      label: "Overall Progress",
      defaultVisible: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <Progress
            value={item.overallProgress as number}
            className="w-20 h-2"
          />
          <span className={getProgressColor(item.overallProgress as number)}>
            {item.overallProgress}%
          </span>
        </div>
      ),
    },
    {
      key: "skills",
      label: "Skills",
      defaultVisible: true,
      render: (item) => {
        const skills = item.skills as { skillName: string; status: string }[];
        const mastered = skills.filter((s) => s.status === "mastered").length;
        const inProgress = skills.filter(
          (s) => s.status === "in-progress",
        ).length;
        return (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-green-500">{mastered} mastered</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-blue-500">{inProgress} in progress</span>
          </div>
        );
      },
    },
    {
      key: "lastUpdated",
      label: "Last Updated",
      icon: Calendar,
      defaultVisible: true,
      render: (item) =>
        new Date(item.lastUpdated as string).toLocaleDateString(),
    },
  ];

  const notesColumns: ColumnDef<TrainerNoteWithRecord>[] = [
    {
      key: "petName",
      label: "Pet",
      icon: PawPrint,
      defaultVisible: true,
    },
    {
      key: "className",
      label: "Class",
      defaultVisible: true,
    },
    {
      key: "trainerName",
      label: "Trainer",
      icon: User,
      defaultVisible: true,
    },
    {
      key: "category",
      label: "Category",
      defaultVisible: true,
      render: (item) => (
        <Badge
          variant={getCategoryVariant(item.category as string)}
          className="gap-1"
        >
          {getCategoryIcon(item.category as string)}
          {(item.category as string).charAt(0).toUpperCase() +
            (item.category as string).slice(1)}
        </Badge>
      ),
    },
    {
      key: "note",
      label: "Note",
      icon: MessageSquare,
      defaultVisible: true,
      render: (item) => (
        <div className="max-w-md truncate">{item.note as string}</div>
      ),
    },
    {
      key: "date",
      label: "Date",
      icon: Calendar,
      defaultVisible: true,
      render: (item) => new Date(item.date as string).toLocaleDateString(),
    },
    {
      key: "isPrivate",
      label: "Visibility",
      defaultVisible: true,
      render: (item) => (
        <Badge variant={item.isPrivate ? "secondary" : "outline"}>
          {item.isPrivate ? "Staff Only" : "Shared"}
        </Badge>
      ),
    },
  ];

  const progressFilters: FilterDef[] = [
    {
      key: "className",
      label: "Class",
      options: [
        { value: "all", label: "All Classes" },
        ...Array.from(new Set(progressRecords.map((p) => p.className))).map(
          (name) => ({
            value: name,
            label: name,
          }),
        ),
      ],
    },
  ];

  const notesFilters: FilterDef[] = [
    {
      key: "category",
      label: "Category",
      options: [
        { value: "all", label: "All Categories" },
        { value: "achievement", label: "Achievement" },
        { value: "progress", label: "Progress" },
        { value: "concern", label: "Concern" },
        { value: "behavior", label: "Behavior" },
        { value: "general", label: "General" },
      ],
    },
  ];

  // Stats
  const avgProgress = Math.round(
    progressRecords.reduce((sum, p) => sum + p.overallProgress, 0) /
      progressRecords.length,
  );
  const totalNotes = trainerNotes.length;
  const recentAchievements = trainerNotes.filter(
    (n) => n.category === "achievement",
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Progress
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProgress}%</div>
            <Progress value={avgProgress} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trainer Notes</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNotes}</div>
            <p className="text-xs text-muted-foreground">
              Total notes recorded
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentAchievements}</div>
            <p className="text-xs text-muted-foreground">
              Recorded achievements
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        value={selectedTab}
        onValueChange={(value) => setSelectedTab(value as "progress" | "notes")}
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="progress" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Progress Tracking
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Trainer Notes
            </TabsTrigger>
          </TabsList>

          <Button onClick={handleAddNote}>
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>

        <TabsContent value="progress" className="mt-4">
          <DataTable
            data={progressRecords as ProgressRecordWithRecord[]}
            columns={progressColumns}
            filters={progressFilters}
            searchKey="petName"
            searchPlaceholder="Search by pet name..."
            actions={(item) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleViewProgress(item as ProgressRecord)}
                  >
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem>Update Skills</DropdownMenuItem>
                  <DropdownMenuItem>Add Note</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <DataTable
            data={
              trainerNotes.filter(
                (n) => !n.isPrivate,
              ) as TrainerNoteWithRecord[]
            }
            columns={notesColumns}
            filters={notesFilters}
            searchKey="petName"
            searchPlaceholder="Search by pet name..."
            actions={() => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Full Note</DropdownMenuItem>
                  <DropdownMenuItem>Edit Note</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    Delete Note
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* Add Note Modal */}
      <Dialog open={isAddNoteModalOpen} onOpenChange={setIsAddNoteModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Trainer Note</DialogTitle>
            <DialogDescription>
              Record a note about a pet&apos;s training progress.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="enrollment">Pet / Enrollment</Label>
              <Select
                value={noteFormData.enrollmentId}
                onValueChange={(value) =>
                  setNoteFormData({ ...noteFormData, enrollmentId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select enrollment" />
                </SelectTrigger>
                <SelectContent>
                  {enrollments
                    .filter((e) => e.status === "enrolled")
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.petName} - {e.className}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={noteFormData.category}
                onValueChange={(
                  value:
                    | "behavior"
                    | "progress"
                    | "concern"
                    | "achievement"
                    | "general",
                ) => setNoteFormData({ ...noteFormData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="achievement">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Achievement
                    </div>
                  </SelectItem>
                  <SelectItem value="progress">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Progress
                    </div>
                  </SelectItem>
                  <SelectItem value="concern">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Concern
                    </div>
                  </SelectItem>
                  <SelectItem value="behavior">
                    <div className="flex items-center gap-2">
                      <PawPrint className="h-4 w-4" />
                      Behavior
                    </div>
                  </SelectItem>
                  <SelectItem value="general">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      General
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={noteFormData.note}
                onChange={(e) =>
                  setNoteFormData({ ...noteFormData, note: e.target.value })
                }
                placeholder="Enter your observations..."
                rows={4}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrivate"
                checked={noteFormData.isPrivate}
                onChange={(e) =>
                  setNoteFormData({
                    ...noteFormData,
                    isPrivate: e.target.checked,
                  })
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="isPrivate" className="font-normal">
                Staff only (not visible to pet owner)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddNoteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Progress Modal */}
      <Dialog
        open={isViewProgressModalOpen}
        onOpenChange={setIsViewProgressModalOpen}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Progress Details</DialogTitle>
          </DialogHeader>

          {selectedProgress && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <PawPrint className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedProgress.petName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedProgress.petBreed} • {selectedProgress.className}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-2xl font-bold">
                    {selectedProgress.overallProgress}%
                  </div>
                  <p className="text-sm text-muted-foreground">Overall</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Skills Progress</h4>
                <div className="grid gap-3">
                  {selectedProgress.skills.map((skill) => (
                    <div
                      key={skill.skillName}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                    >
                      {getSkillStatusIcon(skill.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{skill.skillName}</span>
                          <span className="text-sm text-muted-foreground">
                            {skill.level}%
                          </span>
                        </div>
                        <Progress value={skill.level} className="h-2 mt-1" />
                      </div>
                      <Badge
                        variant={
                          skill.status === "mastered"
                            ? "default"
                            : skill.status === "in-progress"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {skill.status === "mastered"
                          ? "Mastered"
                          : skill.status === "in-progress"
                            ? "In Progress"
                            : "Not Started"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Trainer:</span>
                  <span>{selectedProgress.trainerName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Last Updated:</span>
                  <span>
                    {new Date(
                      selectedProgress.lastUpdated,
                    ).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {selectedProgress.notes && (
                <div className="pt-4 border-t">
                  <span className="text-sm font-medium">Trainer Notes</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedProgress.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewProgressModalOpen(false)}
            >
              Close
            </Button>
            <Button>Update Progress</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
