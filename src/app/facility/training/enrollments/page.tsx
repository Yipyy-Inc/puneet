"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  User,
  PawPrint,
  Calendar,
  Phone,
  Mail,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { enrollments, trainingClasses, type Enrollment } from "@/data/training";

type EnrollmentWithRecord = Enrollment & Record<string, unknown>;

export default function EnrollmentsPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<Enrollment | null>(null);

  const [formData, setFormData] = useState({
    classId: "",
    petName: "",
    petBreed: "",
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    notes: "",
  });

  const handleAddNew = () => {
    setFormData({
      classId: "",
      petName: "",
      petBreed: "",
      ownerName: "",
      ownerPhone: "",
      ownerEmail: "",
      notes: "",
    });
    setIsAddModalOpen(true);
  };

  const handleView = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setIsViewModalOpen(true);
  };

  const handleSave = () => {
    // In a real app, this would save to the backend
    setIsAddModalOpen(false);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "enrolled":
        return "default";
      case "completed":
        return "secondary";
      case "dropped":
        return "destructive";
      case "waitlisted":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "enrolled":
        return <CheckCircle2 className="h-4 w-4" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "dropped":
        return <XCircle className="h-4 w-4" />;
      case "waitlisted":
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const columns: ColumnDef<EnrollmentWithRecord>[] = [
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
      key: "ownerName",
      label: "Owner",
      icon: User,
      defaultVisible: true,
      render: (item) => (
        <div>
          <div className="font-medium">{item.ownerName}</div>
          <div className="text-sm text-muted-foreground">{item.ownerPhone}</div>
        </div>
      ),
    },
    {
      key: "className",
      label: "Class",
      icon: GraduationCap,
      defaultVisible: true,
    },
    {
      key: "enrollmentDate",
      label: "Enrolled",
      icon: Calendar,
      defaultVisible: true,
      render: (item) =>
        new Date(item.enrollmentDate as string).toLocaleDateString(),
    },
    {
      key: "sessionsAttended",
      label: "Progress",
      defaultVisible: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {item.sessionsAttended}/{item.totalSessions}
          </span>
          <Progress
            value={
              ((item.sessionsAttended as number) /
                (item.totalSessions as number)) *
              100
            }
            className="w-16 h-2"
          />
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (item) => (
        <Badge
          variant={getStatusVariant(item.status as string)}
          className="gap-1"
        >
          {getStatusIcon(item.status as string)}
          {(item.status as string).charAt(0).toUpperCase() +
            (item.status as string).slice(1)}
        </Badge>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "enrolled", label: "Enrolled" },
        { value: "completed", label: "Completed" },
        { value: "dropped", label: "Dropped" },
        { value: "waitlisted", label: "Waitlisted" },
      ],
    },
    {
      key: "className",
      label: "Class",
      options: [
        { value: "all", label: "All Classes" },
        ...trainingClasses.map((c) => ({
          value: c.name,
          label: c.name,
        })),
      ],
    },
  ];

  const activeClasses = trainingClasses.filter((c) => c.status === "active");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Enrollments</h3>
          <p className="text-sm text-muted-foreground">
            Manage pet enrollments in training classes
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Enrollment
        </Button>
      </div>

      {/* Enrollments Table */}
      <DataTable
        data={enrollments as EnrollmentWithRecord[]}
        columns={columns}
        filters={filters}
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
              <DropdownMenuItem onClick={() => handleView(item as Enrollment)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>View Progress</DropdownMenuItem>
              <DropdownMenuItem>Add Note</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Cancel Enrollment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      {/* Add Enrollment Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Enrollment</DialogTitle>
            <DialogDescription>
              Enroll a pet in a training class.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="class">Training Class</Label>
              <Select
                value={formData.classId}
                onValueChange={(value) =>
                  setFormData({ ...formData, classId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {activeClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{c.name}</span>
                        <span className="text-muted-foreground text-sm ml-2">
                          ({c.enrolledCount}/{c.capacity})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="petName">Pet Name</Label>
                <Input
                  id="petName"
                  value={formData.petName}
                  onChange={(e) =>
                    setFormData({ ...formData, petName: e.target.value })
                  }
                  placeholder="e.g., Buddy"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="petBreed">Breed</Label>
                <Input
                  id="petBreed"
                  value={formData.petBreed}
                  onChange={(e) =>
                    setFormData({ ...formData, petBreed: e.target.value })
                  }
                  placeholder="e.g., Golden Retriever"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ownerName">Owner Name</Label>
              <Input
                id="ownerName"
                value={formData.ownerName}
                onChange={(e) =>
                  setFormData({ ...formData, ownerName: e.target.value })
                }
                placeholder="Full name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ownerPhone">Phone</Label>
                <Input
                  id="ownerPhone"
                  value={formData.ownerPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, ownerPhone: e.target.value })
                  }
                  placeholder="(514) 555-0000"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ownerEmail">Email</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, ownerEmail: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any special notes or requirements..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Enroll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Enrollment Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enrollment Details</DialogTitle>
          </DialogHeader>

          {selectedEnrollment && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <PawPrint className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedEnrollment.petName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedEnrollment.petBreed}
                  </p>
                </div>
                <Badge
                  variant={getStatusVariant(selectedEnrollment.status)}
                  className="ml-auto"
                >
                  {selectedEnrollment.status.charAt(0).toUpperCase() +
                    selectedEnrollment.status.slice(1)}
                </Badge>
              </div>

              <div className="grid gap-3 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Class:</span>
                  <span>{selectedEnrollment.className}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Owner:</span>
                  <span>{selectedEnrollment.ownerName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Phone:</span>
                  <span>{selectedEnrollment.ownerPhone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <span>{selectedEnrollment.ownerEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Enrolled:</span>
                  <span>
                    {new Date(
                      selectedEnrollment.enrollmentDate,
                    ).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Session Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {selectedEnrollment.sessionsAttended} /{" "}
                    {selectedEnrollment.totalSessions} sessions
                  </span>
                </div>
                <Progress
                  value={
                    (selectedEnrollment.sessionsAttended /
                      selectedEnrollment.totalSessions) *
                    100
                  }
                />
              </div>

              {selectedEnrollment.notes && (
                <div className="pt-4 border-t">
                  <span className="text-sm font-medium">Notes</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedEnrollment.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
            <Button>View Progress</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
