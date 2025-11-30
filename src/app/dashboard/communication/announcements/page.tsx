"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import {
  announcements as initialAnnouncements,
  Announcement,
} from "@/data/announcements";
import { facilities } from "@/data/facilities";
import { StatCard } from "@/components/ui/StatCard";
import {
  Megaphone,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  FileText,
  Archive,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Users,
  Building,
  AlertTriangle,
  Radio,
} from "lucide-react";

type AnnouncementFormData = {
  title: string;
  content: string;
  target: "All Facilities" | "Specific Facilities";
  facilities: string[];
  priority: "Low" | "Normal" | "High";
  scheduledAt?: string;
};

export default function AnnouncementsPage() {
  const [announcementsState, setAnnouncementsState] =
    useState(initialAnnouncements);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEmergencyDialogOpen, setIsEmergencyDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: "",
    content: "",
    target: "All Facilities",
    facilities: [],
    priority: "Normal",
    scheduledAt: "",
  });

  // Stats
  const publishedCount = announcementsState.filter(
    (a) => a.status === "Published",
  ).length;
  const draftCount = announcementsState.filter(
    (a) => a.status === "Draft",
  ).length;
  const archivedCount = announcementsState.filter(
    (a) => a.status === "Archived",
  ).length;
  const highPriorityCount = announcementsState.filter(
    (a) => a.priority === "High",
  ).length;

  // Mock read receipts data based on announcement id hash
  const getReadReceipts = (announcementId: string) => {
    const total = facilities.length;
    // Generate a deterministic "random" number based on announcement id
    const hash = announcementId
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const read = Math.floor(((hash % 100) / 100) * total);
    return { read, total, percentage: Math.round((read / total) * 100) };
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      target: "All Facilities",
      facilities: [],
      priority: "Normal",
      scheduledAt: "",
    });
  };

  const handleCreate = (status: "Draft" | "Published") => {
    const newAnnouncement: Announcement = {
      id: `ANN-${String(announcementsState.length + 1).padStart(3, "0")}`,
      title: formData.title,
      content: formData.content,
      target: formData.target,
      facilities:
        formData.target === "Specific Facilities"
          ? formData.facilities
          : undefined,
      createdAt: new Date().toISOString(),
      author: "Platform Admin",
      status,
      priority: formData.priority,
    };
    setAnnouncementsState([newAnnouncement, ...announcementsState]);
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleEdit = () => {
    if (!selectedAnnouncement) return;
    const updated = announcementsState.map((a) =>
      a.id === selectedAnnouncement.id
        ? {
            ...a,
            title: formData.title,
            content: formData.content,
            target: formData.target,
            facilities:
              formData.target === "Specific Facilities"
                ? formData.facilities
                : undefined,
            priority: formData.priority,
          }
        : a,
    );
    setAnnouncementsState(updated);
    setIsEditDialogOpen(false);
    setSelectedAnnouncement(null);
    resetForm();
  };

  const handleDelete = () => {
    if (!selectedAnnouncement) return;
    setAnnouncementsState(
      announcementsState.filter((a) => a.id !== selectedAnnouncement.id),
    );
    setIsDeleteDialogOpen(false);
    setSelectedAnnouncement(null);
  };

  const handleArchive = (announcement: Announcement) => {
    const updated = announcementsState.map((a) =>
      a.id === announcement.id ? { ...a, status: "Archived" as const } : a,
    );
    setAnnouncementsState(updated);
  };

  const handlePublish = (announcement: Announcement) => {
    const updated = announcementsState.map((a) =>
      a.id === announcement.id ? { ...a, status: "Published" as const } : a,
    );
    setAnnouncementsState(updated);
  };

  const handleEmergencyBroadcast = () => {
    const emergency: Announcement = {
      id: `ANN-${String(announcementsState.length + 1).padStart(3, "0")}`,
      title: `🚨 EMERGENCY: ${formData.title}`,
      content: formData.content,
      target: "All Facilities",
      createdAt: new Date().toISOString(),
      author: "Platform Admin",
      status: "Published",
      priority: "High",
    };
    setAnnouncementsState([emergency, ...announcementsState]);
    setIsEmergencyDialogOpen(false);
    resetForm();
  };

  const openEditDialog = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      target: announcement.target,
      facilities: announcement.facilities || [],
      priority: announcement.priority,
      scheduledAt: "",
    });
    setIsEditDialogOpen(true);
  };

  const columns: ColumnDef<Announcement>[] = [
    {
      key: "title",
      label: "Title",
      icon: FileText,
      defaultVisible: true,
      render: (announcement) => (
        <div className="max-w-xs">
          <p className="font-medium truncate">{announcement.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {announcement.content}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      icon: CheckCircle,
      defaultVisible: true,
      render: (announcement) => (
        <Badge
          className={
            announcement.status === "Published"
              ? "bg-success/10 text-success hover:bg-success/20 border-0"
              : announcement.status === "Draft"
                ? "bg-warning/10 text-warning hover:bg-warning/20 border-0"
                : "bg-muted text-muted-foreground border-0"
          }
        >
          {announcement.status}
        </Badge>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      icon: AlertCircle,
      defaultVisible: true,
      render: (announcement) => (
        <Badge
          className={
            announcement.priority === "High"
              ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border-0"
              : announcement.priority === "Normal"
                ? "bg-info/10 text-info hover:bg-info/20 border-0"
                : "bg-muted text-muted-foreground border-0"
          }
        >
          {announcement.priority}
        </Badge>
      ),
    },
    {
      key: "target",
      label: "Target",
      icon: Users,
      defaultVisible: true,
      render: (announcement) => (
        <div className="flex items-center gap-1.5">
          <Building className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{announcement.target}</span>
        </div>
      ),
    },
    {
      key: "author",
      label: "Author",
      icon: Users,
      defaultVisible: true,
    },
    {
      key: "createdAt",
      label: "Created",
      icon: Clock,
      defaultVisible: true,
      render: (announcement) => (
        <span className="text-sm">
          {new Date(announcement.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Status" },
        { value: "Published", label: "Published" },
        { value: "Draft", label: "Draft" },
        { value: "Archived", label: "Archived" },
      ],
    },
    {
      key: "priority",
      label: "Priority",
      options: [
        { value: "all", label: "All Priorities" },
        { value: "Low", label: "Low" },
        { value: "Normal", label: "Normal" },
        { value: "High", label: "High" },
      ],
    },
    {
      key: "target",
      label: "Target",
      options: [
        { value: "all", label: "All Targets" },
        { value: "All Facilities", label: "All Facilities" },
        { value: "Specific Facilities", label: "Specific Facilities" },
      ],
    },
  ];

  const renderAnnouncementForm = (isEdit = false) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter announcement title"
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) =>
            setFormData({ ...formData, content: e.target.value })
          }
          placeholder="Enter announcement content..."
          rows={4}
          className="mt-1.5"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="target">Target Audience</Label>
          <Select
            value={formData.target}
            onValueChange={(value: "All Facilities" | "Specific Facilities") =>
              setFormData({ ...formData, target: value })
            }
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Facilities">All Facilities</SelectItem>
              <SelectItem value="Specific Facilities">
                Specific Facilities
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(value: "Low" | "Normal" | "High") =>
              setFormData({ ...formData, priority: value })
            }
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Normal">Normal</SelectItem>
              <SelectItem value="High">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {formData.target === "Specific Facilities" && (
        <div>
          <Label>Select Facilities</Label>
          <div className="mt-1.5 max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
            {facilities.slice(0, 5).map((facility) => (
              <label
                key={facility.id}
                className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={formData.facilities.includes(facility.name)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        facilities: [...formData.facilities, facility.name],
                      });
                    } else {
                      setFormData({
                        ...formData,
                        facilities: formData.facilities.filter(
                          (f) => f !== facility.name,
                        ),
                      });
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm">{facility.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {!isEdit && (
        <div>
          <Label htmlFor="scheduledAt">Schedule (Optional)</Label>
          <Input
            id="scheduledAt"
            type="datetime-local"
            value={formData.scheduledAt}
            onChange={(e) =>
              setFormData({ ...formData, scheduledAt: e.target.value })
            }
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Leave empty to publish immediately or save as draft
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 overflow-auto p-6 pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Announcements</h1>
          <p className="text-muted-foreground mt-1">
            Create, manage, and broadcast announcements to facilities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog
            open={isEmergencyDialogOpen}
            onOpenChange={setIsEmergencyDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="destructive" className="shadow-sm">
                <Radio className="h-4 w-4 mr-2" />
                Emergency Broadcast
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Emergency Broadcast
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground mb-4">
                This will immediately send a high-priority notification to ALL
                facilities. Use only for critical situations.
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="emergency-title">Title</Label>
                  <Input
                    id="emergency-title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Emergency announcement title"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="emergency-content">Message</Label>
                  <Textarea
                    id="emergency-content"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    placeholder="Enter emergency message..."
                    rows={4}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEmergencyDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleEmergencyBroadcast}
                  disabled={!formData.title || !formData.content}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Broadcast Now
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="shadow-sm" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="min-w-5xl">
              <DialogHeader>
                <DialogTitle>Create New Announcement</DialogTitle>
              </DialogHeader>
              {renderAnnouncementForm()}
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => handleCreate("Draft")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
                <Button
                  onClick={() => handleCreate("Published")}
                  disabled={!formData.title || !formData.content}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publish Now
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Published"
          value={publishedCount.toString()}
          icon={CheckCircle}
          variant="success"
          subtitle="Active announcements"
        />
        <StatCard
          title="Drafts"
          value={draftCount.toString()}
          icon={FileText}
          variant="warning"
          subtitle="Pending review"
        />
        <StatCard
          title="High Priority"
          value={highPriorityCount.toString()}
          icon={AlertCircle}
          variant="info"
          subtitle="Urgent notices"
        />
        <StatCard
          title="Archived"
          value={archivedCount.toString()}
          icon={Archive}
          variant="default"
          subtitle="Past announcements"
        />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="h-12 max-w-lg">
          <TabsTrigger
            value="all"
            className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
          >
            <Megaphone className="h-4 w-4" />
            All ({announcementsState.length})
          </TabsTrigger>
          <TabsTrigger
            value="published"
            className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
          >
            <CheckCircle className="h-4 w-4" />
            Published ({publishedCount})
          </TabsTrigger>
          <TabsTrigger
            value="drafts"
            className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
          >
            <FileText className="h-4 w-4" />
            Drafts ({draftCount})
          </TabsTrigger>
          <TabsTrigger
            value="archived"
            className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
          >
            <Archive className="h-4 w-4" />
            Archived ({archivedCount})
          </TabsTrigger>
        </TabsList>

        {["all", "published", "drafts", "archived"].map((tab) => {
          const filteredData =
            tab === "all"
              ? announcementsState
              : tab === "published"
                ? announcementsState.filter((a) => a.status === "Published")
                : tab === "drafts"
                  ? announcementsState.filter((a) => a.status === "Draft")
                  : announcementsState.filter((a) => a.status === "Archived");

          return (
            <TabsContent key={tab} value={tab} className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {tab === "all"
                      ? "All Announcements"
                      : tab === "published"
                        ? "Published Announcements"
                        : tab === "drafts"
                          ? "Draft Announcements"
                          : "Archived Announcements"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={filteredData}
                    columns={columns}
                    filters={tab === "all" ? filters : []}
                    searchKey="title"
                    searchPlaceholder="Search announcements..."
                    itemsPerPage={10}
                    actions={(announcement) => (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedAnnouncement(announcement);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openEditDialog(announcement)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {announcement.status === "Draft" && (
                            <DropdownMenuItem
                              onClick={() => handlePublish(announcement)}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {announcement.status === "Published" && (
                            <DropdownMenuItem
                              onClick={() => handleArchive(announcement)}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setSelectedAnnouncement(announcement);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              {selectedAnnouncement?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedAnnouncement && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    selectedAnnouncement.status === "Published"
                      ? "bg-success/10 text-success border-0"
                      : selectedAnnouncement.status === "Draft"
                        ? "bg-warning/10 text-warning border-0"
                        : "bg-muted text-muted-foreground border-0"
                  }
                >
                  {selectedAnnouncement.status}
                </Badge>
                <Badge
                  className={
                    selectedAnnouncement.priority === "High"
                      ? "bg-destructive/10 text-destructive border-0"
                      : "bg-info/10 text-info border-0"
                  }
                >
                  {selectedAnnouncement.priority} Priority
                </Badge>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-sm whitespace-pre-wrap">
                  {selectedAnnouncement.content}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Target</p>
                  <p className="text-sm font-medium">
                    {selectedAnnouncement.target}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Author</p>
                  <p className="text-sm font-medium">
                    {selectedAnnouncement.author}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">
                    {new Date(selectedAnnouncement.createdAt).toLocaleString()}
                  </p>
                </div>
                {selectedAnnouncement.status === "Published" && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      Read Receipts
                    </p>
                    <p className="text-sm font-medium">
                      {(() => {
                        const receipts = getReadReceipts(
                          selectedAnnouncement.id,
                        );
                        return `${receipts.read}/${receipts.total} (${receipts.percentage}%)`;
                      })()}
                    </p>
                  </div>
                )}
              </div>
              {selectedAnnouncement.facilities &&
                selectedAnnouncement.facilities.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Target Facilities
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAnnouncement.facilities.map((facility) => (
                        <Badge
                          key={facility}
                          variant="outline"
                          className="text-xs"
                        >
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
          </DialogHeader>
          {renderAnnouncementForm(true)}
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!formData.title || !formData.content}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Announcement
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{selectedAnnouncement?.title}
            &quot;? This action cannot be undone.
          </p>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
