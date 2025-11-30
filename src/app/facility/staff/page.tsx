"use client";

import { useState } from "react";
import { facilities } from "@/data/facilities";
import {
  staffDocuments as baseStaffDocuments,
  staffCertifications as baseStaffCertifications,
  StaffDocument as BaseStaffDocument,
  StaffCertification as BaseStaffCertification,
} from "@/data/staff-tasks";

// Extend types to be compatible with DataTable's Record<string, unknown> constraint
type StaffDocument = BaseStaffDocument & Record<string, unknown>;
type StaffCertification = BaseStaffCertification & Record<string, unknown>;
const staffDocuments: StaffDocument[] = baseStaffDocuments as StaffDocument[];
const staffCertifications: StaffCertification[] =
  baseStaffCertifications as StaffCertification[];

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileText,
  Award,
  Upload,
  Calendar,
  Phone,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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

type StaffMember = (typeof exampleStaff)[number];

const exportStaffToCSV = (staffData: StaffMember[]) => {
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
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);
  const [activeTab, setActiveTab] = useState("profiles");

  // Document upload modal state
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    staffId: "",
    name: "",
    type: "certification" as const,
    expiresAt: "",
  });

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

  const facilityStaff = exampleStaff;

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

  const handleEdit = (staff: StaffMember) => {
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
    setIsAddEditModalOpen(false);
  };

  const handleDeleteClick = (staff: StaffMember) => {
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

  const handleUploadDocument = () => {
    setIsDocumentModalOpen(false);
    setDocumentForm({
      staffId: "",
      name: "",
      type: "certification",
      expiresAt: "",
    });
  };

  const columns: ColumnDef<StaffMember>[] = [
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
      icon: Phone,
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
      icon: Calendar,
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

  const documentColumns: ColumnDef<(typeof staffDocuments)[number]>[] = [
    {
      key: "staffName",
      label: "Staff Member",
      icon: User,
      defaultVisible: true,
    },
    {
      key: "name",
      label: "Document Name",
      icon: FileText,
      defaultVisible: true,
    },
    {
      key: "type",
      label: "Type",
      defaultVisible: true,
      render: (doc) => (
        <Badge variant="outline" className="capitalize">
          {doc.type.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "uploadedAt",
      label: "Uploaded",
      defaultVisible: true,
    },
    {
      key: "expiresAt",
      label: "Expires",
      defaultVisible: true,
      render: (doc) => {
        if (!doc.expiresAt) return "N/A";
        const isExpired = new Date(doc.expiresAt) < new Date();
        return (
          <span className={isExpired ? "text-destructive font-medium" : ""}>
            {doc.expiresAt}
            {isExpired && " (Expired)"}
          </span>
        );
      },
    },
  ];

  const certificationColumns: ColumnDef<
    (typeof staffCertifications)[number]
  >[] = [
    {
      key: "staffId",
      label: "Staff Member",
      icon: User,
      defaultVisible: true,
      render: (cert) => {
        const staff = facilityStaff.find((s) => s.id === cert.staffId);
        return staff?.name || `Staff #${cert.staffId}`;
      },
    },
    {
      key: "name",
      label: "Certification",
      icon: Award,
      defaultVisible: true,
    },
    {
      key: "issuedBy",
      label: "Issued By",
      defaultVisible: true,
    },
    {
      key: "issuedAt",
      label: "Issued Date",
      defaultVisible: true,
    },
    {
      key: "expiresAt",
      label: "Expires",
      defaultVisible: true,
      render: (cert) => cert.expiresAt || "No Expiry",
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (cert) => {
        const variant =
          cert.status === "valid"
            ? "default"
            : cert.status === "expiring_soon"
              ? "secondary"
              : "destructive";
        return (
          <Badge variant={variant} className="capitalize">
            {cert.status.replace("_", " ")}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">
              Certifications
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staffCertifications.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {staffCertifications.filter((c) => c.status === "valid").length}{" "}
              valid
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffDocuments.length}</div>
            <p className="text-xs text-muted-foreground">
              {staffDocuments.filter((d) => !d.isExpired).length} current
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                staffCertifications.filter((c) => c.status === "expiring_soon")
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Certifications need renewal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Staff Profiles, Documents, Certifications */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="profiles">Staff Profiles</TabsTrigger>
            <TabsTrigger value="certifications">Certifications</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          <div className="flex items-center space-x-2">
            {activeTab === "profiles" && (
              <>
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
              </>
            )}
            {(activeTab === "documents" || activeTab === "certifications") && (
              <Button onClick={() => setIsDocumentModalOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="profiles" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="certifications" className="space-y-4">
          <DataTable
            data={staffCertifications}
            columns={certificationColumns}
            searchKey="name"
            searchPlaceholder="Search certifications..."
            itemsPerPage={10}
            actions={() => (
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <DataTable
            data={staffDocuments}
            columns={documentColumns}
            searchKey="name"
            searchPlaceholder="Search documents..."
            itemsPerPage={10}
            actions={() => (
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          />
        </TabsContent>
      </Tabs>

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

      {/* Upload Document Modal */}
      <Dialog open={isDocumentModalOpen} onOpenChange={setIsDocumentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a new document or certification for a staff member.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="docStaff">Staff Member *</Label>
              <Select
                value={documentForm.staffId}
                onValueChange={(value) =>
                  setDocumentForm({ ...documentForm, staffId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {facilityStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id.toString()}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="docName">Document Name *</Label>
              <Input
                id="docName"
                value={documentForm.name}
                onChange={(e) =>
                  setDocumentForm({ ...documentForm, name: e.target.value })
                }
                placeholder="Pet First Aid Certification"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="docType">Document Type *</Label>
              <Select
                value={documentForm.type}
                onValueChange={(value: typeof documentForm.type) =>
                  setDocumentForm({ ...documentForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="certification">Certification</SelectItem>
                  <SelectItem value="license">License</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="id">ID</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="docExpiry">Expiration Date (if applicable)</Label>
              <Input
                id="docExpiry"
                type="date"
                value={documentForm.expiresAt}
                onChange={(e) =>
                  setDocumentForm({
                    ...documentForm,
                    expiresAt: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="docFile">File *</Label>
              <Input id="docFile" type="file" accept=".pdf,.jpg,.jpeg,.png" />
              <p className="text-xs text-muted-foreground">
                Accepted formats: PDF, JPG, PNG
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDocumentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUploadDocument}>Upload Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
