"use client";

import { useState } from "react";
import { toast } from "sonner";
import { User, KeyRound, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasskeysCard } from "@/components/auth/PasskeysCard";
import { changePassword } from "@/lib/auth/workos-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import { useUpdateStaff } from "@/lib/api/staff";
import { RolePill } from "@/app/facility/dashboard/staff/_components/staff-shared";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// "My Profile" — the personal settings section every account holds, gated on
// NOTHING (edit_own_profile is always-on). The signed-in staff member (the RBAC
// viewer, read from the staff table) edits their own name and phone, saved
// through PATCH /api/staff/[id]: `staff_update` admits a person's own row, and
// the trigger reverts anything they may not set.
//
// It saved into `upsertFacilityStaff` — the fixture array — so the change was
// gone on reload. Email is read-only: it is the address this person signs in
// and is invited with, and changing the staff row alone would split the two.
// Password change is real (`changePassword` re-authenticates first).
// ============================================================================

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function MyAccountSettings() {
  const t = useSettingsText().section("my-profile");
  const { viewer } = useFacilityRbac();

  const [firstName, setFirstName] = useState(viewer.firstName);
  const [lastName, setLastName] = useState(viewer.lastName);
  const [phone, setPhone] = useState(viewer.phone ?? "");
  const { mutateAsync: updateStaff, isPending: saving } = useUpdateStaff();

  const dirty =
    firstName !== viewer.firstName ||
    lastName !== viewer.lastName ||
    (phone ?? "") !== (viewer.phone ?? "");

  const saveProfile = async () => {
    if (!dirty || saving) return;
    try {
      // Only these three: the rest of the row is the facility's to set, and
      // the viewer copy may have fields redacted.
      await updateStaff({
        staffId: viewer.id,
        patch: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone,
        },
      });
      toast.success(t("profileUpdated"));
    } catch (error) {
      toast.error(t("saveFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4" /> {t("myProfile")}
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
              <Label htmlFor="my-first">{t("firstName")}</Label>
              <Input
                id="my-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="my-last">{t("lastName")}</Label>
              <Input
                id="my-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="my-email">{t("email")}</Label>
              <Input
                id="my-email"
                type="email"
                value={viewer.email}
                readOnly
                aria-describedby="my-email-help"
              />
              <p id="my-email-help" className="text-muted-foreground text-xs">
                {t("emailHelp")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="my-phone">{t("phone")}</Label>
              <Input
                id="my-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => void saveProfile()}
              disabled={!dirty || saving}
              aria-busy={saving}
              className="gap-1.5"
            >
              <Save className="size-4" />{" "}
              {saving ? t("saving") : t("saveChanges")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordCard />

      {/* Passkeys: the other credential this account can manage here. */}
      <PasskeysCard />
    </div>
  );
}

function ChangePasswordCard() {
  const t = useSettingsText().section("my-profile");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);

  const canSubmit = current && next.length >= 8 && next === confirm;

  // WAS A MOCK. It cleared the fields and toasted "Password changed" against no
  // backend at all, so anyone who trusted it might discard a password that still
  // worked. `changePassword` re-authenticates the current password before
  // setting the new one -- a session alone is not proof, or a borrowed laptop
  // would be a password takeover.
  const submit = async () => {
    setPending(true);
    const result = await changePassword(current, next);
    setPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setCurrent("");
    setNext("");
    setConfirm("");
    toast.success(t("passwordChanged"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4" /> {t("password")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid max-w-md gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pw-current">{t("currentPassword")}</Label>
            <Input
              id="pw-current"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-new">{t("newPassword")}</Label>
            <Input
              id="pw-new"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">{t("atLeastEight")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-confirm">{t("confirmNewPassword")}</Label>
            <Input
              id="pw-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={!canSubmit || pending}>
            {pending ? t("changing") : t("updatePassword")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
