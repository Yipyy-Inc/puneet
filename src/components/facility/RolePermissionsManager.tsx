"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Users,
  RotateCcw,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  ChevronRight,
  User,
  AlertCircle,
} from "lucide-react";
import {
  type FacilityRole,
  type Permission,
  type UserPermissionOverride,
  ALL_FACILITY_ROLES,
  FACILITY_ROLE_LABELS,
  FACILITY_ROLE_DESCRIPTIONS,
  PERMISSION_LABELS,
  PERMISSION_CATEGORIES,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/lib/role-utils";
import { usePermissionManagement } from "@/hooks/use-facility-role";
import { useFacilityRole } from "@/hooks/use-facility-role";

// Mock staff data - in real app, this would come from API/database
const mockStaffMembers = [
  {
    id: "staff-1",
    name: "Sarah Johnson",
    email: "sarah@facility.com",
    role: "manager" as FacilityRole,
  },
  {
    id: "staff-2",
    name: "Mike Chen",
    email: "mike@facility.com",
    role: "front_desk" as FacilityRole,
  },
  {
    id: "staff-3",
    name: "Emily Davis",
    email: "emily@facility.com",
    role: "groomer" as FacilityRole,
  },
  {
    id: "staff-4",
    name: "Tom Wilson",
    email: "tom@facility.com",
    role: "trainer" as FacilityRole,
  },
  {
    id: "staff-5",
    name: "Lisa Anderson",
    email: "lisa@facility.com",
    role: "kennel_tech" as FacilityRole,
  },
];

export function RolePermissionsManager() {
  const { canEditPermissions, role: currentRole } = useFacilityRole();
  const {
    userOverrides,
    isLoading,
    getRolePerms,
    updatePermission,
    resetRole,
    setOverride,
    removeUserOverride,
  } = usePermissionManagement();

  const [selectedRole, setSelectedRole] = useState<FacilityRole>("manager");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    Object.keys(PERMISSION_CATEGORIES),
  );
  const [showUserOverrideModal, setShowUserOverrideModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [editingOverride, setEditingOverride] =
    useState<UserPermissionOverride | null>(null);

  // Check if current user can manage permissions
  if (!canEditPermissions) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              Only facility owners can manage role permissions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const currentRolePermissions = getRolePerms(selectedRole);

  const hasPermissionInRole = (permission: Permission): boolean => {
    return currentRolePermissions.includes(permission);
  };

  const isDefaultPermission = (
    role: FacilityRole,
    permission: Permission,
  ): boolean => {
    return DEFAULT_ROLE_PERMISSIONS[role].includes(permission);
  };

  const handlePermissionToggle = (permission: Permission) => {
    // Prevent owner from removing their own manage_permissions
    if (selectedRole === "owner" && permission === "manage_permissions") {
      return;
    }
    const currentlyHas = hasPermissionInRole(permission);
    updatePermission(selectedRole, permission, !currentlyHas);
  };

  const handleResetRole = () => {
    if (
      confirm(
        `Reset ${FACILITY_ROLE_LABELS[selectedRole]} permissions to defaults?`,
      )
    ) {
      resetRole(selectedRole);
    }
  };

  const handleResetAll = () => {
    if (
      confirm("Reset ALL role permissions to defaults? This cannot be undone.")
    ) {
      resetRole();
    }
  };

  const openUserOverrideModal = (userId?: string) => {
    if (userId) {
      const existing = userOverrides.find((o) => o.userId === userId);
      if (existing) {
        setEditingOverride({ ...existing });
      } else {
        const user = mockStaffMembers.find((s) => s.id === userId);
        if (user) {
          setEditingOverride({
            userId: user.id,
            userName: user.name,
            role: user.role,
            addedPermissions: [],
            removedPermissions: [],
          });
        }
      }
    } else {
      setEditingOverride(null);
    }
    setSelectedUser(userId || null);
    setShowUserOverrideModal(true);
  };

  const saveUserOverride = () => {
    if (editingOverride) {
      setOverride(editingOverride);
      setShowUserOverrideModal(false);
      setEditingOverride(null);
    }
  };

  const toggleUserAddedPermission = (permission: Permission) => {
    if (!editingOverride) return;

    setEditingOverride((prev) => {
      if (!prev) return prev;

      const isAdded = prev.addedPermissions.includes(permission);
      const isRemoved = prev.removedPermissions.includes(permission);

      if (isAdded) {
        // Remove from added
        return {
          ...prev,
          addedPermissions: prev.addedPermissions.filter(
            (p) => p !== permission,
          ),
        };
      } else if (isRemoved) {
        // Was removed, now make it default (remove from removed)
        return {
          ...prev,
          removedPermissions: prev.removedPermissions.filter(
            (p) => p !== permission,
          ),
        };
      } else {
        // Add to added
        return {
          ...prev,
          addedPermissions: [...prev.addedPermissions, permission],
        };
      }
    });
  };

  const toggleUserRemovedPermission = (permission: Permission) => {
    if (!editingOverride) return;

    setEditingOverride((prev) => {
      if (!prev) return prev;

      const isAdded = prev.addedPermissions.includes(permission);
      const isRemoved = prev.removedPermissions.includes(permission);

      if (isRemoved) {
        // Remove from removed
        return {
          ...prev,
          removedPermissions: prev.removedPermissions.filter(
            (p) => p !== permission,
          ),
        };
      } else if (isAdded) {
        // Was added, now remove
        return {
          ...prev,
          addedPermissions: prev.addedPermissions.filter(
            (p) => p !== permission,
          ),
          removedPermissions: [...prev.removedPermissions, permission],
        };
      } else {
        // Add to removed
        return {
          ...prev,
          removedPermissions: [...prev.removedPermissions, permission],
        };
      }
    });
  };

  const getPermissionStateForUser = (
    permission: Permission,
  ): "default" | "added" | "removed" => {
    if (!editingOverride) return "default";
    if (editingOverride.addedPermissions.includes(permission)) return "added";
    if (editingOverride.removedPermissions.includes(permission))
      return "removed";
    return "default";
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="roles">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Role Permissions
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Overrides
          </TabsTrigger>
        </TabsList>

        {/* Role Permissions Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Configure Role Permissions
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleResetAll}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset All to Defaults
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Customize what each role can access and do in your facility.
                Changes apply immediately to all users with that role.
              </p>
            </CardHeader>
            <CardContent>
              {/* Role Selector */}
              <div className="mb-6">
                <Label className="mb-2 block">Select Role to Edit</Label>
                <div className="flex flex-wrap gap-2">
                  {ALL_FACILITY_ROLES.map((role) => (
                    <Button
                      key={role}
                      variant={selectedRole === role ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedRole(role)}
                      disabled={role === "owner" && currentRole !== "owner"}
                    >
                      {FACILITY_ROLE_LABELS[role]}
                    </Button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {FACILITY_ROLE_DESCRIPTIONS[selectedRole]}
                </p>
              </div>

              {/* Reset Role Button */}
              <div className="flex justify-end mb-4">
                <Button variant="ghost" size="sm" onClick={handleResetRole}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset {FACILITY_ROLE_LABELS[selectedRole]} to Defaults
                </Button>
              </div>

              {/* Permission Categories */}
              <div className="space-y-4">
                {Object.entries(PERMISSION_CATEGORIES).map(
                  ([category, permissions]) => (
                    <div key={category} className="border rounded-lg">
                      <button
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
                        onClick={() => toggleCategory(category)}
                      >
                        <span className="font-semibold">{category}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {
                              permissions.filter((p) => hasPermissionInRole(p))
                                .length
                            }
                            /{permissions.length}
                          </Badge>
                          {expandedCategories.includes(category) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </button>
                      {expandedCategories.includes(category) && (
                        <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                          {permissions.map((permission) => {
                            const isChecked = hasPermissionInRole(permission);
                            const isDefault = isDefaultPermission(
                              selectedRole,
                              permission,
                            );
                            const isProtected =
                              selectedRole === "owner" &&
                              permission === "manage_permissions";

                            return (
                              <div
                                key={permission}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  id={`${selectedRole}-${permission}`}
                                  checked={isChecked}
                                  onCheckedChange={() =>
                                    handlePermissionToggle(permission)
                                  }
                                  disabled={isProtected}
                                />
                                <Label
                                  htmlFor={`${selectedRole}-${permission}`}
                                  className={`text-sm cursor-pointer flex items-center gap-1 ${
                                    isProtected ? "text-muted-foreground" : ""
                                  }`}
                                >
                                  {PERMISSION_LABELS[permission]}
                                  {isChecked !== isDefault && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs ml-1"
                                    >
                                      Modified
                                    </Badge>
                                  )}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Overrides Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Permission Overrides
                </CardTitle>
                <Button size="sm" onClick={() => openUserOverrideModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Override
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Grant or restrict specific permissions for individual staff
                members, overriding their role&apos;s default permissions.
              </p>
            </CardHeader>
            <CardContent>
              {userOverrides.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No user-specific permission overrides configured.</p>
                  <p className="text-sm mt-1">
                    Click &quot;Add Override&quot; to customize permissions for
                    specific staff members.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userOverrides.map((override) => (
                    <div
                      key={override.userId}
                      className="border rounded-lg p-4 flex items-start justify-between"
                    >
                      <div>
                        <div className="font-medium">{override.userName}</div>
                        <div className="text-sm text-muted-foreground">
                          Base Role: {FACILITY_ROLE_LABELS[override.role]}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {override.addedPermissions.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Badge variant="default" className="bg-green-500">
                                +{override.addedPermissions.length} granted
                              </Badge>
                            </div>
                          )}
                          {override.removedPermissions.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Badge variant="destructive">
                                -{override.removedPermissions.length} restricted
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openUserOverrideModal(override.userId)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (
                              confirm(
                                `Remove permission overrides for ${override.userName}?`,
                              )
                            ) {
                              removeUserOverride(override.userId);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Staff Members without overrides */}
              <div className="mt-6">
                <h4 className="font-medium mb-3">Staff Members</h4>
                <div className="space-y-2">
                  {mockStaffMembers
                    .filter(
                      (s) => !userOverrides.find((o) => o.userId === s.id),
                    )
                    .map((staff) => (
                      <div
                        key={staff.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div>
                          <div className="font-medium">{staff.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {staff.email} • {FACILITY_ROLE_LABELS[staff.role]}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openUserOverrideModal(staff.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Override
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Override Modal */}
      <Dialog
        open={showUserOverrideModal}
        onOpenChange={setShowUserOverrideModal}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOverride
                ? `Edit Permissions for ${editingOverride.userName}`
                : "Add User Permission Override"}
            </DialogTitle>
          </DialogHeader>

          {!editingOverride && (
            <div className="space-y-4">
              <Label>Select Staff Member</Label>
              <Select
                value={selectedUser || ""}
                onValueChange={(value) => {
                  const user = mockStaffMembers.find((s) => s.id === value);
                  if (user) {
                    setSelectedUser(value);
                    setEditingOverride({
                      userId: user.id,
                      userName: user.name,
                      role: user.role,
                      addedPermissions: [],
                      removedPermissions: [],
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {mockStaffMembers
                    .filter(
                      (s) => !userOverrides.find((o) => o.userId === s.id),
                    )
                    .map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name} ({FACILITY_ROLE_LABELS[staff.role]})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {editingOverride && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="font-medium">{editingOverride.userName}</div>
                <div className="text-sm text-muted-foreground">
                  Base Role: {FACILITY_ROLE_LABELS[editingOverride.role]}
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="mb-2">Configure permission overrides:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <Badge variant="default" className="bg-green-500 mr-1">
                      Green
                    </Badge>{" "}
                    = Permission granted (added)
                  </li>
                  <li>
                    <Badge variant="destructive" className="mr-1">
                      Red
                    </Badge>{" "}
                    = Permission restricted (removed)
                  </li>
                  <li>
                    <Badge variant="secondary" className="mr-1">
                      Gray
                    </Badge>{" "}
                    = Uses role default
                  </li>
                </ul>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(PERMISSION_CATEGORIES).map(
                  ([category, permissions]) => (
                    <div key={category} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3">{category}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {permissions.map((permission) => {
                          const state = getPermissionStateForUser(permission);
                          const roleHasPermission = getRolePerms(
                            editingOverride.role,
                          ).includes(permission);

                          return (
                            <div
                              key={permission}
                              className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
                            >
                              <div className="flex gap-1">
                                <Button
                                  variant={
                                    state === "added" ? "default" : "outline"
                                  }
                                  size="sm"
                                  className={`h-6 w-6 p-0 ${state === "added" ? "bg-green-500 hover:bg-green-600" : ""}`}
                                  onClick={() =>
                                    toggleUserAddedPermission(permission)
                                  }
                                >
                                  +
                                </Button>
                                <Button
                                  variant={
                                    state === "removed"
                                      ? "destructive"
                                      : "outline"
                                  }
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() =>
                                    toggleUserRemovedPermission(permission)
                                  }
                                >
                                  -
                                </Button>
                              </div>
                              <span className="text-sm">
                                {PERMISSION_LABELS[permission]}
                                {roleHasPermission && state === "default" && (
                                  <span className="text-muted-foreground ml-1">
                                    (has)
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUserOverrideModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveUserOverride} disabled={!editingOverride}>
              <Save className="h-4 w-4 mr-2" />
              Save Overrides
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
