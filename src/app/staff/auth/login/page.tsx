import type { Metadata } from "next";
import { Calendar } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = { title: "Staff sign in — Yipyy" };

// ============================================================================
// Staff sign-in.
//
// What was here before: a lookup against the `users` mock array that never
// checked the password at all, plus a "Quick Login (Demo)" list rendering one
// button per staff member that signed you in as them with a single click. Both
// are gone — a password field that is never read is worse than no password
// field, because it looks like security.
//
// Choosing which staff record you are working as is a separate question from
// proving who you are, and it already has its own screen: /employee/select.
// ============================================================================

export default function StaffLoginPage() {
  return (
    <AuthCard
      title="Staff Login"
      description="Sign in to view your schedule and shifts"
      brand={
        <div className="flex size-16 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-500">
          <Calendar className="size-8 text-white" />
        </div>
      }
    >
      <SignInForm forgotHref="/customer/auth/forgot-password" />
    </AuthCard>
  );
}
