"use client";

import { useState } from "react";
import { users } from "@/data/users";
import { facilities } from "@/data/facilities";

// Example staff data for testing
const exampleStaff = [
  {
    id: 1,
    name: "Admin User",
    email: "admin@pawsplay.com",
    role: "Admin",
    facility: "Paws & Play Daycare",
    status: "active",
    lastLogin: "2025-11-15",
    phone: "+1-555-0101",
    hireDate: "2025-01-15",
    permissions: [
      "manage_users",
      "manage_facilities",
      "view_reports",
      "manage_billing",
    ],
    pets: [
      { name: "Buddy", type: "Dog", age: 3 },
      { name: "Whiskers", type: "Cat", age: 2 },
    ],
  },
  {
    id: 2,
    name: "Manager One",
    email: "manager1@pawsplay.com",
    role: "Manager",
    facility: "Paws & Play Daycare",
    status: "active",
    lastLogin: "2025-11-15",
    phone: "+1-555-0102",
    hireDate: "2025-06-10",
    permissions: ["manage_staff", "view_reports", "schedule_appointments"],
    pets: [{ name: "Max", type: "Dog", age: 5 }],
  },
  {
    id: 3,
    name: "Sarah Johnson",
    email: "sarah@pawsplay.com",
    role: "Manager",
    facility: "Paws & Play Daycare",
    status: "active",
    lastLogin: "2025-11-15",
    phone: "+1-555-0104",
    hireDate: "2025-02-15",
    permissions: [
      "manage_staff",
      "view_reports",
      "schedule_appointments",
      "manage_inventory",
      "handle_bookings",
    ],
    pets: [{ name: "Coco", type: "Dog", age: 2 }],
  },
  {
    id: 4,
    name: "Mike Chen",
    email: "mike@pawsplay.com",
    role: "Staff",
    facility: "Paws & Play Daycare",
    status: "active",
    lastLogin: "2025-11-15",
    phone: "+1-555-0105",
    hireDate: "2025-04-10",
    permissions: [
      "view_schedule",
      "update_pet_records",
      "assist_clients",
      "perform_grooming",
      "manage_pet_care",
    ],
    pets: [
      { name: "Rex", type: "Dog", age: 4 },
      { name: "Mittens", type: "Cat", age: 1 },
    ],
  },
  {
    id: 5,
    name: "Emily Davis",
    email: "emily@pawsplay.com",
    role: "Staff",
    facility: "Paws & Play Daycare",
    status: "active",
    lastLogin: "2025-11-14",
    phone: "+1-555-0106",
    hireDate: "2025-07-22",
    permissions: [
      "view_schedule",
      "update_pet_records",
      "assist_clients",
      "care_for_cats",
      "update_records",
    ],
    pets: [{ name: "Whiskers", type: "Cat", age: 3 }],
  },
  {
    id: 6,
    name: "Lisa Rodriguez",
    email: "lisa@pawsplay.com",
    role: "Staff",
    facility: "Paws & Play Daycare",
    status: "inactive",
    lastLogin: "2025-11-10",
    phone: "+1-555-0108",
    hireDate: "2025-01-30",
    permissions: [
      "view_schedule",
      "update_pet_records",
      "assist_clients",
      "perform_grooming",
    ],
    pets: [{ name: "Bruno", type: "Dog", age: 6 }],
  },
];
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { UserModal } from "@/components/modals/UserModal";
import {
  Download,
  User,
  Mail as MailIcon,
  Eye,
  Shield,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const exportStaffToCSV = (staffData: typeof users) => {
  const headers = [
    "ID",
    "Name",
    "Email",
    "Phone",
    "Role",
    "Status",
    "Hire Date",
  ];

  const csvContent = [
    headers.join(","),
    ...staffData.map((staff) =>
      [
        staff.id,
        `"${staff.name.replace(/"/g, '""')}"`,
        staff.email,
        staff.phone || "",
        staff.role,
        staff.status,
        staff.hireDate,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `staff_export_${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const availablePermissions = [
  "manage_users",
  "manage_facilities",
  "view_reports",
  "manage_billing",
  "manage_staff",
  "schedule_appointments",
  "view_schedule",
  "update_pet_records",
  "assist_clients",
  "perform_grooming",
  "manage_pet_care",
  "update_records",
  "perform_surgery",
  "schedule_surgeries",
  "assist_vet",
  "update_medical_records",
  "administer_medication",
  "manage_adoptions",
  "care_for_cats",
  "assist_adoptions",
  "manage_inventory",
  "handle_bookings",
];

export default function FacilityStaffPage() {
  // Static facility ID for now (would come from user token in production)
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

  const [selectedStaff, setSelectedStaff] = useState<
    (typeof users)[number] | null
  >(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<
    (typeof users)[number] | null
  >(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState<
    (typeof users)[number] | null
  >(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Staff",
    status: "active",
    hireDate: new Date().toISOString().split("T")[0],
    permissions: [] as string[],
  });

  if (!facility) {
    return <div>Facility not found</div>;
  }

  // Use example staff data for testing (no filter), fallback to imported data with filter
  const facilityStaff =
    exampleStaff.length > 0
      ? exampleStaff
      : users.filter((user) => user.facility === facility.name);

  const handleAddNew = () => {
    setEditingStaff(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "Staff",
      status: "active",
      hireDate: new Date().toISOString().split("T")[0],
      permissions: [],
    });
    setIsAddEditModalOpen(true);
  };

  const handleEdit = (staff: (typeof users)[number]) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      status: staff.status,
      hireDate: staff.hireDate,
      permissions: staff.permissions,
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveStaff = () => {
    // TODO: Save to backend
    setIsAddEditModalOpen(false);
    // In a real app, this would trigger a data refresh
  };

  const handleDeleteClick = (staff: (typeof users)[number]) => {
    setDeletingStaff(staff);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    setIsDeleteModalOpen(false);
    setDeletingStaff(null);
  };

  const togglePermission = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const columns: ColumnDef<(typeof users)[number]>[] = [
    {
      key: "name",
      label: "Name",
      icon: User,
      defaultVisible: true,
    },
    {
      key: "email",
      label: "Email",
      icon: MailIcon,
      defaultVisible: true,
    },
    {
      key: "phone",
      label: "Phone",
      icon: MailIcon,
      defaultVisible: true,
      render: (staff) => staff.phone || "N/A",
    },
    {
      key: "role",
      label: "Role",
      icon: Shield,
      defaultVisible: true,
      render: (staff) => <StatusBadge type="role" value={staff.role} />,
    },
    {
      key: "status",
      label: "Status",
      icon: MailIcon,
      defaultVisible: true,
      render: (staff) => <StatusBadge type="status" value={staff.status} />,
    },
    {
      key: "hireDate",
      label: "Hire Date",
      icon: MailIcon,
      defaultVisible: true,
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Status" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
    {
      key: "role",
      label: "Role",
      options: [
        { value: "all", label: "All Roles" },
        { value: "Admin", label: "Admin" },
        { value: "Manager", label: "Manager" },
        { value: "Staff", label: "Staff" },
      ],
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Staff Management - {facility.name}
        </h2>
        <div className="flex items-center space-x-2">
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Staff
          </Button>
          <Button
            variant="outline"
            onClick={() => exportStaffToCSV(facilityStaff)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facilityStaff.length}</div>
            <p className="text-xs text-muted-foreground">
              {facilityStaff.filter((s) => s.status === "active").length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facilityStaff.filter((s) => s.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facilityStaff.filter((s) => s.role === "Admin").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Administrative roles
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facilityStaff.filter((s) => s.role === "Manager").length}
            </div>
            <p className="text-xs text-muted-foreground">Management roles</p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={facilityStaff}
        columns={columns}
        filters={filters}
        searchKey="name"
        searchPlaceholder="Search staff..."
        itemsPerPage={10}
        actions={(staff) => (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedStaff(staff)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(staff)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteClick(staff)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      />

      {/* View Staff Details Modal */}
      <Dialog
        open={!!selectedStaff}
        onOpenChange={() => setSelectedStaff(null)}
      >
        <DialogContent className="min-w-5xl max-h-[90vh] flex flex-col p-0">
          <div className="p-6 flex-1 overflow-y-auto">
            <DialogHeader className="mb-0">
              <DialogTitle className="sr-only">
                {selectedStaff?.name} - Staff Details
              </DialogTitle>
            </DialogHeader>
            {selectedStaff && <UserModal user={selectedStaff} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Staff Modal */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
            </DialogTitle>
            <DialogDescription>
              {editingStaff
                ? "Update staff member information and permissions."
                : "Add a new staff member to your facility."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="john@example.com"
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
                  placeholder="+1-555-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hireDate">Hire Date</Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) =>
                    setFormData({ ...formData, hireDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  {availablePermissions.map((permission) => (
                    <div
                      key={permission}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={permission}
                        checked={formData.permissions.includes(permission)}
                        onCheckedChange={() => togglePermission(permission)}
                      />
                      <Label
                        htmlFor={permission}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {permission.replace(/_/g, " ")}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Selected permissions: {formData.permissions.length}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveStaff}>
              {editingStaff ? "Update Staff" : "Add Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {deletingStaff?.name} from your
              staff? This action cannot be undone.
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
              Delete Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
