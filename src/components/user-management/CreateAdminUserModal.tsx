"use client";

import { useState } from "react";
import {
  rolePermissions,
  roleDisplayNames,
  AdminRole,
  AccessLevel,
  accessLevelDescriptions,
} from "@/data/admin-users";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  UserPlus,
  Mail,
  Phone,
  Building,
  Shield,
  Key,
  MapPin,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  User,
} from "lucide-react";

const departments = [
  "IT Administration",
  "Sales",
  "Technical Support",
  "Account Management",
  "Finance",
  "Marketing",
  "Operations",
];

const responsibilityOptions = [
  "System Configuration",
  "User Management",
  "Security",
  "Lead Generation",
  "Client Acquisition",
  "Enterprise Sales",
  "SMB Sales",
  "Product Demos",
  "Onboarding",
  "Tier 1 Support",
  "Tier 2 Support",
  "Bug Reports",
  "User Training",
  "Enterprise Accounts",
  "Key Accounts",
  "Client Retention",
  "Contract Renewals",
  "Customer Success",
  "Upselling",
  "Financial Compliance",
  "Revenue Audits",
  "Expense Reviews",
  "Internal Audits",
  "Database Management",
  "API Security",
  "Infrastructure",
];

interface CreateAdminUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (newUser: {
    name: string;
    email: string;
    phone: string;
    department: string;
    role: AdminRole;
    accessLevel: AccessLevel;
    responsibilityAreas: string[];
  }) => void;
}

export function CreateAdminUserModal({
  open,
  onOpenChange,
  onSave,
}: CreateAdminUserModalProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    role: "" as AdminRole | "",
    accessLevel: "" as AccessLevel | "",
    responsibilityAreas: [] as string[],
  });

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    department: "",
    role: "",
    accessLevel: "",
  });

  const validateStep1 = () => {
    const newErrors = {
      name: "",
      email: "",
      department: "",
      role: "",
      accessLevel: "",
    };

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.department) {
      newErrors.department = "Department is required";
    }

    setErrors(newErrors);
    return !newErrors.name && !newErrors.email && !newErrors.department;
  };

  const validateStep2 = () => {
    const newErrors = {
      name: "",
      email: "",
      department: "",
      role: "",
      accessLevel: "",
    };

    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    if (!formData.accessLevel) {
      newErrors.accessLevel = "Access level is required";
    }

    setErrors(newErrors);
    return !newErrors.role && !newErrors.accessLevel;
  };

  const handleRoleChange = (role: AdminRole) => {
    setFormData({
      ...formData,
      role,
      // Auto-suggest access level based on role
      accessLevel:
        role === "system_administrator"
          ? "full"
          : role === "financial_auditor"
            ? "read_only"
            : "read_write",
    });
    if (errors.role) setErrors({ ...errors, role: "" });
  };

  const handleResponsibilityToggle = (area: string) => {
    setFormData({
      ...formData,
      responsibilityAreas: formData.responsibilityAreas.includes(area)
        ? formData.responsibilityAreas.filter((a) => a !== area)
        : [...formData.responsibilityAreas, area],
    });
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    onSave({
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      department: formData.department,
      role: formData.role as AdminRole,
      accessLevel: formData.accessLevel as AccessLevel,
      responsibilityAreas: formData.responsibilityAreas,
    });

    setIsSubmitting(false);
    setShowSuccess(true);

    // Auto close after success
    setTimeout(() => {
      resetAndClose();
    }, 1500);
  };

  const resetAndClose = () => {
    setStep(1);
    setShowSuccess(false);
    setFormData({
      name: "",
      email: "",
      phone: "",
      department: "",
      role: "",
      accessLevel: "",
      responsibilityAreas: [],
    });
    setErrors({
      name: "",
      email: "",
      department: "",
      role: "",
      accessLevel: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
        {showSuccess ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">
              User Created Successfully
            </h3>
            <p className="text-muted-foreground">
              {formData.name} has been added as a{" "}
              {formData.role && roleDisplayNames[formData.role as AdminRole]}.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                {"Create New User"} - Step {step} of 3
              </DialogTitle>
              <DialogDescription>
                {step === 1 && "Enter basic user information"}
                {step === 2 && "Assign role and access level"}
                {step === 3 && "Define responsibility areas (optional)"}
              </DialogDescription>
            </DialogHeader>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 py-2">
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${
                  step === 1 ? "bg-primary text-primary-foreground" : "bg-muted"
                } `}
              >
                <User className="size-4" />
                <span className="text-sm font-medium">Basic Info</span>
              </div>
              <ChevronRight className="text-muted-foreground size-4" />
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${
                  step === 2 ? "bg-primary text-primary-foreground" : "bg-muted"
                } `}
              >
                <Shield className="size-4" />
                <span className="text-sm font-medium">Role & Access</span>
              </div>
              <ChevronRight className="text-muted-foreground size-4" />
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${
                  step === 3 ? "bg-primary text-primary-foreground" : "bg-muted"
                } `}
              >
                <MapPin className="size-4" />
                <span className="text-sm font-medium">Areas</span>
              </div>
            </div>

            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: "" });
                    }}
                    placeholder="Enter full name"
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && (
                    <p className="text-destructive text-sm">{errors.name}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (errors.email) setErrors({ ...errors, email: "" });
                      }}
                      placeholder="email@example.com"
                      aria-invalid={!!errors.email}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-destructive text-sm">{errors.email}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="phone"
                      type="tel"
                      className="pl-10"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+1-555-0000"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="department">
                    Department <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Building className="text-muted-foreground absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2" />
                    <Select
                      value={formData.department}
                      onValueChange={(value) => {
                        setFormData({ ...formData, department: value });
                        if (errors.department)
                          setErrors({ ...errors, department: "" });
                      }}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {errors.department && (
                    <p className="text-destructive text-sm">
                      {errors.department}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Role & Access */}
            {step === 2 && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="role">
                    User Role <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      handleRoleChange(value as AdminRole)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(rolePermissions) as AdminRole[]).map(
                        (role) => (
                          <SelectItem key={role} value={role}>
                            {roleDisplayNames[role]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-destructive text-sm">{errors.role}</p>
                  )}
                </div>

                {formData.role && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="mb-2 text-sm font-medium">
                      Role Permissions:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {rolePermissions[formData.role as AdminRole]
                        .slice(0, 5)
                        .map((perm) => (
                          <Badge
                            key={perm}
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {perm.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      {rolePermissions[formData.role as AdminRole].length >
                        5 && (
                        <Badge variant="secondary" className="text-xs">
                          +
                          {rolePermissions[formData.role as AdminRole].length -
                            5}{" "}
                          more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="accessLevel">
                    Access Level <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Key className="text-muted-foreground absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2" />
                    <Select
                      value={formData.accessLevel}
                      onValueChange={(value) => {
                        setFormData({
                          ...formData,
                          accessLevel: value as AccessLevel,
                        });
                        if (errors.accessLevel)
                          setErrors({ ...errors, accessLevel: "" });
                      }}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select access level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">{"Full Access"}</SelectItem>
                        <SelectItem value="read_write">
                          {"Read/Write Access"}
                        </SelectItem>
                        <SelectItem value="read_only">
                          {"Read Only Access"}
                        </SelectItem>
                        <SelectItem value="restricted">
                          {"Restricted Access"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {errors.accessLevel && (
                    <p className="text-destructive text-sm">
                      {errors.accessLevel}
                    </p>
                  )}
                  {formData.accessLevel && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {
                        accessLevelDescriptions[
                          formData.accessLevel as AccessLevel
                        ]
                      }
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Responsibility Areas */}
            {step === 3 && (
              <div className="py-4">
                <p className="text-muted-foreground mb-4 text-sm">
                  Select the areas this user will be responsible for (optional)
                </p>
                <div className="grid max-h-[300px] grid-cols-2 gap-2 overflow-y-auto">
                  {responsibilityOptions.map((area) => (
                    <div
                      key={area}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 transition-colors ${
                        formData.responsibilityAreas.includes(area)
                          ? "border-primary bg-primary/10"
                          : "hover:bg-muted/50"
                      } `}
                      onClick={() => handleResponsibilityToggle(area)}
                    >
                      <Checkbox
                        checked={formData.responsibilityAreas.includes(area)}
                        onCheckedChange={() => handleResponsibilityToggle(area)}
                      />
                      <span className="text-sm">{area}</span>
                    </div>
                  ))}
                </div>
                {formData.responsibilityAreas.length > 0 && (
                  <div className="bg-muted/30 mt-4 rounded-lg p-3">
                    <p className="mb-2 text-sm font-medium">
                      Selected Areas ({formData.responsibilityAreas.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {formData.responsibilityAreas.map((area) => (
                        <Badge key={area} variant="secondary">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              {step === 1 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetAndClose}
                  >
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleNext}>
                    Next
                    <ChevronRight className="ml-2 size-4" />
                  </Button>
                </>
              ) : step === 2 ? (
                <>
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <ChevronLeft className="mr-2 size-4" />
                    Back
                  </Button>
                  <Button type="button" onClick={handleNext}>
                    Next
                    <ChevronRight className="ml-2 size-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <ChevronLeft className="mr-2 size-4" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="mr-2 animate-spin">⏳</span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 size-4" />
                        {"Add User"}
                      </>
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
