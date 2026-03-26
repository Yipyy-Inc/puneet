"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  rolePermissions,
  roleDisplayNames,
  AdminRole,
  AccessLevel,
  accessLevelDescriptions,
} from "@/data/admin-users";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  ArrowLeft,
  Save,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

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

export default function CreateUserPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    role: "" as AdminRole | "",
    accessLevel: "" as AccessLevel | "",
    responsibilityAreas: [] as string[],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
  };

  const handleResponsibilityToggle = (area: string) => {
    setFormData({
      ...formData,
      responsibilityAreas: formData.responsibilityAreas.includes(area)
        ? formData.responsibilityAreas.filter((a) => a !== area)
        : [...formData.responsibilityAreas, area],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setShowSuccess(true);

    // Redirect after success
    setTimeout(() => {
      router.push("/dashboard/user-management");
    }, 2000);
  };

  const isFormValid =
    formData.name &&
    formData.email &&
    formData.role &&
    formData.accessLevel &&
    formData.department;

  if (showSuccess) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="size-8 text-green-600" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">
              User Created Successfully
            </h3>
            <p className="text-muted-foreground mb-4">
              {formData.name} has been added as a{" "}
              {formData.role && roleDisplayNames[formData.role]}.
            </p>
            <p className="text-muted-foreground text-sm">
              Redirecting to user management...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/user-management">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {"Create New User"}
          </h2>
          <p className="text-muted-foreground mt-1">
            Add a new admin user with role and permissions
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="size-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Enter the user&apos;s personal and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1-555-0000"
                    className="pl-10"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <div className="relative">
                  <Building className="text-muted-foreground absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2" />
                  <Select
                    value={formData.department}
                    onValueChange={(value) =>
                      setFormData({ ...formData, department: value })
                    }
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
              </div>
            </CardContent>
          </Card>

          {/* Role & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5" />
                Role & Access
              </CardTitle>
              <CardDescription>
                Assign role and set access level
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">User Role *</Label>
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
              </div>

              {formData.role && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="mb-2 text-sm font-medium">Role Permissions:</p>
                  <div className="flex flex-wrap gap-1">
                    {rolePermissions[formData.role].slice(0, 5).map((perm) => (
                      <Badge
                        key={perm}
                        variant="outline"
                        className="text-xs capitalize"
                      >
                        {perm.replace(/_/g, " ")}
                      </Badge>
                    ))}
                    {rolePermissions[formData.role].length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{rolePermissions[formData.role].length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="accessLevel">Access Level *</Label>
                <div className="relative">
                  <Key className="text-muted-foreground absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2" />
                  <Select
                    value={formData.accessLevel}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        accessLevel: value as AccessLevel,
                      })
                    }
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
                {formData.accessLevel && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {accessLevelDescriptions[formData.accessLevel]}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Responsibility Areas */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-5" />
                {"Responsibility Areas"}
              </CardTitle>
              <CardDescription>
                Define the areas this user will be responsible for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {responsibilityOptions.map((area) => (
                  <div
                    key={area}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
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
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <Link href="/dashboard/user-management">
            <Button variant="outline" type="button">
              {"Cancel"}
            </Button>
          </Link>
          <Button type="submit" disabled={!isFormValid || isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="mr-2 animate-spin">⏳</span>
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" />
                {"Add User"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
