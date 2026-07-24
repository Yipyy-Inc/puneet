"use client";

import { useState } from "react";
import { toast } from "sonner";
import { User, KeyRound, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import { upsertFacilityStaff } from "@/data/facility-staff";
import { RolePill } from "@/app/facility/dashboard/staff/_components/staff-shared";

// ============================================================================
// "My Profile" — the personal settings section every account holds, gated on
// NOTHING (edit_own_profile is always-on). The signed-in staff (the RBAC
// viewer) edits their own contact details; changes persist through the shared
// directory (upsertFacilityStaff) so they survive navigation. Password change
// is a mock stub (no backend).
// ============================================================================

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function MyAccountSettings() {
  const { viewer } = useFacilityRbac();

  const [firstName, setFirstName] = useState(viewer.firstName);
  const [lastName, setLastName] = useState(viewer.lastName);
  const [email, setEmail] = useState(viewer.email);
  const [phone, setPhone] = useState(viewer.phone ?? "");

  const dirty =
    firstName !== viewer.firstName ||
    lastName !== viewer.lastName ||
    email !== viewer.email ||
    (phone ?? "") !== (viewer.phone ?? "");

  const saveProfile = () => {
    upsertFacilityStaff({ ...viewer, firstName, lastName, email, phone });
    toast.success("Profile updated");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4" /> My Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarImage src={viewer.avatarUrl} />
              <AvatarFallback
                style={{
                  backgroundColor: (viewer.colorHex ?? "#666") + "33",
                  color: viewer.colorHex ?? "#666",
                }}
              >
                {initials(firstName, lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium">
                {firstName} {lastName}
              </p>
              <div className="mt-1">
                <RolePill role={viewer.primaryRole} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="my-first">First name</Label>
              <Input
                id="my-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="my-last">Last name</Label>
              <Input
                id="my-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="my-email">Email</Label>
              <Input
                id="my-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="my-phone">Phone</Label>
              <Input
                id="my-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={!dirty} className="gap-1.5">
              <Save className="size-4" /> Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordCard />
    </div>
  );
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const canSubmit = current && next.length >= 8 && next === confirm;

  const submit = () => {
    // Mock — no backend. Real implementation posts to an auth endpoint.
    setCurrent("");
    setNext("");
    setConfirm("");
    toast.success("Password changed");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4" /> Password
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid max-w-md gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pw-current">Current password</Label>
            <Input
              id="pw-current"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-new">New password</Label>
            <Input
              id="pw-new"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              At least 8 characters.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-confirm">Confirm new password</Label>
            <Input
              id="pw-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={!canSubmit}>
            Update password
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
