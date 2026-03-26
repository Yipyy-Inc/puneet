"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
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
import { Mail, Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail()) {
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Replace with actual API call
      await sendPasswordResetEmail(email);
      setIsSubmitted(true);
      toast.success("Password reset email sent!");
    } catch (error: any) {
      toast.error(
        error.message || "Failed to send reset email. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Placeholder function - replace with actual API call
  const sendPasswordResetEmail = async (_email: string) => {
    // TODO: API call to send password reset email
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  if (isSubmitted) {
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
            <CardTitle className="text-2xl font-bold">
              Check your email
            </CardTitle>
            <CardDescription>
              We&apos;ve sent a password reset link to {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted text-muted-foreground rounded-lg p-4 text-sm">
              <p className="mb-2">
                If an account exists with this email, you&apos;ll receive
                instructions to reset your password.
              </p>
              <p>
                Didn&apos;t receive the email? Check your spam folder or try
                again.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail("");
                }}
                className="w-full"
              >
                <Mail className="mr-2 size-4" />
                Resend email
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push("/customer/auth/login")}
                className="w-full"
              >
                <ArrowLeft className="mr-2 size-4" />
                Back to login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <CardTitle className="text-2xl font-bold">Forgot password?</CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a link to reset
            your password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  className="pl-9"
                  aria-invalid={error ? "true" : "false"}
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 size-4" />
                  Send reset link
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <Link
              href="/customer/auth/login"
              className="text-primary inline-flex items-center text-sm hover:underline"
            >
              <ArrowLeft className="mr-1 size-3" />
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
