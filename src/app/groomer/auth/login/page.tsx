"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, Loader2, Scissors } from "lucide-react";
import { setCurrentUserId } from "@/lib/role-utils";
import { stylists } from "@/data/grooming";

export default function GroomerLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Find groomer by email
      const groomer = stylists.find(
        (s) => s.email.toLowerCase() === formData.email.toLowerCase(),
      );

      if (!groomer) {
        throw new Error("Invalid email or password");
      }

      // In a real app, verify password with API
      // For now, accept any password for demo purposes
      if (!formData.password) {
        throw new Error("Invalid email or password");
      }

      // Set the current user ID to the groomer's ID
      setCurrentUserId(groomer.id);

      toast.success("Welcome back!");
      router.push("/groomer/dashboard");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Invalid email or password",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-linear-to-br p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-pink-500 to-rose-500">
              <Scissors className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Groomer Login</CardTitle>
          <CardDescription>
            Sign in to access your grooming dashboard
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
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={`pl-10 ${errors.email ? "border-destructive" : ""} `}
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-destructive text-sm">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="text-muted-foreground absolute top-3 left-3 size-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className={`px-10 ${errors.password ? "border-destructive" : ""} `}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground absolute top-3 right-3"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-sm">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link
                href="/groomer/auth/forgot-password"
                className="text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6">
            <Separator />
            <div className="text-muted-foreground mt-4 text-center text-sm">
              <p>Demo: Use any groomer email from the system</p>
              <p className="mt-2 text-xs">Example: jessica@pawsplay.com</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
