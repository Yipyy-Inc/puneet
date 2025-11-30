"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
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
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Star,
  Calendar,
  Clock,
  Award,
  Users,
  Scissors,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { stylists, stylistAvailability, type Stylist } from "@/data/grooming";

type StylistWithRecord = Stylist & Record<string, unknown>;

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const statusColors = {
  active: { bg: "bg-green-100", text: "text-green-700" },
  inactive: { bg: "bg-gray-100", text: "text-gray-700" },
  "on-leave": { bg: "bg-yellow-100", text: "text-yellow-700" },
};

export default function StylistsPage() {
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingStylist, setEditingStylist] = useState<Stylist | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingStylist, setDeletingStylist] = useState<Stylist | null>(null);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specializations: "",
    certifications: "",
    yearsExperience: 0,
    status: "active" as Stylist["status"],
    bio: "",
  });

  const [availabilityData, setAvailabilityData] = useState<
    Record<number, { isAvailable: boolean; startTime: string; endTime: string }>
  >({
    0: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
    1: { isAvailable: true, startTime: "08:00", endTime: "17:00" },
    2: { isAvailable: true, startTime: "08:00", endTime: "17:00" },
    3: { isAvailable: true, startTime: "08:00", endTime: "17:00" },
    4: { isAvailable: true, startTime: "08:00", endTime: "17:00" },
    5: { isAvailable: true, startTime: "08:00", endTime: "17:00" },
    6: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
  });

  // Stats
  const activeStylists = stylists.filter((s) => s.status === "active").length;
  const totalAppointments = stylists.reduce(
    (sum, s) => sum + s.totalAppointments,
    0,
  );
  const avgRating =
    stylists.reduce((sum, s) => sum + s.rating, 0) / stylists.length;
  const avgExperience =
    stylists.reduce((sum, s) => sum + s.yearsExperience, 0) / stylists.length;

  const handleAddNew = () => {
    setEditingStylist(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      specializations: "",
      certifications: "",
      yearsExperience: 0,
      status: "active",
      bio: "",
    });
    setIsAddEditModalOpen(true);
  };

  const handleEdit = (stylist: Stylist) => {
    setEditingStylist(stylist);
    setFormData({
      name: stylist.name,
      email: stylist.email,
      phone: stylist.phone,
      specializations: stylist.specializations.join(", "),
      certifications: stylist.certifications.join(", "),
      yearsExperience: stylist.yearsExperience,
      status: stylist.status,
      bio: stylist.bio,
    });
    setIsAddEditModalOpen(true);
  };

  const handleSave = () => {
    // In a real app, this would save to the backend
    setIsAddEditModalOpen(false);
  };

  const handleDeleteClick = (stylist: Stylist) => {
    setDeletingStylist(stylist);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    // In a real app, this would delete from the backend
    setIsDeleteModalOpen(false);
  };

  const handleManageAvailability = (stylist: Stylist) => {
    setSelectedStylist(stylist);

    // Load existing availability
    const existingAvailability: Record<
      number,
      { isAvailable: boolean; startTime: string; endTime: string }
    > = {
      0: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
      1: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
      2: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
      3: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
      4: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
      5: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
      6: { isAvailable: false, startTime: "08:00", endTime: "17:00" },
    };

    stylistAvailability
      .filter((a) => a.stylistId === stylist.id)
      .forEach((a) => {
        existingAvailability[a.dayOfWeek] = {
          isAvailable: a.isAvailable,
          startTime: a.startTime,
          endTime: a.endTime,
        };
      });

    setAvailabilityData(existingAvailability);
    setIsAvailabilityModalOpen(true);
  };

  const handleSaveAvailability = () => {
    // In a real app, this would save to the backend
    setIsAvailabilityModalOpen(false);
  };

  const columns: ColumnDef<StylistWithRecord>[] = [
    {
      key: "name",
      label: "Stylist",
      icon: Users,
      defaultVisible: true,
      render: (stylist) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={stylist.photoUrl} />
            <AvatarFallback>
              {stylist.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{stylist.name}</p>
            <p className="text-sm text-muted-foreground">{stylist.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "specializations",
      label: "Specializations",
      icon: Scissors,
      defaultVisible: true,
      render: (stylist) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {stylist.specializations.slice(0, 2).map((spec, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {spec}
            </Badge>
          ))}
          {stylist.specializations.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{stylist.specializations.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "yearsExperience",
      label: "Experience",
      icon: Award,
      defaultVisible: true,
      render: (stylist) => `${stylist.yearsExperience} years`,
    },
    {
      key: "rating",
      label: "Rating",
      icon: Star,
      defaultVisible: true,
      render: (stylist) => (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span>{stylist.rating.toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: "totalAppointments",
      label: "Appointments",
      icon: Calendar,
      defaultVisible: true,
      render: (stylist) => stylist.totalAppointments.toLocaleString(),
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (stylist) => {
        const colors = statusColors[stylist.status];
        return (
          <Badge className={`${colors.bg} ${colors.text}`}>
            {stylist.status}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      defaultVisible: true,
      render: (stylist) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(stylist)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleManageAvailability(stylist)}>
              <Clock className="mr-2 h-4 w-4" />
              Manage Availability
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDeleteClick(stylist)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "on-leave", label: "On Leave" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Stylists
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStylists}</div>
            <p className="text-xs text-muted-foreground">
              of {stylists.length} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalAppointments.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Rating
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              {avgRating.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Across all stylists</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Experience
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgExperience.toFixed(1)} years
            </div>
            <p className="text-xs text-muted-foreground">Team average</p>
          </CardContent>
        </Card>
      </div>

      {/* Stylists Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Stylists Directory</CardTitle>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Stylist
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            data={stylists as StylistWithRecord[]}
            columns={columns}
            filters={filters}
            searchPlaceholder="Search stylists..."
            searchKey={"name" as keyof StylistWithRecord}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStylist ? "Edit Stylist" : "Add New Stylist"}
            </DialogTitle>
            <DialogDescription>
              {editingStylist
                ? "Update the stylist's information below."
                : "Add a new grooming stylist to your team."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearsExperience">Years of Experience</Label>
                <Input
                  id="yearsExperience"
                  type="number"
                  value={formData.yearsExperience}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      yearsExperience: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="specializations">
                Specializations (comma-separated)
              </Label>
              <Input
                id="specializations"
                placeholder="e.g., Breed-specific cuts, Show grooming, De-matting"
                value={formData.specializations}
                onChange={(e) =>
                  setFormData({ ...formData, specializations: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certifications">
                Certifications (comma-separated)
              </Label>
              <Input
                id="certifications"
                placeholder="e.g., Certified Master Groomer, Pet First Aid"
                value={formData.certifications}
                onChange={(e) =>
                  setFormData({ ...formData, certifications: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    status: value as Stylist["status"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on-leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Brief description of the stylist..."
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingStylist ? "Save Changes" : "Add Stylist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Availability Modal */}
      <Dialog
        open={isAvailabilityModalOpen}
        onOpenChange={setIsAvailabilityModalOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Manage Availability - {selectedStylist?.name}
            </DialogTitle>
            <DialogDescription>
              Set the weekly schedule for this stylist. Clients can book
              appointments during available hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {dayNames.map((dayName, dayIndex) => (
              <div
                key={dayIndex}
                className="flex items-center gap-4 p-3 rounded-lg border"
              >
                <div className="w-24">
                  <span className="font-medium">{dayName}</span>
                </div>
                <Switch
                  checked={availabilityData[dayIndex]?.isAvailable || false}
                  onCheckedChange={(checked) =>
                    setAvailabilityData({
                      ...availabilityData,
                      [dayIndex]: {
                        ...availabilityData[dayIndex],
                        isAvailable: checked,
                      },
                    })
                  }
                />
                {availabilityData[dayIndex]?.isAvailable && (
                  <div className="flex items-center gap-2 flex-1">
                    <Select
                      value={availabilityData[dayIndex]?.startTime || "08:00"}
                      onValueChange={(value) =>
                        setAvailabilityData({
                          ...availabilityData,
                          [dayIndex]: {
                            ...availabilityData[dayIndex],
                            startTime: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "06:00",
                          "07:00",
                          "08:00",
                          "09:00",
                          "10:00",
                          "11:00",
                          "12:00",
                        ].map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">to</span>
                    <Select
                      value={availabilityData[dayIndex]?.endTime || "17:00"}
                      onValueChange={(value) =>
                        setAvailabilityData({
                          ...availabilityData,
                          [dayIndex]: {
                            ...availabilityData[dayIndex],
                            endTime: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "14:00",
                          "15:00",
                          "16:00",
                          "17:00",
                          "18:00",
                          "19:00",
                          "20:00",
                        ].map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {!availabilityData[dayIndex]?.isAvailable && (
                  <span className="text-sm text-muted-foreground">
                    Not available
                  </span>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAvailabilityModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveAvailability}>Save Availability</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Stylist</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingStylist?.name}? This
              action cannot be undone. All their appointment history will be
              preserved but they will no longer be available for booking.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
