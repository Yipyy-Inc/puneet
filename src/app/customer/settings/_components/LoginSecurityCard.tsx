"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  changePassword,
  listMySessions,
  myEmailStatus,
  sendMyVerificationEmail,
  revokeMySession,
  revokeMyOtherSessions,
} from "@/lib/auth/workos-actions";
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

import { cn } from "@/lib/utils";
import { useCustomerText } from "@/lib/customer/use-customer-text";

/**
 * A readable name for a session, from its user agent.
 *
 * DERIVED, NOT INVENTED. The mock this replaces listed "Windows 11 · Chrome
 * 132" in "Montreal, QC", none of which came from anywhere. WorkOS records the
 * user agent and the IP and no location at all, so this reduces the former to
 * something a person can recognise and shows the latter as-is. Where the string
 * is unrecognised it says so rather than guessing.
 */
function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";

  const os = /Windows/i.test(userAgent)
    ? "Windows"
    : /iPhone|iPad/i.test(userAgent)
      ? "iOS"
      : /Android/i.test(userAgent)
        ? "Android"
        : /Mac OS X|Macintosh/i.test(userAgent)
          ? "macOS"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : null;

  // Order matters: Edge and Chrome both say "Chrome", Safari says "Safari" only
  // when Chrome does not.
  const browser = /Edg\//i.test(userAgent)
    ? "Edge"
    : /OPR\//i.test(userAgent)
      ? "Opera"
      : /Chrome\//i.test(userAgent)
        ? "Chrome"
        : /Firefox\//i.test(userAgent)
          ? "Firefox"
          : /Safari\//i.test(userAgent)
            ? "Safari"
            : null;

  const parts = [os, browser].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Unknown device";
}

interface LoginSecurityCardProps {
  email: string;
  phone: string;
  emailVerified?: boolean;
}

export function LoginSecurityCard({
  email,
  phone,
  emailVerified = true,
}: LoginSecurityCardProps) {
  const { t, fill } = useCustomerText("settings");
  // Password change form
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // 2FA

  // Sessions
  const [sendingVerification, setSendingVerification] = useState(false);
  const [busySession, setBusySession] = useState<string | null>(null);

  // The REAL verification state. `emailVerified` arrives as a prop that nothing
  // ever passes, so it was permanently undefined and every user was shown
  // "Unverified" beside a button offering to fix something that was not wrong.
  const { data: emailStatus, refetch: refetchEmailStatus } = useQuery({
    queryKey: ["my-email-status"],
    queryFn: myEmailStatus,
  });
  const isEmailVerified = emailStatus?.emailVerified ?? emailVerified ?? false;
  const [signingOutOthers, setSigningOutOthers] = useState(false);

  // Real sessions from WorkOS. The mock array this replaces invented a device,
  // a browser, a city and a "last active" time; WorkOS knows the IP, the user
  // agent and how the person signed in, so that is what is shown. Inventing a
  // location again would be the same bug in a new coat.
  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ["my-sessions"],
    queryFn: listMySessions,
  });

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
      // WAS A MOCK: an 800 ms setTimeout, then a success toast, against no
      // backend. Someone who believed it might discard a password that still
      // worked. changePassword re-authenticates the current one before setting
      // the new one -- holding a session is not proof of knowing the password.
      const result = await changePassword(currentPassword, newPassword);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("passwordUpdatedYouLlStay"));
      resetPasswordForm();
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // WAS A TOAST AND NOTHING ELSE. WorkOS has always been able to do this and the
  // environment's email is live — verification mail at sign-up genuinely
  // arrives, through Resend — so only this button was inert.
  const handleResendVerification = async () => {
    setSendingVerification(true);
    const result = await sendMyVerificationEmail();
    setSendingVerification(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      fill("verificationLinkSentTo", { email: emailStatus?.email ?? email }),
    );
  };

  const handleRevokeSession = async (id: string) => {
    setBusySession(id);
    const result = await revokeMySession(id);
    setBusySession(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("sessionSignedOut"));
    await refetchSessions();
  };

  const handleSignOutAllOthers = async () => {
    setSigningOutOthers(true);
    const result = await revokeMyOtherSessions();
    setSigningOutOthers(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      fill(result.ended === 1 ? "signedOutOthersOne" : "signedOutOthersOther", {
        n: result.ended ?? 0,
      }),
    );
    await refetchSessions();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5" />
          {t("loginAndSecurity")}
        </CardTitle>
        <CardDescription>{t("manageHowYouSignIn")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Verified channels */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            {t("signInChannels")}
          </Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Mail className="text-muted-foreground size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {email || t("noEmailOnFile")}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t("emailAddress")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isEmailVerified ? (
                  <Badge
                    variant="outline"
                    className="h-6 gap-1 border-emerald-300 bg-emerald-50 px-2 text-emerald-700"
                  >
                    <CheckCircle2 className="size-3" />
                    {t("verified")}
                  </Badge>
                ) : (
                  <>
                    <Badge variant="secondary" className="h-6 px-2">
                      {t("unverified")}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await handleResendVerification();
                        await refetchEmailStatus();
                      }}
                      disabled={sendingVerification}
                    >
                      {sendingVerification ? t("sending") : t("sendLink")}
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
                    {phone || t("noPhoneOnFile")}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t("phoneNumber")}
                  </p>
                </div>
              </div>
              {/*
                NO VERIFY CONTROL. There is no phone verification in this
                product — nothing sends an SMS code and nothing checks one, so
                the "Send code" button here did nothing and the "Unverified"
                badge implied a state the user could change and could not. The
                number is still worth showing; the promise was not.
              */}
            </div>
          </div>
        </div>

        <Separator />

        {/* Password */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">{t("password")}</Label>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {t("passwordHint")}
              </p>
            </div>
            {!showPasswordForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordForm(true)}
              >
                <Lock className="mr-2 size-4" />
                {t("changePassword")}
              </Button>
            )}
          </div>

          {showPasswordForm && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">{t("currentPassword")}</Label>
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
                <Label htmlFor="new-password">{t("newPassword")}</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("atLeast8Characters")}
                    className="pr-10"
                    aria-invalid={passwordTooShort ? "true" : "false"}
                  />
                  <button
                    type="button"
                    aria-label={
                      showNewPassword ? t("hidePassword") : t("showPassword")
                    }
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
                    {t("passwordMustBeAtLeast")}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">
                  {t("confirmNewPassword")}
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("reEnterYourNewPassword")}
                  aria-invalid={passwordsMismatch ? "true" : "false"}
                />
                {passwordsMismatch && (
                  <p className="text-destructive text-xs">
                    {t("passwordsDontMatch")}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={resetPasswordForm}
                  disabled={isUpdatingPassword}
                >
                  {t("cancel")}
                </Button>
                <Button
                  onClick={handleUpdatePassword}
                  disabled={!canSubmitPassword || isUpdatingPassword}
                >
                  <KeyRound className="mr-2 size-4" />
                  {isUpdatingPassword ? t("updating") : t("updatePassword")}
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Active sessions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">
                {t("activeSessions")}
              </Label>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {t("devicesCurrentlySignedInTo")}
              </p>
            </div>
            {sessions.some((s) => !s.current) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOutAllOthers}
                disabled={signingOutOthers}
              >
                <LogOut className="mr-2 size-4" />
                {signingOutOthers ? t("signingOut") : t("signOutAllOthers")}
              </Button>
            )}
          </div>
          <div className="divide-border/70 divide-y overflow-hidden rounded-lg border">
            {sessions.length === 0 && (
              <p className="text-muted-foreground px-4 py-3 text-sm">
                {t("noActiveSessionsToShow")}
              </p>
            )}
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      session.current
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Monitor className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {describeUserAgent(session.userAgent)}
                      </p>
                      {session.current && (
                        <Badge
                          variant="outline"
                          className="h-5 border-emerald-300 bg-emerald-50 px-1.5 text-[10px] text-emerald-700"
                        >
                          {t("thisDevice")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {[session.ipAddress, session.authMethod]
                        .filter(Boolean)
                        .join(" · ") || t("noDetailsRecorded")}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={busySession === session.id}
                  >
                    {busySession === session.id
                      ? t("signingOut")
                      : t("signOut")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
