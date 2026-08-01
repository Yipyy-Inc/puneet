"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { signIn } from "@/lib/auth/actions";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const facilityParam = searchParams.get("facility");
  // Where to land after login (e.g. the estimate that sent them here). Passed
  // through as a hidden field and re-validated in the action — the client only
  // suggests a destination, the server decides whether it is safe.
  const redirectTo = searchParams.get("redirect") ?? "/customer/dashboard";

  const [showPassword, setShowPassword] = useState(false);

  // The sign-in runs as a Server Action rather than a submit handler so the
  // session cookie and the redirect land in the same response — a client-side
  // push can paint the destination before the cookie is readable. It also
  // means a plain <form action={...}> posts natively, so the button works on
  // first paint instead of doing nothing until React hydrates. (It was doing
  // exactly that: the inputs had no `name`, so a pre-hydration click submitted
  // an empty GET.)
  const [state, formAction, isPending] = useActionState(signIn, {
    error: null,
  });

  return (
    <div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-linear-to-br p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <Image
              src="/yipyy-transparent.png"
              alt="Yipyy"
              width={120}
              height={48}
              className="h-12 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/*
            "Continue with Google" was removed here rather than left in place:
            it called a stub that returned a hardcoded user@example.com and
            pushed you into signup as that fake person. Alongside a real
            sign-in, a button that fabricates an identity is worse than no
            button. Bringing it back is small once Google is enabled in
            Supabase (Authentication > Providers) — an action calling
            signInWithOAuth({ provider: "google" }) plus a /auth/callback
            route to exchange the code for a session.
          */}
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="redirectTo" value={redirectTo} />

            {state.error && (
              <p
                role="alert"
                className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
              >
                {state.error}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="pl-9"
                  aria-invalid={state.error ? "true" : "false"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/customer/auth/forgot-password"
                  className="text-primary text-sm hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="px-9"
                  aria-invalid={state.error ? "true" : "false"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="text-muted-foreground text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href={
                facilityParam
                  ? `/customer/auth/signup?facility=${encodeURIComponent(facilityParam)}`
                  : "/customer/auth/signup"
              }
              className="text-primary font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
