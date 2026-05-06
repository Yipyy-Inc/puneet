"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Monitor,
  Phone,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
  icon: typeof Monitor;
}

// Mock sessions — replace with real session API.
const MOCK_SESSIONS: ActiveSession[] = [
  {
    id: "current",
    device: "Windows 11",
    browser: "Chrome 132",
    location: "Montreal, QC",
    lastActive: "Active now",
    isCurrent: true,
    icon: Monitor,
  },
  {
    id: "phone",
    device: "iPhone 15",
    browser: "Safari",
    location: "Montreal, QC",
    lastActive: "2 hours ago",
    isCurrent: false,
    icon: Smartphone,
  },
  {
    id: "laptop",
    device: "MacBook Pro",
    browser: "Firefox",
    location: "Toronto, ON",
    lastActive: "3 days ago",
    isCurrent: false,
    icon: Monitor,
  },
];

interface LoginSecurityCardProps {
  email: string;
  phone: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

export function LoginSecurityCard({
  email,
  phone,
  emailVerified = true,
  phoneVerified = false,
}: LoginSecurityCardProps) {
  // Password change form
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<"sms" | "authenticator">(
    "authenticator",
  );

  // Sessions
  const [sessions, setSessions] = useState<ActiveSession[]>(MOCK_SESSIONS);

  const passwordTooShort = newPassword.length > 0 && newPassword.length < 8;
  const passwordsMismatch =
    confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSubmitPassword =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowPasswordForm(false);
  };

  const handleUpdatePassword = async () => {
    if (!canSubmitPassword) return;
    setIsUpdatingPassword(true);
    try {
      // TODO: Replace with real password change API
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success("Password updated. You'll stay signed in on this device.");
      resetPasswordForm();
    } catch {
      toast.error("Could not update password. Please try again.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleResendVerification = (channel: "email" | "phone") => {
    toast.success(
      channel === "email"
        ? `Verification link sent to ${email}.`
        : `Verification code sent to ${phone}.`,
    );
  };

  const handleToggle2FA = (enabled: boolean) => {
    setTwoFactorEnabled(enabled);
    toast.success(
      enabled
        ? "Two-factor authentication enabled."
        : "Two-factor authentication disabled.",
    );
  };

  const handleRevokeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Session signed out.");
  };

  const handleSignOutAllOthers = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    toast.success("Signed out of all other devices.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5" />
          Login & Security
        </CardTitle>
        <CardDescription>
          Manage how you sign in and keep your account secure.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Verified channels */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Sign-in channels</Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Mail className="text-muted-foreground size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {email || "No email on file"}
                  </p>
                  <p className="text-muted-foreground text-xs">Email address</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {emailVerified ? (
                  <Badge
                    variant="outline"
                    className="h-6 gap-1 border-emerald-300 bg-emerald-50 px-2 text-emerald-700"
                  >
                    <CheckCircle2 className="size-3" />
                    Verified
                  </Badge>
                ) : (
                  <>
                    <Badge variant="secondary" className="h-6 px-2">
                      Unverified
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResendVerification("email")}
                    >
                      Send link
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Phone className="text-muted-foreground size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {phone || "No phone on file"}
                  </p>
                  <p className="text-muted-foreground text-xs">Phone number</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {phoneVerified ? (
                  <Badge
                    variant="outline"
                    className="h-6 gap-1 border-emerald-300 bg-emerald-50 px-2 text-emerald-700"
                  >
                    <CheckCircle2 className="size-3" />
                    Verified
                  </Badge>
                ) : (
                  <>
                    <Badge variant="secondary" className="h-6 px-2">
                      Unverified
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!phone}
                      onClick={() => handleResendVerification("phone")}
                    >
                      Send code
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Password */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Password</Label>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Use at least 8 characters. We recommend a passphrase or a
                password manager.
              </p>
            </div>
            {!showPasswordForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordForm(true)}
              >
                <Lock className="mr-2 size-4" />
                Change password
              </Button>
            )}
          </div>

          {showPasswordForm && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="pr-10"
                    aria-invalid={passwordTooShort ? "true" : "false"}
                  />
                  <button
                    type="button"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md"
                    onClick={() => setShowNewPassword((v) => !v)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {passwordTooShort && (
                  <p className="text-destructive text-xs">
                    Password must be at least 8 characters.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  aria-invalid={passwordsMismatch ? "true" : "false"}
                />
                {passwordsMismatch && (
                  <p className="text-destructive text-xs">
                    Passwords don&apos;t match.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={resetPasswordForm}
                  disabled={isUpdatingPassword}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdatePassword}
                  disabled={!canSubmitPassword || isUpdatingPassword}
                >
                  <KeyRound className="mr-2 size-4" />
                  {isUpdatingPassword ? "Updating..." : "Update password"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Two-factor authentication */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-0.5 pr-4">
              <Label className="text-base font-semibold">
                Two-factor authentication
              </Label>
              <p className="text-muted-foreground text-xs">
                Add a second step at sign-in to protect your account if your
                password is ever compromised.
              </p>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={handleToggle2FA}
            />
          </div>

          {twoFactorEnabled && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="space-y-1.5">
                <Label htmlFor="2fa-method">Method</Label>
                <Select
                  value={twoFactorMethod}
                  onValueChange={(value) =>
                    setTwoFactorMethod(value as "sms" | "authenticator")
                  }
                >
                  <SelectTrigger id="2fa-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="authenticator">
                      Authenticator app (recommended)
                    </SelectItem>
                    <SelectItem value="sms" disabled={!phoneVerified}>
                      SMS to verified phone
                      {!phoneVerified && " — verify phone first"}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {twoFactorMethod === "authenticator"
                    ? "Use Authy, Google Authenticator, or 1Password to generate codes."
                    : "We'll text a 6-digit code to your phone at each sign-in."}
                </p>
              </div>
              <Button variant="outline" size="sm">
                Manage backup codes
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Active sessions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">
                Active sessions
              </Label>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Devices currently signed in to your account.
              </p>
            </div>
            {sessions.some((s) => !s.isCurrent) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOutAllOthers}
              >
                <LogOut className="mr-2 size-4" />
                Sign out all others
              </Button>
            )}
          </div>
          <div className="divide-border/70 overflow-hidden rounded-lg border divide-y">
            {sessions.map((session) => {
              const Icon = session.icon;
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        session.isCurrent
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {session.device} · {session.browser}
                        </p>
                        {session.isCurrent && (
                          <Badge
                            variant="outline"
                            className="h-5 border-emerald-300 bg-emerald-50 px-1.5 text-[10px] text-emerald-700"
                          >
                            This device
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground truncate text-xs">
                        {session.location} · {session.lastActive}
                      </p>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeSession(session.id)}
                    >
                      Sign out
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
