"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Step } from "@/components/ui/stepper";
import { plans } from "@/data/plans";
import { availableModules } from "@/data/facilities";
import {
  Building,
  Building2,
  MapPin,
  User,
  Users,
  UserCheck,
  PawPrint,
  CreditCard,
  Settings,
  CheckCircle,
  ArrowLeft,
  Clock,
  Scissors,
  Dog,
  Home,
  GraduationCap,
  Plus,
  Trash2,
  Shield,
  Calendar,
  MessageSquare,
  Package,
  Layers,
} from "lucide-react";

const steps: Step[] = [
  {
    id: "basic",
    title: "Basic Information",
    description: "Facility details",
  },
  {
    id: "business",
    title: "Business Type",
    description: "Services & capacity",
  },
  {
    id: "location",
    title: "Location & Contact",
    description: "Address & hours",
  },
  {
    id: "owner",
    title: "Owner Details",
    description: "Admin account",
  },
  {
    id: "staff",
    title: "Staff Members",
    description: "Team setup",
  },
  {
    id: "modules",
    title: "Modules",
    description: "Features & tools",
  },
  {
    id: "plan",
    title: "Subscription",
    description: "Choose plan",
  },
  {
    id: "review",
    title: "Review",
    description: "Confirm details",
  },
];

const staffRoles = [
  {
    id: "manager",
    label: "Manager",
    description: "Full access to facility operations",
    permissions: [
      "manage_bookings",
      "manage_clients",
      "manage_staff",
      "view_reports",
      "manage_inventory",
    ],
  },
  {
    id: "receptionist",
    label: "Receptionist",
    description: "Handle bookings and client interactions",
    permissions: ["manage_bookings", "view_clients", "check_in_out"],
  },
  {
    id: "groomer",
    label: "Groomer",
    description: "Grooming services and appointments",
    permissions: ["view_bookings", "manage_grooming", "view_clients"],
  },
  {
    id: "trainer",
    label: "Trainer",
    description: "Training sessions and programs",
    permissions: ["view_bookings", "manage_training", "view_clients"],
  },
  {
    id: "caretaker",
    label: "Caretaker",
    description: "Pet care and daily operations",
    permissions: ["view_bookings", "check_in_out", "daily_logs"],
  },
];

const allPermissions = [
  { id: "manage_bookings", label: "Manage Bookings", category: "Bookings" },
  { id: "view_bookings", label: "View Bookings", category: "Bookings" },
  { id: "manage_clients", label: "Manage Clients", category: "Clients" },
  { id: "view_clients", label: "View Clients", category: "Clients" },
  { id: "check_in_out", label: "Check In/Out", category: "Operations" },
  { id: "daily_logs", label: "Daily Logs", category: "Operations" },
  { id: "manage_staff", label: "Manage Staff", category: "Staff" },
  { id: "view_reports", label: "View Reports", category: "Reports" },
  { id: "manage_inventory", label: "Manage Inventory", category: "Inventory" },
  { id: "manage_grooming", label: "Manage Grooming", category: "Services" },
  { id: "manage_training", label: "Manage Training", category: "Services" },
];

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  permissions: string[];
  autoGeneratePassword: boolean;
}

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  services: string[];
  operatingHours: Record<
    string,
    { enabled: boolean; open: string; close: string }
  >;
}

const getModuleIcon = (iconName: string) => {
  switch (iconName) {
    case "Calendar":
      return Calendar;
    case "Users":
      return Users;
    case "UserCheck":
      return UserCheck;
    case "CreditCard":
      return CreditCard;
    case "MessageSquare":
      return MessageSquare;
    case "GraduationCap":
      return GraduationCap;
    case "Scissors":
      return Scissors;
    case "Package":
      return Package;
    default:
      return Layers;
  }
};

const businessTypes = [
  {
    id: "boarding",
    label: "Pet Boarding",
    icon: Home,
    description: "Overnight stays and extended care",
  },
  {
    id: "daycare",
    label: "Pet Daycare",
    icon: Dog,
    description: "Daytime supervision and play",
  },
  {
    id: "grooming",
    label: "Pet Grooming",
    icon: Scissors,
    description: "Bathing, haircuts, and styling",
  },
  {
    id: "training",
    label: "Training/Education",
    icon: GraduationCap,
    description: "Obedience and behavior training",
  },
];

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function NewFacilityPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Basic Info
    name: "",
    description: "",
    website: "",

    // Business Type
    businessTypes: [] as string[],
    services: [] as string[],
    limitLocations: "",
    limitStaff: "",
    limitClients: "",
    limitPets: "",

    // Location & Contact
    email: "",
    phone: "",
    locations: [] as Location[],

    // Owner Details
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    adminPassword: "",
    adminConfirmPassword: "",
    autoGeneratePassword: true,

    // Staff Members
    staffMembers: [] as StaffMember[],

    // Modules
    enabledModules: ["booking", "customers"] as string[],

    // Plan Selection
    selectedPlan: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!formData.name.trim()) newErrors.name = "Facility name is required";
      if (!formData.email.trim()) newErrors.email = "Email is required";
    } else if (step === 1) {
      if (formData.businessTypes.length === 0) {
        newErrors.businessTypes = "Select at least one business type";
      }
    } else if (step === 2) {
      if (formData.locations.length === 0) {
        newErrors.locations = "Add at least one location";
      } else {
        formData.locations.forEach((loc, index) => {
          if (!loc.name.trim())
            newErrors[`loc_${index}_name`] = "Location name is required";
          if (!loc.address.trim())
            newErrors[`loc_${index}_address`] = "Address is required";
          if (!loc.city.trim())
            newErrors[`loc_${index}_city`] = "City is required";
          if (!loc.state.trim())
            newErrors[`loc_${index}_state`] = "State is required";
          if (loc.services.length === 0)
            newErrors[`loc_${index}_services`] = "Select at least one service";
        });
      }
    } else if (step === 3) {
      if (!formData.ownerName.trim())
        newErrors.ownerName = "Owner name is required";
      if (!formData.ownerEmail.trim())
        newErrors.ownerEmail = "Owner email is required";
      if (!formData.autoGeneratePassword) {
        if (!formData.adminPassword)
          newErrors.adminPassword = "Password is required";
        if (formData.adminPassword !== formData.adminConfirmPassword) {
          newErrors.adminConfirmPassword = "Passwords do not match";
        }
      }
    } else if (step === 4) {
      // Staff validation - optional, just validate if any are added
      formData.staffMembers.forEach((staff, index) => {
        if (!staff.name.trim()) {
          newErrors[`staff_${index}_name`] = "Staff name is required";
        }
        if (!staff.email.trim()) {
          newErrors[`staff_${index}_email`] = "Staff email is required";
        }
        if (!staff.role) {
          newErrors[`staff_${index}_role`] = "Role is required";
        }
      });
    } else if (step === 5) {
      if (formData.enabledModules.length === 0) {
        newErrors.modules = "Select at least one module";
      }
    } else if (step === 6) {
      if (!formData.selectedPlan)
        newErrors.selectedPlan = "Please select a plan";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleComplete = () => {
    if (validateStep(currentStep)) {
      // In a real app, this would submit to an API
      console.log("Creating facility with data:", formData);
      router.push("/dashboard/facilities");
    }
  };

  const toggleBusinessType = (typeId: string) => {
    setFormData((prev) => ({
      ...prev,
      businessTypes: prev.businessTypes.includes(typeId)
        ? prev.businessTypes.filter((t) => t !== typeId)
        : [...prev.businessTypes, typeId],
    }));
  };

  const createDefaultOperatingHours = () =>
    daysOfWeek.reduce(
      (acc, day) => ({
        ...acc,
        [day]: { enabled: day !== "Sunday", open: "08:00", close: "18:00" },
      }),
      {} as Record<string, { enabled: boolean; open: string; close: string }>,
    );

  const addLocation = () => {
    const newLocation: Location = {
      id: `loc-${Date.now()}`,
      name: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "US",
      phone: "",
      services: [],
      operatingHours: createDefaultOperatingHours(),
    };
    setFormData((prev) => ({
      ...prev,
      locations: [...prev.locations, newLocation],
    }));
  };

  const removeLocation = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      locations: prev.locations.filter((l) => l.id !== id),
    }));
  };

  const updateLocation = (
    id: string,
    field: keyof Location,
    value: string | string[],
  ) => {
    setFormData((prev) => ({
      ...prev,
      locations: prev.locations.map((l) =>
        l.id === id ? { ...l, [field]: value } : l,
      ),
    }));
  };

  const toggleLocationService = (locationId: string, serviceId: string) => {
    setFormData((prev) => ({
      ...prev,
      locations: prev.locations.map((l) =>
        l.id === locationId
          ? {
              ...l,
              services: l.services.includes(serviceId)
                ? l.services.filter((s) => s !== serviceId)
                : [...l.services, serviceId],
            }
          : l,
      ),
    }));
  };

  const toggleLocationOperatingDay = (locationId: string, day: string) => {
    setFormData((prev) => ({
      ...prev,
      locations: prev.locations.map((l) =>
        l.id === locationId
          ? {
              ...l,
              operatingHours: {
                ...l.operatingHours,
                [day]: {
                  ...l.operatingHours[day],
                  enabled: !l.operatingHours[day].enabled,
                },
              },
            }
          : l,
      ),
    }));
  };

  const updateLocationOperatingHours = (
    locationId: string,
    day: string,
    field: "open" | "close",
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      locations: prev.locations.map((l) =>
        l.id === locationId
          ? {
              ...l,
              operatingHours: {
                ...l.operatingHours,
                [day]: {
                  ...l.operatingHours[day],
                  [field]: value,
                },
              },
            }
          : l,
      ),
    }));
  };

  const addStaffMember = () => {
    const newStaff: StaffMember = {
      id: `staff-${Date.now()}`,
      name: "",
      email: "",
      phone: "",
      role: "",
      permissions: [],
      autoGeneratePassword: true,
    };
    setFormData((prev) => ({
      ...prev,
      staffMembers: [...prev.staffMembers, newStaff],
    }));
  };

  const removeStaffMember = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      staffMembers: prev.staffMembers.filter((s) => s.id !== id),
    }));
  };

  const updateStaffMember = (
    id: string,
    field: keyof StaffMember,
    value: string | string[] | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      staffMembers: prev.staffMembers.map((s) =>
        s.id === id ? { ...s, [field]: value } : s,
      ),
    }));
  };

  const handleRoleChange = (staffId: string, roleId: string) => {
    const role = staffRoles.find((r) => r.id === roleId);
    setFormData((prev) => ({
      ...prev,
      staffMembers: prev.staffMembers.map((s) =>
        s.id === staffId
          ? { ...s, role: roleId, permissions: role?.permissions || [] }
          : s,
      ),
    }));
  };

  const toggleStaffPermission = (staffId: string, permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      staffMembers: prev.staffMembers.map((s) =>
        s.id === staffId
          ? {
              ...s,
              permissions: s.permissions.includes(permissionId)
                ? s.permissions.filter((p) => p !== permissionId)
                : [...s.permissions, permissionId],
            }
          : s,
      ),
    }));
  };

  const toggleModule = (moduleId: string) => {
    setFormData((prev) => ({
      ...prev,
      enabledModules: prev.enabledModules.includes(moduleId)
        ? prev.enabledModules.filter((m) => m !== moduleId)
        : [...prev.enabledModules, moduleId],
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Facility Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter facility name"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-destructive text-sm">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Business Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="contact@facility.com"
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-destructive text-sm">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Business Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                placeholder="https://www.yourfacility.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe your facility, services, and what makes you unique..."
                rows={4}
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>
                Business Type <span className="text-destructive">*</span>
              </Label>
              <p className="text-muted-foreground text-sm">
                Select all that apply to your facility
              </p>
              <div className="grid grid-cols-2 gap-4">
                {businessTypes.map((type) => (
                  <Card
                    key={type.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      formData.businessTypes.includes(type.id)
                        ? "border-primary ring-primary ring-2"
                        : ""
                    } `}
                    onClick={() => toggleBusinessType(type.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`rounded-lg p-2 ${
                            formData.businessTypes.includes(type.id)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          } `}
                        >
                          <type.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium">{type.label}</h4>
                          <p className="text-muted-foreground text-sm">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {errors.businessTypes && (
                <p className="text-destructive text-sm">
                  {errors.businessTypes}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <Label>Capacity Limits</Label>
              <p className="text-muted-foreground text-sm">
                Set maximum limits for facility resources (leave empty for plan
                defaults)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="limitLocations"
                    className="flex items-center gap-2 text-sm"
                  >
                    <MapPin className="text-muted-foreground size-4" />
                    Locations
                  </Label>
                  <Input
                    id="limitLocations"
                    type="number"
                    min="1"
                    value={formData.limitLocations}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limitLocations: e.target.value,
                      })
                    }
                    placeholder="Plan default"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="limitStaff"
                    className="flex items-center gap-2 text-sm"
                  >
                    <Users className="text-muted-foreground size-4" />
                    Staff Members
                  </Label>
                  <Input
                    id="limitStaff"
                    type="number"
                    min="1"
                    value={formData.limitStaff}
                    onChange={(e) =>
                      setFormData({ ...formData, limitStaff: e.target.value })
                    }
                    placeholder="Plan default"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="limitClients"
                    className="flex items-center gap-2 text-sm"
                  >
                    <UserCheck className="text-muted-foreground size-4" />
                    Clients
                  </Label>
                  <Input
                    id="limitClients"
                    type="number"
                    min="1"
                    value={formData.limitClients}
                    onChange={(e) =>
                      setFormData({ ...formData, limitClients: e.target.value })
                    }
                    placeholder="Plan default"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="limitPets"
                    className="flex items-center gap-2 text-sm"
                  >
                    <PawPrint className="text-muted-foreground size-4" />
                    Pets
                  </Label>
                  <Input
                    id="limitPets"
                    type="number"
                    min="1"
                    value={formData.limitPets}
                    onChange={(e) =>
                      setFormData({ ...formData, limitPets: e.target.value })
                    }
                    placeholder="Plan default"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>
                  Locations <span className="text-destructive">*</span>
                </Label>
                <p className="text-muted-foreground mt-1 text-sm">
                  Add locations and specify which services are available at each
                </p>
              </div>
              <Button onClick={addLocation} variant="outline" size="sm">
                <Plus className="mr-2 size-4" />
                Add Location
              </Button>
            </div>

            {errors.locations && (
              <p className="text-destructive text-sm">{errors.locations}</p>
            )}

            {formData.locations.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <MapPin className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                  <p className="text-muted-foreground">
                    No locations added yet
                  </p>
                  <Button
                    onClick={addLocation}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    <Plus className="mr-2 size-4" />
                    Add Your First Location
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {formData.locations.map((location, index) => (
                  <Card key={location.id} className="shadow-card border-0">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Building2 className="size-4" />
                          Location {index + 1}
                          {location.name && ` - ${location.name}`}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLocation(location.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Location Name */}
                      <div className="space-y-2">
                        <Label className="text-sm">
                          Location Name{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={location.name}
                          onChange={(e) =>
                            updateLocation(location.id, "name", e.target.value)
                          }
                          placeholder="e.g., Main Campus, Downtown Branch"
                          className={
                            errors[`loc_${index}_name`]
                              ? "border-destructive"
                              : ""
                          }
                        />
                        {errors[`loc_${index}_name`] && (
                          <p className="text-destructive text-sm">
                            {errors[`loc_${index}_name`]}
                          </p>
                        )}
                      </div>

                      {/* Address */}
                      <div className="space-y-2">
                        <Label className="text-sm">
                          Street Address{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={location.address}
                          onChange={(e) =>
                            updateLocation(
                              location.id,
                              "address",
                              e.target.value,
                            )
                          }
                          placeholder="123 Main Street"
                          className={
                            errors[`loc_${index}_address`]
                              ? "border-destructive"
                              : ""
                          }
                        />
                        {errors[`loc_${index}_address`] && (
                          <p className="text-destructive text-sm">
                            {errors[`loc_${index}_address`]}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm">
                            City <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={location.city}
                            onChange={(e) =>
                              updateLocation(
                                location.id,
                                "city",
                                e.target.value,
                              )
                            }
                            placeholder="City"
                            className={
                              errors[`loc_${index}_city`]
                                ? "border-destructive"
                                : ""
                            }
                          />
                          {errors[`loc_${index}_city`] && (
                            <p className="text-destructive text-sm">
                              {errors[`loc_${index}_city`]}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">
                            State <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={location.state}
                            onChange={(e) =>
                              updateLocation(
                                location.id,
                                "state",
                                e.target.value,
                              )
                            }
                            placeholder="State"
                            className={
                              errors[`loc_${index}_state`]
                                ? "border-destructive"
                                : ""
                            }
                          />
                          {errors[`loc_${index}_state`] && (
                            <p className="text-destructive text-sm">
                              {errors[`loc_${index}_state`]}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm">ZIP Code</Label>
                          <Input
                            value={location.zipCode}
                            onChange={(e) =>
                              updateLocation(
                                location.id,
                                "zipCode",
                                e.target.value,
                              )
                            }
                            placeholder="12345"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Country</Label>
                          <Select
                            value={location.country}
                            onValueChange={(value) =>
                              updateLocation(location.id, "country", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="US">United States</SelectItem>
                              <SelectItem value="CA">Canada</SelectItem>
                              <SelectItem value="UK">United Kingdom</SelectItem>
                              <SelectItem value="AU">Australia</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Phone</Label>
                        <Input
                          value={location.phone}
                          onChange={(e) =>
                            updateLocation(location.id, "phone", e.target.value)
                          }
                          placeholder="(555) 123-4567"
                        />
                      </div>

                      {/* Services at this location */}
                      <div className="space-y-3 border-t pt-2">
                        <Label className="text-sm">
                          Services at this Location{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <p className="text-muted-foreground text-xs">
                          Select which services are offered at this location
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {businessTypes.map((type) => {
                            const isSelected = location.services.includes(
                              type.id,
                            );
                            const isBusinessTypeEnabled =
                              formData.businessTypes.includes(type.id);
                            return (
                              <div
                                key={type.id}
                                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/5"
                                    : `border-muted hover:border-muted-foreground/30`
                                } ${
                                  !isBusinessTypeEnabled
                                    ? `cursor-not-allowed opacity-50`
                                    : ""
                                } `}
                                onClick={() => {
                                  if (isBusinessTypeEnabled) {
                                    toggleLocationService(location.id, type.id);
                                  }
                                }}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  disabled={!isBusinessTypeEnabled}
                                  className="pointer-events-none"
                                />
                                <type.icon className="text-muted-foreground size-4" />
                                <span className="text-sm">{type.label}</span>
                              </div>
                            );
                          })}
                        </div>
                        {errors[`loc_${index}_services`] && (
                          <p className="text-destructive text-sm">
                            {errors[`loc_${index}_services`]}
                          </p>
                        )}
                        {formData.businessTypes.length === 0 && (
                          <p className="text-xs text-amber-600">
                            Select business types in the previous step to enable
                            services
                          </p>
                        )}
                      </div>

                      {/* Operating Hours */}
                      <div className="space-y-3 border-t pt-2">
                        <div className="flex items-center gap-2">
                          <Clock className="text-muted-foreground size-4" />
                          <Label className="text-sm">Operating Hours</Label>
                        </div>
                        <div className="space-y-2">
                          {daysOfWeek.map((day) => (
                            <div
                              key={day}
                              className="bg-muted/50 flex items-center gap-4 rounded-lg p-2"
                            >
                              <div className="flex w-28 items-center gap-2">
                                <Checkbox
                                  id={`${location.id}-day-${day}`}
                                  checked={location.operatingHours[day].enabled}
                                  onCheckedChange={() =>
                                    toggleLocationOperatingDay(location.id, day)
                                  }
                                />
                                <Label
                                  htmlFor={`${location.id}-day-${day}`}
                                  className="cursor-pointer text-xs font-medium"
                                >
                                  {day.slice(0, 3)}
                                </Label>
                              </div>
                              {location.operatingHours[day].enabled ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="time"
                                    value={location.operatingHours[day].open}
                                    onChange={(e) =>
                                      updateLocationOperatingHours(
                                        location.id,
                                        day,
                                        "open",
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 w-28 text-xs"
                                  />
                                  <span className="text-muted-foreground text-xs">
                                    to
                                  </span>
                                  <Input
                                    type="time"
                                    value={location.operatingHours[day].close}
                                    onChange={(e) =>
                                      updateLocationOperatingHours(
                                        location.id,
                                        day,
                                        "close",
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 w-28 text-xs"
                                  />
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  Closed
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="ownerName">
                Owner / Admin Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ownerName"
                value={formData.ownerName}
                onChange={(e) =>
                  setFormData({ ...formData, ownerName: e.target.value })
                }
                placeholder="John Doe"
                className={errors.ownerName ? "border-destructive" : ""}
              />
              {errors.ownerName && (
                <p className="text-destructive text-sm">{errors.ownerName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerEmail">
                Owner Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ownerEmail"
                type="email"
                value={formData.ownerEmail}
                onChange={(e) =>
                  setFormData({ ...formData, ownerEmail: e.target.value })
                }
                placeholder="owner@facility.com"
                className={errors.ownerEmail ? "border-destructive" : ""}
              />
              {errors.ownerEmail && (
                <p className="text-destructive text-sm">{errors.ownerEmail}</p>
              )}
              <p className="text-muted-foreground text-xs">
                This will be used as the admin login email
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerPhone">Owner Phone</Label>
              <Input
                id="ownerPhone"
                value={formData.ownerPhone}
                onChange={(e) =>
                  setFormData({ ...formData, ownerPhone: e.target.value })
                }
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-generate Password</Label>
                  <p className="text-muted-foreground text-sm">
                    Generate a secure password and send it via email
                  </p>
                </div>
                <Checkbox
                  checked={formData.autoGeneratePassword}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      autoGeneratePassword: !!checked,
                    })
                  }
                />
              </div>

              {!formData.autoGeneratePassword && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      value={formData.adminPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          adminPassword: e.target.value,
                        })
                      }
                      placeholder="Enter password"
                      className={
                        errors.adminPassword ? "border-destructive" : ""
                      }
                    />
                    {errors.adminPassword && (
                      <p className="text-destructive text-sm">
                        {errors.adminPassword}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminConfirmPassword">
                      Confirm Password{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="adminConfirmPassword"
                      type="password"
                      value={formData.adminConfirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          adminConfirmPassword: e.target.value,
                        })
                      }
                      placeholder="Confirm password"
                      className={
                        errors.adminConfirmPassword ? "border-destructive" : ""
                      }
                    />
                    {errors.adminConfirmPassword && (
                      <p className="text-destructive text-sm">
                        {errors.adminConfirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Staff Members</Label>
                <p className="text-muted-foreground text-sm">
                  Add team members who will use the system
                </p>
              </div>
              <Button onClick={addStaffMember} variant="outline" size="sm">
                <Plus className="mr-2 size-4" />
                Add Staff
              </Button>
            </div>

            {formData.staffMembers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <Users className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                  <h3 className="mb-1 font-medium">No staff members added</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    You can add staff members now or later from the facility
                    settings
                  </p>
                  <Button onClick={addStaffMember} variant="outline">
                    <Plus className="mr-2 size-4" />
                    Add First Staff Member
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {formData.staffMembers.map((staff, index) => (
                  <Card key={staff.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/30 pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <User className="size-4" />
                          Staff Member {index + 1}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStaffMember(staff.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>
                            Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={staff.name}
                            onChange={(e) =>
                              updateStaffMember(
                                staff.id,
                                "name",
                                e.target.value,
                              )
                            }
                            placeholder="Staff name"
                            className={
                              errors[`staff_${index}_name`]
                                ? "border-destructive"
                                : ""
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            Email <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="email"
                            value={staff.email}
                            onChange={(e) =>
                              updateStaffMember(
                                staff.id,
                                "email",
                                e.target.value,
                              )
                            }
                            placeholder="staff@facility.com"
                            className={
                              errors[`staff_${index}_email`]
                                ? "border-destructive"
                                : ""
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input
                            value={staff.phone}
                            onChange={(e) =>
                              updateStaffMember(
                                staff.id,
                                "phone",
                                e.target.value,
                              )
                            }
                            placeholder="(555) 123-4567"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            Role <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={staff.role}
                            onValueChange={(value) =>
                              handleRoleChange(staff.id, value)
                            }
                          >
                            <SelectTrigger
                              className={
                                errors[`staff_${index}_role`]
                                  ? "border-destructive"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {staffRoles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  <div className="flex flex-col">
                                    <span>{role.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {staff.role && (
                        <div className="space-y-3 border-t pt-3">
                          <div className="flex items-center gap-2">
                            <Shield className="text-muted-foreground size-4" />
                            <Label className="text-sm">Permissions</Label>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {allPermissions.map((permission) => (
                              <div
                                key={permission.id}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  id={`${staff.id}-${permission.id}`}
                                  checked={staff.permissions.includes(
                                    permission.id,
                                  )}
                                  onCheckedChange={() =>
                                    toggleStaffPermission(
                                      staff.id,
                                      permission.id,
                                    )
                                  }
                                />
                                <Label
                                  htmlFor={`${staff.id}-${permission.id}`}
                                  className="cursor-pointer text-xs"
                                >
                                  {permission.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <Checkbox
                          id={`${staff.id}-auto-password`}
                          checked={staff.autoGeneratePassword}
                          onCheckedChange={(checked) =>
                            updateStaffMember(
                              staff.id,
                              "autoGeneratePassword",
                              !!checked,
                            )
                          }
                        />
                        <Label
                          htmlFor={`${staff.id}-auto-password`}
                          className="cursor-pointer text-sm"
                        >
                          Auto-generate password and send via email
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base">
                Enable Modules <span className="text-destructive">*</span>
              </Label>
              <p className="text-muted-foreground text-sm">
                Select the features and tools this facility will have access to
              </p>
            </div>

            {errors.modules && (
              <p className="text-destructive text-sm">{errors.modules}</p>
            )}

            <div className="grid gap-3">
              {availableModules.map((module) => {
                const Icon = getModuleIcon(module.icon);
                const isEnabled = formData.enabledModules.includes(module.id);

                return (
                  <Card
                    key={module.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${isEnabled ? "border-primary ring-primary ring-2" : ""} `}
                    onClick={() => toggleModule(module.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`rounded-lg p-2 ${
                              isEnabled
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            } `}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium">{module.name}</h4>
                            <p className="text-muted-foreground text-sm">
                              {module.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">
                            ${module.basePrice}/mo
                          </span>
                          <Checkbox
                            checked={isEnabled}
                            onCheckedChange={() => toggleModule(module.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Selected Modules</span>
                  <div className="text-right">
                    <span className="text-lg font-bold">
                      $
                      {formData.enabledModules
                        .reduce((sum, id) => {
                          const mod = availableModules.find((m) => m.id === id);
                          return sum + (mod?.basePrice || 0);
                        }, 0)
                        .toFixed(2)}
                    </span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {formData.enabledModules.map((id) => {
                    const mod = availableModules.find((m) => m.id === id);
                    return (
                      <Badge key={id} variant="secondary">
                        {mod?.name}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <Label>
              Select a Plan <span className="text-destructive">*</span>
            </Label>
            <div className="grid gap-4">
              {plans.map((plan) => {
                const formatLimit = (value: number) =>
                  value === -1 ? "Unlimited" : value.toString();
                return (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      formData.selectedPlan === plan.id
                        ? "border-primary ring-primary ring-2"
                        : ""
                    } `}
                    onClick={() =>
                      setFormData({ ...formData, selectedPlan: plan.id })
                    }
                  >
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`rounded-lg p-2 ${
                              formData.selectedPlan === plan.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            } `}
                          >
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{plan.name}</h3>
                            <p className="text-muted-foreground text-sm">
                              {plan.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {plan.pricing.length > 0
                              ? `$${Math.min(
                                  ...plan.pricing.map((p) => p.basePrice),
                                )}`
                              : "$0"}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            /month
                          </div>
                        </div>
                      </div>
                      {/* Plan Limits */}
                      <div className="grid grid-cols-4 gap-2 border-t pt-3">
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>
                            {formatLimit(plan.limits.locations)} locations
                          </span>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <Users className="h-3.5 w-3.5" />
                          <span>{formatLimit(plan.limits.staff)} staff</span>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>
                            {formatLimit(plan.limits.clients)} clients
                          </span>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <PawPrint className="h-3.5 w-3.5" />
                          <span>{formatLimit(plan.limits.pets)} pets</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {errors.selectedPlan && (
              <p className="text-destructive text-sm">{errors.selectedPlan}</p>
            )}
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="border-success/20 bg-success/10 rounded-lg border p-4">
              <div className="text-success mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Ready to Create</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Please review all the details below before creating the
                facility.
              </p>
            </div>

            <Card className="shadow-card border-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building className="size-4" />
                  Facility Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between border-b py-1">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between border-b py-1">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{formData.email}</span>
                </div>
                <div className="flex justify-between border-b py-1">
                  <span className="text-muted-foreground">Business Type</span>
                  <div className="flex gap-1">
                    {formData.businessTypes.map((type) => (
                      <Badge key={type} variant="secondary">
                        {businessTypes.find((t) => t.id === type)?.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Limits</span>
                  <span className="text-right text-xs font-medium">
                    {formData.limitLocations || "Default"} locations,{" "}
                    {formData.limitStaff || "Default"} staff,{" "}
                    {formData.limitClients || "Default"} clients,{" "}
                    {formData.limitPets || "Default"} pets
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="size-4" />
                  Locations ({formData.locations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {formData.locations.map((location, index) => (
                  <div
                    key={location.id}
                    className={index > 0 ? "border-t pt-3" : ""}
                  >
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">
                        {location.name || `Location ${index + 1}`}
                      </span>
                      <span className="text-right text-xs font-medium">
                        {location.address}, {location.city}, {location.state}{" "}
                        {location.zipCode}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground text-xs">
                        Services
                      </span>
                      <div className="flex flex-wrap justify-end gap-1">
                        {location.services.map((serviceId) => (
                          <Badge
                            key={serviceId}
                            variant="secondary"
                            className="text-xs"
                          >
                            {
                              businessTypes.find((t) => t.id === serviceId)
                                ?.label
                            }
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground text-xs">
                        Operating Days
                      </span>
                      <span className="text-xs font-medium">
                        {
                          Object.values(location.operatingHours).filter(
                            (h) => h.enabled,
                          ).length
                        }{" "}
                        days/week
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-card border-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="size-4" />
                  Owner Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between border-b py-1">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{formData.ownerName}</span>
                </div>
                <div className="flex justify-between border-b py-1">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{formData.ownerEmail}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Password</span>
                  <span className="font-medium">
                    {formData.autoGeneratePassword
                      ? "Auto-generated (sent via email)"
                      : "Manually set"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4" />
                  Staff Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between border-b py-1">
                  <span className="text-muted-foreground">Total Staff</span>
                  <span className="font-medium">
                    {formData.staffMembers.length} member
                    {formData.staffMembers.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {formData.staffMembers.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {formData.staffMembers.map((staff) => (
                      <div
                        key={staff.id}
                        className="flex justify-between py-1 text-xs"
                      >
                        <span>{staff.name || "Unnamed"}</span>
                        <Badge variant="outline" className="text-xs">
                          {staffRoles.find((r) => r.id === staff.role)?.label ||
                            "No role"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-card border-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="size-4" />
                  Enabled Modules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between border-b py-1">
                  <span className="text-muted-foreground">Modules</span>
                  <span className="font-medium">
                    {formData.enabledModules.length} enabled
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {formData.enabledModules.map((id) => {
                    const mod = availableModules.find((m) => m.id === id);
                    return (
                      <Badge key={id} variant="secondary">
                        {mod?.name}
                      </Badge>
                    );
                  })}
                </div>
                <div className="flex justify-between border-t py-1 pt-2">
                  <span className="text-muted-foreground">Module Cost</span>
                  <span className="font-medium">
                    $
                    {formData.enabledModules
                      .reduce((sum, id) => {
                        const mod = availableModules.find((m) => m.id === id);
                        return sum + (mod?.basePrice || 0);
                      }, 0)
                      .toFixed(2)}
                    /mo
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="size-4" />
                  Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Selected Plan</span>
                  <Badge>
                    {plans.find((p) => p.id === formData.selectedPlan)?.name ||
                      "None"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case "basic":
        return Building;
      case "business":
        return Settings;
      case "location":
        return MapPin;
      case "owner":
        return User;
      case "staff":
        return Users;
      case "modules":
        return Layers;
      case "plan":
        return CreditCard;
      case "review":
        return CheckCircle;
      default:
        return Building;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/facilities")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create New Facility
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete the setup wizard to add a new facility
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar - Step Navigation */}
        <Card className="shadow-card h-fit border-0 lg:col-span-1">
          <CardContent className="p-4">
            <div className="space-y-1">
              {steps.map((step, index) => {
                const Icon = getStepIcon(step.id);
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;

                return (
                  <button
                    key={step.id}
                    onClick={() => {
                      if (index < currentStep) {
                        setCurrentStep(index);
                      }
                    }}
                    disabled={index > currentStep}
                    className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isCompleted
                          ? `bg-muted hover:bg-muted/80 cursor-pointer`
                          : "text-muted-foreground cursor-not-allowed"
                    } `}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        isActive
                          ? "bg-primary-foreground/20"
                          : isCompleted
                            ? "bg-success/20 text-success"
                            : "bg-muted"
                      } `}
                    >
                      {isCompleted ? (
                        <CheckCircle className="size-4" />
                      ) : (
                        <Icon className="size-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{step.title}</p>
                      <p
                        className={`text-xs ${
                          isActive
                            ? `text-primary-foreground/70`
                            : `text-muted-foreground`
                        } `}
                      >
                        {step.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Form */}
        <Card className="shadow-card border-0 lg:col-span-3">
          <CardHeader>
            <CardTitle>{steps[currentStep].title}</CardTitle>
          </CardHeader>
          <CardContent>{renderStepContent()}</CardContent>
          <div className="flex justify-between p-6 pt-0">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            {currentStep === steps.length - 1 ? (
              <Button onClick={handleComplete}>Create Facility</Button>
            ) : (
              <Button onClick={handleNext}>Continue</Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
