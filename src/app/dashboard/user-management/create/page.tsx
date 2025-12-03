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
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              User Created Successfully
            </h3>
            <p className="text-muted-foreground mb-4">
              {formData.name} has been added as a{" "}
              {formData.role && roleDisplayNames[formData.role]}.
            </p>
            <p className="text-sm text-muted-foreground">
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
            <ArrowLeft className="h-5 w-5" />
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
                <UserPlus className="h-5 w-5" />
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
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
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
                <Shield className="h-5 w-5" />
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
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium mb-2">Role Permissions:</p>
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
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
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
                  <p className="text-xs text-muted-foreground mt-1">
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
                <MapPin className="h-5 w-5" />
                {"Responsibility Areas"}
              </CardTitle>
              <CardDescription>
                Define the areas this user will be responsible for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {responsibilityOptions.map((area) => (
                  <div
                    key={area}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.responsibilityAreas.includes(area)
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted/50"
                    }`}
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
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium mb-2">
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
        <div className="flex justify-end gap-3 mt-6">
          <Link href="/dashboard/user-management">
            <Button variant="outline" type="button">
              {"Cancel"}
            </Button>
          </Link>
          <Button type="submit" disabled={!isFormValid || isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {"Add User"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
