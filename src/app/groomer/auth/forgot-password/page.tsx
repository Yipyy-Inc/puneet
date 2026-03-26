"use client";

import { useState } from "react";
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
import { Mail, Loader2, Scissors, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsSubmitted(true);
      toast.success("Password reset email sent!");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send reset email",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-linear-to-br p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-pink-500 to-rose-500">
                <Scissors className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              Check your email
            </CardTitle>
            <CardDescription>
              We&apos;ve sent a password reset link to {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center text-sm">
              If you don&apos;t see the email, check your spam folder.
            </p>
            <Button asChild className="w-full" variant="outline">
              <Link href="/groomer/auth/login">
                <ArrowLeft className="mr-2 size-4" />
                Back to login
              </Link>
            </Button>
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
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-pink-500 to-rose-500">
              <Scissors className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute top-3 left-3 size-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/groomer/auth/login"
              className="text-primary text-sm hover:underline"
            >
              <ArrowLeft className="mr-1 inline h-3 w-3" />
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
