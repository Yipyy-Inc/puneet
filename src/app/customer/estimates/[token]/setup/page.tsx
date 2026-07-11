"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { estimates } from "@/data/estimates";
import { businessProfile } from "@/data/settings";
import {
  activateEstimateAccount,
  refreshEstimateMagicLink,
} from "@/lib/estimates/account-provisioning";

export default function AccountSetupPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  // Capture "now" once (purity-safe) so the expiry check is stable per render.
  const [now] = useState(() => new Date());

  const estimate = estimates.find((e) => e.estimateToken === token);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [requestEmail, setRequestEmail] = useState("");

  if (!estimate) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Link Not Found</h1>
          <p className="text-muted-foreground mt-2">
            This account-setup link is invalid.
          </p>
        </div>
      </div>
    );
  }

  const firstName = (estimate.guestName || estimate.clientName || "there")
    .trim()
    .split(/\s+/)[0];

  // The MAGIC LINK's expiry — distinct from the estimate's own expiry. An
  // expired link never expires the estimate itself.
  const linkExpired = estimate.magicLinkExpiresAt
    ? new Date(estimate.magicLinkExpiresAt).getTime() < now.getTime()
    : false;

  const handleSubmit = () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    activateEstimateAccount(estimate, new Date());
    toast.success("Account activated — welcome!");
    // Redirect into the customer portal with the estimate visible.
    router.push(`/customer/estimates/${token}?activated=1`);
  };

  const handleRequestNewLink = () => {
    const email = requestEmail.trim();
    if (!email) return;
    const newToken = refreshEstimateMagicLink(estimate, new Date());
    toast.success(`A new link has been sent to ${email}`);
    router.push(`/customer/estimates/${newToken}/setup`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-lg">
        {/* Header */}
        <div className="border-b bg-slate-50 px-6 py-5 text-center">
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            {businessProfile.businessName}
          </p>
        </div>

        {linkExpired ? (
          /* Expired magic link */
          <div className="space-y-4 p-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-amber-100">
                <Clock className="size-6 text-amber-600" />
              </div>
              <h1 className="text-lg font-bold">This link has expired</h1>
              <p className="text-muted-foreground text-sm">
                Click here to request a new link. Your estimate is still valid.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-email" className="text-sm">
                Email address
              </Label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  id="request-email"
                  type="email"
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleRequestNewLink}
              disabled={!requestEmail.trim()}
            >
              Send me a new link
            </Button>
          </div>
        ) : (
          /* Set password */
          <div className="space-y-5 p-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-blue-100">
                <ShieldCheck className="size-6 text-blue-600" />
              </div>
              <h1 className="text-lg font-bold">Welcome, {firstName}.</h1>
              <p className="text-muted-foreground text-sm">
                Set your password to access your account.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-sm">
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    className="pl-10"
                  />
                </div>
              </div>
              {error && <p className="text-destructive text-xs">{error}</p>}
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!password || !confirm}
            >
              Set Password &amp; View Estimate
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-muted-foreground border-t px-6 py-4 text-center text-xs">
          Questions? Call {businessProfile.phone} or email{" "}
          {businessProfile.email}
        </div>
      </div>
    </div>
  );
}
