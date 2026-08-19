"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, Copy, Loader2, Mail, UserPlus } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PLATFORM_ROLE_BLURB,
  PLATFORM_ROLE_LABEL,
  type PlatformRole,
} from "@/lib/auth/platform-role";

// ============================================================================
// Invite somebody onto the Yipyy platform team.
//
// ── WHY THIS SHRANK FROM A THREE-STEP WIZARD TO ONE FORM ──────────────────
//
// It used to collect a name, an email, a phone number, a department, one of
// five job-flavoured roles, one of four "access levels", and up to 26
// responsibility areas across three steps with a progress indicator.
//
// Of those, the invitation records THREE: name, email and role. Everything else
// was discarded the moment Send was pressed — phone, access level and the
// responsibility areas were never sent anywhere at all, and department reached
// the server only to be interpolated into the email body.
//
// Worse than discarded, in the case of role. The five options were mapped onto
// the four real values of `public.platform_role` server-side, and three of them
// collapsed: "Sales Team" produced `readonly`, "Account Manager" produced
// `support`. So a superadmin could deliberately choose a role, be shown its
// permissions, and grant something else. That is not a cosmetic problem on a
// screen whose whole job is deciding who may run the platform.
//
// The four options below ARE `public.platform_role`. What you pick is what the
// membership records. `toPlatformRole()` still validates server-side — it
// accepts a real role name directly — so this form is the honest path through
// a guard that stays in place regardless of what the client sends.
//
// Access level has no counterpart here on purpose: the platform side has no
// such concept. The facility side does (admin | staff, ADR 0005), and borrowing
// its vocabulary for a screen that cannot honour it is how the two got confused
// in the first place.
// ============================================================================

const ROLE_ORDER: PlatformRole[] = [
  "superadmin",
  "support",
  "billing",
  "readonly",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface InviteResult {
  sent: boolean;
  reason?: string;
  message?: string;
  setupUrl: string;
  expiresAt: number;
}

export interface InvitedMember {
  name: string;
  email: string;
  role: PlatformRole;
}

interface CreateAdminUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited?: (member: InvitedMember, result: InviteResult) => void;
}

export function CreateAdminUserModal({
  open,
  onOpenChange,
  onInvited,
}: CreateAdminUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invited, setInvited] = useState<InvitedMember | null>(null);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PlatformRole | "">("");
  const [errors, setErrors] = useState({ name: "", email: "", role: "" });
  const [failure, setFailure] = useState<string | null>(null);

  function validate() {
    const next = {
      name: name.trim() ? "" : "A name is required.",
      email: !email.trim()
        ? "An email address is required."
        : EMAIL_RE.test(email.trim())
          ? ""
          : "That does not look like an email address.",
      role: role ? "" : "Pick the role this person will hold.",
    };
    setErrors(next);
    return !next.name && !next.email && !next.role;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setFailure(null);
    setIsSubmitting(true);

    const member: InvitedMember = {
      name: name.trim(),
      email: email.trim(),
      role: role as PlatformRole,
    };

    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(member),
      });
      const body = (await res.json()) as InviteResult & { error?: string };

      // The invitation ROW is what matters, and a non-2xx means there isn't
      // one — the superadmin guard refused, or the address is already on the
      // team. Saying "invitation created" here would be the exact claim this
      // screen was rewritten to stop making.
      if (!res.ok) {
        setFailure(body.error ?? "Could not create that invitation.");
        return;
      }

      setInvited(member);
      setInviteResult(body);
      onInvited?.(member, body);
    } catch {
      setFailure("Could not reach the server. Nothing was sent.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetAndClose() {
    setName("");
    setEmail("");
    setRole("");
    setErrors({ name: "", email: "", role: "" });
    setFailure(null);
    setInvited(null);
    setInviteResult(null);
    onOpenChange(false);
  }

  const firstName = invited?.name.split(" ")[0] ?? "";

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-lg">
        {invited && inviteResult ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
              {inviteResult.sent ? (
                <Mail className="size-8 text-emerald-600" />
              ) : (
                <CheckCircle className="size-8 text-emerald-600" />
              )}
            </div>
            <h3 className="mb-2 text-xl font-semibold">
              {inviteResult.sent ? "Invitation sent" : "Invitation created"}
            </h3>
            <p className="text-muted-foreground mx-auto max-w-md text-sm">
              {inviteResult.sent ? (
                <>
                  We emailed a setup link to <strong>{invited.email}</strong>.
                  It expires in 48 hours — {firstName} will show as{" "}
                  <strong>Invited</strong> until they finish setting up.
                </>
              ) : (
                <>
                  {inviteResult.message ??
                    "We couldn't send the email automatically."}{" "}
                  Share this 48-hour setup link with {firstName}:
                </>
              )}
            </p>

            {!inviteResult.sent && inviteResult.setupUrl && (
              <div className="bg-muted/40 mx-auto mt-4 flex max-w-md items-center gap-2 rounded-lg border p-2">
                <code className="text-muted-foreground flex-1 truncate text-left text-xs">
                  {inviteResult.setupUrl}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 gap-1.5"
                  onClick={() => {
                    navigator.clipboard?.writeText(inviteResult.setupUrl);
                    toast.success("Setup link copied");
                  }}
                >
                  <Copy className="size-3.5" />
                  Copy
                </Button>
              </div>
            )}

            <Button type="button" className="mt-6" onClick={resetAndClose}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="size-5" />
                Invite a platform admin
              </DialogTitle>
              <DialogDescription>
                They set their own password at a 48-hour link sent to this
                address. The role is attached to the address, so it cannot be
                claimed by anybody else.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-name">
                  Full name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="invite-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan Blake"
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && (
                  <p className="text-destructive text-sm">{errors.name}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="invite-email">
                  Email address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@yipyy.com"
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email && (
                  <p className="text-destructive text-sm">{errors.email}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="invite-role">
                  Platform role <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={role}
                  onValueChange={(value) => {
                    setRole(value as PlatformRole);
                    if (errors.role) setErrors({ ...errors, role: "" });
                  }}
                >
                  <SelectTrigger
                    id="invite-role"
                    aria-invalid={Boolean(errors.role)}
                  >
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_ORDER.map((option) => (
                      <SelectItem key={option} value={option}>
                        {PLATFORM_ROLE_LABEL[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-destructive text-sm">{errors.role}</p>
                )}
                {role && (
                  <p className="text-muted-foreground text-xs">
                    {PLATFORM_ROLE_BLURB[role]}
                  </p>
                )}
              </div>

              {/* Said once, on the screen where it matters most. */}
              <p className="text-muted-foreground bg-muted/40 rounded-lg border p-3 text-xs">
                Only <span className="font-medium">superadmin</span> is enforced
                narrowly today. Support, billing and read-only all reach the
                same customer data — see{" "}
                <span className="font-medium">Platform roles</span>.
              </p>

              {failure && (
                <p
                  role="alert"
                  className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
                >
                  {failure}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetAndClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Send invitation
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
